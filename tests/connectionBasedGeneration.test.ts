import Database from '../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';
import { Connection, UnfilledConnection, FilledConnection } from '../src/services/gameStateManager';

describe('Connection-Based Generation Schema', () => {
  let db: Database;

  beforeEach(async () => {
    // Use in-memory database for testing
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
  });

  afterEach(async () => {
    if (db) {
      await db.close();
    }
  });

  describe('Database Schema Migration', () => {
    it('should allow NULL to_room_id in connections table', async () => {
      const gameId = await createGameWithRooms(db, `Test Game ${Date.now()}-${Math.random()}`);
      
      // Insert connection with NULL to_room_id (unfilled connection)
      const result = await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, 1, null, 'north', 'through the mysterious doorway']
      );
      
      expect(result.lastID).toBeDefined();
      
      // Verify the connection was inserted with NULL to_room_id
      const connection = await db.get<Connection>(
        'SELECT * FROM connections WHERE id = ?',
        [result.lastID]
      );
      
      expect(connection).toBeDefined();
      expect(connection!.to_room_id).toBeNull();
      expect(connection!.direction).toBe('north');
      expect(connection!.name).toBe('through the mysterious doorway');
    });

    it('should create proper indexes for unfilled connections', async () => {
      const gameId = await createGameWithRooms(db, `Test Game ${Date.now()}-${Math.random()}`);
      
      // Insert some unfilled connections
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, 1, null, 'north', 'unfilled north']
      );
      
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, 1, null, 'east', 'unfilled east']
      );
      
      // Query should be efficient with the partial index
      const unfilledConnections = await db.all<UnfilledConnection>(
        'SELECT * FROM connections WHERE game_id = ? AND to_room_id IS NULL',
        [gameId]
      );
      
      expect(unfilledConnections).toHaveLength(2);
      expect(unfilledConnections[0].to_room_id).toBeNull();
      expect(unfilledConnections[1].to_room_id).toBeNull();
    });

    it('should distinguish between filled and unfilled connections', async () => {
      const gameId = await createGameWithRooms(db, `Test Game ${Date.now()}-${Math.random()}`);
      
      // Insert unfilled connection
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, 1, null, 'north', 'unfilled connection']
      );
      
      // Insert filled connection
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, 1, 2, 'south', 'filled connection']
      );
      
      // Query unfilled connections
      const unfilledConnections = await db.all<UnfilledConnection>(
        'SELECT * FROM connections WHERE game_id = ? AND to_room_id IS NULL',
        [gameId]
      );
      
      // Query filled connections
      const filledConnections = await db.all<FilledConnection>(
        'SELECT * FROM connections WHERE game_id = ? AND to_room_id IS NOT NULL',
        [gameId]
      );
      
      expect(unfilledConnections).toHaveLength(1);
      expect(unfilledConnections[0].name).toBe('unfilled connection');
      expect(unfilledConnections[0].to_room_id).toBeNull();
      
      // Should include the filled connection we created plus existing connections from game creation
      expect(filledConnections.length).toBeGreaterThan(0);
      const ourFilledConnection = filledConnections.find(c => c.name === 'filled connection');
      expect(ourFilledConnection).toBeDefined();
      expect(ourFilledConnection!.to_room_id).toBe(2);
    });

    it('should properly handle connection updates from NULL to filled', async () => {
      const gameId = await createGameWithRooms(db, `Test Game ${Date.now()}-${Math.random()}`);
      
      // Insert unfilled connection
      const result = await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, 1, null, 'west', 'mysterious passage']
      );
      
      const connectionId = result.lastID;
      
      // Verify it's unfilled
      const unfilledConnection = await db.get<Connection>(
        'SELECT * FROM connections WHERE id = ?',
        [connectionId]
      );
      expect(unfilledConnection!.to_room_id).toBeNull();
      
      // Create a new room to connect to
      const roomResult = await db.run(
        'INSERT INTO rooms (game_id, name, description, generation_processed) VALUES (?, ?, ?, ?)',
        [gameId, 'New Room', 'A newly generated room', false]
      );
      
      const newRoomId = roomResult.lastID;
      
      // Update connection to be filled
      await db.run(
        'UPDATE connections SET to_room_id = ? WHERE id = ?',
        [newRoomId, connectionId]
      );
      
      // Verify it's now filled
      const filledConnection = await db.get<Connection>(
        'SELECT * FROM connections WHERE id = ?',
        [connectionId]
      );
      expect(filledConnection!.to_room_id).toBe(newRoomId);
    });
  });

  describe('Connection-Based Room Generation', () => {
    it('should create unfilled connections when generating rooms with AI specifications', async () => {
      const gameId = await createGameWithRooms(db, `Connection Room Gen ${Date.now()}-${Math.random()}`);
      
      // Mock AI response with multiple connections
      const mockGrokClient = {
        generateRoom: jest.fn().mockResolvedValue({
          name: 'Crystal Chamber',
          description: 'A shimmering chamber filled with crystal formations.',
          connections: [
            { direction: 'south', name: 'back through the archway' },
            { direction: 'east', name: 'toward the crystal spires' },
            { direction: 'west', name: 'through the gem passage' }
          ]
        }),
        generateRegion: jest.fn()
      };

      const mockRegionService = {
        shouldCreateNewRegion: jest.fn().mockReturnValue(false),
        getRegionsForGame: jest.fn().mockResolvedValue([]),
        getRegion: jest.fn().mockResolvedValue({ id: 1, type: 'mansion', description: 'A grand manor' }),
        getAdjacentRoomDescriptions: jest.fn().mockResolvedValue([]),
        buildRoomGenerationPrompt: jest.fn().mockResolvedValue('mansion themed prompt')
      };

      const roomGenService = new (await import('../src/services/roomGenerationService')).RoomGenerationService(
        db,
        mockGrokClient as any,
        mockRegionService as any,
        { enableDebugLogging: false }
      );

      // Generate a single room (this should create unfilled connections)
      const result = await roomGenService.generateSingleRoom({
        gameId,
        fromRoomId: 1,
        direction: 'north',
        theme: 'crystal theme'
      });

      expect(result.success).toBe(true);
      expect(result.roomId).toBeDefined();

      // Verify the return connection was created (filled)
      const returnConnection = await db.get(
        'SELECT * FROM connections WHERE from_room_id = ? AND to_room_id = ? AND direction = ?',
        [result.roomId, 1, 'south']
      );
      expect(returnConnection).toBeDefined();
      expect(returnConnection.to_room_id).toBe(1);

      // Verify unfilled connections were created for other AI-specified directions
      const unfilledConnections = await db.all<UnfilledConnection>(
        'SELECT * FROM connections WHERE from_room_id = ? AND to_room_id IS NULL',
        [result.roomId]
      );
      
      expect(unfilledConnections).toHaveLength(2); // east and west
      expect(unfilledConnections.some(c => c.direction === 'east' && c.name === 'toward the crystal spires')).toBe(true);
      expect(unfilledConnections.some(c => c.direction === 'west' && c.name === 'through the gem passage')).toBe(true);
    });

    it('should fill unfilled connections with generateRoomForConnection', async () => {
      const gameId = await createGameWithRooms(db, `Fill Connection ${Date.now()}-${Math.random()}`);
      
      // Create an unfilled connection
      const connectionResult = await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, 1, null, 'north', 'through the mysterious portal']
      );

      const connectionId = connectionResult.lastID;
      const unfilledConnection = await db.get<UnfilledConnection>(
        'SELECT * FROM connections WHERE id = ?',
        [connectionId]
      );

      // Mock AI response for room generation
      const mockGrokClient = {
        generateRoom: jest.fn().mockResolvedValue({
          name: 'Portal Chamber',
          description: 'A chamber containing swirling portals.',
          connections: [
            { direction: 'south', name: 'back through the portal' },
            { direction: 'up', name: 'ascending spiral ramp' }
          ]
        }),
        generateRegion: jest.fn()
      };

      const mockRegionService = {
        shouldCreateNewRegion: jest.fn().mockReturnValue(false),
        getRegionsForGame: jest.fn().mockResolvedValue([]),
        getRegion: jest.fn().mockResolvedValue({ id: 1, type: 'mansion', description: 'A grand manor' }),
        getAdjacentRoomDescriptions: jest.fn().mockResolvedValue([]),
        buildRoomGenerationPrompt: jest.fn().mockResolvedValue('mansion themed prompt'),
        generateRegionDistance: jest.fn().mockReturnValue(1)
      };

      const roomGenService = new (await import('../src/services/roomGenerationService')).RoomGenerationService(
        db,
        mockGrokClient as any,
        mockRegionService as any,
        { enableDebugLogging: false }
      );

      // Fill the unfilled connection
      const result = await roomGenService.generateRoomForConnection(unfilledConnection!);

      expect(result.success).toBe(true);
      expect(result.roomId).toBeDefined();

      // Verify the connection is now filled
      const filledConnection = await db.get(
        'SELECT * FROM connections WHERE id = ?',
        [connectionId]
      );
      expect(filledConnection.to_room_id).toBe(result.roomId);

      // Verify return connection was created
      const returnConnection = await db.get(
        'SELECT * FROM connections WHERE from_room_id = ? AND to_room_id = ? AND direction = ?',
        [result.roomId, 1, 'south']
      );
      expect(returnConnection).toBeDefined();

      // Verify new unfilled connection was created for 'up' direction
      const newUnfilledConnection = await db.get<UnfilledConnection>(
        'SELECT * FROM connections WHERE from_room_id = ? AND direction = ? AND to_room_id IS NULL',
        [result.roomId, 'up']
      );
      expect(newUnfilledConnection).toBeDefined();
      expect(newUnfilledConnection!.name).toBe('ascending spiral ramp');
    });
  });

  describe('Type Safety', () => {
    it('should properly type narrow unfilled vs filled connections', async () => {
      const gameId = await createGameWithRooms(db, `Test Game ${Date.now()}-${Math.random()}`);
      
      // Insert unfilled connection
      await db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, 1, null, 'north', 'unfilled']
      );
      
      // Query unfilled connections with type narrowing
      const unfilledConnections = await db.all<UnfilledConnection>(
        'SELECT * FROM connections WHERE game_id = ? AND to_room_id IS NULL',
        [gameId]
      );
      
      // TypeScript should know to_room_id is null
      for (const connection of unfilledConnections) {
        // This should compile without type errors
        const isNull: null = connection.to_room_id;
        expect(isNull).toBeNull();
      }
      
      // Query filled connections with type narrowing
      const filledConnections = await db.all<FilledConnection>(
        'SELECT * FROM connections WHERE game_id = ? AND to_room_id IS NOT NULL',
        [gameId]
      );
      
      // TypeScript should know to_room_id is number
      for (const connection of filledConnections) {
        // This should compile without type errors
        const roomId: number = connection.to_room_id;
        expect(typeof roomId).toBe('number');
        expect(roomId).toBeGreaterThan(0);
      }
    });
  });
});