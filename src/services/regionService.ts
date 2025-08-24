import Database from '../utils/database';
import { Region, RegionContext, RoomWithRegion } from '../types/region';
import { Room } from './gameStateManager';
import { CompleteRegion, RoomConnection } from '../types/regionConcept';
import { RegionConnectorService } from './regionConnectorService';

export interface RegionServiceOptions {
  enableDebugLogging?: boolean;
}

/**
 * RegionService manages region-based world generation and operations.
 * Implements distance-based probability for region transitions and AI context.
 */
export class RegionService {
  private db: Database;
  private options: RegionServiceOptions;

  constructor(db: Database, options: RegionServiceOptions = {}) {
    this.db = db;
    this.options = {
      enableDebugLogging: false,
      ...options
    };
  }

  /**
   * Create a new region
   */
  async createRegion(gameId: number, type: string, description: string, name?: string): Promise<Region> {
    const result = await this.db.run(
      'INSERT INTO regions (game_id, name, type, description) VALUES (?, ?, ?, ?)',
      [gameId, name || null, type, description]
    );
    
    if (!result.lastID) {
      throw new Error('Failed to create region');
    }

    const region = await this.getRegion(result.lastID);
    if (!region) {
      throw new Error('Failed to retrieve created region');
    }

    if (this.options.enableDebugLogging) {
      console.log(`Created region: ${region.name || region.type} (ID: ${region.id})`);
    }

    return region;
  }

  /**
   * Get all existing region names for a game (for AI prompting)
   */
  async getExistingRegionNames(gameId: number): Promise<string[]> {
    const regions = await this.db.all<{name: string}>(
      'SELECT name FROM regions WHERE game_id = ? AND name IS NOT NULL',
      [gameId]
    );
    return regions.map(r => r.name);
  }

  /**
   * Find region by name within a game
   */
  async findRegionByName(gameId: number, name: string): Promise<Region | null> {
    const result = await this.db.get<Region>(
      'SELECT * FROM regions WHERE game_id = ? AND name = ?',
      [gameId, name]
    );
    return result || null;
  }


  /**
   * Get region by ID
   */
  async getRegion(regionId: number): Promise<Region | null> {
    const result = await this.db.get<Region>('SELECT * FROM regions WHERE id = ?', [regionId]);
    return result || null;
  }

  /**
   * Find region that contains a specific room
   */
  async findRegionByRoom(roomId: number): Promise<Region | null> {
    const result = await this.db.get<Region>(
      'SELECT r.* FROM regions r JOIN rooms rm ON r.id = rm.region_id WHERE rm.id = ?',
      [roomId]
    );
    return result || null;
  }

  /**
   * Get all regions for a game
   */
  async getRegionsForGame(gameId: number): Promise<Region[]> {
    return this.db.all<Region>(
      'SELECT * FROM regions WHERE game_id = ? ORDER BY created_at',
      [gameId]
    );
  }

  /**
   * Generate a random region distance (2-7)
   */
  generateRegionDistance(): number {
    return Math.floor(Math.random() * 6) + 2; // 2-7
  }

  /**
   * Determine if a new region should be created based on current distance
   * Uses distance-based probability: further from center = higher chance
   */
  async shouldCreateNewRegion(currentDistance: number, currentRegionId?: number): Promise<boolean> {
    // If we have a current region, check its size first
    if (currentRegionId) {
      const regionSize = await this.getRegionRoomCount(currentRegionId);
      const maxRegionSize = parseInt(process.env.MAX_REGION_SIZE || '10'); // Default 10 rooms max
      
      // Force new region creation if current region is at/over the limit
      if (regionSize >= maxRegionSize) {
        if (this.options.enableDebugLogging) {
          console.log(`🚧 Region ${currentRegionId} has ${regionSize} rooms (limit: ${maxRegionSize}). Forcing new region.`);
        }
        return true;
      }
    }
    
    // Otherwise use normal probability-based logic
    const probability = this.getNewRegionProbability(currentDistance);
    return Math.random() < probability;
  }

