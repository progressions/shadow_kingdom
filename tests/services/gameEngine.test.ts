import { GameEngine } from '../../src/services/gameEngine';
import { PrismaService } from '../../src/services/prismaService';
import { GameStateManager } from '../../src/services/gameStateManager';

// Mock dependencies
jest.mock('../../src/services/prismaService');
jest.mock('../../src/services/gameStateManager');

describe('GameEngine', () => {
  let gameEngine: GameEngine;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockGameStateManager: jest.Mocked<GameStateManager>;

  beforeEach(() => {
    // Setup mocks
    const mockGameFindFirst = jest.fn();
    const mockGameCreate = jest.fn();
    const mockGameUpdate = jest.fn();
    const mockRoomFindFirst = jest.fn();

    mockPrismaService = {
      client: {
        game: {
          findFirst: mockGameFindFirst,
          create: mockGameCreate,
          update: mockGameUpdate,
        },
        room: {
          findFirst: mockRoomFindFirst,
        },
      },
      disconnect: jest.fn(),
    } as any;

    mockGameStateManager = {
      initializeGame: jest.fn(),
      getCurrentRoom: jest.fn(),
      setCurrentRoom: jest.fn(),
    } as any;

    gameEngine = new GameEngine(mockPrismaService, mockGameStateManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Auto-Launch Pipeline', () => {
    describe('detectExistingGames', () => {
      it('should return null when no games exist', async () => {
        (mockPrismaService.client.game.findFirst as jest.Mock).mockResolvedValue(null);

        const result = await gameEngine.detectExistingGames();

        expect(result).toBeNull();
        expect(mockPrismaService.client.game.findFirst).toHaveBeenCalledWith({
          orderBy: { updatedAt: 'desc' },
        });
      });

      it('should return most recent game when games exist', async () => {
        const mockGame = {
          id: 1,
          currentRoomId: 123,
          maxRoomsPerGame: 100,
          roomCount: 12,
          generationCooldownMs: 10000,
          createdAt: new Date('2025-08-24'),
          updatedAt: new Date('2025-08-25'),
        };

        (mockPrismaService.client.game.findFirst as jest.Mock).mockResolvedValue(mockGame);

        const result = await gameEngine.detectExistingGames();

        expect(result).toEqual(mockGame);
        expect(mockPrismaService.client.game.findFirst).toHaveBeenCalledWith({
          orderBy: { updatedAt: 'desc' },
        });
      });

      it('should handle database connection errors gracefully', async () => {
        (mockPrismaService.client.game.findFirst as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

        await expect(gameEngine.detectExistingGames()).rejects.toThrow('Failed to detect existing games: Database connection failed');
      });
    });

    describe('validateGameState', () => {
      it('should validate game with valid current room', async () => {
        const mockGame = {
          id: 1,
          currentRoomId: 123,
          maxRoomsPerGame: 100,
          roomCount: 12,
          generationCooldownMs: 10000,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockRoom = {
          id: 123,
          gameId: 1,
          regionId: 1,
          name: 'Test Room',
          description: 'A test room',
          extendedDescription: null,
          visited: true,
          locked: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        (mockPrismaService.client.room.findFirst as jest.Mock).mockResolvedValue(mockRoom);

        const result = await gameEngine.validateGameState(mockGame);

        expect(result).toBe(true);
        expect(mockPrismaService.client.room.findFirst).toHaveBeenCalledWith({
          where: { id: 123, gameId: 1 },
        });
      });

      it('should invalidate game with missing current room', async () => {
        const mockGame = {
          id: 1,
          currentRoomId: 123,
          maxRoomsPerGame: 100,
          roomCount: 12,
          generationCooldownMs: 10000,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        (mockPrismaService.client.room.findFirst as jest.Mock).mockResolvedValue(null);

        const result = await gameEngine.validateGameState(mockGame);

        expect(result).toBe(false);
      });

      it('should invalidate game with null current room ID', async () => {
        const mockGame = {
          id: 1,
          currentRoomId: null,
          maxRoomsPerGame: 100,
          roomCount: 12,
          generationCooldownMs: 10000,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await gameEngine.validateGameState(mockGame);

        expect(result).toBe(false);
        expect(mockPrismaService.client.room.findFirst).not.toHaveBeenCalled();
      });
    });

    describe('selectGameForLaunch', () => {
      it('should return existing valid game', async () => {
        const mockGame = {
          id: 1,
          currentRoomId: 123,
          maxRoomsPerGame: 100,
          roomCount: 12,
          generationCooldownMs: 10000,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        jest.spyOn(gameEngine, 'detectExistingGames').mockResolvedValue(mockGame);
        jest.spyOn(gameEngine, 'validateGameState').mockResolvedValue(true);

        const result = await gameEngine.selectGameForLaunch();

        expect(result.game).toEqual(mockGame);
        expect(result.isNewGame).toBe(false);
      });

      it('should create new game when no games exist', async () => {
        const mockNewGame = {
          id: 2,
          currentRoomId: 456,
          maxRoomsPerGame: 100,
          roomCount: 12,
          generationCooldownMs: 10000,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        jest.spyOn(gameEngine, 'detectExistingGames').mockResolvedValue(null);
        jest.spyOn(gameEngine, 'createNewGame').mockResolvedValue(mockNewGame);

        const result = await gameEngine.selectGameForLaunch();

        expect(result.game).toEqual(mockNewGame);
        expect(result.isNewGame).toBe(true);
      });

      it('should create new game when existing game is corrupted', async () => {
        const mockCorruptedGame = {
          id: 1,
          currentRoomId: 123,
          maxRoomsPerGame: 100,
          roomCount: 12,
          generationCooldownMs: 10000,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockNewGame = {
          id: 2,
          currentRoomId: 456,
          maxRoomsPerGame: 100,
          roomCount: 12,
          generationCooldownMs: 10000,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        jest.spyOn(gameEngine, 'detectExistingGames').mockResolvedValue(mockCorruptedGame);
        jest.spyOn(gameEngine, 'validateGameState').mockResolvedValue(false);
        jest.spyOn(gameEngine, 'createNewGame').mockResolvedValue(mockNewGame);

        const result = await gameEngine.selectGameForLaunch();

        expect(result.game).toEqual(mockNewGame);
        expect(result.isNewGame).toBe(true);
      });
    });
  });

  describe('Game Creation', () => {
    describe('createNewGame', () => {
      it('should create new game with starting room', async () => {
        const mockStartingRoom = {
          id: 456,
          gameId: 0, // Will be updated with actual game ID
          regionId: 1,
          name: 'Grand Entrance Hall',
          description: 'You stand in a magnificent hall...',
          extendedDescription: 'The entrance hall stretches impressively upward...',
          visited: false,
          locked: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockNewGame = {
          id: 2,
          currentRoomId: 456,
          maxRoomsPerGame: 100,
          roomCount: 12,
          generationCooldownMs: 10000,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        jest.spyOn(gameEngine, 'getStartingRoom').mockResolvedValue(mockStartingRoom);
        (mockPrismaService.client.game.create as jest.Mock).mockResolvedValue(mockNewGame);
        (mockGameStateManager.initializeGame as jest.Mock).mockResolvedValue(undefined);

        const result = await gameEngine.createNewGame();

        expect(result).toEqual(mockNewGame);
        expect(mockPrismaService.client.game.create).toHaveBeenCalledWith({
          data: {
            currentRoomId: 456,
            maxRoomsPerGame: 100,
            roomCount: 12,
            generationCooldownMs: 10000,
          },
        });
        expect(mockGameStateManager.initializeGame).toHaveBeenCalledWith(mockNewGame);
      });

      it('should handle starting room not found error', async () => {
        jest.spyOn(gameEngine, 'getStartingRoom').mockRejectedValue(new Error('No starting room found'));

        await expect(gameEngine.createNewGame()).rejects.toThrow('Failed to create new game: No starting room found');
      });
    });

    describe('getStartingRoom', () => {
      it('should find starting room from seeded world', async () => {
        const mockStartingRoom = {
          id: 456,
          gameId: 1,
          regionId: 1,
          name: 'Grand Entrance Hall',
          description: 'You stand in a magnificent hall...',
          extendedDescription: 'The entrance hall stretches impressively upward...',
          visited: true,
          locked: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        (mockPrismaService.client.room.findFirst as jest.Mock).mockResolvedValue(mockStartingRoom);

        const result = await gameEngine.getStartingRoom();

        expect(result).toEqual(mockStartingRoom);
        expect(mockPrismaService.client.room.findFirst).toHaveBeenCalledWith({
          where: {
            name: 'Grand Entrance Hall',
          },
          orderBy: { createdAt: 'desc' },
        });
      });

      it('should throw error when no starting room found', async () => {
        (mockPrismaService.client.room.findFirst as jest.Mock).mockResolvedValue(null);

        await expect(gameEngine.getStartingRoom()).rejects.toThrow('No starting room found in database. Please seed the world first.');
      });
    });
  });

  describe('Launch Configuration', () => {
    it('should support default auto-launch configuration', () => {
      const config = gameEngine.getLaunchConfiguration();

      expect(config).toEqual({
        skipMenu: true,
        autoCreateGame: true,
        showLaunchMessages: true,
        updatePlayTimestamps: true,
        backgroundGeneration: true,
      });
    });

    it('should allow custom launch configuration', () => {
      const customConfig = {
        skipMenu: false,
        autoCreateGame: false,
        showLaunchMessages: false,
        updatePlayTimestamps: false,
        backgroundGeneration: false,
      };

      gameEngine.setLaunchConfiguration(customConfig);

      expect(gameEngine.getLaunchConfiguration()).toEqual(customConfig);
    });
  });
});