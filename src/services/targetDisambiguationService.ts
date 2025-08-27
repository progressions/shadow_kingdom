import { PrismaService } from './prismaService';
import { GameStateManager } from './gameStateManager';
import { Item, Character, Connection } from '@prisma/client';

export interface RoomContext {
  roomId: number;
  items: Array<{ id: number; name: string }>;
  characters: Array<{ id: number; name: string; role?: string }>;
  exits: string[];
  roomDescription: string;
}

export interface ResolvedTarget {
  type: 'item' | 'character' | 'exit' | 'unknown';
  id?: number;
  name: string;
}

export interface TargetResolution {
  targets: ResolvedTarget[];
  confidence: number;
  issue?: string;
  suggestions?: string[];
}

export interface ParsedCommand {
  verb: string;
  target?: string;
  targetIds?: number[];
  confidence: number;
}

export interface FailureContext {
  rawInput: string;
  attemptedParsers: string[];
  partialMatches: Array<{
    parser: string;
    confidence: number;
    issue: string;
  }>;
  roomContext: RoomContext;
  suggestedInterpretations?: string[];
}

export interface ParseResult {
  success: boolean;
  command?: ParsedCommand;
  failureContext?: FailureContext;
}

export class TargetDisambiguationService {
  // Command verb mappings for "all" interpretation
  private readonly verbTargetMappings: Record<string, string> = {
    take: 'item',
    pickup: 'item',
    get: 'item',
    drop: 'inventory',
    discard: 'inventory',
    put: 'inventory',
    attack: 'character',
    fight: 'character',
    kill: 'character',
    talk: 'character',
    speak: 'character',
    go: 'exit',
    move: 'exit',
    walk: 'exit',
    run: 'exit',
  };

  // Command aliases
  private readonly commandAliases: Record<string, string> = {
    t: 'take',
    p: 'pickup',
    g: 'get',
    d: 'drop',
    n: 'go north',
    s: 'go south',
    e: 'go east',
    w: 'go west',
  };

  constructor(
    private readonly prismaService: PrismaService,
    private readonly gameStateManager: GameStateManager
  ) {}

  /**
   * Build complete room context for command parsing
   */
  async buildRoomContext(): Promise<RoomContext> {
    const currentRoom = this.gameStateManager.getCurrentRoom();
    if (!currentRoom) {
      return {
        roomId: 0,
        items: [],
        characters: [],
        exits: [],
        roomDescription: 'No room loaded',
      };
    }

    // Fetch items in room
    const items = await this.prismaService.client.item.findMany({
      where: {
        roomId: currentRoom.id,
      },
    });

    // Fetch characters in room
    const characters = await this.prismaService.client.character.findMany({
      where: {
        roomId: currentRoom.id,
      },
    });

    // Fetch available exits
    const connections = await this.prismaService.client.connection.findMany({
      where: {
        fromRoomId: currentRoom.id,
        toRoomId: { not: null },
      },
    });

    return {
      roomId: currentRoom.id,
      items: items.map(item => ({ id: item.id, name: item.name })),
      characters: characters.map(char => ({
        id: char.id,
        name: char.name,
        role: char.sentiment === 'hostile' ? 'hostile' : 'npc',
      })),
      exits: connections.map(conn => conn.direction),
      roomDescription: currentRoom.description,
    };
  }

  /**
   * Resolve a target string to actual game objects
   */
  async resolveTarget(targetString: string, verb: string): Promise<TargetResolution> {
    const context = await this.buildRoomContext();
    const targetType = this.verbTargetMappings[verb] || 'unknown';

    // Handle "all" keyword
    if (targetString.toLowerCase() === 'all') {
      // For inventory commands, get inventory items
      if (targetType === 'inventory') {
        return this.resolveInventoryTargets(true);
      }
      return this.resolveAllTargets(targetType, context);
    }

    // Handle specific target
    if (targetType === 'inventory') {
      return this.resolveInventoryTargets(false, targetString);
    }
    return this.resolveSpecificTarget(targetString, targetType, context);
  }

