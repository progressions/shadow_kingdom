/**
 * RoomConnectionValidator ensures that all rooms have at least one connection
 * to prevent players from getting stuck in rooms with no exits.
 */

import Database from '../utils/database';

export interface RoomConnection {
  room_id: number;
  room_name: string;
  outgoing_connections: number;
  incoming_connections: number;
  total_connections: number;
}

export class RoomConnectionValidator {
  constructor(private db: Database) {}

  /**
   * Find all rooms that have no connections (neither incoming nor outgoing)
   */
  async findOrphanedRooms(gameId?: number): Promise<RoomConnection[]> {
    const whereClause = gameId ? 'AND r.game_id = ?' : '';
    const params = gameId ? [gameId] : [];

    const orphanedRooms = await this.db.all<RoomConnection>(`
      SELECT 
        r.id as room_id,
        r.name as room_name,
        COALESCE(outgoing.count, 0) as outgoing_connections,
        COALESCE(incoming.count, 0) as incoming_connections,
        (COALESCE(outgoing.count, 0) + COALESCE(incoming.count, 0)) as total_connections
      FROM rooms r
      LEFT JOIN (
        SELECT from_room_id, COUNT(*) as count 
        FROM connections 
        WHERE to_room_id IS NOT NULL
        GROUP BY from_room_id
      ) outgoing ON r.id = outgoing.from_room_id
      LEFT JOIN (
        SELECT to_room_id, COUNT(*) as count 
        FROM connections 
        WHERE to_room_id IS NOT NULL
        GROUP BY to_room_id
      ) incoming ON r.id = incoming.to_room_id
      WHERE (COALESCE(outgoing.count, 0) + COALESCE(incoming.count, 0)) = 0
      ${whereClause}
      ORDER BY r.id
    `, params);

    return orphanedRooms;
  }

  /**
   * Find rooms that only have outgoing connections but no way to reach them
   */
  async findInaccessibleRooms(gameId?: number): Promise<RoomConnection[]> {
    const whereClause = gameId ? 'AND r.game_id = ?' : '';
    const params = gameId ? [gameId] : [];

    const inaccessibleRooms = await this.db.all<RoomConnection>(`
      SELECT 
        r.id as room_id,
        r.name as room_name,
        COALESCE(outgoing.count, 0) as outgoing_connections,
        COALESCE(incoming.count, 0) as incoming_connections,
        (COALESCE(outgoing.count, 0) + COALESCE(incoming.count, 0)) as total_connections
      FROM rooms r
      LEFT JOIN (
        SELECT from_room_id, COUNT(*) as count 
        FROM connections 
        WHERE to_room_id IS NOT NULL
        GROUP BY from_room_id
      ) outgoing ON r.id = outgoing.from_room_id
      LEFT JOIN (
        SELECT to_room_id, COUNT(*) as count 
        FROM connections 
        WHERE to_room_id IS NOT NULL
        GROUP BY to_room_id
      ) incoming ON r.id = incoming.to_room_id
      WHERE COALESCE(outgoing.count, 0) > 0 AND COALESCE(incoming.count, 0) = 0
      ${whereClause}
      ORDER BY r.id
    `, params);

    // Filter out starting rooms (room_id = 1 or rooms with region_distance = 0)
    return inaccessibleRooms.filter(room => room.room_id !== 1);
  }

  /**
   * Find rooms with no outgoing connections (potential dead ends)
   */
  async findDeadEndRooms(gameId?: number): Promise<RoomConnection[]> {
    const whereClause = gameId ? 'AND r.game_id = ?' : '';
    const params = gameId ? [gameId] : [];

    const deadEndRooms = await this.db.all<RoomConnection>(`
      SELECT 
        r.id as room_id,
        r.name as room_name,
        COALESCE(outgoing.count, 0) as outgoing_connections,
        COALESCE(incoming.count, 0) as incoming_connections,
        (COALESCE(outgoing.count, 0) + COALESCE(incoming.count, 0)) as total_connections
      FROM rooms r
      LEFT JOIN (
        SELECT from_room_id, COUNT(*) as count 
        FROM connections 
        WHERE to_room_id IS NOT NULL
        GROUP BY from_room_id
      ) outgoing ON r.id = outgoing.from_room_id
      LEFT JOIN (
        SELECT to_room_id, COUNT(*) as count 
        FROM connections 
        WHERE to_room_id IS NOT NULL
        GROUP BY to_room_id
      ) incoming ON r.id = incoming.to_room_id
      WHERE COALESCE(outgoing.count, 0) = 0 AND COALESCE(incoming.count, 0) > 0
      ${whereClause}
      ORDER BY r.id
    `, params);

    return deadEndRooms;
  }

