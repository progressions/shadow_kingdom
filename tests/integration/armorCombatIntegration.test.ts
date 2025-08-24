/**
 * Armor Combat Integration Tests
 * 
 * Tests for the complete armor damage reduction system integration with combat.
 * This tests the full flow from attack command to armor reduction to final damage.
 */

import Database from '../../src/utils/database';
import { createGameWithRooms } from '../../src/utils/initDb';
import { initializeTestDatabase } from '../testUtils';
import { GameController } from '../../src/gameController';
import { ItemService } from '../../src/services/itemService';
import { EquipmentService } from '../../src/services/equipmentService';
import { CharacterService } from '../../src/services/characterService';
import { GrokClient } from '../../src/ai/grokClient';
import { Character, CharacterType, CharacterSentiment } from '../../src/types/character';
import { ItemType, EquipmentSlot } from '../../src/types/item';
import * as readline from 'readline';

// Mock the GrokClient
jest.mock('../../src/ai/grokClient');

describe('Armor Combat Integration', () => {
  let db: Database;
  let controller: GameController;
  let itemService: ItemService;
  let equipmentService: EquipmentService;
  let characterService: CharacterService;
  let mockRl: readline.Interface;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let gameId: number;
  let playerRoomId: number;
  let outputSpy: jest.SpyInstance;
  let mockGrokClient: jest.Mocked<GrokClient>;

  beforeEach(async () => {
    // Ensure we use legacy services, not Prisma
    process.env.USE_PRISMA = 'false';
    process.env.NODE_ENV = 'test';
    process.env.AI_MOCK_MODE = 'true'; // Disable real AI calls
    process.env.DISABLE_ENEMY_ATTACKS = 'true'; // Disable enemy attacks for armor tests
    
    // Set up the GrokClient mock
    mockGrokClient = {
      interpretCommand: jest.fn(),
      isMockMode: true,
      getUsageStats: jest.fn().mockReturnValue({
        tokensUsed: { input: 0, output: 0, cost: 0 },
        estimatedCost: '$0.0000'
      }),
      setMockMode: jest.fn(),
      setLoggerService: jest.fn(),
      cleanup: jest.fn()
    } as any;
    
    // Make the mock constructor return our mock instance
    (GrokClient as jest.MockedClass<typeof GrokClient>).mockImplementation(() => mockGrokClient);
    
    // Silence console output
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Create in-memory database for testing
    db = new Database(':memory:');
    await db.connect();
    await initializeTestDatabase(db);

    // Create a unique test game
    const uniqueGameName = `Armor Combat Test ${Date.now()}-${Math.random()}`;
    gameId = await createGameWithRooms(db, uniqueGameName);

    // Get the starting room ID
    const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
    playerRoomId = rooms[0].id;

    // Initialize services
    itemService = new ItemService(db);
    equipmentService = new EquipmentService(db);
    characterService = new CharacterService(db);

    // Create mock readline interface
    mockRl = {
      question: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
      setMaxListeners: jest.fn(),
      getMaxListeners: jest.fn(),
      listeners: jest.fn(),
      rawListeners: jest.fn(),
      emit: jest.fn(),
      listenerCount: jest.fn(),
      prependListener: jest.fn(),
      prependOnceListener: jest.fn(),
      eventNames: jest.fn(),
      setPrompt: jest.fn(),
      prompt: jest.fn()
    } as any;

    // Create GameController in test mode
    controller = new GameController(db);
    // Replace the readline interface
    (controller as any).rl = mockRl;
    
    // Mock the TUI display method to capture output
    outputSpy = jest.spyOn((controller as any).tui, 'display').mockImplementation((...args: unknown[]) => {
      // Store the message for testing
      (controller as any).lastDisplayMessage = args[0];
    });

    // Start game session
    const gameStateManager = (controller as any).gameStateManager;
    await gameStateManager.startGameSession(gameId);
    await gameStateManager.moveToRoom(playerRoomId);
  });

  afterEach(async () => {
    if (controller) {
      await controller.cleanup();
      controller.removeEventListeners();
    }
    if (db) {
      await db.close();
    }
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    outputSpy?.mockRestore();
    
    // Clean up environment
    delete process.env.AI_MOCK_MODE;
    delete process.env.DISABLE_ENEMY_ATTACKS;
  });

  describe('Attack with armor defense', () => {
    test('should reduce damage when target has equipped armor', async () => {
      // Mock random to always hit
      jest.spyOn(Math, 'random').mockReturnValue(0.95);

      // Create an enemy character with health
      const enemyId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Armored Orc',
        description: 'An orc wearing armor',
        type: CharacterType.ENEMY,
        current_room_id: playerRoomId,
        sentiment: CharacterSentiment.HOSTILE
      });

      // Set enemy health to 10
      await characterService.updateCharacterHealth(enemyId, 10);

      // Create armor for the enemy and equip it
      const armorId = await itemService.createItem({
        name: 'Chain Mail',
        description: 'Protective chain mail',
        type: ItemType.ARMOR,
        weight: 8.0,
        value: 3, // 3 armor points
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.BODY
      });

      // Place armor in room, transfer to enemy, and equip
      await itemService.placeItemInRoom(playerRoomId, armorId, 1);
      await itemService.transferItemToInventory(enemyId, armorId, playerRoomId, 1);
      await equipmentService.equipItem(enemyId, armorId);

      // Attack the armored enemy (base damage 2, armor reduces by 3, result is 0)
      await (controller as any).processCommand('attack Armored Orc');

      // Check that damage was completely negated by armor (2 base - 3 armor = 0)
      expect((controller as any).lastDisplayMessage).toContain('You attack the Armored Orc. The Armored Orc takes 0 damage.');

      // Check enemy health unchanged due to armor protection
      const enemy = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [enemyId]);
      expect(enemy?.current_health).toBe(10); // No damage taken

      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    test('should deal full damage when target has no armor', async () => {
      // Mock random to always hit
      jest.spyOn(Math, 'random').mockReturnValue(0.95);

      // Create an unarmored enemy
      const enemyId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Unarmored Goblin',
        description: 'A goblin without armor',
        type: CharacterType.ENEMY,
        current_room_id: playerRoomId,
        sentiment: CharacterSentiment.HOSTILE
      });

      await characterService.updateCharacterHealth(enemyId, 10);

      // Attack the unarmored enemy (base damage 2, no armor)
      await (controller as any).processCommand('attack Unarmored Goblin');

      // Check full damage dealt
      expect((controller as any).lastDisplayMessage).toContain('You attack the Unarmored Goblin. The Unarmored Goblin takes 2 damage.');

      // Check enemy health reduced by 2
      const enemy = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [enemyId]);
      expect(enemy?.current_health).toBe(8); // 10 - 2 = 8

      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    test('should combine weapon damage with armor reduction correctly', async () => {
      // Mock random to always hit
      jest.spyOn(Math, 'random').mockReturnValue(0.95);

      // Create armored enemy using direct database insertion like working tests
      const characterResult = await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead, max_health, current_health, sentiment, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [gameId, 'Knight', 'enemy', playerRoomId, 0, 20, 20, 'hostile', 'A heavily armored knight']
      );
      const enemyId = characterResult.lastID as number;

      // Create and equip player weapon
      const swordId = await itemService.createItem({
        name: 'Steel Sword',
        description: 'A sharp steel sword',
        type: ItemType.WEAPON,
        weight: 2.0,
        value: 4, // +4 weapon damage
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.HAND
      });

      // Equip sword to player (use gameId as character ID for single-player)
      await itemService.placeItemInRoom(playerRoomId, swordId, 1);
      await itemService.transferItemToInventory(gameId, swordId, playerRoomId, 1);
      await equipmentService.equipItem(gameId, swordId);

      // Create heavy armor for enemy
      const plateArmorId = await itemService.createItem({
        name: 'Plate Armor',
        description: 'Heavy plate armor',
        type: ItemType.ARMOR,
        weight: 15.0,
        value: 5, // 5 armor points
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.BODY
      });

      // Equip armor to enemy
      await itemService.placeItemInRoom(playerRoomId, plateArmorId, 1);
      await itemService.transferItemToInventory(enemyId, plateArmorId, playerRoomId, 1);
      await equipmentService.equipItem(enemyId, plateArmorId);

      // Attack with weapon vs armor: (2 base + 4 weapon) - 5 armor = 1 damage
      await (controller as any).processCommand('attack Knight');

      expect((controller as any).lastDisplayMessage).toContain('You attack the Knight. The Knight takes 1 damage.');

      // Check enemy health
      const enemy = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [enemyId]);
      expect(enemy?.current_health).toBe(19); // 20 - 1 = 19

      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    test('should work with multiple armor pieces providing cumulative protection', async () => {
      // Mock random to always hit
      jest.spyOn(Math, 'random').mockReturnValue(0.95);

      // Create enemy using direct database insertion
      const characterResult = await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead, max_health, current_health, sentiment, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [gameId, 'Fully Armored Warrior', 'enemy', playerRoomId, 0, 15, 15, 'hostile', 'A warrior in full armor']
      );
      const enemyId = characterResult.lastID as number;

      // Create helmet (2 armor)
      const helmetId = await itemService.createItem({
        name: 'Steel Helmet',
        description: 'A steel helmet',
        type: ItemType.ARMOR,
        weight: 3.0,
        value: 2,
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.HEAD
      });

      // Create body armor (4 armor)
      const bodyArmorId = await itemService.createItem({
        name: 'Scale Mail',
        description: 'Scale mail armor',
        type: ItemType.ARMOR,
        weight: 10.0,
        value: 4,
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.BODY
      });

      // Create boots (1 armor)
      const bootsId = await itemService.createItem({
        name: 'Iron Boots',
        description: 'Heavy iron boots',
        type: ItemType.ARMOR,
        weight: 4.0,
        value: 1,
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.FOOT
      });

      // Equip all armor pieces
      await itemService.placeItemInRoom(playerRoomId, helmetId, 1);
      await itemService.placeItemInRoom(playerRoomId, bodyArmorId, 1);
      await itemService.placeItemInRoom(playerRoomId, bootsId, 1);

      await itemService.transferItemToInventory(enemyId, helmetId, playerRoomId, 1);
      await itemService.transferItemToInventory(enemyId, bodyArmorId, playerRoomId, 1);
      await itemService.transferItemToInventory(enemyId, bootsId, playerRoomId, 1);

      await equipmentService.equipItem(enemyId, helmetId);
      await equipmentService.equipItem(enemyId, bodyArmorId);
      await equipmentService.equipItem(enemyId, bootsId);

      // Attack: 2 base damage - 7 total armor (2+4+1) = 0 damage (completely blocked)
      await (controller as any).processCommand('attack Fully Armored Warrior');

      expect((controller as any).lastDisplayMessage).toContain('You attack the Fully Armored Warrior. The Fully Armored Warrior takes 0 damage.');

      // Check enemy health unchanged due to armor protection
      const enemy = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [enemyId]);
      expect(enemy?.current_health).toBe(15); // No damage taken

      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    test('should handle negative armor values (cursed armor increasing damage)', async () => {
      // Mock random to always hit
      jest.spyOn(Math, 'random').mockReturnValue(0.95);

      // Create enemy using direct database insertion
      const characterResult = await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead, max_health, current_health, sentiment, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [gameId, 'Cursed Warrior', 'enemy', playerRoomId, 0, 20, 20, 'hostile', 'A warrior wearing cursed armor']
      );
      const enemyId = characterResult.lastID as number;

      // Create cursed armor with negative value
      const cursedArmorId = await itemService.createItem({
        name: 'Cursed Robe',
        description: 'A cursed robe that weakens the wearer',
        type: ItemType.ARMOR,
        weight: 1.0,
        value: -2, // -2 armor (increases damage taken)
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.BODY
      });

      // Equip cursed armor
      await itemService.placeItemInRoom(playerRoomId, cursedArmorId, 1);
      await itemService.transferItemToInventory(enemyId, cursedArmorId, playerRoomId, 1);
      await equipmentService.equipItem(enemyId, cursedArmorId);

      // Attack: 2 base damage - (-2) armor = 4 damage
      await (controller as any).processCommand('attack Cursed Warrior');

      expect((controller as any).lastDisplayMessage).toContain('You attack the Cursed Warrior. The Cursed Warrior takes 4 damage.');

      // Check enemy health
      const enemy = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [enemyId]);
      expect(enemy?.current_health).toBe(16); // 20 - 4 = 16

      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });
  });

  describe('Character death with armor', () => {
    test('armor should not prevent death when sufficient damage is dealt', async () => {
      // Mock random to always hit
      jest.spyOn(Math, 'random').mockReturnValue(0.95);

      // Create enemy with low health
      const enemyId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Wounded Soldier',
        description: 'A wounded soldier in armor',
        type: CharacterType.ENEMY,
        current_room_id: playerRoomId,
        sentiment: CharacterSentiment.HOSTILE
      });

      await characterService.updateCharacterHealth(enemyId, 1); // Only 1 HP

      // Create light armor
      const armorId = await itemService.createItem({
        name: 'Leather Vest',
        description: 'Light leather armor',
        type: ItemType.ARMOR,
        weight: 2.0,
        value: 1, // 1 armor point
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.BODY
      });

      // Equip armor
      await itemService.placeItemInRoom(playerRoomId, armorId, 1);
      await itemService.transferItemToInventory(enemyId, armorId, playerRoomId, 1);
      await equipmentService.equipItem(enemyId, armorId);

      // Attack: 2 base - 1 armor = 1 damage, which kills enemy with 1 HP
      await (controller as any).processCommand('attack Wounded Soldier');

      expect((controller as any).lastDisplayMessage).toContain('The Wounded Soldier dies from your attack!');

      // Check enemy is dead
      const enemy = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [enemyId]);
      expect(enemy?.is_dead).toBeTruthy();
      expect(enemy?.current_health).toBe(0);

      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    test('heavy armor should completely negate weak attacks', async () => {
      // Mock random to always hit
      jest.spyOn(Math, 'random').mockReturnValue(0.95);

      // Create enemy with moderate health
      const enemyId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Tank Warrior',
        description: 'A heavily armored tank',
        type: CharacterType.ENEMY,
        current_room_id: playerRoomId,
        sentiment: CharacterSentiment.HOSTILE
      });

      await characterService.updateCharacterHealth(enemyId, 5);

      // Create heavy armor that reduces damage to minimum
      const heavyArmorId = await itemService.createItem({
        name: 'Adamantium Plate',
        description: 'Extremely heavy armor',
        type: ItemType.ARMOR,
        weight: 25.0,
        value: 10, // 10 armor points (reduces 2 base damage to 1)
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.BODY
      });

      // Equip heavy armor
      await itemService.placeItemInRoom(playerRoomId, heavyArmorId, 1);
      await itemService.transferItemToInventory(enemyId, heavyArmorId, playerRoomId, 1);
      await equipmentService.equipItem(enemyId, heavyArmorId);

      // First attack: 2 base - 10 armor = 0 damage (completely blocked)
      await (controller as any).processCommand('attack Tank Warrior');
      expect((controller as any).lastDisplayMessage).toContain('You attack the Tank Warrior. The Tank Warrior takes 0 damage.');

      // Check health: 5 - 0 = 5 (no damage taken)
      let enemy = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [enemyId]);
      expect(enemy?.current_health).toBe(5);
      expect(enemy?.is_dead).toBeFalsy();

      // Attack several more times - should all do 0 damage due to heavy armor
      for (let i = 0; i < 5; i++) {
        await (controller as any).processCommand('attack Tank Warrior');
        expect((controller as any).lastDisplayMessage).toContain('You attack the Tank Warrior. The Tank Warrior takes 0 damage.');
      }

      // Enemy should still be alive and at full health due to armor protection
      enemy = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [enemyId]);
      expect(enemy?.is_dead).toBeFalsy();
      expect(enemy?.current_health).toBe(5); // No damage taken through any attacks

      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });
  });
});