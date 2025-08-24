/**
 * Tests for percentage-based character generation frequency
 * Tests the CHARACTER_GENERATION_FREQUENCY logic for controlling character encounters
 */

import { GrokClient } from '../../src/ai/grokClient';

// Mock the config to avoid API calls
const mockConfig = {
  apiKey: 'test-key',
  apiUrl: 'test-url',
  model: 'test-model',
  maxTokens: 1000,
  temperature: 0.7,
  mockMode: true
};

describe('Character Generation Frequency', () => {
  let grokClient: GrokClient;

  beforeEach(() => {
    grokClient = new GrokClient(mockConfig);
  });

  describe('Percentage Roll Logic', () => {
    test('should generate character prompts based on CHARACTER_GENERATION_FREQUENCY', () => {
      // Mock Math.random to test specific percentage results
      const originalRandom = Math.random;
      const originalEnv = process.env.CHARACTER_GENERATION_FREQUENCY;
      
      // Test with 40% frequency (default)
      process.env.CHARACTER_GENERATION_FREQUENCY = '40';
      
      const testCases = [
        { randomValue: 0.39, shouldIncludeCharacters: true },   // 39% <= 40%
        { randomValue: 0.40, shouldIncludeCharacters: true },   // 40% <= 40%
        { randomValue: 0.41, shouldIncludeCharacters: false },  // 41% > 40%
        { randomValue: 0.60, shouldIncludeCharacters: false },  // 60% > 40%
        { randomValue: 0.10, shouldIncludeCharacters: true },   // 10% <= 40%
        { randomValue: 0.99, shouldIncludeCharacters: false },  // 99% > 40%
      ];

      testCases.forEach(({ randomValue, shouldIncludeCharacters }) => {
        Math.random = jest.fn(() => randomValue);
        
        // Access the private method through reflection for testing
        const buildPrompt = (grokClient as any).buildPrompt.bind(grokClient);
        const prompt = buildPrompt({
          currentRoom: { name: 'Test Room', description: 'A test room' },
          direction: 'north'
        });

        if (shouldIncludeCharacters) {
          expect(prompt).toContain('CHARACTER GUIDELINES (include 0-2 characters that enhance the room)');
          expect(prompt).toContain('Only include characters if they genuinely enhance the room experience');
        } else {
          expect(prompt).toContain('This room should focus on atmospheric description without characters');
          expect(prompt).toContain('Do not include any characters in the "characters" array - leave it empty');
        }
      });

      // Restore original values
      Math.random = originalRandom;
      if (originalEnv !== undefined) {
        process.env.CHARACTER_GENERATION_FREQUENCY = originalEnv;
      } else {
        delete process.env.CHARACTER_GENERATION_FREQUENCY;
      }
    });

    test('should handle different CHARACTER_GENERATION_FREQUENCY values', () => {
      const originalRandom = Math.random;
      const originalEnv = process.env.CHARACTER_GENERATION_FREQUENCY;
      
      const frequencies = [
        { freq: '0', randomValue: 0.01, shouldIncludeCharacters: false },    // 0% frequency
        { freq: '25', randomValue: 0.20, shouldIncludeCharacters: true },    // 20% < 25%
        { freq: '25', randomValue: 0.30, shouldIncludeCharacters: false },   // 30% > 25%
        { freq: '75', randomValue: 0.70, shouldIncludeCharacters: true },    // 70% < 75%
        { freq: '75', randomValue: 0.80, shouldIncludeCharacters: false },   // 80% > 75%
        { freq: '100', randomValue: 0.99, shouldIncludeCharacters: true },   // 100% frequency
      ];

      frequencies.forEach(({ freq, randomValue, shouldIncludeCharacters }) => {
        process.env.CHARACTER_GENERATION_FREQUENCY = freq;
        Math.random = jest.fn(() => randomValue);
        
        const buildPrompt = (grokClient as any).buildPrompt.bind(grokClient);
        const prompt = buildPrompt({
          currentRoom: { name: 'Test Room', description: 'A test room' },
          direction: 'north'
        });

        if (shouldIncludeCharacters) {
          expect(prompt).toContain('CHARACTER GUIDELINES (include 0-2 characters that enhance the room)');
        } else {
          expect(prompt).toContain('This room should focus on atmospheric description without characters');
        }
      });

      // Restore original values
      Math.random = originalRandom;
      if (originalEnv !== undefined) {
        process.env.CHARACTER_GENERATION_FREQUENCY = originalEnv;
      } else {
        delete process.env.CHARACTER_GENERATION_FREQUENCY;
      }
    });

    test('should default to 40% when CHARACTER_GENERATION_FREQUENCY is not set', () => {
      const originalRandom = Math.random;
      const originalEnv = process.env.CHARACTER_GENERATION_FREQUENCY;
      
      // Remove environment variable
      delete process.env.CHARACTER_GENERATION_FREQUENCY;
      
      // Test default behavior (should be 40%)
      Math.random = jest.fn(() => 0.35); // 35% < 40% default
      
      const buildPrompt = (grokClient as any).buildPrompt.bind(grokClient);
      const prompt = buildPrompt({
        currentRoom: { name: 'Test Room', description: 'A test room' },
        direction: 'north'
      });

      expect(prompt).toContain('CHARACTER GUIDELINES (include 0-2 characters that enhance the room)');

      // Test above default
      Math.random = jest.fn(() => 0.45); // 45% > 40% default
      
      const prompt2 = buildPrompt({
        currentRoom: { name: 'Test Room', description: 'A test room' },
        direction: 'north'
      });

      expect(prompt2).toContain('This room should focus on atmospheric description without characters');

      // Restore original values
      Math.random = originalRandom;
      if (originalEnv !== undefined) {
        process.env.CHARACTER_GENERATION_FREQUENCY = originalEnv;
      }
    });
  });

  describe('Distribution Testing', () => {
    test('should produce roughly 40% character rooms over many generations', () => {
      const originalEnv = process.env.CHARACTER_GENERATION_FREQUENCY;
      process.env.CHARACTER_GENERATION_FREQUENCY = '40';
      
      const sampleSize = 1000;
      let characterRoomCount = 0;
      let noCharacterRoomCount = 0;
      
      const buildPrompt = (grokClient as any).buildPrompt.bind(grokClient);

      for (let i = 0; i < sampleSize; i++) {
        const prompt = buildPrompt({
          currentRoom: { name: 'Test Room', description: 'A test room' },
          direction: 'north'
        });

        if (prompt.includes('CHARACTER GUIDELINES (include 0-2 characters that enhance the room)')) {
          characterRoomCount++;
        } else {
          noCharacterRoomCount++;
        }
      }

      // Should be roughly 40/60 distribution (allowing for randomness)
      // Using 30-50% range to account for random variation
      const characterPercentage = (characterRoomCount / sampleSize) * 100;
      expect(characterPercentage).toBeGreaterThan(30);
      expect(characterPercentage).toBeLessThan(50);
      
      console.log(`Distribution over ${sampleSize} samples: ${characterPercentage.toFixed(1)}% character rooms, ${((noCharacterRoomCount / sampleSize) * 100).toFixed(1)}% atmospheric rooms`);

      // Restore original value
      if (originalEnv !== undefined) {
        process.env.CHARACTER_GENERATION_FREQUENCY = originalEnv;
      } else {
        delete process.env.CHARACTER_GENERATION_FREQUENCY;
      }
    });

    test('should handle edge cases correctly', () => {
      const originalRandom = Math.random;
      const originalEnv = process.env.CHARACTER_GENERATION_FREQUENCY;
      
      // Test 0% frequency (never generate characters)
      process.env.CHARACTER_GENERATION_FREQUENCY = '0';
      Math.random = jest.fn(() => 0.5);
      
      const buildPrompt = (grokClient as any).buildPrompt.bind(grokClient);
      const prompt0 = buildPrompt({
        currentRoom: { name: 'Test Room', description: 'A test room' },
        direction: 'north'
      });
      expect(prompt0).toContain('This room should focus on atmospheric description without characters');

      // Test 100% frequency (always generate characters)
      process.env.CHARACTER_GENERATION_FREQUENCY = '100';
      Math.random = jest.fn(() => 0.99);
      
      const prompt100 = buildPrompt({
        currentRoom: { name: 'Test Room', description: 'A test room' },
        direction: 'north'
      });
      expect(prompt100).toContain('CHARACTER GUIDELINES (include 0-2 characters that enhance the room)');

      // Restore original values
      Math.random = originalRandom;
      if (originalEnv !== undefined) {
        process.env.CHARACTER_GENERATION_FREQUENCY = originalEnv;
      } else {
        delete process.env.CHARACTER_GENERATION_FREQUENCY;
      }
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
      
      // Should contain either character generation request or no-character instruction
      const hasCharacterGeneration = prompt.includes('CHARACTER GUIDELINES (include 0-2 characters that enhance the room)');
      const hasNoCharacters = prompt.includes('This room should focus on atmospheric description without characters');
      expect(hasCharacterGeneration || hasNoCharacters).toBe(true);
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
      
      // Should contain either character generation request or no-character instruction
      const hasCharacterGeneration = prompt.includes('CHARACTER GUIDELINES (include 0-2 characters that enhance the room)');
      const hasNoCharacters = prompt.includes('This room should focus on atmospheric description without characters');
      expect(hasCharacterGeneration || hasNoCharacters).toBe(true);
    });
  });
});