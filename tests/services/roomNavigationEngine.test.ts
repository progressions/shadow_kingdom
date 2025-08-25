import { RoomNavigationEngine } from '../../src/services/roomNavigationEngine';
import { GameStateManager } from '../../src/services/gameStateManager';
import { PrismaService } from '../../src/services/prismaService';
import { Room, Connection, Item, Character } from '@prisma/client';

// Mock dependencies
jest.mock('../../src/services/gameStateManager');
jest.mock('../../src/services/prismaService');

describe('RoomNavigationEngine', () => {
  let navigationEngine: RoomNavigationEngine;
  let mockGameStateManager: jest.Mocked<GameStateManager>;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(() => {
    // Setup mocks
    mockGameStateManager = {
      getCurrentRoom: jest.fn(),
      setCurrentRoom: jest.fn(),
      hasActiveSession: jest.fn(),
      getCurrentSession: jest.fn(),
    } as any;

    mockPrismaService = {
      client: {
        connection: {
          findMany: jest.fn(),
          findFirst: jest.fn(),
        },
        room: {
          findUnique: jest.fn(),
          findMany: jest.fn(),
        },
        item: {
          findMany: jest.fn(),
        },
        character: {
          findMany: jest.fn(),
        },
      },
      disconnect: jest.fn(),
    } as any;

    navigationEngine = new RoomNavigationEngine(mockGameStateManager, mockPrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Movement Validation', () => {
    let mockCurrentRoom: Room;

    beforeEach(() => {
      mockCurrentRoom = {
        id: 100,
        gameId: 1,
        regionId: 1,
        name: 'Central Hall',
        description: 'A grand central hall with high vaulted ceilings',
        extendedDescription: 'Sunlight streams through tall windows',
        visited: true,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockCurrentRoom);
      (mockGameStateManager.hasActiveSession as jest.Mock).mockReturnValue(true);
    });

    describe('validateMovement', () => {
      it('should validate movement to available direction', async () => {
        const mockConnections: Connection[] = [
          {
            id: 1,
            gameId: 1,
            fromRoomId: 100,
            toRoomId: 101,
            direction: 'north',
            description: 'through the ornate archway',
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
            description: 'through the wooden door',
            locked: false,
            requiredKey: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ];

        (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue(mockConnections);

        const result = await navigationEngine.validateMovement('north');

        expect(result.isValid).toBe(true);
        expect(result.targetRoomId).toBe(101);
        expect(result.connection).toEqual(mockConnections[0]);
        expect(result.availableDirections).toEqual(['north', 'east']);
      });

      it('should reject movement to unavailable direction', async () => {
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
          }
        ];

        (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue(mockConnections);

        const result = await navigationEngine.validateMovement('south');

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('No exit available to the south');
        expect(result.availableDirections).toEqual(['north']);
      });

      it('should reject movement through locked connection without key', async () => {
        const mockConnections: Connection[] = [
          {
            id: 1,
            gameId: 1,
            fromRoomId: 100,
            toRoomId: 101,
            direction: 'north',
            description: 'through the locked iron gate',
            locked: true,
            requiredKey: 'iron-gate-key',
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ];

        (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue(mockConnections);

        const result = await navigationEngine.validateMovement('north');

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('The path north is locked. You need an iron-gate-key to proceed.');
        expect(result.connection).toEqual(mockConnections[0]);
      });

      it('should allow movement through locked connection with key', async () => {
        const mockConnections: Connection[] = [
          {
            id: 1,
            gameId: 1,
            fromRoomId: 100,
            toRoomId: 101,
            direction: 'north',
            description: 'through the locked iron gate',
            locked: true,
            requiredKey: 'iron-gate-key',
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ];

        (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue(mockConnections);

        const result = await navigationEngine.validateMovement('north', ['iron-gate-key', 'other-key']);

        expect(result.isValid).toBe(true);
        expect(result.targetRoomId).toBe(101);
        expect(result.requiresKey).toBe(true);
        expect(result.keyUsed).toBe('iron-gate-key');
      });

      it('should reject movement to unfilled connections', async () => {
        const mockConnections: Connection[] = [
          {
            id: 1,
            gameId: 1,
            fromRoomId: 100,
            toRoomId: null, // Unfilled connection
            direction: 'north',
            description: null,
            locked: false,
            requiredKey: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ];

        (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue(mockConnections);

        const result = await navigationEngine.validateMovement('north');

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('The path north is under construction and cannot be used yet');
      });

      it('should reject movement when no active session', async () => {
        (mockGameStateManager.hasActiveSession as jest.Mock).mockReturnValue(false);

        const result = await navigationEngine.validateMovement('north');

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('No active game session');
      });
    });

    describe('getAvailableExits', () => {
      it('should return all available exits with descriptions', async () => {
        const mockConnections: Connection[] = [
          {
            id: 1,
            gameId: 1,
            fromRoomId: 100,
            toRoomId: 101,
            direction: 'north',
            description: 'through the ornate archway',
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
            description: null,
            locked: true,
            requiredKey: 'brass-key',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 3,
            gameId: 1,
            fromRoomId: 100,
            toRoomId: null, // Unfilled
            direction: 'south',
            description: null,
            locked: false,
            requiredKey: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ];

        (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue(mockConnections);

        const exits = await navigationEngine.getAvailableExits();

        expect(exits).toHaveLength(2); // Only filled connections
        expect(exits[0]).toEqual({
          direction: 'north',
          description: 'through the ornate archway',
          locked: false,
          requiresKey: null
        });
        expect(exits[1]).toEqual({
          direction: 'east',
          description: null,
          locked: true,
          requiresKey: 'brass-key'
        });
      });

      it('should return empty array when no exits available', async () => {
        (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

        const exits = await navigationEngine.getAvailableExits();

        expect(exits).toEqual([]);
      });
    });
  });

  describe('Room Transition Logic', () => {
    let mockCurrentRoom: Room;
    let mockTargetRoom: Room;

    beforeEach(() => {
      mockCurrentRoom = {
        id: 100,
        gameId: 1,
        regionId: 1,
        name: 'Central Hall',
        description: 'A grand central hall',
        extendedDescription: null,
        visited: true,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTargetRoom = {
        id: 101,
        gameId: 1,
        regionId: 1,
        name: 'Northern Chamber',
        description: 'A smaller chamber to the north',
        extendedDescription: 'Ancient tapestries hang on the walls',
        visited: false,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockCurrentRoom);
    });

    describe('performMovement', () => {
      it('should successfully move to valid room', async () => {
        const mockConnection: Connection = {
          id: 1,
          gameId: 1,
          fromRoomId: 100,
          toRoomId: 101,
          direction: 'north',
          description: 'through the archway',
          locked: false,
          requiredKey: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        (mockGameStateManager.setCurrentRoom as jest.Mock).mockResolvedValue(mockTargetRoom);

        const result = await navigationEngine.performMovement(mockConnection);

        expect(result.success).toBe(true);
        expect(result.newRoom).toEqual(mockTargetRoom);
        expect(result.movementDescription).toContain('You move north through the archway');
        expect(mockGameStateManager.setCurrentRoom).toHaveBeenCalledWith(101);
      });

      it('should generate appropriate movement description', async () => {
        const mockConnection: Connection = {
          id: 1,
          gameId: 1,
          fromRoomId: 100,
          toRoomId: 101,
          direction: 'up',
          description: 'up the spiral staircase',
          locked: false,
          requiredKey: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        (mockGameStateManager.setCurrentRoom as jest.Mock).mockResolvedValue(mockTargetRoom);

        const result = await navigationEngine.performMovement(mockConnection);

        expect(result.success).toBe(true);
        expect(result.movementDescription).toContain('You climb up the spiral staircase');
      });

      it('should handle database errors during movement', async () => {
        const mockConnection: Connection = {
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
        };

        (mockGameStateManager.setCurrentRoom as jest.Mock).mockRejectedValue(new Error('Database error'));

        const result = await navigationEngine.performMovement(mockConnection);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Failed to move north: Database error');
      });
    });
  });

  describe('Room Context and Description', () => {
    let mockRoom: Room;

    beforeEach(() => {
      mockRoom = {
        id: 100,
        gameId: 1,
        regionId: 1,
        name: 'Treasure Chamber',
        description: 'A glittering chamber filled with treasures',
        extendedDescription: 'Gold coins catch the light from crystalline formations on the ceiling',
        visited: true,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    describe('generateRoomDescription', () => {
      it('should generate complete room description with items and characters', async () => {
        const mockItems: Item[] = [
          {
            id: 1,
            gameId: 1,
            roomId: 100,
            name: 'Golden Sword',
            description: 'A magnificent sword with a golden hilt',
            extendedDescription: 'Intricate runes are carved along the blade',
            type: 'weapon',
            hidden: false,
            value: 500,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 2,
            gameId: 1,
            roomId: 100,
            name: 'Health Potion',
            description: 'A small bottle of red liquid',
            extendedDescription: null,
            type: 'consumable',
            hidden: true, // Should not appear
            value: 25,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ];

        const mockCharacters: Character[] = [
          {
            id: 1,
            gameId: 1,
            roomId: 100,
            name: 'Ancient Guardian',
            description: 'A stone guardian that watches over the treasure',
            sentiment: 'neutral',
            health: 100,
            maxHealth: 100,
            attack: 15,
            defense: 10,
            alive: true,
            dialogueFriendly: 'The guardian nods silently',
            dialogueHostile: 'The guardian\'s eyes glow menacingly',
            dialogueDefeated: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ];

        const mockConnections: Connection[] = [
          {
            id: 1,
            gameId: 1,
            fromRoomId: 100,
            toRoomId: 99,
            direction: 'south',
            description: 'back through the entrance',
            locked: false,
            requiredKey: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ];

        (mockPrismaService.client.item.findMany as jest.Mock).mockImplementation((options) => {
          // Filter out hidden items when called with hidden: false
          if (options?.where?.hidden === false) {
            return Promise.resolve(mockItems.filter(item => !item.hidden));
          }
          return Promise.resolve(mockItems);
        });
        (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue(mockCharacters);
        (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue(mockConnections);

        const description = await navigationEngine.generateRoomDescription(mockRoom);

        expect(description).toContain('**Treasure Chamber**');
        expect(description).toContain('A glittering chamber filled with treasures');
        expect(description).toContain('Gold coins catch the light from crystalline formations');
        expect(description).toContain('Golden Sword'); // Visible item
        expect(description).not.toContain('Health Potion'); // Hidden item
        expect(description).toContain('Ancient Guardian');
        expect(description).toContain('Exits: south');
      });

      it('should handle room with no items or characters', async () => {
        (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);
        (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
        (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

        const description = await navigationEngine.generateRoomDescription(mockRoom);

        expect(description).toContain('**Treasure Chamber**');
        expect(description).toContain('A glittering chamber filled with treasures');
        expect(description).not.toContain('Items:');
        expect(description).not.toContain('Characters:');
        expect(description).toContain('no obvious exits');
      });

      it('should handle first-time visit notification', async () => {
        const unvisitedRoom = { ...mockRoom, visited: false };

        (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);
        (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);
        (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

        const description = await navigationEngine.generateRoomDescription(unvisitedRoom);

        expect(description).toContain('**Treasure Chamber**');
        expect(description).toContain('*[First time visiting]*');
      });
    });

    describe('examineRoom', () => {
      it('should provide detailed examination of room elements', async () => {
        const mockItems: Item[] = [
          {
            id: 1,
            gameId: 1,
            roomId: 100,
            name: 'Ancient Tome',
            description: 'A leather-bound book',
            extendedDescription: 'The pages are filled with arcane symbols and mysterious diagrams',
            type: 'artifact',
            hidden: false,
            value: 100,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ];

        (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue(mockItems);
        (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);

        const examination = await navigationEngine.examineRoom(mockRoom, 'tome');

        expect(examination.found).toBe(true);
        expect(examination.description).toContain('Ancient Tome');
        expect(examination.description).toContain('The pages are filled with arcane symbols');
      });

      it('should handle examination of non-existent items', async () => {
        (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);
        (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);

        const examination = await navigationEngine.examineRoom(mockRoom, 'nonexistent');

        expect(examination.found).toBe(false);
        expect(examination.description).toContain('You don\'t see anything like that here');
      });

      it('should provide general room examination when no target specified', async () => {
        (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);
        (mockPrismaService.client.character.findMany as jest.Mock).mockResolvedValue([]);

        const examination = await navigationEngine.examineRoom(mockRoom);

        expect(examination.found).toBe(true);
        expect(examination.description).toContain('You look around the Treasure Chamber more carefully');
        expect(examination.description).toContain('Gold coins catch the light');
      });
    });
  });

  describe('World Integration', () => {
    describe('validateWorldConsistency', () => {
      it('should validate room belongs to current game', async () => {
        const mockSession = {
          gameId: 1,
          currentRoomId: 100,
          currentRoom: mockGameStateManager.getCurrentRoom(),
          lastSaved: new Date(),
          sessionStartTime: new Date(),
        };

        (mockGameStateManager.getCurrentSession as jest.Mock).mockReturnValue(mockSession);

        const validRoom: Room = {
          id: 101,
          gameId: 1, // Same game
          regionId: 1,
          name: 'Valid Room',
          description: 'A valid room',
          extendedDescription: null,
          visited: false,
          locked: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await navigationEngine.validateWorldConsistency(validRoom);

        expect(result.isValid).toBe(true);
      });

      it('should reject room from different game', async () => {
        const mockSession = {
          gameId: 1,
          currentRoomId: 100,
          currentRoom: mockGameStateManager.getCurrentRoom(),
          lastSaved: new Date(),
          sessionStartTime: new Date(),
        };

        (mockGameStateManager.getCurrentSession as jest.Mock).mockReturnValue(mockSession);

        const invalidRoom: Room = {
          id: 101,
          gameId: 2, // Different game
          regionId: 1,
          name: 'Invalid Room',
          description: 'A room from different game',
          extendedDescription: null,
          visited: false,
          locked: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await navigationEngine.validateWorldConsistency(invalidRoom);

        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Room belongs to a different game instance');
      });
    });

    describe('getRegionContext', () => {
      it('should provide region context for room navigation', async () => {
        const mockSession = {
          gameId: 1,
          currentRoomId: 100,
          currentRoom: mockGameStateManager.getCurrentRoom(),
          lastSaved: new Date(),
          sessionStartTime: new Date(),
        };

        const mockRegionRooms: Room[] = [
          {
            id: 100,
            gameId: 1,
            regionId: 5,
            name: 'Current Room',
            description: 'Current location',
            extendedDescription: null,
            visited: true,
            locked: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 101,
            gameId: 1,
            regionId: 5,
            name: 'Nearby Room',
            description: 'A nearby location',
            extendedDescription: null,
            visited: false,
            locked: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        ];

        (mockGameStateManager.getCurrentSession as jest.Mock).mockReturnValue(mockSession);
        (mockPrismaService.client.room.findMany as jest.Mock).mockResolvedValue(mockRegionRooms);

        const context = await navigationEngine.getRegionContext(5);

        expect(context.regionId).toBe(5);
        expect(context.totalRooms).toBe(2);
        expect(context.visitedRooms).toBe(1);
        expect(context.roomNames).toEqual(['Current Room', 'Nearby Room']);
      });
    });
  });

  describe('Interactive Elements and Advanced Examination', () => {
    let mockRoom: Room;
    let mockInteractiveItem: Item;

    beforeEach(() => {
      mockRoom = {
        id: 200,
        gameId: 1,
        regionId: 2,
        name: 'Library Study',
        description: 'A quiet study filled with ancient tomes',
        extendedDescription: 'Dust motes dance in shafts of sunlight',
        visited: true,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockInteractiveItem = {
        id: 10,
        gameId: 1,
        roomId: 200,
        name: 'Mysterious Lever',
        description: 'An ornate lever protruding from the wall',
        extendedDescription: 'The lever appears to be connected to some hidden mechanism. It looks like it could be pulled.',
        type: 'interactive',
        hidden: false,
        value: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    describe('interactWithRoomElement', () => {
      it('should handle lever pulling interaction', async () => {
        (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([mockInteractiveItem]);

        const result = await navigationEngine.interactWithRoomElement(mockRoom, 'pull', 'lever');

        expect(result.success).toBe(true);
        expect(result.description).toContain('You pull the Mysterious Lever');
        expect(result.elementName).toBe('Mysterious Lever');
        expect(result.actionTaken).toBe('pull');
      });

      it('should handle button pressing interaction', async () => {
        const mockButton: Item = {
          ...mockInteractiveItem,
          name: 'Stone Button',
          description: 'A large stone button set into the floor',
          extendedDescription: 'The button has ancient symbols carved around its edge'
        };

        (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([mockButton]);

        const result = await navigationEngine.interactWithRoomElement(mockRoom, 'press', 'button');

        expect(result.success).toBe(true);
        expect(result.description).toContain('You press the Stone Button');
        expect(result.actionTaken).toBe('press');
      });

      it('should handle invalid interactions gracefully', async () => {
        (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);

        const result = await navigationEngine.interactWithRoomElement(mockRoom, 'pull', 'nonexistent');

        expect(result.success).toBe(false);
        expect(result.description).toContain('don\'t see anything here that can be pulled');
      });

      it('should handle inappropriate action for element', async () => {
        (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([mockInteractiveItem]);

        const result = await navigationEngine.interactWithRoomElement(mockRoom, 'eat', 'lever');

        expect(result.success).toBe(false);
        expect(result.description).toContain('cannot eat');
      });
    });

    describe('getInteractiveElements', () => {
      it('should list all interactive elements in room', async () => {
        const mockElements: Item[] = [
          mockInteractiveItem,
          {
            ...mockInteractiveItem,
            id: 11,
            name: 'Ancient Scroll',
            description: 'A scroll covered in mystical text',
            type: 'readable'
          },
          {
            ...mockInteractiveItem,
            id: 12,
            name: 'Crystal Orb',
            description: 'A glowing crystal orb',
            type: 'magical'
          }
        ];

        (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue(mockElements);

        const elements = await navigationEngine.getInteractiveElements(mockRoom);

        expect(elements).toHaveLength(3);
        expect(elements[0]).toEqual({
          name: 'Mysterious Lever',
          type: 'interactive',
          description: 'An ornate lever protruding from the wall',
          suggestedActions: ['examine', 'pull']
        });
        expect(elements[1]).toEqual({
          name: 'Ancient Scroll',
          type: 'readable',
          description: 'A scroll covered in mystical text',
          suggestedActions: ['examine', 'read']
        });
        expect(elements[2]).toEqual({
          name: 'Crystal Orb',
          type: 'magical',
          description: 'A glowing crystal orb',
          suggestedActions: ['examine', 'touch']
        });
      });

      it('should return empty array when no interactive elements', async () => {
        (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);

        const elements = await navigationEngine.getInteractiveElements(mockRoom);

        expect(elements).toEqual([]);
      });
    });

    describe('handleComplexExamination', () => {
      it('should provide detailed examination with context clues', async () => {
        const mockDetailedItem: Item = {
          ...mockInteractiveItem,
          name: 'Ornate Door',
          description: 'A heavy wooden door with iron hinges',
          extendedDescription: 'The door bears the seal of the ancient kingdom. There are scratch marks around the lock, and you notice a small keyhole. The door handle appears to be slightly warm to the touch.'
        };

        (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([mockDetailedItem]);
        (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

        const result = await navigationEngine.handleComplexExamination(mockRoom, 'door');

        expect(result.success).toBe(true);
        expect(result.description).toContain('Ornate Door');
        expect(result.description).toContain('scratch marks around the lock');
        expect(result.clues).toBeDefined();
        expect(result.clues!.length).toBeGreaterThan(0);
      });

      it('should identify hidden elements through examination', async () => {
        const mockHiddenItem: Item = {
          ...mockInteractiveItem,
          name: 'Hidden Wall Compartment',
          description: 'A concealed compartment behind a loose stone',
          hidden: true,
          extendedDescription: 'The compartment contains a small silver key and some old parchments'
        };

        (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([mockHiddenItem]);
        (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

        const result = await navigationEngine.handleComplexExamination(mockRoom, 'wall');

        expect(result.success).toBe(true);
        expect(result.description).toContain('Hidden Wall Compartment');
        expect(result.discoveredHidden).toBe(true);
      });

      it('should provide contextual hints for puzzles', async () => {
        (mockPrismaService.client.item.findMany as jest.Mock).mockResolvedValue([]);
        (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

        const result = await navigationEngine.handleComplexExamination(mockRoom);

        expect(result.success).toBe(true);
        expect(result.description).toContain('look around');
        expect(result.hints).toBeDefined();
        expect(result.hints!.length).toBeGreaterThan(0);
      });
    });
  });
});