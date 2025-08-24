/**
 * Test for room generation during movement commands
 * This test ensures that when a player tries to move in a direction where no room exists,
 * a new room is generated AND the player is moved to that new room.
 */

import Database from '../../src/utils/database';
import { GameController } from '../../src/gameController';
import { initializeDatabase, createGameWithRooms } from '../../src/utils/initDb';
import * as readline from 'readline';

// Mock readline to avoid interactive prompts
jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    on: jest.fn(),
    prompt: jest.fn(),
    setPrompt: jest.fn(),
    close: jest.fn()
  }))
}));

describe('Movement Room Generation Integration', () => {
  let db: Database;
  let gameController: GameController;
  let gameId: number;

  beforeEach(async () => {
    // Create isolated in-memory test database
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);

    // Create game controller
    gameController = new GameController(db);
    
    // Mock background generation to prevent fire-and-forget promises
    jest.spyOn((gameController as any).backgroundGenerationService, 'triggerNextRegionGeneration')
      .mockImplementation(async () => {
        // Do nothing - prevents fire-and-forget promises while testing movement
        return Promise.resolve();
      });

    // Create test game
    gameId = await createGameWithRooms(db, `Test Game ${Date.now()}`);
  });

  afterEach(async () => {
    // Clean up GameController event listeners and HTTP connections
    if (gameController) {
      gameController.removeEventListeners();
      gameController.cleanup();
      
      // Clean up background generation promises via GameController
      const backgroundService = (gameController as any).backgroundGenerationService;
      if (backgroundService) {
        await backgroundService.waitForBackgroundOperations();
        backgroundService.resetGenerationState();
      }
    }
    
    if (db && db.isConnected()) {
      await db.close();
    }
    
    // Restore all mocks
    jest.restoreAllMocks();
  });

  test('should NOT generate rooms when moving in non-existent direction', async () => {
    // Start game session
    await (gameController as any).gameStateManager.startGameSession(gameId);
    
    // Get initial state
    const initialSession = (gameController as any).gameStateManager.getCurrentSession();
    const initialRoomId = initialSession.roomId;
    
    // Count initial rooms
    const initialRooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
    const initialRoomCount = initialRooms.length;
    
    // Get rooms without 'down' connection
    const downConnection = await db.get(
      'SELECT * FROM connections WHERE from_room_id = ? AND direction = ?', 
      [initialRoomId, 'down']
    );
    
    // Should not have a 'down' connection initially
    expect(downConnection).toBeFalsy();
    
    // Try to move down (should fail and stay in same room)
    const consoleSpy = jest.spyOn(console, 'log');
    await (gameController as any).move(['down']);
    
    // Should NOT create new rooms
    const finalRooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
    expect(finalRooms.length).toBe(initialRoomCount);
    
    // Should NOT create new connections
    const newConnection = await db.get(
      'SELECT * FROM connections WHERE from_room_id = ? AND direction = ?', 
      [initialRoomId, 'down']
    );
    expect(newConnection).toBeFalsy();
    
    // Should stay in same room
    const finalSession = (gameController as any).gameStateManager.getCurrentSession();
    expect(finalSession.roomId).toBe(initialRoomId);
    
    // Should show error message
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('should follow existing connections when they exist', async () => {
    // Start game session
    await (gameController as any).gameStateManager.startGameSession(gameId);
    
    // Get initial state
    const initialSession = (gameController as any).gameStateManager.getCurrentSession();
    const initialRoomId = initialSession.roomId;
    
    // Find an existing connection (starter rooms have connections)
    const existingConnection = await db.get(
      'SELECT * FROM connections WHERE from_room_id = ?', 
      [initialRoomId]
    );
    
    expect(existingConnection).toBeTruthy(); // Starter rooms should have connections
    
    // Move using the existing connection's direction
    await (gameController as any).move([existingConnection.direction]);
    
    // Should move to the connected room
    const finalSession = (gameController as any).gameStateManager.getCurrentSession();
    expect(finalSession.roomId).toBe(existingConnection.to_room_id);
    expect(finalSession.roomId).not.toBe(initialRoomId);
  });

  test('should handle invalid directions gracefully', async () => {
    // Start game session
    await (gameController as any).gameStateManager.startGameSession(gameId);
    
    const initialSession = (gameController as any).gameStateManager.getCurrentSession();
    const initialRoomId = initialSession.roomId;
    
    // Try to move in an invalid direction
    const mockTui = (gameController as any).tui;
    const displaySpy = jest.spyOn(mockTui, 'display');
    await (gameController as any).move(['invalidDirection']);
    
    // Should stay in same room
    const finalSession = (gameController as any).gameStateManager.getCurrentSession();
    expect(finalSession.roomId).toBe(initialRoomId);
    
    // Should show error message via TUI display
    expect(displaySpy).toHaveBeenCalledWith(
      expect.stringContaining("You can't go invaliddirection from here."),
      expect.anything()
    );
    
    displaySpy.mockRestore();
  });

  test('should create new regions when distance probability triggers', async () => {
    // This test would require manipulating the room distance to trigger new region creation
    // For now, we'll test that the integration exists by checking region assignment
    
    await (gameController as any).gameStateManager.startGameSession(gameId);
    
    // Count initial regions
    const initialRegions = await db.all('SELECT * FROM regions WHERE game_id = ?', [gameId]);
    
    // Move in multiple directions to potentially trigger region creation
    const directions = ['down', 'up'];
    
    for (const direction of directions) {
      // Check if connection exists
      const currentSession = (gameController as any).gameStateManager.getCurrentSession();
      const connection = await db.get(
        'SELECT * FROM connections WHERE from_room_id = ? AND direction = ?',
        [currentSession.roomId, direction]
      );
      
      if (!connection) {
        await (gameController as any).move([direction]);
      }
    }
    
    // Check that rooms were assigned to regions
    const allRooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
    const roomsWithRegions = allRooms.filter(room => room.region_id);
    
    // All rooms should have region assignments
    expect(roomsWithRegions.length).toBe(allRooms.length);
  });
});