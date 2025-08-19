import * as readline from 'readline';
import Database from '../utils/database';
import { GrokClient } from '../ai/grokClient';

// Import old services
import { GameStateManager } from './gameStateManager';
import { GameManagementService } from './gameManagementService';
import { RegionService } from './regionService';
import { RoomGenerationService } from './roomGenerationService';
import { BackgroundGenerationService } from './backgroundGenerationService';

// Import Prisma services
import { GameStateManagerPrisma } from './gameStateManager.prisma';
import { GameManagementServicePrisma } from './gameManagementService.prisma';
import { RegionServicePrisma } from './regionService.prisma';
import { RoomGenerationServicePrisma } from './roomGenerationService.prisma';
import { BackgroundGenerationServicePrisma } from './backgroundGenerationService.prisma';

export interface ServiceOptions {
  enableDebugLogging?: boolean;
}

export interface ServiceInstances {
  gameStateManager: GameStateManager | GameStateManagerPrisma;
  gameManagementService: GameManagementService | GameManagementServicePrisma;
  regionService: RegionService | RegionServicePrisma;
  roomGenerationService: RoomGenerationService | RoomGenerationServicePrisma;
  backgroundGenerationService: BackgroundGenerationService | BackgroundGenerationServicePrisma;
}

/**
 * ServiceFactory creates either legacy Database services or new Prisma services
 * based on the USE_PRISMA environment variable.
 */
export class ServiceFactory {
  
  /**
   * Determine if we should use Prisma services
   */
  static shouldUsePrisma(): boolean {
    return process.env.USE_PRISMA === 'true';
  }

  /**
   * Create all services (either legacy or Prisma versions)
   */
  static createServices(
    db: Database,
    rl: readline.Interface,
    grokClient: GrokClient,
    options: ServiceOptions = {}
  ): ServiceInstances {
    if (ServiceFactory.shouldUsePrisma()) {
      return ServiceFactory.createPrismaServices(rl, grokClient, options);
    } else {
      return ServiceFactory.createLegacyServices(db, rl, grokClient, options);
    }
  }

  /**
   * Create legacy Database-based services
   */
  private static createLegacyServices(
    db: Database,
    rl: readline.Interface,
    grokClient: GrokClient,
    options: ServiceOptions
  ): ServiceInstances {
    // Create services with Database dependency
    const gameStateManager = new GameStateManager(db, options);
    const gameManagementService = new GameManagementService(db, rl, options);
    const regionService = new RegionService(db, options);
    
    // Room generation service depends on region service
    const roomGenerationService = new RoomGenerationService(
      db, 
      grokClient, 
      regionService, 
      options
    );
    
    // Background generation service depends on room generation service
    const backgroundGenerationService = new BackgroundGenerationService(
      db,
      roomGenerationService,
      options
    );

    return {
      gameStateManager,
      gameManagementService,
      regionService,
      roomGenerationService,
      backgroundGenerationService
    };
  }

  /**
   * Create Prisma-based services
   */
  private static createPrismaServices(
    rl: readline.Interface,
    grokClient: GrokClient,
    options: ServiceOptions
  ): ServiceInstances {
    // Create services without Database dependency (they use PrismaService internally)
    const gameStateManager = new GameStateManagerPrisma(options);
    const gameManagementService = new GameManagementServicePrisma(rl, options);
    const regionService = new RegionServicePrisma(options);
    
    // Room generation service depends on region service
    const roomGenerationService = new RoomGenerationServicePrisma(
      grokClient, 
      regionService, 
      options
    );
    
    // Background generation service depends on room generation service
    const backgroundGenerationService = new BackgroundGenerationServicePrisma(
      roomGenerationService,
      options
    );

    return {
      gameStateManager,
      gameManagementService,
      regionService,
      roomGenerationService,
      backgroundGenerationService
    };
  }

  /**
   * Get the current implementation type for logging/debugging
   */
  static getImplementationType(): 'legacy' | 'prisma' {
    return ServiceFactory.shouldUsePrisma() ? 'prisma' : 'legacy';
  }

  /**
   * Log the current service configuration
   */
  static logConfiguration(): void {
    const impl = ServiceFactory.getImplementationType();
    const debugEnabled = process.env.AI_DEBUG_LOGGING === 'true';
    
    if (debugEnabled) {
      console.log(`🔧 Service Factory: Using ${impl} implementation`);
      if (impl === 'prisma') {
        console.log('   Database: Prisma ORM with type safety');
      } else {
        console.log('   Database: Legacy SQLite wrapper');
      }
    }
  }
}