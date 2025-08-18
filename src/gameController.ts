#!/usr/bin/env node

import * as readline from 'readline';
import Database from './utils/database';
import { initializeDatabase, seedDatabase, migrateExistingData, createGameWithRooms } from './utils/initDb';
import { GrokClient } from './ai/grokClient';

interface Command {
  name: string;
  description: string;
  handler: (args: string[]) => void | Promise<void>;
}

interface Game {
  id: number;
  name: string;
  created_at: string;
  last_played_at: string;
}

interface Room {
  id: number;
  game_id: number;
  name: string;
  description: string;
}

interface Connection {
  id: number;
  game_id: number;
  from_room_id: number;
  to_room_id: number;
  direction: string;  // mechanical direction: "north", "south", etc.
  name: string;       // thematic description: "through the crystal archway"
}

interface GameState {
  id: number;
  game_id: number;
  current_room_id: number;
  player_name: string | null;
}

type Mode = 'menu' | 'game';

export class GameController {
  private rl: readline.Interface;
  private db: Database;
  private grokClient: GrokClient;
  private mode: Mode = 'menu';
  private currentGameId: number | null = null;
  private currentRoomId: number | null = null;
  private menuCommands: Map<string, Command> = new Map();
  private gameCommands: Map<string, Command> = new Map();
  private lastGenerationTime: number = 0;
  private generationInProgress: Set<number> = new Set();

