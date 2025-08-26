// Global test setup
import './mockLogging';

// Disable console output during tests unless DEBUG_TESTS is set
if (!process.env.DEBUG_TESTS) {
  global.console.log = jest.fn();
  global.console.error = jest.fn();
  global.console.warn = jest.fn();
}

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_ENABLED = 'false';
process.env.DATABASE_URL = 'file::memory:'; // Use in-memory SQLite for tests

// Increase timeout for integration tests
if (process.env.INTEGRATION_TEST) {
  jest.setTimeout(10000);
} else {
  jest.setTimeout(5000);
}

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global teardown
afterAll(async () => {
  // Give time for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});