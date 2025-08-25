import { CommandRouter } from '../../src/services/commandRouter';
import { GameStateManager } from '../../src/services/gameStateManager';
import { PrismaService } from '../../src/services/prismaService';
import { Room } from '@prisma/client';

// Mock dependencies
jest.mock('../../src/services/gameStateManager');
jest.mock('../../src/services/prismaService');

describe('CommandRouter', () => {
  let commandRouter: CommandRouter;
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
        },
        room: {
          findUnique: jest.fn(),
          findMany: jest.fn(),
        },
      },
      disconnect: jest.fn(),
    } as any;

    commandRouter = new CommandRouter(mockGameStateManager, mockPrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Command Registration', () => {
    describe('addMenuCommand', () => {
      it('should register menu commands correctly', () => {
        const handler = jest.fn();
        
        commandRouter.addMenuCommand({
          name: 'test-menu',
          description: 'Test menu command',
          handler
        });

        const commands = commandRouter.getMenuCommands();
        expect(commands).toHaveLength(1);
        expect(commands[0].name).toBe('test-menu');
        expect(commands[0].description).toBe('Test menu command');
      });

      it('should prevent duplicate menu command registration', () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();
        
        commandRouter.addMenuCommand({
          name: 'duplicate',
          description: 'First command',
          handler: handler1
        });

        expect(() => {
          commandRouter.addMenuCommand({
            name: 'duplicate',
            description: 'Second command',
            handler: handler2
          });
        }).toThrow('Menu command "duplicate" already exists');
      });
    });

    describe('addGameCommand', () => {
      it('should register game commands correctly', () => {
        const handler = jest.fn();
        
        commandRouter.addGameCommand({
          name: 'test-game',
          description: 'Test game command',
          handler
        });

        const commands = commandRouter.getGameCommands();
        expect(commands).toHaveLength(1);
        expect(commands[0].name).toBe('test-game');
        expect(commands[0].description).toBe('Test game command');
      });

      it('should prevent duplicate game command registration', () => {
        const handler1 = jest.fn();
        const handler2 = jest.fn();
        
        commandRouter.addGameCommand({
          name: 'duplicate',
          description: 'First command',
          handler: handler1
        });

        expect(() => {
          commandRouter.addGameCommand({
            name: 'duplicate',
            description: 'Second command',
            handler: handler2
          });
        }).toThrow('Game command "duplicate" already exists');
      });
    });
  });

  describe('Natural Language Command Processing', () => {
    describe('parseCommand', () => {
      it('should parse simple movement commands', () => {
        const result = commandRouter.parseCommand('go north');
        
        expect(result).toEqual({
          type: 'movement',
          action: 'go',
          direction: 'north',
          raw: 'go north',
          confidence: expect.any(Number)
        });
      });

      it('should parse directional shortcuts', () => {
        const result = commandRouter.parseCommand('n');
        
        expect(result).toEqual({
          type: 'movement',
          action: 'go',
          direction: 'north',
          raw: 'n',
          confidence: expect.any(Number)
        });
      });

      it('should parse complex movement commands', () => {
        const result = commandRouter.parseCommand('enter the grand library');
        
        expect(result).toEqual({
          type: 'movement',
          action: 'enter',
          direction: 'north',
          target: 'grand library',
          raw: 'enter the grand library',
          confidence: expect.any(Number)
        });
      });

      it('should parse examination commands', () => {
        const result = commandRouter.parseCommand('look at the ancient sword');
        
        expect(result).toEqual({
          type: 'examination',
          action: 'look',
          target: 'ancient sword',
          raw: 'look at the ancient sword',
          confidence: expect.any(Number)
        });
      });

      it('should parse simple look commands', () => {
        const result = commandRouter.parseCommand('look');
        
        expect(result).toEqual({
          type: 'examination',
          action: 'look',
          raw: 'look',
          confidence: expect.any(Number)
        });
      });

      it('should handle unknown commands', () => {
        const result = commandRouter.parseCommand('xyzzy abracadabra');
        
        expect(result).toEqual({
          type: 'unknown',
          raw: 'xyzzy abracadabra',
          confidence: 0
        });
      });

      it('should normalize command case and spacing', () => {
        const result = commandRouter.parseCommand('  GO    NORTH  ');
        
        expect(result).toEqual({
          type: 'movement',
          action: 'go',
          direction: 'north',
          raw: '  GO    NORTH  ',
          confidence: expect.any(Number)
        });
      });
    });

    describe('validateCommand', () => {
      beforeEach(() => {
        const mockRoom: Room = {
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

        (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
        (mockGameStateManager.hasActiveSession as jest.Mock).mockReturnValue(true);
      });

      it('should validate movement commands with available exits', async () => {
        const mockConnections = [
          { fromRoomId: 123, toRoomId: 456, direction: 'north', connectionType: 'door' }
        ];
        
        (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue(mockConnections);

        const parsedCommand = {
          type: 'movement' as const,
          action: 'go',
          direction: 'north',
          raw: 'go north',
          confidence: 0.9
        };

        const result = await commandRouter.validateCommand(parsedCommand);
        
        expect(result.isValid).toBe(true);
        expect(result.availableExits).toEqual(['north']);
      });

      it('should reject movement commands without available exits', async () => {
        const mockConnections = [
          { fromRoomId: 123, toRoomId: 456, direction: 'south', connectionType: 'door' }
        ];
        
        (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue(mockConnections);

        const parsedCommand = {
          type: 'movement' as const,
          action: 'go',
          direction: 'north',
          raw: 'go north',
          confidence: 0.9
        };

        const result = await commandRouter.validateCommand(parsedCommand);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('No exit available to the north');
        expect(result.availableExits).toEqual(['south']);
      });

      it('should validate examination commands', async () => {
        const parsedCommand = {
          type: 'examination' as const,
          action: 'look',
          raw: 'look',
          confidence: 0.9
        };

        const result = await commandRouter.validateCommand(parsedCommand);
        
        expect(result.isValid).toBe(true);
      });

      it('should reject commands without active session', async () => {
        (mockGameStateManager.hasActiveSession as jest.Mock).mockReturnValue(false);

        const parsedCommand = {
          type: 'movement' as const,
          action: 'go',
          direction: 'north',
          raw: 'go north',
          confidence: 0.9
        };

        const result = await commandRouter.validateCommand(parsedCommand);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('No active game session');
      });
    });
  });

  describe('Command Execution Pipeline', () => {
    describe('executeCommand', () => {
      beforeEach(() => {
        const mockRoom: Room = {
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

        (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
        (mockGameStateManager.hasActiveSession as jest.Mock).mockReturnValue(true);
      });

      it('should execute valid movement commands', async () => {
        const mockTargetRoom: Room = {
          id: 456,
          gameId: 1,
          regionId: 1,
          name: 'North Room',
          description: 'A room to the north',
          extendedDescription: null,
          visited: false,
          locked: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockConnections = [
          { fromRoomId: 123, toRoomId: 456, direction: 'north', connectionType: 'door' }
        ];
        
        (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue(mockConnections);
        (mockGameStateManager.setCurrentRoom as jest.Mock).mockResolvedValue(mockTargetRoom);

        const result = await commandRouter.executeCommand('go north');
        
        expect(result.success).toBe(true);
        expect(result.response).toContain('North Room');
        expect(result.response).toContain('A room to the north');
        expect(mockGameStateManager.setCurrentRoom).toHaveBeenCalledWith(456);
      });

      it('should execute look commands', async () => {
        const result = await commandRouter.executeCommand('look');
        
        expect(result.success).toBe(true);
        expect(result.response).toContain('Test Room');
        expect(result.response).toContain('A test room');
      });

      it('should handle invalid commands gracefully', async () => {
        // Mock empty connections for this test (no available exits)
        (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

        const result = await commandRouter.executeCommand('go north');
        
        expect(result.success).toBe(false);
        expect(result.response).toContain('No exit available');
      });

      it('should handle database errors during movement', async () => {
        const mockConnections = [
          { fromRoomId: 123, toRoomId: 456, direction: 'north', connectionType: 'door' }
        ];
        
        (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue(mockConnections);
        (mockGameStateManager.setCurrentRoom as jest.Mock).mockRejectedValue(new Error('Database error'));

        const result = await commandRouter.executeCommand('go north');
        
        expect(result.success).toBe(false);
        expect(result.response).toContain('Unable to move north');
      });
    });
  });

  describe('Response Generation and Formatting', () => {
    describe('formatRoomDescription', () => {
      it('should format room descriptions with exits', async () => {
        const mockRoom: Room = {
          id: 123,
          gameId: 1,
          regionId: 1,
          name: 'Grand Hall',
          description: 'A magnificent hall with vaulted ceilings',
          extendedDescription: 'Sunlight streams through tall windows',
          visited: true,
          locked: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockConnections = [
          { fromRoomId: 123, toRoomId: 456, direction: 'north', connectionType: 'door' },
          { fromRoomId: 123, toRoomId: 789, direction: 'east', connectionType: 'archway' }
        ];

        (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue(mockConnections);

        const result = await commandRouter.formatRoomDescription(mockRoom);
        
        expect(result).toContain('Grand Hall');
        expect(result).toContain('A magnificent hall with vaulted ceilings');
        expect(result).toContain('Sunlight streams through tall windows');
        expect(result).toContain('north');
        expect(result).toContain('east');
      });

      it('should format room descriptions without extended description', async () => {
        const mockRoom: Room = {
          id: 123,
          gameId: 1,
          regionId: 1,
          name: 'Simple Room',
          description: 'A simple room',
          extendedDescription: null,
          visited: true,
          locked: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        (mockPrismaService.client.connection.findMany as jest.Mock).mockResolvedValue([]);

        const result = await commandRouter.formatRoomDescription(mockRoom);
        
        expect(result).toContain('Simple Room');
        expect(result).toContain('A simple room');
        expect(result).not.toContain('null');
        expect(result).toContain('no obvious exits');
      });
    });

    describe('formatErrorResponse', () => {
      it('should format error responses with suggestions', () => {
        const result = commandRouter.formatErrorResponse(
          'No exit available to the north', 
          ['south', 'east']
        );
        
        expect(result).toContain('No exit available to the north');
        expect(result).toContain('Available exits: south, east');
      });

      it('should format error responses without suggestions', () => {
        const result = commandRouter.formatErrorResponse('Unknown command');
        
        expect(result).toContain('Unknown command');
        expect(result).not.toContain('Available');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed input gracefully', async () => {
      const result = await commandRouter.executeCommand('');
      
      expect(result.success).toBe(false);
      expect(result.response).toContain('Please enter a command');
    });

    it('should handle null input', async () => {
      const result = await commandRouter.executeCommand(null as any);
      
      expect(result.success).toBe(false);
      expect(result.response).toContain('Please enter a command');
    });

    it('should handle very long commands', async () => {
      const longCommand = 'go '.repeat(1000) + 'north';
      const result = await commandRouter.executeCommand(longCommand);
      
      expect(result.success).toBe(false);
      expect(result.response).toContain('Command too long');
    });

    it('should handle special characters safely', async () => {
      const result = await commandRouter.executeCommand('go <script>alert("xss")</script>');
      
      expect(result.success).toBe(false);
      expect(result.response).not.toContain('<script>');
    });
  });

  describe('Command History and Context', () => {
    it('should track command history', async () => {
      await commandRouter.executeCommand('look');
      await commandRouter.executeCommand('go north');
      await commandRouter.executeCommand('look');

      const history = commandRouter.getCommandHistory();
      
      expect(history).toHaveLength(3);
      expect(history[0]).toBe('look');
      expect(history[1]).toBe('go north');
      expect(history[2]).toBe('look');
    });

    it('should limit command history size', async () => {
      // Execute more commands than the history limit
      for (let i = 0; i < 150; i++) {
        await commandRouter.executeCommand(`command${i}`);
      }

      const history = commandRouter.getCommandHistory();
      
      expect(history.length).toBeLessThanOrEqual(100); // Assuming 100 is the limit
      expect(history[history.length - 1]).toBe('command149');
    });

    it('should provide command suggestions for typos', () => {
      const suggestions = commandRouter.getSuggestions('loo');
      
      expect(suggestions).toContain('look');
    });

    it('should provide direction suggestions', () => {
      const suggestions = commandRouter.getSuggestions('norht');
      
      expect(suggestions).toContain('north');
    });
  });
});