#!/usr/bin/env ts-node

/**
 * Test script to verify getCurrentRoom returns region information
 */

import Database from '../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';
import { GameStateManager } from '../src/services/gameStateManager';
import { RoomDisplayService } from '../src/services/roomDisplayService';

async function testCurrentRoomRegion() {
  console.log('Testing getCurrentRoom with region information...\n');
  
  let db: Database | undefined;
  
  try {
    // Create test database
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);

    // Create a game with regions
    const gameId = await createGameWithRooms(db, 'Current Room Test');
    console.log(`Created test game with ID: ${gameId}`);

    // Initialize game state manager
    const gameStateManager = new GameStateManager(db);
    
    // Start a game session
    await gameStateManager.startGameSession(gameId);
    console.log('Started game session');

    // Get current room via GameStateManager
    const room = await gameStateManager.getCurrentRoom();
    
    if (!room) {
      throw new Error('Could not get current room');
    }

    console.log('Room from getCurrentRoom():', {
      id: room.id,
      name: room.name,
      region_id: room.region_id,
      region_distance: room.region_distance,
      generation_processed: room.generation_processed
    });

    // Test room display with the fetched room
    const roomDisplayService = new RoomDisplayService(db);
    const connections = await gameStateManager.getCurrentRoomConnections();
    
    console.log('\n' + '='.repeat(50));
    console.log('ROOM DISPLAY OUTPUT:');
    console.log('='.repeat(50));
    
    const result = await roomDisplayService.displayRoom(room, connections);

    console.log('='.repeat(50));
    console.log('\nDisplay result:', {
      hasRegionInfo: !!result.regionInfo,
      regionInfo: result.regionInfo,
      hasExits: result.hasExits
    });

    console.log('\n✅ Current room region test completed successfully!');

  } catch (error) {
    console.error('❌ Current room region test failed:', error);
    process.exit(1);
  } finally {
    if (db) {
      await db.close();
    }
  }
}

// Run the test
testCurrentRoomRegion().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});