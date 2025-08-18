#!/usr/bin/env node

import * as readline from 'readline';
import Database from './utils/database';
import { initializeDatabase, seedDatabase } from './utils/initDb';

interface Command {
  name: string;
  description: string;
  handler: (args: string[]) => void | Promise<void>;
}

interface Room {
  id: number;
  name: string;
  description: string;
}

interface Connection {
  id: number;
  from_room_id: number;
  to_room_id: number;
  name: string;
}

type Mode = 'menu' | 'game';

export class GameController {
  private rl: readline.Interface;
  private db: Database;
  private mode: Mode = 'menu';
  private currentRoomId: number = 1;
  private menuCommands: Map<string, Command> = new Map();
  private gameCommands: Map<string, Command> = new Map();

  constructor(db: Database) {
    this.db = db;
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
      handler: () => this.returnToMenu()
    });

    this.addGameCommand({
      name: 'quit',
      description: 'Quit to main menu (alias for "exit")',
      handler: () => this.returnToMenu()
    });

    this.addGameCommand({
      name: 'menu',
      description: 'Return to main menu',
      handler: () => this.returnToMenu()
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
      await initializeDatabase(this.db);
      await seedDatabase(this.db);
      
      this.mode = 'game';
      this.rl.setPrompt('> ');
      this.currentRoomId = 1;
      
      console.clear();
      console.log('Welcome to Shadow Kingdom!');
      console.log('Initializing game world...\n');
      console.log('Database tables initialized successfully');
      console.log('Database already contains rooms, skipping seed');
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
    console.log('Loading existing games...');
    // TODO: Implement game loading
    console.log('(Game loading not yet implemented)');
  }

  private async deleteGame() {
    console.log('Deleting games...');
    // TODO: Implement game deletion
    console.log('(Game deletion not yet implemented)');
  }

  private returnToMenu() {
    console.log('Returning to main menu...');
    this.mode = 'menu';
    this.rl.setPrompt('menu> ');
    console.clear();
    this.showWelcome();
  }

  private async lookAround() {
    try {
      const room = await this.db.get<Room>(
        'SELECT id, name, description FROM rooms WHERE id = ?',
        [this.currentRoomId]
      );

      if (room) {
        console.log(`\n${room.name}`);
        console.log('='.repeat(room.name.length));
        console.log(room.description);
        
        // Get available connections from this room
        const connections = await this.db.all<Connection>(
          'SELECT name FROM connections WHERE from_room_id = ? ORDER BY name',
          [this.currentRoomId]
        );
        
        if (connections && connections.length > 0) {
          const exits = connections.map(c => c.name).join(', ');
          console.log(`\nExits: ${exits}`);
        } else {
          console.log('\nThere are no obvious exits.');
        }
      } else {
        console.log('You are in a void. Something went wrong!');
      }
    } catch (error) {
      console.error('Error looking around:', error);
    }
  }

  private async move(args: string[]) {
    if (args.length === 0) {
      console.log('Move where? Specify a direction (e.g., "go north")');
      return;
    }

    const direction = args[0].toLowerCase();

    try {
      // Find connection from current room with the specified name (case-insensitive)
      const connection = await this.db.get<Connection>(
        'SELECT * FROM connections WHERE from_room_id = ? AND LOWER(name) = LOWER(?)',
        [this.currentRoomId, direction]
      );

      if (!connection) {
        console.log(`You can't go ${direction} from here.`);
        return;
      }

      // Update current room
      this.currentRoomId = connection.to_room_id;
      
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

  public async start() {
    console.clear();
    this.showWelcome();
    this.rl.prompt();
  }
}