import { GameStateManager, Mode, GameState, Room, Connection, Game } from '../../src/services/gameStateManager';
import Database from '../../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';

describe('GameStateManager', () => {
  let db: Database;
  let gameStateManager: GameStateManager;
  let testGameId: number;
  let testRoomId: number;

  beforeEach(async () => {
    // Create in-memory database for testing
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);

    // Create game state manager
    gameStateManager = new GameStateManager(db, {
      enableDebugLogging: false // Disable for cleaner test output
    });

    // Create a test game with rooms
    const uniqueGameName = `Test Game ${Date.now()}-${Math.random()}`;
    testGameId = await createGameWithRooms(db, uniqueGameName);

    // Get the starting room ID
    const gameState = await db.get<GameState>(
      'SELECT current_room_id FROM game_state WHERE game_id = ?',
      [testGameId]
    );
    testRoomId = gameState!.current_room_id;
  });

  afterEach(async () => {
    if (db.isConnected()) {
      await db.close();
    }
  });

  describe('Session Management', () => {
    test('should start with menu mode and no active session', () => {
      const session = gameStateManager.getCurrentSession();
      
      expect(session.mode).toBe('menu');
      expect(session.gameId).toBeNull();
      expect(session.roomId).toBeNull();
      expect(gameStateManager.isInGame()).toBe(false);
    });

    test('should start game session successfully', async () => {
      await gameStateManager.startGameSession(testGameId);
      
      const session = gameStateManager.getCurrentSession();
      expect(session.mode).toBe('game');
      expect(session.gameId).toBe(testGameId);
      expect(session.roomId).toBe(testRoomId);
      expect(gameStateManager.isInGame()).toBe(true);
    });

    test('should fail to start session with invalid game ID', async () => {
      await expect(gameStateManager.startGameSession(99999))
        .rejects.toThrow('No game state found for game ID 99999');
    });

    test('should end game session and return to menu', async () => {
      await gameStateManager.startGameSession(testGameId);
      expect(gameStateManager.isInGame()).toBe(true);
      
      await gameStateManager.endGameSession();
      
      const session = gameStateManager.getCurrentSession();
      expect(session.mode).toBe('menu');
      expect(session.gameId).toBeNull();
      expect(session.roomId).toBeNull();
      expect(gameStateManager.isInGame()).toBe(false);
    });

    test('should save game state when ending session', async () => {
      await gameStateManager.startGameSession(testGameId);
      
      // Get initial timestamp
      const initialGame = await db.get<Game>('SELECT last_played_at FROM games WHERE id = ?', [testGameId]);
      
      // Wait a moment and end session
      await new Promise(resolve => setTimeout(resolve, 10));
      await gameStateManager.endGameSession();
      
      // Check that timestamp was updated
      const updatedGame = await db.get<Game>('SELECT last_played_at FROM games WHERE id = ?', [testGameId]);
      expect(updatedGame!.last_played_at).not.toBe(initialGame!.last_played_at);
    });
  });

  describe('Room Navigation', () => {
    beforeEach(async () => {
      await gameStateManager.startGameSession(testGameId);
    });

    test('should move to a different room', async () => {
      // Create a second room
      const roomResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [testGameId, 'Second Room', 'A second test room']
      );
      const newRoomId = roomResult.lastID!;

      await gameStateManager.moveToRoom(newRoomId);
      
      const session = gameStateManager.getCurrentSession();
      expect(session.roomId).toBe(newRoomId);
    });

    test('should fail to move room when not in game', async () => {
      await gameStateManager.endGameSession();
      
      await expect(gameStateManager.moveToRoom(123))
        .rejects.toThrow('Cannot move rooms: not in game session');
    });

    test('should save state when moving rooms', async () => {
      // Create a second room
      const roomResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [testGameId, 'Second Room', 'A second test room']
      );
      const newRoomId = roomResult.lastID!;

      await gameStateManager.moveToRoom(newRoomId);
      
      // Verify database was updated
      const gameState = await db.get<GameState>(
        'SELECT current_room_id FROM game_state WHERE game_id = ?',
        [testGameId]
      );
      expect(gameState!.current_room_id).toBe(newRoomId);
    });
  });

  describe('Game State Persistence', () => {
    test('should save game state successfully', async () => {
      await gameStateManager.startGameSession(testGameId);
      
      const initialGame = await db.get<Game>('SELECT last_played_at FROM games WHERE id = ?', [testGameId]);
      
      await new Promise(resolve => setTimeout(resolve, 10));
      await gameStateManager.saveGameState();
      
      const updatedGame = await db.get<Game>('SELECT last_played_at FROM games WHERE id = ?', [testGameId]);
      expect(updatedGame!.last_played_at).not.toBe(initialGame!.last_played_at);
    });

    test('should handle save when not in game gracefully', async () => {
      // Should not throw error
      await gameStateManager.saveGameState();
      
      // Verify it was logged (we can't easily test console output, so just ensure no crash)
      expect(gameStateManager.isInGame()).toBe(false);
    });
  });

  describe('Room Information', () => {
    beforeEach(async () => {
      await gameStateManager.startGameSession(testGameId);
    });

    test('should get current room information', async () => {
      const room = await gameStateManager.getCurrentRoom();
      
      expect(room).not.toBeNull();
      expect(room!.id).toBe(testRoomId);
      expect(room!.game_id).toBe(testGameId);
      expect(room!.name).toBeDefined();
      expect(room!.description).toBeDefined();
    });

    test('should return null when not in game', async () => {
      await gameStateManager.endGameSession();
      
      const room = await gameStateManager.getCurrentRoom();
      expect(room).toBeNull();
    });

    test('should get room connections', async () => {
      const connections = await gameStateManager.getCurrentRoomConnections();
      
      // The createGameWithRooms function creates connections automatically
      expect(connections.length).toBeGreaterThan(0);
      expect(connections[0]).toHaveProperty('direction');
      expect(connections[0]).toHaveProperty('name');
      expect(connections[0].from_room_id).toBe(testRoomId);
    });

    test('should return empty array when not in game', async () => {
      await gameStateManager.endGameSession();
      
      const connections = await gameStateManager.getCurrentRoomConnections();
      expect(connections).toEqual([]);
    });

    test('should find connection by direction', async () => {
      // Get existing connections created by createGameWithRooms
      const connections = await gameStateManager.getCurrentRoomConnections();
      expect(connections.length).toBeGreaterThan(0);
      
      const firstConnection = connections[0];
      const connection = await gameStateManager.findConnection(firstConnection.direction);
      
      expect(connection).not.toBeNull();
      expect(connection!.direction).toBe(firstConnection.direction);
      expect(connection!.to_room_id).toBe(firstConnection.to_room_id);
    });

    test('should find connection by thematic name', async () => {
      // Get existing connections created by createGameWithRooms
      const connections = await gameStateManager.getCurrentRoomConnections();
      expect(connections.length).toBeGreaterThan(0);
      
      const firstConnection = connections[0];
      const connection = await gameStateManager.findConnection(firstConnection.name);
      
      expect(connection).not.toBeNull();
      expect(connection!.name).toBe(firstConnection.name);
      expect(connection!.direction).toBe(firstConnection.direction);
    });

    test('should handle case-insensitive connection search', async () => {
      // Get existing connections created by createGameWithRooms
      const connections = await gameStateManager.getCurrentRoomConnections();
      expect(connections.length).toBeGreaterThan(0);
      
      const firstConnection = connections[0];
      
      // Test case-insensitive search on direction
      const connection1 = await gameStateManager.findConnection(firstConnection.direction.toUpperCase());
      // Test case-insensitive search on name
      const connection2 = await gameStateManager.findConnection(firstConnection.name.toLowerCase());
      
      expect(connection1).not.toBeNull();
      expect(connection2).not.toBeNull();
      expect(connection1!.direction).toBe(firstConnection.direction);
      expect(connection2!.name).toBe(firstConnection.name);
    });

    test('should return null for non-existent connection', async () => {
      const connection = await gameStateManager.findConnection('nonexistent');
      expect(connection).toBeNull();
    });
  });

  describe('Command History', () => {
    test('should add recent commands', () => {
      gameStateManager.addRecentCommand('look');
      gameStateManager.addRecentCommand('go north');
      
      const commands = gameStateManager.getRecentCommands();
      expect(commands).toEqual(['go north', 'look']);
    });

    test('should limit recent commands to 5', () => {
      for (let i = 1; i <= 7; i++) {
        gameStateManager.addRecentCommand(`command ${i}`);
      }
      
      const commands = gameStateManager.getRecentCommands();
      expect(commands).toHaveLength(5);
      expect(commands).toEqual([
        'command 7',
        'command 6', 
        'command 5',
        'command 4',
        'command 3'
      ]);
    });

    test('should clear commands when ending session', async () => {
      gameStateManager.addRecentCommand('test command');
      await gameStateManager.startGameSession(testGameId);
      
      expect(gameStateManager.getRecentCommands()).toEqual(['test command']);
      
      await gameStateManager.endGameSession();
      expect(gameStateManager.getRecentCommands()).toEqual([]);
    });
  });

  describe('Game Context Building', () => {
    test('should build menu context', async () => {
      const context = await gameStateManager.buildGameContext();
      
      expect(context.mode).toBe('menu');
      expect(context.currentRoom).toBeUndefined();
      expect(context.gameId).toBeUndefined();
      expect(context.recentCommands).toEqual([]);
    });

    test('should build game context with room information', async () => {
      await gameStateManager.startGameSession(testGameId);
      gameStateManager.addRecentCommand('look');
      
      const context = await gameStateManager.buildGameContext();
      
      expect(context.mode).toBe('game');
      expect(context.gameId).toBe(testGameId);
      expect(context.currentRoom).toBeDefined();
      expect(context.currentRoom!.id).toBe(testRoomId);
      expect(context.recentCommands).toEqual(['look']);
    });

    test('should include room connections in context', async () => {
      await gameStateManager.startGameSession(testGameId);
      
      const context = await gameStateManager.buildGameContext();
      
      // Check that connections exist (createGameWithRooms creates them automatically)
      expect(context.currentRoom!.availableExits.length).toBeGreaterThan(0);
      expect(context.currentRoom!.thematicExits).toBeDefined();
      expect(context.currentRoom!.thematicExits!.length).toBeGreaterThan(0);
      
      // Verify structure of thematic exits
      const firstExit = context.currentRoom!.thematicExits![0];
      expect(firstExit).toHaveProperty('direction');
      expect(firstExit).toHaveProperty('name');
    });
  });

  describe('Game Information', () => {
    test('should get game by ID', async () => {
      const game = await gameStateManager.getGame(testGameId);
      
      expect(game).not.toBeNull();
      expect(game!.id).toBe(testGameId);
      expect(game!.name).toBeDefined();
    });

    test('should return null for non-existent game', async () => {
      const game = await gameStateManager.getGame(99999);
      expect(game).toBeNull();
    });

    test('should get all games', async () => {
      const games = await gameStateManager.getAllGames();
      
      // Should include at least our test game
      expect(games.length).toBeGreaterThanOrEqual(1);
      
      // Find our test game in the results
      const testGame = games.find(game => game.id === testGameId);
      expect(testGame).toBeDefined();
      expect(testGame!.id).toBe(testGameId);
    });
  });

  describe('Statistics and Utilities', () => {
    test('should return session statistics', () => {
      const stats = gameStateManager.getSessionStats();
      
      expect(stats.currentGameId).toBeNull();
      expect(stats.currentRoomId).toBeNull();
      expect(stats.mode).toBe('menu');
      expect(stats.recentCommandCount).toBe(0);
      expect(stats.isInActiveSession).toBe(false);
    });

    test('should return active session statistics', async () => {
      await gameStateManager.startGameSession(testGameId);
      gameStateManager.addRecentCommand('test');
      
      const stats = gameStateManager.getSessionStats();
      
      expect(stats.currentGameId).toBe(testGameId);
      expect(stats.currentRoomId).toBe(testRoomId);
      expect(stats.mode).toBe('game');
      expect(stats.recentCommandCount).toBe(1);
      expect(stats.isInActiveSession).toBe(true);
    });

    test('should update options', () => {
      gameStateManager.updateOptions({ enableDebugLogging: true });
      
      // Can't directly test private property, but ensure no errors
      expect(gameStateManager).toBeDefined();
    });

    test('should reset session', async () => {
      await gameStateManager.startGameSession(testGameId);
      gameStateManager.addRecentCommand('test');
      
      gameStateManager.resetSession();
      
      const session = gameStateManager.getCurrentSession();
      expect(session.mode).toBe('menu');
      expect(session.gameId).toBeNull();
      expect(session.roomId).toBeNull();
      expect(gameStateManager.getRecentCommands()).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Close database to cause errors
      await db.close();
      
      const room = await gameStateManager.getCurrentRoom();
      expect(room).toBeNull();
      
      const connections = await gameStateManager.getCurrentRoomConnections();
      expect(connections).toEqual([]);
      
      const connection = await gameStateManager.findConnection('north');
      expect(connection).toBeNull();
    });

    test('should handle context building errors gracefully', async () => {
      await gameStateManager.startGameSession(testGameId);
      await db.close();
      
      const context = await gameStateManager.buildGameContext();
      
      expect(context.mode).toBe('game');
      expect(context.currentRoom).toBeUndefined();
    });
  });
});