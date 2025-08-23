import axios, { AxiosInstance } from 'axios';
import * as dotenv from 'dotenv';
import { MockAIEngine } from './mockAIEngine';
import { LoggerService } from '../services/loggerService';
import { RegionConcept, GeneratedRoom as RegionGeneratedRoom, RoomGenerationContext } from '../types/regionConcept';

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
  fantasyLevel?: 'mundane' | 'fantastical'; // Fantasy level for balanced room generation
}

export interface GeneratedRoom {
  name: string;
  description: string;
  connections?: {
    direction: string;        // mechanical direction: "north", "south", etc.
    name: string;            // thematic description: "through the crystal archway"
  }[];
  items?: {
    name: string;            // short name: "Brass Lamp"
    description: string;     // examine text: "An ornate lamp casting warm light"
    isFixed: boolean;        // true for scenery, false for portable
  }[];
  characters?: GeneratedCharacter[]; // NPCs and enemies that inhabit this room
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

export interface GeneratedCharacter {
  name: string;
  description: string;
  type: 'npc' | 'enemy';           // Character type for database
  personality?: string;             // NPC personality/behavior
  level?: number;                   // Enemy level/difficulty
  attributes?: {                    // Optional custom attributes
    strength?: number;
    dexterity?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;
  };
  initialDialogue?: string;         // First thing NPC says
  sentiment?: string;              // Character sentiment toward player
  isHostile?: boolean;             // @deprecated - use sentiment instead
}

export interface CharacterWithSentimentContext {
  roomId: number;
  roomName: string;
  roomDescription: string;
  regionName: string;
  existingCharacters: Array<{
    name: string;
    sentiment: string;
    type: string;
  }>;
}

export interface GeneratedCharacterWithSentiment {
  name: string;
  description?: string;
  type: 'npc' | 'enemy';
  sentiment: string;
  contextReasoning?: string;
}

export interface BehavioralDialogueContext {
  characterId: number;
  characterName: string;
  sentiment: string;
  playerCommand: string;
  context: string;
  conversationHistory?: Array<{
    speaker: 'player' | 'character';
    message: string;
  }>;
  recentActions?: string[];
  roomContext?: {
    name: string;
    description: string;
    type?: string;
  };
  sentimentChange?: string;
}

export interface GeneratedBehavioralDialogue {
  response: string;
  tone: string;
  action?: string;
  sentimentContext: string;
  sentimentChange?: string;
  locationModifier?: string;
  suggestedPlayerActions?: string[];
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
    characters?: string[];
    items?: string[];
  };
  inventory?: string[];
  recentCommands?: string[];
}

export interface InterpretedCommand {
  action: string;
  params: string[];
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

export interface RegionConceptGenerationContext {
  gameId?: number;
  existingConcepts?: string[];
  stylePreference?: 'fantasy' | 'horror' | 'mystery' | 'adventure';
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
  private loggerService?: LoggerService;

  constructor(config?: Partial<GrokConfig>, loggerService?: LoggerService) {
    this.loggerService = loggerService;
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
    
    // Log the prompt being sent
    const fs = require('fs');
    fs.appendFileSync('grok_prompts.log', `\n\n========= ROOM GENERATION ${new Date().toISOString()} =========\n${prompt}\n`);

    try {
      const response = await this.callGrokAPI(prompt);
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log('🤖 Raw Grok API response for room generation:', response);
      }
      const result = JSON.parse(response);
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log('📦 Parsed room result:', JSON.stringify(result, null, 2));
      }
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

