import Database from '../../src/utils/database';
import { RoomGenerationService, RoomGenerationContext } from '../../src/services/roomGenerationService';
import { RegionService } from '../../src/services/regionService';
import { GrokClient } from '../../src/ai/grokClient';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import { Room } from '../../src/services/gameStateManager';

describe('Region-Aware Room Generation', () => {
  let db: Database;
  let grokClient: GrokClient;
  let regionService: RegionService;
  let roomGenerationService: RoomGenerationService;
  let testGameId: number;
  let testFromRoomId: number;

  beforeEach(async () => {
    // Use in-memory database for isolation
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    // Create services
    grokClient = new GrokClient();
    regionService = new RegionService(db);
    roomGenerationService = new RoomGenerationService(db, grokClient, regionService, {
      enableDebugLogging: false
    });
    
    // Ensure mock mode and disable debug logging
    process.env.AI_MOCK_MODE = 'true';
    process.env.AI_DEBUG_LOGGING = 'false';
    
    // Create test game
    const uniqueGameName = `Region-Aware Test ${Date.now()}-${Math.random()}`;
    testGameId = await createGameWithRooms(db, uniqueGameName);
    
    // Find starting room
    const rooms = await db.all<Room>('SELECT * FROM rooms WHERE game_id = ?', [testGameId]);
    const startingRoom = rooms.find(room => room.name === 'Grand Entrance Hall');
    if (!startingRoom) {
      throw new Error('Grand Entrance Hall not found - test setup failed');
    }
    testFromRoomId = startingRoom.id;
  });

  afterEach(async () => {
    if (db && db.isConnected()) {
      await db.close();
    }
    
    // Clean up environment
    delete process.env.AI_MOCK_MODE;
    delete process.env.AI_DEBUG_LOGGING;
    jest.restoreAllMocks();
  });

  describe('Region Creation During Generation', () => {
    test('should create new region when generating from room with no region', async () => {
      // Mock GrokClient to return consistent results
      jest.spyOn(grokClient, 'generateRoom').mockResolvedValue({
        name: 'Forest Clearing',
        description: 'A peaceful clearing surrounded by ancient trees',
        connections: []
      });

      const context: RoomGenerationContext = {
        gameId: testGameId,
        fromRoomId: testFromRoomId,
        direction: 'southwest' // Use direction that doesn't exist in starting room
      };

      const result = await roomGenerationService.generateRoomWithRegion(context);
      
      expect(result.success).toBe(true);
      expect(result.roomId).toBeDefined();

      // Check that a region was created
      const regions = await regionService.getRegionsForGame(testGameId);
      expect(regions.length).toBe(1);
      
      // Check that room is assigned to the region
      const createdRoom = await db.get<Room>('SELECT * FROM rooms WHERE id = ?', [result.roomId]);
      expect(createdRoom?.region_id).toBe(regions[0].id);
      expect(createdRoom?.region_distance).toBeGreaterThanOrEqual(2);
      expect(createdRoom?.region_distance).toBeLessThanOrEqual(7);
    });

    test('should create default region types', async () => {
      jest.spyOn(grokClient, 'generateRoom').mockResolvedValue({
        name: 'Generated Room',
        description: 'A room in some region type',
        connections: []
      });

      const context: RoomGenerationContext = {
        gameId: testGameId,
        fromRoomId: testFromRoomId,
        direction: 'south' // Available direction
      };

      const result = await roomGenerationService.generateRoomWithRegion(context);
      expect(result.success).toBe(true);

      // Check that a region was created with one of the expected types
      const regions = await regionService.getRegionsForGame(testGameId);
      expect(regions.length).toBe(1);
      
      const createdRegion = regions[0];
      const expectedTypes = ['forest', 'mansion', 'cave', 'town', 'tower', 'ruins'];
      expect(expectedTypes).toContain(createdRegion.type);
      expect(createdRegion.description).toBeDefined();
      expect(createdRegion.name).toBeNull(); // Default regions don't have names
    });

    test('should inherit region from parent room when probability favors staying', async () => {
      // First create a room in a known region
      const region = await regionService.createRegion(testGameId, 'mansion', 'Grand estate with ornate rooms');
      await regionService.assignRoomToRegion(testFromRoomId, region.id, 1); // Low distance = low branch probability

      jest.spyOn(grokClient, 'generateRoom').mockResolvedValue({
        name: 'Mansion Library',
        description: 'An elegant library with leather-bound books',
        connections: []
      });

      // Mock shouldCreateNewRegion to return false (stay in region)
      jest.spyOn(regionService, 'shouldCreateNewRegion').mockReturnValue(false);

      const context: RoomGenerationContext = {
        gameId: testGameId,
        fromRoomId: testFromRoomId,
        direction: 'southeast' // Use direction that doesn't exist in starting room
      };

      const result = await roomGenerationService.generateRoomWithRegion(context);
      
      expect(result.success).toBe(true);
      expect(result.roomId).toBeDefined();

      // Check that room inherited the region with incremented distance
      const createdRoom = await db.get<Room>('SELECT * FROM rooms WHERE id = ?', [result.roomId]);
      expect(createdRoom?.region_id).toBe(region.id);
      expect(createdRoom?.region_distance).toBe(2); // 1 + 1
    });

    test('should create new region when probability favors branching', async () => {
      // First assign starting room to a region with high distance
      const initialRegion = await regionService.createRegion(testGameId, 'cave', 'Dark underground tunnels');
      await regionService.assignRoomToRegion(testFromRoomId, initialRegion.id, 5); // High distance = high branch probability

      jest.spyOn(grokClient, 'generateRoom').mockResolvedValue({
        name: 'Sunlit Meadow', 
        description: 'A bright meadow outside the caves',
        connections: []
      });

      // Mock shouldCreateNewRegion to return true (create new region)
      jest.spyOn(regionService, 'shouldCreateNewRegion').mockReturnValue(true);

      const context: RoomGenerationContext = {
        gameId: testGameId,
        fromRoomId: testFromRoomId,
        direction: 'up' // Going up from cave might lead outside
      };

      const result = await roomGenerationService.generateRoomWithRegion(context);
      
      expect(result.success).toBe(true);

      // Should have created a new region (total of 2 now)
      const regions = await regionService.getRegionsForGame(testGameId);
      expect(regions.length).toBe(2);

      // New room should be in the new region, not the initial one
      const createdRoom = await db.get<Room>('SELECT * FROM rooms WHERE id = ?', [result.roomId]);
      expect(createdRoom?.region_id).not.toBe(initialRegion.id);
      expect(createdRoom?.region_id).toBe(regions[1].id);
    });
  });

  describe('AI Context Enhancement', () => {
    test('should provide region context to AI when generating rooms', async () => {
      // First generate a room to create a default region
      jest.spyOn(grokClient, 'generateRoom').mockResolvedValue({
        name: 'First Room',
        description: 'A room that creates the initial region',
        connections: []
      });

      const initialContext: RoomGenerationContext = {
        gameId: testGameId,
        fromRoomId: testFromRoomId,
        direction: 'south'
      };

      const initialResult = await roomGenerationService.generateRoomWithRegion(initialContext);
      expect(initialResult.success).toBe(true);

      // Now capture the context for the second generation
      let capturedContext: any;
      jest.spyOn(grokClient, 'generateRoom').mockImplementation(async (context) => {
        capturedContext = context;
        return {
          name: 'Second Room',
          description: 'A room generated with region context',
          connections: []
        };
      });

      const context: RoomGenerationContext = {
        gameId: testGameId,
        fromRoomId: initialResult.roomId!,
        direction: 'east' // Use a direction that should be available from newly created room
      };

      const result = await roomGenerationService.generateRoomWithRegion(context);
      
      expect(result.success).toBe(true);
      expect(capturedContext).toBeDefined();
      expect(capturedContext.regionContext).toBeDefined();
      
      // Verify region context structure without hardcoding specific values
      const regionContext = capturedContext.regionContext;
      expect(regionContext.region.type).toBeDefined();
      expect(regionContext.region.description).toBeDefined();
      expect(regionContext.region.name).toBeNull(); // Default regions have no name
      expect(typeof regionContext.distanceFromCenter).toBe('number');
    });

    test('should mark center rooms correctly in AI context', async () => {
      // Create a region and assign room as center  
      const region = await regionService.createRegion(testGameId, 'forest', 'Ancient mystical woodland');
      await regionService.assignRoomToRegion(testFromRoomId, region.id, 0); // Center room

      let capturedContext: any;
      jest.spyOn(grokClient, 'generateRoom').mockImplementation(async (context) => {
        capturedContext = context;
        return {
          name: 'Forest Edge',
          description: 'Where the great forest meets open meadows',
          connections: []
        };
      });

      const context: RoomGenerationContext = {
        gameId: testGameId,
        fromRoomId: testFromRoomId,
        direction: 'down' // Use down direction which should be available
      };

      // Mock the region service to simulate staying in the same region
      jest.spyOn(regionService, 'shouldCreateNewRegion').mockReturnValue(false);

      const result = await roomGenerationService.generateRoomWithRegion(context);
      
      expect(result.success).toBe(true);
      expect(capturedContext).toBeDefined();
      expect(capturedContext.regionContext).toBeDefined();
      expect(capturedContext.regionContext.distanceFromCenter).toBe(1); // New room is 1 step from center (parent room is center)
    });

    test('should include adjacent room descriptions in AI context', async () => {
      // Set up region for starting room
      const region = await regionService.createRegion(testGameId, 'mansion', 'Victorian manor');
      await regionService.assignRoomToRegion(testFromRoomId, region.id, 1);

      let capturedContext: any;
      jest.spyOn(grokClient, 'generateRoom').mockImplementation(async (context) => {
        capturedContext = context;
        return {
          name: 'Drawing Room',
          description: 'A formal drawing room with antique furniture',
          connections: []
        };
      });

      const context: RoomGenerationContext = {
        gameId: testGameId,
        fromRoomId: testFromRoomId,
        direction: 'down'
      };

      const result = await roomGenerationService.generateRoomWithRegion(context);
      
      expect(result.success).toBe(true);
      expect(capturedContext.adjacentRooms).toBeDefined();
      expect(capturedContext.adjacentRooms.length).toBeGreaterThan(0);
      
      // Should include descriptions of connected rooms
      expect(capturedContext.adjacentRooms[0]).toContain('Scholar\'s Library:');
      expect(capturedContext.adjacentRooms[0]).toContain('vast library');
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete region-aware generation workflow', async () => {
      jest.spyOn(grokClient, 'generateRoom').mockResolvedValue({
        name: 'Enchanted Grove',
        description: 'A magical grove where ancient trees whisper secrets',
        connections: [
          { direction: 'south', name: 'back through the shimmering portal' }
        ]
      });

      const context: RoomGenerationContext = {
        gameId: testGameId,
        fromRoomId: testFromRoomId,
        direction: 'up', // Use direction that doesn't exist in starting room
        theme: 'mystical forest kingdom'
      };

      // Generate first room (should create new region)
      const result1 = await roomGenerationService.generateRoomWithRegion(context);
      expect(result1.success).toBe(true);

      // Verify region was created and room assigned
      const regions = await regionService.getRegionsForGame(testGameId);
      expect(regions.length).toBe(1);

      const room1 = await db.get<Room>('SELECT * FROM rooms WHERE id = ?', [result1.roomId]);
      expect(room1?.region_id).toBe(regions[0].id);
      expect(room1?.region_distance).toBeGreaterThanOrEqual(2);

      // Generate second room from the first (should stay in same region or create new one based on probability)
      const context2: RoomGenerationContext = {
        gameId: testGameId,
        fromRoomId: result1.roomId!,
        direction: 'north' // Should be available from newly created room
      };

      const result2 = await roomGenerationService.generateRoomWithRegion(context2);
      expect(result2.success).toBe(true);

      const room2 = await db.get<Room>('SELECT * FROM rooms WHERE id = ?', [result2.roomId]);
      expect(room2?.region_id).toBeDefined();
      expect(room2?.region_distance).toBeDefined();

      // Both rooms should have region assignments
      expect(room1?.region_id).not.toBeNull();
      expect(room2?.region_id).not.toBeNull();
    });

    test('should work without region service (backward compatibility)', async () => {
      // Create service without region service
      const basicService = new RoomGenerationService(db, grokClient, undefined, {
        enableDebugLogging: false
      });

      jest.spyOn(grokClient, 'generateRoom').mockResolvedValue({
        name: 'Basic Room',
        description: 'A room generated without region context',
        connections: []
      });

      const context: RoomGenerationContext = {
        gameId: testGameId,
        fromRoomId: testFromRoomId,
        direction: 'south' // Should be available - Grand Entrance Hall doesn't have south connection
      };

      const result = await basicService.generateSingleRoom(context);
      
      expect(result.success).toBe(true);
      expect(result.roomId).toBeDefined();

      // Room should not have region assignment
      const room = await db.get<Room>('SELECT * FROM rooms WHERE id = ?', [result.roomId]);
      expect(room?.region_id).toBeNull();
      expect(room?.region_distance).toBeNull();
    });
  });
});