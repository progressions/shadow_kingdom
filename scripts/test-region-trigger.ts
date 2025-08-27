#!/usr/bin/env ts-node

import { PrismaService } from '../src/services/prismaService';
import { GameStateManager } from '../src/services/gameStateManager';
import { ClaudeRegionService } from '../src/services/claudeRegionService';
import { RoomNavigationEngine } from '../src/services/roomNavigationEngine';

async function testRegionTrigger() {
  // Set mock mode for testing
  process.env.CLAUDE_MOCK_MODE = 'true';
  
  const prismaService = PrismaService.getInstance();
  const gameStateManager = new GameStateManager(prismaService);
  const claudeRegionService = new ClaudeRegionService(prismaService, gameStateManager);
  const navigationEngine = new RoomNavigationEngine(gameStateManager, prismaService, claudeRegionService);
  
  try {
    await prismaService.connect();
    
    console.log('🧪 Testing Region Generation Triggers\n');
    
    // Find a game
    const game = await prismaService.client.game.findFirst({
      orderBy: { updatedAt: 'desc' }
    });
    
    if (!game) {
      console.log('❌ No game found. Please start a game first.');
      return;
    }
    
    console.log(`✅ Found game ${game.id}`);
    
    // Find a room at a region boundary
    const connections = await prismaService.client.connection.findMany({
      where: {
        fromRoom: {
          gameId: game.id
        },
        toRoomId: null // Unfilled connections
      },
      include: {
        fromRoom: true
      }
    });
    
    if (connections.length === 0) {
      console.log('❌ No unfilled connections found (no region boundaries)');
      return;
    }
    
    const boundaryConnection = connections[0];
    console.log(`\n📍 Found boundary at:`);
    console.log(`   Room: ${boundaryConnection.fromRoom.name} (ID: ${boundaryConnection.fromRoomId})`);
    console.log(`   Direction: ${boundaryConnection.direction} (unfilled)\n`);
    
    // Check boundary detection
    console.log('🔍 Testing boundary detection...');
    const boundaryInfo = await navigationEngine.checkRegionBoundary(boundaryConnection.fromRoomId);
    console.log(`   Is at boundary: ${boundaryInfo.isAtBoundary}`);
    console.log(`   Unfilled directions: ${boundaryInfo.unfilledDirections.join(', ')}`);
    
    // Initialize game state
    await gameStateManager.initializeGame(game);
    await gameStateManager.setCurrentRoom(boundaryConnection.fromRoomId);
    
    // Test triggering generation
    console.log('\n🚀 Triggering region generation...');
    await navigationEngine.triggerBoundaryGeneration(
      boundaryConnection.fromRoomId, 
      boundaryConnection.direction
    );
    
    // Check generation status
    const status = claudeRegionService.getGenerationStatus(game.id, boundaryConnection.direction);
    console.log(`   Generation status: ${status?.phase || 'not started'}`);
    
    if (status?.phase === 'generating-theme' || status?.phase === 'generating-rooms') {
      console.log('   ⏳ Generation in progress...');
      
      // Wait for completion (max 10 seconds)
      let waitTime = 0;
      while (waitTime < 10000) {
        await new Promise(resolve => setTimeout(resolve, 500));
        waitTime += 500;
        
        const currentStatus = claudeRegionService.getGenerationStatus(game.id, boundaryConnection.direction);
        if (currentStatus?.phase === 'complete') {
          console.log(`   ✅ Generation completed in ${waitTime}ms`);
          break;
        } else if (currentStatus?.phase === 'failed') {
          console.log(`   ❌ Generation failed: ${currentStatus.error}`);
          break;
        }
      }
    }
    
    // Check if connection is now filled
    console.log('\n🔗 Checking if connection is filled...');
    const updatedConnection = await prismaService.client.connection.findFirst({
      where: { id: boundaryConnection.id },
      include: { toRoom: true }
    });
    
    if (updatedConnection?.toRoomId) {
      console.log(`   ✅ Connection filled! Now leads to:`);
      console.log(`      Room: ${updatedConnection.toRoom?.name}`);
      console.log(`      Region: ${updatedConnection.toRoom?.regionId}`);
      
      // Check reverse connection
      const reverseConnection = await prismaService.client.connection.findFirst({
        where: {
          fromRoomId: updatedConnection.toRoomId,
          toRoomId: boundaryConnection.fromRoomId
        }
      });
      
      if (reverseConnection) {
        console.log(`   ✅ Reverse connection exists (${reverseConnection.direction})`);
      } else {
        console.log(`   ❌ No reverse connection found`);
      }
    } else {
      console.log(`   ❌ Connection still unfilled`);
    }
    
    // Count new rooms created
    const newRegion = await prismaService.client.region.findFirst({
      where: { gameId: game.id },
      orderBy: { id: 'desc' },
      include: {
        rooms: true
      }
    });
    
    if (newRegion) {
      console.log(`\n🏰 New region created:`);
      console.log(`   Name: ${newRegion.name}`);
      console.log(`   Theme: ${newRegion.theme}`);
      console.log(`   Rooms: ${newRegion.rooms.length}`);
    }
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prismaService.disconnect();
  }
}

testRegionTrigger().catch(console.error);