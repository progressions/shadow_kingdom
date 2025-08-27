import { RegionPromptTemplates, RegionThemePromptContext } from '../../../src/services/prompts/regionPrompts';

describe('RegionPromptTemplates', () => {
  describe('getThemeSystemPrompt', () => {
    it('should return a valid system prompt for theme generation', () => {
      const prompt = RegionPromptTemplates.getThemeSystemPrompt();
      
      expect(prompt).toContain('region');
      expect(prompt).toContain('theme');
      expect(prompt).toContain('JSON');
      expect(prompt.length).toBeGreaterThan(100);
    });
  });

  describe('getThemeUserPrompt', () => {
    it('should generate prompt for first region', () => {
      const context: RegionThemePromptContext = {
        direction: 'north',
        worldSeed: 'test-seed',
        existingRegions: [],
      };

      const prompt = RegionPromptTemplates.getThemeUserPrompt(context);
      
      expect(prompt).toContain('Generate');
      expect(prompt).toContain('FIRST region');
      expect(prompt).toContain('journey begins');
    });

    it('should include previous region context when available', () => {
      const context: RegionThemePromptContext = {
        previousRegion: {
          name: 'Crystal Caves',
          theme: 'crystalline'
        },
        direction: 'east',
        worldSeed: 'test-seed',
        existingRegions: ['crystalline', 'haunted'],
      };

      const prompt = RegionPromptTemplates.getThemeUserPrompt(context);
      
      expect(prompt).toContain('Crystal Caves');
      expect(prompt).toContain('crystalline');
      expect(prompt.toUpperCase()).toContain('EAST');
    });

    it('should handle all cardinal directions', () => {
      const directions = ['north', 'south', 'east', 'west'];
      
      directions.forEach(direction => {
        const context: RegionThemePromptContext = {
          previousRegion: {
            name: 'Starting Castle',
            theme: 'medieval fortress'
          },
          direction,
          worldSeed: 'test-seed',
          existingRegions: [],
        };

        const prompt = RegionPromptTemplates.getThemeUserPrompt(context);
        expect(prompt.toUpperCase()).toContain(direction.toUpperCase());
      });
    });
  });

  describe('getRoomBatchSystemPrompt', () => {
    it('should return a valid system prompt for room generation', () => {
      const prompt = RegionPromptTemplates.getRoomBatchSystemPrompt();
      
      expect(prompt).toContain('room');
      expect(prompt).toContain('12');
      expect(prompt).toContain('JSON');
      expect(prompt.length).toBeGreaterThan(100);
    });
  });

  describe('getRoomBatchUserPrompt', () => {
    it('should generate prompt with guardian and key placement', () => {
      const theme = {
        name: 'Haunted Manor',
        theme: 'gothic mansion',
        description: 'An abandoned manor filled with spirits',
        atmosphere: 'dark and foreboding',
        guardianConcept: {
          name: 'Lord Spectre',
          type: 'undead',
          description: 'The ghostly lord',
          difficulty: 7,
        },
        keyConcept: {
          name: 'Spectral Key',
          description: 'A translucent key',
          hint: 'The lord holds all keys',
        },
        lockedExitDescription: 'A door bound by chains',
      };

      const prompt = RegionPromptTemplates.getRoomBatchUserPrompt(
        theme,
        5, // guardian room
        8, // key room
        'south',
        'north'
      );
      
      expect(prompt).toContain('Haunted Manor');
      expect(prompt).toContain('gothic mansion');
      expect(prompt).toContain('Lord Spectre');
      expect(prompt).toContain('Spectral Key');
      expect(prompt).toContain('room 5');
      expect(prompt).toContain('room 8');
    });

    it('should handle different entrance and exit directions', () => {
      const theme = {
        name: 'Test Region',
        theme: 'testing',
        description: 'A test region',
        atmosphere: 'neutral',
        guardianConcept: {
          name: 'Guardian',
          type: 'construct',
          description: 'A guardian',
          difficulty: 5,
        },
        keyConcept: {
          name: 'Key',
          description: 'A key',
          hint: 'Find the key',
        },
        lockedExitDescription: 'A locked door',
      };

      const directions = [
        { entrance: 'north', exit: 'south' },
        { entrance: 'east', exit: 'west' },
        { entrance: 'south', exit: 'north' },
        { entrance: 'west', exit: 'east' },
      ];

      directions.forEach(({ entrance, exit }) => {
        const prompt = RegionPromptTemplates.getRoomBatchUserPrompt(
          theme, 3, 7, entrance, exit
        );
        
        expect(prompt).toContain(entrance);
        expect(prompt).toContain(exit);
      });
    });
  });
});