  /**
   * Calculate probability of creating new region based on distance
   * Configurable via environment: base 5% + 8% per distance, capped at 60%
   * Lower thresholds promote region consolidation over fragmentation
   */
  getNewRegionProbability(currentDistance: number): number {
    const baseProbability = parseFloat(process.env.REGION_BASE_PROBABILITY || '0.05'); // 5% default (down from 15%)
    const distanceMultiplier = parseFloat(process.env.REGION_DISTANCE_MULTIPLIER || '0.08'); // 8% per distance (down from 12%)
    const maxProbability = parseFloat(process.env.REGION_MAX_PROBABILITY || '0.6'); // 60% cap (down from 80%)
    return Math.min(maxProbability, baseProbability + (currentDistance * distanceMultiplier));
  }

  /**
   * Get the number of rooms currently in a region
   */
  async getRegionRoomCount(regionId: number): Promise<number> {
    const result = await this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM rooms WHERE region_id = ?',
      [regionId]
    );
    return result?.count || 0;
  }

  /**
   * Assign a room to a region with specified distance
   */
  async assignRoomToRegion(roomId: number, regionId: number, distance: number): Promise<void> {
    await this.db.run(
      'UPDATE rooms SET region_id = ?, region_distance = ? WHERE id = ?',
      [regionId, distance, roomId]
    );

    if (this.options.enableDebugLogging) {
      console.log(`Assigned room ${roomId} to region ${regionId} at distance ${distance}`);
    }
  }

  /**
   * Get all rooms in a region, ordered by distance from center
   */
  async getRoomsInRegion(regionId: number): Promise<RoomWithRegion[]> {
    return this.db.all<RoomWithRegion>(
      'SELECT * FROM rooms WHERE region_id = ? ORDER BY region_distance',
      [regionId]
    );
  }

  /**
   * Build region context for a room (used for AI generation)
   */
  async buildRegionContext(roomId: number): Promise<RegionContext | null> {
    const room = await this.db.get<RoomWithRegion>('SELECT * FROM rooms WHERE id = ?', [roomId]);
    if (!room?.region_id || room.region_distance === null) return null;
    
    const region = await this.getRegion(room.region_id);
    if (!region) return null;
    
    return {
      region,
      isCenter: room.region_distance === 0,
      distanceFromCenter: room.region_distance
    };
  }

  /**
   * Build region-specific prompt for AI generation
   */
  buildRegionPrompt(context: RegionContext): string {
    const { region, isCenter, distanceFromCenter } = context;
    
    let prompt = `Generate a room in the ${region.type} region`;
    if (region.name) {
      prompt += ` called "${region.name}"`;
    }
    prompt += `. Region context: ${region.description}`;
    
    if (isCenter) {
      prompt += ` This is the CENTER of the region - make it grand and significant.`;
    } else {
      prompt += ` This room is ${distanceFromCenter} steps from the region center.`;
    }
    
    return prompt;
  }

  /**
   * Get descriptions of rooms adjacent to the specified room
   */
  async getAdjacentRoomDescriptions(roomId: number): Promise<string[]> {
    const adjacentRooms = await this.db.all<Room>(`
      SELECT DISTINCT r.name, r.description 
      FROM rooms r
      JOIN connections c ON (c.from_room_id = r.id OR c.to_room_id = r.id)
      WHERE (c.from_room_id = ? OR c.to_room_id = ?) AND r.id != ?
    `, [roomId, roomId, roomId]);
    
    return adjacentRooms.map(room => `${room.name}: ${room.description}`);
  }

  /**
   * Build comprehensive room generation prompt with region and adjacent context
   */
  async buildRoomGenerationPrompt(
    regionContext: RegionContext, 
    adjacentDescriptions: string[]
  ): Promise<string> {
    let prompt = this.buildRegionPrompt(regionContext);
    
    if (adjacentDescriptions.length > 0) {
      prompt += `\n\nAdjacent rooms:\n${adjacentDescriptions.join('\n')}`;
      prompt += `\nGenerate a room that logically connects to these adjacent spaces.`;
    }
    
    return prompt;
  }

  /**
   * Get region statistics for a game
   */
  async getRegionStats(gameId: number): Promise<{region: Region, roomCount: number, hasCenter: boolean}[]> {
    const regions = await this.getRegionsForGame(gameId);
    const stats = [];

    for (const region of regions) {
      const roomCount = await this.db.get<{count: number}>(
        'SELECT COUNT(*) as count FROM rooms WHERE region_id = ?',
        [region.id]
      );
      
      stats.push({
        region,
        roomCount: roomCount?.count || 0,
        hasCenter: region.center_room_id !== null
      });
    }

    return stats;
  }

  /**
   * Find the center room of a region
   */
  async getRegionCenter(regionId: number): Promise<RoomWithRegion | null> {
    const region = await this.getRegion(regionId);
    if (!region?.center_room_id) return null;

    const result = await this.db.get<RoomWithRegion>('SELECT * FROM rooms WHERE id = ?', [region.center_room_id]);
    return result || null;
  }

  /**
   * Check if a room is a region center
   */
  async isRegionCenter(roomId: number): Promise<boolean> {
    const room = await this.db.get<RoomWithRegion>('SELECT * FROM rooms WHERE id = ?', [roomId]);
    return room?.region_distance === 0;
  }

  /**
   * Instantiate a complete region in the database
   * Phase 5: Save generated regions to database, making them explorable
   */
  async instantiateRegion(regionData: CompleteRegion, gameId: number): Promise<number> {
    try {
      if (this.options.enableDebugLogging) {
        console.log(`🏰 Instantiating region "${regionData.concept.name}" (sequence ${regionData.sequenceNumber})`);
      }

      // 1. Create region record
      const regionId = await this.createRegionRecord(regionData, gameId);
      
      // 2. Generate connections using the region connector
      const connectorService = new RegionConnectorService();
      const connections = connectorService.connectRooms(regionData.rooms, regionData.concept.theme);
      
      // 3. Create all 12 rooms
      const roomIds = await this.createRoomsInDatabase(regionData.rooms, regionId, gameId);
      
      // 4. Create connections between rooms
      await this.createConnectionsInDatabase(connections, roomIds, gameId);
      
      // 5. Create items in appropriate rooms
      await this.createItemsInDatabase(regionData, roomIds, gameId);
      
      // 6. Create NPCs and enemies in appropriate rooms
      await this.createCharactersInDatabase(regionData, roomIds, gameId);

      if (this.options.enableDebugLogging) {
        console.log(`🏰 Successfully instantiated region "${regionData.concept.name}" with ID ${regionId}`);
      }

      return regionId;
    } catch (error) {
      if (this.options.enableDebugLogging) {
        console.error(`Error instantiating region "${regionData.concept.name}":`, error);
      }
      throw error;
    }
  }

  /**
   * Create region record in database
   */
  private async createRegionRecord(regionData: CompleteRegion, gameId: number): Promise<number> {
    const result = await this.db.run(
      'INSERT INTO regions (game_id, name, type, description) VALUES (?, ?, ?, ?)',
      [gameId, regionData.concept.name, regionData.concept.theme, regionData.concept.atmosphere]
    );
    
    if (!result.lastID) {
      throw new Error('Failed to create region record');
    }

    if (this.options.enableDebugLogging) {
      console.log(`🏰 Created region record: ${regionData.concept.name} (ID: ${result.lastID})`);
    }

    return result.lastID;
  }

  /**
   * Create all rooms in database and return their IDs
   */
  private async createRoomsInDatabase(rooms: any[], regionId: number, gameId: number): Promise<number[]> {
    const roomIds: number[] = [];
    
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      const result = await this.db.run(
        'INSERT INTO rooms (game_id, name, description, region_id, region_distance) VALUES (?, ?, ?, ?, ?)',
        [gameId, room.name, room.description, regionId, i] // Use index as region_distance for now
      );
      
      if (!result.lastID) {
        throw new Error(`Failed to create room: ${room.name}`);
      }
      
      roomIds.push(result.lastID);
      
      if (this.options.enableDebugLogging) {
        console.log(`🏠 Created room: "${room.name}" (ID: ${result.lastID})`);
      }
    }
    
    return roomIds;
  }

  /**
   * Create connections in database using generated connections and actual room IDs
   */
  private async createConnectionsInDatabase(connections: RoomConnection[], roomIds: number[], gameId: number): Promise<void> {
    for (const connection of connections) {
      const fromRoomId = roomIds[connection.fromRoomId];
      const toRoomId = roomIds[connection.toRoomId];
      
      if (!fromRoomId || !toRoomId) {
        if (this.options.enableDebugLogging) {
          console.warn(`⚠️ Skipping invalid connection: ${connection.fromRoomId} -> ${connection.toRoomId}`);
        }
        continue;
      }

      await this.db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [gameId, fromRoomId, toRoomId, connection.direction, connection.name]
      );
      
      if (this.options.enableDebugLogging) {
        console.log(`🔗 Created connection: ${fromRoomId} --${connection.direction}--> ${toRoomId} (${connection.name})`);
      }
    }
  }

  /**
   * Create items in appropriate rooms
   */
  private async createItemsInDatabase(regionData: CompleteRegion, roomIds: number[], gameId: number): Promise<void> {
    for (let i = 0; i < regionData.rooms.length; i++) {
      const room = regionData.rooms[i];
      const roomId = roomIds[i];
      
      if (!room.items || room.items.length === 0) {
        continue;
      }
      
      for (const itemName of room.items) {
        // First, create or find the item in items table
        const itemResult = await this.db.run(
          'INSERT INTO items (name, description, type, weight, value) VALUES (?, ?, ?, ?, ?)',
          [itemName, `A ${itemName.toLowerCase()} found in ${regionData.concept.name}`, 'misc', 1.0, 10]
        );
        
        if (itemResult.lastID) {
          // Then place it in the room
          await this.db.run(
            'INSERT INTO room_items (room_id, item_id, quantity) VALUES (?, ?, ?)',
            [roomId, itemResult.lastID, 1]
          );
          
          if (this.options.enableDebugLogging) {
            console.log(`📦 Placed item "${itemName}" in room "${room.name}"`);
          }
        }
      }
      
      // Handle special items: Guardian's key
      if (i === regionData.guardianRoomIndex) {
        const keyName = regionData.concept.key.name;
        const keyResult = await this.db.run(
          'INSERT INTO items (name, description, type, weight, value) VALUES (?, ?, ?, ?, ?)',
          [keyName, regionData.concept.key.description, 'quest', 0.1, 100]
        );
        
        if (keyResult.lastID) {
          await this.db.run(
            'INSERT INTO room_items (room_id, item_id, quantity) VALUES (?, ?, ?)',
            [roomId, keyResult.lastID, 1]
          );
          
          if (this.options.enableDebugLogging) {
            console.log(`🗝️ Placed key "${keyName}" in guardian room "${room.name}"`);
          }
        }
      }
    }
  }

  /**
   * Create NPCs and enemies in appropriate rooms
   */
  private async createCharactersInDatabase(regionData: CompleteRegion, roomIds: number[], gameId: number): Promise<void> {
    for (let i = 0; i < regionData.rooms.length; i++) {
      const room = regionData.rooms[i];
      const roomId = roomIds[i];
      
      if (!room.characters || room.characters.length === 0) {
        continue;
      }
      
      for (const character of room.characters) {
        const result = await this.db.run(
          'INSERT INTO characters (game_id, name, type, current_room_id, strength, dexterity, intelligence, constitution, wisdom, charisma) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [gameId, character.name, character.type, roomId, 10, 10, 10, 10, 10, 10] // Default stats
        );
        
        if (this.options.enableDebugLogging) {
          console.log(`🧙 Created ${character.type} "${character.name}" in room "${room.name}"`);
        }
      }
    }
    
    // Handle special character: Guardian
    if (regionData.guardianRoomIndex < roomIds.length) {
      const guardianRoomId = roomIds[regionData.guardianRoomIndex];
      const guardian = regionData.concept.guardian;
      
      const result = await this.db.run(
        'INSERT INTO characters (game_id, name, type, current_room_id, strength, dexterity, intelligence, constitution, wisdom, charisma, max_health, current_health) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [gameId, guardian.name, 'enemy', guardianRoomId, 15, 12, 14, 16, 13, 8, 50, 50] // Guardian stats
      );
      
      if (this.options.enableDebugLogging) {
        console.log(`👹 Created guardian "${guardian.name}" in guardian room`);
      }
    }
  }
}