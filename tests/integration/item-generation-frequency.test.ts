/**
 * Integration tests for item generation frequency feature
 * Tests the end-to-end flow from AI prompt to item creation
 */

import Database from '../../src/utils/database';
import { ItemGenerationService } from '../../src/services/itemGenerationService';
import { ItemService } from '../../src/services/itemService';
import { GrokClient } from '../../src/ai/grokClient';
import { initializeTestDatabase } from '../testUtils';

describe('Item Generation Frequency Integration', () => {
  let db: Database;
  let itemService: ItemService;
  let itemGenerationService: ItemGenerationService;
  let grokClient: GrokClient;

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.connect();
    await initializeTestDatabase(db);
    
    itemService = new ItemService(db);
    itemGenerationService = new ItemGenerationService(db, itemService);
    
    grokClient = new GrokClient({
      apiKey: 'test-key',
      apiUrl: 'test-url', 
      model: 'test-model',
      maxTokens: 1000,
      temperature: 0.7,
      mockMode: true
    });
  });

  afterEach(async () => {
    await db.close();
  });

  describe('ItemGenerationService Empty Array Handling', () => {
    test('should handle empty items array gracefully', async () => {
      // Create a test room
      await db.run('INSERT INTO rooms (id, name, description, game_id) VALUES (1, "Test Room", "A test room", 1)');
      
      // Test with empty array
      await itemGenerationService.createItemsFromRoomGeneration(1, []);
      
      // Verify no items were created
      const items = await db.all('SELECT * FROM room_items WHERE room_id = 1');
      expect(items).toHaveLength(0);
    });

    test('should handle undefined items array gracefully', async () => {
      // Create a test room
      await db.run('INSERT INTO rooms (id, name, description, game_id) VALUES (1, "Test Room", "A test room", 1)');
      
      // Test with undefined
      await itemGenerationService.createItemsFromRoomGeneration(1, undefined);
      
      // Verify no items were created
      const items = await db.all('SELECT * FROM room_items WHERE room_id = 1');
      expect(items).toHaveLength(0);
    });

    test('should still create items when provided', async () => {
      // Create a test room
      await db.run('INSERT INTO rooms (id, name, description, game_id) VALUES (1, "Test Room", "A test room", 1)');
      
      // Test with actual items
      const testItems = [
        { name: 'Test Item', description: 'A test item', isFixed: false }
      ];
      
      await itemGenerationService.createItemsFromRoomGeneration(1, testItems);
      
      // Verify item was created
      const items = await db.all('SELECT * FROM room_items WHERE room_id = 1');
      expect(items).toHaveLength(1);
      
      const item = await db.get('SELECT * FROM items WHERE id = ?', [items[0].item_id]);
      expect(item.name).toBe('Test Item');
    });
  });

  describe('AI Prompt Distribution Verification', () => {
    test('should generate varying item counts based on dice rolls', async () => {
      const sampleSize = 100;
      const itemCounts: number[] = [];
      
      for (let i = 0; i < sampleSize; i++) {
        // Generate room using mock AI (which internally uses the buildPrompt method)
        const result = await grokClient.generateRoom({
          currentRoom: { name: 'Test Room', description: 'A test room' },
          direction: 'north'
        });
        
        itemCounts.push(result.items?.length || 0);
      }
      
      // Verify we get distribution of 0, 1, 2, 3 items
      const uniqueCounts = [...new Set(itemCounts)];
      expect(uniqueCounts).toContain(0);  // Should have some empty rooms
      expect(uniqueCounts.length).toBeGreaterThan(1);  // Should have variety
      
      // Count occurrences
      const distribution = itemCounts.reduce((acc, count) => {
        acc[count] = (acc[count] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      
      console.log('Generated item distribution:', distribution);
      
      // Should have some rooms with 0 items (approximately 50%)
      const zeroItemRooms = distribution[0] || 0;
      const zeroPercentage = (zeroItemRooms / sampleSize) * 100;
      expect(zeroPercentage).toBeGreaterThan(30);  // At least 30% empty rooms
    });
  });

  describe('End-to-End Room Generation', () => {
    test('should create rooms with varying item counts', async () => {
      // Create game and starting room
      await db.run('INSERT INTO games (id, name, created_at) VALUES (1, "Test Game", datetime("now"))');
      await db.run('INSERT INTO rooms (id, name, description, game_id) VALUES (1, "Start Room", "Starting room", 1)');
      
      const roomResults = [];
      
      // Generate several rooms and track their item counts
      for (let i = 0; i < 20; i++) {
        const roomId = i + 2;  // Start from room 2
        
        // Simulate room generation
        const generatedRoom = await grokClient.generateRoom({
          currentRoom: { name: 'Start Room', description: 'Starting room' },
          direction: 'north'
        });
        
        // Create the room in database
        await db.run(
          'INSERT INTO rooms (id, name, description, game_id) VALUES (?, ?, ?, ?)',
          [roomId, generatedRoom.name, generatedRoom.description, 1]
        );
        
        // Create items if any were generated
        if (generatedRoom.items && generatedRoom.items.length > 0) {
          await itemGenerationService.createItemsFromRoomGeneration(roomId, generatedRoom.items);
        }
        
        // Count items in this room
        const itemCount = await db.get(
          'SELECT COUNT(*) as count FROM room_items WHERE room_id = ?',
          [roomId]
        );
        
        roomResults.push({
          roomId,
          roomName: generatedRoom.name,
          expectedItems: generatedRoom.items?.length || 0,
          actualItems: itemCount.count
        });
      }
      
      // Verify we have a mix of rooms with and without items
      const emptyRooms = roomResults.filter(r => r.actualItems === 0);
      const roomsWithItems = roomResults.filter(r => r.actualItems > 0);
      
      expect(emptyRooms.length).toBeGreaterThan(0);     // Should have some empty rooms
      expect(roomsWithItems.length).toBeGreaterThan(0); // Should have some rooms with items
      
      console.log(`Generated ${roomResults.length} rooms: ${emptyRooms.length} empty, ${roomsWithItems.length} with items`);
      
      // Verify item counts match expectations
      roomResults.forEach(result => {
        expect(result.actualItems).toBe(result.expectedItems);
      });
    });
  });
});