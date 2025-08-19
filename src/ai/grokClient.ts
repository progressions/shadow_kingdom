import axios, { AxiosInstance } from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

export interface GrokConfig {
  apiKey: string;
  apiUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  mockMode?: boolean;
}

export interface RoomContext {
  currentRoom: {
    name: string;
    description: string;
  };
  direction: string;
  gameHistory?: string[];
  theme?: string;
}

export interface GeneratedRoom {
  name: string;
  description: string;
  connections?: {
    direction: string;        // mechanical direction: "north", "south", etc.
    name: string;            // thematic description: "through the crystal archway"
  }[];
}

export interface NPCContext {
  roomName: string;
  roomDescription: string;
  gameTheme?: string;
  existingNPCs?: string[];
}

export interface GeneratedNPC {
  name: string;
  description: string;
  personality: string;
  initialDialogue?: string;
}

export interface DialogueContext {
  npcName: string;
  npcPersonality: string;
  conversationHistory: string[];
  playerInput: string;
  currentRoom?: string;
}

export interface DialogueResponse {
  response: string;
  action?: string; // e.g., "gives_item", "opens_door"
  emotion?: string; // e.g., "happy", "suspicious", "angry"
}

export interface CommandContext {
  command: string;
  currentRoom: string;
  inventory?: string[];
  gameState?: any;
}

export interface ActionResult {
  success: boolean;
  description: string;
  stateChange?: any;
}

export interface CommandInterpretationContext {
  command: string;
  currentRoom?: {
    name: string;
    description: string;
    availableExits: string[];
    thematicExits?: Array<{direction: string; name: string}>;
  };
  inventory?: string[];
  recentCommands?: string[];
  mode: 'menu' | 'game';
}

export interface InterpretedCommand {
  action: string;
  params: string[];
  confidence: number;
  reasoning: string;
}

interface GrokAPIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class GrokClient {
  private client: AxiosInstance;
  private config: GrokConfig;
  private tokenUsage: {
    input: number;
    output: number;
    cost: number;
  } = { input: 0, output: 0, cost: 0 };

