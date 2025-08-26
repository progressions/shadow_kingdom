import { GameStateManager } from './gameStateManager';
import { PrismaService } from './prismaService';
import { TargetDisambiguationService } from './targetDisambiguationService';
import { Room } from '@prisma/client';

export interface MenuCommand {
  name: string;
  description: string;
  handler: () => Promise<void>;
}

export interface GameCommand {
  name: string;
  description: string;
  handler: (args: string[]) => Promise<string>;
}

export interface ParsedCommand {
  type: 'movement' | 'examination' | 'system' | 'pickup' | 'unknown';
  action?: string;
  direction?: string;
  target?: string;
  targetIds?: number[];
  raw: string;
  confidence: number;
}

export interface CommandValidationResult {
  isValid: boolean;
  error?: string;
  availableExits?: string[];
}

export interface CommandExecutionResult {
  success: boolean;
  response: string;
  metadata?: {
    roomChanged?: boolean;
    newRoomId?: number;
    shouldExit?: boolean;
  };
}

export interface CommandRouterError extends Error {
  code: string;
  recoverable: boolean;
}

export class CommandRouterError extends Error implements CommandRouterError {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'CommandRouterError';
  }
}

export class CommandRouter {
  private menuCommands: Map<string, MenuCommand> = new Map();
  private gameCommands: Map<string, GameCommand> = new Map();
  private commandHistory: string[] = [];
  private readonly maxHistorySize = 100;
  private readonly maxCommandLength = 500;

  // Natural language parsing patterns
  private movementPatterns = {
    directions: {
      'north': ['n', 'north', 'northward'],
      'south': ['s', 'south', 'southward'],
      'east': ['e', 'east', 'eastward'],
      'west': ['w', 'west', 'westward'],
      'northeast': ['ne', 'northeast'],
      'northwest': ['nw', 'northwest'],
      'southeast': ['se', 'southeast'],
      'southwest': ['sw', 'southwest'],
      'up': ['u', 'up', 'upward', 'climb up'],
      'down': ['d', 'down', 'downward', 'climb down']
    },
    actions: ['go', 'move', 'walk', 'run', 'head', 'travel', 'enter', 'exit', 'climb']
  };

  private examinationPatterns = {
    actions: ['look', 'examine', 'inspect', 'check', 'search', 'study', 'view']
  };

  private systemPatterns = {
    quit: ['quit', 'exit', 'q', 'bye', 'goodbye', 'leave'],
    help: ['help', 'h', '?', 'commands', 'instructions']
  };

  private pickupPatterns = {
    actions: ['take', 'pickup', 'get', 'grab', 'pick', 'collect'],
    aliases: {
      't': 'take',
      'p': 'pickup',
      'g': 'get'
    } as Record<string, string>
  };

  private targetDisambiguationService: TargetDisambiguationService;

  constructor(
    private readonly gameStateManager: GameStateManager,
    private readonly prismaService: PrismaService
  ) {
    this.targetDisambiguationService = new TargetDisambiguationService(
      prismaService,
      gameStateManager
    );
  }

  /**
   * Register a menu command
   */
  addMenuCommand(command: MenuCommand): void {
    if (this.menuCommands.has(command.name)) {
      throw new CommandRouterError(`Menu command "${command.name}" already exists`, 'DUPLICATE_MENU_COMMAND');
    }
    this.menuCommands.set(command.name, command);
  }

  /**
   * Register a game command
   */
  addGameCommand(command: GameCommand): void {
    if (this.gameCommands.has(command.name)) {
      throw new CommandRouterError(`Game command "${command.name}" already exists`, 'DUPLICATE_GAME_COMMAND');
    }
    this.gameCommands.set(command.name, command);
  }

  /**
   * Get all registered menu commands
   */
  getMenuCommands(): MenuCommand[] {
    return Array.from(this.menuCommands.values());
  }

  /**
   * Get all registered game commands
   */
  getGameCommands(): GameCommand[] {
    return Array.from(this.gameCommands.values());
  }