  async generateRoomDescription(prompt: string, context?: any): Promise<{ name: string; description: string } | null> {
    if (this.config.mockMode) {
      return await this.mockEngine.generateRoomDescription(prompt, context);
    }

    try {
      const response = await this.callGrokAPI(prompt);
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log('🤖 Raw Grok API response for room description generation:', response);
      }
      const result = JSON.parse(response);
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log('📦 Parsed room description result:', JSON.stringify(result, null, 2));
      }
      return result as { name: string; description: string };
    } catch (error) {
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.error('Error generating room description:', error);
      }
      return null;
    }
  }

  async generateCharacterWithSentiment(prompt: string, context: CharacterWithSentimentContext): Promise<GeneratedCharacterWithSentiment> {
    if (this.config.mockMode) {
      return await this.mockEngine.generateCharacterWithSentiment(prompt, context);
    }

    try {
      const response = await this.callGrokAPI(prompt);
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log('🤖 Raw Grok API response for character sentiment generation:', response);
      }
      const result = JSON.parse(response);
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log('👤 Parsed character sentiment result:', JSON.stringify(result, null, 2));
      }
      return result as GeneratedCharacterWithSentiment;
    } catch (error) {
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.error('Error generating character with sentiment:', error);
      }
      // Return fallback character with indifferent sentiment
      return {
        name: this.getRandomFallbackCharacterName(),
        type: 'npc',
        sentiment: 'indifferent',
        description: 'A mysterious figure whose intentions are unclear.',
        contextReasoning: 'AI generation failed, using fallback character'
      };
    }
  }

  private getRandomFallbackCharacterName(): string {
    const names = [
      'Wandering Stranger',
      'Mysterious Figure',
      'Hooded Wanderer',
      'Silent Observer',
      'Unknown Traveler',
      'Cloaked Figure'
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  async generateSentimentBasedDialogue(prompt: string, context: BehavioralDialogueContext): Promise<GeneratedBehavioralDialogue> {
    if (this.config.mockMode) {
      return await this.mockEngine.generateSentimentBasedDialogue(prompt, context);
    }

    try {
      const response = await this.callGrokAPI(prompt);
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log('🤖 Raw Grok API response for behavioral dialogue:', response);
      }
      const result = JSON.parse(response);
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log('💬 Parsed behavioral dialogue result:', JSON.stringify(result, null, 2));
      }
      return result as GeneratedBehavioralDialogue;
    } catch (error) {
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.error('Error generating behavioral dialogue:', error);
      }
      // Return sentiment-appropriate fallback
      return this.getFallbackBehavioralDialogue(context);
    }
  }

  private getFallbackBehavioralDialogue(context: BehavioralDialogueContext): GeneratedBehavioralDialogue {
    const sentiment = context.sentiment.toLowerCase();
    
    switch (sentiment) {
      case 'hostile':
        return {
          response: "You dare approach me?! Draw your weapon or prepare to die!",
          tone: 'threatening',
          action: 'draws_weapon',
          sentimentContext: 'hostile',
          suggestedPlayerActions: ['retreat', 'defend', 'attack']
        };
      case 'aggressive':
        return {
          response: "State your business quickly. I don't trust strangers.",
          tone: 'suspicious',
          action: 'watches_warily', 
          sentimentContext: 'aggressive',
          suggestedPlayerActions: ['explain_purpose', 'show_credentials', 'back_away']
        };
      case 'friendly':
        return {
          response: "Welcome, friend! How can I help you today?",
          tone: 'welcoming',
          action: 'smiles_warmly',
          sentimentContext: 'friendly',
          suggestedPlayerActions: ['ask_for_help', 'trade_items', 'share_news']
        };
      case 'allied':
        return {
          response: "My trusted companion! What do you need from me?",
          tone: 'devoted',
          action: 'stands_ready',
          sentimentContext: 'allied',
          suggestedPlayerActions: ['request_aid', 'share_plans', 'ask_advice']
        };
      default: // indifferent
        return {
          response: "Yes? What do you need? I'm quite busy.",
          tone: 'neutral',
          action: 'continues_working',
          sentimentContext: 'indifferent',
          suggestedPlayerActions: ['state_business', 'apologize', 'offer_payment']
        };
    }
  }

  /**
   * Generate a comprehensive region concept for region-based world generation
   */
  async generateRegionConcept(context: RegionConceptGenerationContext = {}): Promise<RegionConcept> {
    if (this.config.mockMode) {
      return this.mockGenerateRegionConcept(context);
    }

    let prompt = `You are creating a comprehensive region concept for Shadow Kingdom's region-based world generation system.

Generate a complete region concept that includes:
- A thematic foundation (name, theme, atmosphere, history)
- A guardian character that must be defeated
- A key item that the guardian guards
- A locked exit that requires the key to access
- Suggested thematic elements for room generation

${context.existingConcepts && context.existingConcepts.length > 0 ? 
  `EXISTING REGION CONCEPTS: ${context.existingConcepts.join(', ')}.
  IMPORTANT: Create a unique concept that is thematically DIFFERENT from all existing ones.` : ''}

THEME EXAMPLES (be creative, combine ideas):
- Crystal Caverns: Ancient mines overtaken by magical crystal growth
- Haunted Library: Vast knowledge repository with spectral guardians
- Volcanic Forges: Underground smithy powered by volcanic heat
- Floating Gardens: Sky-bound botanical paradise with wind spirits
- Sunken Temple: Underwater sacred complex with aquatic guardians
- Clockwork Factory: Mechanical wonderland with steam-powered guardians
- Shadow Bazaar: Twilight marketplace with phantom merchants
- Living Tree City: Massive tree complex with nature spirits

REQUIREMENTS:
- Create original, evocative names for all elements
- Guardian must thematically fit the region and guard the key
- Key must be specifically designed to unlock the locked exit
- All elements should feel cohesive and interconnected
- Include 4-6 suggested elements for room generation

Respond in JSON format:
{
  "name": "Evocative Region Name",
  "theme": "Brief thematic description of the region's core concept",
  "atmosphere": "Atmospheric details - lighting, sounds, feelings, mood",
  "history": "Background story explaining how this region came to be",
  "guardian": {
    "name": "Guardian Name",
    "description": "Physical appearance and demeanor of the guardian",
    "personality": "How the guardian behaves and speaks"
  },
  "key": {
    "name": "Key Name", 
    "description": "Detailed description of the key item"
  },
  "lockedExit": {
    "name": "Exit Name",
    "description": "Description of the locked barrier/door/gate"
  },
  "suggestedElements": [
    "element1", "element2", "element3", "element4", "element5", "element6"
  ]
}`;

    try {
      const response = await this.callGrokAPI(prompt);
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log('🤖 Raw Grok API response for region concept generation:', response);
      }
      const result = JSON.parse(response);
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log('🏰 Parsed region concept result:', JSON.stringify(result, null, 2));
      }
      return result as RegionConcept;
    } catch (error) {
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.error('Error generating region concept:', error);
      }
      // Return fallback region concept
      return this.getFallbackRegionConcept(context);
    }
  }

  /**
   * Generate a single themed room from a region concept
   */
  async generateRegionRoom(context: RoomGenerationContext): Promise<RegionGeneratedRoom> {
    if (this.config.mockMode) {
      return this.mockGenerateRoom(context);
    }

    const { concept, role, adjacentRooms = [] } = context;

    let prompt = `You are generating a single room for the "${concept.name}" region in Shadow Kingdom.

REGION CONTEXT:
- Theme: ${concept.theme}
- Atmosphere: ${concept.atmosphere}
- History: ${concept.history}
- Suggested Elements: ${concept.suggestedElements.join(', ')}

ROOM ROLE: ${role.toUpperCase()}`;

    switch (role) {
      case 'entrance':
        prompt += `
This is an ENTRANCE room - the first room players enter when arriving in this region.
- Should introduce the region's theme and atmosphere
- Can have basic items and NPCs that set the mood
- Should feel welcoming but hint at deeper mysteries`;
        break;
      case 'guardian':
        prompt += `
This is a GUARDIAN room - contains the region's main enemy and key.
- MUST include the guardian enemy: ${concept.guardian.name} - ${concept.guardian.description}
- MUST include the region key: ${concept.key.name} - ${concept.key.description}
- Should be challenging and dramatic
- Room should reflect the guardian's power and connection to the region`;
        break;
      case 'exit':
        prompt += `
This is an EXIT room - contains the locked barrier to the next region.
- MUST include the locked exit: ${concept.lockedExit.name} - ${concept.lockedExit.description}
- Should feel like a gateway or transition point
- Can have items related to the barrier or next region`;
        break;
      case 'exploration':
        prompt += `
This is an EXPLORATION room - a general themed room for discovery.
- Should contain interesting items and NPCs that expand on the region theme
- Can have puzzles, lore, or atmospheric details
- Should feel unique but cohesive with the region`;
        break;
    }

    if (adjacentRooms.length > 0) {
      prompt += `\n\nADJACENT ROOMS: ${adjacentRooms.join(', ')}
Ensure this room connects thematically but feels distinct from adjacent rooms.`;
    }

    prompt += `

Generate a JSON response with this exact structure:
{
  "name": "Room Name (2-5 words, evocative)",
  "description": "Vivid 2-3 sentence description of the room, focusing on atmosphere and visual details",
  "items": ["item1", "item2", "item3"],
  "characters": [
    {
      "name": "Character Name",
      "type": "npc" or "enemy", 
      "description": "Brief character description"
    }
  ]
}

IMPORTANT:
- Room name should be evocative and match the region theme
- Description should be 2-3 sentences, vivid and atmospheric
- Items should fit the theme and room role
- Characters should match the theme and have clear types (npc/enemy)
- For guardian rooms, ensure the guardian enemy and key are included
- Maintain thematic coherence with the region concept`;

    try {
      const response = await this.callGrokAPI(prompt);
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log('🤖 Raw Grok API response for room generation:', response);
      }
      const result = JSON.parse(response);
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log('🏠 Parsed room generation result:', JSON.stringify(result, null, 2));
      }
      return result as RegionGeneratedRoom;
    } catch (error) {
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.error('Error generating room:', error);
      }
      // Return fallback room
      return this.getFallbackRegionRoom(context);
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
      prompt += `EXISTING REGIONS IN THIS GAME: ${context.existingRegions.join(', ')}. `;
      prompt += `IMPORTANT: You MUST NOT use any of these existing region names. Choose a completely different name that is unique and distinct. `;
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
- Create a UNIQUE, evocative name that is different from all existing regions
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

  /**
   * Check if client is in mock mode
   */
  get isMockMode(): boolean {
    return this.config.mockMode || false;
  }

  /**
   * Public method to call Grok API directly
   */
  async callAPI(prompt: string): Promise<string> {
    return this.callGrokAPI(prompt);
  }

  async interpretCommand(context: CommandInterpretationContext): Promise<InterpretedCommand | null> {
    if (this.config.mockMode) {
      return this.mockInterpretCommand(context);
    }

    const roomInfo = context.currentRoom ? 
      `Current room: ${context.currentRoom.name} - ${context.currentRoom.description}
Available exits: ${context.currentRoom.availableExits.join(', ')}${context.currentRoom.thematicExits ? `
Thematic exit descriptions: ${context.currentRoom.thematicExits.map(exit => `${exit.direction}: "${exit.name}"`).join(', ')}` : ''}${context.currentRoom.characters && context.currentRoom.characters.length > 0 ? `
Characters in room: ${context.currentRoom.characters.join(', ')}` : ''}${context.currentRoom.items && context.currentRoom.items.length > 0 ? `
Items in room: ${context.currentRoom.items.join(', ')}` : ''}` : 
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
5. IMPORTANT: Match generic terms like "guy", "person", "figure" to actual character names from the "Characters in room" list
6. IMPORTANT: Match generic terms like "book", "weapon", "thing" to actual item names from the "Items in room" list
7. IMPORTANT: For commands meaning "take everything" or "grab all items", use "all" as the target parameter
8. Support compound commands like "take sword and examine it"
9. Be flexible with phrasing and synonyms
10. Use exact character and item names from the room context, not simplified versions
11. Provide clear reasoning for your interpretation

EXAMPLES:
- "grab everything" → {"action": "get", "params": ["all"], "reasoning": "Take all available items"}
- "take all items" → {"action": "get", "params": ["all"], "reasoning": "Take all available items"}  
- "collect all the things" → {"action": "get", "params": ["all"], "reasoning": "Take all available items"}
- "pick up everything here" → {"action": "get", "params": ["all"], "reasoning": "Take all available items"}

Respond in JSON format:
{
  "action": "primary action (go, look, take, talk, help, etc.)",
  "params": ["list", "of", "parameters"],
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
    const startTime = Date.now();
    let requestId = '';
    
    // Log the request if LoggerService is available
    if (this.loggerService) {
      requestId = this.loggerService.logGrokRequest(prompt, '/chat/completions');
    }
    
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

      const content = response.data.choices[0].message.content;
      
      // Log the successful response if LoggerService is available
      if (this.loggerService && requestId) {
        const durationMs = Date.now() - startTime;
        const tokenUsage = response.data.usage ? {
          input: response.data.usage.prompt_tokens,
          output: response.data.usage.completion_tokens
        } : undefined;
        
        this.loggerService.logGrokResponse(requestId, {
          content: content,
          model: this.config.model,
          usage: response.data.usage
        }, tokenUsage, durationMs);
      } else {
        // Fallback to old logging method if LoggerService not available
        const fs = require('fs');
        const timestamp = new Date().toISOString();
        const logEntry = `\n\n========= ${timestamp} =========\n${content}\n`;
        fs.appendFileSync('grok_responses.log', logEntry);
      }
      
      return content;
    } catch (error) {
      // Log the error if LoggerService is available
      if (this.loggerService && requestId) {
        this.loggerService.logGrokError(requestId, error instanceof Error ? error : new Error(String(error)));
      }
      
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        if (axios.isAxiosError(error)) {
          console.error('Grok API Error:', error.response?.data || error.message);
        } else {
          console.error('Unexpected error:', error instanceof Error ? error.message : String(error));
        }
      }
      // Re-throw for handling in calling methods
      throw error;
    }
  }

  /**
   * Set the logger service (can be called after construction)
   */
  setLoggerService(loggerService: LoggerService): void {
    this.loggerService = loggerService;
  }

  private buildPrompt(context: RoomContext): string {
    const existingRooms = context.gameHistory?.join(', ') || 'none';
    const themeNote = context.theme || 'mysterious fantasy kingdom';
    const reverseDirection = this.getReverseDirection(context.direction) || 'back';
    const fantasyGuidance = this.getFantasyGuidance(context.fantasyLevel);
    
    // Roll 1d6-3 for item count (0-3 items, 50% chance of 0)
    const itemCount = Math.max(0, Math.floor(Math.random() * 6) + 1 - 3);
    const itemPrompt = this.getItemPrompt(itemCount);
    
    // Roll percentage for character generation frequency (default 40%)
    const characterGenerationFrequency = parseInt(process.env.CHARACTER_GENERATION_FREQUENCY || '40');
    const shouldIncludeCharacters = Math.random() * 100 <= characterGenerationFrequency;
    const characterPrompt = this.getCharacterPrompt(shouldIncludeCharacters);

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

${fantasyGuidance}

REQUIREMENTS:
- Room name must be UNIQUE (different from existing rooms)
- Description should naturally reference arriving via "${context.connectionName}"
- Include return connection that complements the entrance
- Generate 2-4 total connections with thematic names
- Make connection names immersive and descriptive

RESPONSE FORMAT (ALL FIELDS REQUIRED):
{
  "name": "Unique Room Name",
  "description": "Room description acknowledging arrival via '${context.connectionName}'",
  "connections": [
    {"direction": "${reverseDirection}", "name": "complementary return connection"},
    {"direction": "north", "name": "thematic connection"}
  ],
  "items": [
    {"name": "Example Item", "description": "What you see when examining it", "isFixed": true}
  ],
  "characters": [
    {"name": "Character Name", "description": "Character appearance and demeanor", "type": "npc", "personality": "How they act", "initialDialogue": "First thing they say"}
  ]
}

${itemPrompt}

${characterPrompt}`;
    } else {
      // Standard generation
      return `You are creating a room for Shadow Kingdom text adventure game.
    
Current room: ${context.currentRoom.name}
Description: ${context.currentRoom.description}
Player is trying to go: ${context.direction}
Existing rooms: ${existingRooms}

Generate a NEW and UNIQUE room that the player discovers when going ${context.direction}. 
Make it thematically consistent with a ${themeNote} setting.

${fantasyGuidance}

REQUIREMENTS:
- Create a room name that is DIFFERENT from all existing rooms
- Make the room unique and interesting, not generic
- Include return connection to ${reverseDirection}
- CONNECTION COUNT: ${process.env.DEAD_END_CHANCE || '5'}% chance the room has only one connection back where you came from. Otherwise, roll ${process.env.CONNECTION_DICE || '2d4'} for total number of connections (including the return path).
- DIRECTIONS: Choose cardinal directions (north, south, east, west, up, down) or thematic connections (bookshelf, tapestry, hidden door, etc.)

RESPONSE FORMAT (ALL FIELDS REQUIRED):
{
  "name": "Unique Room Name",
  "description": "Detailed atmospheric description",
  "connections": [
    {"direction": "${reverseDirection}", "name": "return connection"},
    {"direction": "north", "name": "thematic connection"}
  ],
  "items": [
    {"name": "Example Item", "description": "What you see when examining it", "isFixed": true}
  ],
  "characters": [
    {"name": "Character Name", "description": "Character appearance and demeanor", "type": "npc", "personality": "How they act", "initialDialogue": "First thing they say"}
  ]
}

${itemPrompt}

${characterPrompt}`;
    }
  }

  /**
   * Generate item prompt based on dice roll result
   * @param itemCount Number of items to generate (0-3)
   */
  private getItemPrompt(itemCount: number): string {
    if (itemCount === 0) {
      return `IMPORTANT: The "items" array should be EMPTY for this room. Focus on atmospheric description without objects.

ITEM GUIDELINES: This room should feel atmospheric and immersive without any interactive objects.`;
    } else {
      return `IMPORTANT: The "items" array is REQUIRED. Include exactly ${itemCount} item${itemCount > 1 ? 's' : ''} that fit the room.

ITEM GUIDELINES:
- Fixed items (isFixed: true): furniture, architectural features, heavy/large objects
- Portable items (isFixed: false): small objects, books, tools, treasures
- Keep names concise (2-4 words) and descriptions atmospheric (1-2 sentences)
- Items should be objects naturally found in or mentioned in your room description`;
    }
  }

  /**
   * Generate character prompt based on percentage roll result
   * @param shouldIncludeCharacters Whether to request character generation
   */
  private getCharacterPrompt(shouldIncludeCharacters: boolean): string {
    if (shouldIncludeCharacters) {
      return `CHARACTER GUIDELINES (include 0-2 characters that enhance the room):
- "type": "npc" for friendly/neutral characters, "enemy" for hostile ones
- Characters should fit the room's theme and atmosphere naturally
- NPCs can provide information, services, or atmospheric storytelling
- "personality": short description like "Scholarly and cryptic" or "Gruff but helpful"
- "initialDialogue": What they say when first met (one sentence)
- Only include characters if they genuinely enhance the room experience`;
    } else {
      return `CHARACTER GUIDELINES: This room should focus on atmospheric description without characters. Do not include any characters in the "characters" array - leave it empty.`;
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

  private mockGenerateRegionConcept(context: RegionConceptGenerationContext): RegionConcept {
    const mockConcepts: RegionConcept[] = [
      {
        name: "The Crystal Caverns",
        theme: "Ancient crystal mines overtaken by magical growth",
        atmosphere: "Ethereal glow, echoing chambers, crystalline formations",
        history: "Former mining operation transformed by magical crystal infection",
        guardian: {
          name: "The Crystal Warden",
          description: "A former mine foreman transformed into living crystal",
          personality: "Protective of crystals, speaks in resonant echoes"
        },
        key: {
          name: "Prism Key",
          description: "A key carved from pure rainbow crystal"
        },
        lockedExit: {
          name: "The Resonance Gate",
          description: "A barrier of harmonizing crystal that requires the Prism Key"
        },
        suggestedElements: [
          "mining equipment", "crystal formations", "underground lakes"
        ]
      },
      {
        name: "The Haunted Observatory",
        theme: "Celestial watchtower corrupted by dark astronomy",
        atmosphere: "Starlight filtered through cursed lenses, whispered prophecies",
        history: "An ancient astronomy tower where scholars delved too deep into forbidden knowledge",
        guardian: {
          name: "The Star-Mad Astronomer",
          description: "A ghostly figure with eyes that reflect distant galaxies",
          personality: "Obsessed with cosmic patterns, speaks in astronomical riddles"
        },
        key: {
          name: "Astrolabe of Binding",
          description: "An intricate celestial instrument that opens star-locked doors"
        },
        lockedExit: {
          name: "The Constellation Gate",
          description: "A doorway sealed with shifting star patterns"
        },
        suggestedElements: [
          "telescopes", "star charts", "mystical instruments", "floating orbs"
        ]
      },
      {
        name: "The Drowned Cathedral",
        theme: "Sunken holy site with aquatic corruption",
        atmosphere: "Filtered sunlight through water, hymns carried by currents",
        history: "A great cathedral that sank beneath the waves during a divine curse",
        guardian: {
          name: "The Tide Priest",
          description: "A barnacle-encrusted cleric wielding water and faith",
          personality: "Speaks in tidal rhythms, devoted to oceanic divinity"
        },
        key: {
          name: "Pearl of Absolution",
          description: "A sacred pearl that parts blessed waters"
        },
        lockedExit: {
          name: "The Sanctified Current",
          description: "A wall of sacred water that flows only for the pure"
        },
        suggestedElements: [
          "coral growths", "holy relics", "underwater chambers", "singing shells"
        ]
      }
    ];

    return mockConcepts[Math.floor(Math.random() * mockConcepts.length)];
  }

  private getFallbackRegionConcept(context: RegionConceptGenerationContext): RegionConcept {
    return {
      name: "The Mysterious Sanctum",
      theme: "An enigmatic chamber of unknown purpose",
      atmosphere: "Shadowed corners and ancient mysteries",
      history: "A place lost to time, its original purpose forgotten",
      guardian: {
        name: "The Silent Sentinel",
        description: "A motionless figure watching over forgotten secrets",
        personality: "Speaks little, guards ancient duties"
      },
      key: {
        name: "Key of Mysteries",
        description: "An ornate key with symbols of unknown meaning"
      },
      lockedExit: {
        name: "The Sealed Portal",
        description: "A doorway locked by ancient magic"
      },
      suggestedElements: [
        "ancient symbols", "mysterious artifacts", "shadowed corners"
      ]
    };
  }

  private getFallbackRegionRoom(context: RoomGenerationContext): RegionGeneratedRoom {
    const { concept, role } = context;
    
    return {
      name: `${concept.name} Chamber`,
      description: `A mysterious room within ${concept.name}. ${concept.atmosphere} creates an intriguing environment that invites exploration.`,
      items: ["Mysterious Object", "Ancient Artifact"],
      characters: [
        {
          name: "Enigmatic Figure",
          type: role === "guardian" ? "enemy" : "npc",
          description: "A being that seems to belong to this strange place"
        }
      ]
    };
  }

  private mockGenerateRoom(context: RoomGenerationContext): RegionGeneratedRoom {
    const { concept, role } = context;
    
    // Create role-specific room templates
    const roomTemplates = {
      entrance: {
        names: ["Grand Entrance", "Threshold Chamber", "Gateway Hall", "Arrival Plaza"],
        descriptions: [
          "An impressive entryway that sets the tone for the entire region. {atmosphere} fills the space, hinting at the wonders and dangers that lie ahead. This threshold welcomes all who dare to explore further.",
          "This welcoming chamber serves as a transition from the outside world. {atmosphere} creates an immediate sense of the region's unique character. The architecture speaks of mysteries waiting to be uncovered.",
          "The first glimpse into this remarkable region greets visitors with {atmosphere} and subtle indications of what awaits within. Every detail suggests this is only the beginning of a grand adventure."
        ],
        items: ["Welcome Sign", "Regional Map", "Traveler's Pack", "Information Plaque"],
        characters: [
          { name: "Region Guide", type: "npc" as const, description: "A knowledgeable local who helps newcomers" },
          { name: "Curious Observer", type: "npc" as const, description: "A resident watching new arrivals with interest" }
        ]
      },
      guardian: {
        names: ["Guardian's Sanctum", "Chamber of Trials", "The Guardian's Domain", "Hall of the Protector"],
        descriptions: [
          "This imposing chamber serves as the stronghold of {guardianName}. {atmosphere} permeates the space, and the {keyName} gleams prominently within reach of the guardian.",
          "The very air in this room speaks of power and ancient duty. {guardianName} stands ready to protect {keyName}, surrounded by {atmosphere}.",
          "A place of testing and challenge where {guardianName} waits. The coveted {keyName} rests here, guarded faithfully amid {atmosphere}."
        ],
        items: ["Guardian's Trophy", "Ancient Weapon", "Protective Relic"],
        characters: [
          { name: "Guardian Enemy", type: "enemy" as const, description: "A powerful guardian" }
        ]
      },
      exit: {
        names: ["Exit Portal", "The Departure Gate", "Threshold to Beyond", "Region's End"],
        descriptions: [
          "This chamber houses the {exitName}, the passage to whatever lies beyond this region. {atmosphere} creates an air of anticipation and mystery.",
          "The {exitName} dominates this space, sealed and waiting. {atmosphere} suggests the importance of this threshold.",
          "A place of transition where the {exitName} stands ready to transport travelers onward, surrounded by {atmosphere}."
        ],
        items: ["Exit Instructions", "Transition Crystal", "Farewell Token", "Journey Supplies"],
        characters: [
          { name: "Portal Guardian", type: "npc" as const, description: "A being who maintains the exit portal" },
          { name: "Departing Spirit", type: "npc" as const, description: "The essence of those who have passed through" }
        ]
      },
      exploration: {
        names: ["Discovery Chamber", "Hidden Alcove", "Secret Sanctum", "Explorer's Find"],
        descriptions: [
          "This intriguing space rewards curious explorers with unique sights and treasures. {atmosphere} creates a sense of discovery and wonder.",
          "A room filled with the essence of exploration and adventure. {atmosphere} beckons visitors to investigate further.",
          "This chamber holds secrets and surprises for those who seek them. {atmosphere} enhances the sense of mystery and revelation."
        ],
        items: ["Mysterious Artifact", "Explorer's Notes", "Hidden Treasure", "Ancient Scroll"],
        characters: [
          { name: "Wise Hermit", type: "npc" as const, description: "A solitary figure with knowledge of the region" },
          { name: "Curious Creature", type: "npc" as const, description: "A unique being native to this region" }
        ]
      }
    };

    const template = roomTemplates[role];
    const randomName = template.names[Math.floor(Math.random() * template.names.length)];
    const randomDescription = template.descriptions[Math.floor(Math.random() * template.descriptions.length)];
    
    // Replace placeholders in description
    let description = randomDescription
      .replace(/{atmosphere}/g, concept.atmosphere.toLowerCase())
      .replace(/{guardianName}/g, concept.guardian.name)
      .replace(/{keyName}/g, concept.key.name)
      .replace(/{exitName}/g, concept.lockedExit.name);

    // Select random items (2-4 items)
    const shuffledItems = [...template.items].sort(() => Math.random() - 0.5);
    let selectedItems = shuffledItems.slice(0, 2 + Math.floor(Math.random() * 3));

    // Select 1-2 characters
    const shuffledCharacters = [...template.characters].sort(() => Math.random() - 0.5);
    let selectedCharacters = shuffledCharacters.slice(0, 1 + Math.floor(Math.random() * 2));

    // Special handling for guardian rooms
    if (role === 'guardian') {
      selectedItems.push(concept.key.name);
      selectedCharacters.push({
        name: concept.guardian.name,
        type: 'enemy',
        description: concept.guardian.description
      });
    }

    return {
      name: randomName,
      description: description,
      items: selectedItems,
      characters: selectedCharacters
    };
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
        reasoning: 'Interpreted wander/explore as looking around'
      };
    }
    
    if (command.includes('grab') && command.includes('everything')) {
      return {
        action: 'take',
        params: ['all'],
        reasoning: 'Interpreted as taking all available items'
      };
    }
    
    // Handle "show me" or "look at everything" type commands
    if ((command.includes('show') && command.includes('everything')) || 
        (command.includes('look') && command.includes('everything')) ||
        command.includes('show me everything')) {
      return {
        action: 'look',
        params: [],
        reasoning: 'Interpreted as looking around to see everything'
      };
    }
    
    if (command.includes('find') || command.includes('search')) {
      return {
        action: 'examine',
        params: [command.split(' ').slice(-1)[0]], // Last word as object
        reasoning: 'Interpreted search/find as examining specific object'
      };
    }
    
    if (command.includes('talk') && (command.includes('someone') || command.includes('anyone'))) {
      return {
        action: 'talk',
        params: ['npc'],
        reasoning: 'Interpreted as talking to any available NPC'
      };
    }
    
    // Handle attack commands
    if (command.includes('hit') || command.includes('attack') || command.includes('strike') || command.includes('fight') || command.includes('whack') || command.includes('smash') || command.includes('bash')) {
      // Extract target from command
      let target = 'enemy';
      if (command.includes('guardian')) target = 'Ancient Guardian';
      else if (command.includes('goblin')) target = 'goblin';
      else if (command.includes('spirit')) target = 'Ancient Guardian';
      else if (command.includes('baddie') || command.includes('bad guy')) target = 'Ancient Guardian';
      else if (command.includes('enemy')) target = 'enemy';
      else {
        // Try to extract the last word as target
        const words = command.split(' ');
        const lastWord = words[words.length - 1];
        if (lastWord && lastWord !== 'hit' && lastWord !== 'attack') {
          target = lastWord;
        }
      }
      
      return {
        action: 'attack',
        params: [target],
        reasoning: `Interpreted ${command} as attack command targeting ${target}`
      };
    }
    
    // Handle talk commands with specific targets and disambiguation  
    if (command.includes('talk') || command.includes('speak') || command.includes('chat') || command.includes('holler') || command.includes('rap')) {
      let target = 'npc';
      
      // Get available characters from current room context
      const currentRoomCharacters = context.currentRoom?.characters || [];
      
      // Debug logging for character context
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log('🤖 Mock AI: Available characters:', currentRoomCharacters);
        console.log('🤖 Mock AI: Processing command:', command);
      }
      
      // Try to extract target after "to", "with", "at"  
      const talkMatch = command.match(/(?:talk|speak|chat|holler|rap)\s+(?:to|with|at)\s+(?:the|that\s+)?(.+)/);
      if (talkMatch) {
        const extractedTarget = talkMatch[1].trim();
        
        // Enhanced disambiguation: match user terms to actual room characters
        if (extractedTarget.includes('spirit') || extractedTarget.includes('ghost') || extractedTarget.includes('spectre')) {
          // Find character in room that contains spirit/ghost/spectre
          const spiritCharacter = currentRoomCharacters.find((char: string) => 
            char.toLowerCase().includes('spirit') || char.toLowerCase().includes('ghost') || char.toLowerCase().includes('spectre')
          );
          target = spiritCharacter || extractedTarget;
        } else if (extractedTarget === 'ghost' || extractedTarget === 'spirit' || extractedTarget === 'spectre') {
          // Handle exact matches for ghost/spirit/spectre terms
          const spiritCharacter = currentRoomCharacters.find((char: string) => 
            char.toLowerCase().includes('spirit') || char.toLowerCase().includes('ghost') || char.toLowerCase().includes('spectre')
          );
          target = spiritCharacter || extractedTarget;
        } else if (extractedTarget.includes('keeper') || extractedTarget.includes('guardian')) {
          // Find character in room that contains keeper/guardian
          const keeperCharacter = currentRoomCharacters.find((char: string) => 
            char.toLowerCase().includes('keeper') || char.toLowerCase().includes('guardian')
          );
          target = keeperCharacter || extractedTarget; // Use actual room character or user input
        } else {
          // For other cases, try to find any character that contains words from the target
          const words = extractedTarget.toLowerCase().split(/\s+/);
          const matchingCharacter = currentRoomCharacters.find((char: string) => 
            words.some(word => char.toLowerCase().includes(word))
          );
          target = matchingCharacter || extractedTarget;
        }
      } else {
        // Direct reference disambiguation for commands without prepositions
        if (command.includes('spirit') || command.includes('ghost') || command.includes('spectre')) {
          const spiritMatch = currentRoomCharacters.find((char: string) => 
            char.toLowerCase().includes('spirit') || char.toLowerCase().includes('ghost') || char.toLowerCase().includes('spectre')
          );
          target = spiritMatch || 'ghost';
        }
        else if (command.includes('keeper') || command.includes('guardian')) {
          const keeperMatch = currentRoomCharacters.find((char: string) => 
            char.toLowerCase().includes('keeper') || char.toLowerCase().includes('guardian')
          );
          target = keeperMatch || 'keeper';
        }
      }
      
      return {
        action: 'talk',
        params: [target],
        reasoning: `Interpreted "${command}" as talking to ${target}`
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
   * Get fantasy level guidance for room generation prompts
   */
  private getFantasyGuidance(fantasyLevel?: 'mundane' | 'fantastical'): string {
    if (!fantasyLevel) {
      return ''; // No specific guidance if fantasy level not specified
    }

    if (fantasyLevel === 'mundane') {
      return `FANTASY LEVEL GUIDANCE:
Generate a practical, realistic room that serves a clear purpose in a medieval fantasy castle. Focus on:
- Simple, descriptive room names (Storage Room, Guard Post, Kitchen, Hallway, Chamber)
- Standard architectural features and functional spaces
- Basic furnishings and practical items
- NO magical, mystical, or fantastical naming (avoid words like Celestial, Obsidian, Ethereal, Ancient, Mystical)
- Minimal magical elements
- Grounded, believable descriptions
- Clear purpose (guard rooms, storage, hallways, chambers, sleeping quarters)`;
    } else {
      return `FANTASY LEVEL GUIDANCE:
Generate a magical, mysterious, or uniquely fantastical room that stands out. Include:
- Magical elements, enchantments, or mystical features
- Unusual architectural details
- Mysterious artifacts or phenomena
- Memorable and atmospheric descriptions
- Elements that inspire wonder or intrigue`;
    }
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