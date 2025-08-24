/**
 * Attack Shortcut End-to-End Tests
 * 
 * End-to-end tests for the "a" shortcut command that test the complete
 * user workflow including auto-targeting and manual targeting scenarios.
 */

import Database from '../../src/utils/database';
import { createGameWithRooms } from '../../src/utils/initDb';
import { initializeTestDatabase } from '../testUtils';
import { GameController } from '../../src/gameController';
import { GrokClient } from '../../src/ai/grokClient';
import { CharacterType, CharacterSentiment } from '../../src/types/character';
import { TUIInterface } from '../../src/ui/TUIInterface';
import { MessageType } from '../../src/ui/MessageFormatter';

// Mock the GrokClient
jest.mock('../../src/ai/grokClient');

describe('Attack Shortcut E2E Tests', () => {
  let db: Database;
  let controller: GameController;
  let mockGrokClient: jest.Mocked<GrokClient>;
  let gameId: number;
  let startingRoomId: number;
  let displayMessages: string[] = [];
  
  // Mock TUI that captures all display messages
  const mockTUI: TUIInterface = {
    initialize: jest.fn().mockResolvedValue(undefined),
    display: jest.fn((message: string, type?: MessageType) => {
      displayMessages.push(message);
    }),
    displayLines: jest.fn((lines: string[], type?: MessageType) => {
      displayMessages.push(...lines);
    }),
    getInput: jest.fn().mockResolvedValue(''),
    updateStatus: jest.fn(),
    setStatus: jest.fn(),
    clear: jest.fn(),
    destroy: jest.fn(),
    setPrompt: jest.fn(),
    showWelcome: jest.fn(),
    showError: jest.fn((title: string, message?: string) => {
      displayMessages.push(`ERROR: ${title}${message ? ': ' + message : ''}`);
    }),
    showAIProgress: jest.fn(),
    displayRoom: jest.fn()
  };

  beforeEach(async () => {
    // Reset display messages
    displayMessages = [];
    
    // Setup environment
    process.env.USE_PRISMA = 'false';
    process.env.NODE_ENV = 'test';
    process.env.AI_MOCK_MODE = 'true';
    process.env.DISABLE_ENEMY_ATTACKS = 'true';
    
    // Setup GrokClient mock
    mockGrokClient = {
      interpretCommand: jest.fn().mockResolvedValue({
        intent: 'unknown',
        extractedInfo: {},
        explanation: 'Could not interpret command'
      }),
      isMockMode: true,
      getUsageStats: jest.fn().mockReturnValue({
        tokensUsed: { input: 0, output: 0, cost: 0 },
        estimatedCost: '$0.0000'
      }),
      setMockMode: jest.fn(),
      setLoggerService: jest.fn(),
      cleanup: jest.fn()
    } as any;
    
    (GrokClient as jest.MockedClass<typeof GrokClient>).mockImplementation(() => mockGrokClient);
    
    // Setup database
    db = new Database(':memory:');
    await db.connect();
    await initializeTestDatabase(db);
    
    // Create game
    const uniqueGameName = `E2E Attack Test ${Date.now()}-${Math.random()}`;
    gameId = await createGameWithRooms(db, uniqueGameName);
    
    // Get starting room
    const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
    startingRoomId = rooms.find(room => room.name === 'Starting Room')?.id || rooms[0]?.id;
    
    // Create controller and start game session
    controller = new GameController(db, undefined, mockTUI);
    
    // Start game session using gameStateManager
    const gameStateManager = (controller as any).gameStateManager;
    await gameStateManager.startGameSession(gameId);
    await gameStateManager.moveToRoom(startingRoomId);
  });

  afterEach(async () => {
    if (controller) {
      await controller.cleanup();
      controller.removeEventListeners();
    }
    if (db) {
      await db.close();
    }
    
    // Clean up environment
    delete process.env.AI_MOCK_MODE;
    delete process.env.DISABLE_ENEMY_ATTACKS;
  });

  const createCharacterInRoom = async (
    name: string,
    sentiment: CharacterSentiment = CharacterSentiment.HOSTILE,
    health: number = 10
  ): Promise<number> => {
    const result = await db.run(
      'INSERT INTO characters (name, type, sentiment, current_health, max_health, is_dead, current_room_id, game_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, CharacterType.ENEMY, sentiment, health, health, false, startingRoomId, gameId]
    );
    return result.lastID!;
  };

  const getLastDisplayMessage = (): string => {
    return displayMessages[displayMessages.length - 1] || '';
  };

  const getAllDisplayMessages = (): string => {
    return displayMessages.join('\n');
  };

  describe('Single Target Auto-Attack Workflow', () => {
    test('should complete full attack workflow with single hostile target', async () => {
      // Mock Math.random to ensure hit
      jest.spyOn(Math, 'random').mockReturnValue(0.9); // Will hit (needs >= 0.5)
      
      // Setup: Create a single hostile goblin
      await createCharacterInRoom('Fierce Goblin', CharacterSentiment.HOSTILE, 8);
      
      // Action: Use "a" shortcut command
      await (controller as any).processCommand('a');
      
      // Verification: Check that attack was executed automatically
      const allMessages = getAllDisplayMessages();
      expect(allMessages).toContain('You attack the Fierce Goblin');
      expect(allMessages).toMatch(/takes \d+ damage/);
      
      // Verify character health was reduced
      const character = await db.get('SELECT current_health FROM characters WHERE name = ?', ['Fierce Goblin']);
      expect(character.current_health).toBeLessThan(8);
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });

    test('should handle character death in auto-attack workflow', async () => {
      // Mock Math.random to ensure hit
      jest.spyOn(Math, 'random').mockReturnValue(0.9); // Will hit (needs >= 0.5)
      
      // Setup: Create a weak hostile character
      await createCharacterInRoom('Weak Bandit', CharacterSentiment.HOSTILE, 1);
      
      // Action: Use "a" command
      await (controller as any).processCommand('a');
      
      // Verification: Check for death message
      const allMessages = getAllDisplayMessages();
      expect(allMessages).toContain('The Weak Bandit dies from your attack!');
      
      // Verify character is marked as dead
      const character = await db.get('SELECT is_dead FROM characters WHERE name = ?', ['Weak Bandit']);
      expect(character.is_dead).toBeTruthy(); // SQLite returns 1 for true
      
      // Restore Math.random
      (Math.random as jest.Mock).mockRestore();
    });
  });

  describe('Multiple Targets Workflow', () => {
    test('should prompt user when multiple hostile targets available', async () => {
      // Setup: Create multiple hostile characters
      await createCharacterInRoom('Goblin Scout', CharacterSentiment.HOSTILE);
      await createCharacterInRoom('Orc Warrior', CharacterSentiment.AGGRESSIVE);
      
      // Action: Use "a" command without target
      await (controller as any).processCommand('a');
      
      // Verification: Should get multiple targets message
      const lastMessage = getLastDisplayMessage();
      expect(lastMessage).toBe('Multiple targets available. Please specify: attack [character name]');
    });

    test('should handle manual targeting after multiple targets prompt', async () => {
      // Setup: Create multiple hostile characters
      await createCharacterInRoom('Goblin Alpha', CharacterSentiment.HOSTILE);
      await createCharacterInRoom('Orc Chieftain', CharacterSentiment.AGGRESSIVE);
      
      // Action: Use "a" with specific target
      await (controller as any).processCommand('a goblin alpha');
      
      // Verification: Should attack the specified target
      const allMessages = getAllDisplayMessages();
      expect(allMessages).toContain('You attack the Goblin Alpha');
    });
  });

  describe('No Targets Workflow', () => {
    test('should handle empty room gracefully', async () => {
      // Action: Use "a" command in room with no characters
      await (controller as any).processCommand('a');
      
      // Verification: Should get appropriate message
      const lastMessage = getLastDisplayMessage();
      expect(lastMessage).toBe("There's nothing to attack here.");
    });

    test('should handle room with only friendly characters', async () => {
      // Setup: Create only friendly characters
      await createCharacterInRoom('Helpful Merchant', CharacterSentiment.FRIENDLY);
      await createCharacterInRoom('Village Elder', CharacterSentiment.INDIFFERENT);
      
      // Action: Use "a" command
      await (controller as any).processCommand('a');
      
      // Verification: Should get nothing to attack message
      const lastMessage = getLastDisplayMessage();
      expect(lastMessage).toBe("There's nothing to attack here.");
    });

    test('should handle room with only dead hostile characters', async () => {
      // Setup: Create dead hostile character
      const deadGoblinId = await createCharacterInRoom('Dead Goblin', CharacterSentiment.HOSTILE, 0);
      await db.run('UPDATE characters SET is_dead = true WHERE id = ?', [deadGoblinId]);
      
      // Action: Use "a" command
      await (controller as any).processCommand('a');
      
      // Verification: Should treat as no targets available
      const lastMessage = getLastDisplayMessage();
      expect(lastMessage).toBe("There's nothing to attack here.");
    });
  });

  describe('Mixed Scenarios Workflow', () => {
    test('should ignore non-hostile characters in auto-targeting', async () => {
      // Setup: Create mix of characters with only one hostile
      await createCharacterInRoom('Friendly Guard', CharacterSentiment.FRIENDLY);
      await createCharacterInRoom('Neutral Trader', CharacterSentiment.INDIFFERENT);
      await createCharacterInRoom('Aggressive Wolf', CharacterSentiment.AGGRESSIVE);
      
      // Action: Use "a" command
      await (controller as any).processCommand('a');
      
      // Verification: Should auto-target the aggressive wolf
      const allMessages = getAllDisplayMessages();
      expect(allMessages).toContain('You attack the Aggressive Wolf');
    });

    test('should ignore dead characters in auto-targeting with living options', async () => {
      // Setup: Create mix of living and dead hostile characters
      await createCharacterInRoom('Living Orc', CharacterSentiment.HOSTILE);
      
      const deadTrollId = await createCharacterInRoom('Dead Troll', CharacterSentiment.HOSTILE, 0);
      await db.run('UPDATE characters SET is_dead = true WHERE id = ?', [deadTrollId]);
      
      // Action: Use "a" command
      await (controller as any).processCommand('a');
      
      // Verification: Should auto-target living orc, not dead troll
      const allMessages = getAllDisplayMessages();
      expect(allMessages).toContain('You attack the Living Orc');
      expect(allMessages).not.toContain('Dead Troll');
    });
  });

  describe('Command Equivalence', () => {
    test('should work identically to "attack" command when target specified', async () => {
      // Setup: Create a test character
      await createCharacterInRoom('Test Dummy', CharacterSentiment.HOSTILE);
      
      // Clear previous messages
      displayMessages = [];
      
      // Action: Use "a test dummy" command
      await (controller as any).processCommand('a test dummy');
      const aCommandMessages = [...displayMessages];
      
      // Reset and test "attack test dummy"
      displayMessages = [];
      
      // Restore character health for fair comparison
      await db.run('UPDATE characters SET current_health = 10, max_health = 10 WHERE name = ?', ['Test Dummy']);
      
      await (controller as any).processCommand('attack test dummy');
      const attackCommandMessages = [...displayMessages];
      
      // Verification: Should produce similar results (accounting for randomized damage)
      const aAttackMessage = aCommandMessages.find(msg => msg.includes('You attack the Test Dummy'));
      const attackAttackMessage = attackCommandMessages.find(msg => msg.includes('You attack the Test Dummy'));
      
      expect(aAttackMessage).toBeTruthy();
      expect(attackAttackMessage).toBeTruthy();
    });
  });
});
