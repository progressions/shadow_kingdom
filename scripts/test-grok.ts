#!/usr/bin/env ts-node

import { GrokClient } from '../src/ai/grokClient';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testGrokIntegration() {
  console.log('🤖 Testing Grok API Integration...\n');

  // Check if API key is configured
  if (!process.env.GROK_API_KEY) {
    console.error('❌ GROK_API_KEY not found in .env file');
    console.log('Please add your Grok API key to .env:');
    console.log('GROK_API_KEY=your_api_key_here');
    process.exit(1);
  }

  try {
    // Initialize Grok client
    const grokClient = new GrokClient();
    console.log('✅ Grok client initialized');

    // Test 1: Simple room generation
    console.log('\n📍 Test 1: Room Generation');
    console.log('Prompt: Generate a room north of the Library...');
    
    const roomResult = await grokClient.generateRoom({
      currentRoom: {
        name: 'Library',
        description: 'A cozy library filled with ancient books and scrolls'
      },
      direction: 'north'
    });
    
    console.log('🏰 Generated Room:');
    console.log(`   Name: ${roomResult.name}`);
    console.log(`   Description: ${roomResult.description}`);
    if (roomResult.connections && roomResult.connections.length > 0) {
      console.log('   Connections:');
      roomResult.connections.forEach(conn => {
        console.log(`     - ${conn.direction}: ${conn.name || 'No name'}`);
      });
    }

    // Test 2: NPC generation
    console.log('\n👤 Test 2: NPC Generation');
    console.log('Prompt: Generate an NPC for the Library...');
    
    const npcResult = await grokClient.generateNPC({
      roomName: 'Library',
      roomDescription: 'A cozy library filled with ancient books and scrolls'
    });
    
    console.log('👤 Generated NPC:');
    console.log(`   Name: ${npcResult.name}`);
    console.log(`   Description: ${npcResult.description}`);
    console.log(`   Personality: ${npcResult.personality}`);
    if (npcResult.initialDialogue) {
      console.log(`   Says: "${npcResult.initialDialogue}"`);
    }

    // Test 3: Command processing
    console.log('\n🎮 Test 3: Command Processing');
    console.log('Prompt: Process command "examine the mysterious book"...');
    
    const commandResult = await grokClient.processCommand({
      command: 'examine the mysterious book on the table',
      currentRoom: 'Library'
    });
    
    console.log('🎮 Command Result:');
    console.log(`   Success: ${commandResult.success}`);
    console.log(`   Description: ${commandResult.description}`);
    if (commandResult.stateChange) {
      console.log(`   State Change: ${JSON.stringify(commandResult.stateChange)}`);
    }

    // Show usage statistics
    console.log('\n📊 API Usage Statistics:');
    const stats = grokClient.getUsageStats();
    console.log(`   Tokens Used: ${stats.tokensUsed.input} input, ${stats.tokensUsed.output} output`);
    console.log(`   Estimated Cost: ${stats.estimatedCost}`);

    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ Grok integration is working correctly');

  } catch (error) {
    console.error('\n❌ Error testing Grok integration:');
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      if (error.message.includes('401')) {
        console.error('   This looks like an authentication error. Check your API key.');
      } else if (error.message.includes('429')) {
        console.error('   Rate limit hit. Wait a moment and try again.');
      } else if (error.message.includes('Network')) {
        console.error('   Network error. Check your internet connection.');
      }
    } else {
      console.error(`   ${error}`);
    }
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Test interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  console.error('\n💥 Unhandled promise rejection:', reason);
  process.exit(1);
});

// Run the test
if (require.main === module) {
  testGrokIntegration();
}