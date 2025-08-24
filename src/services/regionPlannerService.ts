import Database from '../utils/database';
import { RegionConcept, GeneratedRoom, RoomGenerationContext, CompleteRegion } from '../types/regionConcept';
import { GrokClient, RegionConceptGenerationContext } from '../ai/grokClient';

export interface RegionPlannerServiceOptions {
  enableDebugLogging?: boolean;
}

/**
 * RegionPlannerService handles region concept generation for the region-based world system.
 * Phase 1: Generate region concepts with themes, guardians, keys, and locked exits.
 */
export class RegionPlannerService {
  private db: Database;
  private options: RegionPlannerServiceOptions;
  private grokClient: GrokClient;

  constructor(db: Database, options: RegionPlannerServiceOptions = {}) {
    this.db = db;
    this.options = {
      enableDebugLogging: false,
      ...options
    };
    this.grokClient = new GrokClient(); // Respects AI_MOCK_MODE environment variable
  }

  /**
   * Generate a region concept with theme, guardian, key, and locked exit
   */
  async generateRegionConcept(context: RegionConceptGenerationContext = {}): Promise<RegionConcept> {
    try {
      if (this.options.enableDebugLogging) {
        console.log('🏰 Generating region concept with context:', context);
      }

      const concept = await this.grokClient.generateRegionConcept(context);
      
      if (this.options.enableDebugLogging) {
        console.log('🏰 Generated region concept:', concept.name);
      }

      return concept;
    } catch (error) {
      if (this.options.enableDebugLogging) {
        console.error('Error generating region concept:', error);
      }
      // Re-throw the error - let the caller handle it
      throw error;
    }
  }

  /**
   * Generate a single themed room from a region concept
   */
  async generateRoom(context: RoomGenerationContext): Promise<GeneratedRoom> {
    try {
      if (this.options.enableDebugLogging) {
        console.log('🏠 Generating room with context:', {
          region: context.concept.name,
          includeKey: context.includeKey,
          includeGuardian: context.includeGuardian,
          includeLockedExit: context.includeLockedExit,
          adjacentRooms: context.adjacentRooms?.length || 0
        });
      }

      const room = await this.grokClient.generateRegionRoom(context);
      
      if (this.options.enableDebugLogging) {
        console.log('🏠 Generated room:', room.name);
      }

      return room;
    } catch (error) {
      if (this.options.enableDebugLogging) {
        console.error('Error generating room:', error);
      }
      // Re-throw the error - let the caller handle it
      throw error;
    }
  }

  /**
   * Generate a complete region with 12 themed rooms
   */
  async generateCompleteRegion(sequenceNumber: number, context: RegionConceptGenerationContext = {}): Promise<CompleteRegion> {
    try {
      if (this.options.enableDebugLogging) {
        console.log(`🏰 Generating complete region ${sequenceNumber}...`);
      }

      // Generate the region concept first
      const concept = await this.generateRegionConcept(context);
      
      if (this.options.enableDebugLogging) {
        console.log(`🏰 Generated concept: "${concept.name}" - ${concept.theme}`);
        console.log(`🏰 Now generating 12 rooms...`);
      }

      const rooms: GeneratedRoom[] = [];
      const roomNames: string[] = []; // Track names for adjacency
      
      // Generate all 12 rooms with specific requirements
      for (let i = 0; i < 12; i++) {
        const roomNumber = i + 1;
        let roomContext: RoomGenerationContext = {
          concept: concept,
          adjacentRooms: [...roomNames] // Avoid duplicate names
        };

        // Set special requirements based on room position
        if (roomNumber === 10) {
          // Guardian room (Room 10): has both guardian and key
          roomContext.includeGuardian = true;
          roomContext.includeKey = true;
          
          if (this.options.enableDebugLogging) {
            console.log(`🏠 Generating guardian room ${roomNumber} with enemy + key`);
          }
        } else if (roomNumber === 11) {
          // Exit room (Room 11): has locked exit reference
          roomContext.includeLockedExit = true;
          
          if (this.options.enableDebugLogging) {
            console.log(`🏠 Generating exit room ${roomNumber} with locked exit`);
          }
        } else {
          // Entrance (Room 1) and exploration rooms (2-9, 12): standard rooms
          if (this.options.enableDebugLogging) {
            const roomType = roomNumber === 1 ? 'entrance' : 'exploration';
            console.log(`🏠 Generating ${roomType} room ${roomNumber}`);
          }
        }

        const room = await this.generateRoom(roomContext);
        rooms.push(room);
        roomNames.push(room.name);
        
        if (this.options.enableDebugLogging) {
          console.log(`🏠 Generated room ${roomNumber}: "${room.name}"`);
        }
      }

      // Create complete region structure
      const completeRegion: CompleteRegion = {
        concept: concept,
        rooms: rooms,
        sequenceNumber: sequenceNumber,
        entranceRoomIndex: 0,          // Room 1 (index 0)
        guardianRoomIndex: 9,          // Room 10 (index 9)
        exitRoomIndex: 10,             // Room 11 (index 10)  
        explorationRoomIndexes: [1, 2, 3, 4, 5, 6, 7, 8, 11] // Rooms 2-9, 12
      };

      if (this.options.enableDebugLogging) {
        console.log(`🏰 Complete region "${concept.name}" generated successfully!`);
        console.log(`🏰 Entrance: "${rooms[0].name}"`);
        console.log(`🏰 Guardian: "${rooms[9].name}" (with ${concept.guardian.name} and ${concept.key.name})`);
        console.log(`🏰 Exit: "${rooms[10].name}" (requires ${concept.key.name} for ${concept.lockedExit.name})`);
        console.log(`🏰 Exploration: ${completeRegion.explorationRoomIndexes.length} rooms`);
      }

      return completeRegion;
    } catch (error) {
      if (this.options.enableDebugLogging) {
        console.error(`Error generating complete region ${sequenceNumber}:`, error);
      }
      // Re-throw the error - let the caller handle it
      throw error;
    }
  }
}