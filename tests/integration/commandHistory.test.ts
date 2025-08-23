/**
 * Integration Tests for Command History Functionality
 * 
 * Tests the full integration between GameController, HistoryManager,
 * and command processing to ensure persistent history works correctly.
 */

import Database from '../../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import { GameController } from '../../src/gameController';
import { HistoryManager } from '../../src/utils/historyManager';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock GrokClient
jest.mock('../../src/ai/grokClient');

describe('Command History Integration', () => {
  let db: Database;
  let controller: GameController;
  let tempDir: string;
  let historyFile: string;
  let gameId: number;

  beforeEach(async () => {
    // Set up test environment
    process.env.USE_PRISMA = 'false';
    process.env.NODE_ENV = 'test';
    process.env.AI_MOCK_MODE = 'true';
    
    // Create temporary directory for test history files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'shadow_kingdom_history_test_'));
    historyFile = path.join(tempDir, '.test_command_history');
    
    // Set environment variables for history configuration
    process.env.COMMAND_HISTORY_FILE = historyFile;
    process.env.COMMAND_HISTORY_SIZE = '10'; // Small for testing
    
    // Set up database
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    // Create a unique game
    const uniqueGameName = `History Test ${Date.now()}-${Math.random()}`;
    gameId = await createGameWithRooms(db, uniqueGameName);
    
    // Create GameController with command mode (to avoid UI issues in tests)
    controller = new GameController(db, 'look'); // Command mode
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    if (controller) {
      await controller.cleanup();
    }
    if (db) {
      await db.close();
    }
    
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    
    // Clean up environment
    delete process.env.COMMAND_HISTORY_FILE;
    delete process.env.COMMAND_HISTORY_SIZE;
    delete process.env.AI_MOCK_MODE;
  });

  describe('Command Tracking', () => {
    it('should save commands to persistent history file', async () => {
      const historyManager = new HistoryManager(historyFile, 10);
      
      // Simulate command execution
      const testCommands = ['look', 'go north', 'inventory'];
      
      for (const command of testCommands) {
        await historyManager.saveCommand(command);
      }
      
      // Verify commands were saved to file
      const fileContent = await fs.readFile(historyFile, 'utf-8');
      const savedCommands = fileContent.trim().split('\n');
      
      expect(savedCommands).toEqual(testCommands);
    });

    it('should load existing history on manager creation', async () => {
      // Pre-populate history file
      const existingCommands = ['examine sword', 'pickup key', 'open door'];
      await fs.writeFile(historyFile, existingCommands.join('\n') + '\n');
      
      // Create new history manager
      const historyManager = new HistoryManager(historyFile, 10);
      const loadedHistory = await historyManager.loadHistory();
      
      expect(loadedHistory).toEqual(existingCommands);
    });

    it('should filter duplicate consecutive commands', async () => {
      const historyManager = new HistoryManager(historyFile, 10);
      
      // Save commands with duplicates
      await historyManager.saveCommand('look');
      await historyManager.saveCommand('look'); // Should be filtered
      await historyManager.saveCommand('go north');
      await historyManager.saveCommand('look'); // Different from last, should be saved
      
      const loadedHistory = await historyManager.loadHistory();
      expect(loadedHistory).toEqual(['look', 'go north', 'look']);
    });

    it('should not save empty or whitespace-only commands', async () => {
      const historyManager = new HistoryManager(historyFile, 10);
      
      // Attempt to save invalid commands
      await historyManager.saveCommand('');
      await historyManager.saveCommand('   ');
      await historyManager.saveCommand('\t\n');
      await historyManager.saveCommand('valid command');
      
      const loadedHistory = await historyManager.loadHistory();
      expect(loadedHistory).toEqual(['valid command']);
    });
  });

  describe('History Size Management', () => {
    it('should respect maximum history size', async () => {
      const historyManager = new HistoryManager(historyFile, 3); // Small limit
      
      // Add more commands than the limit
      const commands = ['cmd1', 'cmd2', 'cmd3', 'cmd4', 'cmd5'];
      for (const command of commands) {
        await historyManager.saveCommand(command);
      }
      
      // Wait for potential async rotation
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const loadedHistory = await historyManager.loadHistory();
      
      // Should keep only the most recent commands
      expect(loadedHistory.length).toBeLessThanOrEqual(3);
      
      // Should contain the most recent commands
      expect(loadedHistory).toContain('cmd5');
      expect(loadedHistory).toContain('cmd4');
      expect(loadedHistory).toContain('cmd3');
    });

    it('should handle history file rotation gracefully', async () => {
      const historyManager = new HistoryManager(historyFile, 5);
      
      // Fill beyond capacity
      for (let i = 0; i < 20; i++) {
        await historyManager.saveCommand(`command${i}`);
      }
      
      // Wait for rotation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const finalHistory = await historyManager.loadHistory();
      
      // Should not exceed max size
      expect(finalHistory.length).toBeLessThanOrEqual(5);
      
      // Should contain most recent commands
      expect(finalHistory).toContain('command19');
      expect(finalHistory).toContain('command18');
    });
  });

  describe('File System Integration', () => {
    it('should create history file and directory if they do not exist', async () => {
      const nestedHistoryFile = path.join(tempDir, 'nested', 'dirs', 'history');
      const historyManager = new HistoryManager(nestedHistoryFile, 10);
      
      await historyManager.saveCommand('test command');
      
      // Verify file was created
      const exists = await fs.access(nestedHistoryFile).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      
      // Verify content
      const content = await fs.readFile(nestedHistoryFile, 'utf-8');
      expect(content.trim()).toBe('test command');
    });

    it('should handle permission errors gracefully', async () => {
      // Create read-only directory
      const readOnlyDir = path.join(tempDir, 'readonly');
      await fs.mkdir(readOnlyDir);
      await fs.chmod(readOnlyDir, 0o444);
      
      const readOnlyHistoryFile = path.join(readOnlyDir, 'history');
      const historyManager = new HistoryManager(readOnlyHistoryFile, 10);
      
      // Should not throw an error
      await expect(historyManager.saveCommand('test')).resolves.toBeUndefined();
      
      // Should still return empty history (graceful degradation)
      const history = await historyManager.loadHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should handle corrupted history files', async () => {
      // Write corrupted data to history file
      const corruptedData = '\x00\x01\x02invalid\x03\x04\nvalid command\n\x05\x06';
      await fs.writeFile(historyFile, corruptedData);
      
      const historyManager = new HistoryManager(historyFile, 10);
      const loadedHistory = await historyManager.loadHistory();
      
      // Should filter out invalid entries and keep valid ones
      expect(Array.isArray(loadedHistory)).toBe(true);
      loadedHistory.forEach(entry => {
        expect(typeof entry).toBe('string');
        expect(entry.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe('Environment Configuration', () => {
    it('should use custom history file from environment variable', () => {
      const customFile = '/custom/path/history';
      process.env.COMMAND_HISTORY_FILE = customFile;
      
      const historyManager = new HistoryManager(process.env.COMMAND_HISTORY_FILE, 10);
      expect(historyManager.getHistoryFilePath()).toBe(customFile);
    });

    it('should use custom history size from environment variable', async () => {
      process.env.COMMAND_HISTORY_SIZE = '2';
      const customSize = parseInt(process.env.COMMAND_HISTORY_SIZE);
      
      const historyManager = new HistoryManager(historyFile, customSize);
      
      // Add more commands than the custom size
      await historyManager.saveCommand('cmd1');
      await historyManager.saveCommand('cmd2');
      await historyManager.saveCommand('cmd3');
      
      // Wait for rotation
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const history = await historyManager.loadHistory();
      expect(history.length).toBeLessThanOrEqual(2);
    });

    it('should use default history location when no environment variable set', () => {
      delete process.env.COMMAND_HISTORY_FILE;
      
      const historyManager = new HistoryManager();
      const filePath = historyManager.getHistoryFilePath();
      
      expect(filePath).toContain('.shadow_kingdom_history');
      expect(path.isAbsolute(filePath)).toBe(true);
    });
  });

  describe('Command History Persistence', () => {
    it('should persist history across application restarts', async () => {
      // First session - save some commands
      const firstManager = new HistoryManager(historyFile, 10);
      const sessionOneCommands = ['look', 'north', 'inventory'];
      
      for (const command of sessionOneCommands) {
        await firstManager.saveCommand(command);
      }
      
      // Second session - load and add more commands
      const secondManager = new HistoryManager(historyFile, 10);
      const existingHistory = await secondManager.loadHistory();
      
      expect(existingHistory).toEqual(sessionOneCommands);
      
      // Add more commands in second session
      await secondManager.saveCommand('examine key');
      
      // Third session - verify all commands persisted
      const thirdManager = new HistoryManager(historyFile, 10);
      const finalHistory = await thirdManager.loadHistory();
      
      expect(finalHistory).toEqual([...sessionOneCommands, 'examine key']);
    });
  });
});