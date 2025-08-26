import { CommandRouter } from '../../src/services/commandRouter';
import { GameStateManager } from '../../src/services/gameStateManager';
import { PrismaService } from '../../src/services/prismaService';
import { TargetDisambiguationService } from '../../src/services/targetDisambiguationService';
import { Item, Room, Connection } from '@prisma/client';

describe('Pickup Command', () => {
  let commandRouter: CommandRouter;
  let mockGameStateManager: jest.Mocked<GameStateManager>;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockTargetDisambiguationService: jest.Mocked<TargetDisambiguationService>;

  beforeEach(() => {
    // Mock PrismaService
    mockPrismaService = {
      client: {
        item: {
          findMany: jest.fn(),
          update: jest.fn(),
          updateMany: jest.fn(),
        },
        character: {
          findMany: jest.fn(),
        },
        connection: {
          findMany: jest.fn(),
        },
        $transaction: jest.fn(),
      },
    } as any;

    // Mock GameStateManager
    mockGameStateManager = {
      hasActiveSession: jest.fn().mockReturnValue(true),
      getCurrentRoom: jest.fn(),
      addToInventory: jest.fn(),
      getInventory: jest.fn(),
      getInventoryCount: jest.fn(),
      removeFromRoom: jest.fn(),
    } as any;

    // Mock TargetDisambiguationService
    mockTargetDisambiguationService = {
      parseCommand: jest.fn(),
      resolveTarget: jest.fn(),
      buildRoomContext: jest.fn(),
    } as any;

    // Create CommandRouter with mocked dependencies
    commandRouter = new CommandRouter(mockGameStateManager, mockPrismaService);
    // Inject the disambiguation service
    (commandRouter as any).targetDisambiguationService = mockTargetDisambiguationService;
  });

  describe('Command Registration', () => {
    it('should register take, pickup, and get commands', () => {
      const commands = commandRouter.getAllCommands();
      
      expect(commands.some(cmd => cmd.name === 'take')).toBe(true);
      expect(commands.some(cmd => cmd.name === 'pickup')).toBe(true);
      expect(commands.some(cmd => cmd.name === 'get')).toBe(true);
    });

    it('should register command aliases', () => {
      expect(commandRouter.processCommand('t sword')).toBeDefined();
      expect(commandRouter.processCommand('p sword')).toBeDefined();
      expect(commandRouter.processCommand('g sword')).toBeDefined();
    });
  });

  describe('Single Item Pickup', () => {
    beforeEach(() => {
      const mockRoom: Room = {
        id: 100,
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
      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockGameStateManager.getInventoryCount as jest.Mock).mockReturnValue(0);
    });

    it('should pick up a single item successfully', async () => {
      const mockItem: Item = {
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
      };

      (mockTargetDisambiguationService.parseCommand as jest.Mock).mockResolvedValue({
        success: true,
        command: {
          verb: 'take',
          target: 'golden sword',
          targetIds: [1],
          confidence: 1.0,
        },
      });

      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([mockItem]);
      (mockPrismaService.client.item.update as jest.Mock).mockResolvedValue({
        ...mockItem,
        roomId: null,
      });
      (mockGameStateManager.addToInventory as jest.Mock).mockResolvedValue(true);

      const result = await commandRouter.processCommand('take golden sword');

      expect(result.message).toContain('You pick up the golden sword');
      expect(mockPrismaService.client.item.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { roomId: null },
      });
      expect(mockGameStateManager.addToInventory).toHaveBeenCalledWith(1);
    });

    it('should handle item not found', async () => {
      (mockTargetDisambiguationService.parseCommand as jest.Mock).mockResolvedValue({
        success: true,
        command: {
          verb: 'take',
          target: 'nonexistent',
          targetIds: [],
          confidence: 0.2,
        },
      });

      const result = await commandRouter.processCommand('take nonexistent');

      expect(result.message).toContain('There is no nonexistent here');
      expect(mockPrismaService.client.item.update).not.toHaveBeenCalled();
      expect(mockGameStateManager.addToInventory).not.toHaveBeenCalled();
    });

    it('should handle inventory full', async () => {
      (mockGameStateManager.getInventoryCount as jest.Mock).mockReturnValue(10);

      (mockTargetDisambiguationService.parseCommand as jest.Mock).mockResolvedValue({
        success: true,
        command: {
          verb: 'take',
          target: 'sword',
          targetIds: [1],
          confidence: 1.0,
        },
      });

      const result = await commandRouter.processCommand('take sword');

      expect(result.message).toContain("You can't carry any more items");
      expect(mockPrismaService.client.item.update).not.toHaveBeenCalled();
      expect(mockGameStateManager.addToInventory).not.toHaveBeenCalled();
    });
  });

  describe('Take All Functionality', () => {
    beforeEach(() => {
      const mockRoom: Room = {
        id: 100,
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
      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockGameStateManager.getInventoryCount as jest.Mock).mockReturnValue(0);
    });

    it('should pick up all items in the room', async () => {
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
        {
          id: 2,
          gameId: 1,
          roomId: 100,
          name: 'shield',
          description: 'Protection',
          extendedDescription: null,
          type: 'armor',
          hidden: false,
          value: 75,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockTargetDisambiguationService.parseCommand as jest.Mock).mockResolvedValue({
        success: true,
        command: {
          verb: 'take',
          target: 'all',
          targetIds: [1, 2],
          confidence: 0.95,
        },
      });

      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue(mockItems);
      (mockPrismaService.client.$transaction as jest.Mock).mockImplementation(async (fn) => {
        return fn(mockPrismaService.client);
      });
      (mockPrismaService.client.item.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
      (mockGameStateManager.addToInventory as jest.Mock).mockResolvedValue(true);

      const result = await commandRouter.processCommand('take all');

      expect(result.message).toContain('You pick up everything in the room: sword, shield');
      expect(mockPrismaService.client.item.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        data: { roomId: null },
      });
      expect(mockGameStateManager.addToInventory).toHaveBeenCalledTimes(2);
    });

    it('should handle take all with empty room', async () => {
      (mockTargetDisambiguationService.parseCommand as jest.Mock).mockResolvedValue({
        success: true,
        command: {
          verb: 'take',
          target: 'all',
          targetIds: [],
          confidence: 0.2,
        },
      });

      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);

      const result = await commandRouter.processCommand('take all');

      expect(result.message).toContain('There are no items here to pick up');
      expect(mockPrismaService.client.item.updateMany).not.toHaveBeenCalled();
      expect(mockGameStateManager.addToInventory).not.toHaveBeenCalled();
    });

    it('should handle partial pickup when inventory fills up', async () => {
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
        {
          id: 2,
          gameId: 1,
          roomId: 100,
          name: 'shield',
          description: 'Protection',
          extendedDescription: null,
          type: 'armor',
          hidden: false,
          value: 75,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          gameId: 1,
          roomId: 100,
          name: 'potion',
          description: 'Healing',
          extendedDescription: null,
          type: 'consumable',
          hidden: false,
          value: 25,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Start with 8 items in inventory, can only take 2 more
      (mockGameStateManager.getInventoryCount as jest.Mock).mockReturnValue(8);

      (mockTargetDisambiguationService.parseCommand as jest.Mock).mockResolvedValue({
        success: true,
        command: {
          verb: 'take',
          target: 'all',
          targetIds: [1, 2, 3],
          confidence: 0.95,
        },
      });

      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue(mockItems);
      (mockGameStateManager.addToInventory as jest.Mock)
        .mockResolvedValueOnce(true)  // First item
        .mockResolvedValueOnce(true)  // Second item
        .mockResolvedValueOnce(false); // Third item fails (inventory full)

      const result = await commandRouter.processCommand('take all');

      expect(result.message).toContain('You picked up: sword, shield');
      expect(result.message).toContain("Couldn't pick up all items - inventory full");
      // Only 2 items are added because we check capacity before trying to add
      expect(mockGameStateManager.addToInventory).toHaveBeenCalledTimes(2);
    });
  });

  describe('Command Variations', () => {
    beforeEach(() => {
      const mockRoom: Room = {
        id: 100,
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
      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockGameStateManager.getInventoryCount as jest.Mock).mockReturnValue(0);
    });

    it('should handle "pickup" command', async () => {
      (mockTargetDisambiguationService.parseCommand as jest.Mock).mockResolvedValue({
        success: true,
        command: {
          verb: 'pickup',
          target: 'coin',
          targetIds: [1],
          confidence: 1.0,
        },
      });

      const mockItem: Item = {
        id: 1,
        gameId: 1,
        roomId: 100,
        name: 'coin',
        description: 'Gold coin',
        extendedDescription: null,
        type: 'currency',
        hidden: false,
        value: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([mockItem]);
      (mockPrismaService.client.item.update as jest.Mock).mockResolvedValue({
        ...mockItem,
        roomId: null,
      });
      (mockGameStateManager.addToInventory as jest.Mock).mockResolvedValue(true);

      const result = await commandRouter.processCommand('pickup coin');

      expect(result.message).toContain('You pick up the coin');
    });

    it('should handle "get" command', async () => {
      (mockTargetDisambiguationService.parseCommand as jest.Mock).mockResolvedValue({
        success: true,
        command: {
          verb: 'get',
          target: 'key',
          targetIds: [1],
          confidence: 1.0,
        },
      });

      const mockItem: Item = {
        id: 1,
        gameId: 1,
        roomId: 100,
        name: 'key',
        description: 'Old key',
        extendedDescription: null,
        type: 'key',
        hidden: false,
        value: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([mockItem]);
      (mockPrismaService.client.item.update as jest.Mock).mockResolvedValue({
        ...mockItem,
        roomId: null,
      });
      (mockGameStateManager.addToInventory as jest.Mock).mockResolvedValue(true);

      const result = await commandRouter.processCommand('get key');

      expect(result.message).toContain('You pick up the key');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockRoom: Room = {
        id: 100,
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
      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);

      (mockTargetDisambiguationService.parseCommand as jest.Mock).mockResolvedValue({
        success: true,
        command: {
          verb: 'take',
          target: 'sword',
          targetIds: [1],
          confidence: 1.0,
        },
      });

      (mockPrismaService.client.item.findMany as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await commandRouter.processCommand('take sword');

      expect(result.message.toLowerCase()).toContain('failed');
      expect(mockGameStateManager.addToInventory).not.toHaveBeenCalled();
    });

    it('should handle unparseable commands', async () => {
      // Setup room for validation to pass
      const mockRoom: Room = {
        id: 100,
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
      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);

      (mockTargetDisambiguationService.parseCommand as jest.Mock).mockResolvedValue({
        success: false,
        failureContext: {
          rawInput: 'grab the shiny thing',
          attemptedParsers: ['natural'],
          partialMatches: [],
          roomContext: {
            items: [{ id: 1, name: 'golden sword' }],
            characters: [],
            exits: ['north', 'south'],
          },
        },
      });

      const result = await commandRouter.processCommand('grab the shiny thing');

      expect(result.message).toContain("don't understand");
      expect(mockPrismaService.client.item.update).not.toHaveBeenCalled();
      expect(mockGameStateManager.addToInventory).not.toHaveBeenCalled();
    });
  });
});