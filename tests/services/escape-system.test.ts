import Database from '../../src/utils/database';
import { initializeTestDatabase } from '../testUtils';
import { CharacterService } from '../../src/services/characterService';
import { CharacterSentiment, CharacterType, getAttributeModifier } from '../../src/types/character';

describe('Dexterity-Based Escape System', () => {
  let db: Database;
  let characterService: CharacterService;
  let gameId: number;

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.connect();
    await initializeTestDatabase(db);
    characterService = new CharacterService(db);

    // Create test game
    const gameResult = await db.run(`
      INSERT INTO games (name, created_at, last_played_at) 
      VALUES ('Escape Test Game', '2025-08-23 10:00:00', '2025-08-23 10:00:00')
    `);
    gameId = gameResult.lastID as number;
  });

  afterEach(async () => {
    if (db.isConnected()) {
      await db.close();
    }
  });

  describe('escape calculations', () => {
    it('should calculate correct target numbers with equal dexterity', () => {
      // Player dex 12 (+1) vs Enemy dex 12 (+1)
      // Target: 10 + 1 = 11
      // Player roll: 1d20 + 1
      // Need 10+ on d20 to succeed (50% chance)
      
      const playerDexModifier = getAttributeModifier(12);
      const enemyDexModifier = getAttributeModifier(12);
      const targetNumber = 10 + enemyDexModifier;
      
      expect(playerDexModifier).toBe(1);
      expect(enemyDexModifier).toBe(1);
      expect(targetNumber).toBe(11);
    });

    it('should calculate target with high dex player vs low dex enemy', () => {
      // Player dex 18 (+4) vs Enemy dex 8 (-1)
      // Target: 10 + (-1) = 9
      // Player roll: 1d20 + 4
      // Need 5+ on d20 to succeed (80% chance)
      
      const playerDexModifier = getAttributeModifier(18);
      const enemyDexModifier = getAttributeModifier(8);
      const targetNumber = 10 + enemyDexModifier;
      
      expect(playerDexModifier).toBe(4);
      expect(enemyDexModifier).toBe(-1);
      expect(targetNumber).toBe(9);
    });

    it('should calculate target with low dex player vs high dex enemy', () => {
      // Player dex 8 (-1) vs Enemy dex 18 (+4)
      // Target: 10 + 4 = 14
      // Player roll: 1d20 + (-1)
      // Need 15+ on d20 to succeed (30% chance)
      
      const playerDexModifier = getAttributeModifier(8);
      const enemyDexModifier = getAttributeModifier(18);
      const targetNumber = 10 + enemyDexModifier;
      
      expect(playerDexModifier).toBe(-1);
      expect(enemyDexModifier).toBe(4);
      expect(targetNumber).toBe(14);
    });

    it('should handle extreme dexterity values', () => {
      // Minimum: Player dex 1 (-5) vs Enemy dex 1 (-5)
      const minPlayerMod = getAttributeModifier(1);
      const minEnemyMod = getAttributeModifier(1);
      const minTarget = 10 + minEnemyMod;
      
      expect(minPlayerMod).toBe(-5);
      expect(minEnemyMod).toBe(-5);
      expect(minTarget).toBe(5);
      
      // Maximum: Player dex 20 (+5) vs Enemy dex 20 (+5)
      const maxPlayerMod = getAttributeModifier(20);
      const maxEnemyMod = getAttributeModifier(20);
      const maxTarget = 10 + maxEnemyMod;
      
      expect(maxPlayerMod).toBe(5);
      expect(maxEnemyMod).toBe(5);
      expect(maxTarget).toBe(15);
    });

    it('should handle multiple enemies using highest dexterity modifier', () => {
      // Three enemies with different dexterity values
      const enemy1Dex = getAttributeModifier(10); // +0
      const enemy2Dex = getAttributeModifier(16); // +3
      const enemy3Dex = getAttributeModifier(12); // +1
      
      const highestEnemyDexModifier = Math.max(enemy1Dex, enemy2Dex, enemy3Dex);
      const targetNumber = 10 + highestEnemyDexModifier;
      
      expect(enemy1Dex).toBe(0);
      expect(enemy2Dex).toBe(3);
      expect(enemy3Dex).toBe(1);
      expect(highestEnemyDexModifier).toBe(3);
      expect(targetNumber).toBe(13);
    });

    it('should correctly determine success/failure for known rolls', () => {
      // Test scenario: Player dex 14 (+2) vs Enemy dex 12 (+1)
      // Target: 10 + 1 = 11
      // Player total roll = d20 + 2
      
      const playerDexModifier = getAttributeModifier(14);
      const enemyDexModifier = getAttributeModifier(12);
      const targetNumber = 10 + enemyDexModifier;
      
      // Test successful rolls
      const successfulRoll1 = 9 + playerDexModifier; // 9 + 2 = 11 (exactly meets target)
      const successfulRoll2 = 15 + playerDexModifier; // 15 + 2 = 17 (exceeds target)
      
      expect(successfulRoll1).toBeGreaterThanOrEqual(targetNumber);
      expect(successfulRoll2).toBeGreaterThanOrEqual(targetNumber);
      
      // Test failed rolls
      const failedRoll1 = 8 + playerDexModifier; // 8 + 2 = 10 (below target)
      const failedRoll2 = 1 + playerDexModifier; // 1 + 2 = 3 (well below target)
      
      expect(failedRoll1).toBeLessThan(targetNumber);
      expect(failedRoll2).toBeLessThan(targetNumber);
    });

    it('should format roll results correctly', () => {
      // Test positive modifier formatting
      const positiveModifier = 3;
      const positiveFormat = positiveModifier >= 0 ? `+${positiveModifier}` : `${positiveModifier}`;
      expect(positiveFormat).toBe('+3');
      
      // Test negative modifier formatting
      const negativeModifier = -2;
      const negativeFormat = negativeModifier >= 0 ? `+${negativeModifier}` : `${negativeModifier}`;
      expect(negativeFormat).toBe('-2');
      
      // Test zero modifier formatting
      const zeroModifier = 0;
      const zeroFormat = zeroModifier >= 0 ? `+${zeroModifier}` : `${zeroModifier}`;
      expect(zeroFormat).toBe('+0');
    });
  });

  describe('character service integration', () => {
    let roomId: number;
    let playerCharacterId: number;
    let npcCharacterId: number;
    let enemyCharacterId: number;

    beforeEach(async () => {
      // Create test room
      const roomResult = await db.run(`
        INSERT INTO rooms (game_id, name, description, region_id)
        VALUES (?, 'Test Room', 'A room for escape testing', 1)
      `, [gameId]);
      roomId = roomResult.lastID as number;

      // Create player character
      playerCharacterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Test Player',
        type: CharacterType.PLAYER,
        current_room_id: roomId,
        dexterity: 14
      });

      // Create hostile NPC (should NOT block movement)
      npcCharacterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Hostile NPC',
        type: CharacterType.NPC,
        current_room_id: roomId,
        sentiment: CharacterSentiment.HOSTILE,
        dexterity: 12
      });

      // Create hostile enemy (SHOULD block movement)
      enemyCharacterId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Goblin Warrior',
        type: CharacterType.ENEMY,
        current_room_id: roomId,
        sentiment: CharacterSentiment.HOSTILE,
        dexterity: 10
      });
    });

    it('should find hostile enemies in room', async () => {
      const hostileEnemies = await characterService.getHostileEnemiesInRoom(roomId);
      
      expect(hostileEnemies).toHaveLength(1);
      expect(hostileEnemies[0].id).toBe(enemyCharacterId);
      expect(hostileEnemies[0].name).toBe('Goblin Warrior');
      expect(hostileEnemies[0].type).toBe(CharacterType.ENEMY);
      expect(hostileEnemies[0].sentiment).toBe(CharacterSentiment.HOSTILE);
    });

    it('should ignore NPCs even when hostile', async () => {
      const hostileEnemies = await characterService.getHostileEnemiesInRoom(roomId);
      
      // Should NOT include the hostile NPC
      const npcIncluded = hostileEnemies.some(char => char.id === npcCharacterId);
      expect(npcIncluded).toBe(false);
      
      // Should only include the enemy
      expect(hostileEnemies).toHaveLength(1);
      expect(hostileEnemies[0].type).toBe(CharacterType.ENEMY);
    });

    it('should ignore dead enemies', async () => {
      // Mark enemy as dead
      await db.run(`
        UPDATE characters SET is_dead = 1 WHERE id = ?
      `, [enemyCharacterId]);
      
      const hostileEnemies = await characterService.getHostileEnemiesInRoom(roomId);
      
      expect(hostileEnemies).toHaveLength(0);
    });

    it('should order enemies by dexterity descending for easy max selection', async () => {
      // Create additional enemies with different dexterity values
      const weakEnemyId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Weak Goblin',
        type: CharacterType.ENEMY,
        current_room_id: roomId,
        sentiment: CharacterSentiment.HOSTILE,
        dexterity: 8
      });

      const fastEnemyId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Fast Goblin',
        type: CharacterType.ENEMY,
        current_room_id: roomId,
        sentiment: CharacterSentiment.HOSTILE,
        dexterity: 16
      });

      const hostileEnemies = await characterService.getHostileEnemiesInRoom(roomId);
      
      expect(hostileEnemies).toHaveLength(3);
      expect(hostileEnemies[0].dexterity).toBe(16); // Fast Goblin first
      expect(hostileEnemies[1].dexterity).toBe(10); // Goblin Warrior second
      expect(hostileEnemies[2].dexterity).toBe(8);  // Weak Goblin last
      
      // The highest dexterity modifier should be easy to get
      const highestEnemyDexModifier = getAttributeModifier(hostileEnemies[0].dexterity);
      expect(highestEnemyDexModifier).toBe(3); // 16 dex = +3 modifier
    });

    it('should handle room with no hostile enemies', async () => {
      // Create empty room
      const emptyRoomResult = await db.run(`
        INSERT INTO rooms (game_id, name, description, region_id)
        VALUES (?, 'Empty Room', 'A room with no enemies', 1)
      `, [gameId]);
      const emptyRoomId = emptyRoomResult.lastID as number;
      
      const hostileEnemies = await characterService.getHostileEnemiesInRoom(emptyRoomId);
      
      expect(hostileEnemies).toHaveLength(0);
    });

    it('should handle aggressive sentiment as hostile', async () => {
      // Create enemy with aggressive sentiment
      const aggressiveEnemyId = await characterService.createCharacter({
        game_id: gameId,
        name: 'Aggressive Orc',
        type: CharacterType.ENEMY,
        current_room_id: roomId,
        sentiment: CharacterSentiment.AGGRESSIVE,
        dexterity: 14
      });

      const hostileEnemies = await characterService.getHostileEnemiesInRoom(roomId);
      
      // Should include both hostile and aggressive enemies
      expect(hostileEnemies).toHaveLength(2);
      const sentiments = hostileEnemies.map(enemy => enemy.sentiment);
      expect(sentiments).toContain(CharacterSentiment.HOSTILE);
      expect(sentiments).toContain(CharacterSentiment.AGGRESSIVE);
    });
  });

  describe('attribute modifier edge cases', () => {
    it('should handle all valid attribute values correctly', () => {
      // Test all attribute values from 1 to 20
      const testCases = [
        { attr: 1, expected: -5 },
        { attr: 2, expected: -4 },
        { attr: 3, expected: -4 },
        { attr: 4, expected: -3 },
        { attr: 5, expected: -3 },
        { attr: 6, expected: -2 },
        { attr: 7, expected: -2 },
        { attr: 8, expected: -1 },
        { attr: 9, expected: -1 },
        { attr: 10, expected: 0 },
        { attr: 11, expected: 0 },
        { attr: 12, expected: 1 },
        { attr: 13, expected: 1 },
        { attr: 14, expected: 2 },
        { attr: 15, expected: 2 },
        { attr: 16, expected: 3 },
        { attr: 17, expected: 3 },
        { attr: 18, expected: 4 },
        { attr: 19, expected: 4 },
        { attr: 20, expected: 5 }
      ];

      testCases.forEach(({ attr, expected }) => {
        expect(getAttributeModifier(attr)).toBe(expected);
      });
    });

    it('should create proper target ranges for escape difficulty', () => {
      // Test various enemy dexterity values and their impact on escape difficulty
      const difficultyTests = [
        { enemyDex: 1, targetNumber: 5, description: 'very easy' },
        { enemyDex: 8, targetNumber: 9, description: 'easy' },
        { enemyDex: 10, targetNumber: 10, description: 'normal' },
        { enemyDex: 12, targetNumber: 11, description: 'moderate' },
        { enemyDex: 16, targetNumber: 13, description: 'hard' },
        { enemyDex: 20, targetNumber: 15, description: 'very hard' }
      ];

      difficultyTests.forEach(({ enemyDex, targetNumber, description }) => {
        const enemyMod = getAttributeModifier(enemyDex);
        const actualTarget = 10 + enemyMod;
        expect(actualTarget).toBe(targetNumber);
        
        // Verify target is within reasonable bounds (5-15)
        expect(actualTarget).toBeGreaterThanOrEqual(5);
        expect(actualTarget).toBeLessThanOrEqual(15);
      });
    });
  });
});