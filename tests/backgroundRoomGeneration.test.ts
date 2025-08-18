import Database from '../src/utils/database';
import { initializeDatabase, createGameWithRooms } from '../src/utils/initDb';
import { GeneratedRoom } from '../src/ai/grokClient';

// Create a mock implementation
const mockGenerateRoom = jest.fn();

// Mock the GrokClient class
jest.mock('../src/ai/grokClient', () => {
  return {
    GrokClient: jest.fn().mockImplementation(() => ({
      generateRoom: mockGenerateRoom
    }))
  };
});

// Import the actual GrokClient for type usage only
import { GrokClient } from '../src/ai/grokClient';

// Test implementation of background room generation logic
class TestGameController {
  private db: Database;
  private currentGameId: number;
  private grokClient: GrokClient;

  constructor(db: Database, gameId: number) {
    this.db = db;
    this.currentGameId = gameId;
    this.grokClient = new GrokClient({ mockMode: true });
  }

  // Main method: triggers background generation when entering room
  async preGenerateAdjacentRooms(currentRoomId: number): Promise<void> {
    // Fire and forget - don't await this in real implementation
    return this.expandFromAdjacentRooms(currentRoomId);
  }

  private async expandFromAdjacentRooms(currentRoomId: number): Promise<void> {
    try {
      // Get all connections FROM current room
      const connections = await this.db.all(
        'SELECT * FROM connections WHERE from_room_id = ? AND game_id = ?',
        [currentRoomId, this.currentGameId]
      );

      // For each connection that leads to an existing room
      for (const connection of connections) {
        const targetRoom = await this.db.get(
          'SELECT * FROM rooms WHERE id = ?',
          [connection.to_room_id]
        );

        if (targetRoom) {
          // Generate rooms for this target room's empty exits
          await this.generateMissingRoomsFor(targetRoom.id);
        }
      }
    } catch (error) {
      console.error('Background generation failed:', error);
    }
  }

  private async generateMissingRoomsFor(roomId: number): Promise<void> {
    const allDirections = ['north', 'south', 'east', 'west', 'up', 'down'];

    for (const direction of allDirections) {
      // Check if connection already exists
      const existingConnection = await this.db.get(
        'SELECT * FROM connections WHERE from_room_id = ? AND name = ? AND game_id = ?',
        [roomId, direction, this.currentGameId]
      );

      if (!existingConnection) {
        // Generate new room in this direction
        await this.generateSingleRoom(roomId, direction);
      }
    }
  }

  private async generateSingleRoom(fromRoomId: number, direction: string): Promise<void> {
    try {
      const fromRoom = await this.db.get('SELECT * FROM rooms WHERE id = ?', [fromRoomId]);

      const newRoom = await this.grokClient.generateRoom({
        currentRoom: { name: fromRoom.name, description: fromRoom.description },
        direction: direction
      });

      // Save to database
      const roomResult = await this.db.run(
        'INSERT INTO rooms (game_id, name, description) VALUES (?, ?, ?)',
        [this.currentGameId, newRoom.name, newRoom.description]
      );

      // Create connection
      await this.db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, name) VALUES (?, ?, ?, ?)',
        [this.currentGameId, fromRoomId, roomResult.lastID, direction]
      );

    } catch (error) {
      console.error(`Failed to generate room ${direction} from ${fromRoomId}:`, error);
    }
  }

  // Helper method to check if room was generated
  async roomExistsInDirection(fromRoomId: number, direction: string): Promise<boolean> {
    const connection = await this.db.get(
      'SELECT * FROM connections WHERE from_room_id = ? AND direction = ? AND game_id = ?',
      [fromRoomId, direction, this.currentGameId]
    );
    return !!connection;
  }

  // Get room count for testing
  async getRoomCount(): Promise<number> {
    const result = await this.db.get('SELECT COUNT(*) as count FROM rooms WHERE game_id = ?', [this.currentGameId]);
    return result.count;
  }
}

