/**
 * Get All Command Tests
 * 
 * Tests for the "get all" command that allows players to pick up all items at once
 */

import Database from '../../src/utils/database';
import { createGameWithRooms } from '../../src/utils/initDb';
import { initializeTestDatabase } from '../testUtils';
import { GameController } from '../../src/gameController';
import * as readline from 'readline';

describe('Get All Command', () => {
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
    await initializeTestDatabase(db);

    // Create a unique test game
    const uniqueGameName = `Get All Test ${Date.now()}-${Math.random()}`;
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

    // Clear any starter items from the room and inventory (the game creates some by default)
    await db.run('DELETE FROM room_items WHERE room_id = ?', [playerRoomId]);
    await db.run('DELETE FROM character_inventory WHERE character_id = ?', [gameId]);
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
    it('should pick up all items in a room', async () => {
      // Place multiple items in the room
      const sword = await db.run(
        'INSERT INTO items (name, description, type, is_fixed) VALUES (?, ?, ?, ?)',
        ['Iron Sword', 'A sturdy iron sword', 'weapon', 0]
      );
      const potion = await db.run(
        'INSERT INTO items (name, description, type, is_fixed) VALUES (?, ?, ?, ?)',
        ['Health Potion', 'Restores health', 'consumable', 0]
      );
      const gold = await db.run(
        'INSERT INTO items (name, description, type, is_fixed) VALUES (?, ?, ?, ?)',
        ['Gold Coin', 'Shiny gold coin', 'currency', 0]
      );

      await db.run(
        'INSERT INTO room_items (room_id, item_id, quantity) VALUES (?, ?, ?)',
        [playerRoomId, sword.lastID, 1]
      );
      await db.run(
        'INSERT INTO room_items (room_id, item_id, quantity) VALUES (?, ?, ?)',
        [playerRoomId, potion.lastID, 1]
      );
      await db.run(
        'INSERT INTO room_items (room_id, item_id, quantity) VALUES (?, ?, ?)',
        [playerRoomId, gold.lastID, 1]
      );

      // Execute get all command
      await (controller as any).processCommand('get all');

      // Check output
      expect(outputMessages.some(msg => 
        msg.includes('Iron Sword') && 
        msg.includes('Health Potion') && 
        msg.includes('Gold Coin')
      )).toBe(true);

      // Verify items are now in inventory
      const inventory = await db.all(
        'SELECT * FROM character_inventory WHERE character_id = ?',
        [gameId]
      );
      expect(inventory.length).toBe(3);
    });

    it('should work with pickup all command', async () => {
      // Place an item in the room
      const item = await db.run(
        'INSERT INTO items (name, description, type, is_fixed) VALUES (?, ?, ?, ?)',
        ['Ruby', 'A precious ruby', 'gem', 0]
      );
      await db.run(
        'INSERT INTO room_items (room_id, item_id, quantity) VALUES (?, ?, ?)',
        [playerRoomId, item.lastID, 1]
      );

      // Execute pickup all command
      await (controller as any).processCommand('pickup all');

      // Check output
      expect(outputMessages.some(msg => msg.includes('Ruby'))).toBe(true);
    });

    it('should work with take all command', async () => {
      // Place an item in the room
      const item = await db.run(
        'INSERT INTO items (name, description, type, is_fixed) VALUES (?, ?, ?, ?)',
        ['Diamond', 'A sparkling diamond', 'gem', 0]
      );
      await db.run(
        'INSERT INTO room_items (room_id, item_id, quantity) VALUES (?, ?, ?)',
        [playerRoomId, item.lastID, 1]
      );

      // Execute take all command
      await (controller as any).processCommand('take all');

      // Check output
      expect(outputMessages.some(msg => msg.includes('Diamond'))).toBe(true);
    });

    it('should skip fixed items', async () => {
      // Place both fixed and non-fixed items
      const sword = await db.run(
        'INSERT INTO items (name, description, type, is_fixed) VALUES (?, ?, ?, ?)',
        ['Iron Sword', 'A sword', 'weapon', 0]
      );
      const statue = await db.run(
        'INSERT INTO items (name, description, type, is_fixed) VALUES (?, ?, ?, ?)',
        ['Stone Statue', 'A heavy statue', 'scenery', 1]
      );

      await db.run(
        'INSERT INTO room_items (room_id, item_id, quantity) VALUES (?, ?, ?)',
        [playerRoomId, sword.lastID, 1]
      );
      await db.run(
        'INSERT INTO room_items (room_id, item_id, quantity) VALUES (?, ?, ?)',
        [playerRoomId, statue.lastID, 1]
      );

      // Execute get all command
      await (controller as any).processCommand('get all');

      // Check output - should pick up sword but not statue
      expect(outputMessages.some(msg => msg.includes('Iron Sword'))).toBe(true);
      expect(outputMessages.some(msg => msg.includes('Stone Statue'))).toBe(false);

      // Verify only sword is in inventory
      const inventory = await db.all(
        'SELECT ci.*, i.name FROM character_inventory ci JOIN items i ON ci.item_id = i.id WHERE ci.character_id = ?',
        [gameId]
      );
      expect(inventory.length).toBe(1);
      expect(inventory[0].name).toBe('Iron Sword');
    });
  });

  describe('Error handling', () => {
    it('should show error when no items in room', async () => {
      // Execute get all command in empty room
      await (controller as any).processCommand('get all');

      // Check output
      expect((controller as any).lastDisplayMessage).toBe('There are no items here to pick up.');
    });

    it('should show error when only fixed items in room', async () => {
      // Place only fixed items
      const statue = await db.run(
        'INSERT INTO items (name, description, type, is_fixed) VALUES (?, ?, ?, ?)',
        ['Stone Statue', 'A heavy statue', 'scenery', 1]
      );
      await db.run(
        'INSERT INTO room_items (room_id, item_id, quantity) VALUES (?, ?, ?)',
        [playerRoomId, statue.lastID, 1]
      );

      // Execute get all command
      await (controller as any).processCommand('get all');

      // Check output
      expect((controller as any).lastDisplayMessage).toBe('There are no items here that can be picked up.');
    });

    it('should handle inventory full scenario', async () => {
      // Fill up inventory first (max 10 items by default)
      for (let i = 1; i <= 10; i++) {
        const item = await db.run(
          'INSERT INTO items (name, description, type) VALUES (?, ?, ?)',
          [`Item${i}`, `Description ${i}`, 'misc']
        );
        await db.run(
          'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
          [gameId, item.lastID, 1]
        );
      }

      // Now place items in room
      const sword = await db.run(
        'INSERT INTO items (name, description, type, is_fixed) VALUES (?, ?, ?, ?)',
        ['Iron Sword', 'A sword', 'weapon', 0]
      );
      await db.run(
        'INSERT INTO room_items (room_id, item_id, quantity) VALUES (?, ?, ?)',
        [playerRoomId, sword.lastID, 1]
      );

      // Execute get all command
      await (controller as any).processCommand('get all');

      // Check output
      expect(outputMessages.some(msg => msg.includes('Your inventory is full!'))).toBe(true);
    });

    it('should handle partial success when inventory becomes full', async () => {
      // Fill inventory to 9 items (leaving room for 1 more)
      for (let i = 1; i <= 9; i++) {
        const item = await db.run(
          'INSERT INTO items (name, description, type) VALUES (?, ?, ?)',
          [`Item${i}`, `Description ${i}`, 'misc']
        );
        await db.run(
          'INSERT INTO character_inventory (character_id, item_id, quantity) VALUES (?, ?, ?)',
          [gameId, item.lastID, 1]
        );
      }

      // Place 3 items in room (only 1 will fit)
      const sword = await db.run(
        'INSERT INTO items (name, description, type, is_fixed) VALUES (?, ?, ?, ?)',
        ['Iron Sword', 'A sword', 'weapon', 0]
      );
      const shield = await db.run(
        'INSERT INTO items (name, description, type, is_fixed) VALUES (?, ?, ?, ?)',
        ['Wooden Shield', 'A shield', 'armor', 0]
      );
      const potion = await db.run(
        'INSERT INTO items (name, description, type, is_fixed) VALUES (?, ?, ?, ?)',
        ['Health Potion', 'A potion', 'consumable', 0]
      );

      await db.run(
        'INSERT INTO room_items (room_id, item_id, quantity) VALUES (?, ?, ?)',
        [playerRoomId, sword.lastID, 1]
      );
      await db.run(
        'INSERT INTO room_items (room_id, item_id, quantity) VALUES (?, ?, ?)',
        [playerRoomId, shield.lastID, 1]
      );
      await db.run(
        'INSERT INTO room_items (room_id, item_id, quantity) VALUES (?, ?, ?)',
        [playerRoomId, potion.lastID, 1]
      );

      // Execute get all command
      await (controller as any).processCommand('get all');

      // Check output - should show partial success
      expect(outputMessages.some(msg => msg.includes('You pick up'))).toBe(true);
      expect(outputMessages.some(msg => msg.includes('Could not pick up') || msg.includes('inventory full'))).toBe(true);

      // Verify only 1 item was picked up (inventory now full at 10)
      const inventory = await db.all(
        'SELECT * FROM character_inventory WHERE character_id = ?',
        [gameId]
      );
      expect(inventory.length).toBe(10);
    });
  });

  describe('Performance', () => {
    it('should handle 10 items efficiently', async () => {
      // Place 10 items in room
      for (let i = 1; i <= 10; i++) {
        const item = await db.run(
          'INSERT INTO items (name, description, type, is_fixed) VALUES (?, ?, ?, ?)',
          [`Item${i}`, `Description ${i}`, 'misc', 0]
        );
        await db.run(
          'INSERT INTO room_items (room_id, item_id, quantity) VALUES (?, ?, ?)',
          [playerRoomId, item.lastID, 1]
        );
      }

      const startTime = Date.now();
      await (controller as any).processCommand('get all');
      const endTime = Date.now();

      // Should complete within 500ms as per spec
      expect(endTime - startTime).toBeLessThan(500);

      // Verify all items picked up
      const inventory = await db.all(
        'SELECT * FROM character_inventory WHERE character_id = ?',
        [gameId]
      );
      expect(inventory.length).toBe(10);
    });
  });
});