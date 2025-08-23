import Database from '../utils/database';
import { GameContext } from '../nlp/types';
import { TUIInterface } from '../ui/TUIInterface';
import { MessageType } from '../ui/MessageFormatter';


export interface GameState {
  id: number;
  game_id: number;
  current_room_id: number;
  character_id: number | null;
  player_name: string | null; // legacy field
}

export interface Room {
  id: number;
  game_id: number;
  name: string;
  description: string;
}

export interface Connection {
  id: number;
  game_id: number;
  from_room_id: number;
  to_room_id: number | null;  // Changed: nullable for unfilled connections
  direction: string;
  name: string;
  locked?: boolean;  // Optional for backward compatibility
  required_key_name?: string;  // Optional for backward compatibility
}

export interface UnfilledConnection extends Connection {
  to_room_id: null;  // Type narrowing for unfilled connections
}

export interface FilledConnection extends Connection {
  to_room_id: number;  // Type narrowing for filled connections
}

export interface Game {
  id: number;
  name: string;
  created_at: string;
  last_played_at: string;
}

export interface GameSession {
  gameId: number;
  roomId: number;
}

export interface GameStateManagerOptions {
  enableDebugLogging?: boolean;
}

/**
 * GameStateManager handles all game state persistence and session management.
 * Provides a clean interface for tracking current game, room, and mode.
 */
export class GameStateManager {
  private db: Database;
  private currentGameId: number | null = null;
  private currentRoomId: number | null = null;
  private recentCommands: string[] = [];
  private options: GameStateManagerOptions;
  private tui?: TUIInterface;

  constructor(db: Database, options: GameStateManagerOptions = {}, tui?: TUIInterface) {
    this.db = db;
    this.tui = tui;
    this.options = {
      enableDebugLogging: false,
      ...options
    };
  }

  /**
   * Get current session information
   */
  getCurrentSession(): { gameId: number | null; roomId: number | null } {
    return {
      gameId: this.currentGameId,
      roomId: this.currentRoomId
    };
  }

  /**
   * Check if currently in a game session
   */
  isInGame(): boolean {
    return this.currentGameId !== null && this.currentRoomId !== null;
  }

  /**
   * Get current room ID
   */
  getCurrentRoomId(): number | null {
    return this.currentRoomId;
  }

  /**
   * Start a new game session
   */
  async startGameSession(gameId: number): Promise<void> {
    try {
      // Get the current room for this game
      const gameState = await this.db.get<GameState>(
        'SELECT current_room_id FROM game_state WHERE game_id = ?',
        [gameId]
      );

      if (!gameState) {
        throw new Error(`No game state found for game ID ${gameId}`);
      }

      this.currentGameId = gameId;
      this.currentRoomId = gameState.current_room_id;

      if (this.isDebugEnabled()) {
        if (this.tui) {
          this.tui.display(`🎮 Started game session: Game ${gameId}, Room ${this.currentRoomId}`, MessageType.SYSTEM);
        } else {
          console.log(`🎮 Started game session: Game ${gameId}, Room ${this.currentRoomId}`);
        }
      }
    } catch (error) {
      console.error('Failed to start game session:', error);
      throw error;
    }
  }

  /**
   * End current game session
   */
  async endGameSession(): Promise<void> {
    if (this.currentGameId && this.currentRoomId) {
      await this.saveGameState();
    }

    this.currentGameId = null;
    this.currentRoomId = null;
    this.recentCommands = [];

    if (this.isDebugEnabled()) {
      console.log('🏠 Ended game session');
    }
  }

  /**
   * Move to a different room
   */
  async moveToRoom(roomId: number): Promise<void> {
    if (!this.isInGame()) {
      throw new Error('Cannot move rooms: not in game session');
    }

    this.currentRoomId = roomId;
    await this.saveGameState();

    if (this.isDebugEnabled()) {
      console.log(`🚪 Moved to room ${roomId}`);
    }
  }

  /**
   * Save current game state to database
   */
  async saveGameState(): Promise<void> {
    if (!this.currentGameId || !this.currentRoomId) {
      if (this.isDebugEnabled()) {
        console.log('⚠️  Cannot save game state: no active session');
      }
      return;
    }

    try {
      // Update current room in game state
      await this.db.run(
        'UPDATE game_state SET current_room_id = ? WHERE game_id = ?',
        [this.currentRoomId, this.currentGameId]
      );
      
      // Update last played timestamp
      await this.db.run(
        'UPDATE games SET last_played_at = ? WHERE id = ?',
        [new Date().toISOString(), this.currentGameId]
      );

      if (this.isDebugEnabled()) {
        console.log(`💾 Saved game state: Game ${this.currentGameId}, Room ${this.currentRoomId}`);
      }
    } catch (error) {
      console.error('Failed to save game state:', error);
      throw error;
    }
  }