  /**
   * Validate that a room has proper connections after creation/modification
   */
  async validateRoomConnections(roomId: number): Promise<{
    isValid: boolean;
    issues: string[];
    connections: RoomConnection;
  }> {
    const connections = await this.db.get<RoomConnection>(`
      SELECT 
        r.id as room_id,
        r.name as room_name,
        COALESCE(outgoing.count, 0) as outgoing_connections,
        COALESCE(incoming.count, 0) as incoming_connections,
        (COALESCE(outgoing.count, 0) + COALESCE(incoming.count, 0)) as total_connections
      FROM rooms r
      LEFT JOIN (
        SELECT from_room_id, COUNT(*) as count 
        FROM connections 
        WHERE to_room_id IS NOT NULL
        GROUP BY from_room_id
      ) outgoing ON r.id = outgoing.from_room_id
      LEFT JOIN (
        SELECT to_room_id, COUNT(*) as count 
        FROM connections 
        WHERE to_room_id IS NOT NULL
        GROUP BY to_room_id
      ) incoming ON r.id = incoming.to_room_id
      WHERE r.id = ?
    `, [roomId]);

    if (!connections) {
      return {
        isValid: false,
        issues: ['Room not found'],
        connections: { room_id: roomId, room_name: 'Unknown', outgoing_connections: 0, incoming_connections: 0, total_connections: 0 }
      };
    }

    const issues: string[] = [];
    let isValid = true;

    // Check for total isolation (critical issue)
    if (connections.total_connections === 0) {
      issues.push('Room has no connections (completely isolated)');
      isValid = false;
      
      // If completely isolated, also note the specific issues this causes
      if (roomId !== 1) {
        issues.push('Room has no incoming connections (inaccessible)');
      }
      issues.push('Room has no outgoing connections (dead end)');
    } else {
      // Check for inaccessibility (critical for non-starting rooms)
      if (connections.incoming_connections === 0 && roomId !== 1) {
        issues.push('Room has no incoming connections (inaccessible)');
        isValid = false;
      }

      // Check for dead ends (warning, but not necessarily invalid)
      if (connections.outgoing_connections === 0) {
        issues.push('Room has no outgoing connections (dead end)');
        // Dead ends are allowed, so don't set isValid = false
      }
    }

    return {
      isValid,
      issues,
      connections
    };
  }

  /**
   * Repair orphaned rooms by connecting them to nearby rooms
   */
  async repairOrphanedRooms(gameId?: number, dryRun: boolean = false): Promise<{
    repaired: number;
    actions: string[];
  }> {
    const orphanedRooms = await this.findOrphanedRooms(gameId);
    const actions: string[] = [];
    let repaired = 0;

    for (const orphanedRoom of orphanedRooms) {
      // Find the nearest room in the same game to connect to
      const nearestRoom = await this.db.get<{id: number, name: string}>(`
        SELECT id, name FROM rooms 
        WHERE game_id = (SELECT game_id FROM rooms WHERE id = ?) 
          AND id != ?
          AND id IN (
            SELECT DISTINCT from_room_id FROM connections WHERE to_room_id IS NOT NULL
            UNION
            SELECT DISTINCT to_room_id FROM connections WHERE to_room_id IS NOT NULL
          )
        ORDER BY id ASC
        LIMIT 1
      `, [orphanedRoom.room_id, orphanedRoom.room_id]);

      if (nearestRoom) {
        const action = `Connect "${orphanedRoom.room_name}" (ID: ${orphanedRoom.room_id}) to "${nearestRoom.name}" (ID: ${nearestRoom.id})`;
        actions.push(action);

        if (!dryRun) {
          // Create a bidirectional connection
          await this.db.run(`
            INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) 
            VALUES (
              (SELECT game_id FROM rooms WHERE id = ?),
              ?,
              ?,
              'emergency_exit',
              'emergency passage (auto-generated)'
            )
          `, [orphanedRoom.room_id, orphanedRoom.room_id, nearestRoom.id]);

          await this.db.run(`
            INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) 
            VALUES (
              (SELECT game_id FROM rooms WHERE id = ?),
              ?,
              ?,
              'emergency_entrance',
              'emergency passage (auto-generated)'
            )
          `, [nearestRoom.id, nearestRoom.id, orphanedRoom.room_id]);

          repaired++;
        }
      } else {
        actions.push(`Could not find a suitable room to connect "${orphanedRoom.room_name}" (ID: ${orphanedRoom.room_id}) to`);
      }
    }

    return { repaired, actions };
  }

  /**
   * Get a comprehensive report of room connection issues
   */
  async generateConnectionReport(gameId?: number): Promise<{
    orphaned: RoomConnection[];
    inaccessible: RoomConnection[];
    deadEnds: RoomConnection[];
    summary: {
      totalRooms: number;
      totalConnections: number;
      issueCount: number;
    };
  }> {
    const orphaned = await this.findOrphanedRooms(gameId);
    const inaccessible = await this.findInaccessibleRooms(gameId);
    const deadEnds = await this.findDeadEndRooms(gameId);

    const whereClause = gameId ? 'WHERE game_id = ?' : '';
    const params = gameId ? [gameId] : [];

    const totalRooms = await this.db.get<{count: number}>(`SELECT COUNT(*) as count FROM rooms ${whereClause}`, params);
    const totalConnections = await this.db.get<{count: number}>(`SELECT COUNT(*) as count FROM connections WHERE to_room_id IS NOT NULL ${gameId ? 'AND game_id = ?' : ''}`, gameId ? [gameId] : []);

    return {
      orphaned,
      inaccessible,
      deadEnds,
      summary: {
        totalRooms: totalRooms?.count || 0,
        totalConnections: totalConnections?.count || 0,
        issueCount: orphaned.length + inaccessible.length
      }
    };
  }
}