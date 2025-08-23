import Database from '../../src/utils/database';
import { initializeDatabase } from '../../src/utils/initDb';
import { ItemService } from '../../src/services/itemService';
import { GameStateManager } from '../../src/services/gameStateManager';
import { CharacterService } from '../../src/services/characterService';
import { ItemType } from '../../src/types/item';

describe('Locked Connections', () => {
  let db: Database;
  let itemService: ItemService;
  let gameStateManager: GameStateManager;
  let characterService: CharacterService;

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    itemService = new ItemService(db);
    gameStateManager = new GameStateManager(db);
    characterService = new CharacterService(db);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('Database Schema', () => {
    it('should have locked and required_key_name columns in connections table', async () => {
      const tableInfo = await db.all("PRAGMA table_info('connections')");
      const columnNames = tableInfo.map((col: any) => col.name);
      
      expect(columnNames).toContain('locked');
      expect(columnNames).toContain('required_key_name');
    });

    it('should set default values for locked connections', async () => {
      // Create a test game
      const gameResult = await db.run(
        'INSERT INTO games (name, created_at, last_played_at) VALUES (?, ?, ?)',
        ['Test Game', new Date().toISOString(), new Date().toISOString()]
      );
      const gameId = gameResult.lastID;

      // Create test rooms
      const room1Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Room 1', 'First room']
      );
      const room2Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Room 2', 'Second room']
      );

      // Create connection without specifying locked fields (should default to FALSE and NULL)
      const connectionResult = await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, room1Result.lastID, room2Result.lastID, 'north', 'to the second room']
      );

      const connection = await db.get(
        'SELECT * FROM connections WHERE id = ?',
        [connectionResult.lastID]
      );

      expect(connection.locked).toBe(0); // SQLite stores FALSE as 0
      expect(connection.required_key_name).toBeNull();
    });
  });

  describe('ItemService.hasItemByPartialName', () => {
    let gameId: number;
    let characterId: number;
    let keyItemId: number;

    beforeEach(async () => {
      // Create test game
      const gameResult = await db.run(
        'INSERT INTO games (name, created_at, last_played_at) VALUES (?, ?, ?)',
        ['Test Game', new Date().toISOString(), new Date().toISOString()]
      );
      gameId = gameResult.lastID;

      // Create test character
      const characterResult = await db.run(
        'INSERT INTO characters (game_id, name, type) VALUES (?, ?, ?)',
        [gameId, 'Test Player', 'player']
      );
      characterId = characterResult.lastID;

      // Create a key item
      keyItemId = await itemService.createItem({
        name: 'Ancient Iron Key',
        description: 'An old iron key with mysterious engravings',
        type: ItemType.QUEST,
        weight: 0.5,
        value: 0,
        stackable: false,
        max_stack: 1
      });
    });

    it('should return false when character does not have the key', async () => {
      const hasKey = await itemService.hasItemByPartialName(characterId, 'Iron Key');
      expect(hasKey).toBe(false);
    });

    it('should return true when character has the exact key', async () => {
      // Add key to character inventory
      await itemService.addItemToCharacter(characterId, keyItemId, 1);
      
      const hasKey = await itemService.hasItemByPartialName(characterId, 'Ancient Iron Key');
      expect(hasKey).toBe(true);
    });

    it('should return true with partial name matching', async () => {
      // Add key to character inventory
      await itemService.addItemToCharacter(characterId, keyItemId, 1);
      
      const hasKey = await itemService.hasItemByPartialName(characterId, 'Iron Key');
      expect(hasKey).toBe(true);
    });

    it('should be case insensitive', async () => {
      // Add key to character inventory
      await itemService.addItemToCharacter(characterId, keyItemId, 1);
      
      const hasKey = await itemService.hasItemByPartialName(characterId, 'iron key');
      expect(hasKey).toBe(true);
    });

    it('should work with single word matches', async () => {
      // Add key to character inventory
      await itemService.addItemToCharacter(characterId, keyItemId, 1);
      
      const hasKey = await itemService.hasItemByPartialName(characterId, 'Ancient');
      expect(hasKey).toBe(true);
    });
  });

  describe('Connection Creation', () => {
    let gameId: number;
    let room1Id: number;
    let room2Id: number;

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
        [gameId, 'Room 1', 'First room']
      );
      const room2Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Room 2', 'Second room']
      );

      room1Id = room1Result.lastID;
      room2Id = room2Result.lastID;
    });

    it('should create unlocked connections by default', async () => {
      const connectionResult = await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, room1Id, room2Id, 'north', 'to the second room']
      );

      const connection = await db.get(
        'SELECT * FROM connections WHERE id = ?',
        [connectionResult.lastID]
      );

      expect(connection.locked).toBe(0);
      expect(connection.required_key_name).toBeNull();
    });

    it('should create locked connections with required keys', async () => {
      const connectionResult = await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name, locked, required_key_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gameId, room1Id, room2Id, 'north', 'to the locked chamber', 1, 'Rusty Key']
      );

      const connection = await db.get(
        'SELECT * FROM connections WHERE id = ?',
        [connectionResult.lastID]
      );

      expect(connection.locked).toBe(1);
      expect(connection.required_key_name).toBe('Rusty Key');
    });
  });

  describe('GameStateManager Connection Retrieval', () => {
    let gameId: number;
    let room1Id: number;
    let room2Id: number;
    let connectionId: number;

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
        [gameId, 'Room 1', 'First room']
      );
      const room2Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Room 2', 'Second room']
      );

      room1Id = room1Result.lastID;
      room2Id = room2Result.lastID;

      // Create locked connection
      const connectionResult = await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name, locked, required_key_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gameId, room1Id, room2Id, 'north', 'to the locked chamber', 1, 'Golden Key']
      );
      connectionId = connectionResult.lastID;

      // Create player character and game state
      const characterResult = await db.run(
        'INSERT INTO characters (game_id, name, type) VALUES (?, ?, ?)',
        [gameId, 'Test Player', 'player']
      );
      
      await db.run(
        'INSERT INTO game_state (game_id, current_room_id, character_id) VALUES (?, ?, ?)',
        [gameId, room1Id, characterResult.lastID]
      );

      // Start game session
      await gameStateManager.startGameSession(gameId);
    });

    it('should retrieve locked connection properties', async () => {
      const connection = await gameStateManager.findConnection('north');
      
      expect(connection).toBeDefined();
      expect(connection!.locked).toBe(1); // SQLite stores boolean as integer
      expect(connection!.required_key_name).toBe('Golden Key');
    });

    it('should retrieve connection by thematic name', async () => {
      const connection = await gameStateManager.findConnection('to the locked chamber');
      
      expect(connection).toBeDefined();
      expect(connection!.locked).toBe(1); // SQLite stores boolean as integer
      expect(connection!.required_key_name).toBe('Golden Key');
    });
  });
});