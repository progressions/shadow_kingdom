import { PrismaService } from './prismaService';
import { Game, Room } from '@prisma/client';

export interface GameSession {
  gameId: number;
  currentRoomId: number;
  currentRoom: Room;
  lastSaved: Date;
  sessionStartTime: Date;
}

export interface GameStateManagerError extends Error {
  code: string;
  recoverable: boolean;
}

export class GameStateManagerError extends Error implements GameStateManagerError {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'GameStateManagerError';
  }
}

export class GameStateManager {
  private currentSession: GameSession | null = null;
  private autoSaveEnabled: boolean = true;
  private saveInterval: NodeJS.Timeout | null = null;

  constructor(private readonly prismaService: PrismaService) {
    // Setup auto-save if enabled
    if (this.autoSaveEnabled) {
      this.setupAutoSave();
    }
  }

  /**
   * Initialize a game session with automatic state persistence
   */
  async initializeGame(game: Game): Promise<void> {
    try {
      if (!game.currentRoomId) {
        throw new GameStateManagerError('Game has no current room set', 'INVALID_GAME_STATE', false);
      }

      const currentRoom = await this.prismaService.client.room.findUnique({
        where: { id: game.currentRoomId },
      });

      if (!currentRoom) {
        throw new GameStateManagerError(`Current room ${game.currentRoomId} not found`, 'ROOM_NOT_FOUND', true);
      }

      const now = new Date();
      this.currentSession = {
        gameId: game.id,
        currentRoomId: game.currentRoomId,
        currentRoom,
        lastSaved: now,
        sessionStartTime: now,
      };

      // Mark the starting room as visited
      await this.markRoomVisited(currentRoom.id);

      // Perform initial save to ensure session is persisted
      await this.saveGameState();

    } catch (error) {
      if (error instanceof GameStateManagerError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new GameStateManagerError(`Failed to initialize game: ${errorMessage}`, 'INITIALIZATION_FAILED', false);
    }
  }

  /**
   * Get the current room
   */
  getCurrentRoom(): Room | null {
    return this.currentSession?.currentRoom || null;
  }

  /**
   * Set the current room and update the game state with automatic persistence
   */
  async setCurrentRoom(roomId: number): Promise<Room> {
    try {
      if (!this.currentSession) {
        throw new GameStateManagerError('No active game session', 'NO_ACTIVE_SESSION', false);
      }

      // Get the new room
      const newRoom = await this.prismaService.client.room.findUnique({
        where: { id: roomId },
      });

      if (!newRoom) {
        throw new GameStateManagerError(`Room ${roomId} not found`, 'ROOM_NOT_FOUND', true);
      }

      if (newRoom.gameId !== this.currentSession.gameId) {
        throw new GameStateManagerError(
          `Room ${roomId} does not belong to current game ${this.currentSession.gameId}`, 
          'ROOM_GAME_MISMATCH', 
          false
        );
      }

      // Update game record with timestamp
      const now = new Date();
      await this.prismaService.client.game.update({
        where: { id: this.currentSession.gameId },
        data: { 
          currentRoomId: roomId,
          updatedAt: now,
        },
      });

      // Mark room as visited
      await this.markRoomVisited(roomId);

      // Update session
      this.currentSession.currentRoomId = roomId;
      this.currentSession.currentRoom = newRoom;
      this.currentSession.lastSaved = now;

      // Trigger immediate save after room change
      await this.saveGameState();

      return newRoom;
    } catch (error) {
      if (error instanceof GameStateManagerError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new GameStateManagerError(`Failed to set current room: ${errorMessage}`, 'ROOM_TRANSITION_FAILED', true);
    }
  }

  /**
   * Mark a room as visited
   */
  private async markRoomVisited(roomId: number): Promise<void> {
    try {
      await this.prismaService.client.room.update({
        where: { id: roomId },
        data: { visited: true },
      });
    } catch (error) {
      // Log error but don't fail the operation
      console.warn(`Failed to mark room ${roomId} as visited:`, error);
    }
  }

  /**
   * Get current session info
   */
  getCurrentSession(): GameSession | null {
    return this.currentSession;
  }

  /**
   * Check if there's an active session
   */
  hasActiveSession(): boolean {
    return this.currentSession !== null;
  }

  /**
   * Clear the current session
   */
  clearSession(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
    this.currentSession = null;
  }

  /**
   * Setup automatic state persistence
   */
  private setupAutoSave(): void {
    // Auto-save every 30 seconds
    this.saveInterval = setInterval(async () => {
      if (this.currentSession) {
        try {
          await this.saveGameState();
        } catch (error) {
          console.warn('Auto-save failed:', error);
        }
      }
    }, 30000);
  }

  /**
   * Save current game state to database
   */
  async saveGameState(): Promise<void> {
    try {
      if (!this.currentSession) {
        return;
      }

      const now = new Date();
      await this.prismaService.client.game.update({
        where: { id: this.currentSession.gameId },
        data: {
          currentRoomId: this.currentSession.currentRoomId,
          updatedAt: now,
        },
      });

      this.currentSession.lastSaved = now;
    } catch (error) {
      throw new GameStateManagerError(
        `Failed to save game state: ${error instanceof Error ? error.message : String(error)}`,
        'SAVE_FAILED',
        true
      );
    }
  }

  /**
   * Restore session from database game state
   */
  async restoreSession(game: Game): Promise<GameSession> {
    try {
      // Clear any existing session
      this.clearSession();

      // Initialize the game session (this will load the room and set up persistence)
      await this.initializeGame(game);

      if (!this.currentSession) {
        throw new GameStateManagerError('Failed to create session after restoration', 'RESTORATION_FAILED', false);
      }

      return this.currentSession;
    } catch (error) {
      if (error instanceof GameStateManagerError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new GameStateManagerError(`Failed to restore session: ${errorMessage}`, 'SESSION_RESTORATION_FAILED', true);
    }
  }

  /**
   * Force save game state immediately
   */
  async forceSave(): Promise<void> {
    await this.saveGameState();
  }

  /**
   * Get session statistics
   */
  getSessionStats(): { 
    sessionDuration: number; 
    lastSaved: Date | null; 
    autoSaveEnabled: boolean;
  } | null {
    if (!this.currentSession) {
      return null;
    }

    return {
      sessionDuration: Date.now() - this.currentSession.sessionStartTime.getTime(),
      lastSaved: this.currentSession.lastSaved,
      autoSaveEnabled: this.autoSaveEnabled,
    };
  }

  /**
   * Enable or disable auto-save
   */
  setAutoSave(enabled: boolean): void {
    this.autoSaveEnabled = enabled;
    
    if (enabled && !this.saveInterval) {
      this.setupAutoSave();
    } else if (!enabled && this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
  }

  /**
   * Validate current session state consistency
   */
  async validateSession(): Promise<boolean> {
    try {
      if (!this.currentSession) {
        return false;
      }

      // Check if current room still exists and belongs to the game
      const currentRoom = await this.prismaService.client.room.findUnique({
        where: { id: this.currentSession.currentRoomId },
      });

      if (!currentRoom || currentRoom.gameId !== this.currentSession.gameId) {
        return false;
      }

      // Check if game still exists
      const game = await this.prismaService.client.game.findUnique({
        where: { id: this.currentSession.gameId },
      });

      return game !== null && game.currentRoomId === this.currentSession.currentRoomId;
    } catch (error) {
      console.warn('Session validation failed:', error);
      return false;
    }
  }

  /**
   * Shutdown the state manager and perform final save
   */
  async shutdown(): Promise<void> {
    try {
      // Perform final save
      if (this.currentSession) {
        await this.forceSave();
      }

      // Clear auto-save interval
      if (this.saveInterval) {
        clearInterval(this.saveInterval);
        this.saveInterval = null;
      }

      // Clear session
      this.currentSession = null;
    } catch (error) {
      console.warn('Error during GameStateManager shutdown:', error);
    }
  }
}