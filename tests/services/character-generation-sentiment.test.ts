import Database from '../../src/utils/database';
import { initializeDatabase } from '../../src/utils/initDb';
import { CharacterService } from '../../src/services/characterService';
import { CharacterGenerationService } from '../../src/services/characterGenerationService';
import { CharacterSentiment, CharacterType } from '../../src/types/character';
import { GeneratedCharacter } from '../../src/ai/grokClient';

describe('CharacterGenerationService Sentiment Integration', () => {
  let db: Database;
  let characterService: CharacterService;
  let characterGenerationService: CharacterGenerationService;
  let gameId: number;
  let roomId: number;

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    characterService = new CharacterService(db);
    characterGenerationService = new CharacterGenerationService(db, characterService, { enableDebugLogging: false });

    // Create test game
    const gameResult = await db.run(`
      INSERT INTO games (name, created_at, last_played_at) 
      VALUES ('Test Game', '2025-08-22 10:00:00', '2025-08-22 10:00:00')
    `);
    gameId = gameResult.lastID as number;

    // Create test room
    const roomResult = await db.run(`
      INSERT INTO rooms (game_id, name, description) 
      VALUES (?, 'Test Room', 'A test room for character generation')
    `, [gameId]);
    roomId = roomResult.lastID as number;
  });

  afterEach(async () => {
    if (db.isConnected()) {
      await db.close();
    }
  });

  describe('Phase 4: Character Generation Integration', () => {
    it('should set default sentiment for enemy characters', async () => {
      const generatedCharacters: GeneratedCharacter[] = [{
        name: 'Test Enemy',
        description: 'A test enemy character',
        type: 'enemy',
        initialDialogue: 'Prepare to fight!'
      }];

      await characterGenerationService.createCharactersFromRoomGeneration(
        gameId,
        roomId,
        generatedCharacters
      );

      const characters = await characterService.getRoomCharacters(roomId);
      expect(characters).toHaveLength(1);
      expect(characters[0].sentiment).toBe(CharacterSentiment.AGGRESSIVE); // Enemies default to aggressive
      expect(characters[0].type).toBe(CharacterType.ENEMY);
    });

    it('should set default sentiment for NPC characters', async () => {
      const generatedCharacters: GeneratedCharacter[] = [{
        name: 'Test NPC',
        description: 'A friendly test NPC',
        type: 'npc',
        initialDialogue: 'Hello there!'
      }];

      await characterGenerationService.createCharactersFromRoomGeneration(
        gameId,
        roomId,
        generatedCharacters
      );

      const characters = await characterService.getRoomCharacters(roomId);
      expect(characters).toHaveLength(1);
      expect(characters[0].sentiment).toBe(CharacterSentiment.INDIFFERENT); // NPCs default to indifferent
      expect(characters[0].type).toBe(CharacterType.NPC);
    });

    it('should handle explicit sentiment from GeneratedCharacter', async () => {
      const generatedCharacters: GeneratedCharacter[] = [{
        name: 'Friendly Guard',
        description: 'A helpful guard who likes visitors',
        type: 'npc',
        sentiment: CharacterSentiment.FRIENDLY,
        initialDialogue: 'Welcome, friend!'
      }];

      await characterGenerationService.createCharactersFromRoomGeneration(
        gameId,
        roomId,
        generatedCharacters
      );

      const characters = await characterService.getRoomCharacters(roomId);
      expect(characters).toHaveLength(1);
      expect(characters[0].sentiment).toBe(CharacterSentiment.FRIENDLY);
      expect(characters[0].type).toBe(CharacterType.NPC);
    });

    it('should handle hostile enemy with explicit sentiment', async () => {
      const generatedCharacters: GeneratedCharacter[] = [{
        name: 'Enraged Goblin',
        description: 'A goblin consumed by rage',
        type: 'enemy',
        sentiment: CharacterSentiment.HOSTILE,
        initialDialogue: 'Die, intruder!'
      }];

      await characterGenerationService.createCharactersFromRoomGeneration(
        gameId,
        roomId,
        generatedCharacters
      );

      const characters = await characterService.getRoomCharacters(roomId);
      expect(characters).toHaveLength(1);
      expect(characters[0].sentiment).toBe(CharacterSentiment.HOSTILE);
      expect(characters[0].type).toBe(CharacterType.ENEMY);
      expect(await characterService.isHostileToPlayer(characters[0].id)).toBe(true);
    });

    it('should create multiple characters with different sentiments', async () => {
      const generatedCharacters: GeneratedCharacter[] = [
        {
          name: 'Peaceful Monk',
          description: 'A serene monk who helps travelers',
          type: 'npc',
          sentiment: CharacterSentiment.FRIENDLY,
          initialDialogue: 'Peace be with you.'
        },
        {
          name: 'Aggressive Bandit',
          description: 'A bandit who blocks the path',
          type: 'enemy',
          sentiment: CharacterSentiment.AGGRESSIVE,
          initialDialogue: 'Your money or your life!'
        }
      ];

      await characterGenerationService.createCharactersFromRoomGeneration(
        gameId,
        roomId,
        generatedCharacters
      );

      const characters = await characterService.getRoomCharacters(roomId);
      expect(characters).toHaveLength(2);

      // Find characters by name and check sentiments
      const monk = characters.find(c => c.name === 'Peaceful Monk');
      const bandit = characters.find(c => c.name === 'Aggressive Bandit');

      expect(monk?.sentiment).toBe(CharacterSentiment.FRIENDLY);
      expect(bandit?.sentiment).toBe(CharacterSentiment.AGGRESSIVE);

      // Check hostility
      expect(await characterService.isHostileToPlayer(monk!.id)).toBe(false);
      expect(await characterService.isHostileToPlayer(bandit!.id)).toBe(true);
    });

    it('should maintain backward compatibility with is_hostile field', async () => {
      const generatedCharacters: GeneratedCharacter[] = [{
        name: 'Old Style Enemy',
        description: 'An enemy using old hostility system',
        type: 'enemy',
        isHostile: true, // Old field
        initialDialogue: 'Attack!'
      }];

      await characterGenerationService.createCharactersFromRoomGeneration(
        gameId,
        roomId,
        generatedCharacters
      );

      const characters = await characterService.getRoomCharacters(roomId);
      expect(characters).toHaveLength(1);
      
      // Should have both fields set
      expect(characters[0].sentiment).toBe(CharacterSentiment.AGGRESSIVE); // Default for enemies
      expect(characters[0].is_hostile).toBe(1); // SQLite returns 1 for true
    });

    it('should handle sentiment fallback when type-based defaults fail', async () => {
      const generatedCharacters: GeneratedCharacter[] = [{
        name: 'Unknown Character',
        description: 'A character with unspecified behavior',
        type: 'npc', // Valid type but no sentiment specified
        initialDialogue: 'Greetings.'
      }];

      await characterGenerationService.createCharactersFromRoomGeneration(
        gameId,
        roomId,
        generatedCharacters
      );

      const characters = await characterService.getRoomCharacters(roomId);
      expect(characters).toHaveLength(1);
      expect(characters[0].sentiment).toBe(CharacterSentiment.INDIFFERENT); // NPC default
    });

    it('should respect existing sentiment system when isHostile is false', async () => {
      const generatedCharacters: GeneratedCharacter[] = [{
        name: 'Peaceful Enemy',
        description: 'An enemy that does not attack',
        type: 'enemy',
        sentiment: CharacterSentiment.INDIFFERENT, // Override default aggressive
        isHostile: false, // Old system says not hostile
        initialDialogue: 'I mean no harm.'
      }];

      await characterGenerationService.createCharactersFromRoomGeneration(
        gameId,
        roomId,
        generatedCharacters
      );

      const characters = await characterService.getRoomCharacters(roomId);
      expect(characters).toHaveLength(1);
      expect(characters[0].sentiment).toBe(CharacterSentiment.INDIFFERENT);
      expect(characters[0].is_hostile).toBe(0); // SQLite returns 0 for false
      expect(await characterService.isHostileToPlayer(characters[0].id)).toBe(false);
    });
  });
});