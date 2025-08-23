import Database from '../../src/utils/database';
import { initializeDatabase } from '../../src/utils/initDb';
import { GameController } from '../../src/gameController';
import { ItemService } from '../../src/services/itemService';
import { GameStateManager } from '../../src/services/gameStateManager';
import { CharacterService } from '../../src/services/characterService';
import { ItemType } from '../../src/types/item';
import { MockTUI } from '../mocks/mockTUI';

describe('Locked Connections E2E', () => {
  let db: Database;
  let gameController: GameController;
  let mockTUI: MockTUI;
  let itemService: ItemService;
  let gameStateManager: GameStateManager;
  let characterService: CharacterService;

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    mockTUI = new MockTUI();
    gameController = new GameController(db, undefined, mockTUI);
    
    itemService = new ItemService(db);
    gameStateManager = new GameStateManager(db);
    characterService = new CharacterService(db);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('Complete Locked Connection Flow', () => {
    let gameId: number;
    let room1Id: number;
    let room2Id: number;
    let characterId: number;
    let keyItemId: number;

    beforeEach(async () => {
      // Create test game
      const gameResult = await db.run(
        'INSERT INTO games (name, created_at, last_played_at) VALUES (?, ?, ?)',
        ['Test Game', new Date().toISOString(), new Date().toISOString()]
      );
      gameId = gameResult.lastID;

      // Create test rooms
      const room1Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Starting Room', 'A simple room with a locked door to the north.']
      );
      const room2Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Treasure Chamber', 'A room filled with ancient treasures.']
      );

      room1Id = room1Result.lastID;
      room2Id = room2Result.lastID;

      // Create locked connection
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name, locked, required_key_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gameId, room1Id, room2Id, 'north', 'through the sealed door to the treasure chamber', 1, 'Ruby Key']
      );

      // Create test character
      const characterResult = await db.run(
        'INSERT INTO characters (game_id, name, type) VALUES (?, ?, ?)',
        [gameId, 'Test Player', 'player']
      );
      characterId = characterResult.lastID;

      // Create game state
      await db.run(
        'INSERT INTO game_state (game_id, current_room_id, character_id) VALUES (?, ?, ?)',
        [gameId, room1Id, characterId]
      );

      // Create the key item
      keyItemId = await itemService.createItem({
        name: 'Ancient Ruby Key',
        description: 'A beautiful key made of ruby and gold',
        type: ItemType.QUEST,
        weight: 0.3,
        value: 0,
        stackable: false,
        max_stack: 1
      });

      // Place key in room 1 initially
      await itemService.placeItemInRoom(room1Id, keyItemId, 1);

      // Start game session
      await gameStateManager.startGameSession(gameId);
    });

    it('should block movement when player lacks the required key', async () => {
      // Clear messages
      mockTUI.clearMessages();

      // Try to go north without the key
      await (gameController as any).processCommand('go north');

      const messages = mockTUI.getMessages();
      expect(messages).toContain('This passage is locked. You need a Ruby Key to pass.');
    });

    it('should allow movement when player has the required key', async () => {
      // Give key to player
      await itemService.addItemToCharacter(characterId, keyItemId, 1);
      
      // Clear messages
      mockTUI.clearMessages();

      // Try to go north with the key
      await (gameController as any).processCommand('go north');

      const messages = mockTUI.getMessages();
      expect(messages.some(msg => msg.message.includes('You unlock the passage with the Ruby Key'))).toBe(true);
      
      // Check that player is now in room 2
      const currentRoomId = gameStateManager.getCurrentRoomId();
      expect(currentRoomId).toBe(room2Id);
    });

    it('should work with partial key name matching', async () => {
      // Create connection that requires partial match
      await db.run(
        'UPDATE connections SET required_key_name = ? WHERE game_id = ? AND direction = ?',
        ['Ruby', gameId, 'north']
      );

      // Give key to player
      await itemService.addItemToCharacter(characterId, keyItemId, 1);
      
      // Clear messages
      mockTUI.clearMessages();

      // Try to go north - should work with partial matching
      await (gameController as any).processCommand('go north');

      const messages = mockTUI.getMessages();
      expect(messages.some(msg => msg.message.includes('You unlock the passage'))).toBe(true);
      
      // Check that player moved successfully
      const currentRoomId = gameStateManager.getCurrentRoomId();
      expect(currentRoomId).toBe(room2Id);
    });

    it('should work with case insensitive matching', async () => {
      // Create connection that requires different case
      await db.run(
        'UPDATE connections SET required_key_name = ? WHERE game_id = ? AND direction = ?',
        ['ruby key', gameId, 'north']
      );

      // Give key to player  
      await itemService.addItemToCharacter(characterId, keyItemId, 1);
      
      // Clear messages
      mockTUI.clearMessages();

      // Try to go north - should work with case insensitive matching
      await (gameController as any).processCommand('go north');

      const messages = mockTUI.getMessages();
      expect(messages.some(msg => msg.message.includes('You unlock the passage'))).toBe(true);
    });

    it('should work with thematic connection names', async () => {
      // Give key to player
      await itemService.addItemToCharacter(characterId, keyItemId, 1);
      
      // Clear messages
      mockTUI.clearMessages();

      // Try to go via thematic name instead of direction
      await (gameController as any).processCommand('go treasure chamber');

      const messages = mockTUI.getMessages();
      expect(messages.some(msg => msg.message.includes('You unlock the passage'))).toBe(true);
      
      // Check that player moved successfully
      const currentRoomId = gameStateManager.getCurrentRoomId();
      expect(currentRoomId).toBe(room2Id);
    });

    it('should preserve key in inventory after use', async () => {
      // Give key to player
      await itemService.addItemToCharacter(characterId, keyItemId, 1);
      
      // Verify key is in inventory before movement
      const inventoryBefore = await itemService.getCharacterInventory(characterId);
      expect(inventoryBefore).toHaveLength(1);
      expect(inventoryBefore[0].item.name).toBe('Ancient Ruby Key');

      // Move through locked door
      await (gameController as any).processCommand('go north');
      
      // Verify key is still in inventory after movement
      const inventoryAfter = await itemService.getCharacterInventory(characterId);
      expect(inventoryAfter).toHaveLength(1);
      expect(inventoryAfter[0].item.name).toBe('Ancient Ruby Key');
    });

    it('should handle multiple locked connections', async () => {
      // Create a second locked door going east
      const room3Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Secret Library', 'A hidden library with ancient texts.']
      );
      const room3Id = room3Result.lastID;

      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name, locked, required_key_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gameId, room1Id, room3Id, 'east', 'through the library entrance', 1, 'Silver Key']
      );

      // Create silver key
      const silverKeyId = await itemService.createItem({
        name: 'Ancient Silver Key',
        description: 'A tarnished silver key',
        type: ItemType.QUEST,
        weight: 0.2,
        value: 0,
        stackable: false,
        max_stack: 1
      });

      // Give player ruby key but not silver key
      await itemService.addItemToCharacter(characterId, keyItemId, 1);
      
      // Clear messages
      mockTUI.clearMessages();

      // Should be able to go north with ruby key
      await (gameController as any).processCommand('go north');
      let messages = mockTUI.getMessages();
      expect(messages.some(msg => msg.message.includes('You unlock the passage'))).toBe(true);

      // Go back to room 1
      await gameStateManager.moveToRoom(room1Id);
      mockTUI.clearMessages();

      // Should not be able to go east without silver key
      await (gameController as any).processCommand('go east');
      messages = mockTUI.getMessages();
      expect(messages).toContain('This passage is locked. You need a Silver Key to pass.');

      // Give player silver key
      await itemService.addItemToCharacter(characterId, silverKeyId, 1);
      mockTUI.clearMessages();

      // Now should be able to go east
      await (gameController as any).processCommand('go east');
      messages = mockTUI.getMessages();
      expect(messages.some(msg => msg.message.includes('You unlock the passage with the Silver Key'))).toBe(true);
    });
  });
});