import Database from '../src/utils/database';
import { initializeDatabase } from '../src/utils/initDb';
import { RegionService } from '../src/services/regionService';
import { Region } from '../src/types/region';

describe('RegionService', () => {
  let db: Database;
  let regionService: RegionService;
  let testGameId: number;

  beforeEach(async () => {
    // Use in-memory database for tests
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    regionService = new RegionService(db, { enableDebugLogging: false });

    // Create test game with unique name
    const uniqueGameName = `Test Game ${Date.now()}-${Math.random()}`;
    const gameResult = await db.run(
      'INSERT INTO games (name, created_at, last_played_at) VALUES (?, ?, ?)',
      [uniqueGameName, new Date().toISOString(), new Date().toISOString()]
    );
    testGameId = gameResult.lastID!;
  });

  afterEach(async () => {
    await db.close();
  });

  describe('createRegion', () => {
    test('should create a region with name', async () => {
      const region = await regionService.createRegion(
        testGameId,
        'mansion',
        'A grand mansion with many rooms',
        'Blackwood Manor'
      );

      expect(region.id).toBeDefined();
      expect(region.game_id).toBe(testGameId);
      expect(region.name).toBe('Blackwood Manor');
      expect(region.type).toBe('mansion');
      expect(region.description).toBe('A grand mansion with many rooms');
      expect(region.center_room_id).toBeNull();
    });

    test('should create a region without name', async () => {
      const region = await regionService.createRegion(
        testGameId,
        'forest',
        'A mysterious forest'
      );

      expect(region.name).toBeNull();
      expect(region.type).toBe('forest');
    });
  });

  describe('distance probability calculations', () => {
    test('generateRegionDistance should return values between 2 and 7', () => {
      for (let i = 0; i < 100; i++) {
        const distance = regionService.generateRegionDistance();
        expect(distance).toBeGreaterThanOrEqual(2);
        expect(distance).toBeLessThanOrEqual(7);
      }
    });

    test('getNewRegionProbability should increase with distance', () => {
      expect(regionService.getNewRegionProbability(0)).toBe(0.15);
      expect(regionService.getNewRegionProbability(1)).toBe(0.27);
      expect(regionService.getNewRegionProbability(5)).toBe(0.75);
      expect(regionService.getNewRegionProbability(10)).toBe(0.8); // capped at 0.8
    });

    test('shouldCreateNewRegion should respect probability distribution', () => {
      // Test low distance (should rarely create new region)
      let newRegionCount = 0;
      for (let i = 0; i < 100; i++) {
        if (regionService.shouldCreateNewRegion(0)) {
          newRegionCount++;
        }
      }
      expect(newRegionCount).toBeLessThan(30); // ~15% expected

      // Test high distance (should often create new region)
      newRegionCount = 0;
      for (let i = 0; i < 100; i++) {
        if (regionService.shouldCreateNewRegion(5)) {
          newRegionCount++;
        }
      }
      expect(newRegionCount).toBeGreaterThan(60); // ~75% expected
    });
  });

  describe('room-region assignment', () => {
    let region: Region;
    let roomId: number;

    beforeEach(async () => {
      region = await regionService.createRegion(testGameId, 'cave', 'Dark underground caves');
      
      // Create test room
      const roomResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [testGameId, 'Test Room', 'A test room']
      );
      roomId = roomResult.lastID!;
    });

    test('should assign room to region', async () => {
      await regionService.assignRoomToRegion(roomId, region.id, 3);

      const room = await db.get('SELECT * FROM rooms WHERE id = ?', [roomId]);
      expect(room.region_id).toBe(region.id);
      expect(room.region_distance).toBe(3);
    });

    test('should find region by room', async () => {
      await regionService.assignRoomToRegion(roomId, region.id, 2);

      const foundRegion = await regionService.findRegionByRoom(roomId);
      expect(foundRegion?.id).toBe(region.id);
      expect(foundRegion?.type).toBe('cave');
    });

    test('should get rooms in region', async () => {
      // Create multiple rooms in region
      const room2Result = await db.run(
        'INSERT INTO rooms (game_id, name, description, region_id, region_distance) VALUES (?, ?, ?, ?, ?)',
        [testGameId, 'Room 2', 'Second room', region.id, 1]
      );
      
      await regionService.assignRoomToRegion(roomId, region.id, 3);

      const rooms = await regionService.getRoomsInRegion(region.id);
      expect(rooms).toHaveLength(2);
      expect(rooms[0].region_distance).toBe(1); // Should be ordered by distance
      expect(rooms[1].region_distance).toBe(3);
    });
  });

  describe('region context building', () => {
    let region: Region;
    let centerRoomId: number;
    let distantRoomId: number;

    beforeEach(async () => {
      region = await regionService.createRegion(testGameId, 'town', 'A bustling medieval town');
      
      // Create center room (distance 0)
      const centerResult = await db.run(
        'INSERT INTO rooms (game_id, name, description, region_id, region_distance) VALUES (?, ?, ?, ?, ?)',
        [testGameId, 'Town Square', 'The heart of the town', region.id, 0]
      );
      centerRoomId = centerResult.lastID!;

      // Create distant room
      const distantResult = await db.run(
        'INSERT INTO rooms (game_id, name, description, region_id, region_distance) VALUES (?, ?, ?, ?, ?)',
        [testGameId, 'Town Outskirts', 'Edge of town', region.id, 4]
      );
      distantRoomId = distantResult.lastID!;
    });

    test('should build context for center room', async () => {
      const context = await regionService.buildRegionContext(centerRoomId);
      
      expect(context).toBeDefined();
      expect(context!.region.id).toBe(region.id);
      expect(context!.isCenter).toBe(true);
      expect(context!.distanceFromCenter).toBe(0);
    });

    test('should build context for distant room', async () => {
      const context = await regionService.buildRegionContext(distantRoomId);
      
      expect(context).toBeDefined();
      expect(context!.isCenter).toBe(false);
      expect(context!.distanceFromCenter).toBe(4);
    });

    test('should return null for room without region', async () => {
      const roomResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [testGameId, 'Unassigned Room', 'No region']
      );

      const context = await regionService.buildRegionContext(roomResult.lastID!);
      expect(context).toBeNull();
    });
  });

  describe('prompt generation', () => {
    test('should build region prompt for center room', () => {
      const context = {
        region: {
          id: 1,
          game_id: testGameId,
          name: 'Shadowmere Castle',
          type: 'mansion',
          description: 'An ancient castle shrouded in mystery',
          center_room_id: null,
          created_at: new Date()
        },
        isCenter: true,
        distanceFromCenter: 0
      };

      const prompt = regionService.buildRegionPrompt(context);
      
      expect(prompt).toContain('mansion region');
      expect(prompt).toContain('Shadowmere Castle');
      expect(prompt).toContain('ancient castle shrouded in mystery');
      expect(prompt).toContain('CENTER of the region');
      expect(prompt).toContain('grand and significant');
    });

    test('should build region prompt for distant room', () => {
      const context = {
        region: {
          id: 1,
          game_id: testGameId,
          name: null,
          type: 'forest',
          description: 'Dense woodland',
          center_room_id: null,
          created_at: new Date()
        },
        isCenter: false,
        distanceFromCenter: 3
      };

      const prompt = regionService.buildRegionPrompt(context);
      
      expect(prompt).toContain('forest region');
      expect(prompt).toContain('Dense woodland');
      expect(prompt).toContain('3 steps from the region center');
      expect(prompt).not.toContain('CENTER');
    });
  });

  describe('region statistics', () => {
    test('should get region stats for game', async () => {
      // Create region with rooms
      const region = await regionService.createRegion(testGameId, 'cave', 'Underground caves');
      
      await db.run(
        'INSERT INTO rooms (game_id, name, description, region_id, region_distance) VALUES (?, ?, ?, ?, ?)',
        [testGameId, 'Cave Entrance', 'Dark entrance', region.id, 2]
      );
      
      await db.run(
        'INSERT INTO rooms (game_id, name, description, region_id, region_distance) VALUES (?, ?, ?, ?, ?)',
        [testGameId, 'Deep Chamber', 'Deeper cave', region.id, 1]
      );

      const stats = await regionService.getRegionStats(testGameId);
      
      expect(stats).toHaveLength(1);
      expect(stats[0].region.id).toBe(region.id);
      expect(stats[0].roomCount).toBe(2);
      expect(stats[0].hasCenter).toBe(false);
    });
  });
});