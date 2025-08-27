import { TargetDisambiguationService } from '../../src/services/targetDisambiguationService';
import { PrismaService } from '../../src/services/prismaService';
import { GameStateManager } from '../../src/services/gameStateManager';
import { Room, Item, Character } from '@prisma/client';

describe('TargetDisambiguationService', () => {
  let service: TargetDisambiguationService;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockGameStateManager: jest.Mocked<GameStateManager>;

  beforeEach(() => {
    // Setup mocks
    mockPrismaService = {
      client: {
        item: {
          findMany: jest.fn(),
        },
        character: {
          findMany: jest.fn(),
        },
        connection: {
          findMany: jest.fn(),
        },
      },
    } as any;

    mockGameStateManager = {
      getCurrentRoom: jest.fn(),
      getCurrentSession: jest.fn(),
    } as any;

    service = new TargetDisambiguationService(mockPrismaService, mockGameStateManager);
  });

  describe('Context Building', () => {
    it('should build complete room context', async () => {
      const mockRoom: Room = {
        id: 100,
        gameId: 1,
        regionId: 1,
        name: 'Test Room',
        description: 'A test room',
        extendedDescription: null,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockItems: Item[] = [
        {
          id: 1,
          gameId: 1,
          roomId: 100,
          name: 'golden sword',
          description: 'A gleaming blade',
          extendedDescription: null,
          type: 'weapon',
          hidden: false,
          value: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          gameId: 1,
          roomId: 100,
          name: 'silver key',
          description: 'A small silver key',
          extendedDescription: null,
          type: 'key',
          hidden: false,
          value: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockCharacters: Character[] = [
        {
          id: 1,
          gameId: 1,
          roomId: 100,
          name: 'merchant',
          description: 'A friendly merchant',
          sentiment: 'friendly',
          health: 100,
          maxHealth: 100,
          attack: 5,
          defense: 5,
          alive: true,
          dialogueFriendly: null,
          dialogueHostile: null,
          dialogueDefeated: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockConnections = [
        { direction: 'north', toRoomId: 101 },
        { direction: 'east', toRoomId: 102 },
      ];

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue(mockItems);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue(mockCharacters);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue(mockConnections);

      const context = await service.buildRoomContext();

      expect(context).toEqual({
        roomId: 100,
        items: expect.arrayContaining([
          expect.objectContaining({ id: 1, name: 'golden sword' }),
          expect.objectContaining({ id: 2, name: 'silver key' }),
        ]),
        characters: expect.arrayContaining([
          expect.objectContaining({ id: 1, name: 'merchant' }),
        ]),
        exits: ['north', 'east'],
        roomDescription: 'A test room',
      });
    });

    it('should handle empty rooms gracefully', async () => {
      const mockRoom: Room = {
        id: 100,
        gameId: 1,
        regionId: 1,
        name: 'Empty Room',
        description: 'An empty room',
        extendedDescription: null,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

      const context = await service.buildRoomContext();

      expect(context.items).toEqual([]);
      expect(context.characters).toEqual([]);
      expect(context.exits).toEqual([]);
    });
  });

  describe('"all" Keyword Resolution', () => {
    beforeEach(() => {
      const mockRoom: Room = {
        id: 100,
        gameId: 1,
        regionId: 1,
        name: 'Test Room',
        description: 'A test room',
        extendedDescription: null,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
    });

    it('should resolve "all" to items for take commands', async () => {
      const mockItems: Item[] = [
        {
          id: 1,
          gameId: 1,
          roomId: 100,
          name: 'sword',
          description: 'A sword',
          extendedDescription: null,
          type: 'weapon',
          hidden: false,
          value: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          gameId: 1,
          roomId: 100,
          name: 'shield',
          description: 'A shield',
          extendedDescription: null,
          type: 'armor',
          hidden: false,
          value: 75,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue(mockItems);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.resolveTarget('all', 'take');

      expect(result.targets).toHaveLength(2);
      expect(result.targets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'item', name: 'sword' }),
          expect.objectContaining({ type: 'item', name: 'shield' }),
        ])
      );
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should resolve "all" to characters for attack commands', async () => {
      const mockCharacters: Character[] = [
        {
          id: 1,
          gameId: 1,
          roomId: 100,
          name: 'goblin',
          description: 'A hostile goblin',
          sentiment: 'hostile',
          health: 30,
          maxHealth: 30,
          attack: 5,
          defense: 2,
          alive: true,
          dialogueFriendly: null,
          dialogueHostile: null,
          dialogueDefeated: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue(mockCharacters);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.resolveTarget('all', 'attack');

      expect(result.targets).toHaveLength(1);
      expect(result.targets[0]).toEqual(
        expect.objectContaining({ type: 'character', name: 'goblin' })
      );
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should return empty targets for "all" in empty room', async () => {
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.resolveTarget('all', 'take');

      expect(result.targets).toEqual([]);
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.issue).toContain('no items');
    });
  });

  describe('Partial Name Matching', () => {
    beforeEach(() => {
      const mockRoom: Room = {
        id: 100,
        gameId: 1,
        regionId: 1,
        name: 'Test Room',
        description: 'A test room',
        extendedDescription: null,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
    });

    it('should match partial item names', async () => {
      const mockItems: Item[] = [
        {
          id: 1,
          gameId: 1,
          roomId: 100,
          name: 'golden sword',
          description: 'A gleaming blade',
          extendedDescription: null,
          type: 'weapon',
          hidden: false,
          value: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue(mockItems);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.resolveTarget('swor', 'take');

      expect(result.targets).toHaveLength(1);
      expect(result.targets[0].name).toBe('golden sword');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should handle ambiguous partial matches', async () => {
      const mockItems: Item[] = [
        {
          id: 1,
          gameId: 1,
          roomId: 100,
          name: 'golden sword',
          description: 'A golden blade',
          extendedDescription: null,
          type: 'weapon',
          hidden: false,
          value: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          gameId: 1,
          roomId: 100,
          name: 'silver sword',
          description: 'A silver blade',
          extendedDescription: null,
          type: 'weapon',
          hidden: false,
          value: 80,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue(mockItems);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.resolveTarget('sword', 'take');

      expect(result.targets).toHaveLength(2);
      expect(result.confidence).toBeLessThan(0.8);
      expect(result.confidence).toBeGreaterThan(0.4);
      expect(result.issue?.toLowerCase()).toContain('multiple matches');
      expect(result.suggestions).toEqual(['golden sword', 'silver sword']);
    });

    it('should handle no matches', async () => {
      const mockItems: Item[] = [
        {
          id: 1,
          gameId: 1,
          roomId: 100,
          name: 'sword',
          description: 'A blade',
          extendedDescription: null,
          type: 'weapon',
          hidden: false,
          value: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue(mockItems);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.resolveTarget('axe', 'take');

      expect(result.targets).toEqual([]);
      expect(result.confidence).toBeLessThan(0.3);
      expect(result.issue).toContain('no match');
    });
  });

  describe('Confidence Scoring', () => {
    beforeEach(() => {
      const mockRoom: Room = {
        id: 100,
        gameId: 1,
        regionId: 1,
        name: 'Test Room',
        description: 'A test room',
        extendedDescription: null,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
    });

    it('should score 1.0 for exact match', async () => {
      const mockItems: Item[] = [
        {
          id: 1,
          gameId: 1,
          roomId: 100,
          name: 'golden sword',
          description: 'A blade',
          extendedDescription: null,
          type: 'weapon',
          hidden: false,
          value: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue(mockItems);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.resolveTarget('golden sword', 'take');

      expect(result.confidence).toBe(1.0);
      expect(result.targets).toHaveLength(1);
    });

    it('should score 0.8-0.9 for good partial match', async () => {
      const mockItems: Item[] = [
        {
          id: 1,
          gameId: 1,
          roomId: 100,
          name: 'golden sword',
          description: 'A blade',
          extendedDescription: null,
          type: 'weapon',
          hidden: false,
          value: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue(mockItems);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.resolveTarget('golden', 'take');

      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.confidence).toBeLessThan(1.0);
    });

    it('should score 0.5-0.7 for ambiguous match', async () => {
      const mockItems: Item[] = [
        {
          id: 1,
          gameId: 1,
          roomId: 100,
          name: 'golden sword',
          description: 'A blade',
          extendedDescription: null,
          type: 'weapon',
          hidden: false,
          value: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          gameId: 1,
          roomId: 100,
          name: 'golden shield',
          description: 'A shield',
          extendedDescription: null,
          type: 'armor',
          hidden: false,
          value: 150,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue(mockItems);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.resolveTarget('gold', 'take');

      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.confidence).toBeLessThanOrEqual(0.7);
    });

    it('should score < 0.3 for no match', async () => {
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.resolveTarget('nonexistent', 'take');

      expect(result.confidence).toBeLessThan(0.3);
    });
  });

  describe('Parse Result Generation', () => {
    it('should generate successful parse result', async () => {
      const mockRoom: Room = {
        id: 100,
        gameId: 1,
        regionId: 1,
        name: 'Test Room',
        description: 'A test room',
        extendedDescription: null,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockItems: Item[] = [
        {
          id: 1,
          gameId: 1,
          roomId: 100,
          name: 'sword',
          description: 'A blade',
          extendedDescription: null,
          type: 'weapon',
          hidden: false,
          value: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue(mockItems);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.parseCommand('take sword');

      expect(result.success).toBe(true);
      expect(result.command).toEqual({
        verb: 'take',
        target: 'sword',
        targetIds: [1],
        confidence: 1.0,
      });
      expect(result.failureContext).toBeUndefined();
    });

    it('should generate failure context for unparseable commands', async () => {
      const mockRoom: Room = {
        id: 100,
        gameId: 1,
        regionId: 1,
        name: 'Test Room',
        description: 'A test room',
        extendedDescription: null,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([
        { direction: 'north', toRoomId: 101 },
      ]);

      const result = await service.parseCommand('grab the shiny thing');

      expect(result.success).toBe(false);
      expect(result.failureContext).toBeDefined();
      expect(result.failureContext?.rawInput).toBe('grab the shiny thing');
      expect(result.failureContext?.roomContext).toEqual({
        roomId: 100,
        items: [],
        characters: [],
        exits: ['north'],
        roomDescription: 'A test room',
      });
      expect(result.failureContext?.partialMatches).toBeDefined();
    });
  });
});