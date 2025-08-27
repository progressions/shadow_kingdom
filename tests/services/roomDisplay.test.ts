import { GameStateManager } from '../../src/services/gameStateManager';
import { RoomNavigationEngine } from '../../src/services/roomNavigationEngine';
import { PrismaService } from '../../src/services/prismaService';
import { Room, Connection, Item, Character } from '@prisma/client';

// Mock dependencies
jest.mock('../../src/services/prismaService');

describe('Room Display System', () => {
  let gameStateManager: GameStateManager;
  let navigationEngine: RoomNavigationEngine;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(() => {
    // Setup mock Prisma service
    const mockConnectionFindMany = jest.fn();
    const mockItemFindMany = jest.fn();
    const mockCharacterFindMany = jest.fn();
    const mockRoomFindUnique = jest.fn();
    const mockRoomUpdate = jest.fn();
    const mockGameUpdate = jest.fn();
    
    // Set default return values for mocks
    mockItemFindMany.mockResolvedValue([]);

    mockPrismaService = {
      client: {
        connection: {
          findMany: mockConnectionFindMany,
        },
        item: {
          findMany: mockItemFindMany,
        },
        character: {
          findMany: mockCharacterFindMany,
        },
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
    navigationEngine = new RoomNavigationEngine(gameStateManager, mockPrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    gameStateManager?.clearSession();
  });

  describe('GameStateManager.getCurrentRoomInfo()', () => {
    let mockRoom: Room;

    beforeEach(async () => {
      mockRoom = {
        id: 100,
        gameId: 1,
        regionId: 1,
        name: 'Grand Entrance Hall',
        description: 'A magnificent hall with towering marble columns and a sweeping staircase.',
        extendedDescription: 'Sunlight streams through stained glass windows, casting colorful patterns on the polished floor.',
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockGame = {
        id: 1,
        currentRoomId: 100,
        maxRoomsPerGame: 100,
        roomCount: 12,
        generationCooldownMs: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaService.client.room.findUnique as jest.Mock).mockResolvedValue(mockRoom);
      (mockPrismaService.client.room.update as jest.Mock).mockResolvedValue({ ...mockRoom, visited: true });
      
      await gameStateManager.initializeGame(mockGame);
    });

    it('should return formatted room information with name and description', async () => {
      const mockConnections: Connection[] = [
        {
          id: 1,
          gameId: 1,
          fromRoomId: 100,
          toRoomId: 101,
          direction: 'north',
          description: null,
          locked: false,
          requiredKey: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          gameId: 1,
          fromRoomId: 100,
          toRoomId: 102,
          direction: 'east',
          description: 'through an ornate doorway',
          locked: false,
          requiredKey: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue(mockConnections);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);

      const roomInfo = await gameStateManager.getCurrentRoomInfo();

      expect(roomInfo).toContain('Grand Entrance Hall');
      expect(roomInfo).toContain('A magnificent hall with towering marble columns');
      expect(roomInfo).toContain('Exits: north (to somewhere), east (through an ornate doorway)');
    });

    it('should include extended description when available and room is visited', async () => {
      const visitedRoom = { ...mockRoom, visited: true };
      gameStateManager['currentSession']!.currentRoom = visitedRoom;

      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);

      const roomInfo = await gameStateManager.getCurrentRoomInfo();

      expect(roomInfo).toContain('Sunlight streams through stained glass windows');
    });

    it('should show "no obvious exits" when room has no connections', async () => {
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);

      const roomInfo = await gameStateManager.getCurrentRoomInfo();

      expect(roomInfo).toContain('There are no obvious exits');
    });

    it('should handle locked exits with special notation', async () => {
      const mockConnections: Connection[] = [
        {
          id: 1,
          gameId: 1,
          fromRoomId: 100,
          toRoomId: 101,
          direction: 'north',
          description: null,
          locked: true,
          requiredKey: 'brass-key',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue(mockConnections);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);

      const roomInfo = await gameStateManager.getCurrentRoomInfo();

      expect(roomInfo).toContain('north (to somewhere)');
    });

    it('should return error message when no active session', async () => {
      gameStateManager.clearSession();

      const roomInfo = await gameStateManager.getCurrentRoomInfo();

      expect(roomInfo).toBe('No active game session. Please start or load a game.');
    });
  });

  describe('RoomNavigationEngine.formatRoomExits()', () => {
    beforeEach(async () => {
      const mockRoom = {
        id: 200,
        gameId: 1,
        regionId: 1,
        name: 'Library',
        description: 'Rows of ancient books line the walls.',
        extendedDescription: null,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockGame = {
        id: 1,
        currentRoomId: 200,
        maxRoomsPerGame: 100,
        roomCount: 12,
        generationCooldownMs: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaService.client.room.findUnique as jest.Mock).mockResolvedValue(mockRoom);
      (mockPrismaService.client.room.update as jest.Mock).mockResolvedValue({ ...mockRoom, visited: true });
      
      await gameStateManager.initializeGame(mockGame);
    });

    it('should format exits with descriptions when available', async () => {
      const mockConnections: Connection[] = [
        {
          id: 1,
          gameId: 1,
          fromRoomId: 200,
          toRoomId: 201,
          direction: 'north',
          description: 'through a heavy oak door',
          locked: false,
          requiredKey: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          gameId: 1,
          fromRoomId: 200,
          toRoomId: 202,
          direction: 'south',
          description: null,
          locked: false,
          requiredKey: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const exitInfo = await navigationEngine.formatRoomExits(200, mockConnections);

      expect(exitInfo).toContain('north (through a heavy oak door)');
      expect(exitInfo).toContain('south');
    });

    it('should handle all cardinal and intercardinal directions', async () => {
      const mockConnections: Connection[] = [
        { id: 1, gameId: 1, fromRoomId: 200, toRoomId: 201, direction: 'north', description: null, locked: false, requiredKey: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, gameId: 1, fromRoomId: 200, toRoomId: 202, direction: 'northeast', description: null, locked: false, requiredKey: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 3, gameId: 1, fromRoomId: 200, toRoomId: 203, direction: 'east', description: null, locked: false, requiredKey: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 4, gameId: 1, fromRoomId: 200, toRoomId: 204, direction: 'southeast', description: null, locked: false, requiredKey: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 5, gameId: 1, fromRoomId: 200, toRoomId: 205, direction: 'south', description: null, locked: false, requiredKey: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 6, gameId: 1, fromRoomId: 200, toRoomId: 206, direction: 'southwest', description: null, locked: false, requiredKey: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 7, gameId: 1, fromRoomId: 200, toRoomId: 207, direction: 'west', description: null, locked: false, requiredKey: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 8, gameId: 1, fromRoomId: 200, toRoomId: 208, direction: 'northwest', description: null, locked: false, requiredKey: null, createdAt: new Date(), updatedAt: new Date() },
      ];

      const exitInfo = await navigationEngine.formatRoomExits(200, mockConnections);

      expect(exitInfo).toContain('north');
      expect(exitInfo).toContain('northeast');
      expect(exitInfo).toContain('east');
      expect(exitInfo).toContain('southeast');
      expect(exitInfo).toContain('south');
      expect(exitInfo).toContain('southwest');
      expect(exitInfo).toContain('west');
      expect(exitInfo).toContain('northwest');
    });

    it('should properly indicate locked exits', async () => {
      const mockConnections: Connection[] = [
        {
          id: 1,
          gameId: 1,
          fromRoomId: 200,
          toRoomId: 201,
          direction: 'north',
          description: 'through a reinforced door',
          locked: true,
          requiredKey: 'iron-key',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const exitInfo = await navigationEngine.formatRoomExits(200, mockConnections);

      expect(exitInfo).toContain('north (locked, through a reinforced door)');
    });
  });

  describe('Room Display with Items and Characters', () => {
    let mockRoom: Room;

    beforeEach(async () => {
      mockRoom = {
        id: 300,
        gameId: 1,
        regionId: 1,
        name: 'Market Square',
        description: 'A bustling square filled with vendors and shoppers.',
        extendedDescription: null,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockGame = {
        id: 1,
        currentRoomId: 300,
        maxRoomsPerGame: 100,
        roomCount: 12,
        generationCooldownMs: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaService.client.room.findUnique as jest.Mock).mockResolvedValue(mockRoom);
      (mockPrismaService.client.room.update as jest.Mock).mockResolvedValue({ ...mockRoom, visited: true });
      
      await gameStateManager.initializeGame(mockGame);
    });

    it('should include items in room description', async () => {
      const mockItems: Item[] = [
        {
          id: 1,
          gameId: 1,
          roomId: 300,
          name: 'silver coin',
          description: 'A gleaming silver coin with an ancient inscription.',
          extendedDescription: null,
          type: 'treasure',
          hidden: false,
          value: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          gameId: 1,
          roomId: 300,
          name: 'merchant stall',
          description: 'A colorful stall displaying various wares.',
          extendedDescription: null,
          type: 'furniture',
          hidden: false,
          value: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue(mockItems);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);

      const roomInfo = await gameStateManager.getCurrentRoomInfo();

      expect(roomInfo).toContain('You can see:');
      expect(roomInfo).toContain('a silver coin');
      expect(roomInfo).toContain('a merchant stall');
    });

    it('should include characters in room description', async () => {
      const mockCharacters: Character[] = [
        {
          id: 1,
          gameId: 1,
          roomId: 300,
          name: 'old merchant',
          description: 'A weathered merchant with keen eyes.',
          sentiment: 'friendly',
          health: 100,
          maxHealth: 100,
          attack: 5,
          defense: 2,
          alive: true,
          dialogueFriendly: 'Welcome, traveler! I have many fine wares.',
          dialogueHostile: null,
          dialogueDefeated: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue(mockCharacters);

      const roomInfo = await gameStateManager.getCurrentRoomInfo();

      expect(roomInfo).toContain('old merchant is here');
      expect(roomInfo).toContain('A weathered merchant with keen eyes');
    });
  });
});