import Database from '../../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import { GameController } from '../../src/gameController';
import { CharacterService } from '../../src/services/characterService';
import { GrokClient } from '../../src/ai/grokClient';
import { CharacterSentiment } from '../../src/types/character';
import * as readline from 'readline';

// Mock the GrokClient
jest.mock('../../src/ai/grokClient');

describe('Enemy Attack System', () => {
  let db: Database;
  let controller: GameController;
  let characterService: CharacterService;
  let mockRl: readline.Interface;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let outputSpy: jest.SpyInstance;
  let mockGrokClient: jest.Mocked<GrokClient>;
  let gameId: number;
  let roomId: number;
  let playerId: number;
  let hostileEnemyId: number;
  let aggressiveEnemyId: number;
  let friendlyCharacterId: number;

  beforeEach(async () => {
    // Set test environment to prevent real AI calls
    process.env.USE_PRISMA = 'false';
    process.env.NODE_ENV = 'test';
    process.env.AI_MOCK_MODE = 'true';
    process.env.AI_DEBUG_LOGGING = 'false';

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

    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);

    // Create a unique test game
    const uniqueGameName = `Enemy Attack Test ${Date.now()}-${Math.random()}`;
    gameId = await createGameWithRooms(db, uniqueGameName);

    // Get the starting room ID  
    const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
    roomId = rooms[0].id;

    characterService = new CharacterService(db);

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
    await gameStateManager.moveToRoom(roomId);

    // Get player character (should be created automatically by game session)
    const playerCharacters = await db.all('SELECT * FROM characters WHERE game_id = ? AND type = ?', [gameId, 'player']);
    if (playerCharacters.length > 0) {
      playerId = playerCharacters[0].id;
      // Initialize player health properly (constitution = 15 gives max_health = 15)
      await db.run('UPDATE characters SET max_health = ?, current_health = ?, constitution = ? WHERE id = ?', [15, 15, 15, playerId]);
    } else {
      // Create player character manually if not created
      const playerResult = await db.run(`
        INSERT INTO characters (game_id, name, type, current_room_id, max_health, current_health, constitution) 
        VALUES (?, 'Test Player', 'player', ?, 15, 15, 15)
      `, [gameId, roomId]);
      playerId = playerResult.lastID as number;
    }

    // Create hostile enemy
    const hostileResult = await db.run(`
      INSERT INTO characters (game_id, name, type, current_room_id, sentiment, max_health, current_health, is_dead) 
      VALUES (?, 'Hostile Bandit', 'enemy', ?, 'hostile', 10, 10, false)
    `, [gameId, roomId]);
    hostileEnemyId = hostileResult.lastID as number;

    // Create aggressive enemy
    const aggressiveResult = await db.run(`
      INSERT INTO characters (game_id, name, type, current_room_id, sentiment, max_health, current_health, is_dead) 
      VALUES (?, 'Aggressive Guard', 'enemy', ?, 'aggressive', 12, 12, false)
    `, [gameId, roomId]);
    aggressiveEnemyId = aggressiveResult.lastID as number;

    // Create friendly character (should not attack)
    const friendlyResult = await db.run(`
      INSERT INTO characters (game_id, name, type, current_room_id, sentiment, max_health, current_health, is_dead) 
      VALUES (?, 'Kind Merchant', 'npc', ?, 'friendly', 8, 8, false)
    `, [gameId, roomId]);
    friendlyCharacterId = friendlyResult.lastID as number;

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
  });

  describe('Basic Enemy Attack Mechanics', () => {
    test('hostile enemies should attack player after each turn', async () => {
      // Verify initial player health
      const initialHealth = await characterService.getCharacterHealth(playerId);
      expect(initialHealth?.current).toBe(15);

      // Execute any player command (triggers enemy attacks)
      await (controller as any).processCommand('look');

      // Verify player took damage from both hostile and aggressive enemies  
      const afterHealth = await characterService.getCharacterHealth(playerId);
      expect(afterHealth?.current).toBe(11); // 15 - 4 damage = 11 (hostile + aggressive)
    });

    test('multiple hostile enemies should each attack once per turn', async () => {
      // Create another hostile enemy
      await db.run(`
        INSERT INTO characters (game_id, name, type, current_room_id, sentiment, max_health, current_health, is_dead) 
        VALUES (?, 'Second Bandit', 'enemy', ?, 'hostile', 8, 8, false)
      `, [gameId, roomId]);

      const initialHealth = await characterService.getCharacterHealth(playerId);
      expect(initialHealth?.current).toBe(15);

      // Execute player command
      await (controller as any).processCommand('look');

      // Should take 6 damage (2 hostile + 1 aggressive = 3 enemies × 2 damage each)
      const afterHealth = await characterService.getCharacterHealth(playerId);
      expect(afterHealth?.current).toBe(9); // 15 - 6 = 9
    });

    test('aggressive enemies should attack player', async () => {
      // Set hostile enemy to dead so only aggressive attacks
      await characterService.setCharacterDead(hostileEnemyId);

      const initialHealth = await characterService.getCharacterHealth(playerId);
      expect(initialHealth?.current).toBe(15);

      await (controller as any).processCommand('look');

      // Should take 2 damage from aggressive enemy
      const afterHealth = await characterService.getCharacterHealth(playerId);
      expect(afterHealth?.current).toBe(13);
    });

    test('friendly and neutral characters should not attack', async () => {
      // Set both hostile and aggressive enemies to dead
      await characterService.setCharacterDead(hostileEnemyId);
      await characterService.setCharacterDead(aggressiveEnemyId);

      const initialHealth = await characterService.getCharacterHealth(playerId);
      expect(initialHealth?.current).toBe(15);

      await (controller as any).processCommand('look');

      // Should take no damage (only friendly character remains)
      const afterHealth = await characterService.getCharacterHealth(playerId);
      expect(afterHealth?.current).toBe(15);
    });

    test('dead enemies should not attack', async () => {
      // Kill the hostile enemy
      await characterService.setCharacterDead(hostileEnemyId);

      const initialHealth = await characterService.getCharacterHealth(playerId);
      expect(initialHealth?.current).toBe(15);

      await (controller as any).processCommand('look');

      // Should only take 2 damage from aggressive enemy, not 4
      const afterHealth = await characterService.getCharacterHealth(playerId);
      expect(afterHealth?.current).toBe(13);
    });
  });

  describe('Player Death Scenarios', () => {
    test('should handle player death when health reaches 0', async () => {
      // Set player to very low health
      await characterService.updateCharacterHealth(playerId, 2);

      const beforeHealth = await characterService.getCharacterHealth(playerId);
      expect(beforeHealth?.current).toBe(2);

      // Execute command - hostile enemy should attack for 2 damage
      await (controller as any).processCommand('look');

      // Player should be at 0 health (and marked as dead)
      const afterHealth = await characterService.getCharacterHealth(playerId);
      expect(afterHealth?.current).toBe(0);

      // Verify player is marked as dead (SQLite stores boolean as 1)
      const player = await characterService.getCharacter(playerId);
      expect(player?.is_dead).toBeTruthy();
    });

    test('should handle player death when multiple enemies attack', async () => {
      // Create another hostile enemy
      await db.run(`
        INSERT INTO characters (game_id, name, type, current_room_id, sentiment, max_health, current_health, is_dead) 
        VALUES (?, 'Third Bandit', 'enemy', ?, 'hostile', 6, 6, false)
      `, [gameId, roomId]);

      // Set player to low health that will be killed by combined attacks
      await characterService.updateCharacterHealth(playerId, 3);

      await (controller as any).processCommand('look');

      // Player should be dead (took 4+ damage from multiple enemies)
      const afterHealth = await characterService.getCharacterHealth(playerId);
      expect(afterHealth?.current).toBe(0);

      const player = await characterService.getCharacter(playerId);
      expect(player?.is_dead).toBeTruthy();
    });

    test('should not allow health to go below 0', async () => {
      // Set player to 1 health
      await characterService.updateCharacterHealth(playerId, 1);

      await (controller as any).processCommand('look');

      // Health should be exactly 0, not negative
      const afterHealth = await characterService.getCharacterHealth(playerId);
      expect(afterHealth?.current).toBe(0);
    });
  });

  describe('Room-Based Attack Logic', () => {
    test('enemies only attack if in same room as player', async () => {
      // Create another room
      const otherRoomResult = await db.run(`
        INSERT INTO rooms (game_id, name, description) 
        VALUES (?, 'Safe Room', 'A peaceful sanctuary')
      `, [gameId]);
      const otherRoomId = otherRoomResult.lastID as number;

      // Move hostile enemy to other room
      await db.run('UPDATE characters SET current_room_id = ? WHERE id = ?', [otherRoomId, hostileEnemyId]);

      const initialHealth = await characterService.getCharacterHealth(playerId);
      expect(initialHealth?.current).toBe(15);

      await (controller as any).processCommand('look');

      // Should only take 2 damage from aggressive enemy (hostile is in different room)
      const afterHealth = await characterService.getCharacterHealth(playerId);
      expect(afterHealth?.current).toBe(13);
    });

    test('no attacks when no enemies in current room', async () => {
      // Move all enemies to different room
      const otherRoomResult = await db.run(`
        INSERT INTO rooms (game_id, name, description) 
        VALUES (?, 'Enemy Den', 'Where the enemies hide')
      `, [gameId]);
      const otherRoomId = otherRoomResult.lastID as number;

      await db.run('UPDATE characters SET current_room_id = ? WHERE id IN (?, ?, ?)', 
        [otherRoomId, hostileEnemyId, aggressiveEnemyId, friendlyCharacterId]);

      const initialHealth = await characterService.getCharacterHealth(playerId);
      expect(initialHealth?.current).toBe(15);

      await (controller as any).processCommand('look');

      // Should take no damage
      const afterHealth = await characterService.getCharacterHealth(playerId);
      expect(afterHealth?.current).toBe(15);
    });
  });

  describe('Attack Integration with Commands', () => {
    test.skip('enemy attacks should happen after movement commands', async () => {
      // Create another room with connection
      const newRoomResult = await db.run(`
        INSERT INTO rooms (game_id, name, description) 
        VALUES (?, 'Next Room', 'Another dangerous area')
      `, [gameId]);
      const newRoomId = newRoomResult.lastID as number;

      // Create connection
      await db.run(`
        INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) 
        VALUES (?, ?, ?, 'north', 'northern passage')
      `, [gameId, roomId, newRoomId]);

      // Move hostile enemy to new room
      await db.run('UPDATE characters SET current_room_id = ? WHERE id = ?', [newRoomId, hostileEnemyId]);

      const initialHealth = await characterService.getCharacterHealth(playerId);
      expect(initialHealth?.current).toBe(15);

      // Move player north - should take attack from aggressive enemy before moving
      await (controller as any).processCommand('go north');

      // Should have taken 2 damage from aggressive enemy before moving
      const afterMoveHealth = await characterService.getCharacterHealth(playerId);
      expect(afterMoveHealth?.current).toBe(13);

      // Now player should be in new room
      const gameStateManager = (controller as any).gameStateManager;
      const currentSession = gameStateManager.getCurrentSession();
      expect(currentSession.roomId).toBe(newRoomId);

      // Execute another command - should now take attack from hostile enemy in new room
      await (controller as any).processCommand('look');

      const finalHealth = await characterService.getCharacterHealth(playerId);
      expect(finalHealth?.current).toBe(11); // 13 - 2 = 11
    });

    test('enemy attacks should happen after all types of commands', async () => {
      const testCommands = ['look', 'inventory', 'examine bandit'];
      
      for (const command of testCommands) {
        // Reset player health
        await characterService.updateCharacterHealth(playerId, 15);
        
        const beforeHealth = await characterService.getCharacterHealth(playerId);
        expect(beforeHealth?.current).toBe(15);

        await (controller as any).processCommand(command);

        const afterHealth = await characterService.getCharacterHealth(playerId);
        expect(afterHealth?.current).toBe(11); // Always loses 4 HP from hostile + aggressive enemies
      }
    });
  });
});