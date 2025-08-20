const { setupTestDatabase, cleanupTestDatabase } = require('./tests/prisma/setup');

async function debugPrismaTest() {
  console.log('Setting up test database...');
  const prisma = await setupTestDatabase();
  
  console.log('Trying to query connection table...');
  try {
    // Try to query the connections table to see its structure
    const result = await prisma.$executeRaw`PRAGMA table_info(connections)`;
    console.log('Connection table info:', result);
    
    // Try to create a connection with processing column
    await prisma.connection.create({
      data: {
        gameId: 1,
        fromRoomId: 1,
        toRoomId: null,
        direction: 'north',
        name: 'test connection',
        processing: false
      }
    });
    console.log('Successfully created connection with processing column');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await cleanupTestDatabase();
  }
}

debugPrismaTest().catch(console.error);