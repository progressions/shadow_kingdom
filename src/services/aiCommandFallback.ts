import { GrokClient } from '../ai/grokClient';
import { GameContext, NLPResult } from '../nlp/types';
import { TUIInterface } from '../ui/TUIInterface';
import { MessageType } from '../ui/MessageFormatter';

export interface AICommandPrompt {
  userInput: string;
  roomContext: {
    roomName: string;
    roomDescription: string;
    availableItems: string[];
    availableCharacters: string[];
    availableExits: string[];
  };
  availableCommands: string[];
}

export interface AICommandResponse {
  command: string;
  target: string;
  reasoning?: string;
}

export interface AICommandFallbackOptions {
  enableDebugLogging?: boolean;
}

/**
 * AICommandFallback provides AI-powered command parsing when standard parsing fails.
 * It uses the AI service to interpret natural language commands with full room context.
 */
export class AICommandFallback {
  private grokClient: GrokClient;
  private options: AICommandFallbackOptions;
  private tui: TUIInterface | null;

  constructor(
    grokClient: GrokClient,
    tui: TUIInterface | null = null,
    options: AICommandFallbackOptions = {}
  ) {
    this.grokClient = grokClient;
    this.tui = tui;
    this.options = {
      enableDebugLogging: false,
      ...options
    };
  }

  /**
   * Parse a command using AI with full room context
   */
  async parseCommand(input: string, gameContext: GameContext, availableCommands: string[]): Promise<NLPResult | null> {
    try {
      const startTime = Date.now();
      
      // Assemble room context for AI prompt
      const roomContext = await this.assembleRoomContext(gameContext);
      
      if (this.isDebugEnabled()) {
        this.log(`🧠 AI Fallback: Attempting to parse "${input}" with room context`, MessageType.SYSTEM);
      }
      
      // Generate AI prompt
      const prompt = this.buildCommandPrompt(input, roomContext, availableCommands);
      
      // Call AI service for command interpretation
      const aiResponse = await this.callAIForCommandParsing(prompt, input, roomContext);
      
      if (!aiResponse || !aiResponse.command || !aiResponse.target) {
        if (this.isDebugEnabled()) {
          this.log(`🧠 AI Fallback: Failed to parse command "${input}"`, MessageType.SYSTEM);
        }
        return null;
      }

      // Map AI response to command and parameters
      const action = this.normalizeCommand(aiResponse.command);
      const params = this.parseTarget(aiResponse.target);
      
      const processingTime = Date.now() - startTime;
      
      if (this.isDebugEnabled()) {
        this.log(
          `🧠 AI Fallback: "${input}" → "${action} ${params.join(' ')}" (${processingTime}ms)`,
          MessageType.SYSTEM
        );
        if (aiResponse.reasoning) {
          this.log(`   AI Reasoning: ${aiResponse.reasoning}`, MessageType.SYSTEM);
        }
      }

      return {
        action,
        params,
        source: 'ai',
        processingTime,
        reasoning: aiResponse.reasoning
      };
      
    } catch (error) {
      if (this.isDebugEnabled()) {
        this.log(`🧠 AI Fallback Error: ${error instanceof Error ? error.message : String(error)}`, MessageType.ERROR);
      }
      return null;
    }
  }

  /**
   * Assemble room context from game state
   */
  private async assembleRoomContext(gameContext: GameContext): Promise<AICommandPrompt['roomContext']> {
    const room = gameContext.currentRoom;
    
    if (!room) {
      return {
        roomName: 'Unknown Location',
        roomDescription: 'You are in an unknown location.',
        availableItems: [],
        availableCharacters: [],
        availableExits: []
      };
    }

    // TODO: In a full implementation, we would query the database for items and characters
    // For now, we'll use placeholder data based on room description
    const availableItems = this.extractItemsFromDescription(room.description);
    const availableCharacters = this.extractCharactersFromDescription(room.description);
    const availableExits = room.availableExits || [];

    return {
      roomName: room.name,
      roomDescription: room.description,
      availableItems,
      availableCharacters,
      availableExits
    };
  }

  /**
   * Build AI prompt for command parsing
   */
  private buildCommandPrompt(
    userInput: string,
    roomContext: AICommandPrompt['roomContext'],
    availableCommands: string[]
  ): string {
    return `You are a command parser for a text adventure game. The player said: "${userInput}"

Current room: ${roomContext.roomName}
${roomContext.roomDescription}

Available items: ${roomContext.availableItems.join(', ') || 'none'}
Available characters: ${roomContext.availableCharacters.join(', ') || 'none'}
Available exits: ${roomContext.availableExits.join(', ') || 'none'}

Available commands: ${availableCommands.join(', ')}

Please determine what command the player intended and what target they want to interact with.
Handle synonyms and natural language patterns:

- Movement: go, move, walk, travel, head → "go"
- Examination: look at, inspect, check, view, study → "examine" 
- Getting items: pick up, take, grab, collect, acquire → "get"
- Talking: speak to, chat with, converse with, ask → "talk"
- Attack: hit, strike, fight, kill, slay → "attack"
- Give: hand, offer, present, deliver → "give"
- Drop: put down, leave, discard, place → "drop"

Examples:
- "hit the goblin" → {"command": "attack", "target": "goblin"}
- "I want to pick up the sword" → {"command": "get", "target": "sword"}
- "examine that orb" → {"command": "examine", "target": "orb"}
- "speak with the merchant" → {"command": "talk", "target": "merchant"}
- "walk north" → {"command": "go", "target": "north"}

Return a JSON object with: {"command": "...", "target": "...", "reasoning": "..."}
If you cannot determine a valid command, return null.`;
  }

