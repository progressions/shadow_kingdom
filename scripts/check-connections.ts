#!/usr/bin/env ts-node

import { PrismaService } from '../src/services/prismaService';

async function checkConnections() {
  const prismaService = PrismaService.getInstance();
  
  try {
    await prismaService.connect();
    
    // Get the current game
    const game = await prismaService.client.game.findFirst({
      orderBy: { updatedAt: 'desc' }
    });
    
    if (!game) {
      console.log('No game found.');
      return;
    }
    
    console.log('🔍 Checking connections between regions\n');
    
    // Check Castle Gatehouse connections
    const castleGatehouse = await prismaService.client.room.findFirst({
      where: {
        gameId: game.id,
        name: 'Castle Gatehouse'
      }
    });
    
    if (castleGatehouse) {
      console.log(`📍 Castle Gatehouse (Room ${castleGatehouse.id}, Region ${castleGatehouse.regionId})`);
      
      // Get all connections from this room
      const connections = await prismaService.client.connection.findMany({
        where: { fromRoomId: castleGatehouse.id },
        include: { toRoom: true }
      });
      
      console.log(`   Exits from Castle Gatehouse:`);
      connections.forEach(conn => {
        if (conn.toRoomId) {
          console.log(`   - ${conn.direction}: to "${conn.toRoom?.name}" (Room ${conn.toRoomId}, Region ${conn.toRoom?.regionId})`);
        } else {
          console.log(`   - ${conn.direction}: UNFILLED`);
        }
      });
    }
    
    // Check the AI-generated entrance room
    const aiEntrance = await prismaService.client.room.findFirst({
      where: {
        gameId: game.id,
        name: { contains: 'crystalline caverns - Room 1' }
      }
    });
    
    if (aiEntrance) {
      console.log(`\n📍 AI-Generated Entrance (Room ${aiEntrance.id}, Region ${aiEntrance.regionId})`);
      
      // Get all connections from this room
      const connections = await prismaService.client.connection.findMany({
        where: { fromRoomId: aiEntrance.id },
        include: { toRoom: true }
      });
      
      console.log(`   Exits from AI entrance:`);
      connections.forEach(conn => {
        if (conn.toRoomId) {
          console.log(`   - ${conn.direction}: to "${conn.toRoom?.name}" (Room ${conn.toRoomId}, Region ${conn.toRoom?.regionId})`);
        } else {
          console.log(`   - ${conn.direction}: UNFILLED`);
        }
      });
    }
    
    // Check for broken connections
    console.log('\n⚠️  Checking for missing reverse connections:\n');
    
    const allConnections = await prismaService.client.connection.findMany({
      where: {
        fromRoom: { gameId: game.id },
        toRoomId: { not: null }
      },
      include: {
        fromRoom: true,
        toRoom: true
      }
    });
    
    for (const conn of allConnections) {
      // For each connection, check if reverse exists
      const oppositeDir = getOppositeDirection(conn.direction);
      const reverseConn = await prismaService.client.connection.findFirst({
        where: {
          fromRoomId: conn.toRoomId!,
          direction: oppositeDir,
          toRoomId: conn.fromRoomId
        }
      });
      
      if (!reverseConn) {
        console.log(`   ❌ Missing reverse connection:`);
        console.log(`      From: ${conn.fromRoom.name} (${conn.fromRoomId})`);
        console.log(`      To: ${conn.toRoom?.name} (${conn.toRoomId})`);
        console.log(`      Direction: ${conn.direction}`);
        console.log(`      Missing: ${oppositeDir} from Room ${conn.toRoomId} back to Room ${conn.fromRoomId}`);
        console.log();
      }
    }
    
    console.log('✅ Connection check complete');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prismaService.disconnect();
  }
}

function getOppositeDirection(direction: string): string {
  const opposites: Record<string, string> = {
    north: 'south',
    south: 'north',
    east: 'west',
    west: 'east',
    northeast: 'southwest',
    northwest: 'southeast',
    southeast: 'northwest',
    southwest: 'northeast',
    up: 'down',
    down: 'up'
  };
  return opposites[direction] || direction;
}

checkConnections().catch(console.error);