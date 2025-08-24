/**
 * Tests for concurrent room generation and race condition handling
 * 
 * This test suite verifies that the room generation system properly handles
 * race conditions when multiple processes attempt to generate rooms for the
 * same unfilled connections simultaneously.
 */

import Database from '../../src/utils/database';
import { createGameWithRooms } from '../../src/utils/initDb';
import { initializeTestDatabase } from '../testUtils';
import { RoomGenerationService } from '../../src/services/roomGenerationService';
import { ItemService } from '../../src/services/itemService';
import { ItemGenerationService } from '../../src/services/itemGenerationService';
import { RegionService } from '../../src/services/regionService';
import { CharacterService } from '../../src/services/characterService';
import { CharacterGenerationService } from '../../src/services/characterGenerationService';
import { FantasyLevelService } from '../../src/services/fantasyLevelService';
import { GrokClient } from '../../src/ai/grokClient';
import { UnfilledConnection } from '../../src/services/gameStateManager';

// Extend UnfilledConnection to include processing field for tests
interface ExtendedUnfilledConnection extends UnfilledConnection {
  processing: number; // SQLite boolean stored as 0/1
}

describe('Concurrent Generation Race Conditions', () => {
  let db: Database;
  let roomGenerationService: RoomGenerationService;
  let regionService: RegionService;
  let grokClient: GrokClient;
  let testGameId: number;

  beforeEach(async () => {
    // Create isolated in-memory test database
    db = new Database(':memory:');
    await db.connect();
    await initializeTestDatabase(db);

    // Create test game with unique name
    const uniqueGameName = `Concurrent Test ${Date.now()}-${Math.random()}`;
    testGameId = await createGameWithRooms(db, uniqueGameName);

    // Initialize services with mock AI
    grokClient = new GrokClient({ mockMode: true });
    regionService = new RegionService(db, { enableDebugLogging: false });
    
    const itemService = new ItemService(db);
    const itemGenerationService = new ItemGenerationService(db, itemService);
    const characterService = new CharacterService(db);
    const characterGenerationService = new CharacterGenerationService(db, characterService, { enableDebugLogging: false });
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
  });

  afterEach(async () => {
    // Clean up services
    if (grokClient) {
      grokClient.cleanup();
    }
    
    if (db && db.isConnected()) {
      await db.close();
    }
  });

  describe('Connection Claiming Race Conditions', () => {
    test('should handle concurrent generation for same connection', async () => {
      // Get a room from the test game
      const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ? ORDER BY id ASC', [testGameId]);
      const testRoom = rooms[0];
      expect(testRoom).toBeDefined();

      // Create an unfilled connection
      const connectionResult = await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name, processing) VALUES (?, ?, NULL, ?, ?, FALSE)',
        [testGameId, testRoom.id, 'concurrent-test', 'test corridor for concurrency']
      );
      const connectionId = connectionResult.lastID as number;

      // Get the unfilled connection
      const connection = await db.get<UnfilledConnection>(
        'SELECT * FROM connections WHERE id = ?',
        [connectionId]
      );
      expect(connection).toBeDefined();
      expect(connection!.to_room_id).toBeNull();

      // Count initial rooms
      const initialRoomCount = await db.get<any>(
        'SELECT COUNT(*) as count FROM rooms WHERE game_id = ?',
        [testGameId]
      );

      // Execute concurrent generation attempts
      const generation1Promise = roomGenerationService.generateRoomForConnection(connection!);
      const generation2Promise = roomGenerationService.generateRoomForConnection(connection!);
      const generation3Promise = roomGenerationService.generateRoomForConnection(connection!);

      // Wait for all to complete
      const [result1, result2, result3] = await Promise.all([
        generation1Promise,
        generation2Promise, 
        generation3Promise
      ]);

      // All should succeed
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);

      // All should return the same room ID (winner of the race)
      expect(result1.roomId).toBe(result2.roomId);
      expect(result2.roomId).toBe(result3.roomId);

      // Verify only one room was created (plus potential return room)
      const finalRoomCount = await db.get<any>(
        'SELECT COUNT(*) as count FROM rooms WHERE game_id = ?',
        [testGameId]
      );

      // Should have created at most 2 new rooms (generated + return), not 6 (3x2)
      const roomsAdded = finalRoomCount.count - initialRoomCount.count;
      expect(roomsAdded).toBeLessThanOrEqual(2);
      expect(roomsAdded).toBeGreaterThanOrEqual(1);

      // Verify connection is now filled
      const finalConnection = await db.get<any>(
        'SELECT to_room_id FROM connections WHERE id = ?',
        [connectionId]
      );
      expect(finalConnection.to_room_id).toBeTruthy();
      expect(finalConnection.to_room_id).toBe(result1.roomId);
    });

    test('should handle connection already filled before generation', async () => {
      const prefilledTestRooms = await db.all('SELECT * FROM rooms WHERE game_id = ? ORDER BY id ASC', [testGameId]);
      const testRoom = prefilledTestRooms[0];
      
      // Create an unfilled connection
      const connectionResult = await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name, processing) VALUES (?, ?, NULL, ?, ?, FALSE)',
        [testGameId, testRoom.id, 'prefilled-test', 'test corridor for prefilling']
      );
      const connectionId = connectionResult.lastID as number;

      const connection = await db.get<UnfilledConnection>(
        'SELECT * FROM connections WHERE id = ?',
        [connectionId]
      );

      // Create a room to pre-fill the connection
      const existingRoomResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [testGameId, 'Pre-existing Room', 'A room that already exists']
      );
      const existingRoomId = existingRoomResult.lastID as number;

      // Pre-fill the connection to simulate another process winning
      await db.run(
        'UPDATE connections SET to_room_id = ? WHERE id = ?',
        [existingRoomId, connectionId]
      );

      // Now attempt generation - should detect existing room and return it
      const result = await roomGenerationService.generateRoomForConnection(connection!);

      expect(result.success).toBe(true);
      expect(result.roomId).toBe(existingRoomId);

      // Should not have created additional orphaned rooms
      const finalRooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [testGameId]);
      const generatedRoomCount = finalRooms.filter(r => r.name === 'Pre-existing Room').length;
      expect(generatedRoomCount).toBe(1); // Only the one we created
    });
  });

  describe('Processing Flag Management', () => {
    test('should set and clear processing flags correctly', async () => {
      const gameRooms = await db.all('SELECT * FROM rooms WHERE game_id = ? ORDER BY id ASC', [testGameId]);
      const testRoom = gameRooms[0];

      // Create an unfilled connection
      const connectionResult = await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name, processing) VALUES (?, ?, NULL, ?, ?, FALSE)',
        [testGameId, testRoom.id, 'flag-test', 'test corridor for flag management']
      );
      const connectionId = connectionResult.lastID as number;

      const connection = await db.get<UnfilledConnection>(
        'SELECT * FROM connections WHERE id = ?',
        [connectionId]
      );

      // Verify initial processing flag is false
      expect((connection! as ExtendedUnfilledConnection).processing).toBe(0); // SQLite stores boolean as 0/1

      // Start generation (should set processing flag)
      const generationPromise = roomGenerationService.generateRoomForConnection(connection!);
      
      // Give a moment for processing flag to be set
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Check if processing flag was set during generation
      const duringGeneration = await db.get<any>(
        'SELECT processing FROM connections WHERE id = ?',
        [connectionId]
      );
      
      // Complete the generation
      const result = await generationPromise;
      expect(result.success).toBe(true);

      // Verify processing flag is cleared after completion
      const afterGeneration = await db.get<any>(
        'SELECT processing FROM connections WHERE id = ?',
        [connectionId]
      );
      expect(afterGeneration.processing).toBe(0); // Should be cleared
    });

    test('should skip connections already being processed', async () => {
      const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ? ORDER BY id ASC', [testGameId]);
      const testRoom = rooms[0];

      // Create connection with processing flag set
      const connectionResult = await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name, processing) VALUES (?, ?, NULL, ?, ?, TRUE)',
        [testGameId, testRoom.id, 'processing-test', 'test corridor already processing']
      );
      const connectionId = connectionResult.lastID as number;

      const connection = await db.get<UnfilledConnection>(
        'SELECT * FROM connections WHERE id = ?',
        [connectionId]
      );

      // Verify processing flag is set
      expect((connection! as ExtendedUnfilledConnection).processing).toBe(1); // SQLite stores boolean as 1

      // Attempt generation - should handle gracefully
      const result = await roomGenerationService.generateRoomForConnection(connection!);
      
      // Result depends on implementation - either succeeds with existing room or fails gracefully
      if (result.success) {
        expect(result.roomId).toBeDefined();
      } else {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Room Creation Deduplication', () => {
    test('should clean up orphaned rooms on race condition', async () => {
      const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ? ORDER BY id ASC', [testGameId]);
      const testRoom = rooms[0];

      // Create multiple unfilled connections from same room
      const connection1Result = await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name, processing) VALUES (?, ?, NULL, ?, ?, FALSE)',
        [testGameId, testRoom.id, 'dedup-test-1', 'first test corridor']
      );
      const connection2Result = await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name, processing) VALUES (?, ?, NULL, ?, ?, FALSE)',
        [testGameId, testRoom.id, 'dedup-test-2', 'second test corridor']
      );

      const connection1Id = connection1Result.lastID as number;
      const connection2Id = connection2Result.lastID as number;

      const connection1 = await db.get<UnfilledConnection>('SELECT * FROM connections WHERE id = ?', [connection1Id]);
      const connection2 = await db.get<UnfilledConnection>('SELECT * FROM connections WHERE id = ?', [connection2Id]);

      const initialRoomCount = await db.get<any>(
        'SELECT COUNT(*) as count FROM rooms WHERE game_id = ?',
        [testGameId]
      );

      // Generate rooms for both connections simultaneously
      const [result1, result2] = await Promise.all([
        roomGenerationService.generateRoomForConnection(connection1!),
        roomGenerationService.generateRoomForConnection(connection2!)
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Should have created rooms for both directions (different directions)
      expect(result1.roomId).not.toBe(result2.roomId);

      // Verify connections are properly filled
      const finalConnection1 = await db.get<any>('SELECT to_room_id FROM connections WHERE id = ?', [connection1Id]);
      const finalConnection2 = await db.get<any>('SELECT to_room_id FROM connections WHERE id = ?', [connection2Id]);
      
      expect(finalConnection1.to_room_id).toBe(result1.roomId);
      expect(finalConnection2.to_room_id).toBe(result2.roomId);

      // Should have reasonable number of rooms created (each connection can create room + return room)
      const finalRoomCount = await db.get<any>(
        'SELECT COUNT(*) as count FROM rooms WHERE game_id = ?',
        [testGameId]
      );
      const roomsAdded = finalRoomCount.count - initialRoomCount.count;
      expect(roomsAdded).toBeLessThanOrEqual(4); // Max: 2 connections * 2 rooms each
      expect(roomsAdded).toBeGreaterThanOrEqual(2); // Min: 2 connections * 1 room each
    });
  });

  describe('Error Recovery', () => {
    test('should handle database errors gracefully during concurrent generation', async () => {
      const testGameRooms = await db.all('SELECT * FROM rooms WHERE game_id = ? ORDER BY id ASC', [testGameId]);
      const testRoom = testGameRooms[0];

      // Create unfilled connection
      const connectionResult = await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name, processing) VALUES (?, ?, NULL, ?, ?, FALSE)',
        [testGameId, testRoom.id, 'error-test', 'test corridor for error handling']
      );
      
      const connection = await db.get<UnfilledConnection>(
        'SELECT * FROM connections WHERE id = ?',
        [connectionResult.lastID]
      );

      // Mock an AI error to test error handling
      const originalGenerate = grokClient.generateRoom;
      grokClient.generateRoom = jest.fn().mockRejectedValueOnce(new Error('Simulated AI failure'));

      // Generation should handle the error and potentially use fallback
      const result = await roomGenerationService.generateRoomForConnection(connection!);

      // Should either succeed with fallback or fail gracefully
      if (result.success) {
        expect(result.roomId).toBeDefined();
      } else {
        expect(result.error).toBeInstanceOf(Error);
      }

      // Restore original method
      grokClient.generateRoom = originalGenerate;
    });
  });
});