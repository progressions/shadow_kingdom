/**
 * Give Command Sentiment Improvement Tests - Phase 11
 * 
 * Tests for sentiment improvement when giving items to NPCs
 */

import Database from '../../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import { GameController } from '../../src/gameController';
import { CharacterSentiment } from '../../src/types/character';
import { CharacterService } from '../../src/services/characterService';
import * as readline from 'readline';

describe('Give Command Sentiment Improvement - Phase 11', () => {
  let db: Database;
  let controller: GameController;
  let characterService: CharacterService;
  let mockRl: readline.Interface;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let gameId: number;
  let playerRoomId: number;
  let outputSpy: jest.SpyInstance;
  let outputMessages: string[] = [];

  beforeEach(async () => {
    // Ensure we use legacy services, not Prisma
    process.env.USE_PRISMA = 'false';
    process.env.NODE_ENV = 'test';
    process.env.AI_MOCK_MODE = 'true'; // Disable AI generation
    
    // Silence console output
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Create in-memory database for testing
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);

    // Create services
    characterService = new CharacterService(db);

    // Create a unique test game
    const uniqueGameName = `Give Sentiment Test ${Date.now()}-${Math.random()}`;
    gameId = await createGameWithRooms(db, uniqueGameName);

    // Get the starting room ID
    const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
    playerRoomId = rooms[0].id;

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
    
    // Mock the TUI display method to capture output
    outputMessages = [];
    outputSpy = jest.spyOn((controller as any).tui, 'display').mockImplementation((...args: unknown[]) => {
      const message = args[0] as string;
      (controller as any).lastDisplayMessage = message;
      outputMessages.push(message);
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

  describe('Basic sentiment improvement', () => {
    it('should improve NPC sentiment by one step when giving an item', async () => {
      // Create an indifferent NPC
      const npcId = await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, sentiment, is_dead) VALUES (?, ?, ?, ?, ?, ?)',
        [gameId, 'Friendly Merchant', 'npc', playerRoomId, CharacterSentiment.INDIFFERENT, 0]
      );

      // Add an item to player inventory
      const item = await db.run(
        'INSERT INTO items (name, description, type, weight, stackable, max_stack) VALUES (?, ?, ?, ?, ?, ?)',
        ['Gold Coin', 'A shiny gold coin', 'misc', 1, true, 100]
      );
      await db.run(
        'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
        [gameId, item.lastID, 1]
      );

      // Verify initial sentiment
      const initialSentiment = await characterService.getSentiment(npcId.lastID);
      expect(initialSentiment).toBe(CharacterSentiment.INDIFFERENT);

      // Execute give command
      await (controller as any).processCommand('give gold to merchant');

      // Verify sentiment improved by one step
      const newSentiment = await characterService.getSentiment(npcId.lastID);
      expect(newSentiment).toBe(CharacterSentiment.FRIENDLY);

      // Verify output includes sentiment improvement message
      const outputText = outputMessages.join(' ');
      expect(outputText).toContain('You give the Gold Coin to the Friendly Merchant.');
      expect(outputText).toContain('smiles warmly at your generosity');
    });

    it('should not improve sentiment beyond allied', async () => {
      // Create an already allied NPC
      const npcId = await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, sentiment, is_dead) VALUES (?, ?, ?, ?, ?, ?)',
        [gameId, 'Loyal Friend', 'npc', playerRoomId, CharacterSentiment.ALLIED, 0]
      );

      // Add an item to player inventory
      const item = await db.run(
        'INSERT INTO items (name, description, type, weight, stackable, max_stack) VALUES (?, ?, ?, ?, ?, ?)',
        ['Gift', 'A nice gift', 'misc', 1, true, 10]
      );
      await db.run(
        'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
        [gameId, item.lastID, 1]
      );

      // Execute give command
      await (controller as any).processCommand('give gift to friend');

      // Verify sentiment remains allied (doesn't go beyond)
      const sentiment = await characterService.getSentiment(npcId.lastID);
      expect(sentiment).toBe(CharacterSentiment.ALLIED);
    });

    it('should improve hostile sentiment to aggressive', async () => {
      // Create a hostile NPC
      const npcId = await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, sentiment, is_dead) VALUES (?, ?, ?, ?, ?, ?)',
        [gameId, 'Hostile Bandit', 'npc', playerRoomId, CharacterSentiment.HOSTILE, 0]
      );

      // Add an item to player inventory
      const item = await db.run(
        'INSERT INTO items (name, description, type, weight, stackable, max_stack) VALUES (?, ?, ?, ?, ?, ?)',
        ['Peace Offering', 'A token of good will', 'misc', 1, false, 1]
      );
      await db.run(
        'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
        [gameId, item.lastID, 1]
      );

      // Verify initial sentiment is hostile
      const initialSentiment = await characterService.getSentiment(npcId.lastID);
      expect(initialSentiment).toBe(CharacterSentiment.HOSTILE);

      // Reset output messages before the test
      outputMessages = [];

      // Execute give command
      await (controller as any).processCommand('give peace to bandit');

      // Check if the give succeeded
      const outputText = outputMessages.join(' ');
      expect(outputText).toContain('You give the Peace Offering to the Hostile Bandit.');

      // Verify sentiment improved from hostile to aggressive
      const sentiment = await characterService.getSentiment(npcId.lastID);
      expect(sentiment).toBe(CharacterSentiment.AGGRESSIVE);
    });
  });

  describe('Multiple improvements', () => {
    it('should improve sentiment step by step with multiple gifts', async () => {
      // Create an aggressive NPC
      const npcId = await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, sentiment, is_dead) VALUES (?, ?, ?, ?, ?, ?)',
        [gameId, 'Grumpy Shopkeeper', 'npc', playerRoomId, CharacterSentiment.AGGRESSIVE, 0]
      );

      // Add multiple items to player inventory
      const item1 = await db.run(
        'INSERT INTO items (name, description, type, weight, stackable, max_stack) VALUES (?, ?, ?, ?, ?, ?)',
        ['Apple', 'A fresh apple', 'misc', 1, true, 50]
      );
      const item2 = await db.run(
        'INSERT INTO items (name, description, type, weight, stackable, max_stack) VALUES (?, ?, ?, ?, ?, ?)',
        ['Bread', 'Fresh bread', 'misc', 1, true, 20]
      );
      
      await db.run(
        'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
        [gameId, item1.lastID, 1]
      );
      await db.run(
        'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
        [gameId, item2.lastID, 1]
      );

      // First gift: aggressive -> indifferent
      await (controller as any).processCommand('give apple to shopkeeper');
      let sentiment = await characterService.getSentiment(npcId.lastID);
      expect(sentiment).toBe(CharacterSentiment.INDIFFERENT);

      // Second gift: indifferent -> friendly
      await (controller as any).processCommand('give bread to shopkeeper');
      sentiment = await characterService.getSentiment(npcId.lastID);
      expect(sentiment).toBe(CharacterSentiment.FRIENDLY);
    });
  });

  describe('Edge cases', () => {
    it('should not affect sentiment of enemy type characters', async () => {
      // Create an enemy character
      const enemyId = await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, sentiment, is_dead) VALUES (?, ?, ?, ?, ?, ?)',
        [gameId, 'Orc Warrior', 'enemy', playerRoomId, CharacterSentiment.AGGRESSIVE, 0]
      );

      // Add an item to player inventory
      const item = await db.run(
        'INSERT INTO items (name, description, type, weight, stackable, max_stack) VALUES (?, ?, ?, ?, ?, ?)',
        ['Gold Coin', 'A shiny gold coin', 'misc', 1, true, 100]
      );
      await db.run(
        'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
        [gameId, item.lastID, 1]
      );

      // Execute give command
      await (controller as any).processCommand('give gold to orc');

      // Verify sentiment unchanged for enemy type
      const sentiment = await characterService.getSentiment(enemyId.lastID);
      expect(sentiment).toBe(CharacterSentiment.AGGRESSIVE);
    });

    it('should not affect sentiment of dead characters', async () => {
      // Create a dead NPC
      const npcId = await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, sentiment, is_dead) VALUES (?, ?, ?, ?, ?, ?)',
        [gameId, 'Dead Merchant', 'npc', playerRoomId, CharacterSentiment.INDIFFERENT, 1]
      );

      // Add an item to player inventory
      const item = await db.run(
        'INSERT INTO items (name, description, type, weight, stackable, max_stack) VALUES (?, ?, ?, ?, ?, ?)',
        ['Gold Coin', 'A shiny gold coin', 'misc', 1, true, 100]
      );
      await db.run(
        'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
        [gameId, item.lastID, 1]
      );

      // Attempt give command - should fail because character is dead
      await (controller as any).processCommand('give gold to dead');

      // Should get error message about dead character
      expect((controller as any).lastDisplayMessage).toMatch(/dead|deceased|gone/i);
    });
  });
});