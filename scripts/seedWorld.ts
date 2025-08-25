#!/usr/bin/env ts-node

import { YamlWorldService } from '../src/services/yamlWorldService';
import * as path from 'path';

async function seedWorld() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npm run db:seed <yaml-file>');
    console.log('Example: npm run db:seed worlds/starting-region.yml');
    process.exit(1);
  }

  const yamlFile = args[0];
  const yamlPath = path.resolve(yamlFile);

  console.log(`🌍 Seeding world from: ${yamlPath}`);

  try {
    const yamlWorldService = new YamlWorldService();
    const result = await yamlWorldService.createWorldFromYaml(yamlPath);

    console.log('✅ World seeded successfully!');
    console.log(`📊 Game ID: ${result.gameId}`);
    console.log(`🏠 Rooms: ${result.roomCount}`);
    console.log(`🗺️  Regions: ${result.regionCount}`);
    console.log(`🔗 Connections: ${result.connectionCount}`);
    console.log(`🎯 Starting Room ID: ${result.startingRoomId}`);
    
    if (result.itemCount) {
      console.log(`📦 Items: ${result.itemCount}`);
    }
    
    if (result.characterCount) {
      console.log(`👥 Characters: ${result.characterCount}`);
    }

    console.log('');
    console.log('🎮 Ready to play! Run `npm run dev` to start the game.');

  } catch (error) {
    console.error('❌ Failed to seed world:');
    console.error(error);
    process.exit(1);
  }
}

// Run the seeding if this script is called directly
if (require.main === module) {
  seedWorld();
}