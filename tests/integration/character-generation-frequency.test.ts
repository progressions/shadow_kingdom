/**
 * Integration tests for character generation frequency feature
 * Tests the end-to-end flow from AI prompt to character creation
 */

import Database from '../../src/utils/database';
import { CharacterGenerationService } from '../../src/services/characterGenerationService';
import { CharacterService } from '../../src/services/characterService';
import { GrokClient } from '../../src/ai/grokClient';
import { initializeTestDatabase } from '../testUtils';

describe('Character Generation Frequency Integration', () => {
  let db: Database;
  let characterService: CharacterService;
  let characterGenerationService: CharacterGenerationService;
  let grokClient: GrokClient;

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.connect();
    await initializeTestDatabase(db);
    
    characterService = new CharacterService(db);
    characterGenerationService = new CharacterGenerationService(db, characterService);
    
    grokClient = new GrokClient({
      apiKey: 'test-key',
      apiUrl: 'test-url', 
      model: 'test-model',
      maxTokens: 1000,
      temperature: 0.7,
      mockMode: true
    });
  });

  afterEach(async () => {
    await db.close();
  });

  describe('CharacterGenerationService Empty Array Handling', () => {
    test('should handle empty characters array gracefully', async () => {
      // Create a test room
      await db.run('INSERT INTO rooms (id, name, description, game_id) VALUES (1, "Test Room", "A test room", 1)');
      
      // Test with empty array
      await characterGenerationService.createCharactersFromRoomGeneration(1, 1, []);
      
      // Verify no characters were created
      const characters = await db.all('SELECT * FROM characters WHERE current_room_id = 1');
      expect(characters).toHaveLength(0);
    });

    test('should handle undefined characters array gracefully', async () => {
      // Create a test room
      await db.run('INSERT INTO rooms (id, name, description, game_id) VALUES (1, "Test Room", "A test room", 1)');
      
      // Test with undefined
      await characterGenerationService.createCharactersFromRoomGeneration(1, 1, undefined);
      
      // Verify no characters were created
      const characters = await db.all('SELECT * FROM characters WHERE current_room_id = 1');
      expect(characters).toHaveLength(0);
    });

    test('should still create characters when provided', async () => {
      // Create a test room
      await db.run('INSERT INTO rooms (id, name, description, game_id) VALUES (1, "Test Room", "A test room", 1)');
      
      // Test with actual characters
      const testCharacters = [
        { 
          name: 'Test NPC', 
          description: 'A test character', 
          type: 'npc' as const,
          personality: 'Friendly',
          initialDialogue: 'Hello there!'
        }
      ];
      
      await characterGenerationService.createCharactersFromRoomGeneration(1, 1, testCharacters);
      
      // Verify character was created
      const characters = await db.all('SELECT * FROM characters WHERE current_room_id = 1');
      expect(characters).toHaveLength(1);
      
      const character = characters[0];
      expect(character.name).toBe('Test NPC');
      expect(character.type).toBe('npc');
      expect(character.dialogue_response).toBe('Hello there!');
    });
  });

  describe('AI Character Generation Distribution Verification', () => {
    test('should generate varying character presence based on frequency setting', async () => {
      const originalEnv = process.env.CHARACTER_GENERATION_FREQUENCY;
      process.env.CHARACTER_GENERATION_FREQUENCY = '40';
      
      const sampleSize = 100;
      const characterCounts: number[] = [];
      
      for (let i = 0; i < sampleSize; i++) {
        // Generate room using mock AI (which internally uses the frequency logic)
        const result = await grokClient.generateRoom({
          currentRoom: { name: 'Test Room', description: 'A test room' },
          direction: 'north'
        });
        
        characterCounts.push(result.characters?.length || 0);
      }
      
      // Verify we get distribution of 0 and positive character counts
      const uniqueCounts = [...new Set(characterCounts)];
      expect(uniqueCounts).toContain(0);  // Should have some rooms without characters
      
      // Count occurrences
      const distribution = characterCounts.reduce((acc, count) => {
        acc[count] = (acc[count] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      
      console.log('Generated character distribution:', distribution);
      
      // Should have some rooms with 0 characters (approximately 60% based on 40% frequency)
      const zeroCharacterRooms = distribution[0] || 0;
      const zeroPercentage = (zeroCharacterRooms / sampleSize) * 100;
      expect(zeroPercentage).toBeGreaterThan(40);  // At least 40% rooms without characters

      // Restore environment variable
      if (originalEnv !== undefined) {
        process.env.CHARACTER_GENERATION_FREQUENCY = originalEnv;
      } else {
        delete process.env.CHARACTER_GENERATION_FREQUENCY;
      }
    });

    test('should respect 0% frequency setting', async () => {
      const originalEnv = process.env.CHARACTER_GENERATION_FREQUENCY;
      process.env.CHARACTER_GENERATION_FREQUENCY = '0';
      
      const sampleSize = 50;
      let charactersGenerated = 0;
      
      for (let i = 0; i < sampleSize; i++) {
        const result = await grokClient.generateRoom({
          currentRoom: { name: 'Test Room', description: 'A test room' },
          direction: 'north'
        });
        
        charactersGenerated += result.characters?.length || 0;
      }
      
      // With 0% frequency, no characters should be generated
      expect(charactersGenerated).toBe(0);

      // Restore environment variable
      if (originalEnv !== undefined) {
        process.env.CHARACTER_GENERATION_FREQUENCY = originalEnv;
      } else {
        delete process.env.CHARACTER_GENERATION_FREQUENCY;
      }
    });

    test('should respect 100% frequency setting', async () => {
      const originalEnv = process.env.CHARACTER_GENERATION_FREQUENCY;
      process.env.CHARACTER_GENERATION_FREQUENCY = '100';
      
      const sampleSize = 50;
      let roomsWithoutCharacters = 0;
      
      for (let i = 0; i < sampleSize; i++) {
        const result = await grokClient.generateRoom({
          currentRoom: { name: 'Test Room', description: 'A test room' },
          direction: 'north'
        });
        
        if (!result.characters || result.characters.length === 0) {
          roomsWithoutCharacters++;
        }
      }
      
      // With 100% frequency, very few rooms should be without characters
      // (Some may still be empty if the mock AI decides not to generate any)
      const emptyPercentage = (roomsWithoutCharacters / sampleSize) * 100;
      expect(emptyPercentage).toBeLessThan(20); // Less than 20% should be empty

      // Restore environment variable
      if (originalEnv !== undefined) {
        process.env.CHARACTER_GENERATION_FREQUENCY = originalEnv;
      } else {
        delete process.env.CHARACTER_GENERATION_FREQUENCY;
      }
    });
  });

  describe('End-to-End Room Generation with Characters', () => {
    test('should create rooms with varying character presence', async () => {
      const originalEnv = process.env.CHARACTER_GENERATION_FREQUENCY;
      process.env.CHARACTER_GENERATION_FREQUENCY = '40';
      
      // Create game and starting room
      await db.run('INSERT INTO games (id, name, created_at) VALUES (1, "Test Game", datetime("now"))');
      await db.run('INSERT INTO rooms (id, name, description, game_id) VALUES (1, "Start Room", "Starting room", 1)');
      
      const roomResults = [];
      
      // Generate several rooms and track their character counts
      for (let i = 0; i < 20; i++) {
        const roomId = i + 2;  // Start from room 2
        
        // Simulate room generation
        const generatedRoom = await grokClient.generateRoom({
          currentRoom: { name: 'Start Room', description: 'Starting room' },
          direction: 'north'
        });
        
        // Create the room in database
        await db.run(
          'INSERT INTO rooms (id, name, description, game_id) VALUES (?, ?, ?, ?)',
          [roomId, generatedRoom.name, generatedRoom.description, 1]
        );
        
        // Create characters if any were generated
        if (generatedRoom.characters && generatedRoom.characters.length > 0) {
          await characterGenerationService.createCharactersFromRoomGeneration(1, roomId, generatedRoom.characters);
        }
        
        // Count characters in this room
        const characterCount = await db.get(
          'SELECT COUNT(*) as count FROM characters WHERE current_room_id = ?',
          [roomId]
        );
        
        roomResults.push({
          roomId,
          roomName: generatedRoom.name,
          expectedCharacters: generatedRoom.characters?.length || 0,
          actualCharacters: characterCount.count
        });
      }
      
      // Verify we have a mix of rooms with and without characters
      const emptyRooms = roomResults.filter(r => r.actualCharacters === 0);
      const roomsWithCharacters = roomResults.filter(r => r.actualCharacters > 0);
      
      expect(emptyRooms.length).toBeGreaterThan(0);     // Should have some empty rooms
      expect(roomsWithCharacters.length).toBeGreaterThan(0); // Should have some rooms with characters
      
      console.log(`Generated ${roomResults.length} rooms: ${emptyRooms.length} without characters, ${roomsWithCharacters.length} with characters`);
      
      // Verify character counts match expectations
      roomResults.forEach(result => {
        expect(result.actualCharacters).toBe(result.expectedCharacters);
      });

      // Restore environment variable
      if (originalEnv !== undefined) {
        process.env.CHARACTER_GENERATION_FREQUENCY = originalEnv;
      } else {
        delete process.env.CHARACTER_GENERATION_FREQUENCY;
      }
    });
  });
});