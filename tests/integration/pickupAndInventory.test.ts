import { CommandRouter } from '../../src/services/commandRouter';
import { GameStateManager } from '../../src/services/gameStateManager';
import { PrismaService } from '../../src/services/prismaService';
import { TargetDisambiguationService } from '../../src/services/targetDisambiguationService';
import { Item, Room, Connection } from '@prisma/client';

describe('Pickup and Inventory Integration', () => {
  let commandRouter: CommandRouter;
  let gameStateManager: GameStateManager;
  let prismaService: PrismaService;

  beforeEach(() => {
    // Create real instances (not mocks) for integration testing
    prismaService = {
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

    gameStateManager = new GameStateManager(prismaService);
    
    // Mock the internal state
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
    
    // Initialize game state
    (gameStateManager as any).currentSession = {
      gameId: 1,
      currentRoomId: 100,
      currentRoom: mockRoom,
      lastSaved: new Date(),
      sessionStartTime: new Date(),
      movementHistory: [],
      inventory: [],
    };

    commandRouter = new CommandRouter(gameStateManager, prismaService);
  });

  describe('Complete Pickup and Inventory Flow', () => {
    it('should pick up an item and see it in inventory', async () => {
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

      // Setup initial room state with item
      (prismaService.client.item.findMany as jest.Mock).mockImplementation((query) => {
        if (query?.where?.roomId === 100) {
          return Promise.resolve([mockItem]);
        }
        if (query?.where?.id?.in?.includes(1)) {
          return Promise.resolve([{ ...mockItem, roomId: null }]);
        }
        return Promise.resolve([]);
      });
      
      (prismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.client.item.update as jest.Mock).mockImplementation(() => 
        Promise.resolve({ ...mockItem, roomId: null })
      );

      // Step 1: Check initial inventory (should be empty)
      let result = await commandRouter.processCommand('inventory');
      expect(result.message).toContain('not carrying anything');

      // Step 2: Pick up the sword
      result = await commandRouter.processCommand('take golden sword');
      expect(result.message).toContain('You pick up the golden sword');
      expect(gameStateManager.getInventoryCount()).toBe(1);

      // Step 3: Check inventory again (should contain sword)
      result = await commandRouter.processCommand('inventory');
      expect(result.message).toContain('Inventory (1/10)');
      expect(result.message).toContain('golden sword');
      expect(result.message).toContain('Weapons');
    });

    it('should handle picking up multiple items and checking inventory', async () => {
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
          id: 3,
          gameId: 1,
          roomId: 100,
          name: 'key',
          description: 'Opens doors',
          extendedDescription: null,
          type: 'key',
          hidden: false,
          value: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Setup room with multiple items
      (prismaService.client.item.findMany as jest.Mock).mockImplementation((query) => {
        if (query?.where?.roomId === 100) {
          // Filter out items that have been picked up
          const inventory = gameStateManager.getInventory();
          return Promise.resolve(mockItems.filter(item => !inventory.includes(item.id)));
        }
        if (query?.where?.id?.in) {
          // Return items in inventory
          const requestedIds = query.where.id.in;
          return Promise.resolve(
            mockItems
              .filter(item => requestedIds.includes(item.id))
              .map(item => ({ ...item, roomId: null }))
          );
        }
        return Promise.resolve([]);
      });
      
      (prismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.client.item.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      // Pick up all items
      const result = await commandRouter.processCommand('take all');
      expect(result.message).toContain('You pick up everything in the room');
      expect(gameStateManager.getInventoryCount()).toBe(3);

      // Check inventory
      const invResult = await commandRouter.processCommand('i');
      expect(invResult.message).toContain('Inventory (3/10)');
      expect(invResult.message).toContain('Weapons');
      expect(invResult.message).toContain('sword');
      expect(invResult.message).toContain('Consumables');
      expect(invResult.message).toContain('health potion');
      expect(invResult.message).toContain('Keys');
      expect(invResult.message).toContain('key');
    });

    it('should show proper messages for inventory capacity', async () => {
      // Fill inventory to near capacity (9 items)
      const inventory = gameStateManager as any;
      inventory.currentSession.inventory = [1, 2, 3, 4, 5, 6, 7, 8, 9];

      const mockItems = Array.from({ length: 9 }, (_, i) => ({
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

      (prismaService.client.item.findMany as jest.Mock).mockResolvedValue(mockItems);

      let result = await commandRouter.processCommand('inventory');
      expect(result.message).toContain('9/10');
      expect(result.message).toContain('almost full');

      // Add one more item to reach full capacity
      inventory.currentSession.inventory.push(10);
      
      const fullItems = [...mockItems, {
        id: 10,
        gameId: 1,
        roomId: null,
        name: 'item 10',
        description: 'Description 10',
        extendedDescription: null,
        type: 'misc',
        hidden: false,
        value: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      }];

      (prismaService.client.item.findMany as jest.Mock).mockResolvedValue(fullItems);

      result = await commandRouter.processCommand('inventory');
      expect(result.message).toContain('10/10');
      expect(result.message).toContain('completely full');
    });
  });

  describe('Edge Cases', () => {
    it('should handle inventory command with no active session', async () => {
      // Clear the session
      (gameStateManager as any).currentSession = null;

      const result = await commandRouter.processCommand('inventory');
      expect(result.message).toContain('not carrying anything');
    });

    it('should handle picking up items with special names', async () => {
      const mockItem: Item = {
        id: 1,
        gameId: 1,
        roomId: 100,
        name: 'ancient artifact of power',
        description: 'Glows with mysterious energy',
        extendedDescription: null,
        type: 'artifact',
        hidden: false,
        value: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService.client.item.findMany as jest.Mock).mockImplementation((query) => {
        if (query?.where?.roomId === 100) {
          return Promise.resolve([mockItem]);
        }
        if (query?.where?.id?.in?.includes(1)) {
          return Promise.resolve([{ ...mockItem, roomId: null }]);
        }
        return Promise.resolve([]);
      });
      
      (prismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.client.item.update as jest.Mock).mockResolvedValue({ 
        ...mockItem, 
        roomId: null 
      });

      // Pick up with partial name
      const result = await commandRouter.processCommand('take ancient');
      expect(result.message).toContain('You pick up the ancient artifact of power');
      
      // Check it's in inventory
      const invResult = await commandRouter.processCommand('inventory');
      expect(invResult.message).toContain('ancient artifact of power');
    });
  });
});