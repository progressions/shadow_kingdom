/**
 * Prisma version of RoomConnectionValidator - partial implementation
 * This demonstrates converting the findDeadEndRooms method to use Prisma
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
   * Find rooms with no outgoing connections (potential dead ends)
   * This method has been converted from direct SQL to use Prisma
   */
  async findDeadEndRooms(gameId?: number): Promise<RoomConnection[]> {
    // Get all rooms with optional game filter
    const whereClause = gameId ? { game_id: gameId } : {};
    
    const rooms = await this.prisma.room.findMany({
      where: whereClause,
      include: {
        connections_from: {
          where: {
            to_room_id: { not: null }
          }
        },
        connections_to: {
          where: {
            to_room_id: { not: null }
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    // Process rooms to find dead ends
    const deadEndRooms: RoomConnection[] = [];
    
    for (const room of rooms) {
      const outgoingConnections = room.connections_from.length;
      const incomingConnections = room.connections_to.length;
      const totalConnections = outgoingConnections + incomingConnections;
      
      // Dead end: has incoming connections but no outgoing
      if (outgoingConnections === 0 && incomingConnections > 0) {
        deadEndRooms.push({
          room_id: room.id,
          room_name: room.name,
          outgoing_connections: outgoingConnections,
          incoming_connections: incomingConnections,
          total_connections: totalConnections
        });
      }
    }
    
    return deadEndRooms;
  }
}