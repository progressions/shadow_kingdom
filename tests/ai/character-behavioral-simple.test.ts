import Database from '../../src/utils/database';
import { initializeDatabase } from '../../src/utils/initDb';
import { CharacterService } from '../../src/services/characterService';
import { CharacterSentiment, CharacterType } from '../../src/types/character';

describe('AI Character Behavioral Prompts - Simple Test (Phase 15)', () => {
  let db: Database;
  let characterService: CharacterService;
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

    // Create test game
    const gameResult = await db.run(`
      INSERT INTO games (name, created_at, last_played_at) 
      VALUES ('Behavioral Test Game', '2025-08-23 10:00:00', '2025-08-23 10:00:00')
    `);
    gameId = gameResult.lastID as number;

    // Create test room
    const roomResult = await db.run(`
      INSERT INTO rooms (game_id, name, description) 
      VALUES (?, 'Test Room', 'A room for testing behavioral responses')
    `, [gameId]);
    roomId = roomResult.lastID as number;

    // Create hostile character
    hostileCharacterId = await characterService.createCharacter({
      game_id: gameId,
      name: 'Hostile Bandit',
      type: CharacterType.ENEMY,
      current_room_id: roomId,
      sentiment: CharacterSentiment.HOSTILE,
      description: 'A dangerous bandit with murderous intent'
    });

    // Create friendly character
    friendlyCharacterId = await characterService.createCharacter({
      game_id: gameId,
      name: 'Kind Merchant',
      type: CharacterType.NPC,
      current_room_id: roomId,
      sentiment: CharacterSentiment.FRIENDLY,
      description: 'A welcoming merchant eager to help'
    });
  });

  afterEach(async () => {
    if (db.isConnected()) {
      await db.close();
    }
  });

  describe('Basic Behavioral Dialogue', () => {
    it('should generate hostile behavioral dialogue', async () => {
      const result = await characterService.generateBehavioralDialogue(hostileCharacterId, {
        playerCommand: 'talk to bandit',
        context: 'Player approaches cautiously'
      });

      expect(result).not.toBeNull();
      expect(result.sentimentContext).toBe('hostile');
      expect(result.tone).toBe('threatening');
      expect(result.response).toBeDefined();
      expect(typeof result.response).toBe('string');
      expect(result.response.length).toBeGreaterThan(0);
      expect(result.suggestedPlayerActions).toBeDefined();
      expect(Array.isArray(result.suggestedPlayerActions)).toBe(true);
    });

    it('should generate friendly behavioral dialogue', async () => {
      const result = await characterService.generateBehavioralDialogue(friendlyCharacterId, {
        playerCommand: 'talk to merchant',
        context: 'Player approaches the friendly merchant'
      });

      expect(result).not.toBeNull();
      expect(result.sentimentContext).toBe('friendly');
      expect(result.tone).toBe('welcoming');
      expect(result.response).toBeDefined();
      expect(typeof result.response).toBe('string');
      expect(result.response.length).toBeGreaterThan(0);
      expect(result.suggestedPlayerActions).toBeDefined();
      expect(Array.isArray(result.suggestedPlayerActions)).toBe(true);
    });

    it('should handle non-existent character', async () => {
      await expect(characterService.generateBehavioralDialogue(9999, {
        playerCommand: 'talk',
        context: 'test'
      })).rejects.toThrow('Character 9999 not found');
    });

    it('should respond quickly for good UX', async () => {
      const startTime = performance.now();
      
      await characterService.generateBehavioralDialogue(friendlyCharacterId, {
        playerCommand: 'talk to merchant',
        context: 'Performance test'
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should be very fast in mock mode
      expect(duration).toBeLessThan(500);
    });
  });
});