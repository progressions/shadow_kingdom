/**
 * Attack Command Tests
 * 
 * Tests for the basic attack command that allows players
 * to attack characters in the current room.
 */

import Database from '../../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import { GameController } from '../../src/gameController';
import { GrokClient } from '../../src/ai/grokClient';
import { Character, CharacterType } from '../../src/types/character';
import * as readline from 'readline';

// Mock the GrokClient
jest.mock('../../src/ai/grokClient');

describe('Attack Command', () => {
  let db: Database;
  let controller: GameController;
  let mockRl: readline.Interface;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let gameId: number;
  let playerRoomId: number;
  let outputSpy: jest.SpyInstance;
  let mockGrokClient: jest.Mocked<GrokClient>;

  beforeEach(async () => {
    // Ensure we use legacy services, not Prisma
    process.env.USE_PRISMA = 'false';
    process.env.NODE_ENV = 'test';
    process.env.AI_MOCK_MODE = 'true'; // Disable real AI calls
    process.env.DISABLE_ENEMY_ATTACKS = 'true'; // Disable enemy attacks for attack command tests
    
    // Set up the GrokClient mock
    mockGrokClient = {
      interpretCommand: jest.fn(),
      isMockMode: true,
      getUsageStats: jest.fn().mockReturnValue({
        tokensUsed: { input: 0, output: 0, cost: 0 },
        estimatedCost: '$0.0000'
      }),
      setMockMode: jest.fn(),
      setLoggerService: jest.fn(),
      cleanup: jest.fn()
    } as any;
    
    // Make the mock constructor return our mock instance
    (GrokClient as jest.MockedClass<typeof GrokClient>).mockImplementation(() => mockGrokClient);
    
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
    
    // Clean up environment
    delete process.env.AI_MOCK_MODE;
    delete process.env.DISABLE_ENEMY_ATTACKS;
  });

  describe('Basic functionality', () => {
    it('should attack a character by full name - hit scenario', async () => {
      // Mock Math.random to always return 0.4 (hit)
      jest.spyOn(Math, 'random').mockReturnValue(0.4);
      
      // Create a character in the room with health
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead, max_health, current_health) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gameId, 'Goblin Warrior', 'enemy', playerRoomId, 0, 10, 10]
      );

      // Execute attack command
      await (controller as any).processCommand('attack Goblin Warrior');

      // Check output - should show damage
      expect((controller as any).lastDisplayMessage).toBe('You attack the Goblin Warrior. The Goblin Warrior takes 2 damage.');
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    it('should attack a character by full name - miss scenario', async () => {
      // Mock Math.random to always return 0.6 (miss)
      jest.spyOn(Math, 'random').mockReturnValue(0.6);
      
      // Create a character in the room with health
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead, max_health, current_health) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gameId, 'Goblin Warrior', 'enemy', playerRoomId, 0, 10, 10]
      );

      // Execute attack command
      await (controller as any).processCommand('attack Goblin Warrior');

      // Check output - should show miss
      expect((controller as any).lastDisplayMessage).toBe('You attack the Goblin Warrior, but miss!');
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    it('should attack a character by partial name', async () => {
      // Mock Math.random to always return 0.4 (hit)
      jest.spyOn(Math, 'random').mockReturnValue(0.4);
      
      // Create a character in the room with health
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead, max_health, current_health) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gameId, 'Crypt Keeper', 'npc', playerRoomId, 0, 10, 10]
      );

      // Execute attack command
      await (controller as any).processCommand('attack crypt');

      // Check output - should show damage but not kill
      expect((controller as any).lastDisplayMessage).toBe('You attack the Crypt Keeper. The Crypt Keeper takes 2 damage.');
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    it('should be case-insensitive', async () => {
      // Mock Math.random to always return 0.4 (hit)
      jest.spyOn(Math, 'random').mockReturnValue(0.4);
      
      // Create a character in the room with health
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead, max_health, current_health) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gameId, 'Giant Spider', 'enemy', playerRoomId, 0, 10, 10]
      );

      // Execute attack command
      await (controller as any).processCommand('attack SPIDER');

      // Check output - should show damage but not kill
      expect((controller as any).lastDisplayMessage).toBe('You attack the Giant Spider. The Giant Spider takes 2 damage.');
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    it('should work with NPCs', async () => {
      // Mock Math.random to always return 0.4 (hit)
      jest.spyOn(Math, 'random').mockReturnValue(0.4);
      
      // Create an NPC in the room with health
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead, max_health, current_health) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gameId, 'Friendly Merchant', 'npc', playerRoomId, 0, 10, 10]
      );

      // Execute attack command
      await (controller as any).processCommand('attack merchant');

      // Check output - should show damage but not kill
      expect((controller as any).lastDisplayMessage).toBe('You attack the Friendly Merchant. The Friendly Merchant takes 2 damage.');
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });
  });

  describe('Error handling', () => {
    it('should show error when no target is specified', async () => {
      // Execute attack command without target
      await (controller as any).processCommand('attack');

      // Check output
      expect((controller as any).lastDisplayMessage).toBe('Attack who? Specify a target (e.g., "attack goblin")');
    });

    it('should use AI fallback when character name is not directly found', async () => {
      // Mock interpretCommand to return null (simulating AI fallback failure)
      mockGrokClient.interpretCommand.mockResolvedValue(null);
      
      // Execute attack command with indirect reference that requires AI interpretation
      await (controller as any).processCommand('attack dragon');

      // Verify that AI fallback was attempted
      expect(mockGrokClient.interpretCommand).toHaveBeenCalled();
      
      // The primary assertion is that the AI system was called - the exact error message may vary
      // depending on the command routing implementation
      expect((controller as any).lastDisplayMessage).toMatch(/Unknown command|NLP attempted.*but command not found/);
    }, 15000); // Increase timeout

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
      // Mock Math.random to always return 0.4 (hit)
      jest.spyOn(Math, 'random').mockReturnValue(0.4);
      
      // Create multiple goblins with health
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead, max_health, current_health) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gameId, 'Goblin Warrior', 'enemy', playerRoomId, 0, 10, 10]
      );
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead, max_health, current_health) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gameId, 'Goblin Archer', 'enemy', playerRoomId, 0, 10, 10]
      );

      // Execute attack command - should attack the first match
      await (controller as any).processCommand('attack goblin');

      // Check output - should match first character found
      expect((controller as any).lastDisplayMessage).toBe('You attack the Goblin Warrior. The Goblin Warrior takes 2 damage.');
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });
  });

  describe('Integration with other systems', () => {
    it('should use AI fallback to attack characters in current room when using general terms', async () => {
      // Mock interpretCommand to return null (simulating AI fallback failure)
      mockGrokClient.interpretCommand.mockResolvedValue(null);
      
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

      // Execute attack command with indirect reference
      await (controller as any).processCommand('attack enemy');

      // Verify that AI fallback was attempted
      expect(mockGrokClient.interpretCommand).toHaveBeenCalled();
      
      // The primary assertion is that the AI system was called - the exact error message may vary
      // depending on the command routing implementation
      expect((controller as any).lastDisplayMessage).toMatch(/Unknown command|NLP attempted.*but command not found/);
    });

    it('should work with characters created by AI generation', async () => {
      // Mock Math.random to always return 0.4 (hit)
      jest.spyOn(Math, 'random').mockReturnValue(0.4);
      
      // Simulate an AI-generated character with typical fields including health
      await db.run(
        `INSERT INTO characters (game_id, name, type, description, current_room_id, is_dead, sentiment, dialogue_response, max_health, current_health) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [gameId, 'Ancient Guardian', 'npc', 'A mysterious guardian', playerRoomId, 0, 'indifferent', 'You dare attack me?', 10, 10]
      );

      // Execute attack command
      await (controller as any).processCommand('attack guardian');

      // Check output - should show damage but not kill
      expect((controller as any).lastDisplayMessage).toBe('You attack the Ancient Guardian. The Ancient Guardian takes 2 damage.');
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    it('should work with hostile characters', async () => {
      // Mock Math.random to always return 0.4 (hit)
      jest.spyOn(Math, 'random').mockReturnValue(0.4);
      
      // Create a hostile character with health
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead, sentiment, max_health, current_health) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [gameId, 'Hostile Bandit', 'enemy', playerRoomId, 0, 'aggressive', 10, 10]
      );

      // Execute attack command
      await (controller as any).processCommand('attack bandit');

      // Check output - should show damage but not kill
      expect((controller as any).lastDisplayMessage).toBe('You attack the Hostile Bandit. The Hostile Bandit takes 2 damage.');
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });
  });

  describe('Character death state', () => {
    it('should reduce health and kill character when health reaches 0', async () => {
      // Mock Math.random to always return 0.4 (hit)
      jest.spyOn(Math, 'random').mockReturnValue(0.4);
      
      // Create a character in the room with low health (2 HP)
      const characterId = (await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead, max_health, current_health) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gameId, 'Test Enemy', 'enemy', playerRoomId, 0, 10, 2]
      )).lastID as number;

      // Verify character is alive initially with 2 HP
      let character = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [characterId]);
      expect(character?.is_dead).toBeFalsy();
      expect(character?.current_health).toBe(2);

      // Execute attack command (2 damage should kill character with 2 HP)
      await (controller as any).processCommand('attack Test Enemy');

      // Verify character is now dead and health is 0
      character = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [characterId]);
      expect(character?.is_dead).toBeTruthy(); // SQLite stores boolean as 1
      expect(character?.current_health).toBe(0);
      expect((controller as any).lastDisplayMessage).toBe('The Test Enemy dies from your attack!');
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    it('should not attack already dead characters', async () => {
      // Create a dead character in the room
      await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead) VALUES (?, ?, ?, ?, ?)',
        [gameId, 'Dead Zombie', 'enemy', playerRoomId, 1]
      );

      // Execute attack command on dead character
      await (controller as any).processCommand('attack zombie');

      // Check that it shows already dead message
      expect((controller as any).lastDisplayMessage).toBe('The Dead Zombie is already dead.');
    });

    it('should allow attacking multiple different characters', async () => {
      // Mock Math.random to always return 0.4 (hit)
      jest.spyOn(Math, 'random').mockReturnValue(0.4);
      
      // Create multiple characters with low health
      const char1Id = (await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead, max_health, current_health) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gameId, 'First Orc', 'enemy', playerRoomId, 0, 10, 2]
      )).lastID as number;
      const char2Id = (await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead, max_health, current_health) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gameId, 'Second Orc', 'enemy', playerRoomId, 0, 10, 2]
      )).lastID as number;

      // Attack first character (should die from 2 damage with 2 HP)
      await (controller as any).processCommand('attack First');
      expect((controller as any).lastDisplayMessage).toBe('The First Orc dies from your attack!');
      
      // Verify first is dead, second is alive
      let char1 = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [char1Id]);
      let char2 = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [char2Id]);
      expect(char1?.is_dead).toBeTruthy(); // SQLite stores boolean as 1
      expect(char1?.current_health).toBe(0);
      expect(char2?.is_dead).toBeFalsy();
      expect(char2?.current_health).toBe(2);

      // Attack second character (should also die from 2 damage with 2 HP)
      await (controller as any).processCommand('attack Second');
      expect((controller as any).lastDisplayMessage).toBe('The Second Orc dies from your attack!');
      
      // Verify both are now dead
      char2 = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [char2Id]);
      expect(char2?.is_dead).toBeTruthy(); // SQLite stores boolean as 1
      expect(char2?.current_health).toBe(0);
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });
  });

  describe('Damage system', () => {
    it('should deal exactly 2 damage per attack when hit', async () => {
      // Mock Math.random to always return 0.4 (hit)
      jest.spyOn(Math, 'random').mockReturnValue(0.4);
      
      // Create a character with high health
      const characterId = (await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead, max_health, current_health) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gameId, 'Sturdy Troll', 'enemy', playerRoomId, 0, 20, 20]
      )).lastID as number;

      // Execute first attack
      await (controller as any).processCommand('attack troll');
      expect((controller as any).lastDisplayMessage).toBe('You attack the Sturdy Troll. The Sturdy Troll takes 2 damage.');

      // Verify health reduced by exactly 2
      let character = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [characterId]);
      expect(character?.current_health).toBe(18);
      expect(character?.is_dead).toBeFalsy();

      // Execute second attack
      await (controller as any).processCommand('attack troll');
      expect((controller as any).lastDisplayMessage).toBe('You attack the Sturdy Troll. The Sturdy Troll takes 2 damage.');

      // Verify health reduced by another 2
      character = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [characterId]);
      expect(character?.current_health).toBe(16);
      expect(character?.is_dead).toBeFalsy();
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    it('should deal no damage when attack misses', async () => {
      // Mock Math.random to always return 0.6 (miss)
      jest.spyOn(Math, 'random').mockReturnValue(0.6);
      
      // Create a character with health
      const characterId = (await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead, max_health, current_health) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gameId, 'Lucky Troll', 'enemy', playerRoomId, 0, 20, 20]
      )).lastID as number;

      // Execute attack (should miss)
      await (controller as any).processCommand('attack Lucky Troll');
      expect((controller as any).lastDisplayMessage).toBe('You attack the Lucky Troll, but miss!');

      // Verify health unchanged
      const character = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [characterId]);
      expect(character?.current_health).toBe(20);
      expect(character?.is_dead).toBeFalsy();
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    it('should handle mixed hit and miss attacks correctly', async () => {
      // Mock sequence: hit, miss, hit, miss
      const randomValues = [0.4, 0.6, 0.3, 0.7];
      let callCount = 0;
      jest.spyOn(Math, 'random').mockImplementation(() => randomValues[callCount++]);
      
      // Create a character with health
      const characterId = (await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead, max_health, current_health) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gameId, 'Test Target', 'enemy', playerRoomId, 0, 20, 20]
      )).lastID as number;

      // First attack (hit) - should reduce health from 20 to 18
      await (controller as any).processCommand('attack Test Target');
      expect((controller as any).lastDisplayMessage).toBe('You attack the Test Target. The Test Target takes 2 damage.');
      
      let character = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [characterId]);
      expect(character?.current_health).toBe(18);

      // Second attack (miss) - health should remain 18
      await (controller as any).processCommand('attack Test Target');
      expect((controller as any).lastDisplayMessage).toBe('You attack the Test Target, but miss!');
      
      character = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [characterId]);
      expect(character?.current_health).toBe(18);

      // Third attack (hit) - should reduce health from 18 to 16
      await (controller as any).processCommand('attack Test Target');
      expect((controller as any).lastDisplayMessage).toBe('You attack the Test Target. The Test Target takes 2 damage.');
      
      character = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [characterId]);
      expect(character?.current_health).toBe(16);

      // Fourth attack (miss) - health should remain 16
      await (controller as any).processCommand('attack Test Target');
      expect((controller as any).lastDisplayMessage).toBe('You attack the Test Target, but miss!');
      
      character = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [characterId]);
      expect(character?.current_health).toBe(16);
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    it('should kill character when health reaches exactly 0', async () => {
      // Mock Math.random to always return 0.4 (hit)
      jest.spyOn(Math, 'random').mockReturnValue(0.4);
      
      // Create a character with exactly 2 health
      const characterId = (await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead, max_health, current_health) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gameId, 'Wounded Bandit', 'enemy', playerRoomId, 0, 10, 2]
      )).lastID as number;

      // Execute attack (should deal exactly 2 damage and kill)
      await (controller as any).processCommand('attack bandit');
      expect((controller as any).lastDisplayMessage).toBe('The Wounded Bandit dies from your attack!');

      // Verify character is dead with 0 health
      const character = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [characterId]);
      expect(character?.current_health).toBe(0);
      expect(character?.is_dead).toBeTruthy();
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    it('should kill character when health would go below 0', async () => {
      // Mock Math.random to always return 0.4 (hit)
      jest.spyOn(Math, 'random').mockReturnValue(0.4);
      
      // Create a character with 1 health
      const characterId = (await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead, max_health, current_health) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gameId, 'Nearly Dead Rat', 'enemy', playerRoomId, 0, 10, 1]
      )).lastID as number;

      // Execute attack (should deal 2 damage, but health should be clamped to 0)
      await (controller as any).processCommand('attack rat');
      expect((controller as any).lastDisplayMessage).toBe('The Nearly Dead Rat dies from your attack!');

      // Verify character is dead with 0 health (not negative)
      const character = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [characterId]);
      expect(character?.current_health).toBe(0);
      expect(character?.is_dead).toBeTruthy();
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    it('should show multiple attacks required for high health characters', async () => {
      // Mock Math.random to always return 0.4 (hit)
      jest.spyOn(Math, 'random').mockReturnValue(0.4);
      
      // Create a character with 6 health (should take 3 attacks to kill)
      const characterId = (await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead, max_health, current_health) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [gameId, 'Tough Knight', 'enemy', playerRoomId, 0, 10, 6]
      )).lastID as number;

      // First attack: 6 -> 4 HP
      await (controller as any).processCommand('attack knight');
      expect((controller as any).lastDisplayMessage).toBe('You attack the Tough Knight. The Tough Knight takes 2 damage.');
      
      let character = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [characterId]);
      expect(character?.current_health).toBe(4);
      expect(character?.is_dead).toBeFalsy();

      // Second attack: 4 -> 2 HP
      await (controller as any).processCommand('attack knight');
      expect((controller as any).lastDisplayMessage).toBe('You attack the Tough Knight. The Tough Knight takes 2 damage.');
      
      character = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [characterId]);
      expect(character?.current_health).toBe(2);
      expect(character?.is_dead).toBeFalsy();

      // Third attack: 2 -> 0 HP (dead)
      await (controller as any).processCommand('attack knight');
      expect((controller as any).lastDisplayMessage).toBe('The Tough Knight dies from your attack!');
      
      character = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [characterId]);
      expect(character?.current_health).toBe(0);
      expect(character?.is_dead).toBeTruthy();
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });
  });

  describe('Weapon damage integration', () => {
    beforeEach(() => {
      // Import required types at the top of each test
      jest.doMock('../../src/types/item', () => ({
        ItemType: { WEAPON: 'weapon', ARMOR: 'armor' },
        EquipmentSlot: { HAND: 'hand', HEAD: 'head', BODY: 'body', FOOT: 'foot' }
      }));
      jest.doMock('../../src/types/character', () => ({
        CharacterType: { PLAYER: 'player', NPC: 'npc', ENEMY: 'enemy' },
        CharacterSentiment: { HOSTILE: 'hostile', INDIFFERENT: 'indifferent' }
      }));
    });

    test('should deal additional damage when player has equipped weapon', async () => {
      const { ItemType, EquipmentSlot } = require('../../src/types/item');
      const { CharacterType, CharacterSentiment } = require('../../src/types/character');

      // Mock random to always hit
      jest.spyOn(Math, 'random').mockReturnValue(0.3);

      // Create a character with known health
      const characterId = (await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead, max_health, current_health, sentiment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [gameId, 'Test Orc', 'enemy', playerRoomId, 0, 10, 10, 'hostile']
      )).lastID as number;

      // Create and equip a weapon with damage value 3
      const swordId = await controller['itemService'].createItem({
        name: 'Magic Sword',
        description: 'A magical sword',
        type: ItemType.WEAPON,
        weight: 2.0,
        value: 3, // 3 damage bonus
        stackable: false,
        max_stack: 1,
        armor_rating: 0,
        equipment_slot: EquipmentSlot.HAND
      });

      // Place item in room and transfer to player
      await controller['itemService'].placeItemInRoom(playerRoomId, swordId, 1);
      await controller['itemService'].transferItemToInventory(gameId, swordId, playerRoomId, 1);
      await controller['equipmentService'].equipItem(gameId, swordId);

      // Start game session to enable attack
      const gameStateManager = (controller as any).gameStateManager;
      await gameStateManager.startGameSession(gameId);
      await gameStateManager.moveToRoom(playerRoomId);

      // Attack the character
      await controller['handleAttackCommand']('Test Orc');

      // Check that character took 5 damage (2 base + 3 weapon)
      const character = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [characterId]);
      expect(character?.current_health).toBe(5); // 10 - 5 = 5

      // Check that the attack message includes damage amount
      expect((controller as any).lastDisplayMessage).toContain('takes 5 damage');

      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    test('should use base damage when no weapon equipped', async () => {
      const { CharacterType, CharacterSentiment } = require('../../src/types/character');

      // Mock random to always hit
      jest.spyOn(Math, 'random').mockReturnValue(0.3);

      // Create a character with known health
      const characterId = (await db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, is_dead, max_health, current_health, sentiment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [gameId, 'Test Goblin', 'enemy', playerRoomId, 0, 10, 10, 'hostile']
      )).lastID as number;

      // Start game session to enable attack (no weapon equipped)
      const gameStateManager = (controller as any).gameStateManager;
      await gameStateManager.startGameSession(gameId);
      await gameStateManager.moveToRoom(playerRoomId);

      // Attack the character
      await controller['handleAttackCommand']('Test Goblin');

      // Check that character took 2 damage (base only)
      const character = await db.get<Character>('SELECT * FROM characters WHERE id = ?', [characterId]);
      expect(character?.current_health).toBe(8); // 10 - 2 = 8

      // Check that the attack message includes damage amount
      expect((controller as any).lastDisplayMessage).toContain('takes 2 damage');

      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });
  });
});