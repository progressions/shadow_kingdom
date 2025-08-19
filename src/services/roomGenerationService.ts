import Database from '../utils/database';
import { GrokClient, RegionGenerationContext } from '../ai/grokClient';
import { Room, Connection } from './gameStateManager';
import { RegionService } from './regionService';
import { Region } from '../types/region';

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
 * RoomGenerationService handles core room and connection generation logic.
 * Responsible for AI-powered room creation and connection management.
 * Background generation is handled by BackgroundGenerationService.
 */
export class RoomGenerationService {
  private options: RoomGenerationOptions;

  constructor(
    private db: Database,
    private grokClient: GrokClient,
    private regionService: RegionService,
    options: RoomGenerationOptions = {}
  ) {
    this.options = {
      enableDebugLogging: false,
      ...options
    };
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
    // CRITICAL: Double-check if this room was already processed
    const room = await this.db.get(
      'SELECT generation_processed FROM rooms WHERE id = ? AND game_id = ?',
      [roomId, gameId]
    );

    // If room was processed, absolutely do NOT add more connections
    if (room && room.generation_processed) {
      if (this.isDebugEnabled()) {
        console.log(`🔒 Room ${roomId} is already processed - skipping generation`);
      }
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
        // CRITICAL: Final safety check - ensure room is still unprocessed before generating
        const finalCheck = await this.db.get(
          'SELECT generation_processed FROM rooms WHERE id = ? AND game_id = ?',
          [roomId, gameId]
        );
        
        if (finalCheck && finalCheck.generation_processed) {
          if (this.isDebugEnabled()) {
            console.log(`🔒 Room ${roomId} was processed during generation - aborting`);
          }
          break; // Stop generating for this room
        }

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

      const fromRoom = await this.db.get<any>('SELECT * FROM rooms WHERE id = ?', [context.fromRoomId]);

      // Determine region assignment using RegionService
      let regionId: number;
      let regionDistance: number;

      if (fromRoom.region_id && fromRoom.region_distance !== null) {
        // Check if we should create a new region or continue in current one
        const shouldCreateNewRegion = this.regionService.shouldCreateNewRegion(fromRoom.region_distance);
        
        if (shouldCreateNewRegion) {
          // Generate new region with AI
          const existingRegions = await this.regionService.getRegionsForGame(context.gameId);
          const regionContext: RegionGenerationContext = {
            gameId: context.gameId,
            transitionFrom: {
              room: {
                name: fromRoom.name,
                description: fromRoom.description
              },
              region: existingRegions.find(r => r.id === fromRoom.region_id)
            },
            existingRegions: existingRegions.map(r => r.name || r.type)
          };

          const generatedRegion = await this.grokClient.generateRegion(regionContext);
          const newRegion = await this.regionService.createRegion(
            context.gameId,
            generatedRegion.type,
            generatedRegion.description,
            generatedRegion.name
          );
          
          regionId = newRegion.id;
          regionDistance = this.regionService.generateRegionDistance(); // 2-7
          
          if (this.isDebugEnabled()) {
            console.log(`🏛️ Created new region: ${generatedRegion.name} (${generatedRegion.type}) at distance ${regionDistance}`);
          }
        } else {
          // Continue in current region, increase distance
          regionId = fromRoom.region_id;
          regionDistance = fromRoom.region_distance + 1;
          
          if (this.isDebugEnabled()) {
            console.log(`📍 Continuing in region ${regionId} at distance ${regionDistance}`);
          }
        }
      } else {
        // From room has no region - create new one
        const regionContext: RegionGenerationContext = {
          gameId: context.gameId,
          transitionFrom: {
            room: {
              name: fromRoom.name,
              description: fromRoom.description
            }
          }
        };

        const generatedRegion = await this.grokClient.generateRegion(regionContext);
        const newRegion = await this.regionService.createRegion(
          context.gameId,
          generatedRegion.type,
          generatedRegion.description,
          generatedRegion.name
        );
        
        regionId = newRegion.id;
        regionDistance = this.regionService.generateRegionDistance();
        
        if (this.isDebugEnabled()) {
          console.log(`🏛️ Created first region: ${generatedRegion.name} (${generatedRegion.type})`);
        }
      }

      // Build regional context for room generation
      const region = await this.regionService.getRegion(regionId);
      if (!region) {
        throw new Error('Failed to retrieve region for room generation');
      }

      const regionContext = {
        region,
        isCenter: regionDistance === 0,
        distanceFromCenter: regionDistance
      };

      const adjacentDescriptions = await this.regionService.getAdjacentRoomDescriptions(context.fromRoomId);
      const enhancedPrompt = await this.regionService.buildRoomGenerationPrompt(regionContext, adjacentDescriptions);

      // Get existing room names for context
      const existingRooms = await this.db.all(
        'SELECT name FROM rooms WHERE game_id = ? ORDER BY id',
        [context.gameId]
      );
      const roomNames = existingRooms.map(room => room.name);

      // Generate room with enhanced regional context
      const newRoom = await this.grokClient.generateRoom({
        currentRoom: { name: fromRoom.name, description: fromRoom.description },
        direction: context.direction,
        gameHistory: roomNames,
        theme: enhancedPrompt // Use the regional prompt as theme
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

      // Save to database with region assignment (new rooms start as unprocessed)
      const roomResult = await this.db.run(
        'INSERT INTO rooms (game_id, name, description, generation_processed, region_id, region_distance) VALUES (?, ?, ?, ?, ?, ?)',
        [context.gameId, uniqueName, newRoom.description, false, regionId, regionDistance]
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

}