import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { HistoryManager } from '../../src/utils/historyManager';

describe('HistoryManager', () => {
  let tempDir: string;
  let historyFile: string;
  let historyManager: HistoryManager;

  beforeEach(async () => {
    // Create temporary directory for test history files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'shadow_kingdom_test_'));
    historyFile = path.join(tempDir, '.test_history');
    historyManager = new HistoryManager(historyFile, 5); // Small limit for testing
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('loadHistory', () => {
    it('should return empty array when history file does not exist', async () => {
      const history = await historyManager.loadHistory();
      expect(history).toEqual([]);
    });

    it('should load existing history from file', async () => {
      const testCommands = ['look', 'go north', 'inventory'];
      await fs.writeFile(historyFile, testCommands.join('\n') + '\n');

      const history = await historyManager.loadHistory();
      expect(history).toEqual(testCommands);
    });

    it('should handle corrupted history file gracefully', async () => {
      // Write file with binary content
      await fs.writeFile(historyFile, '\x00\x01\x02\x03');

      const history = await historyManager.loadHistory();
      // Should filter out empty/whitespace-only lines, so could be empty or contain filtered content
      expect(Array.isArray(history)).toBe(true);
      // All entries should be non-empty strings
      history.forEach(entry => {
        expect(typeof entry).toBe('string');
        expect(entry.trim().length).toBeGreaterThan(0);
      });
    });

    it('should limit history to maxEntries', async () => {
      const manyCommands = Array.from({ length: 10 }, (_, i) => `command${i}`);
      await fs.writeFile(historyFile, manyCommands.join('\n') + '\n');

      const history = await historyManager.loadHistory();
      expect(history).toHaveLength(5); // Our test limit
      expect(history).toEqual(['command5', 'command6', 'command7', 'command8', 'command9']);
    });

    it('should filter out empty lines', async () => {
      const commandsWithEmpty = ['look', '', '  ', 'go north', '\t', 'inventory'];
      await fs.writeFile(historyFile, commandsWithEmpty.join('\n') + '\n');

      const history = await historyManager.loadHistory();
      expect(history).toEqual(['look', 'go north', 'inventory']);
    });
  });

  describe('saveCommand', () => {
    it('should save a valid command to history file', async () => {
      await historyManager.saveCommand('look around');

      const content = await fs.readFile(historyFile, 'utf-8');
      expect(content).toBe('look around\n');
    });

    it('should not save empty commands', async () => {
      await historyManager.saveCommand('');
      await historyManager.saveCommand('   ');
      await historyManager.saveCommand('\t\n');

      try {
        const content = await fs.readFile(historyFile, 'utf-8');
        expect(content).toBe('');
      } catch (error: any) {
        // File might not exist, which is fine
        expect(error.code).toBe('ENOENT');
      }
    });

    it('should not save consecutive duplicate commands', async () => {
      await historyManager.saveCommand('look');
      await historyManager.saveCommand('look'); // Should be filtered out
      await historyManager.saveCommand('go north');
      await historyManager.saveCommand('look'); // Different from last, should be saved

      const content = await fs.readFile(historyFile, 'utf-8');
      expect(content).toBe('look\ngo north\nlook\n');
    });

    it('should trim whitespace from commands', async () => {
      await historyManager.saveCommand('  look around  ');

      const content = await fs.readFile(historyFile, 'utf-8');
      expect(content).toBe('look around\n');
    });

    it('should create directory if it does not exist', async () => {
      const nestedPath = path.join(tempDir, 'nested', 'dir', 'history');
      const nestedHistoryManager = new HistoryManager(nestedPath);

      await nestedHistoryManager.saveCommand('test command');

      const content = await fs.readFile(nestedPath, 'utf-8');
      expect(content).toBe('test command\n');
    });

    it('should handle file permission errors gracefully', async () => {
      // Create a read-only directory (permission test)
      const readOnlyDir = path.join(tempDir, 'readonly');
      await fs.mkdir(readOnlyDir);
      await fs.chmod(readOnlyDir, 0o444); // Read-only

      const readOnlyHistoryFile = path.join(readOnlyDir, 'history');
      const readOnlyHistoryManager = new HistoryManager(readOnlyHistoryFile);

      // Should not throw, should handle error gracefully
      await expect(readOnlyHistoryManager.saveCommand('test')).resolves.toBeUndefined();
    });
  });

  describe('history rotation', () => {
    it('should eventually rotate history when it gets too large', async () => {
      const manager = new HistoryManager(historyFile, 3);

      // Add more commands than the limit
      for (let i = 0; i < 10; i++) {
        await manager.saveCommand(`command${i}`);
      }

      // Give rotation time to happen (it's async)
      await new Promise(resolve => setTimeout(resolve, 100));

      const history = await manager.loadHistory();
      expect(history.length).toBeLessThanOrEqual(3);
      
      // Should keep the most recent commands
      expect(history).toContain('command9');
      expect(history).toContain('command8');
      expect(history).toContain('command7');
    });
  });

  describe('utility methods', () => {
    it('should return correct history file path', () => {
      expect(historyManager.getHistoryFilePath()).toBe(historyFile);
    });

    it('should clear history file', async () => {
      await historyManager.saveCommand('test command');
      expect(await fs.access(historyFile)).toBeUndefined(); // File exists

      await historyManager.clearHistory();

      await expect(fs.access(historyFile)).rejects.toThrow(); // File should not exist
    });

    it('should handle clearing non-existent history gracefully', async () => {
      await expect(historyManager.clearHistory()).resolves.toBeUndefined();
    });
  });

  describe('integration scenarios', () => {
    it('should work with typical game commands', async () => {
      const gameCommands = [
        'look',
        'go north',
        'inventory',
        'help',
        'go south',
        'quit'
      ];

      for (const command of gameCommands) {
        await historyManager.saveCommand(command);
      }

      const history = await historyManager.loadHistory();
      expect(history).toEqual(gameCommands.slice(-5)); // Limited to 5 in our test setup
    });

    it('should maintain order correctly for readline integration', async () => {
      const commands = ['first', 'second', 'third'];
      
      for (const command of commands) {
        await historyManager.saveCommand(command);
      }

      const history = await historyManager.loadHistory();
      
      // History should be in chronological order (oldest first)
      expect(history).toEqual(['first', 'second', 'third']);
      
      // For readline, we need to reverse this
      const readlineHistory = history.slice().reverse();
      expect(readlineHistory).toEqual(['third', 'second', 'first']);
    });
  });

  describe('environment configuration', () => {
    it('should use custom history size from constructor', () => {
      const customManager = new HistoryManager(historyFile, 50);
      // Can't directly test maxEntries, but we can test it doesn't throw
      expect(customManager.getHistoryFilePath()).toBe(historyFile);
    });

    it('should handle minimum history size of 1', () => {
      const minManager = new HistoryManager(historyFile, 0); // Should be clamped to 1
      expect(minManager.getHistoryFilePath()).toBe(historyFile);
    });

    it('should use default history file path when none provided', () => {
      const defaultManager = new HistoryManager();
      const defaultPath = defaultManager.getHistoryFilePath();
      
      expect(defaultPath).toContain('.shadow_kingdom_history');
      expect(path.isAbsolute(defaultPath)).toBe(true);
    });
  });
});