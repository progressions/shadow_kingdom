#!/usr/bin/env node

import * as readline from 'readline';
import Database from './utils/database';
import { GrokClient } from './ai/grokClient';
import { UnifiedNLPEngine } from './nlp/unifiedNLPEngine';
import { GameContext } from './nlp/types';
import { getNLPConfig, applyEnvironmentOverrides } from './nlp/config';
import { CommandRouter, Command, CommandExecutionContext } from './services/commandRouter';
import { GameStateManager, Mode } from './services/gameStateManager';
import { RoomDisplayService } from './services/roomDisplayService';
import { RoomGenerationService } from './services/roomGenerationService';
import { BackgroundGenerationService } from './services/backgroundGenerationService';
import { GameManagementService } from './services/gameManagementService';
import { RegionService } from './services/regionService';


// Interfaces imported from GameStateManager
import { Game, Room, Connection, GameState } from './services/gameStateManager';

export class GameController {
  private rl: readline.Interface;
  private db: Database;
  private grokClient: GrokClient;
  private nlpEngine: UnifiedNLPEngine;
  private commandRouter: CommandRouter;
  private gameStateManager: GameStateManager;
  private roomDisplayService: RoomDisplayService;
  private roomGenerationService: RoomGenerationService;
  private backgroundGenerationService: BackgroundGenerationService;
  private gameManagementService: GameManagementService;
  private regionService: RegionService;

