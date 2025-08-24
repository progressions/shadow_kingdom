/**
 * Remove is_hostile Column Tests - Phase 10
 * 
 * Tests to ensure the is_hostile column is properly removed from the database
 * and all references are updated to use the sentiment system exclusively.
 */

import Database from '../../src/utils/database';
import { initializeDatabase } from '../../src/utils/initDb';
import { CharacterService } from '../../src/services/characterService';
import { CharacterSentiment, CharacterType } from '../../src/types/character';
import { initializeTestDatabase } from '../testUtils';

describe('Remove is_hostile Column - Phase 10', () => {
  let db: Database;
  let characterService: CharacterService;

  beforeEach(async () => {
    // Use in-memory database for testing
    db = new Database(':memory:');
    await db.connect();
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('Database Schema Verification', () => {
    it('should not have is_hostile column in characters table after initialization', async () => {
      // Run full database initialization
      await initializeTestDatabase(db);

      // Get table schema information
      const pragma = await db.all("PRAGMA table_info(characters)");
      const columnNames = pragma.map((col: any) => col.name);

      // Verify is_hostile column doesn't exist
      expect(columnNames).not.toContain('is_hostile');
      
      // Verify sentiment column exists
      expect(columnNames).toContain('sentiment');
    });

    it('should still support all existing character operations without is_hostile', async () => {
      await initializeTestDatabase(db);
      characterService = new CharacterService(db);

      // Create a character using only sentiment (no is_hostile)
      const characterId = await characterService.createCharacter({
        game_id: 1,
        name: 'Test Character',
        description: 'A test character',
        type: CharacterType.ENEMY,
        current_room_id: 1,
        sentiment: CharacterSentiment.AGGRESSIVE
      });

      // Verify character was created successfully
      const character = await characterService.getCharacter(characterId);
      expect(character).toBeTruthy();
      expect(character?.sentiment).toBe(CharacterSentiment.AGGRESSIVE);
      expect(character).not.toHaveProperty('is_hostile');
    });

    it('should handle character queries without referencing is_hostile', async () => {
      await initializeTestDatabase(db);
      characterService = new CharacterService(db);

      // Create characters with different sentiments
      const hostileId = await characterService.createCharacter({
        game_id: 1,
        name: 'Hostile Character',
        description: 'A hostile character',
        type: CharacterType.ENEMY,
        current_room_id: 1,
        sentiment: CharacterSentiment.HOSTILE
      });

      const friendlyId = await characterService.createCharacter({
        game_id: 1,
        name: 'Friendly Character',
        description: 'A friendly character',
        type: CharacterType.NPC,
        current_room_id: 1,
        sentiment: CharacterSentiment.FRIENDLY
      });

      // Query characters using sentiment-based logic
      const characters = await db.all('SELECT * FROM characters WHERE current_room_id = ?', [1]);
      
      expect(characters).toHaveLength(2);
      
      // Verify no character has is_hostile property
      characters.forEach(character => {
        expect(character).not.toHaveProperty('is_hostile');
        expect(character.sentiment).toBeDefined();
      });
    });
  });

  describe('Legacy Compatibility', () => {
    it('should handle old database without is_hostile gracefully', async () => {
      // Create a legacy database structure without is_hostile column
      await db.run(`
        CREATE TABLE characters (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          game_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          extended_description TEXT,
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
          sentiment TEXT DEFAULT 'indifferent',
          dialogue_response TEXT,
          is_dead BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // The system should work without any reference to is_hostile
      characterService = new CharacterService(db);
      
      const characterId = await characterService.createCharacter({
        game_id: 1,
        name: 'Modern Character',
        description: 'A character created after migration',
        type: CharacterType.NPC,
        current_room_id: 1,
        sentiment: CharacterSentiment.ALLIED
      });

      const character = await characterService.getCharacter(characterId);
      expect(character?.sentiment).toBe(CharacterSentiment.ALLIED);
    });
  });

  describe('Code Reference Verification', () => {
    it('should not reference is_hostile in any character operations', async () => {
      await initializeTestDatabase(db);
      characterService = new CharacterService(db);

      // Test creating a character - should only use sentiment
      const characterId = await characterService.createCharacter({
        game_id: 1,
        name: 'Sentiment-Only Character',
        description: 'Uses only sentiment system',
        type: CharacterType.ENEMY,
        current_room_id: 1,
        sentiment: CharacterSentiment.AGGRESSIVE
      });

      // Test updating character - should only affect sentiment
      await characterService.setSentiment(characterId, CharacterSentiment.HOSTILE);
      
      const character = await characterService.getCharacter(characterId);
      expect(character?.sentiment).toBe(CharacterSentiment.HOSTILE);
      
      // Verify the database row has no is_hostile column
      const rawCharacter = await db.get('SELECT * FROM characters WHERE id = ?', [characterId]);
      expect(rawCharacter).not.toHaveProperty('is_hostile');
    });

    it('should use sentiment for all behavioral decisions', async () => {
      await initializeTestDatabase(db);
      characterService = new CharacterService(db);

      // Create characters with different sentiments
      const hostileId = await characterService.createCharacter({
        game_id: 1,
        name: 'Hostile Enemy',
        description: 'A hostile enemy',
        type: CharacterType.ENEMY,
        current_room_id: 1,
        sentiment: CharacterSentiment.HOSTILE
      });

      const friendlyId = await characterService.createCharacter({
        game_id: 1,
        name: 'Friendly NPC',
        description: 'A friendly NPC',
        type: CharacterType.NPC,
        current_room_id: 1,
        sentiment: CharacterSentiment.FRIENDLY
      });

      // Test sentiment-based logic
      const hostileSentiment = await characterService.getSentiment(hostileId);
      const friendlySentiment = await characterService.getSentiment(friendlyId);

      expect(hostileSentiment).toBe(CharacterSentiment.HOSTILE);
      expect(friendlySentiment).toBe(CharacterSentiment.FRIENDLY);

      // Test behavior based on sentiment (using sentiment comparison)
      expect(hostileSentiment === CharacterSentiment.HOSTILE || hostileSentiment === CharacterSentiment.AGGRESSIVE).toBe(true);
      expect(friendlySentiment === CharacterSentiment.FRIENDLY || friendlySentiment === CharacterSentiment.ALLIED).toBe(true);
    });
  });
});