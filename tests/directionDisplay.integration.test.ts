import { RoomDisplayService } from '../src/services/roomDisplayService';
import { UnifiedRoomDisplayService } from '../src/services/unifiedRoomDisplayService';
import { ConsoleOutputAdapter } from '../src/adapters/consoleOutputAdapter';
import { MessageFormatter } from '../src/ui/MessageFormatter';
import { Connection } from '../src/services/gameStateManager';

describe('Direction Display Integration Tests', () => {
  const mockConnections: Connection[] = [
    { id: 1, from_room_id: 1, to_room_id: 2, direction: 'west', name: 'west', game_id: 1 },
    { id: 2, from_room_id: 1, to_room_id: 3, direction: 'north', name: 'ancient doorway', game_id: 1 },
    { id: 3, from_room_id: 1, to_room_id: 4, direction: 'up', name: 'up', game_id: 1 },
    { id: 4, from_room_id: 1, to_room_id: 5, direction: 'south', name: 'south', game_id: 1 },
    { id: 5, from_room_id: 1, to_room_id: 6, direction: 'northeast', name: 'crystal passage', game_id: 1 }
  ];

  describe('RoomDisplayService', () => {
    let service: RoomDisplayService;

    beforeEach(() => {
      service = new RoomDisplayService();
    });

    test('formats exits with correct direction sorting', () => {
      const result = service.formatExits(mockConnections);
      
      // Should show: north, south, west, then alphabetical (crystal passage, up)
      expect(result).toBe('\nExits: ancient doorway (north), south, west, crystal passage (northeast), up');
    });

    test('handles empty connections', () => {
      const result = service.formatExits([]);
      expect(result).toBe('\nThere are no obvious exits.');
    });

    test('handles single connection', () => {
      const singleConnection = [mockConnections[0]]; // west
      const result = service.formatExits(singleConnection);
      expect(result).toBe('\nExits: west');
    });

    test('handles only cardinal directions', () => {
      const cardinalConnections = mockConnections.filter(c => 
        ['north', 'south', 'east', 'west'].includes(c.direction)
      );
      const result = service.formatExits(cardinalConnections);
      expect(result).toBe('\nExits: ancient doorway (north), south, west');
    });

    test('handles only non-cardinal directions', () => {
      const nonCardinalConnections = mockConnections.filter(c => 
        !['north', 'south', 'east', 'west'].includes(c.direction)
      );
      const result = service.formatExits(nonCardinalConnections);
      expect(result).toBe('\nExits: crystal passage (northeast), up');
    });
  });

  describe('UnifiedRoomDisplayService', () => {
    let service: UnifiedRoomDisplayService;

    beforeEach(() => {
      service = new UnifiedRoomDisplayService();
    });

    test('formats exit names with correct direction sorting', () => {
      // Access the private method via reflection for testing
      const formatExitNames = (service as any).formatExitNames.bind(service);
      const result = formatExitNames(mockConnections);
      
      // Should return array in sorted order
      expect(result).toEqual([
        'ancient doorway (north)',
        'south', 
        'west',
        'crystal passage (northeast)',
        'up'
      ]);
    });
  });

  describe('ConsoleOutputAdapter', () => {
    let adapter: ConsoleOutputAdapter;

    beforeEach(() => {
      adapter = new ConsoleOutputAdapter();
    });

    test('preserves exit order when given pre-sorted exit strings', () => {
      const exits = ['ancient doorway (north)', 'south', 'west', 'crystal passage (northeast)', 'up'];
      
      // Access private method for testing
      const formatExits = (adapter as any).formatExits.bind(adapter);
      const result = formatExits(exits);
      
      // ConsoleOutputAdapter should preserve the order of exits passed to it
      expect(result).toBe('\nExits: ancient doorway (north), south, west, crystal passage (northeast), up');
    });

    test('handles empty exits array', () => {
      const formatExits = (adapter as any).formatExits.bind(adapter);
      const result = formatExits([]);
      expect(result).toBe('\nThere are no obvious exits.');
    });
  });

  describe('MessageFormatter', () => {
    let formatter: MessageFormatter;

    beforeEach(() => {
      formatter = new MessageFormatter();
    });

    test('formats exits with correct sorting and styling', () => {
      const exits = ['west', 'ancient doorway (north)', 'up', 'south', 'crystal passage (northeast)'];
      const result = formatter.formatExits(exits);
      
      // Should contain sorted exits with proper formatting
      expect(result).toContain('Exits:');
      // The exact output includes ANSI color codes, but we can check that cardinal directions come first
      expect(result.indexOf('north')).toBeLessThan(result.indexOf('up'));
      expect(result.indexOf('south')).toBeLessThan(result.indexOf('up'));
      expect(result.indexOf('west')).toBeLessThan(result.indexOf('up'));
    });

    test('handles empty exits with proper styling', () => {
      const result = formatter.formatExits([]);
      expect(result).toContain('There are no obvious exits.');
    });
  });

  describe('Cross-component consistency', () => {
    test('all components produce consistent direction ordering', () => {
      const testExits = ['west', 'north', 'up', 'south', 'northeast'];
      
      // Extract the actual exit order from different components
      const roomService = new RoomDisplayService();
      const roomResult = roomService.formatExits(mockConnections);
      
      const consoleAdapter = new ConsoleOutputAdapter();
      const consoleResult = (consoleAdapter as any).formatExits(testExits);
      
      const formatter = new MessageFormatter();
      const formatterResult = formatter.formatExits(testExits);
      
      // All should prioritize cardinal directions (north, south, west) before non-cardinals (northeast, up)
      // Check that 'north' appears before 'up' in all outputs
      expect(roomResult.indexOf('north')).toBeLessThan(roomResult.indexOf('up'));
      expect(consoleResult.indexOf('north')).toBeLessThan(consoleResult.indexOf('up'));
      expect(formatterResult.indexOf('north')).toBeLessThan(formatterResult.indexOf('up'));
      
      // Check that 'south' appears before 'northeast' in all outputs
      expect(roomResult.indexOf('south')).toBeLessThan(roomResult.indexOf('northeast'));
      expect(consoleResult.indexOf('south')).toBeLessThan(consoleResult.indexOf('northeast'));
      expect(formatterResult.indexOf('south')).toBeLessThan(formatterResult.indexOf('northeast'));
    });
  });

  describe('Edge cases', () => {
    test('handles custom direction names correctly', () => {
      const customConnections: Connection[] = [
        { id: 1, from_room_id: 1, to_room_id: 2, direction: 'west', name: 'through the crystal archway', game_id: 1 },
        { id: 2, from_room_id: 1, to_room_id: 3, direction: 'north', name: 'up the golden staircase', game_id: 1 },
        { id: 3, from_room_id: 1, to_room_id: 4, direction: 'down', name: 'down the spiral staircase', game_id: 1 }
      ];

      const service = new RoomDisplayService();
      const result = service.formatExits(customConnections);
      
      // Should show cardinal directions first (north, west) then non-cardinal (down)
      expect(result).toBe('\nExits: up the golden staircase (north), through the crystal archway (west), down the spiral staircase (down)');
    });

    test('handles case sensitivity in direction names', () => {
      const mixedCaseConnections: Connection[] = [
        { id: 1, from_room_id: 1, to_room_id: 2, direction: 'WEST', name: 'WEST', game_id: 1 },
        { id: 2, from_room_id: 1, to_room_id: 3, direction: 'North', name: 'North', game_id: 1 },
        { id: 3, from_room_id: 1, to_room_id: 4, direction: 'up', name: 'up', game_id: 1 }
      ];

      const service = new RoomDisplayService();
      const result = service.formatExits(mixedCaseConnections);
      
      // Should preserve original case but sort by lowercase comparison
      expect(result).toBe('\nExits: North, WEST, up');
    });
  });
});