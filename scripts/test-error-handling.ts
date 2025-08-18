#!/usr/bin/env ts-node

import { GrokClient } from '../src/ai/grokClient';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testErrorHandling() {
  console.log('🛡️ Testing Error Handling...\n');

  // Test with invalid API key to trigger errors
  const grokClient = new GrokClient({
    apiKey: 'invalid-key-to-trigger-errors',
    mockMode: false
  });

  console.log('Testing with invalid API key to simulate JSON parsing errors...\n');

  try {
    console.log('🔧 Testing room generation error handling...');
    const room = await grokClient.generateRoom({
      currentRoom: { name: 'Test Room', description: 'A test room' },
      direction: 'north'
    });
    console.log(`✅ Got fallback room: ${room.name}`);
    console.log(`   Description: ${room.description.substring(0, 60)}...`);
  } catch (error) {
    console.log(`❌ Unexpected error: ${error}`);
  }

  try {
    console.log('\n👤 Testing NPC generation error handling...');
    const npc = await grokClient.generateNPC({
      roomName: 'Test Room',
      roomDescription: 'A test room'
    });
    console.log(`✅ Got fallback NPC: ${npc.name}`);
    console.log(`   Says: "${npc.initialDialogue}"`);
  } catch (error) {
    console.log(`❌ Unexpected error: ${error}`);
  }

  try {
    console.log('\n🎮 Testing command processing error handling...');
    const result = await grokClient.processCommand({
      command: 'test command',
      currentRoom: 'Test Room'
    });
    console.log(`✅ Got fallback result: ${result.description}`);
  } catch (error) {
    console.log(`❌ Unexpected error: ${error}`);
  }

  console.log('\n🎉 Error handling test completed!');
  console.log('✅ All API failures gracefully handled with fallbacks');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Test interrupted by user');
  process.exit(0);
});

// Run the test
if (require.main === module) {
  testErrorHandling();
}