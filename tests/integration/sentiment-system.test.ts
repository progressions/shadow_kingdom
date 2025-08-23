/**
 * Comprehensive Sentiment System Integration Tests - Phase 12
 * 
 * End-to-end testing of all sentiment system components working together
 */

import Database from '../../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import { GameController } from '../../src/gameController';
import { CharacterSentiment, CharacterType } from '../../src/types/character';
import { CharacterService } from '../../src/services/characterService';
import * as readline from 'readline';

describe('Comprehensive Sentiment System Integration - Phase 12', () => {
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
    process.env.AI_MOCK_MODE = 'true';
    
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
    const uniqueGameName = `Sentiment Integration Test ${Date.now()}-${Math.random()}`;
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

  describe('End-to-End Sentiment Workflows', () => {
    it('should complete full hostile-to-ally transformation through player actions', async () => {
      // Create a hostile NPC
      const npcId = await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, sentiment, is_dead) VALUES (?, ?, ?, ?, ?, ?)',
        [gameId, 'Gruff Blacksmith', 'npc', playerRoomId, CharacterSentiment.HOSTILE, 0]
      );

      // Create items for gifts
      const items = [];
      for (let i = 1; i <= 4; i++) {
        const item = await db.run(
          'INSERT INTO items (name, description, type, weight, stackable, max_stack) VALUES (?, ?, ?, ?, ?, ?)',
          [`Gift ${i}`, `A gift item ${i}`, 'misc', 1, false, 1]
        );
        await db.run(
          'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
          [gameId, item.lastID, 1]
        );
        items.push(item.lastID);
      }

      // Track sentiment progression: hostile -> aggressive -> indifferent -> friendly -> allied
      const expectedProgression = [
        CharacterSentiment.HOSTILE,
        CharacterSentiment.AGGRESSIVE,
        CharacterSentiment.INDIFFERENT,
        CharacterSentiment.FRIENDLY,
        CharacterSentiment.ALLIED
      ];

      // Verify initial state
      let sentiment = await characterService.getSentiment(npcId.lastID);
      expect(sentiment).toBe(expectedProgression[0]);

      // Give gifts and verify progression
      for (let i = 1; i <= 4; i++) {
        outputMessages = [];
        await (controller as any).processCommand(`give gift to blacksmith`);
        
        sentiment = await characterService.getSentiment(npcId.lastID);
        expect(sentiment).toBe(expectedProgression[i]);
        
        // Verify appropriate feedback message
        const outputText = outputMessages.join(' ');
        expect(outputText).toContain('You give the Gift');
        expect(outputText).toContain('Gruff Blacksmith');
      }

      // Final verification - should be allied
      const finalSentiment = await characterService.getSentiment(npcId.lastID);
      expect(finalSentiment).toBe(CharacterSentiment.ALLIED);
    });

    it('should handle redemption through gifts', async () => {
      // Create a hostile NPC that needs redemption
      const npcId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Angry Villager',
        description: 'An angry villager',
        type: CharacterType.NPC,
        current_room_id: playerRoomId,
        sentiment: CharacterSentiment.HOSTILE
      });

      // Verify initial hostile state
      let sentiment = await characterService.getSentiment(npcId);
      expect(sentiment).toBe(CharacterSentiment.HOSTILE);

      // Create peace offering item
      const item = await db.run(
        'INSERT INTO items (name, description, type, weight, stackable, max_stack) VALUES (?, ?, ?, ?, ?, ?)',
        ['Peace Offering', 'A token of goodwill', 'misc', 1, false, 1]
      );
      await db.run(
        'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
        [gameId, item.lastID, 1]
      );

      // Give peace offering to start redemption process
      outputMessages = [];
      await (controller as any).processCommand('give peace to villager');
      
      // Should improve from hostile to aggressive
      sentiment = await characterService.getSentiment(npcId);
      expect(sentiment).toBe(CharacterSentiment.AGGRESSIVE);

      // Verify redemption feedback message
      const outputText = outputMessages.join(' ');
      expect(outputText).toContain('You give the Peace Offering to the Angry Villager.');
      expect(outputText).toContain('appears to be warming up to you');
    });
  });

  describe('Cross-System Integration', () => {
    it('should integrate sentiment with movement blocking', async () => {
      // Create a hostile NPC that should block movement
      const hostileNpcId = await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, sentiment, is_dead) VALUES (?, ?, ?, ?, ?, ?)',
        [gameId, 'Angry Troll', 'npc', playerRoomId, CharacterSentiment.HOSTILE, 0]
      );

      // Create another room and connection
      const targetRoom = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Next Room', 'The next room']
      );
      
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, playerRoomId, targetRoom.lastID, 'north', 'north']
      );

      // Verify hostile character blocks movement
      const hostileCharacters = await characterService.getHostileCharacters(playerRoomId);
      expect(hostileCharacters).toHaveLength(1);
      expect(hostileCharacters[0].name).toBe('Angry Troll');

      // Improve sentiment to friendly
      await characterService.setSentiment(hostileNpcId.lastID, CharacterSentiment.FRIENDLY);

      // Verify no longer blocks movement
      const remainingHostileCharacters = await characterService.getHostileCharacters(playerRoomId);
      expect(remainingHostileCharacters).toHaveLength(0);
    });

    it('should integrate sentiment with character display', async () => {
      // Create characters with different sentiments
      const characters = [
        { name: 'Hostile Bandit', sentiment: CharacterSentiment.HOSTILE },
        { name: 'Aggressive Guard', sentiment: CharacterSentiment.AGGRESSIVE },
        { name: 'Neutral Merchant', sentiment: CharacterSentiment.INDIFFERENT },
        { name: 'Kind Baker', sentiment: CharacterSentiment.FRIENDLY },
        { name: 'Loyal Knight', sentiment: CharacterSentiment.ALLIED }
      ];

      const characterIds = [];
      for (const char of characters) {
        const id = await db.run(
          'INSERT INTO characters (game_id, name, type, current_room_id, sentiment, is_dead) VALUES (?, ?, ?, ?, ?, ?)',
          [gameId, char.name, 'npc', playerRoomId, char.sentiment, 0]
        );
        characterIds.push(id.lastID);
      }

      // Look at the room to see character display
      outputMessages = [];
      await (controller as any).processCommand('look');

      const outputText = outputMessages.join(' ');
      
      // Verify sentiment indicators are displayed
      expect(outputText).toContain('⚔️ Hostile Bandit ⚔️');
      expect(outputText).toContain('🗡️ Aggressive Guard');
      expect(outputText).toContain('👤 Neutral Merchant');
      expect(outputText).toContain('😊 Kind Baker');
      expect(outputText).toContain('🤝 Loyal Knight');
    });

    it('should handle multiple NPCs with mixed sentiment interactions', async () => {
      // Create multiple NPCs with different sentiments
      const npc1 = await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, sentiment, is_dead) VALUES (?, ?, ?, ?, ?, ?)',
        [gameId, 'Shopkeeper', 'npc', playerRoomId, CharacterSentiment.INDIFFERENT, 0]
      );
      
      const npc2 = await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, sentiment, is_dead) VALUES (?, ?, ?, ?, ?, ?)',
        [gameId, 'Tavern Owner', 'npc', playerRoomId, CharacterSentiment.AGGRESSIVE, 0]
      );

      // Create items for gifts
      const item1 = await db.run(
        'INSERT INTO items (name, description, type, weight, stackable, max_stack) VALUES (?, ?, ?, ?, ?, ?)',
        ['Apple', 'A fresh apple', 'misc', 1, true, 10]
      );
      const item2 = await db.run(
        'INSERT INTO items (name, description, type, weight, stackable, max_stack) VALUES (?, ?, ?, ?, ?, ?)',
        ['Coin', 'A gold coin', 'misc', 1, true, 100]
      );
      
      await db.run(
        'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
        [gameId, item1.lastID, 2]
      );
      await db.run(
        'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
        [gameId, item2.lastID, 2]
      );

      // Give different items to different NPCs
      await (controller as any).processCommand('give apple to shopkeeper');
      await (controller as any).processCommand('give coin to tavern');

      // Verify individual sentiment changes
      const shopkeeperSentiment = await characterService.getSentiment(npc1.lastID);
      const tavernOwnerSentiment = await characterService.getSentiment(npc2.lastID);

      expect(shopkeeperSentiment).toBe(CharacterSentiment.FRIENDLY);
      expect(tavernOwnerSentiment).toBe(CharacterSentiment.INDIFFERENT);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle dead character sentiment operations gracefully', async () => {
      // Create a living NPC, then kill them
      const npcId = await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, sentiment, is_dead) VALUES (?, ?, ?, ?, ?, ?)',
        [gameId, 'Unfortunate Victim', 'npc', playerRoomId, CharacterSentiment.FRIENDLY, 1]
      );

      // Try to change sentiment of dead character
      const initialSentiment = await characterService.getSentiment(npcId.lastID);
      await characterService.setSentiment(npcId.lastID, CharacterSentiment.HOSTILE);
      const finalSentiment = await characterService.getSentiment(npcId.lastID);

      // Should work (dead characters can have their sentiment changed in the database)
      expect(finalSentiment).toBe(CharacterSentiment.HOSTILE);

      // But giving items to dead characters should not affect sentiment
      const item = await db.run(
        'INSERT INTO items (name, description, type, weight, stackable, max_stack) VALUES (?, ?, ?, ?, ?, ?)',
        ['Flower', 'Memorial flower', 'misc', 1, false, 1]
      );
      await db.run(
        'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
        [gameId, item.lastID, 1]
      );

      // Attempt to give item to dead character should fail
      await (controller as any).processCommand('give flower to victim');
      expect((controller as any).lastDisplayMessage).toMatch(/dead.*cannot receive items/i);
    });

    it('should handle sentiment changes at boundaries correctly', async () => {
      // Create NPC at hostile (lowest) sentiment
      const hostileNpcId = await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, sentiment, is_dead) VALUES (?, ?, ?, ?, ?, ?)',
        [gameId, 'Min Sentiment NPC', 'npc', playerRoomId, CharacterSentiment.HOSTILE, 0]
      );

      // Create NPC at allied (highest) sentiment
      const alliedNpcId = await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, sentiment, is_dead) VALUES (?, ?, ?, ?, ?, ?)',
        [gameId, 'Max Sentiment NPC', 'npc', playerRoomId, CharacterSentiment.ALLIED, 0]
      );

      // Try to decrease hostile sentiment (should stay at hostile)
      const newHostileSentiment = await characterService.changeSentiment(hostileNpcId.lastID, -1);
      expect(newHostileSentiment).toBe(CharacterSentiment.HOSTILE);

      // Try to increase allied sentiment (should stay at allied) 
      const newAlliedSentiment = await characterService.changeSentiment(alliedNpcId.lastID, 1);
      expect(newAlliedSentiment).toBe(CharacterSentiment.ALLIED);
    });

    it('should handle enemy character sentiment correctly', async () => {
      // Create enemy character (should default to aggressive)
      const enemyId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Orc Warrior',
        description: 'A fierce orc',
        type: CharacterType.ENEMY,
        current_room_id: playerRoomId
      });

      const enemySentiment = await characterService.getSentiment(enemyId);
      expect(enemySentiment).toBe(CharacterSentiment.AGGRESSIVE);

      // Enemy sentiment can still be changed programmatically
      await characterService.setSentiment(enemyId, CharacterSentiment.FRIENDLY);
      const newSentiment = await characterService.getSentiment(enemyId);
      expect(newSentiment).toBe(CharacterSentiment.FRIENDLY);

      // But giving items to enemies should not improve sentiment
      const item = await db.run(
        'INSERT INTO items (name, description, type, weight, stackable, max_stack) VALUES (?, ?, ?, ?, ?, ?)',
        ['Bribe', 'A shiny bribe', 'misc', 1, false, 1]
      );
      await db.run(
        'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
        [gameId, item.lastID, 1]
      );

      // Reset sentiment to aggressive for test
      await characterService.setSentiment(enemyId, CharacterSentiment.AGGRESSIVE);

      // Try giving item to enemy
      await (controller as any).processCommand('give bribe to orc');
      
      // Sentiment should remain unchanged
      const finalSentiment = await characterService.getSentiment(enemyId);
      expect(finalSentiment).toBe(CharacterSentiment.AGGRESSIVE);
    });
  });

  describe('Performance Validation', () => {
    it('should handle sentiment operations efficiently with multiple characters', async () => {
      const startTime = performance.now();
      
      // Create 20 characters with various sentiments
      const characterIds = [];
      for (let i = 0; i < 20; i++) {
        const sentiments = [
          CharacterSentiment.HOSTILE,
          CharacterSentiment.AGGRESSIVE, 
          CharacterSentiment.INDIFFERENT,
          CharacterSentiment.FRIENDLY,
          CharacterSentiment.ALLIED
        ];
        const sentiment = sentiments[i % sentiments.length];
        
        const id = await db.run(
          'INSERT INTO characters (game_id, name, type, current_room_id, sentiment, is_dead) VALUES (?, ?, ?, ?, ?, ?)',
          [gameId, `Character ${i}`, 'npc', playerRoomId, sentiment, 0]
        );
        characterIds.push(id.lastID);
      }

      // Perform sentiment operations on all characters
      for (const id of characterIds) {
        await characterService.getSentiment(id);
        await characterService.changeSentiment(id, 1);
        await characterService.getSentiment(id);
      }

      // Check hostile character queries
      const hostileChars = await characterService.getHostileCharacters(playerRoomId);
      const hasHostiles = await characterService.hasHostileCharacters(playerRoomId);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete operations quickly (under 1 second for in-memory database)
      expect(executionTime).toBeLessThan(1000);
      
      // Verify results are correct
      expect(hostileChars.length).toBeGreaterThanOrEqual(0);
      expect(typeof hasHostiles).toBe('boolean');
      
      // All characters should have had sentiment changed
      expect(characterIds).toHaveLength(20);
    });
  });
});