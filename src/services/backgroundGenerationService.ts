import Database from '../utils/database';
import { RoomGenerationService, GenerationLimits } from './roomGenerationService';
import { UnfilledConnection } from './gameStateManager';

export interface BackgroundGenerationOptions {
  enableDebugLogging?: boolean;
  disableBackgroundGeneration?: boolean;
}

export interface BackgroundGenerationStats {
  lastGenerationTime: number;
  activeGenerations: number;
  roomsInProgress: number[];
}

/**
 * BackgroundGenerationService handles proactive room generation and background processing.
 * Responsible for triggering generation, managing cooldowns, and coordinating with RoomGenerationService.
 */
export class BackgroundGenerationService {
  private options: BackgroundGenerationOptions;
  private lastGenerationTime: number = 0;
  private generationInProgress: Set<number> = new Set();
  private backgroundPromises: Set<Promise<void>> = new Set();

  constructor(
    private db: Database,
    private roomGenerationService: RoomGenerationService,
    options: BackgroundGenerationOptions = {}
  ) {
    this.options = {
      enableDebugLogging: false,
      disableBackgroundGeneration: false,
      ...options
    };
  }

  /**
   * Trigger immediate room generation on room entry (new auto-generation feature)
   */
  async generateForRoomEntry(roomId: number, gameId: number): Promise<void> {
    try {
      // Check if auto-generation is enabled
      if (process.env.AUTO_GENERATE_ON_ENTRY !== 'true') {
        return;
      }

      // Find unfilled connections that aren't already being processed
      const unfilledConnections = await this.db.all<UnfilledConnection>(`
        SELECT c.*, r.name as from_room_name 
        FROM connections c
        JOIN rooms r ON c.from_room_id = r.id
        WHERE c.from_room_id = ? AND c.to_room_id IS NULL AND c.processing = FALSE
      `, [roomId]);

      if (unfilledConnections.length === 0) {
        return; // No connections to generate
      }

      // Apply max concurrent limit
      const maxConcurrent = parseInt(process.env.AUTO_GENERATE_MAX_CONCURRENT || '3');
      const connectionsToProcess = unfilledConnections.slice(0, maxConcurrent);

      if (this.isDebugEnabled()) {
        console.log(`🚀 Auto-generating ${connectionsToProcess.length} rooms on entry to room ${roomId}`);
      }

      // Add optional delay before starting generation
      const delayMs = parseInt(process.env.AUTO_GENERATE_DELAY_MS || '0');
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      // Fire and forget generation for each connection
      const promises = connectionsToProcess.map(connection => this.generateConnectionWithProcessingFlag(connection));
      
      // In production mode, don't await - let them run in background
      if (this.options.disableBackgroundGeneration) {
        // In test mode, await to avoid dangling promises
        await Promise.all(promises);
      } else {
        // In production, track promises but don't await
        promises.forEach(promise => {
          this.backgroundPromises.add(promise);
          promise.finally(() => this.backgroundPromises.delete(promise));
        });
      }

    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Room entry auto-generation failed:', error);
      }
      // Silent failure - game continues normally
    }
  }

  /**
   * Generate a room for a connection using processing flag to prevent duplicates
   */
  private async generateConnectionWithProcessingFlag(connection: UnfilledConnection): Promise<void> {
    try {
      // Mark as processing to prevent duplicates
      const updateResult = await this.db.run(
        'UPDATE connections SET processing = TRUE WHERE id = ? AND processing = FALSE',
        [connection.id]
      );

      // If no rows were updated, another process is already handling this connection
      if (updateResult.changes === 0) {
        if (this.isDebugEnabled()) {
          console.log(`🔗 Connection ${connection.id} already being processed - skipping`);
        }
        return;
      }

      // Generate the room
      const result = await this.roomGenerationService.generateRoomForConnection(connection);

      if (result.success && result.roomId) {
        // Update connection with room and clear processing flag
        await this.db.run(
          'UPDATE connections SET to_room_id = ?, processing = FALSE WHERE id = ?',
          [result.roomId, connection.id]
        );

        if (this.isDebugEnabled()) {
          console.log(`✨ Auto-generated room ${result.roomId} for connection ${connection.id}: ${connection.name}`);
        }
      } else {
        // Clear processing flag on failure to allow retry
        await this.failGeneration(connection.id, result.error || new Error('Room generation failed'));
      }

    } catch (error) {
      // Clear processing flag on error
      await this.failGeneration(connection.id, error as Error);
    }
  }

  /**
   * Complete generation successfully
   */
  async completeGeneration(connectionId: number, roomId: number): Promise<void> {
    await this.db.run(
      'UPDATE connections SET to_room_id = ?, processing = FALSE WHERE id = ?',
      [roomId, connectionId]
    );
  }

  /**
   * Mark generation as failed and clear processing flag to allow retry
   */
  async failGeneration(connectionId: number, error: Error): Promise<void> {
    await this.db.run(
      'UPDATE connections SET processing = FALSE WHERE id = ?',
      [connectionId]
    );
    
    if (this.isDebugEnabled()) {
      console.error(`Generation failed for connection ${connectionId}:`, error.message);
    }
  }

  /**
   * Trigger background room generation for adjacent rooms (entry point from GameController)
   */
  async preGenerateAdjacentRooms(currentRoomId: number, gameId: number): Promise<void> {
    try {
      const limits = this.getGenerationLimits();
      
      // Check cooldown period
      const timeSinceLastGeneration = Date.now() - this.lastGenerationTime;
      
      if (timeSinceLastGeneration < limits.generationCooldownMs) {
        return; // Still in cooldown
      }

      // Check if generation is already in progress for this room
      if (this.generationInProgress.has(currentRoomId)) {
        return; // Already generating
      }

      // Check total room count limit
      const roomCount = await this.db.get(
        'SELECT COUNT(*) as count FROM rooms WHERE game_id = ?',
        [gameId]
      );
      
      if (roomCount?.count >= limits.maxRoomsPerGame) {
        if (this.isDebugEnabled()) {
          console.log(`🏰 Room limit reached (${limits.maxRoomsPerGame}). No more rooms will be generated.`);
        }
        return;
      }

      // Fire and forget - don't await this in production
      // In test mode, we can disable background generation to avoid dangling promises
      if (this.options.disableBackgroundGeneration) {
        // In test mode, await the operation to avoid hanging
        await this.expandFromAdjacentRooms(currentRoomId, gameId);
      } else {
        // In production mode, fire and forget
        const promise = this.expandFromAdjacentRooms(currentRoomId, gameId);
        this.backgroundPromises.add(promise);
        promise.finally(() => this.backgroundPromises.delete(promise));
      }
      this.lastGenerationTime = Date.now();
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Pre-generation failed:', error);
      }
      // Silent failure - game continues normally
    }
  }

  /**
   * Find unfilled connections that need room generation (excludes ones being processed)
   */
  async findUnfilledConnections(gameId: number): Promise<UnfilledConnection[]> {
    try {
      const connections = await this.db.all<UnfilledConnection>(
        'SELECT c.*, r.name as from_room_name FROM connections c ' +
        'JOIN rooms r ON c.from_room_id = r.id ' +
        'WHERE c.to_room_id IS NULL AND c.processing = FALSE AND c.game_id = ? ' +
        'ORDER BY c.id LIMIT ?',
        [gameId, this.getGenerationLimits().maxGenerationDepth]
      );

      return connections || [];
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to find unfilled connections:', error);
      }
      return [];
    }
  }

  /**
   * Find unfilled connections near the current location for prioritized generation using BFS
   */
  async findNearbyUnfilledConnections(currentRoomId: number, gameId: number): Promise<UnfilledConnection[]> {
    try {
      const limits = this.getGenerationLimits();
      const bfsRadius = parseInt(process.env.BFS_SEARCH_RADIUS || '3');
      const prioritizeProximity = process.env.PRIORITIZE_PLAYER_PROXIMITY !== 'false';
      
      if (!prioritizeProximity) {
        // Fall back to global search if proximity prioritization is disabled
        return await this.findUnfilledConnections(gameId);
      }
      
      // BFS traversal to find unfilled connections by distance from player
      const connections = await this.db.all<UnfilledConnection & { distance: number }>(`
        WITH RECURSIVE reachable_rooms(room_id, distance) AS (
          SELECT ?, 0
          UNION ALL
          SELECT c.to_room_id, r.distance + 1
          FROM connections c
          JOIN reachable_rooms r ON c.from_room_id = r.room_id
          WHERE c.to_room_id IS NOT NULL AND r.distance < ?
        )
        SELECT c.*, r.name as from_room_name, rr.distance 
        FROM connections c
        JOIN reachable_rooms rr ON c.from_room_id = rr.room_id
        JOIN rooms r ON c.from_room_id = r.id
        WHERE c.to_room_id IS NULL AND c.processing = FALSE AND c.game_id = ?
        ORDER BY rr.distance, c.id
        LIMIT ?
      `, [currentRoomId, bfsRadius, gameId, limits.maxGenerationDepth]);

      return connections || [];
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to find nearby unfilled connections:', error);
      }
      // Fall back to general unfilled connections
      return await this.findUnfilledConnections(gameId);
    }
  }

  /**
   * Expand room generation from unfilled connections (new connection-based approach)
   */
  async expandFromAdjacentRooms(currentRoomId: number, gameId: number): Promise<void> {
    this.generationInProgress.add(currentRoomId);
    
    try {
      const limits = this.getGenerationLimits();
      
      // Find unfilled connections that need room generation, prioritizing nearby ones
      const nearbyUnfilledConnections = await this.findNearbyUnfilledConnections(currentRoomId, gameId);
      
      if (nearbyUnfilledConnections.length === 0) {
        if (this.isDebugEnabled()) {
          console.log('🔍 No unfilled connections found for background generation');
        }
        return;
      }

      // Check total room count limit
      const currentRoomCount = await this.db.get(
        'SELECT COUNT(*) as count FROM rooms WHERE game_id = ?',
        [gameId]
      );
      
      const roomsCanGenerate = Math.max(0, limits.maxRoomsPerGame - (currentRoomCount?.count || 0));
      
      if (roomsCanGenerate <= 0) {
        if (this.isDebugEnabled()) {
          console.log(`🏰 Room limit reached (${limits.maxRoomsPerGame}). No more rooms will be generated.`);
        }
        return;
      }

      // Use minimum generation to ensure consistent world expansion
      const minGeneration = Math.min(limits.minGenerationPerTrigger, roomsCanGenerate, nearbyUnfilledConnections.length);
      const maxGeneration = Math.min(limits.maxGenerationDepth, roomsCanGenerate, nearbyUnfilledConnections.length);
      const connectionsToFill = Math.max(minGeneration, Math.min(maxGeneration, nearbyUnfilledConnections.length));
      
      if (this.isDebugEnabled()) {
        // Count connections by distance for better debug output
        const connectionsByDistance: Record<number, number> = {};
        nearbyUnfilledConnections.forEach(conn => {
          const distance = (conn as any).distance || 0;
          connectionsByDistance[distance] = (connectionsByDistance[distance] || 0) + 1;
        });
        
        const distanceBreakdown = Object.entries(connectionsByDistance)
          .map(([dist, count]) => `distance ${dist}: ${count}`)
          .join(', ');
        
        console.log(`🔗 Filling ${connectionsToFill} unfilled connections (${nearbyUnfilledConnections.length} found: ${distanceBreakdown}, ${roomsCanGenerate} rooms available)`);
      }

      // Generate rooms for unfilled connections
      let generatedCount = 0;
      for (let i = 0; i < connectionsToFill; i++) {
        const connection = nearbyUnfilledConnections[i];
        
        // Verify connection is still unfilled and not being processed (race condition protection)
        const currentConnection = await this.db.get<UnfilledConnection>(
          'SELECT * FROM connections WHERE id = ? AND to_room_id IS NULL AND processing = FALSE',
          [connection.id]
        );
        
        if (!currentConnection) {
          if (this.isDebugEnabled()) {
            console.log(`🔗 Connection ${connection.id} already filled - skipping`);
          }
          continue;
        }

        // Generate room for this connection
        const result = await this.roomGenerationService.generateRoomForConnection(currentConnection);
        
        if (result.success) {
          generatedCount++;
          if (this.isDebugEnabled()) {
            console.log(`✨ Filled connection ${connection.id}: ${connection.name} -> Room ${result.roomId}`);
          }
        } else if (this.isDebugEnabled()) {
          console.log(`❌ Failed to fill connection ${connection.id}: ${result.error?.message}`);
        }
      }
      
      if (this.isDebugEnabled()) {
        console.log(`🎯 Background generation completed: ${generatedCount} connections filled`);
      }
      
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Background generation failed:', error);
      }
      // Silent failure - game continues normally
    } finally {
      this.generationInProgress.delete(currentRoomId);
    }
  }


  /**
   * Get generation limits from environment or defaults
   */
  private getGenerationLimits(): GenerationLimits {
    return {
      maxRoomsPerGame: parseInt(process.env.MAX_ROOMS_PER_GAME || '100'),
      maxGenerationDepth: parseInt(process.env.MAX_GENERATION_DEPTH || '5'),
      minGenerationPerTrigger: parseInt(process.env.MIN_GENERATION_PER_TRIGGER || '2'),
      generationCooldownMs: parseInt(process.env.GENERATION_COOLDOWN_MS || '5000')
    };
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
  updateOptions(options: Partial<BackgroundGenerationOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current service configuration
   */
  getOptions(): BackgroundGenerationOptions {
    return { ...this.options };
  }

  /**
   * Get background generation statistics
   */
  getGenerationStats(): BackgroundGenerationStats {
    return {
      lastGenerationTime: this.lastGenerationTime,
      activeGenerations: this.generationInProgress.size,
      roomsInProgress: Array.from(this.generationInProgress)
    };
  }

  /**
   * Check if generation is currently in progress for a room
   */
  isGenerationInProgress(roomId: number): boolean {
    return this.generationInProgress.has(roomId);
  }

  /**
   * Get time since last generation attempt
   */
  getTimeSinceLastGeneration(): number {
    return Date.now() - this.lastGenerationTime;
  }

  /**
   * Check if cooldown period has passed
   */
  isCooldownComplete(): boolean {
    const limits = this.getGenerationLimits();
    return this.getTimeSinceLastGeneration() >= limits.generationCooldownMs;
  }

  /**
   * Reset generation state (useful for testing)
   */
  resetGenerationState(): void {
    this.lastGenerationTime = 0;
    this.generationInProgress.clear();
    this.backgroundPromises.clear();
  }

  /**
   * Wait for all background operations to complete (useful for testing)
   */
  async waitForBackgroundOperations(): Promise<void> {
    if (this.backgroundPromises.size > 0) {
      await Promise.all(Array.from(this.backgroundPromises));
    }
  }
}