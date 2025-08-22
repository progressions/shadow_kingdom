import { AICommandFallback } from '../../src/services/aiCommandFallback';
import { GrokClient } from '../../src/ai/grokClient';
import { GameContext } from '../../src/nlp/types';
import { TUIInterface } from '../../src/ui/TUIInterface';

// Mock the GrokClient
jest.mock('../../src/ai/grokClient');

describe('AICommandFallback', () => {
  let aiCommandFallback: AICommandFallback;
  let mockGrokClient: jest.Mocked<GrokClient>;
  let mockTui: jest.Mocked<TUIInterface>;
  let mockGameContext: GameContext;

  beforeEach(() => {
    // Create mock GrokClient
    mockGrokClient = {
      interpretCommand: jest.fn()
    } as any;

    // Create mock TUI
    mockTui = {
      display: jest.fn()
    } as any;

    // Create test game context
    mockGameContext = {
      currentRoom: {
        id: 1,
        name: 'Test Chamber',
        description: 'A small chamber with a wooden table, brass lamp, and an old goblin in the corner.',
        availableExits: ['north', 'south', 'east']
      },
      gameId: 1,
      recentCommands: ['look', 'examine table']
    };

    aiCommandFallback = new AICommandFallback(mockGrokClient, mockTui, { enableDebugLogging: false });
  });

  describe('parseCommand', () => {
    it('should return null if AI service fails', async () => {
      mockGrokClient.interpretCommand.mockRejectedValue(new Error('AI service error'));

      const result = await aiCommandFallback.parseCommand('hit the goblin', mockGameContext, ['attack', 'get', 'examine']);

      expect(result).toBeNull();
    });

    it('should return null if AI returns invalid response', async () => {
      mockGrokClient.interpretCommand.mockResolvedValue(null);

      const result = await aiCommandFallback.parseCommand('hit the goblin', mockGameContext, ['attack', 'get', 'examine']);

      expect(result).toBeNull();
    });

    it('should parse natural language attack command', async () => {
      mockGrokClient.interpretCommand.mockResolvedValue({
        action: 'attack',
        params: ['goblin'],
        reasoning: 'User wants to attack the goblin'
      });

      const result = await aiCommandFallback.parseCommand('hit the goblin', mockGameContext, ['attack', 'get', 'examine']);

      expect(result).toEqual({
        action: 'attack',
        params: ['goblin'],
        source: 'ai',
        processingTime: expect.any(Number),
        reasoning: 'User wants to attack the goblin'
      });
    });

    it('should parse natural language get command with sentence structure', async () => {
      mockGrokClient.interpretCommand.mockResolvedValue({
        action: 'get',
        params: ['lamp'],
        reasoning: 'User wants to pick up the lamp'
      });

      const result = await aiCommandFallback.parseCommand('I want to pick up the lamp', mockGameContext, ['attack', 'get', 'examine']);

      expect(result).toEqual({
        action: 'get',
        params: ['lamp'],
        source: 'ai',
        processingTime: expect.any(Number),
        reasoning: 'User wants to pick up the lamp'
      });
    });

    it('should parse examine command with demonstratives', async () => {
      mockGrokClient.interpretCommand.mockResolvedValue({
        action: 'examine',
        params: ['table'],
        reasoning: 'User wants to examine the table'
      });

      const result = await aiCommandFallback.parseCommand('examine that table', mockGameContext, ['attack', 'get', 'examine']);

      expect(result).toEqual({
        action: 'examine',
        params: ['table'],
        source: 'ai',
        processingTime: expect.any(Number),
        reasoning: 'User wants to examine the table'
      });
    });

    it('should handle movement commands', async () => {
      mockGrokClient.interpretCommand.mockResolvedValue({
        action: 'go',
        params: ['north'],
        reasoning: 'User wants to go north'
      });

      const result = await aiCommandFallback.parseCommand('walk north', mockGameContext, ['go', 'examine', 'talk']);

      expect(result).toEqual({
        action: 'go',
        params: ['north'],
        source: 'ai',
        processingTime: expect.any(Number),
        reasoning: 'User wants to go north'
      });
    });

    it('should handle talk commands with prepositions', async () => {
      mockGrokClient.interpretCommand.mockResolvedValue({
        action: 'talk',
        params: ['goblin'],
        reasoning: 'User wants to talk to the goblin'
      });

      const result = await aiCommandFallback.parseCommand('speak with the goblin', mockGameContext, ['talk', 'attack', 'examine']);

      expect(result).toEqual({
        action: 'talk',
        params: ['goblin'],
        source: 'ai',
        processingTime: expect.any(Number),
        reasoning: 'User wants to talk to the goblin'
      });
    });
  });

  describe('context assembly', () => {
    it('should handle missing room context gracefully', async () => {
      const contextWithoutRoom = { gameId: 1 };
      
      mockGrokClient.interpretCommand.mockResolvedValue({
        action: 'look',
        params: ['around'],
        reasoning: 'Default look command'
      });

      const result = await aiCommandFallback.parseCommand('look around', contextWithoutRoom, ['look', 'examine']);

      // The AI fallback should still work even without room context
      expect(result).toEqual({
        action: 'examine',
        params: ['around'],
        source: 'ai',
        processingTime: expect.any(Number),
        reasoning: 'Default look command'
      });
    });

    it('should extract items from room description', async () => {
      const roomWithItems = {
        ...mockGameContext,
        currentRoom: {
          ...mockGameContext.currentRoom!,
          description: 'A chamber containing a glowing sword and ancient book on a pedestal.'
        }
      };

      mockGrokClient.interpretCommand.mockResolvedValue({
        action: 'get',
        params: ['sword'],
        reasoning: 'User wants to get the sword'
      });

      const result = await aiCommandFallback.parseCommand('take the sword', roomWithItems, ['get', 'examine']);

      expect(result).not.toBeNull();
      expect(mockGrokClient.interpretCommand).toHaveBeenCalled();
    });

    it('should extract characters from room description', async () => {
      const roomWithCharacters = {
        ...mockGameContext,
        currentRoom: {
          ...mockGameContext.currentRoom!,
          description: 'A dark chamber where a hooded merchant stands behind his wares.'
        }
      };

      mockGrokClient.interpretCommand.mockResolvedValue({
        action: 'talk',
        params: ['merchant'],
        reasoning: 'User wants to talk to the merchant'
      });

      const result = await aiCommandFallback.parseCommand('talk to merchant', roomWithCharacters, ['talk', 'examine']);

      expect(result).not.toBeNull();
      expect(mockGrokClient.interpretCommand).toHaveBeenCalled();
    });
  });

  describe('command normalization', () => {
    it('should normalize movement synonyms', async () => {
      mockGrokClient.interpretCommand.mockResolvedValue({
        action: 'move',
        params: ['north'],
        reasoning: 'User wants to move north'
      });

      const result = await aiCommandFallback.parseCommand('move north', mockGameContext, ['go', 'examine']);

      expect(result?.action).toBe('go'); // Should be normalized from 'move' to 'go'
    });

    it('should normalize examination synonyms', async () => {
      mockGrokClient.interpretCommand.mockResolvedValue({
        action: 'look',
        params: ['table'],
        reasoning: 'User wants to look at the table'
      });

      const result = await aiCommandFallback.parseCommand('look at table', mockGameContext, ['examine', 'get']);

      expect(result?.action).toBe('examine'); // Should be normalized from 'look' to 'examine'
    });

    it('should normalize interaction synonyms', async () => {
      mockGrokClient.interpretCommand.mockResolvedValue({
        action: 'grab',
        params: ['lamp'],
        reasoning: 'User wants to grab the lamp'
      });

      const result = await aiCommandFallback.parseCommand('grab the lamp', mockGameContext, ['get', 'examine']);

      expect(result?.action).toBe('get'); // Should be normalized from 'grab' to 'get'
    });
  });

  describe('error handling', () => {
    it('should handle AI service timeout gracefully', async () => {
      mockGrokClient.interpretCommand.mockImplementation(() => 
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
      );

      const result = await aiCommandFallback.parseCommand('test command', mockGameContext, ['test']);

      expect(result).toBeNull();
    });

    it('should handle malformed AI responses', async () => {
      mockGrokClient.interpretCommand.mockResolvedValue({
        action: '', // Invalid empty action
        params: ['test'],
        reasoning: 'Malformed response'
      });

      const result = await aiCommandFallback.parseCommand('test command', mockGameContext, ['test']);

      expect(result).toBeNull();
    });
  });

  describe('debug logging', () => {
    beforeEach(() => {
      aiCommandFallback = new AICommandFallback(mockGrokClient, mockTui, { enableDebugLogging: true });
    });

    it('should log debug information when enabled', async () => {
      mockGrokClient.interpretCommand.mockResolvedValue({
        action: 'examine',
        params: ['table'],
        reasoning: 'User wants to examine the table'
      });

      await aiCommandFallback.parseCommand('look at table', mockGameContext, ['examine']);

      expect(mockTui.display).toHaveBeenCalledWith(
        expect.stringContaining('🧠 AI Fallback: Attempting to parse'),
        expect.any(String)
      );
      expect(mockTui.display).toHaveBeenCalledWith(
        expect.stringContaining('🧠 AI Fallback: "look at table" →'),
        expect.any(String)
      );
    });

    it('should log errors when AI service fails', async () => {
      mockGrokClient.interpretCommand.mockRejectedValue(new Error('AI service unavailable'));

      await aiCommandFallback.parseCommand('test command', mockGameContext, ['test']);

      expect(mockTui.display).toHaveBeenCalledWith(
        expect.stringContaining('🧠 AI Fallback Error:'),
        expect.any(String)
      );
    });
  });
});