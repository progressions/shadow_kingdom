import Database from '../../src/utils/database';
import { initializeDatabase } from '../../src/utils/initDb';
import { CharacterService } from '../../src/services/characterService';
import { CharacterSentiment, CharacterType } from '../../src/types/character';
import { GrokClient, BehavioralDialogueContext } from '../../src/ai/grokClient';

describe('Phase 15: Character Behavioral Dialogue Fallbacks', () => {
  let db: Database;
  let characterService: CharacterService;
  let grokClient: GrokClient;
  let gameId: number;
  let roomId: number;
  let hostileCharacterId: number;
  let friendlyCharacterId: number;

  beforeEach(async () => {
    // Set test environment to use mock mode
    process.env.AI_MOCK_MODE = 'true';
    process.env.AI_DEBUG_LOGGING = 'false';
    
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);

    characterService = new CharacterService(db);
    grokClient = new GrokClient({ mockMode: true });

    // Create test game
    const gameResult = await db.run(`
      INSERT INTO games (name, created_at, last_played_at) 
      VALUES ('Test Game', '2025-08-23 10:00:00', '2025-08-23 10:00:00')
    `);
    gameId = gameResult.lastID as number;

    // Create test room
    const roomResult = await db.run(`
      INSERT INTO rooms (game_id, name, description) 
      VALUES (?, 'Test Room', 'A test room')
    `, [gameId]);
    roomId = roomResult.lastID as number;

    // Create test characters
    hostileCharacterId = await characterService.createCharacter({
      game_id: gameId,
      name: 'Hostile Bandit',
      type: CharacterType.ENEMY,
      current_room_id: roomId,
      sentiment: CharacterSentiment.HOSTILE
    });

    friendlyCharacterId = await characterService.createCharacter({
      game_id: gameId,
      name: 'Kind Merchant', 
      type: CharacterType.NPC,
      current_room_id: roomId,
      sentiment: CharacterSentiment.FRIENDLY
    });
  });

  afterEach(async () => {
    if (db.isConnected()) {
      await db.close();
    }
  });

  describe('AI Behavioral Dialogue Generation', () => {
    it('should generate hostile dialogue using mock engine', async () => {
      const context: BehavioralDialogueContext = {
        characterId: hostileCharacterId,
        characterName: 'Hostile Bandit',
        sentiment: 'hostile',
        playerCommand: 'talk to bandit',
        context: 'Player approaches cautiously'
      };

      const result = await grokClient.generateSentimentBasedDialogue(
        'Generate hostile dialogue',
        context
      );

      expect(result).toBeDefined();
      expect(result.sentimentContext).toBe('hostile');
      expect(result.tone).toBe('threatening');
      expect(result.response).toBeDefined();
      expect(typeof result.response).toBe('string');
      expect(result.response.length).toBeGreaterThan(0);
      expect(Array.isArray(result.suggestedPlayerActions)).toBe(true);
      expect(result.suggestedPlayerActions).toContain('retreat');
      expect(result.suggestedPlayerActions).toContain('attack');
    });

    it('should generate friendly dialogue using mock engine', async () => {
      const context: BehavioralDialogueContext = {
        characterId: friendlyCharacterId,
        characterName: 'Kind Merchant',
        sentiment: 'friendly',
        playerCommand: 'talk to merchant',
        context: 'Player approaches the merchant'
      };

      const result = await grokClient.generateSentimentBasedDialogue(
        'Generate friendly dialogue',
        context
      );

      expect(result).toBeDefined();
      expect(result.sentimentContext).toBe('friendly');
      expect(result.tone).toBe('welcoming');
      expect(result.response).toBeDefined();
      expect(typeof result.response).toBe('string');
      expect(result.response.length).toBeGreaterThan(0);
      expect(Array.isArray(result.suggestedPlayerActions)).toBe(true);
      expect(result.suggestedPlayerActions).toContain('ask_for_help');
      expect(result.suggestedPlayerActions).toContain('trade_items');
    });

    it('should handle conversation history', async () => {
      const context: BehavioralDialogueContext = {
        characterId: hostileCharacterId,
        characterName: 'Hostile Bandit',
        sentiment: 'aggressive',
        playerCommand: 'talk to bandit',
        context: 'Player tries to talk again',
        conversationHistory: [
          { speaker: 'player', message: 'Hello' },
          { speaker: 'character', message: 'Go away!' }
        ]
      };

      const result = await grokClient.generateSentimentBasedDialogue(
        'Generate dialogue with history',
        context
      );

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(result.tone).toBe('impatient');
    });

    it('should handle special locations', async () => {
      const context: BehavioralDialogueContext = {
        characterId: hostileCharacterId,
        characterName: 'Hostile Bandit',
        sentiment: 'aggressive',
        playerCommand: 'talk to bandit',
        context: 'Player talks in sacred temple',
        roomContext: {
          name: 'Sacred Temple',
          description: 'A holy place',
          type: 'sacred'
        }
      };

      const result = await grokClient.generateSentimentBasedDialogue(
        'Generate dialogue in sacred location',
        context
      );

      expect(result).toBeDefined();
      expect(result.locationModifier).toBe('sacred_space');
      expect(result.tone).toBe('reverent');
    });

    it('should generate dialogue for player looking lost', async () => {
      const context: BehavioralDialogueContext = {
        characterId: friendlyCharacterId,
        characterName: 'Kind Merchant',
        sentiment: 'friendly',
        playerCommand: 'talk to merchant',
        context: 'Player looks lost and confused'
      };

      const result = await grokClient.generateSentimentBasedDialogue(
        'Generate helpful dialogue',
        context
      );

      expect(result).toBeDefined();
      expect(result.tone).toBe('helpful');
      expect(result.action).toBe('offers_guidance');
      expect(result.suggestedPlayerActions).toContain('ask_for_directions');
    });
  });

  describe('Performance', () => {
    it('should generate responses quickly', async () => {
      const context: BehavioralDialogueContext = {
        characterId: friendlyCharacterId,
        characterName: 'Kind Merchant',
        sentiment: 'friendly',
        playerCommand: 'talk to merchant',
        context: 'Performance test'
      };

      const startTime = performance.now();
      
      await grokClient.generateSentimentBasedDialogue(
        'Quick test',
        context
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should be very fast in mock mode
    });
  });
});