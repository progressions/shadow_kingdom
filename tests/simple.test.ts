import Database from '../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';

describe('Simple Database Tests', () => {
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

  test('should create a game successfully', async () => {
    const gameId = await createGameWithRooms(db, 'Simple Test Game');
    expect(gameId).toBeGreaterThan(0);

    const game = await db.get('SELECT * FROM games WHERE id = ?', [gameId]);
    expect(game.name).toBe('Simple Test Game');
  });

  test('should create game with rooms and connections', async () => {
    const gameId = await createGameWithRooms(db, 'Room Test Game');
    
    const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
    expect(rooms).toHaveLength(3);

    const connections = await db.all('SELECT * FROM connections WHERE game_id = ?', [gameId]);
    expect(connections.length).toBeGreaterThan(0);
  });

  test('should maintain game state', async () => {
    const gameId = await createGameWithRooms(db, 'State Test Game');
    
    const gameState = await db.get('SELECT * FROM game_state WHERE game_id = ?', [gameId]);
    expect(gameState).toBeDefined();
    expect(gameState.current_room_id).toBeDefined();
  });

  test('should support room navigation', async () => {
    const gameId = await createGameWithRooms(db, 'Navigation Test Game');
    
    // Get entrance hall
    const entrance = await db.get(
      'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
      [gameId, 'Entrance Hall']
    );
    
    // Find north connection
    const northConnection = await db.get(
      'SELECT * FROM connections WHERE game_id = ? AND from_room_id = ? AND name = ?',
      [gameId, entrance.id, 'north']
    );
    
    expect(northConnection).toBeDefined();
    
    // Verify it goes to library
    const library = await db.get('SELECT * FROM rooms WHERE id = ?', [northConnection.to_room_id]);
    expect(library.name).toBe('Library');
  });

  test('should isolate games from each other', async () => {
    const game1Id = await createGameWithRooms(db, 'Isolation Game 1');
    const game2Id = await createGameWithRooms(db, 'Isolation Game 2');
    
    const game1Rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [game1Id]);
    const game2Rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [game2Id]);
    
    expect(game1Rooms).toHaveLength(3);
    expect(game2Rooms).toHaveLength(3);
    
    // Room IDs should be different
    const game1RoomIds = game1Rooms.map(r => r.id);
    const game2RoomIds = game2Rooms.map(r => r.id);
    
    const sharedIds = game1RoomIds.filter(id => game2RoomIds.includes(id));
    expect(sharedIds).toHaveLength(0);
  });
});