  constructor(config?: Partial<GrokConfig>) {
    this.config = {
      apiKey: config?.apiKey || process.env.GROK_API_KEY || '',
      apiUrl: config?.apiUrl || process.env.GROK_API_URL || 'https://api.x.ai/v1',
      model: config?.model || process.env.GROK_MODEL || 'grok-3',
      maxTokens: config?.maxTokens || parseInt(process.env.GROK_MAX_TOKENS || '500'),
      temperature: config?.temperature || parseFloat(process.env.GROK_TEMPERATURE || '0.8'),
      mockMode: config?.mockMode || process.env.AI_MOCK_MODE === 'true'
    };

    if (!this.config.apiKey && !this.config.mockMode) {
      throw new Error('GROK_API_KEY is required. Set it in .env file or pass it in config.');
    }

    this.client = axios.create({
      baseURL: this.config.apiUrl,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async generateRoom(context: RoomContext): Promise<GeneratedRoom> {
    if (this.config.mockMode) {
      return this.mockGenerateRoom(context);
    }

    const existingRooms = context.gameHistory?.join(', ') || 'none';
    const themeNote = context.theme || 'mysterious fantasy kingdom';
    const reverseDirection = this.getReverseDirection(context.direction) || 'back';

    const prompt = `You are creating a room for a text adventure game called Shadow Kingdom.
    
Current room: ${context.currentRoom.name}
Description: ${context.currentRoom.description}
Player is trying to go: ${context.direction}
Existing rooms in this game: ${existingRooms}

Generate a NEW and UNIQUE room that the player discovers when going ${context.direction}. 
Make it thematically consistent with a ${themeNote} setting.

ROOM REQUIREMENTS:
- Create a room name that is DIFFERENT from all existing rooms
- Make the room unique and interesting, not generic
- Consider the direction and current room context
- Avoid repetitive names like "Chamber", "Room", "Hall" unless very specific

CONNECTION GENERATION RULES:
- ALWAYS include a return connection back to where the player came from
- For each of the other 5 directions (north, south, east, west, up, down - excluding the return path), roll a 30% chance to create an exit
- This means most rooms will have 2-4 total connections (including the return path)
- Create thematic names that fit the room's atmosphere and architecture
- Make connection names immersive and descriptive, not just directions

EXAMPLES OF GOOD THEMATIC CONNECTIONS:
- "through the ornate archway" (north)
- "down the spiral staircase" (down) 
- "via the hidden passage" (east)
- "through the shimmering portal" (west)
- "up the crumbling ladder" (up)
- "through the crystal doorway" (south)

Respond in JSON format:
{
  "name": "Unique Room Name (avoid duplicates)",
  "description": "Detailed atmospheric description of the room",
  "connections": [
    {"direction": "${reverseDirection}", "name": "thematic description for return path"},
    {"direction": "north", "name": "through the ornate archway"},
    {"direction": "down", "name": "down the spiral staircase"}
  ]
}`;

    try {
      const response = await this.callGrokAPI(prompt);
      const result = JSON.parse(response);
      return result as GeneratedRoom;
    } catch (error) {
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.error('Error generating room:', error);
      }
      // Return a fallback room instead of throwing
      return this.getFallbackRoom(context);
    }
  }

  async generateNPC(context: NPCContext): Promise<GeneratedNPC> {
    if (this.config.mockMode) {
      return this.mockGenerateNPC(context);
    }

    const prompt = `You are creating an NPC for a text adventure game called Shadow Kingdom.
    
Current room: ${context.roomName}
Room description: ${context.roomDescription}
${context.existingNPCs ? `Other NPCs in game: ${context.existingNPCs.join(', ')}` : ''}

Generate a unique NPC that fits this location. Make them interesting and memorable.

Respond in JSON format:
{
  "name": "NPC Name",
  "description": "Physical appearance and demeanor",
  "personality": "Brief personality traits for consistent dialogue",
  "initialDialogue": "What they say when first encountered"
}`;

    try {
      const response = await this.callGrokAPI(prompt);
      const result = JSON.parse(response);
      return result as GeneratedNPC;
    } catch (error) {
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.error('Error generating NPC:', error);
      }
      // Return a fallback NPC instead of throwing
      return this.getFallbackNPC(context);
    }
  }

  async processCommand(context: CommandContext): Promise<ActionResult> {
    if (this.config.mockMode) {
      return this.mockProcessCommand(context);
    }

    const prompt = `You are processing a player command in the text adventure game Shadow Kingdom.
    
Player command: "${context.command}"
Current room: ${context.currentRoom}
${context.inventory ? `Inventory: ${context.inventory.join(', ')}` : ''}

Interpret what the player is trying to do and describe the result.
Be creative but consistent with the game world.

Respond in JSON format:
{
  "success": true/false,
  "description": "What happens as a result of the action",
  "stateChange": {} // Optional: any state changes needed
}`;

    try {
      const response = await this.callGrokAPI(prompt);
      const result = JSON.parse(response);
      return result as ActionResult;
    } catch (error) {
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.error('Error processing command:', error);
      }
      // Return a fallback result instead of throwing
      return this.getFallbackCommand(context);
    }
  }

