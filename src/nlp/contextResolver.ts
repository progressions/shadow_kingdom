import { GameContext } from './types';

/**
 * Context information for advanced NLP resolution
 */
export interface ExtendedGameContext extends GameContext {
  availableObjects?: ContextObject[];
  recentNPCs?: ContextNPC[];
  recentItems?: ContextItem[];
  roomFeatures?: RoomFeature[];
  lastAction?: LastAction;
}

export interface ContextObject {
  name: string;
  type: 'item' | 'npc' | 'feature' | 'exit';
  aliases: string[];
  description?: string;
  location: 'room' | 'inventory';
  properties?: ObjectProperty[];
}

export interface ContextNPC {
  name: string;
  aliases: string[];
  lastInteraction?: 'talked' | 'examined' | 'mentioned';
  pronouns: PronounSet;
}

export interface ContextItem {
  name: string;
  aliases: string[];
  lastInteraction?: 'examined' | 'taken' | 'used' | 'mentioned';
  location: 'room' | 'inventory' | 'gone';
}

export interface RoomFeature {
  name: string;
  aliases: string[];
  type: 'door' | 'furniture' | 'decoration' | 'landmark';
  canInteract: boolean;
  spatialRelation?: 'north' | 'south' | 'east' | 'west' | 'center' | 'corner';
}

export interface LastAction {
  action: string;
  target?: string;
  result: 'success' | 'failure';
  timestamp: number;
}

export interface PronounSet {
  subject: string;    // he, she, it, they
  object: string;     // him, her, it, them
  possessive: string; // his, her, its, their
}

export interface ObjectProperty {
  key: string;
  value: string;
}

export interface CompoundCommand {
  commands: ResolvedCommand[];
  connector: 'and' | 'then' | 'or';
}

export interface ResolvedCommand {
  action: string;
  params: string[];
  resolvedObjects: ResolvedObject[];
}

export interface ResolvedObject {
  originalRef: string;  // What user typed: "it", "the door", "sword"
  resolvedName: string; // What it resolves to: "rusty sword", "oak door"
  confidence: number;
  resolutionType: 'exact' | 'pronoun' | 'spatial' | 'contextual';
  reasoning?: string;
}

/**
 * Advanced context resolver for natural language commands
 */
export class ContextResolver {
  private recentObjects: Map<string, ContextObject> = new Map();
  private pronounReferents: Map<string, string> = new Map(); // pronoun -> object name
  private spatialMap: Map<string, RoomFeature[]> = new Map(); // roomId -> features
  private interactionHistory: LastAction[] = [];

  /**
   * Resolve pronouns, spatial references, and object ambiguity in a command
   */
  public async resolveContext(
    command: string, 
    context: ExtendedGameContext
  ): Promise<ResolvedCommand | CompoundCommand | null> {
    
    // Check if this is a compound command
    const compoundResult = this.parseCompoundCommand(command);
    if (compoundResult) {
      return await this.resolveCompoundCommand(compoundResult, context);
    }

    // Parse single command
    const parsed = this.parseBasicCommand(command);
    if (!parsed) return null;

    // Resolve object references
    const resolvedObjects = await this.resolveObjectReferences(parsed.objects, context);
    
    return {
      action: parsed.action,
      params: resolvedObjects.map(obj => obj.resolvedName),
      resolvedObjects
    };
  }

  /**
   * Parse compound commands like "take sword and examine it"
   */
  private parseCompoundCommand(command: string): { parts: string[], connector: string } | null {
    // Look for compound command patterns
    const andPattern = /(.+?)\s+and\s+(.+)/i;
    const thenPattern = /(.+?)\s+then\s+(.+)/i;
    const commaPattern = /(.+?),\s*(.+)/;

    let match;
    let connector = 'and';

    if ((match = command.match(thenPattern))) {
      connector = 'then';
    } else if ((match = command.match(andPattern))) {
      connector = 'and';
    } else if ((match = command.match(commaPattern))) {
      connector = 'and';
    }

    if (match) {
      return {
        parts: [match[1].trim(), match[2].trim()],
        connector
      };
    }

    return null;
  }

