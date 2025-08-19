import Database from '../src/utils/database';
import { GameController } from '../src/gameController';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';

describe('NLP Integration Tests', () => {
  let db: Database;
  let gameController: GameController;
  let testGameId: number;

  beforeEach(async () => {
    // Use a test database
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    // Create test game controller
    gameController = new GameController(db);
    
    // Create a test game
    testGameId = await createGameWithRooms(db, 'NLP Test Game');
  });

  afterEach(async () => {
    await db.close();
  });

  describe('Menu Mode NLP', () => {
    test('should handle natural language help commands', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Simulate processing help commands
      const processor = gameController['nlpProcessor'];
      const context = await gameController['buildGameContext']();
      
      const helpVariations = ['help', 'h', '?'];
      helpVariations.forEach(variation => {
        const result = processor.processCommand(variation, context);
        expect(result).not.toBeNull();
        expect(result!.action).toBe('help');
        expect(result!.confidence).toBeGreaterThan(0.7);
      });

      consoleSpy.mockRestore();
    });

    test('should handle natural language exit commands', async () => {
      const processor = gameController['nlpProcessor'];
      const context = await gameController['buildGameContext']();
      
      const exitVariations = ['quit', 'exit', 'leave', 'q'];
      exitVariations.forEach(variation => {
        const result = processor.processCommand(variation, context);
        expect(result).not.toBeNull();
        expect(result!.action).toBe('exit');
      });
    });
  });

  describe('Game Mode NLP', () => {
    beforeEach(async () => {
      // Set up game mode context
      gameController['currentGameId'] = testGameId;
      gameController['mode'] = 'game';
      
      // Get starting room
      const gameState = await db.get('SELECT current_room_id FROM game_state WHERE game_id = ?', [testGameId]);
      gameController['currentRoomId'] = gameState.current_room_id;
    });

    test('should handle natural language movement commands', async () => {
      const processor = gameController['nlpProcessor'];
      const context = await gameController['buildGameContext']();
      
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

      movementVariations.forEach(({ input, expected, params }) => {
        const result = processor.processCommand(input, context);
        expect(result).not.toBeNull();
        expect(result!.action).toBe(expected);
        expect(result!.params).toEqual(params);
        expect(result!.confidence).toBeGreaterThan(0.8); // Higher confidence in game mode
      });
    });

    test('should handle natural language examination commands', async () => {
      const processor = gameController['nlpProcessor'];
      const context = await gameController['buildGameContext']();
      
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

      examineVariations.forEach(({ input, expected, params }) => {
        const result = processor.processCommand(input, context);
        expect(result).not.toBeNull();
        expect(result!.action).toBe(expected);
        expect(result!.params).toEqual(params);
      });
    });

    test('should handle natural language interaction commands', async () => {
      const processor = gameController['nlpProcessor'];
      const context = await gameController['buildGameContext']();
      
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

      interactionVariations.forEach(({ input, expected, params }) => {
        const result = processor.processCommand(input, context);
        expect(result).not.toBeNull();
        expect(result!.action).toBe(expected);
        expect(result!.params).toEqual(params);
      });
    });

    test('should provide context-aware confidence scoring', async () => {
      const processor = gameController['nlpProcessor'];
      const gameContext = await gameController['buildGameContext']();
      const menuContext = { mode: 'menu' as const, recentCommands: [] };
      
      // Movement commands should have higher confidence in game mode
      const gameResult = processor.processCommand('go north', gameContext);
      const menuResult = processor.processCommand('go north', menuContext);
      
      expect(gameResult).not.toBeNull();
      expect(menuResult).not.toBeNull();
      expect(gameResult!.confidence).toBeGreaterThan(menuResult!.confidence);
    });

    test('should handle case insensitive input', async () => {
      const processor = gameController['nlpProcessor'];
      const context = await gameController['buildGameContext']();
      
      const caseVariations = [
        'GO NORTH',
        'Go North',
        'gO nOrTh',
        'LOOK',
        'Take SWORD',
        'HELP'
      ];

      caseVariations.forEach(input => {
        const result = processor.processCommand(input, context);
        expect(result).not.toBeNull();
        expect(result!.source).toBe('pattern');
      });
    });
  });

  describe('Performance Tests', () => {
    test('should process commands within performance targets', async () => {
      const processor = gameController['nlpProcessor'];
      const context = await gameController['buildGameContext']();
      
      const testCommands = [
        'go north', 'look', 'take sword', 'n', 's', 'e', 'w',
        'examine door', 'talk to merchant', 'use key', 'help'
      ];
      
      const startTime = Date.now();
      
      testCommands.forEach(command => {
        const result = processor.processCommand(command, context);
        expect(result).not.toBeNull();
        expect(result!.processingTime).toBeLessThan(50); // Target: <50ms per command
      });
      
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / testCommands.length;
      
      expect(avgTime).toBeLessThan(10); // Average should be much faster
    });
  });

  describe('Fallback Behavior', () => {
    test('should return null for unrecognized commands', async () => {
      const processor = gameController['nlpProcessor'];
      const context = await gameController['buildGameContext']();
      
      const unrecognizedCommands = [
        'blahblahblah',
        'xyz123',
        'invalid command here',
        'teleport to dimension x'
      ];

      unrecognizedCommands.forEach(command => {
        const result = processor.processCommand(command, context);
        expect(result).toBeNull();
      });
    });

    test('should handle empty and whitespace input gracefully', async () => {
      const processor = gameController['nlpProcessor'];
      const context = await gameController['buildGameContext']();
      
      const emptyInputs = ['', '   ', '\t', '\n', '  \t  \n  '];

      emptyInputs.forEach(input => {
        const result = processor.processCommand(input, context);
        expect(result).toBeNull();
      });
    });
  });
});