  /**
   * Resolve inventory targets for drop commands
   */
  private async resolveInventoryTargets(
    all: boolean,
    targetString?: string
  ): Promise<TargetResolution> {
    // Get current inventory
    const inventoryIds = this.gameStateManager.getInventory();

    if (inventoryIds.length === 0) {
      return {
        targets: [],
        confidence: 0.2,
        issue: "You're not carrying anything to drop",
      };
    }

    // Fetch item details
    const items = await this.prismaService.client.item.findMany({
      where: {
        id: { in: inventoryIds },
      },
    });

    if (all) {
      // Return all inventory items
      return {
        targets: items.map(item => ({
          type: 'item' as const,
          id: item.id,
          name: item.name,
        })),
        confidence: 0.95,
      };
    }

    // Find specific item in inventory
    if (!targetString) {
      return {
        targets: [],
        confidence: 0.1,
        issue: 'No target specified for drop',
      };
    }

    const normalizedTarget = targetString.toLowerCase().trim();

    // Try exact match
    const exactMatch = items.find(item => item.name.toLowerCase() === normalizedTarget);

    if (exactMatch) {
      return {
        targets: [
          {
            type: 'item' as const,
            id: exactMatch.id,
            name: exactMatch.name,
          },
        ],
        confidence: 1.0,
      };
    }

    // Try partial match
    const partialMatches = items.filter(
      item =>
        item.name.toLowerCase().includes(normalizedTarget) ||
        normalizedTarget.includes(item.name.toLowerCase())
    );

    if (partialMatches.length === 1) {
      return {
        targets: [
          {
            type: 'item' as const,
            id: partialMatches[0].id,
            name: partialMatches[0].name,
          },
        ],
        confidence: 0.85,
      };
    } else if (partialMatches.length > 1) {
      return {
        targets: partialMatches.map(item => ({
          type: 'item' as const,
          id: item.id,
          name: item.name,
        })),
        confidence: 0.6,
        issue: 'Multiple matches found in inventory',
        suggestions: partialMatches.map(item => item.name),
      };
    }

    return {
      targets: [],
      confidence: 0.1,
      issue: `You don't have a "${targetString}" to drop`,
    };
  }

  /**
   * Resolve "all" to appropriate targets based on verb
   */
  private resolveAllTargets(targetType: string, context: RoomContext): TargetResolution {
    let targets: ResolvedTarget[] = [];
    let confidence = 0.95;
    let issue: string | undefined;

    switch (targetType) {
      case 'item':
        targets = context.items.map(item => ({
          type: 'item' as const,
          id: item.id,
          name: item.name,
        }));
        if (targets.length === 0) {
          confidence = 0.2;
          issue = 'There are no items here to take';
        }
        break;

      case 'character':
        targets = context.characters.map(char => ({
          type: 'character' as const,
          id: char.id,
          name: char.name,
        }));
        if (targets.length === 0) {
          confidence = 0.2;
          issue = 'There are no characters here';
        }
        break;

      case 'exit':
        targets = context.exits.map(exit => ({
          type: 'exit' as const,
          name: exit,
        }));
        if (targets.length === 0) {
          confidence = 0.2;
          issue = 'There are no exits available';
        }
        break;

      default:
        confidence = 0.1;
        issue = 'Cannot determine what "all" refers to for this command';
    }

    return { targets, confidence, issue };
  }

  /**
   * Resolve a specific target with fuzzy matching
   */
  private resolveSpecificTarget(
    targetString: string,
    targetType: string,
    context: RoomContext
  ): TargetResolution {
    const normalizedTarget = targetString.toLowerCase().trim();
    let candidates: Array<{ type: 'item' | 'character' | 'exit'; id?: number; name: string }> = [];

    // Collect candidates based on target type
    if (targetType === 'item' || targetType === 'unknown') {
      candidates.push(
        ...context.items.map(item => ({
          type: 'item' as const,
          id: item.id,
          name: item.name,
        }))
      );
    }

    if (targetType === 'character' || targetType === 'unknown') {
      candidates.push(
        ...context.characters.map(char => ({
          type: 'character' as const,
          id: char.id,
          name: char.name,
        }))
      );
    }

    if (targetType === 'exit' || targetType === 'unknown') {
      candidates.push(
        ...context.exits.map(exit => ({
          type: 'exit' as const,
          name: exit,
        }))
      );
    }

    // Find matches
    const exactMatches = candidates.filter(c => c.name.toLowerCase() === normalizedTarget);

    if (exactMatches.length === 1) {
      // Perfect match
      return {
        targets: exactMatches,
        confidence: 1.0,
      };
    } else if (exactMatches.length > 1) {
      // Multiple exact matches (shouldn't normally happen)
      return {
        targets: exactMatches,
        confidence: 0.7,
        issue: 'Multiple exact matches found',
        suggestions: exactMatches.map(m => m.name),
      };
    }

    // Try partial matching
    const partialMatches = candidates.filter(
      c =>
        c.name.toLowerCase().includes(normalizedTarget) ||
        normalizedTarget.includes(c.name.toLowerCase())
    );

    if (partialMatches.length === 1) {
      // Single partial match - good confidence
      return {
        targets: partialMatches,
        confidence: 0.85,
      };
    } else if (partialMatches.length > 1) {
      // Multiple partial matches - ambiguous
      return {
        targets: partialMatches,
        confidence: 0.6,
        issue: 'Multiple matches found',
        suggestions: partialMatches.map(m => m.name),
      };
    }

    // Try fuzzy matching (starting with)
    const fuzzyMatches = candidates.filter(c => c.name.toLowerCase().startsWith(normalizedTarget));

    if (fuzzyMatches.length === 1) {
      return {
        targets: fuzzyMatches,
        confidence: 0.8,
      };
    } else if (fuzzyMatches.length > 1) {
      return {
        targets: fuzzyMatches,
        confidence: 0.5,
        issue: 'Multiple partial matches',
        suggestions: fuzzyMatches.map(m => m.name),
      };
    }

    // No matches found
    return {
      targets: [],
      confidence: 0.1,
      issue: `Cannot find "${targetString}" - no match`,
    };
  }

