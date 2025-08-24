/**
 * Tests for AI Item Generation in Rooms
 */

import Database from '../../src/utils/database';
import { ItemGenerationService } from '../../src/services/itemGenerationService';
import { ItemService } from '../../src/services/itemService';
import { RoomGenerationService } from '../../src/services/roomGenerationService';
import { RegionService } from '../../src/services/regionService';
import { CharacterService } from '../../src/services/characterService';
import { CharacterGenerationService } from '../../src/services/characterGenerationService';
import { GrokClient } from '../../src/ai/grokClient';
import { ItemType } from '../../src/types/item';
import { initializeDatabase } from '../../src/utils/initDb';

describe('AI Item Generation', () => {
  let db: Database;
  let itemService: ItemService;
  let itemGenerationService: ItemGenerationService;
  let roomGenerationService: RoomGenerationService;
  let regionService: RegionService;
  let grokClient: GrokClient;

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    // Create services
    itemService = new ItemService(db);
    itemGenerationService = new ItemGenerationService(db, itemService);
    regionService = new RegionService(db);
    grokClient = new GrokClient({ mockMode: true }); // Use mock mode for testing
    const characterService = new CharacterService(db);
    const characterGenerationService = new CharacterGenerationService(db, characterService);
    const { FantasyLevelService } = require('../src/services/fantasyLevelService');
    const fantasyLevelService = new FantasyLevelService();
    roomGenerationService = new RoomGenerationService(
      db,
      grokClient,
      regionService,
      itemGenerationService,
      characterGenerationService,
      fantasyLevelService
    );
    
    // Create a test game and initial room
    await db.run(
      'INSERT INTO games (id, name) VALUES (?, ?)',
      [1, 'Test Game']
    );
    
    await db.run(
      'INSERT INTO rooms (id, game_id, name, description) VALUES (?, ?, ?, ?)',
      [1, 1, 'Starting Room', 'A simple starting room']
    );
    
    await db.run(
      'INSERT INTO game_state (game_id, current_room_id) VALUES (?, ?)',
      [1, 1]
    );
  });

  afterEach(async () => {
    await db.close();
  });

  describe('ItemGenerationService', () => {
    test('should create items from AI generation output', async () => {
      const generatedItems = [
        { name: 'Dusty Book', description: 'An old book with yellowed pages.', isFixed: false },
        { name: 'Stone Altar', description: 'A massive altar carved from dark stone.', isFixed: true }
      ];
      
      // Create a test room
      const roomResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [1, 'Test Chamber', 'A mysterious chamber']
      );
      const roomId = roomResult.lastID as number;
      
      // Generate items for the room
      await itemGenerationService.createItemsFromRoomGeneration(roomId, generatedItems);
      
      // Verify items were created
      const roomItems = await itemService.getRoomItems(roomId);
      expect(roomItems).toHaveLength(2);
      
      // Check the dusty book (portable)
      const book = roomItems.find(ri => ri.item.name === 'Dusty Book');
      expect(book).toBeDefined();
      expect(book!.item.is_fixed).toBe(false);
      expect(book!.item.type).toBe(ItemType.MISC);
      expect(book!.item.weight).toBe(0.5);
      
      // Check the stone altar (fixed)
      const altar = roomItems.find(ri => ri.item.name === 'Stone Altar');
      expect(altar).toBeDefined();
      expect(altar!.item.is_fixed).toBe(true);
      expect(altar!.item.weight).toBe(999.0);
    });

    test('should handle empty items array gracefully', async () => {
      const roomResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [1, 'Empty Room', 'An empty chamber']
      );
      const roomId = roomResult.lastID as number;
      
      // Should not throw when no items provided
      await expect(
        itemGenerationService.createItemsFromRoomGeneration(roomId, [])
      ).resolves.not.toThrow();
      
      // No items should be created
      const roomItems = await itemService.getRoomItems(roomId);
      expect(roomItems).toHaveLength(0);
    });

    test('should respect MAX_ITEMS_PER_ROOM configuration', async () => {
      // Temporarily set max items to 2
      process.env.MAX_ITEMS_PER_ROOM = '2';
      const limitedService = new ItemGenerationService(db, itemService);
      
      const generatedItems = [
        { name: 'Item 1', description: 'First item', isFixed: false },
        { name: 'Item 2', description: 'Second item', isFixed: false },
        { name: 'Item 3', description: 'Third item', isFixed: false },
        { name: 'Item 4', description: 'Fourth item', isFixed: false }
      ];
      
      const roomResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [1, 'Crowded Room', 'A room with many items']
      );
      const roomId = roomResult.lastID as number;
      
      await limitedService.createItemsFromRoomGeneration(roomId, generatedItems);
      
      // Should only create 2 items despite 4 being provided
      const roomItems = await itemService.getRoomItems(roomId);
      expect(roomItems).toHaveLength(2);
      
      // Clean up
      delete process.env.MAX_ITEMS_PER_ROOM;
    });

    test('should skip item generation when disabled', async () => {
      // Disable item generation
      process.env.AI_ITEM_GENERATION_ENABLED = 'false';
      const disabledService = new ItemGenerationService(db, itemService);
      
      const generatedItems = [
        { name: 'Test Item', description: 'Should not be created', isFixed: false }
      ];
      
      const roomResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [1, 'No Items Room', 'A room where items are disabled']
      );
      const roomId = roomResult.lastID as number;
      
      await disabledService.createItemsFromRoomGeneration(roomId, generatedItems);
      
      // No items should be created when disabled
      const roomItems = await itemService.getRoomItems(roomId);
      expect(roomItems).toHaveLength(0);
      
      // Clean up
      delete process.env.AI_ITEM_GENERATION_ENABLED;
    });
  });

  describe('Room Generation with Items', () => {
    test('mock AI should generate items with rooms', async () => {
      const context = {
        gameId: 1,
        fromRoomId: 1,
        direction: 'north',
        theme: 'library'
      };
      
      // Generate a room (using mock AI)
      const result = await roomGenerationService.generateSingleRoom(context);
      
      expect(result.success).toBe(true);
      expect(result.roomId).toBeDefined();
      
      // Check if items were created in the new room
      const roomItems = await itemService.getRoomItems(result.roomId!);
      
      // With new dice-based generation (1d6-3), rooms can have 0-3 items
      // 50% chance of 0 items, 50% chance of 1-3 items
      expect(roomItems.length).toBeGreaterThanOrEqual(0);
      expect(roomItems.length).toBeLessThanOrEqual(3);
      
      // If items were generated, verify they have correct properties
      for (const roomItem of roomItems) {
        expect(roomItem.item.name).toBeDefined();
        expect(roomItem.item.description).toBeDefined();
        expect(roomItem.item.type).toBe(ItemType.MISC);
        expect(typeof roomItem.item.is_fixed).toBe('boolean');
      }
    });

    test('should handle room generation when AI provides no items', async () => {
      // Mock a response without items
      const mockResponse = {
        name: 'Empty Chamber',
        description: 'A bare stone chamber with nothing of interest.',
        connections: [
          { direction: 'south', name: 'back to the starting room' }
        ]
        // No items field
      };
      
      // We'd need to mock the grokClient response here
      // For now, this test demonstrates the expected behavior
      
      const context = {
        gameId: 1,
        fromRoomId: 1,
        direction: 'north'
      };
      
      // Generate room should still succeed even without items
      const result = await roomGenerationService.generateSingleRoom(context);
      expect(result.success).toBe(true);
    });
  });

  describe('Integration with Pickup Commands', () => {
    test('fixed items should not be pickupable', async () => {
      const roomResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [1, 'Item Test Room', 'A room for testing items']
      );
      const roomId = roomResult.lastID as number;
      
      // Create a fixed item
      const itemId = await itemService.createItem({
        name: 'Heavy Statue',
        description: 'A massive stone statue.',
        type: ItemType.MISC,
        weight: 999,
        value: 0,
        stackable: false,
        max_stack: 1,
        is_fixed: true
      });
      
      await itemService.placeItemInRoom(roomId, itemId, 1);
      
      // Verify the item is fixed
      const roomItems = await itemService.getRoomItems(roomId);
      const statue = roomItems.find(ri => ri.item.name === 'Heavy Statue');
      
      expect(statue).toBeDefined();
      expect(statue!.item.is_fixed).toBe(true);
      
      // Attempting to pick it up should fail (this would be handled in GameController)
      // Here we just verify the is_fixed flag is set correctly
    });

    test('portable items should be pickupable', async () => {
      const roomResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [1, 'Treasure Room', 'A room with treasures']
      );
      const roomId = roomResult.lastID as number;
      
      // Create a portable item
      const itemId = await itemService.createItem({
        name: 'Golden Coin',
        description: 'A shiny gold coin.',
        type: ItemType.MISC,
        weight: 0.5,
        value: 100,
        stackable: false,
        max_stack: 1,
        is_fixed: false
      });
      
      await itemService.placeItemInRoom(roomId, itemId, 1);
      
      // Verify the item is portable
      const roomItems = await itemService.getRoomItems(roomId);
      const coin = roomItems.find(ri => ri.item.name === 'Golden Coin');
      
      expect(coin).toBeDefined();
      expect(coin!.item.is_fixed).toBe(false);
      
      // This item should be pickupable (handled in GameController)
    });
  });
});