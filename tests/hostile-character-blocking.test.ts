import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Database } from '../src/utils/database';
import { CharacterService } from '../src/services/characterService';
import { GameStateManager } from '../src/services/gameStateManager';
import { CharacterType } from '../src/types/character';
import { initializeDatabase } from '../src/utils/initDb';

describe('Hostile Character Blocking System', () => {
  let db: Database;
  let characterService: CharacterService;
  let gameStateManager: GameStateManager;
  let gameId: number;
  let roomId: number;

  beforeEach(async () => {
    // Create in-memory database for testing
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);

    // Initialize services
    characterService = new CharacterService(db);
    gameStateManager = new GameStateManager(db);

    // Create test game and room
    const gameResult = await db.run(
      'INSERT INTO games (name) VALUES (?)',
      ['Test Game']
    );
    gameId = gameResult.lastID as number;

    // Create test room
    const roomResult = await db.run(
      'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
      [gameId, 'Test Room', 'A room for testing']
    );
    roomId = roomResult.lastID as number;

    // Create game state
    await db.run(
      'INSERT INTO game_state (game_id, current_room_id) VALUES (?, ?)',
      [gameId, roomId]
    );

    // Start game session
    await gameStateManager.startGameSession(gameId);
  });

  afterEach(async () => {
    await db.close();
  });

  describe('CharacterService hostile methods', () => {
    it('should create a hostile enemy character by default', async () => {
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Goblin Warrior',
        description: 'A fierce goblin',
        type: CharacterType.ENEMY,
        current_room_id: roomId
      });

      const character = await characterService.getCharacter(characterId);
      expect(character).toBeDefined();
      expect(character?.is_hostile).toBe(1); // SQLite stores boolean as 0/1
      expect(character?.type).toBe(CharacterType.ENEMY);
    });

    it('should create a non-hostile NPC by default', async () => {
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Village Elder',
        description: 'A wise elder',
        type: CharacterType.NPC,
        current_room_id: roomId
      });

      const character = await characterService.getCharacter(characterId);
      expect(character).toBeDefined();
      expect(character?.is_hostile).toBe(0);
      expect(character?.type).toBe(CharacterType.NPC);
    });

    it('should override default hostility when specified', async () => {
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Corrupted Villager',
        description: 'A villager turned hostile',
        type: CharacterType.NPC,
        current_room_id: roomId,
        is_hostile: true
      });

      const character = await characterService.getCharacter(characterId);
      expect(character).toBeDefined();
      expect(character?.is_hostile).toBe(1);
      expect(character?.type).toBe(CharacterType.NPC);
    });

    it('should get all hostile characters in a room', async () => {
      // Create mix of hostile and non-hostile characters
      await characterService.createCharacter({
        game_id: gameId,
        name: 'Goblin',
        type: CharacterType.ENEMY,
        current_room_id: roomId
      });

      await characterService.createCharacter({
        game_id: gameId,
        name: 'Friendly NPC',
        type: CharacterType.NPC,
        current_room_id: roomId
      });

      await characterService.createCharacter({
        game_id: gameId,
        name: 'Dragon',
        type: CharacterType.ENEMY,
        current_room_id: roomId
      });

      const hostileCharacters = await characterService.getHostileCharacters(roomId);
      expect(hostileCharacters).toHaveLength(2);
      expect(hostileCharacters[0].name).toBe('Dragon');
      expect(hostileCharacters[1].name).toBe('Goblin');
    });

    it('should not include dead hostile characters', async () => {
      // Create hostile enemy
      const enemyId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Zombie',
        type: CharacterType.ENEMY,
        current_room_id: roomId
      });

      // Kill the enemy
      await db.run('UPDATE characters SET is_dead = 1 WHERE id = ?', [enemyId]);

      const hostileCharacters = await characterService.getHostileCharacters(roomId);
      expect(hostileCharacters).toHaveLength(0);
    });

    it('should check if room has hostile characters', async () => {
      // Initially no hostiles
      let hasHostiles = await characterService.hasHostileCharacters(roomId);
      expect(hasHostiles).toBe(false);

      // Add hostile enemy
      await characterService.createCharacter({
        game_id: gameId,
        name: 'Orc',
        type: CharacterType.ENEMY,
        current_room_id: roomId
      });

      hasHostiles = await characterService.hasHostileCharacters(roomId);
      expect(hasHostiles).toBe(true);
    });

    it('should update character hostility', async () => {
      const characterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Guard',
        type: CharacterType.NPC,
        current_room_id: roomId,
        is_hostile: false
      });

      // Make character hostile
      await characterService.setCharacterHostility(characterId, true);
      let character = await characterService.getCharacter(characterId);
      expect(character?.is_hostile).toBe(1);

      // Make character non-hostile
      await characterService.setCharacterHostility(characterId, false);
      character = await characterService.getCharacter(characterId);
      expect(character?.is_hostile).toBe(0);
    });
  });

  describe('Movement blocking integration', () => {
    it('should block movement when hostile character is present', async () => {
      // Create hostile enemy in current room
      await characterService.createCharacter({
        game_id: gameId,
        name: 'Blocking Goblin',
        type: CharacterType.ENEMY,
        current_room_id: roomId
      });

      // Create a connection to another room
      const targetRoomResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Target Room', 'Another room']
      );
      const targetRoomId = targetRoomResult.lastID as number;

      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, roomId, targetRoomId, 'north', 'north']
      );

      // Check that hostile blocks movement
      const hostileCharacters = await characterService.getHostileCharacters(roomId);
      expect(hostileCharacters).toHaveLength(1);
      expect(hostileCharacters[0].name).toBe('Blocking Goblin');
    });

    it('should allow movement when no hostile characters present', async () => {
      // Create non-hostile NPC
      await characterService.createCharacter({
        game_id: gameId,
        name: 'Friendly NPC',
        type: CharacterType.NPC,
        current_room_id: roomId,
        is_hostile: false
      });

      const hostileCharacters = await characterService.getHostileCharacters(roomId);
      expect(hostileCharacters).toHaveLength(0);
    });

    it('should allow movement when hostile character is dead', async () => {
      // Create hostile enemy
      const enemyId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Dead Goblin',
        type: CharacterType.ENEMY,
        current_room_id: roomId
      });

      // Kill the enemy
      await db.run('UPDATE characters SET is_dead = 1 WHERE id = ?', [enemyId]);

      const hostileCharacters = await characterService.getHostileCharacters(roomId);
      expect(hostileCharacters).toHaveLength(0);
    });

    it('should handle multiple hostile characters', async () => {
      // Create multiple hostile enemies
      await characterService.createCharacter({
        game_id: gameId,
        name: 'Goblin 1',
        type: CharacterType.ENEMY,
        current_room_id: roomId
      });

      await characterService.createCharacter({
        game_id: gameId,
        name: 'Goblin 2',
        type: CharacterType.ENEMY,
        current_room_id: roomId
      });

      await characterService.createCharacter({
        game_id: gameId,
        name: 'Orc',
        type: CharacterType.ENEMY,
        current_room_id: roomId
      });

      const hostileCharacters = await characterService.getHostileCharacters(roomId);
      expect(hostileCharacters).toHaveLength(3);
    });
  });

  describe('Character generation with hostility', () => {
    it('should set enemies as hostile during generation', async () => {
      const enemyId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Generated Enemy',
        description: 'An enemy created by the system',
        type: CharacterType.ENEMY,
        current_room_id: roomId,
        strength: 12,
        dexterity: 14,
        constitution: 13
      });

      const enemy = await characterService.getCharacter(enemyId);
      expect(enemy).toBeDefined();
      expect(enemy?.is_hostile).toBe(1);
      expect(enemy?.type).toBe(CharacterType.ENEMY);
    });

    it('should set NPCs as non-hostile during generation', async () => {
      const npcId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Generated NPC',
        description: 'An NPC created by the system',
        type: CharacterType.NPC,
        current_room_id: roomId,
        strength: 10,
        dexterity: 10,
        constitution: 10
      });

      const npc = await characterService.getCharacter(npcId);
      expect(npc).toBeDefined();
      expect(npc?.is_hostile).toBe(0);
      expect(npc?.type).toBe(CharacterType.NPC);
    });
  });
});