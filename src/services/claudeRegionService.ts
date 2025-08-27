import { ClaudeService } from './claudeService';
import { PrismaService } from './prismaService';
import { GameStateManager } from './gameStateManager';
import { LoggingService } from './loggingService';
import type { Room, Region } from '@prisma/client';
import crypto from 'crypto';
import { RegionPromptTemplates, RegionThemePromptContext } from './prompts/regionPrompts';
import {
  RegionResponseValidator,
  RegionThemeSchema,
  RoomSchema,
  generateFallbackTheme,
  generateFallbackRooms,
} from './validators/regionValidators';

interface RegionThemeContext {
  previousRegion?: {
    name: string;
    theme: string;
  } | null;
  direction: string; // 'north', 'south', 'east', 'west'
  worldSeed?: string;
}

interface RegionThemeResponse {
  name: string;
  theme: string;
  description: string;
  atmosphere: string;
  guardianConcept: {
    name: string;
    type: string;
    description: string;
  };
  keyConcept: {
    name: string;
    description: string;
    hint: string;
  };
  lockedExitDescription: string;
}

interface RoomBatchContext {
  regionTheme: RegionThemeResponse;
  entranceDirection: string; // Where player enters from
  exitDirection: string; // Where locked exit leads
  guardianRoomIndex: number; // Which room (0-11) contains guardian
  keyRoomIndex: number; // Which room (0-11) contains key
}

interface RoomDescription {
  index: number;
  name: string;
  description: string;
  hasGuardian?: boolean;
  hasKey?: boolean;
  exitHints?: string[];
}

interface RegionGenerationStatus {
  regionId?: number;
  phase: 'idle' | 'generating-theme' | 'generating-rooms' | 'complete' | 'failed';
  startTime?: number;
  completionTime?: number;
  error?: string;
}

export class ClaudeRegionService extends ClaudeService {
  private _prismaService: PrismaService;
  private _gameStateManager: GameStateManager;
  private generationQueue: Map<string, RegionGenerationStatus> = new Map();
  private generationLocks: Set<string> = new Set(); // Prevent race conditions
  private activeGeneration: Promise<void> | null = null;
  private isShuttingDown: boolean = false;

  constructor(prismaService: PrismaService, gameStateManager: GameStateManager) {
    super(prismaService, gameStateManager);
    this._prismaService = prismaService;
    this._gameStateManager = gameStateManager;
  }

  /**
   * Main entry point for asynchronous region generation
   * Triggered when player enters a new region
   */
  async triggerRegionGeneration(
    gameId: number,
    previousRegionId: number | null,
    direction: string,
    sourceRoomId?: number
  ): Promise<void> {
    const generationKey = `${gameId}_${direction}`;

    // Use lock to prevent race conditions
    if (this.generationLocks.has(generationKey)) {
      this.logger.logMessage(`Region generation already locked for ${generationKey}`, 'SYSTEM');
      return;
    }

    // Check existing status
    const existingStatus = this.generationQueue.get(generationKey);
    if (existingStatus && existingStatus.phase !== 'failed') {
      this.logger.logMessage(
        `Region generation already in progress for ${generationKey}`,
        'SYSTEM'
      );
      return;
    }

    // Acquire lock and start generation
    this.generationLocks.add(generationKey);

    // Start generation in background
    this.generationQueue.set(generationKey, {
      phase: 'generating-theme',
      startTime: Date.now(),
    });

    // Run generation asynchronously
    this.activeGeneration = this.generateRegionAsync(
      gameId,
      previousRegionId,
      direction,
      sourceRoomId
    )
      .catch(error => {
        this.logger.logMessage(`Region generation failed for ${generationKey}: ${error}`, 'ERROR');
        this.generationQueue.set(generationKey, {
          phase: 'failed',
          error: error.message,
        });
      })
      .finally(() => {
        // Release lock after generation completes or fails
        this.generationLocks.delete(generationKey);
      });
  }

