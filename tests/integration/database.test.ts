import { PrismaService } from '../../src/services/prismaService';

describe('Database Integration', () => {
  let prismaService: PrismaService;

  beforeAll(async () => {
    prismaService = PrismaService.getInstance();
    await prismaService.connect();
  });

  afterAll(async () => {
    await prismaService.disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
    await prismaService.connection.deleteMany();
    await prismaService.room.deleteMany();
    await prismaService.region.deleteMany();
    await prismaService.game.deleteMany();
  });

  describe('Database Connection', () => {
    it('should connect to database successfully', async () => {
      const isHealthy = await prismaService.healthCheck();
      expect(isHealthy).toBe(true);
    });
  });

  describe('Room Model Operations', () => {
    it('should create and retrieve a game with room', async () => {
      // Create a game
      const game = await prismaService.game.create({
        data: {
          maxRoomsPerGame: 100,
          roomCount: 0,
          generationCooldownMs: 10000,
        },
      });

      expect(game.id).toBeDefined();
      expect(game.maxRoomsPerGame).toBe(100);

      // Create a room with the three core fields
      const room = await prismaService.room.create({
        data: {
          gameId: game.id,
          name: 'Test Room',
          description: 'A simple test room for validation',
          extendedDescription: 'This room contains additional details that can be discovered through examination.',
          visited: false,
          locked: false,
        },
      });

      expect(room.id).toBeDefined();
      expect(room.name).toBe('Test Room');
      expect(room.description).toBe('A simple test room for validation');
      expect(room.extendedDescription).toBe('This room contains additional details that can be discovered through examination.');
      expect(room.gameId).toBe(game.id);
    });

    it('should handle room with nullable extended_description', async () => {
      // Create a game
      const game = await prismaService.game.create({
        data: {
          maxRoomsPerGame: 100,
          roomCount: 0,
          generationCooldownMs: 10000,
        },
      });

      // Create a room without extended description
      const room = await prismaService.room.create({
        data: {
          gameId: game.id,
          name: 'Simple Room',
          description: 'A basic room without extended details',
          // extendedDescription is optional/nullable
          visited: false,
          locked: false,
        },
      });

      expect(room.extendedDescription).toBeNull();
    });
  });

  describe('Region and Connection Models', () => {
    it('should create region and connection relationships', async () => {
      // Create game and region
      const game = await prismaService.game.create({
        data: {
          maxRoomsPerGame: 100,
          roomCount: 0,
          generationCooldownMs: 10000,
        },
      });

      const region = await prismaService.region.create({
        data: {
          gameId: game.id,
          name: 'Test Region',
          theme: 'castle',
          description: 'A test region for validation',
        },
      });

      // Create two connected rooms
      const room1 = await prismaService.room.create({
        data: {
          gameId: game.id,
          regionId: region.id,
          name: 'Room One',
          description: 'The first room',
          visited: false,
          locked: false,
        },
      });

      const room2 = await prismaService.room.create({
        data: {
          gameId: game.id,
          regionId: region.id,
          name: 'Room Two',
          description: 'The second room',
          visited: false,
          locked: false,
        },
      });

      // Create uni-directional connection
      const connection = await prismaService.connection.create({
        data: {
          gameId: game.id,
          fromRoomId: room1.id,
          toRoomId: room2.id,
          direction: 'north',
          description: 'through the wooden door',
          locked: false,
        },
      });

      expect(connection.fromRoomId).toBe(room1.id);
      expect(connection.toRoomId).toBe(room2.id);
      expect(connection.direction).toBe('north');
    });

    it('should create unfilled connection (toRoomId null)', async () => {
      // Create game and room
      const game = await prismaService.game.create({
        data: {
          maxRoomsPerGame: 100,
          roomCount: 0,
          generationCooldownMs: 10000,
        },
      });

      const room = await prismaService.room.create({
        data: {
          gameId: game.id,
          name: 'Starting Room',
          description: 'A room with an unfilled connection',
          visited: false,
          locked: false,
        },
      });

      // Create unfilled connection for AI generation
      const connection = await prismaService.connection.create({
        data: {
          gameId: game.id,
          fromRoomId: room.id,
          toRoomId: null, // Unfilled connection
          direction: 'east',
          description: 'through the mysterious passage',
          locked: false,
        },
      });

      expect(connection.toRoomId).toBeNull();
      expect(connection.direction).toBe('east');
    });
  });
});