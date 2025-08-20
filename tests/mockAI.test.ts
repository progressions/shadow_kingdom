import { MockAIEngine } from '../src/ai/mockAIEngine';
import { RoomContext } from '../src/ai/grokClient';

describe('MockAIEngine', () => {
  let mockEngine: MockAIEngine;

  beforeEach(() => {
    mockEngine = new MockAIEngine({
      debug: false,
      quality: 'high',
      variation: true,
      repetitionAvoidance: true,
      contextSensitivity: 0.8,
      creativityLevel: 0.3,
      seed: 12345 // For deterministic testing
    });
  });

  describe('Room Generation', () => {
    it('should generate rooms from mansion theme', async () => {
      const context: RoomContext = {
        currentRoom: {
          name: 'Test Room',
          description: 'A test room in a grand mansion'
        },
        direction: 'north'
      };

      const result = await mockEngine.generateRoom('mansion library', context);
      
      expect(result.name).toBeTruthy();
      expect(result.description).toBeTruthy();
      expect(result.connections).toBeDefined();
      expect(result.connections!.length).toBeGreaterThan(0);
    });

    it('should generate rooms from forest theme', async () => {
      const context: RoomContext = {
        currentRoom: {
          name: 'Test Room',
          description: 'A clearing in the ancient forest'
        },
        direction: 'east'
      };

      const result = await mockEngine.generateRoom('forest grove', context);
      
      expect(result.name).toBeTruthy();
      expect(result.description).toBeTruthy();
      expect(result.connections).toBeDefined();
    });

    it('should generate rooms from cave theme', async () => {
      const context: RoomContext = {
        currentRoom: {
          name: 'Test Room',
          description: 'A dark underground cavern'
        },
        direction: 'down'
      };

      const result = await mockEngine.generateRoom('cave crystal', context);
      
      expect(result.name).toBeTruthy();
      expect(result.description).toBeTruthy();
      expect(result.connections).toBeDefined();
    });

    it('should avoid repetition when configured', async () => {
      const context: RoomContext = {
        currentRoom: {
          name: 'Test Room',
          description: 'A test room'
        },
        direction: 'north'
      };

      const results = new Set();
      
      // Generate multiple rooms and ensure we get variety
      for (let i = 0; i < 5; i++) {
        const result = await mockEngine.generateRoom('mansion', context);
        results.add(result.name);
      }
      
      // Should get at least 2 different rooms (we have 10 mansion rooms)
      expect(results.size).toBeGreaterThan(1);
    });

    it('should include return connections', async () => {
      const context: RoomContext = {
        currentRoom: {
          name: 'Test Room',
          description: 'A test room'
        },
        direction: 'north'
      };

      const result = await mockEngine.generateRoom('mansion', context);
      
      // Should have a south connection to return
      const returnConnection = result.connections?.find(c => c.direction === 'south');
      expect(returnConnection).toBeDefined();
    });

    it('should generate thematic connections', async () => {
      const context: RoomContext = {
        currentRoom: {
          name: 'Test Room',
          description: 'A test room'
        },
        direction: 'north'
      };

      const result = await mockEngine.generateRoom('mansion ballroom', context);
      
      expect(result.connections).toBeDefined();
      expect(result.connections!.length).toBeGreaterThan(1);
      
      // Connections should have descriptive names
      result.connections!.forEach(conn => {
        expect(conn.direction).toBeTruthy();
        expect(conn.name).toBeTruthy();
        expect(conn.name.length).toBeGreaterThan(3);
      });
    });
  });

  describe('Content Pool Selection', () => {
    it('should select appropriate rooms based on themes', async () => {
      const forestContext: RoomContext = {
        currentRoom: {
          name: 'Test Room',
          description: 'Ancient trees surround this space'
        },
        direction: 'west'
      };

      const result = await mockEngine.generateRoom('forest ancient trees', forestContext);
      
      // Should get a forest-themed room
      expect(result.description.toLowerCase()).toMatch(/tree|forest|grove|wood|nature|leaf|branch/);
    });

    it('should handle fallback when no theme matches', async () => {
      const context: RoomContext = {
        currentRoom: {
          name: 'Test Room',
          description: 'A mysterious space'
        },
        direction: 'north'
      };

      const result = await mockEngine.generateRoom('unknown theme xyz', context);
      
      // Should still generate a valid room (fallback)
      expect(result.name).toBeTruthy();
      expect(result.description).toBeTruthy();
    });
  });

  describe('Configuration Options', () => {
    it('should respect creativity level for variations', async () => {
      const lowCreativityEngine = new MockAIEngine({
        creativityLevel: 0,
        variation: true,
        seed: 12345
      });

      const highCreativityEngine = new MockAIEngine({
        creativityLevel: 1,
        variation: true,
        seed: 12345
      });

      const context: RoomContext = {
        currentRoom: {
          name: 'Test Room',
          description: 'A test room'
        },
        direction: 'north'
      };

      const lowResult = await lowCreativityEngine.generateRoom('mansion', context);
      const highResult = await highCreativityEngine.generateRoom('mansion', context);

      // Both should work, but may have different variations
      expect(lowResult.name).toBeTruthy();
      expect(highResult.name).toBeTruthy();
    });
  });
});