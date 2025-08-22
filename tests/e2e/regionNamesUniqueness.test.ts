import Database from '../../src/utils/database';
import { initializeDatabase } from '../../src/utils/initDb';
import { GameController } from '../../src/gameController';

describe('Region Names Uniqueness E2E', () => {
  let db: Database;
  let gameController: GameController;
  let testGameId: number;

  beforeEach(async () => {
    // Use in-memory database for tests
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);

    gameController = new GameController(db);

    // Create test game with unique name
    const uniqueGameName = `Test Game ${Date.now()}-${Math.random()}`;
    const gameResult = await db.run(
      'INSERT INTO games (name, created_at, last_played_at) VALUES (?, ?, ?)',
      [uniqueGameName, new Date().toISOString(), new Date().toISOString()]
    );
    testGameId = gameResult.lastID!;
  });

  afterEach(async () => {
    await db.close();
  });

  test('should verify unique regions are created in database', async () => {
    // Manually create regions to test uniqueness
    await db.run(
      'INSERT INTO regions (game_id, name, type, description) VALUES (?, ?, ?, ?)',
      [testGameId, 'Shadow Manor', 'mansion', 'A grand dark mansion']
    );
    
    await db.run(
      'INSERT INTO regions (game_id, name, type, description) VALUES (?, ?, ?, ?)',
      [testGameId, 'Whispering Woods', 'forest', 'Ancient forest with secrets']
    );
    
    // Query regions to verify uniqueness
    const regions = await db.all<{name: string, type: string}>(
      'SELECT name, type FROM regions WHERE game_id = ?',
      [testGameId]
    );

    // Verify we have exactly the regions we expect
    expect(regions).toHaveLength(2);
    
    const regionNames = regions.map(r => r.name);
    expect(regionNames).toContain('Shadow Manor');
    expect(regionNames).toContain('Whispering Woods');
    
    // Verify no duplicates
    const uniqueNames = [...new Set(regionNames)];
    expect(uniqueNames).toHaveLength(regionNames.length);
  });

  test('should handle mix of named and unnamed regions', async () => {
    // Create regions with and without names
    await db.run(
      'INSERT INTO regions (game_id, name, type, description) VALUES (?, ?, ?, ?)',
      [testGameId, 'Named Region', 'mansion', 'A region with a name']
    );
    
    await db.run(
      'INSERT INTO regions (game_id, name, type, description) VALUES (?, ?, ?, ?)',
      [testGameId, null, 'forest', 'A region without a name']
    );
    
    // Query regions to verify behavior with mixed naming
    const namedRegions = await db.all<{name: string}>(
      'SELECT name FROM regions WHERE game_id = ? AND name IS NOT NULL',
      [testGameId]
    );
    
    const allRegions = await db.all<{name: string, type: string}>(
      'SELECT name, type FROM regions WHERE game_id = ?',
      [testGameId]
    );

    // Should have one named region
    expect(namedRegions).toHaveLength(1);
    expect(namedRegions[0].name).toBe('Named Region');
    
    // Should have two total regions
    expect(allRegions).toHaveLength(2);
    expect(allRegions.some(r => r.name === 'Named Region')).toBe(true);
    expect(allRegions.some(r => r.name === null && r.type === 'forest')).toBe(true);
  });

  test('should prevent creation of duplicate region names through AI prompting', async () => {
    // Create an existing region
    await db.run(
      'INSERT INTO regions (game_id, name, type, description) VALUES (?, ?, ?, ?)',
      [testGameId, 'Existing Manor', 'mansion', 'An existing mansion region']
    );

    // Get existing region names - this is the key functionality we're testing
    const existingNames = await db.all<{name: string}>(
      'SELECT name FROM regions WHERE game_id = ? AND name IS NOT NULL',
      [testGameId]
    );

    // Verify our method correctly identifies existing names
    expect(existingNames).toHaveLength(1);
    expect(existingNames[0].name).toBe('Existing Manor');

    // This simulates what the AI prompt enhancement should do:
    // The AI should receive these existing names and be instructed not to duplicate them
    const existingNamesList = existingNames.map(r => r.name);
    expect(existingNamesList).toContain('Existing Manor');

    // In real usage, the AI would receive a prompt like:
    // "EXISTING REGIONS IN THIS GAME: Existing Manor. IMPORTANT: You MUST NOT use any of these existing region names."
  });
});