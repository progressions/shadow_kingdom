#!/usr/bin/env node

import * as readline from 'readline';

interface Command {
  name: string;
  description: string;
  handler: (args: string[]) => void;
}

class CLI {
  private rl: readline.Interface;
  private commands: Map<string, Command> = new Map();

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> '
    });

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
      name: 'echo',
      description: 'Echo back the provided text',
      handler: (args) => console.log(args.join(' '))
    });

    this.addCommand({
      name: 'clear',
      description: 'Clear the screen',
      handler: () => {
        console.clear();
        console.log('Welcome to TypeScript CLI!');
      }
    });

    this.addCommand({
      name: 'exit',
      description: 'Exit the CLI',
      handler: () => this.exit()
    });
  }

  private setupEventHandlers() {
    this.rl.on('line', (input: string) => {
      this.processCommand(input.trim());
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      console.log('\nGoodbye!');
      process.exit(0);
    });
  }

  private addCommand(command: Command) {
    this.commands.set(command.name, command);
  }

  private processCommand(input: string) {
    if (!input) return;

    const parts = input.split(' ');
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const command = this.commands.get(commandName);
    
    if (command) {
      try {
        command.handler(args);
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

  private exit() {
    console.log('Goodbye!');
    this.rl.close();
  }

  public start() {
    console.clear();
    console.log('Welcome to TypeScript CLI!');
    console.log('Type "help" for available commands.\n');
    this.rl.prompt();
  }
}

const cli = new CLI();
cli.start();