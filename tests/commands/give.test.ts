/**
 * Give Command Tests
 * 
 * Tests for the give command that allows players to give items to characters
 */

import Database from '../../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import { GameController } from '../../src/gameController';
import { Character, CharacterType } from '../../src/types/character';
import * as readline from 'readline';

describe('Give Command', () => {
  let db: Database;
  let controller: GameController;
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

    // Create a unique test game
    const uniqueGameName = `Give Test ${Date.now()}-${Math.random()}`;
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
      // Store the message for testing
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

  describe('Basic functionality', () => {
    it('should give an item to a character', async () => {
      // Create a character in the room
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead) VALUES (?, ?, ?, ?, ?)',
        [gameId, 'Friendly Merchant', 'npc', playerRoomId, 0]
      );

      // Add an item to player inventory
      const item = await db.run(
        'INSERT INTO items (name, description, type) VALUES (?, ?, ?)',
        ['Gold Coin', 'A shiny gold coin', 'currency']
      );
      await db.run(
        'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
        [gameId, item.lastID, 1]
      );

      // Execute give command
      await (controller as any).processCommand('give gold to merchant');

      // Check output
      expect(outputMessages).toContain('You give the Gold Coin to the Friendly Merchant.');
      expect(outputMessages).toContain('Friendly Merchant says, "Thank you."');

      // Verify item was removed from inventory
      const inventory = await db.all('SELECT * FROM character_inventory WHERE character_id = ? AND item_id = ?', [gameId, item.lastID]);
      expect(inventory.length).toBe(0);
    });

    it('should work with partial item names', async () => {
      // Reset output messages
      outputMessages = [];
      
      // Create a character (Note: there's already an "Ancient Guardian" created by the game)
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead) VALUES (?, ?, ?, ?, ?)',
        [gameId, 'Royal Palace Keeper', 'npc', playerRoomId, 0]
      );

      // Add an item with a long name
      const item = await db.run(
        'INSERT INTO items (name, description, type) VALUES (?, ?, ?)',
        ['Rusty Iron Sword', 'A heavy iron sword', 'weapon']
      );
      await db.run(
        'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
        [gameId, item.lastID, 1]
      );

      // Execute give command with partial item name - using "palace" to match the keeper specifically
      await (controller as any).processCommand('give sword to palace');

      // Check output
      expect(outputMessages).toContain('You give the Rusty Iron Sword to the Royal Palace Keeper.');
      expect(outputMessages).toContain('Royal Palace Keeper says, "Thank you."');
    });

    it('should work with partial character names', async () => {
      // Reset output messages
      outputMessages = [];
      
      // Create a character with a long name (Note: there's already an "Ancient Guardian" so we avoid "guardian" naming)
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead) VALUES (?, ?, ?, ?, ?)',
        [gameId, 'Forest Spirit Elder', 'npc', playerRoomId, 0]
      );

      // Add an item
      const item = await db.run(
        'INSERT INTO items (name, description, type) VALUES (?, ?, ?)',
        ['Healing Herb', 'A medicinal herb', 'consumable']
      );
      await db.run(
        'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
        [gameId, item.lastID, 1]
      );

      // Execute give command with partial character name
      await (controller as any).processCommand('give herb to elder');

      // Check output
      expect(outputMessages).toContain('You give the Healing Herb to the Forest Spirit Elder.');
      expect(outputMessages).toContain('Forest Spirit Elder says, "Thank you."');
    });

    it('should be case-insensitive', async () => {
      // Create a character
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead) VALUES (?, ?, ?, ?, ?)',
        [gameId, 'Wizard', 'npc', playerRoomId, 0]
      );

      // Add an item
      const item = await db.run(
        'INSERT INTO items (name, description, type) VALUES (?, ?, ?)',
        ['Magic Wand', 'A magical wand', 'weapon']
      );
      await db.run(
        'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
        [gameId, item.lastID, 1]
      );

      // Execute give command with mixed case
      await (controller as any).processCommand('give MAGIC to WIZARD');

      // Check output
      expect(outputMessages).toContain('You give the Magic Wand to the Wizard.');
      expect(outputMessages).toContain('Wizard says, "Thank you."');
    });
  });

  describe('Error handling', () => {
    it('should show error when command format is wrong', async () => {
      await (controller as any).processCommand('give');
      expect((controller as any).lastDisplayMessage).toBe('Give what to whom? Use: give [item] to [character]');

      await (controller as any).processCommand('give sword');
      expect((controller as any).lastDisplayMessage).toBe('Give what to whom? Use: give [item] to [character]');
    });

    it('should show error when "to" is missing', async () => {
      await (controller as any).processCommand('give sword guard');
      expect((controller as any).lastDisplayMessage).toBe('Give what to whom? Use: give [item] to [character]');
    });

    it('should show error when item is not in inventory', async () => {
      // Create a character
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead) VALUES (?, ?, ?, ?, ?)',
        [gameId, 'Merchant', 'npc', playerRoomId, 0]
      );

      await (controller as any).processCommand('give diamond to merchant');
      expect((controller as any).lastDisplayMessage).toBe('You don\'t have "diamond" in your inventory.');
    });

    it('should show error when character is not found', async () => {
      // Add an item to inventory
      const item = await db.run(
        'INSERT INTO items (name, description, type) VALUES (?, ?, ?)',
        ['Gold Coin', 'A shiny gold coin', 'currency']
      );
      await db.run(
        'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
        [gameId, item.lastID, 1]
      );

      await (controller as any).processCommand('give gold to dragon');
      expect((controller as any).lastDisplayMessage).toBe('There is no one named "dragon" here.');
    });

    it('should only give items to characters in the current room', async () => {
      // Create another room
      await db.run(
        'INSERT INTO rooms (game_id, name, description, region_id) VALUES (?, ?, ?, ?)',
        [gameId, 'Other Room', 'Another room', 1]
      );
      const otherRoom = await db.get('SELECT id FROM rooms WHERE name = ?', ['Other Room']);
      
      // Create a character in the other room
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead) VALUES (?, ?, ?, ?, ?)',
        [gameId, 'Distant Merchant', 'npc', otherRoom.id, 0]
      );

      // Add an item to inventory
      const item = await db.run(
        'INSERT INTO items (name, description, type) VALUES (?, ?, ?)',
        ['Gold Coin', 'A shiny gold coin', 'currency']
      );
      await db.run(
        'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
        [gameId, item.lastID, 1]
      );

      await (controller as any).processCommand('give gold to merchant');
      expect((controller as any).lastDisplayMessage).toBe('There is no one named "merchant" here.');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle multiple items with similar names', async () => {
      // Create a character
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead) VALUES (?, ?, ?, ?, ?)',
        [gameId, 'Collector', 'npc', playerRoomId, 0]
      );

      // Add multiple items with similar names
      const sword1 = await db.run(
        'INSERT INTO items (name, description, type) VALUES (?, ?, ?)',
        ['Iron Sword', 'A basic iron sword', 'weapon']
      );
      const sword2 = await db.run(
        'INSERT INTO items (name, description, type) VALUES (?, ?, ?)',
        ['Steel Sword', 'A sharp steel sword', 'weapon']
      );
      
      await db.run(
        'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
        [gameId, sword1.lastID, 1]
      );
      await db.run(
        'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
        [gameId, sword2.lastID, 1]
      );

      // Give "iron" should match Iron Sword specifically
      await (controller as any).processCommand('give iron to collector');
      
      expect(outputMessages).toContain('You give the Iron Sword to the Collector.');
      
      // Verify only Iron Sword was removed
      const inventory = await db.all('SELECT * FROM character_inventory WHERE character_id = ?', [gameId]);
      expect(inventory.length).toBe(1);
      expect(inventory[0].item_id).toBe(sword2.lastID);
    });

    it('should handle multiple characters with similar names', async () => {
      // Create multiple guards
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead) VALUES (?, ?, ?, ?, ?)',
        [gameId, 'Guard Captain', 'npc', playerRoomId, 0]
      );
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead) VALUES (?, ?, ?, ?, ?)',
        [gameId, 'Guard Private', 'npc', playerRoomId, 0]
      );

      // Add an item
      const item = await db.run(
        'INSERT INTO items (name, description, type) VALUES (?, ?, ?)',
        ['Letter', 'An important letter', 'misc']
      );
      await db.run(
        'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
        [gameId, item.lastID, 1]
      );

      // Give to "captain" should match Guard Captain
      await (controller as any).processCommand('give letter to captain');
      
      expect(outputMessages).toContain('You give the Letter to the Guard Captain.');
      expect(outputMessages).toContain('Guard Captain says, "Thank you."');
    });
  });
});