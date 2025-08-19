/**
 * Unified Database Types
 * 
 * This file provides type exports from both Prisma and existing interfaces
 * to ensure type compatibility during the migration process.
 */

// Export Prisma generated types
export type {
  Game as PrismaGame,
  Room as PrismaRoom,
  Connection as PrismaConnection,
  GameState as PrismaGameState,
  Region as PrismaRegion,
  Prisma
} from '../generated/prisma';

// Re-export existing types for backward compatibility
export type {
  GameState,
  Room,
  Connection,
  UnfilledConnection,
  FilledConnection,
  Game,
  GameSession,
  GameStateManagerOptions
} from '../services/gameStateManager';

export type {
  Region,
  RegionContext,
  RoomWithRegion
} from './region';

// Type adapters for mapping between old and new types
export interface DatabaseTypeMappers {
  /**
   * Convert Prisma Game to legacy Game interface
   */
  toPrismaGame(game: Game): PrismaGame;
  
  /**
   * Convert legacy Game to Prisma Game interface  
   */
  fromPrismaGame(prismaGame: PrismaGame): Game;
  
  /**
   * Convert Prisma Room to legacy Room interface
   */
  fromPrismaRoom(prismaRoom: PrismaRoom): Room;
  
  /**
   * Convert legacy Room to Prisma Room interface
   */
  toPrismaRoom(room: Room): PrismaRoom;
  
  /**
   * Convert Prisma Connection to legacy Connection interface
   */
  fromPrismaConnection(prismaConnection: PrismaConnection): Connection;
  
  /**
   * Convert legacy Connection to Prisma Connection interface
   */
  toPrismaConnection(connection: Connection): PrismaConnection;
}

// Import the Prisma types to ensure they're available
import type { 
  Game as PrismaGame,
  Room as PrismaRoom, 
  Connection as PrismaConnection,
  GameState as PrismaGameState,
  Region as PrismaRegion
} from '../generated/prisma';

// Import existing types
import type { 
  Game,
  Room,
  Connection,
  GameState
} from '../services/gameStateManager';

/**
 * Type mappers implementation for converting between old and new types
 */
export const typeMappers: DatabaseTypeMappers = {
  toPrismaGame(game: Game): PrismaGame {
    // This is a partial implementation for conversion
    return {
      id: game.id,
      name: game.name,
      createdAt: new Date(game.created_at),
      lastPlayedAt: new Date(game.last_played_at)
    } as PrismaGame;
  },

  fromPrismaGame(prismaGame: Partial<PrismaGame> & { id: number; name: string; createdAt: Date; lastPlayedAt: Date }): Game {
    return {
      id: prismaGame.id,
      name: prismaGame.name,
      created_at: prismaGame.createdAt.toISOString(),
      last_played_at: prismaGame.lastPlayedAt.toISOString()
    };
  },

  fromPrismaRoom(prismaRoom: PrismaRoom): Room {
    return {
      id: prismaRoom.id,
      game_id: prismaRoom.gameId,
      name: prismaRoom.name,
      description: prismaRoom.description
    };
  },

  toPrismaRoom(room: Room): PrismaRoom {
    // This is a partial implementation for conversion
    return {
      id: room.id,
      gameId: room.game_id,
      name: room.name,
      description: room.description,
      regionId: null,
      regionDistance: null
    } as PrismaRoom;
  },

  fromPrismaConnection(prismaConnection: PrismaConnection): Connection {
    return {
      id: prismaConnection.id,
      game_id: prismaConnection.gameId,
      from_room_id: prismaConnection.fromRoomId,
      to_room_id: prismaConnection.toRoomId,
      direction: prismaConnection.direction || '',
      name: prismaConnection.name
    };
  },

  toPrismaConnection(connection: Connection): PrismaConnection {
    // This is a partial implementation for conversion
    return {
      id: connection.id,
      gameId: connection.game_id,
      fromRoomId: connection.from_room_id,
      toRoomId: connection.to_room_id || null,
      direction: connection.direction || null,
      name: connection.name
    } as PrismaConnection;
  }
};

/**
 * Helper types for database operations
 */
export type DatabaseResult<T> = {
  success: boolean;
  data?: T;
  error?: Error;
};

export type QueryOptions = {
  include?: Record<string, boolean>;
  where?: Record<string, any>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  take?: number;
  skip?: number;
};