  /**
   * Resolve compound commands recursively
   */
  private async resolveCompoundCommand(
    compound: { parts: string[], connector: string }, 
    context: ExtendedGameContext
  ): Promise<CompoundCommand | null> {
    
    const resolvedCommands: ResolvedCommand[] = [];
    let workingContext = { ...context };

    for (const part of compound.parts) {
      const resolved = await this.resolveContext(part, workingContext);
      
      if (!resolved || 'commands' in resolved) {
        // Failed to resolve or got nested compound (not supported yet)
        return null;
      }

      resolvedCommands.push(resolved);
      
      // Update working context for next command (for pronoun chaining)
      this.updateContextFromAction(resolved, workingContext);
    }

    return {
      commands: resolvedCommands,
      connector: compound.connector as 'and' | 'then' | 'or'
    };
  }

  /**
   * Parse basic command structure
   */
  private parseBasicCommand(command: string): { action: string, objects: string[] } | null {
    const normalized = command.toLowerCase().trim();
    
    // Common action patterns
    const patterns = [
      { pattern: /^(go|move|walk|head|travel)\s+(.+)$/, action: 'go' },
      { pattern: /^(look|examine|inspect|check)\s+(?:at\s+)?(.+)$/, action: 'examine' },
      { pattern: /^(take|get|grab|pick\s+up)\s+(.+)$/, action: 'take' },
      { pattern: /^(talk|speak|chat)\s+(?:to|with)\s+(.+)$/, action: 'talk' },
      { pattern: /^(use|activate|operate)\s+(.+)$/, action: 'use' },
      { pattern: /^(open|close)\s+(.+)$/, action: 'open' },
      { pattern: /^(attack|hit|strike)\s+(.+)$/, action: 'attack' }
    ];

    for (const { pattern, action } of patterns) {
      const match = normalized.match(pattern);
      if (match) {
        return {
          action,
          objects: [match[2]]
        };
      }
    }

    return null;
  }

  /**
   * Resolve object references including pronouns and spatial references
   */
  private async resolveObjectReferences(
    objects: string[], 
    context: ExtendedGameContext
  ): Promise<ResolvedObject[]> {
    
    const resolved: ResolvedObject[] = [];

    for (const objRef of objects) {
      const resolution = await this.resolveObjectReference(objRef, context);
      if (resolution) {
        resolved.push(resolution);
      }
    }

    return resolved;
  }

  /**
   * Resolve a single object reference
   */
  private async resolveObjectReference(
    objRef: string, 
    context: ExtendedGameContext
  ): Promise<ResolvedObject | null> {
    
    const normalized = objRef.toLowerCase().trim();

    // 1. Check for pronouns
    const pronounResolution = this.resolvePronoun(normalized, context);
    if (pronounResolution) {
      return pronounResolution;
    }

    // 2. Check for spatial references
    const spatialResolution = this.resolveSpatialReference(normalized, context);
    if (spatialResolution) {
      return spatialResolution;
    }

    // 3. Check for exact object matches
    const exactResolution = this.resolveExactObject(normalized, context);
    if (exactResolution) {
      return exactResolution;
    }

    // 4. Check for contextual matches (partial names, aliases)
    const contextualResolution = this.resolveContextualObject(normalized, context);
    if (contextualResolution) {
      return contextualResolution;
    }

    return null;
  }

