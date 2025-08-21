import Database from '../src/utils/database';
import { initializeDatabase } from '../src/utils/initDb';
import { CharacterService } from '../src/services/characterService';
import { CharacterType, getAttributeModifier, calculateMaxHealth } from '../src/types/character';

describe('CharacterService', () => {
  let db: Database;
  let characterService: CharacterService;
  let gameId: number;

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    characterService = new CharacterService(db);

    // Create a test game
    const gameResult = await db.run(
      'INSERT INTO games (name) VALUES (?)',
      ['Test Game']
    );
    gameId = gameResult.lastID as number;
  });

  afterEach(async () => {
    await db.close();
  });

  describe('Character Creation', () => {
    test('should create a player character with default attributes', async () => {
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Test Hero',
        type: CharacterType.PLAYER
      });

      expect(characterId).toBeGreaterThan(0);

      const character = await characterService.getCharacter(characterId);
      expect(character).not.toBeNull();
      expect(character!.name).toBe('Test Hero');
      expect(character!.type).toBe(CharacterType.PLAYER);
      expect(character!.strength).toBe(10);
      expect(character!.dexterity).toBe(10);
      expect(character!.constitution).toBe(10);
      expect(character!.max_health).toBe(10); // 10 + CON modifier (0)
      expect(character!.current_health).toBe(10);
    });

    test('should create a character with custom attributes', async () => {
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Strong Warrior',
        type: CharacterType.PLAYER,
        strength: 16,
        constitution: 14,
        dexterity: 12
      });

      const character = await characterService.getCharacter(characterId);
      expect(character!.strength).toBe(16);
      expect(character!.constitution).toBe(14);
      expect(character!.dexterity).toBe(12);
      expect(character!.intelligence).toBe(10); // Default
      expect(character!.max_health).toBe(12); // 10 + CON modifier (+2)
    });

    test('should create NPC and enemy characters', async () => {
      const npcId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Friendly Merchant',
        type: CharacterType.NPC,
        current_room_id: 1,
        charisma: 15
      });

      const enemyId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Goblin Warrior',
        type: CharacterType.ENEMY,
        current_room_id: 2,
        strength: 14,
        constitution: 12
      });

      const npc = await characterService.getCharacter(npcId);
      const enemy = await characterService.getCharacter(enemyId);

      expect(npc!.type).toBe(CharacterType.NPC);
      expect(npc!.charisma).toBe(15);
      expect(npc!.current_room_id).toBe(1);

      expect(enemy!.type).toBe(CharacterType.ENEMY);
      expect(enemy!.strength).toBe(14);
      expect(enemy!.current_room_id).toBe(2);
    });

    test('should validate attribute ranges', async () => {
      await expect(characterService.createCharacter({
        game_id: gameId,
        name: 'Invalid Character',
        strength: 25 // Too high
      })).rejects.toThrow('Invalid strength value: 25');

      await expect(characterService.createCharacter({
        game_id: gameId,
        name: 'Invalid Character',
        dexterity: 0 // Too low
      })).rejects.toThrow('Invalid dexterity value: 0');
    });
  });

  describe('Character Retrieval', () => {
    test('should get player character for a game', async () => {
      const playerId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Player Hero',
        type: CharacterType.PLAYER
      });

      // Create some NPCs too
      await characterService.createCharacter({
        game_id: gameId,
        name: 'NPC 1',
        type: CharacterType.NPC
      });

      const player = await characterService.getPlayerCharacter(gameId);
      expect(player).not.toBeNull();
      expect(player!.id).toBe(playerId);
      expect(player!.type).toBe(CharacterType.PLAYER);
    });

    test('should get characters by game and type', async () => {
      // Create mixed characters
      await characterService.createCharacter({
        game_id: gameId,
        name: 'Player',
        type: CharacterType.PLAYER
      });

      await characterService.createCharacter({
        game_id: gameId,
        name: 'NPC 1',
        type: CharacterType.NPC
      });

      await characterService.createCharacter({
        game_id: gameId,
        name: 'NPC 2',
        type: CharacterType.NPC
      });

      const allCharacters = await characterService.getGameCharacters(gameId);
      const npcs = await characterService.getGameCharacters(gameId, CharacterType.NPC);

      expect(allCharacters).toHaveLength(3);
      expect(npcs).toHaveLength(2);
      expect(npcs.every(c => c.type === CharacterType.NPC)).toBe(true);
    });

    test('should get characters in a room', async () => {
      const roomId = 5;

      await characterService.createCharacter({
        game_id: gameId,
        name: 'NPC in Room',
        type: CharacterType.NPC,
        current_room_id: roomId
      });

      await characterService.createCharacter({
        game_id: gameId,
        name: 'Enemy in Room',
        type: CharacterType.ENEMY,
        current_room_id: roomId
      });

      // Character in different room
      await characterService.createCharacter({
        game_id: gameId,
        name: 'Character Elsewhere',
        type: CharacterType.NPC,
        current_room_id: 10
      });

      const roomCharacters = await characterService.getRoomCharacters(roomId);
      const nonPlayerRoomCharacters = await characterService.getRoomCharacters(roomId, CharacterType.PLAYER);

      expect(roomCharacters).toHaveLength(2);
      expect(nonPlayerRoomCharacters).toHaveLength(2);
      expect(roomCharacters.every(c => c.current_room_id === roomId)).toBe(true);
    });
  });

  describe('Character Updates', () => {
    let characterId: number;

    beforeEach(async () => {
      characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Test Character',
        constitution: 12
      });
    });

    test('should update character attributes', async () => {
      await characterService.updateCharacterAttributes(characterId, {
        strength: 16,
        dexterity: 14
      });

      const character = await characterService.getCharacter(characterId);
      expect(character!.strength).toBe(16);
      expect(character!.dexterity).toBe(14);
      expect(character!.constitution).toBe(12); // Unchanged
    });

    test('should recalculate health when constitution changes', async () => {
      // Initial: CON 12 = +1 modifier = 11 max health
      let character = await characterService.getCharacter(characterId);
      expect(character!.max_health).toBe(11);

      // Update constitution to 16 = +3 modifier = 13 max health
      await characterService.updateCharacterAttributes(characterId, {
        constitution: 16
      });

      character = await characterService.getCharacter(characterId);
      expect(character!.constitution).toBe(16);
      expect(character!.max_health).toBe(13);
    });

    test('should move character between rooms', async () => {
      await characterService.moveCharacter(characterId, 42);

      const character = await characterService.getCharacter(characterId);
      expect(character!.current_room_id).toBe(42);
    });

    test('should update character health within bounds', async () => {
      // Character has max health 11 (CON 12)
      await characterService.updateCharacterHealth(characterId, 5);
      
      let health = await characterService.getCharacterHealth(characterId);
      expect(health!.current).toBe(5);
      expect(health!.max).toBe(11);
      expect(health!.percentage).toBe(45);

      // Test bounds - can't exceed max
      await characterService.updateCharacterHealth(characterId, 20);
      health = await characterService.getCharacterHealth(characterId);
      expect(health!.current).toBe(11);

      // Test bounds - can't go below 0
      await characterService.updateCharacterHealth(characterId, -5);
      health = await characterService.getCharacterHealth(characterId);
      expect(health!.current).toBe(0);
    });
  });

  describe('Utility Functions', () => {
    test('should calculate attribute modifiers correctly', () => {
      expect(getAttributeModifier(8)).toBe(-1);
      expect(getAttributeModifier(9)).toBe(-1);
      expect(getAttributeModifier(10)).toBe(0);
      expect(getAttributeModifier(11)).toBe(0);
      expect(getAttributeModifier(12)).toBe(1);
      expect(getAttributeModifier(13)).toBe(1);
      expect(getAttributeModifier(16)).toBe(3);
      expect(getAttributeModifier(20)).toBe(5);
    });

    test('should calculate max health correctly', () => {
      expect(calculateMaxHealth(8)).toBe(9);  // 10 + (-1)
      expect(calculateMaxHealth(10)).toBe(10); // 10 + 0
      expect(calculateMaxHealth(14)).toBe(12); // 10 + 2
      expect(calculateMaxHealth(18)).toBe(14); // 10 + 4
    });

    test('should get character modifiers', async () => {
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Test Character',
        strength: 16,    // +3
        dexterity: 14,   // +2
        intelligence: 8, // -1
        constitution: 12, // +1
        wisdom: 10,      // +0
        charisma: 13     // +1
      });

      const character = await characterService.getCharacter(characterId);
      const modifiers = characterService.getCharacterModifiers(character!);

      expect(modifiers.strength).toBe(3);
      expect(modifiers.dexterity).toBe(2);
      expect(modifiers.intelligence).toBe(-1);
      expect(modifiers.constitution).toBe(1);
      expect(modifiers.wisdom).toBe(0);
      expect(modifiers.charisma).toBe(1);
    });
  });

  describe('Character Management', () => {
    test('should count characters by type', async () => {
      await characterService.createCharacter({
        game_id: gameId,
        name: 'Player',
        type: CharacterType.PLAYER
      });

      await characterService.createCharacter({
        game_id: gameId,
        name: 'NPC 1',
        type: CharacterType.NPC
      });

      await characterService.createCharacter({
        game_id: gameId,
        name: 'NPC 2',
        type: CharacterType.NPC
      });

      const totalCount = await characterService.getCharacterCount(gameId);
      const npcCount = await characterService.getCharacterCount(gameId, CharacterType.NPC);
      const playerCount = await characterService.getCharacterCount(gameId, CharacterType.PLAYER);

      expect(totalCount).toBe(3);
      expect(npcCount).toBe(2);
      expect(playerCount).toBe(1);
    });

    test('should delete characters', async () => {
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Temporary Character'
      });

      let character = await characterService.getCharacter(characterId);
      expect(character).not.toBeNull();

      await characterService.deleteCharacter(characterId);

      character = await characterService.getCharacter(characterId);
      expect(character).toBeNull();
    });
  });
});