import { TUIOutputAdapter } from '../../src/adapters/tuiOutputAdapter';
import { TUIInterface } from '../../src/ui/TUIInterface';
import { MessageType } from '../../src/ui/MessageFormatter';

// Mock TUI interface
class MockTUIInterface implements Partial<TUIInterface> {
  public displayCalls: Array<{ message: string; type?: MessageType }> = [];
  public displayRoomCalls: Array<{ roomName: string; description: string; exits: string[] }> = [];

  display(message: string, type?: MessageType): void {
    this.displayCalls.push({ message, type });
  }

  displayRoom(roomName: string, description: string, exits: string[]): void {
    this.displayRoomCalls.push({ roomName, description, exits });
  }

  reset(): void {
    this.displayCalls = [];
    this.displayRoomCalls = [];
  }

  // Required TUIInterface methods (not used in tests)
  initialize = jest.fn();
  displayLines = jest.fn();
  getInput = jest.fn();
  updateStatus = jest.fn();
  setStatus = jest.fn();
  clear = jest.fn();
  destroy = jest.fn();
  setPrompt = jest.fn();
  showWelcome = jest.fn();
  showError = jest.fn();
  showAIProgress = jest.fn();
}

describe('TUIOutputAdapter', () => {
  let adapter: TUIOutputAdapter;
  let mockTUI: MockTUIInterface;

  beforeEach(() => {
    mockTUI = new MockTUIInterface();
    adapter = new TUIOutputAdapter(mockTUI as TUIInterface);
  });

  describe('display', () => {
    test('should call TUI display with message and type', () => {
      adapter.display('Test message', MessageType.SYSTEM);

      expect(mockTUI.displayCalls).toHaveLength(1);
      expect(mockTUI.displayCalls[0]).toEqual({
        message: 'Test message',
        type: MessageType.SYSTEM
      });
    });

    test('should call TUI display with default NORMAL type when no type provided', () => {
      adapter.display('Test message');

      expect(mockTUI.displayCalls).toHaveLength(1);
      expect(mockTUI.displayCalls[0]).toEqual({
        message: 'Test message',
        type: MessageType.NORMAL
      });
    });

    test('should handle empty message', () => {
      adapter.display('');

      expect(mockTUI.displayCalls).toHaveLength(1);
      expect(mockTUI.displayCalls[0]).toEqual({
        message: '',
        type: MessageType.NORMAL
      });
    });

    test('should handle different message types', () => {
      const testCases = [
        { message: 'Error message', type: MessageType.ERROR },
        { message: 'System message', type: MessageType.SYSTEM },
        { message: 'Room title', type: MessageType.ROOM_TITLE },
        { message: 'Room description', type: MessageType.ROOM_DESCRIPTION },
        { message: 'Exits info', type: MessageType.EXITS }
      ];

      testCases.forEach(({ message, type }) => {
        mockTUI.reset();
        adapter.display(message, type);

        expect(mockTUI.displayCalls).toHaveLength(1);
        expect(mockTUI.displayCalls[0]).toEqual({ message, type });
      });
    });
  });

  describe('displayRoom', () => {
    test('should call TUI displayRoom with correct parameters', () => {
      const roomName = 'Test Chamber';
      const description = 'A mysterious test chamber.';
      const exits = ['north', 'Crystal Door (south)', 'east'];

      adapter.displayRoom(roomName, description, exits);

      expect(mockTUI.displayRoomCalls).toHaveLength(1);
      expect(mockTUI.displayRoomCalls[0]).toEqual({
        roomName,
        description,
        exits
      });
    });

    test('should handle empty room data', () => {
      adapter.displayRoom('', '', []);

      expect(mockTUI.displayRoomCalls).toHaveLength(1);
      expect(mockTUI.displayRoomCalls[0]).toEqual({
        roomName: '',
        description: '',
        exits: []
      });
    });

    test('should handle room with no exits', () => {
      const roomName = 'Dead End';
      const description = 'A room with no way out.';
      const exits: string[] = [];

      adapter.displayRoom(roomName, description, exits);

      expect(mockTUI.displayRoomCalls).toHaveLength(1);
      expect(mockTUI.displayRoomCalls[0]).toEqual({
        roomName,
        description,
        exits
      });
    });

    test('should handle room with many exits', () => {
      const roomName = 'Central Hub';
      const description = 'A room with many paths.';
      const exits = [
        'north',
        'Golden Archway (south)',
        'east',
        'Secret Passage (west)',
        'Spiral Staircase (up)',
        'Trapdoor (down)'
      ];

      adapter.displayRoom(roomName, description, exits);

      expect(mockTUI.displayRoomCalls).toHaveLength(1);
      expect(mockTUI.displayRoomCalls[0]).toEqual({
        roomName,
        description,
        exits
      });
    });

    test('should handle special characters in room data', () => {
      const roomName = 'Room "with quotes" & symbols';
      const description = 'A room with <special> characters & symbols.';
      const exits = ['north "passage"', 'archway (east) & door'];

      adapter.displayRoom(roomName, description, exits);

      expect(mockTUI.displayRoomCalls).toHaveLength(1);
      expect(mockTUI.displayRoomCalls[0]).toEqual({
        roomName,
        description,
        exits
      });
    });
  });

  describe('integration', () => {
    test('should handle multiple display calls in sequence', () => {
      adapter.display('First message', MessageType.SYSTEM);
      adapter.displayRoom('Test Room', 'Test description', ['north']);
      adapter.display('Second message', MessageType.NORMAL);

      expect(mockTUI.displayCalls).toHaveLength(2);
      expect(mockTUI.displayRoomCalls).toHaveLength(1);

      expect(mockTUI.displayCalls[0]).toEqual({
        message: 'First message',
        type: MessageType.SYSTEM
      });

      expect(mockTUI.displayRoomCalls[0]).toEqual({
        roomName: 'Test Room',
        description: 'Test description',
        exits: ['north']
      });

      expect(mockTUI.displayCalls[1]).toEqual({
        message: 'Second message',
        type: MessageType.NORMAL
      });
    });
  });
});