import { UnifiedNLPEngine } from './unifiedNLPEngine';
import { ContextResolver, ExtendedGameContext, CompoundCommand, ResolvedCommand } from './contextResolver';
import { GrokClient } from '../ai/grokClient';
import { GameContext, NLPResult } from './types';
import { NLPConfig } from './unifiedNLPEngine';

/**
 * Enhanced NLP Engine with advanced context resolution
 * Extends the unified engine with context awareness and compound command support
 */
export class EnhancedNLPEngine extends UnifiedNLPEngine {
  private contextResolver: ContextResolver;
  private contextStats = {
    contextResolutions: 0,
    pronounResolutions: 0,
    spatialResolutions: 0,
    compoundCommands: 0
  };

  constructor(grokClient?: GrokClient, config?: Partial<NLPConfig>) {
    super(grokClient, config);
    this.contextResolver = new ContextResolver();
  }

  /**
   * Process command with enhanced context resolution
   */
  async processCommand(input: string, context: GameContext): Promise<NLPResult | null> {
    const startTime = Date.now();
    
    // First try the base unified engine (local patterns + AI fallback)
    const baseResult = await super.processCommand(input, context);
    
    // If base processing succeeded with high confidence, use it
    if (baseResult && baseResult.confidence >= 0.8) {
      return baseResult;
    }

    // Try enhanced context resolution
    const extendedContext = await this.buildExtendedContext(context);
    const contextResult = await this.processWithContext(input, extendedContext);
    
    if (contextResult) {
      const processingTime = Date.now() - startTime;
      
      if (contextResult.isCompound) {
        return {
          action: 'compound',
          params: [],
          confidence: contextResult.confidence,
          source: 'context',
          processingTime,
          reasoning: 'Compound command resolved with context',
          isCompound: true,
          compoundCommands: contextResult.compoundCommands
        };
      } else {
        return {
          action: contextResult.action,
          params: contextResult.params,
          confidence: contextResult.confidence,
          source: 'context',
          processingTime,
          reasoning: contextResult.reasoning,
          resolvedObjects: contextResult.resolvedObjects
        };
      }
    }

    // Return base result even if low confidence, or null if nothing worked
    return baseResult;
  }

  /**
   * Process command using context resolution
   */
  private async processWithContext(
    input: string, 
    context: ExtendedGameContext
  ): Promise<{
    action: string;
    params: string[];
    confidence: number;
    reasoning?: string;
    resolvedObjects?: any[];
    isCompound?: boolean;
    compoundCommands?: any[];
  } | null> {
    
    try {
      const resolved = await this.contextResolver.resolveContext(input, context);
      
      if (!resolved) return null;

      // Handle compound commands
      if ('commands' in resolved) {
        this.contextStats.compoundCommands++;
        return {
          action: 'compound',
          params: [],
          confidence: this.calculateCompoundConfidence(resolved),
          reasoning: `Compound command with ${resolved.commands.length} parts`,
          isCompound: true,
          compoundCommands: resolved.commands
        };
      }

      // Handle single resolved command
      this.contextStats.contextResolutions++;
      
      // Count resolution types
      for (const obj of resolved.resolvedObjects) {
        if (obj.resolutionType === 'pronoun') {
          this.contextStats.pronounResolutions++;
        } else if (obj.resolutionType === 'spatial') {
          this.contextStats.spatialResolutions++;
        }
      }

      return {
        action: resolved.action,
        params: resolved.params,
        confidence: this.calculateContextConfidence(resolved),
        reasoning: this.buildReasoningString(resolved),
        resolvedObjects: resolved.resolvedObjects
      };

    } catch (error) {
      if (this.getConfig().enableDebugLogging) {
        console.error('Context resolution error:', error);
      }
      return null;
    }
  }

  /**
   * Build extended context from game context
   */
  private async buildExtendedContext(context: GameContext): Promise<ExtendedGameContext> {
    const extended: ExtendedGameContext = {
      ...context,
      availableObjects: [],
      recentNPCs: [],
      recentItems: [],
      roomFeatures: []
    };

    // In a real implementation, this would query the game database
    // For now, we'll simulate some context based on room description
    if (context.currentRoom) {
      extended.availableObjects = this.extractObjectsFromRoom(context.currentRoom);
      extended.roomFeatures = this.extractFeaturesFromRoom(context.currentRoom);
    }

    return extended;
  }

