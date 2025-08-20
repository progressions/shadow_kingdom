import Database from '../utils/database';
import { Region, RegionContext, RoomWithRegion } from '../types/region';
import { Room } from './gameStateManager';

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
  shouldCreateNewRegion(currentDistance: number): boolean {
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
}