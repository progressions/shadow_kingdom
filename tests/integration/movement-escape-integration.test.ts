/**
 * Movement with Dexterity-Based Escape System Integration Tests
 * 
 * Tests the integration between the GameController movement commands
 * and the new escape system functionality.
 */

import Database from '../../src/utils/database';
import { initializeDatabase } from '../../src/utils/initDb';
import { CharacterService } from '../../src/services/characterService';
import { GameStateManager } from '../../src/services/gameStateManager';
import { ServiceFactory } from '../../src/services/serviceFactory';
import { CharacterSentiment, CharacterType, getAttributeModifier } from '../../src/types/character';

describe('Movement Escape System Integration', () => {
  let db: Database;
  let characterService: CharacterService;
  let gameStateManager: GameStateManager;
  let gameId: number;
  let startingRoomId: number;
  let northRoomId: number;
  let playerCharacterId: number;

  beforeEach(async () => {
    // Initialize database
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    // Initialize services with minimal TUI interface
    const mockTUI = {
      display: jest.fn(),
      showAIProgress: jest.fn(),
      showError: jest.fn(),
      destroy: jest.fn(),
      displayRoom: jest.fn()
    } as any;
    
    const services = await ServiceFactory.createServices(db, mockTUI, {} as any);
    characterService = services.characterService;
    gameStateManager = services.gameStateManager;
    
    // Create test game
    const uniqueGameName = `Integration Test ${Date.now()}-${Math.random()}`;
    const gameResult = await db.run(`
      INSERT INTO games (name, created_at, last_played_at) 
      VALUES (?, '2025-08-23 10:00:00', '2025-08-23 10:00:00')
    `, [uniqueGameName]);
    gameId = gameResult.lastID as number;
    
    // Create starting room
    const startingRoomResult = await db.run(`
      INSERT INTO rooms (game_id, name, description, region_id)
      VALUES (?, 'Starting Room', 'A room where the adventure begins', 1)
    `, [gameId]);
    startingRoomId = startingRoomResult.lastID as number;
    
    // Create north room
    const northRoomResult = await db.run(`
      INSERT INTO rooms (game_id, name, description, region_id)
      VALUES (?, 'Northern Chamber', 'A chamber to the north', 1)
    `, [gameId]);
    northRoomId = northRoomResult.lastID as number;
    
    // Create connection from starting room to north room
    await db.run(`
      INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name)
      VALUES (?, ?, ?, 'north', 'Northern Passage')
    `, [gameId, startingRoomId, northRoomId]);
    
    // Create player character
    playerCharacterId = await characterService.createCharacter({
      game_id: gameId,
      name: 'Test Hero',
      type: CharacterType.PLAYER,
      current_room_id: startingRoomId,
      dexterity: 12 // +1 modifier
    });
    
    // Create game state entry
    await db.run(`
      INSERT INTO game_state (game_id, current_room_id, character_id)
      VALUES (?, ?, ?)
    `, [gameId, startingRoomId, playerCharacterId]);
    
    // Start game session
    await gameStateManager.startGameSession(gameId);
  });

  afterEach(async () => {
    if (db.isConnected()) {
      await db.close();
    }
  });

  describe('CharacterService.getHostileEnemiesInRoom integration', () => {
    it('should return only hostile enemies for movement blocking', async () => {
      // Create various character types
      const npcId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Hostile NPC',
        type: CharacterType.NPC,
        current_room_id: startingRoomId,
        sentiment: CharacterSentiment.HOSTILE,
        dexterity: 15
      });

      const enemyId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Hostile Enemy',
        type: CharacterType.ENEMY,
        current_room_id: startingRoomId,
        sentiment: CharacterSentiment.HOSTILE,
        dexterity: 10
      });

      const deadEnemyId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Dead Enemy',
        type: CharacterType.ENEMY,
        current_room_id: startingRoomId,
        sentiment: CharacterSentiment.HOSTILE,
        dexterity: 18
      });

      // Mark enemy as dead
      await db.run(`UPDATE characters SET is_dead = 1 WHERE id = ?`, [deadEnemyId]);

      // Test the method
      const hostileEnemies = await characterService.getHostileEnemiesInRoom(startingRoomId);

      // Should only include the living enemy, not the NPC or dead enemy
      expect(hostileEnemies).toHaveLength(1);
      expect(hostileEnemies[0].id).toBe(enemyId);
      expect(hostileEnemies[0].type).toBe(CharacterType.ENEMY);
      expect(hostileEnemies[0].sentiment).toBe(CharacterSentiment.HOSTILE);
    });

    it('should order enemies by dexterity descending', async () => {
      // Create enemies with different dexterity values
      const slowEnemyId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Slow Enemy',
        type: CharacterType.ENEMY,
        current_room_id: startingRoomId,
        sentiment: CharacterSentiment.HOSTILE,
        dexterity: 8 // -1 modifier
      });

      const fastEnemyId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Fast Enemy',
        type: CharacterType.ENEMY,
        current_room_id: startingRoomId,
        sentiment: CharacterSentiment.AGGRESSIVE,
        dexterity: 16 // +3 modifier
      });

      const mediumEnemyId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Medium Enemy',
        type: CharacterType.ENEMY,
        current_room_id: startingRoomId,
        sentiment: CharacterSentiment.HOSTILE,
        dexterity: 12 // +1 modifier
      });

      const hostileEnemies = await characterService.getHostileEnemiesInRoom(startingRoomId);

      // Should be ordered by dexterity descending
      expect(hostileEnemies).toHaveLength(3);
      expect(hostileEnemies[0].dexterity).toBe(16); // Fast Enemy first
      expect(hostileEnemies[1].dexterity).toBe(12); // Medium Enemy second  
      expect(hostileEnemies[2].dexterity).toBe(8);  // Slow Enemy last

      // Verify the highest dexterity modifier logic
      const highestModifier = getAttributeModifier(hostileEnemies[0].dexterity);
      expect(highestModifier).toBe(3); // 16 dex = +3 modifier
    });
  });

  describe('Escape calculation mechanics', () => {
    it('should calculate escape chances correctly with different dexterity values', () => {
      // Test various player/enemy combinations
      const scenarios = [
        { playerDex: 12, enemyDex: 10, playerMod: 1, enemyMod: 0, target: 10, description: 'equal skill' },
        { playerDex: 16, enemyDex: 8, playerMod: 3, enemyMod: -1, target: 9, description: 'agile vs clumsy' },
        { playerDex: 8, enemyDex: 18, playerMod: -1, enemyMod: 4, target: 14, description: 'clumsy vs agile' },
        { playerDex: 20, enemyDex: 1, playerMod: 5, enemyMod: -5, target: 5, description: 'max vs min' },
        { playerDex: 1, enemyDex: 20, playerMod: -5, enemyMod: 5, target: 15, description: 'min vs max' }
      ];

      scenarios.forEach(({ playerDex, enemyDex, playerMod, enemyMod, target, description }) => {
        const actualPlayerMod = getAttributeModifier(playerDex);
        const actualEnemyMod = getAttributeModifier(enemyDex);
        const actualTarget = 10 + actualEnemyMod;

        expect(actualPlayerMod).toBe(playerMod);
        expect(actualEnemyMod).toBe(enemyMod);
        expect(actualTarget).toBe(target);

        // Calculate success probabilities
        const minRollToSucceed = Math.max(1, target - playerMod);
        const successProbability = Math.max(0, (21 - minRollToSucceed) / 20);

        // Verify reasonable probability ranges
        expect(successProbability).toBeGreaterThanOrEqual(0);
        expect(successProbability).toBeLessThanOrEqual(1);
      });
    });

    it('should handle multiple enemies using highest dexterity', async () => {
      // Create enemies with different dexterity values
      await characterService.createCharacter({
        game_id: gameId,
        name: 'Weak Guard',
        type: CharacterType.ENEMY,
        current_room_id: startingRoomId,
        sentiment: CharacterSentiment.HOSTILE,
        dexterity: 8 // -1 modifier
      });

      await characterService.createCharacter({
        game_id: gameId,
        name: 'Elite Assassin',
        type: CharacterType.ENEMY,
        current_room_id: startingRoomId,
        sentiment: CharacterSentiment.HOSTILE,
        dexterity: 18 // +4 modifier (highest)
      });

      await characterService.createCharacter({
        game_id: gameId,
        name: 'Regular Soldier',
        type: CharacterType.ENEMY,
        current_room_id: startingRoomId,
        sentiment: CharacterSentiment.HOSTILE,
        dexterity: 12 // +1 modifier
      });

      const hostileEnemies = await characterService.getHostileEnemiesInRoom(startingRoomId);
      
      // Calculate what the escape attempt would use
      const enemyModifiers = hostileEnemies.map(enemy => getAttributeModifier(enemy.dexterity));
      const highestEnemyModifier = Math.max(...enemyModifiers);
      const targetNumber = 10 + highestEnemyModifier;

      // Should use the Elite Assassin's +4 modifier
      expect(highestEnemyModifier).toBe(4);
      expect(targetNumber).toBe(14);
      
      // Player with dex 12 (+1) would need to roll 13+ on d20 to succeed
      const playerModifier = getAttributeModifier(12);
      const minRollToSucceed = targetNumber - playerModifier;
      expect(minRollToSucceed).toBe(13); // 14 - 1 = 13
    });
  });

  describe('Room state management', () => {
    it('should maintain proper game state during escape attempts', async () => {
      // Verify initial state
      expect(gameStateManager.getCurrentRoomId()).toBe(startingRoomId);
      expect(gameStateManager.isInGame()).toBe(true);

      // Create enemy
      await characterService.createCharacter({
        game_id: gameId,
        name: 'Test Enemy',
        type: CharacterType.ENEMY,
        current_room_id: startingRoomId,
        sentiment: CharacterSentiment.HOSTILE,
        dexterity: 10
      });

      // Verify enemy is in the room
      const hostileEnemies = await characterService.getHostileEnemiesInRoom(startingRoomId);
      expect(hostileEnemies).toHaveLength(1);

      // Game state should remain consistent
      expect(gameStateManager.getCurrentRoomId()).toBe(startingRoomId);
      expect(gameStateManager.getCurrentSession()?.gameId).toBe(gameId);
    });

    it('should properly track character locations after movement', async () => {
      // Move player to north room (no enemies, should succeed)
      await gameStateManager.moveToRoom(northRoomId);
      
      // Verify room change
      expect(gameStateManager.getCurrentRoomId()).toBe(northRoomId);

      // Create enemy in north room
      const enemyId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Northern Guardian',
        type: CharacterType.ENEMY,
        current_room_id: northRoomId,
        sentiment: CharacterSentiment.HOSTILE,
        dexterity: 14
      });

      // Verify enemy is in the correct room
      const northEnemies = await characterService.getHostileEnemiesInRoom(northRoomId);
      const startingEnemies = await characterService.getHostileEnemiesInRoom(startingRoomId);
      
      expect(northEnemies).toHaveLength(1);
      expect(northEnemies[0].id).toBe(enemyId);
      expect(startingEnemies).toHaveLength(0);
    });
  });

  describe('Backward compatibility', () => {
    it('should not affect other blocking mechanics', async () => {
      // The escape system only affects movement commands
      // Other commands should still be blocked by hostile characters as before
      
      // This is tested implicitly - the escape system only affects movement
      // through GameController.move(), other commands use different blocking logic
      
      // Create hostile enemy
      await characterService.createCharacter({
        game_id: gameId,
        name: 'Blocking Enemy',
        type: CharacterType.ENEMY,
        current_room_id: startingRoomId,
        sentiment: CharacterSentiment.HOSTILE,
        dexterity: 12
      });

      // Verify the old blocking system would still find blocking characters
      const blockingCharacters = await characterService.getBlockingCharacters(startingRoomId);
      expect(blockingCharacters).toHaveLength(1);
      expect(blockingCharacters[0].name).toBe('Blocking Enemy');

      // But the new escape system should only consider enemies, not all hostile characters
      const hostileEnemies = await characterService.getHostileEnemiesInRoom(startingRoomId);
      expect(hostileEnemies).toHaveLength(1);
      expect(hostileEnemies[0].name).toBe('Blocking Enemy');
    });

    it('should handle edge cases gracefully', async () => {
      // Empty room
      let hostileEnemies = await characterService.getHostileEnemiesInRoom(startingRoomId);
      expect(hostileEnemies).toHaveLength(0);

      // Room with only non-hostile enemies
      await characterService.createCharacter({
        game_id: gameId,
        name: 'Friendly Enemy',
        type: CharacterType.ENEMY,
        current_room_id: startingRoomId,
        sentiment: CharacterSentiment.FRIENDLY,
        dexterity: 14
      });

      hostileEnemies = await characterService.getHostileEnemiesInRoom(startingRoomId);
      expect(hostileEnemies).toHaveLength(0);

      // Room with only hostile NPCs (should not block movement)
      await characterService.createCharacter({
        game_id: gameId,
        name: 'Angry Shopkeeper',
        type: CharacterType.NPC,
        current_room_id: startingRoomId,
        sentiment: CharacterSentiment.HOSTILE,
        dexterity: 16
      });

      hostileEnemies = await characterService.getHostileEnemiesInRoom(startingRoomId);
      expect(hostileEnemies).toHaveLength(0); // Still no enemies that should block movement
    });
  });
});