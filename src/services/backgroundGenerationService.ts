import Database from '../utils/database';
import { RoomGenerationService, GenerationLimits } from './roomGenerationService';

export interface BackgroundGenerationOptions {
  enableDebugLogging?: boolean;
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

  constructor(
    private db: Database,
    private roomGenerationService: RoomGenerationService,
    options: BackgroundGenerationOptions = {}
  ) {
    this.options = {
      enableDebugLogging: false,
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
      this.expandFromAdjacentRooms(currentRoomId, gameId);
      this.lastGenerationTime = Date.now();
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Pre-generation failed:', error);
      }
      // Silent failure - game continues normally
    }
  }

  /**
   * Expand room generation from adjacent unprocessed rooms
   */
  async expandFromAdjacentRooms(currentRoomId: number, gameId: number): Promise<void> {
    this.generationInProgress.add(currentRoomId);
    
    try {
      const limits = this.getGenerationLimits();
      
      // Get all connections FROM current room to existing rooms that haven't been processed yet
      const connections = await this.db.all(
        'SELECT c.*, r.generation_processed FROM connections c ' +
        'JOIN rooms r ON c.to_room_id = r.id ' +
        'WHERE c.from_room_id = ? AND c.game_id = ? AND (r.generation_processed = FALSE OR r.generation_processed IS NULL)',
        [currentRoomId, gameId]
      );

      let roomsToGenerate = 0;
      
      // For each connection that leads to an unprocessed room
      for (const connection of connections) {
        const targetRoom = await this.db.get(
          'SELECT * FROM rooms WHERE id = ?',
          [connection.to_room_id]
        );

        if (targetRoom) {
          // Count missing rooms for this target
          const missingCount = await this.roomGenerationService.countMissingRoomsFor(targetRoom.id, gameId);
          roomsToGenerate += Math.min(missingCount, limits.maxGenerationDepth);
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
          console.log(`🏰 Limited generation: ${roomsCanGenerate} rooms available (${roomsToGenerate} requested)`);
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
        }
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
  }
}