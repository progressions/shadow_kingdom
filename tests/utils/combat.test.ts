/**
 * Combat Utility Tests
 * 
 * Tests for the unified combat system using D20 rolls with strength/dexterity modifiers
 */

import { calculateAttributeModifier, doesAttackHit } from '../../src/utils/combat';

describe('Combat System', () => {
  describe('calculateAttributeModifier', () => {
    it('should calculate correct modifiers for various stat values', () => {
      // Test extreme low values
      expect(calculateAttributeModifier(1)).toBe(-3);
      expect(calculateAttributeModifier(2)).toBe(-3);
      expect(calculateAttributeModifier(3)).toBe(-3);
      
      // Test low values
      expect(calculateAttributeModifier(4)).toBe(-2);
      expect(calculateAttributeModifier(5)).toBe(-2);
      expect(calculateAttributeModifier(6)).toBe(-2);
      
      // Test below average
      expect(calculateAttributeModifier(7)).toBe(-1);
      expect(calculateAttributeModifier(8)).toBe(-1);
      expect(calculateAttributeModifier(9)).toBe(-1);
      
      // Test average values
      expect(calculateAttributeModifier(10)).toBe(0);
      expect(calculateAttributeModifier(11)).toBe(0);
      expect(calculateAttributeModifier(12)).toBe(0);
      
      // Test above average
      expect(calculateAttributeModifier(13)).toBe(1);
      expect(calculateAttributeModifier(14)).toBe(1);
      expect(calculateAttributeModifier(15)).toBe(1);
      
      // Test high values
      expect(calculateAttributeModifier(16)).toBe(2);
      expect(calculateAttributeModifier(17)).toBe(2);
      expect(calculateAttributeModifier(18)).toBe(2);
      
      // Test extreme high values
      expect(calculateAttributeModifier(19)).toBe(3);
      expect(calculateAttributeModifier(20)).toBe(3);
    });
  });

  describe('doesAttackHit', () => {
    beforeEach(() => {
      // Reset any existing Math.random mocks
      if (jest.isMockFunction(Math.random)) {
        (Math.random as jest.Mock).mockRestore();
      }
    });

    afterEach(() => {
      // Clean up any Math.random mocks
      if (jest.isMockFunction(Math.random)) {
        (Math.random as jest.Mock).mockRestore();
      }
    });

    it('should hit with guaranteed max roll', () => {
      // Mock to return 0.95, which gives roll of 20 (guaranteed hit)
      jest.spyOn(Math, 'random').mockReturnValue(0.95);
      
      // Even worst attacker vs best defender should hit on a 20
      const result = doesAttackHit(1, 20); // STR 1 (-3) vs DEX 20 (+3)
      // Attack roll: 20 - 3 = 17, Target: 10 + 3 = 13, 17 >= 13 = HIT
      expect(result).toBe(true);
    });

    it('should miss with guaranteed min roll', () => {
      // Mock to return 0.0, which gives roll of 1 (very likely miss)
      jest.spyOn(Math, 'random').mockReturnValue(0.0);
      
      // Best attacker vs worst defender might still miss on a 1
      const result = doesAttackHit(20, 1); // STR 20 (+3) vs DEX 1 (-3)
      // Attack roll: 1 + 3 = 4, Target: 10 - 3 = 7, 4 < 7 = MISS
      expect(result).toBe(false);
    });

    it('should handle average vs average correctly', () => {
      // Mock to return 0.5, which gives roll of 11
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      
      const result = doesAttackHit(10, 10); // STR 10 (0) vs DEX 10 (0)
      // Attack roll: 11 + 0 = 11, Target: 10 + 0 = 10, 11 >= 10 = HIT
      expect(result).toBe(true);
    });

    it('should handle edge case where attack equals target', () => {
      // Mock to return 0.45, which gives roll of 10
      jest.spyOn(Math, 'random').mockReturnValue(0.45);
      
      const result = doesAttackHit(10, 10); // STR 10 (0) vs DEX 10 (0)
      // Attack roll: 10 + 0 = 10, Target: 10 + 0 = 10, 10 >= 10 = HIT
      expect(result).toBe(true);
    });

    it('should handle strong attacker vs agile defender', () => {
      // Mock to return 0.6, which gives roll of 13
      jest.spyOn(Math, 'random').mockReturnValue(0.6);
      
      const result = doesAttackHit(18, 16); // STR 18 (+2) vs DEX 16 (+2)
      // Attack roll: 13 + 2 = 15, Target: 10 + 2 = 12, 15 >= 12 = HIT
      expect(result).toBe(true);
    });

    it('should handle weak attacker vs agile defender', () => {
      // Mock to return 0.6, which gives roll of 13
      jest.spyOn(Math, 'random').mockReturnValue(0.6);
      
      const result = doesAttackHit(6, 16); // STR 6 (-2) vs DEX 16 (+2)
      // Attack roll: 13 - 2 = 11, Target: 10 + 2 = 12, 11 < 12 = MISS
      expect(result).toBe(false);
    });
  });
});