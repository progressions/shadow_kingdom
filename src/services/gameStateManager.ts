import { PrismaService } from './prismaService';
import { Game, Room } from '@prisma/client';

export interface GameSession {
  gameId: number;
  currentRoomId: number;
  currentRoom: Room;
  lastSaved: Date;
  sessionStartTime: Date;
  movementHistory: MovementHistoryEntry[];
}

export interface MovementHistoryEntry {
  fromRoomId: number;
  toRoomId: number;
  direction: string;
  timestamp: Date;
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
  private readonly maxHistorySize: number = 50;
  private roomCache: Map<number, { room: Room; cachedAt: Date }> = new Map();
  private readonly cacheExpiry: number = 5 * 60 * 1000; // 5 minutes

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
        movementHistory: [],
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
   * Get formatted information about the current room including exits and contents
   */
  async getCurrentRoomInfo(): Promise<string> {
    try {
      if (!this.currentSession) {
        return 'No active game session. Please start or load a game.';
      }

      const room = this.currentSession.currentRoom;
      if (!room) {
        return 'No current room. Please start or load a game.';
      }
      
      let display = '';

      // Room name
      display += `\n${room.name}\n`;
      display += '='.repeat(room.name?.length || 0) + '\n\n';

      // Room description
      display += `${room.description}\n`;

      // Extended description if room has been visited and has one
      if (room.visited && room.extendedDescription) {
        display += `\n${room.extendedDescription}\n`;
      }

      // Get available exits
      const connections = await this.prismaService.client.connection.findMany({
        where: { 
          fromRoomId: room.id,
          gameId: this.currentSession.gameId
        },
        orderBy: { direction: 'asc' }
      });

      // Format exits
      display += '\n';
      if (connections.length > 0) {
        const exitList = connections.map(conn => {
          let exitStr = conn.direction;
          if (conn.locked) {
            exitStr += ' (locked';
            if (conn.description) {
              exitStr += `, ${conn.description}`;
            }
            exitStr += ')';
          } else if (conn.description) {
            exitStr += ` (${conn.description})`;
          }
          return exitStr;
        }).join(', ');
        
        display += `Exits: ${exitList}\n`;
      } else {
        display += 'There are no obvious exits.\n';
      }

      // Get items in the room
      const items = await this.prismaService.client.item.findMany({
        where: { 
          roomId: room.id,
          gameId: this.currentSession.gameId
        }
      });

      if (items.length > 0) {
        display += '\nYou can see:\n';
        items.forEach(item => {
          const article = this.getArticle(item.name);
          display += `  ${article} ${item.name}\n`;
        });
      }

      // Get characters in the room
      const characters = await this.prismaService.client.character.findMany({
        where: { 
          roomId: room.id,
          gameId: this.currentSession.gameId
        }
      });

      if (characters.length > 0) {
        display += '\nAlso here:\n';
        characters.forEach(char => {
          const article = this.getArticle(char.name);
          display += `  ${article} ${char.name}\n`;
        });
      }

      return display;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('getCurrentRoomInfo error:', error);
      return `Error getting room information: ${errorMessage}`;
    }
  }

  /**
   * Get the appropriate article (a/an) for a noun
   */
  private getArticle(noun: string): string {
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    const firstLetter = noun.charAt(0).toLowerCase();
    return vowels.includes(firstLetter) ? 'an' : 'a';
  }

  /**
   * Set the current room and update the game state with automatic persistence
   */
  async setCurrentRoom(roomId: number, direction?: string): Promise<Room> {
    try {
      if (!this.currentSession) {
        throw new GameStateManagerError('No active game session', 'NO_ACTIVE_SESSION', false);
      }

      // Try to get room from cache first
      let newRoom = this.getRoomFromCache(roomId);
      
      if (!newRoom) {
        // Get the new room from database
        newRoom = await this.prismaService.client.room.findUnique({
          where: { id: roomId },
        });
        
        // Add to cache if found
        if (newRoom) {
          this.addRoomToCache(newRoom);
        }
      }

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

      // Track movement history if direction is provided
      if (direction) {
        this.addMovementToHistory({
          fromRoomId: this.currentSession.currentRoomId,
          toRoomId: roomId,
          direction,
          timestamp: now
        });
      }

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
   * Add a movement to the history
   */
  private addMovementToHistory(entry: MovementHistoryEntry): void {
    if (!this.currentSession) {
      return;
    }

    // Add to history
    this.currentSession.movementHistory.push(entry);

    // Trim history if it exceeds max size
    if (this.currentSession.movementHistory.length > this.maxHistorySize) {
      this.currentSession.movementHistory = this.currentSession.movementHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Add a room to the cache
   */
  private addRoomToCache(room: Room): void {
    this.roomCache.set(room.id, {
      room,
      cachedAt: new Date()
    });
    
    // Clean up old entries if cache is getting large
    if (this.roomCache.size > 50) {
      this.cleanupCache();
    }
  }

  /**
   * Get a room from cache if it exists and is not expired
   */
  private getRoomFromCache(roomId: number): Room | null {
    const cached = this.roomCache.get(roomId);
    if (!cached) {
      return null;
    }
    
    // Check if cache entry is expired
    const now = new Date();
    if (now.getTime() - cached.cachedAt.getTime() > this.cacheExpiry) {
      this.roomCache.delete(roomId);
      return null;
    }
    
    return cached.room;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = new Date();
    for (const [roomId, entry] of this.roomCache.entries()) {
      if (now.getTime() - entry.cachedAt.getTime() > this.cacheExpiry) {
        this.roomCache.delete(roomId);
      }
    }
  }

  /**
   * Clear the entire room cache
   */
  clearRoomCache(): void {
    this.roomCache.clear();
  }

  /**
   * Get the movement history
   */
  getMovementHistory(): MovementHistoryEntry[] {
    return this.currentSession?.movementHistory || [];
  }

  /**
   * Get the last N movements
   */
  getRecentMovements(count: number = 10): MovementHistoryEntry[] {
    const history = this.getMovementHistory();
    return history.slice(-count);
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