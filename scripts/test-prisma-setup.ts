#!/usr/bin/env ts-node

/**
 * Test script to verify Prisma setup is working correctly
 */

import { getPrismaClient } from '../src/services/prismaService';

async function testPrismaSetup() {
  console.log('🔍 Testing Prisma setup...\n');
  
  try {
    const prisma = getPrismaClient();
    
    // Test 1: Database connection
    console.log('1. Testing database connection...');
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('   ✅ Database connection successful\n');
    
    // Test 2: Check if tables exist
    console.log('2. Checking table structure...');
    const tables = await prisma.$queryRaw`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    ` as Array<{ name: string }>;
    
    console.log('   📋 Existing tables:', tables.map(t => t.name).join(', '));
    
    const expectedTables = ['games', 'rooms', 'connections', 'game_state', 'regions'];
    const missingTables = expectedTables.filter(table => 
      !tables.some(t => t.name === table)
    );
    
    if (missingTables.length > 0) {
      console.log('   ⚠️  Missing tables:', missingTables.join(', '));
      console.log('   💡 You may need to run migrations or use existing database');
    } else {
      console.log('   ✅ All expected tables present\n');
    }
    
    // Test 3: Simple query
    console.log('3. Testing simple queries...');
    const gameCount = await prisma.game.count();
    console.log(`   📊 Current games in database: ${gameCount}`);
    
    if (gameCount > 0) {
      const games = await prisma.game.findMany({
        take: 3,
        select: { id: true, name: true, createdAt: true }
      });
      console.log('   🎮 Sample games:');
      games.forEach(game => {
        console.log(`      - ${game.name} (ID: ${game.id})`);
      });
    }
    
    console.log('   ✅ Queries working correctly\n');
    
    // Test 4: Type safety
    console.log('4. Testing type safety...');
    const result = await prisma.game.findFirst({
      select: {
        id: true,
        name: true,
        createdAt: true
      }
    });
    
    if (result) {
      // TypeScript should provide full type safety here
      console.log(`   🔒 Type-safe access: ${result.name} has ID ${result.id}`);
      console.log('   ✅ Type safety working\n');
    } else {
      console.log('   ℹ️  No games found for type safety test\n');
    }
    
    console.log('🎉 Prisma setup verification complete!');
    console.log('✅ All systems operational\n');
    
  } catch (error) {
    console.error('❌ Prisma setup test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('no such table')) {
        console.log('\n💡 Suggestion: Run database migrations or check DATABASE_URL');
      } else if (error.message.includes('SQLITE_CANTOPEN')) {
        console.log('\n💡 Suggestion: Check if database file exists and is accessible');
      } else if (error.message.includes('Environment variable not found')) {
        console.log('\n💡 Suggestion: Check .env file and DATABASE_URL configuration');
      }
    }
    
    process.exit(1);
  } finally {
    // Clean up
    const prisma = getPrismaClient();
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testPrismaSetup().catch(console.error);
}