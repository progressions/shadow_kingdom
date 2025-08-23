/**
 * Armor Damage Reduction Tests
 * 
 * Tests for armor damage reduction system using the item "value" field
 * to provide armor points that reduce incoming damage.
 */

import Database from '../../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import { EquipmentService } from '../../src/services/equipmentService';
import { ItemService } from '../../src/services/itemService';
import { GameStateManager } from '../../src/services/gameStateManager';
import { CharacterService } from '../../src/services/characterService';
import { Item, ItemType, EquipmentSlot } from '../../src/types/item';
import { Character, CharacterType, CharacterSentiment } from '../../src/types/character';

describe('Armor Damage Reduction System', () => {
  let db: Database;
  let equipmentService: EquipmentService;
  let itemService: ItemService;
  let gameStateManager: GameStateManager;
  let characterService: CharacterService;
  let gameId: number;
  let playerCharacterId: number;
  let startingRoomId: number;

  beforeEach(async () => {
    // Ensure we use legacy services, not Prisma
    process.env.USE_PRISMA = 'false';
    process.env.NODE_ENV = 'test';

    // Create in-memory database for testing
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);

    // Create a unique test game
    const uniqueGameName = `Armor Test ${Date.now()}-${Math.random()}`;
    gameId = await createGameWithRooms(db, uniqueGameName);

    // Initialize services
    equipmentService = new EquipmentService(db);
    itemService = new ItemService(db);
    gameStateManager = new GameStateManager(db);
    characterService = new CharacterService(db);

    // Create a player character
    const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
    startingRoomId = rooms[0].id;
    
    playerCharacterId = await characterService.createCharacter({
      game_id: gameId,
      name: 'Player',
      description: 'The player character',
      type: CharacterType.PLAYER,
      current_room_id: startingRoomId,
      sentiment: CharacterSentiment.INDIFFERENT
    });
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('calculateArmorPoints', () => {
    test('should return 0 armor points when no armor is equipped', async () => {
      const armorPoints = await equipmentService.calculateArmorPoints(playerCharacterId);
      expect(armorPoints).toBe(0);
    });

    test('should return armor value from single equipped armor piece', async () => {
      // Create a helmet with armor value
      const helmetId = await itemService.createItem({
        name: 'Iron Helmet',
        description: 'A sturdy iron helmet',
        type: ItemType.ARMOR,
        weight: 2.0,
        value: 3, // value = 3 armor points
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.HEAD
      });

      // Place helmet in room, transfer to inventory, and equip
      await itemService.placeItemInRoom(startingRoomId, helmetId, 1);
      await itemService.transferItemToInventory(playerCharacterId, helmetId, startingRoomId, 1);
      await equipmentService.equipItem(playerCharacterId, helmetId);

      // Get armor points
      const armorPoints = await equipmentService.calculateArmorPoints(playerCharacterId);
      expect(armorPoints).toBe(3);
    });

    test('should sum armor values from multiple equipped armor pieces', async () => {
      // Create helmet with 3 armor points
      const helmetId = await itemService.createItem({
        name: 'Steel Helmet',
        description: 'A steel helmet',
        type: ItemType.ARMOR,
        weight: 2.5,
        value: 3,
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.HEAD
      });

      // Create chest armor with 5 armor points
      const chestArmorId = await itemService.createItem({
        name: 'Chain Mail',
        description: 'Chain mail armor',
        type: ItemType.ARMOR,
        weight: 8.0,
        value: 5,
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.BODY
      });

      // Create boots with 2 armor points
      const bootsId = await itemService.createItem({
        name: 'Iron Boots',
        description: 'Heavy iron boots',
        type: ItemType.ARMOR,
        weight: 3.0,
        value: 2,
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.FOOT
      });

      // Place items and equip them
      await itemService.placeItemInRoom(startingRoomId, helmetId, 1);
      await itemService.placeItemInRoom(startingRoomId, chestArmorId, 1);
      await itemService.placeItemInRoom(startingRoomId, bootsId, 1);
      
      await itemService.transferItemToInventory(playerCharacterId, helmetId, startingRoomId, 1);
      await itemService.transferItemToInventory(playerCharacterId, chestArmorId, startingRoomId, 1);
      await itemService.transferItemToInventory(playerCharacterId, bootsId, startingRoomId, 1);
      
      await equipmentService.equipItem(playerCharacterId, helmetId);
      await equipmentService.equipItem(playerCharacterId, chestArmorId);
      await equipmentService.equipItem(playerCharacterId, bootsId);

      // Get total armor points
      const armorPoints = await equipmentService.calculateArmorPoints(playerCharacterId);
      expect(armorPoints).toBe(10); // 3 + 5 + 2 = 10
    });

    test('should ignore non-armor equipped items', async () => {
      // Create a weapon (not armor)
      const swordId = await itemService.createItem({
        name: 'Iron Sword',
        description: 'A sharp iron blade',
        type: ItemType.WEAPON,
        weight: 1.5,
        value: 4, // weapon damage, should not count as armor
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.HAND
      });

      // Create armor piece
      const helmetId = await itemService.createItem({
        name: 'Leather Cap',
        description: 'A simple leather cap',
        type: ItemType.ARMOR,
        weight: 0.5,
        value: 1, // 1 armor point
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.HEAD
      });

      // Place items and equip them
      await itemService.placeItemInRoom(startingRoomId, swordId, 1);
      await itemService.placeItemInRoom(startingRoomId, helmetId, 1);
      
      await itemService.transferItemToInventory(playerCharacterId, swordId, startingRoomId, 1);
      await itemService.transferItemToInventory(playerCharacterId, helmetId, startingRoomId, 1);
      
      await equipmentService.equipItem(playerCharacterId, swordId);
      await equipmentService.equipItem(playerCharacterId, helmetId);

      // Get armor points - should only count helmet, not sword
      const armorPoints = await equipmentService.calculateArmorPoints(playerCharacterId);
      expect(armorPoints).toBe(1); // Only helmet counts
    });

    test('should ignore armor items in inventory but not equipped', async () => {
      // Create armor
      const helmetId = await itemService.createItem({
        name: 'Magic Helmet',
        description: 'A magical helmet',
        type: ItemType.ARMOR,
        weight: 1.0,
        value: 8, // 8 armor points
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.HEAD
      });

      // Place in room and transfer to inventory (but don't equip)
      await itemService.placeItemInRoom(startingRoomId, helmetId, 1);
      await itemService.transferItemToInventory(playerCharacterId, helmetId, startingRoomId, 1);
      // NOT calling equipItem

      // Get armor points - should be 0 since not equipped
      const armorPoints = await equipmentService.calculateArmorPoints(playerCharacterId);
      expect(armorPoints).toBe(0);
    });

    test('should handle zero armor value', async () => {
      // Create armor with 0 value
      const helmetId = await itemService.createItem({
        name: 'Ceremonial Crown',
        description: 'A decorative crown with no protection',
        type: ItemType.ARMOR,
        weight: 0.2,
        value: 0, // 0 armor points
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.HEAD
      });

      // Place, transfer, and equip
      await itemService.placeItemInRoom(startingRoomId, helmetId, 1);
      await itemService.transferItemToInventory(playerCharacterId, helmetId, startingRoomId, 1);
      await equipmentService.equipItem(playerCharacterId, helmetId);

      // Get armor points
      const armorPoints = await equipmentService.calculateArmorPoints(playerCharacterId);
      expect(armorPoints).toBe(0);
    });

    test('should handle negative armor value', async () => {
      // Create "cursed" armor with negative value (reduces armor)
      const cursedHelmetId = await itemService.createItem({
        name: 'Cursed Helmet',
        description: 'A cursed helmet that weakens the wearer',
        type: ItemType.ARMOR,
        weight: 1.0,
        value: -2, // -2 armor points (cursed)
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.HEAD
      });

      // Place, transfer, and equip
      await itemService.placeItemInRoom(startingRoomId, cursedHelmetId, 1);
      await itemService.transferItemToInventory(playerCharacterId, cursedHelmetId, startingRoomId, 1);
      await equipmentService.equipItem(playerCharacterId, cursedHelmetId);

      // Get armor points
      const armorPoints = await equipmentService.calculateArmorPoints(playerCharacterId);
      expect(armorPoints).toBe(-2);
    });
  });

  describe('calculateDamageAfterArmor', () => {
    test('should return full damage when no armor is equipped', async () => {
      const incomingDamage = 5;
      const finalDamage = await equipmentService.calculateDamageAfterArmor(playerCharacterId, incomingDamage);
      expect(finalDamage).toBe(5);
    });

    test('should reduce damage by armor points', async () => {
      // Create and equip armor with 3 armor points
      const armorId = await itemService.createItem({
        name: 'Leather Armor',
        description: 'Basic leather protection',
        type: ItemType.ARMOR,
        weight: 3.0,
        value: 3,
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.BODY
      });

      await itemService.placeItemInRoom(startingRoomId, armorId, 1);
      await itemService.transferItemToInventory(playerCharacterId, armorId, startingRoomId, 1);
      await equipmentService.equipItem(playerCharacterId, armorId);

      // Test damage reduction
      const incomingDamage = 7;
      const finalDamage = await equipmentService.calculateDamageAfterArmor(playerCharacterId, incomingDamage);
      expect(finalDamage).toBe(4); // 7 - 3 = 4
    });

    test('should enforce minimum damage of 1', async () => {
      // Create heavy armor with high armor points
      const heavyArmorId = await itemService.createItem({
        name: 'Plate Armor',
        description: 'Heavy plate armor',
        type: ItemType.ARMOR,
        weight: 15.0,
        value: 10, // 10 armor points
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.BODY
      });

      await itemService.placeItemInRoom(startingRoomId, heavyArmorId, 1);
      await itemService.transferItemToInventory(playerCharacterId, heavyArmorId, startingRoomId, 1);
      await equipmentService.equipItem(playerCharacterId, heavyArmorId);

      // Test with low incoming damage
      const incomingDamage = 3;
      const finalDamage = await equipmentService.calculateDamageAfterArmor(playerCharacterId, incomingDamage);
      expect(finalDamage).toBe(1); // Math.max(1, 3 - 10) = 1
    });

    test('should work with multiple armor pieces', async () => {
      // Create multiple armor pieces
      const helmetId = await itemService.createItem({
        name: 'War Helmet',
        description: 'A war helmet',
        type: ItemType.ARMOR,
        weight: 2.0,
        value: 2,
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.HEAD
      });

      const chestArmorId = await itemService.createItem({
        name: 'Scale Mail',
        description: 'Scale mail armor',
        type: ItemType.ARMOR,
        weight: 6.0,
        value: 4,
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.BODY
      });

      const bootsId = await itemService.createItem({
        name: 'Steel Boots',
        description: 'Steel-plated boots',
        type: ItemType.ARMOR,
        weight: 2.5,
        value: 1,
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.FOOT
      });

      // Equip all armor pieces
      await itemService.placeItemInRoom(startingRoomId, helmetId, 1);
      await itemService.placeItemInRoom(startingRoomId, chestArmorId, 1);
      await itemService.placeItemInRoom(startingRoomId, bootsId, 1);
      
      await itemService.transferItemToInventory(playerCharacterId, helmetId, startingRoomId, 1);
      await itemService.transferItemToInventory(playerCharacterId, chestArmorId, startingRoomId, 1);
      await itemService.transferItemToInventory(playerCharacterId, bootsId, startingRoomId, 1);
      
      await equipmentService.equipItem(playerCharacterId, helmetId);
      await equipmentService.equipItem(playerCharacterId, chestArmorId);
      await equipmentService.equipItem(playerCharacterId, bootsId);

      // Test damage reduction with total armor (2 + 4 + 1 = 7)
      const incomingDamage = 10;
      const finalDamage = await equipmentService.calculateDamageAfterArmor(playerCharacterId, incomingDamage);
      expect(finalDamage).toBe(3); // 10 - 7 = 3
    });

    test('should handle negative armor values correctly', async () => {
      // Create cursed armor with negative value
      const cursedArmorId = await itemService.createItem({
        name: 'Cursed Robe',
        description: 'A cursed robe that makes you more vulnerable',
        type: ItemType.ARMOR,
        weight: 1.0,
        value: -3, // increases damage taken
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.BODY
      });

      await itemService.placeItemInRoom(startingRoomId, cursedArmorId, 1);
      await itemService.transferItemToInventory(playerCharacterId, cursedArmorId, startingRoomId, 1);
      await equipmentService.equipItem(playerCharacterId, cursedArmorId);

      // Test damage increase
      const incomingDamage = 5;
      const finalDamage = await equipmentService.calculateDamageAfterArmor(playerCharacterId, incomingDamage);
      expect(finalDamage).toBe(8); // 5 - (-3) = 8
    });

    test('should still enforce minimum damage with negative armor', async () => {
      // Create extreme cursed armor
      const extremeCursedId = await itemService.createItem({
        name: 'Extremely Cursed Armor',
        description: 'Cursed beyond measure',
        type: ItemType.ARMOR,
        weight: 1.0,
        value: -10, // severely increases damage taken
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.BODY
      });

      await itemService.placeItemInRoom(startingRoomId, extremeCursedId, 1);
      await itemService.transferItemToInventory(playerCharacterId, extremeCursedId, startingRoomId, 1);
      await equipmentService.equipItem(playerCharacterId, extremeCursedId);

      // Test with small incoming damage and extreme negative armor
      const incomingDamage = 1;
      const finalDamage = await equipmentService.calculateDamageAfterArmor(playerCharacterId, incomingDamage);
      expect(finalDamage).toBe(11); // 1 - (-10) = 11 (cursed armor significantly increases damage)
    });
  });
});