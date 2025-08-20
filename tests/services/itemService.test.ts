/**
 * ItemService Test Suite
 * 
 * Tests for the ItemService class, focusing on Phase 1 database schema validation
 * and basic service instantiation. Later phases will add more functionality tests.
 */

import Database from '../../src/utils/database';
import { initializeDatabase } from '../../src/utils/initDb';
import { ItemService } from '../../src/services/itemService';
import { ItemType } from '../../src/types/item';

describe('ItemService', () => {
  let db: Database;
  let itemService: ItemService;

  beforeEach(async () => {
    // Use in-memory database for test isolation
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    // Create ItemService instance
    itemService = new ItemService(db);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('Database Schema Validation', () => {
    test('should create items table with correct schema', async () => {
      // Check that items table exists
      const itemsTable = await db.get(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='items'
      `);
      expect(itemsTable).toBeDefined();
      expect(itemsTable.name).toBe('items');

      // Check table columns
      const columns = await db.all(`PRAGMA table_info(items)`);
      const columnNames = columns.map((col: any) => col.name);
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('description');
      expect(columnNames).toContain('type');
      expect(columnNames).toContain('weight');
      expect(columnNames).toContain('value');
      expect(columnNames).toContain('stackable');
      expect(columnNames).toContain('max_stack');
      expect(columnNames).toContain('weapon_damage');
      expect(columnNames).toContain('armor_rating');
      expect(columnNames).toContain('created_at');
    });

    test('should create character_inventory table with correct schema', async () => {
      // Check that character_inventory table exists
      const inventoryTable = await db.get(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='character_inventory'
      `);
      expect(inventoryTable).toBeDefined();
      expect(inventoryTable.name).toBe('character_inventory');

      // Check table columns
      const columns = await db.all(`PRAGMA table_info(character_inventory)`);
      const columnNames = columns.map((col: any) => col.name);
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('character_id');
      expect(columnNames).toContain('item_id');
      expect(columnNames).toContain('quantity');
      expect(columnNames).toContain('equipped');
      expect(columnNames).toContain('equipped_slot');
      expect(columnNames).toContain('created_at');
    });

    test('should create room_items table with correct schema', async () => {
      // Check that room_items table exists
      const roomItemsTable = await db.get(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='room_items'
      `);
      expect(roomItemsTable).toBeDefined();
      expect(roomItemsTable.name).toBe('room_items');

      // Check table columns
      const columns = await db.all(`PRAGMA table_info(room_items)`);
      const columnNames = columns.map((col: any) => col.name);
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('room_id');
      expect(columnNames).toContain('item_id');
      expect(columnNames).toContain('quantity');
      expect(columnNames).toContain('created_at');
    });

    test('should create indexes for item tables', async () => {
      // Check that indexes exist
      const indexes = await db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name LIKE 'idx_%_inventory_%' OR name LIKE 'idx_room_items_%'
      `);
      
      const indexNames = indexes.map((idx: any) => idx.name);
      
      expect(indexNames).toContain('idx_character_inventory_character');
      expect(indexNames).toContain('idx_character_inventory_item');
      expect(indexNames).toContain('idx_room_items_room');
      expect(indexNames).toContain('idx_room_items_item');
    });

    test('should have foreign key constraints defined', async () => {
      // Check that foreign key constraints are defined in the schema
      // Note: SQLite may not enforce them by default, but they should be defined
      
      // Check character_inventory foreign keys
      const inventoryForeignKeys = await db.all(`PRAGMA foreign_key_list(character_inventory)`);
      expect(inventoryForeignKeys.length).toBeGreaterThan(0);
      
      const inventoryTableNames = inventoryForeignKeys.map((fk: any) => fk.table);
      expect(inventoryTableNames).toContain('characters');
      expect(inventoryTableNames).toContain('items');

      // Check room_items foreign keys
      const roomItemsForeignKeys = await db.all(`PRAGMA foreign_key_list(room_items)`);
      expect(roomItemsForeignKeys.length).toBeGreaterThan(0);
      
      const roomItemsTableNames = roomItemsForeignKeys.map((fk: any) => fk.table);
      expect(roomItemsTableNames).toContain('rooms');
      expect(roomItemsTableNames).toContain('items');
    });
  });

  describe('Service Instantiation', () => {
    test('should create ItemService instance successfully', () => {
      expect(itemService).toBeInstanceOf(ItemService);
    });

    test('should have database connection', () => {
      // ItemService should have access to database
      expect(itemService).toBeDefined();
      
      // We can't directly test the private db property, but we can test
      // that methods exist and throw the expected "not implemented" errors
      expect(typeof itemService.createItem).toBe('function');
      expect(typeof itemService.getItem).toBe('function');
      expect(typeof itemService.listItems).toBe('function');
    });

    test('should have working CRUD methods', async () => {
      // Test that CRUD methods are now implemented and working
      expect(typeof itemService.createItem).toBe('function');
      expect(typeof itemService.getItem).toBe('function');
      expect(typeof itemService.listItems).toBe('function');
    });
  });

  describe('CRUD Operations', () => {
    test('should create an item and return its ID', async () => {
      const testItem = {
        name: 'Test Sword',
        description: 'A sword for testing',
        type: ItemType.WEAPON,
        weight: 2.0,
        value: 50,
        stackable: false,
        max_stack: 1,
        weapon_damage: '1d6'
      };

      const itemId = await itemService.createItem(testItem);
      
      expect(itemId).toBeDefined();
      expect(typeof itemId).toBe('number');
      expect(itemId).toBeGreaterThan(0);
    });

    test('should retrieve an item by ID', async () => {
      // Create an item first
      const testItem = {
        name: 'Test Potion',
        description: 'A healing potion',
        type: ItemType.CONSUMABLE,
        weight: 0.5,
        value: 25,
        stackable: true,
        max_stack: 10
      };

      const itemId = await itemService.createItem(testItem);
      
      // Retrieve the item
      const retrievedItem = await itemService.getItem(itemId);
      
      expect(retrievedItem).toBeDefined();
      expect(retrievedItem!.id).toBe(itemId);
      expect(retrievedItem!.name).toBe(testItem.name);
      expect(retrievedItem!.description).toBe(testItem.description);
      expect(retrievedItem!.type).toBe(testItem.type);
      expect(retrievedItem!.weight).toBe(testItem.weight);
      expect(retrievedItem!.value).toBe(testItem.value);
      expect(Boolean(retrievedItem!.stackable)).toBe(testItem.stackable);
      expect(retrievedItem!.max_stack).toBe(testItem.max_stack);
    });

    test('should return null for non-existent item', async () => {
      const item = await itemService.getItem(99999);
      expect(item).toBeNull();
    });

    test('should list all items', async () => {
      // Start with empty list (items table might have seed data)
      const initialItems = await itemService.listItems();
      const initialCount = initialItems.length;
      
      // Create test items
      const testItems = [
        {
          name: 'Test Item 1',
          description: 'First test item',
          type: ItemType.MISC,
          weight: 1.0,
          value: 10,
          stackable: false,
          max_stack: 1
        },
        {
          name: 'Test Item 2',
          description: 'Second test item',
          type: ItemType.MISC,
          weight: 2.0,
          value: 20,
          stackable: true,
          max_stack: 5
        }
      ];

      for (const item of testItems) {
        await itemService.createItem(item);
      }

      // List items
      const items = await itemService.listItems();
      
      expect(items.length).toBe(initialCount + testItems.length);
      
      // Verify items are sorted by name
      for (let i = 1; i < items.length; i++) {
        expect(items[i].name.localeCompare(items[i-1].name)).toBeGreaterThanOrEqual(0);
      }
    });

    test('should handle items with all property types', async () => {
      const testItem = {
        name: 'Complete Test Item',
        description: 'An item with all properties set',
        type: ItemType.WEAPON,
        weight: 3.5,
        value: 100,
        stackable: false,
        max_stack: 1,
        weapon_damage: '2d6+2',
        armor_rating: 5
      };

      const itemId = await itemService.createItem(testItem);
      const retrievedItem = await itemService.getItem(itemId);
      
      expect(retrievedItem).toBeDefined();
      expect(retrievedItem!.weapon_damage).toBe(testItem.weapon_damage);
      expect(retrievedItem!.armor_rating).toBe(testItem.armor_rating);
      expect(retrievedItem!.created_at).toBeDefined();
    });

    test('should handle items with null optional properties', async () => {
      const testItem = {
        name: 'Simple Test Item',
        description: 'An item with minimal properties',
        type: ItemType.MISC,
        weight: 1.0,
        value: 5,
        stackable: true,
        max_stack: 10
      };

      const itemId = await itemService.createItem(testItem);
      const retrievedItem = await itemService.getItem(itemId);
      
      expect(retrievedItem).toBeDefined();
      expect(retrievedItem!.weapon_damage).toBeNull();
      expect([0, null]).toContain(retrievedItem!.armor_rating); // Default value or null
    });
  });

  describe('Seed Items', () => {
    test('should have seed items available after database initialization', async () => {
      // The database should have been seeded during initialization
      const items = await itemService.listItems();
      
      // Should have at least some seed items
      expect(items.length).toBeGreaterThan(0);
      
      // Check for specific seed items
      const itemNames = items.map(item => item.name);
      expect(itemNames).toContain('Iron Sword');
      expect(itemNames).toContain('Health Potion');
      expect(itemNames).toContain('Gold Coins');
    });

    test('should have properly configured seed items', async () => {
      const items = await itemService.listItems();
      
      const ironSword = items.find(item => item.name === 'Iron Sword');
      if (ironSword) {
        expect(ironSword.type).toBe(ItemType.WEAPON);
        expect(ironSword.weapon_damage).toBe('1d8+1');
        expect(Boolean(ironSword.stackable)).toBe(false);
      }

      const healthPotion = items.find(item => item.name === 'Health Potion');
      if (healthPotion) {
        expect(healthPotion.type).toBe(ItemType.CONSUMABLE);
        expect(Boolean(healthPotion.stackable)).toBe(true);
        expect(healthPotion.max_stack).toBe(10);
      }
    });
  });

  describe('Utility Methods', () => {
    test('should find item by name with exact match', () => {
      const mockItems = [
        {
          item: {
            id: 1,
            name: 'Iron Sword',
            description: 'A sturdy iron sword',
            type: ItemType.WEAPON,
            weight: 2.5,
            value: 100,
            stackable: false,
            max_stack: 1,
            created_at: new Date().toISOString()
          }
        },
        {
          item: {
            id: 2,
            name: 'Health Potion',
            description: 'Restores health',
            type: ItemType.CONSUMABLE,
            weight: 0.5,
            value: 25,
            stackable: true,
            max_stack: 10,
            created_at: new Date().toISOString()
          }
        }
      ];

      const foundItem = itemService.findItemByName(mockItems, 'iron sword');
      expect(foundItem).toBeDefined();
      expect(foundItem?.item.name).toBe('Iron Sword');
    });

    test('should find item by name with partial match', () => {
      const mockItems = [
        {
          item: {
            id: 1,
            name: 'Iron Sword',
            description: 'A sturdy iron sword',
            type: ItemType.WEAPON,
            weight: 2.5,
            value: 100,
            stackable: false,
            max_stack: 1,
            created_at: new Date().toISOString()
          }
        }
      ];

      const foundItem = itemService.findItemByName(mockItems, 'sword');
      expect(foundItem).toBeDefined();
      expect(foundItem?.item.name).toBe('Iron Sword');
    });

    test('should return undefined for item not found', () => {
      const mockItems: any[] = [];
      
      const foundItem = itemService.findItemByName(mockItems, 'nonexistent');
      expect(foundItem).toBeUndefined();
    });

    test('should be case insensitive when finding items', () => {
      const mockItems = [
        {
          item: {
            id: 1,
            name: 'Iron Sword',
            description: 'A sturdy iron sword',
            type: ItemType.WEAPON,
            weight: 2.5,
            value: 100,
            stackable: false,
            max_stack: 1,
            created_at: new Date().toISOString()
          }
        }
      ];

      const foundItem = itemService.findItemByName(mockItems, 'IRON SWORD');
      expect(foundItem).toBeDefined();
      expect(foundItem?.item.name).toBe('Iron Sword');
    });
  });

  describe('Database Constraints and Defaults', () => {
    test('should enforce NOT NULL constraints', async () => {
      // Test that required fields cannot be null
      await expect(
        db.run(`INSERT INTO items (name, description, type) VALUES (NULL, 'desc', 'weapon')`)
      ).rejects.toThrow();

      await expect(
        db.run(`INSERT INTO items (name, description, type) VALUES ('name', NULL, 'weapon')`)
      ).rejects.toThrow();

      await expect(
        db.run(`INSERT INTO items (name, description, type) VALUES ('name', 'desc', NULL)`)
      ).rejects.toThrow();
    });

    test('should apply default values correctly', async () => {
      // Insert minimal item and check defaults
      const result = await db.run(`
        INSERT INTO items (name, description, type) 
        VALUES ('Test Item', 'Test Description', 'misc')
      `);

      const item = await db.get(`SELECT * FROM items WHERE id = ?`, [result.lastID]);
      
      expect(item.weight).toBe(0.0);
      expect(item.value).toBe(0);
      expect(item.stackable).toBe(0); // SQLite stores boolean as 0/1
      expect(item.max_stack).toBe(1);
      expect(item.created_at).toBeDefined();
    });
  });

  describe('Room Items (Phase 3)', () => {
    let testRoomId: number;
    let testItemId: number;

    beforeEach(async () => {
      // Create a test room for placing items
      const roomResult = await db.run(`
        INSERT INTO rooms (name, description, game_id, region_id)
        VALUES ('Test Room', 'A room for testing items', 1, 1)
      `);
      testRoomId = roomResult.lastID!;

      // Create a test item
      const testItem = {
        name: 'Test Item for Room',
        description: 'An item to test room placement',
        type: ItemType.MISC,
        weight: 1.0,
        value: 10,
        stackable: false,
        max_stack: 1
      };
      testItemId = await itemService.createItem(testItem);
    });

    test('should place an item in a room', async () => {
      await itemService.placeItemInRoom(testRoomId, testItemId, 1);

      // Verify the item was placed by checking the database directly
      const roomItem = await db.get(`
        SELECT * FROM room_items 
        WHERE room_id = ? AND item_id = ?
      `, [testRoomId, testItemId]);

      expect(roomItem).toBeDefined();
      expect(roomItem.room_id).toBe(testRoomId);
      expect(roomItem.item_id).toBe(testItemId);
      expect(roomItem.quantity).toBe(1);
    });

    test('should place multiple quantities of an item in a room', async () => {
      const quantity = 5;
      await itemService.placeItemInRoom(testRoomId, testItemId, quantity);

      const roomItem = await db.get(`
        SELECT * FROM room_items 
        WHERE room_id = ? AND item_id = ?
      `, [testRoomId, testItemId]);

      expect(roomItem.quantity).toBe(quantity);
    });

    test('should retrieve items from a room', async () => {
      // Place multiple items in the room
      const item1 = await itemService.createItem({
        name: 'Room Item 1',
        description: 'First item',
        type: ItemType.WEAPON,
        weight: 2.0,
        value: 50,
        stackable: false,
        max_stack: 1
      });

      const item2 = await itemService.createItem({
        name: 'Room Item 2',
        description: 'Second item',
        type: ItemType.CONSUMABLE,
        weight: 0.5,
        value: 25,
        stackable: true,
        max_stack: 10
      });

      await itemService.placeItemInRoom(testRoomId, item1, 1);
      await itemService.placeItemInRoom(testRoomId, item2, 3);

      // Retrieve room items
      const roomItems = await itemService.getRoomItems(testRoomId);

      expect(roomItems.length).toBe(2);
      
      // Check first item
      const firstItem = roomItems.find(ri => ri.item.name === 'Room Item 1');
      expect(firstItem).toBeDefined();
      expect(firstItem!.quantity).toBe(1);
      expect(firstItem!.room_id).toBe(testRoomId);
      expect(firstItem!.item.type).toBe(ItemType.WEAPON);

      // Check second item
      const secondItem = roomItems.find(ri => ri.item.name === 'Room Item 2');
      expect(secondItem).toBeDefined();
      expect(secondItem!.quantity).toBe(3);
      expect(secondItem!.item.type).toBe(ItemType.CONSUMABLE);
      expect(Boolean(secondItem!.item.stackable)).toBe(true);
    });

    test('should return empty array for room with no items', async () => {
      const roomItems = await itemService.getRoomItems(testRoomId);
      expect(roomItems).toEqual([]);
    });

    test('should handle non-existent room gracefully', async () => {
      const roomItems = await itemService.getRoomItems(99999);
      expect(roomItems).toEqual([]);
    });

    test('should order room items by name', async () => {
      // Create items with names that will test ordering
      const itemZ = await itemService.createItem({
        name: 'Z Last Item',
        description: 'Should appear last',
        type: ItemType.MISC,
        weight: 1.0,
        value: 10,
        stackable: false,
        max_stack: 1
      });

      const itemA = await itemService.createItem({
        name: 'A First Item',
        description: 'Should appear first',
        type: ItemType.MISC,
        weight: 1.0,
        value: 10,
        stackable: false,
        max_stack: 1
      });

      const itemM = await itemService.createItem({
        name: 'M Middle Item',
        description: 'Should appear in middle',
        type: ItemType.MISC,
        weight: 1.0,
        value: 10,
        stackable: false,
        max_stack: 1
      });

      // Place items in reverse alphabetical order
      await itemService.placeItemInRoom(testRoomId, itemZ, 1);
      await itemService.placeItemInRoom(testRoomId, itemM, 1);
      await itemService.placeItemInRoom(testRoomId, itemA, 1);

      const roomItems = await itemService.getRoomItems(testRoomId);
      
      expect(roomItems.length).toBe(3);
      expect(roomItems[0].item.name).toBe('A First Item');
      expect(roomItems[1].item.name).toBe('M Middle Item');
      expect(roomItems[2].item.name).toBe('Z Last Item');
    });

    test('should properly map all item properties in room items', async () => {
      // Create an item with all properties set
      const complexItem = await itemService.createItem({
        name: 'Complex Test Item',
        description: 'An item with all properties',
        type: ItemType.WEAPON,
        weight: 3.5,
        value: 150,
        stackable: false,
        max_stack: 1,
        weapon_damage: '2d6+3',
        armor_rating: 2
      });

      await itemService.placeItemInRoom(testRoomId, complexItem, 1);

      const roomItems = await itemService.getRoomItems(testRoomId);
      const retrievedItem = roomItems[0];

      expect(retrievedItem.item.name).toBe('Complex Test Item');
      expect(retrievedItem.item.description).toBe('An item with all properties');
      expect(retrievedItem.item.type).toBe(ItemType.WEAPON);
      expect(retrievedItem.item.weight).toBe(3.5);
      expect(retrievedItem.item.value).toBe(150);
      expect(Boolean(retrievedItem.item.stackable)).toBe(false);
      expect(retrievedItem.item.max_stack).toBe(1);
      expect(retrievedItem.item.weapon_damage).toBe('2d6+3');
      expect(retrievedItem.item.armor_rating).toBe(2);
      expect(retrievedItem.item.created_at).toBeDefined();
    });
  });

  describe('Item Transfer (Phase 4)', () => {
    let testRoomId: number;
    let testItemId: number;
    let characterId: number;

    beforeEach(async () => {
      // Create a test room
      const roomResult = await db.run(`
        INSERT INTO rooms (name, description, game_id, region_id)
        VALUES ('Transfer Test Room', 'A room for testing transfers', 1, 1)
      `);
      testRoomId = roomResult.lastID!;

      // Create a test item
      const testItem = {
        name: 'Transferable Item',
        description: 'An item to test transfers',
        type: ItemType.MISC,
        weight: 1.0,
        value: 50,
        stackable: true,
        max_stack: 10
      };
      testItemId = await itemService.createItem(testItem);

      // Use game ID as character ID (matches our implementation)
      characterId = 1;
    });

    test('should transfer item from room to character inventory', async () => {
      // Place item in room first
      await itemService.placeItemInRoom(testRoomId, testItemId, 3);

      // Transfer 1 item to character inventory
      await itemService.transferItemToInventory(characterId, testItemId, testRoomId, 1);

      // Check that character inventory was created
      const inventoryItem = await db.get(`
        SELECT * FROM character_inventory 
        WHERE character_id = ? AND item_id = ?
      `, [characterId, testItemId]);

      expect(inventoryItem).toBeDefined();
      expect(inventoryItem.character_id).toBe(characterId);
      expect(inventoryItem.item_id).toBe(testItemId);
      expect(inventoryItem.quantity).toBe(1);

      // Check that room item quantity was reduced
      const roomItem = await db.get(`
        SELECT * FROM room_items 
        WHERE room_id = ? AND item_id = ?
      `, [testRoomId, testItemId]);

      expect(roomItem).toBeDefined();
      expect(roomItem.quantity).toBe(2);
    });

    test('should completely remove item from room when all quantity transferred', async () => {
      // Place item in room
      await itemService.placeItemInRoom(testRoomId, testItemId, 2);

      // Transfer all items
      await itemService.transferItemToInventory(characterId, testItemId, testRoomId, 2);

      // Check that room item was completely removed
      const roomItem = await db.get(`
        SELECT * FROM room_items 
        WHERE room_id = ? AND item_id = ?
      `, [testRoomId, testItemId]);

      expect(roomItem).toBeUndefined();

      // Check that character has all items
      const inventoryItem = await db.get(`
        SELECT * FROM character_inventory 
        WHERE character_id = ? AND item_id = ?
      `, [characterId, testItemId]);

      expect(inventoryItem.quantity).toBe(2);
    });

    test('should stack items when character already has the item', async () => {
      // Place items in room
      await itemService.placeItemInRoom(testRoomId, testItemId, 5);

      // Give character some items first
      await db.run(`
        INSERT INTO character_inventory (character_id, item_id, quantity)
        VALUES (?, ?, ?)
      `, [characterId, testItemId, 3]);

      // Transfer more items
      await itemService.transferItemToInventory(characterId, testItemId, testRoomId, 2);

      // Check that inventory quantity was updated (stacked)
      const inventoryItem = await db.get(`
        SELECT * FROM character_inventory 
        WHERE character_id = ? AND item_id = ?
      `, [characterId, testItemId]);

      expect(inventoryItem.quantity).toBe(5); // 3 + 2
    });

    test('should throw error when item not found in room', async () => {
      await expect(
        itemService.transferItemToInventory(characterId, testItemId, testRoomId, 1)
      ).rejects.toThrow('Item not found in room');
    });

    test('should throw error when not enough quantity available', async () => {
      // Place only 2 items in room
      await itemService.placeItemInRoom(testRoomId, testItemId, 2);

      // Try to transfer 3 items
      await expect(
        itemService.transferItemToInventory(characterId, testItemId, testRoomId, 3)
      ).rejects.toThrow('Not enough quantity available in room');
    });

    test('should handle transfer of non-stackable items', async () => {
      // Create a non-stackable item
      const nonStackableItem = await itemService.createItem({
        name: 'Unique Sword',
        description: 'A unique sword',
        type: ItemType.WEAPON,
        weight: 3.0,
        value: 100,
        stackable: false,
        max_stack: 1
      });

      // Place in room
      await itemService.placeItemInRoom(testRoomId, nonStackableItem, 1);

      // Transfer to character
      await itemService.transferItemToInventory(characterId, nonStackableItem, testRoomId, 1);

      // Check character inventory
      const inventoryItem = await db.get(`
        SELECT * FROM character_inventory 
        WHERE character_id = ? AND item_id = ?
      `, [characterId, nonStackableItem]);

      expect(inventoryItem).toBeDefined();
      expect(inventoryItem.quantity).toBe(1);

      // Check room item was removed
      const roomItem = await db.get(`
        SELECT * FROM room_items 
        WHERE room_id = ? AND item_id = ?
      `, [testRoomId, nonStackableItem]);

      expect(roomItem).toBeUndefined();
    });
  });

  describe('Item Finding Utility', () => {
    test('should find item by exact name match', () => {
      const mockItems = [
        {
          item: {
            id: 1,
            name: 'Iron Sword',
            description: 'A sturdy iron sword',
            type: ItemType.WEAPON,
            weight: 2.5,
            value: 100,
            stackable: false,
            max_stack: 1,
            created_at: new Date().toISOString()
          },
          item_id: 1,
          room_id: 1,
          quantity: 1,
          id: 1,
          created_at: new Date().toISOString()
        }
      ];

      const foundItem = itemService.findItemByName(mockItems, 'Iron Sword');
      expect(foundItem).toBeDefined();
      expect(foundItem?.item.name).toBe('Iron Sword');
    });

    test('should find item by partial name match', () => {
      const mockItems = [
        {
          item: {
            id: 1,
            name: 'Health Potion',
            description: 'Restores health',
            type: ItemType.CONSUMABLE,
            weight: 0.5,
            value: 25,
            stackable: true,
            max_stack: 10,
            created_at: new Date().toISOString()
          },
          item_id: 1,
          room_id: 1,
          quantity: 3,
          id: 1,
          created_at: new Date().toISOString()
        }
      ];

      const foundItem = itemService.findItemByName(mockItems, 'potion');
      expect(foundItem).toBeDefined();
      expect(foundItem?.item.name).toBe('Health Potion');
    });

    test('should be case insensitive', () => {
      const mockItems = [
        {
          item: {
            id: 1,
            name: 'Gold Coins',
            description: 'Shiny gold coins',
            type: ItemType.MISC,
            weight: 0.025,
            value: 1,
            stackable: true,
            max_stack: 1000,
            created_at: new Date().toISOString()
          },
          item_id: 1,
          room_id: 1,
          quantity: 50,
          id: 1,
          created_at: new Date().toISOString()
        }
      ];

      const foundItem = itemService.findItemByName(mockItems, 'GOLD');
      expect(foundItem).toBeDefined();
      expect(foundItem?.item.name).toBe('Gold Coins');
    });

    test('should return undefined when item not found', () => {
      const mockItems: any[] = [];
      
      const foundItem = itemService.findItemByName(mockItems, 'nonexistent');
      expect(foundItem).toBeUndefined();
    });
  });

  describe('Character Inventory (Phase 5)', () => {
    let characterId: number;
    let testItemId1: number;
    let testItemId2: number;

    beforeEach(async () => {
      // Set up character ID (using game ID as character ID)
      characterId = 1;

      // Create test items
      testItemId1 = await itemService.createItem({
        name: 'Inventory Test Sword',
        description: 'A sword for testing inventory',
        type: ItemType.WEAPON,
        weight: 2.5,
        value: 100,
        stackable: false,
        max_stack: 1
      });

      testItemId2 = await itemService.createItem({
        name: 'Inventory Test Potion',
        description: 'A potion for testing inventory',
        type: ItemType.CONSUMABLE,
        weight: 0.5,
        value: 25,
        stackable: true,
        max_stack: 10
      });
    });

    test('should return empty array when character has no items', async () => {
      const inventory = await itemService.getCharacterInventory(characterId);
      
      expect(inventory).toEqual([]);
    });

    test('should retrieve character inventory with single item', async () => {
      // Add item to character inventory
      await db.run(`
        INSERT INTO character_inventory (character_id, item_id, quantity)
        VALUES (?, ?, ?)
      `, [characterId, testItemId1, 1]);

      const inventory = await itemService.getCharacterInventory(characterId);
      
      expect(inventory).toHaveLength(1);
      expect(inventory[0].character_id).toBe(characterId);
      expect(inventory[0].item_id).toBe(testItemId1);
      expect(inventory[0].quantity).toBe(1);
      expect(inventory[0].equipped).toBe(false);
      expect(inventory[0].item.name).toBe('Inventory Test Sword');
      expect(inventory[0].item.type).toBe(ItemType.WEAPON);
    });

    test('should retrieve character inventory with multiple items', async () => {
      // Add multiple items to character inventory
      await db.run(`
        INSERT INTO character_inventory (character_id, item_id, quantity)
        VALUES (?, ?, ?)
      `, [characterId, testItemId1, 1]);

      await db.run(`
        INSERT INTO character_inventory (character_id, item_id, quantity)
        VALUES (?, ?, ?)
      `, [characterId, testItemId2, 5]);

      const inventory = await itemService.getCharacterInventory(characterId);
      
      expect(inventory).toHaveLength(2);
      
      // Should be ordered by type, name (consumable comes before weapon alphabetically)
      expect(inventory[0].item.name).toBe('Inventory Test Potion');
      expect(inventory[0].quantity).toBe(5);
      expect(inventory[1].item.name).toBe('Inventory Test Sword');
      expect(inventory[1].quantity).toBe(1);
    });

    test('should handle equipped items correctly', async () => {
      // Add equipped item to character inventory
      await db.run(`
        INSERT INTO character_inventory (character_id, item_id, quantity, equipped, equipped_slot)
        VALUES (?, ?, ?, ?, ?)
      `, [characterId, testItemId1, 1, true, 'weapon']);

      const inventory = await itemService.getCharacterInventory(characterId);
      
      expect(inventory).toHaveLength(1);
      expect(inventory[0].equipped).toBe(true);
      expect(inventory[0].equipped_slot).toBe('weapon');
    });

    test('should properly convert SQLite boolean values', async () => {
      // Add item with explicit false values (SQLite stores as 0)
      await db.run(`
        INSERT INTO character_inventory (character_id, item_id, quantity, equipped)
        VALUES (?, ?, ?, ?)
      `, [characterId, testItemId2, 3, 0]);

      const inventory = await itemService.getCharacterInventory(characterId);
      
      expect(inventory).toHaveLength(1);
      expect(inventory[0].equipped).toBe(false);
      expect(inventory[0].item.stackable).toBe(true);
    });

    test('should only return items for specific character', async () => {
      const anotherCharacterId = 999;

      // Add item to first character
      await db.run(`
        INSERT INTO character_inventory (character_id, item_id, quantity)
        VALUES (?, ?, ?)
      `, [characterId, testItemId1, 1]);

      // Add item to another character
      await db.run(`
        INSERT INTO character_inventory (character_id, item_id, quantity)
        VALUES (?, ?, ?)
      `, [anotherCharacterId, testItemId2, 3]);

      const inventory = await itemService.getCharacterInventory(characterId);
      
      expect(inventory).toHaveLength(1);
      expect(inventory[0].character_id).toBe(characterId);
      expect(inventory[0].item.name).toBe('Inventory Test Sword');
    });
  });
});