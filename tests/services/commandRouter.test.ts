import { CommandRouter, Command, Mode, CommandExecutionContext } from '../../src/services/commandRouter';
import { UnifiedNLPEngine } from '../../src/nlp/unifiedNLPEngine';
import { GrokClient } from '../../src/ai/grokClient';
import { GameContext } from '../../src/nlp/types';

describe('CommandRouter', () => {
  let commandRouter: CommandRouter;
  let mockNLPEngine: jest.Mocked<UnifiedNLPEngine>;
  let mockGrokClient: jest.Mocked<GrokClient>;
  let testContext: CommandExecutionContext;
  let mockCommand: Command;
  let mockAsyncCommand: Command;

  beforeEach(() => {
    // Create mock GrokClient
    mockGrokClient = {
      interpretCommand: jest.fn(),
      getUsageStats: jest.fn().mockReturnValue({
        tokensUsed: { input: 0, output: 0, cost: 0 },
        estimatedCost: '$0.0000'
      })
    } as any;

    // Create mock NLP Engine
    mockNLPEngine = {
      processCommand: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        totalCommands: 0,
        localMatches: 0,
        aiMatches: 0,
        failures: 0,
        avgProcessingTime: 0
      }),
      getConfig: jest.fn(),
      updateConfig: jest.fn(),
      resetStats: jest.fn(),
      addLocalPattern: jest.fn(),
      addLocalSynonym: jest.fn()
    } as any;

    commandRouter = new CommandRouter(mockNLPEngine);

    // Test context
    const gameContext: GameContext = {
      mode: 'game',
      gameId: 1,
      currentRoom: {
        id: 1,
        name: 'Test Room',
        description: 'A test room',
        availableExits: ['north', 'south']
      },
      recentCommands: ['look']
    };

    testContext = {
      mode: 'game' as Mode,
      gameContext,
      recentCommands: ['look']
    };

    // Mock commands
    mockCommand = {
      name: 'test',
      description: 'A test command',
      handler: jest.fn()
    };

    mockAsyncCommand = {
      name: 'async-test',
      description: 'An async test command',
      handler: jest.fn().mockResolvedValue(undefined)
    };
  });

  describe('Command Registration', () => {
    test('should register menu commands', () => {
      commandRouter.addMenuCommand(mockCommand);
      
      const menuCommands = commandRouter.getCommands('menu');
      expect(menuCommands.has('test')).toBe(true);
      expect(menuCommands.get('test')).toBe(mockCommand);
    });

    test('should register game commands', () => {
      commandRouter.addGameCommand(mockCommand);
      
      const gameCommands = commandRouter.getCommands('game');
      expect(gameCommands.has('test')).toBe(true);
      expect(gameCommands.get('test')).toBe(mockCommand);
    });

    test('should handle case-insensitive command names', () => {
      const upperCaseCommand: Command = {
        name: 'UPPERCASE',
        description: 'Test uppercase',
        handler: jest.fn()
      };
      
      commandRouter.addMenuCommand(upperCaseCommand);
      
      const menuCommands = commandRouter.getCommands('menu');
      expect(menuCommands.has('uppercase')).toBe(true);
    });

    test('should separate menu and game commands', () => {
      commandRouter.addMenuCommand(mockCommand);
      commandRouter.addGameCommand(mockAsyncCommand);
      
      const menuCommands = commandRouter.getCommands('menu');
      const gameCommands = commandRouter.getCommands('game');
      
      expect(menuCommands.has('test')).toBe(true);
      expect(menuCommands.has('async-test')).toBe(false);
      expect(gameCommands.has('async-test')).toBe(true);
      expect(gameCommands.has('test')).toBe(false);
    });
  });

  describe('Exact Command Execution', () => {
    beforeEach(() => {
      commandRouter.addGameCommand(mockCommand);
      commandRouter.addGameCommand(mockAsyncCommand);
    });

    test('should execute exact command match', async () => {
      const result = await commandRouter.processCommand('test arg1 arg2', testContext);
      
      expect(result).toBe(true);
      expect(mockCommand.handler).toHaveBeenCalledWith(['arg1', 'arg2']);
      expect(mockNLPEngine.processCommand).not.toHaveBeenCalled();
    });

    test('should execute async commands', async () => {
      const result = await commandRouter.processCommand('async-test', testContext);
      
      expect(result).toBe(true);
      expect(mockAsyncCommand.handler).toHaveBeenCalledWith([]);
    });

    test('should handle command execution errors', async () => {
      const errorCommand: Command = {
        name: 'error',
        description: 'Command that throws error',
        handler: jest.fn().mockRejectedValue(new Error('Test error'))
      };
      
      commandRouter.addGameCommand(errorCommand);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = await commandRouter.processCommand('error', testContext);
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Error executing command "error":', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    test('should be case insensitive for command execution', async () => {
      const result = await commandRouter.processCommand('TEST arg1', testContext);
      
      expect(result).toBe(true);
      expect(mockCommand.handler).toHaveBeenCalledWith(['arg1']);
    });
  });

  describe('NLP Command Processing', () => {
    beforeEach(() => {
      commandRouter.addGameCommand(mockCommand);
    });

    test('should fall back to NLP when exact match fails', async () => {
      mockNLPEngine.processCommand.mockResolvedValue({
        action: 'test',
        params: ['nlp-arg'],
        confidence: 0.8,
        source: 'local',
        processingTime: 10
      });
      
      const result = await commandRouter.processCommand('unknown command', testContext);
      
      expect(result).toBe(true);
      expect(mockNLPEngine.processCommand).toHaveBeenCalledWith('unknown command', testContext.gameContext);
      expect(mockCommand.handler).toHaveBeenCalledWith(['nlp-arg']);
    });

    test('should handle NLP command execution errors', async () => {
      const errorCommand: Command = {
        name: 'nlp-error',
        description: 'Command that throws error',
        handler: jest.fn().mockRejectedValue(new Error('NLP error'))
      };
      
      commandRouter.addGameCommand(errorCommand);
      
      mockNLPEngine.processCommand.mockResolvedValue({
        action: 'nlp-error',
        params: [],
        confidence: 0.9,
        source: 'ai',
        processingTime: 15
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = await commandRouter.processCommand('complex nlp command', testContext);
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Error executing NLP-resolved command "nlp-error":', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    test('should handle NLP returning null', async () => {
      mockNLPEngine.processCommand.mockResolvedValue(null);
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = await commandRouter.processCommand('completely unknown', testContext);
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Unknown command: completely. Type "help" for available commands.');
      
      consoleSpy.mockRestore();
    });

    test('should handle NLP resolving to non-existent command', async () => {
      mockNLPEngine.processCommand.mockResolvedValue({
        action: 'nonexistent',
        params: [],
        confidence: 0.7,
        source: 'local',
        processingTime: 5
      });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const result = await commandRouter.processCommand('some input', testContext);
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Unknown command: some. Type "help" for available commands.');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Debug Logging', () => {
    beforeEach(() => {
      commandRouter.addGameCommand(mockCommand);
      commandRouter.updateOptions({ enableDebugLogging: true });
    });

    test('should log NLP resolution in debug mode', async () => {
      mockNLPEngine.processCommand.mockResolvedValue({
        action: 'test',
        params: ['debug-param'],
        confidence: 0.85,
        source: 'local',
        processingTime: 12,
        reasoning: 'Test reasoning'
      });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await commandRouter.processCommand('debug test', testContext);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🎯 NLP: "debug test" → "test debug-param" (confidence: 0.85, source: local)')
      );
      expect(consoleSpy).toHaveBeenCalledWith('   Reasoning: Test reasoning');
      
      consoleSpy.mockRestore();
    });

    test('should show different icon for AI source', async () => {
      mockNLPEngine.processCommand.mockResolvedValue({
        action: 'test',
        params: [],
        confidence: 0.7,
        source: 'ai',
        processingTime: 25
      });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await commandRouter.processCommand('ai test', testContext);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🤖 NLP: "ai test" → "test " (confidence: 0.70, source: ai)')
      );
      
      consoleSpy.mockRestore();
    });

    test('should log debug info when NLP command not found', async () => {
      mockNLPEngine.processCommand.mockResolvedValue({
        action: 'missing',
        params: [],
        confidence: 0.8,
        source: 'local',
        processingTime: 8
      });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await commandRouter.processCommand('missing command', testContext);
      
      expect(consoleSpy).toHaveBeenCalledWith('🧠 NLP attempted: "missing" but command not found in game mode');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Help System', () => {
    beforeEach(() => {
      commandRouter.addMenuCommand(mockCommand);
      commandRouter.addGameCommand(mockAsyncCommand);
    });

    test('should show menu help', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      commandRouter.showHelp('menu');
      
      expect(consoleSpy).toHaveBeenCalledWith('\nMain Menu Commands:');
      expect(consoleSpy).toHaveBeenCalledWith('==================');
      expect(consoleSpy).toHaveBeenCalledWith('  test         - A test command');
      
      consoleSpy.mockRestore();
    });

    test('should show game help', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      commandRouter.showHelp('game');
      
      expect(consoleSpy).toHaveBeenCalledWith('\nAvailable commands:');
      expect(consoleSpy).toHaveBeenCalledWith('==================');
      expect(consoleSpy).toHaveBeenCalledWith('  async-test   - An async test command');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Statistics', () => {
    test('should return command statistics', () => {
      commandRouter.addMenuCommand(mockCommand);
      commandRouter.addGameCommand(mockAsyncCommand);
      
      const stats = commandRouter.getStats();
      
      expect(stats.menuCommandCount).toBe(1);
      expect(stats.gameCommandCount).toBe(1);
      expect(stats.totalCommands).toBe(2);
      expect(stats.nlpStats).toBeDefined();
    });
  });

  describe('Utility Methods', () => {
    test('should clear all commands', () => {
      commandRouter.addMenuCommand(mockCommand);
      commandRouter.addGameCommand(mockAsyncCommand);
      
      commandRouter.clearCommands();
      
      expect(commandRouter.getCommands('menu').size).toBe(0);
      expect(commandRouter.getCommands('game').size).toBe(0);
    });

    test('should update options', () => {
      commandRouter.updateOptions({ enableDebugLogging: true });
      
      // Test that debug logging is enabled by checking if it affects behavior
      // We can't directly access private properties, so we test indirectly
      const stats = commandRouter.getStats();
      expect(stats).toBeDefined();
    });

    test('should handle empty input', async () => {
      const result = await commandRouter.processCommand('', testContext);
      expect(result).toBe(false);
    });
  });

  describe('Mode-specific Behavior', () => {
    test('should use correct command set for menu mode', async () => {
      commandRouter.addMenuCommand(mockCommand);
      commandRouter.addGameCommand(mockAsyncCommand);
      
      const menuContext = { ...testContext, mode: 'menu' as Mode };
      
      const result1 = await commandRouter.processCommand('test', menuContext);
      const result2 = await commandRouter.processCommand('async-test', menuContext);
      
      expect(result1).toBe(true);
      expect(result2).toBe(false); // Should fail because async-test is game-only
      expect(mockCommand.handler).toHaveBeenCalled();
      expect(mockAsyncCommand.handler).not.toHaveBeenCalled();
    });

    test('should use correct command set for game mode', async () => {
      commandRouter.addMenuCommand(mockCommand);
      commandRouter.addGameCommand(mockAsyncCommand);
      
      const result1 = await commandRouter.processCommand('async-test', testContext);
      const result2 = await commandRouter.processCommand('test', testContext);
      
      expect(result1).toBe(true);
      expect(result2).toBe(false); // Should fail because test is menu-only
      expect(mockAsyncCommand.handler).toHaveBeenCalled();
      expect(mockCommand.handler).not.toHaveBeenCalled();
    });
  });
});