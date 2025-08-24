import Database from '../../src/utils/database';
import { initializeTestDatabase } from '../testUtils';
import { RoomConnectionValidator, RoomConnection } from '../../src/services/roomConnectionValidator';

describe('RoomConnectionValidator', () => {
  let db: Database;
  let validator: RoomConnectionValidator;
  let gameId: number;

  beforeEach(async () => {
    // Use in-memory database for testing
    db = new Database(':memory:');
    await db.connect();
    await initializeTestDatabase(db);
    validator = new RoomConnectionValidator(db);

    // Create a test game
    const gameResult = await db.run('INSERT INTO games (name) VALUES (?)', [
      'Test Game'
    ]);
    gameId = gameResult.lastID as number;
  });

  afterEach(async () => {
    await db.close();
  });

  describe('findOrphanedRooms', () => {
    it('should find rooms with no connections at all', async () => {
      // Create an isolated room with no connections
      const roomResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Isolated Room', 'A room with no connections']
      );
      const roomId = roomResult.lastID as number;

      const orphanedRooms = await validator.findOrphanedRooms(gameId);
      
      expect(orphanedRooms).toHaveLength(1);
      expect(orphanedRooms[0].room_id).toBe(roomId);
      expect(orphanedRooms[0].room_name).toBe('Isolated Room');
      expect(orphanedRooms[0].total_connections).toBe(0);
    });

    it('should not find rooms with outgoing connections', async () => {
      // Create two rooms
      const room1Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Room 1', 'First room']
      );
      const room2Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Room 2', 'Second room']
      );

      // Create connection from room1 to room2
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, room1Result.lastID, room2Result.lastID, 'north', 'passage north']
      );

      const orphanedRooms = await validator.findOrphanedRooms(gameId);
      
      expect(orphanedRooms).toHaveLength(0);
    });

    it('should not find rooms with incoming connections', async () => {
      // Create two rooms
      const room1Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Room 1', 'First room']
      );
      const room2Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Room 2', 'Second room']
      );

      // Create connection from room1 to room2
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, room1Result.lastID, room2Result.lastID, 'north', 'passage north']
      );

      const orphanedRooms = await validator.findOrphanedRooms(gameId);
      
      // Both rooms should have connections now (room1 has outgoing, room2 has incoming)
      expect(orphanedRooms).toHaveLength(0);
    });
  });

  describe('findInaccessibleRooms', () => {
    it('should find rooms with only outgoing connections (except room 1)', async () => {
      // Create three rooms
      const room1Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Starting Room', 'The starting room']
      );
      const room2Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Inaccessible Room', 'A room you cannot reach']
      );
      const room3Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Target Room', 'A room that can be reached']
      );

      // Create connection from room2 to room3 (room2 has outgoing but no incoming)
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, room2Result.lastID, room3Result.lastID, 'north', 'passage north']
      );

      const inaccessibleRooms = await validator.findInaccessibleRooms(gameId);
      
      expect(inaccessibleRooms).toHaveLength(1);
      expect(inaccessibleRooms[0].room_id).toBe(room2Result.lastID);
      expect(inaccessibleRooms[0].room_name).toBe('Inaccessible Room');
      expect(inaccessibleRooms[0].outgoing_connections).toBe(1);
      expect(inaccessibleRooms[0].incoming_connections).toBe(0);
    });

    it('should not flag room 1 as inaccessible even with only outgoing connections', async () => {
      // Create room with ID 1 (starting room)
      await db.run(
        'INSERT INTO rooms (id, game_id, name, description) VALUES (?, ?, ?, ?)',
        [1, gameId, 'Starting Room', 'The starting room']
      );
      const room2Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Target Room', 'A reachable room']
      );

      // Create connection from room 1 to room 2
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, 1, room2Result.lastID, 'north', 'passage north']
      );

      const inaccessibleRooms = await validator.findInaccessibleRooms(gameId);
      
      // Room 1 should not be considered inaccessible
      expect(inaccessibleRooms).toHaveLength(0);
    });
  });

  describe('findDeadEndRooms', () => {
    it('should find rooms with only incoming connections', async () => {
      // Create two rooms
      const room1Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Origin Room', 'Room with exit']
      );
      const room2Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Dead End Room', 'Room with no exits']
      );

      // Create connection from room1 to room2 only (room2 becomes dead end)
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, room1Result.lastID, room2Result.lastID, 'north', 'passage north']
      );

      const deadEndRooms = await validator.findDeadEndRooms(gameId);
      
      expect(deadEndRooms).toHaveLength(1);
      expect(deadEndRooms[0].room_id).toBe(room2Result.lastID);
      expect(deadEndRooms[0].room_name).toBe('Dead End Room');
      expect(deadEndRooms[0].outgoing_connections).toBe(0);
      expect(deadEndRooms[0].incoming_connections).toBe(1);
    });

    it('should not find rooms with bidirectional connections', async () => {
      // Create two rooms with bidirectional connections
      const room1Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Room 1', 'First room']
      );
      const room2Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Room 2', 'Second room']
      );

      // Create bidirectional connections
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, room1Result.lastID, room2Result.lastID, 'north', 'passage north']
      );
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, room2Result.lastID, room1Result.lastID, 'south', 'passage south']
      );

      const deadEndRooms = await validator.findDeadEndRooms(gameId);
      
      expect(deadEndRooms).toHaveLength(0);
    });
  });

  describe('validateRoomConnections', () => {
    it('should identify completely isolated room as invalid', async () => {
      // Create a dummy room first to ensure our test room is not ID 1
      await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Dummy Room', 'Just to avoid ID 1']
      );

      // Create an isolated room
      const roomResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Isolated Room', 'A completely isolated room']
      );
      const roomId = roomResult.lastID as number;

      // Ensure this room is not ID 1 (which has special behavior)
      expect(roomId).not.toBe(1);

      const validation = await validator.validateRoomConnections(roomId);
      
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Room has no connections (completely isolated)');
      expect(validation.issues).toContain('Room has no incoming connections (inaccessible)');
      expect(validation.issues).toContain('Room has no outgoing connections (dead end)');
      expect(validation.connections.total_connections).toBe(0);
    });

    it('should identify room with only outgoing connections as invalid (unless room 1)', async () => {
      // Create a room with specific ID > 1 to avoid room 1 special case
      const room1Result = await db.run(
        'INSERT INTO rooms (id, game_id, name, description) VALUES (?, ?, ?, ?)',
        [100, gameId, 'Source Room', 'Room with only outgoing']
      );
      const room2Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Target Room', 'Target room']
      );

      // Create connection from room1 to room2
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, 100, room2Result.lastID, 'north', 'passage north']
      );

      const validation = await validator.validateRoomConnections(100);
      
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Room has no incoming connections (inaccessible)');
    });

    it('should allow room 1 to have only outgoing connections', async () => {
      // Create room with ID 1 (starting room)
      await db.run(
        'INSERT INTO rooms (id, game_id, name, description) VALUES (?, ?, ?, ?)',
        [1, gameId, 'Starting Room', 'The starting room']
      );
      const room2Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Target Room', 'Target room']
      );

      // Create connection from room 1 to room2
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, 1, room2Result.lastID, 'north', 'passage north']
      );

      const validation = await validator.validateRoomConnections(1);
      
      expect(validation.isValid).toBe(true);
      expect(validation.issues).not.toContain('Room has no incoming connections (inaccessible)');
    });

    it('should allow rooms with only incoming connections (dead ends)', async () => {
      // Create two rooms
      const room1Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Source Room', 'Room with exit']
      );
      const room2Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Dead End Room', 'Room with no exits']
      );

      // Create connection from room1 to room2 (room2 is dead end)
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, room1Result.lastID, room2Result.lastID, 'north', 'passage north']
      );

      const validation = await validator.validateRoomConnections(room2Result.lastID as number);
      
      // Dead ends are allowed (warning only, not invalid)
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toContain('Room has no outgoing connections (dead end)');
    });

    it('should validate properly connected room as valid', async () => {
      // Create two rooms with bidirectional connections
      const room1Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Room 1', 'First room']
      );
      const room2Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Room 2', 'Second room']
      );

      // Create bidirectional connections
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, room1Result.lastID, room2Result.lastID, 'north', 'passage north']
      );
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, room2Result.lastID, room1Result.lastID, 'south', 'passage south']
      );

      const validation = await validator.validateRoomConnections(room1Result.lastID as number);
      
      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should handle non-existent room gracefully', async () => {
      const validation = await validator.validateRoomConnections(99999);
      
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Room not found');
    });
  });

  describe('repairOrphanedRooms', () => {
    it('should repair orphaned rooms by connecting them to existing connected rooms', async () => {
      // Create connected rooms
      const room1Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Connected Room 1', 'A connected room']
      );
      const room2Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Connected Room 2', 'Another connected room']
      );
      
      // Create orphaned room
      const orphanResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Orphaned Room', 'A room with no connections']
      );

      // Connect room1 and room2
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, room1Result.lastID, room2Result.lastID, 'north', 'passage north']
      );

      // Repair orphaned rooms
      const result = await validator.repairOrphanedRooms(gameId, false);
      
      expect(result.repaired).toBe(1);
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0]).toContain('Orphaned Room');
      expect(result.actions[0]).toContain('Connected Room 1');

      // Verify connections were created
      const connections = await db.all(
        'SELECT * FROM connections WHERE from_room_id = ? OR to_room_id = ?',
        [orphanResult.lastID, orphanResult.lastID]
      );
      expect(connections.length).toBeGreaterThan(0);
    });

    it('should run in dry-run mode without making changes', async () => {
      // Create orphaned room
      const orphanResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Orphaned Room', 'A room with no connections']
      );
      
      // Create connected room
      const room1Result = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Connected Room', 'A connected room']
      );
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, room1Result.lastID, room1Result.lastID, 'loop', 'self-loop']
      );

      // Run in dry-run mode
      const result = await validator.repairOrphanedRooms(gameId, true);
      
      expect(result.repaired).toBe(0);
      expect(result.actions).toHaveLength(1);

      // Verify no connections were actually created
      const connections = await db.all(
        'SELECT * FROM connections WHERE from_room_id = ? OR to_room_id = ?',
        [orphanResult.lastID, orphanResult.lastID]
      );
      expect(connections).toHaveLength(0);
    });
  });

  describe('generateConnectionReport', () => {
    it('should generate comprehensive report of connection issues', async () => {
      // Create various room types
      const isolatedResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Isolated Room', 'Completely isolated']
      );
      
      const inaccessibleResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Inaccessible Room', 'Has outgoing but no incoming']
      );
      
      const deadEndResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Dead End Room', 'Has incoming but no outgoing']
      );
      
      const connectedResult = await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Connected Room', 'Properly connected']
      );

      // Create connections to create the different room types
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, inaccessibleResult.lastID, connectedResult.lastID, 'north', 'to connected']
      );
      
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, connectedResult.lastID, deadEndResult.lastID, 'south', 'to dead end']
      );

      const report = await validator.generateConnectionReport(gameId);
      
      expect(report.orphaned).toHaveLength(1);
      expect(report.orphaned[0].room_name).toBe('Isolated Room');
      
      expect(report.inaccessible).toHaveLength(1);
      expect(report.inaccessible[0].room_name).toBe('Inaccessible Room');
      
      expect(report.deadEnds).toHaveLength(1);
      expect(report.deadEnds[0].room_name).toBe('Dead End Room');
      
      expect(report.summary.totalRooms).toBe(4);
      expect(report.summary.totalConnections).toBe(2);
      expect(report.summary.issueCount).toBe(2); // orphaned + inaccessible
    });

    it('should filter by game ID correctly', async () => {
      // Create another game
      const game2Result = await db.run('INSERT INTO games (name) VALUES (?)', [
        'Other Game'
      ]);
      const game2Id = game2Result.lastID as number;

      // Create rooms in different games
      await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [gameId, 'Game 1 Room', 'Room in first game']
      );
      
      await db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [game2Id, 'Game 2 Room', 'Room in second game']
      );

      const report1 = await validator.generateConnectionReport(gameId);
      const report2 = await validator.generateConnectionReport(game2Id);
      
      expect(report1.summary.totalRooms).toBe(1);
      expect(report2.summary.totalRooms).toBe(1);
      expect(report1.orphaned[0].room_name).toBe('Game 1 Room');
      expect(report2.orphaned[0].room_name).toBe('Game 2 Room');
    });
  });
});