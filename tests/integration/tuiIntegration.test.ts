import React from 'react';
import { render } from 'ink-testing-library';
import { GameApplication } from '../../src/components/GameApplication';
import { GameEngine } from '../../src/services/gameEngine';
import { GameStateManager } from '../../src/services/gameStateManager';
import { CommandRouter } from '../../src/services/commandRouter';
import { RoomNavigationEngine } from '../../src/services/roomNavigationEngine';
import { PrismaService } from '../../src/services/prismaService';

// Mock all services
jest.mock('../../src/services/gameEngine');
jest.mock('../../src/services/gameStateManager');
jest.mock('../../src/services/commandRouter');
jest.mock('../../src/services/roomNavigationEngine');
jest.mock('../../src/services/prismaService');

describe('TUI Integration', () => {
  let mockGameEngine: jest.Mocked<GameEngine>;
  let mockGameStateManager: jest.Mocked<GameStateManager>;
  let mockCommandRouter: jest.Mocked<CommandRouter>;
  let mockNavigationEngine: jest.Mocked<RoomNavigationEngine>;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(() => {
    // Setup comprehensive mocks
    mockGameEngine = {
      safeLaunch: jest.fn(),
      initialize: jest.fn(),
      shutdown: jest.fn(),
      getLaunchConfiguration: jest.fn(),
      setLaunchConfiguration: jest.fn(),
    } as any;

    mockGameStateManager = {
      getCurrentRoom: jest.fn(),
      getCurrentSession: jest.fn(),
      hasActiveSession: jest.fn(),
      clearSession: jest.fn(),
      shutdown: jest.fn(),
      initializeGame: jest.fn(),
    } as any;

    mockCommandRouter = {
      executeCommand: jest.fn(),
      parseCommand: jest.fn(),
      getCommandHistory: jest.fn(),
      getSuggestions: jest.fn(),
    } as any;

    mockNavigationEngine = {
      generateRoomDescription: jest.fn(),
      getAvailableExits: jest.fn(),
      validateMovement: jest.fn(),
      performMovement: jest.fn(),
      getNavigationHints: jest.fn(),
      cleanup: jest.fn(),
    } as any;

    mockPrismaService = {
      client: {},
      disconnect: jest.fn(),
      getInstance: jest.fn(),
    } as any;

    // Setup mocked constructors
    (GameEngine as jest.MockedClass<typeof GameEngine>).mockImplementation(() => mockGameEngine);
    (GameStateManager as jest.MockedClass<typeof GameStateManager>).mockImplementation(() => mockGameStateManager);
    (CommandRouter as jest.MockedClass<typeof CommandRouter>).mockImplementation(() => mockCommandRouter);
    (RoomNavigationEngine as jest.MockedClass<typeof RoomNavigationEngine>).mockImplementation(() => mockNavigationEngine);
    (PrismaService.getInstance as jest.Mock).mockReturnValue(mockPrismaService);

    // Set up default mock behaviors
    (mockGameEngine.initialize as jest.Mock).mockResolvedValue(undefined);
    (mockGameEngine.safeLaunch as jest.Mock).mockResolvedValue({
      game: { id: 1, currentRoomId: 123 },
      isNewGame: false
    });
    (mockGameEngine.getLaunchConfiguration as jest.Mock).mockReturnValue({
      skipMenu: true,
      autoCreateGame: true,
      showLaunchMessages: true,
      updatePlayTimestamps: true,
      backgroundGeneration: true,
    });

    (mockGameStateManager.hasActiveSession as jest.Mock).mockReturnValue(true);
    (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue({
      id: 123,
      gameId: 1,
      regionId: 1,
      name: 'Test Room',
      description: 'A test room',
      visited: true,
      locked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (mockGameStateManager.getCurrentSession as jest.Mock).mockReturnValue({
      gameId: 1,
      currentRoomId: 123,
      lastSaved: new Date(),
      sessionStartTime: new Date(),
    });
    (mockGameStateManager.initializeGame as jest.Mock).mockResolvedValue(undefined);

    (mockNavigationEngine.generateRoomDescription as jest.Mock).mockResolvedValue('**Test Room**\n\nA test room description');
    (mockNavigationEngine.getNavigationHints as jest.Mock).mockResolvedValue(['north', 'south']);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Application Launch Sequence', () => {
    it('should successfully launch with existing game', async () => {
      const mockRoom = {
        id: 123,
        gameId: 1,
        regionId: 1,
        name: 'Grand Entrance Hall',
        description: 'You stand in a magnificent hall with vaulted ceilings',
        extendedDescription: 'Sunlight streams through tall stained glass windows',
        visited: true,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSession = {
        gameId: 1,
        currentRoomId: 123,
        currentRoom: mockRoom,
        lastSaved: new Date(),
        sessionStartTime: new Date(),
      };

      // Mock successful launch
      (mockGameEngine.safeLaunch as jest.Mock).mockResolvedValue({
        game: { id: 1, currentRoomId: 123 },
        isNewGame: false
      });

      (mockGameStateManager.getCurrentSession as jest.Mock).mockReturnValue(mockSession);
      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);

      (mockNavigationEngine.generateRoomDescription as jest.Mock).mockResolvedValue(
        '**Grand Entrance Hall**\n\nYou stand in a magnificent hall with vaulted ceilings\n\nSunlight streams through tall stained glass windows\n\nExits: north, south, east'
      );

      const { lastFrame } = render(React.createElement(GameApplication));

      // Wait for initial render
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that the application launched and displays the room
      expect(mockGameEngine.initialize).toHaveBeenCalled();
      expect(mockGameEngine.safeLaunch).toHaveBeenCalled();
      expect(lastFrame()).toContain('Grand Entrance Hall');
      expect(lastFrame()).toContain('magnificent hall');
    });

    it('should handle new game creation during launch', async () => {
      const mockNewGame = {
        id: 2,
        currentRoomId: 456,
        maxRoomsPerGame: 100,
        roomCount: 12,
        generationCooldownMs: 10000,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockStartingRoom = {
        id: 456,
        gameId: 2,
        regionId: 1,
        name: 'Grand Entrance Hall',
        description: 'A newly created starting chamber',
        extendedDescription: 'This marks the beginning of your adventure',
        visited: false,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock new game creation
      (mockGameEngine.safeLaunch as jest.Mock).mockResolvedValue({
        game: mockNewGame,
        isNewGame: true
      });

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockStartingRoom);
      (mockNavigationEngine.generateRoomDescription as jest.Mock).mockResolvedValue(
        '**Grand Entrance Hall**\n*[First time visiting]*\n\nA newly created starting chamber\n\nThis marks the beginning of your adventure\n\nExits: north'
      );

      const { lastFrame } = render(React.createElement(GameApplication));

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockGameEngine.safeLaunch).toHaveBeenCalled();
      expect(lastFrame()).toContain('Grand Entrance Hall');
      expect(lastFrame()).toContain('First time visiting');
      expect(lastFrame()).toContain('beginning of your adventure');
    });

    it('should handle launch failures gracefully', async () => {
      (mockGameEngine.safeLaunch as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const { lastFrame } = render(React.createElement(GameApplication));

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(lastFrame()).toContain('Failed to start game');
      expect(lastFrame()).toContain('Database connection failed');
    });

    it('should optimize launch time for sub-2-second startup', async () => {
      const startTime = Date.now();

      const mockRoom = {
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

      (mockGameEngine.safeLaunch as jest.Mock).mockResolvedValue({
        game: { id: 1, currentRoomId: 123 },
        isNewGame: false
      });

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockNavigationEngine.generateRoomDescription as jest.Mock).mockResolvedValue('**Test Room**\n\nA test room\n\nExits: none');

      const { lastFrame } = render(React.createElement(GameApplication));

      // Wait for launch to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      const launchTime = Date.now() - startTime;
      
      // Verify sub-2-second startup
      expect(launchTime).toBeLessThan(2000);
      expect(lastFrame()).toContain('Test Room');
    });
  });

  describe('Command Processing Integration', () => {
    beforeEach(async () => {
      const mockRoom = {
        id: 123,
        gameId: 1,
        regionId: 1,
        name: 'Test Hall',
        description: 'A test hall for command processing',
        extendedDescription: null,
        visited: true,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockGameEngine.safeLaunch as jest.Mock).mockResolvedValue({
        game: { id: 1, currentRoomId: 123 },
        isNewGame: false
      });

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockNavigationEngine.generateRoomDescription as jest.Mock).mockResolvedValue('**Test Hall**\n\nA test hall for command processing\n\nExits: north, south');
    });

    it('should process look commands correctly', async () => {
      (mockCommandRouter.executeCommand as jest.Mock).mockResolvedValue({
        success: true,
        response: 'You look around the Test Hall. A test hall for command processing.\n\nExits: north, south'
      });

      const { lastFrame, stdin } = render(React.createElement(GameApplication));

      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate typing 'look' command
      stdin.write('look\r');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockCommandRouter.executeCommand).toHaveBeenCalledWith('look');
      expect(lastFrame()).toContain('look around the Test Hall');
    });

    it('should process movement commands correctly', async () => {
      const mockNewRoom = {
        id: 124,
        gameId: 1,
        regionId: 1,
        name: 'Northern Chamber',
        description: 'You have moved to the northern chamber',
        extendedDescription: null,
        visited: false,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockCommandRouter.executeCommand as jest.Mock).mockResolvedValue({
        success: true,
        response: '**Northern Chamber**\n*[First time visiting]*\n\nYou have moved to the northern chamber\n\nExits: south',
        metadata: { roomChanged: true, newRoomId: 124 }
      });

      // Update current room after movement
      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockNewRoom);

      const { lastFrame, stdin } = render(React.createElement(GameApplication));

      await new Promise(resolve => setTimeout(resolve, 100));

      stdin.write('go north\r');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockCommandRouter.executeCommand).toHaveBeenCalledWith('go north');
      expect(lastFrame()).toContain('Northern Chamber');
      expect(lastFrame()).toContain('First time visiting');
    });

    it('should handle invalid commands with suggestions', async () => {
      (mockCommandRouter.executeCommand as jest.Mock).mockResolvedValue({
        success: false,
        response: 'I don\'t understand that command. Did you mean: look, go?'
      });

      const { lastFrame, stdin } = render(React.createElement(GameApplication));

      await new Promise(resolve => setTimeout(resolve, 100));

      stdin.write('loo\r');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockCommandRouter.executeCommand).toHaveBeenCalledWith('loo');
      expect(lastFrame()).toContain('don\'t understand that command');
      expect(lastFrame()).toContain('Did you mean');
    });

    it('should maintain command history', async () => {
      const mockHistory = ['look', 'go north', 'examine door'];
      (mockCommandRouter.getCommandHistory as jest.Mock).mockReturnValue(mockHistory);

      (mockCommandRouter.executeCommand as jest.Mock).mockResolvedValue({
        success: true,
        response: 'You look around.'
      });

      const { stdin } = render(React.createElement(GameApplication));

      await new Promise(resolve => setTimeout(resolve, 100));

      // Execute a few commands
      stdin.write('look\r');
      await new Promise(resolve => setTimeout(resolve, 50));
      
      stdin.write('go north\r');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockCommandRouter.executeCommand).toHaveBeenCalledTimes(2);
    });
  });

  describe('Dual-Mode Support', () => {
    it('should support programmatic command execution', async () => {
      // Mock command line arguments for programmatic mode
      const originalArgv = process.argv;
      process.argv = ['node', 'index.js', '--cmd', 'look'];

      (mockCommandRouter.executeCommand as jest.Mock).mockResolvedValue({
        success: true,
        response: 'You look around the room.'
      });

      const mockRoom = {
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

      (mockGameEngine.safeLaunch as jest.Mock).mockResolvedValue({
        game: { id: 1, currentRoomId: 123 },
        isNewGame: false
      });

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);

      const { lastFrame } = render(React.createElement(GameApplication));

      // Wait for programmatic execution
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(mockCommandRouter.executeCommand).toHaveBeenCalledWith('look');
      expect(lastFrame()).toContain('You look around the room');

      // Restore original argv
      process.argv = originalArgv;
    });

    it('should fall back to interactive mode when no command specified', async () => {
      const originalArgv = process.argv;
      process.argv = ['node', 'index.js'];

      const mockRoom = {
        id: 123,
        gameId: 1,
        regionId: 1,
        name: 'Interactive Room',
        description: 'A room for interactive play',
        extendedDescription: null,
        visited: true,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockGameEngine.safeLaunch as jest.Mock).mockResolvedValue({
        game: { id: 1, currentRoomId: 123 },
        isNewGame: false
      });

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockNavigationEngine.generateRoomDescription as jest.Mock).mockResolvedValue('**Interactive Room**\n\nA room for interactive play\n\nExits: none');

      const { lastFrame } = render(React.createElement(GameApplication));

      await new Promise(resolve => setTimeout(resolve, 100));

      // Should show interactive interface
      expect(lastFrame()).toContain('Interactive Room');
      expect(lastFrame()).toContain('Enter command'); // Input prompt

      process.argv = originalArgv;
    });
  });

  describe('Status Display Integration', () => {
    it('should update status pane with current game state', async () => {
      const mockSession = {
        gameId: 1,
        currentRoomId: 123,
        currentRoom: {
          id: 123,
          name: 'Status Test Room',
          regionId: 2
        },
        lastSaved: new Date(),
        sessionStartTime: new Date(),
      };

      (mockGameEngine.safeLaunch as jest.Mock).mockResolvedValue({
        game: { id: 1, currentRoomId: 123 },
        isNewGame: false
      });

      (mockGameStateManager.getCurrentSession as jest.Mock).mockReturnValue(mockSession);
      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockSession.currentRoom);

      const { lastFrame } = render(React.createElement(GameApplication));

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(lastFrame()).toContain('Status Test Room');
      expect(lastFrame()).toContain('Game: 1');
    });

    it('should show navigation hints in status', async () => {
      const mockHints = [
        'Available directions: north, south',
        'You sense hidden elements in this room',
        'Some objects appear interactive'
      ];

      (mockNavigationEngine.getNavigationHints as jest.Mock).mockResolvedValue(mockHints);

      const mockRoom = {
        id: 123,
        gameId: 1,
        regionId: 1,
        name: 'Hint Room',
        description: 'A room with hints',
        extendedDescription: null,
        visited: true,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockGameEngine.safeLaunch as jest.Mock).mockResolvedValue({
        game: { id: 1, currentRoomId: 123 },
        isNewGame: false
      });

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);

      const { lastFrame } = render(React.createElement(GameApplication));

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockNavigationEngine.getNavigationHints).toHaveBeenCalled();
      expect(lastFrame()).toContain('Available directions');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle service initialization failures', async () => {
      (mockGameEngine.initialize as jest.Mock).mockRejectedValue(new Error('Service initialization failed'));

      const { lastFrame } = render(React.createElement(GameApplication));

      await new Promise(resolve => setTimeout(resolve, 200));

      expect(lastFrame()).toContain('initialization failed');
      expect(lastFrame()).toContain('Please try again');
    });

    it('should handle command execution errors gracefully', async () => {
      const mockRoom = {
        id: 123,
        gameId: 1,
        regionId: 1,
        name: 'Error Test Room',
        description: 'A room for testing errors',
        extendedDescription: null,
        visited: true,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockGameEngine.safeLaunch as jest.Mock).mockResolvedValue({
        game: { id: 1, currentRoomId: 123 },
        isNewGame: false
      });

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);
      (mockNavigationEngine.generateRoomDescription as jest.Mock).mockResolvedValue('**Error Test Room**\n\nA room for testing errors');

      (mockCommandRouter.executeCommand as jest.Mock).mockRejectedValue(new Error('Command processing failed'));

      const { lastFrame, stdin } = render(React.createElement(GameApplication));

      await new Promise(resolve => setTimeout(resolve, 100));

      stdin.write('test command\r');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(lastFrame()).toContain('error occurred');
      expect(lastFrame()).not.toContain('Command processing failed'); // Should not show raw error to user
    });

    it('should provide fallback when room description fails', async () => {
      (mockGameEngine.safeLaunch as jest.Mock).mockResolvedValue({
        game: { id: 1, currentRoomId: 123 },
        isNewGame: false
      });

      (mockNavigationEngine.generateRoomDescription as jest.Mock).mockRejectedValue(new Error('Description generation failed'));

      const mockRoom = {
        id: 123,
        gameId: 1,
        regionId: 1,
        name: 'Fallback Room',
        description: 'A basic room description',
        extendedDescription: null,
        visited: true,
        locked: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockGameStateManager.getCurrentRoom as jest.Mock).mockReturnValue(mockRoom);

      const { lastFrame } = render(React.createElement(GameApplication));

      await new Promise(resolve => setTimeout(resolve, 200));

      // Should show fallback content
      expect(lastFrame()).toContain('Fallback Room');
      expect(lastFrame()).toContain('basic room description');
    });
  });
});