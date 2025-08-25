import { LoggingService } from '../../src/services/loggingService';
import * as fs from 'fs/promises';
import * as path from 'path';
import winston from 'winston';

// Mock modules
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

describe('LoggingService - Configuration & Error Handling', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (LoggingService as any).instance = undefined;
    originalEnv = { ...process.env };
    mockLogger = (winston.createLogger as jest.Mock)();
  });

  afterEach(() => {
    process.env = originalEnv;
    (LoggingService as any).instance = undefined;
  });

  describe('Environment Variables', () => {
    describe('LOG_ENABLED', () => {
      it('should disable logging when LOG_ENABLED=false', () => {
        process.env.LOG_ENABLED = 'false';
        const service = LoggingService.getInstance();
        
        expect(service.isEnabled()).toBe(false);
      });

      it('should enable logging when LOG_ENABLED=true', () => {
        process.env.LOG_ENABLED = 'true';
        const service = LoggingService.getInstance();
        
        expect(service.isEnabled()).toBe(true);
      });

      it('should enable logging by default when LOG_ENABLED is not set', () => {
        delete process.env.LOG_ENABLED;
        const service = LoggingService.getInstance();
        
        expect(service.isEnabled()).toBe(true);
      });

      it('should not write logs when disabled', async () => {
        process.env.LOG_ENABLED = 'false';
        const service = LoggingService.getInstance();
        
        await service.logMessage('Test message', 'RESPONSE');
        
        expect(mockLogger.info).not.toHaveBeenCalled();
      });

      it('should handle case-insensitive false values', () => {
        const falseValues = ['FALSE', 'False', '0', 'no', 'NO'];
        
        falseValues.forEach(value => {
          process.env.LOG_ENABLED = value;
          (LoggingService as any).instance = undefined;
          const service = LoggingService.getInstance();
          
          expect(service.isEnabled()).toBe(false);
        });
      });
    });

    describe('LOG_PATH', () => {
      it('should use custom log path from LOG_PATH environment variable', () => {
        process.env.LOG_PATH = 'custom/logs/game.log';
        const service = LoggingService.getInstance();
        
        expect(winston.transports.File).toHaveBeenCalledWith(
          expect.objectContaining({
            filename: 'custom/logs/game.log'
          })
        );
      });

      it('should use default path when LOG_PATH is not set', () => {
        delete process.env.LOG_PATH;
        const service = LoggingService.getInstance();
        
        expect(winston.transports.File).toHaveBeenCalledWith(
          expect.objectContaining({
            filename: 'log/development.log'
          })
        );
      });

      it('should handle absolute paths', () => {
        process.env.LOG_PATH = '/var/log/shadow_kingdom/game.log';
        const service = LoggingService.getInstance();
        
        expect(winston.transports.File).toHaveBeenCalledWith(
          expect.objectContaining({
            filename: '/var/log/shadow_kingdom/game.log'
          })
        );
      });

      it('should handle paths with spaces', () => {
        process.env.LOG_PATH = 'my logs/game output.log';
        const service = LoggingService.getInstance();
        
        expect(winston.transports.File).toHaveBeenCalledWith(
          expect.objectContaining({
            filename: 'my logs/game output.log'
          })
        );
      });
    });

    describe('Combined Configuration', () => {
      it('should respect both LOG_ENABLED and LOG_PATH together', () => {
        process.env.LOG_ENABLED = 'true';
        process.env.LOG_PATH = 'custom/game.log';
        
        const service = LoggingService.getInstance();
        
        expect(service.isEnabled()).toBe(true);
        expect(winston.transports.File).toHaveBeenCalledWith(
          expect.objectContaining({
            filename: 'custom/game.log'
          })
        );
      });
    });
  });

  describe('Directory Creation', () => {
    it('should create log directory if it does not exist', async () => {
      const mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;
      const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
      
      mockAccess.mockRejectedValue(new Error('Directory not found'));
      mockMkdir.mockResolvedValue(undefined);
      
      process.env.LOG_PATH = 'new/dir/game.log';
      const service = LoggingService.getInstance();
      
      // Give time for async directory creation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockMkdir).toHaveBeenCalledWith(
        'new/dir',
        expect.objectContaining({ recursive: true })
      );
    });

    it('should not create directory if it already exists', async () => {
      const mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;
      const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
      
      mockAccess.mockResolvedValue(undefined);
      
      process.env.LOG_PATH = 'existing/dir/game.log';
      const service = LoggingService.getInstance();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockMkdir).not.toHaveBeenCalled();
    });

    it('should handle directory creation errors gracefully', async () => {
      const mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;
      const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
      
      mockAccess.mockRejectedValue(new Error('Not found'));
      mockMkdir.mockRejectedValue(new Error('Permission denied'));
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      process.env.LOG_PATH = 'restricted/dir/game.log';
      const service = LoggingService.getInstance();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create log directory'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should create nested directories', async () => {
      const mockAccess = fs.access as jest.MockedFunction<typeof fs.access>;
      const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;
      
      mockAccess.mockRejectedValue(new Error('Not found'));
      mockMkdir.mockResolvedValue(undefined);
      
      process.env.LOG_PATH = 'deep/nested/path/to/logs/game.log';
      const service = LoggingService.getInstance();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockMkdir).toHaveBeenCalledWith(
        'deep/nested/path/to/logs',
        expect.objectContaining({ recursive: true })
      );
    });
  });

  describe('Error Resilience', () => {
    let service: LoggingService;
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      service = LoggingService.getInstance();
      consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should continue operating when logger throws errors', async () => {
      mockLogger.info.mockImplementation(() => {
        throw new Error('Logger failed');
      });
      
      await service.logMessage('Test 1', 'RESPONSE');
      await service.logMessage('Test 2', 'COMMAND');
      
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to write to log:',
        expect.any(Error)
      );
    });

    it('should not throw errors to caller when logging fails', async () => {
      mockLogger.info.mockImplementation(() => {
        throw new Error('Critical failure');
      });
      
      await expect(
        service.logMessage('Test', 'RESPONSE')
      ).resolves.not.toThrow();
    });

    it('should handle winston transport errors', async () => {
      mockLogger.error.mockImplementation(() => {
        throw new Error('Transport error');
      });
      
      await service.logMessage('Error message', 'ERROR');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to write to log:',
        expect.any(Error)
      );
    });

    it('should handle file system errors', async () => {
      // Simulate file system full error
      mockLogger.info.mockImplementation(() => {
        const error = new Error('ENOSPC: no space left on device');
        (error as any).code = 'ENOSPC';
        throw error;
      });
      
      await service.logMessage('Test', 'RESPONSE');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to write to log:',
        expect.objectContaining({
          message: expect.stringContaining('ENOSPC')
        })
      );
    });

    it('should handle permission errors', async () => {
      mockLogger.info.mockImplementation(() => {
        const error = new Error('EACCES: permission denied');
        (error as any).code = 'EACCES';
        throw error;
      });
      
      await service.logMessage('Test', 'RESPONSE');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to write to log:',
        expect.objectContaining({
          message: expect.stringContaining('EACCES')
        })
      );
    });
  });

  describe('Retry Logic', () => {
    let service: LoggingService;
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      service = LoggingService.getInstance();
      consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should retry on transient errors', async () => {
      let callCount = 0;
      mockLogger.info.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Temporary failure');
        }
        // Succeed on second attempt
      });
      
      service.enableRetry();
      await service.logMessage('Test', 'RESPONSE');
      
      expect(mockLogger.info).toHaveBeenCalledTimes(2);
    });

    it('should give up after max retries', async () => {
      mockLogger.info.mockImplementation(() => {
        throw new Error('Persistent failure');
      });
      
      service.enableRetry();
      await service.logMessage('Test', 'RESPONSE');
      
      // Default max retries is 3
      expect(mockLogger.info).toHaveBeenCalledTimes(3);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write to log after'),
        expect.any(Error)
      );
    });

    it('should use exponential backoff for retries', async () => {
      jest.useFakeTimers();
      
      mockLogger.info.mockImplementation(() => {
        throw new Error('Network error');
      });
      
      service.enableRetry();
      const logPromise = service.logMessage('Test', 'RESPONSE');
      
      // First attempt - immediate
      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      
      // Second attempt - after 100ms
      jest.advanceTimersByTime(100);
      await Promise.resolve();
      expect(mockLogger.info).toHaveBeenCalledTimes(2);
      
      // Third attempt - after 200ms more
      jest.advanceTimersByTime(200);
      await Promise.resolve();
      expect(mockLogger.info).toHaveBeenCalledTimes(3);
      
      jest.useRealTimers();
      await logPromise;
    });

    it('should not retry when retry is disabled', async () => {
      mockLogger.info.mockImplementation(() => {
        throw new Error('Error without retry');
      });
      
      // Retry is disabled by default
      await service.logMessage('Test', 'RESPONSE');
      
      expect(mockLogger.info).toHaveBeenCalledTimes(1);
    });
  });

  describe('Silent Failure Mode', () => {
    it('should not log warnings in silent mode', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      process.env.LOG_SILENT_ERRORS = 'true';
      (LoggingService as any).instance = undefined;
      const service = LoggingService.getInstance();
      
      mockLogger.info.mockImplementation(() => {
        throw new Error('Silent error');
      });
      
      await service.logMessage('Test', 'RESPONSE');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      delete process.env.LOG_SILENT_ERRORS;
    });

    it('should still operate normally in silent mode', async () => {
      process.env.LOG_SILENT_ERRORS = 'true';
      (LoggingService as any).instance = undefined;
      const service = LoggingService.getInstance();
      
      // First call fails, second succeeds
      let callCount = 0;
      mockLogger.info.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Silent error');
        }
      });
      
      await service.logMessage('Fail', 'RESPONSE');
      await service.logMessage('Success', 'RESPONSE');
      
      expect(mockLogger.info).toHaveBeenCalledTimes(2);
      
      delete process.env.LOG_SILENT_ERRORS;
    });
  });

  describe('Graceful Degradation', () => {
    it('should continue game operation when logging is completely broken', async () => {
      // Simulate complete logger failure
      const originalCreateLogger = (winston.createLogger as jest.Mock).getMockImplementation();
      (winston.createLogger as jest.Mock).mockImplementation(() => {
        throw new Error('Cannot create logger');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      (LoggingService as any).instance = undefined;
      
      // Should not throw when creating service
      expect(() => LoggingService.getInstance()).not.toThrow();
      
      consoleSpy.mockRestore();
      
      // Restore original mock
      (winston.createLogger as jest.Mock).mockImplementation(originalCreateLogger);
    });

    it('should handle invalid LOG_PATH gracefully', () => {
      // Reset winston mock to normal behavior
      (winston.createLogger as jest.Mock).mockImplementation(() => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        close: jest.fn(),
      }));
      
      const invalidPaths = [
        '',           // Empty path
        ' ',          // Whitespace only
        '\0',         // Null character
        'CON',        // Reserved name on Windows
        '../../../etc/passwd', // Path traversal attempt
      ];
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      invalidPaths.forEach(path => {
        process.env.LOG_PATH = path;
        (LoggingService as any).instance = undefined;
        
        expect(() => LoggingService.getInstance()).not.toThrow();
      });
      
      consoleSpy.mockRestore();
    });
  });
});