#!/usr/bin/env ts-node

import { PrismaService } from '../src/services/prismaService';

async function checkDatabase() {
  const prismaService = PrismaService.getInstance();
  
  try {
    console.log('🔍 Checking database contents...\n');

    // Get the latest game
    const latestGame = await prismaService.game.findFirst({
      orderBy: { id: 'desc' }
    });

    if (!latestGame) {
      console.log('❌ No games found in database');
      return;
    }

    console.log(`📊 Latest Game ID: ${latestGame.id}`);
    console.log(`🎯 Current Room ID: ${latestGame.currentRoomId}`);
    console.log(`🏠 Room Count: ${latestGame.roomCount}\n`);

    // Check regions
    const regions = await prismaService.region.findMany({
      where: { gameId: latestGame.id }
    });
    console.log(`🗺️  Regions (${regions.length}):`);
    regions.forEach(region => {
      console.log(`  - ${region.name} (${region.theme}): ${region.description}`);
    });
    console.log('');

    // Check rooms
    const rooms = await prismaService.room.findMany({
      where: { gameId: latestGame.id },
      include: { region: true },
      take: 5
    });
    console.log(`🏠 Rooms (showing first 5 of ${latestGame.roomCount}):`);
    rooms.forEach(room => {
      console.log(`  - ${room.name} (${room.region?.name || 'No Region'})`);
      console.log(`    ${room.description}`);
    });
    console.log('');

    // Check connections
    const connections = await prismaService.connection.findMany({
      where: { gameId: latestGame.id },
      include: { fromRoom: true, toRoom: true },
      take: 5
    });
    console.log(`🔗 Connections (showing first 5):`);
    connections.forEach(conn => {
      console.log(`  - ${conn.fromRoom.name} → ${conn.direction} → ${conn.toRoom?.name || 'UNFILLED'}`);
      if (conn.locked) console.log(`    🔒 Locked (requires: ${conn.requiredKey})`);
    });
    console.log('');

    // Check items
    const items = await prismaService.client.item.findMany({
      where: { gameId: latestGame.id },
      include: { room: true }
    });
    console.log(`📦 Items (${items.length}):`);
    items.forEach((item: any) => {
      console.log(`  - ${item.name} (${item.type}) in ${item.room?.name || 'No Room'}`);
      console.log(`    ${item.description}`);
      if (item.value) console.log(`    Value: ${item.value}`);
      if (item.hidden) console.log(`    🔍 Hidden item`);
    });
    console.log('');

    // Check characters
    const characters = await prismaService.client.character.findMany({
      where: { gameId: latestGame.id },
      include: { room: true }
    });
    console.log(`👥 Characters (${characters.length}):`);
    characters.forEach((character: any) => {
      console.log(`  - ${character.name} (${character.sentiment}) in ${character.room.name}`);
      console.log(`    ${character.description}`);
      console.log(`    HP: ${character.health}/${character.maxHealth}, Attack: ${character.attack}, Defense: ${character.defense}`);
      if (character.dialogueHostile) console.log(`    Says: "${character.dialogueHostile}"`);
    });
    console.log('');

    // Check for starting room
    const startingRoom = await prismaService.room.findFirst({
      where: { 
        gameId: latestGame.id,
        id: latestGame.currentRoomId! 
      }
    });
    if (startingRoom) {
      console.log(`🚪 Starting Room: ${startingRoom.name}`);
      console.log(`   ${startingRoom.description}`);
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prismaService.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  checkDatabase();
}