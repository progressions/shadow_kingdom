/**
 * Character Individual Dialogue Responses Tests
 * 
 * Tests for the enhanced dialogue system that supports character-specific
 * dialogue responses, replacing the universal "Lovely day." response.
 */

import Database from '../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';
import { GameController } from '../src/gameController';
// Note: SessionInterface is not exported, will test through command execution
import { CharacterService } from '../src/services/characterService';
import { Character, CharacterType } from '../src/types/character';
import * as readline from 'readline';

describe('Character Individual Dialogue Responses', () => {
  let db: Database;
  let controller: GameController;
  // SessionInterface not exported, testing through command execution
  let characterService: CharacterService;
  let mockRl: readline.Interface;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let gameId: number;
  let playerRoomId: number;
  let outputSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Ensure we use legacy services, not Prisma
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
    const uniqueGameName = `Individual Dialogue Test ${Date.now()}-${Math.random()}`;
    gameId = await createGameWithRooms(db, uniqueGameName);

    // Get the starting room ID
    const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
    playerRoomId = rooms[0].id;

    // Initialize services
    characterService = new CharacterService(db);

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
    (controller as any).rl = mockRl;
    
    // Mock the TUI display method to capture output
    outputSpy = jest.spyOn((controller as any).tui, 'display').mockImplementation((...args: unknown[]) => {
      (controller as any).lastDisplayMessage = args[0];
    });

    // Start game session
    const gameStateManager = (controller as any).gameStateManager;
    await gameStateManager.startGameSession(gameId);
    await gameStateManager.moveToRoom(playerRoomId);
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

  describe('Custom Dialogue Responses - GameController', () => {
    test('should use custom dialogue response when available', async () => {
      const customResponse = "Greetings, traveler! Welcome to our humble tavern.";
      
      // Create character with custom dialogue
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Friendly Innkeeper',
        description: 'A warm-hearted innkeeper with a welcoming smile',
        type: CharacterType.NPC,
        current_room_id: playerRoomId,
        dialogue_response: customResponse
      });

      // Talk to the character
      await (controller as any).processCommand('talk Friendly Innkeeper');

      // Verify custom response is used
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toBe(`Friendly Innkeeper says: "${customResponse}"`);
    });

    test('should fall back to default when dialogue_response is null', async () => {
      // Create character without custom dialogue
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Silent Guardian',
        description: 'A stoic guardian who rarely speaks',
        type: CharacterType.NPC,
        current_room_id: playerRoomId,
        dialogue_response: undefined
      });

      // Talk to the character
      await (controller as any).processCommand('talk Silent Guardian');

      // Verify fallback response is used
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toBe('Silent Guardian says: "Lovely day."');
    });

    test('should fall back to default when dialogue_response is undefined', async () => {
      // Create character without dialogue_response field
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Generic Merchant',
        description: 'A typical merchant with no special dialogue',
        type: CharacterType.NPC,
        current_room_id: playerRoomId
        // Note: no dialogue_response provided
      });

      // Talk to the character
      await (controller as any).processCommand('talk Generic Merchant');

      // Verify fallback response is used
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toBe('Generic Merchant says: "Lovely day."');
    });

    test('should handle empty string dialogue response', async () => {
      // Create character with empty dialogue response
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Speechless Monk',
        description: 'A monk who has taken a vow of near-silence',
        type: CharacterType.NPC,
        current_room_id: playerRoomId,
        dialogue_response: ''
      });

      // Talk to the character
      await (controller as any).processCommand('talk Speechless Monk');

      // Verify fallback response is used (empty string should fall back)
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toBe('Speechless Monk says: "Lovely day."');
    });
  });


  describe('Seeded Characters with Custom Dialogue', () => {
    test('should verify Ancient Guardian has custom dialogue', async () => {
      // Find the Ancient Guardian that should exist in starter rooms
      const ancientGuardian = await db.get<Character>(
        'SELECT * FROM characters WHERE name = ? AND game_id = ?',
        ['Ancient Guardian', gameId]
      );

      expect(ancientGuardian).toBeTruthy();
      expect(ancientGuardian?.dialogue_response).toBe('These halls have stood for centuries, and I shall guard them for centuries more.');
    });

    test('should verify Scholar Wraith has custom dialogue', async () => {
      // Find the Scholar Wraith that should exist in starter rooms
      const scholarWraith = await db.get<Character>(
        'SELECT * FROM characters WHERE name = ? AND game_id = ?',
        ['Scholar Wraith', gameId]
      );

      expect(scholarWraith).toBeTruthy();
      expect(scholarWraith?.dialogue_response).toBe('So many books, so little time... even in death.');
    });

    test('should verify Garden Spirit has custom dialogue', async () => {
      // Find the Garden Spirit that should exist in starter rooms
      const gardenSpirit = await db.get<Character>(
        'SELECT * FROM characters WHERE name = ? AND game_id = ?',
        ['Garden Spirit', gameId]
      );

      expect(gardenSpirit).toBeTruthy();
      expect(gardenSpirit?.dialogue_response).toBe('The flowers whisper secrets of ages past, if you know how to listen.');
    });

    test('should actually talk to seeded characters and get custom responses', async () => {
      // Test talking to Ancient Guardian through GameController
      const gameStateManager = (controller as any).gameStateManager;
      
      // Find the room with Ancient Guardian
      const entranceRoom = await db.get(
        'SELECT r.* FROM rooms r JOIN characters c ON r.id = c.current_room_id WHERE c.name = ? AND r.game_id = ?',
        ['Ancient Guardian', gameId]
      );
      
      if (entranceRoom) {
        // Move to the room with Ancient Guardian
        await gameStateManager.moveToRoom(entranceRoom.id);
        
        // Talk to Ancient Guardian
        await (controller as any).processCommand('talk Ancient Guardian');
        
        // Verify custom response
        const lastMessage = (controller as any).lastDisplayMessage;
        expect(lastMessage).toBe('Ancient Guardian says: "These halls have stood for centuries, and I shall guard them for centuries more."');
      }
    });
  });

  describe('Character Type Consistency', () => {
    test('should work with NPCs with custom dialogue', async () => {
      const customResponse = "Peace be upon you, traveler.";
      
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Peaceful Cleric',
        description: 'A serene cleric devoted to healing',
        type: CharacterType.NPC,
        current_room_id: playerRoomId,
        dialogue_response: customResponse
      });

      await (controller as any).processCommand('talk Peaceful Cleric');
      
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toBe(`Peaceful Cleric says: "${customResponse}"`);
    });

    test('should work with enemies with custom dialogue', async () => {
      const customResponse = "You dare disturb my eternal rest!";
      
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Angry Wraith',
        description: 'A vengeful spirit filled with rage',
        type: CharacterType.ENEMY,
        current_room_id: playerRoomId,
        dialogue_response: customResponse
      });

      await (controller as any).processCommand('talk Angry Wraith');
      
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toBe(`Angry Wraith says: "${customResponse}"`);
    });

    test('should work with player characters with custom dialogue', async () => {
      const customResponse = "Hello there, fellow adventurer!";
      
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Fellow Explorer',
        description: 'Another adventurer on a similar quest',
        type: CharacterType.PLAYER,
        current_room_id: playerRoomId,
        dialogue_response: customResponse
      });

      await (controller as any).processCommand('talk Fellow Explorer');
      
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toBe(`Fellow Explorer says: "${customResponse}"`);
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain compatibility with existing characters', async () => {
      // Simulate an "old" character inserted directly via SQL without dialogue_response
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, strength, dexterity, intelligence, constitution, wisdom, charisma) VALUES (?, ?, ?, ?, 10, 10, 10, 10, 10, 10)',
        [gameId, 'Legacy Character', CharacterType.NPC, playerRoomId]
      );

      await (controller as any).processCommand('talk Legacy Character');
      
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toBe('Legacy Character says: "Lovely day."');
    });

    test('should handle database migration correctly', async () => {
      // Verify the dialogue_response column exists and has correct default
      const tableInfo = await db.all(`PRAGMA table_info('characters')`);
      const dialogueColumn = tableInfo.find((col: any) => col.name === 'dialogue_response');
      
      expect(dialogueColumn).toBeTruthy();
      expect(dialogueColumn.dflt_value).toBe("'Lovely day.'");
    });
  });

  describe('Special Characters and Formatting', () => {
    test('should handle dialogue with quotes and special characters', async () => {
      const customResponse = `"Welcome!" she says with a smile. It's a lovely day, isn't it?`;
      
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Chatty Hostess',
        description: 'An extremely talkative inn hostess',
        type: CharacterType.NPC,
        current_room_id: playerRoomId,
        dialogue_response: customResponse
      });

      await (controller as any).processCommand('talk Chatty Hostess');
      
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toBe(`Chatty Hostess says: "${customResponse}"`);
    });

    test('should handle very long dialogue responses', async () => {
      const longResponse = "This is a very long response that goes on and on and on, telling a complete story about the history of this place, the people who lived here, the adventures that took place, and all manner of interesting details that a character might share with a patient listener.";
      
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Verbose Historian',
        description: 'A historian who loves to tell long stories',
        type: CharacterType.NPC,
        current_room_id: playerRoomId,
        dialogue_response: longResponse
      });

      await (controller as any).processCommand('talk Verbose Historian');
      
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toBe(`Verbose Historian says: "${longResponse}"`);
    });
  });
});