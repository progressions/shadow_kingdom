#!/usr/bin/env ts-node

import { PrismaService } from '../src/services/prismaService';

async function findGeneratedRegions() {
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
    console.log();
    
    // Get all regions sorted by ID (newer regions have higher IDs)
    const regions = await prismaService.client.region.findMany({
      where: { gameId: game.id },
      orderBy: { id: 'asc' },
      include: {
        rooms: {
          orderBy: { id: 'asc' },
        },
      },
    });
    
    console.log('🗺️  All Regions in Game:');
    regions.forEach((region, index) => {
      const isGenerated = region.id > 2; // Regions 1-2 are seeded, 3+ are generated
      const marker = isGenerated ? ' 🤖 (AI Generated)' : ' 📜 (Seeded)';
      console.log(`\n   Region ${region.id}: ${region.name}${marker}`);
      console.log(`   Theme: ${region.theme || 'N/A'}`);
      console.log(`   Description: ${region.description}`);
      console.log(`   Rooms (${region.rooms.length}): ${region.rooms.map(r => r.name).slice(0, 3).join(', ')}...`);
    });
    
    // Find connections to generated regions
    console.log('\n🚪 How to reach AI-generated regions:\n');
    
    for (const region of regions) {
      if (region.id <= 2) continue; // Skip seeded regions
      
      // Find connections that lead to this region
      const connectionsToRegion = await prismaService.client.connection.findMany({
        where: {
          toRoom: {
            regionId: region.id,
          },
          fromRoom: {
            regionId: {
              not: region.id, // From a different region
            },
          },
        },
        include: {
          fromRoom: true,
          toRoom: true,
        },
        take: 1, // Just show one path
      });
      
      if (connectionsToRegion.length > 0) {
        const conn = connectionsToRegion[0];
        console.log(`   To reach "${region.name}" (Region ${region.id}):`);
        console.log(`      From: ${conn.fromRoom.name} (Region ${conn.fromRoom.regionId})`);
        console.log(`      Go: ${conn.direction}`);
        console.log(`      To: ${conn.toRoom?.name || 'Unknown'} (entrance to Region ${region.id})`);
        
        // Try to find path from starting room
        const path = await findPathFromStart(prismaService, game.id, conn.fromRoomId);
        if (path.length > 0) {
          console.log(`\n      📍 Full path from Grand Entrance Hall:`);
          path.forEach((step, i) => {
            console.log(`         ${i + 1}. ${step}`);
          });
        }
        console.log();
      }
    }
    
    // Show unfilled connections (potential future regions)
    const unfilledConnections = await prismaService.client.connection.findMany({
      where: {
        fromRoom: {
          gameId: game.id,
        },
        toRoomId: null,
      },
      include: {
        fromRoom: true,
      },
    });
    
    if (unfilledConnections.length > 0) {
      console.log('🔮 Unfilled connections (will trigger generation when approached):');
      unfilledConnections.forEach(conn => {
        console.log(`   From ${conn.fromRoom.name}: ${conn.direction} (not yet generated)`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prismaService.disconnect();
  }
}

async function findPathFromStart(
  prisma: PrismaService, 
  gameId: number, 
  targetRoomId: number
): Promise<string[]> {
  // Find starting room
  const startRoom = await prisma.client.room.findFirst({
    where: {
      gameId,
      name: 'Grand Entrance Hall',
    },
  });
  
  if (!startRoom || startRoom.id === targetRoomId) {
    return [];
  }
  
  // BFS to find path
  const visited = new Set<number>();
  const queue: { roomId: number; path: string[] }[] = [
    { roomId: startRoom.id, path: [] },
  ];
  
  while (queue.length > 0) {
    const { roomId, path } = queue.shift()!;
    
    if (roomId === targetRoomId) {
      return path;
    }
    
    if (visited.has(roomId)) continue;
    visited.add(roomId);
    
    const connections = await prisma.client.connection.findMany({
      where: { 
        fromRoomId: roomId,
        toRoomId: { not: null },
      },
      include: {
        toRoom: true,
      },
    });
    
    for (const conn of connections) {
      if (conn.toRoomId && !visited.has(conn.toRoomId)) {
        queue.push({
          roomId: conn.toRoomId,
          path: [...path, `Go ${conn.direction} to ${conn.toRoom?.name}`],
        });
      }
    }
  }
  
  return [];
}

findGeneratedRegions().catch(console.error);