  constructor(db: Database) {
    this.db = db;
    this.grokClient = new GrokClient();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'menu> '
    });

    this.setupMenuCommands();
    this.setupGameCommands();
    this.setupEventHandlers();
  }

  private setupMenuCommands() {
    this.addMenuCommand({
      name: 'help',
      description: 'Show available menu commands',
      handler: () => this.showMenuHelp()
    });

    this.addMenuCommand({
      name: 'new',
      description: 'Start a new game',
      handler: async () => await this.startNewGame()
    });

    this.addMenuCommand({
      name: 'load',
      description: 'Load an existing game',
      handler: async () => await this.loadGame()
    });

    this.addMenuCommand({
      name: 'delete',
      description: 'Delete a saved game',
      handler: async () => await this.deleteGame()
    });

    this.addMenuCommand({
      name: 'clear',
      description: 'Clear the screen',
      handler: () => {
        console.clear();
        this.showWelcome();
      }
    });

    this.addMenuCommand({
      name: 'exit',
      description: 'Exit Shadow Kingdom',
      handler: () => this.exit()
    });

    this.addMenuCommand({
      name: 'quit',
      description: 'Quit Shadow Kingdom (alias for "exit")',
      handler: () => this.exit()
    });
  }

  private setupGameCommands() {
    this.addGameCommand({
      name: 'help',
      description: 'Show available commands',
      handler: () => this.showGameHelp()
    });

    this.addGameCommand({
      name: 'look',
      description: 'Look around the current room',
      handler: async () => await this.lookAround()
    });

    this.addGameCommand({
      name: 'go',
      description: 'Move in a direction (e.g., "go north")',
      handler: async (args) => await this.move(args)
    });

    this.addGameCommand({
      name: 'move',
      description: 'Move in a direction (alias for "go")',
      handler: async (args) => await this.move(args)
    });

    // Cardinal direction shortcuts
    this.addGameCommand({
      name: 'north',
      description: 'Move north',
      handler: async () => await this.move(['north'])
    });

    this.addGameCommand({
      name: 'south',
      description: 'Move south',
      handler: async () => await this.move(['south'])
    });

    this.addGameCommand({
      name: 'east',
      description: 'Move east',
      handler: async () => await this.move(['east'])
    });

    this.addGameCommand({
      name: 'west',
      description: 'Move west',
      handler: async () => await this.move(['west'])
    });

    this.addGameCommand({
      name: 'up',
      description: 'Move up',
      handler: async () => await this.move(['up'])
    });

    this.addGameCommand({
      name: 'down',
      description: 'Move down',
      handler: async () => await this.move(['down'])
    });

    // Short aliases for cardinal directions
    this.addGameCommand({
      name: 'n',
      description: 'Move north (shortcut)',
      handler: async () => await this.move(['north'])
    });

    this.addGameCommand({
      name: 's',
      description: 'Move south (shortcut)',
      handler: async () => await this.move(['south'])
    });

    this.addGameCommand({
      name: 'e',
      description: 'Move east (shortcut)',
      handler: async () => await this.move(['east'])
    });

    this.addGameCommand({
      name: 'w',
      description: 'Move west (shortcut)',
      handler: async () => await this.move(['west'])
    });

    this.addGameCommand({
      name: 'echo',
      description: 'Echo back the provided text',
      handler: (args) => console.log(args.join(' '))
    });

    this.addGameCommand({
      name: 'clear',
      description: 'Clear the screen',
      handler: () => {
        console.clear();
        console.log('Welcome to Shadow Kingdom!');
      }
    });

    this.addGameCommand({
      name: 'exit',
      description: 'Exit to main menu',
      handler: async () => await this.returnToMenu()
    });

    this.addGameCommand({
      name: 'quit',
      description: 'Quit to main menu (alias for "exit")',
      handler: async () => await this.returnToMenu()
    });

    this.addGameCommand({
      name: 'menu',
      description: 'Return to main menu',
      handler: async () => await this.returnToMenu()
    });
  }

  private setupEventHandlers() {
    this.rl.on('line', async (input: string) => {
      await this.processCommand(input.trim());
      this.rl.prompt();
    });

    this.rl.on('close', async () => {
      await this.cleanup();
      console.log('\nGoodbye!');
      process.exit(0);
    });
  }

  private addMenuCommand(command: Command) {
    this.menuCommands.set(command.name, command);
  }

  private addGameCommand(command: Command) {
    this.gameCommands.set(command.name, command);
  }

  private async processCommand(input: string) {
    if (!input) return;

    const parts = input.split(' ');
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const commands = this.mode === 'menu' ? this.menuCommands : this.gameCommands;
    const command = commands.get(commandName);
    
    if (command) {
      try {
        await command.handler(args);
      } catch (error) {
        console.error(`Error executing command "${commandName}":`, error);
      }
    } else {
      console.log(`Unknown command: ${commandName}. Type "help" for available commands.`);
    }
  }

  private showMenuHelp() {
    console.log('\nMain Menu Commands:');
    console.log('==================');
    
    this.menuCommands.forEach((command) => {
      console.log(`  ${command.name.padEnd(12)} - ${command.description}`);
    });
    
    console.log('\nPress Ctrl+C or type "exit" to quit.\n');
  }

  private showGameHelp() {
    console.log('\nAvailable commands:');
    console.log('==================');
    
    this.gameCommands.forEach((command) => {
      console.log(`  ${command.name.padEnd(12)} - ${command.description}`);
    });
    
    console.log('\nPress Ctrl+C or type "exit" to quit.\n');
  }

  private showWelcome() {
    console.log('Welcome to Shadow Kingdom!');
    console.log('A dynamic, AI-powered text adventure.');
    console.log('\nType "help" for commands or "new" to start a new game.\n');
  }

  private async startNewGame() {
    console.log('Starting a new game...\n');
    
    try {
      // Initialize database tables if needed
      await initializeDatabase(this.db);
      
      // Get game name from user
      console.log('Enter a name for your new game:');
      const gameName = await this.promptForInput('Game name: ');
      
      if (!gameName.trim()) {
        console.log('Game name cannot be empty. Returning to main menu.');
        return;
      }

      // Check if game name already exists
      const existingGame = await this.db.get<Game>(
        'SELECT id FROM games WHERE name = ?',
        [gameName.trim()]
      );

      if (existingGame) {
        console.log('A game with that name already exists. Please choose a different name.');
        return;
      }

      // Create new game with rooms
      this.currentGameId = await createGameWithRooms(this.db, gameName.trim());
      
      // Get the starting room for this game
      const gameState = await this.db.get<GameState>(
        'SELECT current_room_id FROM game_state WHERE game_id = ?',
        [this.currentGameId]
      );
      
      if (gameState) {
        this.currentRoomId = gameState.current_room_id;
      } else {
        throw new Error('Failed to initialize game state');
      }
      
      this.mode = 'game';
      this.rl.setPrompt('> ');
      
      console.clear();
      console.log(`Welcome to Shadow Kingdom!`);
      console.log(`Game: ${gameName}`);
      console.log('Initializing game world...\n');
      console.log('\nType "help" for available commands.');
      console.log('Type "look" to see where you are.');
      console.log('Type "menu" to return to main menu.\n');
      
      // Show initial room
      await this.lookAround();
    } catch (error) {
      console.error('Failed to start new game:', error);
    }
  }

  private async loadGame() {
    console.log('Loading existing games...\n');
    
    try {
      // Get all games ordered by last played
      const games = await this.db.all<Game>(
        'SELECT id, name, created_at, last_played_at FROM games ORDER BY last_played_at DESC'
      );

      if (!games || games.length === 0) {
        console.log('No saved games found. Create a new game first.');
        return;
      }

      console.log('Select a game to load:\n');
      games.forEach((game, index) => {
        const lastPlayed = this.formatTimestamp(game.last_played_at);
        console.log(`${index + 1}. ${game.name} (Last played: ${lastPlayed})`);
      });
      console.log('0. Cancel\n');

      const choice = await this.promptForInput('Enter your choice: ');
      const choiceNum = parseInt(choice);

      if (isNaN(choiceNum) || choiceNum < 0 || choiceNum > games.length) {
        console.log('Invalid choice. Returning to main menu.');
        return;
      }

      if (choiceNum === 0) {
        console.log('Cancelled.');
        return;
      }

      const selectedGame = games[choiceNum - 1];
      await this.loadSelectedGame(selectedGame);

    } catch (error) {
      console.error('Failed to load game:', error);
    }
  }

  private async deleteGame() {
    console.log('Deleting games...\n');
    
    try {
      // Get all games ordered by last played
      const games = await this.db.all<Game>(
        'SELECT id, name, created_at, last_played_at FROM games ORDER BY last_played_at DESC'
      );

      if (!games || games.length === 0) {
        console.log('No saved games found to delete.');
        return;
      }

      console.log('Select a game to delete:\n');
      games.forEach((game, index) => {
        const lastPlayed = this.formatTimestamp(game.last_played_at);
        console.log(`${index + 1}. ${game.name} (Last played: ${lastPlayed})`);
      });
      console.log('0. Cancel\n');

      const choice = await this.promptForInput('Enter your choice: ');
      const choiceNum = parseInt(choice);

      if (isNaN(choiceNum) || choiceNum < 0 || choiceNum > games.length) {
        console.log('Invalid choice. Returning to main menu.');
        return;
      }

      if (choiceNum === 0) {
        console.log('Cancelled.');
        return;
      }

      const selectedGame = games[choiceNum - 1];
      
      // Confirm deletion
      console.log(`\nAre you sure you want to delete "${selectedGame.name}"?`);
      console.log('This action cannot be undone.');
      const confirm = await this.promptForInput('Type "yes" to confirm: ');

      if (confirm.toLowerCase() !== 'yes') {
        console.log('Deletion cancelled.');
        return;
      }

      // Delete the game (cascade will handle related data)
      await this.db.run('DELETE FROM games WHERE id = ?', [selectedGame.id]);
      console.log(`Game "${selectedGame.name}" has been deleted.`);

    } catch (error) {
      console.error('Failed to delete game:', error);
    }
  }

  private async returnToMenu() {
    console.log('Returning to main menu...');
    
    // Save current game state before returning to menu
    if (this.currentGameId && this.currentRoomId) {
      await this.saveGameState();
    }
    
    this.currentGameId = null;
    this.currentRoomId = null;
    this.mode = 'menu';
    this.rl.setPrompt('menu> ');
    console.clear();
    this.showWelcome();
  }

  private async lookAround() {
    if (!this.currentGameId || !this.currentRoomId) {
      console.log('No game is currently loaded.');
      return;
    }

    try {
      const room = await this.db.get<Room>(
        'SELECT id, name, description FROM rooms WHERE id = ? AND game_id = ?',
        [this.currentRoomId, this.currentGameId]
      );

      if (room) {
        console.log(`\n${room.name}`);
        console.log('='.repeat(room.name.length));
        console.log(room.description);
        
        // Get available connections from this room within this game
        const connections = await this.db.all<Connection>(
          'SELECT direction, name FROM connections WHERE from_room_id = ? AND game_id = ? ORDER BY direction',
          [this.currentRoomId, this.currentGameId]
        );
        
        if (connections && connections.length > 0) {
          // Display thematic names with direction in parentheses
          const exits = connections.map(c => {
            // If name is same as direction, just show direction
            if (c.name === c.direction) {
              return c.direction;
            }
            // Otherwise show thematic name with direction in parentheses
            return `${c.name} (${c.direction})`;
          }).join(', ');
          console.log(`\nExits: ${exits}`);
        } else {
          console.log('\nThere are no obvious exits.');
        }

        // Trigger background room generation (fire and forget)
        this.preGenerateAdjacentRooms(this.currentRoomId);
      } else {
        console.log('You are in a void. Something went wrong!');
      }
    } catch (error) {
      console.error('Error looking around:', error);
    }
  }

  private async move(args: string[]) {
    if (!this.currentGameId || !this.currentRoomId) {
      console.log('No game is currently loaded.');
      return;
    }

    if (args.length === 0) {
      console.log('Move where? Specify a direction (e.g., "go north")');
      return;
    }

    const userInput = args.join(' ').toLowerCase();

    try {
      // Find connection by either direction or thematic name (case-insensitive)
      const connection = await this.db.get<Connection>(
        'SELECT * FROM connections WHERE from_room_id = ? AND game_id = ? AND (LOWER(direction) = LOWER(?) OR LOWER(name) = LOWER(?))',
        [this.currentRoomId, this.currentGameId, userInput, userInput]
      );

      if (!connection) {
        console.log(`You can't go ${userInput} from here.`);
        return;
      }

      // Update current room
      this.currentRoomId = connection.to_room_id;
      
      // Auto-save the game state
      await this.saveGameState();
      
      // Show the new room
      await this.lookAround();
      
    } catch (error) {
      console.error('Error moving:', error);
    }
  }

  private async exit() {
    await this.cleanup();
    console.log('Goodbye!');
    this.rl.close();
  }

  private async cleanup() {
    // Don't close DB connection
  }

  private async promptForInput(promptText: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(promptText, (answer) => {
        resolve(answer);
      });
    });
  }

  private formatTimestamp(timestamp: string): string {
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

  private async loadSelectedGame(game: Game) {
    try {
      this.currentGameId = game.id;
      
      // Get the current game state
      const gameState = await this.db.get<GameState>(
        'SELECT current_room_id FROM game_state WHERE game_id = ?',
        [game.id]
      );
      
      if (!gameState) {
        throw new Error('Game state not found');
      }
      
      this.currentRoomId = gameState.current_room_id;
      
      // Update last played timestamp
      await this.db.run(
        'UPDATE games SET last_played_at = ? WHERE id = ?',
        [new Date().toISOString(), game.id]
      );
      
      this.mode = 'game';
      this.rl.setPrompt('> ');
      
      console.clear();
      console.log(`Welcome back to Shadow Kingdom!`);
      console.log(`Game: ${game.name}`);
      console.log('Loading your saved game...\n');
      console.log('\nType "help" for available commands.');
      console.log('Type "look" to see where you are.');
      console.log('Type "menu" to return to main menu.\n');
      
      // Show current room
      await this.lookAround();
    } catch (error) {
      console.error('Failed to load selected game:', error);
    }
  }

  private async saveGameState() {
    if (this.currentGameId && this.currentRoomId) {
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
      } catch (error) {
        console.error('Failed to save game state:', error);
      }
    }
  }

  // Background Room Generation Methods
  private async preGenerateAdjacentRooms(currentRoomId: number): Promise<void> {
    // Check cooldown period
    const cooldown = parseInt(process.env.GENERATION_COOLDOWN_MS || '10000');
    const timeSinceLastGeneration = Date.now() - this.lastGenerationTime;
    
    if (timeSinceLastGeneration < cooldown) {
      return; // Still in cooldown
    }

    // Check if generation is already in progress for this room
    if (this.generationInProgress.has(currentRoomId)) {
      return; // Already generating
    }

    // Check total room count limit
    if (this.currentGameId) {
      const roomCount = await this.db.get(
        'SELECT COUNT(*) as count FROM rooms WHERE game_id = ?',
        [this.currentGameId]
      );
      
      const maxRooms = parseInt(process.env.MAX_ROOMS_PER_GAME || '50');
      if (roomCount?.count >= maxRooms) {
        if (process.env.AI_DEBUG_LOGGING === 'true') {
          console.log(`🏰 Room limit reached (${maxRooms}). No more rooms will be generated.`);
        }
        return;
      }
    }

    // Fire and forget - don't await this in production
    this.expandFromAdjacentRooms(currentRoomId);
    this.lastGenerationTime = Date.now();
  }

  private async expandFromAdjacentRooms(currentRoomId: number): Promise<void> {
    this.generationInProgress.add(currentRoomId);
    
    try {
      const maxDepth = parseInt(process.env.MAX_GENERATION_DEPTH || '3');
      
      // Get all connections FROM current room to existing rooms that haven't been processed yet
      const connections = await this.db.all(
        'SELECT c.*, r.generation_processed FROM connections c ' +
        'JOIN rooms r ON c.to_room_id = r.id ' +
        'WHERE c.from_room_id = ? AND c.game_id = ? AND (r.generation_processed = FALSE OR r.generation_processed IS NULL)',
        [currentRoomId, this.currentGameId]
      );

      let roomsToGenerate = 0;
      
      // For each connection that leads to an unprocessed room
      for (const connection of connections) {
        const targetRoom = await this.db.get(
          'SELECT * FROM rooms WHERE id = ?',
          [connection.to_room_id]
        );

        if (targetRoom) {
          // Count missing rooms for this target
          const missingCount = await this.countMissingRoomsFor(targetRoom.id);
          roomsToGenerate += Math.min(missingCount, maxDepth);
        }
      }

      // Check if we can generate the requested rooms without exceeding limits
      if (this.currentGameId) {
        const currentRoomCount = await this.db.get(
          'SELECT COUNT(*) as count FROM rooms WHERE game_id = ?',
          [this.currentGameId]
        );
        
        const maxRooms = parseInt(process.env.MAX_ROOMS_PER_GAME || '50');
        const roomsCanGenerate = Math.max(0, maxRooms - (currentRoomCount?.count || 0));
        
        if (roomsToGenerate > roomsCanGenerate) {
          if (process.env.AI_DEBUG_LOGGING === 'true') {
            console.log(`🏰 Limited generation: ${roomsCanGenerate} rooms available (${roomsToGenerate} requested)`);
          }
          roomsToGenerate = roomsCanGenerate;
        }
      }

      // Generate rooms with depth limit
      let generatedCount = 0;
      for (const connection of connections) {
        if (generatedCount >= roomsToGenerate) break;
        
        const targetRoom = await this.db.get(
          'SELECT * FROM rooms WHERE id = ?',
          [connection.to_room_id]
        );

        if (targetRoom) {
          const roomsGenerated = await this.generateMissingRoomsFor(targetRoom.id, maxDepth, roomsToGenerate - generatedCount);
          generatedCount += roomsGenerated;
          
          // Mark this room as processed so we don't generate for it again
          await this.db.run(
            'UPDATE rooms SET generation_processed = TRUE WHERE id = ?',
            [targetRoom.id]
          );
        }
      }
      
    } catch (error) {
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.error('Background generation failed:', error);
      }
      // Silent failure - game continues normally
    } finally {
      this.generationInProgress.delete(currentRoomId);
    }
  }

  private async countMissingRoomsFor(roomId: number): Promise<number> {
    // Check if this room was AI-generated and processed
    const room = await this.db.get(
      'SELECT generation_processed FROM rooms WHERE id = ? AND game_id = ?',
      [roomId, this.currentGameId]
    );

    // If room was AI-processed, respect its design - don't add more connections
    if (room && room.generation_processed) {
      return 0;
    }

    // For unprocessed rooms (starter rooms), check for missing basic directions
    const basicDirections = ['north', 'south', 'east', 'west'];
    let missingCount = 0;

    for (const direction of basicDirections) {
      const existingConnection = await this.db.get(
        'SELECT * FROM connections WHERE from_room_id = ? AND direction = ? AND game_id = ?',
        [roomId, direction, this.currentGameId]
      );

      if (!existingConnection) {
        missingCount++;
      }
    }

    // Limit to 2-3 additional connections for starter rooms
    return Math.min(missingCount, 3);
  }

  private async generateMissingRoomsFor(roomId: number, maxRooms: number = 6, remainingQuota: number = Infinity): Promise<number> {
    // Check if this room was AI-generated and processed
    const room = await this.db.get(
      'SELECT generation_processed FROM rooms WHERE id = ? AND game_id = ?',
      [roomId, this.currentGameId]
    );

    // If room was AI-processed, respect its design - don't add more connections
    if (room && room.generation_processed) {
      return 0;
    }

    // For unprocessed rooms (starter rooms), only generate missing basic directions
    const basicDirections = ['north', 'south', 'east', 'west'];
    let generatedCount = 0;
    const maxGenerations = Math.min(maxRooms, remainingQuota, 3); // Limit starter room expansion

    for (const direction of basicDirections) {
      if (generatedCount >= maxGenerations) break;
      
      // Check if connection already exists
      const existingConnection = await this.db.get(
        'SELECT * FROM connections WHERE from_room_id = ? AND direction = ? AND game_id = ?',
        [roomId, direction, this.currentGameId]
      );

      if (!existingConnection) {
        // Generate new room in this direction
        const success = await this.generateSingleRoom(roomId, direction);
        if (success) {
          generatedCount++;
        }
      }
    }

    return generatedCount;
  }

  private async generateSingleRoom(fromRoomId: number, direction: string): Promise<boolean> {
    try {
      const fromRoom = await this.db.get('SELECT * FROM rooms WHERE id = ?', [fromRoomId]);

      // Get existing room names for context
      const existingRooms = await this.db.all(
        'SELECT name FROM rooms WHERE game_id = ? ORDER BY id',
        [this.currentGameId]
      );
      const roomNames = existingRooms.map(room => room.name);

      const newRoom = await this.grokClient.generateRoom({
        currentRoom: { name: fromRoom.name, description: fromRoom.description },
        direction: direction,
        gameHistory: roomNames,
        theme: 'mysterious fantasy kingdom'
      });

      // Check for duplicate room names and make unique if needed
      let uniqueName = newRoom.name;
      let counter = 1;
      
      while (true) {
        const existingRoom = await this.db.get(
          'SELECT id FROM rooms WHERE game_id = ? AND name = ?',
          [this.currentGameId, uniqueName]
        );
        
        if (!existingRoom) {
          break; // Name is unique
        }
        
        // Add counter to make name unique
        uniqueName = `${newRoom.name} ${counter}`;
        counter++;
        
        // Prevent infinite loop
        if (counter > 100) {
          uniqueName = `${newRoom.name} ${Date.now()}`;
          break;
        }
      }

      // Save to database (new rooms start as unprocessed)
      const roomResult = await this.db.run(
        'INSERT INTO rooms (game_id, name, description, generation_processed) VALUES (?, ?, ?, ?)',
        [this.currentGameId, uniqueName, newRoom.description, false]
      );

      // Create outgoing connection from origin room (using basic direction for now)
      await this.db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [this.currentGameId, fromRoomId, roomResult.lastID, direction, direction]
      );

      // Create AI-generated connections from the new room
      if (newRoom.connections && newRoom.connections.length > 0) {
        for (const connection of newRoom.connections) {
          // Find if this connection leads back to the origin room
          const isReturnPath = connection.direction === this.getReverseDirection(direction);
          
          if (isReturnPath) {
            // Create the return connection with thematic name
            await this.db.run(
              'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
              [this.currentGameId, roomResult.lastID, fromRoomId, connection.direction, connection.name]
            );
          } else {
            // For other directions, we'll create stub rooms later (in Phase 4)
            // For now, just log that we have additional connections planned
            if (process.env.AI_DEBUG_LOGGING === 'true') {
              console.log(`🔗 Planned connection: ${connection.name} (${connection.direction})`);
            }
          }
        }
      } else {
        // Fallback: ensure new room has at least one exit (back to where we came from)
        const reverseDirection = this.getReverseDirection(direction);
        if (reverseDirection) {
          await this.db.run(
            'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
            [this.currentGameId, roomResult.lastID, fromRoomId, reverseDirection, reverseDirection]
          );
        }
      }

      // Only show generation messages in debug mode
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log(`✨ Generated new area: ${uniqueName} (${direction})`);
      }
      return true;

    } catch (error) {
      // Silent failure - this is background generation
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.error(`Failed to generate room ${direction} from ${fromRoomId}:`, error);
      }
      return false;
    }
  }

  private getReverseDirection(direction: string): string | null {
    const directionMap: { [key: string]: string } = {
      'north': 'south',
      'south': 'north',
      'east': 'west',
      'west': 'east',
      'up': 'down',
      'down': 'up'
    };
    
    return directionMap[direction.toLowerCase()] || null;
  }

  public async start() {
    console.clear();
    this.showWelcome();
    this.rl.prompt();
  }
}