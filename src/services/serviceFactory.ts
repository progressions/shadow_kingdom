import Database from '../utils/database';
import { GrokClient } from '../ai/grokClient';
import { TUIInterface } from '../ui/TUIInterface';

// Import old services
import { GameStateManager } from './gameStateManager';
import { GameManagementService } from './gameManagementService';
import { RegionService } from './regionService';
import { RoomGenerationService } from './roomGenerationService';
import { BackgroundGenerationService } from './backgroundGenerationService';
import { ItemService } from './itemService';
import { EquipmentService } from './equipmentService';
import { ItemGenerationService } from './itemGenerationService';
import { CharacterService } from './characterService';
import { CharacterGenerationService } from './characterGenerationService';
import { ActionValidator } from './actionValidator';
import { HealthService } from './healthService';
import { EventTriggerService } from './eventTriggerService';
import { FantasyLevelService } from './fantasyLevelService';
import { ExamineService } from './examineService';
import { LoggerService } from './loggerService';

// Import Prisma services conditionally to avoid import errors when Prisma is not set up
let GameStateManagerPrisma: any;
let GameManagementServicePrisma: any;
let RegionServicePrisma: any;
let RoomGenerationServicePrisma: any;
let BackgroundGenerationServicePrisma: any;
let HealthServicePrisma: any;
let ItemServicePrisma: any;
let CharacterServicePrisma: any;
let EquipmentServicePrisma: any;
let ItemGenerationServicePrisma: any;
let CharacterGenerationServicePrisma: any;
let ActionValidatorPrisma: any;
let ExamineServicePrisma: any;

// Only import Prisma services if Prisma is configured
if (process.env.USE_PRISMA === 'true') {
  try {
    ({ GameStateManagerPrisma } = require('./gameStateManager.prisma'));
    ({ GameManagementServicePrisma } = require('./gameManagementService.prisma'));
    ({ RegionServicePrisma } = require('./regionService.prisma'));
    ({ RoomGenerationServicePrisma } = require('./roomGenerationService.prisma'));
    ({ BackgroundGenerationServicePrisma } = require('./backgroundGenerationService.prisma'));
    ({ HealthServicePrisma } = require('./healthService.prisma'));
    ({ ItemServicePrisma } = require('./itemService.prisma'));
    ({ CharacterServicePrisma } = require('./characterService.prisma'));
    ({ EquipmentServicePrisma } = require('./equipmentService.prisma'));
    ({ ItemGenerationServicePrisma } = require('./itemGenerationService.prisma'));
    ({ CharacterGenerationServicePrisma } = require('./characterGenerationService.prisma'));
    ({ ActionValidatorPrisma } = require('./actionValidator.prisma'));
    ({ ExamineServicePrisma } = require('./examineService.prisma'));
  } catch (error) {
    console.error('Failed to load Prisma services:', error);
    // Fall back to legacy services
  }
}

export interface ServiceOptions {
  enableDebugLogging?: boolean;
}

export interface ServiceInstances {
  gameStateManager: GameStateManager | any;
  gameManagementService: GameManagementService | any;
  regionService: RegionService | any;
  roomGenerationService: RoomGenerationService | any;
  backgroundGenerationService: BackgroundGenerationService | any;
  itemService: ItemService;
  equipmentService: EquipmentService;
  itemGenerationService: ItemGenerationService;
  characterService: CharacterService;
  characterGenerationService: CharacterGenerationService;
  actionValidator: ActionValidator;
  healthService: HealthService;
  eventTriggerService: EventTriggerService;
  fantasyLevelService: FantasyLevelService;
  examineService: ExamineService;
  loggerService: LoggerService;
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
    tui: TUIInterface,
    grokClient: GrokClient,
    options: ServiceOptions = {}
  ): ServiceInstances {
    if (ServiceFactory.shouldUsePrisma()) {
      return ServiceFactory.createPrismaServices(tui, grokClient, options);
    } else {
      return ServiceFactory.createLegacyServices(db, tui, grokClient, options);
    }
  }

  /**
   * Create legacy Database-based services
   */
  private static createLegacyServices(
    db: Database,
    tui: TUIInterface,
    grokClient: GrokClient,
    options: ServiceOptions
  ): ServiceInstances {
    // Create services with Database dependency
    const gameStateManager = new GameStateManager(db, options, tui);
    const gameManagementService = new GameManagementService(db, tui, options);
    const regionService = new RegionService(db, options);
    const itemService = new ItemService(db);
    const equipmentService = new EquipmentService(db);
    const itemGenerationService = new ItemGenerationService(db, itemService);
    const characterService = new CharacterService(db);
    const characterGenerationService = new CharacterGenerationService(db, characterService);
    const actionValidator = new ActionValidator(db, characterService);
    const healthService = new HealthService(db);
    const eventTriggerService = new EventTriggerService(db, tui);
    const fantasyLevelService = new FantasyLevelService();
    const examineService = new ExamineService(db, characterService, itemService);
    const loggerService = new LoggerService();
    
    // Room generation service depends on region service and item generation service
    const roomGenerationService = new RoomGenerationService(
      db, 
      grokClient, 
      regionService,
      itemGenerationService,
      characterGenerationService,
      fantasyLevelService,
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
      backgroundGenerationService,
      itemService,
      equipmentService,
      itemGenerationService,
      characterService,
      characterGenerationService,
      actionValidator,
      healthService,
      eventTriggerService,
      fantasyLevelService,
      examineService,
      loggerService
    };
  }

  /**
   * Create Prisma-based services
   */
  private static createPrismaServices(
    tui: TUIInterface,
    grokClient: GrokClient,
    options: ServiceOptions
  ): ServiceInstances {
    if (!GameStateManagerPrisma) {
      throw new Error('Prisma services not available. Please ensure Prisma is properly configured.');
    }
    
    // Create services without Database dependency (they use PrismaService internally)
    const gameStateManager = new GameStateManagerPrisma(options);
    const gameManagementService = new GameManagementServicePrisma(tui, options);
    const regionService = new RegionServicePrisma(options);
    const itemService = new ItemServicePrisma();
    const characterService = new CharacterServicePrisma();
    const equipmentService = new EquipmentServicePrisma();
    const itemGenerationService = new ItemGenerationServicePrisma(itemService);
    const characterGenerationService = new CharacterGenerationServicePrisma(characterService, options);
    const actionValidator = new ActionValidatorPrisma(characterService);
    const healthService = new HealthServicePrisma();
    const examineService = new ExamineServicePrisma(characterService, itemService);
    // Note: Some services still need legacy Database for now
    const db = new Database('placeholder'); // TODO: Remove when all services migrated
    const eventTriggerService = new EventTriggerService(db, tui);
    const fantasyLevelService = new FantasyLevelService();
    const loggerService = new LoggerService();
    
    // Room generation service depends on region service
    // TODO: Update Prisma version to support itemGenerationService and characterGenerationService
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
      backgroundGenerationService,
      itemService,
      equipmentService,
      itemGenerationService,
      characterService,
      characterGenerationService,
      actionValidator,
      healthService,
      eventTriggerService,
      fantasyLevelService,
      examineService,
      loggerService
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