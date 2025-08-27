import { ClaudeService } from '../../src/services/claudeService';
import { PrismaService } from '../../src/services/prismaService';
import { GameStateManager } from '../../src/services/gameStateManager';
import Anthropic from '@anthropic-ai/sdk';

jest.mock('@anthropic-ai/sdk');
jest.mock('../../src/services/prismaService');
jest.mock('../../src/services/gameStateManager');

describe('ClaudeService', () => {
  let claudeService: ClaudeService;
  let mockPrismaService: any;
  let mockGameStateManager: any;
  let mockAnthropicClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    
    mockPrismaService = {
      client: {
        game: {
          findUnique: jest.fn(),
          update: jest.fn(),
        },
        room: {
          create: jest.fn(),
          findUnique: jest.fn(),
          findMany: jest.fn(),
        },
        character: {
          findUnique: jest.fn(),
          update: jest.fn(),
        },
        item: {
          findUnique: jest.fn(),
          create: jest.fn(),
        },
      },
    };

    mockGameStateManager = {
      getCurrentRoom: jest.fn(),
      getCurrentGameId: jest.fn(),
      getPlayerHistory: jest.fn(),
    };

    mockAnthropicClient = {
      messages: {
        create: jest.fn(),
      },
    };

    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => mockAnthropicClient);
  });

  describe('initialization', () => {
    it('should create instance with API key from environment', () => {
      process.env.CLAUDE_API_KEY = 'test-api-key';
      
      claudeService = new ClaudeService(mockPrismaService, mockGameStateManager);
      
      expect(Anthropic).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
      });
    });

    it('should throw error when API key is missing', () => {
      delete process.env.CLAUDE_API_KEY;
      
      expect(() => {
        new ClaudeService(mockPrismaService, mockGameStateManager);
      }).toThrow('CLAUDE_API_KEY environment variable is required');
    });

    it('should initialize in mock mode when CLAUDE_MOCK_MODE is true', () => {
      process.env.CLAUDE_MOCK_MODE = 'true';
      process.env.CLAUDE_API_KEY = 'test-api-key';
      
      claudeService = new ClaudeService(mockPrismaService, mockGameStateManager);
      
      expect(claudeService.isInMockMode()).toBe(true);
    });
  });

  describe('generateRoom', () => {
    beforeEach(() => {
      process.env.CLAUDE_API_KEY = 'test-api-key';
      claudeService = new ClaudeService(mockPrismaService, mockGameStateManager);
    });

    it('should generate room with AI response', async () => {
      // Set mock mode to false to test actual API flow
      process.env.CLAUDE_MOCK_MODE = 'false';
      claudeService = new ClaudeService(mockPrismaService, mockGameStateManager);
      
      const mockResponse = {
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            name: 'Ancient Library',
            description: 'Dusty tomes line the walls of this forgotten library.',
            exits: {
              north: 'A heavy wooden door leads north',
              east: 'An archway opens to the east',
            },
            items: ['ancient tome', 'reading glasses'],
          })
        }],
      };

      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse as any);
      mockGameStateManager.getCurrentGameId.mockReturnValue('game-123');
      mockPrismaService.client.room.findMany.mockResolvedValue([]);

      const result = await claudeService.generateRoom({
        regionTheme: 'abandoned castle',
        adjacentRooms: [],
        playerHistory: [],
      });

      expect(result).toEqual({
        name: 'Ancient Library',
        description: 'Dusty tomes line the walls of this forgotten library.',
        exits: {
          north: 'A heavy wooden door leads north',
          east: 'An archway opens to the east',
        },
        items: ['ancient tome', 'reading glasses'],
      });

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.stringContaining('claude'),
          max_tokens: expect.any(Number),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('abandoned castle'),
            }),
          ]),
        })
      );
    });

    it('should handle malformed AI responses gracefully', async () => {
      const mockResponse = {
        content: [{ 
          type: 'text', 
          text: 'Not valid JSON'
        }],
      };

      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse as any);

      const result = await claudeService.generateRoom({
        regionTheme: 'forest',
        adjacentRooms: [],
        playerHistory: [],
      });

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('exits');
    });

    it('should use cached response when available', async () => {
      // Generate the correct cache key
      const context = {
        regionTheme: 'forest',
        adjacentRooms: [],
        playerHistory: [],
      };
      const crypto = require('crypto');
      const contextString = JSON.stringify(context);
      const hash = crypto.createHash('md5').update(contextString).digest('hex');
      const cacheKey = `room_${hash}`;
      
      claudeService['responseCache'].set(cacheKey, {
        name: 'Cached Forest Room',
        description: 'A cached forest description',
        exits: { north: 'Path north' },
        items: [],
      });

      const result = await claudeService.generateRoom(context);

      expect(mockAnthropicClient.messages.create).not.toHaveBeenCalled();
      expect(result.name).toBe('Cached Forest Room');
    });

    it('should return mock response in mock mode', async () => {
      process.env.CLAUDE_MOCK_MODE = 'true';
      claudeService = new ClaudeService(mockPrismaService, mockGameStateManager);

      const result = await claudeService.generateRoom({
        regionTheme: 'dungeon',
        adjacentRooms: [],
        playerHistory: [],
      });

      expect(mockAnthropicClient.messages.create).not.toHaveBeenCalled();
      expect(result).toHaveProperty('name');
      expect(result.description).toContain('dungeon');
    });
  });

  describe('generateNPCDialogue', () => {
    beforeEach(() => {
      process.env.CLAUDE_API_KEY = 'test-api-key';
      claudeService = new ClaudeService(mockPrismaService, mockGameStateManager);
    });

    it('should generate NPC dialogue based on character personality', async () => {
      process.env.CLAUDE_MOCK_MODE = 'false';
      claudeService = new ClaudeService(mockPrismaService, mockGameStateManager);
      
      const mockCharacter = {
        id: 1,
        name: 'Gandor the Wise',
        description: 'An elderly wizard with vast knowledge',
        sentiment: 'friendly',
        health: 20,
        maxHealth: 20,
      };

      const mockResponse = {
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            dialogue: 'Ah, young traveler, the paths ahead are many, but wisdom lies in choosing carefully.',
            emotion: 'thoughtful',
            hints: ['The northern passage holds secrets', 'Beware the shadows'],
          })
        }],
      };

      mockPrismaService.client.character.findUnique.mockResolvedValue(mockCharacter as any);
      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse as any);

      const result = await claudeService.generateNPCDialogue({
        characterId: 1,
        playerInput: 'What should I do next?',
        conversationHistory: [],
      });

      expect(result).toEqual({
        dialogue: 'Ah, young traveler, the paths ahead are many, but wisdom lies in choosing carefully.',
        emotion: 'thoughtful',
        hints: ['The northern passage holds secrets', 'Beware the shadows'],
      });

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('Gandor the Wise'),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('What should I do next?'),
            }),
          ]),
        })
      );
    });

    it('should maintain conversation context across multiple exchanges', async () => {
      process.env.CLAUDE_MOCK_MODE = 'false';
      claudeService = new ClaudeService(mockPrismaService, mockGameStateManager);
      const conversationHistory = [
        { role: 'player', message: 'Hello' },
        { role: 'npc', message: 'Greetings, traveler' },
      ];

      const mockResponse = {
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            dialogue: 'As I was saying, the path ahead is treacherous.',
            emotion: 'concerned',
          })
        }],
      };

      mockPrismaService.client.character.findUnique.mockResolvedValue({ id: 1 } as any);
      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse as any);

      await claudeService.generateNPCDialogue({
        characterId: 1,
        playerInput: 'Tell me more',
        conversationHistory,
      });

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('conversation history'),
            }),
          ]),
        })
      );
    });
  });

  describe('generateItemDescription', () => {
    beforeEach(() => {
      process.env.CLAUDE_API_KEY = 'test-api-key';
      claudeService = new ClaudeService(mockPrismaService, mockGameStateManager);
    });

    it('should generate contextual item description', async () => {
      process.env.CLAUDE_MOCK_MODE = 'false';
      claudeService = new ClaudeService(mockPrismaService, mockGameStateManager);
      const mockResponse = {
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            description: 'An ancient sword, its blade still sharp despite centuries of neglect.',
            properties: {
              weight: 'heavy',
              condition: 'weathered but functional',
              value: 'priceless to collectors',
            },
            lore: 'Legend speaks of this blade belonging to a forgotten king.',
          })
        }],
      };

      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse as any);

      const result = await claudeService.generateItemDescription({
        itemName: 'ancient sword',
        roomContext: 'armory',
        regionTheme: 'abandoned castle',
      });

      expect(result).toEqual({
        description: 'An ancient sword, its blade still sharp despite centuries of neglect.',
        properties: {
          weight: 'heavy',
          condition: 'weathered but functional',
          value: 'priceless to collectors',
        },
        lore: 'Legend speaks of this blade belonging to a forgotten king.',
      });
    });
  });

  describe('rate limiting', () => {
    beforeEach(() => {
      process.env.CLAUDE_API_KEY = 'test-api-key';
      process.env.CLAUDE_RATE_LIMIT = '2';
      claudeService = new ClaudeService(mockPrismaService, mockGameStateManager);
    });

    it('should throttle requests when rate limit is exceeded', async () => {
      process.env.CLAUDE_MOCK_MODE = 'false';
      const mockResponse = {
        content: [{ type: 'text', text: '{"name":"Room","description":"A room"}' }],
      };
      mockAnthropicClient.messages.create.mockResolvedValue(mockResponse as any);

      const promises = Array(3).fill(null).map(() => 
        claudeService.generateRoom({
          regionTheme: 'test',
          adjacentRooms: [],
          playerHistory: [],
        })
      );

      const startTime = Date.now();
      await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThan(900);
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('retry logic', () => {
    beforeEach(() => {
      process.env.CLAUDE_API_KEY = 'test-api-key';
      claudeService = new ClaudeService(mockPrismaService, mockGameStateManager);
    });

    it('should retry failed requests with exponential backoff', async () => {
      process.env.CLAUDE_MOCK_MODE = 'false';
      claudeService = new ClaudeService(mockPrismaService, mockGameStateManager);
      const error = new Error('API Error');
      const mockResponse = {
        content: [{ type: 'text', text: '{"name":"Room","description":"A room"}' }],
      };

      mockAnthropicClient.messages.create
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockResponse as any);

      const result = await claudeService.generateRoom({
        regionTheme: 'test',
        adjacentRooms: [],
        playerHistory: [],
      });

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(3);
      expect(result).toHaveProperty('name', 'Room');
    });

    it('should fall back to mock response after max retries', async () => {
      process.env.CLAUDE_MOCK_MODE = 'false';
      claudeService = new ClaudeService(mockPrismaService, mockGameStateManager);
      const error = new Error('API Error');
      mockAnthropicClient.messages.create.mockRejectedValue(error);

      const result = await claudeService.generateRoom({
        regionTheme: 'dungeon',
        adjacentRooms: [],
        playerHistory: [],
      });

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(3);
      expect(result).toHaveProperty('name');
      expect(result.description).toContain('dungeon');
    });
  });

  describe('response validation', () => {
    beforeEach(() => {
      process.env.CLAUDE_API_KEY = 'test-api-key';
      claudeService = new ClaudeService(mockPrismaService, mockGameStateManager);
    });

    it('should validate room generation response structure', async () => {
      const invalidResponse = {
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            wrongField: 'value',
          })
        }],
      };

      mockAnthropicClient.messages.create.mockResolvedValue(invalidResponse as any);

      const result = await claudeService.generateRoom({
        regionTheme: 'test',
        adjacentRooms: [],
        playerHistory: [],
      });

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('exits');
    });

    it('should validate NPC dialogue response structure', async () => {
      const invalidResponse = {
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            wrongField: 'value',
          })
        }],
      };

      mockPrismaService.client.character.findUnique.mockResolvedValue({ id: 1 } as any);
      mockAnthropicClient.messages.create.mockResolvedValue(invalidResponse as any);

      const result = await claudeService.generateNPCDialogue({
        characterId: 1,
        playerInput: 'Hello',
        conversationHistory: [],
      });

      expect(result).toHaveProperty('dialogue');
      expect(result).toHaveProperty('emotion');
    });
  });

  describe('Retry Logic', () => {
    beforeEach(() => {
      process.env.CLAUDE_API_KEY = 'test-api-key';
      process.env.CLAUDE_MOCK_MODE = 'false';
      claudeService = new ClaudeService(mockPrismaService, mockGameStateManager);
    });

    it('should retry on JSON parsing errors', async () => {
      const invalidJsonResponse = {
        content: [{ 
          type: 'text', 
          text: 'Invalid JSON {broken: ' // Intentionally broken JSON
        }],
      };

      const validJsonResponse = {
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            name: 'Test Room',
            description: 'A test room description',
            exits: ['north', 'south'],
            items: [],
            npcs: [],
          })
        }],
      };

      // First two attempts return invalid JSON, third returns valid
      mockAnthropicClient.messages.create
        .mockResolvedValueOnce(invalidJsonResponse)
        .mockResolvedValueOnce(invalidJsonResponse)
        .mockResolvedValueOnce(validJsonResponse);

      const context = {
        regionTheme: 'dungeon',
        adjacentRooms: [],
        playerHistory: [],
      };
      const result = await claudeService.generateRoom(context);

      // Should have been called 3 times (2 failures + 1 success)
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(3);
      expect(result).toHaveProperty('name', 'Test Room');
    });

    it('should return fallback after all retry attempts fail', async () => {
      const invalidJsonResponse = {
        content: [{ 
          type: 'text', 
          text: 'Not valid JSON at all!'
        }],
      };

      // All attempts return invalid JSON
      mockAnthropicClient.messages.create
        .mockResolvedValue(invalidJsonResponse);

      const context = {
        regionTheme: 'dungeon',
        adjacentRooms: [],
        playerHistory: [],
      };
      const result = await claudeService.generateRoom(context);

      // Should have tried maxRetries times (default is 3)
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(3);
      // Should fall back to mock response
      expect(result).toHaveProperty('name');
      expect(result.description).toContain('dungeon'); // Mock response includes the prompt
    });

    it('should retry with exponential backoff', async () => {
      jest.useFakeTimers();
      
      const invalidJsonResponse = {
        content: [{ 
          type: 'text', 
          text: 'Invalid JSON'
        }],
      };

      const validJsonResponse = {
        content: [{ 
          type: 'text', 
          text: JSON.stringify({
            name: 'Success Room',
            description: 'Finally worked!',
            exits: [],
            items: [],
            npcs: [],
          })
        }],
      };

      mockAnthropicClient.messages.create
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(invalidJsonResponse)
        .mockResolvedValueOnce(validJsonResponse);

      const context = {
        regionTheme: 'test',
        adjacentRooms: [],
        playerHistory: [],
      };
      const promise = claudeService.generateRoom(context);

      // Fast-forward through all delays
      await jest.runAllTimersAsync();

      const result = await promise;

      expect(result).toHaveProperty('name', 'Success Room');
      expect(mockAnthropicClient.messages.create).toHaveBeenCalledTimes(3);

      jest.useRealTimers();
    }, 10000); // Increase timeout
  });
});