  /**
   * Get current room information
   */
  async getCurrentRoom(): Promise<Room | null> {
    if (!this.isInGame()) {
      return null;
    }

    try {
      const room = await this.db.get<Room>(
        'SELECT id, game_id, name, description FROM rooms WHERE id = ? AND game_id = ?',
        [this.currentRoomId, this.currentGameId]
      );

      return room || null;
    } catch (error) {
      console.error('Failed to get current room:', error);
      return null;
    }
  }

  /**
   * Get connections for current room (all connections including unfilled ones for exploration)
   */
  async getCurrentRoomConnections(): Promise<Connection[]> {
    if (!this.isInGame()) {
      return [];
    }

    try {
      const connections = await this.db.all<Connection>(
        'SELECT * FROM connections WHERE from_room_id = ? AND game_id = ? ORDER BY direction',
        [this.currentRoomId, this.currentGameId]
      );

      return connections || [];
    } catch (error) {
      console.error('Failed to get room connections:', error);
      return [];
    }
  }

  /**
   * Find connection by direction or thematic name (includes unfilled connections)
   */
  async findConnection(directionOrName: string): Promise<Connection | null> {
    if (!this.isInGame()) {
      return null;
    }

    try {
      // Try exact match first (case-insensitive) - includes unfilled connections
      const connection = await this.db.get<Connection>(
        'SELECT * FROM connections WHERE from_room_id = ? AND game_id = ? AND (LOWER(direction) = LOWER(?) OR LOWER(name) = LOWER(?))',
        [this.currentRoomId, this.currentGameId, directionOrName, directionOrName]
      );

      return connection || null;
    } catch (error) {
      console.error('Failed to find connection:', error);
      return null;
    }
  }

  /**
   * Add recent command to history
   */
  addRecentCommand(command: string): void {
    this.recentCommands.unshift(command);
    if (this.recentCommands.length > 5) {
      this.recentCommands.pop();
    }
  }

  /**
   * Get recent commands
   */
  getRecentCommands(): string[] {
    return [...this.recentCommands];
  }

  /**
   * Build game context for NLP processing
   */
  async buildGameContext(): Promise<GameContext> {
    const context: GameContext = {
      recentCommands: [...this.recentCommands]
    };

    // Add current room context if in a game session
    if (this.isInGame()) {
      try {
        const room = await this.getCurrentRoom();
        
        if (room) {
          // Get available exits
          const connections = await this.getCurrentRoomConnections();
          const availableExits = connections.map(c => c.direction);
          const thematicExits = connections.map(c => ({direction: c.direction, name: c.name}));

          context.currentRoom = {
            id: room.id,
            name: room.name,
            description: room.description,
            availableExits,
            thematicExits
          };
          
          context.gameId = this.currentGameId!;
        }
      } catch (error) {
        if (this.isDebugEnabled()) {
          console.error('Failed to build game context:', error);
        }
      }
    }

    return context;
  }

  /**
   * Get game information by ID
   */
  async getGame(gameId: number): Promise<Game | null> {
    try {
      const game = await this.db.get<Game>(
        'SELECT * FROM games WHERE id = ?',
        [gameId]
      );

      return game || null;
    } catch (error) {
      console.error('Failed to get game:', error);
      return null;
    }
  }

  /**
   * Get all games
   */
  async getAllGames(): Promise<Game[]> {
    try {
      const games = await this.db.all<Game>(
        'SELECT * FROM games ORDER BY last_played_at DESC'
      );

      return games || [];
    } catch (error) {
      console.error('Failed to get games:', error);
      return [];
    }
  }

  /**
   * Get game state from database
   */
  async getGameState(gameId: number): Promise<GameState | null> {
    try {
      const gameState = await this.db.get<GameState>(
        'SELECT * FROM game_state WHERE game_id = ?',
        [gameId]
      );

      return gameState || null;
    } catch (error) {
      console.error('Failed to get game state:', error);
      return null;
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats(): {
    currentGameId: number | null;
    currentRoomId: number | null;
    recentCommandCount: number;
    isInActiveSession: boolean;
  } {
    return {
      currentGameId: this.currentGameId,
      currentRoomId: this.currentRoomId,
      recentCommandCount: this.recentCommands.length,
      isInActiveSession: this.isInGame()
    };
  }

  /**
   * Check if debug logging is enabled
   */
  private isDebugEnabled(): boolean {
    return this.options.enableDebugLogging || process.env.AI_DEBUG_LOGGING === 'true';
  }

  /**
   * Update manager options
   */
  updateOptions(options: Partial<GameStateManagerOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Reset session state (useful for testing)
   */
  resetSession(): void {
    this.currentGameId = null;
    this.currentRoomId = null;
    this.recentCommands = [];
  }
}