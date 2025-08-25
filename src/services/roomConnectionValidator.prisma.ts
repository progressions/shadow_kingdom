/**
 * RoomConnectionValidator ensures that all rooms have at least one connection
 * to prevent players from getting stuck in rooms with no exits.
 * 
 * Prisma version - uses Prisma ORM for database operations
 */

import { PrismaClient } from '../generated/prisma';
import { getPrismaClient } from './prismaService';

export interface RoomConnection {
  room_id: number;
  room_name: string;
  outgoing_connections: number;
  incoming_connections: number;
  total_connections: number;
}

export class RoomConnectionValidatorPrisma {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || getPrismaClient();
  }

  /**
   * Find all rooms that have no connections (neither incoming nor outgoing)
   */
  async findOrphanedRooms(gameId?: number): Promise<RoomConnection[]> {
    const rooms = await this.prisma.room.findMany({
      where: gameId ? { gameId } : {},
      include: {
        connectionsFrom: {
          where: { toRoomId: { not: null } }
        },
        connectionsTo: {
          where: { toRoomId: { not: null } }
        }
      }
    });

    const orphanedRooms: RoomConnection[] = [];
    
    for (const room of rooms) {
      const outgoingCount = room.connectionsFrom.length;
      const incomingCount = room.connectionsTo.length;
      const totalCount = outgoingCount + incomingCount;
      
      if (totalCount === 0) {
        orphanedRooms.push({
          room_id: room.id,
          room_name: room.name,
          outgoing_connections: outgoingCount,
          incoming_connections: incomingCount,
          total_connections: totalCount
        });
      }
    }

    return orphanedRooms.sort((a, b) => a.room_id - b.room_id);
  }

  /**
   * Find rooms that only have outgoing connections but no way to reach them
   */
  async findInaccessibleRooms(gameId?: number): Promise<RoomConnection[]> {
    const rooms = await this.prisma.room.findMany({
      where: gameId ? { gameId } : {},
      include: {
        connectionsFrom: {
          where: { toRoomId: { not: null } }
        },
        connectionsTo: {
          where: { toRoomId: { not: null } }
        }
      }
    });

    const inaccessibleRooms: RoomConnection[] = [];
    
    for (const room of rooms) {
      const outgoingCount = room.connectionsFrom.length;
      const incomingCount = room.connectionsTo.length;
      const totalCount = outgoingCount + incomingCount;
      
      if (outgoingCount > 0 && incomingCount === 0 && room.id !== 1) {
        inaccessibleRooms.push({
          room_id: room.id,
          room_name: room.name,
          outgoing_connections: outgoingCount,
          incoming_connections: incomingCount,
          total_connections: totalCount
        });
      }
    }

    return inaccessibleRooms.sort((a, b) => a.room_id - b.room_id);
  }

  /**
   * Find rooms with no outgoing connections (potential dead ends)
   */
  async findDeadEndRooms(gameId?: number): Promise<RoomConnection[]> {
    const rooms = await this.prisma.room.findMany({
      where: gameId ? { gameId } : {},
      include: {
        connectionsFrom: {
          where: { toRoomId: { not: null } }
        },
        connectionsTo: {
          where: { toRoomId: { not: null } }
        }
      }
    });

    const deadEndRooms: RoomConnection[] = [];
    
    for (const room of rooms) {
      const outgoingCount = room.connectionsFrom.length;
      const incomingCount = room.connectionsTo.length;
      const totalCount = outgoingCount + incomingCount;
      
      if (outgoingCount === 0 && incomingCount > 0) {
        deadEndRooms.push({
          room_id: room.id,
          room_name: room.name,
          outgoing_connections: outgoingCount,
          incoming_connections: incomingCount,
          total_connections: totalCount
        });
      }
    }

    return deadEndRooms.sort((a, b) => a.room_id - b.room_id);
  }

  /**
   * Validate that a room has proper connections after creation/modification
   */
  async validateRoomConnections(roomId: number): Promise<{
    isValid: boolean;
    issues: string[];
    connections: RoomConnection;
  }> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        connectionsFrom: {
          where: { toRoomId: { not: null } }
        },
        connectionsTo: {
          where: { toRoomId: { not: null } }
        }
      }
    });

    if (!room) {
      throw new Error(`Room with ID ${roomId} not found`);
    }

    const outgoingCount = room.connectionsFrom.length;
    const incomingCount = room.connectionsTo.length;
    const totalCount = outgoingCount + incomingCount;

    const connections: RoomConnection = {
      room_id: room.id,
      room_name: room.name,
      outgoing_connections: outgoingCount,
      incoming_connections: incomingCount,
      total_connections: totalCount
    };

    const issues: string[] = [];
    let isValid = true;

    // Check for orphaned room
    if (totalCount === 0) {
      issues.push('Room has no connections at all (orphaned)');
      isValid = false;
    }

    // Check for inaccessible room (except for starting room)
    if (incomingCount === 0 && room.id !== 1) {
      issues.push('Room has no incoming connections (inaccessible)');
      isValid = false;
    }

    // Check for dead end (no way out)
    if (outgoingCount === 0) {
      issues.push('Room has no outgoing connections (dead end)');
      // Dead ends are not necessarily invalid, just worth noting
    }

    return {
      isValid,
      issues,
      connections
    };
  }

  /**
   * Get connection summary for a game
   */
  async getConnectionSummary(gameId: number): Promise<{
    totalRooms: number;
    orphanedRooms: number;
    inaccessibleRooms: number;
    deadEndRooms: number;
    fullyConnectedRooms: number;
  }> {
    const orphaned = await this.findOrphanedRooms(gameId);
    const inaccessible = await this.findInaccessibleRooms(gameId);
    const deadEnds = await this.findDeadEndRooms(gameId);
    
    const totalRooms = await this.prisma.room.count({
      where: { gameId }
    });

    // Fully connected = not orphaned, not inaccessible, not dead end
    const problemRoomIds = new Set([
      ...orphaned.map(r => r.room_id),
      ...inaccessible.map(r => r.room_id),
      ...deadEnds.map(r => r.room_id)
    ]);

    const fullyConnectedRooms = totalRooms - problemRoomIds.size;

    return {
      totalRooms,
      orphanedRooms: orphaned.length,
      inaccessibleRooms: inaccessible.length,
      deadEndRooms: deadEnds.length,
      fullyConnectedRooms
    };
  }
}