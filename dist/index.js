#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const readline = __importStar(require("readline"));
const database_1 = __importDefault(require("./utils/database"));
const initDb_1 = require("./utils/initDb");
class CLI {
    constructor() {
        this.commands = new Map();
        this.currentRoomId = 1; // Start in room 1 (Entrance Hall)
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '> '
        });
        this.db = new database_1.default();
        this.setupCommands();
        this.setupEventHandlers();
    }
    setupCommands() {
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
            name: 'go',
            description: 'Move in a direction (e.g., "go north")',
            handler: async (args) => await this.move(args)
        });
        this.addCommand({
            name: 'move',
            description: 'Move in a direction (alias for "go")',
            handler: async (args) => await this.move(args)
        });
        // Cardinal direction shortcuts
        this.addCommand({
            name: 'north',
            description: 'Move north',
            handler: async () => await this.move(['north'])
        });
        this.addCommand({
            name: 'south',
            description: 'Move south',
            handler: async () => await this.move(['south'])
        });
        this.addCommand({
            name: 'east',
            description: 'Move east',
            handler: async () => await this.move(['east'])
        });
        this.addCommand({
            name: 'west',
            description: 'Move west',
            handler: async () => await this.move(['west'])
        });
        this.addCommand({
            name: 'up',
            description: 'Move up',
            handler: async () => await this.move(['up'])
        });
        this.addCommand({
            name: 'down',
            description: 'Move down',
            handler: async () => await this.move(['down'])
        });
        // Short aliases for cardinal directions
        this.addCommand({
            name: 'n',
            description: 'Move north (shortcut)',
            handler: async () => await this.move(['north'])
        });
        this.addCommand({
            name: 's',
            description: 'Move south (shortcut)',
            handler: async () => await this.move(['south'])
        });
        this.addCommand({
            name: 'e',
            description: 'Move east (shortcut)',
            handler: async () => await this.move(['east'])
        });
        this.addCommand({
            name: 'w',
            description: 'Move west (shortcut)',
            handler: async () => await this.move(['west'])
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
            description: 'Exit the game',
            handler: () => this.exit()
        });
        this.addCommand({
            name: 'quit',
            description: 'Quit the game (alias for "exit")',
            handler: () => this.exit()
        });
    }
    setupEventHandlers() {
        this.rl.on('line', async (input) => {
            await this.processCommand(input.trim());
            this.rl.prompt();
        });
        this.rl.on('close', async () => {
            await this.cleanup();
            console.log('\nGoodbye!');
            process.exit(0);
        });
    }
    addCommand(command) {
        this.commands.set(command.name, command);
    }
    async processCommand(input) {
        if (!input)
            return;
        const parts = input.split(' ');
        const commandName = parts[0].toLowerCase();
        const args = parts.slice(1);
        const command = this.commands.get(commandName);
        if (command) {
            try {
                await command.handler(args);
            }
            catch (error) {
                console.error(`Error executing command "${commandName}":`, error);
            }
        }
        else {
            console.log(`Unknown command: ${commandName}. Type "help" for available commands.`);
        }
    }
    showHelp() {
        console.log('\nAvailable commands:');
        console.log('==================');
        this.commands.forEach((command) => {
            console.log(`  ${command.name.padEnd(12)} - ${command.description}`);
        });
        console.log('\nPress Ctrl+C or type "exit" to quit.\n');
    }
    async lookAround() {
        try {
            const room = await this.db.get('SELECT id, name, description FROM rooms WHERE id = ?', [this.currentRoomId]);
            if (room) {
                console.log(`\n${room.name}`);
                console.log('='.repeat(room.name.length));
                console.log(room.description);
                // Get available connections from this room
                const connections = await this.db.all('SELECT name FROM connections WHERE from_room_id = ? ORDER BY name', [this.currentRoomId]);
                if (connections && connections.length > 0) {
                    const exits = connections.map(c => c.name).join(', ');
                    console.log(`\nExits: ${exits}`);
                }
                else {
                    console.log('\nThere are no obvious exits.');
                }
            }
            else {
                console.log('You are in a void. Something went wrong!');
            }
        }
        catch (error) {
            console.error('Error looking around:', error);
        }
    }
    async move(args) {
        if (args.length === 0) {
            console.log('Move where? Specify a direction (e.g., "go north")');
            return;
        }
        const direction = args[0].toLowerCase();
        try {
            // Find connection from current room with the specified name (case-insensitive)
            const connection = await this.db.get('SELECT * FROM connections WHERE from_room_id = ? AND LOWER(name) = LOWER(?)', [this.currentRoomId, direction]);
            if (!connection) {
                console.log(`You can't go ${direction} from here.`);
                return;
            }
            // Update current room
            this.currentRoomId = connection.to_room_id;
            // Show the new room
            await this.lookAround();
        }
        catch (error) {
            console.error('Error moving:', error);
        }
    }
    async exit() {
        await this.cleanup();
        console.log('Goodbye!');
        this.rl.close();
    }
    async cleanup() {
        if (this.db.isConnected()) {
            await this.db.close();
        }
    }
    async start() {
        console.clear();
        console.log('Welcome to Shadow Kingdom!');
        console.log('Initializing game world...\n');
        try {
            await this.db.connect();
            await (0, initDb_1.initializeDatabase)(this.db);
            await (0, initDb_1.seedDatabase)(this.db);
            console.log('\nType "help" for available commands.');
            console.log('Type "look" to see where you are.\n');
            // Show initial room
            await this.lookAround();
            this.rl.prompt();
        }
        catch (error) {
            console.error('Failed to initialize game:', error);
            process.exit(1);
        }
    }
}
const cli = new CLI();
cli.start();
//# sourceMappingURL=index.js.map