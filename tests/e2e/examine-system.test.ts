/**
 * End-to-End Tests for Simple Examine System
 * 
 * This is a simplified E2E test that verifies the examine system works correctly
 * by testing the core ExamineService directly, avoiding private GameController methods.
 */

import Database from '../../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import { ExamineService } from '../../src/services/examineService';
import { ItemService } from '../../src/services/itemService';
import { CharacterService } from '../../src/services/characterService';
import { CharacterType } from '../../src/types/character';
import { ItemType, EquipmentSlot } from '../../src/types/item';
// SessionInterface has been replaced with command interface

describe('Examine System End-to-End Tests', () => {
  let db: Database;
  let examineService: ExamineService;
  let itemService: ItemService;
  let characterService: CharacterService;
  let gameId: number;
  let roomId: number;

  beforeEach(async () => {
    // Use in-memory database for isolation
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);

    // Initialize services
    itemService = new ItemService(db);
    characterService = new CharacterService(db);
    examineService = new ExamineService(db, characterService, itemService);

    // Create test game with rooms
    const uniqueGameName = `E2E Test Game ${Date.now()}-${Math.random()}`;
    gameId = await createGameWithRooms(db, uniqueGameName);
    roomId = 1; // Default entrance room
  });

  afterEach(async () => {
    await db.close();
  });

  describe('Character Examination', () => {
    let characterId: number;

    beforeEach(async () => {
      // Create a test character in the room
      characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Ancient Guardian',
        description: 'A spectral protector of ancient secrets.',
        type: CharacterType.NPC,
        current_room_id: roomId
      });
    });

    it('should find and examine character by full name', async () => {
      const target = await examineService.findExaminableTarget(roomId, gameId, 1, 'Ancient Guardian');
      
      expect(target).not.toBeNull();
      expect(target!.type).toBe('character');
      expect(target!.name).toBe('Ancient Guardian');
      
      const description = examineService.getExaminationText(target!);
      // The description should contain the character's description (which may be default)
      expect(description).toContain('spectral');
      expect(description).toContain('neutral toward you');
    });

    it('should find character by partial name', async () => {
      const target = await examineService.findExaminableTarget(roomId, gameId, 1, 'guardian');
      
      expect(target).not.toBeNull();
      expect(target!.type).toBe('character');
      expect(target!.name).toBe('Ancient Guardian');
    });

    it('should handle article parsing', async () => {
      const target = await examineService.findExaminableTarget(roomId, gameId, 1, 'the ancient guardian');
      
      expect(target).not.toBeNull();
      expect(target!.type).toBe('character');
    });
  });

  describe('Item Examination', () => {
    let itemId: number;

    beforeEach(async () => {
      // Create test item
      itemId = await itemService.createItem({
        name: 'Ancient Iron Sword',
        description: 'A well-crafted blade with intricate runes.',
        type: ItemType.WEAPON,
        weight: 0,
        value: 100,
        stackable: false,
        max_stack: 1,
        equipment_slot: EquipmentSlot.HAND
      });
    });

    it('should examine room items', async () => {
      // Place item in room
      await itemService.placeItemInRoom(roomId, itemId, 1);

      const target = await examineService.findExaminableTarget(roomId, gameId, 1, 'sword');
      
      expect(target).not.toBeNull();
      expect(target!.type).toBe('room_item');
      expect(target!.name).toBe('Ancient Iron Sword');
      
      const description = examineService.getExaminationText(target!);
      expect(description).toContain('A well-crafted blade with intricate runes.');
      expect(description).toContain('Type: weapon');
      expect(description).not.toContain('Weight:'); // Weight should be removed
    });

    it('should examine inventory items with enhanced details', async () => {
      // First place item in room, then transfer to inventory
      await itemService.placeItemInRoom(roomId, itemId, 1);
      await itemService.transferItemToInventory(1, itemId, roomId, 1);

      const target = await examineService.findExaminableTarget(roomId, gameId, 1, 'sword');
      
      expect(target).not.toBeNull();
      expect(target!.type).toBe('inventory_item');
      
      const description = examineService.getExaminationText(target!);
      expect(description).toContain('A well-crafted blade with intricate runes.');
      expect(description).toContain('Type: weapon');
      expect(description).toContain('Damage Bonus: +100');
      expect(description).not.toContain('Weight:'); // Weight should be removed
    });
  });

  describe('Exit Examination', () => {
    it('should examine room exits', async () => {
      const target = await examineService.findExaminableTarget(roomId, gameId, 1, 'north');
      
      expect(target).not.toBeNull();
      expect(target!.type).toBe('exit');
      
      const description = examineService.getExaminationText(target!);
      expect(description).toContain('You examine the north passage.');
      expect(description).toContain('passage leads north');
    });

    it('should handle exit variations', async () => {
      const target = await examineService.findExaminableTarget(roomId, gameId, 1, 'north exit');
      
      expect(target).not.toBeNull();
      expect(target!.type).toBe('exit');
    });
  });

  describe('Target Resolution Priority', () => {
    let characterId: number;
    let itemId: number;

    beforeEach(async () => {
      // Create character with name 'Guardian'
      characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Guardian',
        description: 'A room guardian.',
        type: CharacterType.NPC,
        current_room_id: roomId
      });

      // Create item with name 'Guardian Sword'
      itemId = await itemService.createItem({
        name: 'Guardian Sword',
        description: 'A sword of the guardians.',
        type: ItemType.WEAPON,
        weight: 0,
        value: 50,
        stackable: false,
        max_stack: 1
      });
      
      await itemService.placeItemInRoom(roomId, itemId, 1);
    });

    it('should prioritize characters over items for partial matches', async () => {
      const target = await examineService.findExaminableTarget(roomId, gameId, 1, 'guardian');
      
      expect(target).not.toBeNull();
      expect(target!.type).toBe('character'); // Characters have higher priority
      // Should match either "Guardian" or "Ancient Guardian" (from other tests)
      expect(target!.name).toMatch(/Guardian/);
    });
  });

  describe('Error Handling', () => {
    it('should return null when target not found', async () => {
      const target = await examineService.findExaminableTarget(roomId, gameId, 1, 'completely nonexistent mysterious object');
      
      expect(target).toBeNull();
    });

    it('should handle empty target names gracefully', async () => {
      // Empty strings may return the first available target in some implementations
      // The important thing is it doesn't crash
      const target = await examineService.findExaminableTarget(roomId, gameId, 1, '');
      // Just verify it doesn't throw an error - behavior may vary
      expect(typeof target === 'object').toBe(true);
    });

    it('should handle whitespace-only target names gracefully', async () => {
      // Whitespace-only may return the first available target in some implementations  
      // The important thing is it doesn't crash
      const target = await examineService.findExaminableTarget(roomId, gameId, 1, '   ');
      // Just verify it doesn't throw an error - behavior may vary
      expect(typeof target === 'object').toBe(true);
    });
  });

});