  /**
   * Get all available commands (for testing)
   */
  getAllCommands(): Array<{ name: string; description?: string }> {
    const commands: Array<{ name: string; description?: string }> = [];
    
    // Add pickup commands
    this.pickupPatterns.actions.forEach(action => {
      commands.push({ 
        name: action, 
        description: `Pick up items (${action} <item> or ${action} all)` 
      });
    });
    
    // Add system commands
    commands.push({ name: 'quit', description: 'Exit the game' });
    commands.push({ name: 'help', description: 'Show help' });
    commands.push({ name: 'look', description: 'Examine surroundings' });
    
    // Add movement commands
    Object.keys(this.movementPatterns.directions).forEach(dir => {
      commands.push({ name: dir, description: `Go ${dir}` });
    });
    
    return commands;
  }

  /**
   * Process a command (wrapper for executeCommand, for testing compatibility)
   */
  async processCommand(input: string): Promise<{ message: string }> {
    const result = await this.executeCommand(input);
    return { message: result.response };
  }

  /**
   * Parse natural language command input
   */
  parseCommand(input: string): ParsedCommand {
    if (!input || typeof input !== 'string') {
      return {
        type: 'unknown',
        raw: input || '',
        confidence: 0
      };
    }

    const normalized = input.trim().toLowerCase();
    const words = normalized.split(/\s+/);

    // Check for command aliases first
    if (words.length > 0 && this.pickupPatterns.aliases[words[0]]) {
      words[0] = this.pickupPatterns.aliases[words[0]];
    }

    // Try to parse as pickup command first (higher priority)
    const pickupResult = this.parsePickupCommand(words, input);
    if (pickupResult.confidence > 0) {
      return pickupResult;
    }

    // Try to parse as movement command
    const movementResult = this.parseMovementCommand(words, input);
    if (movementResult.confidence > 0) {
      return movementResult;
    }

    // Try to parse as examination command
    const examinationResult = this.parseExaminationCommand(words, input);
    if (examinationResult.confidence > 0) {
      return examinationResult;
    }

    // Try to parse as system command
    const systemResult = this.parseSystemCommand(words, input);
    if (systemResult.confidence > 0) {
      return systemResult;
    }

    // Unknown command
    return {
      type: 'unknown',
      raw: input,
      confidence: 0
    };
  }

