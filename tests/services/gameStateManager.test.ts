import { GameStateManager } from '../../src/services/gameStateManager';
import { PrismaService } from '../../src/services/prismaService';
import { Game, Room } from '@prisma/client';

// Mock dependencies
jest.mock('../../src/services/prismaService');

describe('GameStateManager', () => {
  let gameStateManager: GameStateManager;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(() => {
    // Setup mocks
    const mockRoomFindUnique = jest.fn();
    const mockRoomUpdate = jest.fn();
    const mockGameUpdate = jest.fn();

    mockPrismaService = {
      client: {
        room: {
          findUnique: mockRoomFindUnique,
          update: mockRoomUpdate,
        },
        game: {
          update: mockGameUpdate,
        },
      },
      disconnect: jest.fn(),
    } as any;

    gameStateManager = new GameStateManager(mockPrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear any intervals to prevent test timeout
    gameStateManager?.clearSession();
  });

  describe('Game Initialization', () => {
    it('should initialize game with valid current room', async () => {
      const mockGame: Game = {
        id: 1,
        currentRoomId: 123,
        maxRoomsPerGame: 100,
        roomCount: 12,
        generationCooldownMs: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRoom: Room = {
        id: 123,
        gameId: 1,
        regionId: 1,
        name: 'Grand Entrance Hall',
        description: 'You stand in a magnificent hall...',
        extendedDescription: 'The entrance hall stretches impressively upward...',
        visited: false,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaService.client.room.findUnique as jest.Mock).mockResolvedValue(mockRoom);
      (mockPrismaService.client.room.update as jest.Mock).mockResolvedValue({ ...mockRoom, visited: true });

      await gameStateManager.initializeGame(mockGame);

      expect(mockPrismaService.client.room.findUnique).toHaveBeenCalledWith({
        where: { id: 123 },
      });
      expect(mockPrismaService.client.room.update).toHaveBeenCalledWith({
        where: { id: 123 },
        data: { visited: true },
      });

      const currentRoom = gameStateManager.getCurrentRoom();
      expect(currentRoom).toEqual(mockRoom);
      expect(gameStateManager.hasActiveSession()).toBe(true);
    });

    it('should throw error when game has no current room', async () => {
      const mockGame: Game = {
        id: 1,
        currentRoomId: null,
        maxRoomsPerGame: 100,
        roomCount: 12,
        generationCooldownMs: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await expect(gameStateManager.initializeGame(mockGame)).rejects.toThrow('Game has no current room set');
    });

    it('should throw error when current room does not exist', async () => {
      const mockGame: Game = {
        id: 1,
        currentRoomId: 999,
        maxRoomsPerGame: 100,
        roomCount: 12,
        generationCooldownMs: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaService.client.room.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(gameStateManager.initializeGame(mockGame)).rejects.toThrow('Current room 999 not found');
    });
  });

  describe('Session Management', () => {
    let mockGame: Game;
    let mockStartingRoom: Room;

    beforeEach(async () => {
      mockGame = {
        id: 1,
        currentRoomId: 123,
        maxRoomsPerGame: 100,
        roomCount: 12,
        generationCooldownMs: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockStartingRoom = {
        id: 123,
        gameId: 1,
        regionId: 1,
        name: 'Grand Entrance Hall',
        description: 'You stand in a magnificent hall...',
        extendedDescription: null,
        visited: false,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaService.client.room.findUnique as jest.Mock).mockResolvedValue(mockStartingRoom);
      (mockPrismaService.client.room.update as jest.Mock).mockResolvedValue({ ...mockStartingRoom, visited: true });

      await gameStateManager.initializeGame(mockGame);
    });

    describe('getCurrentSession', () => {
      it('should return current session info', () => {
        const session = gameStateManager.getCurrentSession();

        expect(session).toEqual({
          gameId: 1,
          currentRoomId: 123,
          currentRoom: mockStartingRoom,
          lastSaved: expect.any(Date),
          sessionStartTime: expect.any(Date),
        });
      });
    });

    describe('hasActiveSession', () => {
      it('should return true when session is active', () => {
        expect(gameStateManager.hasActiveSession()).toBe(true);
      });

      it('should return false after clearing session', () => {
        gameStateManager.clearSession();
        expect(gameStateManager.hasActiveSession()).toBe(false);
      });
    });

    describe('getCurrentRoom', () => {
      it('should return current room', () => {
        const currentRoom = gameStateManager.getCurrentRoom();
        expect(currentRoom).toEqual(mockStartingRoom);
      });

      it('should return null when no active session', () => {
        gameStateManager.clearSession();
        const currentRoom = gameStateManager.getCurrentRoom();
        expect(currentRoom).toBeNull();
      });
    });
  });

  describe('Room Navigation and State Persistence', () => {
    let mockGame: Game;
    let mockStartingRoom: Room;
    let mockTargetRoom: Room;

    beforeEach(async () => {
      mockGame = {
        id: 1,
        currentRoomId: 123,
        maxRoomsPerGame: 100,
        roomCount: 12,
        generationCooldownMs: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockStartingRoom = {
        id: 123,
        gameId: 1,
        regionId: 1,
        name: 'Grand Entrance Hall',
        description: 'You stand in a magnificent hall...',
        extendedDescription: null,
        visited: false,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTargetRoom = {
        id: 456,
        gameId: 1,
        regionId: 1,
        name: 'Throne Room',
        description: 'A vast chamber dominated by an empty throne...',
        extendedDescription: null,
        visited: false,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaService.client.room.findUnique as jest.Mock).mockResolvedValue(mockStartingRoom);
      (mockPrismaService.client.room.update as jest.Mock).mockResolvedValue({ ...mockStartingRoom, visited: true });

      await gameStateManager.initializeGame(mockGame);
    });

    describe('setCurrentRoom', () => {
      it('should successfully move to new room and update game state', async () => {
        // Setup mocks for room change
        (mockPrismaService.client.room.findUnique as jest.Mock).mockResolvedValue(mockTargetRoom);
        (mockPrismaService.client.game.update as jest.Mock).mockResolvedValue({ ...mockGame, currentRoomId: 456 });
        (mockPrismaService.client.room.update as jest.Mock).mockResolvedValue({ ...mockTargetRoom, visited: true });

        const result = await gameStateManager.setCurrentRoom(456);

        expect(result).toEqual(mockTargetRoom);
        
        // Verify game record was updated
        expect(mockPrismaService.client.game.update).toHaveBeenCalledWith({
          where: { id: 1 },
          data: {
            currentRoomId: 456,
            updatedAt: expect.any(Date),
          },
        });

        // Verify room was marked as visited
        expect(mockPrismaService.client.room.update).toHaveBeenCalledWith({
          where: { id: 456 },
          data: { visited: true },
        });

        // Verify session was updated
        const session = gameStateManager.getCurrentSession();
        expect(session?.currentRoomId).toBe(456);
        expect(session?.currentRoom).toEqual(mockTargetRoom);
      });

      it('should throw error when no active session', async () => {
        gameStateManager.clearSession();

        await expect(gameStateManager.setCurrentRoom(456)).rejects.toThrow('No active game session');
      });

      it('should throw error when target room does not exist', async () => {
        (mockPrismaService.client.room.findUnique as jest.Mock).mockResolvedValue(null);

        await expect(gameStateManager.setCurrentRoom(999)).rejects.toThrow('Room 999 not found');
      });

      it('should throw error when target room belongs to different game', async () => {
        const wrongGameRoom = { ...mockTargetRoom, gameId: 2 };
        (mockPrismaService.client.room.findUnique as jest.Mock).mockResolvedValue(wrongGameRoom);

        await expect(gameStateManager.setCurrentRoom(456)).rejects.toThrow('Room 456 does not belong to current game 1');
      });

      it('should handle database errors during room transition', async () => {
        (mockPrismaService.client.room.findUnique as jest.Mock).mockResolvedValue(mockTargetRoom);
        (mockPrismaService.client.game.update as jest.Mock).mockRejectedValue(new Error('Database error'));

        await expect(gameStateManager.setCurrentRoom(456)).rejects.toThrow('Failed to set current room: Database error');
      });
    });
  });

  describe('State Consistency and Recovery', () => {
    it('should handle room marking errors gracefully', async () => {
      const mockGame: Game = {
        id: 1,
        currentRoomId: 123,
        maxRoomsPerGame: 100,
        roomCount: 12,
        generationCooldownMs: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRoom: Room = {
        id: 123,
        gameId: 1,
        regionId: 1,
        name: 'Grand Entrance Hall',
        description: 'You stand in a magnificent hall...',
        extendedDescription: null,
        visited: false,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      (mockPrismaService.client.room.findUnique as jest.Mock).mockResolvedValue(mockRoom);
      (mockPrismaService.client.room.update as jest.Mock).mockRejectedValue(new Error('Update failed'));

      // Should not throw error, just log warning
      await expect(gameStateManager.initializeGame(mockGame)).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to mark room 123 as visited:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Session Restoration', () => {
    it('should restore session state after reinitialization', async () => {
      const mockGame: Game = {
        id: 1,
        currentRoomId: 123,
        maxRoomsPerGame: 100,
        roomCount: 12,
        generationCooldownMs: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRoom: Room = {
        id: 123,
        gameId: 1,
        regionId: 1,
        name: 'Grand Entrance Hall',
        description: 'You stand in a magnificent hall...',
        extendedDescription: null,
        visited: true,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaService.client.room.findUnique as jest.Mock).mockResolvedValue(mockRoom);
      (mockPrismaService.client.room.update as jest.Mock).mockResolvedValue(mockRoom);

      // Initialize session
      await gameStateManager.initializeGame(mockGame);
      expect(gameStateManager.hasActiveSession()).toBe(true);

      // Clear session (simulating app restart)
      gameStateManager.clearSession();
      expect(gameStateManager.hasActiveSession()).toBe(false);

      // Restore session
      await gameStateManager.initializeGame(mockGame);
      expect(gameStateManager.hasActiveSession()).toBe(true);
      
      const restoredSession = gameStateManager.getCurrentSession();
      expect(restoredSession?.gameId).toBe(1);
      expect(restoredSession?.currentRoomId).toBe(123);
      expect(restoredSession?.currentRoom.name).toBe('Grand Entrance Hall');
    });
  });
});