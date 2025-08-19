import Database from '../utils/database';
import { GrokClient } from '../ai/grokClient';
import { Room, Connection } from './gameStateManager';

export interface RoomGenerationOptions {
  enableDebugLogging?: boolean;
}

export interface RoomGenerationContext {
  gameId: number;
  fromRoomId: number;
  direction: string;
  theme?: string;
}

export interface RoomGenerationResult {
  success: boolean;
  roomId?: number;
  connectionId?: number;
  error?: Error;
}

export interface GenerationLimits {
  maxRoomsPerGame: number;
  maxGenerationDepth: number;
  generationCooldownMs: number;
}

/**
 * RoomGenerationService handles all room and connection generation logic.
 * Responsible for AI-powered room creation, connection management, and background generation.
 */
export class RoomGenerationService {
  private options: RoomGenerationOptions;
  private lastGenerationTime: number = 0;
  private generationInProgress: Set<number> = new Set();

  constructor(
    private db: Database,
    private grokClient: GrokClient,
    options: RoomGenerationOptions = {}
  ) {
    this.options = {
      enableDebugLogging: false,
      ...options
    };
  }

  /**
   * Trigger background room generation for adjacent rooms
   */
  async preGenerateAdjacentRooms(currentRoomId: number, gameId: number): Promise<void> {
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
          const missingCount = await this.countMissingRoomsFor(targetRoom.id, gameId);
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
          const roomsGenerated = await this.generateMissingRoomsFor(
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
   * Count missing basic direction connections for a room
   */
  async countMissingRoomsFor(roomId: number, gameId: number): Promise<number> {
    // Check if this room was AI-generated and processed
    const room = await this.db.get(
      'SELECT generation_processed FROM rooms WHERE id = ? AND game_id = ?',
      [roomId, gameId]
    );

    // If room was AI-processed, respect its design - don't add more connections
    if (room && room.generation_processed) {
      return 0;
    }

    // For unprocessed rooms, check for missing basic directions
    const basicDirections = ['north', 'south', 'east', 'west'];
    let missingCount = 0;

    for (const direction of basicDirections) {
      const existingConnection = await this.db.get(
        'SELECT * FROM connections WHERE from_room_id = ? AND direction = ? AND game_id = ?',
        [roomId, direction, gameId]
      );

      if (!existingConnection) {
        missingCount++;
      }
    }

    return Math.min(missingCount, 4);
  }

  /**
   * Generate missing room connections for an unprocessed room
   */
  async generateMissingRoomsFor(
    roomId: number, 
    gameId: number, 
    maxRooms: number = 6, 
    remainingQuota: number = Infinity
  ): Promise<number> {
    // Check if this room was already processed
    const room = await this.db.get(
      'SELECT generation_processed FROM rooms WHERE id = ? AND game_id = ?',
      [roomId, gameId]
    );

    // If room was processed, don't add more connections
    if (room && room.generation_processed) {
      return 0;
    }

    // Generate missing connections for unprocessed rooms
    const basicDirections = ['north', 'south', 'east', 'west'];
    let generatedCount = 0;
    const maxGenerations = Math.min(maxRooms, remainingQuota, 4);

    for (const direction of basicDirections) {
      if (generatedCount >= maxGenerations) break;
      
      // Check if connection already exists
      const existingConnection = await this.db.get(
        'SELECT * FROM connections WHERE from_room_id = ? AND direction = ? AND game_id = ?',
        [roomId, direction, gameId]
      );

      if (!existingConnection) {
        // Generate new room in this direction
        const result = await this.generateSingleRoom({
          gameId,
          fromRoomId: roomId,
          direction,
          theme: 'mysterious fantasy kingdom'
        });
        
        if (result.success) {
          generatedCount++;
        }
      }
    }

    // Mark room as processed after generating connections
    if (generatedCount > 0) {
      await this.db.run(
        'UPDATE rooms SET generation_processed = TRUE WHERE id = ?',
        [roomId]
      );
    }

    return generatedCount;
  }

  /**
   * Generate a single room and connection in a specific direction
   */
  async generateSingleRoom(context: RoomGenerationContext): Promise<RoomGenerationResult> {
    try {
      // Check if a connection already exists for this direction to prevent duplicates
      const existingConnection = await this.db.get(
        'SELECT id FROM connections WHERE from_room_id = ? AND direction = ? AND game_id = ?',
        [context.fromRoomId, context.direction, context.gameId]
      );
      
      if (existingConnection) {
        return { 
          success: false, 
          error: new Error('Connection already exists') 
        };
      }

      const fromRoom = await this.db.get('SELECT * FROM rooms WHERE id = ?', [context.fromRoomId]);

      // Get existing room names for context
      const existingRooms = await this.db.all(
        'SELECT name FROM rooms WHERE game_id = ? ORDER BY id',
        [context.gameId]
      );
      const roomNames = existingRooms.map(room => room.name);

      const newRoom = await this.grokClient.generateRoom({
        currentRoom: { name: fromRoom.name, description: fromRoom.description },
        direction: context.direction,
        gameHistory: roomNames,
        theme: context.theme || 'mysterious fantasy kingdom'
      });

      // Check for duplicate room names and make unique if needed
      let uniqueName = newRoom.name;
      let counter = 1;
      
      while (true) {
        const existingRoom = await this.db.get(
          'SELECT id FROM rooms WHERE game_id = ? AND name = ?',
          [context.gameId, uniqueName]
        );
        
        if (!existingRoom) {
          break; // Name is unique
        }
        
        // Add counter to make name unique
        uniqueName = `${newRoom.name} ${counter}`;
        counter++;
        
        // Prevent infinite loop
        if (counter > 100) {
          uniqueName = `${newRoom.name} ${Date.now()}`;
          break;
        }
      }

      // Save to database (new rooms start as unprocessed)
      const roomResult = await this.db.run(
        'INSERT INTO rooms (game_id, name, description, generation_processed) VALUES (?, ?, ?, ?)',
        [context.gameId, uniqueName, newRoom.description, false]
      );

      // Find the AI-generated thematic name for the outgoing connection
      let outgoingThematicName = context.direction; // fallback to basic direction
      let returnThematicName = this.getReverseDirection(context.direction) || 'back';
      
      // Look for AI-generated connection descriptions
      if (newRoom.connections && newRoom.connections.length > 0) {
        // Find the return path connection for thematic naming
        const returnConnection = newRoom.connections.find(c => 
          c.direction === this.getReverseDirection(context.direction)
        );
        
        if (returnConnection) {
          returnThematicName = returnConnection.name;
          // Create a complementary thematic name for the outgoing connection
          outgoingThematicName = this.generateComplementaryConnectionName(returnConnection.name, context.direction);
        }
      }

      // Create outgoing connection from origin room with thematic name
      const connectionResult = await this.db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [context.gameId, context.fromRoomId, roomResult.lastID, context.direction, outgoingThematicName]
      );

      // Create AI-generated connections from the new room
      if (newRoom.connections && newRoom.connections.length > 0) {
        for (const connection of newRoom.connections) {
          // Find if this connection leads back to the origin room
          const isReturnPath = connection.direction === this.getReverseDirection(context.direction);
          
          if (isReturnPath) {
            // Create the return connection with thematic name
            await this.db.run(
              'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
              [context.gameId, roomResult.lastID, context.fromRoomId, connection.direction, connection.name]
            );
          } else {
            // For other directions, we'll create stub rooms later (in Phase 4)
            // For now, just log that we have additional connections planned
            if (this.isDebugEnabled()) {
              console.log(`🔗 Planned connection: ${connection.name} (${connection.direction})`);
            }
          }
        }
      } else {
        // Fallback: ensure new room has at least one exit (back to where we came from)
        const reverseDirection = this.getReverseDirection(context.direction);
        if (reverseDirection) {
          await this.db.run(
            'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
            [context.gameId, roomResult.lastID, context.fromRoomId, reverseDirection, returnThematicName]
          );
        }
      }

      // Only show generation messages in debug mode
      if (this.isDebugEnabled()) {
        console.log(`✨ Generated new area: ${uniqueName} (${context.direction})`);
      }
      
      return { 
        success: true, 
        roomId: roomResult.lastID as number,
        connectionId: connectionResult.lastID as number
      };

    } catch (error) {
      // Silent failure - this is background generation
      if (this.isDebugEnabled()) {
        console.error(`Failed to generate room ${context.direction} from ${context.fromRoomId}:`, error);
      }
      return { 
        success: false, 
        error: error as Error 
      };
    }
  }

  /**
   * Get the reverse direction for a given direction
   */
  getReverseDirection(direction: string): string | null {
    const directionMap: { [key: string]: string } = {
      'north': 'south',
      'south': 'north',
      'east': 'west',
      'west': 'east',
      'up': 'down',
      'down': 'up'
    };
    
    return directionMap[direction.toLowerCase()] || null;
  }

  /**
   * Generate a complementary thematic connection name
   */
  generateComplementaryConnectionName(returnName: string, direction: string): string {
    // Create a complementary thematic name based on the return path description
    // This ensures both directions have thematic names that make sense together
    
    // Extract key elements from the return name to create a complementary forward name
    if (returnName.includes('back through')) {
      // "back through the crystal entrance" -> "through the crystal entrance"
      return returnName.replace('back through', 'through');
    } else if (returnName.includes('back to')) {
      // "back to the garden" -> "to the shadowed passage"
      return `through the ${direction}ern passage`;
    } else if (returnName.includes('down')) {
      // "down the starlit steps" -> "up the starlit steps"
      return returnName.replace('down', 'up');
    } else if (returnName.includes('up')) {
      // "up the ancient stairs" -> "down the ancient stairs"
      return returnName.replace('up', 'down');
    } else if (returnName.includes('through')) {
      // Keep the thematic element but make it directional
      return returnName;
    } else {
      // Fallback: create a generic thematic name
      const thematicPrefixes = [
        'through the shadowed',
        'via the ancient',
        'through the ornate',
        'via the weathered',
        'through the mysterious'
      ];
      const prefix = thematicPrefixes[Math.floor(Math.random() * thematicPrefixes.length)];
      return `${prefix} ${direction}ern passage`;
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
  updateOptions(options: Partial<RoomGenerationOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current service configuration
   */
  getOptions(): RoomGenerationOptions {
    return { ...this.options };
  }

  /**
   * Get generation statistics
   */
  getGenerationStats() {
    return {
      lastGenerationTime: this.lastGenerationTime,
      activeGenerations: this.generationInProgress.size,
      roomsInProgress: Array.from(this.generationInProgress)
    };
  }
}