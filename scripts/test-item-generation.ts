#!/usr/bin/env ts-node

/**
 * Test script to verify AI item generation is working
 */

import Database from '../src/utils/database';
import { initializeDatabase } from '../src/utils/initDb';
import { GrokClient } from '../src/ai/grokClient';
import { RoomGenerationService } from '../src/services/roomGenerationService';
import { RegionService } from '../src/services/regionService';
import { ItemService } from '../src/services/itemService';
import { ItemGenerationService } from '../src/services/itemGenerationService';

async function testItemGeneration() {
  console.log('🧪 Testing AI Item Generation...\n');
  
  // Use in-memory database for testing
  const db = new Database(':memory:');
  await db.connect();
  await initializeDatabase(db);
  
  // Create test game and room
  await db.run('INSERT INTO games (id, name) VALUES (1, "Test Game")');
  await db.run('INSERT INTO rooms (id, game_id, name, description) VALUES (1, 1, "Test Room", "A test room")');
  
  // Create services
  const grokClient = new GrokClient({ mockMode: true });
  const regionService = new RegionService(db);
  const itemService = new ItemService(db);
  const itemGenerationService = new ItemGenerationService(db, itemService);
  const roomGenerationService = new RoomGenerationService(
    db,
    grokClient,
    regionService,
    itemGenerationService,
    { enableDebugLogging: true }
  );
  
  console.log('📍 Generating a new room with items...\n');
  
  // Generate a room
  const result = await roomGenerationService.generateSingleRoom({
    gameId: 1,
    fromRoomId: 1,
    direction: 'north',
    theme: 'library'
  });
  
  if (!result.success) {
    console.error('❌ Room generation failed:', result.error);
    await db.close();
    return;
  }
  
  console.log(`\n✅ Room created with ID: ${result.roomId}`);
  
  // Check for items
  const roomItems = await itemService.getRoomItems(result.roomId!);
  
  console.log(`\n📦 Items in the room: ${roomItems.length}`);
  
  if (roomItems.length > 0) {
    console.log('\nItems found:');
    for (const roomItem of roomItems) {
      const itemType = roomItem.item.is_fixed ? '🏛️ Fixed' : '💎 Portable';
      console.log(`  ${itemType}: ${roomItem.item.name}`);
      console.log(`    Description: ${roomItem.item.description}`);
    }
  } else {
    console.log('\n⚠️ No items were generated!');
    console.log('Check that:');
    console.log('  - AI_ITEM_GENERATION_ENABLED is not set to false');
    console.log('  - Mock AI is returning items in the response');
  }
  
  await db.close();
}

// Run the test
testItemGeneration().catch(console.error);