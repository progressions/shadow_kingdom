import { PrismaClient } from '../generated/prisma';
import { getPrismaClient } from './prismaService';
import { initializeDatabase, createGameWithRooms, createGameAutomatic } from '../utils/initDb';
import { Game } from './gameStateManager';
import { typeMappers } from '../types/database';
import { TUIInterface } from '../ui/TUIInterface';
import { MessageType } from '../ui/MessageFormatter';

export interface GameManagementOptions {
  enableDebugLogging?: boolean;
}

export interface GameListItem {
  id: number;
  name: string;
  created_at: string;
  last_played_at: string;
  displayText: string;
}

/**
 * GameManagementService (Prisma version) - handles game CRUD operations with Prisma ORM
 * 
 * This is the migrated version using Prisma instead of raw SQL.
 * Provides type safety, better performance, and cleaner code.
 */
export class GameManagementServicePrisma {
  private options: GameManagementOptions;
  private prisma: PrismaClient;

  constructor(
    private tui: TUIInterface,
    options: GameManagementOptions = {}
  ) {
    this.options = {
      enableDebugLogging: false,
      ...options
    };
    this.prisma = getPrismaClient();
  }

  /**
   * Create a new game automatically with timestamp name - no user input required
   */
  async createNewGame(): Promise<{ success: boolean; gameId?: number; gameName?: string; error?: string }> {
    try {
      // Generate timestamp-based name
      const now = new Date();
      const gameName = now.toISOString().replace('T', ' ').split('.')[0]; // Format: "2025-01-20 14:32:05"

      // Create new game with Prisma transaction
      const newGame = await this.prisma.$transaction(async (tx) => {
        // Create the game
        const game = await tx.game.create({
          data: {
            name: gameName
          }
        });

        // Create initial region
        const region = await tx.region.create({
          data: {
            gameId: game.id,
            name: 'Shadow Kingdom Manor',
            type: 'mansion',
            description: 'A grand manor estate shrouded in mystery, filled with elegant halls, ancient libraries, and moonlit gardens where forgotten secrets await discovery.'
          }
        });

        // Create starter rooms
        const entranceHall = await tx.room.create({
          data: {
            gameId: game.id,
            name: 'Grand Entrance Hall',
            description: 'You stand in a magnificent entrance hall that speaks of forgotten grandeur. Towering marble columns stretch up to a vaulted ceiling painted with faded celestial murals, their gold leaf catching the light that filters through tall, arched windows.',
            regionId: region.id,
            regionDistance: 0
          }
        });

        const library = await tx.room.create({
          data: {
            gameId: game.id,
            name: 'Scholar\'s Library',
            description: 'You enter a vast library that seems to hold the weight of countless ages. Floor-to-ceiling bookshelves carved from dark oak stretch into the shadows above, filled with leather-bound tomes.',
            regionId: region.id,
            regionDistance: 1
          }
        });

        const garden = await tx.room.create({
          data: {
            gameId: game.id,
            name: 'Moonlit Courtyard Garden',
            description: 'You step into an enchanted courtyard garden where nature has reclaimed its ancient dominion. Weathered stone paths wind between overgrown flowerbeds.',
            regionId: region.id,
            regionDistance: 1
          }
        });

        // Create connections between rooms
        await tx.connection.createMany({
          data: [
            // Entrance to Library
            {
              gameId: game.id,
              fromRoomId: entranceHall.id,
              toRoomId: library.id,
              direction: 'north',
              name: 'through the ornate archway beneath celestial murals',
              processing: false
            },
            // Library back to Entrance
            {
              gameId: game.id,
              fromRoomId: library.id,
              toRoomId: entranceHall.id,
              direction: 'south',
              name: 'through the shadowed archway to the grand hall',
              processing: false
            },
            // Entrance to Garden
            {
              gameId: game.id,
              fromRoomId: entranceHall.id,
              toRoomId: garden.id,
              direction: 'east',
              name: 'through the glass doors that shimmer with moonlight',
              processing: false
            },
            // Garden back to Entrance
            {
              gameId: game.id,
              fromRoomId: garden.id,
              toRoomId: entranceHall.id,
              direction: 'west',
              name: 'through the crystal doors back to the marble hall',
              processing: false
            },
            // Unfilled connections for expansion
            {
              gameId: game.id,
              fromRoomId: library.id,
              toRoomId: null,
              direction: 'west',
              name: 'through the hidden door behind dusty tomes',
              processing: false
            },
            {
              gameId: game.id,
              fromRoomId: garden.id,
              toRoomId: null,
              direction: 'up',
              name: 'up the celestial pathway to the stars',
              processing: false
            }
          ]
        });

        // Create initial game state
        await tx.gameState.create({
          data: {
            gameId: game.id,
            currentRoomId: entranceHall.id
          }
        });

        return game;
      });

      return { success: true, gameId: newGame.id, gameName: newGame.name };
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to create new game:', error);
      }
      return { success: false, error: 'Failed to create new game' };
    }
  }

  /**
   * Get all games ordered by last played
   */
  async getAllGames(): Promise<Game[]> {
    try {
      const prismaGames = await this.prisma.game.findMany({
        orderBy: { lastPlayedAt: 'desc' },
        select: {
          id: true,
          name: true,
          createdAt: true,
          lastPlayedAt: true
        }
      });

      // Convert to legacy Game interface
      return prismaGames.map(game => typeMappers.fromPrismaGame(game));
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to get games:', error);
      }
      return [];
    }
  }

  /**
   * Get the most recently played game
   */
  async getMostRecentGame(): Promise<Game | null> {
    try {
      const games = await this.getAllGames();
      return games.length > 0 ? games[0] : null;
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to get most recent game:', error);
      }
      return null;
    }
  }

  /**
   * Generate a creative game name
   */
  generateGameName(): string {
    const adjectives = ['Shadow', 'Mystic', 'Ancient', 'Epic', 'Dark', 'Forgotten'];
    const nouns = ['Adventure', 'Quest', 'Journey', 'Kingdom', 'Realm', 'Legacy'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj} ${noun}`;
  }

  /**
   * Create a new game automatically with timestamp name - no user input required
   */
  async createGameAutomatic(): Promise<{success: boolean; game?: Game; error?: string}> {
    try {
      // Generate timestamp-based name
      const now = new Date();
      const gameName = now.toISOString().replace('T', ' ').split('.')[0]; // Format: "2025-01-20 14:32:05"
      
      return await this.createGameWithName(gameName);
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to create automatic game:', error);
      }
      return { success: false, error: 'Failed to create new game automatically' };
    }
  }

  /**
   * Create game with specific name (internal helper)
   */
  async createGameWithName(gameName: string): Promise<{success: boolean; game?: Game; error?: string}> {
    try {
      // Create new game with Prisma transaction
      const newGame = await this.prisma.$transaction(async (tx) => {
        // Create the game
        const game = await tx.game.create({
          data: {
            name: gameName.trim()
          }
        });

        // Create initial region
        const region = await tx.region.create({
          data: {
            gameId: game.id,
            name: 'Shadow Kingdom Manor',
            type: 'mansion',
            description: 'A grand manor estate shrouded in mystery, filled with elegant halls, ancient libraries, and moonlit gardens where forgotten secrets await discovery.'
          }
        });

        // Create starter rooms (simplified for automatic creation)
        const entranceHall = await tx.room.create({
          data: {
            gameId: game.id,
            name: 'Grand Entrance Hall',
            description: 'You stand in a magnificent entrance hall that speaks of forgotten grandeur. Towering marble columns stretch up to a vaulted ceiling painted with faded celestial murals.',
            regionId: region.id,
            regionDistance: 0
          }
        });

        // Create initial game state
        await tx.gameState.create({
          data: {
            gameId: game.id,
            currentRoomId: entranceHall.id
          }
        });

        return game;
      });

      // Convert Prisma game to legacy Game interface
      const game: Game = typeMappers.fromPrismaGame(newGame);
      return { success: true, game };

    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to create game with name:', gameName, error);
      }
      return { success: false, error: 'Failed to create new game' };
    }
  }

  /**
   * Present game selection UI and return selected game
   */
  async selectGameFromList(purpose: 'load' | 'delete'): Promise<{ success: boolean; game?: Game; cancelled?: boolean; error?: string }> {
    try {
      const games = await this.getAllGames();

      if (!games || games.length === 0) {
        const message = purpose === 'load' ? 'No saved games found. Create a new game first.' : 'No saved games found to delete.';
        return { success: false, error: message };
      }

      const actionText = purpose === 'load' ? 'load' : 'delete';
      this.tui.display(`Select a game to ${actionText}:`, MessageType.SYSTEM);
      games.forEach((game, index) => {
        const lastPlayed = this.formatTimestamp(game.last_played_at);
        this.tui.display(`${index + 1}. ${game.name} (Last played: ${lastPlayed})`, MessageType.NORMAL);
      });
      this.tui.display('0. Cancel', MessageType.NORMAL);

      const choice = await this.promptForInput('Enter your choice: ');
      const choiceNum = parseInt(choice);

      if (isNaN(choiceNum) || choiceNum < 0 || choiceNum > games.length) {
        return { success: false, error: 'Invalid choice' };
      }

      if (choiceNum === 0) {
        return { success: true, cancelled: true };
      }

      const selectedGame = games[choiceNum - 1];
      return { success: true, game: selectedGame };

    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error(`Failed to select game for ${purpose}:`, error);
      }
      return { success: false, error: `Failed to select game for ${purpose}` };
    }
  }

  /**
   * Delete a game with user confirmation (using Prisma cascade)
   */
  async deleteGameWithConfirmation(game: Game): Promise<{ success: boolean; error?: string }> {
    try {
      // Confirm deletion
      this.tui.display(`Are you sure you want to delete "${game.name}"?`, MessageType.ERROR);
      this.tui.display('This action cannot be undone.', MessageType.ERROR);
      const confirm = await this.promptForInput('Type "yes" to confirm: ');

      if (confirm.toLowerCase() !== 'yes') {
        return { success: false, error: 'Deletion cancelled' };
      }

      return await this.deleteGameById(game.id);

    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to delete game with confirmation:', error);
      }
      return { success: false, error: 'Failed to delete game' };
    }
  }

  /**
   * Delete game by ID (without confirmation prompt)
   */
  async deleteGameById(gameId: number): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete game - Prisma will handle cascade deletion automatically
      await this.prisma.game.delete({
        where: { id: gameId }
      });
      
      return { success: true };

    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to delete game:', error);
      }
      return { success: false, error: 'Failed to delete game' };
    }
  }

  /**
   * Get a specific game by ID
   */
  async getGameById(gameId: number): Promise<Game | null> {
    try {
      const prismaGame = await this.prisma.game.findUnique({
        where: { id: gameId },
        select: {
          id: true,
          name: true,
          createdAt: true,
          lastPlayedAt: true
        }
      });

      return prismaGame ? typeMappers.fromPrismaGame(prismaGame) : null;
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to get game by ID:', error);
      }
      return null;
    }
  }

  /**
   * Update last played timestamp for a game
   */
  async updateLastPlayed(gameId: number): Promise<boolean> {
    try {
      await this.prisma.game.update({
        where: { id: gameId },
        data: { lastPlayedAt: new Date() }
      });
      return true;
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to update last played:', error);
      }
      return false;
    }
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Get game management statistics using Prisma aggregations
   */
  async getGameStats(): Promise<{ totalGames: number; recentGames: number; oldestGame?: string }> {
    try {
      // Use Prisma aggregations for better performance
      const totalGames = await this.prisma.game.count();

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentGames = await this.prisma.game.count({
        where: {
          lastPlayedAt: {
            gte: sevenDaysAgo
          }
        }
      });

      let oldestGame: string | undefined;
      if (totalGames > 0) {
        const oldestResult = await this.prisma.game.findFirst({
          orderBy: { createdAt: 'asc' },
          select: { name: true, createdAt: true }
        });
        
        if (oldestResult) {
          oldestGame = `${oldestResult.name} (${this.formatTimestamp(oldestResult.createdAt.toISOString())})`;
        }
      }

      return { totalGames, recentGames, oldestGame };
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to get game stats:', error);
      }
      return { totalGames: 0, recentGames: 0 };
    }
  }

  /**
   * Prompt user for input
   */
  private async promptForInput(promptText: string): Promise<string> {
    this.tui.display(promptText, MessageType.SYSTEM);
    return await this.tui.getInput();
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
  updateOptions(options: Partial<GameManagementOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current service configuration
   */
  getOptions(): GameManagementOptions {
    return { ...this.options };
  }
}