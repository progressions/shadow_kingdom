import { LocalNLPProcessor } from './localNLPProcessor';
import { GrokClient, CommandInterpretationContext, InterpretedCommand } from '../ai/grokClient';
import { GameContext, NLPResult } from './types';
import { EntityResolver } from './entityResolver';
import Database from '../utils/database';

export interface NLPConfig {
  enableAIFallback: boolean;          // Whether to use AI when local fails
  maxProcessingTime: number;          // Max time to spend on processing (ms)
  enableDebugLogging: boolean;        // Debug output
}

export class UnifiedNLPEngine {
  private localProcessor: LocalNLPProcessor;
  private grokClient: GrokClient;
  private entityResolver: EntityResolver | null = null;
  private db?: Database;
  protected config: NLPConfig;
  private stats = {
    totalCommands: 0,
    localMatches: 0,
    aiMatches: 0,
    failures: 0,
    avgProcessingTime: 0
  };

  constructor(grokClient?: GrokClient, config?: Partial<NLPConfig>, db?: Database) {
    this.localProcessor = new LocalNLPProcessor();
    this.grokClient = grokClient || new GrokClient();
    this.db = db;
    if (db) {
      this.entityResolver = new EntityResolver(db);
    }
    
    this.config = {
      enableAIFallback: true,
      maxProcessingTime: 5000, // 5 seconds max
      enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true',
      ...config
    };
  }

  /**
   * Process a command using the unified NLP engine
   * First tries local pattern matching, then falls back to AI if needed
   */
  async processCommand(input: string, context: GameContext): Promise<NLPResult | null> {
    const startTime = Date.now();
    this.stats.totalCommands++;

    if (this.config.enableDebugLogging) {
      console.log(`🧠 Processing command: "${input}"`);
    }

    // Phase 1: Try local pattern matching first
    const localResult = this.localProcessor.processCommand(input, context);
    
    if (localResult) {
      // If we have a local regex match, try entity resolution
      this.stats.localMatches++;
      
      // Try to resolve entities if we have an entity resolver
      if (this.entityResolver) {
        const entityResult = await this.entityResolver.resolveEntities(
          localResult.action, 
          localResult.params, 
          context
        );
        
        if (!entityResult.resolved) {
          if (this.config.enableDebugLogging) {
            console.log(`❌ Entity resolution failed: ${entityResult.reason}`);
          }
          // Entity resolution failed, don't return local result - fall through to AI
        } else {
          // Entity resolution succeeded
          const result: NLPResult = {
            action: localResult.action,
            params: entityResult.resolvedParams,
            source: 'local',
            processingTime: Date.now() - startTime
          };
          
          this.updateAverageProcessingTime(result.processingTime);
          
          if (this.config.enableDebugLogging) {
            console.log(`✅ Local match with entity resolution: ${result.action} ${result.params.join(' ')}`);
          }
          
          return result;
        }
      } else {
        // No entity resolver, use original params
        const result: NLPResult = {
          action: localResult.action,
          params: localResult.params,
          source: 'local',
          processingTime: Date.now() - startTime
        };
        
        this.updateAverageProcessingTime(result.processingTime);
        
        if (this.config.enableDebugLogging) {
          console.log(`✅ Local match: ${result.action}`);
        }
        
        return result;
      }
    }

    // Phase 2: Always try AI fallback if no regex match
    if (this.config.enableAIFallback) {
      try {
        // Get characters and items in current room for AI context
        let roomCharacters: string[] = [];
        let roomItems: string[] = [];
        if (context.currentRoom && this.db) {
          const { CharacterService } = await import('../services/characterService');
          const { CharacterType } = await import('../types/character');
          const { ItemService } = await import('../services/itemService');
          
          const characterService = new CharacterService(this.db);
          const itemService = new ItemService(this.db);
          
          const [charactersInRoom, itemsInRoom] = await Promise.all([
            characterService.getRoomCharacters(context.currentRoom.id, CharacterType.PLAYER),
            itemService.getRoomItems(context.currentRoom.id)
          ]);
          
          roomCharacters = charactersInRoom.map(char => char.name);
          roomItems = itemsInRoom.map(roomItem => roomItem.item.name);
        }

        const aiContext: CommandInterpretationContext = {
          command: input,
          currentRoom: context.currentRoom ? {
            name: context.currentRoom.name,
            description: context.currentRoom.description,
            availableExits: context.currentRoom.availableExits,
            thematicExits: context.currentRoom.thematicExits,
            characters: roomCharacters,
            items: roomItems
          } : undefined,
          inventory: [], // TODO: Add inventory support
          recentCommands: context.recentCommands
        };

        // Create timeout promise with cleanup capability
        let timeoutHandle: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<null>((_, reject) => {
          timeoutHandle = setTimeout(() => reject(new Error('AI processing timeout')), this.config.maxProcessingTime);
        });

        try {
          const aiResult = await Promise.race([
            this.grokClient.interpretCommand(aiContext),
            timeoutPromise
          ]);
          
          // Clear timeout if AI call completed first
          if (timeoutHandle) clearTimeout(timeoutHandle);

          if (aiResult) {
          // If AI returns a result, trust it
          this.stats.aiMatches++;
          
          const result: NLPResult = {
            action: aiResult.action,
            params: aiResult.params,
            source: 'ai',
            processingTime: Date.now() - startTime,
            reasoning: aiResult.reasoning
          };
          
          this.updateAverageProcessingTime(result.processingTime);
          
          if (this.config.enableDebugLogging) {
            console.log(`🤖 AI match: ${result.action}`);
            if (result.reasoning) {
              console.log(`   Reasoning: ${result.reasoning}`);
            }
          }
          
          return result;
        }
        } catch (error) {
          // Clear timeout on any error
          if (timeoutHandle) clearTimeout(timeoutHandle);
          // AI failed, continue to return null so local processing is used
        }
        
      } catch (error) {
        if (this.config.enableDebugLogging) {
          console.error('AI fallback failed:', error);
        }
      }
    }

    // No match found - neither regex nor AI could handle this command
    this.stats.failures++;
    this.updateAverageProcessingTime(Date.now() - startTime);
    
    if (this.config.enableDebugLogging) {
      console.log(`❌ No match found for: "${input}"`);
    }
    
    return null;
  }

