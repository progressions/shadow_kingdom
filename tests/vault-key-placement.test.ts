import Database from '../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';

describe('Vault Key and Stone Sentinel Placement', () => {
  let db: Database;

  beforeEach(async () => {
    // Use in-memory database for tests
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
  });

  afterEach(async () => {
    await db.close();
  });

  test('should place Stone Sentinel and Vault Key in Ancient Crypt Entrance for new games', async () => {
    // Create a new game
    const gameId = await createGameWithRooms(db, 'Test Game');
    
    // Find the Ancient Crypt Entrance room
    const cryptRoom = await db.get<any>(
      'SELECT id, name, description FROM rooms WHERE game_id = ? AND name = ?',
      [gameId, 'Ancient Crypt Entrance']
    );
    
    expect(cryptRoom).toBeDefined();
    expect(cryptRoom.name).toBe('Ancient Crypt Entrance');
    expect(cryptRoom.description).toContain('Stone Sentinel');
    expect(cryptRoom.description).toContain('glowing key');
    
    // Check that Stone Sentinel character exists in the room
    const stoneSentinel = await db.get<any>(
      'SELECT * FROM characters WHERE game_id = ? AND current_room_id = ? AND name = ?',
      [gameId, cryptRoom.id, 'Stone Sentinel']
    );
    
    expect(stoneSentinel).toBeDefined();
    expect(stoneSentinel.name).toBe('Stone Sentinel');
    expect(stoneSentinel.type).toBe('enemy');
    expect(stoneSentinel.description).toContain('ancient golem');
    expect(stoneSentinel.description).toContain('Vault Key');
    
    // Check that Vault Key item exists in the room
    const vaultKey = await db.get<any>(`
      SELECT i.name, i.description, i.type, ri.quantity
      FROM room_items ri
      JOIN items i ON ri.item_id = i.id
      WHERE ri.room_id = ? AND i.name = ?
    `, [cryptRoom.id, 'Vault Key']);
    
    expect(vaultKey).toBeDefined();
    expect(vaultKey.name).toBe('Vault Key');
    expect(vaultKey.type).toBe('quest');
    expect(vaultKey.quantity).toBe(1);
    expect(vaultKey.description).toContain('heavy iron key');
    expect(vaultKey.description).toContain('vault door');
  });

  test('should have multiple items in Ancient Crypt Entrance including Vault Key', async () => {
    // Create a new game
    const gameId = await createGameWithRooms(db, 'Test Game 2');
    
    // Find the Ancient Crypt Entrance room
    const cryptRoom = await db.get<any>(
      'SELECT id FROM rooms WHERE game_id = ? AND name = ?',
      [gameId, 'Ancient Crypt Entrance']
    );
    
    // Get all items in the room
    const roomItems = await db.all<any>(`
      SELECT i.name
      FROM room_items ri
      JOIN items i ON ri.item_id = i.id
      WHERE ri.room_id = ?
      ORDER BY i.name
    `, [cryptRoom.id]);
    
    const itemNames = roomItems.map((item: any) => item.name);
    
    // Should have Vault Key plus other items
    expect(itemNames).toContain('Vault Key');
    expect(itemNames).toContain('Iron Helmet');
    expect(itemNames).toContain('Gold Coins');
    expect(itemNames).toContain('Poisoned Dagger');
    expect(itemNames.length).toBe(4);
  });
});