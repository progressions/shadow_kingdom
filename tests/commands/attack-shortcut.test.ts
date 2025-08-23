/**
 * Attack Shortcut Command Tests
 * 
 * Tests for the "a" shortcut alias for the attack command,
 * including auto-targeting of hostile characters.
 */

import Database from '../../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import { GameController } from '../../src/gameController';
import { GrokClient } from '../../src/ai/grokClient';
import { Character, CharacterType, CharacterSentiment } from '../../src/types/character';
import * as readline from 'readline';

// Mock the GrokClient
jest.mock('../../src/ai/grokClient');

describe('Attack Shortcut Command', () => {
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
    process.env.DISABLE_ENEMY_ATTACKS = 'true'; // Disable enemy attacks for these tests
    
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
    
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    // Create a unique game name for this test
    const uniqueGameName = `Attack Shortcut Test ${Date.now()}-${Math.random()}`;
    gameId = await createGameWithRooms(db, uniqueGameName);
    
    // Get the starting room ID
    const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
    playerRoomId = rooms.find(room => room.name === 'Starting Room')?.id || rooms[0]?.id;
    
    if (!playerRoomId) {
      throw new Error('No starting room found in test setup');
    }
    
    // Create mock readline interface
    mockRl = {
      question: jest.fn(),
      close: jest.fn()
    } as any;
    
    controller = new GameController(db, undefined, {
      display: jest.fn(),
      showError: jest.fn(),
      clear: jest.fn(),
      askQuestion: jest.fn()
    } as any);
    
    // Start game session using gameStateManager
    const gameStateManager = (controller as any).gameStateManager;
    await gameStateManager.startGameSession(gameId);
    await gameStateManager.moveToRoom(playerRoomId);
    
    // Spy on controller output
    outputSpy = jest.spyOn(controller['tui'], 'display');
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

  const createCharacterInRoom = async (
    name: string, 
    roomId: number, 
    sentiment: CharacterSentiment = CharacterSentiment.HOSTILE,
    health: number = 10
  ): Promise<number> => {
    const result = await db.run(
      'INSERT INTO characters (name, type, sentiment, current_health, max_health, is_dead, current_room_id, game_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, CharacterType.ENEMY, sentiment, health, health, false, roomId, gameId]
    );
    return result.lastID!;
  };

  describe('Command Alias Registration', () => {
    test('should register "a" as alias for attack command', async () => {
      const commandRouter = controller['commandRouter'];
      const commands = commandRouter.getCommands();
      
      expect(commands.has('a')).toBe(true);
      expect(commands.has('attack')).toBe(true);
    });
  });

  describe('Auto-targeting Logic', () => {
    test('should auto-target single hostile character', async () => {
      // Create a single hostile character
      const goblinId = await createCharacterInRoom('Goblin', playerRoomId, CharacterSentiment.HOSTILE);
      
      // Execute "a" command without arguments
      await (controller as any).processCommand('a');
      
      // Check that attack was executed on the goblin
      expect(outputSpy).toHaveBeenCalledWith(
        expect.stringContaining('You attack the Goblin'),
        expect.any(String)
      );
    });

    test('should show "nothing to attack" message when no hostile characters', async () => {
      // Create only friendly characters
      await createCharacterInRoom('Friendly Merchant', playerRoomId, CharacterSentiment.FRIENDLY);
      
      // Execute "a" command without arguments
      await (controller as any).processCommand('a');
      
      // Check for appropriate message
      expect(outputSpy).toHaveBeenCalledWith(
        "There's nothing to attack here.",
        expect.any(String)
      );
    });

    test('should prompt for target when multiple hostile characters present', async () => {
      // Create multiple hostile characters
      await createCharacterInRoom('Goblin Warrior', playerRoomId, CharacterSentiment.HOSTILE);
      await createCharacterInRoom('Orc Brute', playerRoomId, CharacterSentiment.AGGRESSIVE);
      
      // Execute "a" command without arguments
      await (controller as any).processCommand('a');
      
      // Check for multiple targets message
      expect(outputSpy).toHaveBeenCalledWith(
        'Multiple targets available. Please specify: attack [character name]',
        expect.any(String)
      );
    });

    test('should ignore dead hostile characters in auto-targeting', async () => {
      // Create one living hostile and one dead hostile character
      await createCharacterInRoom('Living Goblin', playerRoomId, CharacterSentiment.HOSTILE, 10);
      
      const deadGoblinId = await createCharacterInRoom('Dead Goblin', playerRoomId, CharacterSentiment.HOSTILE, 0);
      await db.run('UPDATE characters SET is_dead = true WHERE id = ?', [deadGoblinId]);
      
      // Execute "a" command without arguments
      await (controller as any).processCommand('a');
      
      // Should auto-target the living goblin, not prompt for multiple targets
      expect(outputSpy).toHaveBeenCalledWith(
        expect.stringContaining('You attack the Living Goblin'),
        expect.any(String)
      );
    });

    test('should only consider hostile and aggressive characters for auto-targeting', async () => {
      // Create characters with different sentiments
      await createCharacterInRoom('Friendly NPC', playerRoomId, CharacterSentiment.FRIENDLY);
      await createCharacterInRoom('Neutral Guard', playerRoomId, CharacterSentiment.INDIFFERENT);
      await createCharacterInRoom('Hostile Goblin', playerRoomId, CharacterSentiment.HOSTILE);
      
      // Execute "a" command without arguments
      await (controller as any).processCommand('a');
      
      // Should auto-target only the hostile goblin
      expect(outputSpy).toHaveBeenCalledWith(
        expect.stringContaining('You attack the Hostile Goblin'),
        expect.any(String)
      );
    });
  });

  describe('Manual Targeting with "a" Command', () => {
    test('should work identically to "attack" when target specified', async () => {
      // Create a hostile character
      const goblinId = await createCharacterInRoom('Test Goblin', playerRoomId, CharacterSentiment.HOSTILE);
      
      // Execute "a goblin" command
      await (controller as any).processCommand('a test goblin');
      
      // Check that attack was executed
      expect(outputSpy).toHaveBeenCalledWith(
        expect.stringContaining('You attack the Test Goblin'),
        expect.any(String)
      );
    });

    test('should handle character not found with manual targeting', async () => {
      // Execute "a nonexistent" command
      await (controller as any).processCommand('a nonexistent');
      
      // Should fall back to AI system for interpretation
      expect(mockGrokClient.interpretCommand).toHaveBeenCalled();
    });
  });

  describe('Integration with Combat Mechanics', () => {
    test('should use existing combat mechanics for damage and hit chance', async () => {
      // Mock Math.random to ensure hit
      jest.spyOn(Math, 'random').mockReturnValue(0.9); // Will hit (needs >= 0.5)
      
      // Create a hostile character with known health
      const goblinId = await createCharacterInRoom('Combat Goblin', playerRoomId, CharacterSentiment.HOSTILE, 5);
      
      // Execute "a" command
      await (controller as any).processCommand('a');
      
      // Check that combat mechanics were used (damage message should appear)
      const attackMessage = outputSpy.mock.calls.find(call => 
        call[0].includes('You attack the Combat Goblin')
      );
      expect(attackMessage).toBeTruthy();
      expect(attackMessage[0]).toMatch(/takes \d+ damage/);
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    test('should handle character death in auto-attack', async () => {
      // Mock Math.random to ensure hit
      jest.spyOn(Math, 'random').mockReturnValue(0.9); // Will hit (needs >= 0.5)
      
      // Create a character with low health
      const goblinId = await createCharacterInRoom('Weak Goblin', playerRoomId, CharacterSentiment.HOSTILE, 1);
      
      // Execute "a" command
      await (controller as any).processCommand('a');
      
      // Check for death message
      expect(outputSpy).toHaveBeenCalledWith(
        expect.stringContaining('The Weak Goblin dies from your attack!'),
        expect.any(String)
      );
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    test('should update character sentiment to hostile after successful attack', async () => {
      // Mock Math.random to ensure hit
      jest.spyOn(Math, 'random').mockReturnValue(0.9); // Will hit (needs >= 0.5)
      
      // Create a neutral character (that can still be attacked manually)
      const merchantId = await createCharacterInRoom('Neutral Merchant', playerRoomId, CharacterSentiment.INDIFFERENT);
      
      // Execute manual attack using the exact character name
      await (controller as any).processCommand('a Neutral Merchant');
      
      // Check that character sentiment was updated to hostile
      const character = await db.get('SELECT sentiment FROM characters WHERE id = ?', [merchantId]);
      expect(character.sentiment).toBe(CharacterSentiment.HOSTILE);
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });
  });

  describe('Edge Cases', () => {
    test('should handle no characters in room', async () => {
      // Execute "a" command in empty room
      await (controller as any).processCommand('a');
      
      // Check for appropriate message
      expect(outputSpy).toHaveBeenCalledWith(
        "There's nothing to attack here.",
        expect.any(String)
      );
    });

    test('should handle room with only dead characters', async () => {
      // Create only dead characters
      const deadGoblinId = await createCharacterInRoom('Dead Goblin', playerRoomId, CharacterSentiment.HOSTILE, 0);
      await db.run('UPDATE characters SET is_dead = true WHERE id = ?', [deadGoblinId]);
      
      // Execute "a" command
      await (controller as any).processCommand('a');
      
      // Check for nothing to attack message
      expect(outputSpy).toHaveBeenCalledWith(
        "There's nothing to attack here.",
        expect.any(String)
      );
    });
  });
});