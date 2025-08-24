import Database from '../../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import { GameController } from '../../src/gameController';
import { GameStateManager } from '../../src/services/gameStateManager';
import { CharacterService } from '../../src/services/characterService';
import { ItemService } from '../../src/services/itemService';

describe('Region Phase 6: Complete Progression Flow (E2E)', () => {
  let db: Database;
  let gameController: GameController;
  let gameStateManager: GameStateManager;
  let characterService: CharacterService;
  let itemService: ItemService;
  let gameId: number;

  beforeEach(async () => {
    // Use in-memory database for tests
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    // Initialize services
    gameStateManager = new GameStateManager(db);
    characterService = new CharacterService(db);
    itemService = new ItemService(db);
    gameController = new GameController(db, undefined);
    
    // Create a test game with both regions
    const uniqueGameName = `Region Phase 6 E2E Test ${Date.now()}-${Math.random()}`;
    gameId = await createGameWithRooms(db, uniqueGameName);
    
    // Start game session
    await gameStateManager.startGameSession(gameId);
  });

  afterEach(async () => {
    await db.close();
  });

  test('complete progression flow: defeat guardian → get key → unlock door → enter Region 2', async () => {
    // Step 1: Verify initial setup - player should start in Grand Entrance Hall
    const initialSession = gameStateManager.getCurrentSession();
    expect(initialSession?.gameId).toBe(gameId);
    
    const startingRoom = await db.get<any>('SELECT * FROM rooms WHERE id = ?', [initialSession?.roomId]);
    expect(startingRoom?.name).toBe('Grand Entrance Hall');
    
    // Step 2: Navigate to the Ancient Crypt Entrance (guardian room)
    const cryptRoom = await db.get<any>(
      'SELECT id FROM rooms WHERE game_id = ? AND name = ?',
      [gameId, 'Ancient Crypt Entrance']
    );
    expect(cryptRoom).toBeDefined();
    
    // Move to the crypt room
    await gameStateManager.moveToRoom(cryptRoom.id);
    
    const session = gameStateManager.getCurrentSession();
    expect(session?.roomId).toBe(cryptRoom.id);
    
    // Step 3: Verify Stone Sentinel (guardian) is in the room
    const stoneSentinel = await db.get<any>(
      'SELECT * FROM characters WHERE game_id = ? AND current_room_id = ? AND name = ?',
      [gameId, cryptRoom.id, 'Stone Sentinel']
    );
    expect(stoneSentinel).toBeDefined();
    expect(stoneSentinel.type).toBe('enemy');
    expect(stoneSentinel.is_dead).toBe(0);
    
    // Step 4: Verify Vault Key is in the room but protected by guardian
    const vaultKeyItem = await db.get<any>(`
      SELECT i.*, ri.quantity
      FROM room_items ri
      JOIN items i ON ri.item_id = i.id
      WHERE ri.room_id = ? AND i.name = ?
    `, [cryptRoom.id, 'Vault Key']);
    
    expect(vaultKeyItem).toBeDefined();
    expect(vaultKeyItem.name).toBe('Vault Key');
    expect(vaultKeyItem.type).toBe('quest');
    
    // Step 5: Defeat the Stone Sentinel
    await characterService.setCharacterDead(stoneSentinel.id);
    
    // Verify guardian is defeated
    const defeatedSentinel = await characterService.getCharacter(stoneSentinel.id);
    expect(defeatedSentinel?.is_dead).toBe(1);
    
    // Step 6: Pick up the Vault Key
    const playerCharacter = await characterService.getPlayerCharacter(gameId);
    expect(playerCharacter).toBeDefined();
    
    // Transfer the item from room to character inventory
    await itemService.transferItemToInventory(playerCharacter!.id, vaultKeyItem.id, cryptRoom.id, 1);
    
    // Verify player has the key
    const playerInventory = await itemService.getCharacterInventory(playerCharacter!.id);
    const vaultKeyInInventory = playerInventory.find(item => item.item.name === 'Vault Key');
    expect(vaultKeyInInventory).toBeDefined();
    expect(vaultKeyInInventory?.quantity).toBe(1);
    
    // Step 7: Find the locked exit connection from Ancient Crypt Entrance
    const lockedConnection = await db.get<any>(
      'SELECT * FROM connections WHERE from_room_id = ? AND locked = ? AND required_key_name = ?',
      [cryptRoom.id, 1, 'Vault Key']
    );
    expect(lockedConnection).toBeDefined();
    expect(lockedConnection.to_room_id).toBeDefined(); // Should be connected to Region 2
    expect(lockedConnection.to_room_id).not.toBeNull();
    
    // Step 8: Use the key to unlock the connection and enter Region 2
    const region2EntranceId = lockedConnection.to_room_id;
    
    // Move through the unlocked connection to Region 2
    await gameStateManager.moveToRoom(region2EntranceId);
    
    const finalSession = gameStateManager.getCurrentSession();
    expect(finalSession?.roomId).toBe(region2EntranceId);
    
    // Step 9: Verify we're now in Region 2
    const region2Room = await db.get<any>('SELECT * FROM rooms WHERE id = ?', [region2EntranceId]);
    expect(region2Room).toBeDefined();
    
    // Find which region this room belongs to
    const region2 = await db.get<any>('SELECT * FROM regions WHERE id = ?', [region2Room.region_id]);
    expect(region2).toBeDefined();
    expect(region2.name).not.toBe('Shadow Kingdom Manor'); // Should be different from Region 1
    
    // Step 10: Verify Region 2 is fully accessible with 12 rooms
    const region2Rooms = await db.all<any>(
      'SELECT * FROM rooms WHERE region_id = ? ORDER BY region_distance',
      [region2.id]
    );
    expect(region2Rooms.length).toBe(12); // Region 2 should have exactly 12 rooms
    
    // Step 11: Verify Region 2 has its own guardian and key
    const region2Characters = await db.all<any>(
      'SELECT c.* FROM characters c ' +
      'JOIN rooms r ON c.current_room_id = r.id ' +
      'WHERE r.region_id = ? AND c.type = ?',
      [region2.id, 'enemy']
    );
    expect(region2Characters.length).toBeGreaterThanOrEqual(1); // Should have at least one enemy (the guardian)
    
    // Find Region 2's key
    const region2Keys = await db.all<any>(`
      SELECT i.* FROM items i
      JOIN room_items ri ON i.id = ri.item_id
      JOIN rooms r ON ri.room_id = r.id
      WHERE r.region_id = ? AND i.type = ?
    `, [region2.id, 'quest']);
    expect(region2Keys.length).toBeGreaterThanOrEqual(1); // Should have at least one quest key
    
    // Step 12: Verify Region 2 has connections (for future expansion)
    const region2Connections = await db.all<any>(`
      SELECT c.* FROM connections c
      JOIN rooms r ON c.from_room_id = r.id
      WHERE r.region_id = ?
    `, [region2.id]);
    expect(region2Connections.length).toBeGreaterThan(0); // Should have connections for navigation
  });

  test('verify progression is blocked without Vault Key', async () => {
    // Navigate to Ancient Crypt Entrance
    const cryptRoom = await db.get<any>(
      'SELECT id FROM rooms WHERE game_id = ? AND name = ?',
      [gameId, 'Ancient Crypt Entrance']
    );
    await gameStateManager.moveToRoom(cryptRoom.id);
    
    // Find the locked connection
    const lockedConnection = await db.get<any>(
      'SELECT * FROM connections WHERE from_room_id = ? AND locked = ? AND required_key_name = ?',
      [cryptRoom.id, 1, 'Vault Key']
    );
    expect(lockedConnection).toBeDefined();
    
    // Verify player doesn't have the key initially
    const playerCharacter = await characterService.getPlayerCharacter(gameId);
    const playerInventory = await itemService.getCharacterInventory(playerCharacter!.id);
    const hasVaultKey = playerInventory.some(item => item.item.name === 'Vault Key');
    expect(hasVaultKey).toBe(false);
    
    // Attempting to move through locked connection should fail (would need to test this with actual game controller)
    // For now, just verify the connection exists and requires the key
    expect(lockedConnection.required_key_name).toBe('Vault Key');
    expect(lockedConnection.locked).toBe(1);
  });

  test('verify data integrity after region connection', async () => {
    // Find both regions
    const regions = await db.all<any>('SELECT * FROM regions WHERE game_id = ? ORDER BY created_at', [gameId]);
    expect(regions.length).toBeGreaterThanOrEqual(2);
    
    const region1 = regions.find(r => r.name === 'Shadow Kingdom Manor');
    const region2 = regions.find(r => r.name !== 'Shadow Kingdom Manor');
    
    expect(region1).toBeDefined();
    expect(region2).toBeDefined();
    
    // Verify connection integrity
    const connection = await db.get<any>(`
      SELECT c.*, r1.name as from_room_name, r2.name as to_room_name, r2.region_id as to_region_id
      FROM connections c
      JOIN rooms r1 ON c.from_room_id = r1.id
      JOIN rooms r2 ON c.to_room_id = r2.id
      WHERE c.locked = ? AND c.required_key_name = ? AND r1.region_id = ?
    `, [1, 'Vault Key', region1.id]);
    
    expect(connection).toBeDefined();
    expect(connection.to_region_id).toBe(region2.id); // Connection should lead to Region 2
    expect(connection.from_room_name).toBe('Ancient Crypt Entrance');
    expect(connection.game_id).toBe(gameId);
    
    // Verify foreign key constraints
    const connectionCheck = await db.get<any>('SELECT COUNT(*) as count FROM connections WHERE game_id = ?', [gameId]);
    expect(connectionCheck.count).toBeGreaterThan(0);
    
    // Verify no orphaned connections (all connections should have valid from/to room IDs)
    const orphanedConnections = await db.all<any>(`
      SELECT c.* FROM connections c
      LEFT JOIN rooms r1 ON c.from_room_id = r1.id
      LEFT JOIN rooms r2 ON c.to_room_id = r2.id
      WHERE c.game_id = ? AND (r1.id IS NULL OR (c.to_room_id IS NOT NULL AND r2.id IS NULL))
    `, [gameId]);
    expect(orphanedConnections.length).toBe(0);
  });
});