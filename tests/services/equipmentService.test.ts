/**
 * EquipmentService Tests
 * 
 * Comprehensive tests for the equipment system including equipping, unequipping,
 * and equipment display functionality.
 */

import Database from '../../src/utils/database';
import { EquipmentService } from '../../src/services/equipmentService';
import { ItemService } from '../../src/services/itemService';
import { EquipmentSlot, ItemType } from '../../src/types/item';

describe('EquipmentService', () => {
  let db: Database;
  let equipmentService: EquipmentService;
  let itemService: ItemService;
  let testCharacterId: number;
  let testRoomId: number;
  let swordItemId: number;
  let armorItemId: number;
  let helmetItemId: number;
  let consumableItemId: number;

  beforeEach(async () => {
    // Use in-memory database for isolated tests
    db = new Database(':memory:');
    await db.connect();
    
    // Initialize database schema
    await initializeTestSchema(db);
    
    // Create services
    equipmentService = new EquipmentService(db);
    itemService = new ItemService(db);
    
    // Set up test data
    testCharacterId = 1;
    testRoomId = 1;
    
    // Create test items with equipment slots
    swordItemId = await itemService.createItem({
      name: 'Test Sword',
      description: 'A test sword for equipment testing',
      type: ItemType.WEAPON,
      weight: 2.0,
      value: 100,
      stackable: false,
      max_stack: 1,
      equipment_slot: EquipmentSlot.HAND
    });
    
    armorItemId = await itemService.createItem({
      name: 'Test Armor',
      description: 'Test armor for equipment testing',
      type: ItemType.ARMOR,
      weight: 5.0,
      value: 200,
      stackable: false,
      max_stack: 1,
      armor_rating: 3,
      equipment_slot: EquipmentSlot.BODY
    });
    
    helmetItemId = await itemService.createItem({
      name: 'Test Helmet',
      description: 'Test helmet for equipment testing',
      type: ItemType.ARMOR,
      weight: 1.5,
      value: 75,
      stackable: false,
      max_stack: 1,
      armor_rating: 1,
      equipment_slot: EquipmentSlot.HEAD
    });
    
    // Create a non-equippable item for testing
    consumableItemId = await itemService.createItem({
      name: 'Test Potion',
      description: 'A test potion that cannot be equipped',
      type: ItemType.CONSUMABLE,
      weight: 0.5,
      value: 25,
      stackable: true,
      max_stack: 10
      // No equipment_slot - should not be equippable
    });
    
    // Add items to room and then transfer to character inventory
    await itemService.placeItemInRoom(testRoomId, swordItemId, 1);
    await itemService.placeItemInRoom(testRoomId, armorItemId, 1);
    await itemService.placeItemInRoom(testRoomId, helmetItemId, 1);
    await itemService.placeItemInRoom(testRoomId, consumableItemId, 1);
    
    // Transfer items to character inventory
    await itemService.transferItemToInventory(testCharacterId, swordItemId, testRoomId, 1);
    await itemService.transferItemToInventory(testCharacterId, armorItemId, testRoomId, 1);
    await itemService.transferItemToInventory(testCharacterId, helmetItemId, testRoomId, 1);
    await itemService.transferItemToInventory(testCharacterId, consumableItemId, testRoomId, 1);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('Equipment Basic Functionality', () => {
    it('should equip an item successfully', async () => {
      // Test equipping the sword
      await equipmentService.equipItem(testCharacterId, swordItemId);
      
      // Verify the item is equipped
      const inventory = await itemService.getCharacterInventory(testCharacterId);
      const equippedSword = inventory.find(item => item.item_id === swordItemId);
      
      expect(equippedSword).toBeDefined();
      expect(equippedSword!.equipped).toBe(true);
      expect(equippedSword!.equipped_slot).toBe(EquipmentSlot.HAND);
    });

    it('should unequip an item successfully', async () => {
      // First equip the item
      await equipmentService.equipItem(testCharacterId, swordItemId);
      
      // Then unequip it
      await equipmentService.unequipItem(testCharacterId, swordItemId);
      
      // Verify the item is unequipped
      const inventory = await itemService.getCharacterInventory(testCharacterId);
      const unequippedSword = inventory.find(item => item.item_id === swordItemId);
      
      expect(unequippedSword).toBeDefined();
      expect(unequippedSword!.equipped).toBe(false);
      expect(unequippedSword!.equipped_slot).toBeNull();
    });

    it('should get equipped items correctly', async () => {
      // Equip multiple items
      await equipmentService.equipItem(testCharacterId, swordItemId);
      await equipmentService.equipItem(testCharacterId, armorItemId);
      
      // Get equipped items
      const equippedItems = await equipmentService.getEquippedItems(testCharacterId);
      
      expect(equippedItems).toHaveLength(2);
      expect(equippedItems.some(item => item.item_id === swordItemId)).toBe(true);
      expect(equippedItems.some(item => item.item_id === armorItemId)).toBe(true);
    });

    it('should get equipment summary correctly', async () => {
      // Equip items in different slots
      await equipmentService.equipItem(testCharacterId, swordItemId);
      await equipmentService.equipItem(testCharacterId, armorItemId);
      await equipmentService.equipItem(testCharacterId, helmetItemId);
      
      // Get equipment summary
      const summary = await equipmentService.getEquipmentSummary(testCharacterId);
      
      expect(summary.hand).toBeDefined();
      expect(summary.hand!.item_id).toBe(swordItemId);
      expect(summary.body).toBeDefined();
      expect(summary.body!.item_id).toBe(armorItemId);
      expect(summary.head).toBeDefined();
      expect(summary.head!.item_id).toBe(helmetItemId);
      expect(summary.foot).toBeUndefined();
    });
  });

  describe('Equipment Validation', () => {
    it('should throw error when equipping non-existent item', async () => {
      await expect(equipmentService.equipItem(testCharacterId, 999))
        .rejects.toThrow('Item not found');
    });

    it('should throw error when equipping non-equippable item', async () => {
      await expect(equipmentService.equipItem(testCharacterId, consumableItemId))
        .rejects.toThrow('Item cannot be equipped');
    });

    it('should throw error when equipping item not in inventory', async () => {
      // Create another character and try to equip item from first character's inventory
      const otherCharacterId = 2;
      
      await expect(equipmentService.equipItem(otherCharacterId, swordItemId))
        .rejects.toThrow('Item not found in character inventory');
    });

    it('should throw error when equipping already equipped item', async () => {
      // First equip the item
      await equipmentService.equipItem(testCharacterId, swordItemId);
      
      // Try to equip it again
      await expect(equipmentService.equipItem(testCharacterId, swordItemId))
        .rejects.toThrow('Item is already equipped');
    });

    it('should throw error when slot is already occupied', async () => {
      // Equip the sword first
      await equipmentService.equipItem(testCharacterId, swordItemId);
      
      // Create another hand weapon
      const secondSwordId = await itemService.createItem({
        name: 'Second Sword',
        description: 'Another sword for testing',
        type: ItemType.WEAPON,
        weight: 2.0,
        value: 100,
        stackable: false,
        max_stack: 1,
          equipment_slot: EquipmentSlot.HAND
      });
      
      // Add to inventory
      await itemService.placeItemInRoom(testRoomId, secondSwordId, 1);
      await itemService.transferItemToInventory(testCharacterId, secondSwordId, testRoomId, 1);
      
      // Try to equip second sword (should fail because hand slot is occupied)
      await expect(equipmentService.equipItem(testCharacterId, secondSwordId))
        .rejects.toThrow(/Slot hand is already occupied/);
    });

    it('should throw error when unequipping non-equipped item', async () => {
      await expect(equipmentService.unequipItem(testCharacterId, swordItemId))
        .rejects.toThrow('Item is not equipped');
    });
  });

  describe('Item Finding', () => {
    it('should find equippable item by exact name', async () => {
      const foundItem = await equipmentService.findEquippableItem(testCharacterId, 'Test Sword');
      
      expect(foundItem).toBeDefined();
      expect(foundItem!.item_id).toBe(swordItemId);
      expect(foundItem!.item.name).toBe('Test Sword');
    });

    it('should find equippable item by partial name', async () => {
      const foundItem = await equipmentService.findEquippableItem(testCharacterId, 'sword');
      
      expect(foundItem).toBeDefined();
      expect(foundItem!.item_id).toBe(swordItemId);
    });

    it('should find equippable item by case-insensitive search', async () => {
      const foundItem = await equipmentService.findEquippableItem(testCharacterId, 'SWORD');
      
      expect(foundItem).toBeDefined();
      expect(foundItem!.item_id).toBe(swordItemId);
    });

    it('should not find non-equippable items', async () => {
      const foundItem = await equipmentService.findEquippableItem(testCharacterId, 'Test Potion');
      
      expect(foundItem).toBeNull();
    });

    it('should not find equipped items', async () => {
      // Equip the sword first
      await equipmentService.equipItem(testCharacterId, swordItemId);
      
      // Try to find it (should not find because it's already equipped)
      const foundItem = await equipmentService.findEquippableItem(testCharacterId, 'Test Sword');
      
      expect(foundItem).toBeNull();
    });

    it('should return null for non-existent item names', async () => {
      const foundItem = await equipmentService.findEquippableItem(testCharacterId, 'Non-existent Item');
      
      expect(foundItem).toBeNull();
    });
  });

  describe('Slot Validation', () => {
    it('should correctly validate equipment slots', async () => {
      const swordItem = await itemService.getItem(swordItemId);
      const armorItem = await itemService.getItem(armorItemId);
      
      expect(equipmentService.canEquipToSlot(swordItem!, EquipmentSlot.HAND)).toBe(true);
      expect(equipmentService.canEquipToSlot(swordItem!, EquipmentSlot.BODY)).toBe(false);
      expect(equipmentService.canEquipToSlot(armorItem!, EquipmentSlot.BODY)).toBe(true);
      expect(equipmentService.canEquipToSlot(armorItem!, EquipmentSlot.HAND)).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete equip/unequip workflow', async () => {
      // Start with empty equipment
      let summary = await equipmentService.getEquipmentSummary(testCharacterId);
      expect(Object.keys(summary)).toHaveLength(0);
      
      // Equip sword
      await equipmentService.equipItem(testCharacterId, swordItemId);
      summary = await equipmentService.getEquipmentSummary(testCharacterId);
      expect(summary.hand).toBeDefined();
      expect(summary.hand!.item.name).toBe('Test Sword');
      
      // Equip armor
      await equipmentService.equipItem(testCharacterId, armorItemId);
      summary = await equipmentService.getEquipmentSummary(testCharacterId);
      expect(summary.body).toBeDefined();
      expect(summary.body!.item.name).toBe('Test Armor');
      
      // Unequip sword
      await equipmentService.unequipItem(testCharacterId, swordItemId);
      summary = await equipmentService.getEquipmentSummary(testCharacterId);
      expect(summary.hand).toBeUndefined();
      expect(summary.body).toBeDefined(); // Armor should still be equipped
      
      // Unequip armor
      await equipmentService.unequipItem(testCharacterId, armorItemId);
      summary = await equipmentService.getEquipmentSummary(testCharacterId);
      expect(Object.keys(summary)).toHaveLength(0);
    });
  });
});

/**
 * Initialize the test database schema
 */
async function initializeTestSchema(db: Database): Promise<void> {
  // Create items table
  await db.run(`
    CREATE TABLE items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
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