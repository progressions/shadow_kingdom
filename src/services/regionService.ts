import Database from '../utils/database';
import { Region, RegionContext } from '../types/region';
import { Room } from './gameStateManager';

export class RegionService {
  constructor(private db: Database) {}

  /**
   * Create a new region in the database
   */
  async createRegion(gameId: number, type: string, description: string, name?: string): Promise<Region> {
    const result = await this.db.run(
      'INSERT INTO regions (game_id, name, type, description) VALUES (?, ?, ?, ?)',
      [gameId, name, type, description]
    );
    
    return this.getRegion(result.lastID as number);
  }

  /**
   * Get a region by ID
   */
  async getRegion(regionId: number): Promise<Region> {
    const region = await this.db.get<Region>('SELECT * FROM regions WHERE id = ?', [regionId]);
    if (!region) {
      throw new Error(`Region with id ${regionId} not found`);
    }
    return region;
  }

  /**
   * Find the region containing a specific room
   */
  async findRegionByRoom(roomId: number): Promise<Region | null> {
    const result = await this.db.get<Region>(
      'SELECT r.* FROM regions r JOIN rooms rm ON r.id = rm.region_id WHERE rm.id = ?',
      [roomId]
    );
    return result || null;
  }

  /**
   * Get all regions for a specific game
   */
  async getRegionsForGame(gameId: number): Promise<Region[]> {
    return this.db.all<Region>(
      'SELECT * FROM regions WHERE game_id = ? ORDER BY created_at',
      [gameId]
    );
  }

  /**
   * Generate a random region distance for new regions (2-7)
   */
  generateRegionDistance(): number {
    return Math.floor(Math.random() * 6) + 2; // 2-7
  }

  /**
   * Determine if a new region should be created based on current distance
   * Uses distance-based probability: farther from center = more likely to branch
   */
  shouldCreateNewRegion(currentDistance: number): boolean {
    const baseProbability = 0.15;
    const distanceMultiplier = 0.12;
    const probability = Math.min(0.8, baseProbability + (currentDistance * distanceMultiplier));
    
    return Math.random() < probability;
  }

  /**
   * Get the probability that a new region would be created at given distance
   */
  getNewRegionProbability(currentDistance: number): number {
    const baseProbability = 0.15;
    const distanceMultiplier = 0.12;
    return Math.min(0.8, baseProbability + (currentDistance * distanceMultiplier));
  }

  /**
   * Assign a room to a region with a specific distance
   */
  async assignRoomToRegion(roomId: number, regionId: number, distance: number): Promise<void> {
    await this.db.run(
      'UPDATE rooms SET region_id = ?, region_distance = ? WHERE id = ?',
      [regionId, distance, roomId]
    );
  }

  /**
   * Get all rooms in a region, ordered by distance from center
   */
  async getRoomsInRegion(regionId: number): Promise<Room[]> {
    return this.db.all<Room>(
      'SELECT * FROM rooms WHERE region_id = ? ORDER BY region_distance',
      [regionId]
    );
  }

  /**
   * Build region context for AI generation
   */
  async buildRegionContext(roomId: number): Promise<RegionContext | null> {
    const room = await this.db.get<Room>('SELECT * FROM rooms WHERE id = ?', [roomId]);
    if (!room?.region_id) return null;
    
    const region = await this.getRegion(room.region_id);
    
    return {
      region,
      isCenter: room.region_distance === 0,
      distanceFromCenter: room.region_distance || 0
    };
  }

  /**
   * Build AI prompt with region context
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
   * Get descriptions of adjacent rooms for context
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
   * Build comprehensive room generation prompt with region and adjacent room context
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
}