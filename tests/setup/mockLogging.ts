// Global mock for LoggingService to prevent real file I/O during tests
import { LoggingService } from '../../src/services/loggingService';

// Mock the LoggingService module globally
jest.mock('../../src/services/loggingService', () => {
  const mockInstance = {
    logMessage: jest.fn().mockResolvedValue(undefined),
    logSessionStart: jest.fn().mockResolvedValue(undefined),
    logSessionEnd: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
    getSessionId: jest.fn().mockReturnValue('mock-session-id'),
    isEnabled: jest.fn().mockReturnValue(false), // Disabled by default in tests
    enableBuffering: jest.fn(),
    disableBuffering: jest.fn(),
    flush: jest.fn().mockResolvedValue(undefined),
  };

  return {
    LoggingService: jest.fn().mockImplementation(() => mockInstance),
    getInstance: jest.fn().mockReturnValue(mockInstance),
  };
});

// Export for tests that need to access the mock
export const mockLoggingService = LoggingService.getInstance();