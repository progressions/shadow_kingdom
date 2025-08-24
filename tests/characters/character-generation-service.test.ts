/**
 * Tests for CharacterGenerationService
 * Phase 2 verification: Service creation and character generation logic
 */

import Database from '../../src/utils/database';
import { CharacterGenerationService } from '../../src/services/characterGenerationService';
import { CharacterService } from '../../src/services/characterService';
import { CharacterType } from '../../src/types/character';
import { GeneratedCharacter } from '../../src/ai/grokClient';
import { initializeTestDatabase } from '../testUtils';

describe('CharacterGenerationService', () => {
  let db: Database;
  let characterService: CharacterService;
  let characterGenerationService: CharacterGenerationService;

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.connect();
    await initializeTestDatabase(db);
    
    // Create services
    characterService = new CharacterService(db);
    characterGenerationService = new CharacterGenerationService(db, characterService);
    
    // Create a test game and room
    await db.run('INSERT INTO games (id, name) VALUES (?, ?)', [1, 'Test Game']);
    await db.run('INSERT INTO rooms (id, game_id, name, description) VALUES (?, ?, ?, ?)', 
      [1, 1, 'Test Room', 'A room for testing']);
  });

  afterEach(async () => {
    await db.close();
    // Clean up environment variables
    delete process.env.AI_CHARACTER_GENERATION_ENABLED;
    delete process.env.AI_CHARACTER_GENERATION_RATE;
    delete process.env.MAX_CHARACTERS_PER_ROOM;
    delete process.env.AI_DEBUG_LOGGING;
  });

  describe('Service Configuration', () => {
    test('should initialize with default config', () => {
      const config = characterGenerationService.getConfig();
      
      expect(config.enabled).toBe(true);
      expect(config.generationRate).toBe(0.3);
      expect(config.maxCharactersPerRoom).toBe(2);
    });

    test('should respect environment variable overrides', () => {
      process.env.AI_CHARACTER_GENERATION_ENABLED = 'false';
      process.env.AI_CHARACTER_GENERATION_RATE = '0.7';
      process.env.MAX_CHARACTERS_PER_ROOM = '5';
      
      const service = new CharacterGenerationService(db, characterService);
      const config = service.getConfig();
      
      expect(config.enabled).toBe(false);
      expect(config.generationRate).toBe(0.7);
      expect(config.maxCharactersPerRoom).toBe(5);
    });
  });

  describe('Character Creation from Generation', () => {
    test('should create NPC from AI generation output', async () => {
      const generatedCharacters: GeneratedCharacter[] = [
        {
          name: 'Wise Sage',
          description: 'An elderly figure in mystical robes',
          type: 'npc',
          personality: 'Scholarly and helpful',
          attributes: {
            intelligence: 16,
            wisdom: 14
          }
        }
      ];
      
      await characterGenerationService.createCharactersFromRoomGeneration(
        1, // gameId
        1, // roomId
        generatedCharacters
      );
      
      // Verify character was created
      const roomCharacters = await characterService.getRoomCharacters(1);
      expect(roomCharacters).toHaveLength(1);
      
      const sage = roomCharacters[0];
      expect(sage.name).toBe('Wise Sage');
      expect(sage.description).toBe('An elderly figure in mystical robes');
      expect(sage.type).toBe(CharacterType.NPC);
      expect(sage.intelligence).toBe(16);
      expect(sage.wisdom).toBe(14);
      expect(sage.current_room_id).toBe(1);
    });

    test('should create enemy from AI generation output', async () => {
      const generatedCharacters: GeneratedCharacter[] = [
        {
          name: 'Dungeon Guard',
          description: 'A heavily armored warrior',
          type: 'enemy',
          level: 3,
          isHostile: true,
          attributes: {
            strength: 15,
            constitution: 14
          }
        }
      ];
      
      await characterGenerationService.createCharactersFromRoomGeneration(
        1, // gameId
        1, // roomId
        generatedCharacters
      );
      
      // Verify character was created
      const roomCharacters = await characterService.getRoomCharacters(1);
      expect(roomCharacters).toHaveLength(1);
      
      const guard = roomCharacters[0];
      expect(guard.name).toBe('Dungeon Guard');
      expect(guard.description).toBe('A heavily armored warrior');
      expect(guard.type).toBe(CharacterType.ENEMY);
      expect(guard.strength).toBe(15);
      expect(guard.constitution).toBe(14);
    });

    test('should use default attributes when not provided', async () => {
      const generatedCharacters: GeneratedCharacter[] = [
        {
          name: 'Simple Character',
          description: 'A basic character',
          type: 'npc'
        }
      ];
      
      await characterGenerationService.createCharactersFromRoomGeneration(
        1, 1, generatedCharacters
      );
      
      const roomCharacters = await characterService.getRoomCharacters(1);
      const character = roomCharacters[0];
      
      // Should use default attributes (10)
      expect(character.strength).toBe(10);
      expect(character.dexterity).toBe(10);
      expect(character.intelligence).toBe(10);
      expect(character.constitution).toBe(10);
      expect(character.wisdom).toBe(10);
      expect(character.charisma).toBe(10);
    });

    test('should create multiple characters in one room', async () => {
      const generatedCharacters: GeneratedCharacter[] = [
        {
          name: 'Tavern Keeper',
          description: 'Friendly innkeeper',
          type: 'npc'
        },
        {
          name: 'Rowdy Patron',
          description: 'Drunk causing trouble',
          type: 'enemy'
        }
      ];
      
      await characterGenerationService.createCharactersFromRoomGeneration(
        1, 1, generatedCharacters
      );
      
      const roomCharacters = await characterService.getRoomCharacters(1);
      expect(roomCharacters).toHaveLength(2);
      
      const keeper = roomCharacters.find(c => c.name === 'Tavern Keeper');
      const patron = roomCharacters.find(c => c.name === 'Rowdy Patron');
      
      expect(keeper).toBeDefined();
      expect(keeper!.type).toBe(CharacterType.NPC);
      expect(patron).toBeDefined();
      expect(patron!.type).toBe(CharacterType.ENEMY);
    });
  });

  describe('Configuration Handling', () => {
    test('should skip generation when disabled', async () => {
      process.env.AI_CHARACTER_GENERATION_ENABLED = 'false';
      const service = new CharacterGenerationService(db, characterService);
      
      const generatedCharacters: GeneratedCharacter[] = [
        {
          name: 'Should Not Be Created',
          description: 'This character should not be created',
          type: 'npc'
        }
      ];
      
      await service.createCharactersFromRoomGeneration(1, 1, generatedCharacters);
      
      // No characters should be created
      const roomCharacters = await characterService.getRoomCharacters(1);
      expect(roomCharacters).toHaveLength(0);
    });

    test('should skip generation when no characters provided', async () => {
      await characterGenerationService.createCharactersFromRoomGeneration(1, 1, []);
      
      const roomCharacters = await characterService.getRoomCharacters(1);
      expect(roomCharacters).toHaveLength(0);
    });

    test('should skip generation when characters is undefined', async () => {
      await characterGenerationService.createCharactersFromRoomGeneration(1, 1, undefined);
      
      const roomCharacters = await characterService.getRoomCharacters(1);
      expect(roomCharacters).toHaveLength(0);
    });

    test('should respect max characters per room limit', async () => {
      process.env.MAX_CHARACTERS_PER_ROOM = '2';
      const service = new CharacterGenerationService(db, characterService);
      
      const generatedCharacters: GeneratedCharacter[] = [
        { name: 'Character 1', description: 'First', type: 'npc' },
        { name: 'Character 2', description: 'Second', type: 'npc' },
        { name: 'Character 3', description: 'Third (should not be created)', type: 'npc' },
        { name: 'Character 4', description: 'Fourth (should not be created)', type: 'npc' }
      ];
      
      await service.createCharactersFromRoomGeneration(1, 1, generatedCharacters);
      
      // Should only create 2 characters despite 4 being provided
      const roomCharacters = await characterService.getRoomCharacters(1);
      expect(roomCharacters).toHaveLength(2);
      expect(roomCharacters[0].name).toBe('Character 1');
      expect(roomCharacters[1].name).toBe('Character 2');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid character data gracefully', async () => {
      const generatedCharacters: GeneratedCharacter[] = [
        {
          name: '', // Invalid: empty name
          description: 'Character with empty name',
          type: 'npc'
        },
        {
          name: 'Valid Character',
          description: 'This should still be created',
          type: 'npc'
        }
      ];
      
      // Should not throw error
      await expect(
        characterGenerationService.createCharactersFromRoomGeneration(1, 1, generatedCharacters)
      ).resolves.not.toThrow();
      
      // Valid character should still be created
      const roomCharacters = await characterService.getRoomCharacters(1);
      expect(roomCharacters).toHaveLength(1);
      expect(roomCharacters[0].name).toBe('Valid Character');
    });

    test('should handle invalid character type gracefully', async () => {
      const generatedCharacters = [
        {
          name: 'Invalid Type Character',
          description: 'Character with invalid type',
          type: 'invalid_type' as any
        },
        {
          name: 'Valid Character',
          description: 'This should still be created',
          type: 'npc' as const
        }
      ];
      
      await expect(
        characterGenerationService.createCharactersFromRoomGeneration(1, 1, generatedCharacters)
      ).resolves.not.toThrow();
      
      // Only valid character should be created
      const roomCharacters = await characterService.getRoomCharacters(1);
      expect(roomCharacters).toHaveLength(1);
      expect(roomCharacters[0].name).toBe('Valid Character');
    });
  });
});