  /**
   * Parse a complete command string
   */
  async parseCommand(input: string): Promise<ParseResult> {
    const normalizedInput = input.trim().toLowerCase();

    // Check for command aliases first
    const aliasedCommand = this.commandAliases[normalizedInput] || normalizedInput;

    // Split into words
    const words = aliasedCommand.split(/\s+/);

    if (words.length === 0) {
      return this.createFailureResult(input, 'Empty command');
    }

    const verb = words[0];

    // Check if this is a known command verb
    const knownVerbs = [
      'take',
      'pickup',
      'get',
      'drop',
      'discard',
      'put',
      'attack',
      'fight',
      'talk',
      'speak',
      'go',
      'move',
      'walk',
      'look',
      'examine',
    ];

    if (!knownVerbs.includes(verb)) {
      return this.createFailureResult(input, `Unknown command verb: ${verb}`);
    }

    // For commands that don't need a target
    if (verb === 'look' && words.length === 1) {
      return {
        success: true,
        command: {
          verb: 'look',
          confidence: 1.0,
        },
      };
    }

    // Extract target (everything after the verb)
    const targetString = words.slice(1).join(' ');

    if (!targetString && verb !== 'look') {
      return this.createFailureResult(input, 'No target specified');
    }

    // Resolve the target
    const resolution = await this.resolveTarget(targetString, verb);

    // Determine success based on confidence
    if (resolution.confidence >= 0.8) {
      return {
        success: true,
        command: {
          verb,
          target: targetString,
          targetIds: resolution.targets.filter(t => t.id !== undefined).map(t => t.id!),
          confidence: resolution.confidence,
        },
      };
    }

    // Create failure context for AI handoff
    const context = await this.buildRoomContext();

    return {
      success: false,
      failureContext: {
        rawInput: input,
        attemptedParsers: ['natural'],
        partialMatches: [
          {
            parser: 'natural',
            confidence: resolution.confidence,
            issue: resolution.issue || 'Target resolution failed',
          },
        ],
        roomContext: context,
        suggestedInterpretations: resolution.suggestions,
      },
    };
  }

  /**
   * Create a failure result with context
   */
  private async createFailureResult(input: string, issue: string): Promise<ParseResult> {
    const context = await this.buildRoomContext();

    return {
      success: false,
      failureContext: {
        rawInput: input,
        attemptedParsers: ['natural'],
        partialMatches: [
          {
            parser: 'natural',
            confidence: 0,
            issue,
          },
        ],
        roomContext: context,
      },
    };
  }

  /**
   * Get command suggestions for partial input (for future use)
   */
  getSuggestions(partialCommand: string): string[] {
    const suggestions: string[] = [];
    const normalized = partialCommand.toLowerCase();

    // Check command verbs
    const verbs = Object.keys(this.verbTargetMappings);
    for (const verb of verbs) {
      if (verb.startsWith(normalized)) {
        suggestions.push(verb);
      }
    }

    // Check aliases
    for (const [alias, full] of Object.entries(this.commandAliases)) {
      if (alias.startsWith(normalized) || full.startsWith(normalized)) {
        suggestions.push(full);
      }
    }

    return suggestions;
  }
}
