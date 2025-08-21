import Database from '../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';
import { CharacterService } from '../src/services/characterService';
import { HealthService } from '../src/services/healthService';
import { ActionValidator } from '../src/services/actionValidator';

describe('Health System Integration', () => {
  let db: Database;
  let characterService: CharacterService;
  let healthService: HealthService;
  let actionValidator: ActionValidator;
  let gameId: number;
  let characterId: number;

  beforeEach(async () => {
    // Use in-memory database for tests
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    // Create services
    characterService = new CharacterService(db);
    healthService = new HealthService(db);
    actionValidator = new ActionValidator(db, characterService);
    
    // Create a test game with starter rooms
    gameId = await createGameWithRooms(db, 'Health Test Game');
    
    // Get the player character that was created with the game
    const character = await characterService.getPlayerCharacter(gameId);
    if (!character) {
      throw new Error('No player character found');
    }
    characterId = character.id;
  });

  afterEach(async () => {
    await db.close();
  });

  describe('Health Service Integration', () => {
    it('should correctly calculate health for game characters', async () => {
      const character = await characterService.getCharacter(characterId);
      expect(character).not.toBeNull();
      
      // Character should already have health initialized from character creation
      const healthStatus = await healthService.getHealthStatus(characterId);
      
      expect(healthStatus.maximum).toBeGreaterThan(0);
      expect(healthStatus.current).toBe(healthStatus.maximum);
      expect(healthStatus.status).toBe('healthy');
      expect(healthStatus.isDead).toBe(false);
    });

    it('should handle damage and healing cycles correctly', async () => {
      // Apply damage
      let healthStatus = await healthService.applyDamage(characterId, 5);
      expect(healthStatus.current).toBeLessThan(healthStatus.maximum);
      
      // Apply healing
      healthStatus = await healthService.applyHealing(characterId, 3);
      expect(healthStatus.current).toBeGreaterThan(healthStatus.maximum - 5);
      
      // Full rest
      healthStatus = await healthService.restoreToFull(characterId);
      expect(healthStatus.current).toBe(healthStatus.maximum);
    });
  });

  describe('Action Validation Integration', () => {
    it('should allow actions when character is alive', async () => {
      const character = await characterService.getCharacter(characterId);
      expect(character?.is_dead).toBeFalsy();
      
      // Get a room ID for the validation context
      const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
      const roomId = rooms[0].id;
      
      // Move action should be allowed when alive
      const validationResult = await actionValidator.canPerformAction('move', character!, {
        roomId: roomId,
        characterId: characterId
      });
      
      expect(validationResult.allowed).toBe(true);
    });

    it('should prevent most actions when character is dead', async () => {
      // Kill the character
      await healthService.applyDamage(characterId, 50); // Overkill to ensure death
      
      const character = await characterService.getCharacter(characterId);
      expect(character?.is_dead).toBeTruthy();
      
      // Get a room ID for the validation context
      const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
      const roomId = rooms[0].id;
      
      // Test that dead character cannot perform actions
      const validationResult = await actionValidator.canPerformAction('move', character!, {
        roomId: roomId,
        characterId: characterId
      });
      
      expect(validationResult.allowed).toBe(false);
      expect(validationResult.reason).toMatch(/can't do that while dead/i);
    });

    it('should allow help command when dead', async () => {
      // Kill the character
      await healthService.applyDamage(characterId, 50);
      
      const character = await characterService.getCharacter(characterId);
      
      // Get a room ID for the validation context
      const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
      const roomId = rooms[0].id;
      
      // Help command should be allowed when dead
      const helpResult = await actionValidator.canPerformAction('help', character!, {
        roomId: roomId,
        characterId: characterId
      });
      
      expect(helpResult.allowed).toBe(true);
    });
  });

  describe('Constitution-Based Health Calculation', () => {
    it('should calculate health based on character constitution', async () => {
      // Update character constitution to 16 (+3 modifier)
      await db.run('UPDATE characters SET constitution = ? WHERE id = ?', [16, characterId]);
      
      await healthService.initializeHealth(characterId);
      const healthStatus = await healthService.getHealthStatus(characterId);
      
      // Base HP (10) + CON modifier (+3) = 13
      expect(healthStatus.maximum).toBe(13);
      expect(healthStatus.current).toBe(13);
    });

    it('should handle very low constitution correctly', async () => {
      // Set constitution to 6 (-2 modifier)
      await db.run('UPDATE characters SET constitution = ? WHERE id = ?', [6, characterId]);
      
      await healthService.initializeHealth(characterId);
      const healthStatus = await healthService.getHealthStatus(characterId);
      
      // Base HP (10) + CON modifier (-2) = 8
      expect(healthStatus.maximum).toBe(8);
      expect(healthStatus.current).toBe(8);
    });

    it('should handle very high constitution correctly', async () => {
      // Set constitution to 20 (+5 modifier)
      await db.run('UPDATE characters SET constitution = ? WHERE id = ?', [20, characterId]);
      
      await healthService.initializeHealth(characterId);
      const healthStatus = await healthService.getHealthStatus(characterId);
      
      // Base HP (10) + CON modifier (+5) = 15
      expect(healthStatus.maximum).toBe(15);
      expect(healthStatus.current).toBe(15);
    });
  });

  describe('Complex Health Scenarios', () => {
    it('should handle multiple damage/healing cycles correctly', async () => {
      const initialHealth = await healthService.getHealthStatus(characterId);
      
      // Apply multiple damage/healing cycles
      for (let i = 0; i < 3; i++) {
        await healthService.applyDamage(characterId, 2);
        await healthService.applyHealing(characterId, 1);
      }
      
      const finalHealth = await healthService.getHealthStatus(characterId);
      // Should have lost 3 HP total (2 damage - 1 healing per cycle)
      expect(finalHealth.current).toBe(initialHealth.maximum - 3);
    });

    it('should prevent healing dead characters', async () => {
      // Kill character
      await healthService.applyDamage(characterId, 100);
      
      const character = await characterService.getCharacter(characterId);
      expect(character?.is_dead).toBeTruthy();
      
      // Attempt to heal should fail
      await expect(healthService.applyHealing(characterId, 10))
        .rejects.toThrow('Cannot heal dead characters');
        
      // Full rest should also fail
      await expect(healthService.restoreToFull(characterId))
        .rejects.toThrow('Cannot heal dead characters');
    });

    it('should correctly update death state when taking lethal damage', async () => {
      const initialHealth = await healthService.getHealthStatus(characterId);
      
      // Apply lethal damage
      await healthService.applyDamage(characterId, initialHealth.maximum + 10);
      
      const finalHealth = await healthService.getHealthStatus(characterId);
      expect(finalHealth.current).toBe(0);
      expect(finalHealth.isDead).toBeTruthy();
      expect(finalHealth.status).toBe('dead');
      
      // Verify database state
      const character = await characterService.getCharacter(characterId);
      expect(character?.is_dead).toBeTruthy();
    });
  });
});