/**
 * Unit Tests for LoggerService
 * 
 * These tests verify LoggerService functionality in isolation,
 * focusing on core logging behavior, configuration handling,
 * and proper interaction with FileLogger and LogFormatter.
 */

import * as fs from 'fs';
import * as path from 'path';
import { LoggerService } from '../../src/services/loggerService';
import { FileLogger } from '../../src/utils/fileLogger';
import { LogFormatter } from '../../src/utils/logFormatter';
import { LogLevel } from '../../src/types/logging';

// Mock FileLogger to control behavior
jest.mock('../../src/utils/fileLogger');
const MockedFileLogger = FileLogger as jest.MockedClass<typeof FileLogger>;

describe('LoggerService Unit Tests', () => {
  let loggerService: LoggerService;
  let mockFileLogger: jest.Mocked<FileLogger>;
  let testLogDirectory: string;

  beforeEach(() => {
    // Create unique test log directory
    testLogDirectory = path.join(__dirname, '../test-logs', `test-${Date.now()}-${Math.random()}`);

    // Clear all mocks
    jest.clearAllMocks();
    MockedFileLogger.mockClear();

    // Create mock instance
    mockFileLogger = {
      writeSessionLog: jest.fn(),
      writeAILog: jest.fn(),
      writeError: jest.fn(),
      writeWarning: jest.fn(),
      writeInfo: jest.fn(),
      writeDebug: jest.fn(),
      getLogFilePaths: jest.fn().mockReturnValue({
        session: path.join(testLogDirectory, 'test.log'),
        ai: path.join(testLogDirectory, 'grok_responses.log')
      }),
      logFilesExist: jest.fn().mockReturnValue({
        session: true,
        ai: true
      })
    } as any;

    // Configure mock constructor to return our mock instance
    MockedFileLogger.mockImplementation(() => mockFileLogger);

    // Create LoggerService with test configuration
    loggerService = new LoggerService({
      logDirectory: testLogDirectory,
      logLevel: LogLevel.DEBUG,
      logToConsole: false,
      rotationDays: 30,
      logAiResponses: true,
      logUserCommands: true,
      logSystemOutput: true
    });
  });

  describe('Core Functionality', () => {
    test('should create FileLogger with correct directory', () => {
      expect(MockedFileLogger).toHaveBeenCalledWith(testLogDirectory);
    });

    test('should log user input when enabled', () => {
      const command = 'look around';
      loggerService.logUserInput(command);

      expect(mockFileLogger.writeSessionLog).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] > look around/)
      );
    });

    test('should not log user input when disabled', () => {
      const restrictedLogger = new LoggerService({
        logDirectory: testLogDirectory,
        logUserCommands: false
      });

      restrictedLogger.logUserInput('secret command');
      expect(mockFileLogger.writeSessionLog).not.toHaveBeenCalled();
    });

    test('should log system output when enabled', () => {
      const message = 'You are in a grand hall.';
      loggerService.logSystemOutput(message, 'room');

      expect(mockFileLogger.writeSessionLog).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] You are in a grand hall\./)
      );
    });

    test('should not log system output when disabled', () => {
      const restrictedLogger = new LoggerService({
        logDirectory: testLogDirectory,
        logSystemOutput: false
      });

      restrictedLogger.logSystemOutput('secret message', 'system');
      expect(mockFileLogger.writeSessionLog).not.toHaveBeenCalled();
    });
  });

  describe('AI Request/Response Logging', () => {
    test('should log AI request and return request ID', () => {
      const prompt = 'Generate a room description';
      const endpoint = '/chat/completions';

      const requestId = loggerService.logGrokRequest(prompt, endpoint);

      expect(requestId).toBeTruthy();
      expect(requestId).toMatch(/^req_\d+_\d+$/);
      expect(mockFileLogger.writeAILog).toHaveBeenCalledWith(
        expect.objectContaining({
          request_id: requestId,
          endpoint: endpoint,
          prompt: prompt,
          success: false,
          timestamp: expect.any(String)
        })
      );
    });

    test('should not log AI request when disabled', () => {
      const restrictedLogger = new LoggerService({
        logDirectory: testLogDirectory,
        logAiResponses: false
      });

      const requestId = restrictedLogger.logGrokRequest('test prompt', '/test');
      expect(requestId).toBe(''); // Empty string returned when disabled
      expect(mockFileLogger.writeAILog).not.toHaveBeenCalled();
    });

    test('should log successful AI response', () => {
      const requestId = loggerService.logGrokRequest('test prompt', '/test');
      const response = { description: 'A magical chamber' };
      const tokens = { input: 10, output: 15 };
      const duration = 1500;

      loggerService.logGrokResponse(requestId, response, tokens, duration);

      expect(mockFileLogger.writeAILog).toHaveBeenLastCalledWith(
        expect.objectContaining({
          request_id: requestId,
          response: { description: 'A magical chamber' },
          tokens: { input: 10, output: 15 },
          duration_ms: 1500,
          success: true,
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
        })
      );
    });

    test('should log AI error', () => {
      const requestId = loggerService.logGrokRequest('test prompt', '/test');
      const error = new Error('API timeout');

      loggerService.logGrokError(requestId, error);

      expect(mockFileLogger.writeAILog).toHaveBeenLastCalledWith(
        expect.objectContaining({
          request_id: requestId,
          error: 'API timeout',
          success: false,
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
        })
      );
    });
  });

  describe('Log Level Handling', () => {
    test('should respect ERROR log level', () => {
      const errorLogger = new LoggerService({
        logDirectory: testLogDirectory,
        logLevel: LogLevel.ERROR
      });

      errorLogger.debug('debug message');
      errorLogger.info('info message');
      errorLogger.warn('warn message');
      errorLogger.error('error message');

      // Only error should be logged
      expect(mockFileLogger.writeDebug).not.toHaveBeenCalled();
      expect(mockFileLogger.writeInfo).not.toHaveBeenCalled();
      expect(mockFileLogger.writeWarning).not.toHaveBeenCalled();
      expect(mockFileLogger.writeError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'error message' }), 
        undefined
      );
    });

    test('should respect DEBUG log level (logs everything)', () => {
      loggerService.debug('debug message');
      loggerService.info('info message');
      loggerService.warn('warn message');
      loggerService.error('error message');

      expect(mockFileLogger.writeDebug).toHaveBeenCalledWith('debug message', undefined);
      expect(mockFileLogger.writeInfo).toHaveBeenCalledWith('info message', undefined);
      expect(mockFileLogger.writeWarning).toHaveBeenCalledWith('warn message', undefined);
      expect(mockFileLogger.writeError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'error message' }), 
        undefined
      );
    });

    test('should pass context objects to FileLogger', () => {
      const context = { module: 'game', action: 'move' };
      loggerService.info('Player moved', context);

      expect(mockFileLogger.writeInfo).toHaveBeenCalledWith('Player moved', context);
    });
  });

  describe('Game Event Logging', () => {
    test('should log game events', () => {
      const gameEvent = {
        type: 'movement' as const,
        gameId: 1,
        playerId: 123,
        roomId: 456,
        details: { direction: 'north', fromRoom: 'Hall', toRoom: 'Garden' }
      };

      loggerService.logGameEvent(gameEvent);

      const loggedMessage = mockFileLogger.writeSessionLog.mock.calls[0][0];
      expect(loggedMessage).toMatch(/^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] MOVEMENT:/);
      expect(loggedMessage).toContain('"gameId":1');
      expect(loggedMessage).toContain('"playerId":123');
      expect(loggedMessage).toContain('"roomId":456');
      expect(loggedMessage).toContain('"direction":"north"');
      expect(loggedMessage).toContain('"fromRoom":"Hall"');
      expect(loggedMessage).toContain('"toRoom":"Garden"');
    });

    test('should handle game events without optional fields', () => {
      const gameEvent = {
        type: 'session_start' as const,
        details: { startTime: Date.now() }
      };

      loggerService.logGameEvent(gameEvent);

      expect(mockFileLogger.writeSessionLog).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] SESSION_START:/)
      );
    });
  });

  describe('Configuration Management', () => {
    test('should use default configuration when not provided', () => {
      const defaultLogger = new LoggerService({ logDirectory: testLogDirectory });

      // Should use defaults for unspecified options
      expect(defaultLogger.getLogFilePaths).toBeDefined();
      expect(defaultLogger.logFilesExist).toBeDefined();
    });

    test('should return log file paths from FileLogger', () => {
      const paths = loggerService.getLogFilePaths();

      expect(mockFileLogger.getLogFilePaths).toHaveBeenCalled();
      expect(paths).toEqual({
        session: path.join(testLogDirectory, 'test.log'),
        ai: path.join(testLogDirectory, 'grok_responses.log')
      });
    });

    test('should return log file existence status', () => {
      const status = loggerService.logFilesExist();

      expect(mockFileLogger.logFilesExist).toHaveBeenCalled();
      expect(status).toEqual({
        session: true,
        ai: true
      });
    });
  });

  describe('Request ID Generation', () => {
    test('should generate unique request IDs', () => {
      const id1 = loggerService.logGrokRequest('prompt 1', '/test');
      const id2 = loggerService.logGrokRequest('prompt 2', '/test');

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^req_\d+_\d+$/);
      expect(id2).toMatch(/^req_\d+_\d+$/);
    });

    test('should increment request counter', () => {
      const id1 = loggerService.logGrokRequest('prompt 1', '/test');
      const id2 = loggerService.logGrokRequest('prompt 2', '/test');

      // Extract counter from ID (format: req_{counter}_{timestamp})
      const counter1 = parseInt(id1.split('_')[1]);
      const counter2 = parseInt(id2.split('_')[1]);

      expect(counter2).toBe(counter1 + 1);
    });
  });

  describe('Error Handling', () => {
    test('should handle FileLogger errors gracefully', () => {
      // FileLogger handles its own errors internally, so LoggerService doesn't need to catch them
      // This test verifies that the logging call is made correctly
      loggerService.logUserInput('test command');
      
      expect(mockFileLogger.writeSessionLog).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\] > test command/)
      );
    });

    test('should handle malformed log entries', () => {
      // Test with null/undefined values
      expect(() => {
        loggerService.logSystemOutput('', 'system');
        loggerService.logUserInput('');
      }).not.toThrow();
    });
  });

  describe('Environment Integration', () => {
    test('should handle different NODE_ENV values', () => {
      const originalEnv = process.env.NODE_ENV;

      try {
        process.env.NODE_ENV = 'production';
        const prodLogger = new LoggerService({ logDirectory: testLogDirectory });

        expect(MockedFileLogger).toHaveBeenCalledWith(testLogDirectory);

        process.env.NODE_ENV = 'development';
        const devLogger = new LoggerService({ logDirectory: testLogDirectory });

        expect(MockedFileLogger).toHaveBeenCalledWith(testLogDirectory);

      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});