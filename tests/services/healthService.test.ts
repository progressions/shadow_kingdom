import Database from '../../src/utils/database';
import { HealthService } from '../../src/services/healthService';
import { CharacterService } from '../../src/services/characterService';
import { Character } from '../../src/types/character';
import { initializeDatabase } from '../../src/utils/initDb';

describe('HealthService', () => {
  let db: Database;
  let healthService: HealthService;
  let characterService: CharacterService;
  let testCharacterId: number;
  let testCharacter: Character;

  beforeEach(async () => {
    // Use in-memory database for tests
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    healthService = new HealthService(db);
    characterService = new CharacterService(db);

    // Create a test character
    const characterData = {
      game_id: 1,
      name: 'Test Hero',
      constitution: 14 // Should give +2 modifier, so 12 max HP
    };
    
    testCharacterId = await characterService.createCharacter(characterData);
    const character = await characterService.getCharacter(testCharacterId);
    if (!character) throw new Error('Failed to create test character');
    testCharacter = character;
  });

  afterEach(async () => {
    await db.close();
  });

  describe('initializeHealth', () => {
    it('should calculate and set max health based on constitution', async () => {
      await healthService.initializeHealth(testCharacter.id);
      
      const healthStatus = await healthService.getHealthStatus(testCharacter.id);
      
      // Base HP (10) + CON modifier (+2) = 12
      expect(healthStatus.maximum).toBe(12);
      expect(healthStatus.current).toBe(12);
      expect(healthStatus.isDead).toBe(false);
    });

    it('should handle different constitution values correctly', async () => {
      // Test with constitution 8 (-1 modifier)
      const weakCharacterId = await characterService.createCharacter({
        game_id: 1,
        name: 'Weak Hero',
        constitution: 8
      });

      await healthService.initializeHealth(weakCharacterId);
      const healthStatus = await healthService.getHealthStatus(weakCharacterId);
      
      // Base HP (10) + CON modifier (-1) = 9
      expect(healthStatus.maximum).toBe(9);
      expect(healthStatus.current).toBe(9);
    });
  });

  describe('getHealthStatus', () => {
    beforeEach(async () => {
      await healthService.initializeHealth(testCharacter.id);
    });

    it('should return correct health status for healthy character', async () => {
      const healthStatus = await healthService.getHealthStatus(testCharacter.id);
      
      expect(healthStatus.current).toBe(12);
      expect(healthStatus.maximum).toBe(12);
      expect(healthStatus.percentage).toBe(100);
      expect(healthStatus.isDead).toBe(false);
      expect(healthStatus.status).toBe('healthy');
    });

    it('should categorize health status correctly', async () => {
      // Test injured status (50% health)
      await db.run('UPDATE characters SET current_health = ? WHERE id = ?', [6, testCharacter.id]);
      let status = await healthService.getHealthStatus(testCharacter.id);
      expect(status.status).toBe('injured');
      expect(status.percentage).toBe(50);

      // Test critical status (20% health)
      await db.run('UPDATE characters SET current_health = ? WHERE id = ?', [2, testCharacter.id]);
      status = await healthService.getHealthStatus(testCharacter.id);
      expect(status.status).toBe('critical');

      // Test dead status (0 health)
      await db.run('UPDATE characters SET current_health = ?, is_dead = ? WHERE id = ?', [0, true, testCharacter.id]);
      status = await healthService.getHealthStatus(testCharacter.id);
      expect(status.status).toBe('dead');
      expect(status.isDead).toBeTruthy(); // SQLite stores boolean as 1/0
    });
  });

  describe('applyDamage', () => {
    beforeEach(async () => {
      await healthService.initializeHealth(testCharacter.id);
    });

    it('should reduce health correctly', async () => {
      const newStatus = await healthService.applyDamage(testCharacter.id, 5);
      
      expect(newStatus.current).toBe(7);
      expect(newStatus.maximum).toBe(12);
      expect(newStatus.isDead).toBe(false);
    });

    it('should not allow health below 0', async () => {
      const newStatus = await healthService.applyDamage(testCharacter.id, 20);
      
      expect(newStatus.current).toBe(0);
      expect(newStatus.isDead).toBeTruthy(); // SQLite stores boolean as 1/0
    });

    it('should mark character as dead when health reaches 0', async () => {
      await healthService.applyDamage(testCharacter.id, 12);
      
      const character = await characterService.getCharacter(testCharacter.id);
      expect(character?.is_dead).toBeTruthy();
    });

    it('should reject negative damage values', async () => {
      await expect(healthService.applyDamage(testCharacter.id, -5))
        .rejects.toThrow('Damage must be non-negative');
    });
  });

  describe('applyHealing', () => {
    beforeEach(async () => {
      await healthService.initializeHealth(testCharacter.id);
      // Damage character first
      await healthService.applyDamage(testCharacter.id, 5);
    });

    it('should restore health correctly', async () => {
      const newStatus = await healthService.applyHealing(testCharacter.id, 3);
      
      expect(newStatus.current).toBe(10);
      expect(newStatus.isDead).toBe(false);
    });

    it('should not exceed maximum health', async () => {
      const newStatus = await healthService.applyHealing(testCharacter.id, 10);
      
      expect(newStatus.current).toBe(12); // Should cap at maximum
    });

    it('should reject healing dead characters', async () => {
      // Kill the character
      await healthService.applyDamage(testCharacter.id, 20);
      
      await expect(healthService.applyHealing(testCharacter.id, 5))
        .rejects.toThrow('Cannot heal dead characters');
    });

    it('should reject negative healing values', async () => {
      await expect(healthService.applyHealing(testCharacter.id, -5))
        .rejects.toThrow('Healing must be non-negative');
    });
  });

  describe('restoreToFull', () => {
    beforeEach(async () => {
      await healthService.initializeHealth(testCharacter.id);
      // Damage character first
      await healthService.applyDamage(testCharacter.id, 8);
    });

    it('should restore character to full health', async () => {
      const newStatus = await healthService.restoreToFull(testCharacter.id);
      
      expect(newStatus.current).toBe(12);
      expect(newStatus.percentage).toBe(100);
      expect(newStatus.status).toBe('healthy');
    });

    it('should not heal dead characters', async () => {
      // Kill the character
      await healthService.applyDamage(testCharacter.id, 20);
      
      await expect(healthService.restoreToFull(testCharacter.id))
        .rejects.toThrow('Cannot heal dead characters');
    });
  });

  describe('getHealthDisplay', () => {
    beforeEach(async () => {
      await healthService.initializeHealth(testCharacter.id);
    });

    it('should format health display correctly for full health', async () => {
      const healthStatus = await healthService.getHealthStatus(testCharacter.id);
      const display = healthService.getHealthDisplay(healthStatus);
      
      expect(display).toMatch(/💚 HP: 12\/12/);
      expect(display).toMatch(/100%/);
      expect(display).toMatch(/█{10}/); // Full health bar
    });

    it('should format health display correctly for injured', async () => {
      await healthService.applyDamage(testCharacter.id, 6);
      const healthStatus = await healthService.getHealthStatus(testCharacter.id);
      const display = healthService.getHealthDisplay(healthStatus);
      
      expect(display).toMatch(/💛 HP: 6\/12/);
      expect(display).toMatch(/50%/);
    });

    it('should format health display correctly for critical', async () => {
      await healthService.applyDamage(testCharacter.id, 10);
      const healthStatus = await healthService.getHealthStatus(testCharacter.id);
      const display = healthService.getHealthDisplay(healthStatus);
      
      expect(display).toMatch(/❤️ HP: 2\/12/);
      expect(display).toMatch(/17%/);
    });

    it('should format health display correctly for dead', async () => {
      await healthService.applyDamage(testCharacter.id, 20);
      const healthStatus = await healthService.getHealthStatus(testCharacter.id);
      const display = healthService.getHealthDisplay(healthStatus);
      
      expect(display).toMatch(/💀 HP: 0\/12/);
      expect(display).toMatch(/0%/);
    });
  });

  describe('needsHealthInitialization', () => {
    it('should return true for characters without max_health', async () => {
      // Create a character without initializing health by setting max_health to null
      await db.run('UPDATE characters SET max_health = NULL WHERE id = ?', [testCharacter.id]);
      
      const needsInit = await healthService.needsHealthInitialization(testCharacter.id);
      expect(needsInit).toBe(true);
    });

    it('should return false for characters with initialized health', async () => {
      await healthService.initializeHealth(testCharacter.id);
      const needsInit = await healthService.needsHealthInitialization(testCharacter.id);
      expect(needsInit).toBe(false);
    });
  });

  describe('recalculateMaxHealth', () => {
    it('should update max health when constitution changes', async () => {
      await healthService.initializeHealth(testCharacter.id);
      
      // Change constitution from 14 to 18 (+4 modifier)
      await db.run('UPDATE characters SET constitution = ? WHERE id = ?', [18, testCharacter.id]);
      
      await healthService.recalculateMaxHealth(testCharacter.id);
      
      const healthStatus = await healthService.getHealthStatus(testCharacter.id);
      // Base HP (10) + new CON modifier (+4) = 14
      expect(healthStatus.maximum).toBe(14);
    });

    it('should proportionally adjust current health when max health changes', async () => {
      await healthService.initializeHealth(testCharacter.id);
      // Damage to 50% health (6/12)
      await healthService.applyDamage(testCharacter.id, 6);
      
      // Increase constitution to 16 (+3 modifier, new max 13)
      await db.run('UPDATE characters SET constitution = ? WHERE id = ?', [16, testCharacter.id]);
      await healthService.recalculateMaxHealth(testCharacter.id);
      
      const healthStatus = await healthService.getHealthStatus(testCharacter.id);
      expect(healthStatus.maximum).toBe(13);
      // Should maintain roughly 50% health ratio: 6.5 rounds to 7
      expect(healthStatus.current).toBe(7);
    });
  });

  describe('error handling', () => {
    it('should handle non-existent characters gracefully', async () => {
      await expect(healthService.getHealthStatus(99999))
        .rejects.toThrow('Character not found');
    });

    it('should handle database errors gracefully', async () => {
      await db.close(); // Close database to simulate errors
      
      await expect(healthService.getHealthStatus(testCharacter.id))
        .rejects.toThrow();
    });
  });
});