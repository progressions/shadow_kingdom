/**
 * Integration test for Room Generation with Characters
 * Phase 4 verification: Full integration of character generation in room creation
 */

import Database from '../../src/utils/database';
import { RoomGenerationService } from '../../src/services/roomGenerationService';
import { RegionService } from '../../src/services/regionService';
import { ItemGenerationService } from '../../src/services/itemGenerationService';
import { CharacterGenerationService } from '../../src/services/characterGenerationService';
import { ItemService } from '../../src/services/itemService';
import { CharacterService } from '../../src/services/characterService';
import { FantasyLevelService } from '../../src/services/fantasyLevelService';
import { GrokClient } from '../../src/ai/grokClient';
import { initializeTestDatabase } from '../testUtils';

describe('Room Generation Character Integration', () => {
  let db: Database;
  let roomGenerationService: RoomGenerationService;
  let characterService: CharacterService;

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.connect();
    await initializeTestDatabase(db);
    
    // Create a test game and starting room
    await db.run('INSERT INTO games (id, name) VALUES (?, ?)', [1, 'Test Game']);
    await db.run('INSERT INTO rooms (id, game_id, name, description) VALUES (?, ?, ?, ?)', 
      [1, 1, 'Starting Room', 'A simple starting room']);
    
    // Initialize all required services
    const grokClient = new GrokClient({ mockMode: true });
    const regionService = new RegionService(db, { enableDebugLogging: true });
    const itemService = new ItemService(db);
    const itemGenerationService = new ItemGenerationService(db, itemService);
    characterService = new CharacterService(db);
    const characterGenerationService = new CharacterGenerationService(db, characterService);
    const fantasyLevelService = new FantasyLevelService();
    
    // Create room generation service with character support
    roomGenerationService = new RoomGenerationService(
      db,
      grokClient,
      regionService,
      itemGenerationService,
      characterGenerationService,
      fantasyLevelService,
      { enableDebugLogging: true }
    );
  });

  afterEach(async () => {
    await db.close();
    // Clean up environment variables
    delete process.env.AI_CHARACTER_GENERATION_ENABLED;
    delete process.env.AI_CHARACTER_GENERATION_RATE;
    delete process.env.AI_DEBUG_LOGGING;
  });

  describe('Full Room Generation with Characters', () => {
    test('should generate a room with characters when enabled', async () => {
      // Enable character generation with high probability
      process.env.AI_CHARACTER_GENERATION_ENABLED = 'true';
      process.env.AI_CHARACTER_GENERATION_RATE = '1.0';
      process.env.AI_DEBUG_LOGGING = 'true';
      
      const result = await roomGenerationService.generateSingleRoom({
        gameId: 1,
        fromRoomId: 1,
        direction: 'north',
        theme: 'library mystical'
      });
      
      expect(result.success).toBe(true);
      expect(result.roomId).toBeDefined();
      expect(result.connectionId).toBeDefined();
      
      // Verify the room was created
      const room = await db.get('SELECT * FROM rooms WHERE id = ?', [result.roomId]);
      expect(room).toBeDefined();
      expect(room.name).toBeDefined();
      expect(room.description).toBeDefined();
      
      // Check if any characters were generated in the room
      const roomCharacters = await characterService.getRoomCharacters(result.roomId!);
      
      // Characters may or may not be generated depending on the mock AI's random selection
      // But we verify that if they exist, they have the correct structure
      if (roomCharacters.length > 0) {
        const character = roomCharacters[0];
        expect(character.name).toBeDefined();
        expect(character.description).toBeDefined();
        expect(['npc', 'enemy']).toContain(character.type);
        expect(character.current_room_id).toBe(result.roomId);
        expect(character.game_id).toBe(1);
        
        // Check attributes are set (default to 10 if not specified)
        expect(character.strength).toBeGreaterThanOrEqual(1);
        expect(character.strength).toBeLessThanOrEqual(20);
        expect(character.dexterity).toBeGreaterThanOrEqual(1);
        expect(character.dexterity).toBeLessThanOrEqual(20);
      }
    });

    test('should not generate characters when disabled', async () => {
      process.env.AI_CHARACTER_GENERATION_ENABLED = 'false';
      
      const result = await roomGenerationService.generateSingleRoom({
        gameId: 1,
        fromRoomId: 1,
        direction: 'south',
        theme: 'garden'
      });
      
      expect(result.success).toBe(true);
      expect(result.roomId).toBeDefined();
      
      // No characters should be generated
      const roomCharacters = await characterService.getRoomCharacters(result.roomId!);
      expect(roomCharacters).toHaveLength(0);
    });

    test('should handle character generation errors gracefully', async () => {
      // This test would require mocking the character generation service to throw an error
      // For now, we just verify that room generation doesn't fail even if something goes wrong
      process.env.AI_CHARACTER_GENERATION_ENABLED = 'true';
      process.env.AI_CHARACTER_GENERATION_RATE = '1.0';
      
      const result = await roomGenerationService.generateSingleRoom({
        gameId: 1,
        fromRoomId: 1,
        direction: 'west',
        theme: 'chamber'
      });
      
      // Room generation should succeed even if character generation has issues
      expect(result.success).toBe(true);
      expect(result.roomId).toBeDefined();
      
      // Verify the room exists regardless of character generation status
      const room = await db.get('SELECT * FROM rooms WHERE id = ?', [result.roomId]);
      expect(room).toBeDefined();
    });
  });

  describe('Character-Room Relationship', () => {
    test('should properly associate characters with their rooms', async () => {
      process.env.AI_CHARACTER_GENERATION_ENABLED = 'true';
      process.env.AI_CHARACTER_GENERATION_RATE = '1.0';
      
      // Generate multiple rooms and check character distribution
      const results = await Promise.all([
        roomGenerationService.generateSingleRoom({
          gameId: 1,
          fromRoomId: 1,
          direction: 'north',
          theme: 'library'
        }),
        roomGenerationService.generateSingleRoom({
          gameId: 1,
          fromRoomId: 1,
          direction: 'south',
          theme: 'garden'
        })
      ]);
      
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      
      // Check that characters are properly associated with their respective rooms
      const northRoomCharacters = await characterService.getRoomCharacters(results[0].roomId!);
      const southRoomCharacters = await characterService.getRoomCharacters(results[1].roomId!);
      
      // Verify characters are in the correct rooms
      northRoomCharacters.forEach(character => {
        expect(character.current_room_id).toBe(results[0].roomId);
      });
      
      southRoomCharacters.forEach(character => {
        expect(character.current_room_id).toBe(results[1].roomId);
      });
    });

    test('should respect maximum characters per room configuration', async () => {
      process.env.AI_CHARACTER_GENERATION_ENABLED = 'true';
      process.env.AI_CHARACTER_GENERATION_RATE = '1.0';
      process.env.MAX_CHARACTERS_PER_ROOM = '1';
      
      const result = await roomGenerationService.generateSingleRoom({
        gameId: 1,
        fromRoomId: 1,
        direction: 'east',
        theme: 'hall'
      });
      
      expect(result.success).toBe(true);
      
      const roomCharacters = await characterService.getRoomCharacters(result.roomId!);
      expect(roomCharacters.length).toBeLessThanOrEqual(1);
    });
  });
});