  /**
   * Phase 1: Generate region theme and structure
   */
  private async generateRegionTheme(context: RegionThemeContext): Promise<RegionThemeResponse> {
    const cacheKey = this.generateRegionCacheKey('region-theme', context);
    const cached = this.getRegionCachedResponse(cacheKey) as RegionThemeResponse | null;
    if (cached) {
      this.logger.logMessage(`Using cached theme for ${context.direction}`, 'SYSTEM');
      return cached;
    }

    if (this.isInMockMode()) {
      this.logger.logMessage(`Generating mock theme for ${context.direction}`, 'SYSTEM');
      const mockResponse = this.generateMockRegionTheme(context);
      this.setRegionCachedResponse(cacheKey, mockResponse);
      return mockResponse;
    }

    // Get existing regions for context
    const existingRegions = await this.getExistingRegionThemes(context.worldSeed || '');

    // Build prompt context
    const promptContext: RegionThemePromptContext = {
      previousRegion: context.previousRegion,
      direction: context.direction,
      worldSeed: context.worldSeed,
      existingRegions: existingRegions.map(r => r.theme),
    };

    const systemPrompt = RegionPromptTemplates.getThemeSystemPrompt();
    const userPrompt = RegionPromptTemplates.getThemeUserPrompt(promptContext);

    if (!this.isShuttingDown) {
      this.logger.logMessage(`Requesting theme generation from Claude API...`, 'SYSTEM');
    }
    const startTime = Date.now();

    const response = await this.makeRegionRequestWithRetry(userPrompt, systemPrompt);

    const generationTime = Date.now() - startTime;
    if (!this.isShuttingDown) {
      this.logger.logMessage(`Theme generation completed in ${generationTime}ms`, 'SYSTEM');
    }

    // Validate response
    if (response) {
      const validation = RegionResponseValidator.validateThemeResponse(response);

      if (!validation.valid) {
        this.logger.logMessage(
          `Theme validation failed: ${validation.errors?.join(', ')}`,
          'ERROR'
        );
        const fallback = generateFallbackTheme(context);
        this.setRegionCachedResponse(cacheKey, fallback);
        return this.convertToRegionThemeResponse(fallback);
      }

      if (validation.warnings) {
        this.logger.logMessage(
          `Theme validation warnings: ${validation.warnings?.join(', ')}`,
          'SYSTEM'
        );
      }

      const validatedResponse = this.convertToRegionThemeResponse(response as RegionThemeSchema);
      this.setRegionCachedResponse(cacheKey, validatedResponse);
      return validatedResponse;
    }

    // Fallback if no response
    this.logger.logMessage('No response from Claude, using fallback theme', 'SYSTEM');
    const fallback = generateFallbackTheme(context);
    this.setRegionCachedResponse(cacheKey, fallback);
    return this.convertToRegionThemeResponse(fallback);
  }

