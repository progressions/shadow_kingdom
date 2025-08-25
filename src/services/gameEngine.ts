import { PrismaService } from './prismaService';
import { GameStateManager } from './gameStateManager';
import { Game, Room } from '@prisma/client';

export interface LaunchConfiguration {
  skipMenu: boolean;
  autoCreateGame: boolean;
  showLaunchMessages: boolean;
  updatePlayTimestamps: boolean;
  backgroundGeneration: boolean;
}

export interface GameLaunchResult {
  game: Game;
  isNewGame: boolean;
}

export interface GameEngineError extends Error {
  code: string;
  recoverable: boolean;
}

export class GameEngineError extends Error implements GameEngineError {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'GameEngineError';
  }
}

export class GameEngine {
  private launchConfiguration: LaunchConfiguration;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly gameStateManager: GameStateManager
  ) {
    // Initialize configuration from environment variables
    this.launchConfiguration = this.loadConfigurationFromEnvironment();
  }

  /**
   * Load launch configuration from environment variables with defaults
   */
  private loadConfigurationFromEnvironment(): LaunchConfiguration {
    return {
      skipMenu: process.env.GAME_ENGINE_SKIP_MENU !== 'false', // Default: true
      autoCreateGame: process.env.GAME_ENGINE_AUTO_CREATE !== 'false', // Default: true
      showLaunchMessages: process.env.GAME_ENGINE_SHOW_MESSAGES !== 'false', // Default: true
      updatePlayTimestamps: process.env.GAME_ENGINE_UPDATE_TIMESTAMPS !== 'false', // Default: true
      backgroundGeneration: process.env.GAME_ENGINE_BACKGROUND_GEN !== 'false', // Default: true
    };
  }

  /**
   * Main auto-launch pipeline that detects existing games and selects the most appropriate one
   */
  async selectGameForLaunch(): Promise<GameLaunchResult> {
    try {
      // Try to find an existing game
      const existingGame = await this.detectExistingGames();
      
      if (existingGame) {
        // Validate the existing game state
        const isValid = await this.validateGameState(existingGame);
        
        if (isValid) {
          if (this.launchConfiguration.showLaunchMessages) {
            console.log('Loading Shadow Kingdom...');
            console.log(`Resuming game (Last played: ${existingGame.updatedAt.toLocaleDateString()})`);
          }
          
          // Update play timestamp if configured
          if (this.launchConfiguration.updatePlayTimestamps) {
            await this.updateGameTimestamp(existingGame);
          }
          
          return { game: existingGame, isNewGame: false };
        } else {
          if (this.launchConfiguration.showLaunchMessages) {
            console.log('Previous game state corrupted. Creating new adventure...');
          }
        }
      }
      
      // Create new game if no valid existing game found
      if (this.launchConfiguration.autoCreateGame) {
        if (this.launchConfiguration.showLaunchMessages && !existingGame) {
          console.log('Initializing Shadow Kingdom...');
          console.log('Creating new adventure...');
        }
        
        const newGame = await this.createNewGame();
        return { game: newGame, isNewGame: true };
      } else {
        throw new Error('No valid game found and auto-creation is disabled');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to launch game: ${errorMessage}`);
    }
  }

  /**
   * Detect existing games in the database, ordered by most recent activity
   */
  async detectExistingGames(): Promise<Game | null> {
    try {
      const mostRecentGame = await this.prismaService.client.game.findFirst({
        orderBy: { updatedAt: 'desc' },
      });
      
      return mostRecentGame;
    } catch (error) {
      if (error instanceof Error) {
        // Database connection issues
        if (error.message.includes('SQLITE_CANTOPEN') || error.message.includes('ENOENT')) {
          throw new GameEngineError(
            'Database file not found or cannot be opened. Please ensure the database is properly initialized.',
            'DATABASE_NOT_FOUND',
            true
          );
        }
        
        // Database corruption issues
        if (error.message.includes('SQLITE_CORRUPT') || error.message.includes('database disk image is malformed')) {
          throw new GameEngineError(
            'Database corruption detected. Game data may be corrupted.',
            'DATABASE_CORRUPTED',
            true
          );
        }
        
        // Connection timeout or busy database
        if (error.message.includes('SQLITE_BUSY') || error.message.includes('database is locked')) {
          throw new GameEngineError(
            'Database is busy or locked. Please try again in a moment.',
            'DATABASE_BUSY',
            true
          );
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new GameEngineError(`Failed to detect existing games: ${errorMessage}`, 'UNKNOWN_DATABASE_ERROR', false);
    }
  }

  /**
   * Validate that a game has a valid state and can be loaded
   */
  async validateGameState(game: Game): Promise<boolean> {
    try {
      // Check if game has a current room
      if (!game.currentRoomId) {
        return false;
      }
      
      // Verify the current room exists and belongs to this game
      const currentRoom = await this.prismaService.client.room.findFirst({
        where: { 
          id: game.currentRoomId, 
          gameId: game.id 
        },
      });
      
      return currentRoom !== null;
    } catch (error) {
      // If validation fails due to database error, consider game invalid
      return false;
    }
  }

  /**
   * Create a new game with proper initialization
   */
  async createNewGame(): Promise<Game> {
    try {
      // Get the starting room from the seeded world
      const startingRoom = await this.getStartingRoom();
      
      // Create the game record
      const newGame = await this.prismaService.client.game.create({
        data: {
          currentRoomId: startingRoom.id,
          maxRoomsPerGame: 100,
          roomCount: 12, // Default from seeded world
          generationCooldownMs: 10000,
        },
      });
      
      // Initialize game state
      await this.gameStateManager.initializeGame(newGame);
      
      return newGame;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create new game: ${errorMessage}`);
    }
  }

  /**
   * Get the starting room from the seeded world
   */
  async getStartingRoom(): Promise<Room> {
    try {
      const startingRoom = await this.prismaService.client.room.findFirst({
        where: {
          name: 'Grand Entrance Hall', // From our seeded world
        },
        orderBy: { createdAt: 'desc' }, // Get the most recent in case of multiple worlds
      });
      
      if (!startingRoom) {
        throw new Error('No starting room found in database. Please seed the world first.');
      }
      
      return startingRoom;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get starting room: ${errorMessage}`);
    }
  }

  /**
   * Update the game's timestamp to mark it as recently played
   */
  private async updateGameTimestamp(game: Game): Promise<void> {
    try {
      await this.prismaService.client.game.update({
        where: { id: game.id },
        data: { updatedAt: new Date() },
      });
    } catch (error) {
      // Log error but don't fail the launch for timestamp update issues
      console.warn('Failed to update game timestamp:', error);
    }
  }

  /**
   * Get current launch configuration
   */
  getLaunchConfiguration(): LaunchConfiguration {
    return { ...this.launchConfiguration };
  }

  /**
   * Set launch configuration
   */
  setLaunchConfiguration(config: Partial<LaunchConfiguration>): void {
    this.launchConfiguration = { ...this.launchConfiguration, ...config };
  }

  /**
   * Initialize the game engine and prepare for launch
   */
  async initialize(): Promise<void> {
    try {
      // Any initialization logic needed before launch
      if (this.launchConfiguration.showLaunchMessages) {
        console.log('Shadow Kingdom Engine initialized');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize game engine: ${errorMessage}`);
    }
  }

  /**
   * Attempt to recover from various error conditions
   */
  async attemptRecovery(error: GameEngineError): Promise<GameLaunchResult | null> {
    if (!error.recoverable) {
      return null;
    }

    try {
      switch (error.code) {
        case 'DATABASE_NOT_FOUND':
          if (this.launchConfiguration.showLaunchMessages) {
            console.log('Attempting to initialize database...');
          }
          // Try to initialize the database connection
          await this.prismaService.client.$connect();
          return await this.selectGameForLaunch();

        case 'DATABASE_CORRUPTED':
          if (this.launchConfiguration.showLaunchMessages) {
            console.log('Database corruption detected. Creating fresh game...');
          }
          // Skip existing games and create new one
          const freshGame = await this.createNewGame();
          return { game: freshGame, isNewGame: true };

        case 'DATABASE_BUSY':
          if (this.launchConfiguration.showLaunchMessages) {
            console.log('Database busy. Retrying in a moment...');
          }
          // Wait a bit and retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          return await this.selectGameForLaunch();

        default:
          return null;
      }
    } catch (recoveryError) {
      console.warn('Recovery attempt failed:', recoveryError);
      return null;
    }
  }

  /**
   * Safe launch with automatic error recovery
   */
  async safeLaunch(): Promise<GameLaunchResult> {
    try {
      return await this.selectGameForLaunch();
    } catch (error) {
      if (error instanceof GameEngineError && error.recoverable) {
        const recovery = await this.attemptRecovery(error);
        if (recovery) {
          if (this.launchConfiguration.showLaunchMessages) {
            console.log('Recovery successful!');
          }
          return recovery;
        }
      }

      // If recovery failed or error not recoverable, provide fallback
      if (this.launchConfiguration.autoCreateGame) {
        try {
          if (this.launchConfiguration.showLaunchMessages) {
            console.log('Creating emergency fallback game...');
          }
          const fallbackGame = await this.createNewGame();
          return { game: fallbackGame, isNewGame: true };
        } catch (fallbackError) {
          throw new GameEngineError(
            'All recovery attempts failed. Cannot launch game.',
            'TOTAL_FAILURE',
            false
          );
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Shutdown the game engine and cleanup resources
   */
  async shutdown(): Promise<void> {
    try {
      await this.prismaService.disconnect();
    } catch (error) {
      console.warn('Error during game engine shutdown:', error);
    }
  }
}