/**
 * Unit tests for ExamineService
 */

import Database from '../../src/utils/database';
import { ExamineService } from '../../src/services/examineService';
import { CharacterService } from '../../src/services/characterService';
import { ItemService } from '../../src/services/itemService';
import { Character, CharacterType, CharacterSentiment } from '../../src/types/character';
import { RoomItem, InventoryItem } from '../../src/types/item';
import { Connection } from '../../src/services/gameStateManager';

describe('ExamineService', () => {
  let db: Database;
  let examineService: ExamineService;
  let characterService: CharacterService;
  let itemService: ItemService;

  beforeEach(async () => {
    // Use in-memory database for testing
    db = new Database(':memory:');
    await db.connect();

    // Initialize database with basic schema
    await db.run(`
      CREATE TABLE characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT DEFAULT 'player',
        current_room_id INTEGER,
        strength INTEGER DEFAULT 10,
        dexterity INTEGER DEFAULT 10,
        intelligence INTEGER DEFAULT 10,
        constitution INTEGER DEFAULT 10,
        wisdom INTEGER DEFAULT 10,
        charisma INTEGER DEFAULT 10,
        max_health INTEGER,
        current_health INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.run(`
      CREATE TABLE items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL,
        weight REAL DEFAULT 0.0,
        value INTEGER DEFAULT 0,
        stackable BOOLEAN DEFAULT FALSE,
        max_stack INTEGER DEFAULT 1,
        weapon_damage TEXT,
        armor_rating INTEGER DEFAULT 0,
        equipment_slot TEXT,
        is_fixed BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.run(`
      CREATE TABLE room_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.run(`
      CREATE TABLE character_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        equipped BOOLEAN DEFAULT FALSE,
        equipped_slot TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.run(`
      CREATE TABLE connections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        from_room_id INTEGER NOT NULL,
        to_room_id INTEGER,
        direction TEXT,
        name TEXT NOT NULL,
        processing BOOLEAN DEFAULT FALSE
      )
    `);

    // Create service instances
    characterService = new CharacterService(db);
    itemService = new ItemService(db);
    examineService = new ExamineService(db, characterService, itemService);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('findExaminableTarget', () => {
    it('should find character targets', async () => {
      // Create a test character
      await db.run(
        'INSERT INTO characters (name, description, type, game_id, current_room_id) VALUES (?, ?, ?, ?, ?)',
        ['Ancient Guardian', 'A spectral protector', 'npc', 1, 1]
      );

      const target = await examineService.findExaminableTarget(1, 1, 1, 'guardian');

      expect(target).toBeTruthy();
      expect(target?.type).toBe('character');
      expect(target?.name).toBe('Ancient Guardian');
    });

    it('should find room item targets', async () => {
      // Create test item and room item
      await db.run(
        'INSERT INTO items (name, description, type) VALUES (?, ?, ?)',
        ['Iron Sword', 'A well-crafted blade', 'weapon']
      );
      
      await db.run(
        'INSERT INTO room_items (room_id, item_id) VALUES (?, ?)',
        [1, 1]
      );

      const target = await examineService.findExaminableTarget(1, 1, 1, 'sword');

      expect(target).toBeTruthy();
      expect(target?.type).toBe('room_item');
      expect(target?.name).toBe('Iron Sword');
    });

    it('should find inventory item targets', async () => {
      // Create test item and inventory item
      await db.run(
        'INSERT INTO items (name, description, type) VALUES (?, ?, ?)',
        ['Health Potion', 'Restores vitality', 'consumable']
      );
      
      await db.run(
        'INSERT INTO character_inventory (character_id, item_id) VALUES (?, ?)',
        [1, 1]
      );

      const target = await examineService.findExaminableTarget(1, 1, 1, 'potion');

      expect(target).toBeTruthy();
      expect(target?.type).toBe('inventory_item');
      expect(target?.name).toBe('Health Potion');
    });

    it('should find exit targets', async () => {
      // Create test connection
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [1, 1, 2, 'north', 'Ornate Archway']
      );

      const target = await examineService.findExaminableTarget(1, 1, 1, 'north');

      expect(target).toBeTruthy();
      expect(target?.type).toBe('exit');
      expect(target?.name).toBe('north exit');
    });

    it('should return null for non-existent targets', async () => {
      const target = await examineService.findExaminableTarget(1, 1, 1, 'nonexistent');

      expect(target).toBeNull();
    });

    it('should handle partial name matching', async () => {
      // Create a character with a long name
      await db.run(
        'INSERT INTO characters (name, description, type, game_id, current_room_id) VALUES (?, ?, ?, ?, ?)',
        ['Mysterious Hooded Figure', 'A cloaked stranger', 'npc', 1, 1]
      );

      const target = await examineService.findExaminableTarget(1, 1, 1, 'hooded');

      expect(target).toBeTruthy();
      expect(target?.name).toBe('Mysterious Hooded Figure');
    });
  });

  describe('getExaminationText', () => {
    it('should generate character examination text', () => {
      const mockCharacter: Character = {
        id: 1,
        name: 'Ancient Guardian',
        description: 'A spectral protector of ancient secrets.',
        type: CharacterType.NPC,
        game_id: 1,
        current_room_id: 1,
        max_health: 20,
        current_health: 20,
        strength: 12,
        dexterity: 10,
        intelligence: 14,
        constitution: 12,
        wisdom: 16,
        charisma: 13,
        sentiment: CharacterSentiment.INDIFFERENT,
        created_at: new Date().toISOString()
      };

      const target = {
        id: '1',
        name: 'Ancient Guardian',
        type: 'character' as const,
        data: mockCharacter
      };

      const result = examineService.getExaminationText(target);

      expect(result).toContain('A spectral protector of ancient secrets.');
      expect(result).toContain('neutral toward you');
    });

    it('should generate room item examination text', () => {
      const mockRoomItem: RoomItem = {
        id: 1,
        room_id: 1,
        item_id: 1,
        quantity: 1,
        item: {
          id: 1,
          name: 'Iron Sword',
          description: 'A well-crafted blade.',
          type: 'weapon' as any,
          weight: 3.5,
          value: 50,
          stackable: false,
          max_stack: 1,
          weapon_damage: '1d8',
          equipment_slot: 'hand' as any,
          is_fixed: false,
          created_at: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      };

      const target = {
        id: 'room_item_1',
        name: 'Iron Sword',
        type: 'room_item' as const,
        data: mockRoomItem
      };

      const result = examineService.getExaminationText(target);

      expect(result).toContain('A well-crafted blade.');
      expect(result).toContain('Type: weapon');
    });

    it('should generate inventory item examination text', () => {
      const mockInventoryItem: InventoryItem = {
        id: 1,
        character_id: 1,
        item_id: 1,
        quantity: 2,
        equipped: false,
        item: {
          id: 1,
          name: 'Health Potion',
          description: 'Restores vitality when consumed.',
          type: 'consumable' as any,
          weight: 0.5,
          value: 25,
          stackable: true,
          max_stack: 10,
          is_fixed: false,
          created_at: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      };

      const target = {
        id: 'inventory_item_1',
        name: 'Health Potion',
        type: 'inventory_item' as const,
        data: mockInventoryItem
      };

      const result = examineService.getExaminationText(target);

      expect(result).toContain('Restores vitality when consumed.');
      expect(result).toContain('Type: consumable');
      expect(result).toContain('Quantity: 2');
      expect(result).toContain('Estimated Value: 25 gold');
    });

    it('should generate exit examination text', () => {
      const mockConnection: Connection = {
        id: 1,
        game_id: 1,
        from_room_id: 1,
        to_room_id: 2,
        direction: 'north',
        name: 'Ornate Archway'
      };

      const target = {
        id: 'exit_1',
        name: 'north exit',
        type: 'exit' as const,
        data: mockConnection
      };

      const result = examineService.getExaminationText(target);

      expect(result).toContain('You examine the north passage.');
      expect(result).toContain('passage leads north');
    });

    it('should handle missing descriptions gracefully', () => {
      const mockCharacter: Character = {
        id: 1,
        name: 'Test Character',
        description: '',
        type: CharacterType.NPC,
        game_id: 1,
        current_room_id: 1,
        max_health: 20,
        current_health: 20,
        strength: 10,
        dexterity: 10,
        intelligence: 10,
        constitution: 10,
        wisdom: 10,
        charisma: 10,
        sentiment: CharacterSentiment.INDIFFERENT,
        created_at: new Date().toISOString()
      };

      const target = {
        id: '1',
        name: 'Test Character',
        type: 'character' as const,
        data: mockCharacter
      };

      const result = examineService.getExaminationText(target);

      expect(result).toContain('You see Test Character.');
      expect(result).toContain('neutral toward you');
    });
  });
});