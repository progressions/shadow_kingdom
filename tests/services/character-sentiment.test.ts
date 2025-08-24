import Database from '../../src/utils/database';
import { initializeTestDatabase } from '../testUtils';
import { CharacterService } from '../../src/services/characterService';
import { CharacterSentiment, CharacterType } from '../../src/types/character';

describe('CharacterService Sentiment Functions', () => {
  let db: Database;
  let characterService: CharacterService;
  let gameId: number;
  let characterId: number;

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.connect();
    await initializeTestDatabase(db);
    characterService = new CharacterService(db);

    // Create test game
    const gameResult = await db.run(`
      INSERT INTO games (name, created_at, last_played_at) 
      VALUES ('Test Game', '2025-08-22 10:00:00', '2025-08-22 10:00:00')
    `);
    gameId = gameResult.lastID as number;

    // Create test character
    characterId = await characterService.createCharacter({
      game_id: gameId,
      name: 'Test Character',
      type: CharacterType.NPC,
      sentiment: CharacterSentiment.INDIFFERENT
    });
  });

  afterEach(async () => {
    if (db.isConnected()) {
      await db.close();
    }
  });

  describe('Phase 3: Sentiment Helper Functions', () => {
    it('should get character sentiment', async () => {
      const sentiment = await characterService.getSentiment(characterId);
      expect(sentiment).toBe(CharacterSentiment.INDIFFERENT);
    });

    it('should set character sentiment', async () => {
      await characterService.setSentiment(characterId, CharacterSentiment.FRIENDLY);
      
      const character = await characterService.getCharacter(characterId);
      expect(character?.sentiment).toBe(CharacterSentiment.FRIENDLY);
    });

    it('should change sentiment by delta amount', async () => {
      // Start with INDIFFERENT (0), increase by 1 to FRIENDLY (+1)
      const newSentiment = await characterService.changeSentiment(characterId, 1);
      expect(newSentiment).toBe(CharacterSentiment.FRIENDLY);
      
      const character = await characterService.getCharacter(characterId);
      expect(character?.sentiment).toBe(CharacterSentiment.FRIENDLY);
    });

    it('should change sentiment by negative delta', async () => {
      // Start with INDIFFERENT (0), decrease by 1 to AGGRESSIVE (-1)  
      const newSentiment = await characterService.changeSentiment(characterId, -1);
      expect(newSentiment).toBe(CharacterSentiment.AGGRESSIVE);
      
      const character = await characterService.getCharacter(characterId);
      expect(character?.sentiment).toBe(CharacterSentiment.AGGRESSIVE);
    });

    it('should clamp sentiment change to valid bounds (hostile minimum)', async () => {
      // Set to HOSTILE first
      await characterService.setSentiment(characterId, CharacterSentiment.HOSTILE);
      
      // Try to decrease further - should stay at HOSTILE
      const newSentiment = await characterService.changeSentiment(characterId, -5);
      expect(newSentiment).toBe(CharacterSentiment.HOSTILE);
    });

    it('should clamp sentiment change to valid bounds (allied maximum)', async () => {
      // Set to ALLIED first
      await characterService.setSentiment(characterId, CharacterSentiment.ALLIED);
      
      // Try to increase further - should stay at ALLIED
      const newSentiment = await characterService.changeSentiment(characterId, 5);
      expect(newSentiment).toBe(CharacterSentiment.ALLIED);
    });

    it('should determine hostility based on sentiment using isHostileToPlayer', async () => {
      // Test HOSTILE
      await characterService.setSentiment(characterId, CharacterSentiment.HOSTILE);
      expect(await characterService.isHostileToPlayer(characterId)).toBe(true);
      
      // Test AGGRESSIVE
      await characterService.setSentiment(characterId, CharacterSentiment.AGGRESSIVE);
      expect(await characterService.isHostileToPlayer(characterId)).toBe(true);
      
      // Test INDIFFERENT
      await characterService.setSentiment(characterId, CharacterSentiment.INDIFFERENT);
      expect(await characterService.isHostileToPlayer(characterId)).toBe(false);
      
      // Test FRIENDLY
      await characterService.setSentiment(characterId, CharacterSentiment.FRIENDLY);
      expect(await characterService.isHostileToPlayer(characterId)).toBe(false);
      
      // Test ALLIED
      await characterService.setSentiment(characterId, CharacterSentiment.ALLIED);
      expect(await characterService.isHostileToPlayer(characterId)).toBe(false);
    });

    it('should handle non-existent character gracefully', async () => {
      const nonExistentId = 9999;
      
      await expect(characterService.getSentiment(nonExistentId))
        .rejects.toThrow('Character 9999 not found');
      
      await expect(characterService.setSentiment(nonExistentId, CharacterSentiment.FRIENDLY))
        .rejects.toThrow('Character 9999 not found');
      
      await expect(characterService.changeSentiment(nonExistentId, 1))
        .rejects.toThrow('Character 9999 not found');
      
      await expect(characterService.isHostileToPlayer(nonExistentId))
        .rejects.toThrow('Character 9999 not found');
    });

    it('should complete sentiment change workflow', async () => {
      // Complete workflow: INDIFFERENT -> FRIENDLY -> ALLIED -> HOSTILE
      expect(await characterService.getSentiment(characterId)).toBe(CharacterSentiment.INDIFFERENT);
      
      // INDIFFERENT (0) + 2 = ALLIED (2)
      let newSentiment = await characterService.changeSentiment(characterId, 2);
      expect(newSentiment).toBe(CharacterSentiment.ALLIED);
      
      // ALLIED (2) - 4 = HOSTILE (-2)
      newSentiment = await characterService.changeSentiment(characterId, -4);
      expect(newSentiment).toBe(CharacterSentiment.HOSTILE);
      
      // Verify final state
      expect(await characterService.getSentiment(characterId)).toBe(CharacterSentiment.HOSTILE);
      expect(await characterService.isHostileToPlayer(characterId)).toBe(true);
    });

    it('should maintain database performance under 10ms for sentiment queries', async () => {
      const iterations = 10;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await characterService.getSentiment(characterId);
        const end = performance.now();
        times.push(end - start);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgTime).toBeLessThan(10); // Performance requirement: < 10ms
    });
  });
});