  /**
   * Extract objects from room description (simplified)
   */
  private extractObjectsFromRoom(room: { name: string, description: string, availableExits: string[] }): any[] {
    const objects = [];
    const description = room.description.toLowerCase();

    // Simple keyword extraction - in reality this would be more sophisticated
    const itemKeywords = ['sword', 'key', 'torch', 'book', 'gem', 'coin', 'scroll', 'potion'];
    const npcKeywords = ['merchant', 'guard', 'wizard', 'librarian', 'keeper', 'figure'];
    
    for (const keyword of itemKeywords) {
      if (description.includes(keyword)) {
        objects.push({
          name: keyword,
          type: 'item',
          aliases: [keyword],
          location: 'room'
        });
      }
    }

    for (const keyword of npcKeywords) {
      if (description.includes(keyword)) {
        objects.push({
          name: keyword,
          type: 'npc',
          aliases: [keyword],
          location: 'room'
        });
      }
    }

    return objects;
  }

  /**
   * Extract features from room description
   */
  private extractFeaturesFromRoom(room: { name: string, description: string, availableExits: string[] }): any[] {
    const features = [];
    const description = room.description.toLowerCase();

    // Extract common room features
    const featureKeywords = {
      'door': { type: 'door', canInteract: true },
      'doors': { type: 'door', canInteract: true },
      'fountain': { type: 'landmark', canInteract: true },
      'table': { type: 'furniture', canInteract: true },
      'desk': { type: 'furniture', canInteract: true },
      'chair': { type: 'furniture', canInteract: true },
      'statue': { type: 'decoration', canInteract: false },
      'painting': { type: 'decoration', canInteract: true },
      'tapestry': { type: 'decoration', canInteract: true },
      'window': { type: 'feature', canInteract: false },
      'stairs': { type: 'feature', canInteract: true },
      'archway': { type: 'door', canInteract: true }
    };

    for (const [keyword, props] of Object.entries(featureKeywords)) {
      if (description.includes(keyword)) {
        features.push({
          name: keyword,
          aliases: [keyword],
          ...props
        });
      }
    }

    return features;
  }

  /**
   * Calculate confidence for compound commands
   */
  private calculateCompoundConfidence(compound: CompoundCommand): number {
    if (compound.commands.length === 0) return 0;
    
    const avgConfidence = compound.commands.reduce((sum, cmd) => {
      return sum + (cmd.resolvedObjects.reduce((objSum, obj) => objSum + obj.confidence, 0) / cmd.resolvedObjects.length || 0.5);
    }, 0) / compound.commands.length;

    return Math.min(avgConfidence, 0.95);
  }

  /**
   * Calculate confidence for context-resolved commands
   */
  private calculateContextConfidence(resolved: ResolvedCommand): number {
    if (resolved.resolvedObjects.length === 0) return 0.6;
    
    const avgObjectConfidence = resolved.resolvedObjects.reduce((sum, obj) => sum + obj.confidence, 0) / resolved.resolvedObjects.length;
    
    // Boost confidence if we resolved pronouns or spatial references
    let boost = 0;
    for (const obj of resolved.resolvedObjects) {
      if (obj.resolutionType === 'pronoun') boost += 0.1;
      if (obj.resolutionType === 'spatial') boost += 0.05;
    }

    return Math.min(avgObjectConfidence + boost, 0.95);
  }

  /**
   * Build reasoning string for context resolution
   */
  private buildReasoningString(resolved: ResolvedCommand): string {
    if (resolved.resolvedObjects.length === 0) {
      return 'Command resolved with context';
    }

    const resolutions = resolved.resolvedObjects.map(obj => 
      `"${obj.originalRef}" → "${obj.resolvedName}" (${obj.resolutionType})`
    ).join(', ');

    return `Context resolution: ${resolutions}`;
  }

  /**
   * Update context with game state information
   */
  public updateGameContext(roomObjects: any[], inventory: any[]): void {
    const allObjects = [...roomObjects, ...inventory];
    this.contextResolver.updateAvailableObjects(allObjects);
  }

  /**
   * Clear context when changing rooms
   */
  public clearRoomContext(): void {
    this.contextResolver.clearContext();
  }

  /**
   * Get enhanced statistics including context resolution
   */
  getStats() {
    const baseStats = super.getStats();
    return {
      ...baseStats,
      contextResolution: this.contextStats,
      contextResolver: this.contextResolver.getContextStats()
    };
  }

  /**
   * Reset all statistics including context
   */
  resetStats(): void {
    super.resetStats();
    this.contextStats = {
      contextResolutions: 0,
      pronounResolutions: 0,
      spatialResolutions: 0,
      compoundCommands: 0
    };
  }
}