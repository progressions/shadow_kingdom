/**
 * Seed the database with initial demo game
 * 
 * Prisma version - uses Prisma ORM for database operations
 */

import { PrismaClient } from '../generated/prisma';
import { getPrismaClient } from '../services/prismaService';
import { TUIInterface } from '../ui/TUIInterface';
import Database from './database';
import { createGameWithRooms } from './initDb';

/**
 * Check if database is empty and create a demo game if needed
 * @param tui Optional TUI interface for output
 * @param prismaClient Optional Prisma client instance
 * @param db Database instance for createGameWithRooms (until it's converted to Prisma)
 */
export async function seedDatabase(
  db: Database,
  tui?: TUIInterface, 
  prismaClient?: PrismaClient
): Promise<void> {
  const prisma = prismaClient || getPrismaClient();
  
  try {
    // Check if any games already exist
    const gameCount = await prisma.game.count();

    if (gameCount > 0) {
      return;
    }

    // Create a default game with the initial world
    // Note: createGameWithRooms still uses Database, so we pass db for now
    await createGameWithRooms(db, 'Demo Game', tui);
  } catch (error) {
    throw error;
  }
}