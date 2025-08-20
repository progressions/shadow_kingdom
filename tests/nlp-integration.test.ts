import Database from '../src/utils/database';
import { GameController } from '../src/gameController';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';

// Mock readline to avoid actual I/O during testing
jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    on: jest.fn(),
    setPrompt: jest.fn(),
    prompt: jest.fn(),
    question: jest.fn(),
    close: jest.fn(),
    removeAllListeners: jest.fn()
  }))
}));

describe('NLP Integration Tests', () => {
  let db: Database;
  let gameController: GameController;
  let testGameId: number;

  beforeEach(async () => {
    // Enable mock mode for AI to prevent actual API calls and enable pattern matching
    process.env.AI_MOCK_MODE = 'true';
    
    // Use a test database
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    // Create test game controller
    gameController = new GameController(db);
    
    // Create a test game with unique name
    const uniqueGameName = `NLP Test Game ${Date.now()}-${Math.random()}`;
    testGameId = await createGameWithRooms(db, uniqueGameName);
  });

  afterEach(async () => {
    // Clean up GameController event listeners and HTTP connections
    if (gameController) {
      gameController.removeEventListeners();
      gameController.cleanup();
      
      // Clean up background generation promises via GameController
      const backgroundService = (gameController as any).backgroundGenerationService;
      if (backgroundService) {
        await backgroundService.waitForBackgroundOperations();
        backgroundService.resetGenerationState();
      }
    }
    
    // Clean up readline interface to prevent hanging and memory leaks
    if (gameController && (gameController as any).rl) {
      (gameController as any).rl.removeAllListeners();
      (gameController as any).rl.close();
    }
    
    await db.close();
    
    // Clean up environment variable
    delete process.env.AI_MOCK_MODE;
  });

  describe('Menu Mode NLP', () => {
    test('should handle natural language help commands', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Simulate processing help commands
      const processor = gameController['nlpEngine'];
      const context = await gameController['gameStateManager'].buildGameContext();
      
      const helpVariations = ['help', 'h', '?'];
      for (const variation of helpVariations) {
        const result = await processor.processCommand(variation, context);
        expect(result).not.toBeNull();
        expect(result!.action).toBe('help');
        expect(result!.confidence).toBeGreaterThan(0.7);
      }

      consoleSpy.mockRestore();
    });

    test('should handle natural language exit commands', async () => {
      const processor = gameController['nlpEngine'];
      const context = await gameController['gameStateManager'].buildGameContext();
      
      const exitVariations = ['quit', 'exit', 'leave', 'q'];
      for (const variation of exitVariations) {
        const result = await processor.processCommand(variation, context);
        expect(result).not.toBeNull();
        expect(result!.action).toBe('exit');
      }
    });
  });

  describe('Game Mode NLP', () => {
    beforeEach(async () => {
      // Set up game mode context using GameStateManager
      await gameController['gameStateManager'].startGameSession(testGameId);
    });

    test('should handle natural language movement commands', async () => {
      const processor = gameController['nlpEngine'];
      const context = await gameController['gameStateManager'].buildGameContext();
      
      const movementVariations = [
        { input: 'go north', expected: 'go', params: ['north'] },
        { input: 'move south', expected: 'go', params: ['south'] },
        { input: 'walk east', expected: 'go', params: ['east'] },
        { input: 'head west', expected: 'go', params: ['west'] },
        { input: 'travel up', expected: 'go', params: ['up'] },
        { input: 'proceed down', expected: 'go', params: ['down'] },
        { input: 'n', expected: 'go', params: ['north'] },
        { input: 's', expected: 'go', params: ['south'] },
        { input: 'e', expected: 'go', params: ['east'] },
        { input: 'w', expected: 'go', params: ['west'] },
        { input: 'north', expected: 'go', params: ['north'] },
        { input: 'climb up', expected: 'go', params: ['up'] },
        { input: 'climb stairs', expected: 'go', params: ['up'] },
        { input: 'descend', expected: 'go', params: ['down'] }
      ];

      for (const { input, expected, params } of movementVariations) {
        const result = await processor.processCommand(input, context);
        expect(result).not.toBeNull();
        expect(result!.action).toBe(expected);
        expect(result!.params).toEqual(params);
        expect(result!.confidence).toBeGreaterThan(0.8); // Higher confidence in game mode
      }
    });

    test('should handle natural language examination commands', async () => {
      const processor = gameController['nlpEngine'];
      const context = await gameController['gameStateManager'].buildGameContext();
      
      const examineVariations = [
        { input: 'look', expected: 'look', params: [] },
        { input: 'look around', expected: 'look', params: [] },
        { input: 'examine', expected: 'look', params: [] },
        { input: 'inspect', expected: 'look', params: [] },
        { input: 'look at sword', expected: 'examine', params: ['sword'] },
        { input: 'examine the door', expected: 'examine', params: ['the door'] },
        { input: 'inspect torch', expected: 'examine', params: ['torch'] },
        { input: 'check painting', expected: 'examine', params: ['painting'] }
      ];

      for (const { input, expected, params } of examineVariations) {
        const result = await processor.processCommand(input, context);
        expect(result).not.toBeNull();
        expect(result!.action).toBe(expected);
        expect(result!.params).toEqual(params);
      }
    });

    test('should handle natural language interaction commands', async () => {
      const processor = gameController['nlpEngine'];
      const context = await gameController['gameStateManager'].buildGameContext();
      
      const interactionVariations = [
        { input: 'take sword', expected: 'take', params: ['sword'] },
        { input: 'grab coin', expected: 'take', params: ['coin'] },
        { input: 'get key', expected: 'take', params: ['key'] },
        { input: 'pick up torch', expected: 'take', params: ['torch'] },
        { input: 'pickup item', expected: 'take', params: ['item'] },
        { input: 'collect gems', expected: 'take', params: ['gems'] },
        { input: 'talk to merchant', expected: 'talk', params: ['merchant'] },
        { input: 'speak with guard', expected: 'talk', params: ['guard'] },
        { input: 'use key', expected: 'use', params: ['key'] },
        { input: 'activate lever', expected: 'use', params: ['lever'] }
      ];

      for (const { input, expected, params } of interactionVariations) {
        const result = await processor.processCommand(input, context);
        expect(result).not.toBeNull();
        expect(result!.action).toBe(expected);
        expect(result!.params).toEqual(params);
      }
    });

    test('should provide context-aware confidence scoring', async () => {
      const processor = gameController['nlpEngine'];
      const gameContext = await gameController['gameStateManager'].buildGameContext();
      const menuContext = { mode: 'menu' as const, recentCommands: [] };
      
      // Movement commands should have higher confidence in game mode
      const gameResult = await processor.processCommand('go north', gameContext);
      const menuResult = await processor.processCommand('go north', menuContext);
      
      expect(gameResult).not.toBeNull();
      expect(menuResult).not.toBeNull();
      expect(gameResult!.confidence).toBeGreaterThan(menuResult!.confidence);
    });

    test('should handle case insensitive input', async () => {
      const processor = gameController['nlpEngine'];
      const context = await gameController['gameStateManager'].buildGameContext();
      
      const caseVariations = [
        'GO NORTH',
        'Go North',
        'gO nOrTh',
        'LOOK',
        'Take SWORD',
        'HELP'
      ];

      for (const input of caseVariations) {
        const result = await processor.processCommand(input, context);
        expect(result).not.toBeNull();
        expect(result!.source).toBe('local');
      }
    });
  });

  describe('Performance Tests', () => {
    test('should process commands within performance targets', async () => {
      const processor = gameController['nlpEngine'];
      const context = await gameController['gameStateManager'].buildGameContext();
      
      const testCommands = [
        'go north', 'look', 'take sword', 'n', 's', 'e', 'w',
        'examine door', 'talk to merchant', 'use key', 'help'
      ];
      
      const startTime = Date.now();
      
      for (const command of testCommands) {
        const result = await processor.processCommand(command, context);
        expect(result).not.toBeNull();
        expect(result!.processingTime).toBeLessThan(50); // Target: <50ms per command
      }
      
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / testCommands.length;
      
      expect(avgTime).toBeLessThan(10); // Average should be much faster
    });
  });

  describe('Fallback Behavior', () => {
    test('should return null for unrecognized commands', async () => {
      const processor = gameController['nlpEngine'];
      const context = await gameController['gameStateManager'].buildGameContext();
      
      const unrecognizedCommands = [
        'blahblahblah',
        'xyz123',
        'invalid command here',
        'teleport to dimension x'
      ];

      for (const command of unrecognizedCommands) {
        const result = await processor.processCommand(command, context);
        expect(result).toBeNull();
      }
    });

    test('should handle empty and whitespace input gracefully', async () => {
      const processor = gameController['nlpEngine'];
      const context = await gameController['gameStateManager'].buildGameContext();
      
      const emptyInputs = ['', '   ', '\t', '\n', '  \t  \n  '];

      for (const input of emptyInputs) {
        const result = await processor.processCommand(input, context);
        expect(result).toBeNull();
      }
    });
  });
});