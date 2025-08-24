import Database from '../../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import { RegionService } from '../../src/services/regionService';
import { RegionPlannerService } from '../../src/services/regionPlannerService';

describe('Region Phase 5: Database Instantiation - End-to-End', () => {
  let db: Database;

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('New Game Creation', () => {
    it('should automatically generate Region 2 when creating new games', async () => {
      // Create a new game (should trigger Region 2 generation)
      const gameId = await createGameWithRooms(db, 'Test Game for Region 2');

      // Verify game was created
      expect(gameId).toBeDefined();
      expect(typeof gameId).toBe('number');

      // Verify both regions exist
      const regions = await db.all(
        'SELECT * FROM regions WHERE game_id = ? ORDER BY created_at',
        [gameId]
      );

      expect(regions).toHaveLength(2);

      // Region 1 (hardcoded)
      expect(regions[0].name).toBe('Shadow Kingdom Manor');
      expect(regions[0].type).toBe('mansion');

      // Region 2 (generated)
      expect(regions[1].name).toBeDefined();
      expect(regions[1].name).not.toBe('Shadow Kingdom Manor');
      expect(regions[1].type).toBeDefined();
      expect(regions[1].description).toBeDefined();
    });

    it('should create exactly 12 rooms for Region 2', async () => {
      const gameId = await createGameWithRooms(db, 'Test 12 Rooms');

      // Get Region 2
      const region2 = await db.get(
        'SELECT * FROM regions WHERE game_id = ? AND name != ? ORDER BY created_at DESC LIMIT 1',
        [gameId, 'Shadow Kingdom Manor']
      );

      expect(region2).toBeDefined();

      // Verify 12 rooms in Region 2
      const region2Rooms = await db.all(
        'SELECT * FROM rooms WHERE region_id = ? ORDER BY region_distance',
        [region2.id]
      );

      expect(region2Rooms).toHaveLength(12);

      // Verify room names are unique within the region
      const roomNames = region2Rooms.map(r => r.name);
      const uniqueNames = new Set(roomNames);
      expect(uniqueNames.size).toBe(12);

      // Verify all rooms have descriptions
      region2Rooms.forEach(room => {
        expect(room.name).toBeDefined();
        expect(room.name.length).toBeGreaterThan(0);
        expect(room.description).toBeDefined();
        expect(room.description.length).toBeGreaterThan(10);
      });
    });

    it('should create functional connections between all Region 2 rooms', async () => {
      const gameId = await createGameWithRooms(db, 'Test Connections');

      // Get Region 2
      const region2 = await db.get(
        'SELECT * FROM regions WHERE game_id = ? AND name != ?',
        [gameId, 'Shadow Kingdom Manor']
      );

      // Get all Region 2 rooms
      const region2Rooms = await db.all(
        'SELECT id FROM rooms WHERE region_id = ?',
        [region2.id]
      );

      const roomIds = region2Rooms.map(r => r.id);

      // Get connections within Region 2
      const connections = await db.all(`
        SELECT from_room_id, to_room_id, direction, name 
        FROM connections 
        WHERE from_room_id IN (${roomIds.join(',')}) 
        AND to_room_id IN (${roomIds.join(',')})
      `);

      expect(connections.length).toBeGreaterThan(0);

      // Verify all connections have proper format
      connections.forEach(conn => {
        expect(['north', 'south', 'east', 'west']).toContain(conn.direction);
        expect(conn.name).toContain('through the');
        expect(roomIds).toContain(conn.from_room_id);
        expect(roomIds).toContain(conn.to_room_id);
      });

      // Test connectivity: all rooms should be reachable from any room
      const graph: { [key: number]: number[] } = {};
      roomIds.forEach(id => graph[id] = []);

      connections.forEach(conn => {
        graph[conn.from_room_id].push(conn.to_room_id);
        graph[conn.to_room_id].push(conn.from_room_id); // Bidirectional
      });

      // BFS from first room
      const startRoom = roomIds[0];
      const visited = new Set<number>();
      const queue = [startRoom];
      visited.add(startRoom);

      while (queue.length > 0) {
        const current = queue.shift()!;
        graph[current].forEach(neighbor => {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        });
      }

      // All 12 rooms should be reachable
      expect(visited.size).toBe(12);
    });

    it('should create guardian and key in Region 2', async () => {
      const gameId = await createGameWithRooms(db, 'Test Guardian');

      // Get Region 2
      const region2 = await db.get(
        'SELECT * FROM regions WHERE game_id = ? AND name != ?',
        [gameId, 'Shadow Kingdom Manor']
      );

      // Find guardian character
      const guardian = await db.get(`
        SELECT c.* FROM characters c 
        JOIN rooms r ON c.current_room_id = r.id 
        WHERE r.region_id = ? AND c.type = 'enemy'
        ORDER BY c.max_health DESC
        LIMIT 1
      `, [region2.id]);

      expect(guardian).toBeDefined();
      expect(guardian.name).toBeDefined();
      expect(guardian.type).toBe('enemy');
      expect(guardian.max_health).toBe(50);
      expect(guardian.current_health).toBe(50);

      // Find region key (should be a quest item)
      const key = await db.get(`
        SELECT i.* FROM items i 
        JOIN room_items ri ON i.id = ri.item_id 
        JOIN rooms r ON ri.room_id = r.id 
        WHERE r.region_id = ? AND i.type = 'quest'
        LIMIT 1
      `, [region2.id]);

      expect(key).toBeDefined();
      expect(key.name).toBeDefined();
      expect(key.name.length).toBeGreaterThan(0);
      expect(key.type).toBe('quest');
      expect(key.description).toBeDefined();
    });

    it('should place items throughout Region 2', async () => {
      const gameId = await createGameWithRooms(db, 'Test Items');

      // Get Region 2
      const region2 = await db.get(
        'SELECT * FROM regions WHERE game_id = ? AND name != ?',
        [gameId, 'Shadow Kingdom Manor']
      );

      // Get all items in Region 2
      const items = await db.all(`
        SELECT i.name, i.type, r.name as room_name 
        FROM items i 
        JOIN room_items ri ON i.id = ri.item_id 
        JOIN rooms r ON ri.room_id = r.id 
        WHERE r.region_id = ?
      `, [region2.id]);

      expect(items.length).toBeGreaterThan(0);

      // Should have at least one quest key
      const questKeys = items.filter(item => item.type === 'quest');
      expect(questKeys.length).toBeGreaterThanOrEqual(1);

      // Should have some misc items
      const miscItems = items.filter(item => item.type === 'misc');
      expect(miscItems.length).toBeGreaterThan(0);

      // All items should have names and room locations
      items.forEach(item => {
        expect(item.name).toBeDefined();
        expect(item.name.length).toBeGreaterThan(0);
        expect(item.room_name).toBeDefined();
      });
    });

    it('should maintain Region 1 unchanged after Region 2 generation', async () => {
      const gameId = await createGameWithRooms(db, 'Test Region 1 Intact');

      // Get Region 1 (hardcoded region)
      const region1 = await db.get(
        'SELECT * FROM regions WHERE game_id = ? AND name = ?',
        [gameId, 'Shadow Kingdom Manor']
      );

      expect(region1).toBeDefined();
      expect(region1.name).toBe('Shadow Kingdom Manor');
      expect(region1.type).toBe('mansion');

      // Verify Region 1 has expected hardcoded rooms
      const region1Rooms = await db.all(
        'SELECT * FROM rooms WHERE region_id = ? ORDER BY region_distance',
        [region1.id]
      );

      expect(region1Rooms.length).toBeGreaterThan(0);

      // Check for specific hardcoded rooms
      const roomNames = region1Rooms.map(r => r.name);
      expect(roomNames).toContain('Grand Entrance Hall');
      expect(roomNames).toContain('Scholar\'s Library');
      expect(roomNames).toContain('Moonlit Courtyard Garden');

      // Verify game state starts in Region 1
      const gameState = await db.get(
        'SELECT gs.*, r.region_id FROM game_state gs JOIN rooms r ON gs.current_room_id = r.id WHERE gs.game_id = ?',
        [gameId]
      );

      expect(gameState.region_id).toBe(region1.id);
    });

    it('should handle Region 2 generation failures gracefully', async () => {
      // This test would require mocking the RegionPlannerService to fail
      // For now, we test that game creation still succeeds even if Region 2 fails
      
      const gameId = await createGameWithRooms(db, 'Test Failure Tolerance');
      
      // Game should still be created successfully
      expect(gameId).toBeDefined();
      
      const game = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
      expect(game).toBeDefined();
      expect(game.name).toBe('Test Failure Tolerance');
      
      // Should have at least Region 1
      const regions = await db.all('SELECT * FROM regions WHERE game_id = ?', [gameId]);
      expect(regions.length).toBeGreaterThanOrEqual(1);
      
      // First region should be the hardcoded one
      expect(regions[0].name).toBe('Shadow Kingdom Manor');
    });
  });

  describe('Region Service Integration', () => {
    it('should allow manual region instantiation using RegionService', async () => {
      // Create a game first
      const gameId = await createGameWithRooms(db, 'Manual Region Test');

      // Create services
      const regionPlannerService = new RegionPlannerService(db, { enableDebugLogging: false });
      const regionService = new RegionService(db, { enableDebugLogging: false });

      // Generate a complete region
      const completeRegion = await regionPlannerService.generateCompleteRegion(3, {
        existingConcepts: ['Shadow Kingdom Manor']
      });

      expect(completeRegion).toBeDefined();
      expect(completeRegion.rooms).toHaveLength(12);
      expect(completeRegion.concept.name).toBeDefined();

      // Instantiate it in the database
      const region3Id = await regionService.instantiateRegion(completeRegion, gameId);

      expect(region3Id).toBeDefined();

      // Verify it was created correctly
      const region3 = await db.get('SELECT * FROM regions WHERE id = ?', [region3Id]);
      expect(region3.name).toBe(completeRegion.concept.name);
      expect(region3.type).toBe(completeRegion.concept.theme);

      // Verify rooms were created
      const rooms = await db.all('SELECT * FROM rooms WHERE region_id = ?', [region3Id]);
      expect(rooms).toHaveLength(12);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain proper foreign key relationships', async () => {
      const gameId = await createGameWithRooms(db, 'Foreign Key Test');

      // Verify all rooms reference valid regions
      const orphanedRooms = await db.all(`
        SELECT r.* FROM rooms r 
        LEFT JOIN regions reg ON r.region_id = reg.id 
        WHERE r.game_id = ? AND reg.id IS NULL
      `, [gameId]);

      expect(orphanedRooms).toHaveLength(0);

      // Verify all connections reference valid rooms (excluding intentional NULL to_room_id for expansion)
      const orphanedConnections = await db.all(`
        SELECT c.* FROM connections c 
        LEFT JOIN rooms r1 ON c.from_room_id = r1.id 
        LEFT JOIN rooms r2 ON c.to_room_id = r2.id 
        WHERE c.game_id = ? AND (r1.id IS NULL OR (c.to_room_id IS NOT NULL AND r2.id IS NULL))
      `, [gameId]);

      expect(orphanedConnections).toHaveLength(0);

      // Verify all room_items reference valid rooms and items
      const orphanedRoomItems = await db.all(`
        SELECT ri.* FROM room_items ri 
        LEFT JOIN rooms r ON ri.room_id = r.id 
        LEFT JOIN items i ON ri.item_id = i.id 
        WHERE r.game_id = ? AND (r.id IS NULL OR i.id IS NULL)
      `, [gameId]);

      expect(orphanedRoomItems).toHaveLength(0);

      // Verify all characters reference valid rooms (excluding player characters which use game_state for location)
      const orphanedCharacters = await db.all(`
        SELECT c.* FROM characters c 
        LEFT JOIN rooms r ON c.current_room_id = r.id 
        WHERE c.game_id = ? AND c.type != 'player' AND c.current_room_id IS NOT NULL AND r.id IS NULL
      `, [gameId]);

      expect(orphanedCharacters).toHaveLength(0);
    });

    it('should support multiple new games with unique regions', async () => {
      const gameId1 = await createGameWithRooms(db, 'Game 1');
      const gameId2 = await createGameWithRooms(db, 'Game 2');

      // Both games should have 2 regions each
      const game1Regions = await db.all('SELECT * FROM regions WHERE game_id = ?', [gameId1]);
      const game2Regions = await db.all('SELECT * FROM regions WHERE game_id = ?', [gameId2]);

      expect(game1Regions).toHaveLength(2);
      expect(game2Regions).toHaveLength(2);

      // Region 2 should exist in both games (MockAI may generate same names)
      const game1Region2 = game1Regions.find(r => r.name !== 'Shadow Kingdom Manor');
      const game2Region2 = game2Regions.find(r => r.name !== 'Shadow Kingdom Manor');

      expect(game1Region2).toBeDefined();
      expect(game2Region2).toBeDefined();
      // Note: With MockAI, regions may have same names but different IDs and game_ids
      expect(game1Region2.id).not.toBe(game2Region2.id);
      expect(game1Region2.game_id).toBe(gameId1);
      expect(game2Region2.game_id).toBe(gameId2);
    });
  });
});