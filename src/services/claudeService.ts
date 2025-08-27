import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from './prismaService';
import { GameStateManager } from './gameStateManager';
import crypto from 'crypto';

interface RoomGenerationContext {
  regionTheme: string;
  adjacentRooms: Array<{ name: string; direction: string }>;
  playerHistory: string[];
}

interface RoomGenerationResponse {
  name: string;
  description: string;
  exits: Record<string, string>;
  items?: string[];
}

interface NPCDialogueContext {
  characterId: number;
  playerInput: string;
  conversationHistory: Array<{ role: string; message: string }>;
}

interface NPCDialogueResponse {
  dialogue: string;
  emotion: string;
  hints?: string[];
}

interface ItemDescriptionContext {
  itemName: string;
  roomContext: string;
  regionTheme: string;
}

interface ItemDescriptionResponse {
  description: string;
  properties?: Record<string, string>;
  lore?: string;
}

export class ClaudeService {
  private client: Anthropic | null = null;
  private prismaService: PrismaService;
  private gameStateManager: GameStateManager;
  private mockMode: boolean = false;
  protected responseCache: Map<string, any> = new Map();
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue: boolean = false;
  private rateLimit: number;
  private requestsThisSecond: number = 0;
  private lastRequestTime: number = Date.now();
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  constructor(prismaService: PrismaService, gameStateManager: GameStateManager) {
    this.prismaService = prismaService;
    this.gameStateManager = gameStateManager;
    this.mockMode = process.env.CLAUDE_MOCK_MODE === 'true';
    this.rateLimit = parseInt(process.env.CLAUDE_RATE_LIMIT || '5', 10);

    if (!this.mockMode) {
      const apiKey = process.env.CLAUDE_API_KEY;
      if (!apiKey) {
        throw new Error('CLAUDE_API_KEY environment variable is required');
      }
      this.client = new Anthropic({ apiKey });
    }
  }

  isInMockMode(): boolean {
    return this.mockMode;
  }

  private generateCacheKey(type: string, context: any): string {
    const contextString = JSON.stringify(context);
    const hash = crypto.createHash('md5').update(contextString).digest('hex');
    return `${type}_${hash}`;
  }

  private getCachedResponse(key: string): any | null {
    return this.responseCache.get(key) || null;
  }

