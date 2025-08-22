/**
 * Unit Tests for LogFormatter
 * 
 * These tests verify the LogFormatter utility functions for
 * consistent log message formatting across the system.
 */

import { LogFormatter } from '../../src/utils/logFormatter';

describe('LogFormatter Unit Tests', () => {
  // Mock Date.now() for consistent timestamp testing
  const mockDate = new Date('2025-01-15T14:30:45.123Z');
  let originalDateNow: typeof Date.now;

  beforeEach(() => {
    originalDateNow = Date.now;
    Date.now = jest.fn(() => mockDate.getTime());
    // Also mock the Date constructor for new Date() calls
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
  });

  afterEach(() => {
    Date.now = originalDateNow;
    jest.useRealTimers();
  });

  describe('Timestamp Formatting', () => {
    test('should format timestamp consistently', () => {
      const timestamp = LogFormatter.formatTimestamp();
      
      expect(timestamp).toBe('2025-01-15 14:30:45');
    });

    test('should format specific date correctly', () => {
      const specificDate = new Date('2024-12-25T09:15:30.456Z');
      const timestamp = LogFormatter.formatTimestamp(specificDate);
      
      expect(timestamp).toBe('2024-12-25 09:15:30');
    });

    test('should handle different timezones consistently', () => {
      // Test with various dates to ensure format consistency
      const dates = [
        new Date('2025-01-01T00:00:00.000Z'),
        new Date('2025-06-15T12:30:45.789Z'),
        new Date('2025-12-31T23:59:59.999Z')
      ];

      const timestamps = dates.map(date => LogFormatter.formatTimestamp(date));
      
      expect(timestamps).toEqual([
        '2025-01-01 00:00:00',
        '2025-06-15 12:30:45', 
        '2025-12-31 23:59:59'
      ]);
    });
  });

  describe('User Input Formatting', () => {
    test('should format user input with > prefix and timestamp', () => {
      const command = 'look around';
      const formatted = LogFormatter.formatUserInput(command);
      
      expect(formatted).toBe('[2025-01-15 14:30:45] > look around');
    });

    test('should handle empty command', () => {
      const formatted = LogFormatter.formatUserInput('');
      
      expect(formatted).toBe('[2025-01-15 14:30:45] > ');
    });

    test('should handle commands with special characters', () => {
      const specialCommands = [
        'say "Hello, world!"',
        'examine item#123',
        'go north/east',
        'use item & combine'
      ];

      const formatted = specialCommands.map(cmd => LogFormatter.formatUserInput(cmd));
      
      expect(formatted).toEqual([
        '[2025-01-15 14:30:45] > say "Hello, world!"',
        '[2025-01-15 14:30:45] > examine item#123',
        '[2025-01-15 14:30:45] > go north/east',
        '[2025-01-15 14:30:45] > use item & combine'
      ]);
    });

    test('should handle multi-line commands', () => {
      const multilineCommand = 'first line\nsecond line';
      const formatted = LogFormatter.formatUserInput(multilineCommand);
      
      expect(formatted).toBe('[2025-01-15 14:30:45] > first line\nsecond line');
    });
  });

  describe('System Output Formatting', () => {
    test('should format system output without type labels', () => {
      const message = 'You are in a grand hall.';
      const formatted = LogFormatter.formatSystemOutput(message, 'room');
      
      expect(formatted).toBe('[2025-01-15 14:30:45] You are in a grand hall.');
      expect(formatted).not.toContain('ROOM:');
      expect(formatted).not.toContain('SYSTEM:');
    });

    test('should handle different message types consistently', () => {
      const messages = [
        { text: 'You pick up the key.', type: 'action' },
        { text: 'The door creaks open.', type: 'system' },
        { text: 'You see a mysterious figure.', type: 'room' },
        { text: 'Health: 100/100', type: 'status' }
      ];

      const formatted = messages.map(msg => 
        LogFormatter.formatSystemOutput(msg.text, msg.type)
      );

      expect(formatted).toEqual([
        '[2025-01-15 14:30:45] You pick up the key.',
        '[2025-01-15 14:30:45] The door creaks open.',
        '[2025-01-15 14:30:45] You see a mysterious figure.',
        '[2025-01-15 14:30:45] Health: 100/100'
      ]);

      // Verify no type labels are present
      formatted.forEach(msg => {
        expect(msg).not.toMatch(/(ACTION|SYSTEM|ROOM|STATUS):/);
      });
    });

    test('should handle empty messages', () => {
      const formatted = LogFormatter.formatSystemOutput('', 'system');
      
      expect(formatted).toBe('[2025-01-15 14:30:45] ');
    });

    test('should preserve message formatting', () => {
      const formattedMessage = 'Player Stats:\n  Health: 85/100\n  Mana: 45/50';
      const formatted = LogFormatter.formatSystemOutput(formattedMessage, 'status');
      
      expect(formatted).toBe('[2025-01-15 14:30:45] Player Stats:\n  Health: 85/100\n  Mana: 45/50');
    });
  });

  describe('Game Event Formatting', () => {
    test('should format movement events with context', () => {
      const gameEvent = {
        type: 'movement' as const,
        gameId: 1,
        playerId: 123,
        roomId: 456,
        details: { direction: 'north', fromRoom: 'Hall', toRoom: 'Garden' }
      };

      const formatted = LogFormatter.formatGameEvent(gameEvent);
      
      expect(formatted).toMatch(/^\[2025-01-15 14:30:45\] MOVEMENT:/);
      expect(formatted).toContain('gameId');
      expect(formatted).toContain('playerId');
      expect(formatted).toContain('roomId');
      expect(formatted).toContain('direction');
    });

    test('should format session events', () => {
      const gameEvent = {
        type: 'session_start' as const,
        details: { startTime: Date.now(), version: '1.0.0' }
      };

      const formatted = LogFormatter.formatGameEvent(gameEvent);
      
      expect(formatted).toMatch(/^\[2025-01-15 14:30:45\] SESSION_START:/);
      expect(formatted).toContain('startTime');
      expect(formatted).toContain('version');
    });

    test('should handle events without optional fields', () => {
      const gameEvent = {
        type: 'combat' as const,
        details: { action: 'attack', target: 'orc' }
      };

      const formatted = LogFormatter.formatGameEvent(gameEvent);
      
      expect(formatted).toMatch(/^\[2025-01-15 14:30:45\] COMBAT:/);
      expect(formatted).toContain('action');
      expect(formatted).toContain('target');
      // Should not fail when optional fields are missing
      expect(formatted).not.toContain('gameId');
    });

    test('should format room generation events', () => {
      const gameEvent = {
        type: 'room_generation' as const,
        gameId: 2,
        roomId: 789,
        details: { 
          triggerType: 'movement',
          newRoomName: 'Crystal Cave',
          connectionDirection: 'east'
        }
      };

      const formatted = LogFormatter.formatGameEvent(gameEvent);
      
      expect(formatted).toMatch(/^\[2025-01-15 14:30:45\] ROOM_GENERATION:/);
      expect(formatted).toContain('triggerType');
      expect(formatted).toContain('newRoomName');
      expect(formatted).toContain('connectionDirection');
    });

    test('should handle complex nested details', () => {
      const gameEvent = {
        type: 'dialogue' as const,
        gameId: 1,
        playerId: 456,
        details: {
          npc: 'Ancient Guardian',
          conversation: {
            playerInput: 'Who are you?',
            npcResponse: 'I am the keeper of ancient secrets.',
            mood: 'mysterious'
          },
          location: {
            roomId: 789,
            roomName: 'Temple Sanctuary'
          }
        }
      };

      const formatted = LogFormatter.formatGameEvent(gameEvent);
      
      expect(formatted).toMatch(/^\[2025-01-15 14:30:45\] DIALOGUE:/);
      expect(formatted).toContain('Ancient Guardian');
      expect(formatted).toContain('Who are you?');
      expect(formatted).toContain('Temple Sanctuary');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null and undefined inputs gracefully', () => {
      expect(() => {
        LogFormatter.formatUserInput(null as any);
        LogFormatter.formatUserInput(undefined as any);
        LogFormatter.formatSystemOutput(null as any, 'system');
        LogFormatter.formatSystemOutput('message', null as any);
      }).not.toThrow();
    });

    test('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000);
      const formatted = LogFormatter.formatSystemOutput(longMessage, 'system');
      
      expect(formatted).toContain(longMessage);
      expect(formatted).toMatch(/^\[2025-01-15 14:30:45\]/);
    });

    test('should handle messages with tabs and special whitespace', () => {
      const tabMessage = 'Line 1\n\tIndented line\n\t\tDouble indented';
      const formatted = LogFormatter.formatSystemOutput(tabMessage, 'system');
      
      expect(formatted).toBe('[2025-01-15 14:30:45] Line 1\n\tIndented line\n\t\tDouble indented');
    });

    test('should handle Unicode characters', () => {
      const unicodeMessage = 'Player found 🗝️ ancient key! 🏰';
      const formatted = LogFormatter.formatSystemOutput(unicodeMessage, 'system');
      
      expect(formatted).toBe('[2025-01-15 14:30:45] Player found 🗝️ ancient key! 🏰');
    });
  });

  describe('Performance Considerations', () => {
    test('should format messages quickly', () => {
      const startTime = Date.now();
      
      // Format 1000 messages
      for (let i = 0; i < 1000; i++) {
        LogFormatter.formatUserInput(`command ${i}`);
        LogFormatter.formatSystemOutput(`message ${i}`, 'system');
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });

    test('should not have memory leaks with repeated formatting', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Format many messages
      for (let i = 0; i < 10000; i++) {
        LogFormatter.formatUserInput(`test command ${i}`);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });
});