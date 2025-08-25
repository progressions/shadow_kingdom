import { YamlWorldService } from '../../src/services/yamlWorldService';
import { PrismaService } from '../../src/services/prismaService';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('YamlWorldService Integration', () => {
  let yamlWorldService: YamlWorldService;
  let prismaService: PrismaService;
  let tempYamlFile: string;

  const testYamlContent = `
world:
  name: "Integration Test Castle"
  description: "A test castle for integration testing"

regions:
  - id: "castle_main"
    name: "Castle Main"
    theme: "medieval_castle"
    description: "The primary castle structure"

rooms:
  - id: "entrance_hall"
    region_id: "castle_main"
    name: "Grand Entrance Hall"
    description: "You stand in a magnificent hall with towering stone pillars."
    extended_description: "The entrance hall stretches impressively upward with intricate carvings."
    starting_room: true
    
  - id: "throne_room"
    region_id: "castle_main"
    name: "Royal Throne Room"
    description: "A vast chamber dominated by an ornate throne."
    extended_description: "The throne room speaks of former grandeur with high vaulted ceilings."

connections:
  - from: "entrance_hall"
    to: "throne_room"
    direction: "north"
    description: "through the ornate archway"
    
  - from: "throne_room"
    to: "entrance_hall"
    direction: "south"
    description: "back through the ornate archway"
`;

  beforeAll(async () => {
    yamlWorldService = new YamlWorldService();
    prismaService = PrismaService.getInstance();
    await prismaService.connect();

    // Create temporary YAML file
    tempYamlFile = path.join(os.tmpdir(), `test-world-${Date.now()}.yml`);
    fs.writeFileSync(tempYamlFile, testYamlContent);
  });

  afterAll(async () => {
    // Clean up temp file
    if (fs.existsSync(tempYamlFile)) {
      fs.unlinkSync(tempYamlFile);
    }
    await prismaService.disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
    await prismaService.connection.deleteMany();
    await prismaService.room.deleteMany();
    await prismaService.region.deleteMany();
    await prismaService.game.deleteMany();
  });

  describe('End-to-End YAML World Creation', () => {
    it('should create complete world from YAML file', async () => {
      const result = await yamlWorldService.createWorldFromYaml(tempYamlFile);

      // Verify creation result
      expect(result.gameId).toBeDefined();
      expect(result.roomCount).toBe(2);
      expect(result.regionCount).toBe(1);
      expect(result.connectionCount).toBe(2);
      expect(result.startingRoomId).toBeDefined();

      // Verify game was created
      const game = await prismaService.game.findFirst({
        where: { id: result.gameId },
        include: {
          rooms: true,
          regions: true,
          connections: true,
          currentRoom: true,
        },
      });

      expect(game).toBeDefined();
      expect(game!.rooms).toHaveLength(2);
      expect(game!.regions).toHaveLength(1);
      expect(game!.connections).toHaveLength(2);
      expect(game!.currentRoomId).toBe(result.startingRoomId);

      // Verify room data
      const entranceHall = game!.rooms.find(room => room.name === 'Grand Entrance Hall');
      const throneRoom = game!.rooms.find(room => room.name === 'Royal Throne Room');

      expect(entranceHall).toBeDefined();
      expect(entranceHall!.description).toBe('You stand in a magnificent hall with towering stone pillars.');
      expect(entranceHall!.extendedDescription).toBe('The entrance hall stretches impressively upward with intricate carvings.');
      expect(entranceHall!.visited).toBe(true); // Starting room should be visited

      expect(throneRoom).toBeDefined();
      expect(throneRoom!.description).toBe('A vast chamber dominated by an ornate throne.');
      expect(throneRoom!.extendedDescription).toBe('The throne room speaks of former grandeur with high vaulted ceilings.');
      expect(throneRoom!.visited).toBe(false); // Non-starting room should not be visited

      // Verify region data
      const region = game!.regions[0];
      expect(region.name).toBe('Castle Main');
      expect(region.theme).toBe('medieval_castle');
      expect(region.description).toBe('The primary castle structure');

      // Verify connections
      const northConnection = game!.connections.find(c => c.direction === 'north');
      const southConnection = game!.connections.find(c => c.direction === 'south');

      expect(northConnection).toBeDefined();
      expect(northConnection!.fromRoomId).toBe(entranceHall!.id);
      expect(northConnection!.toRoomId).toBe(throneRoom!.id);
      expect(northConnection!.description).toBe('through the ornate archway');

      expect(southConnection).toBeDefined();
      expect(southConnection!.fromRoomId).toBe(throneRoom!.id);
      expect(southConnection!.toRoomId).toBe(entranceHall!.id);
      expect(southConnection!.description).toBe('back through the ornate archway');
    });

    it('should handle validation errors properly', async () => {
      const invalidYaml = `
world:
  name: "Invalid World"
regions: []  # No regions - should fail validation
rooms:
  - id: "room1"
    name: "Room"
    description: "A room"
    starting_room: true
connections: []
`;

      const invalidFile = path.join(os.tmpdir(), `invalid-world-${Date.now()}.yml`);
      fs.writeFileSync(invalidFile, invalidYaml);

      try {
        await expect(
          yamlWorldService.createWorldFromYaml(invalidFile)
        ).rejects.toThrow(/YAML validation failed/);
      } finally {
        fs.unlinkSync(invalidFile);
      }
    });

    it('should validate room connectivity requirements', async () => {
      const disconnectedYaml = `
world:
  name: "Disconnected World"
regions:
  - id: "region1"
    name: "Region"
    theme: "castle"
rooms:
  - id: "room1"
    region_id: "region1"
    name: "Room 1"
    description: "Starting room"
    starting_room: true
  - id: "room2"
    region_id: "region1"
    name: "Room 2"
    description: "Disconnected room"
connections: []  # No connections - room2 unreachable
`;

      const disconnectedFile = path.join(os.tmpdir(), `disconnected-world-${Date.now()}.yml`);
      fs.writeFileSync(disconnectedFile, disconnectedYaml);

      try {
        await expect(
          yamlWorldService.createWorldFromYaml(disconnectedFile)
        ).rejects.toThrow(/Not all rooms are reachable from starting room/);
      } finally {
        fs.unlinkSync(disconnectedFile);
      }
    });
  });
});