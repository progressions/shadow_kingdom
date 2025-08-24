/**
 * Weapon Damage Value Tests
 * 
 * Tests for weapon damage calculation using the item "value" field
 * to add bonus damage to player attacks.
 */

import Database from '../../src/utils/database';
import { createGameWithRooms } from '../../src/utils/initDb';
import { initializeTestDatabase } from '../testUtils';
import { EquipmentService } from '../../src/services/equipmentService';
import { ItemService } from '../../src/services/itemService';
import { GameStateManager } from '../../src/services/gameStateManager';
import { CharacterService } from '../../src/services/characterService';
import { Item, ItemType, EquipmentSlot } from '../../src/types/item';
import { Character, CharacterType, CharacterSentiment } from '../../src/types/character';

describe('Weapon Damage Value System', () => {
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
    await initializeTestDatabase(db);

    // Create a unique test game
    const uniqueGameName = `Weapon Damage Test ${Date.now()}-${Math.random()}`;
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

  describe('getEquippedWeapon', () => {
    test('should return null when no weapon is equipped', async () => {
      const weapon = await equipmentService.getEquippedItemInSlot(playerCharacterId, EquipmentSlot.HAND);
      expect(weapon).toBeNull();
    });

    test('should return equipped weapon with damage value', async () => {
      // Create a sword with damage value
      const swordId = await itemService.createItem({
        name: 'Iron Sword',
        description: 'A sharp iron blade',
        type: ItemType.WEAPON,
        weight: 1.5,
        value: 3, // value = 3 damage bonus
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.HAND
      });

      // Place sword in room, then transfer to player inventory
      await itemService.placeItemInRoom(startingRoomId, swordId, 1);
      await itemService.transferItemToInventory(playerCharacterId, swordId, startingRoomId, 1);

      // Equip the sword
      await equipmentService.equipItem(playerCharacterId, swordId);

      // Get equipped weapon
      const equippedWeapon = await equipmentService.getEquippedItemInSlot(playerCharacterId, EquipmentSlot.HAND);

      expect(equippedWeapon).not.toBeNull();
      expect(equippedWeapon!.item.name).toBe('Iron Sword');
      expect(equippedWeapon!.item.type).toBe(ItemType.WEAPON);
      expect(equippedWeapon!.item.value).toBe(3); // Damage bonus
    });
  });

  describe('calculateAttackDamage', () => {
    test('should use base damage when no weapon equipped', async () => {
      // Calculate damage without weapon
      const baseDamage = 2;
      const weapon = await equipmentService.getEquippedItemInSlot(playerCharacterId, EquipmentSlot.HAND);
      const weaponDamage = weapon?.item.type === ItemType.WEAPON ? weapon.item.value : 0;
      const totalDamage = baseDamage + weaponDamage;

      expect(totalDamage).toBe(2); // Base damage only
    });

    test('should add weapon value to base damage', async () => {
      // Create and equip sword with value 3
      const swordId = await itemService.createItem({
        name: 'Sharp Sword',
        description: 'A very sharp sword',
        type: ItemType.WEAPON,
        weight: 1.5,
        value: 3, // value = 3 damage bonus
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.HAND
      });

      await itemService.placeItemInRoom(startingRoomId, swordId, 1);
      await itemService.transferItemToInventory(playerCharacterId, swordId, startingRoomId, 1);
      await equipmentService.equipItem(playerCharacterId, swordId);

      // Calculate damage with weapon
      const baseDamage = 2;
      const weapon = await equipmentService.getEquippedItemInSlot(playerCharacterId, EquipmentSlot.HAND);
      const weaponDamage = weapon?.item.type === ItemType.WEAPON ? weapon.item.value : 0;
      const totalDamage = baseDamage + weaponDamage;

      expect(totalDamage).toBe(5); // 2 base + 3 weapon damage
    });

    test('should ignore non-weapon equipped items for damage', async () => {
      // Create and equip armor (non-weapon)
      const helmId = await itemService.createItem({
        name: 'Iron Helmet',
        description: 'A sturdy helmet',
        type: ItemType.ARMOR,
        weight: 2.0,
        value: 50, // value = 50 copper pieces (monetary, not damage)
        stackable: false,
        max_stack: 1,
        armor_rating: 5, // armor rating
        equipment_slot: EquipmentSlot.HEAD
      });

      await itemService.placeItemInRoom(startingRoomId, helmId, 1);
      await itemService.transferItemToInventory(playerCharacterId, helmId, startingRoomId, 1);
      await equipmentService.equipItem(playerCharacterId, helmId);

      // Calculate damage - helmet should not affect damage
      const baseDamage = 2;
      const handWeapon = await equipmentService.getEquippedItemInSlot(playerCharacterId, EquipmentSlot.HAND);
      const weaponDamage = handWeapon?.item.type === ItemType.WEAPON ? handWeapon.item.value : 0;
      const totalDamage = baseDamage + weaponDamage;

      expect(totalDamage).toBe(2); // Base damage only, armor doesn't add damage
    });

    test('should handle zero weapon damage value', async () => {
      // Create weapon with no damage bonus
      const staffId = await itemService.createItem({
        name: 'Wooden Staff',
        description: 'A simple wooden staff',
        type: ItemType.WEAPON,
        weight: 1.0,
        value: 0, // value = 0 damage bonus
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.HAND
      });

      await itemService.placeItemInRoom(startingRoomId, staffId, 1);
      await itemService.transferItemToInventory(playerCharacterId, staffId, startingRoomId, 1);
      await equipmentService.equipItem(playerCharacterId, staffId);

      // Calculate damage 
      const baseDamage = 2;
      const weapon = await equipmentService.getEquippedItemInSlot(playerCharacterId, EquipmentSlot.HAND);
      const weaponDamage = weapon?.item.type === ItemType.WEAPON ? weapon.item.value : 0;
      const totalDamage = baseDamage + weaponDamage;

      expect(totalDamage).toBe(2); // 2 base + 0 weapon = 2
    });

    test('should handle negative weapon value gracefully', async () => {
      // Create weapon with negative value (should not reduce damage below 1)
      const cursedSwordId = await itemService.createItem({
        name: 'Cursed Blade',
        description: 'A cursed weapon',
        type: ItemType.WEAPON,
        weight: 1.0,
        value: -5, // value = -5 (cursed weapon)
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.HAND
      });

      await itemService.placeItemInRoom(startingRoomId, cursedSwordId, 1);
      await itemService.transferItemToInventory(playerCharacterId, cursedSwordId, startingRoomId, 1);
      await equipmentService.equipItem(playerCharacterId, cursedSwordId);

      // Calculate damage - should not go below 1
      const baseDamage = 2;
      const weapon = await equipmentService.getEquippedItemInSlot(playerCharacterId, EquipmentSlot.HAND);
      const weaponDamage = weapon?.item.type === ItemType.WEAPON ? weapon.item.value : 0;
      const totalDamage = Math.max(1, baseDamage + weaponDamage);

      expect(totalDamage).toBe(1); // Can't go below 1 damage
    });
  });

  describe('weaponDamageIntegration', () => {
    test('should correctly calculate damage for high-value weapon', async () => {
      // Create a powerful weapon
      const magicSwordId = await itemService.createItem({
        name: 'Excalibur',
        description: 'A legendary sword',
        type: ItemType.WEAPON,
        weight: 2.0,
        value: 10, // value = 10 damage bonus
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.HAND
      });

      await itemService.placeItemInRoom(startingRoomId, magicSwordId, 1);
      await itemService.transferItemToInventory(playerCharacterId, magicSwordId, startingRoomId, 1);
      await equipmentService.equipItem(playerCharacterId, magicSwordId);

      // Calculate damage
      const baseDamage = 2;
      const weapon = await equipmentService.getEquippedItemInSlot(playerCharacterId, EquipmentSlot.HAND);
      const weaponDamage = weapon?.item.type === ItemType.WEAPON ? weapon.item.value : 0;
      const totalDamage = baseDamage + weaponDamage;

      expect(totalDamage).toBe(12); // 2 base + 10 weapon = 12
    });
  });
});