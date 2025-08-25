import { PrismaClient } from '../generated/prisma';
import { getPrismaClient } from './prismaService';
import { Region, RegionContext, RoomWithRegion } from '../types/region';
import { Room } from './gameStateManager';
import { typeMappers } from '../types/database';

export interface RegionServiceOptions {
  enableDebugLogging?: boolean;
}

/**
 * RegionService (Prisma version) - manages region-based world generation and operations.
 * Implements distance-based probability for region transitions and AI context.
 * 
 * This is the migrated version using Prisma instead of raw SQL.
 * Provides type safety, better performance, and cleaner code.
 */
export class RegionServicePrisma {
  private prisma: PrismaClient;
  private options: RegionServiceOptions;

  constructor(options: RegionServiceOptions = {}) {
    this.options = {
      enableDebugLogging: false,
      ...options
    };
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new region
   */
  async createRegion(gameId: number, type: string, description: string, name?: string): Promise<Region> {
    try {
      const prismaRegion = await this.prisma.region.create({
        data: {
          gameId,
          name: name || null,
          type,
          description
        }
      });

      if (this.options.enableDebugLogging) {
        console.log(`Created region: ${prismaRegion.name || prismaRegion.type} (ID: ${prismaRegion.id})`);
      }

      // Convert to legacy Region interface
      return {
        id: prismaRegion.id,
        game_id: prismaRegion.gameId,
        name: prismaRegion.name,
        type: prismaRegion.type,
        description: prismaRegion.description,
        center_room_id: prismaRegion.centerRoomId,
        created_at: prismaRegion.createdAt
      };
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to create region:', error);
      }
      throw new Error('Failed to create region');
    }
  }

  /**
   * Get all existing region names for a game (for AI prompting)
   */
  async getExistingRegionNames(gameId: number): Promise<string[]> {
    const regions = await this.prisma.region.findMany({
      where: {
        gameId: gameId,
        name: { not: null }
      },
      select: {
        name: true
      }
    });
    return regions.map(r => r.name!).filter(Boolean);
  }

  /**
   * Find region by name within a game
   */
  async findRegionByName(gameId: number, name: string): Promise<Region | null> {
    try {
      const prismaRegion = await this.prisma.region.findFirst({
        where: {
          gameId: gameId,
          name: name
        }
      });

      if (!prismaRegion) {
        return null;
      }

      return {
        id: prismaRegion.id,
        game_id: prismaRegion.gameId,
        name: prismaRegion.name,
        type: prismaRegion.type,
        description: prismaRegion.description,
        center_room_id: prismaRegion.centerRoomId,
        created_at: prismaRegion.createdAt.toISOString()
      };
    } catch (error) {
      if (this.options?.enableDebugLogging) {
        console.error('Failed to find region by name:', error);
      }
      return null;
    }
  }

