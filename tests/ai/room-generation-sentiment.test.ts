/**
 * AI Room Generation Sentiment Awareness Tests - Phase 13
 * 
 * Tests for including character sentiment context in room generation
 */

import Database from '../../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import { RoomGenerationService } from '../../src/services/roomGenerationService';
import { CharacterService } from '../../src/services/characterService';
import { RegionService } from '../../src/services/regionService';
import { ItemGenerationService } from '../../src/services/itemGenerationService';
import { CharacterGenerationService } from '../../src/services/characterGenerationService';
import { FantasyLevelService } from '../../src/services/fantasyLevelService';
import { GrokClient } from '../../src/ai/grokClient';
import { CharacterSentiment, CharacterType } from '../../src/types/character';

// Mock the GrokClient
jest.mock('../../src/ai/grokClient');

describe('AI Room Generation Sentiment Awareness - Phase 13', () => {
  let db: Database;
  let roomGenerationService: RoomGenerationService;
  let characterService: CharacterService;
  let mockGrokClient: jest.Mocked<GrokClient>;
  let mockRegionService: jest.Mocked<RegionService>;
  let mockItemGenerationService: jest.Mocked<ItemGenerationService>;
  let mockCharacterGenerationService: jest.Mocked<CharacterGenerationService>;
  let mockFantasyLevelService: jest.Mocked<FantasyLevelService>;
  let gameId: number;
  let roomId: number;

  beforeEach(async () => {
    // Ensure we use legacy services, not Prisma
    process.env.USE_PRISMA = 'false';
    process.env.NODE_ENV = 'test';
    process.env.AI_MOCK_MODE = 'true';
    
    // Create in-memory database for testing
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);

    // Create services
    characterService = new CharacterService(db);
    
    // Create mock GrokClient
    mockGrokClient = {
      generateRoomDescription: jest.fn(),
      isMockMode: true,
      getUsageStats: jest.fn().mockReturnValue({
        tokensUsed: { input: 0, output: 0, cost: 0 },
        estimatedCost: '$0.0000'
      }),
      setMockMode: jest.fn(),
      setLoggerService: jest.fn(),
      cleanup: jest.fn()
    } as any;

    // Create mock services
    mockRegionService = {} as any;
    mockItemGenerationService = {} as any;
    mockCharacterGenerationService = {} as any;
    mockFantasyLevelService = {} as any;

    roomGenerationService = new RoomGenerationService(
      db, 
      mockGrokClient,
      mockRegionService,
      mockItemGenerationService,
      mockCharacterGenerationService,
      mockFantasyLevelService
    );

    // Create a unique test game
    const uniqueGameName = `Room Sentiment Test ${Date.now()}-${Math.random()}`;
    gameId = await createGameWithRooms(db, uniqueGameName);

    // Get a room to work with
    const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
    roomId = rooms[0].id;
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('Sentiment Context Inclusion', () => {
    it('should include character sentiment information in room generation prompts', async () => {
      // Create characters with different sentiments in the room
      await characterService.createCharacter({
        game_id: gameId,
        name: 'Hostile Bandit',
        description: 'A dangerous outlaw',
        type: CharacterType.ENEMY,
        current_room_id: roomId,
        sentiment: CharacterSentiment.HOSTILE
      });

      await characterService.createCharacter({
        game_id: gameId,
        name: 'Friendly Merchant',
        description: 'A kind trader',
        type: CharacterType.NPC,
        current_room_id: roomId,
        sentiment: CharacterSentiment.FRIENDLY
      });

      // Mock successful room generation
      mockGrokClient.generateRoomDescription.mockResolvedValue({
        name: 'Tense Trading Post',
        description: 'A trading post with an uneasy atmosphere. The friendly merchant tries to maintain normalcy while a hostile bandit lurks menacingly in the corner.'
      });

      // Generate room description
      await roomGenerationService.generateRoomWithSentimentContext(roomId);

      // Verify the prompt included sentiment information
      expect(mockGrokClient.generateRoomDescription).toHaveBeenCalledWith(
        expect.stringContaining('Hostile Bandit: hostile'),
        expect.any(Object)
      );
      expect(mockGrokClient.generateRoomDescription).toHaveBeenCalledWith(
        expect.stringContaining('Friendly Merchant: friendly'),
        expect.any(Object)
      );
      expect(mockGrokClient.generateRoomDescription).toHaveBeenCalledWith(
        expect.stringContaining('Generate room atmosphere considering character emotional states'),
        expect.any(Object)
      );
    });

    it('should handle rooms with no characters gracefully', async () => {
      // Create a new empty room for this test
      const emptyRoom = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Empty Test Room', 'A room for testing']
      );
      const emptyRoomId = emptyRoom.lastID as number;

      // Mock room generation for empty room
      mockGrokClient.generateRoomDescription.mockResolvedValue({
        name: 'Empty Chamber',
        description: 'A quiet, empty chamber with neutral atmosphere.'
      });

      // Generate room description for room with no characters
      await roomGenerationService.generateRoomWithSentimentContext(emptyRoomId);

      // Should still call AI but with empty character context
      expect(mockGrokClient.generateRoomDescription).toHaveBeenCalledWith(
        expect.stringContaining('No characters currently present'),
        expect.any(Object)
      );
    });

    it('should include mixed sentiment guidance in prompts', async () => {
      // Create characters with mixed sentiments
      await characterService.createCharacter({
        game_id: gameId,
        name: 'Aggressive Guard',
        description: 'An unfriendly guard',
        type: CharacterType.NPC,
        current_room_id: roomId,
        sentiment: CharacterSentiment.AGGRESSIVE
      });

      await characterService.createCharacter({
        game_id: gameId,
        name: 'Allied Knight',
        description: 'A loyal knight',
        type: CharacterType.NPC,
        current_room_id: roomId,
        sentiment: CharacterSentiment.ALLIED
      });

      mockGrokClient.generateRoomDescription.mockResolvedValue({
        name: 'Guard Post',
        description: 'A guard post with complex social dynamics.'
      });

      await roomGenerationService.generateRoomWithSentimentContext(roomId);

      // Verify prompt includes mixed sentiment guidance
      const call = mockGrokClient.generateRoomDescription.mock.calls[0][0];
      expect(call).toContain('Mixed sentiments create complex social dynamics');
      expect(call).toContain('Aggressive Guard: aggressive');
      expect(call).toContain('Allied Knight: allied');
    });
  });

  describe('Atmosphere Generation Based on Sentiment', () => {
    it('should generate tense atmosphere for hostile characters', async () => {
      // Create multiple hostile characters
      await characterService.createCharacter({
        game_id: gameId,
        name: 'Hostile Orc',
        description: 'A menacing orc',
        type: CharacterType.ENEMY,
        current_room_id: roomId,
        sentiment: CharacterSentiment.HOSTILE
      });

      await characterService.createCharacter({
        game_id: gameId,
        name: 'Aggressive Bandit',
        description: 'A threatening bandit',
        type: CharacterType.ENEMY,
        current_room_id: roomId,
        sentiment: CharacterSentiment.AGGRESSIVE
      });

      mockGrokClient.generateRoomDescription.mockResolvedValue({
        name: 'Bandit Den',
        description: 'A dangerous den filled with tension and the threat of violence.'
      });

      const result = await roomGenerationService.generateRoomWithSentimentContext(roomId);

      // Verify atmosphere reflects hostility
      expect(result?.description).toContain('dangerous');
      expect(mockGrokClient.generateRoomDescription).toHaveBeenCalledWith(
        expect.stringContaining('Hostile characters create tense, dangerous atmosphere'),
        expect.any(Object)
      );
    });

    it('should generate welcoming atmosphere for friendly characters', async () => {
      // Create friendly characters
      await characterService.createCharacter({
        game_id: gameId,
        name: 'Kind Innkeeper',
        description: 'A welcoming host',
        type: CharacterType.NPC,
        current_room_id: roomId,
        sentiment: CharacterSentiment.FRIENDLY
      });

      await characterService.createCharacter({
        game_id: gameId,
        name: 'Helpful Guide',
        description: 'A supportive ally',
        type: CharacterType.NPC,
        current_room_id: roomId,
        sentiment: CharacterSentiment.ALLIED
      });

      mockGrokClient.generateRoomDescription.mockResolvedValue({
        name: 'Cozy Inn',
        description: 'A warm and welcoming inn where travelers feel safe and comfortable.'
      });

      const result = await roomGenerationService.generateRoomWithSentimentContext(roomId);

      // Verify atmosphere reflects friendliness
      expect(result?.description).toContain('welcoming');
      expect(mockGrokClient.generateRoomDescription).toHaveBeenCalledWith(
        expect.stringContaining('Friendly characters create welcoming environment'),
        expect.any(Object)
      );
    });

    it('should generate neutral atmosphere for indifferent characters', async () => {
      // Create indifferent characters
      await characterService.createCharacter({
        game_id: gameId,
        name: 'Busy Clerk',
        description: 'A neutral clerk',
        type: CharacterType.NPC,
        current_room_id: roomId,
        sentiment: CharacterSentiment.INDIFFERENT
      });

      mockGrokClient.generateRoomDescription.mockResolvedValue({
        name: 'Administrative Office',
        description: 'A functional office space with a business-like atmosphere.'
      });

      const result = await roomGenerationService.generateRoomWithSentimentContext(roomId);

      expect(result?.description).toContain('business-like');
    });
  });

  describe('Fallback Handling', () => {
    it('should handle AI generation failure gracefully', async () => {
      // Create a character
      await characterService.createCharacter({
        game_id: gameId,
        name: 'Test Character',
        description: 'A test character',
        type: CharacterType.NPC,
        current_room_id: roomId,
        sentiment: CharacterSentiment.FRIENDLY
      });

      // Mock AI failure
      mockGrokClient.generateRoomDescription.mockRejectedValue(new Error('AI generation failed'));

      // Should not throw, should use fallback
      const result = await roomGenerationService.generateRoomWithSentimentContext(roomId);

      // Should return fallback result
      expect(result).toBeTruthy();
      expect(result?.name).toContain('Generated Room');
    });

    it('should use fallback when AI returns invalid response', async () => {
      // Create a character
      await characterService.createCharacter({
        game_id: gameId,
        name: 'Test Character',
        description: 'A test character',
        type: CharacterType.NPC,
        current_room_id: roomId,
        sentiment: CharacterSentiment.HOSTILE
      });

      // Mock invalid AI response
      mockGrokClient.generateRoomDescription.mockResolvedValue(null as any);

      const result = await roomGenerationService.generateRoomWithSentimentContext(roomId);

      // Should return fallback result
      expect(result).toBeTruthy();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle rooms with many characters efficiently', async () => {
      // Create 10 characters with various sentiments
      const sentiments = [
        CharacterSentiment.HOSTILE,
        CharacterSentiment.AGGRESSIVE,
        CharacterSentiment.INDIFFERENT,
        CharacterSentiment.FRIENDLY,
        CharacterSentiment.ALLIED
      ];

      for (let i = 0; i < 10; i++) {
        await characterService.createCharacter({
          game_id: gameId,
          name: `Character ${i}`,
          description: `Test character ${i}`,
          type: CharacterType.NPC,
          current_room_id: roomId,
          sentiment: sentiments[i % sentiments.length]
        });
      }

      mockGrokClient.generateRoomDescription.mockResolvedValue({
        name: 'Crowded Room',
        description: 'A room bustling with many different personalities and moods.'
      });

      const startTime = performance.now();
      const result = await roomGenerationService.generateRoomWithSentimentContext(roomId);
      const endTime = performance.now();

      // Should complete quickly
      expect(endTime - startTime).toBeLessThan(100); // Less than 100ms
      expect(result).toBeTruthy();

      // Verify all characters included in prompt
      const call = mockGrokClient.generateRoomDescription.mock.calls[0][0];
      for (let i = 0; i < 10; i++) {
        expect(call).toContain(`Character ${i}`);
      }
    });

    it('should handle dead characters appropriately', async () => {
      // Create living and dead characters
      const livingId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Living Character',
        description: 'Alive and well',
        type: CharacterType.NPC,
        current_room_id: roomId,
        sentiment: CharacterSentiment.FRIENDLY
      });

      const deadId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Dead Character',
        description: 'No longer among the living',
        type: CharacterType.NPC,
        current_room_id: roomId,
        sentiment: CharacterSentiment.INDIFFERENT
      });

      // Kill one character
      await characterService.setCharacterDead(deadId);

      mockGrokClient.generateRoomDescription.mockResolvedValue({
        name: 'Room with Death',
        description: 'A room where life and death coexist.'
      });

      await roomGenerationService.generateRoomWithSentimentContext(roomId);

      // Should only include living characters in sentiment analysis
      const call = mockGrokClient.generateRoomDescription.mock.calls[0][0];
      expect(call).toContain('Living Character: friendly');
      expect(call).not.toContain('Dead Character: indifferent');
    });
  });
});