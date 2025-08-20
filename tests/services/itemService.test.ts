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

    test('should throw "not implemented" errors for placeholder methods', async () => {
      // Test that placeholder methods throw appropriate errors
      await expect(itemService.createItem({
        name: 'Test Item',
        description: 'A test item',
        type: ItemType.MISC,
        weight: 1.0,
        value: 10,
        stackable: false,
        max_stack: 1
      })).rejects.toThrow('Not implemented - Phase 2');

      await expect(itemService.getItem(1)).rejects.toThrow('Not implemented - Phase 2');
      await expect(itemService.listItems()).rejects.toThrow('Not implemented - Phase 2');
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
});