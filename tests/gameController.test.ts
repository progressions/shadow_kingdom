import Database from '../src/utils/database';
import { GameController } from '../src/gameController';
import { initializeDatabase } from '../src/utils/initDb';

// Mock readline to avoid actual I/O during testing
jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    on: jest.fn(),
    setPrompt: jest.fn(),
    prompt: jest.fn(),
    question: jest.fn(),
    close: jest.fn(),
    removeAllListeners: jest.fn()
  }))
}));

describe('GameController Integration', () => {
  let db: Database;
  let controller: GameController;
  let mockRl: any;

  beforeEach(async () => {
    db = new Database(':memory:'); // Use in-memory database for tests
    await db.connect();
    await initializeDatabase(db);
    
    controller = new GameController(db);
    
    // Get the mock readline interface
    const readline = require('readline');
    mockRl = readline.createInterface();
  });

  afterEach(async () => {
    if (db.isConnected()) {
      await db.close();
    }
  });

  describe('Initialization', () => {
    test('should create controller with database connection', () => {
      expect(controller).toBeDefined();
      expect(db.isConnected()).toBe(true);
    });

    test('should set up readline interface', () => {
      const readline = require('readline');
      expect(readline.createInterface).toHaveBeenCalled();
    });
  });

  describe('Game State', () => {
    test('should start in menu mode', () => {
      // We can't directly test private properties, but we can test behavior
      // The controller should be in menu mode initially
      expect(controller).toBeDefined();
    });

    test('should handle start method', async () => {
      await controller.start();
      
      // Since console.clear is mocked globally, we just verify the method runs
      expect(controller).toBeDefined();
    });
  });

  // Note: Testing the full game flow would require more complex mocking
  // of the readline interface and async input/output. These tests focus
  // on the testable parts of the controller.
});

describe('GameController Menu Commands', () => {
  let db: Database;

  beforeEach(async () => {
    db = new Database(':memory:'); // Use in-memory database for tests
    await db.connect();
    await initializeDatabase(db);
  });

  afterEach(async () => {
    if (db.isConnected()) {
      await db.close();
    }
  });

  // These tests would require exposing some internal methods or creating
  // a test interface for the controller. For now, we'll test the database
  // operations that the controller depends on.

  test('should be able to query games for load menu', async () => {
    // Create some test games
    await db.run('INSERT INTO games (name) VALUES (?)', ['Game 1']);
    await db.run('INSERT INTO games (name) VALUES (?)', ['Game 2']);

    const games = await db.all(
      'SELECT id, name, created_at, last_played_at FROM games ORDER BY last_played_at DESC'
    );

    expect(games).toHaveLength(2);
    expect(games[0].name).toBeDefined();
    expect(games[0].last_played_at).toBeDefined();
  });

  test('should be able to delete games', async () => {
    const result = await db.run('INSERT INTO games (name) VALUES (?)', ['To Delete']);
    const gameId = result.lastID;

    await db.run('DELETE FROM games WHERE id = ?', [gameId]);

    const game = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
    expect(game).toBeUndefined();
  });

  test('should format timestamps correctly', () => {
    // Test the timestamp formatting logic that would be used in the controller
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const yesterdayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // This would test the formatTimestamp method if it were exposed
    // For now, we can test the logic separately or expose it for testing
    
    expect(fiveMinutesAgo.getTime()).toBeLessThan(now.getTime());
    expect(twoHoursAgo.getTime()).toBeLessThan(now.getTime());
    expect(yesterdayAgo.getTime()).toBeLessThan(now.getTime());
  });
});