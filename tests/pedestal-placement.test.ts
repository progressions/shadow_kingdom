/**
 * Test for Ancient Stone Pedestal placement in new games
 * 
 * This test verifies that the Ancient Stone Pedestal (fixed item)
 * is correctly placed in the Grand Entrance Hall when a new game is created.
 */

import Database from '../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';
import { seedItems } from '../src/utils/seedItems';
import { ItemService } from '../src/services/itemService';

describe('Ancient Stone Pedestal Placement', () => {
  let db: Database;
  let itemService: ItemService;

  beforeEach(async () => {
    // Use in-memory database for testing
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    // Seed items to ensure pedestal exists
    await seedItems(db);
    
    itemService = new ItemService(db);
  });

  afterEach(async () => {
    await db.close();
  });

  test('should place Ancient Stone Pedestal in Grand Entrance Hall when creating new game', async () => {
    // Create a new game
    const gameName = `Test Game ${Date.now()}`;
    const gameId = await createGameWithRooms(db, gameName);
    
    // Find the Grand Entrance Hall
    const entranceHall = await db.get<any>(
      'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
      [gameId, 'Grand Entrance Hall']
    );
    
    expect(entranceHall).toBeDefined();
    expect(entranceHall.name).toBe('Grand Entrance Hall');
    
    // Check if Ancient Stone Pedestal exists in items table
    const pedestal = await db.get<any>(
      'SELECT * FROM items WHERE name = ?',
      ['Ancient Stone Pedestal']
    );
    
    expect(pedestal).toBeDefined();
    expect(pedestal.name).toBe('Ancient Stone Pedestal');
    expect(pedestal.is_fixed).toBe(1); // SQLite stores boolean as 0/1
    
    // Check if pedestal is placed in the entrance hall
    const roomItems = await db.all<any>(
      'SELECT ri.*, i.name, i.is_fixed FROM room_items ri JOIN items i ON ri.item_id = i.id WHERE ri.room_id = ?',
      [entranceHall.id]
    );
    
    console.log('Room items in entrance hall:', roomItems);
    
    const pedestalInRoom = roomItems.find(item => item.name === 'Ancient Stone Pedestal');
    expect(pedestalInRoom).toBeDefined();
    expect(pedestalInRoom.is_fixed).toBe(1);
    
    // Also check using ItemService.getRoomItems
    const itemsFromService = await itemService.getRoomItems(entranceHall.id);
    console.log('Items from ItemService:', itemsFromService);
    
    const pedestalFromService = itemsFromService.find(item => item.item.name === 'Ancient Stone Pedestal');
    expect(pedestalFromService).toBeDefined();
    expect(pedestalFromService?.item.is_fixed).toBe(true);
  });

  test('should show pedestal when getting room items', async () => {
    // Create a new game
    const gameName = `Display Test ${Date.now()}`;
    const gameId = await createGameWithRooms(db, gameName);
    
    // Find the entrance hall
    const entranceHall = await db.get<any>(
      'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
      [gameId, 'Grand Entrance Hall']
    );
    
    // Get all items in the room using ItemService
    const roomItems = await itemService.getRoomItems(entranceHall.id);
    
    console.log('All items in entrance hall:', roomItems.map(ri => ({
      name: ri.item.name,
      is_fixed: ri.item.is_fixed,
      quantity: ri.quantity
    })));
    
    // Should have at least 2 items: Iron Sword and Ancient Stone Pedestal
    expect(roomItems.length).toBeGreaterThanOrEqual(2);
    
    const sword = roomItems.find(item => item.item.name === 'Iron Sword');
    const pedestal = roomItems.find(item => item.item.name === 'Ancient Stone Pedestal');
    
    expect(sword).toBeDefined();
    expect(sword?.item.is_fixed).toBeFalsy();
    
    expect(pedestal).toBeDefined();
    expect(pedestal?.item.is_fixed).toBe(true);
  });

  test('should correctly identify fixed vs moveable items', async () => {
    // Create a new game
    const gameName = `Fixed Test ${Date.now()}`;
    const gameId = await createGameWithRooms(db, gameName);
    
    // Find the entrance hall
    const entranceHall = await db.get<any>(
      'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
      [gameId, 'Grand Entrance Hall']
    );
    
    // Get room items
    const roomItems = await itemService.getRoomItems(entranceHall.id);
    
    // Separate fixed and moveable items
    const fixedItems = roomItems.filter(ri => ri.item.is_fixed);
    const moveableItems = roomItems.filter(ri => !ri.item.is_fixed);
    
    console.log('Fixed items:', fixedItems.map(ri => ri.item.name));
    console.log('Moveable items:', moveableItems.map(ri => ri.item.name));
    
    // Should have at least one fixed item (pedestal)
    expect(fixedItems.length).toBeGreaterThanOrEqual(1);
    expect(fixedItems.some(ri => ri.item.name === 'Ancient Stone Pedestal')).toBe(true);
    
    // Should have at least one moveable item (sword)
    expect(moveableItems.length).toBeGreaterThanOrEqual(1);
    expect(moveableItems.some(ri => ri.item.name === 'Iron Sword')).toBe(true);
  });
});