  async continueDialogue(context: DialogueContext): Promise<DialogueResponse> {
    if (this.config.mockMode) {
      return this.mockContinueDialogue(context);
    }

    const prompt = `You are roleplaying as ${context.npcName} in the text adventure game Shadow Kingdom.
    
Character personality: ${context.npcPersonality}
Current location: ${context.currentRoom || 'Unknown'}

Conversation history:
${context.conversationHistory.join('\n')}

Player says: "${context.playerInput}"

Respond as ${context.npcName} would, staying in character.

Respond in JSON format:
{
  "response": "What the NPC says",
  "emotion": "current emotional state",
  "action": "any action taken (optional)"
}`;

    try {
      const response = await this.callGrokAPI(prompt);
      const result = JSON.parse(response);
      return result as DialogueResponse;
    } catch (error) {
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.error('Error continuing dialogue:', error);
      }
      // Return a fallback dialogue instead of throwing
      return this.getFallbackDialogue(context);
    }
  }

  async interpretCommand(context: CommandInterpretationContext): Promise<InterpretedCommand | null> {
    if (this.config.mockMode) {
      return this.mockInterpretCommand(context);
    }

    const roomInfo = context.currentRoom ? 
      `Current room: ${context.currentRoom.name} - ${context.currentRoom.description}
Available exits: ${context.currentRoom.availableExits.join(', ')}${context.currentRoom.thematicExits ? `
Thematic exit descriptions: ${context.currentRoom.thematicExits.map(exit => `${exit.direction}: "${exit.name}"`).join(', ')}` : ''}` : 
      'No room context available';

    const inventoryInfo = context.inventory && context.inventory.length > 0 ? 
      `Inventory: ${context.inventory.join(', ')}` : 
      'Inventory: empty';

    const recentInfo = context.recentCommands && context.recentCommands.length > 0 ?
      `Recent commands: ${context.recentCommands.slice(-3).join(', ')}` : 
      'No recent command history';

    const prompt = `You are interpreting a natural language command for the text adventure game Shadow Kingdom.

Player command: "${context.command}"
Game mode: ${context.mode}
${roomInfo}
${inventoryInfo}
${recentInfo}

Your job is to interpret what the player wants to do and convert it to a structured command.

COMMON GAME COMMANDS:
- Movement: go, move, walk, travel, head (with direction: north, south, east, west, up, down)
- Examination: look, examine, inspect, check, observe (optionally with object)
- Interaction: take, grab, get, pick up, collect (with object)
- Social: talk, speak, chat, converse (with character)
- System: help, quit, exit, clear
- Use: use, activate, operate (with object)

INTERPRETATION RULES:
1. If the command is unclear or ambiguous, provide your best interpretation
2. Consider the current room context and available exits
3. IMPORTANT: If thematic exit descriptions are provided, match movement commands to them (e.g., "go down the steps" should map to "down" if thematic exit is "down: down the worn steps to the entrance hall")
4. Handle pronouns and references (e.g., "it", "that", "him")
5. Support compound commands like "take sword and examine it"
6. Be flexible with phrasing and synonyms
7. Assign confidence based on how certain you are about the interpretation

Respond in JSON format:
{
  "action": "primary action (go, look, take, talk, help, etc.)",
  "params": ["list", "of", "parameters"],
  "confidence": 0.85,
  "reasoning": "Brief explanation of interpretation"
}

If the command cannot be interpreted as a valid game action, return null.`;

    try {
      const response = await this.callGrokAPI(prompt);
      
      // Handle null response
      if (response.trim() === 'null' || response.trim() === '') {
        return null;
      }
      
      const result = JSON.parse(response);
      return result as InterpretedCommand;
    } catch (error) {
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.error('Error interpreting command:', error);
      }
      // Return null for failed AI interpretation (fallback to local processing)
      return null;
    }
  }

  private async callGrokAPI(prompt: string): Promise<string> {
    try {
      const response = await this.client.post<GrokAPIResponse>('/chat/completions', {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are a creative AI assistant helping to generate content for a text adventure game. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature
      });

      // Track token usage
      if (response.data.usage) {
        this.tokenUsage.input += response.data.usage.prompt_tokens;
        this.tokenUsage.output += response.data.usage.completion_tokens;
        
        // Calculate cost (Grok-3 pricing: $3/1M input, $15/1M output)
        const inputCost = (response.data.usage.prompt_tokens / 1_000_000) * 3;
        const outputCost = (response.data.usage.completion_tokens / 1_000_000) * 15;
        this.tokenUsage.cost += inputCost + outputCost;
      }

      return response.data.choices[0].message.content;
    } catch (error) {
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        if (axios.isAxiosError(error)) {
          console.error('Grok API Error:', error.response?.data || error.message);
        } else {
          console.error('Unexpected error:', error);
        }
      }
      // Re-throw for handling in calling methods
      throw error;
    }
  }

  // Mock implementations for testing without API calls
  private mockGenerateRoom(context: RoomContext): GeneratedRoom {
    const reverseDirection = this.getReverseDirection(context.direction) || 'back';
    
    const mockRooms: GeneratedRoom[] = [
      {
        name: "Crystal Cavern",
        description: "You enter a cavern filled with glowing crystals. The walls shimmer with an ethereal light, casting dancing shadows across the rocky floor.",
        connections: [
          { direction: reverseDirection, name: "back through the crystal entrance" },
          { direction: "north", name: "through the shimmering archway" },
          { direction: "east", name: "via the glowing crystal tunnel" }
        ]
      },
      {
        name: "Ancient Armory",
        description: "Rows of rusted weapons and armor line the walls. Dust motes dance in shafts of light filtering through cracks in the ceiling.",
        connections: [
          { direction: reverseDirection, name: "back to the previous chamber" },
          { direction: "up", name: "up the worn stone steps" },
          { direction: "west", name: "through the weapon vault door" }
        ]
      },
      {
        name: "Mystic Pool",
        description: "A serene pool of crystal-clear water reflects an impossible starry sky above, despite being indoors. The air hums with magical energy.",
        connections: [
          { direction: reverseDirection, name: "back through the misty veil" },
          { direction: "west", name: "via the moonlit pathway" },
          { direction: "down", name: "down into the luminous depths" }
        ]
      }
    ];

    return mockRooms[Math.floor(Math.random() * mockRooms.length)];
  }

  private mockGenerateNPC(context: NPCContext): GeneratedNPC {
    const mockNPCs: GeneratedNPC[] = [
      {
        name: "Eldrin the Keeper",
        description: "An elderly man with a long silver beard and piercing blue eyes. He wears simple robes and carries an ancient tome.",
        personality: "Wise, cryptic, helpful but speaks in riddles",
        initialDialogue: "Ah, another seeker of truth arrives. The shadows hold many secrets, young one."
      },
      {
        name: "Luna the Merchant",
        description: "A cheerful woman with colorful clothing and a warm smile. Her pack overflows with curious items.",
        personality: "Friendly, talkative, loves to bargain",
        initialDialogue: "Welcome, traveler! I have many wares that might interest you on your journey."
      },
      {
        name: "Shadow Guard",
        description: "A silent figure in dark armor, face hidden behind a featureless helm. They stand perfectly still.",
        personality: "Stoic, dutiful, speaks only when necessary",
        initialDialogue: "State your purpose here."
      }
    ];

    return mockNPCs[Math.floor(Math.random() * mockNPCs.length)];
  }

  private mockProcessCommand(context: CommandContext): ActionResult {
    // Simple mock command processing
    if (context.command.includes('examine') || context.command.includes('look')) {
      return {
        success: true,
        description: "You examine the area carefully, noticing details you hadn't seen before."
      };
    }
    
    if (context.command.includes('take') || context.command.includes('get')) {
      return {
        success: true,
        description: "You take the item and add it to your inventory.",
        stateChange: { action: 'add_item' }
      };
    }

    return {
      success: false,
      description: "You're not sure how to do that."
    };
  }

  private mockContinueDialogue(context: DialogueContext): DialogueResponse {
    const responses: DialogueResponse[] = [
      {
        response: "That's an interesting question. Let me think about it...",
        emotion: "thoughtful"
      },
      {
        response: "I've heard tales of such things, but never seen them myself.",
        emotion: "curious"
      },
      {
        response: "You should be careful asking questions like that around here.",
        emotion: "suspicious"
      }
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  private mockInterpretCommand(context: CommandInterpretationContext): InterpretedCommand | null {
    const command = context.command.toLowerCase().trim();
    
    // Mock interpretations for testing
    if (command.includes('wander') || command.includes('explore')) {
      return {
        action: 'look',
        params: [],
        confidence: 0.75,
        reasoning: 'Interpreted wander/explore as looking around'
      };
    }
    
    if (command.includes('grab') && command.includes('everything')) {
      return {
        action: 'take',
        params: ['all'],
        confidence: 0.85,
        reasoning: 'Interpreted as taking all available items'
      };
    }
    
    if (command.includes('find') || command.includes('search')) {
      return {
        action: 'examine',
        params: [command.split(' ').slice(-1)[0]], // Last word as object
        confidence: 0.70,
        reasoning: 'Interpreted search/find as examining specific object'
      };
    }
    
    if (command.includes('talk') && (command.includes('someone') || command.includes('anyone'))) {
      return {
        action: 'talk',
        params: ['npc'],
        confidence: 0.65,
        reasoning: 'Interpreted as talking to any available NPC'
      };
    }
    
    // Return null for unrecognized commands (fallback to local processing)
    return null;
  }

  // Fallback methods for when API calls fail
  private getFallbackRoom(context: RoomContext): GeneratedRoom {
    const directionMap: { [key: string]: string } = {
      'north': 'south',
      'south': 'north',
      'east': 'west',
      'west': 'east',
      'up': 'down',
      'down': 'up'
    };
    
    const reverseDirection = directionMap[context.direction.toLowerCase()] || 'back';

    // Generate more varied fallback rooms
    const fallbackRooms = [
      {
        name: `Shadowed ${context.direction.charAt(0).toUpperCase() + context.direction.slice(1)} Passage`,
        description: `A narrow passage stretches ${context.direction}, its walls carved from ancient stone. Flickering torchlight casts dancing shadows that seem to move of their own accord.`
      },
      {
        name: `Forgotten ${context.direction.charAt(0).toUpperCase() + context.direction.slice(1)} Alcove`,
        description: `You discover a hidden alcove filled with dusty relics and cobwebs. The air here is stale and heavy with the weight of forgotten years.`
      },
      {
        name: `Mystic ${context.direction.charAt(0).toUpperCase() + context.direction.slice(1)} Sanctum`,
        description: `A small sanctum filled with mysterious symbols etched into the walls. Strange energies seem to hum through the air around you.`
      },
      {
        name: `Weathered ${context.direction.charAt(0).toUpperCase() + context.direction.slice(1)} Gallery`,
        description: `An old gallery with crumbling stone pillars and faded tapestries. Moonlight filters through cracks in the ceiling above.`
      }
    ];

    const selectedRoom = fallbackRooms[Math.floor(Math.random() * fallbackRooms.length)];
    // Add timestamp to ensure uniqueness
    const uniqueName = `${selectedRoom.name} ${Date.now() % 10000}`;

    return {
      name: uniqueName,
      description: selectedRoom.description,
      connections: [
        { direction: reverseDirection, name: "back the way you came" }
      ]
    };
  }

  private getFallbackNPC(context: NPCContext): GeneratedNPC {
    return {
      name: "Mysterious Figure",
      description: "A shadowy figure stands in the corner, their features obscured by darkness. They seem to be watching you intently.",
      personality: "Enigmatic, speaks little, observant",
      initialDialogue: "..."
    };
  }

  private getFallbackCommand(context: CommandContext): ActionResult {
    return {
      success: false,
      description: "The shadows seem to interfere with your action. Perhaps try something else."
    };
  }

  private getFallbackDialogue(context: DialogueContext): DialogueResponse {
    return {
      response: "The figure remains silent, as if lost in thought.",
      emotion: "mysterious"
    };
  }

  getUsageStats() {
    return {
      tokensUsed: this.tokenUsage,
      estimatedCost: `$${this.tokenUsage.cost.toFixed(4)}`
    };
  }

  private getReverseDirection(direction: string): string | null {
    const directionMap: { [key: string]: string } = {
      'north': 'south',
      'south': 'north',
      'east': 'west',
      'west': 'east',
      'up': 'down',
      'down': 'up'
    };
    
    return directionMap[direction.toLowerCase()] || null;
  }
}