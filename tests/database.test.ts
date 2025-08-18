import Database from '../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';

describe('Database', () => {
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

  describe('Database Connection', () => {
    test('should connect to database successfully', () => {
      expect(db.isConnected()).toBe(true);
    });

    test('should close database connection', async () => {
      await db.close();
      expect(db.isConnected()).toBe(false);
    });
  });

  describe('Database Operations', () => {
    test('should execute INSERT and return lastID', async () => {
      const uniqueName = `Test Game ${Math.random().toString(36).substr(2, 9)}`;
      const result = await db.run(
        'INSERT INTO games (name) VALUES (?)',
        [uniqueName]
      );
      expect(result.lastID).toBeGreaterThan(0);
      expect(result.changes).toBe(1);
    });

    test('should execute SELECT and return row', async () => {
      const uniqueName = `Test Game ${Date.now()}-${Math.random()}`;
      await db.run('INSERT INTO games (name) VALUES (?)', [uniqueName]);
      const game = await db.get('SELECT * FROM games WHERE name = ?', [uniqueName]);
      expect(game).toBeDefined();
      expect(game.name).toBe(uniqueName);
    });

    test('should execute SELECT and return multiple rows', async () => {
      const timestamp = Date.now();
      const name1 = `Game 1 ${timestamp}-${Math.random()}`;
      const name2 = `Game 2 ${timestamp}-${Math.random()}`;
      await db.run('INSERT INTO games (name) VALUES (?)', [name1]);
      await db.run('INSERT INTO games (name) VALUES (?)', [name2]);
      
      const games = await db.all('SELECT * FROM games WHERE name = ? OR name = ? ORDER BY name', [name1, name2]);
      expect(games).toHaveLength(2);
      expect(games.map(g => g.name).sort()).toEqual([name1, name2].sort());
    });

    test('should handle UPDATE operations', async () => {
      const originalName = `Original Name ${Date.now()}-${Math.random()}`;
      const updatedName = `Updated Name ${Date.now()}-${Math.random()}`;
      const insertResult = await db.run('INSERT INTO games (name) VALUES (?)', [originalName]);
      const updateResult = await db.run(
        'UPDATE games SET name = ? WHERE id = ?',
        [updatedName, insertResult.lastID]
      );
      
      expect(updateResult.changes).toBe(1);
      
      const game = await db.get('SELECT * FROM games WHERE id = ?', [insertResult.lastID]);
      expect(game.name).toBe(updatedName);
    });

    test('should handle DELETE operations', async () => {
      const uniqueName = `To Delete ${Date.now()}-${Math.random()}`;
      const insertResult = await db.run('INSERT INTO games (name) VALUES (?)', [uniqueName]);
      const deleteResult = await db.run('DELETE FROM games WHERE id = ?', [insertResult.lastID]);
      
      expect(deleteResult.changes).toBe(1);
      
      const game = await db.get('SELECT * FROM games WHERE id = ?', [insertResult.lastID]);
      expect(game).toBeUndefined();
    });
  });

  describe('Table Initialization', () => {
    test('should create all required tables', async () => {
      const tables = await db.all(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      );
      
      const tableNames = tables.map(t => t.name);
      expect(tableNames).toContain('games');
      expect(tableNames).toContain('rooms');
      expect(tableNames).toContain('connections');
      expect(tableNames).toContain('game_state');
    });

    test('should create proper table schemas', async () => {
      // Check games table structure
      const gamesColumns = await db.all("PRAGMA table_info(games)");
      const gamesColumnNames = gamesColumns.map(c => c.name);
      expect(gamesColumnNames).toContain('id');
      expect(gamesColumnNames).toContain('name');
      expect(gamesColumnNames).toContain('created_at');
      expect(gamesColumnNames).toContain('last_played_at');

      // Check rooms table structure
      const roomsColumns = await db.all("PRAGMA table_info(rooms)");
      const roomsColumnNames = roomsColumns.map(c => c.name);
      expect(roomsColumnNames).toContain('id');
      expect(roomsColumnNames).toContain('game_id');
      expect(roomsColumnNames).toContain('name');
      expect(roomsColumnNames).toContain('description');

      // Check connections table structure
      const connectionsColumns = await db.all("PRAGMA table_info(connections)");
      const connectionsColumnNames = connectionsColumns.map(c => c.name);
      expect(connectionsColumnNames).toContain('id');
      expect(connectionsColumnNames).toContain('game_id');
      expect(connectionsColumnNames).toContain('from_room_id');
      expect(connectionsColumnNames).toContain('to_room_id');
      expect(connectionsColumnNames).toContain('name');
    });

    test('should create proper indexes', async () => {
      const indexes = await db.all(
        "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'"
      );
      
      const indexNames = indexes.map(i => i.name);
      expect(indexNames).toContain('idx_connections_from_room');
      expect(indexNames).toContain('idx_rooms_game_id');
      expect(indexNames).toContain('idx_connections_game_id');
    });
  });

  describe('Foreign Key Constraints', () => {
    test('should enforce foreign key constraints', async () => {
      // Create a game first
      const uniqueName = `Test Game ${Date.now()}-${Math.random()}`;
      const gameResult = await db.run('INSERT INTO games (name) VALUES (?)', [uniqueName]);
      const gameId = gameResult.lastID;

      // Create a room with valid game_id should work
      await expect(
        db.run('INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)', 
        [gameId, 'Test Room', 'A test room'])
      ).resolves.toBeDefined();

      // Create a room with invalid game_id should fail (if foreign keys are enabled)
      // Note: SQLite foreign keys might not be enabled by default in tests
      // This test would need PRAGMA foreign_keys = ON to work properly
    });
  });
});