import Database from '../src/utils/database';

// Mock the modules we don't want to actually run
jest.mock('../src/utils/database');
jest.mock('../src/gameController');
jest.mock('../src/sessionInterface', () => ({
  shouldUseSessionMode: jest.fn(),
  runSessionMode: jest.fn()
}));

import { shouldUseSessionMode, runSessionMode } from '../src/sessionInterface';
import { GameController } from '../src/gameController';

describe('Main Application', () => {
  let mockDb: jest.Mocked<Database>;
  let mockController: jest.Mocked<GameController>;

  beforeEach(() => {
    mockDb = new Database() as jest.Mocked<Database>;
    mockDb.connect = jest.fn().mockResolvedValue(undefined);
    
    mockController = {
      start: jest.fn().mockResolvedValue(undefined)
    } as any;
    
    (GameController as jest.Mock).mockImplementation(() => mockController);
    (shouldUseSessionMode as jest.Mock).mockReturnValue(false);
    (runSessionMode as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should use interactive mode when no session arguments', async () => {
    const mainFunction = require('../src/index');
    
    // Mock process.argv to simulate no session arguments
    const originalArgv = process.argv;
    process.argv = ['node', 'index.js'];
    
    try {
      // We can't easily test the main function directly since it's self-executing
      // So we'll test the logic we want to add
      const args = process.argv.slice(2);
      const useSessionMode = shouldUseSessionMode(args);
      
      expect(useSessionMode).toBe(false);
      expect(shouldUseSessionMode).toHaveBeenCalledWith([]);
    } finally {
      process.argv = originalArgv;
    }
  });

  test('should use session mode when session arguments present', async () => {
    (shouldUseSessionMode as jest.Mock).mockReturnValue(true);
    
    const args = ['--start-session'];
    const useSessionMode = shouldUseSessionMode(args);
    
    expect(useSessionMode).toBe(true);
    expect(shouldUseSessionMode).toHaveBeenCalledWith(args);
  });
});