/**
 * End-to-End Tests for Command History Navigation
 * 
 * Tests the complete user workflow for command history including
 * arrow key navigation, TUI integration, and persistent storage.
 */

import Database from '../../src/utils/database';
import { createGameWithRooms } from '../../src/utils/initDb';
import { initializeTestDatabase } from '../testUtils';
import { GameController } from '../../src/gameController';
import { HistoryManager } from '../../src/utils/historyManager';
import { TUIInterface } from '../../src/ui/TUIInterface';
import { MessageType } from '../../src/ui/MessageFormatter';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Mock GrokClient
jest.mock('../../src/ai/grokClient');

describe('Command History Navigation E2E', () => {
  let db: Database;
  let controller: GameController;
  let tempDir: string;
  let historyFile: string;
  let gameId: number;
  let displayMessages: string[] = [];
  
  // Mock TUI that captures all display messages
  const mockTUI: TUIInterface = {
    initialize: jest.fn().mockResolvedValue(undefined),
    display: jest.fn((message: string, type?: MessageType) => {
      displayMessages.push(message);
    }),
    displayLines: jest.fn((lines: string[], type?: MessageType) => {
      displayMessages.push(...lines);
    }),
    getInput: jest.fn().mockResolvedValue(''),
    updateStatus: jest.fn(),
    setStatus: jest.fn(),
    clear: jest.fn(),
    destroy: jest.fn(),
    setPrompt: jest.fn(),
    showWelcome: jest.fn(),
    showError: jest.fn((title: string, message?: string) => {
      displayMessages.push(`ERROR: ${title}${message ? ': ' + message : ''}`);
    }),
    showAIProgress: jest.fn(),
    displayRoom: jest.fn()
  };

  beforeEach(async () => {
    // Reset display messages
    displayMessages = [];
    
    // Setup environment
    process.env.USE_PRISMA = 'false';
    process.env.NODE_ENV = 'test';
    process.env.AI_MOCK_MODE = 'true';
    
    // Create temporary directory for test history files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'shadow_kingdom_e2e_history_'));
    historyFile = path.join(tempDir, '.e2e_command_history');
    
    // Set environment variables
    process.env.COMMAND_HISTORY_FILE = historyFile;
    process.env.COMMAND_HISTORY_SIZE = '20';
    
    // Setup database
    db = new Database(':memory:');
    await db.connect();
    await initializeTestDatabase(db);
    
    // Create game
    const uniqueGameName = `E2E History Test ${Date.now()}-${Math.random()}`;
    gameId = await createGameWithRooms(db, uniqueGameName);
    
    // Get starting room
    const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
    const startingRoomId = rooms.find(room => room.name === 'Starting Room')?.id || rooms[0]?.id;
    
    // Create controller with mock TUI
    controller = new GameController(db, undefined, mockTUI);
    
    // Start game session
    const gameStateManager = (controller as any).gameStateManager;
    await gameStateManager.startGameSession(gameId);
    await gameStateManager.moveToRoom(startingRoomId);
  });

  afterEach(async () => {
    if (controller) {
      await controller.cleanup();
      (controller as any).removeEventListeners?.();
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

  describe('Complete Command History Workflow', () => {
    it('should save commands to persistent storage during gameplay', async () => {
      // Execute a series of game commands
      const commands = ['look', 'inventory', 'help', 'go north'];
      
      for (const command of commands) {
        displayMessages = []; // Reset messages for each command
        await (controller as any).processCommand(command);
      }
      
      // Verify commands were saved to history file
      const fileExists = await fs.access(historyFile).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
      
      const fileContent = await fs.readFile(historyFile, 'utf-8');
      const savedCommands = fileContent.trim().split('\n').filter(line => line.length > 0);
      
      expect(savedCommands).toEqual(commands);
    });

    it('should load existing history on controller initialization', async () => {
      // Pre-populate history file
      const existingCommands = ['examine sword', 'pickup key', 'open door', 'go east'];
      await fs.writeFile(historyFile, existingCommands.join('\n') + '\n');
      
      // Create new controller instance
      const newController = new GameController(db, undefined, mockTUI);
      
      // Check if history manager loaded the existing commands
      const historyManager = (newController as any).historyManager as HistoryManager;
      const loadedHistory = await historyManager.loadHistory();
      
      expect(loadedHistory).toEqual(existingCommands);
      
      await newController.cleanup();
    });

    it('should handle mixed valid and invalid commands correctly', async () => {
      // Execute commands including some that might fail
      const commands = ['look', '', 'invalid_command', 'inventory', '   ', 'help'];
      
      for (const command of commands) {
        displayMessages = [];
        try {
          await (controller as any).processCommand(command);
        } catch (error) {
          // Some commands might throw errors - that's expected
        }
      }
      
      // Check saved history - should only contain valid, non-empty commands
      const historyManager = (controller as any).historyManager as HistoryManager;
      const savedHistory = await historyManager.loadHistory();
      
      // Should filter out empty commands but include all attempted commands
      const expectedCommands = commands.filter(cmd => cmd.trim().length > 0);
      expect(savedHistory).toEqual(expectedCommands);
    });
  });

  describe('History Navigation Simulation', () => {
    it('should provide correct history data for TUI navigation', async () => {
      // Build up command history
      const commands = ['look around', 'go north', 'inventory', 'examine torch'];
      
      for (const command of commands) {
        await (controller as any).processCommand(command);
      }
      
      // Get history manager and simulate TUI history loading
      const historyManager = (controller as any).historyManager as HistoryManager;
      const history = await historyManager.loadHistory();
      
      // History should be in chronological order for navigation
      expect(history).toEqual(commands);
      
      // Test navigation simulation (what TUI would do)
      // UP arrow should go backwards through history (newest to oldest)
      let navigationIndex = -1;
      let currentInput = 'partial command';
      
      // Press UP arrow - should show last command
      navigationIndex = history.length - 1;
      expect(history[navigationIndex]).toBe('examine torch');
      
      // Press UP again - should show previous command
      navigationIndex = navigationIndex - 1;
      expect(history[navigationIndex]).toBe('inventory');
      
      // Press DOWN - should go forward to newer command
      navigationIndex = navigationIndex + 1;
      expect(history[navigationIndex]).toBe('examine torch');
    });

    it('should handle history boundaries correctly', async () => {
      const historyManager = (controller as any).historyManager as HistoryManager;
      
      // Test with single command
      await (controller as any).processCommand('single command');
      
      const history = await historyManager.loadHistory();
      expect(history).toHaveLength(1);
      
      // Navigation at boundaries should not crash
      expect(history[0]).toBe('single command');
      expect(history[1]).toBeUndefined(); // Beyond bounds
      expect(history[-1]).toBeUndefined(); // Before bounds
    });

    it('should handle empty history gracefully', async () => {
      const historyManager = (controller as any).historyManager as HistoryManager;
      
      // Clear any existing history
      await historyManager.clearHistory();
      
      const history = await historyManager.loadHistory();
      expect(history).toEqual([]);
      
      // TUI should handle empty history without errors
      expect(history.length).toBe(0);
    });
  });

  describe('History Persistence Across Sessions', () => {
    it('should maintain history across game controller recreations', async () => {
      // First session - execute commands
      const sessionOneCommands = ['look', 'inventory', 'help'];
      
      for (const command of sessionOneCommands) {
        await (controller as any).processCommand(command);
      }
      
      // Cleanup first session
      await controller.cleanup();
      
      // Create new controller (simulating game restart)
      const newController = new GameController(db, undefined, mockTUI);
      
      // Execute more commands in new session
      const sessionTwoCommands = ['go north', 'examine door'];
      for (const command of sessionTwoCommands) {
        await (newController as any).processCommand(command);
      }
      
      // Verify combined history
      const newHistoryManager = (newController as any).historyManager as HistoryManager;
      const finalHistory = await newHistoryManager.loadHistory();
      
      expect(finalHistory).toEqual([...sessionOneCommands, ...sessionTwoCommands]);
      
      await newController.cleanup();
    });

    it('should handle concurrent history access gracefully', async () => {
      // Create multiple history managers pointing to same file
      const manager1 = new HistoryManager(historyFile, 20);
      const manager2 = new HistoryManager(historyFile, 20);
      
      // Save commands from both managers concurrently
      const promises = [
        manager1.saveCommand('command from manager 1'),
        manager2.saveCommand('command from manager 2'),
        manager1.saveCommand('another from manager 1'),
        manager2.saveCommand('another from manager 2')
      ];
      
      await Promise.all(promises);
      
      // Both managers should be able to load the combined history
      const history1 = await manager1.loadHistory();
      const history2 = await manager2.loadHistory();
      
      expect(history1).toEqual(history2);
      expect(history1.length).toBe(4);
    });
  });

  describe('Advanced History Features', () => {
    it('should filter consecutive duplicate commands', async () => {
      // Execute commands with duplicates
      const commands = ['look', 'look', 'inventory', 'look', 'help', 'help'];
      
      for (const command of commands) {
        await (controller as any).processCommand(command);
      }
      
      const historyManager = (controller as any).historyManager as HistoryManager;
      const history = await historyManager.loadHistory();
      
      // Should filter out consecutive duplicates
      expect(history).toEqual(['look', 'inventory', 'look', 'help']);
    });

    it('should handle large command history efficiently', async () => {
      // Execute many commands to test performance
      const largeCommandSet = [];
      for (let i = 0; i < 100; i++) {
        largeCommandSet.push(`command ${i}`);
      }
      
      const startTime = Date.now();
      
      // Execute all commands
      for (const command of largeCommandSet) {
        await (controller as any).processCommand(command);
      }
      
      const executionTime = Date.now() - startTime;
      
      // Should complete in reasonable time (less than 5 seconds)
      expect(executionTime).toBeLessThan(5000);
      
      // Verify history was properly managed (should respect size limit)
      const historyManager = (controller as any).historyManager as HistoryManager;
      const history = await historyManager.loadHistory();
      
      // Should not exceed configured maximum
      expect(history.length).toBeLessThanOrEqual(20); // Our test limit
      
      // Should contain most recent commands
      expect(history).toContain('command 99');
      expect(history).toContain('command 98');
    });

    it('should preserve command formatting and special characters', async () => {
      // Commands with special characters and formatting
      const specialCommands = [
        'examine "magic sword"',
        'say Hello, world!',
        'go north-east',
        'use item_with_underscores',
        'command with    multiple spaces'
      ];
      
      for (const command of specialCommands) {
        await (controller as any).processCommand(command);
      }
      
      const historyManager = (controller as any).historyManager as HistoryManager;
      const history = await historyManager.loadHistory();
      
      expect(history).toEqual(specialCommands);
    });
  });
});