  /**
   * Phase 2: Generate all 12 room descriptions
   */
  private async generateRoomBatch(context: RoomBatchContext): Promise<RoomDescription[]> {
    const cacheKey = this.generateRegionCacheKey('room-batch', context);
    const cached = this.getRegionCachedResponse(cacheKey) as RoomDescription[] | null;
    if (cached) {
      this.logger.logMessage(`Using cached rooms for ${context.regionTheme.name}`, 'SYSTEM');
      return cached;
    }

    if (this.isInMockMode()) {
      this.logger.logMessage(`Generating mock rooms for ${context.regionTheme.name}`, 'SYSTEM');
      const mockResponse = this.generateMockRoomBatch(context);
      this.setRegionCachedResponse(cacheKey, mockResponse);
      return mockResponse;
    }

    const systemPrompt = RegionPromptTemplates.getRoomBatchSystemPrompt();
    const userPrompt = RegionPromptTemplates.getRoomBatchUserPrompt(
      context.regionTheme,
      context.guardianRoomIndex,
      context.keyRoomIndex,
      context.entranceDirection,
      context.exitDirection
    );

    if (!this.isShuttingDown) {
      this.logger.logMessage(`Requesting room batch generation from Claude API...`, 'SYSTEM');
    }
    const startTime = Date.now();

    const response = await this.makeRegionRequestWithRetry(userPrompt, systemPrompt);

    const generationTime = Date.now() - startTime;
    if (!this.isShuttingDown) {
      this.logger.logMessage(`Room batch generation completed in ${generationTime}ms`, 'SYSTEM');
    }

    // Validate response
    if (response) {
      const validation = RegionResponseValidator.validateRoomBatchResponse(response);

      if (!validation.valid) {
        this.logger.logMessage(
          `Room batch validation failed: ${validation.errors?.join(', ')}`,
          'ERROR'
        );
        const fallback = this.generateFallbackRoomsFromContext(context);
        this.setRegionCachedResponse(cacheKey, fallback);
        return fallback;
      }

      if (validation.warnings) {
        this.logger.logMessage(
          `Room batch validation warnings: ${validation.warnings?.join(', ')}`,
          'SYSTEM'
        );
      }

      const validatedResponse = this.convertToRoomDescriptions(response as RoomSchema[]);
      this.setRegionCachedResponse(cacheKey, validatedResponse);
      return validatedResponse;
    }

    // Fallback if no response
    this.logger.logMessage('No response from Claude, using fallback rooms', 'SYSTEM');
    const fallback = this.generateFallbackRoomsFromContext(context);
    this.setRegionCachedResponse(cacheKey, fallback);
    return fallback;
  }