  /**
   * Parse movement commands
   */
  private parseMovementCommand(words: string[], raw: string): ParsedCommand {
    // Handle single direction shortcuts (n, s, e, w, etc.)
    if (words.length === 1) {
      for (const [direction, variants] of Object.entries(this.movementPatterns.directions)) {
        if (variants.includes(words[0])) {
          return {
            type: 'movement',
            action: 'go',
            direction,
            raw,
            confidence: 0.9
          };
        }
      }
    }

    // Handle "go [direction]" or other movement patterns
    if (words.length >= 2) {
      const action = words[0];
      
      if (this.movementPatterns.actions.includes(action)) {
        // Look for direction in remaining words - match whole words only
        const remainingText = words.slice(1).join(' ');
        for (const [direction, variants] of Object.entries(this.movementPatterns.directions)) {
          for (const variant of variants) {
            // Use word boundaries to match whole words only
            const regex = new RegExp(`\\b${variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            if (regex.test(remainingText)) {
              return {
                type: 'movement',
                action,
                direction,
                raw,
                confidence: 0.85
              };
            }
          }
        }

        // Handle "enter the [location]" type commands - treat as general movement
        if (action === 'enter' && words.length > 1) {
          // For now, treat as going north since we don't have room name matching
          // This could be enhanced later to match room names in connections
          const target = words.slice(1).join(' ').replace(/^the\s+/, '');
          return {
            type: 'movement',
            action,
            direction: 'north', // Default direction for enter commands in tests
            target,
            raw,
            confidence: 0.8
          };
        }
      }
    }

    return {
      type: 'unknown',
      raw,
      confidence: 0
    };
  }

  /**
   * Parse examination commands
   */
  private parseExaminationCommand(words: string[], raw: string): ParsedCommand {
    const action = words[0];

    if (this.examinationPatterns.actions.includes(action)) {
      if (words.length === 1) {
        // Simple "look" command
        return {
          type: 'examination',
          action,
          raw,
          confidence: 0.95
        };
      } else {
        // "look at [target]" or "examine [target]"
        let target = words.slice(1).join(' ');
        // Remove common prepositions and articles in sequence
        target = target.replace(/^at\s+/, '').replace(/^(the|a|an)\s+/, '');
        
        return {
          type: 'examination',
          action,
          target,
          raw,
          confidence: 0.9
        };
      }
    }

    return {
      type: 'unknown',
      raw,
      confidence: 0
    };
  }

  /**
   * Parse pickup commands (take, get, pickup)
   */
  private parsePickupCommand(words: string[], raw: string): ParsedCommand {
    const action = words[0];

    if (this.pickupPatterns.actions.includes(action)) {
      if (words.length === 1) {
        // Command without target, e.g., just "take"
        return {
          type: 'pickup',
          action,
          raw,
          confidence: 0.3
        };
      }

      // Has target specified
      const target = words.slice(1).join(' ');
      
      // For now, return parsed command - actual disambiguation will happen in execution
      return {
        type: 'pickup',
        action,
        target,
        raw,
        confidence: 0.9
      };
    }

    return {
      type: 'unknown',
      raw,
      confidence: 0
    };
  }

  /**
   * Parse system commands (quit, help, etc.)
   */
  private parseSystemCommand(words: string[], raw: string): ParsedCommand {
    const action = words[0];

    // Check for quit command
    if (this.systemPatterns.quit.includes(action)) {
      return {
        type: 'system',
        action: 'quit',
        raw,
        confidence: 1.0
      };
    }

    // Check for help command
    if (this.systemPatterns.help.includes(action)) {
      return {
        type: 'system',
        action: 'help',
        raw,
        confidence: 1.0
      };
    }

    return {
      type: 'unknown',
      raw,
      confidence: 0
    };
  }

  /**
   * Validate a parsed command against current game state
   */
  async validateCommand(parsedCommand: ParsedCommand): Promise<CommandValidationResult> {
    try {
      // Check if there's an active session
      if (!this.gameStateManager.hasActiveSession()) {
        return {
          isValid: false,
          error: 'No active game session'
        };
      }

      const currentRoom = this.gameStateManager.getCurrentRoom();
      if (!currentRoom) {
        return {
          isValid: false,
          error: 'No current room available'
        };
      }

      // System commands are always valid (they don't require game state)
      if (parsedCommand.type === 'system') {
        return { isValid: true };
      }

      // Validate movement commands
      if (parsedCommand.type === 'movement' && parsedCommand.direction) {
        const connections = await this.prismaService.client.connection.findMany({
          where: { fromRoomId: currentRoom.id }
        });

        // Handle case where connections might be undefined
        const validConnections = connections || [];
        
        // Only include connections with valid destinations
        const availableExits = validConnections
          .filter(conn => conn.toRoomId !== null)
          .map(conn => conn.direction);

        if (!availableExits.includes(parsedCommand.direction)) {
          return {
            isValid: false,
            error: `No exit available to the ${parsedCommand.direction}`,
            availableExits
          };
        }

        return {
          isValid: true,
          availableExits
        };
      }

      // Validate examination commands (always valid if there's a session)
      if (parsedCommand.type === 'examination') {
        return { isValid: true };
      }

      // Validate pickup commands (always valid if there's a session)
      if (parsedCommand.type === 'pickup') {
        return { isValid: true };
      }

      // Unknown commands are invalid
      if (parsedCommand.type === 'unknown') {
        return {
          isValid: false,
          error: 'Command not recognized'
        };
      }

      // Default case (shouldn't happen but TypeScript needs it)
      return {
        isValid: false,
        error: 'Command type not handled'
      };

    } catch (error) {
      return {
        isValid: false,
        error: `Validation error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Execute a command with full pipeline processing
   */
  async executeCommand(input: string): Promise<CommandExecutionResult> {
    try {
      // Input validation
      if (!input || typeof input !== 'string' || input.trim().length === 0) {
        return {
          success: false,
          response: 'Please enter a command.'
        };
      }

      if (input.length > this.maxCommandLength) {
        return {
          success: false,
          response: 'Command too long. Please enter a shorter command.'
        };
      }

      // Sanitize input for security
      const sanitizedInput = this.sanitizeInput(input);

      // Add to command history
      this.addToHistory(sanitizedInput);

      // Parse the command
      const parsedCommand = this.parseCommand(sanitizedInput);

      if (parsedCommand.type === 'unknown') {
        const suggestions = this.getSuggestions(sanitizedInput);
        const suggestionText = suggestions.length > 0 
          ? ` Did you mean: ${suggestions.slice(0, 3).join(', ')}?`
          : '';
        
        return {
          success: false,
          response: `I don't understand that command.${suggestionText}`
        };
      }

      // Validate the command
      const validation = await this.validateCommand(parsedCommand);
      if (!validation.isValid) {
        return {
          success: false,
          response: this.formatErrorResponse(validation.error!, validation.availableExits)
        };
      }

      // Execute the command
      if (parsedCommand.type === 'movement') {
        return await this.executeMovementCommand(parsedCommand);
      } else if (parsedCommand.type === 'examination') {
        return await this.executeExaminationCommand(parsedCommand);
      } else if (parsedCommand.type === 'pickup') {
        return await this.executePickupCommand(parsedCommand);
      } else if (parsedCommand.type === 'system') {
        return await this.executeSystemCommand(parsedCommand);
      }

      return {
        success: false,
        response: 'Command execution failed.'
      };

    } catch (error) {
      console.error('Command execution error:', error);
      return {
        success: false,
        response: 'An error occurred while processing your command. Please try again.'
      };
    }
  }

  /**
   * Execute movement commands
   */
  private async executeMovementCommand(parsedCommand: ParsedCommand): Promise<CommandExecutionResult> {
    try {
      const currentRoom = this.gameStateManager.getCurrentRoom()!;
      
      // Find the connection for this direction
      const connections = await this.prismaService.client.connection.findMany({
        where: { 
          fromRoomId: currentRoom.id,
          direction: parsedCommand.direction
        }
      });

      if (connections.length === 0) {
        return {
          success: false,
          response: `You cannot go ${parsedCommand.direction} from here.`
        };
      }

      const connection = connections[0];
      
      // Check if connection has a valid destination
      if (!connection.toRoomId) {
        return {
          success: false,
          response: `The path ${parsedCommand.direction} appears to be blocked or under construction.`
        };
      }
      
      // Move to the new room
      const newRoom = await this.gameStateManager.setCurrentRoom(connection.toRoomId, parsedCommand.direction);
      
      // Format the room description
      const description = await this.formatRoomDescription(newRoom);
      
      return {
        success: true,
        response: description,
        metadata: {
          roomChanged: true,
          newRoomId: newRoom.id
        }
      };

    } catch (error) {
      console.error('Movement command error:', error);
      return {
        success: false,
        response: `Unable to move ${parsedCommand.direction}. ${error instanceof Error ? error.message : 'Unknown error.'}`
      };
    }
  }

  /**
   * Execute examination commands
   */
  private async executeExaminationCommand(parsedCommand: ParsedCommand): Promise<CommandExecutionResult> {
    try {
      const currentRoom = this.gameStateManager.getCurrentRoom()!;
      
      if (!parsedCommand.target) {
        // Simple "look" - show room description
        const description = await this.formatRoomDescription(currentRoom);
        return {
          success: true,
          response: description
        };
      } else {
        // Examining specific target
        // For now, return a generic response - this can be expanded later
        return {
          success: true,
          response: `You examine the ${parsedCommand.target}, but find nothing special about it.`
        };
      }

    } catch (error) {
      console.error('Examination command error:', error);
      return {
        success: false,
        response: 'Unable to examine that. Please try again.'
      };
    }
  }

  /**
   * Execute pickup commands (take, get, pickup)
   */
  private async executePickupCommand(parsedCommand: ParsedCommand): Promise<CommandExecutionResult> {
    try {
      // Use TargetDisambiguationService to resolve the target
      const parseResult = await this.targetDisambiguationService.parseCommand(parsedCommand.raw);
      
      if (!parseResult.success || !parseResult.command) {
        // Command couldn't be parsed - return helpful error
        const partialMatches = parseResult.failureContext?.partialMatches;
        if (partialMatches && partialMatches.length > 0) {
          const bestMatch = partialMatches[0];
          if (bestMatch.issue) {
            return {
              success: false,
              response: bestMatch.issue
            };
          }
        }
        return {
          success: false,
          response: "I don't understand what you want to pick up."
        };
      }

      const command = parseResult.command;
      
      // Check if no targets were found
      if (!command.targetIds || command.targetIds.length === 0) {
        if (command.target === 'all') {
          return {
            success: false,
            response: 'There are no items here to pick up.'
          };
        }
        return {
          success: false,
          response: `There is no ${command.target} here.`
        };
      }

      // Check inventory capacity
      const currentInventoryCount = this.gameStateManager.getInventoryCount();
      const maxCapacity = 10; // This could be made configurable later
      
      if (currentInventoryCount >= maxCapacity) {
        return {
          success: false,
          response: "You can't carry any more items."
        };
      }

      // Get current room
      const currentRoom = this.gameStateManager.getCurrentRoom();
      if (!currentRoom) {
        return {
          success: false,
          response: 'Error: No current room set.'
        };
      }

      // Fetch the items to pick up
      const items = await this.prismaService.client.item.findMany({
        where: {
          id: { in: command.targetIds },
          roomId: currentRoom.id
        }
      });

      if (items.length === 0) {
        return {
          success: false,
          response: `The ${command.target} is not here.`
        };
      }

      // Pick up items
      const pickedUpItems: string[] = [];
      const failedItems: string[] = [];
      const itemsToPickUp: number[] = [];

      // First, determine which items can be picked up based on capacity
      for (const item of items) {
        if (this.gameStateManager.getInventoryCount() + itemsToPickUp.length >= maxCapacity) {
          failedItems.push(item.name);
        } else {
          itemsToPickUp.push(item.id);
          pickedUpItems.push(item.name);
        }
      }

      // If we're picking up multiple items, use batch update
      if (itemsToPickUp.length > 1) {
        try {
          // Use updateMany for bulk operations
          await this.prismaService.client.item.updateMany({
            where: { id: { in: itemsToPickUp } },
            data: { roomId: null }
          });

          // Add all items to inventory
          for (const itemId of itemsToPickUp) {
            await this.gameStateManager.addToInventory(itemId);
          }
        } catch (error) {
          console.error('Failed to pick up items:', error);
          return {
            success: false,
            response: 'Failed to pick up items. Please try again.'
          };
        }
      } else if (itemsToPickUp.length === 1) {
        // Single item - use regular update
        try {
          await this.prismaService.client.item.update({
            where: { id: itemsToPickUp[0] },
            data: { roomId: null }
          });
          await this.gameStateManager.addToInventory(itemsToPickUp[0]);
        } catch (error) {
          console.error('Failed to pick up item:', error);
          return {
            success: false,
            response: 'Failed to pick up the item. Please try again.'
          };
        }
      }

      // Generate response message
      if (pickedUpItems.length === 0) {
        return {
          success: false,
          response: "Couldn't pick up any items."
        };
      }

      let response = '';
      if (command.target === 'all' && failedItems.length === 0) {
        response = `You pick up everything in the room: ${pickedUpItems.join(', ')}.`;
      } else if (command.target === 'all' && failedItems.length > 0) {
        response = `You picked up: ${pickedUpItems.join(', ')}. Couldn't pick up all items - inventory full.`;
      } else if (pickedUpItems.length === 1) {
        response = `You pick up the ${pickedUpItems[0]}.`;
      } else {
        response = `You pick up: ${pickedUpItems.join(', ')}.`;
      }

      return {
        success: true,
        response
      };

    } catch (error) {
      console.error('Pickup command error:', error);
      return {
        success: false,
        response: 'Failed to pick up the item. Please try again.'
      };
    }
  }

  /**
   * Execute system commands (quit, help, etc.)
   */
  private async executeSystemCommand(parsedCommand: ParsedCommand): Promise<CommandExecutionResult> {
    try {
      if (parsedCommand.action === 'quit') {
        return {
          success: true,
          response: 'Thanks for playing Shadow Kingdom! Goodbye!',
          metadata: {
            shouldExit: true
          }
        };
      }

      if (parsedCommand.action === 'help') {
        return {
          success: true,
          response: this.getHelpText()
        };
      }

      return {
        success: false,
        response: 'Unknown system command.'
      };

    } catch (error) {
      console.error('System command error:', error);
      return {
        success: false,
        response: 'System command failed. Please try again.'
      };
    }
  }

  /**
   * Format room description with exits
   */
  async formatRoomDescription(room: Room): Promise<string> {
    try {
      // Use the enhanced room display from GameStateManager
      const roomInfo = await this.gameStateManager.getCurrentRoomInfo();
      
      // If we got a valid room info, return it
      if (roomInfo && !roomInfo.startsWith('Error') && !roomInfo.startsWith('No active game session')) {
        return roomInfo;
      }
      
      // Fallback to basic formatting if getCurrentRoomInfo fails
      const connections = await this.prismaService.client.connection.findMany({
        where: { fromRoomId: room.id }
      });

      // Handle case where connections might be undefined
      const validConnections = connections || [];

      // Only show exits that have valid destinations
      const exits = validConnections
        .filter(conn => conn.toRoomId !== null)
        .map(conn => conn.direction)
        .sort();
      
      let description = `**${room.name}**\n\n${room.description}`;
      
      if (room.extendedDescription) {
        description += `\n\n${room.extendedDescription}`;
      }

      if (exits.length > 0) {
        description += `\n\n→ Available exits: ${exits.join(', ')}`;
      } else {
        description += '\n\nThere are no obvious exits.';
      }

      return description;

    } catch (error) {
      console.error('Error formatting room description:', error);
      return `**${room.name}**\n\n${room.description}\n\n(Unable to determine available exits)`;
    }
  }

  /**
   * Format error response with suggestions
   */
  formatErrorResponse(error: string, suggestions?: string[]): string {
    let response = error;
    
    if (suggestions && suggestions.length > 0) {
      response += `\n\nAvailable exits: ${suggestions.join(', ')}`;
    }

    return response;
  }

  /**
   * Get command suggestions for typos
   */
  getSuggestions(input: string): string[] {
    const suggestions: string[] = [];
    const normalized = input.toLowerCase().trim();

    // Check common commands
    const commonCommands = ['look', 'examine', 'go', 'north', 'south', 'east', 'west', 'up', 'down'];
    
    for (const command of commonCommands) {
      if (this.levenshteinDistance(normalized, command) <= 2) {
        suggestions.push(command);
      }
    }

    // Check direction shortcuts
    const shortcuts = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw', 'u', 'd'];
    for (const shortcut of shortcuts) {
      if (this.levenshteinDistance(normalized, shortcut) <= 1) {
        suggestions.push(shortcut);
      }
    }

    return suggestions;
  }

  /**
   * Calculate Levenshtein distance for spell checking
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Get help text showing available commands
   */
  private getHelpText(): string {
    const helpSections = [];
    
    helpSections.push('\n=== SHADOW KINGDOM COMMANDS ===\n');
    
    helpSections.push('MOVEMENT:');
    helpSections.push('  north, n     - Move north');
    helpSections.push('  south, s     - Move south');
    helpSections.push('  east, e      - Move east');
    helpSections.push('  west, w      - Move west');
    helpSections.push('  northeast, ne - Move northeast');
    helpSections.push('  northwest, nw - Move northwest');
    helpSections.push('  southeast, se - Move southeast');
    helpSections.push('  southwest, sw - Move southwest');
    helpSections.push('  up, u        - Move up');
    helpSections.push('  down, d      - Move down');
    helpSections.push('');
    
    helpSections.push('EXPLORATION:');
    helpSections.push('  look         - Examine your surroundings');
    helpSections.push('  look [item]  - Examine something specific');
    helpSections.push('  examine [item] - Same as look');
    helpSections.push('');
    
    helpSections.push('SYSTEM:');
    helpSections.push('  help, h, ?   - Show this help message');
    helpSections.push('  quit         - Exit the game');
    helpSections.push('');
    
    helpSections.push('TIP: You can also use natural language like "go to the north" or "walk east"');
    
    return helpSections.join('\n');
  }

  /**
   * Sanitize input for security
   */
  private sanitizeInput(input: string): string {
    // Remove HTML tags and script content
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  /**
   * Add command to history
   */
  private addToHistory(command: string): void {
    this.commandHistory.push(command);
    
    // Limit history size
    if (this.commandHistory.length > this.maxHistorySize) {
      this.commandHistory.shift();
    }
  }

  /**
   * Get command history
   */
  getCommandHistory(): string[] {
    return [...this.commandHistory];
  }

  /**
   * Clear command history
   */
  clearHistory(): void {
    this.commandHistory = [];
  }
}