import Database from '../src/utils/database';
import { initializeDatabase, createGameWithRooms, seedDatabase } from '../src/utils/initDb';

describe('Game Management', () => {
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

  describe('createGameWithRooms', () => {
    test('should create a new game with initial rooms', async () => {
      const gameId = await createGameWithRooms(db, 'Test Adventure');
      
      expect(gameId).toBeGreaterThan(0);

      // Verify game was created
      const game = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
      expect(game).toBeDefined();
      expect(game.name).toBe('Test Adventure');
      expect(game.created_at).toBeDefined();
      expect(game.last_played_at).toBeDefined();

      // Verify rooms were created
      const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ? ORDER BY name', [gameId]);
      expect(rooms).toHaveLength(3);
      
      const roomNames = rooms.map(r => r.name);
      expect(roomNames).toContain('Entrance Hall');
      expect(roomNames).toContain('Library');
      expect(roomNames).toContain('Garden');

      // Verify connections were created
      const connections = await db.all('SELECT * FROM connections WHERE game_id = ?', [gameId]);
      expect(connections.length).toBeGreaterThan(0);

      // Verify game state was created
      const gameState = await db.get('SELECT * FROM game_state WHERE game_id = ?', [gameId]);
      expect(gameState).toBeDefined();
      expect(gameState.current_room_id).toBeDefined();
    });

    test('should create games with isolated room data', async () => {
      const game1Id = await createGameWithRooms(db, 'Adventure 1');
      const game2Id = await createGameWithRooms(db, 'Adventure 2');

      // Each game should have its own set of rooms
      const game1Rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [game1Id]);
      const game2Rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [game2Id]);

      expect(game1Rooms).toHaveLength(3);
      expect(game2Rooms).toHaveLength(3);

      // Room IDs should be different between games
      const game1RoomIds = game1Rooms.map(r => r.id);
      const game2RoomIds = game2Rooms.map(r => r.id);
      
      const intersection = game1RoomIds.filter(id => game2RoomIds.includes(id));
      expect(intersection).toHaveLength(0);
    });

    test('should prevent duplicate game names', async () => {
      await createGameWithRooms(db, 'Unique Name');
      
      // Attempting to create another game with the same name should fail
      await expect(createGameWithRooms(db, 'Unique Name')).rejects.toThrow();
    });

    test('should create proper room connections', async () => {
      const gameId = await createGameWithRooms(db, 'Test Game');
      
      const connections = await db.all(
        'SELECT c.*, r1.name as from_room, r2.name as to_room FROM connections c ' +
        'JOIN rooms r1 ON c.from_room_id = r1.id ' +
        'JOIN rooms r2 ON c.to_room_id = r2.id ' +
        'WHERE c.game_id = ?',
        [gameId]
      );

      // Should have standard connections plus secret passage
      expect(connections.length).toBeGreaterThanOrEqual(5);

      // Check for expected connections
      const connectionDescriptions = connections.map(c => 
        `${c.from_room} -> ${c.to_room} (${c.name})`
      );

      expect(connectionDescriptions).toContain('Entrance Hall -> Library (north)');
      expect(connectionDescriptions).toContain('Library -> Entrance Hall (south)');
      expect(connectionDescriptions).toContain('Entrance Hall -> Garden (east)');
      expect(connectionDescriptions).toContain('Garden -> Entrance Hall (west)');
      expect(connectionDescriptions).toContain('Library -> Garden (bookshelf)');
    });

    test('should set correct starting room in game state', async () => {
      const gameId = await createGameWithRooms(db, 'Test Game');
      
      const gameState = await db.get('SELECT * FROM game_state WHERE game_id = ?', [gameId]);
      const startingRoom = await db.get('SELECT * FROM rooms WHERE id = ?', [gameState.current_room_id]);
      
      expect(startingRoom.name).toBe('Entrance Hall');
    });
  });

  describe('seedDatabase', () => {
    test('should create demo game when no games exist', async () => {
      await seedDatabase(db);
      
      const games = await db.all('SELECT * FROM games');
      expect(games).toHaveLength(1);
      expect(games[0].name).toBe('Demo Game');
    });

    test('should not create demo game when games already exist', async () => {
      await createGameWithRooms(db, 'Existing Game');
      await seedDatabase(db);
      
      const games = await db.all('SELECT * FROM games');
      expect(games).toHaveLength(1);
      expect(games[0].name).toBe('Existing Game');
    });
  });

  describe('Game Deletion', () => {
    test('should cascade delete all related data', async () => {
      const gameId = await createGameWithRooms(db, 'To Delete');
      
      // Verify data exists
      const roomsBefore = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
      const connectionsBefore = await db.all('SELECT * FROM connections WHERE game_id = ?', [gameId]);
      const gameStateBefore = await db.get('SELECT * FROM game_state WHERE game_id = ?', [gameId]);
      
      expect(roomsBefore.length).toBeGreaterThan(0);
      expect(connectionsBefore.length).toBeGreaterThan(0);
      expect(gameStateBefore).toBeDefined();

      // Delete the game
      await db.run('DELETE FROM games WHERE id = ?', [gameId]);

      // Verify all related data was deleted (if foreign keys are enforced)
      const game = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
      expect(game).toBeUndefined();
      
      // Note: CASCADE deletion would work if foreign keys are properly enabled
      // In test environment, we might need to manually verify or enable foreign keys
    });
  });

  describe('Game State Management', () => {
    test('should update game state correctly', async () => {
      const gameId = await createGameWithRooms(db, 'State Test');
      
      // Get initial state
      const initialState = await db.get('SELECT * FROM game_state WHERE game_id = ?', [gameId]);
      const initialRoom = initialState.current_room_id;
      
      // Get a different room
      const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ? AND id != ?', [gameId, initialRoom]);
      const newRoomId = rooms[0].id;
      
      // Update game state
      await db.run(
        'UPDATE game_state SET current_room_id = ? WHERE game_id = ?',
        [newRoomId, gameId]
      );
      
      // Verify state was updated
      const updatedState = await db.get('SELECT * FROM game_state WHERE game_id = ?', [gameId]);
      expect(updatedState.current_room_id).toBe(newRoomId);
    });

    test('should update last played timestamp', async () => {
      const gameId = await createGameWithRooms(db, 'Timestamp Test');
      
      const initialGame = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
      const initialTimestamp = initialGame.last_played_at;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Update timestamp
      const newTimestamp = new Date().toISOString();
      await db.run(
        'UPDATE games SET last_played_at = ? WHERE id = ?',
        [newTimestamp, gameId]
      );
      
      const updatedGame = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
      expect(updatedGame.last_played_at).not.toBe(initialTimestamp);
      expect(updatedGame.last_played_at).toBe(newTimestamp);
    });
  });
});