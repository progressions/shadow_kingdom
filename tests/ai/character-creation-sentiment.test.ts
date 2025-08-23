import Database from '../../src/utils/database';
import { initializeDatabase } from '../../src/utils/initDb';
import { CharacterService } from '../../src/services/characterService';
import { RoomGenerationService } from '../../src/services/roomGenerationService';
import { RegionService } from '../../src/services/regionService';
import { ItemGenerationService } from '../../src/services/itemGenerationService';
import { ItemService } from '../../src/services/itemService';
import { CharacterGenerationService } from '../../src/services/characterGenerationService';
import { FantasyLevelService } from '../../src/services/fantasyLevelService';
import { GrokClient } from '../../src/ai/grokClient';
import { CharacterSentiment, CharacterType } from '../../src/types/character';

// Mock the GrokClient
jest.mock('../../src/ai/grokClient');

describe('AI Character Creation with Sentiment Selection (Phase 14)', () => {
  let db: Database;
  let characterService: CharacterService;
  let roomGenerationService: RoomGenerationService;
  let regionService: RegionService;
  let itemGenerationService: ItemGenerationService;
  let itemService: ItemService;
  let characterGenerationService: CharacterGenerationService;
  let fantasyLevelService: FantasyLevelService;
  let mockGrokClient: jest.Mocked<GrokClient>;
  let gameId: number;
  let roomId: number;
  let regionId: number;

  beforeEach(async () => {
    // Set test environment
    process.env.AI_MOCK_MODE = 'true';
    process.env.AI_DEBUG_LOGGING = 'false';
    
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);

    // Setup mock GrokClient
    const MockGrokClient = require('../../src/ai/grokClient').GrokClient;
    mockGrokClient = new MockGrokClient({
      mockMode: true,
      enableDebugLogging: false
    }) as jest.Mocked<GrokClient>;

    regionService = new RegionService(db);
    itemService = new ItemService(db);
    itemGenerationService = new ItemGenerationService(db, itemService);
    characterService = new CharacterService(db);
    characterGenerationService = new CharacterGenerationService(db, characterService);
    fantasyLevelService = new FantasyLevelService();
    roomGenerationService = new RoomGenerationService(db, mockGrokClient, regionService, itemGenerationService, characterGenerationService, fantasyLevelService);

    // Create test game
    const gameResult = await db.run(`
      INSERT INTO games (name, created_at, last_played_at) 
      VALUES ('Sentiment Test Game', '2025-08-23 10:00:00', '2025-08-23 10:00:00')
    `);
    gameId = gameResult.lastID as number;

    // Create test region
    const region = await regionService.createRegion(gameId, 'test', 'A test region', 'Test Region');
    regionId = region.id;

    // Create test room
    const roomResult = await db.run(`
      INSERT INTO rooms (game_id, name, description, region_id) 
      VALUES (?, 'Test Room', 'A room for testing character creation', ?)
    `, [gameId, regionId]);
    roomId = roomResult.lastID as number;
  });

  afterEach(async () => {
    if (db.isConnected()) {
      await db.close();
    }
  });

  describe('Intelligent Sentiment Selection', () => {
    it('should select appropriate sentiment based on character type and room context', async () => {
      // Mock AI to return a character with contextually appropriate sentiment
      mockGrokClient.generateCharacterWithSentiment = jest.fn().mockResolvedValue({
        name: 'Gruff Guardian',
        type: CharacterType.ENEMY,
        sentiment: CharacterSentiment.AGGRESSIVE,
        contextReasoning: 'Guardian characters are typically aggressive toward intruders'
      });

      // Create character using AI sentiment selection
      const result = await roomGenerationService.generateCharacterWithSentimentContext(roomId, {
        roomName: 'Ancient Treasury',
        roomDescription: 'A heavily guarded vault filled with golden treasures',
        regionName: 'Forbidden Fortress',
        existingCharacters: []
      });

      expect(result).not.toBeNull();
      expect(result.sentiment).toBe(CharacterSentiment.AGGRESSIVE);
      expect(result.type).toBe(CharacterType.ENEMY);
      expect(mockGrokClient.generateCharacterWithSentiment).toHaveBeenCalledWith(
        expect.stringContaining('Ancient Treasury'),
        expect.objectContaining({
          roomId,
          roomName: 'Ancient Treasury',
          regionName: 'Forbidden Fortress'
        })
      );
    });

    it('should generate friendly NPCs in peaceful contexts', async () => {
      // Mock AI to return friendly merchant in peaceful setting
      mockGrokClient.generateCharacterWithSentiment = jest.fn().mockResolvedValue({
        name: 'Kind Merchant',
        type: CharacterType.NPC,
        sentiment: CharacterSentiment.FRIENDLY,
        contextReasoning: 'Merchants in peaceful villages are typically friendly to potential customers'
      });

      const result = await roomGenerationService.generateCharacterWithSentimentContext(roomId, {
        roomName: 'Village Market',
        roomDescription: 'A bustling marketplace with colorful stalls and cheerful vendors',
        regionName: 'Peaceful Village',
        existingCharacters: []
      });

      expect(result).not.toBeNull();
      expect(result.sentiment).toBe(CharacterSentiment.FRIENDLY);
      expect(result.type).toBe(CharacterType.NPC);
    });

    it('should consider existing characters when selecting sentiment', async () => {
      // Mock AI to return hostile character in response to existing friendly characters (conflict)
      mockGrokClient.generateCharacterWithSentiment = jest.fn().mockResolvedValue({
        name: 'Rival Thief',
        type: CharacterType.ENEMY,
        sentiment: CharacterSentiment.HOSTILE,
        contextReasoning: 'Creating conflict with existing friendly merchant'
      });

      const existingCharacters = [
        { name: 'Friendly Merchant', sentiment: CharacterSentiment.FRIENDLY, type: CharacterType.NPC }
      ];

      const result = await roomGenerationService.generateCharacterWithSentimentContext(roomId, {
        roomName: 'Market Square',
        roomDescription: 'A busy trading area',
        regionName: 'Trading District', 
        existingCharacters
      });

      expect(result).not.toBeNull();
      expect(result.sentiment).toBe(CharacterSentiment.HOSTILE);
      
      // Should pass existing character info to AI
      expect(mockGrokClient.generateCharacterWithSentiment).toHaveBeenCalledWith(
        expect.stringContaining('Existing characters'),
        expect.objectContaining({
          existingCharacters: expect.arrayContaining([
            expect.objectContaining({ sentiment: CharacterSentiment.FRIENDLY })
          ])
        })
      );
    });

    it('should generate indifferent characters in neutral contexts', async () => {
      // Mock AI to return indifferent guard in neutral setting
      mockGrokClient.generateCharacterWithSentiment = jest.fn().mockResolvedValue({
        name: 'Stoic Guard',
        type: CharacterType.NPC,
        sentiment: CharacterSentiment.INDIFFERENT,
        contextReasoning: 'Guards at neutral outposts are typically indifferent to travelers'
      });

      const result = await roomGenerationService.generateCharacterWithSentimentContext(roomId, {
        roomName: 'Guard Outpost',
        roomDescription: 'A functional military checkpoint with basic amenities',
        regionName: 'Border Crossing',
        existingCharacters: []
      });

      expect(result).not.toBeNull();
      expect(result.sentiment).toBe(CharacterSentiment.INDIFFERENT);
    });

    it('should rarely generate allied characters (special circumstances only)', async () => {
      // Mock AI to return allied character in special rescue context
      mockGrokClient.generateCharacterWithSentiment = jest.fn().mockResolvedValue({
        name: 'Grateful Prisoner',
        type: CharacterType.NPC,
        sentiment: CharacterSentiment.ALLIED,
        contextReasoning: 'Rescued prisoners become allied due to gratitude'
      });

      const result = await roomGenerationService.generateCharacterWithSentimentContext(roomId, {
        roomName: 'Prison Cell',
        roomDescription: 'A dank cell with signs of recent rescue activity',
        regionName: 'Dungeon Complex',
        existingCharacters: []
      });

      expect(result).not.toBeNull();
      expect(result.sentiment).toBe(CharacterSentiment.ALLIED);
    });
  });

  describe('AI Prompt Construction', () => {
    it('should build comprehensive context prompt with room details', async () => {
      mockGrokClient.generateCharacterWithSentiment = jest.fn().mockResolvedValue({
        name: 'Context Character',
        type: CharacterType.NPC,
        sentiment: CharacterSentiment.INDIFFERENT
      });

      await roomGenerationService.generateCharacterWithSentimentContext(roomId, {
        roomName: 'Mystic Library',
        roomDescription: 'Ancient tomes line the walls of this scholarly sanctuary',
        regionName: 'Academy of Magic',
        existingCharacters: []
      });

      const calledPrompt = mockGrokClient.generateCharacterWithSentiment.mock.calls[0][0];
      
      expect(calledPrompt).toContain('Mystic Library');
      expect(calledPrompt).toContain('Ancient tomes line the walls');
      expect(calledPrompt).toContain('Academy of Magic');
      expect(calledPrompt).toContain('sentiment');
      expect(calledPrompt).toContain('hostile');
      expect(calledPrompt).toContain('friendly');
      expect(calledPrompt).toContain('allied');
    });

    it('should include existing character information in prompt', async () => {
      mockGrokClient.generateCharacterWithSentiment = jest.fn().mockResolvedValue({
        name: 'Responding Character',
        type: CharacterType.ENEMY,
        sentiment: CharacterSentiment.AGGRESSIVE
      });

      const existingCharacters = [
        { name: 'Wise Scholar', sentiment: CharacterSentiment.FRIENDLY, type: CharacterType.NPC },
        { name: 'Guard Captain', sentiment: CharacterSentiment.INDIFFERENT, type: CharacterType.NPC }
      ];

      await roomGenerationService.generateCharacterWithSentimentContext(roomId, {
        roomName: 'Academy Hall',
        roomDescription: 'A grand hall',
        regionName: 'Magic Academy',
        existingCharacters
      });

      const calledPrompt = mockGrokClient.generateCharacterWithSentiment.mock.calls[0][0];
      
      expect(calledPrompt).toContain('Wise Scholar');
      expect(calledPrompt).toContain('Guard Captain');
      expect(calledPrompt).toContain('friendly');
      expect(calledPrompt).toContain('indifferent');
    });

    it('should provide sentiment guidelines in prompt', async () => {
      mockGrokClient.generateCharacterWithSentiment = jest.fn().mockResolvedValue({
        name: 'Guideline Character',
        type: CharacterType.NPC,
        sentiment: CharacterSentiment.INDIFFERENT
      });

      await roomGenerationService.generateCharacterWithSentimentContext(roomId, {
        roomName: 'Test Room',
        roomDescription: 'Test description',
        regionName: 'Test Region',
        existingCharacters: []
      });

      const calledPrompt = mockGrokClient.generateCharacterWithSentiment.mock.calls[0][0];
      
      // Should include sentiment selection guidelines
      expect(calledPrompt).toContain('hostile: -2');
      expect(calledPrompt).toContain('aggressive: -1');  
      expect(calledPrompt).toContain('indifferent: 0');
      expect(calledPrompt).toContain('friendly: 1');
      expect(calledPrompt).toContain('allied: 2');
      expect(calledPrompt).toContain('Consider the room context');
    });
  });

  describe('Integration with Character Creation', () => {
    it('should create character in database with AI-selected sentiment', async () => {
      mockGrokClient.generateCharacterWithSentiment = jest.fn().mockResolvedValue({
        name: 'AI Created Character',
        type: CharacterType.ENEMY,
        sentiment: CharacterSentiment.AGGRESSIVE,
        description: 'A character created by AI with appropriate sentiment'
      });

      // Generate and create character
      const result = await roomGenerationService.generateCharacterWithSentimentContext(roomId, {
        roomName: 'Battle Arena',
        roomDescription: 'A dangerous fighting pit',
        regionName: 'Combat Zone',
        existingCharacters: []
      });

      expect(result).not.toBeNull();

      // Create in database using AI result
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: result.name,
        type: result.type as CharacterType,
        current_room_id: roomId,
        sentiment: result.sentiment as CharacterSentiment,
        description: result.description
      });

      // Verify character was created with correct sentiment
      const character = await characterService.getCharacter(characterId);
      expect(character).not.toBeNull();
      expect(character!.sentiment).toBe(CharacterSentiment.AGGRESSIVE);
      expect(character!.name).toBe('AI Created Character');
      expect(character!.type).toBe(CharacterType.ENEMY);
    });

    it('should handle AI generation failure gracefully with fallback sentiment', async () => {
      // Mock AI failure
      mockGrokClient.generateCharacterWithSentiment = jest.fn().mockRejectedValue(new Error('AI generation failed'));

      const result = await roomGenerationService.generateCharacterWithSentimentContext(roomId, {
        roomName: 'Unknown Room',
        roomDescription: 'A mysterious place',
        regionName: 'Unknown Region',
        existingCharacters: []
      });

      // Should return fallback with indifferent sentiment
      expect(result).not.toBeNull();
      expect(result.sentiment).toBe(CharacterSentiment.INDIFFERENT);
      expect(result.name).toMatch(/Wanderer|Stranger|Figure/i);
    });
  });

  describe('Mock Mode Behavior', () => {
    it('should use mock engine when in mock mode', async () => {
      const result = await roomGenerationService.generateCharacterWithSentimentContext(roomId, {
        roomName: 'Mock Test Room',
        roomDescription: 'Testing mock functionality',
        regionName: 'Mock Region',
        existingCharacters: []
      });

      // Mock should return reasonable character
      expect(result).not.toBeNull();
      expect(result).toBeDefined();
      if (result) {
        expect(Object.values(CharacterSentiment)).toContain(result.sentiment);
        expect(Object.values(CharacterType)).toContain(result.type);
        expect(typeof result.name).toBe('string');
        expect(result.name.length).toBeGreaterThan(0);
      }
    });
  });
});