  private setCachedResponse(key: string, response: any): void {
    this.responseCache.set(key, response);
    
    // Only set timeout if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      setTimeout(() => {
        this.responseCache.delete(key);
      }, 300000);
    }
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest > 1000) {
      this.requestsThisSecond = 0;
      this.lastRequestTime = now;
    }

    if (this.requestsThisSecond >= this.rateLimit) {
      const waitTime = 1000 - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestsThisSecond = 0;
      this.lastRequestTime = Date.now();
    }

    this.requestsThisSecond++;
  }

  private async makeRequestWithRetry(prompt: string, systemPrompt: string): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        await this.enforceRateLimit();
        
        if (!this.client) {
          throw new Error('Claude client not initialized');
        }

        const response = await this.client.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }],
        });

        if (response.content && response.content.length > 0) {
          const textContent = response.content.find(c => c.type === 'text');
          if (textContent && 'text' in textContent) {
            try {
              return JSON.parse(textContent.text);
            } catch (parseError) {
              console.error(`Failed to parse AI response on attempt ${attempt + 1}:`, parseError);
              console.error('Raw response:', textContent.text);
              // Throw the error to trigger retry logic
              throw new Error(`JSON parse error: ${parseError}`);
            }
          }
        }
        
        // No content received - throw error to trigger retry
        throw new Error('No valid content in API response');
      } catch (error) {
        lastError = error as Error;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Log different error types appropriately
        if (errorMessage.includes('JSON parse error')) {
          console.error(`JSON parsing failed on attempt ${attempt + 1}/${this.maxRetries}`);
        } else {
          console.error(`API request attempt ${attempt + 1}/${this.maxRetries} failed:`, errorMessage);
        }
        
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error('All retry attempts failed:', lastError);
    return null;
  }

  private validateRoomResponse(response: any): RoomGenerationResponse {
    if (!response || typeof response !== 'object') {
      return this.generateMockRoom('unknown');
    }

    return {
      name: response.name || 'Unnamed Room',
      description: response.description || 'An empty room.',
      exits: response.exits || {},
      items: response.items || [],
    };
  }

  private validateNPCResponse(response: any): NPCDialogueResponse {
    if (!response || typeof response !== 'object') {
      return {
        dialogue: 'The character remains silent.',
        emotion: 'neutral',
      };
    }

    return {
      dialogue: response.dialogue || 'The character says nothing.',
      emotion: response.emotion || 'neutral',
      hints: response.hints || [],
    };
  }

  private validateItemResponse(response: any): ItemDescriptionResponse {
    if (!response || typeof response !== 'object') {
      return {
        description: 'An ordinary item.',
      };
    }

    return {
      description: response.description || 'An ordinary item.',
      properties: response.properties || {},
      lore: response.lore,
    };
  }

  private generateMockRoom(regionTheme: string): RoomGenerationResponse {
    const mockRooms = {
      dungeon: {
        name: 'Dark Cell',
        description: 'A dank dungeon cell with stone walls and iron bars.',
        exits: { north: 'A heavy iron door' },
        items: ['rusty key', 'torch'],
      },
      forest: {
        name: 'Forest Clearing',
        description: 'A peaceful clearing surrounded by tall trees.',
        exits: { east: 'A winding path', south: 'Dense undergrowth' },
        items: ['mushroom', 'stick'],
      },
      castle: {
        name: 'Great Hall',
        description: 'A grand hall with high ceilings and ornate decorations.',
        exits: { north: 'Throne room door', west: 'Servant quarters' },
        items: ['candelabra', 'tapestry'],
      },
    };

    return mockRooms[regionTheme as keyof typeof mockRooms] || {
      name: 'Generic Room',
      description: `A room themed around ${regionTheme}.`,
      exits: { north: 'An exit' },
      items: [],
    };
  }

  private generateMockNPCDialogue(): NPCDialogueResponse {
    return {
      dialogue: 'Hello, traveler. How may I assist you today?',
      emotion: 'friendly',
      hints: ['Try exploring the northern passage.'],
    };
  }

  private generateMockItemDescription(itemName: string): ItemDescriptionResponse {
    return {
      description: `A mysterious ${itemName} with unknown properties.`,
      properties: {
        weight: 'light',
        condition: 'good',
      },
      lore: 'This item has been here for ages.',
    };
  }

  async generateRoom(context: RoomGenerationContext): Promise<RoomGenerationResponse> {
    const cacheKey = this.generateCacheKey('room', context);
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      return cached;
    }

    if (this.mockMode) {
      const mockResponse = this.generateMockRoom(context.regionTheme);
      this.setCachedResponse(cacheKey, mockResponse);
      return mockResponse;
    }

    const systemPrompt = `You are a creative AI generating rooms for a text adventure game. 
    Generate rooms that are thematically consistent, interesting, and interconnected.
    Always respond with valid JSON containing: name, description, exits (object with directions as keys), and items (array).`;

    const userPrompt = `Generate a room for a ${context.regionTheme} setting.
    Adjacent rooms: ${JSON.stringify(context.adjacentRooms)}
    Recent player history: ${context.playerHistory.join(', ')}
    
    Create a unique room that fits the theme and connects logically to adjacent areas.`;

    const response = await this.makeRequestWithRetry(userPrompt, systemPrompt);
    const validatedResponse = this.validateRoomResponse(response);
    
    if (!response) {
      const fallback = this.generateMockRoom(context.regionTheme);
      this.setCachedResponse(cacheKey, fallback);
      return fallback;
    }

    this.setCachedResponse(cacheKey, validatedResponse);
    return validatedResponse;
  }

  async generateNPCDialogue(context: NPCDialogueContext): Promise<NPCDialogueResponse> {
    const cacheKey = this.generateCacheKey('dialogue', context);
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      return cached;
    }

    if (this.mockMode) {
      const mockResponse = this.generateMockNPCDialogue();
      this.setCachedResponse(cacheKey, mockResponse);
      return mockResponse;
    }

    const character = await this.prismaService.client.character.findUnique({
      where: { id: context.characterId },
    });

    if (!character) {
      return {
        dialogue: 'The character is not here.',
        emotion: 'absent',
      };
    }

    const systemPrompt = `You are roleplaying as an NPC in a text adventure game.
    Character: ${character.name}
    Description: ${character.description}
    Sentiment: ${character.sentiment}
    Health: ${character.health}/${character.maxHealth}
    
    Respond in character with appropriate dialogue based on their sentiment (${character.sentiment}).
    Include emotion and optional hints.
    Always respond with valid JSON containing: dialogue, emotion, and optionally hints (array).`;

    const userPrompt = `Player says: "${context.playerInput}"
    Previous conversation history: ${JSON.stringify(context.conversationHistory)}
    
    Respond as this character would, maintaining consistency with their personality.`;

    const response = await this.makeRequestWithRetry(userPrompt, systemPrompt);
    const validatedResponse = this.validateNPCResponse(response);
    
    if (!response) {
      const fallback = this.generateMockNPCDialogue();
      this.setCachedResponse(cacheKey, fallback);
      return fallback;
    }

    this.setCachedResponse(cacheKey, validatedResponse);
    return validatedResponse;
  }

  async generateItemDescription(context: ItemDescriptionContext): Promise<ItemDescriptionResponse> {
    const cacheKey = this.generateCacheKey('item', context);
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      return cached;
    }

    if (this.mockMode) {
      const mockResponse = this.generateMockItemDescription(context.itemName);
      this.setCachedResponse(cacheKey, mockResponse);
      return mockResponse;
    }

    const systemPrompt = `You are describing items for a text adventure game.
    Create interesting, thematic descriptions that fit the setting.
    Always respond with valid JSON containing: description, optionally properties (object), and optionally lore.`;

    const userPrompt = `Describe the item: ${context.itemName}
    Found in: ${context.roomContext}
    Region theme: ${context.regionTheme}
    
    Create a description that fits the theme and location.`;

    const response = await this.makeRequestWithRetry(userPrompt, systemPrompt);
    const validatedResponse = this.validateItemResponse(response);
    
    if (!response) {
      const fallback = this.generateMockItemDescription(context.itemName);
      this.setCachedResponse(cacheKey, fallback);
      return fallback;
    }

    this.setCachedResponse(cacheKey, validatedResponse);
    return validatedResponse;
  }

  async clearCache(): Promise<void> {
    this.responseCache.clear();
  }

  getCacheSize(): number {
    return this.responseCache.size;
  }
}