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

class CLI {
  private rl: readline.Interface;
  private commands: Map<string, Command> = new Map();
  private db: Database;
  private currentRoomId: number = 1; // Start in room 1 (Entrance Hall)

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> '
    });

    this.db = new Database();
    this.setupCommands();
    this.setupEventHandlers();
  }

  private setupCommands() {
    this.addCommand({
      name: 'help',
      description: 'Show available commands',
      handler: () => this.showHelp()
    });

    this.addCommand({
      name: 'look',
      description: 'Look around the current room',
      handler: async () => await this.lookAround()
    });

    this.addCommand({
      name: 'echo',
      description: 'Echo back the provided text',
      handler: (args) => console.log(args.join(' '))
    });

    this.addCommand({
      name: 'clear',
      description: 'Clear the screen',
      handler: () => {
        console.clear();
        console.log('Welcome to Shadow Kingdom!');
      }
    });

    this.addCommand({
      name: 'exit',
      description: 'Exit the CLI',
      handler: () => this.exit()
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

  private addCommand(command: Command) {
    this.commands.set(command.name, command);
  }

  private async processCommand(input: string) {
    if (!input) return;

    const parts = input.split(' ');
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const command = this.commands.get(commandName);
    
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

  private showHelp() {
    console.log('\nAvailable commands:');
    console.log('==================');
    
    this.commands.forEach((command) => {
      console.log(`  ${command.name.padEnd(12)} - ${command.description}`);
    });
    
    console.log('\nPress Ctrl+C or type "exit" to quit.\n');
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
      } else {
        console.log('You are in a void. Something went wrong!');
      }
    } catch (error) {
      console.error('Error looking around:', error);
    }
  }

  private async exit() {
    await this.cleanup();
    console.log('Goodbye!');
    this.rl.close();
  }

  private async cleanup() {
    if (this.db.isConnected()) {
      await this.db.close();
    }
  }

  public async start() {
    console.clear();
    console.log('Welcome to Shadow Kingdom!');
    console.log('Initializing game world...\n');
    
    try {
      await this.db.connect();
      await initializeDatabase(this.db);
      await seedDatabase(this.db);
      
      console.log('\nType "help" for available commands.');
      console.log('Type "look" to see where you are.\n');
      
      // Show initial room
      await this.lookAround();
      
      this.rl.prompt();
    } catch (error) {
      console.error('Failed to initialize game:', error);
      process.exit(1);
    }
  }
}

const cli = new CLI();
cli.start();