import Database from '../utils/database';
import { initializeDatabase, createGameWithRooms, createGameAutomatic } from '../utils/initDb';
import { Game } from './gameStateManager';
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
 * GameManagementService handles game CRUD operations and user interactions for game management.
 * Responsible for creating, loading, listing, and deleting games with proper user validation.
 */
export class GameManagementService {
  private options: GameManagementOptions;

  constructor(
    private db: Database,
    private tui: TUIInterface,
    options: GameManagementOptions = {}
  ) {
    this.options = {
      enableDebugLogging: false,
      ...options
    };
  }

  /**
   * Create a new game automatically - no user input required
   */
  async createNewGame(): Promise<{ success: boolean; gameId?: number; gameName?: string; error?: string }> {
    try {
      await initializeDatabase(this.db, this.tui);
      
      // Create game with automatic timestamp name
      const gameId = await createGameAutomatic(this.db, this.tui);
      const game = await this.getGameById(gameId);
      
      return { success: true, gameId, gameName: game?.name };
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
      const games = await this.db.all<Game>(
        'SELECT id, name, created_at, last_played_at FROM games ORDER BY last_played_at DESC'
      );
      return games || [];
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
      await initializeDatabase(this.db, this.tui);
      
      // Create game with automatic timestamp name
      const gameId = await createGameAutomatic(this.db, this.tui);
      const game = await this.getGameById(gameId);
      
      return { success: true, game: game || undefined };
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
      // Create new game with rooms
      const gameId = await createGameWithRooms(this.db, gameName.trim(), this.tui);
      const game = await this.getGameById(gameId);
      
      if (!game) {
        return { success: false, error: 'Failed to retrieve created game' };
      }
      
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
   * Delete a game with user confirmation
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
      // Delete related data manually (since foreign keys might not be enabled)
      await this.db.run('DELETE FROM connections WHERE game_id = ?', [gameId]);
      await this.db.run('DELETE FROM game_state WHERE game_id = ?', [gameId]);
      await this.db.run('DELETE FROM rooms WHERE game_id = ?', [gameId]);
      
      // Finally delete the game
      await this.db.run('DELETE FROM games WHERE id = ?', [gameId]);
      
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
      const game = await this.db.get<Game>(
        'SELECT id, name, created_at, last_played_at FROM games WHERE id = ?',
        [gameId]
      );
      return game || null;
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
      await this.db.run(
        'UPDATE games SET last_played_at = datetime(\'now\') WHERE id = ?',
        [gameId]
      );
      return true;
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to update last played:', error);
      }
      return false;
    }
  }

  /**
   * Check if a game name exists
   */
  async gameNameExists(name: string): Promise<boolean> {
    try {
      const game = await this.db.get<Game>(
        'SELECT id FROM games WHERE name = ?',
        [name.trim()]
      );
      return !!game;
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Failed to check game name:', error);
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
   * Get game management statistics
   */
  async getGameStats(): Promise<{ totalGames: number; recentGames: number; oldestGame?: string }> {
    try {
      const totalResult = await this.db.get('SELECT COUNT(*) as count FROM games');
      const totalGames = totalResult?.count || 0;

      const recentResult = await this.db.get(
        'SELECT COUNT(*) as count FROM games WHERE last_played_at > datetime(\'now\', \'-7 days\')'
      );
      const recentGames = recentResult?.count || 0;

      let oldestGame: string | undefined;
      if (totalGames > 0) {
        const oldestResult = await this.db.get<Game>(
          'SELECT name, created_at FROM games ORDER BY created_at ASC LIMIT 1'
        );
        if (oldestResult) {
          oldestGame = `${oldestResult.name} (${this.formatTimestamp(oldestResult.created_at)})`;
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