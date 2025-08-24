import Database from '../../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import { RegionService } from '../../src/services/regionService';

describe('Region Connection Service', () => {
  let db: Database;
  let regionService: RegionService;
  let gameId: number;

  beforeEach(async () => {
    // Use in-memory database for tests
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    regionService = new RegionService(db, { enableDebugLogging: false });
    
    // Create a test game with regions
    const uniqueGameName = `Region Connection Test ${Date.now()}-${Math.random()}`;
    gameId = await createGameWithRooms(db, uniqueGameName);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('connectRegions method', () => {
    test('should connect Region 1 exit to Region 2 entrance', async () => {
      // Find the Ancient Crypt Entrance room in Region 1 (should be hardcoded)
      const region1ExitRoom = await db.get<any>(
        'SELECT id, name FROM rooms WHERE game_id = ? AND name = ?',
        [gameId, 'Ancient Crypt Entrance']
      );
      
      expect(region1ExitRoom).toBeDefined();
      expect(region1ExitRoom.name).toBe('Ancient Crypt Entrance');
      
      // Find Region 2 and its entrance room
      const regions = await db.all<any>('SELECT * FROM regions WHERE game_id = ? ORDER BY created_at', [gameId]);
      expect(regions.length).toBeGreaterThanOrEqual(2); // Should have Region 1 and Region 2
      
      const region2 = regions.find(r => r.name !== 'Shadow Kingdom Manor'); // Region 1 is the manor
      expect(region2).toBeDefined();
      
      // Find Region 2's entrance room (should be the first room, distance 0)
      const region2EntranceRoom = await db.get<any>(
        'SELECT id, name FROM rooms WHERE region_id = ? ORDER BY region_distance LIMIT 1',
        [region2.id]
      );
      
      expect(region2EntranceRoom).toBeDefined();
      
      // Check initial state - locked connection should exist but point to NULL
      const initialConnection = await db.get<any>(
        'SELECT * FROM connections WHERE from_room_id = ? AND locked = ? AND required_key_name = ?',
        [region1ExitRoom.id, 1, 'Vault Key']
      );
      
      expect(initialConnection).toBeDefined();
      expect(initialConnection.locked).toBe(1);
      expect(initialConnection.required_key_name).toBe('Vault Key');
      
      // Test the connectRegions method
      await regionService.connectRegions(region1ExitRoom.id, region2EntranceRoom.id);
      
      // Verify the connection was updated
      const updatedConnection = await db.get<any>(
        'SELECT * FROM connections WHERE from_room_id = ? AND locked = ? AND required_key_name = ?',
        [region1ExitRoom.id, 1, 'Vault Key']
      );
      
      expect(updatedConnection).toBeDefined();
      expect(updatedConnection.to_room_id).toBe(region2EntranceRoom.id);
      expect(updatedConnection.locked).toBe(1);
      expect(updatedConnection.required_key_name).toBe('Vault Key');
      
      // Verify connection name was updated appropriately
      expect(updatedConnection.name).toContain('vault');
      expect(updatedConnection.name).toContain('door');
    });

    test('should only update locked connections with NULL to_room_id', async () => {
      // Create test rooms
      const testRoom1Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Test Room 1', 'A test room']
      );
      const testRoom2Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Test Room 2', 'Another test room']
      );
      const testRoom3Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Test Room 3', 'A third test room']
      );
      
      const room1Id = testRoom1Result.lastID;
      const room2Id = testRoom2Result.lastID;
      const room3Id = testRoom3Result.lastID;
      
      // Create different types of connections
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name, locked, required_key_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gameId, room1Id, null, 'north', 'locked door', 1, 'Vault Key'] // This should be updated
      );
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name, locked, required_key_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gameId, room1Id, room3Id, 'east', 'already connected door', 1, 'Vault Key'] // This should NOT be updated
      );
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name, locked) VALUES (?, ?, ?, ?, ?, ?)',
        [gameId, room1Id, null, 'south', 'unlocked door', 0] // This should NOT be updated
      );
      
      // Connect regions
      await regionService.connectRegions(room1Id, room2Id);
      
      // Check that only the correct connection was updated
      const connections = await db.all<any>(
        'SELECT * FROM connections WHERE from_room_id = ? ORDER BY direction',
        [room1Id]
      );
      
      expect(connections).toHaveLength(3);
      
      // North connection (locked, was NULL) should be updated
      const northConnection = connections.find(c => c.direction === 'north');
      expect(northConnection.to_room_id).toBe(room2Id);
      expect(northConnection.locked).toBe(1);
      
      // East connection (locked, already connected) should remain unchanged
      const eastConnection = connections.find(c => c.direction === 'east');
      expect(eastConnection.to_room_id).toBe(room3Id);
      
      // South connection (unlocked) should remain unchanged
      const southConnection = connections.find(c => c.direction === 'south');
      expect(southConnection.to_room_id).toBeNull();
    });

    test('should handle case where no matching connection exists', async () => {
      // Create test rooms with no locked connections
      const testRoom1Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Test Room A', 'A test room']
      );
      const testRoom2Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Test Room B', 'Another test room']
      );
      
      const room1Id = testRoom1Result.lastID;
      const room2Id = testRoom2Result.lastID;
      
      // No connections exist from room1Id
      const initialConnections = await db.all<any>(
        'SELECT * FROM connections WHERE from_room_id = ?',
        [room1Id]
      );
      expect(initialConnections).toHaveLength(0);
      
      // This should not throw an error, but also not create new connections
      await regionService.connectRegions(room1Id, room2Id);
      
      // Should still have no connections
      const finalConnections = await db.all<any>(
        'SELECT * FROM connections WHERE from_room_id = ?',
        [room1Id]
      );
      expect(finalConnections).toHaveLength(0);
    });

    test('should verify foreign key constraints are maintained', async () => {
      const region1ExitRoom = await db.get<any>(
        'SELECT id FROM rooms WHERE game_id = ? AND name = ?',
        [gameId, 'Ancient Crypt Entrance']
      );
      
      const regions = await db.all<any>('SELECT * FROM regions WHERE game_id = ? ORDER BY created_at', [gameId]);
      const region2 = regions.find(r => r.name !== 'Shadow Kingdom Manor');
      const region2EntranceRoom = await db.get<any>(
        'SELECT id FROM rooms WHERE region_id = ? ORDER BY region_distance LIMIT 1',
        [region2.id]
      );
      
      // Connect regions
      await regionService.connectRegions(region1ExitRoom.id, region2EntranceRoom.id);
      
      // Verify foreign key relationships are correct
      const connection = await db.get<any>(
        'SELECT c.*, r1.name as from_room_name, r2.name as to_room_name FROM connections c ' +
        'JOIN rooms r1 ON c.from_room_id = r1.id ' +
        'JOIN rooms r2 ON c.to_room_id = r2.id ' +
        'WHERE c.from_room_id = ? AND c.locked = ? AND c.required_key_name = ?',
        [region1ExitRoom.id, 1, 'Vault Key']
      );
      
      expect(connection).toBeDefined();
      expect(connection.from_room_name).toBe('Ancient Crypt Entrance');
      expect(connection.to_room_name).toBeDefined();
      expect(connection.game_id).toBe(gameId);
    });
  });
});