import { YamlWorldService } from '../../src/services/yamlWorldService';
import { PrismaService } from '../../src/services/prismaService';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPrismaService = {
  $transaction: jest.fn(),
  game: {
    create: jest.fn(),
    update: jest.fn(),
  },
  region: {
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
  room: {
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
  connection: {
    createMany: jest.fn(),
  },
} as any;

// Mock PrismaService.getInstance to return our mock
jest.mock('../../src/services/prismaService', () => ({
  PrismaService: {
    getInstance: jest.fn(() => mockPrismaService),
  },
}));

describe('YamlWorldService', () => {
  let yamlWorldService: YamlWorldService;

  const validYamlContent = `
world:
  name: "Test Castle"
  description: "A test castle for validation"

regions:
  - id: "castle_main"
    name: "Castle Main"
    theme: "medieval_castle"
    description: "The primary castle structure"

rooms:
  - id: "entrance_hall"
    region_id: "castle_main"
    name: "Grand Entrance Hall"
    description: "You stand in a magnificent hall"
    extended_description: "The hall stretches impressively upward"
    starting_room: true
    
  - id: "throne_room"
    region_id: "castle_main"
    name: "Throne Room"
    description: "A vast chamber with an empty throne"

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

  const invalidYamlMissingStartingRoom = `
world:
  name: "Invalid World"
  
regions:
  - id: "region1"
    name: "Region One"
    theme: "castle"
    
rooms:
  - id: "room1"
    region_id: "region1"
    name: "Room One"
    description: "A room"
    # missing starting_room: true
    
connections: []
`;

  const invalidYamlBrokenReferences = `
world:
  name: "Broken References World"
  
regions:
  - id: "region1"
    name: "Region One"
    theme: "castle"
    
rooms:
  - id: "room1"
    region_id: "nonexistent_region"  # Invalid region reference
    name: "Room One"
    description: "A room"
    starting_room: true
    
connections:
  - from: "room1"
    to: "nonexistent_room"  # Invalid room reference
    direction: "north"
    description: "to nowhere"
`;

  beforeEach(() => {
    jest.clearAllMocks();
    yamlWorldService = new YamlWorldService();
  });

  describe('parseYamlFile', () => {
    it('should parse valid YAML file successfully', () => {
      mockFs.readFileSync.mockReturnValue(validYamlContent);
      mockFs.existsSync.mockReturnValue(true);

      const result = yamlWorldService.parseYamlFile('/test/path/world.yml');

      expect(result).toBeDefined();
      expect(result.world.name).toBe('Test Castle');
      expect(result.regions).toHaveLength(1);
      expect(result.rooms).toHaveLength(2);
      expect(result.connections).toHaveLength(2);
    });

    it('should throw error if file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() => {
        yamlWorldService.parseYamlFile('/nonexistent/world.yml');
      }).toThrow('YAML file does not exist: /nonexistent/world.yml');
    });

    it('should throw error for invalid YAML syntax', () => {
      mockFs.readFileSync.mockReturnValue('invalid: yaml: content: [');
      mockFs.existsSync.mockReturnValue(true);

      expect(() => {
        yamlWorldService.parseYamlFile('/test/invalid.yml');
      }).toThrow(/Failed to parse YAML file/);
    });
  });

  describe('validateWorldDefinition', () => {
    it('should validate correct world definition', () => {
      mockFs.readFileSync.mockReturnValue(validYamlContent);
      mockFs.existsSync.mockReturnValue(true);
      
      const worldDef = yamlWorldService.parseYamlFile('/test/world.yml');
      
      expect(() => {
        yamlWorldService.validateWorldDefinition(worldDef);
      }).not.toThrow();
    });

    it('should throw error for missing starting room', () => {
      mockFs.readFileSync.mockReturnValue(invalidYamlMissingStartingRoom);
      mockFs.existsSync.mockReturnValue(true);
      
      const worldDef = yamlWorldService.parseYamlFile('/test/invalid.yml');
      
      expect(() => {
        yamlWorldService.validateWorldDefinition(worldDef);
      }).toThrow('Exactly one room must be marked as starting_room: true');
    });

    it('should throw error for multiple starting rooms', () => {
      const multipleStartingRooms = validYamlContent.replace(
        'description: "A vast chamber with an empty throne"',
        'description: "A vast chamber with an empty throne"\n    starting_room: true'
      );
      
      mockFs.readFileSync.mockReturnValue(multipleStartingRooms);
      mockFs.existsSync.mockReturnValue(true);
      
      const worldDef = yamlWorldService.parseYamlFile('/test/invalid.yml');
      
      expect(() => {
        yamlWorldService.validateWorldDefinition(worldDef);
      }).toThrow('Exactly one room must be marked as starting_room: true');
    });

    it('should throw error for broken region references', () => {
      mockFs.readFileSync.mockReturnValue(invalidYamlBrokenReferences);
      mockFs.existsSync.mockReturnValue(true);
      
      const worldDef = yamlWorldService.parseYamlFile('/test/invalid.yml');
      
      expect(() => {
        yamlWorldService.validateWorldDefinition(worldDef);
      }).toThrow(/Validation failed.*Invalid region_id reference/);
    });

    it('should throw error for broken room references in connections', () => {
      mockFs.readFileSync.mockReturnValue(invalidYamlBrokenReferences);
      mockFs.existsSync.mockReturnValue(true);
      
      const worldDef = yamlWorldService.parseYamlFile('/test/invalid.yml');
      
      expect(() => {
        yamlWorldService.validateWorldDefinition(worldDef);
      }).toThrow(/Validation failed.*Invalid room reference in connection/);
    });

    it('should validate room connectivity from starting room', () => {
      const disconnectedWorld = `
world:
  name: "Disconnected World"
  
regions:
  - id: "region1"
    name: "Region One"
    theme: "castle"
    
rooms:
  - id: "room1"
    region_id: "region1" 
    name: "Room One"
    description: "Starting room"
    starting_room: true
    
  - id: "room2"
    region_id: "region1"
    name: "Room Two" 
    description: "Disconnected room"
    
connections: []  # No connections - room2 is unreachable
`;
      
      mockFs.readFileSync.mockReturnValue(disconnectedWorld);
      mockFs.existsSync.mockReturnValue(true);
      
      const worldDef = yamlWorldService.parseYamlFile('/test/disconnected.yml');
      
      expect(() => {
        yamlWorldService.validateWorldDefinition(worldDef);
      }).toThrow(/Not all rooms are reachable from starting room/);
    });
  });

  describe('createWorldInDatabase', () => {
    it('should create world in database with transaction', async () => {
      mockFs.readFileSync.mockReturnValue(validYamlContent);
      mockFs.existsSync.mockReturnValue(true);
      
      const createdGame = { id: 1, currentRoomId: null };
      const createdRegions = [{ id: 1, name: 'Castle Main' }];
      const createdRooms = [
        { id: 1, name: 'Grand Entrance Hall' },
        { id: 2, name: 'Throne Room' }
      ];
      
      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockPrismaService);
      });
      
      mockPrismaService.game.create.mockResolvedValue(createdGame);
      mockPrismaService.region.createMany.mockResolvedValue({ count: 1 });
      mockPrismaService.region.findMany.mockResolvedValue([
        { id: 1, name: 'Castle Main', theme: 'medieval_castle' }
      ]);
      mockPrismaService.room.createMany.mockResolvedValue({ count: 2 });
      mockPrismaService.room.findMany.mockResolvedValue(createdRooms);
      mockPrismaService.connection.createMany.mockResolvedValue({ count: 2 });

      const result = await yamlWorldService.createWorldFromYaml('/test/world.yml');

      expect(result.gameId).toBe(1);
      expect(result.roomCount).toBe(2);
      expect(result.regionCount).toBe(1);
      expect(result.connectionCount).toBe(2);
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors gracefully', async () => {
      mockFs.readFileSync.mockReturnValue(validYamlContent);
      mockFs.existsSync.mockReturnValue(true);
      
      const dbError = new Error('Database connection failed');
      mockPrismaService.$transaction.mockRejectedValue(dbError);

      await expect(
        yamlWorldService.createWorldFromYaml('/test/world.yml')
      ).rejects.toThrow('Failed to create world in database: Database connection failed');
    });

    it('should set currentRoomId to starting room', async () => {
      mockFs.readFileSync.mockReturnValue(validYamlContent);
      mockFs.existsSync.mockReturnValue(true);
      
      let gameUpdateData: any;
      
      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        return await callback({
          ...mockPrismaService,
          game: {
            ...mockPrismaService.game,
            update: jest.fn().mockImplementation((data) => {
              gameUpdateData = data;
              return { id: 1, currentRoomId: 1 };
            })
          }
        });
      });
      
      mockPrismaService.game.create.mockResolvedValue({ id: 1, currentRoomId: null });
      mockPrismaService.region.createMany.mockResolvedValue({ count: 1 });
      mockPrismaService.region.findMany.mockResolvedValue([
        { id: 1, name: 'Castle Main', theme: 'medieval_castle' }
      ]);
      mockPrismaService.room.createMany.mockResolvedValue({ count: 2 });
      mockPrismaService.room.findMany.mockResolvedValue([
        { id: 1, name: 'Grand Entrance Hall' },
        { id: 2, name: 'Throne Room' }
      ]);
      mockPrismaService.connection.createMany.mockResolvedValue({ count: 2 });

      await yamlWorldService.createWorldFromYaml('/test/world.yml');

      expect(gameUpdateData).toBeDefined();
      expect(gameUpdateData.data.currentRoomId).toBe(1); // Starting room should be first created room
    });
  });

  describe('Error Handling', () => {
    it('should provide detailed error messages for validation failures', () => {
      const invalidData = {
        world: { name: 'Test' },
        regions: [],
        rooms: [],
        connections: []
      };

      expect(() => {
        yamlWorldService.validateWorldDefinition(invalidData);
      }).toThrow(/Exactly one room must be marked as starting_room: true/);
    });

    it('should handle YAML parsing errors with context', () => {
      mockFs.readFileSync.mockReturnValue('invalid: [unclosed bracket');
      mockFs.existsSync.mockReturnValue(true);

      expect(() => {
        yamlWorldService.parseYamlFile('/test/broken.yml');
      }).toThrow(/Failed to parse YAML file.*broken\.yml/);
    });
  });

  describe('Data Transformation', () => {
    it('should transform YAML data to database format correctly', () => {
      mockFs.readFileSync.mockReturnValue(validYamlContent);
      mockFs.existsSync.mockReturnValue(true);
      
      const worldDef = yamlWorldService.parseYamlFile('/test/world.yml');
      
      expect(worldDef.rooms[0].name).toBe('Grand Entrance Hall');
      expect(worldDef.rooms[0].description).toBe('You stand in a magnificent hall');
      expect(worldDef.rooms[0].extended_description).toBe('The hall stretches impressively upward');
      expect(worldDef.connections[0].from).toBe('entrance_hall');
      expect(worldDef.connections[0].to).toBe('throne_room');
    });
  });
});