  constructor(db: Database) {
    this.db = db;
    this.grokClient = new GrokClient();
    
    // Initialize unified NLP engine with configuration
    const baseConfig = getNLPConfig();
    const config = applyEnvironmentOverrides(baseConfig);
    this.nlpEngine = new UnifiedNLPEngine(this.grokClient, config);
    
    // Initialize game state manager
    this.gameStateManager = new GameStateManager(db, {
      enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
    });
    
    // Initialize command router
    this.commandRouter = new CommandRouter(this.nlpEngine, {
      enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
    });
    
    // Initialize room display service
    this.roomDisplayService = new RoomDisplayService({
      enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
    });
    
    // Initialize region service first
    this.regionService = new RegionService(db, {
      enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
    });

    // Initialize room generation service with region service
    this.roomGenerationService = new RoomGenerationService(db, this.grokClient, this.regionService, {
      enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
    });
    
    // Initialize background generation service
    this.backgroundGenerationService = new BackgroundGenerationService(db, this.roomGenerationService, {
      enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
    });
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'menu> '
    });
    
    // Initialize game management service
    this.gameManagementService = new GameManagementService(db, this.rl, {
      enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
    });

    this.setupMenuCommands();
    this.setupGameCommands();
    this.setupEventHandlers();
  }

  private setupMenuCommands() {
    this.commandRouter.addMenuCommand({
      name: 'help',
      description: 'Show available menu commands',
      handler: () => this.commandRouter.showHelp('menu')
    });

    this.commandRouter.addMenuCommand({
      name: 'new',
      description: 'Start a new game',
      handler: async () => await this.startNewGame()
    });

    this.commandRouter.addMenuCommand({
      name: 'load',
      description: 'Load an existing game',
      handler: async () => await this.loadGame()
    });

    this.commandRouter.addMenuCommand({
      name: 'delete',
      description: 'Delete a saved game',
      handler: async () => await this.deleteGame()
    });

    this.commandRouter.addMenuCommand({
      name: 'clear',
      description: 'Clear the screen',
      handler: () => {
        console.clear();
        this.showWelcome();
      }
    });

    this.commandRouter.addMenuCommand({
      name: 'nlp-stats',
      description: 'Show natural language processing statistics',
      handler: () => this.showNLPStats()
    });

    this.commandRouter.addMenuCommand({
      name: 'exit',
      description: 'Exit Shadow Kingdom',
      handler: () => this.exit()
    });

    this.commandRouter.addMenuCommand({
      name: 'quit',
      description: 'Quit Shadow Kingdom (alias for "exit")',
      handler: () => this.exit()
    });
  }

  private setupGameCommands() {
    this.commandRouter.addGameCommand({
      name: 'help',
      description: 'Show available commands',
      handler: () => this.commandRouter.showHelp('game')
    });

    this.commandRouter.addGameCommand({
      name: 'look',
      description: 'Look around the current room',
      handler: async () => await this.lookAround()
    });

    this.commandRouter.addGameCommand({
      name: 'go',
      description: 'Move in a direction (e.g., "go north")',
      handler: async (args) => await this.move(args)
    });

    this.commandRouter.addGameCommand({
      name: 'move',
      description: 'Move in a direction (alias for "go")',
      handler: async (args) => await this.move(args)
    });

    // Cardinal direction shortcuts
    this.commandRouter.addGameCommand({
      name: 'north',
      description: 'Move north',
      handler: async () => await this.move(['north'])
    });

    this.commandRouter.addGameCommand({
      name: 'south',
      description: 'Move south',
      handler: async () => await this.move(['south'])
    });

    this.commandRouter.addGameCommand({
      name: 'east',
      description: 'Move east',
      handler: async () => await this.move(['east'])
    });

    this.commandRouter.addGameCommand({
      name: 'west',
      description: 'Move west',
      handler: async () => await this.move(['west'])
    });

    this.commandRouter.addGameCommand({
      name: 'up',
      description: 'Move up',
      handler: async () => await this.move(['up'])
    });

    this.commandRouter.addGameCommand({
      name: 'down',
      description: 'Move down',
      handler: async () => await this.move(['down'])
    });

    // Short aliases for cardinal directions
    this.commandRouter.addGameCommand({
      name: 'n',
      description: 'Move north (shortcut)',
      handler: async () => await this.move(['north'])
    });

    this.commandRouter.addGameCommand({
      name: 's',
      description: 'Move south (shortcut)',
      handler: async () => await this.move(['south'])
    });

    this.commandRouter.addGameCommand({
      name: 'e',
      description: 'Move east (shortcut)',
      handler: async () => await this.move(['east'])
    });

    this.commandRouter.addGameCommand({
      name: 'w',
      description: 'Move west (shortcut)',
      handler: async () => await this.move(['west'])
    });

    this.commandRouter.addGameCommand({
      name: 'echo',
      description: 'Echo back the provided text',
      handler: (args) => console.log(args.join(' '))
    });

    this.commandRouter.addGameCommand({
      name: 'clear',
      description: 'Clear the screen',
      handler: () => {
        console.clear();
        console.log('Welcome to Shadow Kingdom!');
      }
    });

    this.commandRouter.addGameCommand({
      name: 'exit',
      description: 'Exit to main menu',
      handler: async () => await this.returnToMenu()
    });

    this.commandRouter.addGameCommand({
      name: 'quit',
      description: 'Quit to main menu (alias for "exit")',
      handler: async () => await this.returnToMenu()
    });

    this.commandRouter.addGameCommand({
      name: 'menu',
      description: 'Return to main menu',
      handler: async () => await this.returnToMenu()
    });

    // Region debug commands
    this.commandRouter.addGameCommand({
      name: 'region',
      description: 'Show current room region information',
      handler: async () => await this.showRegionInfo()
    });

    this.commandRouter.addGameCommand({
      name: 'regions',
      description: 'List all regions in current game',
      handler: async () => await this.listRegions()
    });

    this.commandRouter.addGameCommand({
      name: 'region-stats',
      description: 'Show region statistics for current game',
      handler: async () => await this.showRegionStats()
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


  private async processCommand(input: string) {
    if (!input) return;

    // Add command to game state manager's history
    this.gameStateManager.addRecentCommand(input);

    // Create execution context
    const executionContext: CommandExecutionContext = {
      mode: this.gameStateManager.getCurrentSession().mode,
      gameContext: await this.gameStateManager.buildGameContext(),
      recentCommands: this.gameStateManager.getRecentCommands()
    };

    // Delegate to command router
    await this.commandRouter.processCommand(input, executionContext);
  }


  private showWelcome() {
    console.log('Welcome to Shadow Kingdom!');
    console.log('A dynamic, AI-powered text adventure.');
    console.log('\nType "help" for commands or "new" to start a new game.\n');
  }

  private showNLPStats() {
    console.log('\n📊 Natural Language Processing Statistics');
    console.log('=========================================');
    
    const commandStats = this.commandRouter.getStats();
    const nlpStats = commandStats.nlpStats;
    const config = this.nlpEngine.getConfig();
    
    console.log('\n🎮 Command Router Statistics:');
    console.log(`  Menu commands registered: ${commandStats.menuCommandCount}`);
    console.log(`  Game commands registered: ${commandStats.gameCommandCount}`);
    console.log(`  Total commands registered: ${commandStats.totalCommands}`);
    
    console.log('\n🎯 Processing Statistics:');
    console.log(`  Total commands processed: ${nlpStats.totalCommands}`);
    console.log(`  Local pattern matches: ${nlpStats.localMatches} (${(nlpStats.localSuccessRate * 100).toFixed(1)}%)`);
    console.log(`  AI fallback matches: ${nlpStats.aiMatches} (${(nlpStats.aiSuccessRate * 100).toFixed(1)}%)`);
    console.log(`  Failed to parse: ${nlpStats.failures} (${((nlpStats.failures / nlpStats.totalCommands) * 100 || 0).toFixed(1)}%)`);
    console.log(`  Overall success rate: ${(nlpStats.successRate * 100).toFixed(1)}%`);
    console.log(`  Average processing time: ${nlpStats.avgProcessingTime.toFixed(2)}ms`);
    
    console.log('\n⚙️  Configuration:');
    console.log(`  Local confidence threshold: ${(config.localConfidenceThreshold * 100).toFixed(0)}%`);
    console.log(`  AI confidence threshold: ${(config.aiConfidenceThreshold * 100).toFixed(0)}%`);
    console.log(`  AI fallback enabled: ${config.enableAIFallback ? 'Yes' : 'No'}`);
    console.log(`  Max processing time: ${config.maxProcessingTime}ms`);
    console.log(`  Debug logging: ${config.enableDebugLogging ? 'Enabled' : 'Disabled'}`);
    
    console.log('\n🧠 Local Processor:');
    console.log(`  Patterns loaded: ${nlpStats.localProcessor.patternsLoaded}`);
    console.log(`  Synonyms loaded: ${nlpStats.localProcessor.synonymsLoaded}`);
    console.log(`  Uptime: ${nlpStats.localProcessor.uptimeMs}ms`);
    
    if (config.enableAIFallback) {
      console.log('\n🤖 AI Usage:');
      console.log(`  Estimated cost: ${nlpStats.aiUsage.estimatedCost}`);
      console.log(`  Tokens used: ${nlpStats.aiUsage.tokensUsed.input} input, ${nlpStats.aiUsage.tokensUsed.output} output`);
    }
    
    console.log('\n💡 Tip: Use NLP_DEBUG_LOGGING=true to see real-time processing details.\n');
  }

  private async startNewGame() {
    console.log('Starting a new game...\n');
    
    const result = await this.gameManagementService.createNewGame();
    
    if (!result.success) {
      console.log(result.error || 'Failed to create new game. Returning to main menu.');
      return;
    }
    
    if (result.gameId && result.gameName) {
      // Start game session using game state manager
      await this.gameStateManager.startGameSession(result.gameId);
      this.rl.setPrompt('> ');
      
      console.clear();
      console.log(`Welcome to Shadow Kingdom!`);
      console.log(`Game: ${result.gameName}`);
      console.log('Initializing game world...\n');
      console.log('\nType "help" for available commands.');
      console.log('Type "look" to see where you are.');
      console.log('Type "menu" to return to main menu.\n');
      
      // Show initial room
      await this.lookAround();
    }
  }

  private async loadGame() {
    console.log('Loading existing games...\n');
    
    const result = await this.gameManagementService.selectGameFromList('load');
    
    if (!result.success) {
      console.log(result.error || 'Failed to load game.');
      return;
    }
    
    if (result.cancelled) {
      console.log('Cancelled.');
      return;
    }
    
    if (result.game) {
      await this.loadSelectedGame(result.game);
    }
  }

  private async deleteGame() {
    console.log('Deleting games...\n');
    
    const result = await this.gameManagementService.selectGameFromList('delete');
    
    if (!result.success) {
      console.log(result.error || 'Failed to delete game.');
      return;
    }
    
    if (result.cancelled) {
      console.log('Cancelled.');
      return;
    }
    
    if (result.game) {
      const deleteResult = await this.gameManagementService.deleteGameWithConfirmation(result.game);
      
      if (deleteResult.success) {
        console.log(`Game "${result.game.name}" has been deleted.`);
      } else {
        console.log(deleteResult.error || 'Deletion failed.');
      }
    }
  }

  private async returnToMenu() {
    console.log('Returning to main menu...');
    
    // End game session (automatically saves state)
    await this.gameStateManager.endGameSession();
    
    this.rl.setPrompt('menu> ');
    console.clear();
    this.showWelcome();
  }

  private async lookAround() {
    if (!this.gameStateManager.isInGame()) {
      this.roomDisplayService.displayNoGameLoaded();
      return;
    }

    const session = this.gameStateManager.getCurrentSession();

    try {
      const room = await this.gameStateManager.getCurrentRoom();

      if (room) {
        // Mark room as processed when player visits it (locks in the current design)
        await this.db.run(
          'UPDATE rooms SET generation_processed = TRUE WHERE id = ? AND generation_processed = FALSE',
          [session.roomId]
        );

        // Get available connections from this room within this game
        const connections = await this.gameStateManager.getCurrentRoomConnections();
        
        // Use room display service to format and display the room
        this.roomDisplayService.displayRoom(room, connections);

        // Trigger background room generation (fire and forget)
        this.backgroundGenerationService.preGenerateAdjacentRooms(session.roomId!, session.gameId!);
      } else {
        this.roomDisplayService.displayVoidState();
      }
    } catch (error) {
      this.roomDisplayService.displayError('Error looking around', error as Error);
    }
  }

  private async move(args: string[]) {
    if (!this.gameStateManager.isInGame()) {
      this.roomDisplayService.displayNoGameLoaded();
      return;
    }

    if (args.length === 0) {
      console.log('Move where? Specify a direction (e.g., "go north")');
      return;
    }

    const userInput = args.join(' ').toLowerCase();

    try {
      // Find connection by either direction or thematic name (case-insensitive)
      const connection = await this.gameStateManager.findConnection(userInput);

      if (!connection) {
        // Try NLP processing to interpret the movement command
        const context = await this.gameStateManager.buildGameContext();
        const nlpResult = await this.nlpEngine.processCommand(`go ${userInput}`, context);
        
        if (nlpResult && nlpResult.action === 'go' && nlpResult.params.length > 0) {
          // Try again with the NLP-resolved direction
          const resolvedDirection = nlpResult.params[0];
          const nlpConnection = await this.gameStateManager.findConnection(resolvedDirection);
          
          if (nlpConnection) {
            if (process.env.AI_DEBUG_LOGGING === 'true') {
              const sourceIcon = nlpResult.source === 'local' ? '🎯' : '🤖';
              console.log(`${sourceIcon} NLP resolved "${userInput}" → "${resolvedDirection}"`);
              if (nlpResult.reasoning) {
                console.log(`   Reasoning: ${nlpResult.reasoning}`);
              }
            }
            
            // Move to the new room using game state manager
            await this.gameStateManager.moveToRoom(nlpConnection.to_room_id);
            
            // Show the new room
            await this.lookAround();
            return;
          } else {
            // NLP resolved direction but no connection exists - try to generate room
            // Fall through to check if resolved direction is a basic direction
          }
        }

        // No valid connection found - show appropriate error
        
        this.roomDisplayService.displayMovementError(userInput);
        return;
      }

      // Move to the new room using game state manager
      await this.gameStateManager.moveToRoom(connection.to_room_id);
      
      // Show the new room
      await this.lookAround();
      
    } catch (error) {
      console.error('Error moving:', error);
    }
  }

  private async exit() {
    await this.cleanup();
    this.rl.close();
  }

  private async cleanup() {
    // Don't close DB connection
  }



  private async loadSelectedGame(game: Game) {
    try {
      // Start game session using game state manager
      await this.gameStateManager.startGameSession(game.id);
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



  public async start() {
    console.clear();
    this.showWelcome();
    this.rl.prompt();
  }

  /**
   * Show region information for the current room
   */
  private async showRegionInfo(): Promise<void> {
    try {
      const session = this.gameStateManager.getCurrentSession();
      if (!session.gameId || !session.roomId) {
        console.log('No active game session.');
        return;
      }

      const room = await this.db.get<any>('SELECT * FROM rooms WHERE id = ?', [session.roomId]);
      if (!room) {
        console.log('Current room not found.');
        return;
      }

      if (!room.region_id) {
        console.log('Current room is not part of any region.');
        return;
      }

      const region = await this.regionService.getRegion(room.region_id);
      if (!region) {
        console.log('Region not found.');
        return;
      }

      const roomsInRegion = await this.regionService.getRoomsInRegion(region.id);
      
      let output = `\nCurrent Region: ${region.name || region.type}\n`;
      output += `Type: ${region.type}\n`;
      output += `Description: ${region.description}\n`;
      output += `Distance from center: ${room.region_distance}\n`;
      output += `Total rooms in region: ${roomsInRegion.length}\n`;
      
      if (region.center_room_id) {
        const centerRoom = await this.db.get<any>('SELECT * FROM rooms WHERE id = ?', [region.center_room_id]);
        output += `Center room: ${centerRoom?.name || 'Unknown'}\n`;
      } else {
        output += `Center: Not yet discovered\n`;
      }
      
      console.log(output);
    } catch (error) {
      console.error('Error showing region info:', error);
    }
  }

  /**
   * List all regions in the current game
   */
  private async listRegions(): Promise<void> {
    try {
      const session = this.gameStateManager.getCurrentSession();
      if (!session.gameId) {
        console.log('No active game session.');
        return;
      }

      const regions = await this.regionService.getRegionsForGame(session.gameId);
      
      if (regions.length === 0) {
        console.log('No regions found in current game.');
        return;
      }

      let output = '\nRegions in current game:\n';
      for (const region of regions) {
        const roomCount = await this.db.get<{count: number}>(
          'SELECT COUNT(*) as count FROM rooms WHERE region_id = ?',
          [region.id]
        );
        
        output += `- ${region.name || region.type} (${region.type}): ${roomCount?.count || 0} rooms\n`;
      }
      
      console.log(output);
    } catch (error) {
      console.error('Error listing regions:', error);
    }
  }

  /**
   * Show detailed region statistics for the current game
   */
  private async showRegionStats(): Promise<void> {
    try {
      const session = this.gameStateManager.getCurrentSession();
      if (!session.gameId) {
        console.log('No active game session.');
        return;
      }

      const stats = await this.regionService.getRegionStats(session.gameId);
      
      if (stats.length === 0) {
        console.log('No regions found in current game.');
        return;
      }

      let output = '\nRegion Statistics:\n';
      output += '==================\n';
      
      for (const stat of stats) {
        const region = stat.region;
        output += `\n${region.name || region.type} (${region.type})\n`;
        output += `  Rooms: ${stat.roomCount}\n`;
        output += `  Center: ${stat.hasCenter ? 'Discovered' : 'Not yet found'}\n`;
        output += `  Description: ${region.description}\n`;
        
        if (stat.hasCenter && region.center_room_id) {
          const centerRoom = await this.db.get<any>('SELECT * FROM rooms WHERE id = ?', [region.center_room_id]);
          output += `  Center room: ${centerRoom?.name || 'Unknown'}\n`;
        }
      }
      
      console.log(output);
    } catch (error) {
      console.error('Error showing region stats:', error);
    }
  }
}