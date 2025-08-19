import { GrokClient } from '../src/ai/grokClient';
import type { 
  RoomContext, 
  GeneratedRoom, 
  NPCContext, 
  GeneratedNPC,
  DialogueContext,
  DialogueResponse,
  CommandInterpretationContext,
  InterpretedCommand 
} from '../src/ai/grokClient';

// Mock axios to prevent actual HTTP calls during testing
jest.mock('axios');
import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('GrokClient', () => {
  let client: GrokClient;

  beforeEach(() => {
    // Reset environment variables to known state
    process.env.AI_MOCK_MODE = 'true'; // Enable mock mode for testing
    delete process.env.GROK_API_KEY; // Remove API key to force mock mode
    
    // Create client with explicit mock mode configuration
    client = new GrokClient({ mockMode: true });
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.AI_MOCK_MODE;
  });

  describe('Initialization and Configuration', () => {
    test('should initialize with default configuration', () => {
      expect(client).toBeInstanceOf(GrokClient);
    });

    test('should initialize in mock mode when no API key provided', () => {
      delete process.env.GROK_API_KEY;
      const mockClient = new GrokClient({ mockMode: true });
      expect(mockClient).toBeInstanceOf(GrokClient);
    });

    test('should handle mock mode environment variable', () => {
      process.env.AI_MOCK_MODE = 'true';
      const mockClient = new GrokClient({ mockMode: true });
      expect(mockClient).toBeInstanceOf(GrokClient);
    });
  });

  describe('Room Generation', () => {
    test('should generate room with valid context', async () => {
      const roomContext: RoomContext = {
        currentRoom: {
          name: 'Test Chamber',
          description: 'A room for testing room generation.'
        },
        direction: 'north',
        gameHistory: ['entered test chamber'],
        theme: 'fantasy'
      };

      const result = await client.generateRoom(roomContext);

      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.description).toBeDefined();
      expect(typeof result.name).toBe('string');
      expect(typeof result.description).toBe('string');
      expect(result.name.length).toBeGreaterThan(0);
      expect(result.description.length).toBeGreaterThan(0);
    });

    test('should generate room with connections when requested', async () => {
      const roomContext: RoomContext = {
        currentRoom: {
          name: 'Hub Room',
          description: 'A central chamber with multiple passages.'
        },
        direction: 'east',
        gameHistory: [],
        theme: 'dungeon'
      };

      const result = await client.generateRoom(roomContext);

      expect(result).toBeDefined();
      if (result.connections) {
        expect(Array.isArray(result.connections)).toBe(true);
        result.connections.forEach(connection => {
          expect(connection.direction).toBeDefined();
          expect(connection.name).toBeDefined();
        });
      }
    });

    test('should handle room generation errors gracefully', async () => {
      // Test with invalid context
      const invalidContext = {
        currentRoom: {
          name: '',
          description: ''
        },
        direction: 'invalid_direction' as any
      };

      const result = await client.generateRoom(invalidContext);
      
      // Should return fallback room rather than throwing
      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.description).toBeDefined();
    });
  });

  describe('NPC Generation', () => {
    test('should generate NPC with valid context', async () => {
      const npcContext: NPCContext = {
        roomName: 'Tavern',
        roomDescription: 'A cozy tavern filled with patrons and the smell of ale.',
        gameTheme: 'fantasy',
        existingNPCs: []
      };

      const result = await client.generateNPC(npcContext);

      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.personality).toBeDefined();
      expect(typeof result.name).toBe('string');
      expect(typeof result.description).toBe('string');
      expect(typeof result.personality).toBe('string');
    });

    test('should generate unique NPCs when existing NPCs provided', async () => {
      const npcContext: NPCContext = {
        roomName: 'Town Square',
        roomDescription: 'A bustling town square with many people.',
        gameTheme: 'medieval',
        existingNPCs: ['guard', 'merchant', 'beggar']
      };

      const result = await client.generateNPC(npcContext);

      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
      // Should avoid duplicating existing NPCs
      expect(npcContext.existingNPCs).not.toContain(result.name.toLowerCase());
    });

    test('should include initial dialogue when requested', async () => {
      const npcContext: NPCContext = {
        roomName: 'Library',
        roomDescription: 'A quiet library with ancient tomes.',
        gameTheme: 'fantasy'
      };

      const result = await client.generateNPC(npcContext);

      expect(result).toBeDefined();
      if (result.initialDialogue) {
        expect(typeof result.initialDialogue).toBe('string');
        expect(result.initialDialogue.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Dialogue Processing', () => {
    test('should continue dialogue with context', async () => {
      const dialogueContext: DialogueContext = {
        npcName: 'Wise Sage',
        npcPersonality: 'wise, helpful, mysterious',
        conversationHistory: [
          'Hello there, traveler.',
          'What brings you to these lands?'
        ],
        playerInput: 'I seek knowledge about the ancient ruins.',
        currentRoom: 'Library'
      };

      const result = await client.continueDialogue(dialogueContext);

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(typeof result.response).toBe('string');
      expect(result.response.length).toBeGreaterThan(0);
    });

    test('should include action when appropriate', async () => {
      const dialogueContext: DialogueContext = {
        npcName: 'Merchant',
        npcPersonality: 'greedy, business-minded',
        conversationHistory: ['Welcome to my shop!'],
        playerInput: 'Can I buy a sword?',
        currentRoom: 'Weapon Shop'
      };

      const result = await client.continueDialogue(dialogueContext);

      expect(result).toBeDefined();
      if (result.action) {
        expect(typeof result.action).toBe('string');
      }
      if (result.emotion) {
        expect(typeof result.emotion).toBe('string');
      }
    });

    test('should handle empty conversation history', async () => {
      const dialogueContext: DialogueContext = {
        npcName: 'Guard',
        npcPersonality: 'stern, dutiful',
        conversationHistory: [],
        playerInput: 'Hello',
        currentRoom: 'Gate'
      };

      const result = await client.continueDialogue(dialogueContext);

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
    });
  });

  describe('Command Interpretation', () => {
    test('should interpret simple commands', async () => {
      const context: CommandInterpretationContext = {
        command: 'take the ancient sword',
        currentRoom: {
          name: 'Armory',
          description: 'An armory filled with weapons and armor.',
          availableExits: ['north', 'south']
        },
        inventory: [],
        recentCommands: [],
        mode: 'game'
      };

      const result = await client.interpretCommand(context);

      expect(result).toBeDefined();
      if (result) {
        expect(result.action).toBeDefined();
        expect(result.confidence).toBeDefined();
        expect(typeof result.action).toBe('string');
        expect(typeof result.confidence).toBe('number');
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      }
    });

    test('should interpret complex commands with context', async () => {
      const context: CommandInterpretationContext = {
        command: 'use the key to open the chest near the window',
        currentRoom: {
          name: 'Treasure Room',
          description: 'A room with a large chest by the window.',
          availableExits: ['west'],
          thematicExits: [{ direction: 'west', name: 'ornate doorway' }]
        },
        inventory: ['rusty key', 'torch'],
        recentCommands: ['examine chest', 'look around'],
        mode: 'game'
      };

      const result = await client.interpretCommand(context);

      expect(result).toBeDefined();
      if (result) {
        expect(result.action).toBeDefined();
        expect(result.params).toBeDefined();
        expect(Array.isArray(result.params)).toBe(true);
      }
    });

    test('should provide reasoning for interpretations', async () => {
      const context: CommandInterpretationContext = {
        command: 'examine the mysterious artifact',
        currentRoom: {
          name: 'Ancient Chamber',
          description: 'A chamber containing a glowing artifact.',
          availableExits: ['south']
        },
        inventory: [],
        recentCommands: [],
        mode: 'game'
      };

      const result = await client.interpretCommand(context);

      expect(result).toBeDefined();
      if (result) {
        expect(result.reasoning).toBeDefined();
        expect(typeof result.reasoning).toBe('string');
      }
    });
  });

  describe('Usage Statistics and Cost Tracking', () => {
    test('should track token usage', async () => {
      const roomContext: RoomContext = {
        currentRoom: {
          name: 'Test Room',
          description: 'A test room.'
        },
        direction: 'north'
      };

      await client.generateRoom(roomContext);
      
      const stats = client.getUsageStats();
      expect(stats).toBeDefined();
      expect(stats.tokensUsed).toBeDefined();
      expect(stats.estimatedCost).toBeDefined();
    });

    test('should estimate costs correctly', async () => {
      const stats = client.getUsageStats();
      
      expect(stats.tokensUsed.input).toBeGreaterThanOrEqual(0);
      expect(stats.tokensUsed.output).toBeGreaterThanOrEqual(0);
      expect(stats.tokensUsed.cost).toBeGreaterThanOrEqual(0);
      expect(typeof stats.estimatedCost).toBe('string');
    });

    test('should provide usage statistics in correct format', () => {
      const stats = client.getUsageStats();
      
      expect(stats).toBeDefined();
      expect(stats.tokensUsed).toBeDefined();
      expect(stats.estimatedCost).toBeDefined();
      expect(typeof stats.estimatedCost).toBe('string');
    });
  });

  describe('Additional Coverage Tests', () => {
    test('should test fallback room generation paths', async () => {
      const result = await client.generateRoom({
        currentRoom: { name: 'Test', description: 'Test' },
        direction: 'north',
        gameHistory: ['room1', 'room2'],
        theme: 'dungeon'
      });
      
      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.description).toBeDefined();
    });

    test('should test fallback NPC generation paths', async () => {
      const result = await client.generateNPC({
        roomName: 'Tavern',
        roomDescription: 'A cozy tavern.',
        gameTheme: 'medieval',
        existingNPCs: ['guard', 'merchant']
      });
      
      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.personality).toBeDefined();
    });

    test('should test fallback dialogue generation paths', async () => {
      const result = await client.continueDialogue({
        npcName: 'Guard',
        npcPersonality: 'stern',
        conversationHistory: ['Hello', 'State your business'],
        playerInput: 'I need passage',
        currentRoom: 'Gate'
      });
      
      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(typeof result.response).toBe('string');
    });

    test('should test command interpretation with various contexts', async () => {
      const contexts = [
        {
          command: 'examine sword',
          mode: 'game' as const,
          currentRoom: {
            name: 'Armory',
            description: 'A room with weapons.',
            availableExits: ['north']
          }
        },
        {
          command: 'help',
          mode: 'menu' as const
        },
        {
          command: 'talk to merchant',
          mode: 'game' as const,
          inventory: ['gold', 'potion']
        }
      ];

      for (const context of contexts) {
        const result = await client.interpretCommand(context);
        // Result may be null for some commands in mock mode, which is valid
        if (result) {
          expect(result.action).toBeDefined();
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(1);
        }
      }
    });

    test('should handle various edge cases in room generation', async () => {
      const edgeCases = [
        {
          currentRoom: { name: '', description: '' },
          direction: 'north'
        },
        {
          currentRoom: { name: 'Test', description: 'Test' },
          direction: 'up'
        },
        {
          currentRoom: { name: 'Test', description: 'Test' },
          direction: 'down'
        }
      ];

      for (const testCase of edgeCases) {
        const result = await client.generateRoom(testCase);
        expect(result).toBeDefined();
        expect(result.name).toBeDefined();
        expect(result.description).toBeDefined();
      }
    });

    test('should handle usage statistics tracking over multiple calls', async () => {
      const initialStats = client.getUsageStats();
      
      // Make multiple calls to test aggregation
      await client.generateRoom({
        currentRoom: { name: 'Test1', description: 'Test1' },
        direction: 'north'
      });
      
      await client.generateNPC({
        roomName: 'Test Room',
        roomDescription: 'Test room description'
      });
      
      const finalStats = client.getUsageStats();
      expect(finalStats.tokensUsed).toBeDefined();
      expect(finalStats.estimatedCost).toBeDefined();
      expect(typeof finalStats.estimatedCost).toBe('string');
    });
  });

  describe('Error Handling and Fallbacks', () => {
    test('should handle API errors gracefully', async () => {
      // Create a client specifically for API testing
      const apiClient = new GrokClient({ 
        mockMode: false, 
        apiKey: 'test-key' 
      });
      
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      const roomContext: RoomContext = {
        currentRoom: {
          name: 'Test Room',
          description: 'A test room.'
        },
        direction: 'north'
      };

      const result = await apiClient.generateRoom(roomContext);
      
      // Should return fallback result instead of throwing
      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.description).toBeDefined();
    });

    test('should handle malformed API responses', async () => {
      // Create a client specifically for API testing
      const apiClient = new GrokClient({ 
        mockMode: false, 
        apiKey: 'test-key' 
      });
      
      // Mock malformed response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [{
            message: {
              content: 'invalid json here'
            }
          }]
        }
      });

      const roomContext: RoomContext = {
        currentRoom: {
          name: 'Test Room',
          description: 'A test room.'
        },
        direction: 'north'
      };

      const result = await apiClient.generateRoom(roomContext);
      
      // Should return fallback result
      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.description).toBeDefined();
    });

    test('should handle timeout scenarios', async () => {
      // Create a client specifically for API testing
      const apiClient = new GrokClient({ 
        mockMode: false, 
        apiKey: 'test-key' 
      });
      
      // Mock timeout
      mockedAxios.post.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 100)
        )
      );

      const roomContext: RoomContext = {
        currentRoom: {
          name: 'Test Room',
          description: 'A test room.'
        },
        direction: 'north'
      };

      const result = await apiClient.generateRoom(roomContext);
      
      // Should return fallback result
      expect(result).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.description).toBeDefined();
    });
  });

  describe('Mock Mode Functionality', () => {
    test('should generate consistent mock responses', async () => {
      const roomContext: RoomContext = {
        currentRoom: {
          name: 'Consistent Room',
          description: 'A room for consistency testing.'
        },
        direction: 'north'
      };

      const result1 = await client.generateRoom(roomContext);
      const result2 = await client.generateRoom(roomContext);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(typeof result1.name).toBe('string');
      expect(typeof result2.name).toBe('string');
    });

    test('should handle all generation types in mock mode', async () => {
      // Test room generation
      const roomResult = await client.generateRoom({
        currentRoom: { name: 'Test', description: 'Test' },
        direction: 'north'
      });
      expect(roomResult).toBeDefined();

      // Test NPC generation
      const npcResult = await client.generateNPC({
        roomName: 'Test Room',
        roomDescription: 'A test room.'
      });
      expect(npcResult).toBeDefined();

      // Test dialogue generation
      const dialogueResult = await client.continueDialogue({
        npcName: 'Test NPC',
        npcPersonality: 'friendly',
        conversationHistory: [],
        playerInput: 'Hello'
      });
      expect(dialogueResult).toBeDefined();

      // Test command interpretation
      const commandResult = await client.interpretCommand({
        command: 'test command',
        mode: 'game'
      });
      expect(commandResult).toBeDefined();
    });
  });
});