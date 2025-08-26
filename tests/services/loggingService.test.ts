// Unmock the LoggingService for this test file since we want to test the actual implementation
jest.unmock('../../src/services/loggingService');

import { LoggingService } from '../../src/services/loggingService';
import * as fs from 'fs/promises';
import * as path from 'path';
import winston from 'winston';

jest.mock('fs/promises');
jest.mock('winston', () => {
  const mockFormat: any = {
    combine: jest.fn(),
    timestamp: jest.fn(),
    printf: jest.fn(),
    errors: jest.fn(),
  };
  
  mockFormat.combine.mockReturnValue(mockFormat);
  mockFormat.timestamp.mockReturnValue(mockFormat);
  mockFormat.printf.mockReturnValue(mockFormat);
  mockFormat.errors.mockReturnValue(mockFormat);

  const mockTransports = {
    File: jest.fn().mockImplementation(() => ({
      format: mockFormat,
    })),
  };

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    close: jest.fn(),
  };

  return {
    createLogger: jest.fn(() => mockLogger),
    format: mockFormat,
    transports: mockTransports,
  };
});

describe('LoggingService', () => {
  beforeAll(() => { process.env.FORCE_LOG_IN_TESTS = 'true'; });
  afterAll(() => { delete process.env.FORCE_LOG_IN_TESTS; });
  let service: LoggingService;
  
  beforeAll(() => {
    // Enable logging for these specific tests
    process.env.FORCE_LOG_IN_TESTS = 'true';
  });
  
  afterAll(() => {
    // Disable logging after tests
    delete process.env.FORCE_LOG_IN_TESTS;
  });
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance by accessing private property
    (LoggingService as any).instance = undefined;
    mockLogger = winston.createLogger();
    service = LoggingService.getInstance();
  });

  afterEach(async () => {
    // Reset mocks to prevent errors during shutdown
    jest.clearAllMocks();
    jest.useRealTimers(); // Always restore real timers
    // Reset singleton after each test
    if ((LoggingService as any).instance) {
      await (LoggingService as any).instance.shutdown?.();
    }
    (LoggingService as any).instance = undefined;
  });

  describe('Singleton Pattern', () => {
  beforeAll(() => { process.env.FORCE_LOG_IN_TESTS = 'true'; });
  afterAll(() => { delete process.env.FORCE_LOG_IN_TESTS; });
    it('should return the same instance', () => {
      const instance1 = LoggingService.getInstance();
      const instance2 = LoggingService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Session Management', () => {
  beforeAll(() => { process.env.FORCE_LOG_IN_TESTS = 'true'; });
  afterAll(() => { delete process.env.FORCE_LOG_IN_TESTS; });
    it('should generate a unique session ID on creation', () => {
      const sessionId = service.getSessionId();
      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i);
    });

    it('should log session start marker', async () => {
      await service.logSessionStart();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('SESSION START'),
        expect.objectContaining({
          type: 'SYSTEM',
          sessionId: service.getSessionId(),
        })
      );
    });

    it('should log session end marker', async () => {
      await service.logSessionEnd();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('SESSION END'),
        expect.objectContaining({
          type: 'SYSTEM',
          sessionId: service.getSessionId(),
        })
      );
    });
  });

  describe('Message Logging', () => {
  beforeAll(() => { process.env.FORCE_LOG_IN_TESTS = 'true'; });
  afterAll(() => { delete process.env.FORCE_LOG_IN_TESTS; });
    it('should log room messages', async () => {
      const message = 'You are in a dark forest.';
      await service.logMessage(message, 'ROOM');
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          type: 'ROOM',
          sessionId: service.getSessionId(),
        })
      );
    });

    it('should log command messages', async () => {
      const message = 'look';
      await service.logMessage(message, 'COMMAND');
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          type: 'COMMAND',
          sessionId: service.getSessionId(),
        })
      );
    });

    it('should log response messages', async () => {
      const message = 'You see a wooden chest.';
      await service.logMessage(message, 'RESPONSE');
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          type: 'RESPONSE',
          sessionId: service.getSessionId(),
        })
      );
    });

    it('should log error messages', async () => {
      const message = 'Command not recognized.';
      await service.logMessage(message, 'ERROR');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          type: 'ERROR',
          sessionId: service.getSessionId(),
        })
      );
    });

    it('should log system messages', async () => {
      const message = 'Game saved.';
      await service.logMessage(message, 'SYSTEM');
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          type: 'SYSTEM',
          sessionId: service.getSessionId(),
        })
      );
    });

    it('should preserve multi-line message formatting', async () => {
      const message = 'Line 1\nLine 2\nLine 3';
      await service.logMessage(message, 'RESPONSE');
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        message,
        expect.objectContaining({
          type: 'RESPONSE',
        })
      );
    });
  });

  describe('Configuration', () => {
  beforeAll(() => { process.env.FORCE_LOG_IN_TESTS = 'true'; });
  afterAll(() => { delete process.env.FORCE_LOG_IN_TESTS; });
    it('should respect LOG_ENABLED environment variable', () => {
      process.env.LOG_ENABLED = 'false';
      (LoggingService as any).instance = undefined;
      const disabledService = LoggingService.getInstance();
      expect(disabledService.isEnabled()).toBe(false);
      delete process.env.LOG_ENABLED;
    });

    it('should use custom LOG_PATH if provided', () => {
      process.env.LOG_PATH = 'custom/path/game.log';
      (LoggingService as any).instance = undefined;
      const customService = LoggingService.getInstance();
      
      expect(winston.transports.File).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'custom/path/game.log',
        })
      );
      delete process.env.LOG_PATH;
    });

    it('should use default path if LOG_PATH not provided', () => {
      (LoggingService as any).instance = undefined;
      const defaultService = LoggingService.getInstance();
      
      expect(winston.transports.File).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'log/development.log',
        })
      );
    });
  });

  describe('Error Handling', () => {
  beforeAll(() => { process.env.FORCE_LOG_IN_TESTS = 'true'; });
  afterAll(() => { delete process.env.FORCE_LOG_IN_TESTS; });
    it('should handle logging errors gracefully', async () => {
      // Get a fresh instance of the mock logger
      const currentMockLogger = (winston.createLogger as jest.Mock).mock.results[0].value;
      currentMockLogger.info.mockImplementation(() => {
        throw new Error('Logging failed');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await service.logMessage('Test message', 'RESPONSE');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to write to log:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should not throw when logging fails', async () => {
      const currentMockLogger = (winston.createLogger as jest.Mock).mock.results[0].value;
      currentMockLogger.info.mockImplementation(() => {
        throw new Error('Logging failed');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await expect(service.logMessage('Test', 'RESPONSE')).resolves.not.toThrow();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Graceful Shutdown', () => {
  beforeAll(() => { process.env.FORCE_LOG_IN_TESTS = 'true'; });
  afterAll(() => { delete process.env.FORCE_LOG_IN_TESTS; });
    it('should close logger on shutdown', async () => {
      await service.shutdown();
      expect(mockLogger.close).toHaveBeenCalled();
    });

    it('should handle shutdown errors gracefully', async () => {
      mockLogger.close.mockImplementation(() => {
        throw new Error('Close failed');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await service.shutdown();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error closing logger:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Buffered Writing', () => {
  beforeAll(() => { process.env.FORCE_LOG_IN_TESTS = 'true'; });
  afterAll(() => { 
    delete process.env.FORCE_LOG_IN_TESTS; 
    jest.useRealTimers(); // Ensure timers are restored
  });
    it('should batch messages when buffer is enabled', async () => {
      jest.useFakeTimers();
      const currentMockLogger = (winston.createLogger as jest.Mock).mock.results[0].value;
      
      service.enableBuffering();
      
      await service.logMessage('Message 1', 'RESPONSE');
      await service.logMessage('Message 2', 'RESPONSE');
      await service.logMessage('Message 3', 'RESPONSE');
      
      expect(currentMockLogger.info).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(100);
      
      expect(currentMockLogger.info).toHaveBeenCalledTimes(3);
      
      jest.useRealTimers();
    });

    it('should flush buffer when limit is reached', async () => {
      const currentMockLogger = (winston.createLogger as jest.Mock).mock.results[0].value;
      service.enableBuffering();
      
      for (let i = 0; i < 10; i++) {
        await service.logMessage(`Message ${i}`, 'RESPONSE');
      }
      
      expect(currentMockLogger.info).toHaveBeenCalledTimes(10);
    });

    it('should flush buffer on shutdown', async () => {
      const currentMockLogger = (winston.createLogger as jest.Mock).mock.results[0].value;
      service.enableBuffering();
      
      await service.logMessage('Buffered message', 'RESPONSE');
      expect(currentMockLogger.info).not.toHaveBeenCalled();
      
      await service.shutdown();
      expect(currentMockLogger.info).toHaveBeenCalledWith(
        'Buffered message',
        expect.objectContaining({
          type: 'RESPONSE',
        })
      );
    });
  });
});