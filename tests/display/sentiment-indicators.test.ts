/**
 * Character Display Sentiment Indicators Tests - Phase 8
 * 
 * Tests the visual sentiment indicators in character display.
 * Verifies that characters are displayed with appropriate icons
 * and sentiment descriptions according to the specification.
 */

import Database from '../../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import { CharacterService } from '../../src/services/characterService';
import { UnifiedRoomDisplayService } from '../../src/services/unifiedRoomDisplayService';
import { CharacterSentiment, CharacterType } from '../../src/types/character';

describe('Character Display Sentiment Indicators - Phase 8', () => {
  let db: Database;
  let characterService: CharacterService;
  let displayService: UnifiedRoomDisplayService;
  let gameId: number;
  let roomId: number;

  beforeEach(async () => {
    // Use in-memory database for testing
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);

    // Create a unique test game
    const uniqueGameName = `Display Test ${Date.now()}-${Math.random()}`;
    gameId = await createGameWithRooms(db, uniqueGameName);

    // Get the starting room ID
    const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
    roomId = rooms[0].id;

    // Initialize services
    characterService = new CharacterService(db);
    displayService = new UnifiedRoomDisplayService();
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('Sentiment Icon Assignment', () => {
    it('should display hostile characters with ⚔️ icon', async () => {
      // Create hostile character
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Hostile Orc',
        description: 'A hostile orc warrior',
        type: CharacterType.ENEMY,
        current_room_id: roomId,
        sentiment: CharacterSentiment.HOSTILE
      });

      const character = await characterService.getCharacter(characterId);
      const displayText = displayService.formatCharacterDisplay([character!]);

      expect(displayText).toMatch(/⚔️.*Hostile Orc.*⚔️.*hostile/);
    });

    it('should display aggressive characters with 🗡️ icon', async () => {
      // Create aggressive character
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Aggressive Bandit',
        description: 'An aggressive bandit',
        type: CharacterType.ENEMY,
        current_room_id: roomId,
        sentiment: CharacterSentiment.AGGRESSIVE
      });

      const character = await characterService.getCharacter(characterId);
      const displayText = displayService.formatCharacterDisplay([character!]);

      expect(displayText).toMatch(/🗡️.*Aggressive Bandit.*aggressive/);
    });

    it('should display indifferent characters with 👤 icon', async () => {
      // Create indifferent character
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Neutral Guard',
        description: 'A neutral guard',
        type: CharacterType.NPC,
        current_room_id: roomId,
        sentiment: CharacterSentiment.INDIFFERENT
      });

      const character = await characterService.getCharacter(characterId);
      const displayText = displayService.formatCharacterDisplay([character!]);

      expect(displayText).toMatch(/👤.*Neutral Guard.*indifferent/);
    });

    it('should display friendly characters with 😊 icon', async () => {
      // Create friendly character
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Friendly Merchant',
        description: 'A friendly merchant',
        type: CharacterType.NPC,
        current_room_id: roomId,
        sentiment: CharacterSentiment.FRIENDLY
      });

      const character = await characterService.getCharacter(characterId);
      const displayText = displayService.formatCharacterDisplay([character!]);

      expect(displayText).toMatch(/😊.*Friendly Merchant.*friendly/);
    });

    it('should display allied characters with 🤝 icon', async () => {
      // Create allied character
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Allied Warrior',
        description: 'An allied warrior',
        type: CharacterType.NPC,
        current_room_id: roomId,
        sentiment: CharacterSentiment.ALLIED
      });

      const character = await characterService.getCharacter(characterId);
      const displayText = displayService.formatCharacterDisplay([character!]);

      expect(displayText).toMatch(/🤝.*Allied Warrior.*allied/);
    });
  });

  describe('Icon Consistency and Format', () => {
    it('should use correct format for hostile characters', async () => {
      // Create hostile character
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Test Warrior',
        description: 'A test warrior',
        type: CharacterType.ENEMY,
        current_room_id: roomId,
        sentiment: CharacterSentiment.HOSTILE
      });

      const character = await characterService.getCharacter(characterId);
      const displayText = displayService.formatCharacterDisplay([character!]);

      // Should match format: ⚔️ Name ⚔️ (hostile)
      expect(displayText).toMatch(/⚔️ Test Warrior ⚔️ \(hostile\)/);
    });

    it('should handle characters without sentiment gracefully', async () => {
      // Create character without sentiment
      await db.run(`
        INSERT INTO characters (
          game_id, name, description, type, current_room_id,
          strength, dexterity, intelligence, constitution, wisdom, charisma,
          max_health, current_health, is_dead, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        gameId, 'No Sentiment Character', 'A character without sentiment', 
        CharacterType.NPC, roomId,
        10, 10, 10, 10, 10, 10, 10, 10, false, new Date().toISOString()
      ]);

      const character = await db.get('SELECT * FROM characters WHERE name = ?', ['No Sentiment Character']);
      const displayText = displayService.formatCharacterDisplay([character]);

      // Should default to indifferent display
      expect(displayText).toMatch(/👤.*No Sentiment Character/);
    });

    it('should display dead characters with skull icon regardless of sentiment', async () => {
      // Create character and kill it
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Dead Character',
        description: 'A dead character',
        type: CharacterType.NPC,
        current_room_id: roomId,
        sentiment: CharacterSentiment.HOSTILE // Even hostile, but dead
      });

      await characterService.setCharacterDead(characterId);
      const character = await characterService.getCharacter(characterId);
      const displayText = displayService.formatCharacterDisplay([character!]);

      // Should show skull icon for dead characters
      expect(displayText).toMatch(/💀.*Dead Character.*dead/);
    });
  });

  describe('Multiple Character Display', () => {
    it('should display multiple characters with appropriate icons', async () => {
      // Create characters with different sentiments
      const hostileId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Hostile Orc',
        description: 'A hostile orc',
        type: CharacterType.ENEMY,
        current_room_id: roomId,
        sentiment: CharacterSentiment.HOSTILE
      });

      const friendlyId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Friendly NPC',
        description: 'A friendly NPC',
        type: CharacterType.NPC,
        current_room_id: roomId,
        sentiment: CharacterSentiment.FRIENDLY
      });

      const alliedId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Allied Helper',
        description: 'An allied helper',
        type: CharacterType.NPC,
        current_room_id: roomId,
        sentiment: CharacterSentiment.ALLIED
      });

      const characters = await db.all(
        'SELECT * FROM characters WHERE current_room_id = ? ORDER BY name',
        [roomId]
      );

      const displayText = displayService.formatCharacterDisplay(characters);

      // Should contain all three characters with their appropriate icons
      expect(displayText).toMatch(/🤝.*Allied Helper.*allied/);
      expect(displayText).toMatch(/😊.*Friendly NPC.*friendly/);
      expect(displayText).toMatch(/⚔️.*Hostile Orc.*⚔️.*hostile/);
    });
  });

  describe('Legacy Compatibility', () => {
    it('should handle characters with both sentiment and is_hostile set', async () => {
      // Create character with conflicting sentiment and is_hostile
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Conflicted Character',
        description: 'A character with mixed signals',
        type: CharacterType.NPC,
        current_room_id: roomId,
        sentiment: CharacterSentiment.FRIENDLY, // Friendly sentiment
        is_hostile: true // But legacy hostile flag
      });

      const character = await characterService.getCharacter(characterId);
      const displayText = displayService.formatCharacterDisplay([character!]);

      // Should prioritize sentiment over legacy is_hostile
      expect(displayText).toMatch(/😊.*Conflicted Character.*friendly/);
      
      // Should also indicate legacy conflict
      expect(displayText).toMatch(/legacy hostile/);
    });
  });
});