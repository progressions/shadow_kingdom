import { PrismaService } from '../../src/services/prismaService';
import { PrismaClient } from '../../src/generated/prisma';

/**
 * Prisma Test Utilities
 * 
 * Provides utilities for testing with Prisma in isolated environments.
 * Uses in-memory SQLite databases for fast, isolated tests.
 */

/**
 * Setup test database with clean state
 */
export async function setupTestDatabase(): Promise<PrismaClient> {
  // Reset Prisma service to ensure clean state
  PrismaService.reset();
  
  // Get Prisma client (will create new instance)
  const prisma = PrismaService.getInstance().getClient();
  
  // Create the database schema manually for tests
  // This is faster than running full migrations
  await prisma.$executeRaw`PRAGMA foreign_keys = ON`;
  
  // Create tables based on our schema
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "games" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL UNIQUE,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "last_played_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "regions" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "game_id" INTEGER NOT NULL,
        "name" TEXT,
        "type" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "center_room_id" INTEGER,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "regions_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "regions_center_room_id_fkey" FOREIGN KEY ("center_room_id") REFERENCES "rooms" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )
  `;
  
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "rooms" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "game_id" INTEGER NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "region_id" INTEGER,
        "region_distance" INTEGER,
        CONSTRAINT "rooms_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "rooms_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    )
  `;
  
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "connections" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "game_id" INTEGER NOT NULL,
        "from_room_id" INTEGER NOT NULL,
        "to_room_id" INTEGER,
        "direction" TEXT,
        "name" TEXT NOT NULL,
        CONSTRAINT "connections_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "connections_from_room_id_fkey" FOREIGN KEY ("from_room_id") REFERENCES "rooms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "connections_to_room_id_fkey" FOREIGN KEY ("to_room_id") REFERENCES "rooms" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `;
  
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "game_state" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "game_id" INTEGER NOT NULL UNIQUE,
        "current_room_id" INTEGER NOT NULL,
        "player_name" TEXT,
        CONSTRAINT "game_state_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "game_state_current_room_id_fkey" FOREIGN KEY ("current_room_id") REFERENCES "rooms" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `;
  
  return prisma;
}

/**
 * Cleanup test database
 */
export async function cleanupTestDatabase(): Promise<void> {
  try {
    const prisma = PrismaService.getInstance().getClient();
    
    // Clean up all data in reverse dependency order
    // Use try-catch for each in case tables don't exist
    try { await prisma.connection.deleteMany({}); } catch (e) { /* ignore */ }
    try { await prisma.room.deleteMany({}); } catch (e) { /* ignore */ }
    try { await prisma.gameState.deleteMany({}); } catch (e) { /* ignore */ }
    try { await prisma.region.deleteMany({}); } catch (e) { /* ignore */ }
    try { await prisma.game.deleteMany({}); } catch (e) { /* ignore */ }
    
    await PrismaService.getInstance().disconnect();
  } catch (error) {
    // Ignore cleanup errors - tests should still pass
  }
}

/**
 * Create a test game with the standard initial setup
 */
