import { sortDirections, isCardinalDirection, getDirectionPriority } from '../src/utils/directionSorter';

describe('Direction Sorter', () => {
  describe('sortDirections', () => {
    test('handles empty array', () => {
      expect(sortDirections([])).toEqual([]);
    });

    test('handles null/undefined input', () => {
      expect(sortDirections(null as any)).toEqual([]);
      expect(sortDirections(undefined as any)).toEqual([]);
    });

    test('handles single direction', () => {
      expect(sortDirections(['north'])).toEqual(['north']);
      expect(sortDirections(['up'])).toEqual(['up']);
    });

    test('sorts cardinal directions in correct order', () => {
      expect(sortDirections(['west', 'east', 'south', 'north'])).toEqual(['north', 'south', 'east', 'west']);
      expect(sortDirections(['south', 'north'])).toEqual(['north', 'south']);
      expect(sortDirections(['west', 'east'])).toEqual(['east', 'west']);
    });

    test('sorts non-cardinal directions alphabetically', () => {
      expect(sortDirections(['up', 'down', 'northeast'])).toEqual(['down', 'northeast', 'up']);
      expect(sortDirections(['southeast', 'northwest', 'southwest'])).toEqual(['northwest', 'southeast', 'southwest']);
    });

    test('places cardinal directions before non-cardinal directions', () => {
      expect(sortDirections(['up', 'north', 'down', 'south'])).toEqual(['north', 'south', 'down', 'up']);
      expect(sortDirections(['northeast', 'west', 'up', 'east'])).toEqual(['east', 'west', 'northeast', 'up']);
    });

    test('handles mixed cardinal and non-cardinal directions', () => {
      expect(sortDirections(['west', 'north', 'up', 'south', 'northeast'])).toEqual(['north', 'south', 'west', 'northeast', 'up']);
      expect(sortDirections(['down', 'east', 'through the archway', 'north'])).toEqual(['north', 'east', 'down', 'through the archway']);
    });

    test('handles case insensitive sorting', () => {
      expect(sortDirections(['NORTH', 'south', 'East', 'WEST'])).toEqual(['NORTH', 'south', 'East', 'WEST']);
      expect(sortDirections(['UP', 'down', 'Northeast'])).toEqual(['down', 'Northeast', 'UP']);
    });

    test('preserves original case in output', () => {
      const input = ['West', 'NORTH', 'up', 'South'];
      const result = sortDirections(input);
      expect(result).toEqual(['NORTH', 'South', 'West', 'up']);
      expect(result[0]).toBe('NORTH'); // Exact case preservation
      expect(result[1]).toBe('South'); // Exact case preservation
    });

    test('handles custom direction names', () => {
      expect(sortDirections(['through the crystal archway', 'north', 'down the spiral staircase', 'east']))
        .toEqual(['north', 'east', 'down the spiral staircase', 'through the crystal archway']);
    });

    test('handles direction aliases and variations', () => {
      // Note: This test assumes we want to treat 'n' as a separate direction, not as 'north'
      // If aliases should be treated as cardinals, this would need to be implemented separately
      expect(sortDirections(['n', 'north', 's', 'south'])).toEqual(['north', 'south', 'n', 's']);
    });

    test('handles complex real-world scenario', () => {
      const directions = [
        'west',
        'through the enchanted doorway',
        'north',
        'up the winding staircase',
        'south',
        'northeast',
        'down',
        'east'
      ];
      const expected = [
        'north',
        'south',
        'east',
        'west',
        'down',
        'northeast',
        'through the enchanted doorway',
        'up the winding staircase'
      ];
      expect(sortDirections(directions)).toEqual(expected);
    });
  });

  describe('isCardinalDirection', () => {
    test('identifies cardinal directions', () => {
      expect(isCardinalDirection('north')).toBe(true);
      expect(isCardinalDirection('south')).toBe(true);
      expect(isCardinalDirection('east')).toBe(true);
      expect(isCardinalDirection('west')).toBe(true);
    });

    test('handles case insensitive cardinal directions', () => {
      expect(isCardinalDirection('NORTH')).toBe(true);
      expect(isCardinalDirection('South')).toBe(true);
      expect(isCardinalDirection('EAST')).toBe(true);
      expect(isCardinalDirection('West')).toBe(true);
    });

    test('identifies non-cardinal directions', () => {
      expect(isCardinalDirection('up')).toBe(false);
      expect(isCardinalDirection('down')).toBe(false);
      expect(isCardinalDirection('northeast')).toBe(false);
      expect(isCardinalDirection('northwest')).toBe(false);
      expect(isCardinalDirection('through the archway')).toBe(false);
    });

    test('handles empty and invalid input', () => {
      expect(isCardinalDirection('')).toBe(false);
      expect(isCardinalDirection(' ')).toBe(false);
      expect(isCardinalDirection('invalid')).toBe(false);
    });
  });

  describe('getDirectionPriority', () => {
    test('returns correct priorities for cardinal directions', () => {
      expect(getDirectionPriority('north')).toBe(1);
      expect(getDirectionPriority('south')).toBe(2);
      expect(getDirectionPriority('east')).toBe(3);
      expect(getDirectionPriority('west')).toBe(4);
    });

    test('handles case insensitive cardinal directions', () => {
      expect(getDirectionPriority('NORTH')).toBe(1);
      expect(getDirectionPriority('South')).toBe(2);
      expect(getDirectionPriority('EAST')).toBe(3);
      expect(getDirectionPriority('West')).toBe(4);
    });

    test('returns 999 for non-cardinal directions', () => {
      expect(getDirectionPriority('up')).toBe(999);
      expect(getDirectionPriority('down')).toBe(999);
      expect(getDirectionPriority('northeast')).toBe(999);
      expect(getDirectionPriority('through the portal')).toBe(999);
    });

    test('handles empty and invalid input', () => {
      expect(getDirectionPriority('')).toBe(999);
      expect(getDirectionPriority('invalid')).toBe(999);
    });
  });
});