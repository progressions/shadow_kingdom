import React from 'react';
import { render } from 'ink-testing-library';
import { GameApplication } from '../../src/components/GameApplication';
import { LoggingService, MessageType } from '../../src/services/loggingService';
import { GameEngine } from '../../src/services/gameEngine';
import { GameStateManager } from '../../src/services/gameStateManager';
import { CommandRouter } from '../../src/services/commandRouter';
import { RoomNavigationEngine } from '../../src/services/roomNavigationEngine';
import { PrismaService } from '../../src/services/prismaService';

// Mock all services
jest.mock('../../src/services/loggingService');
jest.mock('../../src/services/gameEngine');
jest.mock('../../src/services/gameStateManager');
jest.mock('../../src/services/commandRouter');
jest.mock('../../src/services/roomNavigationEngine');
jest.mock('../../src/services/prismaService');

describe('GameApplication - Logging Integration', () => {
  let mockLoggingService: jest.Mocked<LoggingService>;
  let mockGameEngine: jest.Mocked<GameEngine>;
  let mockGameStateManager: jest.Mocked<GameStateManager>;
  let mockCommandRouter: jest.Mocked<CommandRouter>;
  let mockNavigationEngine: jest.Mocked<RoomNavigationEngine>;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock logging service
    mockLoggingService = {
      logMessage: jest.fn().mockResolvedValue(undefined),
      logSessionStart: jest.fn().mockResolvedValue(undefined),
      logSessionEnd: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      getSessionId: jest.fn().mockReturnValue('test-session-id'),
      isEnabled: jest.fn().mockReturnValue(true),
      enableBuffering: jest.fn(),
      disableBuffering: jest.fn(),
    } as any;
    
    (LoggingService.getInstance as jest.Mock).mockReturnValue(mockLoggingService);

    // Setup mock prisma service
    mockPrismaService = {
      initialize: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
    } as any;
    (PrismaService.getInstance as jest.Mock).mockReturnValue(mockPrismaService);

    // Setup mock game engine
    mockGameEngine = {
      initialize: jest.fn().mockResolvedValue(undefined),
      safeLaunch: jest.fn().mockResolvedValue({
        game: { id: 1, name: 'Test Game' },
        room: { id: 1, name: 'Test Room' },
      }),
      shutdown: jest.fn().mockResolvedValue(undefined),
    } as any;
    (GameEngine as jest.MockedClass<typeof GameEngine>).mockImplementation(() => mockGameEngine);

    // Setup mock game state manager
    mockGameStateManager = {
      initializeGame: jest.fn().mockResolvedValue(undefined),
      getCurrentSession: jest.fn().mockReturnValue({ gameId: 1 }),
      getCurrentRoom: jest.fn().mockReturnValue({ id: 1, name: 'Test Room' }),
      shutdown: jest.fn().mockResolvedValue(undefined),
    } as any;
    (GameStateManager as jest.MockedClass<typeof GameStateManager>).mockImplementation(() => mockGameStateManager);

    // Setup mock command router
    mockCommandRouter = {
      executeCommand: jest.fn().mockResolvedValue({
        success: true,
        response: 'Command executed',
        metadata: {},
      }),
    } as any;
    (CommandRouter as jest.MockedClass<typeof CommandRouter>).mockImplementation(() => mockCommandRouter);

    // Setup mock navigation engine
    mockNavigationEngine = {
      getNavigationHints: jest.fn().mockResolvedValue(['North', 'South']),
      cleanup: jest.fn().mockResolvedValue(undefined),
    } as any;
    (RoomNavigationEngine as jest.MockedClass<typeof RoomNavigationEngine>).mockImplementation(() => mockNavigationEngine);
  });

  describe('Message Logging', () => {
    it('should log session start when game initializes', async () => {
      const { unmount } = render(<GameApplication />);
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockLoggingService.logSessionStart).toHaveBeenCalled();
      
      unmount();
    });

    it('should log session end when component unmounts', async () => {
      const { unmount } = render(<GameApplication />);
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      unmount();
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockLoggingService.logSessionEnd).toHaveBeenCalled();
    });

    it('should log welcome messages as SYSTEM type', async () => {
      const { unmount } = render(<GameApplication />);
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockLoggingService.logMessage).toHaveBeenCalledWith(
        expect.stringContaining('Shadow Kingdom'),
        'SYSTEM'
      );
      
      unmount();
    });

    it('should log programmatic commands as COMMAND type', async () => {
      const { unmount } = render(<GameApplication programmaticCommand="look" />);
      
      // Wait for initialization and command execution
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(mockLoggingService.logMessage).toHaveBeenCalledWith(
        '> look',
        'COMMAND'
      );
      
      unmount();
    });

    it('should log command responses as RESPONSE type', async () => {
      mockCommandRouter.executeCommand.mockResolvedValue({
        success: true,
        response: 'You see a room.',
        metadata: {},
      });

      const { unmount } = render(<GameApplication programmaticCommand="look" />);
      
      // Wait for initialization and command execution
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(mockLoggingService.logMessage).toHaveBeenCalledWith(
        'You see a room.',
        'RESPONSE'
      );
      
      unmount();
    });

    it('should log command errors as ERROR type', async () => {
      mockCommandRouter.executeCommand.mockResolvedValue({
        success: false,
        response: 'Command not recognized',
        metadata: {},
      });

      const { unmount } = render(<GameApplication programmaticCommand="invalid" />);
      
      // Wait for initialization and command execution
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(mockLoggingService.logMessage).toHaveBeenCalledWith(
        'Command not recognized',
        'ERROR'
      );
      
      unmount();
    });

    it('should log multi-line responses correctly', async () => {
      mockCommandRouter.executeCommand.mockResolvedValue({
        success: true,
        response: 'Line 1\nLine 2\nLine 3',
        metadata: {},
      });

      const { unmount } = render(<GameApplication programmaticCommand="look" />);
      
      // Wait for initialization and command execution
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(mockLoggingService.logMessage).toHaveBeenCalledWith(
        'Line 1\nLine 2\nLine 3',
        'RESPONSE'
      );
      
      unmount();
    });

    it('should log loading errors as ERROR type', async () => {
      mockGameEngine.safeLaunch.mockRejectedValue(new Error('Launch failed'));

      const { unmount } = render(<GameApplication />);
      
      // Wait for initialization failure
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(mockLoggingService.logMessage).toHaveBeenCalledWith(
        expect.stringContaining('Launch failed'),
        'ERROR'
      );
      
      unmount();
    });

    it('should not log when logging service is disabled', async () => {
      mockLoggingService.isEnabled.mockReturnValue(false);

      const { unmount } = render(<GameApplication programmaticCommand="look" />);
      
      // Wait for initialization and command execution
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Should NOT call logMessage when service is disabled
      expect(mockLoggingService.logMessage).not.toHaveBeenCalled();
      
      unmount();
    });

    it('should handle logging service errors gracefully', async () => {
      mockLoggingService.logMessage.mockRejectedValue(new Error('Logging failed'));

      const { unmount, lastFrame } = render(<GameApplication programmaticCommand="look" />);
      
      // Wait for initialization and command execution
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Game should continue working even if logging fails
      const output = lastFrame();
      expect(output).toBeDefined();
      
      unmount();
    });
  });

  describe('Interactive Mode Logging', () => {
    it.skip('should log user input as COMMAND type', async () => {
      const { unmount, stdin } = render(<GameApplication />);
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Clear previous calls from initialization
      mockLoggingService.logMessage.mockClear();
      
      // Simulate user typing a command
      stdin.write('test command');
      stdin.write('\r'); // Enter key
      
      // Wait for command processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check if any call contains the test command
      const commandCalls = mockLoggingService.logMessage.mock.calls.filter(
        call => call[1] === 'COMMAND'
      );
      
      expect(commandCalls.length).toBeGreaterThan(0);
      expect(commandCalls.some(call => call[0].includes('test command'))).toBe(true);
      
      unmount();
    });

    it('should log echo responses in interactive mode', async () => {
      const { unmount, stdin } = render(<GameApplication />);
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simulate user typing a command
      stdin.write('echo test');
      stdin.write('\r'); // Enter key
      
      // Wait for command processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should log the echo lines
      expect(mockLoggingService.logMessage).toHaveBeenCalledWith(
        expect.stringContaining('This is a line of text'),
        'RESPONSE'
      );
      
      unmount();
    });
  });

  describe('Logging Service Lifecycle', () => {
    it('should initialize logging service before other services', async () => {
      const initOrder: string[] = [];
      
      (LoggingService.getInstance as jest.Mock).mockImplementation(() => {
        initOrder.push('logging');
        return mockLoggingService;
      });
      
      (PrismaService.getInstance as jest.Mock).mockImplementation(() => {
        initOrder.push('prisma');
        return mockPrismaService;
      });
      
      const { unmount } = render(<GameApplication />);
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(initOrder[0]).toBe('logging');
      
      unmount();
    });

    it('should shutdown logging service on cleanup', async () => {
      const { unmount } = render(<GameApplication />);
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      unmount();
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockLoggingService.shutdown).toHaveBeenCalled();
    });

    it('should handle logging service shutdown errors gracefully', async () => {
      mockLoggingService.shutdown.mockRejectedValue(new Error('Shutdown failed'));
      
      const { unmount } = render(<GameApplication debugMode />);
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should not throw when unmounting
      expect(() => unmount()).not.toThrow();
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });
});