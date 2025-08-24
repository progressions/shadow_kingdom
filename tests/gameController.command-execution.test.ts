/**
 * GameController Command Execution Tests
 * 
 * Tests for the command execution functionality that allows running
 * a single command non-interactively.
 */

import Database from '../src/utils/database';
import { initializeTestDatabase } from './testUtils';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';
import { GameController } from '../src/gameController';

describe('GameController Command Execution', () => {
  let db: Database;
  let originalExit: typeof process.exit;
  let exitSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Ensure we use legacy services, not Prisma
    process.env.USE_PRISMA = 'false';
    // Ensure test environment is properly set
    process.env.NODE_ENV = 'test';
    
    // Create in-memory database for testing
    db = new Database(':memory:');
    await db.connect();
    await initializeTestDatabase(db);

    // Mock process.exit to prevent test from actually exiting
    originalExit = process.exit;
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(async () => {
    // Restore process.exit
    process.exit = originalExit;
    exitSpy.mockRestore();
    
    await db.close();
  });

  test('should store command in constructor', () => {
    // Test that constructor accepts and stores command
    const controller = new GameController(db, 'look');
    
    // Access the private field for testing
    expect((controller as any).commandToExecute).toBe('look');
  });

  test('should store undefined when no command provided', () => {
    // Test that constructor works without command
    const controller = new GameController(db);
    
    // Access the private field for testing
    expect((controller as any).commandToExecute).toBeUndefined();
  });

  test('should execute command and exit when command is provided', async () => {
    // Create a game with rooms first
    const uniqueGameName = `Test Game ${Date.now()}-${Math.random()}`;
    await createGameWithRooms(db, uniqueGameName);

    // Create controller with command
    const controller = new GameController(db, 'look');

    // Mock the methods we need to control
    const processCommandSpy = jest.spyOn(controller as any, 'processCommand').mockResolvedValue(undefined);
    const cleanupSpy = jest.spyOn(controller as any, 'cleanup').mockResolvedValue(undefined);
    const processInputSpy = jest.spyOn(controller as any, 'processInput').mockResolvedValue(undefined);
    
    // Mock TUI methods to prevent actual TUI initialization
    const initializeTUISpy = jest.spyOn(controller as any, 'initializeTUI').mockResolvedValue(undefined);
    const loadSelectedGameSpy = jest.spyOn(controller as any, 'loadSelectedGame').mockResolvedValue(undefined);

    // Start should execute command and exit
    await expect(controller.start()).rejects.toThrow('process.exit called');

    // Verify the command was executed
    expect(processCommandSpy).toHaveBeenCalledWith('look');
    
    // Verify cleanup was called
    expect(cleanupSpy).toHaveBeenCalled();
    
    // Verify process.exit was called with 0
    expect(exitSpy).toHaveBeenCalledWith(0);
    
    // Verify processInput was NOT called (no interactive loop)
    expect(processInputSpy).not.toHaveBeenCalled();
  });
});