import { CommandRouter } from '../../src/services/commandRouter';
import { GameStateManager } from '../../src/services/gameStateManager';
import { PrismaService } from '../../src/services/prismaService';
import { Item, Room } from '@prisma/client';

describe('Inventory Command', () => {
  let commandRouter: CommandRouter;
  let mockGameStateManager: jest.Mocked<GameStateManager>;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(() => {
    // Mock PrismaService
    mockPrismaService = {
      client: {
        item: {
          findMany: jest.fn(),
        },
        connection: {
          findMany: jest.fn(),
        },
      },
    } as any;

    // Mock GameStateManager
    mockGameStateManager = {
      hasActiveSession: jest.fn().mockReturnValue(true),
      getCurrentRoom: jest.fn(),
      getInventory: jest.fn(),
      getInventoryCount: jest.fn(),
    } as any;

    // Create CommandRouter with mocked dependencies
    commandRouter = new CommandRouter(mockGameStateManager, mockPrismaService);
  });

  describe('Command Recognition', () => {
    it('should recognize "inventory" command', async () => {
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
      (mockGameStateManager.getInventory as jest.Mock).mockReturnValue([]);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);

      const result = await commandRouter.processCommand('inventory');
      
      expect(result.message).toBeDefined();
      expect(mockGameStateManager.getInventory).toHaveBeenCalled();
    });

    it('should recognize "i" as inventory alias', async () => {
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
      (mockGameStateManager.getInventory as jest.Mock).mockReturnValue([]);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);

      const result = await commandRouter.processCommand('i');
      
      expect(result.message).toBeDefined();
      expect(mockGameStateManager.getInventory).toHaveBeenCalled();
    });

    it('should recognize "inv" as inventory alias', async () => {
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
      (mockGameStateManager.getInventory as jest.Mock).mockReturnValue([]);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);

      const result = await commandRouter.processCommand('inv');
      
      expect(result.message).toBeDefined();
      expect(mockGameStateManager.getInventory).toHaveBeenCalled();
    });
  });

  describe('Empty Inventory', () => {
    it('should show appropriate message for empty inventory', async () => {
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
      (mockGameStateManager.getInventory as jest.Mock).mockReturnValue([]);
      (mockGameStateManager.getInventoryCount as jest.Mock).mockReturnValue(0);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);

      const result = await commandRouter.processCommand('inventory');
      
      expect(result.message).toContain('not carrying anything');
    });
  });

  describe('Inventory with Items', () => {
    it('should list all items in inventory', async () => {
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
      
      const mockItems: Item[] = [
        {
          id: 1,
          gameId: 1,
          roomId: null,
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
          roomId: null,
          name: 'health potion',
          description: 'Restores health',
          extendedDescription: null,
          type: 'consumable',
          hidden: false,
          value: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockGameStateManager.getInventory as jest.Mock).mockReturnValue([1, 2]);
      (mockGameStateManager.getInventoryCount as jest.Mock).mockReturnValue(2);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue(mockItems);

      const result = await commandRouter.processCommand('inventory');
      
      expect(result.message).toContain('Inventory (2/10)');
      expect(result.message).toContain('golden sword');
      expect(result.message).toContain('health potion');
    });

    it('should show item count and capacity', async () => {
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
      ];

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockGameStateManager.getInventory as jest.Mock).mockReturnValue([1]);
      (mockGameStateManager.getInventoryCount as jest.Mock).mockReturnValue(1);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue(mockItems);

      const result = await commandRouter.processCommand('inventory');
      
      expect(result.message).toContain('1/10');
    });

    it('should handle full inventory display', async () => {
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
      
      // Create 10 items for a full inventory
      const mockItems: Item[] = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        gameId: 1,
        roomId: null,
        name: `item ${i + 1}`,
        description: `Description ${i + 1}`,
        extendedDescription: null,
        type: 'misc',
        hidden: false,
        value: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockGameStateManager.getInventory as jest.Mock).mockReturnValue([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      (mockGameStateManager.getInventoryCount as jest.Mock).mockReturnValue(10);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue(mockItems);

      const result = await commandRouter.processCommand('inventory');
      
      expect(result.message).toContain('10/10');
      expect(result.message).toContain('full');
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
      (mockGameStateManager.getInventory as jest.Mock).mockReturnValue([1, 2]);
      (mockGameStateManager.getInventoryCount as jest.Mock).mockReturnValue(2);
      (mockPrismaService.client.item.findMany as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await commandRouter.processCommand('inventory');
      
      expect(result.message.toLowerCase()).toContain('error');
    });

    it('should handle missing items gracefully', async () => {
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

      // Inventory has item IDs but database returns empty
      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockGameStateManager.getInventory as jest.Mock).mockReturnValue([1, 2]);
      (mockGameStateManager.getInventoryCount as jest.Mock).mockReturnValue(2);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);

      const result = await commandRouter.processCommand('inventory');
      
      // Should handle gracefully, perhaps showing unknown items or a special message
      expect(result.message).toBeDefined();
    });
  });

  describe('Formatting', () => {
    it('should use proper article (a/an) for items', async () => {
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
      
      const mockItems: Item[] = [
        {
          id: 1,
          gameId: 1,
          roomId: null,
          name: 'apple',
          description: 'A fruit',
          extendedDescription: null,
          type: 'food',
          hidden: false,
          value: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          gameId: 1,
          roomId: null,
          name: 'sword',
          description: 'A weapon',
          extendedDescription: null,
          type: 'weapon',
          hidden: false,
          value: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockGameStateManager.getInventory as jest.Mock).mockReturnValue([1, 2]);
      (mockGameStateManager.getInventoryCount as jest.Mock).mockReturnValue(2);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue(mockItems);

      const result = await commandRouter.processCommand('inventory');
      
      expect(result.message).toContain('an apple');
      expect(result.message).toContain('a sword');
    });

    it('should group items by type if many items', async () => {
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
          value: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          gameId: 1,
          roomId: null,
          name: 'dagger',
          description: 'A small blade',
          extendedDescription: null,
          type: 'weapon',
          hidden: false,
          value: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          gameId: 1,
          roomId: null,
          name: 'health potion',
          description: 'Restores health',
          extendedDescription: null,
          type: 'consumable',
          hidden: false,
          value: 25,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 4,
          gameId: 1,
          roomId: null,
          name: 'mana potion',
          description: 'Restores mana',
          extendedDescription: null,
          type: 'consumable',
          hidden: false,
          value: 30,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 5,
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
        },
      ];

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockGameStateManager.getInventory as jest.Mock).mockReturnValue([1, 2, 3, 4, 5]);
      (mockGameStateManager.getInventoryCount as jest.Mock).mockReturnValue(5);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue(mockItems);

      const result = await commandRouter.processCommand('inventory');
      
      // Check that items are somehow organized (by type or alphabetically)
      expect(result.message).toContain('sword');
      expect(result.message).toContain('dagger');
      expect(result.message).toContain('health potion');
      expect(result.message).toContain('mana potion');
      expect(result.message).toContain('golden key');
    });
  });
});