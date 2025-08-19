import { RoomDisplayService } from '../../src/services/roomDisplayService';
import { Room, Connection } from '../../src/services/gameStateManager';
import Database from '../../src/utils/database';
import { initializeDatabase } from '../../src/utils/initDb';

describe('RoomDisplayService', () => {
  let roomDisplayService: RoomDisplayService;
  let db: Database;
  let consoleSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Create in-memory database for testing
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);

    roomDisplayService = new RoomDisplayService(db, {
      enableDebugLogging: false
    });

    // Mock console.log and console.error
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(async () => {
    if (db && db.isConnected()) {
      await db.close();
    }
    jest.restoreAllMocks();
  });

  describe('Constructor and Configuration', () => {
    test('should create service with default options', async () => {
      const testDb = new Database(':memory:');
      await testDb.connect();
      await initializeDatabase(testDb);
      
      const service = new RoomDisplayService(testDb);
      const options = service.getOptions();
      
      expect(options.enableDebugLogging).toBe(false);
      
      await testDb.close();
    });

    test('should create service with custom options', async () => {
      const testDb = new Database(':memory:');
      await testDb.connect();
      await initializeDatabase(testDb);
      
      const service = new RoomDisplayService(testDb, { enableDebugLogging: true });
      const options = service.getOptions();
      
      expect(options.enableDebugLogging).toBe(true);
      
      await testDb.close();
    });

    test('should update options after creation', () => {
      roomDisplayService.updateOptions({ enableDebugLogging: true });
      const options = roomDisplayService.getOptions();
      
      expect(options.enableDebugLogging).toBe(true);
    });
  });

  describe('Room Display', () => {
    test('should display room with name, description and exits', async () => {
      const room: Room = {
        id: 1,
        game_id: 1,
        name: 'Crystal Chamber',
        description: 'A magnificent chamber filled with glowing crystals.'
      };

      const connections: Connection[] = [
        {
          id: 1,
          game_id: 1,
          from_room_id: 1,
          to_room_id: 2,
          direction: 'north',
          name: 'crystal archway'
        },
        {
          id: 2,
          game_id: 1,
          from_room_id: 1,
          to_room_id: 3,
          direction: 'south',
          name: 'south'
        }
      ];

      const result = await roomDisplayService.displayRoom(room, connections);

      // Verify console output in exact order
      expect(consoleSpy).toHaveBeenCalledTimes(4);
      expect(consoleSpy).toHaveBeenNthCalledWith(1, '\nCrystal Chamber');
      expect(consoleSpy).toHaveBeenNthCalledWith(2, '==============='); // 15 equals for "Crystal Chamber"
      expect(consoleSpy).toHaveBeenNthCalledWith(3, 'A magnificent chamber filled with glowing crystals.');
      expect(consoleSpy).toHaveBeenNthCalledWith(4, '\nExits: crystal archway (north), south');

      // Verify return values
      expect(result.roomName).toBe('Crystal Chamber');
      expect(result.roomDescription).toBe('A magnificent chamber filled with glowing crystals.');
      expect(result.exitsDisplay).toBe('\nExits: crystal archway (north), south');
      expect(result.hasExits).toBe(true);
    });

    test('should display room with no exits', async () => {
      const room: Room = {
        id: 1,
        game_id: 1,
        name: 'Dead End',
        description: 'A small chamber with no obvious way out.'
      };

      const connections: Connection[] = [];

      const result = await roomDisplayService.displayRoom(room, connections);

      expect(consoleSpy).toHaveBeenCalledTimes(4);
      expect(consoleSpy).toHaveBeenNthCalledWith(1, '\nDead End');
      expect(consoleSpy).toHaveBeenNthCalledWith(2, '========'); // 8 equals for "Dead End"
      expect(consoleSpy).toHaveBeenNthCalledWith(3, 'A small chamber with no obvious way out.');
      expect(consoleSpy).toHaveBeenNthCalledWith(4, '\nThere are no obvious exits.');

      expect(result.roomName).toBe('Dead End');
      expect(result.roomDescription).toBe('A small chamber with no obvious way out.');
      expect(result.exitsDisplay).toBe('\nThere are no obvious exits.');
      expect(result.hasExits).toBe(false);
    });

    test('should handle room names with special characters', async () => {
      const room: Room = {
        id: 1,
        game_id: 1,
        name: "King's Throne Room!",
        description: 'A grand throne room.'
      };

      await roomDisplayService.displayRoom(room, []);

      expect(consoleSpy).toHaveBeenNthCalledWith(1, "\nKing's Throne Room!");
      expect(consoleSpy).toHaveBeenNthCalledWith(2, '==================='); // 19 equals for "King's Throne Room!"
    });

    test('should handle very long room names', async () => {
      const longName = 'A Very Long Room Name That Goes On And On And On';
      const room: Room = {
        id: 1,
        game_id: 1,
        name: longName,
        description: 'A room with a long name.'
      };

      await roomDisplayService.displayRoom(room, []);

      expect(consoleSpy).toHaveBeenNthCalledWith(2, '='.repeat(longName.length));
    });
  });

  describe('Exit Formatting', () => {
    test('should format single exit with different name and direction', () => {
      const connections: Connection[] = [
        {
          id: 1,
          game_id: 1,
          from_room_id: 1,
          to_room_id: 2,
          direction: 'north',
          name: 'crystal doorway'
        }
      ];

      const result = roomDisplayService.formatExits(connections);
      expect(result).toBe('\nExits: crystal doorway (north)');
    });

    test('should format single exit with same name and direction', () => {
      const connections: Connection[] = [
        {
          id: 1,
          game_id: 1,
          from_room_id: 1,
          to_room_id: 2,
          direction: 'east',
          name: 'east'
        }
      ];

      const result = roomDisplayService.formatExits(connections);
      expect(result).toBe('\nExits: east');
    });

    test('should format multiple exits with mixed naming', () => {
      const connections: Connection[] = [
        {
          id: 1,
          game_id: 1,
          from_room_id: 1,
          to_room_id: 2,
          direction: 'north',
          name: 'glowing portal'
        },
        {
          id: 2,
          game_id: 1,
          from_room_id: 1,
          to_room_id: 3,
          direction: 'south',
          name: 'south'
        },
        {
          id: 3,
          game_id: 1,
          from_room_id: 1,
          to_room_id: 4,
          direction: 'west',
          name: 'wooden door'
        }
      ];

      const result = roomDisplayService.formatExits(connections);
      expect(result).toBe('\nExits: glowing portal (north), south, wooden door (west)');
    });

    test('should handle empty connections array', () => {
      const result = roomDisplayService.formatExits([]);
      expect(result).toBe('\nThere are no obvious exits.');
    });

    test('should handle null connections', () => {
      const result = roomDisplayService.formatExits(null as any);
      expect(result).toBe('\nThere are no obvious exits.');
    });

    test('should handle undefined connections', () => {
      const result = roomDisplayService.formatExits(undefined as any);
      expect(result).toBe('\nThere are no obvious exits.');
    });
  });

  describe('Error and State Messages', () => {
    test('should display no game loaded message', () => {
      roomDisplayService.displayNoGameLoaded();
      
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('No game is currently loaded.');
    });

    test('should display void state message', () => {
      roomDisplayService.displayVoidState();
      
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('You are in a void. Something went wrong!');
    });

    test('should display movement error with specific direction', () => {
      roomDisplayService.displayMovementError('northeast');
      
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith("You can't go northeast from here.");
    });

    test('should display movement error with case sensitivity', () => {
      roomDisplayService.displayMovementError('WEST');
      
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith("You can't go WEST from here.");
    });
  });

  describe('Error Handling', () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    test('should display error message without debug logging', () => {
      const error = new Error('Test error');
      
      roomDisplayService.displayError('Something went wrong', error);
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error looking around: Something went wrong');
    });

    test('should display error message with debug logging enabled', () => {
      roomDisplayService.updateOptions({ enableDebugLogging: true });
      const error = new Error('Test error');
      
      roomDisplayService.displayError('Something went wrong', error);
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenNthCalledWith(1, 'Error looking around: Something went wrong');
      expect(consoleErrorSpy).toHaveBeenNthCalledWith(2, 'Debug details:', error);
    });

    test('should display error message without error object', () => {
      roomDisplayService.displayError('General error');
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error looking around: General error');
    });

    test('should respect AI_DEBUG_LOGGING environment variable', () => {
      process.env.AI_DEBUG_LOGGING = 'true';
      
      const error = new Error('Env test error');
      roomDisplayService.displayError('Environment debug test', error);
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenNthCalledWith(2, 'Debug details:', error);
      
      delete process.env.AI_DEBUG_LOGGING;
    });
  });

  describe('Edge Cases and Input Validation', () => {
    test('should handle room with empty name', async () => {
      const room: Room = {
        id: 1,
        game_id: 1,
        name: '',
        description: 'A room with no name.'
      };

      const result = await roomDisplayService.displayRoom(room, []);

      expect(consoleSpy).toHaveBeenNthCalledWith(1, '\n');
      expect(consoleSpy).toHaveBeenNthCalledWith(2, ''); // No equals signs for empty name
      expect(result.roomName).toBe('');
    });

    test('should handle room with empty description', async () => {
      const room: Room = {
        id: 1,
        game_id: 1,
        name: 'Mystery Room',
        description: ''
      };

      const result = await roomDisplayService.displayRoom(room, []);

      expect(consoleSpy).toHaveBeenNthCalledWith(3, '');
      expect(result.roomDescription).toBe('');
    });

    test('should handle connections with empty names', () => {
      const connections: Connection[] = [
        {
          id: 1,
          game_id: 1,
          from_room_id: 1,
          to_room_id: 2,
          direction: 'north',
          name: ''
        }
      ];

      const result = roomDisplayService.formatExits(connections);
      expect(result).toBe('\nExits:  (north)'); // Empty name with direction
    });

    test('should handle connections with same empty names and directions', () => {
      const connections: Connection[] = [
        {
          id: 1,
          game_id: 1,
          from_room_id: 1,
          to_room_id: 2,
          direction: '',
          name: ''
        }
      ];

      const result = roomDisplayService.formatExits(connections);
      expect(result).toBe('\nExits: '); // Both empty, shows just empty string
    });
  });

  describe('Region Display', () => {
    test('should display room with region name prominently', async () => {
      // Create region first
      const regionResult = await db.run(
        'INSERT INTO regions (game_id, name, type, description) VALUES (?, ?, ?, ?)',
        [1, 'Elegant Mansion', 'mansion', 'A grand estate']
      );
      
      const room: Room = {
        id: 1,
        game_id: 1,
        name: 'Grand Hall',
        description: 'A magnificent entrance hall.',
        region_id: regionResult.lastID as number,
        region_distance: 0
      };

      const result = await roomDisplayService.displayRoom(room, []);

      // Verify the specific console calls we expect for room display
      expect(consoleSpy).toHaveBeenCalledWith('\nGrand Hall');
      expect(consoleSpy).toHaveBeenCalledWith('==========');
      expect(consoleSpy).toHaveBeenCalledWith('A magnificent entrance hall.');
      expect(consoleSpy).toHaveBeenCalledWith('Region: Elegant Mansion [CENTER]');
      expect(consoleSpy).toHaveBeenCalledWith('\nThere are no obvious exits.');

      expect(result.regionInfo).toBe('Region: Elegant Mansion [CENTER]');
    });

    test('should display room with region distance from center', async () => {
      // Create region first
      const regionResult = await db.run(
        'INSERT INTO regions (game_id, name, type, description) VALUES (?, ?, ?, ?)',
        [1, 'Mystical Forest', 'forest', 'Ancient woodland']
      );
      
      const room: Room = {
        id: 1,
        game_id: 1,
        name: 'Forest Path',
        description: 'A winding path through trees.',
        region_id: regionResult.lastID as number,
        region_distance: 3
      };

      const result = await roomDisplayService.displayRoom(room, []);

      expect(consoleSpy).toHaveBeenCalledWith('Region: Mystical Forest [3 steps from center]');
      expect(result.regionInfo).toBe('Region: Mystical Forest [3 steps from center]');
    });

    test('should fall back to region type when no region name provided', async () => {
      // Create region without name
      const regionResult = await db.run(
        'INSERT INTO regions (game_id, name, type, description) VALUES (?, ?, ?, ?)',
        [1, null, 'cave', 'Dark underground chambers']
      );
      
      const room: Room = {
        id: 1,
        game_id: 1,
        name: 'Cave Entrance',
        description: 'A dark cavern opening.',
        region_id: regionResult.lastID as number,
        region_distance: 1
      };

      const result = await roomDisplayService.displayRoom(room, []);

      expect(consoleSpy).toHaveBeenCalledWith('Region: cave [1 steps from center]');
      expect(result.regionInfo).toBe('Region: cave [1 steps from center]');
    });

    test('should not display region info when room has no region', async () => {
      const room: Room = {
        id: 1,
        game_id: 1,
        name: 'Isolated Room',
        description: 'A room with no regional connection.'
      };

      const result = await roomDisplayService.displayRoom(room, []);

      // Should only display room info and exits, no region line
      expect(consoleSpy).toHaveBeenCalledWith('\nIsolated Room');
      expect(consoleSpy).toHaveBeenCalledWith('=============');
      expect(consoleSpy).toHaveBeenCalledWith('A room with no regional connection.');
      expect(consoleSpy).toHaveBeenCalledWith('\nThere are no obvious exits.');

      expect(result.regionInfo).toBeUndefined();
    });

    test('should include debug information when debug logging enabled', async () => {
      roomDisplayService.updateOptions({ enableDebugLogging: true });
      
      // Create region first
      const regionResult = await db.run(
        'INSERT INTO regions (game_id, name, type, description) VALUES (?, ?, ?, ?)',
        [1, 'Test Region', 'tower', 'A tall spire']
      );
      
      const room: Room = {
        id: 1,
        game_id: 1,
        name: 'Tower Base',
        description: 'The ground floor of a tower.',
        region_id: regionResult.lastID as number,
        region_distance: 0
      };

      const result = await roomDisplayService.displayRoom(room, []);

      // Check that debug info is included (ID will vary based on test order)
      expect(result.regionInfo).toContain('Region: Test Region [CENTER]');
      expect(result.regionInfo).toContain('[DEBUG] Region ID:');
      expect(result.regionInfo).toContain('Type: tower, Distance: 0');
      expect(result.regionInfo).toContain('[DEBUG] Description: A tall spire');
    });
  });

  describe('Integration Tests', () => {
    test('should maintain consistent formatting across multiple room displays', async () => {
      const rooms = [
        {
          room: { id: 1, game_id: 1, name: 'Room A', description: 'First room' },
          connections: [{ id: 1, game_id: 1, from_room_id: 1, to_room_id: 2, direction: 'north', name: 'door' }]
        },
        {
          room: { id: 2, game_id: 1, name: 'Room B', description: 'Second room' },
          connections: []
        }
      ];

      const results = await Promise.all(rooms.map(({ room, connections }) => 
        roomDisplayService.displayRoom(room as Room, connections as Connection[])
      ));

      // Verify all results have consistent structure
      results.forEach(result => {
        expect(result).toHaveProperty('roomName');
        expect(result).toHaveProperty('roomDescription');
        expect(result).toHaveProperty('exitsDisplay');
        expect(result).toHaveProperty('hasExits');
        expect(typeof result.hasExits).toBe('boolean');
      });

      expect(results[0].hasExits).toBe(true);
      expect(results[1].hasExits).toBe(false);
    });
  });
});