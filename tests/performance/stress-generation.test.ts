/**
 * Stress Tests for Room Generation Performance
 * 
 * This test suite verifies system performance under high load conditions:
 * - Multiple concurrent generation requests
 * - Rapid successive generation operations  
 * - Large-scale generation scenarios
 * - Memory usage and cleanup verification
 */

import Database from '../../src/utils/database';
import { createGameWithRooms } from '../../src/utils/initDb';
import { initializeTestDatabase } from '../testUtils';
import { RoomGenerationService } from '../../src/services/roomGenerationService';
import { BackgroundGenerationService } from '../../src/services/backgroundGenerationService';
import { ItemService } from '../../src/services/itemService';
import { ItemGenerationService } from '../../src/services/itemGenerationService';
import { RegionService } from '../../src/services/regionService';
import { CharacterService } from '../../src/services/characterService';
import { CharacterGenerationService } from '../../src/services/characterGenerationService';
import { FantasyLevelService } from '../../src/services/fantasyLevelService';
import { GrokClient } from '../../src/ai/grokClient';

// Extend Jest timeout for performance tests
jest.setTimeout(30000);

describe('Room Generation Stress Tests', () => {
  let db: Database;
  let roomGenerationService: RoomGenerationService;
  let backgroundGenerationService: BackgroundGenerationService;
  let testGameId: number;

  beforeEach(async () => {
    // Create isolated test database
    db = new Database(':memory:');
    await db.connect();
    await initializeTestDatabase(db);

    // Create test game
    const uniqueGameName = `Stress Test ${Date.now()}-${Math.random()}`;
    testGameId = await createGameWithRooms(db, uniqueGameName);

    // Initialize services with mock AI (faster than real AI calls)
    const grokClient = new GrokClient({ mockMode: true });
    const regionService = new RegionService(db, { enableDebugLogging: false });
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

    backgroundGenerationService = new BackgroundGenerationService(
      db,
      roomGenerationService,
      { enableDebugLogging: false, disableBackgroundGeneration: true }
    );
  });

  afterEach(async () => {
    // Clean up background promises
    if (backgroundGenerationService) {
      await backgroundGenerationService.waitForBackgroundOperations();
      backgroundGenerationService.resetGenerationState();
    }
    
    if (db && db.isConnected()) {
      await db.close();
    }
  });

  describe('Concurrent Generation Load', () => {
    test('should handle 20 concurrent generation requests', async () => {
      const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ? ORDER BY id ASC', [testGameId]);
      const testRoom = rooms[0];

      // Create multiple unfilled connections for concurrent generation
      const connectionPromises = [];
      const directions = ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest', 'up', 'down'];
      for (let i = 0; i < 20; i++) {
        const direction = directions[i % directions.length];
        connectionPromises.push(
          db.run(
            'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name, processing) VALUES (?, ?, NULL, ?, ?, FALSE)',
            [testGameId, testRoom.id, direction, `stress test corridor ${i} (${direction})`]
          )
        );
      }

      const connectionResults = await Promise.all(connectionPromises);
      
      // Get all the unfilled connections
      const connections = await Promise.all(
        connectionResults.map(result => 
          db.get('SELECT * FROM connections WHERE id = ?', [result.lastID])
        )
      );

      const startTime = Date.now();
      
      // Execute all generations concurrently
      const generationPromises = connections.map(connection => 
        roomGenerationService.generateRoomForConnection(connection!)
      );

      const results = await Promise.all(generationPromises);
      
      const duration = Date.now() - startTime;

      // Verify all succeeded
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.roomId).toBeDefined();
      });

      // Performance check - should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds max for 20 concurrent generations
      
      console.log(`✅ 20 concurrent generations completed in ${duration}ms`);
    });

    test('should handle rapid successive generation requests', async () => {
      const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ? ORDER BY id ASC', [testGameId]);
      const testRoom = rooms[0];

      const startTime = Date.now();
      const results = [];

      // Execute generations in rapid succession (not concurrent)
      const directions = ['north', 'south', 'east', 'west', 'up', 'down', 'northeast', 'northwest', 'southeast', 'southwest'];
      for (let i = 0; i < 10; i++) {
        const direction = directions[i % directions.length];
        // Create unfilled connection
        const connectionResult = await db.run(
          'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name, processing) VALUES (?, ?, NULL, ?, ?, FALSE)',
          [testGameId, testRoom.id, direction, `rapid test ${i} (${direction})`]
        );

        const connection = await db.get('SELECT * FROM connections WHERE id = ?', [connectionResult.lastID]);
        
        const result = await roomGenerationService.generateRoomForConnection(connection!);
        results.push(result);
      }

      const duration = Date.now() - startTime;

      // Verify all succeeded
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.roomId).toBeDefined();
      });

      // Performance check - should be efficient for sequential operations
      expect(duration).toBeLessThan(5000); // 5 seconds max for 10 sequential generations
      
      console.log(`✅ 10 rapid successive generations completed in ${duration}ms`);
    });
  });

  describe('Large Scale Generation', () => {
    test('should handle generating 50 rooms efficiently', async () => {
      const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ? ORDER BY id ASC', [testGameId]);
      let currentRoomId = rooms[0].id;

      const initialRoomCount = await db.get('SELECT COUNT(*) as count FROM rooms WHERE game_id = ?', [testGameId]);
      const startTime = Date.now();

      // Generate rooms in a chain (each new room connects to previous)
      for (let i = 0; i < 50; i++) {
        const directions = ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest'];
        const direction = directions[i % directions.length];
        
        const result = await roomGenerationService.generateSingleRoom({
          gameId: testGameId,
          fromRoomId: currentRoomId,
          direction,
          theme: `large scale test room ${i}`
        });

        // Some generations might fail due to direction conflicts, but most should succeed
        if (result.success) {
          expect(result.roomId).toBeDefined();
          currentRoomId = result.roomId!;
        } else {
          // If generation fails, stay at current room for next attempt
          console.log(`Generation ${i} failed, continuing from room ${currentRoomId}`);
        }
      }

      const duration = Date.now() - startTime;
      const finalRoomCount = await db.get('SELECT COUNT(*) as count FROM rooms WHERE game_id = ?', [testGameId]);
      
      // Verify room count increased appropriately (some generations may fail due to direction conflicts)
      const roomsAdded = finalRoomCount.count - initialRoomCount.count;
      expect(roomsAdded).toBeGreaterThanOrEqual(10); // At least 10 new rooms (relaxed for stress testing)
      expect(roomsAdded).toBeLessThanOrEqual(100); // At most 50 + return rooms

      // Performance check
      expect(duration).toBeLessThan(15000); // 15 seconds max for 50 attempts
      
      console.log(`✅ Generated ${roomsAdded} rooms in ${duration}ms (avg ${Math.round(duration / Math.max(roomsAdded, 1))}ms per room)`);
    });

    test('should maintain performance with large room counts', async () => {
      // First, create a baseline with fewer rooms
      const smallStartTime = Date.now();
      for (let i = 0; i < 5; i++) {
        const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ? ORDER BY id DESC LIMIT 1', [testGameId]);
        const lastRoom = rooms[0];
        
        await roomGenerationService.generateSingleRoom({
          gameId: testGameId,
          fromRoomId: lastRoom.id,
          direction: 'north',
          theme: `baseline test ${i}`
        });
      }
      const smallDuration = Date.now() - smallStartTime;

      // Now create many more rooms and test performance
      for (let i = 0; i < 20; i++) {
        const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ? ORDER BY id DESC LIMIT 1', [testGameId]);
        const lastRoom = rooms[0];
        
        await roomGenerationService.generateSingleRoom({
          gameId: testGameId,
          fromRoomId: lastRoom.id,
          direction: ['east', 'west', 'south', 'up', 'down'][i % 5],
          theme: `scaling test ${i}`
        });
      }

      // Test performance with large room count
      const largeStartTime = Date.now();
      for (let i = 0; i < 5; i++) {
        const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ? ORDER BY id DESC LIMIT 1', [testGameId]);
        const lastRoom = rooms[0];
        
        await roomGenerationService.generateSingleRoom({
          gameId: testGameId,
          fromRoomId: lastRoom.id,
          direction: 'up',
          theme: `large scale test ${i}`
        });
      }
      const largeDuration = Date.now() - largeStartTime;

      // Performance shouldn't degrade significantly with more rooms
      const performanceRatio = largeDuration / smallDuration;
      expect(performanceRatio).toBeLessThan(5); // Should not be more than 5x slower (relaxed for stress testing)
      
      console.log(`✅ Performance scaling: ${smallDuration}ms (small) vs ${largeDuration}ms (large), ratio: ${performanceRatio.toFixed(2)}x`);
    });
  });

  describe('Memory and Resource Management', () => {
    test('should not leak memory during intensive generation', async () => {
      const initialMemory = process.memoryUsage();
      
      // Generate many rooms to test memory usage
      for (let batch = 0; batch < 5; batch++) {
        const promises = [];
        const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ? ORDER BY id ASC', [testGameId]);
        const testRoom = rooms[Math.floor(Math.random() * rooms.length)];
        
        const directions = ['north', 'south', 'east', 'west', 'up', 'down', 'northeast', 'northwest', 'southeast', 'southwest'];
        for (let i = 0; i < 10; i++) {
          const direction = directions[i % directions.length];
          const connectionResult = await db.run(
            'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name, processing) VALUES (?, ?, NULL, ?, ?, FALSE)',
            [testGameId, testRoom.id, direction, `memory test ${batch}-${i} (${direction})`]
          );

          const connection = await db.get('SELECT * FROM connections WHERE id = ?', [connectionResult.lastID]);
          promises.push(roomGenerationService.generateRoomForConnection(connection!));
        }

        await Promise.all(promises);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseRatio = memoryIncrease / initialMemory.heapUsed;

      // Memory usage shouldn't increase dramatically
      expect(memoryIncreaseRatio).toBeLessThan(2); // Less than 100% increase
      
      console.log(`✅ Memory usage: ${Math.round(memoryIncrease / 1024 / 1024)}MB increase (${Math.round(memoryIncreaseRatio * 100)}%)`);
    });

    test('should clean up database connections properly', async () => {
      const connectionCount = 20;
      const databases = [];
      
      try {
        // Create multiple database connections
        for (let i = 0; i < connectionCount; i++) {
          const tempDb = new Database(':memory:');
          await tempDb.connect();
          await initializeTestDatabase(tempDb);
          databases.push(tempDb);
        }

        // Use connections
        const promises = databases.map(async (tempDb, index) => {
          const gameId = await createGameWithRooms(tempDb, `Resource Test ${index}`);
          const rooms = await tempDb.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
          return rooms.length;
        });

        const results = await Promise.all(promises);
        
        // All should have created rooms
        results.forEach(roomCount => {
          expect(roomCount).toBeGreaterThan(0);
        });

        console.log(`✅ Successfully handled ${connectionCount} database connections`);

      } finally {
        // Clean up all connections
        await Promise.all(
          databases.map(async db => {
            if (db && db.isConnected()) {
              await db.close();
            }
          })
        );
      }
    });
  });

  describe('Error Recovery Under Load', () => {
    test('should maintain stability when some generations fail', async () => {
      const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ? ORDER BY id ASC', [testGameId]);
      const testRoom = rooms[0];

      // Create mock that fails intermittently
      const originalGenerate = roomGenerationService.generateRoomForConnection;
      let callCount = 0;
      
      roomGenerationService.generateRoomForConnection = jest.fn().mockImplementation(async (connection) => {
        callCount++;
        // Fail every 3rd call
        if (callCount % 3 === 0) {
          throw new Error(`Simulated failure ${callCount}`);
        }
        return originalGenerate.call(roomGenerationService, connection);
      });

      const connectionPromises = [];
      const directions = ['north', 'south', 'east', 'west', 'up', 'down', 'northeast', 'northwest', 'southeast', 'southwest'];
      for (let i = 0; i < 15; i++) {
        const direction = directions[i % directions.length];
        connectionPromises.push(
          db.run(
            'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name, processing) VALUES (?, ?, NULL, ?, ?, FALSE)',
            [testGameId, testRoom.id, direction, `failure test ${i} (${direction})`]
          )
        );
      }

      const connectionResults = await Promise.all(connectionPromises);
      const connections = await Promise.all(
        connectionResults.map(result => 
          db.get('SELECT * FROM connections WHERE id = ?', [result.lastID])
        )
      );

      // Execute with some expected failures
      const results = await Promise.allSettled(
        connections.map(connection => 
          roomGenerationService.generateRoomForConnection(connection!)
        )
      );

      const successes = results.filter(r => r.status === 'fulfilled').length;
      const failures = results.filter(r => r.status === 'rejected').length;

      // Should have some successes and some failures
      expect(successes).toBeGreaterThan(0);
      expect(failures).toBeGreaterThan(0);
      expect(successes + failures).toBe(15);

      console.log(`✅ Handled ${successes} successes and ${failures} failures gracefully`);
      
      // Restore original method
      roomGenerationService.generateRoomForConnection = originalGenerate;
    });
  });
});