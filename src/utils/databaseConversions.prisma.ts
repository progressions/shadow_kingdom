/**
 * Prisma conversions for three tiny database operations
 * This file demonstrates converting small, focused database operations to use Prisma
 */

import { PrismaClient } from '../generated/prisma';
import { getPrismaClient } from '../services/prismaService';

// ============================================================================
// 1. UPDATE GAME STATE'S CURRENT ROOM
// ============================================================================

/**
 * Update the current room in game state
 * 
 * Original SQL from gameStateManager.ts:
 * UPDATE game_state SET current_room_id = ? WHERE game_id = ?
 */
export async function updateGameStateCurrentRoom(
  prisma: PrismaClient,
  gameId: number,
  currentRoomId: number
): Promise<void> {
  await prisma.gameState.update({
    where: {
      game_id: gameId
    },
    data: {
      current_room_id: currentRoomId
    }
  });
}

// ============================================================================
// 2. UPDATE GAME'S LAST PLAYED TIMESTAMP
// ============================================================================

/**
 * Update the last played timestamp for a game
 * 
 * Original SQL from gameStateManager.ts:
 * UPDATE games SET last_played_at = ? WHERE id = ?
 * 
 * Benefits of Prisma version:
 * - Automatic date handling (no need for toISOString())
 * - Type-safe field names
 * - Better error messages if game doesn't exist
 */
export async function updateGameLastPlayed(
  prisma: PrismaClient,
  gameId: number
): Promise<void> {
  await prisma.game.update({
    where: {
      id: gameId
    },
    data: {
      last_played_at: new Date() // Prisma handles date conversion automatically
    }
  });
}

// ============================================================================
// 3. MOVE CHARACTER TO A DIFFERENT ROOM
// ============================================================================

/**
 * Move a character to a different room
 * 
 * Original SQL from characterService.ts:
 * UPDATE characters SET current_room_id = ? WHERE id = ?
 * 
 * Benefits:
 * - Handles null values properly
 * - Returns the updated character if needed
 * - Can validate room exists with relation checks
 */
export async function moveCharacterToRoom(
  prisma: PrismaClient,
  characterId: number,
  roomId: number | null
): Promise<void> {
  await prisma.character.update({
    where: {
      id: characterId
    },
    data: {
      current_room_id: roomId
    }
  });
}

/**
 * Alternative version that returns the updated character
 * Shows how Prisma makes it easy to get the updated data
 */
export async function moveCharacterToRoomWithReturn(
  prisma: PrismaClient,
  characterId: number,
  roomId: number | null
) {
  return await prisma.character.update({
    where: {
      id: characterId
    },
    data: {
      current_room_id: roomId
    },
    select: {
      id: true,
      name: true,
      current_room_id: true,
      current_room: {
        select: {
          id: true,
          name: true,
          description: true
        }
      }
    }
  });
}

// ============================================================================
// COMBINED TRANSACTION EXAMPLE
// ============================================================================

/**
 * Combined operation: Update both game state and timestamp in a transaction
 * This shows how Prisma makes transactions easy and safe
 * 
 * In the original code, these were two separate queries that could fail independently.
 * With Prisma transactions, either both succeed or both fail.
 */
export async function updateGameStateAndTimestamp(
  prisma: PrismaClient,
  gameId: number,
  currentRoomId: number
): Promise<void> {
  await prisma.$transaction([
    // Update the game state's current room
    prisma.gameState.update({
      where: {
        game_id: gameId
      },
      data: {
        current_room_id: currentRoomId
      }
    }),
    // Update the game's last played timestamp
    prisma.game.update({
      where: {
        id: gameId
      },
      data: {
        last_played_at: new Date()
      }
    })
  ]);
}

/**
 * Alternative transaction with error handling and rollback
 */
export async function updateGameStateWithValidation(
  prisma: PrismaClient,
  gameId: number,
  currentRoomId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use interactive transaction for more control
    await prisma.$transaction(async (tx) => {
      // First, verify the room exists
      const room = await tx.room.findUnique({
        where: { id: currentRoomId }
      });
      
      if (!room) {
        throw new Error(`Room ${currentRoomId} does not exist`);
      }
      
      // Verify the room belongs to the same game
      if (room.game_id !== gameId) {
        throw new Error(`Room ${currentRoomId} does not belong to game ${gameId}`);
      }
      
      // Update game state
      await tx.gameState.update({
        where: { game_id: gameId },
        data: { current_room_id: currentRoomId }
      });
      
      // Update last played timestamp
      await tx.game.update({
        where: { id: gameId },
        data: { last_played_at: new Date() }
      });
    });
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example of how to use these converted functions
 */
export async function exampleUsage() {
  const prisma = getPrismaClient();
  
  try {
    // Simple updates
    await updateGameStateCurrentRoom(prisma, 1, 5);
    await updateGameLastPlayed(prisma, 1);
    await moveCharacterToRoom(prisma, 10, 5);
    
    // Get updated character data after move
    const movedCharacter = await moveCharacterToRoomWithReturn(prisma, 10, 5);
    console.log(`Moved ${movedCharacter.name} to ${movedCharacter.current_room?.name}`);
    
    // Transactional update with validation
    const result = await updateGameStateWithValidation(prisma, 1, 5);
    if (!result.success) {
      console.error(`Failed to update game state: ${result.error}`);
    }
    
  } catch (error) {
    console.error('Database operation failed:', error);
  }
}