import { CommandRouter } from '../../src/services/commandRouter';
import { GameStateManager } from '../../src/services/gameStateManager';
import { PrismaService } from '../../src/services/prismaService';

jest.mock('../../src/services/targetDisambiguationService');

// Mock PrismaService getInstance
jest.mock('../../src/services/prismaService', () => {
  return {
    PrismaService: {
      getInstance: jest.fn()
    }
  };
});

describe('CommandRouter - New Game Command', () => {
  let commandRouter: CommandRouter;
  let mockGameStateManager: any;
  let mockPrismaService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';

    mockPrismaService = {
      client: {
        game: {
          create: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
        },
        room: {
          findFirst: jest.fn(),
          findMany: jest.fn(),
        },
        item: {
          findMany: jest.fn(),
          updateMany: jest.fn(),
        },
        character: {
          findMany: jest.fn(),
        },
      },
    };
    
    // Setup PrismaService mock to return our mock instance
    (PrismaService.getInstance as jest.Mock).mockReturnValue(mockPrismaService);

    mockGameStateManager = {
      getCurrentRoom: jest.fn().mockReturnValue({
        id: 1,
        name: 'Test Room',
        description: 'A test room'
      }),
      getCurrentGameId: jest.fn().mockReturnValue(1),
      getInventory: jest.fn().mockReturnValue([]),
      setCurrentGame: jest.fn(),
      setCurrentRoom: jest.fn(),
      clearInventory: jest.fn(),
      resetGameState: jest.fn(),
      hasActiveSession: jest.fn().mockReturnValue(true),
      getInventoryCount: jest.fn().mockReturnValue(0),
      getCurrentRoomInfo: jest.fn().mockResolvedValue('Test room info'),
      initializeGame: jest.fn().mockResolvedValue(undefined),
      getCurrentSession: jest.fn().mockReturnValue({ gameId: 1 }),
    };

    commandRouter = new CommandRouter(
      mockGameStateManager,
      mockPrismaService
    );
  });

  describe('Command Registration', () => {
    it('should recognize "new" command', async () => {
      const result = await commandRouter.parseCommand('new');
      
      expect(result.type).toBe('system');
      expect(result.action).toBe('new');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should recognize "NEW" command (case-insensitive)', async () => {
      const result = await commandRouter.parseCommand('NEW');
      
      expect(result.type).toBe('system');
      expect(result.action).toBe('new');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should recognize "New" command (mixed case)', async () => {
      const result = await commandRouter.parseCommand('New');
      
      expect(result.type).toBe('system');
      expect(result.action).toBe('new');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should include "new" in help text', async () => {
      const result = await commandRouter.executeCommand('help');
      
      expect(result.success).toBe(true);
      expect(result.response).toContain('new');
      expect(result.response).toContain('Start a new game');
    });
  });

  describe('Basic Handler Response', () => {
    it.skip('should start a new game immediately when "new" is entered', async () => {
      // Mock the starting room - note we don't filter by gameId anymore
      mockPrismaService.client.room.findFirst.mockResolvedValue({
        id: 1,
        name: 'Grand Entrance Hall',
        description: 'The grand entrance to the castle.',
      });

      // Mock game update (we update existing game instead of creating new)
      mockPrismaService.client.game.update.mockResolvedValue({
        id: 1,
        currentRoomId: 1,
      });

      // Mock item update for inventory reset
      mockPrismaService.client.item.updateMany.mockResolvedValue({
        count: 0,
      });
      
      // Mock getCurrentRoomInfo for the response (already mocked in beforeEach but override here)
      mockGameStateManager.getCurrentRoomInfo.mockResolvedValue(
        'Grand Entrance Hall\n===================\nThe grand entrance to the castle.'
      );

      // First test that the command is parsed correctly
      const parsed = await commandRouter.parseCommand('new');
      expect(parsed.type).toBe('system');
      expect(parsed.action).toBe('new');

      const result = await commandRouter.executeCommand('new');
      
      expect(result.success).toBe(true);
      expect(result.response).toContain('NEW GAME STARTED');
      expect(result.response).toContain('Welcome to Shadow Kingdom');
      expect(mockGameStateManager.resetGameState).toHaveBeenCalled();
      expect(mockGameStateManager.setCurrentGame).toHaveBeenCalledWith(1);
    });

    it('should handle missing starting room gracefully', async () => {
      // Mock no starting room found
      mockPrismaService.client.room.findFirst.mockResolvedValue(null);

      const result = await commandRouter.executeCommand('new');
      
      expect(result.success).toBe(false);
      expect(result.response).toContain('Unable to find starting room');
      expect(mockGameStateManager.setCurrentGame).not.toHaveBeenCalled();
    });
  });

  describe('Help System Integration', () => {
    it('should list "new" command in available commands', async () => {
      const commands = commandRouter.getAvailableCommands();
      
      const newCommand = commands.find(cmd => cmd.name === 'new');
      expect(newCommand).toBeDefined();
      expect(newCommand?.description).toContain('Start a new game');
    });

    it('should show "new" command in help sections', async () => {
      const result = await commandRouter.executeCommand('help');
      
      const lines = result.response.split('\n');
      const systemSection = lines.indexOf('SYSTEM:');
      expect(systemSection).toBeGreaterThan(-1);
      
      // Find the new command in system section
      const newCommandLine = lines.find(line => 
        line.includes('new') && line.includes('Start a new game')
      );
      expect(newCommandLine).toBeDefined();
    });
  });

  describe('Command Aliases', () => {
    it('should recognize "restart" as alias for new', async () => {
      const result = await commandRouter.parseCommand('restart');
      
      expect(result.type).toBe('system');
      expect(result.action).toBe('new');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should recognize "reset" as alias for new', async () => {
      const result = await commandRouter.parseCommand('reset');
      
      expect(result.type).toBe('system');
      expect(result.action).toBe('new');
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock the starting room to exist
      mockPrismaService.client.room.findFirst.mockResolvedValue({
        id: 1,
        name: 'Grand Entrance Hall',
        description: 'The grand entrance to the castle.',
      });
      
      // Mock the game update to fail (not create, since we update existing game)
      mockPrismaService.client.game.update.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await commandRouter.executeCommand('new');
      
      expect(result.success).toBe(false);
      expect(result.response).toContain('Failed to start a new game');
      expect(mockGameStateManager.setCurrentGame).not.toHaveBeenCalled();
    });
  });
});