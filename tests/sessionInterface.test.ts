import { parseSessionArguments, shouldUseSessionMode, runSessionMode } from '../src/sessionInterface';

describe('Session Interface', () => {
  describe('Argument Parsing', () => {
    test('should detect start-session flag', () => {
      const args = ['--start-session'];
      const result = parseSessionArguments(args);
      
      expect(result).not.toBeNull();
      expect(result!.command).toBe('start-session');
    });

    test('should return null for no session flags', () => {
      const args = ['--some-other-flag'];
      const result = parseSessionArguments(args);
      
      expect(result).toBeNull();
    });

    test('should return null for empty args', () => {
      const args: string[] = [];
      const result = parseSessionArguments(args);
      
      expect(result).toBeNull();
    });

    test('should detect cmd flag with command', () => {
      const args = ['--cmd', 'look'];
      const result = parseSessionArguments(args);
      
      expect(result).not.toBeNull();
      expect(result!.command).toBe('cmd');
      expect(result!.args).toEqual(['look']);
    });

    test('should detect cmd flag with multi-word command', () => {
      const args = ['--cmd', 'go', 'north'];
      const result = parseSessionArguments(args);
      
      expect(result).not.toBeNull();
      expect(result!.command).toBe('cmd');
      expect(result!.args).toEqual(['go', 'north']);
    });

    test('should detect cmd flag with game-id', () => {
      const args = ['--cmd', 'look', '--game-id', '123'];
      const result = parseSessionArguments(args);
      
      expect(result).not.toBeNull();
      expect(result!.command).toBe('cmd');
      expect(result!.args).toEqual(['look']);
      expect(result!.gameId).toBe(123);
    });
  });

  describe('Session Mode Detection', () => {
    test('should return true when session arguments are present', () => {
      const args = ['--start-session'];
      const result = shouldUseSessionMode(args);
      
      expect(result).toBe(true);
    });

    test('should return true when cmd arguments are present', () => {
      const args = ['--cmd', 'look'];
      const result = shouldUseSessionMode(args);
      
      expect(result).toBe(true);
    });

    test('should return false when no session arguments are present', () => {
      const args = ['--some-other-flag'];
      const result = shouldUseSessionMode(args);
      
      expect(result).toBe(false);
    });
  });

  describe('Command Execution', () => {
    test('should execute look command and return room description', async () => {
      const args = ['--cmd', 'look'];
      
      // Capture console.log output
      const originalLog = console.log;
      let output = '';
      console.log = (message: string) => {
        output += message + '\n';
      };

      try {
        await runSessionMode(args);
        
        // Should contain room information (any room name will do)
        expect(output).toMatch(/\n[A-Z][a-zA-Z\s']+\n=+\n/); // Match room header format
        expect(output).toContain('Exits:'); // Should show exits
        expect(output.trim().length).toBeGreaterThan(0);
      } finally {
        console.log = originalLog;
      }
    });

    test('should execute movement command and respond appropriately', async () => {
      const args = ['--cmd', 'go', 'north'];
      
      // Capture console.log output
      const originalLog = console.log;
      let output = '';
      console.log = (message: string) => {
        output += message + '\n';
      };

      try {
        await runSessionMode(args);
        
        // Should either show a new room OR a "can't go" message
        const hasRoomInfo = output.match(/\n[A-Z][a-zA-Z\s']+\n=+\n/) && output.includes('Exits:');
        const hasErrorMessage = output.includes("You can") || output.includes("cannot go") || output.includes("can't go");
        
        expect(hasRoomInfo || hasErrorMessage).toBe(true);
        expect(output.trim().length).toBeGreaterThan(0);
      } finally {
        console.log = originalLog;
      }
    });
  });
});