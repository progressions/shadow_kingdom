import { PrismaService } from './prismaService';
import { Game, Room } from '@prisma/client';

export interface GameSession {
  gameId: number;
  currentRoomId: number;
  currentRoom: Room;
  lastSaved: Date;
  sessionStartTime: Date;
  movementHistory: MovementHistoryEntry[];
  inventory: number[]; // Array of item IDs
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
        throw new GameStateManagerError(
          'Game has no current room set',
          'INVALID_GAME_STATE',
          false
        );
      }

      const currentRoom = await this.prismaService.client.room.findUnique({
        where: { id: game.currentRoomId },
      });

      if (!currentRoom) {
        throw new GameStateManagerError(
          `Current room ${game.currentRoomId} not found`,
          'ROOM_NOT_FOUND',
          true
        );
      }

      // Load inventory - items with null roomId belonging to this game
      const inventoryItems = await this.prismaService.client.item.findMany({
        where: {
          gameId: game.id,
          roomId: null,
        },
      });
      const inventoryIds = inventoryItems.map(item => item.id);

      const now = new Date();
      this.currentSession = {
        gameId: game.id,
        currentRoomId: game.currentRoomId,
        currentRoom,
        lastSaved: now,
        sessionStartTime: now,
        movementHistory: [],
        inventory: inventoryIds,
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
      throw new GameStateManagerError(
        `Failed to initialize game: ${errorMessage}`,
        'INITIALIZATION_FAILED',
        false
      );
    }
  }

  /**
   * Check if there's an active session
   */
  hasActiveSession(): boolean {
    return this.currentSession !== null;
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

      // Get room connections for exits
      const connections = await this.prismaService.client.connection.findMany({
        where: { fromRoomId: room.id },
        include: {
          toRoom: true,
        },
      });

      // Get items in the room (excluding those in player inventory)
      const items = await this.prismaService.client.item.findMany({
        where: {
          roomId: room.id,
          gameId: this.currentSession.gameId,
        },
      });

      // Get characters in the room
      const characters = await this.prismaService.client.character.findMany({
        where: { roomId: room.id },
      });

      // Add items description if any
      if (items.length > 0) {
        display += '\n';
        if (items.length === 1) {
          const article = this.getArticle(items[0].name);
          display += `You can see ${article} ${items[0].name} here.`;
        } else {
          display += 'You can see: ';
          display += items.map(item => `${this.getArticle(item.name)} ${item.name}`).join(', ');
          display += '.';
        }
        display += '\n';
      }

      // Add characters if any
      if (characters.length > 0) {
        display += '\n';
        for (const character of characters) {
          display += `${character.name} is here. ${character.description}\n`;
        }
      }

      // Add exits
      if (connections.length > 0) {
        display += '\nExits: ';
        const exitDescriptions = connections.map(conn => {
          const exitDesc = conn.description || `to ${conn.toRoom?.name || 'somewhere'}`;
          return `${conn.direction} (${exitDesc})`;
        });
        display += exitDescriptions.join(', ');
      } else {
        display += '\nThere are no obvious exits.';
      }

      return display;
    } catch (error) {
      console.error('Error getting room info:', error);
      return `Error getting room information: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Get the appropriate article for a noun
   */
  private getArticle(noun: string): string {
    if (!noun) return 'a';

    // Words that should use "an"
    const vowels = ['a', 'e', 'i', 'o', 'u'];
    const firstLetter = noun.charAt(0).toLowerCase();
    return vowels.includes(firstLetter) ? 'an' : 'a';
  }

  /**
   * Set the current room and update the game state with automatic persistence
   * Overloaded to accept either a Room object or roomId
   */
  async setCurrentRoom(room: Room): Promise<void>;
  async setCurrentRoom(roomId: number, direction?: string): Promise<Room>;
  async setCurrentRoom(roomOrId: Room | number, direction?: string): Promise<Room | void> {
    try {
      if (!this.currentSession) {
        throw new GameStateManagerError('No active game session', 'NO_ACTIVE_SESSION', false);
      }

      let newRoom: Room | null;
      let roomId: number;

      // Handle Room object input
      if (typeof roomOrId === 'object') {
        newRoom = roomOrId;
        roomId = roomOrId.id;
      } else {
        // Handle roomId input
        roomId = roomOrId;
        // Try to get room from cache first
        newRoom = this.getRoomFromCache(roomId);

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
          timestamp: now,
        });
      }

      // Update session state
      this.currentSession.currentRoomId = roomId;
      this.currentSession.currentRoom = newRoom;
      this.currentSession.lastSaved = now;

      // Return the new room for roomId input
      if (typeof roomOrId === 'number') {
        return newRoom;
      }
    } catch (error) {
      if (error instanceof GameStateManagerError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new GameStateManagerError(
        `Failed to set current room: ${errorMessage}`,
        'SET_ROOM_FAILED',
        false
      );
    }
  }

  /**
   * Mark a room as visited in the database and cache
   */
  private async markRoomVisited(roomId: number): Promise<void> {
    try {
      await this.prismaService.client.room.update({
        where: { id: roomId },
        data: { visited: true },
      });

      // Update cache if the room is cached
      const cached = this.roomCache.get(roomId);
      if (cached) {
        cached.room.visited = true;
      }
    } catch (error) {
      console.error(`Failed to mark room ${roomId} as visited:`, error);
    }
  }

  /**
   * Add movement to history and trim if needed
   */
  private addMovementToHistory(entry: MovementHistoryEntry): void {
    this.currentSession?.movementHistory.push(entry);

    // Trim history if it exceeds max size
    if (this.currentSession && this.currentSession.movementHistory.length > this.maxHistorySize) {
      this.currentSession.movementHistory = this.currentSession.movementHistory.slice(
        -this.maxHistorySize
      );
    }
  }

  /**
   * Get movement history for the current session
   */
  getMovementHistory(): MovementHistoryEntry[] {
    return this.currentSession?.movementHistory || [];
  }

  /**
   * Get the last N movements
   */
  getRecentMovements(count: number = 5): MovementHistoryEntry[] {
    const history = this.getMovementHistory();
    return history.slice(-count);
  }

  /**
   * Setup auto-save interval for periodic state persistence
   */
  private setupAutoSave(): void {
    // Save every 30 seconds if there's an active session
    this.saveInterval = setInterval(async () => {
      if (this.currentSession) {
        await this.saveGameState();
      }
    }, 30000);
  }

  /**
   * Save the current game state to the database
   */
  async saveGameState(): Promise<void> {
    try {
      if (!this.currentSession) {
        return;
      }

      const now = new Date();

      // Update game record
      await this.prismaService.client.game.update({
        where: { id: this.currentSession.gameId },
        data: {
          currentRoomId: this.currentSession.currentRoomId,
          updatedAt: now,
        },
      });

      // Update inventory items to ensure they're marked as belonging to this game
      // and have null roomId (indicating they're in inventory)
      if (this.currentSession.inventory && this.currentSession.inventory.length > 0) {
        try {
          // First verify these items actually exist and belong to this game
          const validItems = await this.prismaService.client.item.findMany({
            where: {
              id: { in: this.currentSession.inventory },
              gameId: this.currentSession.gameId,
            },
          });

          const validItemIds = validItems.map(item => item.id);

          // Only update items that actually exist and belong to this game
          if (validItemIds.length > 0) {
            await this.prismaService.client.item.updateMany({
              where: {
                id: { in: validItemIds },
                gameId: this.currentSession.gameId,
              },
              data: {
                roomId: null,
              },
            });
          }

          // Update inventory to only include valid items
          if (validItemIds.length !== this.currentSession.inventory.length) {
            console.warn(
              `Inventory contained ${this.currentSession.inventory.length - validItemIds.length} invalid item IDs, cleaning up`
            );
            this.currentSession.inventory = validItemIds;
          }
        } catch (itemError) {
          // Log the error but don't fail the entire save operation
          console.warn('Warning: Failed to update inventory items during save:', itemError);
          // Clear invalid inventory
          this.currentSession.inventory = [];
        }
      }

      this.currentSession.lastSaved = now;
    } catch (error) {
      console.error('Failed to save game state:', error);
      throw new GameStateManagerError(
        `Failed to save game state: ${error instanceof Error ? error.message : String(error)}`,
        'SAVE_FAILED',
        true
      );
    }
  }

  /**
   * Load a saved game from the database
   */
  async loadGame(gameId: number): Promise<void> {
    try {
      const game = await this.prismaService.client.game.findUnique({
        where: { id: gameId },
        include: {
          currentRoom: true,
        },
      });

      if (!game) {
        throw new GameStateManagerError(`Game ${gameId} not found`, 'GAME_NOT_FOUND', false);
      }

      if (!game.currentRoom) {
        throw new GameStateManagerError(
          `Game ${gameId} has invalid room reference`,
          'INVALID_GAME_STATE',
          false
        );
      }

      // Load inventory items
      const inventoryItems = await this.prismaService.client.item.findMany({
        where: {
          gameId: gameId,
          roomId: null,
        },
      });
      const inventoryIds = inventoryItems.map(item => item.id);

      const now = new Date();
      this.currentSession = {
        gameId: game.id,
        currentRoomId: game.currentRoomId!,
        currentRoom: game.currentRoom,
        lastSaved: now,
        sessionStartTime: now,
        movementHistory: [],
        inventory: inventoryIds,
      };

      // Mark room as visited (in case it wasn't already)
      await this.markRoomVisited(game.currentRoomId!);
    } catch (error) {
      if (error instanceof GameStateManagerError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new GameStateManagerError(`Failed to load game: ${errorMessage}`, 'LOAD_FAILED', false);
    }
  }

  /**
   * Create a new game
   */
  async createNewGame(startingRoomId: number): Promise<Game> {
    try {
      const game = await this.prismaService.client.game.create({
        data: {
          currentRoomId: startingRoomId,
        },
      });

      // Initialize the new game
      await this.initializeGame(game);

      return game;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new GameStateManagerError(
        `Failed to create new game: ${errorMessage}`,
        'CREATE_FAILED',
        false
      );
    }
  }

  /**
   * Get room from cache
   */
  private getRoomFromCache(roomId: number): Room | null {
    const cached = this.roomCache.get(roomId);

    if (cached) {
      const now = Date.now();
      const age = now - cached.cachedAt.getTime();

      if (age < this.cacheExpiry) {
        return cached.room;
      } else {
        // Cache expired, remove it
        this.roomCache.delete(roomId);
      }
    }

    return null;
  }

  /**
   * Add room to cache
   */
  private addRoomToCache(room: Room): void {
    this.roomCache.set(room.id, {
      room,
      cachedAt: new Date(),
    });

    // Limit cache size to prevent memory issues
    if (this.roomCache.size > 50) {
      // Remove oldest entries
      const entries = Array.from(this.roomCache.entries());
      entries.sort((a, b) => a[1].cachedAt.getTime() - b[1].cachedAt.getTime());

      // Remove oldest 10 entries
      for (let i = 0; i < 10; i++) {
        this.roomCache.delete(entries[i][0]);
      }
    }
  }

  /**
   * Clear the room cache
   */
  clearRoomCache(): void {
    this.roomCache.clear();
  }

  /**
   * Clean up resources when shutting down
   */
  async shutdown(): Promise<void> {
    try {
      // Clear the save interval first to prevent auto-saves during shutdown
      if (this.saveInterval) {
        clearInterval(this.saveInterval);
        this.saveInterval = null;
      }

      // Save final state if there's an active session and database is still connected
      if (this.currentSession) {
        try {
          // Check if database is still connected by attempting a simple query
          await this.prismaService.client.$queryRaw`SELECT 1`;
          await this.saveGameState();
        } catch (saveError) {
          // Database is disconnected or save failed
          console.log('Unable to save final game state during shutdown');
          if (process.env.AI_DEBUG_LOGGING === 'true') {
            console.error('Save error during shutdown:', saveError);
          }
        }
      }

      // Clear caches
      this.roomCache.clear();
      this.currentSession = null;
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }

  /**
   * Add item to inventory
   */
  async addToInventory(itemId: number): Promise<boolean> {
    if (!this.currentSession) {
      return false;
    }

    // Check if already in inventory
    if (this.currentSession.inventory.includes(itemId)) {
      return false;
    }

    // Check inventory capacity (max 10 items)
    if (this.currentSession.inventory.length >= 10) {
      return false;
    }

    // Add to inventory
    this.currentSession.inventory.push(itemId);

    // Update database to mark item as in inventory (roomId = null)
    await this.prismaService.client.item.update({
      where: { id: itemId },
      data: { roomId: null, gameId: this.currentSession.gameId },
    });

    return true;
  }

  /**
   * Remove item from inventory
   */
  async removeFromInventory(itemId: number): Promise<boolean> {
    if (!this.currentSession) {
      return false;
    }

    const index = this.currentSession.inventory.indexOf(itemId);
    if (index === -1) {
      return false;
    }

    // Remove from inventory
    this.currentSession.inventory.splice(index, 1);

    return true;
  }

  /**
   * Get current inventory
   */
  getInventory(): number[] {
    if (!this.currentSession) {
      return [];
    }
    return [...this.currentSession.inventory];
  }

  /**
   * Get inventory count
   */
  getInventoryCount(): number {
    if (!this.currentSession) {
      return 0;
    }
    return this.currentSession.inventory.length;
  }

  /**
   * Remove an item from a room (helper for pickup)
   * This is handled by updating the item's roomId in the database
   */
  async removeFromRoom(roomId: number, itemId: number): Promise<boolean> {
    try {
      await this.prismaService.client.item.update({
        where: { id: itemId },
        data: { roomId: null },
      });
      return true;
    } catch (error) {
      console.error(`Failed to remove item ${itemId} from room ${roomId}:`, error);
      return false;
    }
  }

  /**
   * Set the current game (for new game command)
   */
  async setCurrentGame(gameId: number): Promise<void> {
    try {
      const game = await this.prismaService.client.game.findUnique({
        where: { id: gameId },
      });

      if (!game) {
        throw new GameStateManagerError(`Game ${gameId} not found`, 'GAME_NOT_FOUND', false);
      }

      await this.initializeGame(game);
    } catch (error) {
      if (error instanceof GameStateManagerError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new GameStateManagerError(
        `Failed to set current game: ${errorMessage}`,
        'SET_GAME_FAILED',
        false
      );
    }
  }

  /**
   * Clear all inventory items
   */
  async clearInventory(): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    // Clear the inventory array
    this.currentSession.inventory = [];

    // Save the state to persist the change
    await this.saveGameState();
  }

  /**
   * Get current game ID
   */
  getCurrentGameId(): number | null {
    return this.currentSession?.gameId || null;
  }

  /**
   * Get current session (for debugging/status display)
   */
  getCurrentSession(): GameSession | null {
    return this.currentSession;
  }

  /**
   * Reset game state (for new game command)
   */
  async resetGameState(): Promise<void> {
    // Clear the current session
    this.currentSession = null;

    // Clear the room cache
    this.roomCache.clear();

    // Stop auto-save timer if running
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
  }

  /**
   * Clear the current session (for testing)
   */
  clearSession(): void {
    this.currentSession = null;
    // Also clear the save interval to prevent Jest hanging
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
  }
}
