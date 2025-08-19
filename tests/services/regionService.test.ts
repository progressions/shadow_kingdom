import Database from '../../src/utils/database';
import { RegionService } from '../../src/services/regionService';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import { Region } from '../../src/types/region';
import { Room } from '../../src/services/gameStateManager';

describe('RegionService', () => {
  let db: Database;
  let regionService: RegionService;
  let testGameId: number;

  beforeEach(async () => {
    // Use in-memory database for isolation
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    regionService = new RegionService(db);
    
    // Create a test game
    const uniqueGameName = `Region Test Game ${Date.now()}-${Math.random()}`;
    testGameId = await createGameWithRooms(db, uniqueGameName);
  });

  afterEach(async () => {
    if (db && db.isConnected()) {
      await db.close();
    }
  });

  describe('Region CRUD Operations', () => {
    test('should create a region successfully', async () => {
      const region = await regionService.createRegion(
        testGameId,
        'forest',
        'A mystical forest region with ancient trees',
        'Whispering Woods'
      );

      expect(region.id).toBeDefined();
      expect(region.game_id).toBe(testGameId);
      expect(region.type).toBe('forest');
      expect(region.description).toBe('A mystical forest region with ancient trees');
      expect(region.name).toBe('Whispering Woods');
      expect(region.center_room_id).toBeNull();
      expect(region.created_at).toBeDefined();
    });

    test('should create a region without name', async () => {
      const region = await regionService.createRegion(
        testGameId,
        'cave',
        'Dark underground passages'
      );

      expect(region.type).toBe('cave');
      expect(region.name).toBeNull();
      expect(region.description).toBe('Dark underground passages');
    });

    test('should get region by ID', async () => {
      const createdRegion = await regionService.createRegion(
        testGameId,
        'mansion',
        'Grand estate with many rooms',
        'Blackwood Manor'
      );

      const retrievedRegion = await regionService.getRegion(createdRegion.id);

      expect(retrievedRegion).toEqual(createdRegion);
    });

    test('should throw error when region not found', async () => {
      await expect(regionService.getRegion(99999)).rejects.toThrow('Region with id 99999 not found');
    });

    test('should get all regions for a game', async () => {
      await regionService.createRegion(testGameId, 'forest', 'Forest description');
      await regionService.createRegion(testGameId, 'cave', 'Cave description');

      const regions = await regionService.getRegionsForGame(testGameId);

      expect(regions).toHaveLength(2);
      expect(regions[0].type).toBe('forest');
      expect(regions[1].type).toBe('cave');
    });
  });

  describe('Distance Probability Logic', () => {
    test('should generate region distance between 2 and 7', async () => {
      const distances = [];
      for (let i = 0; i < 100; i++) {
        distances.push(regionService.generateRegionDistance());
      }

      const minDistance = Math.min(...distances);
      const maxDistance = Math.max(...distances);

      expect(minDistance).toBeGreaterThanOrEqual(2);
      expect(maxDistance).toBeLessThanOrEqual(7);
    });

    test('should calculate probability correctly', async () => {
      expect(regionService.getNewRegionProbability(0)).toBe(0.15); // base probability
      expect(regionService.getNewRegionProbability(1)).toBe(0.27); // 0.15 + 0.12
      expect(regionService.getNewRegionProbability(2)).toBe(0.39); // 0.15 + 0.24
      expect(regionService.getNewRegionProbability(5)).toBe(0.75); // 0.15 + 0.60
      expect(regionService.getNewRegionProbability(10)).toBe(0.8);  // capped at 0.8
    });

    test('should return reasonable new region decisions', async () => {
      // Test with distance 0 (should rarely create new region)
      let trueCount = 0;
      for (let i = 0; i < 100; i++) {
        if (regionService.shouldCreateNewRegion(0)) {
          trueCount++;
        }
      }
      expect(trueCount).toBeLessThan(30); // roughly 15% should be true

      // Test with distance 10 (should frequently create new region)
      trueCount = 0;
      for (let i = 0; i < 100; i++) {
        if (regionService.shouldCreateNewRegion(10)) {
          trueCount++;
        }
      }
      expect(trueCount).toBeGreaterThan(60); // roughly 80% should be true
    });
  });

  describe('Room-Region Assignment', () => {
    test('should assign room to region', async () => {
      const region = await regionService.createRegion(testGameId, 'forest', 'Test forest');
      
      // Get a room from the test game
      const rooms = await db.all<Room>('SELECT * FROM rooms WHERE game_id = ?', [testGameId]);
      const testRoom = rooms[0];

      await regionService.assignRoomToRegion(testRoom.id, region.id, 3);

      // Verify assignment
      const updatedRoom = await db.get<Room>('SELECT * FROM rooms WHERE id = ?', [testRoom.id]);
      expect(updatedRoom?.region_id).toBe(region.id);
      expect(updatedRoom?.region_distance).toBe(3);
    });

    test('should find region by room', async () => {
      const region = await regionService.createRegion(testGameId, 'mansion', 'Test mansion');
      const rooms = await db.all<Room>('SELECT * FROM rooms WHERE game_id = ?', [testGameId]);
      const testRoom = rooms[0];

      await regionService.assignRoomToRegion(testRoom.id, region.id, 2);

      const foundRegion = await regionService.findRegionByRoom(testRoom.id);
      expect(foundRegion).toEqual(region);
    });

    test('should return null when room has no region', async () => {
      const rooms = await db.all<Room>('SELECT * FROM rooms WHERE game_id = ?', [testGameId]);
      const testRoom = rooms[0];

      const foundRegion = await regionService.findRegionByRoom(testRoom.id);
      expect(foundRegion).toBeNull();
    });

    test('should get rooms in region ordered by distance', async () => {
      const region = await regionService.createRegion(testGameId, 'cave', 'Test cave');
      const rooms = await db.all<Room>('SELECT * FROM rooms WHERE game_id = ?', [testGameId]);

      // Assign rooms with different distances
      await regionService.assignRoomToRegion(rooms[0].id, region.id, 2);
      await regionService.assignRoomToRegion(rooms[1].id, region.id, 0); // center
      await regionService.assignRoomToRegion(rooms[2].id, region.id, 1);

      const roomsInRegion = await regionService.getRoomsInRegion(region.id);

      expect(roomsInRegion).toHaveLength(3);
      expect(roomsInRegion[0].region_distance).toBe(0); // center first
      expect(roomsInRegion[1].region_distance).toBe(1);
      expect(roomsInRegion[2].region_distance).toBe(2);
    });
  });

  describe('Region Context and Prompts', () => {
    test('should build region context for center room', async () => {
      const region = await regionService.createRegion(testGameId, 'forest', 'Mystical woodland', 'Enchanted Grove');
      const rooms = await db.all<Room>('SELECT * FROM rooms WHERE game_id = ?', [testGameId]);
      const testRoom = rooms[0];

      await regionService.assignRoomToRegion(testRoom.id, region.id, 0); // center room

      const context = await regionService.buildRegionContext(testRoom.id);

      expect(context).not.toBeNull();
      expect(context!.region).toEqual(region);
      expect(context!.isCenter).toBe(true);
      expect(context!.distanceFromCenter).toBe(0);
    });

    test('should build region context for non-center room', async () => {
      const region = await regionService.createRegion(testGameId, 'mansion', 'Old estate');
      const rooms = await db.all<Room>('SELECT * FROM rooms WHERE game_id = ?', [testGameId]);
      const testRoom = rooms[0];

      await regionService.assignRoomToRegion(testRoom.id, region.id, 3);

      const context = await regionService.buildRegionContext(testRoom.id);

      expect(context).not.toBeNull();
      expect(context!.isCenter).toBe(false);
      expect(context!.distanceFromCenter).toBe(3);
    });

    test('should return null context for room without region', async () => {
      const rooms = await db.all<Room>('SELECT * FROM rooms WHERE game_id = ?', [testGameId]);
      const testRoom = rooms[0];

      const context = await regionService.buildRegionContext(testRoom.id);
      expect(context).toBeNull();
    });

    test('should build region prompt for center room', async () => {
      const region = await regionService.createRegion(testGameId, 'forest', 'Ancient woodland filled with magic', 'Whispering Woods');
      const regionContext = {
        region,
        isCenter: true,
        distanceFromCenter: 0
      };

      const prompt = regionService.buildRegionPrompt(regionContext);

      expect(prompt).toContain('Generate a room in the forest region called "Whispering Woods"');
      expect(prompt).toContain('Region context: Ancient woodland filled with magic');
      expect(prompt).toContain('This is the CENTER of the region - make it grand and significant');
    });

    test('should build region prompt for non-center room', async () => {
      const region = await regionService.createRegion(testGameId, 'cave', 'Dark underground network');
      const regionContext = {
        region,
        isCenter: false,
        distanceFromCenter: 2
      };

      const prompt = regionService.buildRegionPrompt(regionContext);

      expect(prompt).toContain('Generate a room in the cave region');
      expect(prompt).toContain('This room is 2 steps from the region center');
      expect(prompt).not.toContain('CENTER');
    });

    test('should get adjacent room descriptions', async () => {
      // Get existing rooms and connections from the test game
      const rooms = await db.all<Room>('SELECT * FROM rooms WHERE game_id = ?', [testGameId]);
      const entranceHall = rooms.find(r => r.name === 'Grand Entrance Hall');
      
      expect(entranceHall).toBeDefined();

      const adjacentDescriptions = await regionService.getAdjacentRoomDescriptions(entranceHall!.id);

      expect(adjacentDescriptions.length).toBeGreaterThan(0);
      expect(adjacentDescriptions[0]).toContain('Scholar\'s Library:');
      expect(adjacentDescriptions[0]).toContain('vast library');
    });

    test('should build comprehensive room generation prompt', async () => {
      const region = await regionService.createRegion(testGameId, 'mansion', 'Grand estate', 'Blackwood Manor');
      const regionContext = {
        region,
        isCenter: false,
        distanceFromCenter: 1
      };

      const adjacentDescriptions = [
        'Library: A vast collection of ancient books',
        'Garden: Moonlit courtyard with fountains'
      ];

      const prompt = await regionService.buildRoomGenerationPrompt(regionContext, adjacentDescriptions);

      expect(prompt).toContain('Generate a room in the mansion region called "Blackwood Manor"');
      expect(prompt).toContain('Adjacent rooms:');
      expect(prompt).toContain('Library: A vast collection of ancient books');
      expect(prompt).toContain('Generate a room that logically connects to these adjacent spaces');
    });
  });

  describe('Database Triggers', () => {
    test('should automatically set region center when distance 0 room is created', async () => {
      const region = await regionService.createRegion(testGameId, 'forest', 'Test forest for trigger');

      // Create a new room with distance 0 (center)
      const roomResult = await db.run(
        'INSERT INTO rooms (game_id, name, description, region_id, region_distance) VALUES (?, ?, ?, ?, ?)',
        [testGameId, 'Forest Heart', 'The center of the mystical forest', region.id, 0]
      );

      // Check that region.center_room_id was automatically set
      const updatedRegion = await regionService.getRegion(region.id);
      expect(updatedRegion.center_room_id).toBe(roomResult.lastID);
    });
  });
});