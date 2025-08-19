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
   * Find unfilled connections that need room generation
   */
  async findUnfilledConnections(gameId: number): Promise<UnfilledConnection[]> {
    try {
      const connections = await this.db.all<UnfilledConnection>(
        'SELECT c.*, r.name as from_room_name FROM connections c ' +
        'JOIN rooms r ON c.from_room_id = r.id ' +
        'WHERE c.to_room_id IS NULL AND c.game_id = ? ' +
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
   * Find unfilled connections near the current location for prioritized generation
   */
  async findNearbyUnfilledConnections(currentRoomId: number, gameId: number): Promise<UnfilledConnection[]> {
    try {
      // Find connections within discovery radius that need filling
      const connections = await this.db.all<UnfilledConnection>(`
        WITH RECURSIVE reachable_rooms(room_id, distance) AS (
          SELECT ?, 0
          UNION ALL
          SELECT c.to_room_id, r.distance + 1
          FROM connections c
          JOIN reachable_rooms r ON c.from_room_id = r.room_id
          WHERE c.to_room_id IS NOT NULL AND r.distance < 2
        )
        SELECT c.*, r.name as from_room_name FROM connections c
        JOIN reachable_rooms rr ON c.from_room_id = rr.room_id
        JOIN rooms r ON c.from_room_id = r.id
        WHERE c.to_room_id IS NULL AND c.game_id = ?
        ORDER BY rr.distance, c.id
        LIMIT ?
      `, [currentRoomId, gameId, this.getGenerationLimits().maxGenerationDepth]);

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
        // Fallback: Check for legacy unprocessed rooms (backward compatibility)
        const legacyGeneratedRooms = await this.processLegacyUnprocessedRooms(currentRoomId, gameId, limits);
        
        if (legacyGeneratedRooms === 0 && this.isDebugEnabled()) {
          console.log('🔍 No unfilled connections or legacy unprocessed rooms found for background generation');
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

      const connectionsToFill = Math.min(nearbyUnfilledConnections.length, roomsCanGenerate);
      
      if (this.isDebugEnabled()) {
        console.log(`🔗 Filling ${connectionsToFill} unfilled connections (${nearbyUnfilledConnections.length} found, ${roomsCanGenerate} rooms available)`);
      }

      // Generate rooms for unfilled connections
      let generatedCount = 0;
      for (let i = 0; i < connectionsToFill; i++) {
        const connection = nearbyUnfilledConnections[i];
        
        // Verify connection is still unfilled (race condition protection)
        const currentConnection = await this.db.get<UnfilledConnection>(
          'SELECT * FROM connections WHERE id = ? AND to_room_id IS NULL',
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
   * Process legacy unprocessed rooms (backward compatibility during transition)
   */
  async processLegacyUnprocessedRooms(currentRoomId: number, gameId: number, limits: GenerationLimits): Promise<number> {
    try {
      // Get all connections FROM current room to existing rooms that haven't been processed yet
      const connections = await this.db.all(
        'SELECT c.*, r.generation_processed FROM connections c ' +
        'JOIN rooms r ON c.to_room_id = r.id ' +
        'WHERE c.from_room_id = ? AND c.game_id = ? AND (r.generation_processed = FALSE OR r.generation_processed IS NULL)',
        [currentRoomId, gameId]
      );

      if (connections.length === 0) {
        return 0;
      }

      if (this.isDebugEnabled()) {
        console.log(`🔄 Processing ${connections.length} legacy unprocessed rooms`);
      }

      let roomsToGenerate = 0;
      
      // For each connection that leads to an unprocessed room
      for (const connection of connections) {
        const targetRoom = await this.db.get(
          'SELECT * FROM rooms WHERE id = ?',
          [connection.to_room_id]
        );

        if (targetRoom) {
          // CRITICAL: Double-check if room is still unprocessed
          if (!targetRoom.generation_processed) {
            // Count missing rooms for this target
            const missingCount = await this.roomGenerationService.countMissingRoomsFor(targetRoom.id, gameId);
            roomsToGenerate += Math.min(missingCount, limits.maxGenerationDepth);
          } else if (this.isDebugEnabled()) {
            console.log(`🔒 Legacy target room ${targetRoom.id} already processed - skipping`);
          }
        }
      }

      // Check if we can generate the requested rooms without exceeding limits
      const currentRoomCount = await this.db.get(
        'SELECT COUNT(*) as count FROM rooms WHERE game_id = ?',
        [gameId]
      );
      
      const roomsCanGenerate = Math.max(0, limits.maxRoomsPerGame - (currentRoomCount?.count || 0));
      
      if (roomsToGenerate > roomsCanGenerate) {
        if (this.isDebugEnabled()) {
          console.log(`🏰 Limited legacy generation: ${roomsCanGenerate} rooms available (${roomsToGenerate} requested)`);
        }
        roomsToGenerate = roomsCanGenerate;
      }

      // Generate rooms with depth limit
      let generatedCount = 0;
      for (const connection of connections) {
        if (generatedCount >= roomsToGenerate) break;
        
        const targetRoom = await this.db.get(
          'SELECT * FROM rooms WHERE id = ?',
          [connection.to_room_id]
        );

        if (targetRoom) {
          // CRITICAL: Final check before generation
          if (!targetRoom.generation_processed) {
            const roomsGenerated = await this.roomGenerationService.generateMissingRoomsFor(
              targetRoom.id, 
              gameId, 
              limits.maxGenerationDepth, 
              roomsToGenerate - generatedCount
            );
            generatedCount += roomsGenerated;
            
            // Mark this room as processed so we don't generate for it again
            await this.db.run(
              'UPDATE rooms SET generation_processed = TRUE WHERE id = ?',
              [targetRoom.id]
            );
          } else if (this.isDebugEnabled()) {
            console.log(`🔒 Legacy target room ${targetRoom.id} was processed before generation - skipping`);
          }
        }
      }

      if (this.isDebugEnabled()) {
        console.log(`🔄 Legacy processing completed: ${generatedCount} rooms generated`);
      }

      return generatedCount;

    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Legacy room processing failed:', error);
      }
      return 0;
    }
  }

  /**
   * Get generation limits from environment or defaults
   */
  private getGenerationLimits(): GenerationLimits {
    return {
      maxRoomsPerGame: parseInt(process.env.MAX_ROOMS_PER_GAME || '100'),
      maxGenerationDepth: parseInt(process.env.MAX_GENERATION_DEPTH || '5'),
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