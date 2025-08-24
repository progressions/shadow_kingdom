import { GrokClient } from '../ai/grokClient';
import { GameContext, NLPResult } from '../nlp/types';
import { TUIInterface } from '../ui/TUIInterface';
import { MessageType } from '../ui/MessageFormatter';
import Database from '../utils/database';
import { ItemService } from '../services/itemService';
import { CharacterService } from '../services/characterService';
import { RoomItem } from '../types/item';
import { Character, CharacterType } from '../types/character';

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
  private db: Database;
  private itemService: ItemService;
  private characterService: CharacterService;

  constructor(
    grokClient: GrokClient,
    db: Database,
    tui: TUIInterface | null = null,
    options: AICommandFallbackOptions = {}
  ) {
    this.grokClient = grokClient;
    this.db = db;
    this.tui = tui;
    this.itemService = new ItemService(db);
    this.characterService = new CharacterService(db);
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
      const params = aiResponse.target ? [aiResponse.target] : [];
      
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

    // Get real items and characters from database
    const roomItems = await this.itemService.getRoomItems(room.id);
    const roomCharacters = await this.characterService.getRoomCharacters(room.id, CharacterType.PLAYER);
    const availableExits = room.availableExits || [];

    // Extract names for AI context
    const availableItems = roomItems.map(roomItem => roomItem.item.name);
    const availableCharacters = roomCharacters.map(char => char.name);

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
    return `You are interpreting a command for the text adventure game Shadow Kingdom.

ROOM CONTEXT:
Room: "${roomContext.roomName}"
Items in room: ${JSON.stringify(roomContext.availableItems)}
Characters in room: ${JSON.stringify(roomContext.availableCharacters)}
Available exits: ${JSON.stringify(roomContext.availableExits)}
Available commands: ${JSON.stringify(availableCommands)}

USER COMMAND: "${userInput}"

CRITICAL DISAMBIGUATION RULES:
1. COMMAND SELECTION: Choose the best matching command from the available commands list
   - Consider the user's intent and select the most appropriate game command
   - User verbs like "yell", "shout", "holler" should map to social interaction commands if available
   - User verbs like "grab", "pick up" should map to collection commands if available
   
2. TARGET DISAMBIGUATION: Match user references to exact room entities:
   - "ghost", "spirit", "spectre" → match ANY character containing these words
   - "figure", "guy", "person", "someone" → match ANY character that could be a person/entity
   - "keeper" → match "Garden Keeper"
   - "book", "tome", "scroll" → match ANY item containing these words
   - "sword", "weapon", "blade" → match ANY item containing these words
   - "that X", "the X" → find character/item containing word X
   - Generic terms like "guy", "person", "someone" should match the most likely character in the room
   - Generic terms like "book", "thing", "object" should match the most likely item in the room
   - "everything", "all items", "all the things" should return "all" for collection commands
   
3. ALWAYS use EXACT, FULL names from the room context lists
4. Do NOT use shortened or simplified names
5. ONLY use commands from the available commands list provided

EXAMPLES WITH ROOM CONTEXT:
Available commands: ["talk", "get", "examine", "go", "help"]
Room has character "Chef's Spirit":
- "talk to that ghost" → {"command": "talk", "target": "Chef's Spirit"}
- "yell at the ghost" → {"command": "talk", "target": "Chef's Spirit"} (best social command available)
- "holler at that spirit" → {"command": "talk", "target": "Chef's Spirit"} (best social command available)

Available commands: ["talk", "get", "examine", "go", "attack"]  
Room has character "Mysterious Figure":
- "yell at the figure" → {"command": "talk", "target": "Mysterious Figure"} (best social command available)
- "speak to that figure" → {"command": "talk", "target": "Mysterious Figure"}
- "rap at that guy" → {"command": "talk", "target": "Mysterious Figure"} (generic "guy" matches available character)

Available commands: ["talk", "get", "examine", "go"]
Room has item "Ancient Tome":
- "grab the book" → {"command": "get", "target": "Ancient Tome"} (best collection command available)
- "pick up that book" → {"command": "get", "target": "Ancient Tome"} (best collection command available)
- "take that thing" → {"command": "get", "target": "Ancient Tome"} (generic "thing" matches available item)

Available commands: ["talk", "get", "examine", "go", "attack"]
Room has item "Iron Sword":
- "grab the weapon" → {"command": "get", "target": "Iron Sword"} (weapon matches sword)
- "examine that blade" → {"command": "examine", "target": "Iron Sword"} (blade matches sword)

Available commands: ["get", "examine", "go"]
Room has items "Ancient Tome", "Iron Sword", "Health Potion":
- "grab everything" → {"command": "get", "target": "all"} (take all available items)
- "take all the things" → {"command": "get", "target": "all"} (take all available items)
- "collect all items" → {"command": "get", "target": "all"} (take all available items)
- "pick up everything here" → {"command": "get", "target": "all"} (take all available items)

RESPONSE FORMAT:
Return JSON: {"command": "action_name", "target": "EXACT_NAME_FROM_LISTS"}

The target MUST be the exact, complete name from the room context lists above.`;
  }

  /**
   * Call AI service for command parsing using the enhanced prompt format
   */
  private async callAIForCommandParsing(
    prompt: string, 
    userInput: string, 
    roomContext: AICommandPrompt['roomContext']
  ): Promise<AICommandResponse | null> {
    try {
      if (this.isDebugEnabled()) {
        this.log(`🧠 AI Fallback: Calling AI with mock mode: ${this.grokClient.isMockMode}`, MessageType.SYSTEM);
      }
      
      // Use the enhanced prompt directly with Grok API for better disambiguation
      if (this.grokClient.isMockMode) {
        // For mock mode, use the old interface
        const interpretationContext = {
          command: userInput,
          currentRoom: {
            name: roomContext.roomName,
            description: roomContext.roomDescription,
            availableExits: roomContext.availableExits,
            characters: roomContext.availableCharacters,
          },
          inventory: roomContext.availableItems,
          recentCommands: []
        };
        const result = await this.grokClient.interpretCommand(interpretationContext);
        
        if (result) {
          return {
            command: result.action,
            target: result.params.join(' '),
            reasoning: result.reasoning
          };
        }
        return null;
      } else {
        // For real API, use the enhanced prompt directly
        const response = await this.grokClient.callAPI(prompt);
        
        // Log the enhanced prompt response with enhanced visual formatting
        if (this.isDebugEnabled()) {
          const fs = require('fs');
          const timestamp = new Date().toISOString();
          
          const logData = {
            timestamp,
            type: 'ENHANCED_COMMAND_INTERPRETATION',
            input: userInput,
            prompt: prompt,
            aiResponse: response,
            parsed: null as any // Will be set after parsing
          };
          
          // Try to parse the response to include parsed data
          try {
            logData.parsed = JSON.parse(response);
          } catch (parseError) {
            logData.parsed = { error: 'Failed to parse AI response as JSON', rawResponse: response };
          }
          
          // Use JsonFormatter for enhanced visual formatting
          const { JsonFormatter } = require('../utils/jsonFormatter');
          const formattedContent = JsonFormatter.formatJsonData(logData);
          const fileContent = JsonFormatter.stripColors(formattedContent);
          
          fs.appendFileSync('grok_responses.log', fileContent);
        }
        
        const parsed = JSON.parse(response);
        
        if (this.isDebugEnabled()) {
          this.log(`🧠 AI Fallback: Parsed response: ${JSON.stringify(parsed)}`, MessageType.SYSTEM);
        }
        
        // Expected format: {"command": "talk", "target": "Chef's Spirit"}
        if (parsed.command && parsed.target) {
          return {
            command: parsed.command,
            target: parsed.target,
            reasoning: `AI disambiguated "${userInput}" to "${parsed.command} ${parsed.target}"`
          };
        } else {
          if (this.isDebugEnabled()) {
            this.log(`🧠 AI Fallback: Invalid response format - missing command or target`, MessageType.SYSTEM);
          }
        }
        return null;
      }
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