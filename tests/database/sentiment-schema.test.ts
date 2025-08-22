import Database from '../../src/utils/database';
import { initializeDatabase } from '../../src/utils/initDb';

describe('Database Sentiment Schema', () => {
  let db: Database;

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
  });

  afterEach(async () => {
    if (db.isConnected()) {
      await db.close();
    }
  });

  describe('Phase 1: Sentiment Column', () => {
    it('should have sentiment column in characters table with default value', async () => {
      // Check if sentiment column exists
      const columns = await db.all(`PRAGMA table_info('characters')`);
      const sentimentColumn = columns.find((col: any) => col.name === 'sentiment');
      
      expect(sentimentColumn).toBeDefined();
      expect(sentimentColumn.dflt_value).toBe("'indifferent'");
    });

    it('should create characters with default sentiment of indifferent', async () => {
      // Create a test game first
      await db.run(`
        INSERT INTO games (name, created_at, last_played_at) 
        VALUES ('Test Game', '2025-08-22 10:00:00', '2025-08-22 10:00:00')
      `);
      
      const gameResult = await db.get<{ id: number }>('SELECT id FROM games WHERE name = ?', ['Test Game']);
      const gameId = gameResult!.id;

      // Create a test character without specifying sentiment
      await db.run(`
        INSERT INTO characters (game_id, name, type) 
        VALUES (?, 'Test Character', 'npc')
      `, [gameId]);

      // Verify default sentiment is applied
      const character = await db.get<{ sentiment: string }>(`
        SELECT sentiment FROM characters WHERE name = 'Test Character'
      `);
      
      expect(character?.sentiment).toBe('indifferent');
    });

    it('should maintain backward compatibility with is_hostile column', async () => {
      // Check if is_hostile column still exists
      const columns = await db.all(`PRAGMA table_info('characters')`);
      const isHostileColumn = columns.find((col: any) => col.name === 'is_hostile');
      
      expect(isHostileColumn).toBeDefined();
    });

    it('should allow setting valid sentiment values', async () => {
      // Create a test game first
      await db.run(`
        INSERT INTO games (name, created_at, last_played_at) 
        VALUES ('Test Game', '2025-08-22 10:00:00', '2025-08-22 10:00:00')
      `);
      
      const gameResult = await db.get<{ id: number }>('SELECT id FROM games WHERE name = ?', ['Test Game']);
      const gameId = gameResult!.id;

      // Test each sentiment value
      const sentiments = ['hostile', 'aggressive', 'indifferent', 'friendly', 'allied'];
      
      for (let i = 0; i < sentiments.length; i++) {
        const sentiment = sentiments[i];
        await db.run(`
          INSERT INTO characters (game_id, name, type, sentiment) 
          VALUES (?, ?, 'npc', ?)
        `, [gameId, `Character ${i}`, sentiment]);

        const character = await db.get<{ sentiment: string }>(`
          SELECT sentiment FROM characters WHERE name = ?
        `, [`Character ${i}`]);
        
        expect(character?.sentiment).toBe(sentiment);
      }
    });

    it('should support migration from existing data', async () => {
      // Create a test game first
      await db.run(`
        INSERT INTO games (name, created_at, last_played_at) 
        VALUES ('Test Game', '2025-08-22 10:00:00', '2025-08-22 10:00:00')
      `);
      
      const gameResult = await db.get<{ id: number }>('SELECT id FROM games WHERE name = ?', ['Test Game']);
      const gameId = gameResult!.id;

      // Insert characters with old is_hostile values
      await db.run(`
        INSERT INTO characters (game_id, name, type, is_hostile) 
        VALUES (?, 'Hostile Character', 'enemy', TRUE)
      `, [gameId]);
      
      await db.run(`
        INSERT INTO characters (game_id, name, type, is_hostile) 
        VALUES (?, 'Peaceful Character', 'npc', FALSE)
      `, [gameId]);

      // Verify the data exists in the expected format
      const hostileChar = await db.get<{ is_hostile: boolean; sentiment: string }>(`
        SELECT is_hostile, sentiment FROM characters WHERE name = 'Hostile Character'
      `);
      
      const peacefulChar = await db.get<{ is_hostile: boolean; sentiment: string }>(`
        SELECT is_hostile, sentiment FROM characters WHERE name = 'Peaceful Character'
      `);
      
      expect(hostileChar?.is_hostile).toBe(1); // SQLite returns 1 for TRUE
      expect(hostileChar?.sentiment).toBe('indifferent'); // Default value until migration
      expect(peacefulChar?.is_hostile).toBe(0); // SQLite returns 0 for FALSE
      expect(peacefulChar?.sentiment).toBe('indifferent'); // Default value until migration
    });
  });
});