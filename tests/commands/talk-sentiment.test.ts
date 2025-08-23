/**
 * Talk Command Sentiment Integration Tests - Phase 7
 * 
 * Tests the talk command integration with the character sentiment system.
 * Verifies that character responses reflect their current sentiment toward
 * the player, both through sentiment-specific fallback responses and AI
 * prompt inclusion for dynamic dialogue generation.
 */

import Database from '../../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import { GameController } from '../../src/gameController';
import { CharacterService } from '../../src/services/characterService';
import { CharacterSentiment, CharacterType } from '../../src/types/character';
import * as readline from 'readline';

describe('Talk Command Sentiment Integration - Phase 7', () => {
  let db: Database;
  let controller: GameController;
  let characterService: CharacterService;
  let mockRl: readline.Interface;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let gameId: number;
  let playerRoomId: number;
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
    const uniqueGameName = `Talk Sentiment Test ${Date.now()}-${Math.random()}`;
    gameId = await createGameWithRooms(db, uniqueGameName);

    // Get the starting room ID
    const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
    playerRoomId = rooms[0].id;

    // Mock Math.random to make enemy attacks always miss (don't interfere with talk tests)
    jest.spyOn(Math, 'random').mockReturnValue(0.6); // > 0.5 = miss
    
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
    jest.restoreAllMocks(); // Restore Math.random and other mocks
  });

  describe('Sentiment-Based Dialogue Responses', () => {
    it('should use hostile response for hostile characters', async () => {
      // Create hostile character (NPC so it doesn't attack during talk tests)
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Angry Goblin',
        description: 'A hostile goblin',
        type: CharacterType.NPC,
        current_room_id: playerRoomId,
        sentiment: CharacterSentiment.HOSTILE
      });

      // Talk to the character
      await (controller as any).processCommand('talk angry goblin');

      // Check response reflects hostile sentiment
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toMatch(/Angry Goblin says:/);
      expect(lastMessage).toMatch(/(growls|snarls|glares|threatens|hisses|get away|destroy|menacingly)/i);
    });

    it('should use aggressive response for aggressive characters', async () => {
      // Create aggressive character
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Surly Bandit',
        description: 'An aggressive bandit',
        type: CharacterType.NPC,
        current_room_id: playerRoomId,
        sentiment: CharacterSentiment.AGGRESSIVE
      });

      // Talk to the character
      await (controller as any).processCommand('talk surly bandit');

      // Check response reflects aggressive sentiment
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toMatch(/Surly Bandit says:/);
      expect(lastMessage).toMatch(/(what do you want|get lost|leave me alone|back off|scowls)/i);
    });

    it('should use indifferent response for indifferent characters', async () => {
      // Create indifferent character
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Neutral Guard',
        description: 'A guard who ignores you',
        type: CharacterType.NPC,
        current_room_id: playerRoomId,
        sentiment: CharacterSentiment.INDIFFERENT
      });

      // Talk to the character
      await (controller as any).processCommand('talk neutral guard');

      // Check response reflects indifferent sentiment
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toMatch(/Neutral Guard says:/);
      expect(lastMessage).toMatch(/(hmm|yes|perhaps|i suppose|whatever)/i);
    });

    it('should use friendly response for friendly characters', async () => {
      // Create friendly character
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Helpful Merchant',
        description: 'A friendly merchant',
        type: CharacterType.NPC,
        current_room_id: playerRoomId,
        sentiment: CharacterSentiment.FRIENDLY
      });

      // Talk to the character
      await (controller as any).processCommand('talk helpful merchant');

      // Check response reflects friendly sentiment
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toMatch(/Helpful Merchant says:/);
      expect(lastMessage).toMatch(/(hello|greetings|good day|welcome|pleasure)/i);
    });

    it('should use allied response for allied characters', async () => {
      // Create allied character
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Loyal Companion',
        description: 'A loyal companion',
        type: CharacterType.NPC,
        current_room_id: playerRoomId,
        sentiment: CharacterSentiment.ALLIED
      });

      // Talk to the character
      await (controller as any).processCommand('talk loyal companion');

      // Check response reflects allied sentiment
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toMatch(/Loyal Companion says:/);
      expect(lastMessage).toMatch(/(my friend|at your service|how can I help|how can I assist|together we|what do you need)/i);
    });
  });

  describe('Fallback Response System', () => {
    it('should prefer character dialogue_response over sentiment fallback', async () => {
      // Create character with custom dialogue response
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Custom Character',
        description: 'A character with custom dialogue',
        type: CharacterType.NPC,
        current_room_id: playerRoomId,
        sentiment: CharacterSentiment.HOSTILE,
        dialogue_response: 'I have a custom message that overrides sentiment.'
      });

      // Talk to the character
      await (controller as any).processCommand('talk custom character');

      // Check that custom response is used instead of hostile sentiment fallback
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toContain('I have a custom message that overrides sentiment.');
    });

    it('should use sentiment fallback when dialogue_response is null', async () => {
      // Create character without dialogue response
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Basic Character',
        description: 'A character without custom dialogue',
        type: CharacterType.NPC,
        current_room_id: playerRoomId,
        sentiment: CharacterSentiment.FRIENDLY,
      });

      // Talk to the character
      await (controller as any).processCommand('talk basic character');

      // Check that friendly sentiment fallback is used
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toMatch(/Basic Character says:/);
      expect(lastMessage).toMatch(/(hello|greetings|good day|welcome|pleasure)/i);
    });

    it('should use sentiment fallback when dialogue_response is empty', async () => {
      // Create character with empty dialogue response
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Empty Character',
        description: 'A character with empty dialogue',
        type: CharacterType.NPC,
        current_room_id: playerRoomId,
        sentiment: CharacterSentiment.AGGRESSIVE,
        dialogue_response: ''
      });

      // Talk to the character
      await (controller as any).processCommand('talk empty character');

      // Check that aggressive sentiment fallback is used
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toMatch(/Empty Character says:/);
      expect(lastMessage).toMatch(/(what do you want|get lost|leave me alone|back off|scowls)/i);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle characters without sentiment gracefully', async () => {
      // Create character without sentiment (should default to indifferent)
      await db.run(`
        INSERT INTO characters (
          game_id, name, description, type, current_room_id,
          strength, dexterity, intelligence, constitution, wisdom, charisma,
          max_health, current_health, is_dead, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        gameId, 'No Sentiment Character', 'A character without sentiment', CharacterType.NPC, playerRoomId,
        10, 10, 10, 10, 10, 10, 10, 10, false, new Date().toISOString()
      ]);

      // Talk to the character
      await (controller as any).processCommand('talk no sentiment character');

      // Should not crash and should provide some response
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toMatch(/No Sentiment Character says:/);
      expect(lastMessage).toBeDefined();
    });

    it('should handle dead characters appropriately', async () => {
      // Create character and then kill it
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Dead Character',
        description: 'A dead character',
        type: CharacterType.NPC,
        current_room_id: playerRoomId,
        sentiment: CharacterSentiment.INDIFFERENT
      });

      // Kill the character
      await characterService.setCharacterDead(characterId);

      // Try to talk to dead character
      await (controller as any).processCommand('talk dead character');

      // Should indicate character is dead or unresponsive
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toMatch(/(dead|lifeless|does not respond|cannot speak)/i);
    });

    it('should handle nonexistent character gracefully', async () => {
      // Try to talk to nonexistent character
      await (controller as any).processCommand('talk nonexistent character');

      // Should show appropriate error message
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toMatch(/no one named.*nonexistent character.*here/i);
    });
  });

  describe('Sentiment Change Effects on Dialogue', () => {
    it('should update responses when character sentiment changes', async () => {
      // Create initially friendly character
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Changing Character',
        description: 'A character whose sentiment changes',
        type: CharacterType.NPC,
        current_room_id: playerRoomId,
        sentiment: CharacterSentiment.FRIENDLY
      });

      // Talk to friendly character
      await (controller as any).processCommand('talk changing character');
      const friendlyMessage = (controller as any).lastDisplayMessage;
      expect(friendlyMessage).toMatch(/(hello|greetings|good day|welcome|pleasure)/i);

      // Change sentiment to hostile
      await characterService.setSentiment(characterId, CharacterSentiment.HOSTILE);

      // Talk again - should now be hostile
      await (controller as any).processCommand('talk changing character');
      const hostileMessage = (controller as any).lastDisplayMessage;
      expect(hostileMessage).toMatch(/(growls|snarls|glares|threatens|hisses|get away|destroy|menacingly)/i);
    });
  });
});