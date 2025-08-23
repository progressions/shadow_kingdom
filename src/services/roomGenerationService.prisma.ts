import { PrismaClient } from '../generated/prisma';
import { getPrismaClient } from './prismaService';
import { GrokClient, RegionGenerationContext } from '../ai/grokClient';
import { Room, Connection, UnfilledConnection } from './gameStateManager';
import { RegionServicePrisma } from './regionService.prisma';
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
 * RoomGenerationService (Prisma version) - handles core room and connection generation logic.
 * Responsible for AI-powered room creation and connection management.
 * Background generation is handled by BackgroundGenerationService.
 * 
 * This is the migrated version using Prisma instead of raw SQL.
 * Provides type safety, better performance, and cleaner code.
 */
export class RoomGenerationServicePrisma {
  private prisma: PrismaClient;
  private options: RoomGenerationOptions;

  constructor(
    private grokClient: GrokClient,
    private regionService: RegionServicePrisma,
    options: RoomGenerationOptions = {}
  ) {
    this.options = {
      enableDebugLogging: false,
      ...options
    };
    this.prisma = getPrismaClient();
  }

  /**
   * Generate a single room and connection in a specific direction
   */
  async generateSingleRoom(context: RoomGenerationContext): Promise<RoomGenerationResult> {
    try {
      // Check if a connection already exists for this direction to prevent duplicates
      const existingConnection = await this.prisma.connection.findFirst({
        where: {
          fromRoomId: context.fromRoomId,
          direction: context.direction,
          gameId: context.gameId
        }
      });
      
      if (existingConnection) {
        return { 
          success: false, 
          error: new Error('Connection already exists') 
        };
      }

      const fromRoom = await this.prisma.room.findUnique({
        where: { id: context.fromRoomId }
      });

      if (!fromRoom) {
        return { 
          success: false, 
          error: new Error('From room not found') 
        };
      }

      // Determine region assignment using RegionService
      let regionId: number;
      let regionDistance: number;

      if (fromRoom.regionId && fromRoom.regionDistance !== null) {
        // Check if we should create a new region or continue in current one
        const shouldCreateNewRegion = this.regionService.shouldCreateNewRegion(fromRoom.regionDistance);
        
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
              region: existingRegions.find(r => r.id === fromRoom.regionId)
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
          regionId = fromRoom.regionId;
          regionDistance = fromRoom.regionDistance + 1;
          
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
      const existingRooms = await this.prisma.room.findMany({
        where: { gameId: context.gameId },
        orderBy: { id: 'asc' },
        select: { name: true }
      });
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
        const existingRoom = await this.prisma.room.findFirst({
          where: {
            gameId: context.gameId,
            name: uniqueName
          }
        });
        
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

      // Save to database with region assignment using Prisma transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Create the room
        const createdRoom = await tx.room.create({
          data: {
            gameId: context.gameId,
            name: uniqueName,
            description: newRoom.description,
            regionId,
            regionDistance
          }
        });

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
        const createdConnection = await tx.connection.create({
          data: {
            gameId: context.gameId,
            fromRoomId: context.fromRoomId,
            toRoomId: createdRoom.id,
            direction: context.direction,
            name: outgoingThematicName
          }
        });

        // Create AI-generated connections from the new room
        let hasReturnPath = false;
        
        if (newRoom.connections && newRoom.connections.length > 0) {
          for (const connection of newRoom.connections) {
            // Find if this connection leads back to the origin room
            const isReturnPath = connection.direction === this.getReverseDirection(context.direction);
            
            if (isReturnPath) {
              hasReturnPath = true;
              // Create the return connection with thematic name
              await tx.connection.create({
                data: {
                  gameId: context.gameId,
                  fromRoomId: createdRoom.id,
                  toRoomId: context.fromRoomId,
                  direction: connection.direction,
                  name: connection.name
                }
              });
            } else {
              // Create unfilled connection for future background generation
              await tx.connection.create({
                data: {
                  gameId: context.gameId,
                  fromRoomId: createdRoom.id,
                  toRoomId: null,
                  direction: connection.direction,
                  name: connection.name
                }
              });
              
              if (this.isDebugEnabled()) {
                console.log(`🔗 Created unfilled connection: ${connection.name} (${connection.direction})`);
              }
            }
          }
        }
        
        // ALWAYS ensure new room has at least one exit back to where we came from
        // This prevents dead-end rooms that trap players
        if (!hasReturnPath) {
          const reverseDirection = this.getReverseDirection(context.direction);
          if (reverseDirection) {
            await tx.connection.create({
              data: {
                gameId: context.gameId,
                fromRoomId: createdRoom.id,
                toRoomId: context.fromRoomId,
                direction: reverseDirection,
                name: `back through the ${context.direction}ern passage`
              }
            });
            
            if (this.isDebugEnabled()) {
              console.log(`🔗 Added mandatory return path: ${reverseDirection} back to origin`);
            }
          }
        }

        return { room: createdRoom, connection: createdConnection };
      });

      // Only show generation messages in debug mode
      if (this.isDebugEnabled()) {
        console.log(`✨ Generated new area: ${uniqueName} (${context.direction})`);
      }
      
      return { 
        success: true, 
        roomId: result.room.id,
        connectionId: result.connection.id
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
   * Generate a room specifically for an unfilled connection
   */
  async generateRoomForConnection(connection: UnfilledConnection): Promise<RoomGenerationResult> {
    try {
      const fromRoom = await this.prisma.room.findUnique({
        where: { id: connection.from_room_id }
      });
      
      if (!fromRoom) {
        return { success: false, error: new Error('From room not found') };
      }

      // Determine region assignment using RegionService
      let regionId: number;
      let regionDistance: number;

      if (fromRoom.regionId && fromRoom.regionDistance !== null) {
        // Check if we should create a new region or continue in current one
        const shouldCreateNewRegion = this.regionService.shouldCreateNewRegion(fromRoom.regionDistance);
        
        if (shouldCreateNewRegion) {
          // Generate new region with AI
          const existingRegions = await this.regionService.getRegionsForGame(connection.game_id);
          const regionContext: RegionGenerationContext = {
            gameId: connection.game_id,
            transitionFrom: {
              room: {
                name: fromRoom.name,
                description: fromRoom.description
              },
              region: existingRegions.find(r => r.id === fromRoom.regionId)
            },
            existingRegions: existingRegions.map(r => r.name || r.type)
          };

          const generatedRegion = await this.grokClient.generateRegion(regionContext);
          const newRegion = await this.regionService.createRegion(
            connection.game_id,
            generatedRegion.type,
            generatedRegion.description,
            generatedRegion.name
          );
          
          regionId = newRegion.id;
          regionDistance = this.regionService.generateRegionDistance(); // 2-7
          
          if (this.isDebugEnabled()) {
            console.log(`🏛️ Created new region: ${generatedRegion.name} (${generatedRegion.type}) for connection`);
          }
        } else {
          // Continue in current region, increase distance
          regionId = fromRoom.regionId;
          regionDistance = fromRoom.regionDistance + 1;
          
          if (this.isDebugEnabled()) {
            console.log(`📍 Continuing in region ${regionId} at distance ${regionDistance} for connection`);
          }
        }
      } else {
        // From room has no region - create new one
        const regionContext: RegionGenerationContext = {
          gameId: connection.game_id,
          transitionFrom: {
            room: {
              name: fromRoom.name,
              description: fromRoom.description
            }
          }
        };

        const generatedRegion = await this.grokClient.generateRegion(regionContext);
        const newRegion = await this.regionService.createRegion(
          connection.game_id,
          generatedRegion.type,
          generatedRegion.description,
          generatedRegion.name
        );
        
        regionId = newRegion.id;
        regionDistance = this.regionService.generateRegionDistance();
        
        if (this.isDebugEnabled()) {
          console.log(`🏛️ Created first region: ${generatedRegion.name} (${generatedRegion.type}) for connection`);
        }
      }

      // Build regional context for room generation with connection-specific details
      const region = await this.regionService.getRegion(regionId);
      if (!region) {
        throw new Error('Failed to retrieve region for connection-based room generation');
      }

      const regionContext = {
        region,
        isCenter: regionDistance === 0,
        distanceFromCenter: regionDistance
      };

      const adjacentDescriptions = await this.regionService.getAdjacentRoomDescriptions(connection.from_room_id);
      const enhancedPrompt = await this.regionService.buildRoomGenerationPrompt(regionContext, adjacentDescriptions);

      // Get existing room names for context
      const existingRooms = await this.prisma.room.findMany({
        where: { gameId: connection.game_id },
        orderBy: { id: 'asc' },
        select: { name: true }
      });
      const roomNames = existingRooms.map(room => room.name);

      // Generate room with connection context for better AI prompting
      const newRoom = await this.grokClient.generateRoom({
        currentRoom: { name: fromRoom.name, description: fromRoom.description },
        direction: connection.direction,
        gameHistory: roomNames,
        theme: enhancedPrompt, // Use the regional prompt as theme
        connectionName: connection.name // Pass the connection name for context-aware generation
      });

      // Check for duplicate room names and make unique if needed
      let uniqueName = newRoom.name;
      let counter = 1;
      
      while (true) {
        const existingRoom = await this.prisma.room.findFirst({
          where: {
            gameId: connection.game_id,
            name: uniqueName
          }
        });
        
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

      // Create the room and update connection in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Create the room with region assignment
        const createdRoom = await tx.room.create({
          data: {
            gameId: connection.game_id,
            name: uniqueName,
            description: newRoom.description,
            regionId,
            regionDistance
          }
        });

        // Update the connection to point to the new room (fill the connection)
        await tx.connection.update({
          where: { id: connection.id },
          data: { toRoomId: createdRoom.id }
        });

        // Create return connection (filled immediately)
        const returnDirection = this.getReverseDirection(connection.direction);
        if (returnDirection) {
          // Find return connection name from AI response or generate complementary
          let returnConnectionName = 'back';
          if (newRoom.connections && newRoom.connections.length > 0) {
            const returnConnection = newRoom.connections.find(c => 
              c.direction === returnDirection
            );
            if (returnConnection) {
              returnConnectionName = returnConnection.name;
            }
          }
          
          if (returnConnectionName === 'back') {
            returnConnectionName = this.generateComplementaryConnectionName(connection.name, returnDirection);
          }

          await tx.connection.create({
            data: {
              gameId: connection.game_id,
              fromRoomId: createdRoom.id,
              toRoomId: connection.from_room_id,
              direction: returnDirection,
              name: returnConnectionName
            }
          });
        }

        // Create other AI-specified connections as unfilled connections
        if (newRoom.connections && newRoom.connections.length > 0) {
          for (const newConnection of newRoom.connections) {
            if (newConnection.direction !== returnDirection) {
              await tx.connection.create({
                data: {
                  gameId: connection.game_id,
                  fromRoomId: createdRoom.id,
                  toRoomId: null,
                  direction: newConnection.direction,
                  name: newConnection.name
                }
              });
              
              if (this.isDebugEnabled()) {
                console.log(`🔗 Created unfilled connection from new room: ${newConnection.name} (${newConnection.direction})`);
              }
            }
          }
        }

        return createdRoom;
      });

      if (this.isDebugEnabled()) {
        console.log(`✨ Generated room for connection: ${uniqueName} via ${connection.name}`);
      }
      
      return { 
        success: true, 
        roomId: result.id,
        connectionId: connection.id
      };

    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error(`Failed to generate room for connection ${connection.id}:`, error);
      }
      return { 
        success: false, 
        error: error as Error 
      };
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