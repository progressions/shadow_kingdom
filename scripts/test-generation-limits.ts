#!/usr/bin/env ts-node

import Database from '../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';
import { GameController } from '../src/gameController';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testGenerationLimits() {
  console.log('🔒 Testing Generation Limits...\n');

  // Check if API key is configured
  if (!process.env.GROK_API_KEY) {
    console.error('❌ GROK_API_KEY not found in .env file');
    console.log('Please add your Grok API key to .env file');
    process.exit(1);
  }

  // Override limits for testing
  process.env.MAX_ROOMS_PER_GAME = '15';  // Small limit for testing
  process.env.MAX_GENERATION_DEPTH = '2';  // Limit depth
  process.env.GENERATION_COOLDOWN_MS = '100';  // Short cooldown for testing

  const db = new Database(':memory:');
  
  try {
    await db.connect();
    await initializeDatabase(db);
    
    console.log('🎮 Creating test game...');
    const gameId = await createGameWithRooms(db, `Limit Test Game ${Date.now()}`);
    console.log(`✅ Game created with ID: ${gameId}`);
    
    // Create test controller
    class TestController {
      private db: Database;
      private grokClient: any;
      private currentGameId: number;
      private lastGenerationTime: number = 0;
      private generationInProgress: Set<number> = new Set();
      
      constructor(db: Database, gameId: number) {
        this.db = db;
        this.currentGameId = gameId;
        const { GrokClient } = require('../src/ai/grokClient');
        this.grokClient = new GrokClient();
      }
      
      // Copy the updated generation methods from GameController
      async preGenerateAdjacentRooms(currentRoomId: number): Promise<void> {
        const cooldown = parseInt(process.env.GENERATION_COOLDOWN_MS || '10000');
        const timeSinceLastGeneration = Date.now() - this.lastGenerationTime;
        
        if (timeSinceLastGeneration < cooldown) {
          console.log('⏳ Still in cooldown period');
          return;
        }

        if (this.generationInProgress.has(currentRoomId)) {
          console.log('🔄 Generation already in progress');
          return;
        }

        const roomCount = await this.db.get(
          'SELECT COUNT(*) as count FROM rooms WHERE game_id = ?',
          [this.currentGameId]
        );
        
        const maxRooms = parseInt(process.env.MAX_ROOMS_PER_GAME || '50');
        if (roomCount?.count >= maxRooms) {
          console.log(`🏰 Room limit reached (${maxRooms}). No more rooms will be generated.`);
          return;
        }

        await this.expandFromAdjacentRooms(currentRoomId);
        this.lastGenerationTime = Date.now();
      }

      private async expandFromAdjacentRooms(currentRoomId: number): Promise<void> {
        this.generationInProgress.add(currentRoomId);
        
        try {
          const maxDepth = parseInt(process.env.MAX_GENERATION_DEPTH || '3');
          console.log(`🎯 Max generation depth: ${maxDepth}`);
          
          const connections = await this.db.all(
            'SELECT * FROM connections WHERE from_room_id = ? AND game_id = ?',
            [currentRoomId, this.currentGameId]
          );

          let roomsToGenerate = 0;
          
          for (const connection of connections) {
            const targetRoom = await this.db.get(
              'SELECT * FROM rooms WHERE id = ?',
              [connection.to_room_id]
            );

            if (targetRoom) {
              const missingCount = await this.countMissingRoomsFor(targetRoom.id);
              roomsToGenerate += Math.min(missingCount, maxDepth);
            }
          }

          // Check room limits
          const currentRoomCount = await this.db.get(
            'SELECT COUNT(*) as count FROM rooms WHERE game_id = ?',
            [this.currentGameId]
          );
          
          const maxRooms = parseInt(process.env.MAX_ROOMS_PER_GAME || '50');
          const roomsCanGenerate = Math.max(0, maxRooms - (currentRoomCount?.count || 0));
          
          if (roomsToGenerate > roomsCanGenerate) {
            console.log(`🏰 Limited generation: ${roomsCanGenerate} rooms available (${roomsToGenerate} requested)`);
            roomsToGenerate = roomsCanGenerate;
          }

          let generatedCount = 0;
          for (const connection of connections) {
            if (generatedCount >= roomsToGenerate) break;
            
            const targetRoom = await this.db.get(
              'SELECT * FROM rooms WHERE id = ?',
              [connection.to_room_id]
            );

            if (targetRoom) {
              const roomsGenerated = await this.generateMissingRoomsFor(targetRoom.id, maxDepth, roomsToGenerate - generatedCount);
              generatedCount += roomsGenerated;
            }
          }
          
        } catch (error) {
          console.error('Background generation failed:', error);
        } finally {
          this.generationInProgress.delete(currentRoomId);
        }
      }

      private async countMissingRoomsFor(roomId: number): Promise<number> {
        const allDirections = ['north', 'south', 'east', 'west', 'up', 'down'];
        let missingCount = 0;

        for (const direction of allDirections) {
          const existingConnection = await this.db.get(
            'SELECT * FROM connections WHERE from_room_id = ? AND name = ? AND game_id = ?',
            [roomId, direction, this.currentGameId]
          );

          if (!existingConnection) {
            missingCount++;
          }
        }

        return missingCount;
      }

      private async generateMissingRoomsFor(roomId: number, maxRooms: number = 6, remainingQuota: number = Infinity): Promise<number> {
        const allDirections = ['north', 'south', 'east', 'west', 'up', 'down'];
        let generatedCount = 0;

        for (const direction of allDirections) {
          if (generatedCount >= maxRooms || generatedCount >= remainingQuota) break;
          
          const existingConnection = await this.db.get(
            'SELECT * FROM connections WHERE from_room_id = ? AND name = ? AND game_id = ?',
            [roomId, direction, this.currentGameId]
          );

          if (!existingConnection) {
            const success = await this.generateSingleRoom(roomId, direction);
            if (success) {
              generatedCount++;
            }
          }
        }

        return generatedCount;
      }

      private async generateSingleRoom(fromRoomId: number, direction: string): Promise<boolean> {
        try {
          const fromRoom = await this.db.get('SELECT * FROM rooms WHERE id = ?', [fromRoomId]);

          const newRoom = await this.grokClient.generateRoom({
            currentRoom: { name: fromRoom.name, description: fromRoom.description },
            direction: direction
          });

          const roomResult = await this.db.run(
            'INSERT INTO rooms (game_id, name, description, generation_processed) VALUES (?, ?, ?, ?)',
            [this.currentGameId, newRoom.name, newRoom.description, false]
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

          console.log(`✨ Generated: ${newRoom.name} (${direction} from room ${fromRoomId})`);
          return true;

        } catch (error) {
          console.error(`Failed to generate room ${direction} from ${fromRoomId}:`, error);
          return false;
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
    
    // Get initial room count
    const initialRooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
    console.log(`📊 Initial rooms: ${initialRooms.length}`);
    
    const entranceHall = await db.get(
      'SELECT * FROM rooms WHERE game_id = ? AND name LIKE ?',
      [gameId, '%Entrance Hall%']
    );
    
    if (!entranceHall) {
      throw new Error('Could not find Entrance Hall (tried both "Entrance Hall" and "Grand Entrance Hall")');
    }
    
    console.log('\n🚀 Running generation cycles until limit reached...');
    console.log(`📏 Limit: ${process.env.MAX_ROOMS_PER_GAME} rooms, Depth: ${process.env.MAX_GENERATION_DEPTH}`);
    
    // Run multiple generation cycles
    for (let cycle = 1; cycle <= 10; cycle++) {
      console.log(`\n--- Cycle ${cycle} ---`);
      
      await controller.preGenerateAdjacentRooms(entranceHall.id);
      
      // Check current room count
      const currentRooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
      console.log(`📊 Rooms after cycle ${cycle}: ${currentRooms.length}`);
      
      // If we've hit the limit, break
      if (currentRooms.length >= parseInt(process.env.MAX_ROOMS_PER_GAME || '50')) {
        console.log('🎯 Room limit reached!');
        break;
      }
      
      // Small delay to show cooldown working
      if (cycle < 10) {
        console.log('⏱️ Waiting for cooldown...');
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // Final summary
    const finalRooms = await db.all('SELECT * FROM rooms WHERE game_id = ? ORDER BY id', [gameId]);
    console.log(`\n📈 Final room count: ${finalRooms.length} (started with ${initialRooms.length})`);
    console.log(`✅ Generated ${finalRooms.length - initialRooms.length} new rooms`);
    
    const maxAllowed = parseInt(process.env.MAX_ROOMS_PER_GAME || '50');
    if (finalRooms.length <= maxAllowed) {
      console.log(`🎉 Success! Room count (${finalRooms.length}) is within limit (${maxAllowed})`);
    } else {
      console.log(`❌ Error! Room count (${finalRooms.length}) exceeded limit (${maxAllowed})`);
    }

    // Validate that all rooms have at least one exit
    console.log('\n🔍 Validating room connectivity...');
    let roomsWithoutExits = 0;
    
    for (const room of finalRooms) {
      const exits = await db.all(
        'SELECT * FROM connections WHERE from_room_id = ? AND game_id = ?',
        [room.id, gameId]
      );
      
      if (exits.length === 0) {
        console.log(`⚠️  Room "${room.name}" has no exits!`);
        roomsWithoutExits++;
      }
    }
    
    if (roomsWithoutExits === 0) {
      console.log(`✅ All ${finalRooms.length} rooms have at least one exit`);
    } else {
      console.log(`❌ ${roomsWithoutExits} rooms have no exits!`);
    }
    
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
  testGenerationLimits();
}