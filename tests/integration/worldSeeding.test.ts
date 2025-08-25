import { YamlWorldService } from '../../src/services/yamlWorldService';
import { PrismaService } from '../../src/services/prismaService';
import * as path from 'path';

describe('World Seeding Integration', () => {
  let yamlWorldService: YamlWorldService;
  let prismaService: PrismaService;
  let startingRegionPath: string;

  beforeAll(async () => {
    yamlWorldService = new YamlWorldService();
    prismaService = PrismaService.getInstance();
    await prismaService.connect();
    
    startingRegionPath = path.join(__dirname, '../../worlds/starting-region.yml');
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

  describe('Starting Region World', () => {
    it('should successfully seed the starting region world', async () => {
      const result = await yamlWorldService.createWorldFromYaml(startingRegionPath);

      // Verify basic structure
      expect(result.gameId).toBeDefined();
      expect(result.roomCount).toBe(12); // 12-room castle
      expect(result.regionCount).toBe(2); // castle_main + castle_grounds
      expect(result.startingRoomId).toBeDefined();

      // Get the created game with all relations
      const game = await prismaService.game.findFirst({
        where: { id: result.gameId },
        include: {
          rooms: {
            include: {
              region: true,
              connectionsFrom: true,
              connectionsTo: true,
            },
          },
          regions: true,
          connections: true,
          currentRoom: true,
        },
      });

      expect(game).toBeDefined();
      expect(game!.rooms).toHaveLength(12);
      expect(game!.regions).toHaveLength(2);
      expect(game!.currentRoomId).toBe(result.startingRoomId);

      // Verify regions exist
      const castleMain = game!.regions.find(r => r.theme === 'medieval_castle');
      const castleGrounds = game!.regions.find(r => r.theme === 'medieval_courtyard');
      
      expect(castleMain).toBeDefined();
      expect(castleMain!.name).toBe('Castle Main');
      expect(castleGrounds).toBeDefined();
      expect(castleGrounds!.name).toBe('Castle Grounds');

      // Verify starting room
      const startingRoom = game!.currentRoom;
      expect(startingRoom).toBeDefined();
      expect(startingRoom!.name).toBe('Grand Entrance Hall');
      expect(startingRoom!.visited).toBe(true);
      
      // Verify room structure with three core fields
      startingRoom!.description && expect(startingRoom!.description).toContain('magnificent hall');
      startingRoom!.extendedDescription && expect(startingRoom!.extendedDescription).toContain('entrance hall stretches');
    });

    it('should create proper room connectivity', async () => {
      const result = await yamlWorldService.createWorldFromYaml(startingRegionPath);
      
      const connections = await prismaService.connection.findMany({
        where: { gameId: result.gameId },
        include: {
          fromRoom: true,
          toRoom: true,
        },
      });

      // Should have multiple bi-directional connections plus one unfilled
      expect(connections.length).toBeGreaterThan(20);

      // Find entrance hall connections
      const entranceHall = await prismaService.room.findFirst({
        where: { 
          gameId: result.gameId,
          name: 'Grand Entrance Hall'
        },
      });

      const entranceConnections = connections.filter(
        c => c.fromRoomId === entranceHall!.id
      );

      expect(entranceConnections.length).toBeGreaterThanOrEqual(3); // north, east, south

      // Verify bi-directional nature - each connection should have a return
      for (const conn of entranceConnections.filter(c => c.toRoomId !== null)) {
        const returnConnection = connections.find(
          c => c.fromRoomId === conn.toRoomId && c.toRoomId === conn.fromRoomId
        );
        expect(returnConnection).toBeDefined();
      }
    });

    it('should include unfilled locked connection', async () => {
      const result = await yamlWorldService.createWorldFromYaml(startingRegionPath);
      
      const unfilledConnections = await prismaService.connection.findMany({
        where: { 
          gameId: result.gameId,
          toRoomId: null,
        },
        include: {
          fromRoom: true,
        },
      });

      expect(unfilledConnections.length).toBe(1);
      
      const unfilledConn = unfilledConnections[0];
      expect(unfilledConn.fromRoom.name).toBe('Castle Gatehouse');
      expect(unfilledConn.direction).toBe('south');
      expect(unfilledConn.locked).toBe(true);
      expect(unfilledConn.requiredKey).toBe('ancient_iron_key');
      expect(unfilledConn.description).toContain('sealed iron gate');
    });

    it('should validate all rooms are reachable from starting room', async () => {
      const result = await yamlWorldService.createWorldFromYaml(startingRegionPath);
      
      // Perform BFS traversal from starting room
      const connections = await prismaService.connection.findMany({
        where: { 
          gameId: result.gameId,
          toRoomId: { not: null }, // Only filled connections
        },
      });

      const rooms = await prismaService.room.findMany({
        where: { gameId: result.gameId },
      });

      // Build adjacency graph
      const graph = new Map<number, number[]>();
      rooms.forEach(room => graph.set(room.id, []));
      
      connections.forEach(conn => {
        if (conn.toRoomId) {
          graph.get(conn.fromRoomId)?.push(conn.toRoomId);
        }
      });

      // BFS from starting room
      const visited = new Set<number>();
      const queue = [result.startingRoomId];
      visited.add(result.startingRoomId);

      while (queue.length > 0) {
        const currentRoom = queue.shift()!;
        const neighbors = graph.get(currentRoom) || [];
        
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      // All 12 rooms should be reachable
      expect(visited.size).toBe(12);
    });

    it('should contain expected key rooms with proper descriptions', async () => {
      const result = await yamlWorldService.createWorldFromYaml(startingRegionPath);
      
      const rooms = await prismaService.room.findMany({
        where: { gameId: result.gameId },
        include: { region: true },
      });

      // Key rooms that should exist
      const expectedRooms = [
        'Grand Entrance Hall',
        'Abandoned Throne Room', 
        'Great Hall',
        'Dusty Library',
        'Castle Armory',
        'Sacred Chapel',
        'Castle Kitchen',
        'Scholar\'s Study',
        'Inner Courtyard',
        'Watch Tower',
        'Abandoned Stables',
        'Castle Gatehouse'
      ];

      expectedRooms.forEach(roomName => {
        const room = rooms.find(r => r.name === roomName);
        expect(room).toBeDefined();
        expect(room!.description).toBeDefined();
        expect(room!.description.length).toBeGreaterThan(20); // Meaningful description
        
        // Verify region assignment
        expect(room!.region).toBeDefined();
        expect(['medieval_castle', 'medieval_courtyard']).toContain(room!.region!.theme);
      });
    });

    it('should properly distribute rooms between regions', async () => {
      const result = await yamlWorldService.createWorldFromYaml(startingRegionPath);
      
      const rooms = await prismaService.room.findMany({
        where: { gameId: result.gameId },
        include: { region: true },
      });

      const castleMainRooms = rooms.filter(r => r.region?.theme === 'medieval_castle');
      const castleGroundsRooms = rooms.filter(r => r.region?.theme === 'medieval_courtyard');

      // Castle Main should have 8 rooms, Castle Grounds should have 4 rooms
      expect(castleMainRooms.length).toBe(8);
      expect(castleGroundsRooms.length).toBe(4);

      // Verify specific room assignments
      const expectedCastleMain = [
        'Grand Entrance Hall', 'Abandoned Throne Room', 'Great Hall', 
        'Dusty Library', 'Castle Armory', 'Sacred Chapel', 
        'Castle Kitchen', 'Scholar\'s Study'
      ];

      const expectedCastleGrounds = [
        'Inner Courtyard', 'Watch Tower', 'Abandoned Stables', 'Castle Gatehouse'
      ];

      expectedCastleMain.forEach(name => {
        expect(castleMainRooms.some(r => r.name === name)).toBe(true);
      });

      expectedCastleGrounds.forEach(name => {
        expect(castleGroundsRooms.some(r => r.name === name)).toBe(true);
      });
    });

    it('should handle YAML parsing errors gracefully', async () => {
      const invalidPath = path.join(__dirname, '../../worlds/nonexistent.yml');
      
      await expect(
        yamlWorldService.createWorldFromYaml(invalidPath)
      ).rejects.toThrow(/YAML file does not exist/);
    });
  });
});