  /**
   * Complete async generation pipeline
   */
  private async generateRegionAsync(
    gameId: number,
    previousRegionId: number | null,
    direction: string,
    sourceRoomId?: number
  ): Promise<void> {
    const generationKey = `${gameId}_${direction}`;

    // Check if shutting down before starting
    if (this.isShuttingDown) {
      return;
    }

    try {
      // Get previous region context if exists
      let previousRegion = null;
      if (previousRegionId) {
        const prevRegion = await this._prismaService.client.region.findUnique({
          where: { id: previousRegionId },
        });
        if (prevRegion) {
          previousRegion = {
            name: prevRegion.name,
            theme: prevRegion.description || 'unknown',
          };
        }
      }

      // Phase 1: Generate theme (target: < 2 seconds)
      const startPhase1 = Date.now();

      // Check shutdown before phase 1
      if (this.isShuttingDown) {
        return;
      }

      const regionTheme = await this.generateRegionTheme({
        previousRegion,
        direction,
        worldSeed: `${gameId}`,
      });

      // Check shutdown after theme generation
      if (this.isShuttingDown) {
        return;
      }

      if (!this.isShuttingDown) {
        this.logger.logMessage(`Phase 1 completed in ${Date.now() - startPhase1}ms`, 'SYSTEM');
      }

      // Update status
      this.generationQueue.set(generationKey, {
        phase: 'generating-rooms',
        startTime: this.generationQueue.get(generationKey)?.startTime || Date.now(),
      });

      // Determine guardian and key placement
      const guardianRoomIndex = Math.floor(Math.random() * 10) + 2; // Rooms 2-11
      const keyRoomIndex = Math.floor(Math.random() * 10) + 2; // Rooms 2-11
      const entranceDirection = this.getOppositeDirection(direction);
      const exitDirection = direction;

      // Check shutdown before phase 2
      if (this.isShuttingDown) {
        return;
      }

      // Phase 2: Generate rooms (target: < 15 seconds)
      const startPhase2 = Date.now();
      const rooms = await this.generateRoomBatch({
        regionTheme,
        entranceDirection,
        exitDirection,
        guardianRoomIndex,
        keyRoomIndex,
      });

      // Check shutdown after room generation
      if (this.isShuttingDown) {
        return;
      }

      if (!this.isShuttingDown) {
        this.logger.logMessage(`Phase 2 completed in ${Date.now() - startPhase2}ms`, 'SYSTEM');
      }

      // Save to database with connections to existing world
      await this.persistGeneratedRegion(gameId, regionTheme, rooms, sourceRoomId, direction);

      // Mark complete
      this.generationQueue.set(generationKey, {
        phase: 'complete',
        startTime: this.generationQueue.get(generationKey)?.startTime || Date.now(),
        completionTime: Date.now(),
      });

      if (!this.isShuttingDown) {
        console.log(
          `Region generation complete for ${generationKey} in ${Date.now() - (this.generationQueue.get(generationKey)?.startTime || Date.now())}ms`
        );
      }
    } catch (error) {
      console.error(`Region generation failed:`, error);
      this.generationQueue.set(generationKey, {
        phase: 'failed',
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Persist generated region to database with connections
   */
  private async persistGeneratedRegion(
    gameId: number,
    theme: RegionThemeResponse,
    rooms: RoomDescription[],
    sourceRoomId?: number,
    direction?: string
  ): Promise<void> {
    // Create region
    const region = await this._prismaService.client.region.create({
      data: {
        gameId: gameId,
        name: theme.name,
        description: theme.description,
        theme: theme.theme,
      },
    });

    // Create rooms and store their IDs
    const createdRooms: Array<{ id: number; index: number }> = [];
    for (const roomData of rooms) {
      const room = await this._prismaService.client.room.create({
        data: {
          gameId: gameId,
          regionId: region.id,
          name: roomData.name,
          description: roomData.description,
          extendedDescription: roomData.hasGuardian
            ? `The ${theme.guardianConcept.name} guards this room.`
            : roomData.hasKey
              ? `The ${theme.keyConcept.name} can be found here.`
              : null,
          locked: false,
        },
      });
      createdRooms.push({ id: room.id, index: roomData.index });
    }

    // Create connections between rooms in the new region
    // For the entrance room, we need to reserve the opposite direction for returning
    // So use perpendicular directions (east/west) for the first connection
    for (let i = 0; i < createdRooms.length - 1; i++) {
      const fromRoom = createdRooms[i];
      const toRoom = createdRooms[i + 1];

      // If this is the entrance room (i=0), avoid using the return direction
      // Use east/west for the first internal connection to preserve north/south for entry/exit
      let forwardDir: string;
      let backwardDir: string;

      if (i === 0) {
        // First connection from entrance - use perpendicular directions
        forwardDir = 'east';
        backwardDir = 'west';
      } else {
        // Rest of the rooms can use normal north/south
        forwardDir = 'north';
        backwardDir = 'south';
      }

      // Check if connection already exists before creating
      const existingForward = await this._prismaService.client.connection.findFirst({
        where: {
          fromRoomId: fromRoom.id,
          direction: forwardDir,
        },
      });

      if (!existingForward) {
        await this._prismaService.client.connection.create({
          data: {
            gameId: gameId,
            fromRoomId: fromRoom.id,
            toRoomId: toRoom.id,
            direction: forwardDir,
            description: null,
            locked: false,
            requiredKey: null,
          },
        });
      }

      const existingBackward = await this._prismaService.client.connection.findFirst({
        where: {
          fromRoomId: toRoom.id,
          direction: backwardDir,
        },
      });

      if (!existingBackward) {
        await this._prismaService.client.connection.create({
          data: {
            gameId: gameId,
            fromRoomId: toRoom.id,
            toRoomId: fromRoom.id,
            direction: backwardDir,
            description: null,
            locked: false,
            requiredKey: null,
          },
        });
      }
    }

    // Connect the new region to the existing world
    if (sourceRoomId && direction && createdRooms.length > 0) {
      // Find the existing unfilled connection
      const existingConnection = await this._prismaService.client.connection.findFirst({
        where: {
          fromRoomId: sourceRoomId,
          direction: direction,
          toRoomId: null, // Unfilled connection
        },
      });

      if (existingConnection) {
        // Update the existing connection to point to the entrance of the new region
        const entranceRoom = createdRooms[0]; // First room is the entrance
        await this._prismaService.client.connection.update({
          where: { id: existingConnection.id },
          data: { toRoomId: entranceRoom.id },
        });

        // Create reverse connection from entrance back to source
        const oppositeDirection = this.getOppositeDirection(direction);

        // Since we now use east/west for the entrance's internal connection,
        // north/south should be free for the return path
        const existingReverse = await this._prismaService.client.connection.findFirst({
          where: {
            fromRoomId: entranceRoom.id,
            direction: oppositeDirection,
          },
        });

        if (!existingReverse) {
          await this._prismaService.client.connection.create({
            data: {
              gameId: gameId,
              fromRoomId: entranceRoom.id,
              toRoomId: sourceRoomId,
              direction: oppositeDirection,
              description: `back to the previous area`,
              locked: false,
              requiredKey: null,
            },
          });
        } else {
          console.log(
            `Reverse connection already exists from room ${entranceRoom.id} ${oppositeDirection} to room ${sourceRoomId}`
          );
        }
      }
    }
  }

  /**
   * Get generation status
   */
  getGenerationStatus(gameId: number, direction: string): RegionGenerationStatus | null {
    const generationKey = `${gameId}_${direction}`;
    return this.generationQueue.get(generationKey) || null;
  }

  /**
   * Helper methods
   */
  private getOppositeDirection(direction: string): string {
    const opposites: Record<string, string> = {
      north: 'south',
      south: 'north',
      east: 'west',
      west: 'east',
    };
    return opposites[direction] || 'north';
  }

  private convertToRegionThemeResponse(schema: RegionThemeSchema): RegionThemeResponse {
    return {
      name: schema.name,
      theme: schema.theme,
      description: schema.description,
      atmosphere: schema.atmosphere,
      guardianConcept: {
        name: schema.guardianConcept.name,
        type: schema.guardianConcept.type,
        description: schema.guardianConcept.description,
      },
      keyConcept: {
        name: schema.keyConcept.name,
        description: schema.keyConcept.description,
        hint: schema.keyConcept.hint,
      },
      lockedExitDescription: schema.lockedExitDescription,
    };
  }

  /**
   * Get existing region themes for context
   */
  private async getExistingRegionThemes(
    _worldSeed: string
  ): Promise<Array<{ name: string; theme: string }>> {
    try {
      // Get up to 10 most recent regions
      const regions = await this._prismaService.client.region.findMany({
        select: {
          name: true,
          theme: true,
        },
        orderBy: {
          id: 'desc',
        },
        take: 10,
      });

      return regions
        .filter(r => r.theme !== null)
        .map(r => ({
          name: r.name,
          theme: r.theme || 'unknown',
        }));
    } catch (error) {
      this.logger.logMessage(`Failed to fetch existing regions: ${error}`, 'ERROR');
      return [];
    }
  }

  private convertToRoomDescriptions(rooms: RoomSchema[]): RoomDescription[] {
    return rooms.map(room => ({
      index: room.index,
      name: room.name,
      description: room.description,
      hasGuardian: room.hasGuardian || false,
      hasKey: room.hasKey || false,
      exitHints: room.connections || [],
    }));
  }

  private generateFallbackRoomsFromContext(context: RoomBatchContext): RoomDescription[] {
    const themeSchema: RegionThemeSchema = {
      name: context.regionTheme.name,
      theme: context.regionTheme.theme,
      description: context.regionTheme.description,
      atmosphere: context.regionTheme.atmosphere,
      guardianConcept: context.regionTheme.guardianConcept,
      keyConcept: context.regionTheme.keyConcept,
      lockedExitDescription: context.regionTheme.lockedExitDescription,
    };

    const rooms = generateFallbackRooms(
      themeSchema,
      context.guardianRoomIndex,
      context.keyRoomIndex
    );
    return this.convertToRoomDescriptions(rooms);
  }

  private generateMockRegionTheme(_context: RegionThemeContext): RegionThemeResponse {
    const themes = [
      {
        name: 'Crystal Caves',
        theme: 'crystalline caverns',
        description: 'A network of caves filled with glowing crystals.',
        atmosphere: 'mystical and luminous',
        guardianConcept: {
          name: 'Crystal Golem',
          type: 'elemental',
          description: 'A massive golem made of living crystal.',
        },
        keyConcept: {
          name: 'Crystal Shard Key',
          description: 'A key carved from pure crystal that resonates with magical energy.',
          hint: 'The golem guards a precious crystal.',
        },
        lockedExitDescription: 'A crystal door sealed with magical resonance.',
      },
      {
        name: 'Haunted Manor',
        theme: 'gothic mansion',
        description: 'An abandoned manor house filled with restless spirits.',
        atmosphere: 'dark and foreboding',
        guardianConcept: {
          name: 'Lord Spectre',
          type: 'undead',
          description: 'The ghostly lord of the manor.',
        },
        keyConcept: {
          name: 'Spectral Key',
          description: 'A translucent key that phases between dimensions.',
          hint: 'The lord holds dominion over all doors.',
        },
        lockedExitDescription: 'An ornate door bound by spectral chains.',
      },
    ];

    return themes[Math.floor(Math.random() * themes.length)];
  }

  private generateMockRoomBatch(context: RoomBatchContext): RoomDescription[] {
    const rooms: RoomDescription[] = [];

    for (let i = 0; i < 12; i++) {
      rooms.push({
        index: i,
        name: `${context.regionTheme.theme} - Room ${i + 1}`,
        description: `A room within the ${context.regionTheme.theme}. ${
          i === context.guardianRoomIndex
            ? `The ${context.regionTheme.guardianConcept.name} stands guard here.`
            : i === context.keyRoomIndex
              ? `The ${context.regionTheme.keyConcept.name} glimmers in the corner.`
              : 'The atmosphere is heavy with anticipation.'
        }`,
        hasGuardian: i === context.guardianRoomIndex,
        hasKey: i === context.keyRoomIndex,
        exitHints: i === 0 ? [`Exit ${context.entranceDirection} leads back`] : [],
      });
    }

    return rooms;
  }

  // Helper methods for cache and API access
  private generateRegionCacheKey(type: string, context: unknown): string {
    const contextString = JSON.stringify(context);
    const hash = crypto.createHash('md5').update(contextString).digest('hex');
    return `${type}_${hash}`;
  }

  private getRegionCachedResponse(key: string): unknown | null {
    // Access parent's cache directly (now protected)
    return this.responseCache?.get(key) || null;
  }

  private setRegionCachedResponse(key: string, response: unknown): void {
    // Access parent's cache directly (now protected)
    if (!this.responseCache) {
      this.responseCache = new Map();
    }
    this.responseCache.set(key, response);

    // Only set timeout if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      setTimeout(() => {
        this.responseCache.delete(key);
      }, 300000);
    }
  }

  private async makeRegionRequestWithRetry(prompt: string, systemPrompt: string): Promise<unknown> {
    // Use parent's implementation if available
    const parent = this as unknown as {
      client?: unknown;
      makeRequestWithRetry?: (prompt: string, systemPrompt: string) => Promise<unknown>;
    };
    if (parent.client && !this.isInMockMode() && parent.makeRequestWithRetry) {
      return parent.makeRequestWithRetry(prompt, systemPrompt);
    }
    return null;
  }

  /**
   * Cleanup method to stop ongoing generation when game is shutting down
   */
  async cleanup(): Promise<void> {
    this.isShuttingDown = true;

    // Clear all generation queues and statuses immediately
    this.generationQueue.clear();
    this.generationLocks.clear(); // Also clear locks

    // Don't wait for generation to complete, just cancel it
    this.activeGeneration = null;

    // Don't reset isShuttingDown - keep it true
  }
}
