/**
 * Tests for dice-based item generation frequency
 * Tests the 1d6-3 logic for generating 0-3 items per room
 */

import { GrokClient } from '../src/ai/grokClient';

// Mock the config to avoid API calls
const mockConfig = {
  apiKey: 'test-key',
  apiUrl: 'test-url',
  model: 'test-model',
  maxTokens: 1000,
  temperature: 0.7,
  mockMode: true
};

describe('Item Generation Frequency', () => {
  let grokClient: GrokClient;

  beforeEach(() => {
    grokClient = new GrokClient(mockConfig);
  });

  describe('Dice Roll Logic', () => {
    test('should generate item counts following 1d6-3 distribution', () => {
      // Mock Math.random to test specific dice results
      const originalRandom = Math.random;
      const testCases = [
        { randomValue: 0.0, expectedItemCount: 0 },   // Roll 1: 1-3 = 0 (clamped to 0)
        { randomValue: 0.16, expectedItemCount: 0 },  // Roll 1: 1-3 = 0 (clamped to 0) 
        { randomValue: 0.33, expectedItemCount: 0 },  // Roll 2: 2-3 = 0 (clamped to 0)
        { randomValue: 0.49, expectedItemCount: 0 },  // Roll 3: 3-3 = 0
        { randomValue: 0.66, expectedItemCount: 1 },  // Roll 4: 4-3 = 1
        { randomValue: 0.83, expectedItemCount: 2 },  // Roll 5: 5-3 = 2
        { randomValue: 0.99, expectedItemCount: 3 },  // Roll 6: 6-3 = 3
      ];

      testCases.forEach(({ randomValue, expectedItemCount }) => {
        Math.random = jest.fn(() => randomValue);
        
        // Access the private method through reflection for testing
        const buildPrompt = (grokClient as any).buildPrompt.bind(grokClient);
        const prompt = buildPrompt({
          currentRoom: { name: 'Test Room', description: 'A test room' },
          direction: 'north'
        });

        if (expectedItemCount === 0) {
          expect(prompt).toContain('The "items" array should be EMPTY for this room');
          expect(prompt).toContain('atmospheric description without objects');
        } else {
          expect(prompt).toContain(`Include exactly ${expectedItemCount} item`);
          if (expectedItemCount > 1) {
            expect(prompt).toContain('items that fit');
          } else {
            expect(prompt).toContain('item that fit');
          }
        }
      });

      // Restore original Math.random
      Math.random = originalRandom;
    });

    test('should handle edge cases correctly', () => {
      const originalRandom = Math.random;
      
      // Test minimum value (should be 0)
      Math.random = jest.fn(() => 0.0);
      const buildPrompt = (grokClient as any).buildPrompt.bind(grokClient);
      const promptMin = buildPrompt({
        currentRoom: { name: 'Test Room', description: 'A test room' },
        direction: 'north'
      });
      expect(promptMin).toContain('The "items" array should be EMPTY');

      // Test maximum value (should be 3)
      Math.random = jest.fn(() => 0.999);
      const promptMax = buildPrompt({
        currentRoom: { name: 'Test Room', description: 'A test room' },
        direction: 'north'
      });
      expect(promptMax).toContain('Include exactly 3 items');

      Math.random = originalRandom;
    });
  });

  describe('Distribution Testing', () => {
    test('should produce roughly 50% empty rooms over many generations', () => {
      const sampleSize = 1000;
      let emptyRoomCount = 0;
      let itemRoomCount = 0;
      
      const buildPrompt = (grokClient as any).buildPrompt.bind(grokClient);

      for (let i = 0; i < sampleSize; i++) {
        const prompt = buildPrompt({
          currentRoom: { name: 'Test Room', description: 'A test room' },
          direction: 'north'
        });

        if (prompt.includes('The "items" array should be EMPTY')) {
          emptyRoomCount++;
        } else {
          itemRoomCount++;
        }
      }

      // Should be roughly 50/50 distribution (allowing for randomness)
      // Using 40-60% range to account for random variation
      const emptyPercentage = (emptyRoomCount / sampleSize) * 100;
      expect(emptyPercentage).toBeGreaterThan(40);
      expect(emptyPercentage).toBeLessThan(60);
      
      console.log(`Distribution over ${sampleSize} samples: ${emptyPercentage.toFixed(1)}% empty rooms, ${((itemRoomCount / sampleSize) * 100).toFixed(1)}% rooms with items`);
    });

    test('should generate item counts in expected proportions', () => {
      const sampleSize = 1000;
      const counts = { 0: 0, 1: 0, 2: 0, 3: 0 };
      
      const buildPrompt = (grokClient as any).buildPrompt.bind(grokClient);

      for (let i = 0; i < sampleSize; i++) {
        const prompt = buildPrompt({
          currentRoom: { name: 'Test Room', description: 'A test room' },
          direction: 'north'
        });

        if (prompt.includes('The "items" array should be EMPTY')) {
          counts[0]++;
        } else if (prompt.includes('Include exactly 1 item')) {
          counts[1]++;
        } else if (prompt.includes('Include exactly 2 items')) {
          counts[2]++;
        } else if (prompt.includes('Include exactly 3 items')) {
          counts[3]++;
        }
      }

      // Expected distribution:
      // 0 items: 50% (rolls 1,2,3)
      // 1 item: 16.67% (roll 4)
      // 2 items: 16.67% (roll 5) 
      // 3 items: 16.67% (roll 6)
      
      const percentages = {
        0: (counts[0] / sampleSize) * 100,
        1: (counts[1] / sampleSize) * 100,
        2: (counts[2] / sampleSize) * 100,
        3: (counts[3] / sampleSize) * 100
      };

      // Allow for randomness in distribution (±10% range)
      expect(percentages[0]).toBeGreaterThan(40);  // ~50%
      expect(percentages[0]).toBeLessThan(60);
      
      expect(percentages[1]).toBeGreaterThan(10);  // ~16.67%
      expect(percentages[1]).toBeLessThan(25);
      
      expect(percentages[2]).toBeGreaterThan(10);  // ~16.67%
      expect(percentages[2]).toBeLessThan(25);
      
      expect(percentages[3]).toBeGreaterThan(10);  // ~16.67%
      expect(percentages[3]).toBeLessThan(25);

      console.log('Item count distribution:', percentages);
    });
  });

  describe('Prompt Quality', () => {
    test('should generate valid prompts for connection-based generation', () => {
      const buildPrompt = (grokClient as any).buildPrompt.bind(grokClient);
      
      const prompt = buildPrompt({
        currentRoom: { name: 'Crystal Chamber', description: 'A room filled with glowing crystals' },
        direction: 'north',
        connectionName: 'through the shimmering portal'
      });

      // Should contain connection-specific language
      expect(prompt).toContain('through the shimmering portal');
      expect(prompt).toContain('Crystal Chamber');
      
      // Should contain either empty items instruction or specific count
      const hasEmptyItems = prompt.includes('The "items" array should be EMPTY');
      const hasItemCount = prompt.includes('Include exactly');
      expect(hasEmptyItems || hasItemCount).toBe(true);
    });

    test('should generate valid prompts for standard generation', () => {
      const buildPrompt = (grokClient as any).buildPrompt.bind(grokClient);
      
      const prompt = buildPrompt({
        currentRoom: { name: 'Entrance Hall', description: 'A grand entrance with marble floors' },
        direction: 'east',
        gameHistory: ['Entrance Hall', 'Storage Room']
      });

      // Should contain standard generation elements
      expect(prompt).toContain('Entrance Hall');
      expect(prompt).toContain('going east');
      expect(prompt).toContain('Entrance Hall, Storage Room');
      
      // Should contain either empty items instruction or specific count
      const hasEmptyItems = prompt.includes('The "items" array should be EMPTY');
      const hasItemCount = prompt.includes('Include exactly');
      expect(hasEmptyItems || hasItemCount).toBe(true);
    });
  });
});