import axios, { AxiosInstance } from 'axios';
import * as dotenv from 'dotenv';
import { MockAIEngine } from './mockAIEngine';

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
  // Simple: Just add connection name for connection-based generation
  connectionName?: string; // "through the crystal archway" - used when filling specific connections
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
}

export interface InterpretedCommand {
  action: string;
  params: string[];
  confidence: number;
  reasoning: string;
}

export interface RegionGenerationContext {
  gameId: number;
  transitionFrom?: {
    room: {
      name: string;
      description: string;
    };
    region?: {
      name: string | null;
      type: string;
      description: string;
    };
  };
  existingRegions?: string[];
}

export interface GeneratedRegion {
  name: string;
  type: string;
  description: string;
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
  private mockEngine: MockAIEngine;

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

    // Initialize mock engine with configuration
    this.mockEngine = new MockAIEngine({
      debug: process.env.AI_DEBUG_LOGGING === 'true',
      quality: process.env.AI_MOCK_QUALITY as any || 'high',
      variation: process.env.AI_MOCK_VARIATION !== 'false',
      repetitionAvoidance: process.env.AI_MOCK_REPETITION_AVOIDANCE !== 'false',
      contextSensitivity: parseFloat(process.env.AI_MOCK_CONTEXT_SENSITIVITY || '0.8'),
      creativityLevel: parseFloat(process.env.AI_MOCK_CREATIVITY || '0.3'),
      seed: process.env.AI_MOCK_SEED ? parseInt(process.env.AI_MOCK_SEED) : undefined
    });
  }

  async generateRoom(context: RoomContext): Promise<GeneratedRoom> {
    if (this.config.mockMode) {
      return await this.mockEngine.generateRoom(this.buildPrompt(context), context);
    }

    const prompt = this.buildPrompt(context);

    try {
      const response = await this.callGrokAPI(prompt);
      const result = JSON.parse(response);
      return result as GeneratedRoom;
    } catch (error) {
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.error('Error generating room:', error);
      }
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

  async generateRegion(context: RegionGenerationContext): Promise<GeneratedRegion> {
    if (this.config.mockMode) {
      return this.mockGenerateRegion(context);
    }

    let prompt = "You are creating a new thematic region for the text adventure game Shadow Kingdom. ";

    if (context.transitionFrom) {
      const { room, region } = context.transitionFrom;
      prompt += `The player is transitioning from: "${room.name}" - ${room.description} `;
      
      if (region) {
        prompt += `This was part of ${region.name || `a ${region.type}`} region (${region.description}). `;
        prompt += `Create a region that would logically connect but be thematically DIFFERENT from the ${region.type} theme. `;
      }
    }

    if (context.existingRegions && context.existingRegions.length > 0) {
      prompt += `Existing regions in this game: ${context.existingRegions.join(', ')}. `;
      prompt += `Make sure the new region is distinct from these. `;
    }

    prompt += `Create a cohesive region that would contain multiple related rooms. `;

    prompt += `REGION TYPE EXAMPLES (be creative, don't limit to these):
- mansion: Grand estates, noble houses, castles with multiple wings
- forest: Woodland areas, groves, natural sanctuaries  
- cave: Underground systems, caverns, crystal chambers
- dungeon: Dark fortresses, prison complexes, underground lairs
- town: Settlements, villages, urban districts
- temple: Religious complexes, sacred sites, monasteries
- ruins: Ancient sites, abandoned structures, archaeological areas
- tower: Tall structures, observatories, wizard towers
- library: Vast knowledge repositories, scriptoriums, archive complexes
- garden: Botanical paradises, hedge mazes, conservatories
- market: Trading districts, bazaars, commercial quarters
- mine: Underground workings, crystal formations, abandoned shafts
- ship: Vessels, harbors, floating structures
- academy: Schools of magic, training grounds, scholarly institutions

REQUIREMENTS:
- Create your own region type that fits the fantasy setting (can be from examples or original)
- Create a unique, evocative name
- Write a rich description that will guide future room generation
- Ensure thematic coherence with potential room variety
- Make it feel like a real place with history and purpose

Respond in JSON format:
{
  "name": "Evocative Region Name",
  "type": "your_creative_region_type",
  "description": "Rich, detailed description that provides context for AI room generation. Should capture the region's atmosphere, history, notable features, and potential room types it might contain."
}`;

    let response = '';
    try {
      response = await this.callGrokAPI(prompt);
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log('Raw API response for region generation:', response);
      }
      const result = JSON.parse(response);
      return result as GeneratedRegion;
    } catch (error) {
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.error('Error generating region:', error);
        console.error('Raw response that failed to parse:', response);
      }
      // Return a fallback region instead of throwing
      return this.getFallbackRegion(context);
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

  private buildPrompt(context: RoomContext): string {
    const existingRooms = context.gameHistory?.join(', ') || 'none';
    const themeNote = context.theme || 'mysterious fantasy kingdom';
    const reverseDirection = this.getReverseDirection(context.direction) || 'back';

    if (context.connectionName) {
      // Connection-based generation - acknowledge the specific connection
      return `You are creating a room for Shadow Kingdom text adventure game.

Current room: ${context.currentRoom.name}
Description: ${context.currentRoom.description}
Player accesses new room via: "${context.connectionName}" (${context.direction})
Existing rooms: ${existingRooms}

Generate a room that makes sense when accessed via "${context.connectionName}". 
The room description should acknowledge this specific entrance method.
Theme: ${themeNote}

REQUIREMENTS:
- Room name must be UNIQUE (different from existing rooms)
- Description should naturally reference arriving via "${context.connectionName}"
- Include return connection that complements the entrance
- Generate 2-4 total connections with thematic names
- Make connection names immersive and descriptive

RESPONSE FORMAT:
{
  "name": "Unique Room Name",
  "description": "Room description acknowledging arrival via '${context.connectionName}'",
  "connections": [
    {"direction": "${reverseDirection}", "name": "complementary return connection"},
    {"direction": "north", "name": "thematic connection"}
  ]
}`;
    } else {
      // Standard generation
      return `You are creating a room for Shadow Kingdom text adventure game.
    
Current room: ${context.currentRoom.name}
Description: ${context.currentRoom.description}
Player is trying to go: ${context.direction}
Existing rooms: ${existingRooms}

Generate a NEW and UNIQUE room that the player discovers when going ${context.direction}. 
Make it thematically consistent with a ${themeNote} setting.

REQUIREMENTS:
- Create a room name that is DIFFERENT from all existing rooms
- Make the room unique and interesting, not generic
- Include return connection to ${reverseDirection}
- CONNECTION COUNT: ${process.env.DEAD_END_CHANCE || '5'}% chance the room has only one connection back where you came from. Otherwise, roll ${process.env.CONNECTION_DICE || '2d4'} for total number of connections (including the return path).
- DIRECTIONS: Choose cardinal directions (north, south, east, west, up, down) or thematic connections (bookshelf, tapestry, hidden door, etc.)

RESPONSE FORMAT:
{
  "name": "Unique Room Name",
  "description": "Detailed atmospheric description",
  "connections": [
    {"direction": "${reverseDirection}", "name": "return connection"},
    {"direction": "north", "name": "thematic connection"}
  ]
}`;
    }
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

  private mockGenerateRegion(context: RegionGenerationContext): GeneratedRegion {
    const mockRegions: GeneratedRegion[] = [
      {
        name: 'Shadowmere Estate',
        type: 'mansion',
        description: 'An imposing estate filled with grand halls, ornate chambers, and mysterious passages. The architecture speaks of old wealth and darker secrets.'
      },
      {
        name: 'Whispering Woods',
        type: 'enchanted forest',
        description: 'A mystical woodland where ancient trees tower overhead and magical creatures make their homes among the dappled shadows.'
      },
      {
        name: 'Crystal Singing Caverns',
        type: 'resonance cave',
        description: 'A vast network of underground chambers where crystalline formations create haunting melodies when touched by underground winds.'
      },
      {
        name: 'The Floating Archive',
        type: 'sky library',
        description: 'An impossible collection of books and scrolls suspended in mid-air, organized by arcane principles and tended by spectral librarians.'
      },
      {
        name: 'Night Bazaar',
        type: 'phantom market',
        description: 'A marketplace that appears only in moonlight, where ghostly merchants trade in memories, dreams, and things that never were.'
      },
      {
        name: 'The Clockwork Gardens',
        type: 'mechanical conservatory',
        description: 'An intricate garden where brass flowers bloom on schedule and steam-powered butterflies pollinate geometric topiaries.'
      },
      {
        name: 'Starfall Observatory',
        type: 'celestial tower',
        description: 'A spiraling tower topped with mystical apparatus for studying the movements of stars and the patterns they weave in mortal fate.'
      },
      {
        name: 'The Sunken Monastery',
        type: 'underwater temple',
        description: 'A sacred complex submerged beneath crystal-clear waters, where air-breathing visitors can walk through bubble-filled chambers.'
      }
    ];

    return mockRegions[Math.floor(Math.random() * mockRegions.length)];
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

  private getFallbackRegion(context: RegionGenerationContext): GeneratedRegion {
    // Determine type based on context or use random fallback
    const fallbackTypes = ['mansion', 'forest', 'cave', 'town'];
    const selectedType = fallbackTypes[Math.floor(Math.random() * fallbackTypes.length)];
    
    const fallbackRegions: { [key: string]: GeneratedRegion } = {
      mansion: {
        name: 'Mysterious Manor',
        type: 'mansion',
        description: 'A grand estate shrouded in shadow, its ornate halls and hidden chambers waiting to reveal their secrets to those brave enough to explore.'
      },
      forest: {
        name: 'Enchanted Grove',
        type: 'forest',
        description: 'A mystical woodland where ancient magic flows through the trees and every path leads to wonder or peril.'
      },
      cave: {
        name: 'Shadowed Caverns',
        type: 'cave',
        description: 'A network of underground passages carved by forgotten waters, their crystal-lined walls holding echoes of ages past.'
      },
      town: {
        name: 'Wanderer\'s Rest',
        type: 'town',
        description: 'A modest settlement where travelers gather to share stories and merchants peddle their wares beneath the watchful eyes of ancient guardians.'
      }
    };

    return fallbackRegions[selectedType];
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

  /**
   * Cleanup method to properly destroy HTTP connections
   * Call this in test environments to prevent hanging handles
   */
  cleanup(): void {
    if (this.client && (this.client as any).defaults?.adapter) {
      // Destroy any persistent HTTP connections
      const adapter = (this.client as any).defaults.adapter;
      if (adapter && adapter.destroy) {
        adapter.destroy();
      }
    }
  }
}