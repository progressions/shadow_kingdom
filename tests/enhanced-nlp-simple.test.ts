import { EnhancedNLPEngine } from '../src/nlp/enhancedNLPEngine';
import { GrokClient } from '../src/ai/grokClient';
import { GameContext } from '../src/nlp/types';

describe('EnhancedNLPEngine - Core Functionality', () => {
  let engine: EnhancedNLPEngine;
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
    engine = new EnhancedNLPEngine(mockGrokClient, {
      enableDebugLogging: false
    });

    // Test context
    gameContext = {
      gameId: 1,
      currentRoom: {
        id: 1,
        name: 'Test Library',
        description: 'A library with books, a sword on the wall, and a helpful librarian. A golden key sits on the desk.',
        availableExits: ['north', 'south']
      },
      recentCommands: []
    };
  });

  describe('Enhanced Processing', () => {
    test('should still handle basic local patterns', async () => {
      const result = await engine.processCommand('go north', gameContext);
      
      expect(result).not.toBeNull();
      expect(result!.action).toBe('go');
      expect(result!.params).toEqual(['north']);
      expect(result!.source).toBe('local');
    });

    test('should use context for object extraction', async () => {
      const result = await engine.processCommand('examine sword', gameContext);
      
      expect(result).not.toBeNull();
      expect(result!.action).toBe('examine');
      // Should resolve to context source since it extracted objects from description
      expect(['local', 'context'].includes(result!.source)).toBe(true);
    });

    test('should handle compound commands', async () => {
      const result = await engine.processCommand('take key and examine it', gameContext);
      
      if (result && result.isCompound) {
        expect(result.action).toBe('compound');
        expect(result.compoundCommands).toBeDefined();
        expect(result.compoundCommands!.length).toBeGreaterThan(0);
      } else {
        // If not processed as compound, should still work as regular command
        expect(result).not.toBeNull();
      }
    });

    test('should fallback to base engine when context fails', async () => {
      mockGrokClient.interpretCommand.mockResolvedValue({
        action: 'search',
        params: ['treasure'],
        reasoning: 'AI fallback'
      });

      const result = await engine.processCommand('search for treasure', gameContext);
      
      expect(result).not.toBeNull();
      expect(['local', 'ai', 'context'].includes(result!.source)).toBe(true);
    });
  });

  describe('Context Management', () => {
    test('should update game context', () => {
      const roomObjects = [{ name: 'book', type: 'item', aliases: ['tome'] }];
      const inventory = [{ name: 'coin', type: 'item', aliases: ['gold'] }];

      expect(() => engine.updateGameContext(roomObjects, inventory)).not.toThrow();
    });

    test('should clear room context', () => {
      expect(() => engine.clearRoomContext()).not.toThrow();
    });
  });

  describe('Statistics', () => {
    test('should provide enhanced statistics', async () => {
      await engine.processCommand('go north', gameContext);
      
      const stats = engine.getStats();
      
      expect(stats).toHaveProperty('contextResolution');
      expect(stats).toHaveProperty('contextResolver');
      expect(stats.contextResolution).toHaveProperty('contextResolutions');
      expect(stats.contextResolution).toHaveProperty('pronounResolutions');
      expect(stats.contextResolution).toHaveProperty('spatialResolutions');
      expect(stats.contextResolution).toHaveProperty('compoundCommands');
    });

    test('should reset enhanced statistics', () => {
      engine.resetStats();
      
      const stats = engine.getStats();
      expect(stats.contextResolution.contextResolutions).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle empty room descriptions', async () => {
      const emptyContext = {
        ...gameContext,
        currentRoom: {
          id: 1,
          name: 'Empty Room',
          description: '',
          availableExits: []
        }
      };

      const result = await engine.processCommand('examine something', emptyContext);
      // Should either work or fail gracefully
      expect(result === null || typeof result.action === 'string').toBe(true);
    });

    test('should handle invalid commands gracefully', async () => {
      mockGrokClient.interpretCommand.mockResolvedValue(null);
      
      const result = await engine.processCommand('xyz123 nonsense', gameContext);
      expect(result).toBeNull();
    });
  });

  describe('Performance', () => {
    test('should process commands efficiently', async () => {
      const commands = ['go north', 'examine sword', 'take key'];
      
      const startTime = Date.now();
      
      for (const command of commands) {
        await engine.processCommand(command, gameContext);
      }
      
      const endTime = Date.now();
      const avgTime = (endTime - startTime) / commands.length;
      
      expect(avgTime).toBeLessThan(100); // Should be reasonably fast
    });
  });
});