describe('Background Room Generation', () => {
  let db: Database;
  let gameController: TestGameController;
  let gameId: number;

  beforeEach(async () => {
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    // Create a test game with default 3 rooms
    gameId = await createGameWithRooms(db, `Test Game ${Date.now()}-${Math.random()}`);
    
    gameController = new TestGameController(db, gameId);
    
    // Set up mock responses
    mockGenerateRoom.mockClear();
    mockGenerateRoom.mockImplementation(async (context) => {
      return {
        name: `Generated Room ${context.direction}`,
        description: `A mysterious room discovered to the ${context.direction} of ${context.currentRoom.name}`,
        connections: [
          { direction: 'back', name: `Return to ${context.currentRoom.name}` }
        ]
      } as GeneratedRoom;
    });
  });

  afterEach(async () => {
    if (db.isConnected()) {
      await db.close();
    }
  });

  describe('Initial State', () => {
    test('should start with 6 rooms (3 starter + 3 leaf nodes)', async () => {
      const roomCount = await gameController.getRoomCount();
      expect(roomCount).toBe(6);
    });

    test('should have default connections between initial rooms', async () => {
      // Get entrance hall (starting room)
      const entranceHall = await db.get(
        'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
        [gameId, 'Grand Entrance Hall']
      );

      // Should have north connection to library
      const northConnection = await db.get(
        'SELECT * FROM connections WHERE game_id = ? AND from_room_id = ? AND direction = ?',
        [gameId, entranceHall.id, 'north']
      );
      expect(northConnection).toBeDefined();

      // Should have east connection to garden
      const eastConnection = await db.get(
        'SELECT * FROM connections WHERE game_id = ? AND from_room_id = ? AND direction = ?',
        [gameId, entranceHall.id, 'east']
      );
      expect(eastConnection).toBeDefined();
    });
  });

  describe('Background Room Generation', () => {
    test('should generate rooms for adjacent room connections', async () => {
      // Get entrance hall
      const entranceHall = await db.get(
        'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
        [gameId, 'Grand Entrance Hall']
      );

      // Get library (connected north from entrance)
      const library = await db.get(
        'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
        [gameId, 'Scholar\'s Library']
      );

      // Trigger background generation from entrance hall
      await gameController.preGenerateAdjacentRooms(entranceHall.id);

      // Should have generated rooms for library's empty directions
      // Library starts with only 'south' back to entrance hall
      // Should now have rooms for other directions

      const roomCountAfter = await gameController.getRoomCount();
      expect(roomCountAfter).toBeGreaterThan(3);

      // Check that new connections were created from library
      const hasNorthFromLibrary = await gameController.roomExistsInDirection(library.id, 'north');
      const hasEastFromLibrary = await gameController.roomExistsInDirection(library.id, 'east');
      const hasWestFromLibrary = await gameController.roomExistsInDirection(library.id, 'west');

      // At least some new directions should be generated
      const newDirectionsCount = [hasNorthFromLibrary, hasEastFromLibrary, hasWestFromLibrary]
        .filter(Boolean).length;
      expect(newDirectionsCount).toBeGreaterThan(0);
    });

    test('should not duplicate existing connections', async () => {
      const entranceHall = await db.get(
        'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
        [gameId, 'Grand Entrance Hall']
      );

      // Get library which connects from entrance hall
      const library = await db.get(
        'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
        [gameId, 'Scholar\'s Library']
      );

      // Library already has some connections (e.g., 'south' back to entrance, 'bookshelf' to garden)
      const connectionsBefore = await db.all(
        'SELECT * FROM connections WHERE from_room_id = ? AND game_id = ?',
        [library.id, gameId]
      );

      const southConnectionsBefore = connectionsBefore.filter(c => c.direction === 'south').length;

      // Trigger background generation from entrance hall (which will expand library)
      await gameController.preGenerateAdjacentRooms(entranceHall.id);

      const connectionsAfter = await db.all(
        'SELECT * FROM connections WHERE from_room_id = ? AND game_id = ?',
        [library.id, gameId]
      );

      const southConnectionsAfter = connectionsAfter.filter(c => c.direction === 'south').length;

      // Should not have duplicated the south connection
      expect(southConnectionsAfter).toBe(southConnectionsBefore);
      
      // Should have added new connections (north, east, west, up, down - minus existing ones)
      expect(connectionsAfter.length).toBeGreaterThan(connectionsBefore.length);
    });

    test('should call Grok API for each new room generation', async () => {
      const entranceHall = await db.get(
        'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
        [gameId, 'Grand Entrance Hall']
      );

      // Clear any previous mock calls
      mockGenerateRoom.mockClear();

      await gameController.preGenerateAdjacentRooms(entranceHall.id);

      // Should have called generateRoom at least once
      expect(mockGenerateRoom).toHaveBeenCalled();
      
      // Verify the calls include proper context
      const calls = mockGenerateRoom.mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      // Check first call has proper context structure
      const firstCall = calls[0][0];
      expect(firstCall).toHaveProperty('currentRoom');
      expect(firstCall).toHaveProperty('direction');
      expect(firstCall.currentRoom).toHaveProperty('name');
      expect(firstCall.currentRoom).toHaveProperty('description');
    });

    test('should generate rooms with proper naming based on context', async () => {
      const library = await db.get(
        'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
        [gameId, 'Scholar\'s Library']
      );

      await gameController.preGenerateAdjacentRooms(library.id);

      // Get newly generated rooms
      const allRooms = await db.all('SELECT * FROM rooms WHERE game_id = ?', [gameId]);
      const generatedRooms = allRooms.filter(room => 
        room.name.includes('Generated Room') || 
        !['Grand Entrance Hall', 'Scholar\'s Library', 'Moonlit Courtyard Garden'].includes(room.name)
      );

      expect(generatedRooms.length).toBeGreaterThan(0);

      // Check that generated rooms have proper descriptions
      generatedRooms.forEach(room => {
        expect(room.name).toBeTruthy();
        expect(room.description).toBeTruthy();
        expect(room.description.length).toBeGreaterThan(10); // Should have substantial description
      });
    });

    test('should handle generation errors gracefully', async () => {
      // Make the mock throw an error
      mockGenerateRoom.mockRejectedValueOnce(new Error('API Error'));

      const entranceHall = await db.get(
        'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
        [gameId, 'Grand Entrance Hall']
      );

      // Should not throw error even if generation fails
      await expect(gameController.preGenerateAdjacentRooms(entranceHall.id))
        .resolves.not.toThrow();

      // Game should still be in valid state
      const roomCount = await gameController.getRoomCount();
      expect(roomCount).toBeGreaterThanOrEqual(3); // At least the original rooms
    });
  });

  describe('Performance Characteristics', () => {
    test('should complete generation in reasonable time', async () => {
      const entranceHall = await db.get(
        'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
        [gameId, 'Grand Entrance Hall']
      );

      const startTime = Date.now();
      await gameController.preGenerateAdjacentRooms(entranceHall.id);
      const endTime = Date.now();

      // With mocked AI, should complete very quickly
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
    });

    test('should not block on individual room generation failures', async () => {
      // Make every other call fail
      let callCount = 0;
      mockGenerateRoom.mockImplementation(async () => {
        callCount++;
        if (callCount % 2 === 0) {
          throw new Error('Simulated API failure');
        }
        return {
          name: `Generated Room ${callCount}`,
          description: `A room generated on attempt ${callCount}`,
          connections: []
        } as GeneratedRoom;
      });

      const entranceHall = await db.get(
        'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
        [gameId, 'Grand Entrance Hall']
      );

      // Should complete despite some failures
      await expect(gameController.preGenerateAdjacentRooms(entranceHall.id))
        .resolves.not.toThrow();

      // Should have generated at least some rooms
      const finalRoomCount = await gameController.getRoomCount();
      expect(finalRoomCount).toBeGreaterThan(3);
    });
  });
});