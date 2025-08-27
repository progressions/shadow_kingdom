import { CommandRouter } from '../../src/services/commandRouter';
import { GameStateManager } from '../../src/services/gameStateManager';
import { PrismaService } from '../../src/services/prismaService';
import { TargetDisambiguationService } from '../../src/services/targetDisambiguationService';
import { Item, Room } from '@prisma/client';

describe('Drop Command', () => {
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
      getInventory: jest.fn(),
      getInventoryCount: jest.fn(),
      removeFromInventory: jest.fn(),
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

  describe('Command Recognition', () => {
    it('should recognize drop command', () => {
      const commands = commandRouter.getAllCommands();
      expect(commands.some(cmd => cmd.name === 'drop')).toBe(true);
    });

    it('should recognize "d" as drop alias', () => {
      expect(commandRouter.processCommand('d sword')).toBeDefined();
    });

    it('should recognize "discard" as drop alias', () => {
      expect(commandRouter.processCommand('discard sword')).toBeDefined();
    });
  });

  describe('Single Item Drop', () => {
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

    it('should drop a single item successfully', async () => {
      const mockItem: Item = {
        id: 1,
        gameId: 1,
        roomId: null, // In inventory
        name: 'golden sword',
        description: 'A gleaming blade',
        extendedDescription: null,
        type: 'weapon',
        hidden: false,
        value: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockGameStateManager.getInventory as jest.Mock).mockReturnValue([1]);
      (mockGameStateManager.getInventoryCount as jest.Mock).mockReturnValue(1);
      
      // Mock the disambiguation service to parse the command
      (mockTargetDisambiguationService.parseCommand as jest.Mock).mockResolvedValue({
        success: true,
        command: {
          verb: 'drop',
          target: 'golden sword',
          targetIds: [1],
          confidence: 1.0,
        },
      });

      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([mockItem]);
      (mockPrismaService.client.item.update as jest.Mock).mockResolvedValue({
        ...mockItem,
        roomId: 100,
      });
      (mockGameStateManager.removeFromInventory as jest.Mock).mockResolvedValue(true);

      const result = await commandRouter.processCommand('drop golden sword');

      expect(result.message).toContain('You drop the golden sword');
      expect(mockPrismaService.client.item.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { roomId: 100 },
      });
      expect(mockGameStateManager.removeFromInventory).toHaveBeenCalledWith(1);
    });

    it('should handle item not in inventory', async () => {
      (mockGameStateManager.getInventory as jest.Mock).mockReturnValue([]);
      (mockGameStateManager.getInventoryCount as jest.Mock).mockReturnValue(0);
      
      (mockTargetDisambiguationService.parseCommand as jest.Mock).mockResolvedValue({
        success: true,
        command: {
          verb: 'drop',
          target: 'sword',
          targetIds: [],
          confidence: 0.2,
        },
      });

      const result = await commandRouter.processCommand('drop sword');

      expect(result.message).toContain("You don't have");
      expect(mockPrismaService.client.item.update).not.toHaveBeenCalled();
      expect(mockGameStateManager.removeFromInventory).not.toHaveBeenCalled();
    });

    it('should handle partial name matching for drop', async () => {
      const mockItem: Item = {
        id: 1,
        gameId: 1,
        roomId: null,
        name: 'golden sword of legend',
        description: 'A legendary weapon',
        extendedDescription: null,
        type: 'weapon',
        hidden: false,
        value: 500,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockGameStateManager.getInventory as jest.Mock).mockReturnValue([1]);
      (mockGameStateManager.getInventoryCount as jest.Mock).mockReturnValue(1);
      
      (mockTargetDisambiguationService.parseCommand as jest.Mock).mockResolvedValue({
        success: true,
        command: {
          verb: 'drop',
          target: 'golden',
          targetIds: [1],
          confidence: 0.85,
        },
      });

      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([mockItem]);
      (mockPrismaService.client.item.update as jest.Mock).mockResolvedValue({
        ...mockItem,
        roomId: 100,
      });
      (mockGameStateManager.removeFromInventory as jest.Mock).mockResolvedValue(true);

      const result = await commandRouter.processCommand('drop golden');

      expect(result.message).toContain('You drop the golden sword of legend');
      expect(mockGameStateManager.removeFromInventory).toHaveBeenCalledWith(1);
    });
  });

  describe('Drop All Functionality', () => {
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

    it('should drop all items from inventory', async () => {
      const mockItems: Item[] = [
        {
          id: 1,
          gameId: 1,
          roomId: null,
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
          roomId: null,
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

      (mockGameStateManager.getInventory as jest.Mock).mockReturnValue([1, 2]);
      (mockGameStateManager.getInventoryCount as jest.Mock).mockReturnValue(2);
      
      (mockTargetDisambiguationService.parseCommand as jest.Mock).mockResolvedValue({
        success: true,
        command: {
          verb: 'drop',
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
      (mockGameStateManager.removeFromInventory as jest.Mock).mockResolvedValue(true);

      const result = await commandRouter.processCommand('drop all');

      expect(result.message).toContain('You drop everything: sword, shield');
      expect(mockPrismaService.client.item.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        data: { roomId: 100 },
      });
      expect(mockGameStateManager.removeFromInventory).toHaveBeenCalledTimes(2);
    });

    it('should handle drop all with empty inventory', async () => {
      (mockGameStateManager.getInventory as jest.Mock).mockReturnValue([]);
      (mockGameStateManager.getInventoryCount as jest.Mock).mockReturnValue(0);
      
      (mockTargetDisambiguationService.parseCommand as jest.Mock).mockResolvedValue({
        success: true,
        command: {
          verb: 'drop',
          target: 'all',
          targetIds: [],
          confidence: 0.2,
        },
      });

      const result = await commandRouter.processCommand('drop all');

      expect(result.message).toContain("You're not carrying anything");
      expect(mockPrismaService.client.item.updateMany).not.toHaveBeenCalled();
      expect(mockGameStateManager.removeFromInventory).not.toHaveBeenCalled();
    });

    it('should handle drop all with single item', async () => {
      const mockItem: Item = {
        id: 1,
        gameId: 1,
        roomId: null,
        name: 'golden key',
        description: 'Opens something',
        extendedDescription: null,
        type: 'key',
        hidden: false,
        value: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockGameStateManager.getInventory as jest.Mock).mockReturnValue([1]);
      (mockGameStateManager.getInventoryCount as jest.Mock).mockReturnValue(1);
      
      (mockTargetDisambiguationService.parseCommand as jest.Mock).mockResolvedValue({
        success: true,
        command: {
          verb: 'drop',
          target: 'all',
          targetIds: [1],
          confidence: 0.95,
        },
      });

      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([mockItem]);
      (mockPrismaService.client.item.update as jest.Mock).mockResolvedValue({
        ...mockItem,
        roomId: 100,
      });
      (mockGameStateManager.removeFromInventory as jest.Mock).mockResolvedValue(true);

      const result = await commandRouter.processCommand('drop all');

      expect(result.message).toContain('You drop the golden key');
      expect(mockPrismaService.client.item.update).toHaveBeenCalled();
      expect(mockGameStateManager.removeFromInventory).toHaveBeenCalledWith(1);
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
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
    });

    it('should handle "discard" command', async () => {
      const mockItem: Item = {
        id: 1,
        gameId: 1,
        roomId: null,
        name: 'broken sword',
        description: 'No longer useful',
        extendedDescription: null,
        type: 'weapon',
        hidden: false,
        value: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockGameStateManager.getInventory as jest.Mock).mockReturnValue([1]);
      
      (mockTargetDisambiguationService.parseCommand as jest.Mock).mockResolvedValue({
        success: true,
        command: {
          verb: 'discard',
          target: 'broken sword',
          targetIds: [1],
          confidence: 1.0,
        },
      });

      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([mockItem]);
      (mockPrismaService.client.item.update as jest.Mock).mockResolvedValue({
        ...mockItem,
        roomId: 100,
      });
      (mockGameStateManager.removeFromInventory as jest.Mock).mockResolvedValue(true);

      const result = await commandRouter.processCommand('discard broken sword');

      expect(result.message).toContain('You drop the broken sword');
    });

    it('should handle "put down" command', async () => {
      const mockItem: Item = {
        id: 1,
        gameId: 1,
        roomId: null,
        name: 'heavy rock',
        description: 'Very heavy',
        extendedDescription: null,
        type: 'misc',
        hidden: false,
        value: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockGameStateManager.getInventory as jest.Mock).mockReturnValue([1]);
      
      (mockTargetDisambiguationService.parseCommand as jest.Mock).mockResolvedValue({
        success: true,
        command: {
          verb: 'put',
          target: 'heavy rock',
          targetIds: [1],
          confidence: 1.0,
        },
      });

      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([mockItem]);
      (mockPrismaService.client.item.update as jest.Mock).mockResolvedValue({
        ...mockItem,
        roomId: 100,
      });
      (mockGameStateManager.removeFromInventory as jest.Mock).mockResolvedValue(true);

      const result = await commandRouter.processCommand('put down heavy rock');

      expect(result.message).toContain('You drop the heavy rock');
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
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockGameStateManager.getInventory as jest.Mock).mockReturnValue([1]);
      
      (mockTargetDisambiguationService.parseCommand as jest.Mock).mockResolvedValue({
        success: true,
        command: {
          verb: 'drop',
          target: 'sword',
          targetIds: [1],
          confidence: 1.0,
        },
      });

      (mockPrismaService.client.item.findMany as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await commandRouter.processCommand('drop sword');

      expect(result.message.toLowerCase()).toContain('failed');
      expect(mockGameStateManager.removeFromInventory).not.toHaveBeenCalled();
    });

    it('should handle unparseable commands', async () => {
      // Setup room for validation
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
      
      (mockTargetDisambiguationService.parseCommand as jest.Mock).mockResolvedValue({
        success: false,
        failureContext: {
          rawInput: 'throw away the thingy',
          attemptedParsers: ['natural'],
          partialMatches: [],
          roomContext: {
            items: [],
            characters: [],
            exits: ['north', 'south'],
          },
        },
      });

      const result = await commandRouter.processCommand('throw away the thingy');

      expect(result.message).toContain("don't understand");
      expect(mockPrismaService.client.item.update).not.toHaveBeenCalled();
      expect(mockGameStateManager.removeFromInventory).not.toHaveBeenCalled();
    });

    it('should handle ambiguous item names', async () => {
      const mockItems: Item[] = [
        {
          id: 1,
          gameId: 1,
          roomId: null,
          name: 'red potion',
          description: 'Heals',
          extendedDescription: null,
          type: 'consumable',
          hidden: false,
          value: 25,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          gameId: 1,
          roomId: null,
          name: 'blue potion',
          description: 'Restores mana',
          extendedDescription: null,
          type: 'consumable',
          hidden: false,
          value: 30,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

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
      (mockGameStateManager.getInventory as jest.Mock).mockReturnValue([1, 2]);
      
      (mockTargetDisambiguationService.parseCommand as jest.Mock).mockResolvedValue({
        success: false,
        failureContext: {
          rawInput: 'drop potion',
          attemptedParsers: ['natural'],
          partialMatches: [
            {
              parser: 'natural',
              confidence: 0.6,
              issue: 'Multiple matches found',
            },
          ],
          roomContext: {
            items: [],
            characters: [],
            exits: [],
          },
          suggestedInterpretations: ['red potion', 'blue potion'],
        },
      });

      const result = await commandRouter.processCommand('drop potion');

      expect(result.message).toContain('Multiple matches');
      expect(mockPrismaService.client.item.update).not.toHaveBeenCalled();
    });
  });
});