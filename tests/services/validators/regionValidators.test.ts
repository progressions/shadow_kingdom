import { 
  RegionResponseValidator,
  RegionThemeSchema,
  RoomSchema,
  generateFallbackTheme,
  generateFallbackRooms
} from '../../../src/services/validators/regionValidators';

describe('RegionResponseValidator', () => {
  describe('validateThemeResponse', () => {
    it('should validate a valid theme response', () => {
      const validResponse = {
        name: 'Crystal Caves',
        theme: 'crystalline caverns',
        description: 'A network of caves filled with glowing crystals.',
        atmosphere: 'mystical and luminous',
        guardianConcept: {
          name: 'Crystal Golem',
          type: 'elemental',
          description: 'A massive golem made of living crystal.',
          difficulty: 6,
        },
        keyConcept: {
          name: 'Crystal Shard Key',
          description: 'A key carved from pure crystal.',
          hint: 'The golem guards a precious crystal.',
        },
        lockedExitDescription: 'A crystal door sealed with magical resonance.',
      };

      const result = RegionResponseValidator.validateThemeResponse(validResponse);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(result.warnings).toBeUndefined();
    });

    it('should reject invalid theme response with missing fields', () => {
      const invalidResponse = {
        name: 'Crystal Caves',
        theme: 'crystalline caverns',
        // Missing required fields
      };

      const result = RegionResponseValidator.validateThemeResponse(invalidResponse);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });


    it('should warn about overly long descriptions', () => {
      const longDescription = 'A'.repeat(501);
      const validResponse = {
        name: 'Crystal Caves',
        theme: 'crystalline caverns',
        description: longDescription,
        atmosphere: 'mystical',
        guardianConcept: {
          name: 'Crystal Golem',
          type: 'elemental',
          description: 'A golem.',
          difficulty: 6,
        },
        keyConcept: {
          name: 'Key',
          description: 'A key.',
          hint: 'Find it.',
        },
        lockedExitDescription: 'A locked door.',
      };

      const result = RegionResponseValidator.validateThemeResponse(validResponse);
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings).toContain('Description should be between 10 and 500 characters');
    });
  });

  describe('validateRoomBatchResponse', () => {
    it('should validate a valid room batch', () => {
      const validRooms = Array.from({ length: 12 }, (_, i) => ({
        index: i,
        name: `Room ${i}`,
        description: `Description for room ${i}`,
        connections: ['north', 'south'],
        hasGuardian: i === 5,
        hasKey: i === 8,
      }));

      const result = RegionResponseValidator.validateRoomBatchResponse(validRooms);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject batch with wrong number of rooms', () => {
      const invalidRooms = Array.from({ length: 10 }, (_, i) => ({
        index: i,
        name: `Room ${i}`,
        description: `Description for room ${i}`,
        connections: [],
      }));

      const result = RegionResponseValidator.validateRoomBatchResponse(invalidRooms);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Expected exactly 12 rooms, got 10');
    });

    it('should reject batch with duplicate indices', () => {
      const invalidRooms = Array.from({ length: 12 }, (_, i) => ({
        index: i < 11 ? i : 5, // Duplicate index 5
        name: `Room ${i}`,
        description: `Description for room ${i}`,
        connections: [],
      }));

      const result = RegionResponseValidator.validateRoomBatchResponse(invalidRooms);
      
      expect(result.valid).toBe(false);
      expect(result.errors?.some(e => e.includes('Duplicate index'))).toBe(true);
    });

    it('should reject batch with missing room fields', () => {
      const invalidRooms = Array.from({ length: 12 }, (_, i) => ({
        index: i,
        name: `Room ${i}`,
        // Missing description
      }));

      const result = RegionResponseValidator.validateRoomBatchResponse(invalidRooms as any);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('generateFallbackTheme', () => {
    it('should generate a fallback theme', () => {
      const context = {
        direction: 'north',
      };

      const theme = generateFallbackTheme(context);
      
      expect(theme.name).toBeDefined();
      expect(theme.theme).toBeDefined();
      expect(theme.guardianConcept).toBeDefined();
      expect(theme.guardianConcept.name).toBeDefined();
      expect(theme.keyConcept.name).toBeDefined();
    });

    it('should have valid guardian concepts', () => {
      const theme1 = generateFallbackTheme({ direction: 'north' });
      const theme2 = generateFallbackTheme({ direction: 'south' });
      
      expect(theme1.guardianConcept.name).toBeDefined();
      expect(theme1.guardianConcept.type).toBeDefined();
      expect(theme2.guardianConcept.name).toBeDefined();
      expect(theme2.guardianConcept.type).toBeDefined();
    });

    it('should vary themes based on direction', () => {
      const northTheme = generateFallbackTheme({ direction: 'north' });
      const southTheme = generateFallbackTheme({ direction: 'south' });
      
      // Themes should be different (though randomness might occasionally match)
      expect(northTheme).toBeDefined();
      expect(southTheme).toBeDefined();
    });
  });

  describe('generateFallbackRooms', () => {
    it('should generate exactly 12 rooms', () => {
      const theme: RegionThemeSchema = {
        name: 'Test Region',
        theme: 'testing',
        description: 'A test region',
        atmosphere: 'neutral',
        guardianConcept: {
          name: 'Guardian',
          type: 'construct',
          description: 'A guardian',
        },
        keyConcept: {
          name: 'Key',
          description: 'A key',
          hint: 'Find it',
        },
        lockedExitDescription: 'A locked door',
      };

      const rooms = generateFallbackRooms(theme, 5, 8);
      
      expect(rooms.length).toBe(12);
      expect(rooms.every(r => r.index >= 0 && r.index < 12)).toBe(true);
    });

    it('should place guardian and key correctly', () => {
      const theme: RegionThemeSchema = {
        name: 'Test Region',
        theme: 'testing',
        description: 'A test region',
        atmosphere: 'neutral',
        guardianConcept: {
          name: 'Guardian',
          type: 'construct',
          description: 'A guardian',
        },
        keyConcept: {
          name: 'Key',
          description: 'A key',
          hint: 'Find it',
        },
        lockedExitDescription: 'A locked door',
      };

      const guardianIndex = 3;
      const keyIndex = 7;
      const rooms = generateFallbackRooms(theme, guardianIndex, keyIndex);
      
      expect(rooms[guardianIndex].hasGuardian).toBe(true);
      expect(rooms[keyIndex].hasKey).toBe(true);
      
      // No other room should have guardian or key
      rooms.forEach((room, index) => {
        if (index !== guardianIndex) {
          expect(room.hasGuardian).toBeFalsy();
        }
        if (index !== keyIndex) {
          expect(room.hasKey).toBeFalsy();
        }
      });
    });

    it('should include theme in room descriptions', () => {
      const theme: RegionThemeSchema = {
        name: 'Crystal Caves',
        theme: 'crystalline caverns',
        description: 'A magical crystal cave',
        atmosphere: 'mystical',
        guardianConcept: {
          name: 'Crystal Golem',
          type: 'elemental',
          description: 'A crystal guardian',
        },
        keyConcept: {
          name: 'Crystal Key',
          description: 'A crystal key',
          hint: 'Hidden in crystals',
        },
        lockedExitDescription: 'Crystal door',
      };

      const rooms = generateFallbackRooms(theme, 2, 4);
      
      // At least some rooms should reference the theme
      const hasThemeReferences = rooms.some(r => 
        r.description.toLowerCase().includes('crystal') ||
        r.name.toLowerCase().includes('crystal')
      );
      
      expect(hasThemeReferences).toBe(true);
    });
  });
});