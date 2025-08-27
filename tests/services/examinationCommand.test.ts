import { CommandRouter } from '../../src/services/commandRouter';
import { GameStateManager } from '../../src/services/gameStateManager';
import { PrismaService } from '../../src/services/prismaService';
import { Item, Room, Character } from '@prisma/client';

describe('Examination Command', () => {
  let commandRouter: CommandRouter;
  let mockGameStateManager: jest.Mocked<GameStateManager>;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(() => {
    // Mock PrismaService
    mockPrismaService = {
      client: {
        item: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
        },
        character: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
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
      getCurrentRoomInfo: jest.fn(),
      getInventory: jest.fn().mockReturnValue([]),
    } as any;

    // Create CommandRouter with mocked dependencies
    commandRouter = new CommandRouter(mockGameStateManager, mockPrismaService);
  });

  describe('Basic "look" command', () => {
    it('should show room description for simple "look"', async () => {
      const mockRoom: Room = {
        id: 100,
        gameId: 1,
        regionId: 1,
        name: 'Ancient Library',
        description: 'Dusty tomes line the walls of this forgotten library.',
        extendedDescription: 'The air is thick with the scent of old parchment.',
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockGameStateManager.getCurrentRoomInfo as jest.Mock).mockResolvedValue(
        `**Ancient Library**\n\nDusty tomes line the walls of this forgotten library.\n\nThe air is thick with the scent of old parchment.\n\n→ Available exits: north, east`
      );
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

      const result = await commandRouter.processCommand('look');
      
      expect(result.message).toContain('Ancient Library');
      expect(result.message).toContain('Dusty tomes');
      expect(result.message).toContain('Available exits');
    });

    it('should recognize "l" as look alias', async () => {
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
      (mockGameStateManager.getCurrentRoomInfo as jest.Mock).mockResolvedValue(
        `**Test Room**\n\nA test room\n\n→ Available exits: south`
      );
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

      const result = await commandRouter.processCommand('l');
      
      expect(result.message).toContain('Test Room');
    });
  });

  describe('Examine specific items', () => {
    it('should examine an item in the room', async () => {
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

      const mockItem: Item = {
        id: 1,
        gameId: 1,
        roomId: 100,
        name: 'golden sword',
        description: 'A gleaming blade of exceptional craftsmanship.',
        extendedDescription: 'Ancient runes are etched along the fuller, glowing with a faint blue light.',
        type: 'weapon',
        hidden: false,
        value: 500,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([mockItem]);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

      const result = await commandRouter.processCommand('examine golden sword');
      
      // All commands currently return success in the response
      expect(result.message).toContain('A gleaming blade');
      expect(result.message).toContain('Ancient runes');
    });

    it('should examine an item in inventory', async () => {
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

      const mockItem: Item = {
        id: 2,
        gameId: 1,
        roomId: null, // In inventory
        name: 'mysterious amulet',
        description: 'A strange amulet that feels warm to the touch.',
        extendedDescription: 'The centerpiece is a red gem that pulses with an inner light.',
        type: 'artifact',
        hidden: false,
        value: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockGameStateManager.getInventory as jest.Mock).mockReturnValue([2]);
      (mockPrismaService.client.item.findMany as jest.Mock).mockImplementation((query) => {
        if (query?.where?.roomId === 100) {
          return Promise.resolve([]);
        }
        if (query?.where?.id?.in?.includes(2)) {
          return Promise.resolve([mockItem]);
        }
        return Promise.resolve([]);
      });
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

      const result = await commandRouter.processCommand('look at mysterious amulet');
      
      // All commands currently return success in the response
      expect(result.message).toContain('A strange amulet');
      expect(result.message).toContain('red gem that pulses');
    });

    it('should handle partial item name matches', async () => {
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

      const mockItem: Item = {
        id: 1,
        gameId: 1,
        roomId: 100,
        name: 'ancient tome of knowledge',
        description: 'A leather-bound book filled with arcane wisdom.',
        extendedDescription: null,
        type: 'book',
        hidden: false,
        value: 200,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([mockItem]);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

      // Try with partial name
      const result = await commandRouter.processCommand('examine tome');
      
      // All commands currently return success in the response
      expect(result.message).toContain('leather-bound book');
    });
  });

  describe('Examine characters', () => {
    it('should examine a character in the room', async () => {
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

      const mockCharacter: Character = {
        id: 1,
        gameId: 1,
        roomId: 100,
        name: 'Elder Sage',
        description: 'A wise old man with a long grey beard.',
        sentiment: 'friendly',
        health: 100,
        maxHealth: 100,
        attack: 5,
        defense: 10,
        alive: true,
        dialogueFriendly: 'Greetings, traveler.',
        dialogueHostile: null,
        dialogueDefeated: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([mockCharacter]);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

      const result = await commandRouter.processCommand('examine elder sage');
      
      // All commands currently return success in the response
      expect(result.message).toContain('wise old man');
      expect(result.message.toLowerCase()).toContain('friendly');
    });

    it('should handle hostile character examination', async () => {
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

      const mockCharacter: Character = {
        id: 2,
        gameId: 1,
        roomId: 100,
        name: 'Goblin Warrior',
        description: 'A menacing goblin brandishing a rusty sword.',
        sentiment: 'hostile',
        health: 50,
        maxHealth: 50,
        attack: 15,
        defense: 5,
        alive: true,
        dialogueFriendly: null,
        dialogueHostile: 'Die!',
        dialogueDefeated: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([mockCharacter]);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

      const result = await commandRouter.processCommand('look at goblin');
      
      // All commands currently return success in the response
      expect(result.message).toContain('menacing goblin');
      // Should include health status for hostile creatures  
      expect(result.message.toLowerCase()).toContain('health');
      expect(result.message.toLowerCase()).toContain('hostile');
    });
  });

  describe('Error handling', () => {
    it('should handle examining non-existent items', async () => {
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
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

      const result = await commandRouter.processCommand('examine magical staff');
      
      // All commands currently return success in the response
      expect(result.message.toLowerCase()).toContain('nothing');
    });

    it('should handle ambiguous targets', async () => {
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
          name: 'red potion',
          description: 'A red healing potion.',
          extendedDescription: null,
          type: 'consumable',
          hidden: false,
          value: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          gameId: 1,
          roomId: 100,
          name: 'red gem',
          description: 'A sparkling red gemstone.',
          extendedDescription: null,
          type: 'treasure',
          hidden: false,
          value: 200,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue(mockItems);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

      const result = await commandRouter.processCommand('examine red');
      
      // All commands currently return success in the response
      expect(result.message.toLowerCase()).toContain('which');
    });
  });

  describe('Command aliases', () => {
    it('should recognize "x" as examine alias', async () => {
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

      const mockItem: Item = {
        id: 1,
        gameId: 1,
        roomId: 100,
        name: 'crystal orb',
        description: 'A perfectly spherical crystal that glows softly.',
        extendedDescription: null,
        type: 'artifact',
        hidden: false,
        value: 300,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([mockItem]);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

      const result = await commandRouter.processCommand('x orb');
      
      // All commands currently return success in the response
      expect(result.message).toContain('perfectly spherical crystal');
    });

    it('should handle "look at" syntax', async () => {
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

      const mockItem: Item = {
        id: 1,
        gameId: 1,
        roomId: 100,
        name: 'wooden chest',
        description: 'A sturdy wooden chest with iron reinforcements.',
        extendedDescription: null,
        type: 'container',
        hidden: false,
        value: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([mockItem]);
      (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

      const result = await commandRouter.processCommand('look at chest');
      
      // All commands currently return success in the response
      expect(result.message).toContain('sturdy wooden chest');
    });
  });
});