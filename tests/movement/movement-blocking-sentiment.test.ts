import Database from '../../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import { GameController } from '../../src/gameController';
import { CharacterService } from '../../src/services/characterService';
import { CharacterSentiment, CharacterType } from '../../src/types/character';
import * as readline from 'readline';

describe('Movement Blocking with Sentiment System', () => {
  let db: Database;
  let controller: GameController;
  let characterService: CharacterService;
  let mockRl: readline.Interface;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let gameId: number;
  let roomId1: number;
  let roomId2: number;
  let outputSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Ensure we use legacy services
    process.env.USE_PRISMA = 'false';
    process.env.NODE_ENV = 'test';
    
    // Silence console output
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Create in-memory database for testing
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);

    // Create a unique test game
    const uniqueGameName = `Movement Blocking Test ${Date.now()}-${Math.random()}`;
    gameId = await createGameWithRooms(db, uniqueGameName);

    // Get existing rooms and connections from the generated game
    const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ? ORDER BY id', [gameId]);
    const connections = await db.all('SELECT * FROM connections WHERE game_id = ? ORDER BY id', [gameId]);
    
    roomId1 = rooms[0].id; // Starting room
    
    // Use the first existing connection to determine destination room
    if (connections.length > 0) {
      roomId2 = connections[0].to_room_id;
    } else {
      // Fallback: Create our own room and connection if none exist
      const roomResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'North Chamber', 'A chamber to the north']
      );
      roomId2 = roomResult.lastID as number;

      // Create connection between rooms
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, roomId1, roomId2, 'north', 'north']
      );
    }

    // Create mock readline interface
    mockRl = {
      question: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
      setMaxListeners: jest.fn(),
      getMaxListeners: jest.fn(),
      listeners: jest.fn(),
      rawListeners: jest.fn(),
      emit: jest.fn(),
      listenerCount: jest.fn(),
      prependListener: jest.fn(),
      prependOnceListener: jest.fn(),
      eventNames: jest.fn(),
      setPrompt: jest.fn(),
      prompt: jest.fn()
    } as any;

    // Create GameController in test mode
    controller = new GameController(db);
    // Replace the readline interface
    (controller as any).rl = mockRl;
    
    characterService = new CharacterService(db);
    
    // Mock the TUI display method to capture output
    outputSpy = jest.spyOn((controller as any).tui, 'display').mockImplementation((...args: unknown[]) => {
      // Store the message for testing
      (controller as any).lastDisplayMessage = args[0];
    });

    // Start game session
    const gameStateManager = (controller as any).gameStateManager;
    await gameStateManager.startGameSession(gameId);
    await gameStateManager.moveToRoom(roomId1);
  });

  afterEach(async () => {
    if (controller) {
      await controller.cleanup();
      controller.removeEventListeners();
    }
    if (db) {
      await db.close();
    }
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    outputSpy?.mockRestore();
  });

  describe('Phase 6: Movement Blocking with Sentiment', () => {
    it('should block movement when hostile character is present', async () => {
      // Create hostile character in current room
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Hostile Guardian',
        description: 'A menacing guardian blocking the way',
        type: CharacterType.ENEMY,
        current_room_id: roomId1,
        sentiment: CharacterSentiment.HOSTILE
      });

      // Try to move north
      await (controller as any).processCommand('go north');

      // Movement should be blocked
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toContain('Hostile Guardian blocks your path');
      expect(lastMessage).toContain('hostile character prevents movement');

      // Verify player is still in first room
      const gameStateManager = (controller as any).gameStateManager;
      const currentRoomId = gameStateManager.getCurrentRoomId();
      expect(currentRoomId).toBe(roomId1);
    });

    it('should block movement when aggressive character is present', async () => {
      // Create aggressive character in current room
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Aggressive Bandit',
        description: 'A bandit ready to fight',
        type: CharacterType.ENEMY,
        current_room_id: roomId1,
        sentiment: CharacterSentiment.AGGRESSIVE
      });

      // Try to move north
      await (controller as any).processCommand('go north');

      // Movement should be blocked
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toContain('Aggressive Bandit blocks your path');
      expect(lastMessage).toContain('aggressive character prevents movement');

      // Verify player is still in first room
      const gameStateManager = (controller as any).gameStateManager;
      const currentRoomId = gameStateManager.getCurrentRoomId();
      expect(currentRoomId).toBe(roomId1);
    });

    it('should allow movement when indifferent character is present', async () => {
      // Create indifferent character in current room
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Neutral Guard',
        description: 'A guard who ignores you',
        type: CharacterType.NPC,
        current_room_id: roomId1,
        sentiment: CharacterSentiment.INDIFFERENT
      });

      // Try to move north
      await (controller as any).processCommand('go north');

      // Movement should succeed - check if player moved to room 2
      const gameStateManager = (controller as any).gameStateManager;
      const currentRoomId = gameStateManager.getCurrentRoomId();
      
      
      expect(currentRoomId).toBe(roomId2);
    });

    it('should allow movement when friendly character is present', async () => {
      // Create friendly character in current room
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Friendly Merchant',
        description: 'A helpful merchant',
        type: CharacterType.NPC,
        current_room_id: roomId1,
        sentiment: CharacterSentiment.FRIENDLY
      });

      // Try to move north
      await (controller as any).processCommand('go north');

      // Movement should succeed
      const gameStateManager = (controller as any).gameStateManager;
      const currentRoomId = gameStateManager.getCurrentRoomId();
      expect(currentRoomId).toBe(roomId2);
    });

    it('should allow movement when allied character is present', async () => {
      // Create allied character in current room
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Allied Warrior',
        description: 'A warrior fighting alongside you',
        type: CharacterType.NPC,
        current_room_id: roomId1,
        sentiment: CharacterSentiment.ALLIED
      });

      // Try to move north
      await (controller as any).processCommand('go north');

      // Movement should succeed
      const gameStateManager = (controller as any).gameStateManager;
      const currentRoomId = gameStateManager.getCurrentRoomId();
      expect(currentRoomId).toBe(roomId2);
    });

    it('should block movement when multiple hostile characters are present', async () => {
      // Create multiple hostile characters
      await characterService.createCharacter({
        game_id: gameId,
        name: 'Hostile Goblin',
        type: CharacterType.ENEMY,
        current_room_id: roomId1,
        sentiment: CharacterSentiment.HOSTILE
      });

      await characterService.createCharacter({
        game_id: gameId,
        name: 'Aggressive Orc',
        type: CharacterType.ENEMY,
        current_room_id: roomId1,
        sentiment: CharacterSentiment.AGGRESSIVE
      });

      // Try to move north
      await (controller as any).processCommand('go north');

      // Movement should be blocked
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toContain('hostile characters prevent movement');

      // Verify player is still in first room
      const gameStateManager = (controller as any).gameStateManager;
      const currentRoomId = gameStateManager.getCurrentRoomId();
      expect(currentRoomId).toBe(roomId1);
    });

    it('should allow movement when hostile character dies', async () => {
      // Create hostile character
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Dying Enemy',
        type: CharacterType.ENEMY,
        current_room_id: roomId1,
        sentiment: CharacterSentiment.HOSTILE
      });

      // Kill the character
      await characterService.setCharacterDead(characterId);

      // Try to move north
      await (controller as any).processCommand('go north');

      // Movement should succeed since hostile character is dead
      const gameStateManager = (controller as any).gameStateManager;
      const currentRoomId = gameStateManager.getCurrentRoomId();
      expect(currentRoomId).toBe(roomId2);
    });

    it('should use sentiment system over legacy is_hostile when they conflict', async () => {
      // Create character with conflicting sentiment and is_hostile values
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Conflicted Character',
        type: CharacterType.NPC,
        current_room_id: roomId1,
        sentiment: CharacterSentiment.FRIENDLY, // Should allow movement
        is_hostile: true // Legacy field says hostile
      });

      // Try to move north
      await (controller as any).processCommand('go north');

      // Movement should succeed because sentiment (friendly) takes precedence
      const gameStateManager = (controller as any).gameStateManager;
      const currentRoomId = gameStateManager.getCurrentRoomId();
      expect(currentRoomId).toBe(roomId2);
    });

    it('should provide appropriate blocking message based on character sentiment', async () => {
      // Test hostile message
      const hostileId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Enraged Beast',
        type: CharacterType.ENEMY,
        current_room_id: roomId1,
        sentiment: CharacterSentiment.HOSTILE
      });

      await (controller as any).processCommand('go north');
      let message = (controller as any).lastDisplayMessage;
      expect(message).toContain('Enraged Beast blocks your path');
      expect(message).toContain('hostile');

      // Reset position and remove character
      const gameStateManager = (controller as any).gameStateManager;
      await gameStateManager.moveToRoom(roomId1);
      await characterService.setCharacterDead(hostileId);

      // Test aggressive message
      const aggressiveId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Angry Guardian',
        type: CharacterType.ENEMY,
        current_room_id: roomId1,
        sentiment: CharacterSentiment.AGGRESSIVE
      });

      await (controller as any).processCommand('go north');
      message = (controller as any).lastDisplayMessage;
      expect(message).toContain('Angry Guardian blocks your path');
      expect(message).toContain('aggressive');
    });

    it('should handle mixed sentiment characters correctly', async () => {
      // Create a mix of blocking and non-blocking characters
      await characterService.createCharacter({
        game_id: gameId,
        name: 'Friendly Helper',
        type: CharacterType.NPC,
        current_room_id: roomId1,
        sentiment: CharacterSentiment.FRIENDLY
      });

      await characterService.createCharacter({
        game_id: gameId,
        name: 'Hostile Blocker',
        type: CharacterType.ENEMY,
        current_room_id: roomId1,
        sentiment: CharacterSentiment.HOSTILE
      });

      // Movement should be blocked due to hostile character
      await (controller as any).processCommand('go north');

      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toContain('Hostile Blocker blocks your path');

      // Verify player is still in first room
      const gameStateManager = (controller as any).gameStateManager;
      const currentRoomId = gameStateManager.getCurrentRoomId();
      expect(currentRoomId).toBe(roomId1);
    });
  });
});