export async function createTestGame(
  prisma: PrismaClient,
  gameName?: string
): Promise<{
  game: any;
  region: any;
  entranceHall: any;
  library: any;
  garden: any;
}> {
  const name = gameName || `Test Game ${Date.now()}-${Math.random()}`;
  
  return await prisma.$transaction(async (tx) => {
    // Create the game
    const game = await tx.game.create({
      data: { name }
    });

    // Create initial region
    const region = await tx.region.create({
      data: {
        gameId: game.id,
        name: 'Shadow Kingdom Manor',
        type: 'mansion',
        description: 'A grand manor estate shrouded in mystery, filled with elegant halls, ancient libraries, and moonlit gardens where forgotten secrets await discovery.'
      }
    });

    // Create starter rooms
    const entranceHall = await tx.room.create({
      data: {
        gameId: game.id,
        name: 'Grand Entrance Hall',
        description: 'You stand in a magnificent entrance hall that speaks of forgotten grandeur. Towering marble columns stretch up to a vaulted ceiling painted with faded celestial murals, their gold leaf catching the light that filters through tall, arched windows.',
        regionId: region.id,
        regionDistance: 0
      }
    });

    const library = await tx.room.create({
      data: {
        gameId: game.id,
        name: 'Scholar\'s Library',
        description: 'You enter a vast library that seems to hold the weight of countless ages. Floor-to-ceiling bookshelves carved from dark oak stretch into the shadows above, filled with leather-bound tomes.',
        regionId: region.id,
        regionDistance: 1
      }
    });

    const garden = await tx.room.create({
      data: {
        gameId: game.id,
        name: 'Moonlit Courtyard Garden',
        description: 'You step into an enchanted courtyard garden where nature has reclaimed its ancient dominion. Weathered stone paths wind between overgrown flowerbeds.',
        regionId: region.id,
        regionDistance: 1
      }
    });

    // Create connections between rooms
    await tx.connection.createMany({
      data: [
        // Entrance to Library
        {
          gameId: game.id,
          fromRoomId: entranceHall.id,
          toRoomId: library.id,
          direction: 'north',
          name: 'through the ornate archway beneath celestial murals'
        },
        // Library back to Entrance
        {
          gameId: game.id,
          fromRoomId: library.id,
          toRoomId: entranceHall.id,
          direction: 'south',
          name: 'through the shadowed archway to the grand hall'
        },
        // Entrance to Garden
        {
          gameId: game.id,
          fromRoomId: entranceHall.id,
          toRoomId: garden.id,
          direction: 'east',
          name: 'through the glass doors that shimmer with moonlight'
        },
        // Garden back to Entrance
        {
          gameId: game.id,
          fromRoomId: garden.id,
          toRoomId: entranceHall.id,
          direction: 'west',
          name: 'through the crystal doors back to the marble hall'
        },
        // Unfilled connections for expansion
        {
          gameId: game.id,
          fromRoomId: library.id,
          toRoomId: null,
          direction: 'west',
          name: 'through the hidden door behind dusty tomes'
        },
        {
          gameId: game.id,
          fromRoomId: garden.id,
          toRoomId: null,
          direction: 'up',
          name: 'up the celestial pathway to the stars'
        }
      ]
    });

    // Create initial game state
    await tx.gameState.create({
      data: {
        gameId: game.id,
        currentRoomId: entranceHall.id
      }
    });

    return { game, region, entranceHall, library, garden };
  });
}

/**
 * Create mock readline interface for testing
 */
export function createMockReadline(): any {
  return {
    question: jest.fn((prompt, callback) => {
      // Mock user responses based on prompt
      if (prompt.includes('Game name:')) {
        callback('Test Prisma Game');
      } else if (prompt.includes('Enter your choice:')) {
        callback('1');
      } else if (prompt.includes('Type "yes" to confirm:')) {
        callback('yes');
      } else {
        callback('');
      }
    }),
    close: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    removeListener: jest.fn(),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
    setMaxListeners: jest.fn(),
    getMaxListeners: jest.fn(),
    listeners: jest.fn(),
    rawListeners: jest.fn(),
    emit: jest.fn(),
    listenerCount: jest.fn(),
    prependListener: jest.fn(),
    prependOnceListener: jest.fn(),
    eventNames: jest.fn()
  };
}

/**
 * Create mock GrokClient for testing
 */
export function createMockGrokClient(): any {
  return {
    generateRoom: jest.fn().mockResolvedValue({
      name: 'AI Generated Room',
      description: 'A mysterious room generated by AI for testing',
      connections: [
        { direction: 'east', name: 'back through the shimmering portal' },
        { direction: 'north', name: 'through the ancient doorway' }
      ]
    }),
    generateRegion: jest.fn().mockResolvedValue({
      name: 'Mystic Test Realm',
      type: 'mystical',
      description: 'A realm where magic flows like water, created for testing'
    })
  };
}

/**
 * Wait for a short time (useful for async operations)
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Assert that a Prisma entity exists with specific properties
 */
export async function assertEntityExists<T>(
  prisma: PrismaClient,
  model: string,
  where: any,
  expectedProperties?: Partial<T>
): Promise<T> {
  const entity = await (prisma as any)[model].findFirst({ where });
  
  expect(entity).toBeDefined();
  expect(entity).not.toBeNull();
  
  if (expectedProperties) {
    for (const [key, value] of Object.entries(expectedProperties)) {
      expect(entity[key]).toEqual(value);
    }
  }
  
  return entity;
}

/**
 * Assert that a Prisma entity does not exist
 */
export async function assertEntityNotExists(
  prisma: PrismaClient,
  model: string,
  where: any
): Promise<void> {
  const entity = await (prisma as any)[model].findFirst({ where });
  expect(entity).toBeNull();
}

/**
 * Count entities matching criteria
 */
export async function countEntities(
  prisma: PrismaClient,
  model: string,
  where?: any
): Promise<number> {
  return await (prisma as any)[model].count({ where });
}