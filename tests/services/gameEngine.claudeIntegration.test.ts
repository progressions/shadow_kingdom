import { GameEngine } from '../../src/services/gameEngine';

// Mock the services
jest.mock('../../src/services/prismaService', () => ({
  PrismaService: {
    getInstance: jest.fn(() => ({
      client: {
        game: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        room: {
          findFirst: jest.fn(),
          findMany: jest.fn(),
          findUnique: jest.fn(),
        },
        region: {
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          create: jest.fn(),
        },
      },
      initialize: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    })),
  },
}));

jest.mock('../../src/services/gameStateManager');
jest.mock('../../src/services/claudeRegionService');

describe('GameEngine with Claude Integration', () => {
  let gameEngine: GameEngine;
  let mockPrismaService: any;
  let mockGameStateManager: any;
  let mockClaudeRegionService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get mocked instances
    const { PrismaService } = require('../../src/services/prismaService');
    const { GameStateManager } = require('../../src/services/gameStateManager');
    const { ClaudeRegionService } = require('../../src/services/claudeRegionService');
    
    mockPrismaService = PrismaService.getInstance();
    mockGameStateManager = new GameStateManager(mockPrismaService);
    mockClaudeRegionService = new ClaudeRegionService(mockPrismaService, mockGameStateManager);
  });

  describe('initialization with ClaudeRegionService', () => {
    it('should initialize with ClaudeRegionService when provided', () => {
      gameEngine = new GameEngine(
        mockPrismaService,
        mockGameStateManager,
        mockClaudeRegionService
      );

      expect(gameEngine).toBeDefined();
      expect(gameEngine.getClaudeRegionService()).toBe(mockClaudeRegionService);
    });

    it('should work without ClaudeRegionService (backward compatibility)', () => {
      gameEngine = new GameEngine(
        mockPrismaService,
        mockGameStateManager
      );

      expect(gameEngine).toBeDefined();
      expect(gameEngine.getClaudeRegionService()).toBeUndefined();
    });

    it('should trigger region generation on game launch when Claude is available', async () => {
      gameEngine = new GameEngine(
        mockPrismaService,
        mockGameStateManager,
        mockClaudeRegionService
      );

      const mockGame = {
        id: 1,
        currentRoomId: 1,
        maxRoomsPerGame: 100,
        roomCount: 12,
        generationCooldownMs: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRoom = {
        id: 1,
        gameId: 1,
        regionId: 1,
        name: 'Starting Room',
        description: 'The beginning',
        visited: false,
        locked: false,
      };

      mockPrismaService.client.game.findMany.mockResolvedValue([mockGame]);
      mockPrismaService.client.game.findFirst.mockResolvedValue(mockGame);
      mockPrismaService.client.room.findFirst.mockResolvedValue(mockRoom);

      mockClaudeRegionService.triggerRegionGeneration = jest.fn().mockResolvedValue(undefined);

      const result = await gameEngine.safeLaunch();

      expect(result.game).toBeDefined();
      
      // Should trigger generation for adjacent regions
      expect(mockClaudeRegionService.triggerRegionGeneration).toHaveBeenCalled();
    });
  });

  describe('region generation triggers', () => {
    beforeEach(() => {
      gameEngine = new GameEngine(
        mockPrismaService,
        mockGameStateManager,
        mockClaudeRegionService
      );
    });

    it('should check for region boundaries when needed', async () => {
      const mockRoom = {
        id: 1,
        regionId: 1,
      };
      
      mockPrismaService.client.room.findFirst.mockResolvedValue(mockRoom);
      
      const shouldGenerate = await gameEngine.shouldTriggerRegionGeneration(1, 1);
      
      expect(typeof shouldGenerate).toBe('boolean');
    });

    it('should get generation status from ClaudeRegionService', () => {
      const mockStatus = {
        phase: 'generating-theme' as const,
        startTime: Date.now(),
      };
      
      mockClaudeRegionService.getGenerationStatus = jest.fn().mockReturnValue(mockStatus);
      
      const status = gameEngine.getRegionGenerationStatus(1, 'north');
      
      expect(mockClaudeRegionService.getGenerationStatus).toHaveBeenCalledWith(1, 'north');
      expect(status).toBe(mockStatus);
    });
  });
});