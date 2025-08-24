import Database from '../../src/utils/database';
import { RegionService } from '../../src/services/regionService';
import { RegionPlannerService } from '../../src/services/regionPlannerService';
import { initializeTestDatabase } from '../testUtils';
import { CompleteRegion, GeneratedRoom, RegionConcept } from '../../src/types/regionConcept';

describe('RegionService - instantiateRegion', () => {
  let db: Database;
  let regionService: RegionService;
  let gameId: number;

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.connect();
    await initializeTestDatabase(db);
    regionService = new RegionService(db, { enableDebugLogging: false });

    // Create a test game
    const gameResult = await db.run(
      'INSERT INTO games (name, created_at, last_played_at) VALUES (?, ?, ?)',
      ['Test Game', new Date().toISOString(), new Date().toISOString()]
    );
    gameId = gameResult.lastID as number;
  });

  afterEach(async () => {
    await db.close();
  });

  const createMockCompleteRegion = (): CompleteRegion => {
    const mockConcept: RegionConcept = {
      name: 'Test Crystal Caverns',
      theme: 'crystal',
      atmosphere: 'Ethereal glow fills the crystalline chambers',
      history: 'Ancient mining tunnels transformed by magic',
      guardian: {
        name: 'Crystal Warden',
        description: 'A guardian made of living crystal',
        personality: 'Protective but fair'
      },
      key: {
        name: 'Prism Key',
        description: 'A key carved from rainbow crystal'
      },
      lockedExit: {
        name: 'Resonance Gate',
        description: 'A barrier requiring the Prism Key'
      },
      suggestedElements: ['crystals', 'mining equipment', 'echoes']
    };

    const mockRooms: GeneratedRoom[] = [];
    for (let i = 1; i <= 12; i++) {
      mockRooms.push({
        name: `Test Room ${i}`,
        description: `A test room with crystals and magical ambiance (Room ${i})`,
        items: i <= 3 ? [`Crystal Shard ${i}`, `Ancient Tool ${i}`] : [],
        characters: i === 5 ? [{
          name: `Test NPC ${i}`,
          type: 'npc',
          description: `A friendly NPC in room ${i}`
        }] : []
      });
    }

    return {
      concept: mockConcept,
      rooms: mockRooms,
      sequenceNumber: 2,
      entranceRoomIndex: 0,
      guardianRoomIndex: 9,
      exitRoomIndex: 10,
      explorationRoomIndexes: [1, 2, 3, 4, 5, 6, 7, 8, 11]
    };
  };

  describe('instantiateRegion', () => {
    it('should create region record in database', async () => {
      const mockRegion = createMockCompleteRegion();
      
      const regionId = await regionService.instantiateRegion(mockRegion, gameId);
      
      expect(regionId).toBeDefined();
      expect(typeof regionId).toBe('number');
      
      // Verify region record was created
      const region = await db.get(
        'SELECT * FROM regions WHERE id = ? AND game_id = ?',
        [regionId, gameId]
      );
      
      expect(region).toBeDefined();
      expect(region.name).toBe(mockRegion.concept.name);
      expect(region.type).toBe(mockRegion.concept.theme);
      expect(region.description).toBe(mockRegion.concept.atmosphere);
    });

    it('should create exactly 12 rooms in database', async () => {
      const mockRegion = createMockCompleteRegion();
      
      const regionId = await regionService.instantiateRegion(mockRegion, gameId);
      
      // Verify 12 rooms were created
      const rooms = await db.all(
        'SELECT * FROM rooms WHERE region_id = ? AND game_id = ? ORDER BY region_distance',
        [regionId, gameId]
      );
      
      expect(rooms).toHaveLength(12);
      
      // Verify room names match
      for (let i = 0; i < 12; i++) {
        expect(rooms[i].name).toBe(mockRegion.rooms[i].name);
        expect(rooms[i].description).toBe(mockRegion.rooms[i].description);
        expect(rooms[i].region_distance).toBe(i); // Uses index as distance
      }
    });

    it('should create connections between rooms', async () => {
      const mockRegion = createMockCompleteRegion();
      
      const regionId = await regionService.instantiateRegion(mockRegion, gameId);
      
      // Verify connections were created
      const connections = await db.all(
        'SELECT * FROM connections WHERE game_id = ?',
        [gameId]
      );
      
      expect(connections.length).toBeGreaterThan(0);
      
      // Verify all connections reference valid rooms
      for (const conn of connections) {
        expect(conn.from_room_id).toBeDefined();
        expect(conn.to_room_id).toBeDefined();
        expect(conn.direction).toMatch(/^(north|south|east|west)$/);
        expect(conn.name).toContain('through the');
      }
    });
  });
});