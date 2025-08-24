import Database from '../../src/utils/database';
import { initializeDatabase } from '../../src/utils/initDb';
import { BackgroundGenerationService } from '../../src/services/backgroundGenerationService';
import { RoomGenerationService } from '../../src/services/roomGenerationService';
import { GameStateManager } from '../../src/services/gameStateManager';
import { RegionService } from '../../src/services/regionService';
import { GrokClient } from '../../src/ai/grokClient';
import { UnfilledConnection } from '../../src/services/gameStateManager';
import { ItemService } from '../../src/services/itemService';
import { ItemGenerationService } from '../../src/services/itemGenerationService';
import { CharacterService } from '../../src/services/characterService';
import { CharacterGenerationService } from '../../src/services/characterGenerationService';

describe('Automatic Room Generation on Entry', () => {
  let db: Database;
  let backgroundGenerationService: BackgroundGenerationService;
  let roomGenerationService: RoomGenerationService;
  let gameStateManager: GameStateManager;
  let regionService: RegionService;
  let grokClient: GrokClient;
  let gameId: number;
  let roomId: number;

  beforeEach(async () => {
    // Create in-memory database
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);

    // Initialize services with test configuration
    grokClient = new GrokClient();
    regionService = new RegionService(db, { enableDebugLogging: false });
    gameStateManager = new GameStateManager(db, { enableDebugLogging: false });
    const itemService = new ItemService(db);
    const itemGenerationService = new ItemGenerationService(db, itemService);
    const characterService = new CharacterService(db);
    const characterGenerationService = new CharacterGenerationService(db, characterService, { enableDebugLogging: false });
    const { FantasyLevelService } = require('../src/services/fantasyLevelService');
    const fantasyLevelService = new FantasyLevelService();
    roomGenerationService = new RoomGenerationService(
      db,
      grokClient,
      regionService,
      itemGenerationService,
      characterGenerationService,
      fantasyLevelService,
      { enableDebugLogging: false }
    );
    backgroundGenerationService = new BackgroundGenerationService(
      db,
      roomGenerationService,
      { enableDebugLogging: false, disableBackgroundGeneration: true }
    );

    // Mock room generation to avoid AI calls
    const mockGenerateRoom = jest.spyOn(roomGenerationService, 'generateRoomForConnection');
    mockGenerateRoom.mockResolvedValue({
      success: true,
      roomId: 999, // Mock room ID
      error: undefined
    });

    // Create test game
    const gameResult = await db.run(
      'INSERT INTO games (name) VALUES (?)',
      ['Test Game']
    );
    gameId = gameResult.lastID!;

    // Create test region
    const regionResult = await db.run(
      'INSERT INTO regions (game_id, name, type, description) VALUES (?, ?, ?, ?)',
      [gameId, 'Test Mansion', 'mansion', 'A test mansion for automatic generation']
    );
    const regionId = regionResult.lastID!;

    // Create test room
    const roomResult = await db.run(
      'INSERT INTO rooms (game_id, name, description, region_id, region_distance) VALUES (?, ?, ?, ?, ?)',
      [gameId, 'Test Room', 'A room for testing automatic generation', regionId, 0]
    );
    roomId = roomResult.lastID!;

    // Create game state record
    await db.run(
      'INSERT INTO game_state (game_id, current_room_id) VALUES (?, ?)',
      [gameId, roomId]
    );

    // Start game session
    await gameStateManager.startGameSession(gameId);
  });

  afterEach(async () => {
    // Clean up background generation promises
    if (backgroundGenerationService) {
      await backgroundGenerationService.waitForBackgroundOperations();
      backgroundGenerationService.resetGenerationState();
    }
    
    // Clean up GrokClient HTTP connections
    if (grokClient) {
      grokClient.cleanup();
    }
    
    if (db) {
      await db.close();
    }
  });

  describe('Database Schema', () => {
    it('should have processing column in connections table', async () => {
      const columns = await db.all(`PRAGMA table_info('connections')`);
      const processingColumn = columns.find((col: any) => col.name === 'processing');
      
      expect(processingColumn).toBeDefined();
      expect(processingColumn.type).toBe('BOOLEAN');
      expect(processingColumn.dflt_value).toBe('FALSE');
    });

    it('should default processing to FALSE for new connections', async () => {
      // Create a connection without specifying processing
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, roomId, null, 'north', 'test connection']
      );

      const connection = await db.get(
        'SELECT processing FROM connections WHERE game_id = ? AND from_room_id = ?',
        [gameId, roomId]
      );

      expect(connection.processing).toBe(0);
    });
  });

  describe('Environment Configuration', () => {
    it('should automatically generate rooms on entry', async () => {
      // Create unfilled connections
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, roomId, null, 'north', 'test connection']
      );

      // Mock the room generation to succeed and actually complete the connection
      const mockGenerateRoom = jest.spyOn(roomGenerationService, 'generateRoomForConnection');
      mockGenerateRoom.mockResolvedValue({
        success: true,
        roomId: 999,
        error: undefined
      });
      
      await backgroundGenerationService.generateForRoomEntry(roomId, gameId);
      
      // Verify that generation was called and connection was filled
      expect(mockGenerateRoom).toHaveBeenCalledWith(expect.objectContaining({
        id: expect.any(Number),
        game_id: gameId,
        from_room_id: roomId
      }));
      
      // Check that connection is now filled (not processing)
      const connectionAfter = await db.get(
        'SELECT * FROM connections WHERE game_id = ? AND from_room_id = ?',
        [gameId, roomId]
      );
      expect(connectionAfter.to_room_id).toBe(999);
      expect(connectionAfter.processing).toBe(0);
    });

    it('should respect AUTO_GENERATE_MAX_CONCURRENT limit', async () => {
      // Create more connections than the limit
      for (let i = 0; i < 5; i++) {
        await db.run(
          'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
          [gameId, roomId, null, `direction${i}`, `test connection ${i}`]
        );
      }

      // Set limit to 2
      process.env.AUTO_GENERATE_ON_ENTRY = 'true';
      process.env.AUTO_GENERATE_MAX_CONCURRENT = '2';

      // Mock generation to succeed
      const mockGenerateRoom = jest.spyOn(roomGenerationService, 'generateRoomForConnection');
      mockGenerateRoom.mockResolvedValue({
        success: true,
        roomId: 999,
        error: undefined
      });

      await backgroundGenerationService.generateForRoomEntry(roomId, gameId);

      // Should have called generation exactly 2 times (respecting the limit)
      expect(mockGenerateRoom).toHaveBeenCalledTimes(2);
    });
  });

  describe('Processing Flag Management', () => {
    it('should set and clear processing flag during generation', async () => {
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, roomId, null, 'north', 'test connection']
      );

      // Mock generation to succeed
      const mockGenerateRoom = jest.spyOn(roomGenerationService, 'generateRoomForConnection');
      mockGenerateRoom.mockResolvedValue({
        success: true,
        roomId: 999,
        error: undefined
      });

      process.env.AUTO_GENERATE_ON_ENTRY = 'true';
      
      await backgroundGenerationService.generateForRoomEntry(roomId, gameId);

      // After completion, processing flag should be cleared and room should be connected
      const connection = await db.get(
        'SELECT processing, to_room_id FROM connections WHERE game_id = ? AND from_room_id = ?',
        [gameId, roomId]
      );
      expect(connection.processing).toBe(0);
      expect(connection.to_room_id).toBe(999);
    });

    it('should clear processing flag after successful generation', async () => {
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, roomId, null, 'north', 'test connection']
      );

      const connectionId = (await db.get(
        'SELECT id FROM connections WHERE game_id = ? AND from_room_id = ?',
        [gameId, roomId]
      )).id;

      // Create a new room for the connection
      const newRoomResult = await db.run(
        'INSERT INTO rooms (game_id, name, description, region_id, region_distance) VALUES (?, ?, ?, ?, ?)',
        [gameId, 'Generated Room', 'A generated room', 1, 1]
      );
      const newRoomId = newRoomResult.lastID!;

      // Test completion
      await backgroundGenerationService.completeGeneration(connectionId, newRoomId);

      const connection = await db.get(
        'SELECT processing, to_room_id FROM connections WHERE id = ?',
        [connectionId]
      );
      expect(connection.processing).toBe(0);
      expect(connection.to_room_id).toBe(newRoomId);
    });

    it('should clear processing flag after failed generation', async () => {
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, roomId, null, 'north', 'test connection']
      );

      const connectionId = (await db.get(
        'SELECT id FROM connections WHERE game_id = ? AND from_room_id = ?',
        [gameId, roomId]
      )).id;

      // Set processing flag
      await db.run(
        'UPDATE connections SET processing = TRUE WHERE id = ?',
        [connectionId]
      );

      // Test failure
      const error = new Error('Generation failed');
      await backgroundGenerationService.failGeneration(connectionId, error);

      const connection = await db.get(
        'SELECT processing, to_room_id FROM connections WHERE id = ?',
        [connectionId]
      );
      expect(connection.processing).toBe(0);
      expect(connection.to_room_id).toBeNull();
    });
  });

  describe('Race Condition Prevention', () => {
    it('should not start generation for connections already being processed', async () => {
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name, processing) VALUES (?, ?, ?, ?, ?, ?)',
        [gameId, roomId, null, 'north', 'test connection', true]
      );

      process.env.AUTO_GENERATE_ON_ENTRY = 'true';
      await backgroundGenerationService.generateForRoomEntry(roomId, gameId);

      // Should not find any additional connections being processed
      const processingConnections = await db.all(
        'SELECT * FROM connections WHERE game_id = ? AND processing = TRUE',
        [gameId]
      );
      expect(processingConnections).toHaveLength(1); // Still just the original one
    });

    it('should prevent duplicate processing with database-level protection', async () => {
      const connectionId = (await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, roomId, null, 'north', 'test connection']
      )).lastID!;

      // Simulate concurrent access - first update should succeed, second should fail
      const result1 = await db.run(
        'UPDATE connections SET processing = TRUE WHERE id = ? AND processing = FALSE',
        [connectionId]
      );
      expect(result1.changes).toBe(1);

      const result2 = await db.run(
        'UPDATE connections SET processing = TRUE WHERE id = ? AND processing = FALSE',
        [connectionId]
      );
      expect(result2.changes).toBe(0); // Should fail because processing is already TRUE
    });
  });

  describe.skip('Integration with Existing Systems (DISABLED - Phase 9 cleanup)', () => {
    // NOTE: findUnfilledConnections and findNearbyUnfilledConnections methods removed in Phase 9 cleanup
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Close database to simulate error
      await db.close();

      process.env.AUTO_GENERATE_ON_ENTRY = 'true';
      
      // Should not throw error
      await expect(
        backgroundGenerationService.generateForRoomEntry(roomId, gameId)
      ).resolves.not.toThrow();
    });

    it('should handle generation failures gracefully', async () => {
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, roomId, null, 'north', 'test connection']
      );

      // Mock room generation service to fail
      const originalGenerateRoom = roomGenerationService.generateRoomForConnection;
      roomGenerationService.generateRoomForConnection = jest.fn().mockResolvedValue({
        success: false,
        error: new Error('Mock generation failure')
      });

      process.env.AUTO_GENERATE_ON_ENTRY = 'true';
      
      // Should not throw error
      await expect(
        backgroundGenerationService.generateForRoomEntry(roomId, gameId)
      ).resolves.not.toThrow();

      // Processing flag should be cleared
      const connection = await db.get(
        'SELECT processing FROM connections WHERE game_id = ? AND from_room_id = ?',
        [gameId, roomId]
      );
      expect(connection.processing).toBe(0);

      // Restore original method
      roomGenerationService.generateRoomForConnection = originalGenerateRoom;
    });
  });

  describe('Performance and Resource Management', () => {
    it('should respect room limits when auto-generating', async () => {
      // Create many rooms to approach the limit
      const originalMaxRooms = process.env.MAX_ROOMS_PER_GAME;
      process.env.MAX_ROOMS_PER_GAME = '5';

      // Create 4 additional rooms (total 5 with the initial room)
      for (let i = 0; i < 4; i++) {
        await db.run(
          'INSERT INTO rooms (game_id, name, description, region_id, region_distance) VALUES (?, ?, ?, ?, ?)',
          [gameId, `Extra Room ${i}`, `Description ${i}`, 1, 1]
        );
      }

      // Create unfilled connection
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, roomId, null, 'north', 'test connection']
      );

      process.env.AUTO_GENERATE_ON_ENTRY = 'true';
      await backgroundGenerationService.generateForRoomEntry(roomId, gameId);

      // Should not process the connection because room limit is reached
      const connection = await db.get(
        'SELECT processing FROM connections WHERE game_id = ? AND from_room_id = ?',
        [gameId, roomId]
      );
      expect(connection.processing).toBe(0);

      // Restore original setting
      process.env.MAX_ROOMS_PER_GAME = originalMaxRooms;
    });

    it('should handle delay configuration', async () => {
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, roomId, null, 'north', 'test connection']
      );

      process.env.AUTO_GENERATE_ON_ENTRY = 'true';
      process.env.AUTO_GENERATE_DELAY_MS = '100';

      const startTime = Date.now();
      await backgroundGenerationService.generateForRoomEntry(roomId, gameId);
      const endTime = Date.now();

      // Should have waited at least 100ms
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Success Criteria Verification', () => {
    it('should trigger generation on room entry when enabled', async () => {
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, roomId, null, 'north', 'test connection']
      );

      // Mock generation to succeed
      const mockGenerateRoom = jest.spyOn(roomGenerationService, 'generateRoomForConnection');
      mockGenerateRoom.mockResolvedValue({
        success: true,
        roomId: 999,
        error: undefined
      });

      process.env.AUTO_GENERATE_ON_ENTRY = 'true';
      
      await backgroundGenerationService.generateForRoomEntry(roomId, gameId);
      
      // Verify that generation was triggered and completed
      expect(mockGenerateRoom).toHaveBeenCalled();
      
      const connection = await db.get(
        'SELECT processing, to_room_id FROM connections WHERE game_id = ? AND from_room_id = ?',
        [gameId, roomId]
      );
      expect(connection.to_room_id).toBe(999);
      expect(connection.processing).toBe(0);
    });

    it('should be silent during background operation', async () => {
      // Store original environment variable and disable debug logging
      const originalDebugLogging = process.env.AI_DEBUG_LOGGING;
      delete process.env.AI_DEBUG_LOGGING;

      // Capture console output
      const originalLog = console.log;
      const logs: string[] = [];
      console.log = jest.fn().mockImplementation((...args) => {
        logs.push(args.join(' '));
      });

      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, roomId, null, 'north', 'test connection']
      );

      process.env.AUTO_GENERATE_ON_ENTRY = 'true';
      await backgroundGenerationService.generateForRoomEntry(roomId, gameId);

      // Should not log anything with debug disabled
      expect(logs).toHaveLength(0);

      // Restore console.log and environment
      console.log = originalLog;
      if (originalDebugLogging) {
        process.env.AI_DEBUG_LOGGING = originalDebugLogging;
      }
    });

    it('should prevent duplicate generation for same connection', async () => {
      const connectionId = (await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, roomId, null, 'north', 'test connection']
      )).lastID!;

      process.env.AUTO_GENERATE_ON_ENTRY = 'true';

      // Mock generation to succeed with a small delay to test race conditions properly
      const mockGenerateRoom = jest.spyOn(roomGenerationService, 'generateRoomForConnection');
      mockGenerateRoom.mockImplementation(async () => {
        // Add a small delay to make race condition testing more realistic
        await new Promise(resolve => setTimeout(resolve, 10));
        return {
          success: true,
          roomId: 999,
          error: undefined
        };
      });

      // Trigger generation twice concurrently
      await Promise.all([
        backgroundGenerationService.generateForRoomEntry(roomId, gameId),
        backgroundGenerationService.generateForRoomEntry(roomId, gameId)
      ]);

      // Should only have generated once due to race condition protection
      expect(mockGenerateRoom).toHaveBeenCalledTimes(1);
      
      // Connection should be filled
      const connection = await db.get(
        'SELECT * FROM connections WHERE id = ?',
        [connectionId]
      );
      expect(connection.to_room_id).toBe(999);
      expect(connection.processing).toBe(0);
    });
  });
});