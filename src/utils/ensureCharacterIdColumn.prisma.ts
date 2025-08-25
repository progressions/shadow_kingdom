/**
 * Ensure character_id column exists in game_state table
 * 
 * Prisma version - uses Prisma migrations/raw queries for schema updates
 */

import { PrismaClient } from '../generated/prisma';
import { getPrismaClient } from '../services/prismaService';
import { TUIInterface } from '../ui/TUIInterface';
import { MessageType } from '../ui/MessageFormatter';

export async function ensureCharacterIdColumn(tui?: TUIInterface, prismaClient?: PrismaClient): Promise<void> {
  const prisma = prismaClient || getPrismaClient();
  
  try {
    // For SQLite, we need to check if the column exists using raw SQL
    // Prisma doesn't provide a way to check column existence directly
    const characterIdExists = await prisma.$queryRaw<{count: number}[]>`
      SELECT COUNT(*) as count FROM pragma_table_info('game_state') 
      WHERE name = 'character_id'
    `;

    if (!characterIdExists || characterIdExists[0]?.count === 0) {
      // Add the character_id column using raw SQL
      await prisma.$executeRaw`ALTER TABLE game_state ADD COLUMN character_id INTEGER`;
      
      if (tui) {
        tui.display('Added character_id column to game_state table', MessageType.SYSTEM);
      }
    }
  } catch (error: any) {
    // If the column already exists, SQLite will throw an error - we can safely ignore it
    if (error?.message?.includes('duplicate column name')) {
      // Column already exists, which is fine
      return;
    }
    
    if (tui) {
      tui.display(`Error ensuring character_id column: ${error}`, MessageType.ERROR);
    }
    throw error;
  }
}