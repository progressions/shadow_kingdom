import Database from '../../src/utils/database';
import { initializeDatabase } from '../../src/utils/initDb';
import { CharacterService } from '../../src/services/characterService';
import { CharacterSentiment, CharacterType } from '../../src/types/character';

describe('Phase 15: Basic Behavioral Dialogue Tests', () => {
  let db: Database;
  let characterService: CharacterService;
  let gameId: number;
  let roomId: number;
  let hostileCharacterId: number;

  beforeEach(async () => {
    // Set test environment to use mock mode (no real API calls)
    process.env.AI_MOCK_MODE = 'true';
    process.env.AI_DEBUG_LOGGING = 'false';
    
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);

    characterService = new CharacterService(db);

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

    // Create test character
    hostileCharacterId = await characterService.createCharacter({
      game_id: gameId,
      name: 'Test Bandit',
      type: CharacterType.ENEMY,
      current_room_id: roomId,
      sentiment: CharacterSentiment.HOSTILE
    });
  });

  afterEach(async () => {
    if (db.isConnected()) {
      await db.close();
    }
  });

  it('should generate behavioral dialogue for hostile character', async () => {
    const result = await characterService.generateBehavioralDialogue(hostileCharacterId, {
      playerCommand: 'talk to bandit',
      context: 'Player tries to talk'
    });

    // Basic expectations - the dialogue system should return a proper response
    expect(result).toBeDefined();
    expect(result.response).toBeDefined();
    expect(result.sentimentContext).toBe('hostile');
    expect(result.tone).toBe('threatening');
    expect(Array.isArray(result.suggestedPlayerActions)).toBe(true);
  }, 10000); // Increased timeout

  it('should handle missing character', async () => {
    await expect(characterService.generateBehavioralDialogue(9999, {
      playerCommand: 'talk',
      context: 'test'
    })).rejects.toThrow('Character 9999 not found');
  });
});