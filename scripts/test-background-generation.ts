#!/usr/bin/env ts-node

import Database from '../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';
import { GameController } from '../src/gameController';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testBackgroundGeneration() {
  console.log('🧪 Testing Background Room Generation in Real Game...\n');

  // Check if API key is configured
  if (!process.env.GROK_API_KEY) {
    console.error('❌ GROK_API_KEY not found in .env file');
    console.log('Please add your Grok API key to .env file');
    process.exit(1);
  }

  const db = new Database(':memory:');
  
  try {
    await db.connect();
    await initializeDatabase(db);
    
    // Create a test game
    console.log('🎮 Creating test game...');
    const gameId = await createGameWithRooms(db, `AI Test Game ${Date.now()}`);
    console.log(`✅ Game created with ID: ${gameId}`);
    
    // Get initial room count
    const initialRooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
    console.log(`📊 Initial rooms: ${initialRooms.length}`);
    initialRooms.forEach(room => {
      console.log(`   - ${room.name}`);
    });
    
    // Create a minimal test class instead of using the full GameController
    // to avoid the interactive CLI interface
    class TestController {
      private db: Database;
      private grokClient: any;
      private currentGameId: number;
      
      constructor(db: Database, gameId: number) {
        this.db = db;
        this.currentGameId = gameId;
        // Import and create GrokClient
        const { GrokClient } = require('../src/ai/grokClient');
        this.grokClient = new GrokClient();
      }
      
      async preGenerateAdjacentRooms(currentRoomId: number): Promise<void> {
        return this.expandFromAdjacentRooms(currentRoomId);
      }

      private async expandFromAdjacentRooms(currentRoomId: number): Promise<void> {
        try {
          const connections = await this.db.all(
            'SELECT * FROM connections WHERE from_room_id = ? AND game_id = ?',
            [currentRoomId, this.currentGameId]
          );

          for (const connection of connections) {
            const targetRoom = await this.db.get(
              'SELECT * FROM rooms WHERE id = ?',
              [connection.to_room_id]
            );

            if (targetRoom) {
              await this.generateMissingRoomsFor(targetRoom.id);
            }
          }
        } catch (error) {
          console.error('Background generation failed:', error);
        }
      }

      private async generateMissingRoomsFor(roomId: number): Promise<void> {
        const allDirections = ['north', 'south', 'east', 'west', 'up', 'down'];

        for (const direction of allDirections) {
          const existingConnection = await this.db.get(
            'SELECT * FROM connections WHERE from_room_id = ? AND name = ? AND game_id = ?',
            [roomId, direction, this.currentGameId]
          );

          if (!existingConnection) {
            await this.generateSingleRoom(roomId, direction);
          }
        }
      }

      private async generateSingleRoom(fromRoomId: number, direction: string): Promise<void> {
        try {
          const fromRoom = await this.db.get('SELECT * FROM rooms WHERE id = ?', [fromRoomId]);

          const newRoom = await this.grokClient.generateRoom({
            currentRoom: { name: fromRoom.name, description: fromRoom.description },
            direction: direction
          });

          const roomResult = await this.db.run(
            'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
            [this.currentGameId, newRoom.name, newRoom.description]
          );

          await this.db.run(
            'INSERT INTO connections (game_id, from_room_id, to_room_id, name) VALUES (?, ?, ?, ?)',
            [this.currentGameId, fromRoomId, roomResult.lastID, direction]
          );

          // Ensure new room has at least one exit (back to where we came from)
          const reverseDirection = this.getReverseDirection(direction);
          if (reverseDirection) {
            await this.db.run(
              'INSERT INTO connections (game_id, from_room_id, to_room_id, name) VALUES (?, ?, ?, ?)',
              [this.currentGameId, roomResult.lastID, fromRoomId, reverseDirection]
            );
          }

          console.log(`✨ Generated: ${newRoom.name} (${direction} from ${fromRoom.name})`);
        } catch (error) {
          console.error(`Failed to generate room ${direction} from ${fromRoomId}:`, error);
        }
      }

      private getReverseDirection(direction: string): string | null {
        const directionMap: { [key: string]: string } = {
          'north': 'south',
          'south': 'north',
          'east': 'west',
          'west': 'east',
          'up': 'down',
          'down': 'up'
        };
        
        return directionMap[direction.toLowerCase()] || null;
      }
    }
    
    const controller = new TestController(db, gameId);
    
    // Get the entrance hall to start from
    const entranceHall = await db.get(
      'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
      [gameId, 'Entrance Hall']
    );
    
    if (!entranceHall) {
      throw new Error('Could not find Entrance Hall');
    }
    
    console.log('\n🚀 Triggering background room generation...');
    console.log('This will generate rooms for adjacent areas (Library and Garden)');
    
    // Trigger the background generation
    await controller.preGenerateAdjacentRooms(entranceHall.id);
    
    // Wait a moment for generation to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check final room count
    const finalRooms = await db.all('SELECT * FROM rooms WHERE game_id = ? ORDER BY id', [gameId]);
    console.log(`\n📊 Final rooms: ${finalRooms.length} (added ${finalRooms.length - initialRooms.length})`);
    
    // Show newly generated rooms
    const newRooms = finalRooms.slice(initialRooms.length);
    if (newRooms.length > 0) {
      console.log('\n✨ Newly Generated Rooms:');
      newRooms.forEach(room => {
        console.log(`   🏰 ${room.name}`);
        console.log(`      ${room.description.substring(0, 80)}...`);
      });
      
      // Show connections that were created
      const connections = await db.all(
        'SELECT c.*, r1.name as from_room, r2.name as to_room FROM connections c ' +
        'JOIN rooms r1 ON c.from_room_id = r1.id ' +
        'JOIN rooms r2 ON c.to_room_id = r2.id ' +
        'WHERE c.game_id = ? AND c.to_room_id IN (' + newRooms.map(r => r.id).join(',') + ')',
        [gameId]
      );
      
      console.log('\n🔗 New Connections:');
      connections.forEach(conn => {
        console.log(`   ${conn.from_room} --${conn.name}--> ${conn.to_room}`);
      });
    } else {
      console.log('\n⚠️  No new rooms were generated');
    }
    
    console.log('\n🎉 Background generation test completed!');
    
  } catch (error) {
    console.error('\n❌ Error during test:', error);
  } finally {
    if (db.isConnected()) {
      await db.close();
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Test interrupted by user');
  process.exit(0);
});

// Run the test
if (require.main === module) {
  testBackgroundGeneration();
}