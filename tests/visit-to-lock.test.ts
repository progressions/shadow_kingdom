/**
 * Test for visit-to-lock mechanism
 * This test ensures that when a player visits a room, its connections are locked
 * and no new connections are added to that room on subsequent visits.
 */

import Database from '../src/utils/database';
import { GameController } from '../src/gameController';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';
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

describe('Visit-to-Lock Mechanism', () => {
  let db: Database;
  let gameController: GameController;
  let gameId: number;

  beforeEach(async () => {
    // Create isolated test database
    const dbPath = `test_visit_lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.db`;
    db = new Database(dbPath);
    await db.connect();
    await initializeDatabase(db);

    // Create game controller
    gameController = new GameController(db);

    // Create test game
    gameId = await createGameWithRooms(db, `Visit Lock Test ${Date.now()}`);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  test('should lock room connections after first visit', async () => {
    // Start game session
    await (gameController as any).gameStateManager.startGameSession(gameId);
    
    // Get the starting room (Grand Entrance Hall)
    const session = (gameController as any).gameStateManager.getCurrentSession();
    const startingRoomId = session.roomId;
    
    // First visit: look around (this should mark room as processed)
    await (gameController as any).lookAround();
    
    // Get connections after first visit
    const connectionsAfterFirstVisit = await db.all(
      'SELECT * FROM connections WHERE from_room_id = ? ORDER BY id',
      [startingRoomId]
    );
    
    // Verify room is marked as processed
    const roomAfterFirstVisit = await db.get(
      'SELECT generation_processed FROM rooms WHERE id = ?',
      [startingRoomId]
    );
    expect(roomAfterFirstVisit.generation_processed).toBe(1);
    
    // Wait a bit for any background generation to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Second visit: look around again
    await (gameController as any).lookAround();
    
    // Get connections after second visit
    const connectionsAfterSecondVisit = await db.all(
      'SELECT * FROM connections WHERE from_room_id = ? ORDER BY id',
      [startingRoomId]
    );
    
    // CRITICAL: Connections should be identical
    expect(connectionsAfterSecondVisit.length).toBe(connectionsAfterFirstVisit.length);
    expect(connectionsAfterSecondVisit).toEqual(connectionsAfterFirstVisit);
    
    // Third visit: look around one more time
    await (gameController as any).lookAround();
    
    // Get connections after third visit
    const connectionsAfterThirdVisit = await db.all(
      'SELECT * FROM connections WHERE from_room_id = ? ORDER BY id',
      [startingRoomId]
    );
    
    // CRITICAL: Connections should still be identical
    expect(connectionsAfterThirdVisit.length).toBe(connectionsAfterFirstVisit.length);
    expect(connectionsAfterThirdVisit).toEqual(connectionsAfterFirstVisit);
  });

  test('should not add connections to visited rooms during navigation', async () => {
    // Start game session
    await (gameController as any).gameStateManager.startGameSession(gameId);
    
    // Get a room that has connections
    const rooms = await db.all('SELECT * FROM rooms WHERE game_id = ? ORDER BY id', [gameId]);
    const entranceHall = rooms.find(r => r.name === 'Grand Entrance Hall');
    expect(entranceHall).toBeTruthy();
    
    // Get an existing connection from the entrance hall
    const existingConnection = await db.get(
      'SELECT * FROM connections WHERE from_room_id = ?', 
      [entranceHall.id]
    );
    expect(existingConnection).toBeTruthy();
    
    // Move to the connected room
    await (gameController as any).move([existingConnection.direction]);
    
    // Get current session after move
    const session = (gameController as any).gameStateManager.getCurrentSession();
    const currentRoomId = session.roomId;
    expect(currentRoomId).toBe(existingConnection.to_room_id);
    
    // Get connections from current room after first visit
    const connectionsAfterMove = await db.all(
      'SELECT * FROM connections WHERE from_room_id = ? ORDER BY id',
      [currentRoomId]
    );
    
    // Move back to entrance hall
    const returnConnection = await db.get(
      'SELECT * FROM connections WHERE from_room_id = ? AND to_room_id = ?',
      [currentRoomId, entranceHall.id]
    );
    expect(returnConnection).toBeTruthy();
    
    await (gameController as any).move([returnConnection.direction]);
    
    // Move to the same room again
    await (gameController as any).move([existingConnection.direction]);
    
    // Get connections after second visit
    const connectionsAfterSecondMove = await db.all(
      'SELECT * FROM connections WHERE from_room_id = ? ORDER BY id',
      [currentRoomId]
    );
    
    // CRITICAL: Connections should be identical
    expect(connectionsAfterSecondMove.length).toBe(connectionsAfterMove.length);
    expect(connectionsAfterSecondMove).toEqual(connectionsAfterMove);
    
    // Verify room is marked as processed
    const processedRoom = await db.get(
      'SELECT generation_processed FROM rooms WHERE id = ?',
      [currentRoomId]
    );
    expect(processedRoom.generation_processed).toBe(1);
  });

  test('should prevent race conditions in background generation', async () => {
    // Start game session
    await (gameController as any).gameStateManager.startGameSession(gameId);
    
    // Get the starting room
    const session = (gameController as any).gameStateManager.getCurrentSession();
    const startingRoomId = session.roomId;
    
    // Simulate concurrent lookAround calls (potential race condition)
    const lookAroundPromises = [
      (gameController as any).lookAround(),
      (gameController as any).lookAround(),
      (gameController as any).lookAround()
    ];
    
    // Wait for all lookAround calls to complete
    await Promise.all(lookAroundPromises);
    
    // Get final connections
    const finalConnections = await db.all(
      'SELECT * FROM connections WHERE from_room_id = ? ORDER BY id',
      [startingRoomId]
    );
    
    // Verify room is marked as processed only once
    const roomState = await db.get(
      'SELECT generation_processed FROM rooms WHERE id = ?',
      [startingRoomId]
    );
    expect(roomState.generation_processed).toBe(1);
    
    // Do one more lookAround to ensure stability
    await (gameController as any).lookAround();
    
    const connectionsAfterFinal = await db.all(
      'SELECT * FROM connections WHERE from_room_id = ? ORDER BY id',
      [startingRoomId]
    );
    
    // CRITICAL: Connections should be stable
    expect(connectionsAfterFinal).toEqual(finalConnections);
  });
});