import { UnifiedNLPEngine } from '../src/nlp/unifiedNLPEngine';
import { GrokClient } from '../src/ai/grokClient';
import { GameContext } from '../src/nlp/types';
import { DEFAULT_NLP_CONFIG, CONSERVATIVE_NLP_CONFIG, AGGRESSIVE_NLP_CONFIG } from '../src/nlp/config';

describe('UnifiedNLPEngine', () => {
  let engine: UnifiedNLPEngine;
  let mockGrokClient: jest.Mocked<GrokClient>;
  let gameContext: GameContext;

  beforeEach(() => {
    // Create mock GrokClient
    mockGrokClient = {
      interpretCommand: jest.fn(),
      getUsageStats: jest.fn().mockReturnValue({
        tokensUsed: { input: 0, output: 0, cost: 0 },
        estimatedCost: '$0.0000'
      })
    } as any;

    // Create engine with mock client
    engine = new UnifiedNLPEngine(mockGrokClient, {
      enableDebugLogging: false // Disable for cleaner test output
    });

    // Test context
    gameContext = {
      mode: 'game',
      gameId: 1,
      currentRoom: {
        id: 1,
        name: 'Test Room',
        description: 'A test room for unit testing',
        availableExits: ['north', 'south', 'east']
      },
      recentCommands: ['look', 'go north']
    };
  });

  describe('Local Pattern Processing', () => {
    test('should process commands locally when confidence is high', async () => {
      const result = await engine.processCommand('go north', gameContext);
      
      expect(result).not.toBeNull();
      expect(result!.action).toBe('go');
      expect(result!.params).toEqual(['north']);
      expect(result!.source).toBe('local');
      expect(result!.confidence).toBeGreaterThan(0.7);
      expect(mockGrokClient.interpretCommand).not.toHaveBeenCalled();
    });

    test('should handle various movement commands locally', async () => {
      const commands = [
        { input: 'move south', expected: { action: 'go', params: ['south'] } },
        { input: 'walk east', expected: { action: 'go', params: ['east'] } },
        { input: 'n', expected: { action: 'go', params: ['north'] } },
        { input: 'climb up', expected: { action: 'go', params: ['up'] } }
      ];

      for (const { input, expected } of commands) {
        const result = await engine.processCommand(input, gameContext);
        expect(result).not.toBeNull();
        expect(result!.action).toBe(expected.action);
        expect(result!.params).toEqual(expected.params);
        expect(result!.source).toBe('local');
      }

      expect(mockGrokClient.interpretCommand).not.toHaveBeenCalled();
    });

    test('should handle examination commands locally', async () => {
      const commands = ['look', 'look around', 'examine sword', 'inspect torch'];

      for (const command of commands) {
        const result = await engine.processCommand(command, gameContext);
        expect(result).not.toBeNull();
        expect(result!.source).toBe('local');
      }

      expect(mockGrokClient.interpretCommand).not.toHaveBeenCalled();
    });

    test('should handle interaction commands locally', async () => {
      const commands = ['take sword', 'grab coin', 'talk to merchant', 'use key'];

      for (const command of commands) {
        const result = await engine.processCommand(command, gameContext);
        expect(result).not.toBeNull();
        expect(result!.source).toBe('local');
      }

      expect(mockGrokClient.interpretCommand).not.toHaveBeenCalled();
    });
  });

  describe('AI Fallback Processing', () => {
    beforeEach(() => {
      // Configure for AI fallback testing
      engine.updateConfig({
        localConfidenceThreshold: 0.9, // High threshold to force AI fallback
        aiConfidenceThreshold: 0.6,
        enableAIFallback: true
      });
    });

    test('should fallback to AI when local confidence is low', async () => {
      const mockAIResponse = {
        action: 'examine',
        params: ['mysterious object'],
        confidence: 0.85,
        reasoning: 'Player wants to search for something'
      };

      mockGrokClient.interpretCommand.mockResolvedValue(mockAIResponse);

      const result = await engine.processCommand('find the mysterious object', gameContext);

      expect(mockGrokClient.interpretCommand).toHaveBeenCalledWith({
        command: 'find the mysterious object',
        currentRoom: gameContext.currentRoom,
        inventory: [],
        recentCommands: gameContext.recentCommands,
        mode: gameContext.mode
      });

      expect(result).not.toBeNull();
      expect(result!.action).toBe('examine');
      expect(result!.params).toEqual(['mysterious object']);
      expect(result!.source).toBe('ai');
      expect(result!.confidence).toBe(0.85);
      expect(result!.reasoning).toBe('Player wants to search for something');
    });

    test('should handle AI interpretation of complex commands', async () => {
      // These are commands that local patterns definitely won't match
      const testCases = [
        {
          input: 'explore this mysterious place',
          aiResponse: { action: 'look', params: [], confidence: 0.8, reasoning: 'Exploring interpreted as looking around' }
        },
        {
          input: 'search for hidden treasures',
          aiResponse: { action: 'examine', params: ['treasures'], confidence: 0.9, reasoning: 'Searching for items' }
        },
        {
          input: 'greet the inhabitants',
          aiResponse: { action: 'talk', params: ['inhabitants'], confidence: 0.7, reasoning: 'Greeting people' }
        }
      ];

      for (const { input, aiResponse } of testCases) {
        mockGrokClient.interpretCommand.mockResolvedValue(aiResponse);
        
        const result = await engine.processCommand(input, gameContext);
        
        expect(result).not.toBeNull();
        expect(result!.action).toBe(aiResponse.action);
        expect(result!.params).toEqual(aiResponse.params);
        expect(result!.source).toBe('ai');
        expect(result!.confidence).toBe(aiResponse.confidence);
      }
    });

    test('should reject AI results with low confidence', async () => {
      const lowConfidenceResponse = {
        action: 'unknown',
        params: [],
        confidence: 0.3, // Below threshold
        reasoning: 'Not sure what this means'
      };

      mockGrokClient.interpretCommand.mockResolvedValue(lowConfidenceResponse);

      const result = await engine.processCommand('xyz123nonsense', gameContext);

      expect(result).toBeNull();
    });

    test('should handle AI processing errors gracefully', async () => {
      mockGrokClient.interpretCommand.mockRejectedValue(new Error('API Error'));

      const result = await engine.processCommand('some complex command', gameContext);

      expect(result).toBeNull();
    });

    test('should handle AI processing timeouts', async () => {
      engine.updateConfig({ maxProcessingTime: 100 }); // Very short timeout

      mockGrokClient.interpretCommand.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          action: 'test',
          params: [],
          confidence: 0.8,
          reasoning: 'Delayed response'
        }), 200)) // Longer than timeout
      );

      const result = await engine.processCommand('slow command', gameContext);

      expect(result).toBeNull();
    });

    test('should handle AI returning null responses', async () => {
      mockGrokClient.interpretCommand.mockResolvedValue(null);

      const result = await engine.processCommand('unrecognizable gibberish', gameContext);

      expect(result).toBeNull();
    });
  });

  describe('Configuration Management', () => {
    test('should use default configuration values', () => {
      const config = engine.getConfig();
      expect(config.localConfidenceThreshold).toBe(DEFAULT_NLP_CONFIG.localConfidenceThreshold);
      expect(config.aiConfidenceThreshold).toBe(DEFAULT_NLP_CONFIG.aiConfidenceThreshold);
      expect(config.enableAIFallback).toBe(DEFAULT_NLP_CONFIG.enableAIFallback);
    });

    test('should allow configuration updates', () => {
      const newConfig = {
        localConfidenceThreshold: 0.5,
        aiConfidenceThreshold: 0.4,
        enableAIFallback: false
      };

      engine.updateConfig(newConfig);
      const config = engine.getConfig();

      expect(config.localConfidenceThreshold).toBe(0.5);
      expect(config.aiConfidenceThreshold).toBe(0.4);
      expect(config.enableAIFallback).toBe(false);
    });

    test('should respect AI fallback disabled setting', async () => {
      engine.updateConfig({ enableAIFallback: false });

      const result = await engine.processCommand('completely unknown command xyz', gameContext);

      expect(mockGrokClient.interpretCommand).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('Statistics and Analytics', () => {
    test('should track processing statistics', async () => {
      // Process some commands
      await engine.processCommand('go north', gameContext); // Local match
      await engine.processCommand('look around', gameContext); // Local match
      await engine.processCommand('unknown command', gameContext); // No match

      const stats = engine.getStats();

      expect(stats.totalCommands).toBe(3);
      expect(stats.localMatches).toBe(2);
      expect(stats.aiMatches).toBe(0);
      expect(stats.failures).toBe(1);
      expect(stats.avgProcessingTime).toBeGreaterThanOrEqual(0);
    });

    test('should calculate success rates correctly', async () => {
      // Reset stats for clean test
      engine.resetStats();
      
      // Mock AI responses: succeed for first, fail for second
      mockGrokClient.interpretCommand
        .mockResolvedValueOnce({
          action: 'examine',
          params: ['something'],
          confidence: 0.8,
          reasoning: 'Test response'
        })
        .mockResolvedValueOnce(null); // Fail for gibberish

      // Process commands with known outcomes
      await engine.processCommand('go north', gameContext); // Local match (high confidence pattern)
      await engine.processCommand('explore this mysterious realm', gameContext); // AI fallback (no local pattern)
      await engine.processCommand('complete gibberish xyz abc', gameContext); // Complete failure

      const stats = engine.getStats();

      expect(stats.totalCommands).toBe(3);
      expect(stats.localMatches).toBe(1);
      expect(stats.aiMatches).toBe(1);
      expect(stats.failures).toBe(1);
      expect(stats.successRate).toBeCloseTo(0.67, 1); // 2/3 success
      expect(stats.localSuccessRate).toBeCloseTo(0.33, 1); // 1/3 local
      expect(stats.aiSuccessRate).toBeCloseTo(0.33, 1); // 1/3 AI
    });

    test('should reset statistics', async () => {
      await engine.processCommand('go north', gameContext);
      
      let stats = engine.getStats();
      expect(stats.totalCommands).toBe(1);
      
      engine.resetStats();
      
      stats = engine.getStats();
      expect(stats.totalCommands).toBe(0);
      expect(stats.localMatches).toBe(0);
      expect(stats.aiMatches).toBe(0);
      expect(stats.failures).toBe(0);
    });

    test('should include sub-system statistics', () => {
      const stats = engine.getStats();
      
      expect(stats.localProcessor).toBeDefined();
      expect(stats.localProcessor.patternsLoaded).toBeGreaterThan(0);
      expect(stats.localProcessor.synonymsLoaded).toBeGreaterThan(0);
      
      expect(stats.aiUsage).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    test('should process commands within reasonable time', async () => {
      const commands = [
        'go north', 'look', 'take sword', 'examine door',
        'talk to merchant', 'use key', 'help', 'n', 's', 'e'
      ];

      const startTime = Date.now();
      
      for (const command of commands) {
        const result = await engine.processCommand(command, gameContext);
        expect(result).not.toBeNull();
        expect(result!.processingTime).toBeLessThan(50); // Target: <50ms per command
      }
      
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / commands.length;
      
      expect(avgTime).toBeLessThan(20); // Average should be much faster for local processing
    });

    test('should handle high throughput', async () => {
      const command = 'go north';
      const iterations = 100;
      
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        await engine.processCommand(command, gameContext);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;
      
      expect(avgTime).toBeLessThan(5); // Should be very fast for repeated local processing
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty input', async () => {
      const result = await engine.processCommand('', gameContext);
      expect(result).toBeNull();
    });

    test('should handle whitespace-only input', async () => {
      const result = await engine.processCommand('   ', gameContext);
      expect(result).toBeNull();
    });

    test('should handle very long input', async () => {
      const longInput = 'a'.repeat(1000);
      const result = await engine.processCommand(longInput, gameContext);
      expect(result).toBeNull();
    });

    test('should handle special characters', async () => {
      const result = await engine.processCommand('go n0rth!@#$%', gameContext);
      expect(result).toBeNull();
    });

    test('should handle unicode characters', async () => {
      const result = await engine.processCommand('gö nörth', gameContext);
      expect(result).toBeNull();
    });
  });

  describe('Pattern Management', () => {
    test('should allow adding custom local patterns', async () => {
      const customPattern = {
        pattern: /^teleport\s+(.+)$/i,
        action: 'go',
        priority: 85,
        category: 'movement' as const,
        extractParams: (match: RegExpMatchArray) => [match[1]],
        description: 'Teleport command'
      };

      engine.addLocalPattern(customPattern);
      
      const result = await engine.processCommand('teleport north', gameContext);
      expect(result).not.toBeNull();
      expect(result!.action).toBe('go');
      expect(result!.params).toEqual(['north']);
      expect(result!.source).toBe('local');
    });

    test('should allow adding custom synonyms', async () => {
      engine.addLocalSynonym('wander', 'go');
      
      const result = await engine.processCommand('wander north', gameContext);
      expect(result).not.toBeNull();
      expect(result!.action).toBe('go');
      expect(result!.params).toEqual(['north']);
      expect(result!.source).toBe('local');
    });
  });
});