  /**
   * Get region by ID
   */
  async getRegion(regionId: number): Promise<Region | null> {
    try {
      const prismaRegion = await this.prisma.region.findUnique({
        where: { id: regionId }
      });

      if (!prismaRegion) return null;

      return {
        id: prismaRegion.id,
        game_id: prismaRegion.gameId,
        name: prismaRegion.name,
        type: prismaRegion.type,
        description: prismaRegion.description,
        center_room_id: prismaRegion.centerRoomId,
        created_at: prismaRegion.createdAt
      };
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to get region:', error);
      }
      return null;
    }
  }

  /**
   * Find region that contains a specific room
   */
  async findRegionByRoom(roomId: number): Promise<Region | null> {
    try {
      const result = await this.prisma.room.findUnique({
        where: { id: roomId },
        include: {
          region: true
        }
      });

      if (!result?.region) return null;

      const prismaRegion = result.region;
      return {
        id: prismaRegion.id,
        game_id: prismaRegion.gameId,
        name: prismaRegion.name,
        type: prismaRegion.type,
        description: prismaRegion.description,
        center_room_id: prismaRegion.centerRoomId,
        created_at: prismaRegion.createdAt
      };
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to find region by room:', error);
      }
      return null;
    }
  }

  /**
   * Get the number of rooms currently in a region
   */
  async getRegionRoomCount(regionId: number): Promise<number> {
    try {
      const count = await this.prisma.room.count({
        where: {
          regionId: regionId
        }
      });
      return count;
    } catch (error) {
      if (this.options?.enableDebugLogging) {
        console.error('Failed to get region room count:', error);
      }
      return 0;
    }
  }

  /**
   * Get all regions for a game
   */
  async getRegionsForGame(gameId: number): Promise<Region[]> {
    try {
      const prismaRegions = await this.prisma.region.findMany({
        where: { gameId },
        orderBy: { createdAt: 'asc' }
      });

      return prismaRegions.map(prismaRegion => ({
        id: prismaRegion.id,
        game_id: prismaRegion.gameId,
        name: prismaRegion.name,
        type: prismaRegion.type,
        description: prismaRegion.description,
        center_room_id: prismaRegion.centerRoomId,
        created_at: prismaRegion.createdAt
      }));
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to get regions for game:', error);
      }
      return [];
    }
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
   * Base 15% chance, increasing by 12% per distance unit, capped at 80%
   */
  getNewRegionProbability(currentDistance: number): number {
    const baseProbability = 0.15;
    const distanceMultiplier = 0.12;
    return Math.min(0.8, baseProbability + (currentDistance * distanceMultiplier));
  }

  /**
   * Assign a room to a region with specified distance
   */
  async assignRoomToRegion(roomId: number, regionId: number, distance: number): Promise<void> {
    try {
      await this.prisma.room.update({
        where: { id: roomId },
        data: {
          regionId,
          regionDistance: distance
        }
      });

      if (this.options.enableDebugLogging) {
        console.log(`Assigned room ${roomId} to region ${regionId} at distance ${distance}`);
      }
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to assign room to region:', error);
      }
      throw new Error('Failed to assign room to region');
    }
  }

  /**
   * Get all rooms in a region, ordered by distance from center
   */
  async getRoomsInRegion(regionId: number): Promise<RoomWithRegion[]> {
    try {
      const prismaRooms = await this.prisma.room.findMany({
        where: { regionId },
        orderBy: { regionDistance: 'asc' }
      });

      return prismaRooms.map(prismaRoom => ({
        id: prismaRoom.id,
        game_id: prismaRoom.gameId,
        name: prismaRoom.name,
        description: prismaRoom.description,
        region_id: prismaRoom.regionId,
        region_distance: prismaRoom.regionDistance
      }));
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to get rooms in region:', error);
      }
      return [];
    }
  }

  /**
   * Build region context for a room (used for AI generation)
   */
  async buildRegionContext(roomId: number): Promise<RegionContext | null> {
    try {
      const prismaRoom = await this.prisma.room.findUnique({
        where: { id: roomId },
        include: {
          region: true
        }
      });

      if (!prismaRoom?.regionId || prismaRoom.regionDistance === null || !prismaRoom.region) {
        return null;
      }

      const region: Region = {
        id: prismaRoom.region.id,
        game_id: prismaRoom.region.gameId,
        name: prismaRoom.region.name,
        type: prismaRoom.region.type,
        description: prismaRoom.region.description,
        center_room_id: prismaRoom.region.centerRoomId,
        created_at: prismaRoom.region.createdAt
      };

      return {
        region,
        isCenter: prismaRoom.regionDistance === 0,
        distanceFromCenter: prismaRoom.regionDistance
      };
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to build region context:', error);
      }
      return null;
    }
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
    try {
      // Get all connections that involve this room
      const connections = await this.prisma.connection.findMany({
        where: {
          OR: [
            { fromRoomId: roomId },
            { toRoomId: roomId }
          ]
        },
        include: {
          fromRoom: true,
          toRoom: true
        }
      });

      const adjacentRooms: Array<{ name: string; description: string }> = [];
      const seenRoomIds = new Set<number>();

      connections.forEach(connection => {
        // Get the room that's NOT the current room
        let adjacentRoom = null;
        if (connection.fromRoomId === roomId && connection.toRoom) {
          adjacentRoom = connection.toRoom;
        } else if (connection.toRoomId === roomId && connection.fromRoom) {
          adjacentRoom = connection.fromRoom;
        }

        if (adjacentRoom && !seenRoomIds.has(adjacentRoom.id)) {
          seenRoomIds.add(adjacentRoom.id);
          adjacentRooms.push({
            name: adjacentRoom.name,
            description: adjacentRoom.description
          });
        }
      });

      return adjacentRooms.map(room => `${room.name}: ${room.description}`);
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to get adjacent room descriptions:', error);
      }
      return [];
    }
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
    try {
      const regions = await this.getRegionsForGame(gameId);
      const stats = [];

      for (const region of regions) {
        // Use Prisma count for better performance
        const roomCount = await this.prisma.room.count({
          where: { regionId: region.id }
        });
        
        stats.push({
          region,
          roomCount,
          hasCenter: region.center_room_id !== null
        });
      }

      return stats;
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to get region stats:', error);
      }
      return [];
    }
  }

  /**
   * Find the center room of a region
   */
  async getRegionCenter(regionId: number): Promise<RoomWithRegion | null> {
    try {
      const region = await this.getRegion(regionId);
      if (!region?.center_room_id) return null;

      const prismaRoom = await this.prisma.room.findUnique({
        where: { id: region.center_room_id }
      });

      if (!prismaRoom) return null;

      return {
        id: prismaRoom.id,
        game_id: prismaRoom.gameId,
        name: prismaRoom.name,
        description: prismaRoom.description,
        region_id: prismaRoom.regionId,
        region_distance: prismaRoom.regionDistance
      };
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to get region center:', error);
      }
      return null;
    }
  }

  /**
   * Check if a room is a region center
   */
  async isRegionCenter(roomId: number): Promise<boolean> {
    try {
      const prismaRoom = await this.prisma.room.findUnique({
        where: { id: roomId },
        select: { regionDistance: true }
      });

      return prismaRoom?.regionDistance === 0;
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to check if room is region center:', error);
      }
      return false;
    }
  }

  /**
   * Check if debug logging is enabled
   */
  private isDebugEnabled(): boolean {
    return this.options.enableDebugLogging || process.env.AI_DEBUG_LOGGING === 'true';
  }

  /**
   * Update service options
   */
  updateOptions(options: Partial<RegionServiceOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current service configuration
   */
  getOptions(): RegionServiceOptions {
    return { ...this.options };
  }
}