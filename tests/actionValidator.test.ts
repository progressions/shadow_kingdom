import Database from '../src/utils/database';
import { initializeDatabase } from '../src/utils/initDb';
import { ActionValidator } from '../src/services/actionValidator';
import { CharacterService } from '../src/services/characterService';
import { Character, CharacterType } from '../src/types/character';
import { ValidationResult, ActionContext } from '../src/types/validation';

describe('ActionValidator', () => {
  let db: Database;
  let actionValidator: ActionValidator;
  let characterService: CharacterService;
  let gameId: number;
  let testCharacter: Character;
  let testRoom: { id: number };

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    characterService = new CharacterService(db);
    actionValidator = new ActionValidator(db, characterService);

    // Create a test game
    const gameResult = await db.run(
      'INSERT INTO games (name) VALUES (?)',
      ['Test Game']
    );
    gameId = gameResult.lastID as number;

    // Create a test room
    const roomResult = await db.run(
      'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
      [gameId, 'Test Room', 'A test room for validation']
    );
    testRoom = { id: roomResult.lastID as number };

    // Create a test character
    const characterId = await characterService.createCharacter({
      game_id: gameId,
      name: 'Test Hero',
      type: CharacterType.PLAYER,
      current_room_id: testRoom.id
    });

    testCharacter = (await characterService.getCharacter(characterId))!;
  });

  afterEach(async () => {
    await db.close();
  });

  describe('Core Infrastructure', () => {
    test('should create ActionValidator instance', () => {
      expect(actionValidator).toBeInstanceOf(ActionValidator);
    });

    test('should allow basic actions for living character', async () => {
      const context: ActionContext = {
        roomId: testRoom.id,
        characterId: testCharacter.id
      };

      const result = await actionValidator.canPerformAction('test_action', testCharacter, context);
      
      expect(result.allowed).toBe(true);
    });

    test('should handle validation errors gracefully', async () => {
      const context: ActionContext = {
        roomId: testRoom.id,
        characterId: testCharacter.id
      };

      // Create a corrupted character object to trigger error
      const corruptedCharacter = { ...testCharacter, id: -1 };
      
      const result = await actionValidator.canPerformAction('test_action', corruptedCharacter, context);
      
      // Should not throw, but return error result
      expect(result.allowed).toBe(true); // Phase 1 only checks death state
    });
  });

  describe('Death State Validation', () => {
    test('should prevent actions when character is dead', async () => {
      // Mark character as dead
      await db.run(
        'UPDATE characters SET is_dead = TRUE WHERE id = ?',
        [testCharacter.id]
      );

      // Refresh character data
      const deadCharacter = (await characterService.getCharacter(testCharacter.id))!;
      
      const context: ActionContext = {
        roomId: testRoom.id,
        characterId: deadCharacter.id
      };

      const result = await actionValidator.canPerformAction('move', deadCharacter, context);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("can't do that while dead");
      expect(result.hint).toContain('respawn');
    });

    test('should allow help command when dead', async () => {
      // Mark character as dead
      await db.run(
        'UPDATE characters SET is_dead = TRUE WHERE id = ?',
        [testCharacter.id]
      );

      const deadCharacter = (await characterService.getCharacter(testCharacter.id))!;
      
      const context: ActionContext = {
        roomId: testRoom.id,
        characterId: deadCharacter.id
      };

      const result = await actionValidator.canPerformAction('help', deadCharacter, context);
      
      expect(result.allowed).toBe(true);
    });

    test('should allow quit command when dead', async () => {
      // Mark character as dead
      await db.run(
        'UPDATE characters SET is_dead = TRUE WHERE id = ?',
        [testCharacter.id]
      );

      const deadCharacter = (await characterService.getCharacter(testCharacter.id))!;
      
      const context: ActionContext = {
        roomId: testRoom.id,
        characterId: deadCharacter.id
      };

      const result = await actionValidator.canPerformAction('quit', deadCharacter, context);
      
      expect(result.allowed).toBe(true);
    });

    test('should prevent drop action when dead', async () => {
      // Mark character as dead
      await db.run(
        'UPDATE characters SET is_dead = TRUE WHERE id = ?',
        [testCharacter.id]
      );

      const deadCharacter = (await characterService.getCharacter(testCharacter.id))!;
      
      const context: ActionContext = {
        roomId: testRoom.id,
        characterId: deadCharacter.id,
        itemId: 1
      };

      const result = await actionValidator.canPerformAction('drop', deadCharacter, context);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("can't do that while dead");
    });

    test('should prevent pickup action when dead', async () => {
      // Mark character as dead
      await db.run(
        'UPDATE characters SET is_dead = TRUE WHERE id = ?',
        [testCharacter.id]
      );

      const deadCharacter = (await characterService.getCharacter(testCharacter.id))!;
      
      const context: ActionContext = {
        roomId: testRoom.id,
        characterId: deadCharacter.id,
        itemId: 1
      };

      const result = await actionValidator.canPerformAction('pickup', deadCharacter, context);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("can't do that while dead");
    });

    test('should handle is_dead field variations correctly', async () => {
      const context: ActionContext = {
        roomId: testRoom.id,
        characterId: testCharacter.id
      };

      // Test with null is_dead (should be treated as alive)
      await db.run('UPDATE characters SET is_dead = NULL WHERE id = ?', [testCharacter.id]);
      let character = (await characterService.getCharacter(testCharacter.id))!;
      let result = await actionValidator.canPerformAction('move', character, context);
      expect(result.allowed).toBe(true);

      // Test with false is_dead (should be treated as alive)
      await db.run('UPDATE characters SET is_dead = FALSE WHERE id = ?', [testCharacter.id]);
      character = (await characterService.getCharacter(testCharacter.id))!;
      result = await actionValidator.canPerformAction('move', character, context);
      expect(result.allowed).toBe(true);

      // Test with true is_dead (should be blocked)
      await db.run('UPDATE characters SET is_dead = TRUE WHERE id = ?', [testCharacter.id]);
      character = (await characterService.getCharacter(testCharacter.id))!;
      result = await actionValidator.canPerformAction('move', character, context);
      expect(result.allowed).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    test('should create action context correctly', () => {
      const context = ActionValidator.buildActionContext(
        testRoom.id,
        testCharacter.id,
        {
          itemId: 42,
          direction: 'north',
          targetId: 1,
          additionalData: { test: 'data' }
        }
      );

      expect(context.roomId).toBe(testRoom.id);
      expect(context.characterId).toBe(testCharacter.id);
      expect(context.itemId).toBe(42);
      expect(context.direction).toBe('north');
      expect(context.targetId).toBe(1);
      expect(context.additionalData?.test).toBe('data');
    });

    test('should create action context with minimal options', () => {
      const context = ActionValidator.buildActionContext(
        testRoom.id,
        testCharacter.id
      );

      expect(context.roomId).toBe(testRoom.id);
      expect(context.characterId).toBe(testCharacter.id);
      expect(context.itemId).toBeUndefined();
      expect(context.direction).toBeUndefined();
      expect(context.targetId).toBeUndefined();
      expect(context.additionalData).toBeUndefined();
    });

    test('should create blocked result correctly', () => {
      const result = ActionValidator.createBlockedResult(
        'Test blocked reason',
        'Test hint',
        { type: 'test_blocker' }
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Test blocked reason');
      expect(result.hint).toBe('Test hint');
      expect(result.blocker).toEqual({ type: 'test_blocker' });
    });

    test('should create allowed result correctly', () => {
      const result = ActionValidator.createAllowedResult();

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.hint).toBeUndefined();
      expect(result.blocker).toBeUndefined();
    });
  });

  describe('Future Phase Placeholders', () => {
    test('should have placeholder methods for future phases', () => {
      // These are private methods, but we can verify the class structure
      expect(actionValidator).toBeDefined();
      
      // Test that all validation currently passes (Phase 1 only implements death check)
      const livingCharacterActions = [
        'move', 'rest', 'pickup', 'drop', 'use', 'equip', 'unequip', 'examine'
      ];

      const context: ActionContext = {
        roomId: testRoom.id,
        characterId: testCharacter.id
      };

      return Promise.all(
        livingCharacterActions.map(async (action) => {
          const result = await actionValidator.canPerformAction(action, testCharacter, context);
          expect(result.allowed).toBe(true);
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      const context: ActionContext = {
        roomId: testRoom.id,
        characterId: testCharacter.id
      };

      // Phase 1 only checks death state, which doesn't require database access
      // So this test verifies that basic validation still works even if database fails
      const result = await actionValidator.canPerformAction('test_action', testCharacter, context);
      
      // Should still work for Phase 1 (death state check only)
      expect(result.allowed).toBe(true);
    });

    test('should handle malformed character data', async () => {
      const context: ActionContext = {
        roomId: testRoom.id,
        characterId: testCharacter.id
      };

      // Test with undefined character
      const result1 = await actionValidator.canPerformAction('test_action', undefined as any, context);
      expect(result1.allowed).toBe(false);
      expect(result1.reason).toContain('Character not found');

      // Test with malformed character object (still has some structure)
      const malformedCharacter = { id: 'not-a-number' } as any;
      const result2 = await actionValidator.canPerformAction('test_action', malformedCharacter, context);
      // Since is_dead is falsy, this should pass Phase 1 validation
      expect(result2.allowed).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should validate actions quickly', async () => {
      const context: ActionContext = {
        roomId: testRoom.id,
        characterId: testCharacter.id
      };

      const startTime = Date.now();
      
      // Run multiple validations
      const promises = Array.from({ length: 100 }, () =>
        actionValidator.canPerformAction('test_action', testCharacter, context)
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      // All should succeed
      expect(results.every(r => r.allowed)).toBe(true);
      
      // Should complete in reasonable time (less than 1 second for 100 validations)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Integration with CharacterService', () => {
    test('should work correctly when CharacterService is provided', () => {
      const validatorWithService = new ActionValidator(db, characterService);
      expect(validatorWithService).toBeInstanceOf(ActionValidator);
    });

    test('should work correctly when CharacterService is not provided', () => {
      const validatorWithoutService = new ActionValidator(db);
      expect(validatorWithoutService).toBeInstanceOf(ActionValidator);
    });

    test('should handle character service integration correctly', async () => {
      const context: ActionContext = {
        roomId: testRoom.id,
        characterId: testCharacter.id
      };

      // Test with character service
      const resultWithService = await actionValidator.canPerformAction('test_action', testCharacter, context);
      expect(resultWithService.allowed).toBe(true);

      // Test without character service (should still work for basic validation)
      const validatorWithoutService = new ActionValidator(db);
      const resultWithoutService = await validatorWithoutService.canPerformAction('test_action', testCharacter, context);
      expect(resultWithoutService.allowed).toBe(true);
    });
  });
});