  /**
   * Call AI service for command parsing
   */
  private async callAIForCommandParsing(
    prompt: string, 
    userInput: string, 
    roomContext: AICommandPrompt['roomContext']
  ): Promise<AICommandResponse | null> {
    try {
      const interpretationContext = {
        command: userInput,
        currentRoom: {
          name: roomContext.roomName,
          description: roomContext.roomDescription,
          availableExits: roomContext.availableExits,
        },
        inventory: roomContext.availableItems,
        recentCommands: []
      };

      const result = await this.grokClient.interpretCommand(interpretationContext);
      
      if (result) {
        // Log AI interpretation results for debugging
        if (this.isDebugEnabled()) {
          const fs = require('fs');
          const timestamp = new Date().toISOString();
          const logEntry = `\n\n========= COMMAND INTERPRETATION ${timestamp} =========\nInput: ${userInput}\nAI Response: ${JSON.stringify(result, null, 2)}\n`;
          fs.appendFileSync('grok_responses.log', logEntry);
        }
        
        return {
          command: result.action,
          target: result.params.join(' '),
          reasoning: result.reasoning
        };
      }
      
      return null;
    } catch (error) {
      if (this.isDebugEnabled()) {
        this.log(`🧠 AI Fallback Error: ${error instanceof Error ? error.message : String(error)}`, MessageType.ERROR);
      }
      return null;
    }
  }

  /**
   * Normalize AI command to standard game commands
   */
  private normalizeCommand(aiCommand: string): string {
    const commandMap: { [key: string]: string } = {
      'move': 'go',
      'walk': 'go',
      'travel': 'go',
      'head': 'go',
      'look': 'examine',
      'inspect': 'examine',
      'check': 'examine',
      'view': 'examine',
      'study': 'examine',
      'take': 'get',
      'grab': 'get',
      'pick': 'get',
      'collect': 'get',
      'acquire': 'get',
      'speak': 'talk',
      'chat': 'talk',
      'converse': 'talk',
      'ask': 'talk',
      'hit': 'attack',
      'strike': 'attack',
      'fight': 'attack',
      'kill': 'attack',
      'slay': 'attack',
      'hand': 'give',
      'offer': 'give',
      'present': 'give',
      'deliver': 'give',
      'leave': 'drop',
      'discard': 'drop',
      'place': 'drop'
    };

    return commandMap[aiCommand.toLowerCase()] || aiCommand.toLowerCase();
  }

  /**
   * Parse target string into parameters array
   */
  private parseTarget(target: string): string[] {
    if (!target) return [];
    
    // Remove common articles and prepositions
    const cleaned = target
      .toLowerCase()
      .replace(/^(the|a|an)\s+/, '')
      .replace(/\s+(to|with|at|on|in)\s+/, ' ')
      .trim();
    
    return cleaned ? cleaned.split(/\s+/) : [];
  }

  /**
   * Extract potential items from room description (placeholder implementation)
   */
  private extractItemsFromDescription(description: string): string[] {
    const items: string[] = [];
    const commonItems = ['sword', 'key', 'book', 'lamp', 'chest', 'table', 'chair', 'orb', 'crystal', 'gem'];
    
    for (const item of commonItems) {
      if (description.toLowerCase().includes(item)) {
        items.push(item);
      }
    }
    
    return items;
  }

  /**
   * Extract potential characters from room description (placeholder implementation)
   */
  private extractCharactersFromDescription(description: string): string[] {
    const characters: string[] = [];
    const commonCharacters = ['goblin', 'merchant', 'guard', 'wizard', 'knight', 'thief', 'priest'];
    
    for (const character of commonCharacters) {
      if (description.toLowerCase().includes(character)) {
        characters.push(character);
      }
    }
    
    return characters;
  }

  /**
   * Check if debug logging is enabled
   */
  private isDebugEnabled(): boolean {
    return this.options.enableDebugLogging || process.env.AI_DEBUG_LOGGING === 'true';
  }

  /**
   * Log message to TUI or console
   */
  private log(message: string, messageType: MessageType = MessageType.NORMAL): void {
    if (this.tui) {
      this.tui.display(message, messageType);
    } else {
      console.log(message);
    }
  }

  /**
   * Update options
   */
  updateOptions(options: Partial<AICommandFallbackOptions>): void {
    this.options = { ...this.options, ...options };
  }
}