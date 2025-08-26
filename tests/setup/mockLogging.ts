// Global mock for LoggingService to prevent real file I/O during tests

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

  const MockLoggingService = jest.fn().mockImplementation(() => mockInstance) as any;
  MockLoggingService.getInstance = jest.fn().mockReturnValue(mockInstance);

  return {
    LoggingService: MockLoggingService,
  };
});

// Export for tests that need to access the mock - import the mock after it's set up
export const mockLoggingService = (() => {
  const { LoggingService } = require('../../src/services/loggingService');
  return LoggingService.getInstance();
})();