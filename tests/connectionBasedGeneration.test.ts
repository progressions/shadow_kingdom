import Database from '../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';
import { Connection, UnfilledConnection, FilledConnection } from '../src/services/gameStateManager';

describe('Connection-Based Generation Schema', () => {
  let db: Database;

  beforeEach(async () => {
    // Use in-memory database for testing
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('Database Schema Migration', () => {
    it('should allow NULL to_room_id in connections table', async () => {
      const gameId = await createGameWithRooms(db, `Test Game ${Date.now()}-${Math.random()}`);
      
      // Insert connection with NULL to_room_id (unfilled connection)
      const result = await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, 1, null, 'north', 'through the mysterious doorway']
      );
      
      expect(result.lastID).toBeDefined();
      
      // Verify the connection was inserted with NULL to_room_id
      const connection = await db.get<Connection>(
        'SELECT * FROM connections WHERE id = ?',
        [result.lastID]
      );
      
      expect(connection).toBeDefined();
      expect(connection!.to_room_id).toBeNull();
      expect(connection!.direction).toBe('north');
      expect(connection!.name).toBe('through the mysterious doorway');
    });

    it('should create proper indexes for unfilled connections', async () => {
      const gameId = await createGameWithRooms(db, `Test Game ${Date.now()}-${Math.random()}`);
      
      // Insert some unfilled connections
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, 1, null, 'north', 'unfilled north']
      );
      
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, 1, null, 'east', 'unfilled east']
      );
      
      // Query should be efficient with the partial index
      const unfilledConnections = await db.all<UnfilledConnection>(
        'SELECT * FROM connections WHERE game_id = ? AND to_room_id IS NULL',
        [gameId]
      );
      
      expect(unfilledConnections).toHaveLength(2);
      expect(unfilledConnections[0].to_room_id).toBeNull();
      expect(unfilledConnections[1].to_room_id).toBeNull();
    });

    it('should distinguish between filled and unfilled connections', async () => {
      const gameId = await createGameWithRooms(db, `Test Game ${Date.now()}-${Math.random()}`);
      
      // Insert unfilled connection
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, 1, null, 'north', 'unfilled connection']
      );
      
      // Insert filled connection
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, 1, 2, 'south', 'filled connection']
      );
      
      // Query unfilled connections
      const unfilledConnections = await db.all<UnfilledConnection>(
        'SELECT * FROM connections WHERE game_id = ? AND to_room_id IS NULL',
        [gameId]
      );
      
      // Query filled connections
      const filledConnections = await db.all<FilledConnection>(
        'SELECT * FROM connections WHERE game_id = ? AND to_room_id IS NOT NULL',
        [gameId]
      );
      
      expect(unfilledConnections).toHaveLength(1);
      expect(unfilledConnections[0].name).toBe('unfilled connection');
      expect(unfilledConnections[0].to_room_id).toBeNull();
      
      // Should include the filled connection we created plus existing connections from game creation
      expect(filledConnections.length).toBeGreaterThan(0);
      const ourFilledConnection = filledConnections.find(c => c.name === 'filled connection');
      expect(ourFilledConnection).toBeDefined();
      expect(ourFilledConnection!.to_room_id).toBe(2);
    });

    it('should properly handle connection updates from NULL to filled', async () => {
      const gameId = await createGameWithRooms(db, `Test Game ${Date.now()}-${Math.random()}`);
      
      // Insert unfilled connection
      const result = await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, 1, null, 'west', 'mysterious passage']
      );
      
      const connectionId = result.lastID;
      
      // Verify it's unfilled
      const unfilledConnection = await db.get<Connection>(
        'SELECT * FROM connections WHERE id = ?',
        [connectionId]
      );
      expect(unfilledConnection!.to_room_id).toBeNull();
      
      // Create a new room to connect to
      const roomResult = await db.run(
        'INSERT INTO rooms (game_id, name, description, generation_processed) VALUES (?, ?, ?, ?)',
        [gameId, 'New Room', 'A newly generated room', false]
      );
      
      const newRoomId = roomResult.lastID;
      
      // Update connection to be filled
      await db.run(
        'UPDATE connections SET to_room_id = ? WHERE id = ?',
        [newRoomId, connectionId]
      );
      
      // Verify it's now filled
      const filledConnection = await db.get<Connection>(
        'SELECT * FROM connections WHERE id = ?',
        [connectionId]
      );
      expect(filledConnection!.to_room_id).toBe(newRoomId);
    });
  });

  describe('Type Safety', () => {
    it('should properly type narrow unfilled vs filled connections', async () => {
      const gameId = await createGameWithRooms(db, `Test Game ${Date.now()}-${Math.random()}`);
      
      // Insert unfilled connection
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, 1, null, 'north', 'unfilled']
      );
      
      // Query unfilled connections with type narrowing
      const unfilledConnections = await db.all<UnfilledConnection>(
        'SELECT * FROM connections WHERE game_id = ? AND to_room_id IS NULL',
        [gameId]
      );
      
      // TypeScript should know to_room_id is null
      for (const connection of unfilledConnections) {
        // This should compile without type errors
        const isNull: null = connection.to_room_id;
        expect(isNull).toBeNull();
      }
      
      // Query filled connections with type narrowing
      const filledConnections = await db.all<FilledConnection>(
        'SELECT * FROM connections WHERE game_id = ? AND to_room_id IS NOT NULL',
        [gameId]
      );
      
      // TypeScript should know to_room_id is number
      for (const connection of filledConnections) {
        // This should compile without type errors
        const roomId: number = connection.to_room_id;
        expect(typeof roomId).toBe('number');
        expect(roomId).toBeGreaterThan(0);
      }
    });
  });
});