  /**
   * Resolve pronouns to recent objects
   */
  private resolvePronoun(pronoun: string, context: ExtendedGameContext): ResolvedObject | null {
    const pronounMap: { [key: string]: string[] } = {
      'it': ['it'],
      'him': ['him'],
      'her': ['her'],
      'them': ['them', 'they'],
      'this': ['this'],
      'that': ['that']
    };

    for (const [canonical, variants] of Object.entries(pronounMap)) {
      if (variants.includes(pronoun)) {
        const referent = this.pronounReferents.get(canonical);
        if (referent) {
          return {
            originalRef: pronoun,
            resolvedName: referent,
            confidence: 0.9,
            resolutionType: 'pronoun',
            reasoning: `Pronoun "${pronoun}" refers to "${referent}"`
          };
        }
      }
    }

    return null;
  }

  /**
   * Resolve spatial references like "the door", "the fountain"
   */
  private resolveSpatialReference(ref: string, context: ExtendedGameContext): ResolvedObject | null {
    if (!context.roomFeatures) return null;

    // Remove articles
    const cleaned = ref.replace(/^(?:the|a|an)\s+/, '');
    
    for (const feature of context.roomFeatures) {
      if (feature.name.toLowerCase().includes(cleaned) || 
          feature.aliases.some(alias => alias.toLowerCase().includes(cleaned))) {
        return {
          originalRef: ref,
          resolvedName: feature.name,
          confidence: 0.85,
          resolutionType: 'spatial',
          reasoning: `Spatial reference "${ref}" matches room feature "${feature.name}"`
        };
      }
    }

    return null;
  }

  /**
   * Resolve exact object matches
   */
  private resolveExactObject(ref: string, context: ExtendedGameContext): ResolvedObject | null {
    if (!context.availableObjects) return null;

    for (const obj of context.availableObjects) {
      if (obj.name.toLowerCase() === ref || 
          obj.aliases.some(alias => alias.toLowerCase() === ref)) {
        return {
          originalRef: ref,
          resolvedName: obj.name,
          confidence: 1.0,
          resolutionType: 'exact',
          reasoning: `Exact match for "${ref}"`
        };
      }
    }

    return null;
  }

  /**
   * Resolve contextual object matches (partial, fuzzy)
   */
  private resolveContextualObject(ref: string, context: ExtendedGameContext): ResolvedObject | null {
    if (!context.availableObjects) return null;

    const cleaned = ref.replace(/^(?:the|a|an)\s+/, '');
    
    for (const obj of context.availableObjects) {
      // Check if object name contains the reference
      if (obj.name.toLowerCase().includes(cleaned)) {
        return {
          originalRef: ref,
          resolvedName: obj.name,
          confidence: 0.8,
          resolutionType: 'contextual',
          reasoning: `Contextual match: "${ref}" partially matches "${obj.name}"`
        };
      }
    }

    return null;
  }

  /**
   * Update context after an action for pronoun chaining
   */
  private updateContextFromAction(action: ResolvedCommand, context: ExtendedGameContext): void {
    // Update pronoun referents based on the action
    if (action.resolvedObjects.length > 0) {
      const primaryObject = action.resolvedObjects[0];
      
      // Set "it" to refer to the last object interacted with
      this.pronounReferents.set('it', primaryObject.resolvedName);
      
      // Update interaction history
      this.interactionHistory.unshift({
        action: action.action,
        target: primaryObject.resolvedName,
        result: 'success', // Assume success for now
        timestamp: Date.now()
      });
      
      // Keep only recent history
      if (this.interactionHistory.length > 10) {
        this.interactionHistory.pop();
      }
    }
  }

  /**
   * Update available objects from game state
   */
  public updateAvailableObjects(objects: ContextObject[]): void {
    this.recentObjects.clear();
    for (const obj of objects) {
      this.recentObjects.set(obj.name.toLowerCase(), obj);
    }
  }

  /**
   * Clear context (e.g., when changing rooms)
   */
  public clearContext(): void {
    this.pronounReferents.clear();
    this.interactionHistory = [];
  }

  /**
   * Get context statistics for debugging
   */
  public getContextStats() {
    return {
      availableObjects: this.recentObjects.size,
      pronounReferents: Object.fromEntries(this.pronounReferents),
      recentActions: this.interactionHistory.length
    };
  }
}