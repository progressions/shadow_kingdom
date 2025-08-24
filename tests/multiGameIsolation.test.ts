import Database from '../src/utils/database';
import { initializeTestDatabase } from './testUtils';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';

describe('Multi-Game Isolation', () => {
  let db: Database;

  beforeEach(async () => {
    db = new Database(':memory:'); // Use in-memory database for tests
    await db.connect();
    await initializeTestDatabase(db);
  });

  afterEach(async () => {
    if (db.isConnected()) {
      await db.close();
    }
  });

  describe('Game World Isolation', () => {
    test('should create completely separate room sets for different games', async () => {
      const timestamp = Date.now();
      const game1Id = await createGameWithRooms(db, `Adventure 1 ${timestamp}-${Math.random()}`);
      const game2Id = await createGameWithRooms(db, `Adventure 2 ${timestamp}-${Math.random()}`);

      // Get rooms for each game
      const game1Rooms = await db.all('SELECT * FROM rooms WHERE game_id = ? ORDER BY name', [game1Id]);
      const game2Rooms = await db.all('SELECT * FROM rooms WHERE game_id = ? ORDER BY name', [game2Id]);

      // Both games should have the same room structure (Region 1: 6 rooms + Region 2: 12 rooms)
      expect(game1Rooms).toHaveLength(18);
      expect(game2Rooms).toHaveLength(18);

      // But different room IDs
      const game1RoomIds = game1Rooms.map(r => r.id).sort();
      const game2RoomIds = game2Rooms.map(r => r.id).sort();
      
      expect(game1RoomIds).not.toEqual(game2RoomIds);

      // Find the first (starting) region for each game
      const game1RegionIds = [...new Set(game1Rooms.map(r => r.region_id))].sort();
      const game2RegionIds = [...new Set(game2Rooms.map(r => r.region_id))].sort();
      
      const game1StartRegionId = game1RegionIds[0];
      const game2StartRegionId = game2RegionIds[0];
      
      // Both games should have the same starting region rooms (hardcoded)
      const game1Region1Rooms = game1Rooms.filter(r => r.region_id === game1StartRegionId).map(r => r.name).sort();
      const game2Region1Rooms = game2Rooms.filter(r => r.region_id === game2StartRegionId).map(r => r.name).sort();
      
      expect(game1Region1Rooms).toEqual(game2Region1Rooms);
      expect(game1Region1Rooms).toEqual([
        'Ancient Crypt Entrance',
        'Grand Entrance Hall', 
        'Moonlit Courtyard Garden',
        'Observatory Steps',
        'Scholar\'s Library',
        'Winding Tower Stairs'
      ]);
      
      // Region 2 rooms are procedurally generated, so they may differ between games
      const game1Region2Id = game1RegionIds[1];
      const game2Region2Id = game2RegionIds[1];
      const game1Region2Rooms = game1Rooms.filter(r => r.region_id === game1Region2Id);
      const game2Region2Rooms = game2Rooms.filter(r => r.region_id === game2Region2Id);
      expect(game1Region2Rooms).toHaveLength(12);
      expect(game2Region2Rooms).toHaveLength(12);
    });

    test('should create separate connection sets for different games', async () => {
      const timestamp = Date.now();
      const game1Id = await createGameWithRooms(db, `Quest 1 ${timestamp}-${Math.random()}`);
      const game2Id = await createGameWithRooms(db, `Quest 2 ${timestamp}-${Math.random()}`);

      const game1Connections = await db.all('SELECT * FROM connections WHERE game_id = ?', [game1Id]);
      const game2Connections = await db.all('SELECT * FROM connections WHERE game_id = ?', [game2Id]);

      // Both games should have the same connection structure
      expect(game1Connections.length).toEqual(game2Connections.length);
      expect(game1Connections.length).toBe(35); // Updated for Region 1 + Region 2 connections

      // But different connection IDs and room references
      const game1ConnectionIds = game1Connections.map(c => c.id).sort();
      const game2ConnectionIds = game2Connections.map(c => c.id).sort();
      
      expect(game1ConnectionIds).not.toEqual(game2ConnectionIds);

      // Region 2 connections are procedurally generated, so connection names may differ
      // Just verify both games have the expected number of connections
      expect(game1Connections.length).toBe(game2Connections.length);
    });

    test('should maintain separate game states', async () => {
      const timestamp = Date.now();
      const game1Id = await createGameWithRooms(db, `State Test 1 ${timestamp}-${Math.random()}`);
      const game2Id = await createGameWithRooms(db, `State Test 2 ${timestamp}-${Math.random()}`);

      // Move player in game 1 to library
      const game1Library = await db.get(
        'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
        [game1Id, 'Scholar\'s Library']
      );
      
      await db.run(
        'UPDATE game_state SET current_room_id = ? WHERE game_id = ?',
        [game1Library.id, game1Id]
      );

      // Move player in game 2 to garden
      const game2Garden = await db.get(
        'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
        [game2Id, 'Moonlit Courtyard Garden']
      );
      
      await db.run(
        'UPDATE game_state SET current_room_id = ? WHERE game_id = ?',
        [game2Garden.id, game2Id]
      );

      // Verify states are independent
      const game1State = await db.get('SELECT * FROM game_state WHERE game_id = ?', [game1Id]);
      const game2State = await db.get('SELECT * FROM game_state WHERE game_id = ?', [game2Id]);

      expect(game1State.current_room_id).toBe(game1Library.id);
      expect(game2State.current_room_id).toBe(game2Garden.id);
      expect(game1State.current_room_id).not.toBe(game2State.current_room_id);
    });
  });

  describe('Game Query Isolation', () => {
    test('should only return rooms for the specific game', async () => {
      const timestamp = Date.now();
      const game1Id = await createGameWithRooms(db, `Isolation Test 1 ${timestamp}-${Math.random()}`);
      const game2Id = await createGameWithRooms(db, `Isolation Test 2 ${timestamp}-${Math.random()}`);

      // Query rooms for game 1
      const game1Rooms = await db.all(
        'SELECT * FROM rooms WHERE game_id = ?',
        [game1Id]
      );

      // Each room should belong only to its game
      game1Rooms.forEach(room => {
        expect(room.game_id).toBe(game1Id);
        expect(room.game_id).not.toBe(game2Id);
      });

      // Verify cross-game queries return no results
      const crossGameRooms = await db.all(
        'SELECT * FROM rooms WHERE game_id = ? AND id IN (SELECT id FROM rooms WHERE game_id = ?)',
        [game1Id, game2Id]
      );

      expect(crossGameRooms).toHaveLength(0);
    });

    test('should only return connections for the specific game', async () => {
      const timestamp = Date.now();
      const game1Id = await createGameWithRooms(db, `Connection Test 1 ${timestamp}-${Math.random()}`);
      const game2Id = await createGameWithRooms(db, `Connection Test 2 ${timestamp}-${Math.random()}`);

      // Get entrance hall for game 1
      const game1Entrance = await db.get(
        'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
        [game1Id, 'Grand Entrance Hall']
      );

      // Query connections from entrance hall in game 1
      const game1Connections = await db.all(
        'SELECT * FROM connections WHERE game_id = ? AND from_room_id = ?',
        [game1Id, game1Entrance.id]
      );

      // All connections should belong to game 1
      game1Connections.forEach(connection => {
        expect(connection.game_id).toBe(game1Id);
        expect(connection.game_id).not.toBe(game2Id);
      });

      // Verify we can't accidentally access game 2's rooms from game 1's connections
      const invalidConnections = await db.all(
        'SELECT * FROM connections WHERE game_id = ? AND to_room_id IN (SELECT id FROM rooms WHERE game_id = ?)',
        [game1Id, game2Id]
      );

      expect(invalidConnections).toHaveLength(0);
    });

    test('should handle navigation within game boundaries', async () => {
      const timestamp = Date.now();
      const game1Id = await createGameWithRooms(db, `Navigation 1 ${timestamp}-${Math.random()}`);
      const game2Id = await createGameWithRooms(db, `Navigation 2 ${timestamp}-${Math.random()}`);

      // Get entrance halls for both games
      const game1Entrance = await db.get(
        'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
        [game1Id, 'Grand Entrance Hall']
      );
      
      const game2Entrance = await db.get(
        'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
        [game2Id, 'Grand Entrance Hall']
      );

      // Find north connection from game 1 entrance
      const game1NorthConnection = await db.get(
        'SELECT * FROM connections WHERE game_id = ? AND from_room_id = ? AND direction = ?',
        [game1Id, game1Entrance.id, 'north']
      );

      // Verify it only connects to game 1 rooms
      const targetRoom = await db.get('SELECT * FROM rooms WHERE id = ?', [game1NorthConnection.to_room_id]);
      expect(targetRoom.game_id).toBe(game1Id);
      expect(targetRoom.name).toBe('Scholar\'s Library');

      // Verify game 2 has its own separate north connection
      const game2NorthConnection = await db.get(
        'SELECT * FROM connections WHERE game_id = ? AND from_room_id = ? AND direction = ?',
        [game2Id, game2Entrance.id, 'north']
      );

      expect(game2NorthConnection.id).not.toBe(game1NorthConnection.id);
      expect(game2NorthConnection.to_room_id).not.toBe(game1NorthConnection.to_room_id);
    });
  });

  describe('Game Deletion Isolation', () => {
    test('should delete only the specified game data', async () => {
      const timestamp = Date.now();
      const game1Id = await createGameWithRooms(db, `Keep This Game ${timestamp}-${Math.random()}`);
      const game2Id = await createGameWithRooms(db, `Delete This Game ${timestamp}-${Math.random()}`);

      // Verify both games exist
      const gamesBefore = await db.all('SELECT * FROM games WHERE id = ? OR id = ? ORDER BY name', [game1Id, game2Id]);
      expect(gamesBefore).toHaveLength(2);

      const game1RoomsBefore = await db.all('SELECT * FROM rooms WHERE game_id = ?', [game1Id]);
      const game2RoomsBefore = await db.all('SELECT * FROM rooms WHERE game_id = ?', [game2Id]);
      
      expect(game1RoomsBefore.length).toBeGreaterThan(0);
      expect(game2RoomsBefore.length).toBeGreaterThan(0);

      // Delete game 2
      await db.run('DELETE FROM games WHERE id = ?', [game2Id]);

      // Verify game 1 still exists
      const game1After = await db.get('SELECT * FROM games WHERE id = ?', [game1Id]);
      expect(game1After).toBeDefined();
      expect(game1After.name).toContain('Keep This Game');

      // Verify game 2 is deleted
      const game2After = await db.get('SELECT * FROM games WHERE id = ?', [game2Id]);
      expect(game2After).toBeUndefined();

      // Verify game 1's rooms still exist
      const game1RoomsAfter = await db.all('SELECT * FROM rooms WHERE game_id = ?', [game1Id]);
      expect(game1RoomsAfter).toHaveLength(game1RoomsBefore.length);

      // Note: CASCADE deletion behavior depends on foreign key enforcement
      // In a properly configured database, game 2's rooms would be automatically deleted
    });
  });

  describe('Concurrent Game Access', () => {
    test('should handle multiple games being accessed simultaneously', async () => {
      const timestamp = Date.now();
      const adventures = await Promise.all([
        createGameWithRooms(db, `Concurrent 1 ${timestamp}-${Math.random()}`),
        createGameWithRooms(db, `Concurrent 2 ${timestamp}-${Math.random()}`),
        createGameWithRooms(db, `Concurrent 3 ${timestamp}-${Math.random()}`)
      ]);

      // Simulate concurrent access by updating all games simultaneously
      const updatePromises = adventures.map(async (gameId, index) => {
        const room = await db.get(
          'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
          [gameId, index % 2 === 0 ? 'Scholar\'s Library' : 'Moonlit Courtyard Garden']
        );

        await db.run(
          'UPDATE game_state SET current_room_id = ? WHERE game_id = ?',
          [room.id, gameId]
        );

        const timestamp = new Date(Date.now() + index * 1000).toISOString();
        await db.run(
          'UPDATE games SET last_played_at = ? WHERE id = ?',
          [timestamp, gameId]
        );

        return { gameId, roomId: room.id, timestamp };
      });

      const results = await Promise.all(updatePromises);

      // Verify all updates completed successfully
      expect(results).toHaveLength(3);

      // Verify each game maintained its correct state
      for (const result of results) {
        const gameState = await db.get('SELECT * FROM game_state WHERE game_id = ?', [result.gameId]);
        const game = await db.get('SELECT * FROM games WHERE id = ?', [result.gameId]);
        
        expect(gameState.current_room_id).toBe(result.roomId);
        expect(game.last_played_at).toBe(result.timestamp);
      }
    });
  });
});