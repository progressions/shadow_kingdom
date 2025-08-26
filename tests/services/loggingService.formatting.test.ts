// Unmock the LoggingService for this test file since we want to test the actual implementation
jest.unmock('../../src/services/loggingService');

// Mock fs and winston
jest.mock('fs/promises');
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
}));

// Create mockLogger functions
const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerDebug = jest.fn();
const mockLoggerClose = jest.fn();

jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: mockLoggerInfo,
    error: mockLoggerError,
    warn: mockLoggerWarn,
    debug: mockLoggerDebug,
    close: mockLoggerClose,
  })),
  format: {
    combine: jest.fn().mockReturnValue({}),
    timestamp: jest.fn().mockReturnValue({}),
    printf: jest.fn().mockReturnValue({}),
    errors: jest.fn().mockReturnValue({}),
  },
  transports: {
    File: jest.fn().mockImplementation(() => ({})),
  },
}));

import { LoggingService, MessageType } from '../../src/services/loggingService';
import * as fs from 'fs/promises';
import * as path from 'path';
import winston from 'winston';

describe('LoggingService - Formatting', () => {
  let originalLogEnabled: string | undefined;
  
  beforeAll(() => { 
    originalLogEnabled = process.env.LOG_ENABLED;
    process.env.LOG_ENABLED = 'true';  // Override test setup
    process.env.FORCE_LOG_IN_TESTS = 'true'; 
  });
  
  afterAll(() => { 
    delete process.env.FORCE_LOG_IN_TESTS;
    // Restore original value
    if (originalLogEnabled !== undefined) {
      process.env.LOG_ENABLED = originalLogEnabled;
    } else {
      delete process.env.LOG_ENABLED;
    }
  });
  let service: LoggingService;
  let capturedFormatter: any;

  beforeEach(() => {
    // Clear mock call history but not implementations
    mockLoggerInfo.mockClear();
    mockLoggerError.mockClear();
    mockLoggerWarn.mockClear();
    mockLoggerDebug.mockClear();
    mockLoggerClose.mockClear();
    (LoggingService as any).instance = undefined;
    
    // Capture the format function
    (winston.format.printf as jest.Mock).mockImplementation((fn) => {
      capturedFormatter = fn;
      return {};
    });
    
    service = LoggingService.getInstance();
  });

  afterEach(() => {
    (LoggingService as any).instance = undefined;
  });

  describe('Timestamp Format', () => {
  beforeAll(() => { process.env.FORCE_LOG_IN_TESTS = 'true'; });
  afterAll(() => { delete process.env.FORCE_LOG_IN_TESTS; });
    it('should use ISO 8601 format with milliseconds', () => {
      expect(winston.format.timestamp).toHaveBeenCalledWith({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
      });
    });

    it('should include timestamp in log entries', () => {
      const testTimestamp = '2025-08-25 10:30:45.123';
      const logInfo = {
        timestamp: testTimestamp,
        level: 'info',
        message: 'Test message',
        type: 'RESPONSE',
        sessionId: 'test-session-id'
      };

      const formatted = capturedFormatter(logInfo);
      expect(formatted).toContain('[2025-08-25 10:30:45.123]');
    });
  });

  describe('Log Entry Structure', () => {
  beforeAll(() => { process.env.FORCE_LOG_IN_TESTS = 'true'; });
  afterAll(() => { delete process.env.FORCE_LOG_IN_TESTS; });
    it('should format entries as [timestamp] [session-id] [type] message', () => {
      const logInfo = {
        timestamp: '2025-08-25 10:30:45.123',
        level: 'info',
        message: 'Test message',
        type: 'RESPONSE',
        sessionId: 'abc-123'
      };

      const formatted = capturedFormatter(logInfo);
      expect(formatted).toBe('[2025-08-25 10:30:45.123] [abc-123] [RESPONSE] Test message');
    });

    it('should handle different message types correctly', () => {
      const types: MessageType[] = ['ROOM', 'COMMAND', 'RESPONSE', 'ERROR', 'SYSTEM'];
      
      types.forEach(type => {
        const logInfo = {
          timestamp: '2025-08-25 10:30:45.123',
          level: 'info',
          message: `${type} message`,
          type,
          sessionId: 'test-id'
        };

        const formatted = capturedFormatter(logInfo);
        expect(formatted).toContain(`[${type}]`);
      });
    });
  });

  describe('Message Content Preservation', () => {
  beforeAll(() => { process.env.FORCE_LOG_IN_TESTS = 'true'; });
  afterAll(() => { delete process.env.FORCE_LOG_IN_TESTS; });
    it('should preserve multi-line messages', () => {
      const multiLineMessage = 'Line 1\nLine 2\nLine 3';
      const logInfo = {
        timestamp: '2025-08-25 10:30:45.123',
        level: 'info',
        message: multiLineMessage,
        type: 'RESPONSE',
        sessionId: 'test-id'
      };

      const formatted = capturedFormatter(logInfo);
      expect(formatted).toContain('Line 1\nLine 2\nLine 3');
    });

    it('should preserve special characters', () => {
      const specialMessage = 'Special chars: !@#$%^&*()[]{}|\\<>?/~`';
      const logInfo = {
        timestamp: '2025-08-25 10:30:45.123',
        level: 'info',
        message: specialMessage,
        type: 'RESPONSE',
        sessionId: 'test-id'
      };

      const formatted = capturedFormatter(logInfo);
      expect(formatted).toContain(specialMessage);
    });

    it('should preserve indentation', () => {
      const indentedMessage = '  Indented line\n    More indented\n      Even more';
      const logInfo = {
        timestamp: '2025-08-25 10:30:45.123',
        level: 'info',
        message: indentedMessage,
        type: 'RESPONSE',
        sessionId: 'test-id'
      };

      const formatted = capturedFormatter(logInfo);
      expect(formatted).toContain('  Indented line\n    More indented\n      Even more');
    });

    it('should handle empty messages', () => {
      const logInfo = {
        timestamp: '2025-08-25 10:30:45.123',
        level: 'info',
        message: '',
        type: 'RESPONSE',
        sessionId: 'test-id'
      };

      const formatted = capturedFormatter(logInfo);
      expect(formatted).toBe('[2025-08-25 10:30:45.123] [test-id] [RESPONSE] ');
    });
  });

  describe('Session Markers', () => {
  beforeAll(() => { process.env.FORCE_LOG_IN_TESTS = 'true'; });
  afterAll(() => { delete process.env.FORCE_LOG_IN_TESTS; });
    it('should format session start marker distinctively', async () => {
      await service.logSessionStart();
      
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        '=== SESSION START ===',
        expect.objectContaining({
          type: 'SYSTEM',
          sessionId: service.getSessionId()
        })
      );
    });

    it('should format session end marker distinctively', async () => {
      await service.logSessionEnd();
      
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        '=== SESSION END ===',
        expect.objectContaining({
          type: 'SYSTEM',
          sessionId: service.getSessionId()
        })
      );
    });

    it('should include visual separators in session markers', () => {
      const sessionStartInfo = {
        timestamp: '2025-08-25 10:30:45.123',
        level: 'info',
        message: '=== SESSION START ===',
        type: 'SYSTEM',
        sessionId: 'test-id'
      };

      const formatted = capturedFormatter(sessionStartInfo);
      expect(formatted).toContain('=== SESSION START ===');
    });
  });

  describe('Session ID Format', () => {
  beforeAll(() => { process.env.FORCE_LOG_IN_TESTS = 'true'; });
  afterAll(() => { delete process.env.FORCE_LOG_IN_TESTS; });
    it('should use UUID v4 format for session IDs', () => {
      const sessionId = service.getSessionId();
      const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
      expect(sessionId).toMatch(uuidRegex);
    });

    it('should consistently use the same session ID', async () => {
      const sessionId = service.getSessionId();
      
      await service.logMessage('Message 1', 'RESPONSE');
      await service.logMessage('Message 2', 'COMMAND');
      
      const calls = mockLoggerInfo.mock.calls;
      calls.forEach((call: any[]) => {
        expect(call[1].sessionId).toBe(sessionId);
      });
    });
  });

  describe('Readable Output', () => {
  beforeAll(() => { process.env.FORCE_LOG_IN_TESTS = 'true'; });
  afterAll(() => { delete process.env.FORCE_LOG_IN_TESTS; });
    it('should produce human-readable log entries', () => {
      const logInfo = {
        timestamp: '2025-08-25 10:30:45.123',
        level: 'info',
        message: 'You are in a dark forest. Tall trees surround you.',
        type: 'ROOM',
        sessionId: 'abc-def-ghi'
      };

      const formatted = capturedFormatter(logInfo);
      
      // Should be easily readable and parseable
      expect(formatted).toBe(
        '[2025-08-25 10:30:45.123] [abc-def-ghi] [ROOM] You are in a dark forest. Tall trees surround you.'
      );
    });

    it('should align message types for readability', () => {
      const types = ['ROOM', 'COMMAND', 'RESPONSE', 'ERROR', 'SYSTEM'];
      const formattedLines: string[] = [];

      types.forEach(type => {
        const logInfo = {
          timestamp: '2025-08-25 10:30:45.123',
          level: 'info',
          message: 'Test',
          type,
          sessionId: 'test-id'
        };
        formattedLines.push(capturedFormatter(logInfo));
      });

      // All type markers should be in the same position
      formattedLines.forEach(line => {
        // Should find the type marker at a consistent position
        const typeMatch = line.match(/\[(ROOM|COMMAND|RESPONSE|ERROR|SYSTEM)\]/);
        expect(typeMatch).toBeTruthy();
        
        // Check that the type marker appears after the session ID
        const pattern = /\[[\d-.: ]+\] \[[a-z-]+\] \[(ROOM|COMMAND|RESPONSE|ERROR|SYSTEM)\]/;
        expect(line).toMatch(pattern);
      });
    });
  });

  describe('File Rotation', () => {
  beforeAll(() => { process.env.FORCE_LOG_IN_TESTS = 'true'; });
  afterAll(() => { delete process.env.FORCE_LOG_IN_TESTS; });
    it('should configure max file size for rotation', () => {
      expect(winston.transports.File).toHaveBeenCalledWith(
        expect.objectContaining({
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 5,
          tailable: true
        })
      );
    });
  });

  describe('Performance', () => {
  beforeAll(() => { process.env.FORCE_LOG_IN_TESTS = 'true'; });
  afterAll(() => { delete process.env.FORCE_LOG_IN_TESTS; });
    it('should format messages quickly', () => {
      const logInfo = {
        timestamp: '2025-08-25 10:30:45.123',
        level: 'info',
        message: 'Performance test message',
        type: 'RESPONSE',
        sessionId: 'perf-test-id'
      };

      const startTime = performance.now();
      
      // Format 1000 messages
      for (let i = 0; i < 1000; i++) {
        capturedFormatter(logInfo);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should format 1000 messages in less than 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});