import Database from '../../src/utils/database';
import { createGameWithRooms } from '../../src/utils/initDb';
import { initializeTestDatabase } from '../testUtils';
import { ItemService } from '../../src/services/itemService';

describe('Starter Room Item Placement', () => {
  let db: Database;
  let itemService: ItemService;

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.connect();
    await initializeTestDatabase(db);
    itemService = new ItemService(db);
  });

  afterEach(async () => {
    await db.close();
  });

  test('should place items in all starter rooms when creating new game', async () => {
    // Create a new game with rooms
    const gameId = await createGameWithRooms(db, 'Test Game');
    
    expect(gameId).toBeGreaterThan(0);

    // Get Region 1 starter rooms for this game (Region 2 is procedurally generated)
    const rooms = await db.all<any>(
      'SELECT id, name FROM rooms WHERE game_id = ? AND region_id = (SELECT MIN(id) FROM regions WHERE game_id = ?) ORDER BY name',
      [gameId, gameId]
    );
    
    expect(rooms).toHaveLength(6); // Should have 6 starter rooms in Region 1

    // Expected items in each room (updated with armor additions)
    const expectedRoomItems = {
      'Grand Entrance Hall': ['Iron Sword', 'Chain Mail', 'Leather Armor', 'Ancient Stone Pedestal', 'Blessed Silver Amulet', 'Cursed Skull', 'Leather Boots'],
      'Scholar\'s Library': ['Ancient Key', 'Healing Herbs', 'Scholar\'s Spectacles'],
      'Moonlit Courtyard Garden': ['Health Potion', 'Bread', 'Mysterious Glowing Orb', 'Celestial Star Key'],
      'Winding Tower Stairs': ['Wooden Staff', 'Cursed Ruby Ring'],
      'Ancient Crypt Entrance': ['Vault Key', 'Iron Helmet', 'Gold Coins', 'Poisoned Dagger'],
      'Observatory Steps': []
    };

    // Check each room has the expected items
    for (const room of rooms) {
      const expectedItems = expectedRoomItems[room.name as keyof typeof expectedRoomItems];
      
      if (expectedItems) {
        const roomItems = await itemService.getRoomItems(room.id);
        
        expect(roomItems).toHaveLength(expectedItems.length);
        
        // Check that each expected item is present
        for (const expectedItemName of expectedItems) {
          const foundItem = roomItems.find(ri => ri.item.name === expectedItemName);
          expect(foundItem).toBeDefined();
          expect(foundItem?.quantity).toBe(1);
        }
        
        console.log(`✓ ${room.name}: ${roomItems.map(ri => ri.item.name).join(', ')}`);
      }
    }
  });

  test('should handle missing items gracefully during game creation', async () => {
    // Delete one of the seed items to test error handling
    await db.run('DELETE FROM items WHERE name = ?', ['Ancient Key']);
    
    // Create game should still work but report missing items
    const gameId = await createGameWithRooms(db, 'Test Game Missing Items');
    expect(gameId).toBeGreaterThan(0);
    
    // Scholar's Library should have Healing Herbs and Scholar's Spectacles (Ancient Key missing)
    const libraryRoom = await db.get<any>(
      'SELECT id FROM rooms WHERE game_id = ? AND name = ?',
      [gameId, 'Scholar\'s Library']
    );
    
    const libraryItems = await itemService.getRoomItems(libraryRoom.id);
    expect(libraryItems).toHaveLength(2);
    const itemNames = libraryItems.map(ri => ri.item.name);
    expect(itemNames).toContain('Healing Herbs');
    expect(itemNames).toContain('Scholar\'s Spectacles');
  });

  test('should place correct quantities of stackable items', async () => {
    const gameId = await createGameWithRooms(db, 'Test Stackable Items');
    
    // Check Gold Coins are placed with quantity 1
    const cryptRoom = await db.get<any>(
      'SELECT id FROM rooms WHERE game_id = ? AND name = ?',
      [gameId, 'Ancient Crypt Entrance']
    );
    
    const cryptItems = await itemService.getRoomItems(cryptRoom.id);
    const goldCoins = cryptItems.find(ri => ri.item.name === 'Gold Coins');
    
    expect(goldCoins).toBeDefined();
    expect(goldCoins?.quantity).toBe(1);
  });

  test('should not duplicate items when creating multiple games', async () => {
    // Create first game
    const gameId1 = await createGameWithRooms(db, 'Test Game 1');
    
    // Create second game
    const gameId2 = await createGameWithRooms(db, 'Test Game 2');
    
    expect(gameId1).not.toBe(gameId2);
    
    // Both games should have items in their entrance halls
    const entranceRoom1 = await db.get<any>(
      'SELECT id FROM rooms WHERE game_id = ? AND name = ?',
      [gameId1, 'Grand Entrance Hall']
    );
    
    const entranceRoom2 = await db.get<any>(
      'SELECT id FROM rooms WHERE game_id = ? AND name = ?',
      [gameId2, 'Grand Entrance Hall']
    );
    
    const items1 = await itemService.getRoomItems(entranceRoom1.id);
    const items2 = await itemService.getRoomItems(entranceRoom2.id);
    
    expect(items1).toHaveLength(7); // Iron Sword + Chain Mail + Leather Armor + Ancient Stone Pedestal + Blessed Silver Amulet + Cursed Skull + Leather Boots
    expect(items2).toHaveLength(7); // Iron Sword + Chain Mail + Leather Armor + Ancient Stone Pedestal + Blessed Silver Amulet + Cursed Skull + Leather Boots
    
    // Items should be in different room instances
    expect(entranceRoom1.id).not.toBe(entranceRoom2.id);
  });

  test('should maintain thematic item placement', async () => {
    const gameId = await createGameWithRooms(db, 'Test Thematic Placement');
    
    // Check that items make thematic sense for their rooms
    const rooms = await db.all<any>(
      'SELECT id, name FROM rooms WHERE game_id = ?',
      [gameId]
    );
    
    for (const room of rooms) {
      const roomItems = await itemService.getRoomItems(room.id);
      
      switch (room.name) {
        case 'Grand Entrance Hall':
          // Should have weapon (Iron Sword) and fixed scenery (Pedestal)
          expect(roomItems.some(ri => ri.item.type === 'weapon')).toBe(true);
          expect(roomItems.some(ri => ri.item.is_fixed === true)).toBe(true);
          break;
          
        case 'Scholar\'s Library':
          // Should have quest item (Ancient Key) and consumable (Healing Herbs)
          expect(roomItems.some(ri => ri.item.type === 'quest')).toBe(true);
          expect(roomItems.some(ri => ri.item.type === 'consumable')).toBe(true);
          break;
          
        case 'Moonlit Courtyard Garden':
          // Should have consumables (Health Potion, Bread) and magic item (Mysterious Glowing Orb)
          expect(roomItems.some(ri => ri.item.type === 'consumable')).toBe(true);
          expect(roomItems.some(ri => ri.item.name === 'Mysterious Glowing Orb')).toBe(true);
          break;
          
        case 'Winding Tower Stairs':
          // Should have magical weapon (Wooden Staff)
          expect(roomItems.some(ri => ri.item.name === 'Wooden Staff')).toBe(true);
          break;
          
        case 'Ancient Crypt Entrance':
          // Should have armor (Iron Helmet) and treasure (Gold Coins)
          expect(roomItems.some(ri => ri.item.type === 'armor')).toBe(true);
          expect(roomItems.some(ri => ri.item.name === 'Gold Coins')).toBe(true);
          break;
          
        case 'Observatory Steps':
          // Should have equipment (Leather Boots, Leather Armor)
          expect(roomItems.every(ri => ri.item.type === 'armor')).toBe(true);
          break;
      }
    }
  });
});