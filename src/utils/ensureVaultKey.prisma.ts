/**
 * Ensures that the Vault Key exists and is placed in the Meditation Chamber
 * This fixes the issue where the hardcoded monastery region doesn't have the key
 * 
 * Prisma version - uses Prisma ORM for database operations
 */

import { PrismaClient } from '../generated/prisma';
import { getPrismaClient } from '../services/prismaService';
import { ItemServicePrisma } from '../services/itemService.prisma';
import { ItemType } from '../types/item';

/**
 * Ensure Vault Key exists and is placed in Meditation Chamber with Stone Sentinel
 * @param gameId Game ID to check
 * @param prismaClient Optional Prisma client instance
 */
export async function ensureVaultKeyInMonastery(
  gameId: number, 
  prismaClient?: PrismaClient
): Promise<void> {
  const prisma = prismaClient || getPrismaClient();
  
  try {
    // Check if there's a Meditation Chamber with a Stone Sentinel in this game
    const meditationChamberWithSentinel = await prisma.room.findFirst({
      where: {
        gameId,
        name: {
          contains: 'Meditation'
        }
      },
      include: {
        game: {
          include: {
            characters: {
              where: {
                name: 'Stone Sentinel',
                type: 'enemy'
              }
            }
          }
        }
      }
    });

    // Check if the Stone Sentinel is in this room
    const sentinel = meditationChamberWithSentinel?.game.characters.find(
      c => c.currentRoomId === meditationChamberWithSentinel.id
    );

    if (!meditationChamberWithSentinel || !sentinel) {
      // No Meditation Chamber with Stone Sentinel, nothing to fix
      return;
    }

    const roomId = meditationChamberWithSentinel.id;
    
    // Check if Vault Key already exists in this room
    const existingVaultKey = await prisma.roomItem.findFirst({
      where: {
        roomId,
        item: {
          name: 'Vault Key'
        }
      }
    });

    if (existingVaultKey) {
      // Vault Key already exists in the room
      return;
    }

    // Check if Vault Key item exists in items table
    let vaultKeyId: number;
    const vaultKeyItem = await prisma.item.findFirst({
      where: {
        name: 'Vault Key'
      }
    });
    
    if (!vaultKeyItem) {
      // Create the Vault Key item
      const itemService = new ItemServicePrisma(prisma);
      vaultKeyId = await itemService.createItem({
        name: 'Vault Key',
        description: 'A heavy iron key with religious symbols etched into its surface. It glows faintly with divine magic, the power needed to open the sacred vault door.',
        type: ItemType.QUEST,
        weight: 0.3,
        value: 0,
        stackable: false,
        max_stack: 1
      });
      
      console.log(`Created Vault Key item with ID ${vaultKeyId}`);
    } else {
      vaultKeyId = vaultKeyItem.id;
    }

    // Place the Vault Key in the Meditation Chamber
    const itemService = new ItemServicePrisma(prisma);
    await itemService.placeItemInRoom(roomId, vaultKeyId, 1);
    
    console.log(`Placed Vault Key in ${meditationChamberWithSentinel.name} (Room ${roomId}) guarded by ${sentinel.name}`);
    
  } catch (error) {
    console.error('Error ensuring Vault Key in monastery:', error);
    // Don't throw - this is a fix operation that shouldn't break the game
  }
}

/**
 * Check all games and ensure Vault Keys exist where needed
 * @param prismaClient Optional Prisma client instance
 */
export async function ensureVaultKeysInAllGames(prismaClient?: PrismaClient): Promise<void> {
  const prisma = prismaClient || getPrismaClient();
  
  try {
    const games = await prisma.game.findMany({
      select: { id: true }
    });
    
    for (const game of games) {
      await ensureVaultKeyInMonastery(game.id, prisma);
    }
  } catch (error) {
    console.error('Error ensuring Vault Keys in all games:', error);
  }
}