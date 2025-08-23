/**
 * Sentiment Migration Tests - Phase 9
 * 
 * Tests the migration of existing is_hostile data to the sentiment system.
 * Verifies that characters with is_hostile=true are converted to aggressive,
 * and characters with is_hostile=false/null are converted to indifferent.
 */

import Database from '../../src/utils/database';
import { initializeDatabase } from '../../src/utils/initDb';
import { CharacterService } from '../../src/services/characterService';
import { CharacterSentiment, CharacterType } from '../../src/types/character';

describe('Sentiment Migration - Phase 9', () => {
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

  describe('Data Conversion Accuracy', () => {
    it('should convert is_hostile=true characters to aggressive sentiment during initialization', async () => {
      // Create basic characters table without sentiment
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
          is_hostile BOOLEAN DEFAULT FALSE,
          is_dead BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create characters with legacy is_hostile values
      await db.run(`
        INSERT INTO characters (
          game_id, name, description, type, current_room_id, 
          strength, dexterity, intelligence, constitution, wisdom, charisma,
          max_health, current_health, is_hostile, is_dead, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        1, 'Hostile Orc', 'An aggressive orc warrior', CharacterType.ENEMY, 1,
        12, 10, 8, 14, 9, 6, 20, 20, true, false, new Date().toISOString()
      ]);

      await db.run(`
        INSERT INTO characters (
          game_id, name, description, type, current_room_id, 
          strength, dexterity, intelligence, constitution, wisdom, charisma,
          max_health, current_health, is_hostile, is_dead, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        1, 'Hostile Bandit', 'An aggressive bandit', CharacterType.ENEMY, 1,
        10, 12, 9, 11, 8, 7, 15, 15, true, false, new Date().toISOString()
      ]);

      // Run full database initialization - this should trigger the migration
      await initializeDatabase(db);

      // Verify conversion
      const hostileOrc = await db.get('SELECT * FROM characters WHERE name = ?', ['Hostile Orc']);
      const hostileBandit = await db.get('SELECT * FROM characters WHERE name = ?', ['Hostile Bandit']);

      expect(hostileOrc.sentiment).toBe(CharacterSentiment.AGGRESSIVE);
      expect(hostileOrc.is_hostile).toBe(1); // Original value preserved
      
      expect(hostileBandit.sentiment).toBe(CharacterSentiment.AGGRESSIVE);
      expect(hostileBandit.is_hostile).toBe(1); // Original value preserved
    });

    it('should convert is_hostile=false characters to indifferent sentiment', async () => {
      // Create basic characters table without sentiment
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
          is_hostile BOOLEAN DEFAULT FALSE,
          is_dead BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create characters with is_hostile=false
      await db.run(`
        INSERT INTO characters (
          game_id, name, description, type, current_room_id, 
          strength, dexterity, intelligence, constitution, wisdom, charisma,
          max_health, current_health, is_hostile, is_dead, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        1, 'Peaceful Merchant', 'A friendly merchant', CharacterType.NPC, 1,
        8, 10, 12, 10, 11, 14, 12, 12, false, false, new Date().toISOString()
      ]);

      // Run full database initialization - this should trigger the migration
      await initializeDatabase(db);

      // Verify conversion
      const merchant = await db.get('SELECT * FROM characters WHERE name = ?', ['Peaceful Merchant']);
      
      expect(merchant.sentiment).toBe(CharacterSentiment.INDIFFERENT);
      expect(merchant.is_hostile).toBe(0); // Original value preserved
    });

    it('should convert is_hostile=null characters to indifferent sentiment', async () => {
      // Create legacy table without sentiment column
      await createLegacyCharactersTable(db);
      
      // Create character with is_hostile=null
      await db.run(`
        INSERT INTO characters (
          game_id, name, description, type, current_room_id, 
          strength, dexterity, intelligence, constitution, wisdom, charisma,
          max_health, current_health, is_hostile, is_dead, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        1, 'Neutral Guard', 'A neutral guard', CharacterType.NPC, 1,
        11, 9, 10, 12, 10, 9, 15, 15, null, false, new Date().toISOString()
      ]);

      // Run full database initialization - this should trigger the migration
      await initializeDatabase(db);

      // Verify conversion
      const guard = await db.get('SELECT * FROM characters WHERE name = ?', ['Neutral Guard']);
      
      expect(guard.sentiment).toBe(CharacterSentiment.INDIFFERENT);
      expect(guard.is_hostile).toBeNull(); // Original value preserved
    });

    it('should handle mixed character types correctly', async () => {
      // Create legacy table without sentiment column
      await createLegacyCharactersTable(db);
      
      // Create mix of characters
      const characters = [
        { name: 'Hostile Enemy', type: CharacterType.ENEMY, is_hostile: true, expected: CharacterSentiment.AGGRESSIVE },
        { name: 'Peaceful NPC', type: CharacterType.NPC, is_hostile: false, expected: CharacterSentiment.INDIFFERENT },
        { name: 'Neutral Enemy', type: CharacterType.ENEMY, is_hostile: null, expected: CharacterSentiment.INDIFFERENT },
        { name: 'Non-Hostile NPC', type: CharacterType.NPC, is_hostile: false, expected: CharacterSentiment.INDIFFERENT }
      ];

      for (const char of characters) {
        await db.run(`
          INSERT INTO characters (
            game_id, name, description, type, current_room_id, 
            strength, dexterity, intelligence, constitution, wisdom, charisma,
            max_health, current_health, is_hostile, is_dead, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          1, char.name, `A ${char.name.toLowerCase()}`, char.type, 1,
          10, 10, 10, 10, 10, 10, 10, 10, char.is_hostile, false, new Date().toISOString()
        ]);
      }

      // Run full database initialization - this should trigger the migration
      await initializeDatabase(db);

      // Verify all conversions
      for (const char of characters) {
        const result = await db.get('SELECT * FROM characters WHERE name = ?', [char.name]);
        expect(result.sentiment).toBe(char.expected);
      }
    });

  });

  describe('Migration Safety', () => {
    it('should not lose any character data during migration', async () => {
      // Create legacy table without sentiment column
      await createLegacyCharactersTable(db);
      
      // Create test characters with all fields populated
      const testCharacters = [
        {
          name: 'Full Character 1',
          description: 'A fully specified character',
          type: CharacterType.ENEMY,
          is_hostile: true,
          strength: 15,
          wisdom: 12
        },
        {
          name: 'Full Character 2', 
          description: 'Another fully specified character',
          type: CharacterType.NPC,
          is_hostile: false,
          strength: 8,
          wisdom: 16
        }
      ];

      // Insert characters and store original data
      for (const char of testCharacters) {
        await db.run(`
          INSERT INTO characters (
            game_id, name, description, type, current_room_id, 
            strength, dexterity, intelligence, constitution, wisdom, charisma,
            max_health, current_health, is_hostile, is_dead, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          1, char.name, char.description, char.type, 1,
          char.strength, 10, 10, 10, char.wisdom, 10, 10, 10, char.is_hostile, false, new Date().toISOString()
        ]);
      }

      // Get character count before migration
      const beforeCount = await db.get('SELECT COUNT(*) as count FROM characters');

      // Run full database initialization - this should trigger the migration
      await initializeDatabase(db);

      // Verify no characters were lost
      const afterCount = await db.get('SELECT COUNT(*) as count FROM characters');
      expect(afterCount.count).toBe(beforeCount.count);

      // Verify all original data is preserved and sentiments are set correctly
      for (const char of testCharacters) {
        const result = await db.get('SELECT * FROM characters WHERE name = ?', [char.name]);
        expect(result.name).toBe(char.name);
        expect(result.description).toBe(char.description);
        expect(result.type).toBe(char.type);
        expect(result.strength).toBe(char.strength);
        expect(result.wisdom).toBe(char.wisdom);
        expect(result.is_hostile).toBe(char.is_hostile ? 1 : 0); // SQLite boolean conversion
        
        // Verify sentiment was migrated correctly
        const expectedSentiment = char.is_hostile ? CharacterSentiment.AGGRESSIVE : CharacterSentiment.INDIFFERENT;
        expect(result.sentiment).toBe(expectedSentiment);
      }
    });
  });
});

/**
 * Create basic characters table with is_hostile but without sentiment column
 */
async function createLegacyCharactersTable(db: Database): Promise<void> {
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
      is_hostile BOOLEAN DEFAULT FALSE,
      is_dead BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}