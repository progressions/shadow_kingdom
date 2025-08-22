/**
 * Attack Command Tests
 * 
 * Tests for the basic attack command that allows players
 * to attack characters in the current room.
 */

import Database from '../../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import { GameController } from '../../src/gameController';
import { Character, CharacterType } from '../../src/types/character';
import * as readline from 'readline';

describe('Attack Command', () => {
  let db: Database;
  let controller: GameController;
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
    const uniqueGameName = `Attack Test ${Date.now()}-${Math.random()}`;
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
  });

  describe('Basic functionality', () => {
    it('should attack a character by full name', async () => {
      // Create a character in the room
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead) VALUES (?, ?, ?, ?, ?)',
        [gameId, 'Goblin Warrior', 'enemy', playerRoomId, 0]
      );

      // Execute attack command
      await (controller as any).processCommand('attack Goblin Warrior');

      // Check output
      expect((controller as any).lastDisplayMessage).toBe('Goblin Warrior says "Ow"');
    });

    it('should attack a character by partial name', async () => {
      // Create a character in the room
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead) VALUES (?, ?, ?, ?, ?)',
        [gameId, 'Crypt Keeper', 'npc', playerRoomId, 0]
      );

      // Execute attack command
      await (controller as any).processCommand('attack crypt');

      // Check output
      expect((controller as any).lastDisplayMessage).toBe('Crypt Keeper says "Ow"');
    });

    it('should be case-insensitive', async () => {
      // Create a character in the room
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead) VALUES (?, ?, ?, ?, ?)',
        [gameId, 'Giant Spider', 'enemy', playerRoomId, 0]
      );

      // Execute attack command
      await (controller as any).processCommand('attack SPIDER');

      // Check output
      expect((controller as any).lastDisplayMessage).toBe('Giant Spider says "Ow"');
    });

    it('should work with NPCs', async () => {
      // Create an NPC in the room
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead) VALUES (?, ?, ?, ?, ?)',
        [gameId, 'Friendly Merchant', 'npc', playerRoomId, 0]
      );

      // Execute attack command
      await (controller as any).processCommand('attack merchant');

      // Check output
      expect((controller as any).lastDisplayMessage).toBe('Friendly Merchant says "Ow"');
    });
  });

  describe('Error handling', () => {
    it('should show error when no target is specified', async () => {
      // Execute attack command without target
      await (controller as any).processCommand('attack');

      // Check output
      expect((controller as any).lastDisplayMessage).toBe('Attack who? Specify a target (e.g., "attack goblin")');
    });

    it('should show error when character is not found', async () => {
      // Execute attack command with non-existent target
      await (controller as any).processCommand('attack dragon');

      // Check output
      expect((controller as any).lastDisplayMessage).toBe('There is no dragon here to attack.');
    });

    it('should prevent attacking dead characters', async () => {
      // Create a dead character in the room
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead) VALUES (?, ?, ?, ?, ?)',
        [gameId, 'Dead Goblin', 'enemy', playerRoomId, 1]
      );

      // Execute attack command
      await (controller as any).processCommand('attack goblin');

      // Check output
      expect((controller as any).lastDisplayMessage).toBe('The Dead Goblin is already dead.');
    });

    it('should handle multiple characters with partial match', async () => {
      // Create multiple goblins
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead) VALUES (?, ?, ?, ?, ?)',
        [gameId, 'Goblin Warrior', 'enemy', playerRoomId, 0]
      );
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead) VALUES (?, ?, ?, ?, ?)',
        [gameId, 'Goblin Archer', 'enemy', playerRoomId, 0]
      );

      // Execute attack command - should attack the first match
      await (controller as any).processCommand('attack goblin');

      // Check output - should match first character found
      expect((controller as any).lastDisplayMessage).toBe('Goblin Warrior says "Ow"');
    });
  });

  describe('Integration with other systems', () => {
    it('should only attack characters in the current room', async () => {
      // Create another room
      await db.run(
        'INSERT INTO rooms (game_id, name, description, region_id) VALUES (?, ?, ?, ?)',
        [gameId, 'Other Room', 'Another room', 1]
      );
      const otherRoom = await db.get('SELECT id FROM rooms WHERE name = ?', ['Other Room']);
      
      // Create a character in the other room
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead) VALUES (?, ?, ?, ?, ?)',
        [gameId, 'Distant Enemy', 'enemy', otherRoom.id, 0]
      );

      // Execute attack command
      await (controller as any).processCommand('attack enemy');

      // Check output
      expect((controller as any).lastDisplayMessage).toBe('There is no enemy here to attack.');
    });

    it('should work with characters created by AI generation', async () => {
      // Simulate an AI-generated character with typical fields
      await db.run(
        `INSERT INTO characters (game_id, name, type, description, current_room_id, is_dead, is_hostile, dialogue_response) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [gameId, 'Ancient Guardian', 'npc', 'A mysterious guardian', playerRoomId, 0, 0, 'You dare attack me?']
      );

      // Execute attack command
      await (controller as any).processCommand('attack guardian');

      // Check output
      expect((controller as any).lastDisplayMessage).toBe('Ancient Guardian says "Ow"');
    });

    it('should work with hostile characters', async () => {
      // Create a hostile character
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead, is_hostile) VALUES (?, ?, ?, ?, ?, ?)',
        [gameId, 'Hostile Bandit', 'enemy', playerRoomId, 0, 1]
      );

      // Execute attack command
      await (controller as any).processCommand('attack bandit');

      // Check output
      expect((controller as any).lastDisplayMessage).toBe('Hostile Bandit says "Ow"');
    });
  });
});