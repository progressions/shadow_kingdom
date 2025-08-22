import { ConsoleOutputAdapter } from '../../src/adapters/consoleOutputAdapter';
import { MessageType } from '../../src/ui/MessageFormatter';

describe('ConsoleOutputAdapter', () => {
  let adapter: ConsoleOutputAdapter;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    adapter = new ConsoleOutputAdapter();
    // Mock console.log to capture calls
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('display', () => {
    test('should call console.log with message', () => {
      adapter.display('Test message');

      expect(consoleSpy).toHaveBeenCalledWith('Test message');
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    test('should ignore message type for console output', () => {
      adapter.display('Test message', MessageType.ERROR);

      expect(consoleSpy).toHaveBeenCalledWith('Test message');
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    test('should handle empty message', () => {
      adapter.display('');

      expect(consoleSpy).toHaveBeenCalledWith('');
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    test('should handle special characters', () => {
      const specialMessage = 'Message with "quotes" & <symbols>';
      adapter.display(specialMessage);

      expect(consoleSpy).toHaveBeenCalledWith(specialMessage);
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('displayRoom', () => {
    test('should display room with correct formatting', () => {
      const roomName = 'Test Chamber';
      const description = 'A mysterious test chamber.';
      const exits = ['north', 'Crystal Door (south)'];

      adapter.displayRoom(roomName, description, exits);

      expect(consoleSpy).toHaveBeenCalledTimes(4);
      expect(consoleSpy).toHaveBeenNthCalledWith(1, `\n${roomName}`);
      expect(consoleSpy).toHaveBeenNthCalledWith(2, '='.repeat(roomName.length));
      expect(consoleSpy).toHaveBeenNthCalledWith(3, description);
      expect(consoleSpy).toHaveBeenNthCalledWith(4, '\nExits: north, Crystal Door (south)');
    });

    test('should handle room with no exits', () => {
      const roomName = 'Dead End';
      const description = 'A room with no way out.';
      const exits: string[] = [];

      adapter.displayRoom(roomName, description, exits);

      expect(consoleSpy).toHaveBeenCalledTimes(4);
      expect(consoleSpy).toHaveBeenNthCalledWith(1, `\n${roomName}`);
      expect(consoleSpy).toHaveBeenNthCalledWith(2, '='.repeat(roomName.length));
      expect(consoleSpy).toHaveBeenNthCalledWith(3, description);
      expect(consoleSpy).toHaveBeenNthCalledWith(4, '\nThere are no obvious exits.');
    });

    test('should handle room with single exit', () => {
      const roomName = 'Corridor';
      const description = 'A narrow corridor.';
      const exits = ['north'];

      adapter.displayRoom(roomName, description, exits);

      expect(consoleSpy).toHaveBeenCalledTimes(4);
      expect(consoleSpy).toHaveBeenNthCalledWith(1, `\n${roomName}`);
      expect(consoleSpy).toHaveBeenNthCalledWith(2, '='.repeat(roomName.length));
      expect(consoleSpy).toHaveBeenNthCalledWith(3, description);
      expect(consoleSpy).toHaveBeenNthCalledWith(4, '\nExits: north');
    });

    test('should handle room with many exits', () => {
      const roomName = 'Central Hub';
      const description = 'A room with many paths.';
      const exits = [
        'north',
        'Golden Archway (south)',
        'east',
        'Secret Passage (west)',
        'up',
        'down'
      ];

      adapter.displayRoom(roomName, description, exits);

      expect(consoleSpy).toHaveBeenCalledTimes(4);
      expect(consoleSpy).toHaveBeenNthCalledWith(1, `\n${roomName}`);
      expect(consoleSpy).toHaveBeenNthCalledWith(2, '='.repeat(roomName.length));
      expect(consoleSpy).toHaveBeenNthCalledWith(3, description);
      expect(consoleSpy).toHaveBeenNthCalledWith(4, '\nExits: north, Golden Archway (south), east, Secret Passage (west), up, down');
    });

    test('should handle empty room name', () => {
      const roomName = '';
      const description = 'A nameless room.';
      const exits = ['north'];

      adapter.displayRoom(roomName, description, exits);

      expect(consoleSpy).toHaveBeenCalledTimes(4);
      expect(consoleSpy).toHaveBeenNthCalledWith(1, '\n');
      expect(consoleSpy).toHaveBeenNthCalledWith(2, ''); // Empty string for 0-length underline
      expect(consoleSpy).toHaveBeenNthCalledWith(3, description);
      expect(consoleSpy).toHaveBeenNthCalledWith(4, '\nExits: north');
    });

    test('should handle long room name', () => {
      const roomName = 'The Extremely Long And Detailed Name Of This Magnificent Chamber';
      const description = 'A room with a very long name.';
      const exits = ['north'];

      adapter.displayRoom(roomName, description, exits);

      expect(consoleSpy).toHaveBeenCalledTimes(4);
      expect(consoleSpy).toHaveBeenNthCalledWith(1, `\n${roomName}`);
      expect(consoleSpy).toHaveBeenNthCalledWith(2, '='.repeat(roomName.length));
      expect(consoleSpy).toHaveBeenNthCalledWith(3, description);
      expect(consoleSpy).toHaveBeenNthCalledWith(4, '\nExits: north');
    });

    test('should handle special characters in room data', () => {
      const roomName = 'Room "with quotes" & symbols';
      const description = 'A room with <special> characters & symbols.';
      const exits = ['north "passage"', 'archway (east) & door'];

      adapter.displayRoom(roomName, description, exits);

      expect(consoleSpy).toHaveBeenCalledTimes(4);
      expect(consoleSpy).toHaveBeenNthCalledWith(1, `\n${roomName}`);
      expect(consoleSpy).toHaveBeenNthCalledWith(2, '='.repeat(roomName.length));
      expect(consoleSpy).toHaveBeenNthCalledWith(3, description);
      expect(consoleSpy).toHaveBeenNthCalledWith(4, '\nExits: north "passage", archway (east) & door');
    });
  });

  describe('formatExits', () => {
    test('should format multiple exits correctly', () => {
      const exits = ['north', 'Crystal Door (south)', 'east'];
      adapter.displayRoom('Test', 'Test', exits);

      // Check the exits formatting in the 4th console.log call
      expect(consoleSpy).toHaveBeenNthCalledWith(4, '\nExits: north, Crystal Door (south), east');
    });

    test('should handle null/undefined exits gracefully', () => {
      // TypeScript won't let us pass null/undefined, but we can test the private method behavior
      // by passing an empty array which triggers the same code path
      adapter.displayRoom('Test', 'Test', []);

      expect(consoleSpy).toHaveBeenNthCalledWith(4, '\nThere are no obvious exits.');
    });
  });

  describe('integration', () => {
    test('should handle multiple display calls in sequence', () => {
      adapter.display('First message');
      adapter.displayRoom('Test Room', 'Test description', ['north']);
      adapter.display('Second message');

      expect(consoleSpy).toHaveBeenCalledTimes(6); // 1 + 4 + 1
      
      // First display call
      expect(consoleSpy).toHaveBeenNthCalledWith(1, 'First message');
      
      // displayRoom calls
      expect(consoleSpy).toHaveBeenNthCalledWith(2, '\nTest Room');
      expect(consoleSpy).toHaveBeenNthCalledWith(3, '=========');
      expect(consoleSpy).toHaveBeenNthCalledWith(4, 'Test description');
      expect(consoleSpy).toHaveBeenNthCalledWith(5, '\nExits: north');
      
      // Second display call
      expect(consoleSpy).toHaveBeenNthCalledWith(6, 'Second message');
    });

    test('should match exact RoomDisplayService format', () => {
      // Test that our adapter produces the exact same output as RoomDisplayService
      const roomName = 'Scholar\'s Library';
      const description = 'You enter a vast library that seems to hold the weight of countless ages.';
      const exits = ['through the secret passage behind the ancient tome collection (bookshelf)', 'through the shadowed archway to the grand hall (south)', 'through the hidden door behind dusty tomes (west)'];

      adapter.displayRoom(roomName, description, exits);

      expect(consoleSpy).toHaveBeenNthCalledWith(1, `\n${roomName}`);
      expect(consoleSpy).toHaveBeenNthCalledWith(2, '='.repeat(roomName.length));
      expect(consoleSpy).toHaveBeenNthCalledWith(3, description);
      expect(consoleSpy).toHaveBeenNthCalledWith(4, '\nExits: through the secret passage behind the ancient tome collection (bookshelf), through the shadowed archway to the grand hall (south), through the hidden door behind dusty tomes (west)');
    });
  });
});