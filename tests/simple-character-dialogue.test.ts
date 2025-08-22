/**
 * Simple Character Dialogue Tests
 * 
 * Tests for the basic talk command functionality that allows players
 * to talk to characters in the current room.
 */

import Database from '../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';
import { GameController } from '../src/gameController';
import { Character, CharacterType } from '../src/types/character';
import * as readline from 'readline';

describe('Simple Character Dialogue', () => {
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
    const uniqueGameName = `Talk Test ${Date.now()}-${Math.random()}`;
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

  describe('Talk Command Registration', () => {
    test('should register talk command', () => {
      const commandRouter = (controller as any).commandRouter;
      const commands = commandRouter.getCommands();
      
      expect(commands.has('talk')).toBe(true);
      const talkCommand = commands.get('talk');
      expect(talkCommand?.description).toBe('Talk to a character in the current room');
    });
  });

  describe('Character Verification', () => {
    test('should find character in current room', async () => {
      // Create a character in the current room
      const characterName = 'Friendly Merchant';
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, strength, dexterity, intelligence, constitution, wisdom, charisma) VALUES (?, ?, ?, ?, 10, 10, 10, 10, 10, 10)',
        [gameId, characterName, CharacterType.NPC, playerRoomId]
      );

      // Execute talk command via processCommand
      await (controller as any).processCommand('talk Friendly Merchant');

      // Verify the response
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toBe('Friendly Merchant says: "Lovely day."');
    });

    test('should handle character not found', async () => {
      // Execute talk command with non-existent character
      await (controller as any).processCommand('talk NonExistent');

      // Verify error message
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toBe('There is no one named "NonExistent" here.');
    });

    test('should handle missing character name', async () => {
      // Execute talk command without character name
      await (controller as any).processCommand('talk');

      // Verify prompt message
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toBe('Who would you like to talk to?');
    });

    test('should be case insensitive', async () => {
      // Create a character with mixed case name
      const characterName = 'Goblin Warrior';
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, strength, dexterity, intelligence, constitution, wisdom, charisma) VALUES (?, ?, ?, ?, 10, 10, 10, 10, 10, 10)',
        [gameId, characterName, CharacterType.ENEMY, playerRoomId]
      );

      // Test various case combinations
      const testCases = ['goblin warrior', 'GOBLIN WARRIOR', 'Goblin Warrior', 'goblin Warrior'];
      
      for (const testCase of testCases) {
        await (controller as any).processCommand(`talk ${testCase}`);
        const lastMessage = (controller as any).lastDisplayMessage;
        expect(lastMessage).toBe('Goblin Warrior says: "Lovely day."');
      }
    });
  });

  describe('Character Types', () => {
    test('should work with NPC characters', async () => {
      const npcName = 'Village Elder';
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, strength, dexterity, intelligence, constitution, wisdom, charisma) VALUES (?, ?, ?, ?, 10, 10, 10, 10, 10, 10)',
        [gameId, npcName, CharacterType.NPC, playerRoomId]
      );

      await (controller as any).processCommand('talk Village Elder');

      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toBe('Village Elder says: "Lovely day."');
    });

    test('should work with enemy characters', async () => {
      const enemyName = 'Orc Raider';
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, strength, dexterity, intelligence, constitution, wisdom, charisma) VALUES (?, ?, ?, ?, 10, 10, 10, 10, 10, 10)',
        [gameId, enemyName, CharacterType.ENEMY, playerRoomId]
      );

      await (controller as any).processCommand('talk Orc Raider');

      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toBe('Orc Raider says: "Lovely day."');
    });

    test('should work with player characters', async () => {
      const playerName = 'Fellow Adventurer';
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, strength, dexterity, intelligence, constitution, wisdom, charisma) VALUES (?, ?, ?, ?, 10, 10, 10, 10, 10, 10)',
        [gameId, playerName, CharacterType.PLAYER, playerRoomId]
      );

      await (controller as any).processCommand('talk Fellow Adventurer');

      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toBe('Fellow Adventurer says: "Lovely day."');
    });

    test('should support partial name matching', async () => {
      // Create character with compound name
      const characterName = 'Ancient Guardian';
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, strength, dexterity, intelligence, constitution, wisdom, charisma) VALUES (?, ?, ?, ?, 10, 10, 10, 10, 10, 10)',
        [gameId, characterName, CharacterType.NPC, playerRoomId]
      );

      // Test various partial matches
      const partialNames = ['ancient', 'guardian', 'Ancient', 'Guardian', 'anc', 'guar'];
      
      for (const partialName of partialNames) {
        await (controller as any).processCommand(`talk ${partialName}`);
        const lastMessage = (controller as any).lastDisplayMessage;
        expect(lastMessage).toBe('Ancient Guardian says: "These halls have stood for centuries, and I shall guard them for centuries more."');
      }
    });
  });

  describe('Room Context', () => {
    test('should not find character in different room', async () => {
      // Create another room
      const otherRoom = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Other Room', 'A different room']
      );
      const otherRoomId = otherRoom.lastID!;

      // Create character in the other room
      const characterName = 'Distant Stranger';
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, strength, dexterity, intelligence, constitution, wisdom, charisma) VALUES (?, ?, ?, ?, 10, 10, 10, 10, 10, 10)',
        [gameId, characterName, CharacterType.NPC, otherRoomId]
      );

      // Try to talk to character from current room
      await (controller as any).processCommand('talk Distant Stranger');

      // Should not find the character
      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toBe('There is no one named "Distant Stranger" here.');
    });

    test('should find character when moved to same room', async () => {
      // Create another room
      const otherRoom = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Other Room', 'A different room']
      );
      const otherRoomId = otherRoom.lastID!;

      // Create character in the other room
      const characterName = 'Room Keeper';
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, strength, dexterity, intelligence, constitution, wisdom, charisma) VALUES (?, ?, ?, ?, 10, 10, 10, 10, 10, 10)',
        [gameId, characterName, CharacterType.NPC, otherRoomId]
      );

      // Move player to the other room
      const gameStateManager = (controller as any).gameStateManager;
      await gameStateManager.moveToRoom(otherRoomId);

      // Now should be able to talk to character
      await (controller as any).processCommand('talk Room Keeper');

      const lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toBe('Room Keeper says: "Lovely day."');
    });
  });

  describe('Multiple Characters', () => {
    test('should handle multiple characters in same room', async () => {
      // Create multiple characters in the same room
      const characters = [
        { name: 'Guard Captain', type: CharacterType.NPC },
        { name: 'Soldier', type: CharacterType.NPC },
        { name: 'Bandit', type: CharacterType.ENEMY }
      ];

      for (const char of characters) {
        await db.run(
          'INSERT INTO characters (game_id, name, type, current_room_id, strength, dexterity, intelligence, constitution, wisdom, charisma) VALUES (?, ?, ?, ?, 10, 10, 10, 10, 10, 10)',
          [gameId, char.name, char.type, playerRoomId]
        );
      }

      // Test talking to each character
      for (const char of characters) {
        await (controller as any).processCommand(`talk ${char.name}`);
        const lastMessage = (controller as any).lastDisplayMessage;
        expect(lastMessage).toBe(`${char.name} says: "Lovely day."`);
      }
    });

    test('should find correct character with partial name match', async () => {
      // Create characters with similar names
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, strength, dexterity, intelligence, constitution, wisdom, charisma) VALUES (?, ?, ?, ?, 10, 10, 10, 10, 10, 10)',
        [gameId, 'Town Guard', CharacterType.NPC, playerRoomId]
      );
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, strength, dexterity, intelligence, constitution, wisdom, charisma) VALUES (?, ?, ?, ?, 10, 10, 10, 10, 10, 10)',
        [gameId, 'Royal Guard', CharacterType.NPC, playerRoomId]
      );

      // Test exact name match
      await (controller as any).processCommand('talk Town Guard');
      let lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toBe('Town Guard says: "Lovely day."');

      await (controller as any).processCommand('talk Royal Guard');
      lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toBe('Royal Guard says: "Lovely day."');

      // Test partial name matching
      await (controller as any).processCommand('talk town');
      lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toBe('Town Guard says: "Lovely day."');

      await (controller as any).processCommand('talk royal');
      lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toBe('Royal Guard says: "Lovely day."');

      await (controller as any).processCommand('talk town guard');
      lastMessage = (controller as any).lastDisplayMessage;
      expect(lastMessage).toBe('Town Guard says: "Lovely day."');
    });
  });

  describe('Game State Requirements', () => {
    test('should require active game session', async () => {
      // Create a new database and controller without starting a game session
      const newDb = new Database(':memory:');
      await newDb.connect();
      await initializeDatabase(newDb);
      
      const newController = new GameController(newDb);
      (newController as any).rl = mockRl;
      
      const newOutputSpy = jest.spyOn((newController as any).tui, 'display').mockImplementation((...args: unknown[]) => {
        (newController as any).lastDisplayMessage = args[0];
      });

      try {
        await (newController as any).processCommand('talk Someone');

        const lastMessage = (newController as any).lastDisplayMessage;
        expect(lastMessage).toBe('No game is currently loaded.');
      } finally {
        await newController.cleanup();
        newController.removeEventListeners();
        await newDb.close();
        newOutputSpy.mockRestore();
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Close the database to simulate an error
      await db.close();

      await (controller as any).processCommand('talk Anyone');

      // Should not crash and should show database-related error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get current room'),
        expect.any(Error)
      );
    });
  });
});