/**
 * Unit Tests for FileLogger
 * 
 * These tests verify FileLogger functionality including file operations,
 * directory creation, error handling, and log file management.
 */

import * as fs from 'fs';
import * as path from 'path';
import { FileLogger } from '../../src/utils/fileLogger';

describe('FileLogger Unit Tests', () => {
  let testLogDirectory: string;
  let fileLogger: FileLogger;

  beforeEach(() => {
    // Create unique test log directory for each test
    testLogDirectory = path.join(__dirname, '../test-logs', `filelogger-${Date.now()}-${Math.random()}`);
    fileLogger = new FileLogger(testLogDirectory);
  });

  afterEach(() => {
    // Clean up test log directory
    if (fs.existsSync(testLogDirectory)) {
      fs.rmSync(testLogDirectory, { recursive: true, force: true });
    }
  });

  describe('Directory Management', () => {
    test('should create log directory if it does not exist', () => {
      // Use a completely new directory that doesn't exist yet
      const newTestDir = path.join(__dirname, '../test-logs', `new-${Date.now()}-${Math.random()}`);
      
      expect(fs.existsSync(newTestDir)).toBe(false);

      // FileLogger constructor creates directory immediately
      const newFileLogger = new FileLogger(newTestDir);

      expect(fs.existsSync(newTestDir)).toBe(true);
      
      // Clean up
      fs.rmSync(newTestDir, { recursive: true, force: true });
    });

    test('should work with existing directory', () => {
      // Pre-create directory
      fs.mkdirSync(testLogDirectory, { recursive: true });
      expect(fs.existsSync(testLogDirectory)).toBe(true);

      // Should not fail when directory already exists
      expect(() => {
        fileLogger.writeSessionLog('test message');
      }).not.toThrow();
    });

    test('should create nested directory structure', () => {
      const nestedPath = path.join(testLogDirectory, 'nested', 'deep', 'logs');
      const nestedLogger = new FileLogger(nestedPath);

      nestedLogger.writeSessionLog('test message');

      expect(fs.existsSync(nestedPath)).toBe(true);
    });
  });

  describe('Session Log Writing', () => {
    test('should write session log to correct file', () => {
      const message = 'Test session log message';
      fileLogger.writeSessionLog(message);

      const logPaths = fileLogger.getLogFilePaths();
      expect(fs.existsSync(logPaths.session)).toBe(true);

      const content = fs.readFileSync(logPaths.session, 'utf8');
      expect(content.trim()).toBe(message);
    });

    test('should append multiple session messages', () => {
      const messages = ['Message 1', 'Message 2', 'Message 3'];
      
      messages.forEach(msg => fileLogger.writeSessionLog(msg));

      const logPaths = fileLogger.getLogFilePaths();
      const content = fs.readFileSync(logPaths.session, 'utf8');
      const lines = content.trim().split('\n');

      expect(lines).toEqual(messages);
    });

    test('should handle empty messages', () => {
      fileLogger.writeSessionLog('');

      const logPaths = fileLogger.getLogFilePaths();
      const content = fs.readFileSync(logPaths.session, 'utf8');
      
      expect(content).toBe('\n'); // Empty line
    });

    test('should preserve message formatting', () => {
      const formattedMessage = 'Multi-line\n  indented\n    message';
      fileLogger.writeSessionLog(formattedMessage);

      const logPaths = fileLogger.getLogFilePaths();
      const content = fs.readFileSync(logPaths.session, 'utf8');
      
      expect(content.trim()).toBe(formattedMessage);
    });
  });

  describe('AI Log Writing', () => {
    test('should write AI log as JSON', () => {
      const logData = {
        request_id: 'req_123_456',
        prompt: 'Generate a room',
        response: { description: 'A magical chamber' },
        timestamp: '2025-01-15T14:30:45.123Z'
      };

      fileLogger.writeAILog(logData);

      const logPaths = fileLogger.getLogFilePaths();
      expect(fs.existsSync(logPaths.ai)).toBe(true);

      const content = fs.readFileSync(logPaths.ai, 'utf8');
      const parsedData = JSON.parse(content.trim());
      
      expect(parsedData).toEqual(logData);
    });

    test('should append multiple AI log entries', () => {
      const entries = [
        { id: 1, data: 'first entry' },
        { id: 2, data: 'second entry' },
        { id: 3, data: 'third entry' }
      ];

      entries.forEach(entry => fileLogger.writeAILog(entry));

      const logPaths = fileLogger.getLogFilePaths();
      const content = fs.readFileSync(logPaths.ai, 'utf8');
      const lines = content.trim().split('\n');

      expect(lines).toHaveLength(3);
      lines.forEach((line, index) => {
        expect(JSON.parse(line)).toEqual(entries[index]);
      });
    });

    test('should handle complex AI log objects', () => {
      const complexLog = {
        request: {
          id: 'req_complex_test',
          prompt: 'Generate content',
          metadata: {
            timestamp: Date.now(),
            user: 'test_user',
            session: 'session_123'
          }
        },
        response: {
          content: 'Generated content here',
          tokens: { input: 50, output: 100 },
          performance: { duration_ms: 1500, model: 'grok-3' }
        },
        analytics: {
          success: true,
          cached: false,
          retries: 0
        }
      };

      fileLogger.writeAILog(complexLog);

      const logPaths = fileLogger.getLogFilePaths();
      const content = fs.readFileSync(logPaths.ai, 'utf8');
      const parsedData = JSON.parse(content.trim());
      
      expect(parsedData).toEqual(complexLog);
    });
  });

  describe('Log Level Methods', () => {
    test('should write error logs with ERROR prefix', () => {
      const error = new Error('Test error');
      const context = { module: 'test', action: 'error_test' };

      fileLogger.writeError(error, context);

      const logPaths = fileLogger.getLogFilePaths();
      const content = fs.readFileSync(logPaths.session, 'utf8');
      
      expect(content).toContain('ERROR: Test error');
      expect(content).toContain(JSON.stringify(context));
    });

    test('should write warning logs with WARN prefix', () => {
      const message = 'Test warning';
      const context = { severity: 'high' };

      fileLogger.writeWarning(message, context);

      const logPaths = fileLogger.getLogFilePaths();
      const content = fs.readFileSync(logPaths.session, 'utf8');
      
      expect(content).toContain('WARN: Test warning');
      expect(content).toContain(JSON.stringify(context));
    });

    test('should write info logs with INFO prefix', () => {
      const message = 'Test info';
      const context = { module: 'game' };

      fileLogger.writeInfo(message, context);

      const logPaths = fileLogger.getLogFilePaths();
      const content = fs.readFileSync(logPaths.session, 'utf8');
      
      expect(content).toContain('INFO: Test info');
      expect(content).toContain(JSON.stringify(context));
    });

    test('should write debug logs with DEBUG prefix', () => {
      const message = 'Test debug';
      const context = { trace: 'verbose' };

      fileLogger.writeDebug(message, context);

      const logPaths = fileLogger.getLogFilePaths();
      const content = fs.readFileSync(logPaths.session, 'utf8');
      
      expect(content).toContain('DEBUG: Test debug');
      expect(content).toContain(JSON.stringify(context));
    });

    test('should handle log methods without context', () => {
      fileLogger.writeError(new Error('Error without context'));
      fileLogger.writeWarning('Warning without context');
      fileLogger.writeInfo('Info without context');
      fileLogger.writeDebug('Debug without context');

      const logPaths = fileLogger.getLogFilePaths();
      const content = fs.readFileSync(logPaths.session, 'utf8');
      
      expect(content).toContain('ERROR: Error without context');
      expect(content).toContain('WARN: Warning without context');
      expect(content).toContain('INFO: Info without context');
      expect(content).toContain('DEBUG: Debug without context');
    });
  });

  describe('File Path Management', () => {
    test('should return correct log file paths', () => {
      const originalEnv = process.env.NODE_ENV;

      try {
        process.env.NODE_ENV = 'test';
        const testLogger = new FileLogger(testLogDirectory);
        const paths = testLogger.getLogFilePaths();

        expect(paths.session).toBe(path.join(testLogDirectory, 'test.log'));
        expect(paths.ai).toBe(path.join(testLogDirectory, 'grok_responses.log'));

        process.env.NODE_ENV = 'development';
        const devLogger = new FileLogger(testLogDirectory);
        const devPaths = devLogger.getLogFilePaths();

        expect(devPaths.session).toBe(path.join(testLogDirectory, 'development.log'));
        expect(devPaths.ai).toBe(path.join(testLogDirectory, 'grok_responses.log'));

      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    test('should handle missing NODE_ENV', () => {
      const originalEnv = process.env.NODE_ENV;

      try {
        delete process.env.NODE_ENV;
        const logger = new FileLogger(testLogDirectory);
        const paths = logger.getLogFilePaths();

        expect(paths.session).toBe(path.join(testLogDirectory, 'development.log'));
        expect(paths.ai).toBe(path.join(testLogDirectory, 'grok_responses.log'));

      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('File Existence Checking', () => {
    test('should return correct file existence status', () => {
      // Initially no files exist
      let status = fileLogger.logFilesExist();
      expect(status.session).toBe(false);
      expect(status.ai).toBe(false);

      // Create session log
      fileLogger.writeSessionLog('test');
      status = fileLogger.logFilesExist();
      expect(status.session).toBe(true);
      expect(status.ai).toBe(false);

      // Create AI log
      fileLogger.writeAILog({ test: 'data' });
      status = fileLogger.logFilesExist();
      expect(status.session).toBe(true);
      expect(status.ai).toBe(true);
    });

    test('should handle deleted files correctly', () => {
      // Create files
      fileLogger.writeSessionLog('test');
      fileLogger.writeAILog({ test: 'data' });

      let status = fileLogger.logFilesExist();
      expect(status.session).toBe(true);
      expect(status.ai).toBe(true);

      // Delete session log
      const paths = fileLogger.getLogFilePaths();
      fs.unlinkSync(paths.session);

      status = fileLogger.logFilesExist();
      expect(status.session).toBe(false);
      expect(status.ai).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle read-only directory gracefully', () => {
      const readOnlyDir = path.join(testLogDirectory, 'readonly');
      fs.mkdirSync(readOnlyDir, { recursive: true });
      fs.chmodSync(readOnlyDir, 0o444); // Read-only

      const readOnlyLogger = new FileLogger(readOnlyDir);

      // Should not throw errors, but fail silently
      expect(() => {
        readOnlyLogger.writeSessionLog('should fail silently');
      }).not.toThrow();

      // Restore permissions for cleanup
      fs.chmodSync(readOnlyDir, 0o755);
    });

    test('should handle invalid JSON gracefully', () => {
      // Create a logger that can handle circular references
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      expect(() => {
        fileLogger.writeAILog(circularObj);
      }).not.toThrow();
    });

    test('should handle very large log entries', () => {
      const largeMessage = 'A'.repeat(1024 * 1024); // 1MB message
      
      expect(() => {
        fileLogger.writeSessionLog(largeMessage);
      }).not.toThrow();

      const paths = fileLogger.getLogFilePaths();
      expect(fs.existsSync(paths.session)).toBe(true);
    });

    test('should handle concurrent writes', async () => {
      const promises = [];
      
      // Simulate concurrent writes
      for (let i = 0; i < 100; i++) {
        promises.push(Promise.resolve().then(() => {
          fileLogger.writeSessionLog(`Message ${i}`);
        }));
      }

      await Promise.all(promises);

      const paths = fileLogger.getLogFilePaths();
      const content = fs.readFileSync(paths.session, 'utf8');
      const lines = content.trim().split('\n');
      
      expect(lines).toHaveLength(100);
    });
  });

  describe('Performance', () => {
    test('should handle rapid sequential writes efficiently', () => {
      const startTime = Date.now();
      
      // Write 1000 messages rapidly
      for (let i = 0; i < 1000; i++) {
        fileLogger.writeSessionLog(`Message ${i}`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000);

      // Verify all messages were written
      const paths = fileLogger.getLogFilePaths();
      const content = fs.readFileSync(paths.session, 'utf8');
      const lines = content.trim().split('\n');
      
      expect(lines).toHaveLength(1000);
    });

    test('should not accumulate memory with many writes', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Write many messages
      for (let i = 0; i < 5000; i++) {
        fileLogger.writeSessionLog(`Log entry ${i}`);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 20MB)
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024);
    });
  });
});