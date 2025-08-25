import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { z } from 'zod';
import { PrismaService } from './prismaService';
import {
  WorldDefinition,
  WorldDefinitionSchema,
  WorldCreationResult,
  ValidationError,
  ConnectivityGraph,
  RoomNode,
  DatabaseRegionData,
  DatabaseRoomData,
  DatabaseConnectionData,
  DatabaseItemData,
  DatabaseCharacterData,
  VALID_DIRECTIONS
} from '../types/worldSchema';

export class YamlWorldService {
  private prismaService: PrismaService;

  constructor() {
    this.prismaService = PrismaService.getInstance();
  }

  /**
   * Parse YAML file and return WorldDefinition
   */
  public parseYamlFile(filePath: string): WorldDefinition {
    if (!fs.existsSync(filePath)) {
      throw new Error(`YAML file does not exist: ${filePath}`);
    }

    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsedData = yaml.load(fileContent) as unknown;
      
      // Validate against schema
      const validatedData = WorldDefinitionSchema.parse(parsedData);
      return validatedData;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        throw new Error(`YAML validation failed: ${validationErrors}`);
      }
      throw new Error(`Failed to parse YAML file ${filePath}: ${error}`);
    }
  }

  /**
   * Validate world definition for logical consistency
   */
  public validateWorldDefinition(worldDef: WorldDefinition): void {
    const errors: ValidationError[] = [];

    // Validate starting room
    this.validateStartingRoom(worldDef, errors);

    // Validate region references
    this.validateRegionReferences(worldDef, errors);

    // Validate room references in connections
    this.validateRoomReferences(worldDef, errors);

    // Validate item room references
    this.validateItemReferences(worldDef, errors);

    // Validate character room references
    this.validateCharacterReferences(worldDef, errors);

    // Validate connection directions
    this.validateConnectionDirections(worldDef, errors);

    // Validate required keys exist
    this.validateRequiredKeys(worldDef, errors);

    // Only validate room connectivity if there are no reference errors
    if (errors.length === 0) {
      this.validateRoomConnectivity(worldDef, errors);
    }

    if (errors.length > 0) {
      const errorMessages = errors.map(err => `${err.field}: ${err.message}`).join('; ');
      throw new Error(`Validation failed: ${errorMessages}`);
    }
  }

  /**
   * Create world in database from YAML file
   */
  public async createWorldFromYaml(yamlFilePath: string): Promise<WorldCreationResult> {
    try {
      // Parse and validate YAML
      const worldDef = this.parseYamlFile(yamlFilePath);
      this.validateWorldDefinition(worldDef);

      // Create world in database with transaction
      const result = await this.prismaService.$transaction(async (prisma) => {
        // Create game
        const game = await prisma.game.create({
          data: {
            maxRoomsPerGame: 100,
            roomCount: worldDef.rooms.length,
            generationCooldownMs: 10000,
          },
        });

        // Create regions
        const regionData: DatabaseRegionData[] = worldDef.regions.map(region => ({
          gameId: game.id,
          name: region.name,
          theme: region.theme,
          description: region.description,
        }));

        await prisma.region.createMany({ data: regionData });

        // Get created regions for ID mapping
        const createdRegions = await prisma.region.findMany({
          where: { gameId: game.id },
          select: { id: true, name: true, theme: true }
        });

        const regionIdMap = new Map<string, number>();
        worldDef.regions.forEach((regionDef, index) => {
          const createdRegion = createdRegions.find(r => 
            r.name === regionDef.name && r.theme === regionDef.theme
          );
          if (createdRegion) {
            regionIdMap.set(regionDef.id, createdRegion.id);
          }
        });

        // Create rooms
        const roomData: DatabaseRoomData[] = worldDef.rooms.map(room => ({
          gameId: game.id,
          regionId: room.region_id ? regionIdMap.get(room.region_id) : undefined,
          name: room.name,
          description: room.description,
          extendedDescription: room.extended_description,
          visited: room.starting_room || false,
          locked: false,
        }));

        await prisma.room.createMany({ data: roomData });

        // Get created rooms for ID mapping
        const createdRooms = await prisma.room.findMany({
          where: { gameId: game.id },
          select: { id: true, name: true },
          orderBy: { id: 'asc' }
        });

        const roomIdMap = new Map<string, number>();
        worldDef.rooms.forEach((roomDef, index) => {
          const createdRoom = createdRooms[index];
          if (createdRoom) {
            roomIdMap.set(roomDef.id, createdRoom.id);
          }
        });

        // Find starting room
        const startingRoomDef = worldDef.rooms.find(room => room.starting_room);
        const startingRoomId = startingRoomDef ? roomIdMap.get(startingRoomDef.id) : createdRooms[0]?.id;

        // Update game with starting room
        if (startingRoomId) {
          await prisma.game.update({
            where: { id: game.id },
            data: { currentRoomId: startingRoomId }
          });
        }

        // Create connections
        const connectionData: DatabaseConnectionData[] = worldDef.connections.map(conn => ({
          gameId: game.id,
          fromRoomId: roomIdMap.get(conn.from)!,
          toRoomId: conn.to ? roomIdMap.get(conn.to) : undefined,
          direction: conn.direction,
          description: conn.description,
          locked: conn.locked || false,
          requiredKey: conn.required_key,
        }));

        await prisma.connection.createMany({ data: connectionData });

        // Create items
        let itemCount = 0;
        if (worldDef.items && worldDef.items.length > 0) {
          const itemData: DatabaseItemData[] = worldDef.items.map(item => ({
            gameId: game.id,
            roomId: item.room_id ? roomIdMap.get(item.room_id) : undefined,
            name: item.name,
            description: item.description,
            extendedDescription: item.extended_description,
            type: item.type,
            hidden: item.hidden || false,
            value: item.value,
          }));

          await prisma.item.createMany({ data: itemData });
          itemCount = worldDef.items.length;
        }

        // Create characters
        let characterCount = 0;
        if (worldDef.characters && worldDef.characters.length > 0) {
          const characterData: DatabaseCharacterData[] = worldDef.characters.map(character => ({
            gameId: game.id,
            roomId: roomIdMap.get(character.room_id)!,
            name: character.name,
            description: character.description,
            sentiment: character.type === 'hostile' ? 'hostile' : 
                      character.type === 'friendly' ? 'friendly' : 'neutral',
            health: character.health || 20,
            maxHealth: character.health || 20,
            attack: character.attack || 5,
            defense: character.defense || 1,
            alive: true,
            dialogueFriendly: character.dialogue?.friendly,
            dialogueHostile: character.dialogue?.hostile,
            dialogueDefeated: character.dialogue?.defeated,
          }));

          await prisma.character.createMany({ data: characterData });
          characterCount = worldDef.characters.length;
        }

        return {
          gameId: game.id,
          roomCount: worldDef.rooms.length,
          regionCount: worldDef.regions.length,
          connectionCount: worldDef.connections.length,
          itemCount,
          characterCount,
          startingRoomId: startingRoomId!,
        };
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create world in database: ${errorMessage}`);
    }
  }

  // Private validation methods
  private validateStartingRoom(worldDef: WorldDefinition, errors: ValidationError[]): void {
    const startingRooms = worldDef.rooms.filter(room => room.starting_room);
    
    if (startingRooms.length === 0) {
      errors.push({
        field: 'rooms',
        message: 'Exactly one room must be marked as starting_room: true',
      });
    } else if (startingRooms.length > 1) {
      errors.push({
        field: 'rooms',
        message: 'Exactly one room must be marked as starting_room: true',
        value: startingRooms.map(r => r.id),
      });
    }
  }

  private validateRegionReferences(worldDef: WorldDefinition, errors: ValidationError[]): void {
    const regionIds = new Set(worldDef.regions.map(r => r.id));
    
    worldDef.rooms.forEach(room => {
      if (room.region_id && !regionIds.has(room.region_id)) {
        errors.push({
          field: `rooms.${room.id}.region_id`,
          message: `Invalid region_id reference: ${room.region_id}`,
          value: room.region_id,
        });
      }
    });
  }

  private validateRoomReferences(worldDef: WorldDefinition, errors: ValidationError[]): void {
    const roomIds = new Set(worldDef.rooms.map(r => r.id));
    
    worldDef.connections.forEach((conn, index) => {
      if (!roomIds.has(conn.from)) {
        errors.push({
          field: `connections[${index}].from`,
          message: `Invalid room reference in connection: ${conn.from}`,
          value: conn.from,
        });
      }
      
      if (conn.to && !roomIds.has(conn.to)) {
        errors.push({
          field: `connections[${index}].to`,
          message: `Invalid room reference in connection: ${conn.to}`,
          value: conn.to,
        });
      }
    });
  }

  private validateItemReferences(worldDef: WorldDefinition, errors: ValidationError[]): void {
    if (!worldDef.items) return;
    
    const roomIds = new Set(worldDef.rooms.map(r => r.id));
    
    worldDef.items.forEach((item, index) => {
      // Only validate room_id if it's provided (since it's optional for loot items)
      if (item.room_id && !roomIds.has(item.room_id)) {
        errors.push({
          field: `items[${index}].room_id`,
          message: `Invalid room_id reference in item: ${item.room_id}`,
          value: item.room_id,
        });
      }
    });
  }

  private validateCharacterReferences(worldDef: WorldDefinition, errors: ValidationError[]): void {
    if (!worldDef.characters) return;
    
    const roomIds = new Set(worldDef.rooms.map(r => r.id));
    
    worldDef.characters.forEach((character, index) => {
      if (!roomIds.has(character.room_id)) {
        errors.push({
          field: `characters[${index}].room_id`,
          message: `Invalid room_id reference in character: ${character.room_id}`,
          value: character.room_id,
        });
      }
    });
  }

  private validateRoomConnectivity(worldDef: WorldDefinition, errors: ValidationError[]): void {
    const startingRoom = worldDef.rooms.find(room => room.starting_room);
    if (!startingRoom) return; // Already validated elsewhere
    
    // Build connectivity graph
    const graph: ConnectivityGraph = {};
    worldDef.rooms.forEach(room => {
      graph[room.id] = { id: room.id, connections: [] };
    });
    
    // Add connections (both directions for filled connections)
    worldDef.connections.forEach(conn => {
      if (conn.to) { // Only filled connections for connectivity
        graph[conn.from].connections.push(conn.to);
      }
    });
    
    // BFS to find reachable rooms
    const visited = new Set<string>();
    const queue = [startingRoom.id];
    visited.add(startingRoom.id);
    
    while (queue.length > 0) {
      const currentRoom = queue.shift()!;
      const roomNode = graph[currentRoom];
      
      roomNode.connections.forEach(connectedRoomId => {
        if (!visited.has(connectedRoomId)) {
          visited.add(connectedRoomId);
          queue.push(connectedRoomId);
        }
      });
    }
    
    // Check if all rooms are reachable
    const unreachableRooms = worldDef.rooms
      .map(room => room.id)
      .filter(roomId => !visited.has(roomId));
    
    if (unreachableRooms.length > 0) {
      errors.push({
        field: 'connections',
        message: `Not all rooms are reachable from starting room. Unreachable rooms: ${unreachableRooms.join(', ')}`,
        value: unreachableRooms,
      });
    }
  }

  private validateConnectionDirections(worldDef: WorldDefinition, errors: ValidationError[]): void {
    worldDef.connections.forEach((conn, index) => {
      if (!VALID_DIRECTIONS.includes(conn.direction as any)) {
        errors.push({
          field: `connections[${index}].direction`,
          message: `Invalid direction: ${conn.direction}. Valid directions: ${VALID_DIRECTIONS.join(', ')}`,
          value: conn.direction,
        });
      }
    });
  }

  private validateRequiredKeys(worldDef: WorldDefinition, errors: ValidationError[]): void {
    if (!worldDef.items) return;
    
    const itemIds = new Set(worldDef.items.map(item => item.id));
    
    worldDef.connections.forEach((conn, index) => {
      if (conn.required_key && !itemIds.has(conn.required_key)) {
        errors.push({
          field: `connections[${index}].required_key`,
          message: `Required key not found in items: ${conn.required_key}`,
          value: conn.required_key,
        });
      }
    });
  }
}