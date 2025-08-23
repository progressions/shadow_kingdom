import Database from '../utils/database';
import { RegionConcept, GeneratedRoom, RoomGenerationContext } from '../types/regionConcept';
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
    this.grokClient = new GrokClient({ mockMode: true }); // Start with mock mode for testing
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
}