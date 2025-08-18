#!/usr/bin/env ts-node

import Database from '../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testGenerationTracking() {
  console.log('📋 Testing Generation Tracking (Room Processing)...\n');

  // Check if API key is configured
  if (!process.env.GROK_API_KEY) {
    console.error('❌ GROK_API_KEY not found in .env file');
    console.log('Please add your Grok API key to .env file');
    process.exit(1);
  }

  // Set debug logging to see what's happening
  const originalDebugSetting = process.env.AI_DEBUG_LOGGING;
  process.env.AI_DEBUG_LOGGING = 'true';

  // Override limits for testing
  process.env.MAX_ROOMS_PER_GAME = '20';
  process.env.MAX_GENERATION_DEPTH = '2';
  process.env.GENERATION_COOLDOWN_MS = '100';

  const db = new Database(':memory:');
  
  try {
    await db.connect();
    await initializeDatabase(db);
    
    console.log('🎮 Creating test game...');
    const gameId = await createGameWithRooms(db, `Tracking Test Game ${Date.now()}`);
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
          
          // Get all connections FROM current room to existing rooms that haven't been processed yet
          const connections = await this.db.all(
            'SELECT c.*, r.generation_processed, r.name as room_name FROM connections c ' +
            'JOIN rooms r ON c.to_room_id = r.id ' +
            'WHERE c.from_room_id = ? AND c.game_id = ? AND (r.generation_processed = FALSE OR r.generation_processed IS NULL)',
            [currentRoomId, this.currentGameId]
          );

          console.log(`🔍 Found ${connections.length} unprocessed adjacent rooms`);
          connections.forEach(conn => {
            console.log(`   - ${conn.room_name} (processed: ${conn.generation_processed})`);
          });

          if (connections.length === 0) {
            console.log('✅ All adjacent rooms have already been processed for generation');
            return;
          }

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
              console.log(`🔧 Processing room: ${targetRoom.name}`);
              const roomsGenerated = await this.generateMissingRoomsFor(targetRoom.id, maxDepth, roomsToGenerate - generatedCount);
              generatedCount += roomsGenerated;
              
              // Mark this room as processed
              await this.db.run(
                'UPDATE rooms SET generation_processed = TRUE WHERE id = ?',
                [targetRoom.id]
              );
              console.log(`✅ Marked ${targetRoom.name} as processed`);
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

          // Get existing room names for context
          const existingRooms = await this.db.all(
            'SELECT name FROM rooms WHERE game_id = ? ORDER BY id',
            [this.currentGameId]
          );
          const roomNames = existingRooms.map(room => room.name);

          const newRoom = await this.grokClient.generateRoom({
            currentRoom: { name: fromRoom.name, description: fromRoom.description },
            direction: direction,
            gameHistory: roomNames,
            theme: 'mysterious fantasy kingdom'
          });

          // Check for duplicate room names and make unique if needed
          let uniqueName = newRoom.name;
          let counter = 1;
          
          while (true) {
            const existingRoom = await this.db.get(
              'SELECT id FROM rooms WHERE game_id = ? AND name = ?',
              [this.currentGameId, uniqueName]
            );
            
            if (!existingRoom) {
              break; // Name is unique
            }
            
            uniqueName = `${newRoom.name} ${counter}`;
            counter++;
            
            if (counter > 100) {
              uniqueName = `${newRoom.name} ${Date.now()}`;
              break;
            }
          }

          const roomResult = await this.db.run(
            'INSERT INTO rooms (game_id, name, description, generation_processed) VALUES (?, ?, ?, ?)',
            [this.currentGameId, uniqueName, newRoom.description, false]
          );

          await this.db.run(
            'INSERT INTO connections (game_id, from_room_id, to_room_id, name) VALUES (?, ?, ?, ?)',
            [this.currentGameId, fromRoomId, roomResult.lastID, direction]
          );

          const reverseDirection = this.getReverseDirection(direction);
          if (reverseDirection) {
            await this.db.run(
              'INSERT INTO connections (game_id, from_room_id, to_room_id, name) VALUES (?, ?, ?, ?)',
              [this.currentGameId, roomResult.lastID, fromRoomId, reverseDirection]
            );
          }

          console.log(`✨ Generated: ${uniqueName} (${direction} from room ${fromRoomId})`);
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
    
    // Get initial room count and processing status
    const initialRooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
    console.log(`📊 Initial rooms: ${initialRooms.length}`);
    initialRooms.forEach(room => {
      console.log(`   - ${room.name} (processed: ${room.generation_processed})`);
    });
    
    const entranceHall = await db.get(
      'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
      [gameId, 'Entrance Hall']
    );
    
    console.log('\n🚀 Running generation cycles to test processing tracking...');
    
    // Run multiple generation cycles
    for (let cycle = 1; cycle <= 5; cycle++) {
      console.log(`\n--- Cycle ${cycle} ---`);
      
      await controller.preGenerateAdjacentRooms(entranceHall.id);
      
      // Check processing status after each cycle
      const rooms = await db.all('SELECT name, generation_processed FROM rooms WHERE game_id = ? ORDER BY id', [gameId]);
      console.log(`📊 Room processing status after cycle ${cycle}:`);
      rooms.forEach(room => {
        const status = room.generation_processed ? '✅ processed' : '❌ unprocessed';
        console.log(`   - ${room.name}: ${status}`);
      });
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Final summary
    const finalRooms = await db.all('SELECT * FROM rooms WHERE game_id = ? ORDER BY id', [gameId]);
    const processedRooms = finalRooms.filter(room => room.generation_processed);
    const unprocessedRooms = finalRooms.filter(room => !room.generation_processed);
    
    console.log(`\n📈 Final Summary:`);
    console.log(`   Total rooms: ${finalRooms.length}`);
    console.log(`   Processed rooms: ${processedRooms.length}`);
    console.log(`   Unprocessed rooms: ${unprocessedRooms.length}`);
    
    if (unprocessedRooms.length > 0) {
      console.log(`   Unprocessed: ${unprocessedRooms.map(r => r.name).join(', ')}`);
    }
    
    console.log('\n🎉 Generation tracking test completed!');
    if (processedRooms.length > 0) {
      console.log('✅ Room processing tracking is working correctly');
    }
    
  } catch (error) {
    console.error('\n❌ Error during test:', error);
  } finally {
    // Restore original debug setting
    process.env.AI_DEBUG_LOGGING = originalDebugSetting;
    
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
  testGenerationTracking();
}