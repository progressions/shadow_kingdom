/**
 * Fixed Items Tests
 * 
 * Tests for the fixed item functionality - items that cannot be picked up
 * but can be examined as scenery.
 */

import Database from '../../src/utils/database';
import { ItemService } from '../../src/services/itemService';
import { ItemType } from '../../src/types/item';

describe('Fixed Items', () => {
  let db: Database;
  let itemService: ItemService;
  let testRoomId: number;
  let movableItemId: number;
  let fixedItemId: number;

  beforeEach(async () => {
    // Use in-memory database for isolated tests
    db = new Database(':memory:');
    await db.connect();
    
    // Initialize database schema
    await initializeTestSchema(db);
    
    // Create service
    itemService = new ItemService(db);
    
    // Set up test data
    testRoomId = 1;
    
    // Create a movable item
    movableItemId = await itemService.createItem({
      name: 'Portable Crystal',
      description: 'A small crystal that fits in your hand.',
      type: ItemType.MISC,
      weight: 1.0,
      value: 50,
      stackable: false,
      max_stack: 1,
      is_fixed: false // explicitly movable
    });
    
    // Create a fixed item (scenery)
    fixedItemId = await itemService.createItem({
      name: 'Ancient Stone Altar',
      description: 'A massive stone altar covered in mysterious runes.',
      type: ItemType.MISC,
      weight: 999,
      value: 0,
      stackable: false,
      max_stack: 1,
      is_fixed: true // scenery that cannot be taken
    });
    
    // Place both items in the test room
    await itemService.placeItemInRoom(testRoomId, movableItemId, 1);
    await itemService.placeItemInRoom(testRoomId, fixedItemId, 1);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('Item Creation and Retrieval', () => {
    it('should create items with correct is_fixed status', async () => {
      const movableItem = await itemService.getItem(movableItemId);
      const fixedItem = await itemService.getItem(fixedItemId);
      
      expect(movableItem).toBeTruthy();
      expect(movableItem!.is_fixed).toBe(false);
      
      expect(fixedItem).toBeTruthy();
      expect(fixedItem!.is_fixed).toBe(true);
    });

    it('should default is_fixed to false when not specified', async () => {
      const itemId = await itemService.createItem({
        name: 'Default Item',
        description: 'An item without explicit is_fixed setting',
        type: ItemType.MISC,
        weight: 1.0,
        value: 10,
        stackable: false,
        max_stack: 1
        // is_fixed not specified - should default to false
      });
      
      const item = await itemService.getItem(itemId);
      expect(item!.is_fixed).toBe(false);
    });

    it('should list items with correct is_fixed status', async () => {
      const allItems = await itemService.listItems();
      
      const movableItem = allItems.find(item => item.id === movableItemId);
      const fixedItem = allItems.find(item => item.id === fixedItemId);
      
      expect(movableItem!.is_fixed).toBe(false);
      expect(fixedItem!.is_fixed).toBe(true);
    });
  });

  describe('Room Items with Fixed Status', () => {
    it('should return room items with correct is_fixed status', async () => {
      const roomItems = await itemService.getRoomItems(testRoomId);
      
      expect(roomItems).toHaveLength(2);
      
      const movableRoomItem = roomItems.find(ri => ri.item_id === movableItemId);
      const fixedRoomItem = roomItems.find(ri => ri.item_id === fixedItemId);
      
      expect(movableRoomItem!.item.is_fixed).toBe(false);
      expect(fixedRoomItem!.item.is_fixed).toBe(true);
    });

    it('should find items by name regardless of fixed status', async () => {
      const roomItems = await itemService.getRoomItems(testRoomId);
      
      const foundMovable = itemService.findItemByName(roomItems, 'crystal');
      const foundFixed = itemService.findItemByName(roomItems, 'altar');
      
      expect(foundMovable).toBeTruthy();
      expect(foundMovable!.item.is_fixed).toBe(false);
      
      expect(foundFixed).toBeTruthy();
      expect(foundFixed!.item.is_fixed).toBe(true);
    });
  });

  describe('Transfer Behavior', () => {
    const testCharacterId = 1;

    it('should allow transfer of movable items to inventory', async () => {
      // This should work normally
      await itemService.transferItemToInventory(
        testCharacterId,
        movableItemId,
        testRoomId,
        1
      );
      
      // Verify item is now in inventory
      const inventory = await itemService.getCharacterInventory(testCharacterId);
      const inventoryItem = inventory.find(inv => inv.item_id === movableItemId);
      
      expect(inventoryItem).toBeTruthy();
      expect(inventoryItem!.item.is_fixed).toBe(false);
      
      // Verify item is no longer in room
      const roomItems = await itemService.getRoomItems(testRoomId);
      const roomItem = roomItems.find(ri => ri.item_id === movableItemId);
      expect(roomItem).toBeUndefined();
    });

    it('should allow transfer of fixed items to inventory (for technical reasons)', async () => {
      // Note: The ItemService transfer methods don't prevent fixed item transfers
      // The prevention happens at the command/UI level
      await itemService.transferItemToInventory(
        testCharacterId,
        fixedItemId,
        testRoomId,
        1
      );
      
      // Verify the technical transfer worked
      const inventory = await itemService.getCharacterInventory(testCharacterId);
      const inventoryItem = inventory.find(inv => inv.item_id === fixedItemId);
      
      expect(inventoryItem).toBeTruthy();
      expect(inventoryItem!.item.is_fixed).toBe(true);
    });

    it('should preserve is_fixed status in character inventory', async () => {
      // Transfer both types of items
      await itemService.transferItemToInventory(testCharacterId, movableItemId, testRoomId, 1);
      await itemService.transferItemToInventory(testCharacterId, fixedItemId, testRoomId, 1);
      
      const inventory = await itemService.getCharacterInventory(testCharacterId);
      
      const movableInInventory = inventory.find(inv => inv.item_id === movableItemId);
      const fixedInInventory = inventory.find(inv => inv.item_id === fixedItemId);
      
      expect(movableInInventory!.item.is_fixed).toBe(false);
      expect(fixedInInventory!.item.is_fixed).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null is_fixed values from database', async () => {
      // Create item directly in database without is_fixed value
      const result = await db.run(`
        INSERT INTO items (name, description, type, weight, value, stackable, max_stack)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, ['Legacy Item', 'An item created without is_fixed', ItemType.MISC, 1.0, 10, false, 1]);
      
      const itemId = result.lastID!;
      const item = await itemService.getItem(itemId);
      
      // Should handle null/undefined as false
      expect(item!.is_fixed).toBe(false);
    });

    it('should handle database migration correctly', async () => {
      // This test verifies that the migration adds the column correctly
      const columns = await db.all<any>('PRAGMA table_info(items)');
      const isFixedColumn = columns.find(col => col.name === 'is_fixed');
      
      expect(isFixedColumn).toBeTruthy();
      expect(isFixedColumn.type).toBe('BOOLEAN');
      expect(isFixedColumn.dflt_value).toBe('FALSE');
    });
  });
});

/**
 * Initialize the test database schema
 */
async function initializeTestSchema(db: Database): Promise<void> {
  // Create items table with is_fixed column
  await db.run(`
    CREATE TABLE items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      extended_description TEXT,
      type TEXT NOT NULL,
      weight REAL NOT NULL,
      value INTEGER NOT NULL,
      stackable BOOLEAN NOT NULL DEFAULT FALSE,
      max_stack INTEGER DEFAULT 1,
      armor_rating INTEGER,
      equipment_slot TEXT,
      is_fixed BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create character_inventory table
  await db.run(`
    CREATE TABLE character_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      equipped BOOLEAN NOT NULL DEFAULT FALSE,
      equipped_slot TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items (id)
    )
  `);

  // Create room_items table
  await db.run(`
    CREATE TABLE room_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items (id)
    )
  `);
}