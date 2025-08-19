import { LocalNLPProcessor } from './localNLPProcessor';
import { GrokClient, CommandInterpretationContext, InterpretedCommand } from '../ai/grokClient';
import { GameContext, NLPResult } from './types';

export interface NLPConfig {
  localConfidenceThreshold: number;   // Minimum confidence for local patterns
  aiConfidenceThreshold: number;      // Minimum confidence for AI interpretation
  enableAIFallback: boolean;          // Whether to use AI when local fails
  maxProcessingTime: number;          // Max time to spend on processing (ms)
  enableDebugLogging: boolean;        // Debug output
}

export class UnifiedNLPEngine {
  private localProcessor: LocalNLPProcessor;
  private grokClient: GrokClient;
  private config: NLPConfig;
  private stats = {
    totalCommands: 0,
    localMatches: 0,
    aiMatches: 0,
    failures: 0,
    avgProcessingTime: 0
  };

  constructor(grokClient?: GrokClient, config?: Partial<NLPConfig>) {
    this.localProcessor = new LocalNLPProcessor();
    this.grokClient = grokClient || new GrokClient();
    
    this.config = {
      localConfidenceThreshold: 0.7,
      aiConfidenceThreshold: 0.6,
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
      // If we have a local regex match, use it
      this.stats.localMatches++;
      
      const result: NLPResult = {
        action: localResult.action,
        params: localResult.params,
        confidence: localResult.confidence,
        source: 'local',
        processingTime: Date.now() - startTime
      };
      
      this.updateAverageProcessingTime(result.processingTime);
      
      if (this.config.enableDebugLogging) {
        console.log(`✅ Local match: ${result.action} (${(result.confidence * 100).toFixed(0)}%)`);
      }
      
      return result;
    }

    // Phase 2: Always try AI fallback if no regex match
    if (this.config.enableAIFallback) {
      try {
        const aiContext: CommandInterpretationContext = {
          command: input,
          currentRoom: context.currentRoom ? {
            name: context.currentRoom.name,
            description: context.currentRoom.description,
            availableExits: context.currentRoom.availableExits,
            thematicExits: context.currentRoom.thematicExits
          } : undefined,
          inventory: [], // TODO: Add inventory support
          recentCommands: context.recentCommands,
          mode: context.mode
        };

        const aiResult = await Promise.race([
          this.grokClient.interpretCommand(aiContext),
          this.createTimeoutPromise(this.config.maxProcessingTime)
        ]);

        if (aiResult) {
          // If AI returns a result, trust it
          this.stats.aiMatches++;
          
          const result: NLPResult = {
            action: aiResult.action,
            params: aiResult.params,
            confidence: aiResult.confidence,
            source: 'ai',
            processingTime: Date.now() - startTime,
            reasoning: aiResult.reasoning
          };
          
          this.updateAverageProcessingTime(result.processingTime);
          
          if (this.config.enableDebugLogging) {
            console.log(`🤖 AI match: ${result.action} (${(result.confidence * 100).toFixed(0)}%)`);
            if (result.reasoning) {
              console.log(`   Reasoning: ${result.reasoning}`);
            }
          }
          
          return result;
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

  private createTimeoutPromise(ms: number): Promise<null> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI processing timeout')), ms);
    });
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