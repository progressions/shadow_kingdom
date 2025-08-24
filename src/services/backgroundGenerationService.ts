import Database from '../utils/database';
import { RoomGenerationService } from './roomGenerationService';
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
 * BackgroundGenerationService handles region queue management and triggers.
 * Simplified service for region-based world generation system.
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
      // Auto-generation is now disabled in Phase 9 - region queue handles generation
      return;

      // Get current room's region info
      const currentRoom = await this.db.get<any>(`
        SELECT r.*, reg.name as region_name, reg.type as region_type
        FROM rooms r
        JOIN regions reg ON r.region_id = reg.id
        WHERE r.id = ?
      `, [roomId]);

      if (!currentRoom) {
        return; // Room not found
      }

      // Check if we've already generated the next region for this region
      if (await this.hasGeneratedNextRegion(currentRoom.region_id, gameId)) {
        if (this.isDebugEnabled()) {
          console.log(`🚫 Skipping region generation - next region already generated for region ${currentRoom.region_id}`);
        }
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
      const promises = connectionsToProcess.map(connection => 
        this.generateConnectionWithProcessingFlag(connection, currentRoom.region_id)
      );
      
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
  private async generateConnectionWithProcessingFlag(connection: UnfilledConnection, sourceRegionId?: number): Promise<void> {
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
   * Trigger next region generation (simplified region queue approach)
   */
  async triggerNextRegionGeneration(gameId: number): Promise<void> {
    try {
      // Check cooldown period
      const timeSinceLastGeneration = Date.now() - this.lastGenerationTime;
      
      if (timeSinceLastGeneration < 10000) { // 10 second cooldown
        return; // Still in cooldown
      }

      if (this.isDebugEnabled()) {
        console.log(`🏰 Triggering next region generation for game ${gameId}`);
      }

      this.lastGenerationTime = Date.now();
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Region generation trigger failed:', error);
      }
      // Silent failure - game continues normally
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
    return this.getTimeSinceLastGeneration() >= 10000; // 10 second cooldown
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

  /**
   * Check if we've already generated a next region for the given region
   */
  private async hasGeneratedNextRegion(regionId: number, gameId: number): Promise<boolean> {
    try {
      // Count how many regions exist after the current one (chronologically)
      const regionCreationTime = await this.db.get<{created_at: string}>(`
        SELECT created_at FROM regions WHERE id = ?
      `, [regionId]);

      if (!regionCreationTime) {
        return false;
      }

      // Count newer regions
      const newerRegionsCount = await this.db.get<{count: number}>(`
        SELECT COUNT(*) as count FROM regions 
        WHERE game_id = ? AND created_at > ?
      `, [gameId, regionCreationTime.created_at]);

      // If there are newer regions, we've already generated the next region
      return (newerRegionsCount?.count || 0) > 0;
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Error checking if next region generated:', error);
      }
      return false;
    }
  }
}