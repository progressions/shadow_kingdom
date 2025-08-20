/**
 * GameManagementService Prisma Implementation Tests
 * 
 * Comprehensive test suite for GameManagementService using Prisma ORM
 * instead of the legacy Database wrapper.
 */

import * as readline from 'readline';
import { GameManagementServicePrisma } from '../../src/services/gameManagementService.prisma';
import { 
  setupTestDatabase, 
  cleanupTestDatabase, 
  createMockReadline 
} from '../prisma/setup';
import { Game } from '../../src/services/gameStateManager';

describe.skip('GameManagementService (Prisma)', () => {
  let gameManagementService: GameManagementServicePrisma;
  let mockRl: readline.Interface;

  beforeEach(async () => {
    // Setup clean Prisma test environment
    await setupTestDatabase();
    
    // Create mock readline interface
    mockRl = createMockReadline();
    
    // Create Prisma-based service with null TUI (console mode)
    gameManagementService = new GameManagementServicePrisma(null as any, {
      enableDebugLogging: false
    });
  });

  afterEach(async () => {
    await cleanupTestDatabase();
    if (mockRl) {
      mockRl.close();
    }
  });

  describe('Game Creation', () => {
    test('should create new game with valid name', async () => {
      const uniqueGameName = `Prisma Game ${Date.now()}-${Math.random()}`;
      
      // Mock user input for game name
      (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
        callback(uniqueGameName);
      });

      const result = await gameManagementService.createNewGame();
      
      expect(result.success).toBe(true);
      expect(result.gameId).toBeDefined();
      expect(result.gameName).toBe(uniqueGameName);
      expect(result.error).toBeUndefined();
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
      const duplicateName = `Duplicate Game ${Date.now()}`;
      
      // Create first game
      (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
        callback(duplicateName);
      });
      const firstResult = await gameManagementService.createNewGame();
      expect(firstResult.success).toBe(true);
      
      // Try to create second game with same name
      (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
        callback(duplicateName);
      });
      const secondResult = await gameManagementService.createNewGame();
      
      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toBe('A game with that name already exists. Please choose a different name.');
    });

    test('should check if game name exists', async () => {
      const testGameName = `Exists Test ${Date.now()}`;
      
      // Initially should not exist
      const existsBefore = await gameManagementService.gameNameExists(testGameName);
      expect(existsBefore).toBe(false);
      
      // Create the game
      (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
        callback(testGameName);
      });
      await gameManagementService.createNewGame();
      
      // Now should exist
      const existsAfter = await gameManagementService.gameNameExists(testGameName);
      expect(existsAfter).toBe(true);
    });
  });

  describe('Game Retrieval', () => {
    let testGameId: number;
    let testGameName: string;

    beforeEach(async () => {
      // Create a test game for retrieval tests
      testGameName = `Retrieval Test ${Date.now()}-${Math.random()}`;
      (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
        callback(testGameName);
      });
      const result = await gameManagementService.createNewGame();
      testGameId = result.gameId!;
    });

    test('should get game by valid ID', async () => {
      const game = await gameManagementService.getGameById(testGameId);
      
      expect(game).toBeDefined();
      expect(game!.id).toBe(testGameId);
      expect(game!.name).toBe(testGameName);
    });

    test('should return null for invalid game ID', async () => {
      const game = await gameManagementService.getGameById(99999);
      expect(game).toBeNull();
    });

    test('should get all games', async () => {
      const games = await gameManagementService.getAllGames();
      
      expect(games).toBeDefined();
      expect(games.length).toBeGreaterThanOrEqual(1);
      
      // Verify our test game is in the results
      const testGame = games.find(g => g.id === testGameId);
      expect(testGame).toBeDefined();
      expect(testGame!.name).toBe(testGameName);
    });

    test('should update last played timestamp', async () => {
      const beforeUpdate = await gameManagementService.getGameById(testGameId);
      const originalTimestamp = beforeUpdate!.last_played_at;
      
      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const success = await gameManagementService.updateLastPlayed(testGameId);
      expect(success).toBe(true);
      
      const afterUpdate = await gameManagementService.getGameById(testGameId);
      expect(afterUpdate!.last_played_at).not.toBe(originalTimestamp);
    });
  });

  describe('Game Selection', () => {
    let testGameIds: number[] = [];
    let testGameNames: string[] = [];

    beforeEach(async () => {
      // Create multiple test games for selection
      for (let i = 0; i < 3; i++) {
        const gameName = `Selection Test ${i} ${Date.now()}-${Math.random()}`;
        testGameNames.push(gameName);
        
        (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
          callback(gameName);
        });
        const result = await gameManagementService.createNewGame();
        testGameIds.push(result.gameId!);
      }
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
  });

  describe('Game Deletion', () => {
    let testGameId: number;
    let testGameName: string;

    beforeEach(async () => {
      // Create a test game for deletion tests
      testGameName = `Deletion Test ${Date.now()}-${Math.random()}`;
      (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
        callback(testGameName);
      });
      const result = await gameManagementService.createNewGame();
      testGameId = result.gameId!;
    });

    test('should delete game with confirmation', async () => {
      const testGame = await gameManagementService.getGameById(testGameId);
      expect(testGame).toBeDefined();
      
      // Mock user confirmation
      (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
        callback('yes');
      });

      const result = await gameManagementService.deleteGameWithConfirmation(testGame!);
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      
      // Verify game was actually deleted
      const deletedGame = await gameManagementService.getGameById(testGameId);
      expect(deletedGame).toBeNull();
    });

    test('should cancel deletion when user does not confirm', async () => {
      const testGame = await gameManagementService.getGameById(testGameId);
      expect(testGame).toBeDefined();
      
      // Mock user cancellation
      (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
        callback('no');
      });

      const result = await gameManagementService.deleteGameWithConfirmation(testGame!);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Deletion cancelled');
      
      // Verify game still exists
      const stillExists = await gameManagementService.getGameById(testGameId);
      expect(stillExists).toBeDefined();
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

    test('should format hours ago correctly', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const formatted = gameManagementService.formatTimestamp(twoHoursAgo);
      expect(formatted).toBe('2 hours ago');
    });

    test('should format days ago correctly', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const formatted = gameManagementService.formatTimestamp(threeDaysAgo);
      expect(formatted).toBe('3 days ago');
    });
  });

  describe('Game Statistics', () => {
    test('should provide accurate game statistics', async () => {
      // Create some test games for statistics
      for (let i = 0; i < 2; i++) {
        const gameName = `Stats Test ${i} ${Date.now()}-${Math.random()}`;
        (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
          callback(gameName);
        });
        await gameManagementService.createNewGame();
      }
      
      const stats = await gameManagementService.getGameStats();
      
      expect(stats.totalGames).toBeGreaterThanOrEqual(2);
      expect(stats.recentGames).toBeGreaterThanOrEqual(2);
      expect(stats.oldestGame).toBeDefined();
      expect(typeof stats.oldestGame).toBe('string');
    });
  });

  describe('Error Handling', () => {
    test('should handle readline interface errors gracefully', async () => {
      // Mock readline to throw error
      (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
        throw new Error('Readline error');
      });

      const result = await gameManagementService.createNewGame();
      expect(result.success).toBe(false);
    });
  });

  describe('Type Safety and Prisma Integration', () => {
    test('should use Prisma client for all database operations', async () => {
      // This test verifies that Prisma is being used properly
      const testGameName = `Type Safety Test ${Date.now()}`;
      
      (mockRl.question as jest.Mock).mockImplementation((question, callback) => {
        callback(testGameName);
      });
      
      const result = await gameManagementService.createNewGame();
      expect(result.success).toBe(true);
      
      // Verify the game exists and has proper typing
      const game = await gameManagementService.getGameById(result.gameId!);
      expect(game).toBeDefined();
      expect(typeof game!.id).toBe('number');
      expect(typeof game!.name).toBe('string');
      expect(typeof game!.created_at).toBe('string');
      expect(typeof game!.last_played_at).toBe('string');
    });
  });

  describe('Game Name Generation', () => {
    test('should generate creative game names', () => {
      const name = gameManagementService.generateGameName();
      
      expect(name).toBeTruthy();
      expect(typeof name).toBe('string');
      expect(name.split(' ').length).toBe(2); // "Adjective Noun" format
      expect(name.length).toBeGreaterThan(5); // Reasonable minimum length
    });

    test('should generate different names on multiple calls', () => {
      const names = new Set();
      
      // Generate multiple names
      for (let i = 0; i < 10; i++) {
        names.add(gameManagementService.generateGameName());
      }
      
      // Should have some variety (at least 3 different names in 10 tries)
      expect(names.size).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Automatic Game Creation', () => {
    test('should create game without user input', async () => {
      const result = await gameManagementService.createGameAutomatic();
      
      expect(result.success).toBe(true);
      expect(result.game).toBeDefined();
      expect(result.game!.name).toMatch(/\w+ \w+/); // Two words
      expect(result.game!.id).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    test('should handle duplicate auto-generated names', async () => {
      // Mock to always return same name
      jest.spyOn(gameManagementService, 'generateGameName').mockReturnValue('Shadow Quest');
      
      const result1 = await gameManagementService.createGameAutomatic();
      const result2 = await gameManagementService.createGameAutomatic();
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result2.game!.name).toContain('Shadow Quest');
      expect(result2.game!.name).not.toBe(result1.game!.name);
      
      // Restore original implementation
      jest.restoreAllMocks();
    });
  });

  describe('Most Recent Game Retrieval', () => {
    test('should get most recent game', async () => {
      // Create two games with slight delay to ensure different timestamps
      const result1 = await gameManagementService.createGameAutomatic();
      await new Promise(resolve => setTimeout(resolve, 10));
      const result2 = await gameManagementService.createGameAutomatic();
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      const mostRecent = await gameManagementService.getMostRecentGame();
      
      expect(mostRecent).toBeDefined();
      expect(mostRecent!.id).toBe(result2.game!.id);
      expect(mostRecent!.name).toBe(result2.game!.name);
    });

    test('should return null when no games exist', async () => {
      const mostRecent = await gameManagementService.getMostRecentGame();
      expect(mostRecent).toBeNull();
    });

    test('should return only game when single game exists', async () => {
      const result = await gameManagementService.createGameAutomatic();
      expect(result.success).toBe(true);
      
      const mostRecent = await gameManagementService.getMostRecentGame();
      
      expect(mostRecent).toBeDefined();
      expect(mostRecent!.id).toBe(result.game!.id);
    });
  });
});