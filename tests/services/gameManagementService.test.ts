import * as readline from 'readline';
import Database from '../../src/utils/database';
import { GameManagementService } from '../../src/services/gameManagementService';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import { Game } from '../../src/services/gameStateManager';

// Mock readline interface for testing
const createMockReadline = (): readline.Interface => {
  const mockRl = {
    question: jest.fn(),
    close: jest.fn(),
    removeAllListeners: jest.fn(),
    setPrompt: jest.fn(),
    prompt: jest.fn(),
    on: jest.fn(),
    input: process.stdin,
    output: process.stdout
  };
  return mockRl as any;
};

describe('GameManagementService', () => {
  let db: Database;
  let mockRl: readline.Interface;
  let gameManagementService: GameManagementService;
  let testGameId1: number;
  let testGameId2: number;
  let testGameName1: string;
  let testGameName2: string;

  beforeEach(async () => {
    // Always use in-memory database for isolation
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    // Create mock readline interface
    mockRl = createMockReadline();
    
    // Create game management service with debug logging disabled for clean test output
    gameManagementService = new GameManagementService(db, mockRl, {
      enableDebugLogging: false
    });
    
    // Ensure debug logging is disabled in environment too
    process.env.AI_DEBUG_LOGGING = 'false';

    // Create test games with unique identifiers
    testGameName1 = `GM Test Game 1 ${Date.now()}-${Math.random()}`;
    testGameName2 = `GM Test Game 2 ${Date.now()}-${Math.random()}`;
    
    testGameId1 = await createGameWithRooms(db, testGameName1);
    testGameId2 = await createGameWithRooms(db, testGameName2);
  });

  afterEach(async () => {
    if (db && db.isConnected()) {
      await db.close();
    }
    
    // Clean up environment variables that might affect tests
    delete process.env.AI_DEBUG_LOGGING;
    
    // Restore all mocks
    jest.restoreAllMocks();
  });

  describe('Constructor and Configuration', () => {
    test('should create service with default options', () => {
      const service = new GameManagementService(db, mockRl);
      const options = service.getOptions();
      
      expect(options.enableDebugLogging).toBe(false);
    });

    test('should create service with custom options', () => {
      const service = new GameManagementService(db, mockRl, { enableDebugLogging: true });
      const options = service.getOptions();
      
      expect(options.enableDebugLogging).toBe(true);
    });

    test('should update options after creation', () => {
      gameManagementService.updateOptions({ enableDebugLogging: true });
      const options = gameManagementService.getOptions();
      
      expect(options.enableDebugLogging).toBe(true);
    });
  });

  describe('Game Creation', () => {
    test('should create new game with valid name', async () => {
      const uniqueGameName = `New Game ${Date.now()}-${Math.random()}`;
      
      // Mock user input for game name
      (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
        callback(uniqueGameName);
      });

      const result = await gameManagementService.createNewGame();
      
      expect(result.success).toBe(true);
      expect(result.gameId).toBeDefined();
      expect(result.gameName).toBe(uniqueGameName);
      expect(result.error).toBeUndefined();
      
      // Verify game was actually created in database
      const game = await db.get<Game>('SELECT * FROM games WHERE id = ?', [result.gameId]);
      expect(game).toBeDefined();
      expect(game!.name).toBe(uniqueGameName);
    });

    test('should reject empty game name', async () => {
      // Mock user input with empty name
      (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
        callback('   '); // Whitespace only
      });

      const result = await gameManagementService.createNewGame();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Game name cannot be empty');
      expect(result.gameId).toBeUndefined();
    });

    test('should reject duplicate game name', async () => {
      // Mock user input with existing game name
      (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
        callback(testGameName1); // Use existing test game name
      });

      const result = await gameManagementService.createNewGame();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('A game with that name already exists. Please choose a different name.');
      expect(result.gameId).toBeUndefined();
    });

    test('should handle database errors gracefully during creation', async () => {
      // Close database to cause errors
      await db.close();
      
      // Mock user input
      (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
        callback('Test Game');
      });

      const result = await gameManagementService.createNewGame();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create new game');
    });

    test('should check if game name exists', async () => {
      const exists1 = await gameManagementService.gameNameExists(testGameName1);
      expect(exists1).toBe(true);
      
      const nonExistentName = `Non-existent ${Date.now()}`;
      const exists2 = await gameManagementService.gameNameExists(nonExistentName);
      expect(exists2).toBe(false);
    });
  });

  describe('Game Listing and Selection', () => {
    test('should get all games ordered by last played', async () => {
      const games = await gameManagementService.getAllGames();
      
      expect(games).toBeDefined();
      expect(games.length).toBeGreaterThanOrEqual(2); // At least our test games
      
      // Verify our test games are in the results
      const game1 = games.find(g => g.id === testGameId1);
      const game2 = games.find(g => g.id === testGameId2);
      
      expect(game1).toBeDefined();
      expect(game2).toBeDefined();
      expect(game1!.name).toBe(testGameName1);
      expect(game2!.name).toBe(testGameName2);
    });

    test('should handle empty game list gracefully', async () => {
      // Clear all games
      await db.run('DELETE FROM games');
      
      const games = await gameManagementService.getAllGames();
      expect(games).toEqual([]);
    });

    test('should select game for loading with valid choice', async () => {
      // Mock user input to select first game (choice "1")
      (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
        callback('1');
      });

      const result = await gameManagementService.selectGameFromList('load');
      
      expect(result.success).toBe(true);
      expect(result.game).toBeDefined();
      expect(result.cancelled).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    test('should handle cancellation during game selection', async () => {
      // Mock user input to cancel (choice "0")
      (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
        callback('0');
      });

      const result = await gameManagementService.selectGameFromList('load');
      
      expect(result.success).toBe(true);
      expect(result.cancelled).toBe(true);
      expect(result.game).toBeUndefined();
    });

    test('should handle invalid choice during game selection', async () => {
      // Mock user input with invalid choice
      (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
        callback('999'); // Invalid high number
      });

      const result = await gameManagementService.selectGameFromList('load');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid choice');
    });

    test('should handle non-numeric choice during game selection', async () => {
      // Mock user input with non-numeric choice
      (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
        callback('invalid');
      });

      const result = await gameManagementService.selectGameFromList('load');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid choice');
    });

    test('should handle empty game list during selection', async () => {
      // Clear all games
      await db.run('DELETE FROM games');

      const result = await gameManagementService.selectGameFromList('load');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No saved games found. Create a new game first.');
    });

    test('should show appropriate message for delete when no games exist', async () => {
      // Clear all games
      await db.run('DELETE FROM games');

      const result = await gameManagementService.selectGameFromList('delete');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No saved games found to delete.');
    });
  });

  describe('Game Retrieval', () => {
    test('should get game by valid ID', async () => {
      const game = await gameManagementService.getGameById(testGameId1);
      
      expect(game).toBeDefined();
      expect(game!.id).toBe(testGameId1);
      expect(game!.name).toBe(testGameName1);
    });

    test('should return null for invalid game ID', async () => {
      const game = await gameManagementService.getGameById(99999);
      expect(game).toBeNull();
    });

    test('should update last played timestamp', async () => {
      const beforeUpdate = await gameManagementService.getGameById(testGameId1);
      const originalTimestamp = beforeUpdate!.last_played_at;
      
      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const success = await gameManagementService.updateLastPlayed(testGameId1);
      expect(success).toBe(true);
      
      const afterUpdate = await gameManagementService.getGameById(testGameId1);
      expect(afterUpdate!.last_played_at).not.toBe(originalTimestamp);
    });

    test('should handle errors when updating last played', async () => {
      // Close database to cause errors
      await db.close();
      
      const success = await gameManagementService.updateLastPlayed(testGameId1);
      expect(success).toBe(false);
    });
  });

  describe('Game Deletion', () => {
    test('should delete game with confirmation', async () => {
      const testGame = await gameManagementService.getGameById(testGameId1);
      expect(testGame).toBeDefined();
      
      // Mock user confirmation
      (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
        callback('yes');
      });

      const result = await gameManagementService.deleteGameWithConfirmation(testGame!);
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      
      // Verify game was actually deleted
      const deletedGame = await gameManagementService.getGameById(testGameId1);
      expect(deletedGame).toBeNull();
    });

    test('should cancel deletion when user does not confirm', async () => {
      const testGame = await gameManagementService.getGameById(testGameId1);
      expect(testGame).toBeDefined();
      
      // Mock user cancellation
      (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
        callback('no');
      });

      const result = await gameManagementService.deleteGameWithConfirmation(testGame!);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Deletion cancelled');
      
      // Verify game still exists
      const stillExists = await gameManagementService.getGameById(testGameId1);
      expect(stillExists).toBeDefined();
    });

    test('should handle database errors during deletion', async () => {
      const testGame = await gameManagementService.getGameById(testGameId1);
      expect(testGame).toBeDefined();
      
      // Close database to cause errors
      await db.close();
      
      // Mock user confirmation
      (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
        callback('yes');
      });

      const result = await gameManagementService.deleteGameWithConfirmation(testGame!);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete game');
    });

    test('should delete all related data when deleting game', async () => {
      // Verify related data exists before deletion
      const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [testGameId1]);
      const connections = await db.all('SELECT * FROM connections WHERE game_id = ?', [testGameId1]);
      
      expect(rooms.length).toBeGreaterThan(0);
      expect(connections.length).toBeGreaterThan(0);
      
      const testGame = await gameManagementService.getGameById(testGameId1);
      
      // Mock user confirmation
      (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
        callback('yes');
      });

      await gameManagementService.deleteGameWithConfirmation(testGame!);
      
      // Verify all related data was deleted
      const remainingRooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [testGameId1]);
      const remainingConnections = await db.all('SELECT * FROM connections WHERE game_id = ?', [testGameId1]);
      const remainingGameState = await db.all('SELECT * FROM game_state WHERE game_id = ?', [testGameId1]);
      
      expect(remainingRooms.length).toBe(0);
      expect(remainingConnections.length).toBe(0);
      expect(remainingGameState.length).toBe(0);
    });
  });

  describe('Timestamp Formatting', () => {
    test('should format recent timestamp as "just now"', () => {
      const now = new Date().toISOString();
      const formatted = gameManagementService.formatTimestamp(now);
      expect(formatted).toBe('just now');
    });

    test('should format minutes ago correctly', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const formatted = gameManagementService.formatTimestamp(fiveMinutesAgo);
      expect(formatted).toBe('5 minutes ago');
    });

    test('should format single minute correctly', () => {
      const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000).toISOString();
      const formatted = gameManagementService.formatTimestamp(oneMinuteAgo);
      expect(formatted).toBe('1 minute ago');
    });

    test('should format hours ago correctly', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const formatted = gameManagementService.formatTimestamp(twoHoursAgo);
      expect(formatted).toBe('2 hours ago');
    });

    test('should format single hour correctly', () => {
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
      const formatted = gameManagementService.formatTimestamp(oneHourAgo);
      expect(formatted).toBe('1 hour ago');
    });

    test('should format days ago correctly', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const formatted = gameManagementService.formatTimestamp(threeDaysAgo);
      expect(formatted).toBe('3 days ago');
    });

    test('should format single day correctly', () => {
      const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      const formatted = gameManagementService.formatTimestamp(oneDayAgo);
      expect(formatted).toBe('1 day ago');
    });

    test('should format old dates as locale string', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const formatted = gameManagementService.formatTimestamp(twoWeeksAgo.toISOString());
      expect(formatted).toBe(twoWeeksAgo.toLocaleDateString());
    });
  });

  describe('Game Statistics', () => {
    test('should provide accurate game statistics', async () => {
      const stats = await gameManagementService.getGameStats();
      
      expect(stats.totalGames).toBeGreaterThanOrEqual(2); // At least our test games
      expect(stats.recentGames).toBeGreaterThanOrEqual(2); // Both test games are recent
      expect(stats.oldestGame).toBeDefined();
      expect(typeof stats.oldestGame).toBe('string');
    });

    test('should handle empty database for statistics', async () => {
      // Clear all games
      await db.run('DELETE FROM games');
      
      const stats = await gameManagementService.getGameStats();
      
      expect(stats.totalGames).toBe(0);
      expect(stats.recentGames).toBe(0);
      expect(stats.oldestGame).toBeUndefined();
    });

    test('should handle database errors in statistics gracefully', async () => {
      // Close database to cause errors
      await db.close();
      
      const stats = await gameManagementService.getGameStats();
      
      expect(stats.totalGames).toBe(0);
      expect(stats.recentGames).toBe(0);
      expect(stats.oldestGame).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      // Close database to simulate connection issues
      await db.close();
      
      const games = await gameManagementService.getAllGames();
      expect(games).toEqual([]);
      
      const game = await gameManagementService.getGameById(testGameId1);
      expect(game).toBeNull();
      
      const exists = await gameManagementService.gameNameExists('any name');
      expect(exists).toBe(false);
    });

    test('should handle readline interface errors gracefully', async () => {
      // Mock readline to throw error
      (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
        throw new Error('Readline error');
      });

      const result = await gameManagementService.createNewGame();
      expect(result.success).toBe(false);
    });
  });

  describe('Integration with Environment Variables', () => {
    test('should work with debug logging enabled', async () => {
      process.env.AI_DEBUG_LOGGING = 'true';
      
      const service = new GameManagementService(db, mockRl, { enableDebugLogging: false });
      
      // Should work normally even with debug logging
      const games = await service.getAllGames();
      expect(games).toBeDefined();
    });

    test('should handle missing environment variables gracefully', async () => {
      // Remove debug logging environment variable
      delete process.env.AI_DEBUG_LOGGING;
      
      // Should use default configuration and not crash
      const games = await gameManagementService.getAllGames();
      expect(games).toBeDefined();
    });
  });
});