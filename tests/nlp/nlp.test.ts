import { LocalNLPProcessor } from '../../src/nlp/localNLPProcessor';
import { GameContext } from '../../src/nlp/types';

describe('LocalNLPProcessor', () => {
  let processor: LocalNLPProcessor;
  let menuContext: GameContext;
  let gameContext: GameContext;

  beforeEach(() => {
    processor = new LocalNLPProcessor();
    
    menuContext = {
      recentCommands: []
    };

    gameContext = {
      gameId: 1,
      currentRoom: {
        id: 1,
        name: 'Test Room',
        description: 'A test room for unit testing',
        availableExits: ['north', 'south', 'east']
      },
      recentCommands: []
    };
  });

  describe('Movement Commands', () => {
    test('should recognize basic movement commands', () => {
      const testCases = [
        { input: 'go north', expected: { action: 'go', params: ['north'] } },
        { input: 'move south', expected: { action: 'go', params: ['south'] } },
        { input: 'walk east', expected: { action: 'go', params: ['east'] } },
        { input: 'head west', expected: { action: 'go', params: ['west'] } },
        { input: 'travel up', expected: { action: 'go', params: ['up'] } },
        { input: 'proceed down', expected: { action: 'go', params: ['down'] } }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = processor.processCommand(input, gameContext);
        expect(result).not.toBeNull();
        expect(result!.action).toBe(expected.action);
        expect(result!.params).toEqual(expected.params);
        expect(result!.source).toBe('pattern');
        expect(result!.source).toBe('pattern');
      });
    });

    test('should recognize cardinal direction shortcuts', () => {
      const testCases = [
        { input: 'n', expected: { action: 'go', params: ['north'] } },
        { input: 's', expected: { action: 'go', params: ['south'] } },
        { input: 'e', expected: { action: 'go', params: ['east'] } },
        { input: 'w', expected: { action: 'go', params: ['west'] } },
        { input: 'u', expected: { action: 'go', params: ['up'] } },
        { input: 'd', expected: { action: 'go', params: ['down'] } }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = processor.processCommand(input, gameContext);
        expect(result).not.toBeNull();
        expect(result!.action).toBe(expected.action);
        expect(result!.params).toEqual(expected.params);
      });
    });

    test('should recognize full direction names', () => {
      const testCases = [
        { input: 'north', expected: { action: 'go', params: ['north'] } },
        { input: 'south', expected: { action: 'go', params: ['south'] } },
        { input: 'east', expected: { action: 'go', params: ['east'] } },
        { input: 'west', expected: { action: 'go', params: ['west'] } },
        { input: 'up', expected: { action: 'go', params: ['up'] } },
        { input: 'down', expected: { action: 'go', params: ['down'] } }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = processor.processCommand(input, gameContext);
        expect(result).not.toBeNull();
        expect(result!.action).toBe(expected.action);
        expect(result!.params).toEqual(expected.params);
      });
    });

    test('should recognize climbing variations', () => {
      const testCases = [
        { input: 'climb up', expected: { action: 'go', params: ['up'] } },
        { input: 'climb stairs', expected: { action: 'go', params: ['up'] } },
        { input: 'climb ladder', expected: { action: 'go', params: ['up'] } },
        { input: 'ascend stairs', expected: { action: 'go', params: ['up'] } }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = processor.processCommand(input, gameContext);
        expect(result).not.toBeNull();
        expect(result!.action).toBe(expected.action);
        expect(result!.params).toEqual(expected.params);
      });
    });

    test('should recognize descending variations', () => {
      const testCases = [
        { input: 'descend', expected: { action: 'go', params: ['down'] } },
        { input: 'go down stairs', expected: { action: 'go', params: ['down'] } },
        { input: 'climb down ladder', expected: { action: 'go', params: ['down'] } }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = processor.processCommand(input, gameContext);
        expect(result).not.toBeNull();
        expect(result!.action).toBe(expected.action);
        expect(result!.params).toEqual(expected.params);
      });
    });
  });

  describe('Examination Commands', () => {
    test('should recognize look around commands', () => {
      const testCases = [
        'look',
        'look around',
        'examine',
        'inspect',
        'check',
        'observe',
        'study',
        'view'
      ];

      testCases.forEach(input => {
        const result = processor.processCommand(input, gameContext);
        expect(result).not.toBeNull();
        expect(result!.action).toBe('look');
        expect(result!.params).toEqual([]);
      });
    });

    test('should recognize examine specific object commands', () => {
      const testCases = [
        { input: 'look at sword', expected: { action: 'examine', params: ['sword'] } },
        { input: 'examine the door', expected: { action: 'examine', params: ['the door'] } },
        { input: 'inspect torch', expected: { action: 'examine', params: ['torch'] } },
        { input: 'check painting', expected: { action: 'examine', params: ['painting'] } },
        { input: 'observe crystal', expected: { action: 'examine', params: ['crystal'] } }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = processor.processCommand(input, gameContext);
        expect(result).not.toBeNull();
        expect(result!.action).toBe(expected.action);
        expect(result!.params).toEqual(expected.params);
      });
    });
  });

  describe('Interaction Commands', () => {
    test('should recognize take commands', () => {
      const testCases = [
        { input: 'take sword', expected: { action: 'take', params: ['sword'] } },
        { input: 'grab coin', expected: { action: 'take', params: ['coin'] } },
        { input: 'get key', expected: { action: 'take', params: ['key'] } },
        { input: 'pick up torch', expected: { action: 'take', params: ['torch'] } },
        { input: 'pickup item', expected: { action: 'take', params: ['item'] } },
        { input: 'collect gems', expected: { action: 'take', params: ['gems'] } }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = processor.processCommand(input, gameContext);
        expect(result).not.toBeNull();
        expect(result!.action).toBe(expected.action);
        expect(result!.params).toEqual(expected.params);
      });
    });

    test('should recognize talk commands', () => {
      const testCases = [
        { input: 'talk to merchant', expected: { action: 'talk', params: ['merchant'] } },
        { input: 'speak with guard', expected: { action: 'talk', params: ['guard'] } },
        { input: 'chat to wizard', expected: { action: 'talk', params: ['wizard'] } },
        { input: 'converse with npc', expected: { action: 'talk', params: ['npc'] } }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = processor.processCommand(input, gameContext);
        expect(result).not.toBeNull();
        expect(result!.action).toBe(expected.action);
        expect(result!.params).toEqual(expected.params);
      });
    });

    test('should recognize use commands', () => {
      const testCases = [
        { input: 'use key', expected: { action: 'use', params: ['key'] } },
        { input: 'activate lever', expected: { action: 'use', params: ['lever'] } },
        { input: 'operate machine', expected: { action: 'use', params: ['machine'] } }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = processor.processCommand(input, gameContext);
        expect(result).not.toBeNull();
        expect(result!.action).toBe(expected.action);
        expect(result!.params).toEqual(expected.params);
      });
    });
  });

  describe('System Commands', () => {
    test('should recognize help commands', () => {
      const testCases = ['help', 'h', '?'];

      testCases.forEach(input => {
        const result = processor.processCommand(input, gameContext);
        expect(result).not.toBeNull();
        expect(result!.action).toBe('help');
        expect(result!.params).toEqual([]);
      });
    });

    test('should recognize exit commands', () => {
      const testCases = ['quit', 'exit', 'leave', 'q'];

      testCases.forEach(input => {
        const result = processor.processCommand(input, gameContext);
        expect(result).not.toBeNull();
        expect(result!.action).toBe('exit');
        expect(result!.params).toEqual([]);
      });
    });

    test('should recognize clear commands', () => {
      const testCases = ['clear', 'cls'];

      testCases.forEach(input => {
        const result = processor.processCommand(input, gameContext);
        expect(result).not.toBeNull();
        expect(result!.action).toBe('clear');
        expect(result!.params).toEqual([]);
      });
    });
  });

  describe('Synonym Handling', () => {
    test('should apply synonym substitutions', () => {
      const testCases = [
        { input: 'walk north', synonymApplied: 'go north' },
        { input: 'grab sword', synonymApplied: 'take sword' },
        { input: 'inspect door', synonymApplied: 'look door' },
        { input: 'speak to merchant', synonymApplied: 'talk to merchant' }
      ];

      testCases.forEach(({ input }) => {
        const result = processor.processCommand(input, gameContext);
        expect(result).not.toBeNull();
        expect(result!.source).toBe('pattern');
      });
    });
  });

  describe('Pattern Priority', () => {
    test('should match higher priority patterns first', () => {
      // Movement patterns should have higher priority than generic patterns
      const result = processor.processCommand('go north', gameContext);
      expect(result).not.toBeNull();
      expect(result!.action).toBe('go');
      expect(result!.source).toBe('pattern');
    });
  });


  describe('Edge Cases', () => {
    test('should handle empty input', () => {
      const result = processor.processCommand('', gameContext);
      expect(result).toBeNull();
    });

    test('should handle whitespace-only input', () => {
      const result = processor.processCommand('   ', gameContext);
      expect(result).toBeNull();
    });

    test('should handle unrecognized commands', () => {
      const result = processor.processCommand('blahblahblah', gameContext);
      expect(result).toBeNull();
    });

    test('should handle case insensitive input', () => {
      const testCases = [
        'GO NORTH',
        'Go North',
        'gO nOrTh',
        'LOOK',
        'Take SWORD'
      ];

      testCases.forEach(input => {
        const result = processor.processCommand(input, gameContext);
        expect(result).not.toBeNull();
      });
    });
  });

  describe('Pattern Management', () => {
    test('should allow adding custom patterns', () => {
      const customPattern = {
        pattern: /^test\s+(.+)$/i,
        action: 'test',
        priority: 60,
        category: 'system' as const,
        extractParams: (match: RegExpMatchArray) => [match[1]],
        description: 'Test pattern'
      };

      processor.addPattern(customPattern);
      
      const result = processor.processCommand('test something', gameContext);
      expect(result).not.toBeNull();
      expect(result!.action).toBe('test');
      expect(result!.params).toEqual(['something']);
    });

    test('should allow adding custom synonyms', () => {
      processor.addSynonym('teleport', 'go');
      
      const result = processor.processCommand('teleport north', gameContext);
      expect(result).not.toBeNull();
      expect(result!.action).toBe('go');
      expect(result!.params).toEqual(['north']);
    });
  });

  describe('Performance', () => {
    test('should process commands quickly', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        processor.processCommand('go north', gameContext);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should process 100 commands in less than 100ms (1ms per command)
      expect(totalTime).toBeLessThan(100);
    });

    test('should provide processing time in results', () => {
      const result = processor.processCommand('go north', gameContext);
      expect(result).not.toBeNull();
      expect(result!.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Statistics', () => {
    test('should provide processor statistics', () => {
      const stats = processor.getStats();
      expect(stats.patternsLoaded).toBeGreaterThan(0);
      expect(stats.synonymsLoaded).toBeGreaterThan(0);
      expect(stats.uptimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});