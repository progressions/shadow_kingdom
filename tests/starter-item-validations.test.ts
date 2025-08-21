import Database from '../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';
import { ItemService } from '../src/services/itemService';

describe('Starter Item Validations', () => {
  let db: Database;
  let itemService: ItemService;

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    itemService = new ItemService(db);
  });

  afterEach(async () => {
    await db.close();
  });

  test('should add item curses to Ancient Key and Iron Helmet', async () => {
    // Create a new game with validations
    const gameId = await createGameWithRooms(db, 'Test Validations Game');
    expect(gameId).toBeGreaterThan(0);

    // Check Ancient Key has sticky curse (prevents dropping)
    const ancientKey = await db.get<any>('SELECT id FROM items WHERE name = ?', ['Ancient Key']);
    expect(ancientKey).toBeDefined();
    
    const ancientKeyCurse = await db.get<any>(
      'SELECT * FROM item_curses WHERE item_id = ?',
      [ancientKey.id]
    );
    expect(ancientKeyCurse).toBeDefined();
    expect(ancientKeyCurse.curse_type).toBe('sticky');
    expect(ancientKeyCurse.prevents_actions).toBe('["drop"]');
    expect(ancientKeyCurse.curse_message).toContain('Ancient Key seems bound to you');

    // Check Iron Helmet has heavy curse (prevents rest)
    const ironHelmet = await db.get<any>('SELECT id FROM items WHERE name = ?', ['Iron Helmet']);
    expect(ironHelmet).toBeDefined();
    
    const ironHelmetCurse = await db.get<any>(
      'SELECT * FROM item_curses WHERE item_id = ?',
      [ironHelmet.id]
    );
    expect(ironHelmetCurse).toBeDefined();
    expect(ironHelmetCurse.curse_type).toBe('heavy');
    expect(ironHelmetCurse.prevents_actions).toBe('["rest"]');
    expect(ironHelmetCurse.curse_message).toContain('too heavy and uncomfortable to rest');
  });

  test('should add action condition for Ancient Stone Pedestal in Grand Entrance Hall', async () => {
    // Create a new game with validations
    const gameId = await createGameWithRooms(db, 'Test Action Conditions Game');
    expect(gameId).toBeGreaterThan(0);

    // Get the Grand Entrance Hall room
    const entranceRoom = await db.get<any>(
      'SELECT id FROM rooms WHERE game_id = ? AND name = ?',
      [gameId, 'Grand Entrance Hall']
    );
    expect(entranceRoom).toBeDefined();

    // Get the Ancient Stone Pedestal item
    const stonePedestal = await db.get<any>('SELECT id FROM items WHERE name = ?', ['Ancient Stone Pedestal']);
    expect(stonePedestal).toBeDefined();

    // Check action condition exists
    const actionCondition = await db.get<any>(
      'SELECT * FROM action_conditions WHERE entity_type = ? AND entity_id = ? AND action_type = ?',
      ['room', entranceRoom.id, 'rest']
    );
    expect(actionCondition).toBeDefined();
    expect(actionCondition.condition_type).toBe('item_in_room');
    expect(actionCondition.condition_data).toContain(stonePedestal.id.toString());
    expect(actionCondition.failure_message).toContain('Ancient Stone Pedestal is required for safe rest');
    expect(actionCondition.hint_message).toContain('Find the Ancient Stone Pedestal');
  });

  test('should create validations correctly for multiple games', async () => {
    // Create first game
    const gameId1 = await createGameWithRooms(db, 'Test Game 1');
    
    // Create second game
    const gameId2 = await createGameWithRooms(db, 'Test Game 2');
    
    expect(gameId1).not.toBe(gameId2);

    // Should only have one curse per item globally (item curses are per-item, not per-game)
    const ancientKeyId = (await db.get<any>('SELECT id FROM items WHERE name = ?', ['Ancient Key'])).id;
    const ironHelmetId = (await db.get<any>('SELECT id FROM items WHERE name = ?', ['Iron Helmet'])).id;

    const ancientKeyCurses = await db.all<any>(
      'SELECT * FROM item_curses WHERE item_id = ?',
      [ancientKeyId]
    );
    expect(ancientKeyCurses).toHaveLength(1); // Only one curse per item globally

    const ironHelmetCurses = await db.all<any>(
      'SELECT * FROM item_curses WHERE item_id = ?',
      [ironHelmetId]
    );
    expect(ironHelmetCurses).toHaveLength(1); // Only one curse per item globally

    // Should have action conditions for both entrance halls (room-specific)
    const actionConditions = await db.all<any>(
      'SELECT * FROM action_conditions WHERE condition_type = ? AND action_type = ?',
      ['item_in_room', 'rest']
    );
    expect(actionConditions).toHaveLength(2); // One for each game's entrance hall

    // Verify they reference different rooms
    const roomIds = actionConditions.map(ac => ac.entity_id);
    expect(roomIds).toHaveLength(2);
    expect(new Set(roomIds).size).toBe(2); // Should be different room IDs
  });

  test('should handle missing items gracefully during validation setup', async () => {
    // Delete one of the items before creating game
    await db.run('DELETE FROM items WHERE name = ?', ['Iron Helmet']);
    
    // Game creation should still work
    const gameId = await createGameWithRooms(db, 'Test Missing Items Game');
    expect(gameId).toBeGreaterThan(0);
    
    // Should still have curses for the remaining items
    const ancientKeyId = (await db.get<any>('SELECT id FROM items WHERE name = ?', ['Ancient Key'])).id;
    const ancientKeyCurse = await db.get<any>(
      'SELECT * FROM item_curses WHERE item_id = ?',
      [ancientKeyId]
    );
    expect(ancientKeyCurse).toBeDefined();

    // Should not have curse for missing Iron Helmet
    const ironHelmetCurses = await db.all<any>(
      'SELECT * FROM item_curses WHERE curse_type = ?',
      ['heavy']
    );
    expect(ironHelmetCurses).toHaveLength(0);
  });

  test('should create appropriate validation types for each item', async () => {
    const gameId = await createGameWithRooms(db, 'Test Validation Types');
    
    // Verify we have the expected validation combinations
    const allCurses = await db.all<any>('SELECT * FROM item_curses');
    expect(allCurses).toHaveLength(2); // Ancient Key + Iron Helmet
    
    const curseTypes = allCurses.map(c => c.curse_type);
    expect(curseTypes).toContain('sticky');
    expect(curseTypes).toContain('heavy');
    
    const allActionConditions = await db.all<any>('SELECT * FROM action_conditions');
    expect(allActionConditions).toHaveLength(1); // Just the pedestal rest condition
    
    const conditionTypes = allActionConditions.map(c => c.condition_type);
    expect(conditionTypes).toContain('item_in_room');
  });
});