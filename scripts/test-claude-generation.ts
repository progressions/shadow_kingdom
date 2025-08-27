#!/usr/bin/env ts-node

/**
 * Test script to demonstrate Claude's region generation output
 * Run with: npx ts-node scripts/test-claude-generation.ts
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../src/services/prismaService';
import { GameStateManager } from '../src/services/gameStateManager';
import { ClaudeRegionService } from '../src/services/claudeRegionService';

dotenv.config();

async function testClaudeGeneration() {
  // Create output file
  const outputPath = path.join(process.cwd(), 'claude-output.txt');
  let output = '';
  
  // Helper function to log to both console and file
  const log = (message: string = '') => {
    console.log(message);
    output += message + '\n';
  };
  
  log('🧪 Testing Claude Region Generation\n');
  log('=' .repeat(60));
  
  // Check if we're in mock mode or using real API
  const isMockMode = process.env.CLAUDE_MOCK_MODE === 'true' || !process.env.CLAUDE_API_KEY;
  
  if (isMockMode) {
    log('📌 Running in MOCK MODE (no API calls will be made)');
    log('   To use real Claude API, set CLAUDE_API_KEY in .env\n');
  } else {
    log('🔌 Using REAL Claude API');
    log('   API Key: ' + process.env.CLAUDE_API_KEY?.substring(0, 20) + '...\n');
  }
  
  log('=' .repeat(60));
  
  // Initialize services
  const prismaService = PrismaService.getInstance();
  await prismaService.connect();
  
  const gameStateManager = new GameStateManager(prismaService);
  const claudeRegionService = new ClaudeRegionService(prismaService, gameStateManager);
  
  try {
    // Test 1: Generate a region theme
    log('\n📍 TEST 1: Generate Region Theme');
    log('-' .repeat(40));
    
    const themeContext = {
      direction: 'north',
      worldSeed: 'test-seed-123',
      previousRegion: {
        name: 'Shadow Castle',
        theme: 'abandoned fortress'
      }
    };
    
    log('Input Context:' + JSON.stringify(themeContext, null, 2));
    log('\nGenerating theme...');
    
    // Use reflection to call private method for testing
    const generateTheme = (claudeRegionService as any).generateRegionTheme.bind(claudeRegionService);
    const theme = await generateTheme(themeContext);
    
    log('\n✅ Generated Theme Response:');
    log(JSON.stringify(theme, null, 2));
    
    // Test 2: Generate room batch
    log('\n\n📍 TEST 2: Generate Room Batch');
    log('-' .repeat(40));
    
    const roomContext = {
      regionTheme: theme,
      entranceDirection: 'south',
      exitDirection: 'north',
      guardianRoomIndex: 7,
      keyRoomIndex: 4
    };
    
    log('Room Context:');
    log(`- Guardian in room: ${roomContext.guardianRoomIndex}`);
    log(`- Key in room: ${roomContext.keyRoomIndex}`);
    log(`- Entrance from: ${roomContext.entranceDirection}`);
    log(`- Exit to: ${roomContext.exitDirection}`);
    
    log('\nGenerating 12 rooms...');
    
    // Use reflection to call private method for testing
    const generateRooms = (claudeRegionService as any).generateRoomBatch.bind(claudeRegionService);
    const rooms = await generateRooms(roomContext);
    
    log('\n✅ Generated Rooms:');
    
    // Display rooms in a formatted way
    rooms.forEach((room: any) => {
      log(`\n  Room ${room.index}: ${room.name}`);
      log(`  ${'-'.repeat(room.name.length + 8)}`);
      log(`  ${room.description}`);
      
      if (room.hasGuardian) {
        log(`  ⚔️ GUARDIAN: ${theme.guardianConcept.name} is here!`);
      }
      if (room.hasKey) {
        log(`  🗝️ KEY: ${theme.keyConcept.name} can be found here!`);
      }
      if (room.connections && room.connections.length > 0) {
        log(`  Exits: ${room.connections.join(', ')}`);
      }
    });
    
    // Test 3: Show what gets stored in the database
    log('\n\n📍 TEST 3: Database Storage Preview');
    log('-' .repeat(40));
    
    log('Region record that would be created:');
    const regionData = {
      name: theme.name,
      theme: theme.theme,
      description: theme.description,
      atmosphere: theme.atmosphere
    };
    log(JSON.stringify(regionData, null, 2));
    
    log('\nSample room records (first 3 rooms):');
    rooms.slice(0, 3).forEach((room: any) => {
      const roomData = {
        name: room.name,
        description: room.description,
        extendedDescription: room.hasGuardian 
          ? `The ${theme.guardianConcept.name} guards this room.`
          : room.hasKey
          ? `The ${theme.keyConcept.name} can be found here.`
          : null,
        visited: false,
        locked: false
      };
      log('\n' + JSON.stringify(roomData, null, 2));
    });
    
  } catch (error) {
    log('\n❌ Error during generation:' + error);
    if (error instanceof Error) {
      log('Error details:' + error.message);
      log('Stack:' + error.stack);
    }
  } finally {
    await prismaService.disconnect();
    log('\n\n✨ Test complete!');
    
    // Write output to file
    fs.writeFileSync(outputPath, output);
    console.log(`\n📄 Output saved to: ${outputPath}`);
    console.log('   You can open this file to see the full Claude response!');
  }
}

// Run the test
testClaudeGeneration().catch(console.error);