#!/usr/bin/env ts-node

import { PrismaService } from '../src/services/prismaService';

async function examineWorldStructure() {
  const prismaService = PrismaService.getInstance();
  
  try {
    await prismaService.connect();
    
    // Get the current game
    const game = await prismaService.client.game.findFirst({
      orderBy: { updatedAt: 'desc' },
      include: {
        currentRoom: true,
      },
    });
    
    if (!game) {
      console.log('No game found. Please start a new game first.');
      return;
    }
    
    console.log('🎮 Current Game:');
    console.log(`   ID: ${game.id}`);
    console.log(`   Current Room: ${game.currentRoom?.name} (ID: ${game.currentRoomId})`);
    console.log(`   Room Count: ${game.roomCount}`);
    console.log();
    
    // Get all regions
    const regions = await prismaService.client.region.findMany({
      where: { gameId: game.id },
      include: {
        rooms: {
          orderBy: { id: 'asc' },
        },
      },
    });
    
    console.log('🗺️  Regions in Game:');
    regions.forEach(region => {
      console.log(`\n   Region ${region.id}: ${region.name}`);
      console.log(`   Theme: ${region.theme || 'N/A'}`);
      console.log(`   Description: ${region.description}`);
      console.log(`   Rooms (${region.rooms.length}):`);
      
      region.rooms.forEach(room => {
        const marker = room.id === game.currentRoomId ? ' 📍' : '';
        console.log(`      - Room ${room.id}: ${room.name}${marker}`);
      });
    });
    
    // Get all connections
    const connections = await prismaService.client.connection.findMany({
      where: {
        fromRoom: {
          gameId: game.id,
        },
      },
      include: {
        fromRoom: true,
        toRoom: true,
      },
      orderBy: { fromRoomId: 'asc' },
    });
    
    console.log('\n🔗 Room Connections:');
    
    // Group connections by room
    const connectionMap = new Map<number, any[]>();
    connections.forEach(conn => {
      if (!connectionMap.has(conn.fromRoomId)) {
        connectionMap.set(conn.fromRoomId, []);
      }
      connectionMap.get(conn.fromRoomId)!.push(conn);
    });
    
    // Find rooms at region boundaries (rooms that connect to null or different regions)
    console.log('\n🚪 Potential Region Boundaries:');
    let boundaryFound = false;
    
    for (const [roomId, conns] of connectionMap.entries()) {
      const room = await prismaService.client.room.findUnique({
        where: { id: roomId },
        include: { region: true },
      });
      
      for (const conn of conns) {
        // Check if connection leads to null (unexplored) or different region
        if (!conn.toRoomId) {
          console.log(`   Room ${roomId} (${room?.name}) in Region ${room?.regionId}`);
          console.log(`      → ${conn.direction} leads to: UNEXPLORED (potential new region)`);
          boundaryFound = true;
        } else if (conn.toRoom && conn.toRoom.regionId !== room?.regionId) {
          console.log(`   Room ${roomId} (${room?.name}) in Region ${room?.regionId}`);
          console.log(`      → ${conn.direction} leads to: Region ${conn.toRoom.regionId}`);
          boundaryFound = true;
        }
      }
    }
    
    if (!boundaryFound) {
      console.log('   No region boundaries found. All rooms are within the same region.');
    }
    
    // Find path from starting room to boundary
    console.log('\n🗺️  Path from Starting Room to Region Boundaries:');
    
    const startingRoomName = 'Grand Entrance Hall';
    const startingRoom = await prismaService.client.room.findFirst({
      where: {
        gameId: game.id,
        name: startingRoomName,
      },
    });
    
    if (startingRoom) {
      console.log(`   Starting from: ${startingRoom.name} (Room ${startingRoom.id})`);
      
      // Simple BFS to find shortest path to any boundary
      const visited = new Set<number>();
      const queue: { roomId: number; path: string[] }[] = [
        { roomId: startingRoom.id, path: [] },
      ];
      
      let foundPath = false;
      
      while (queue.length > 0 && !foundPath) {
        const { roomId, path } = queue.shift()!;
        
        if (visited.has(roomId)) continue;
        visited.add(roomId);
        
        const roomConns = connectionMap.get(roomId) || [];
        
        for (const conn of roomConns) {
          const newPath = [...path, `${conn.direction} to ${conn.toRoom?.name || 'UNEXPLORED'}`];
          
          // Check if this is a boundary
          if (!conn.toRoomId || (conn.toRoom && conn.toRoom.regionId !== startingRoom.regionId)) {
            console.log('\n   ✅ Found path to region boundary:');
            newPath.forEach((step, i) => {
              console.log(`      ${i + 1}. Go ${step}`);
            });
            foundPath = true;
            break;
          }
          
          // Add to queue if not visited
          if (conn.toRoomId && !visited.has(conn.toRoomId)) {
            queue.push({ roomId: conn.toRoomId, path: newPath });
          }
        }
      }
      
      if (!foundPath) {
        console.log('   No path to region boundary found from starting room.');
      }
    } else {
      console.log('   Starting room not found.');
    }
    
    // Check if Claude region generation was triggered
    console.log('\n🤖 Claude Region Generation Status:');
    console.log('   Note: Region generation only triggers if CLAUDE_API_KEY or CLAUDE_MOCK_MODE is set');
    console.log('   Check if new regions will be generated to the north when game starts');
    
  } catch (error) {
    console.error('Error examining world structure:', error);
  } finally {
    await prismaService.disconnect();
  }
}

examineWorldStructure().catch(console.error);