  /**
   * Add a custom pattern to the local processor
   */
  addLocalPattern(pattern: any): void {
    this.localProcessor.addPattern(pattern);
  }

  /**
   * Add a synonym to the local processor
   */
  addLocalSynonym(synonym: string, canonical: string): void {
    this.localProcessor.addSynonym(synonym, canonical);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NLPConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): NLPConfig {
    return { ...this.config };
  }

  /**
   * Get processing statistics
   */
  getStats() {
    const localStats = this.localProcessor.getStats();
    const grokStats = this.grokClient.getUsageStats();
    
    return {
      ...this.stats,
      localProcessor: localStats,
      aiUsage: grokStats,
      successRate: ((this.stats.localMatches + this.stats.aiMatches) / this.stats.totalCommands) || 0,
      localSuccessRate: (this.stats.localMatches / this.stats.totalCommands) || 0,
      aiSuccessRate: (this.stats.aiMatches / this.stats.totalCommands) || 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalCommands: 0,
      localMatches: 0,
      aiMatches: 0,
      failures: 0,
      avgProcessingTime: 0
    };
  }


  private updateAverageProcessingTime(newTime: number): void {
    if (this.stats.totalCommands === 1) {
      this.stats.avgProcessingTime = newTime;
    } else {
      this.stats.avgProcessingTime = (
        (this.stats.avgProcessingTime * (this.stats.totalCommands - 1) + newTime) / 
        this.stats.totalCommands
      );
    }
  }
}