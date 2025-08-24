import Database from '../../src/utils/database';
import { initializeTestDatabase } from '../testUtils';
import { RegionService } from '../../src/services/regionService';
import { Region } from '../../src/types/region';

describe('RegionService', () => {
  let db: Database;
  let regionService: RegionService;
  let testGameId: number;

  beforeEach(async () => {
    // Use in-memory database for tests
    db = new Database(':memory:');
    await db.connect();
    await initializeTestDatabase(db);
    
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

  // NOTE: Distance probability calculations removed in Phase 9 cleanup

  // NOTE: Room-region assignment methods removed in Phase 9 cleanup

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

  describe('region name uniqueness', () => {
    test('should get existing region names for game', async () => {
      // Create regions with names
      await regionService.createRegion(testGameId, 'mansion', 'A grand mansion', 'Blackwood Manor');
      await regionService.createRegion(testGameId, 'forest', 'Dense woods', 'Whispering Woods');
      await regionService.createRegion(testGameId, 'cave', 'Underground caves'); // No name
      
      // Create region in different game
      const otherGameResult = await db.run(
        'INSERT INTO games (name, created_at, last_played_at) VALUES (?, ?, ?)',
        [`Other Game ${Date.now()}`, new Date().toISOString(), new Date().toISOString()]
      );
      const otherGameId = otherGameResult.lastID!;
      await regionService.createRegion(otherGameId, 'tower', 'A tall tower', 'Ivory Tower');

      const existingNames = await regionService.getExistingRegionNames(testGameId);
      
      expect(existingNames).toHaveLength(2);
      expect(existingNames).toContain('Blackwood Manor');
      expect(existingNames).toContain('Whispering Woods');
      expect(existingNames).not.toContain('Ivory Tower'); // From other game
    });

    test('should find region by name within game', async () => {
      const region = await regionService.createRegion(testGameId, 'mansion', 'A grand mansion', 'Shadowmere Estate');
      
      // Create region with same name in different game
      const otherGameResult = await db.run(
        'INSERT INTO games (name, created_at, last_played_at) VALUES (?, ?, ?)',
        [`Other Game ${Date.now()}`, new Date().toISOString(), new Date().toISOString()]
      );
      const otherGameId = otherGameResult.lastID!;
      await regionService.createRegion(otherGameId, 'mansion', 'Another mansion', 'Shadowmere Estate');

      const foundRegion = await regionService.findRegionByName(testGameId, 'Shadowmere Estate');
      
      expect(foundRegion).not.toBeNull();
      expect(foundRegion?.id).toBe(region.id);
      expect(foundRegion?.game_id).toBe(testGameId);
      expect(foundRegion?.name).toBe('Shadowmere Estate');
    });

    test('should return null when region name not found', async () => {
      await regionService.createRegion(testGameId, 'mansion', 'A grand mansion', 'Blackwood Manor');
      
      const foundRegion = await regionService.findRegionByName(testGameId, 'Nonexistent Manor');
      
      expect(foundRegion).toBeNull();
    });

    test('should handle empty region names list', async () => {
      // No regions created yet
      const existingNames = await regionService.getExistingRegionNames(testGameId);
      
      expect(existingNames).toHaveLength(0);
      expect(existingNames).toEqual([]);
    });

    test('should handle regions without names', async () => {
      await regionService.createRegion(testGameId, 'cave', 'Dark caves'); // No name
      await regionService.createRegion(testGameId, 'forest', 'Dense woods', 'Named Forest');
      
      const existingNames = await regionService.getExistingRegionNames(testGameId);
      
      expect(existingNames).toHaveLength(1);
      expect(existingNames).toContain('Named Forest');
    });
  });
});