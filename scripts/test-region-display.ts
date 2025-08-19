#!/usr/bin/env ts-node

/**
 * Test script to verify region display functionality
 */

import Database from '../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';
import { RoomDisplayService } from '../src/services/roomDisplayService';
import { Room, Connection } from '../src/services/gameStateManager';

async function testRegionDisplay() {
  console.log('Testing region display functionality...\n');
  
  let db: Database | undefined;
  
  try {
    // Create test database
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);

    // Create a game with the new region system
    const gameId = await createGameWithRooms(db, 'Region Display Test');
    console.log(`Created test game with ID: ${gameId}`);

    // Initialize room display service
    const roomDisplayService = new RoomDisplayService(db, {
      enableDebugLogging: false
    });

    // Get the first room (should be Grand Entrance Hall with region)
    const room = await db.get<Room>(
      'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
      [gameId, 'Grand Entrance Hall']
    );

    if (!room) {
      throw new Error('Could not find Grand Entrance Hall');
    }

    console.log('Room from database:', {
      name: room.name,
      region_id: room.region_id,
      region_distance: room.region_distance
    });

    // Get connections for this room
    const connections = await db.all<Connection>(
      'SELECT * FROM connections WHERE from_room_id = ? ORDER BY direction',
      [room.id]
    );

    console.log(`Found ${connections.length} connections`);

    // Display the room
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

    console.log('\n✅ Region display test completed successfully!');

  } catch (error) {
    console.error('❌ Region display test failed:', error);
    process.exit(1);
  } finally {
    if (db) {
      await db.close();
    }
  }
}

// Run the test
testRegionDisplay().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});