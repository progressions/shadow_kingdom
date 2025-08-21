#!/usr/bin/env node

import { InkTUIBridge } from './ui/InkTUIBridge';
import { TUIInterface } from './ui/TUIInterface';
import { GameState as TUIGameState } from './ui/StatusManager';
import { MessageType } from './ui/MessageFormatter';
import Database from './utils/database';
import { HistoryManager } from './utils/historyManager';
import { GrokClient } from './ai/grokClient';
import { UnifiedNLPEngine } from './nlp/unifiedNLPEngine';
import { GameContext } from './nlp/types';
import { getNLPConfig, applyEnvironmentOverrides } from './nlp/config';
import { CommandRouter, Command, CommandExecutionContext } from './services/commandRouter';
import { GameStateManager } from './services/gameStateManager';
import { RoomDisplayService } from './services/roomDisplayService';
import { RoomGenerationService } from './services/roomGenerationService';
import { BackgroundGenerationService } from './services/backgroundGenerationService';
import { GameManagementService } from './services/gameManagementService';
import { RegionService } from './services/regionService';
import { ServiceFactory, ServiceInstances } from './services/serviceFactory';
import { ActionValidator } from './services/actionValidator';
import { ValidationResult, ActionContext } from './types/validation';
import { HealthService, HealthStatus } from './services/healthService';
import { EventTriggerService, TriggerContext } from './services/eventTriggerService';


// Interfaces imported from GameStateManager
import { Game, Room, Connection, GameState } from './services/gameStateManager';

interface CommandState {
  isProcessing: boolean;
  currentCommand?: string;
  startTime?: number;
}

export class GameController {
  private tui: TUIInterface;
  private db: Database;
  private historyManager: HistoryManager;
  private grokClient: GrokClient;
  private nlpEngine: UnifiedNLPEngine;
  private commandRouter: CommandRouter;
  private gameStateManager!: ServiceInstances['gameStateManager']; // Initialized in initializeReadlineInterface()
  private roomDisplayService: RoomDisplayService;
  private roomGenerationService!: ServiceInstances['roomGenerationService']; // Initialized in initializeReadlineInterface()
  private backgroundGenerationService!: ServiceInstances['backgroundGenerationService']; // Initialized in initializeReadlineInterface()
  private gameManagementService!: ServiceInstances['gameManagementService']; // Initialized in initializeReadlineInterface()
  private regionService!: ServiceInstances['regionService']; // Initialized in initializeReadlineInterface()
  private itemService!: ServiceInstances['itemService']; // Initialized in initializeReadlineInterface()
  private equipmentService!: ServiceInstances['equipmentService']; // Initialized in initializeReadlineInterface()
  private characterService!: ServiceInstances['characterService']; // Initialized in initializeReadlineInterface()
  private actionValidator!: ServiceInstances['actionValidator']; // Initialized in initializeReadlineInterface()
  private healthService!: ServiceInstances['healthService']; // Initialized in initializeReadlineInterface()
  private eventTriggerService!: ServiceInstances['eventTriggerService']; // Initialized in initializeReadlineInterface()
  private commandState: CommandState;

  constructor(db: Database, tui?: TUIInterface) {
    this.db = db;
    this.grokClient = new GrokClient();
    
    // Initialize command state
    this.commandState = {
      isProcessing: false
    };
    
    // Initialize unified NLP engine with configuration
    const baseConfig = getNLPConfig();
    const config = applyEnvironmentOverrides(baseConfig);
    this.nlpEngine = new UnifiedNLPEngine(this.grokClient, config);
    
    // Initialize room display service
    this.roomDisplayService = new RoomDisplayService({
      enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
    });
    
    // Initialize history manager
    const maxHistorySize = parseInt(process.env.COMMAND_HISTORY_SIZE || '100');
    this.historyManager = new HistoryManager(process.env.COMMAND_HISTORY_FILE, maxHistorySize);
    
    // Initialize TUI (use provided TUI or create new one)
    // In test environment, create a mock TUI to avoid blessed.js TTY requirements
    if (tui) {
      this.tui = tui;
    } else if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      // Create a minimal mock TUI for tests
      this.tui = this.createMockTUI();
    } else {
      this.tui = new InkTUIBridge();
    }
    
    // Initialize command router (after TUI is available)
    this.commandRouter = new CommandRouter(this.nlpEngine, this.tui, {
      enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
    });
    
    // Initialize services after command router is ready
    this.initializeServices();
  }

  private setupCommands() {
    this.commandRouter.addCommand({
      name: 'help',
      description: 'Show available commands',
      handler: () => this.commandRouter.showHelp()
    });

    this.commandRouter.addCommand({
      name: 'new',
      description: 'Start a new adventure',
      handler: async () => await this.startNewGame()
    });

    this.commandRouter.addCommand({
      name: 'load',
      description: 'Load an existing adventure',
      handler: async () => await this.loadGame()
    });

    this.commandRouter.addCommand({
      name: 'delete',
      description: 'Delete a saved adventure',
      handler: async () => await this.deleteGame()
    });

    this.commandRouter.addCommand({
      name: 'clear',
      description: 'Clear the screen',
      handler: () => {
        this.tui.clear();
        this.showWelcome();
      }
    });

    this.commandRouter.addCommand({
      name: 'nlp-stats',
      description: 'Show natural language processing statistics',
      handler: () => this.showNLPStats()
    });

    this.commandRouter.addCommand({
      name: 'exit',
      description: 'Exit Shadow Kingdom',
      handler: () => this.exit()
    });

    this.commandRouter.addCommand({
      name: 'quit',
      description: 'Quit Shadow Kingdom (alias for "exit")',
      handler: () => this.exit()
    });

    this.commandRouter.addCommand({
      name: 'games',
      description: 'List all adventures',
      handler: async () => await this.listGames()
    });

    // Gameplay commands
    this.commandRouter.addCommand({
      name: 'look',
      description: 'Look around the current room',
      handler: async () => await this.lookAround()
    });

    this.commandRouter.addCommand({
      name: 'go',
      description: 'Move in a direction (e.g., "go north")',
      handler: async (args) => await this.move(args)
    });

    this.commandRouter.addCommand({
      name: 'move',
      description: 'Move in a direction (alias for "go")',
      handler: async (args) => await this.move(args)
    });

    // Cardinal direction shortcuts
    this.commandRouter.addCommand({
      name: 'north',
      description: 'Move north',
      handler: async () => await this.move(['north'])
    });

    this.commandRouter.addCommand({
      name: 'south',
      description: 'Move south',
      handler: async () => await this.move(['south'])
    });

    this.commandRouter.addCommand({
      name: 'east',
      description: 'Move east',
      handler: async () => await this.move(['east'])
    });

    this.commandRouter.addCommand({
      name: 'west',
      description: 'Move west',
      handler: async () => await this.move(['west'])
    });

    this.commandRouter.addCommand({
      name: 'up',
      description: 'Move up',
      handler: async () => await this.move(['up'])
    });

    this.commandRouter.addCommand({
      name: 'down',
      description: 'Move down',
      handler: async () => await this.move(['down'])
    });

    // Short aliases for cardinal directions
    this.commandRouter.addCommand({
      name: 'n',
      description: 'Move north (shortcut)',
      handler: async () => await this.move(['north'])
    });

    this.commandRouter.addCommand({
      name: 's',
      description: 'Move south (shortcut)',
      handler: async () => await this.move(['south'])
    });

    this.commandRouter.addCommand({
      name: 'e',
      description: 'Move east (shortcut)',
      handler: async () => await this.move(['east'])
    });

    this.commandRouter.addCommand({
      name: 'w',
      description: 'Move west (shortcut)',
      handler: async () => await this.move(['west'])
    });

    this.commandRouter.addCommand({
      name: 'echo',
      description: 'Echo back the provided text',
      handler: (args) => this.tui.display(args.join(' '))
    });

    this.commandRouter.addCommand({
      name: 'clear',
      description: 'Clear the screen',
      handler: () => {
        this.tui.clear();
        this.tui.showWelcome('Welcome to Shadow Kingdom!');
      }
    });

    this.commandRouter.addCommand({
      name: 'exit',
      description: 'Exit Shadow Kingdom',
      handler: () => this.exit()
    });

    this.commandRouter.addCommand({
      name: 'quit',
      description: 'Quit Shadow Kingdom (alias for "exit")',
      handler: () => this.exit()
    });

    // Region debug commands
    this.commandRouter.addCommand({
      name: 'region',
      description: 'Show current room region information',
      handler: async () => await this.showRegionInfo()
    });

    this.commandRouter.addCommand({
      name: 'regions',
      description: 'List all regions in current game',
      handler: async () => await this.listRegions()
    });

    this.commandRouter.addCommand({
      name: 'region-stats',
      description: 'Show region statistics for current game',
      handler: async () => await this.showRegionStats()
    });

    // Item system commands
    this.commandRouter.addCommand({
      name: 'pickup',
      description: 'Pick up an item from the current room',
      handler: async (args) => await this.handlePickup(args.join(' '))
    });

    this.commandRouter.addCommand({
      name: 'get',
      description: 'Pick up an item from the current room (alias for "pickup")',
      handler: async (args) => await this.handlePickup(args.join(' '))
    });

    this.commandRouter.addCommand({
      name: 'take',
      description: 'Pick up an item from the current room (alias for "pickup")',
      handler: async (args) => await this.handlePickup(args.join(' '))
    });

    this.commandRouter.addCommand({
      name: 'inventory',
      description: 'Show your inventory',
      handler: async () => await this.handleInventory()
    });

    this.commandRouter.addCommand({
      name: 'inv',
      description: 'Show your inventory (alias for "inventory")',
      handler: async () => await this.handleInventory()
    });

    this.commandRouter.addCommand({
      name: 'i',
      description: 'Show your inventory (alias for "inventory")',
      handler: async () => await this.handleInventory()
    });

    this.commandRouter.addCommand({
      name: 'drop',
      description: 'Drop an item from your inventory',
      handler: async (args) => await this.handleDrop(args.join(' '))
    });

    this.commandRouter.addCommand({
      name: 'examine',
      description: 'Examine an item in detail',
      handler: async (args) => await this.handleExamine(args.join(' '))
    });

    this.commandRouter.addCommand({
      name: 'ex',
      description: 'Examine an item in detail (alias for "examine")',
      handler: async (args) => await this.handleExamine(args.join(' '))
    });

    this.commandRouter.addCommand({
      name: 'rest',
      description: 'Rest to restore health and energy',
      handler: async () => await this.handleRest()
    });
    this.commandRouter.addCommand({
      name: 'health',
      description: 'Check your health status',
      handler: async () => await this.showHealthStatus()
    });

    this.commandRouter.addCommand({
      name: 'equip',
      description: 'Equip an item from your inventory',
      handler: async (args) => await this.handleEquip(args.join(' '))
    });

    this.commandRouter.addCommand({
      name: 'unequip',
      description: 'Unequip an equipped item',
      handler: async (args) => await this.handleUnequip(args.join(' '))
    });

    this.commandRouter.addCommand({
      name: 'stats',
      description: 'Show your character attributes and status',
      handler: async () => await this.handleStats()
    });

    this.commandRouter.addCommand({
      name: 'character',
      description: 'Show your character attributes and status (alias for "stats")',
      handler: async () => await this.handleStats()
    });

    this.commandRouter.addCommand({
      name: 'equipment',
      description: 'Show your equipped items',
      handler: async () => await this.handleEquipment()
    });
  }

  private async processInput(): Promise<void> {
    while (true) {
      try {
        const input = await this.tui.getInput();
        const command = input.trim();
        if (!command) {
          continue; // Skip empty commands
        }
        
        await this.processCommand(command);
        this.updateStatusDisplay();
      } catch (error) {
        console.error('Input processing error:', error);
        // Continue the loop
      }
    }
  }

  private async handleExit(): Promise<void> {
    await this.cleanup();
    this.tui.display('Goodbye!', MessageType.SYSTEM);
    this.tui.destroy();
    process.exit(0);
  }

  private updateStatusDisplay(): void {
    const gameState = this.getCurrentGameState();
    this.tui.updateStatus(gameState);
  }

  private getCurrentGameState(): TUIGameState {
    try {
      const session = this.gameStateManager.getCurrentSession();
      
      if (!session.gameId) {
        return {};
      }
      
      // Get basic game info (synchronously for now)
      const gameState: TUIGameState = {};
      
      // Fetch game data asynchronously and update later
      this.updateGameStateAsync(session.gameId, gameState);
      
      return gameState;
    } catch (error) {
      return {};
    }
  }

  private async updateGameStateAsync(gameId: number, gameState: TUIGameState): Promise<void> {
    try {
      // Get game name
      const game = await this.gameManagementService.getGameById(gameId);
      if (game) {
        gameState.gameName = new Date(game.last_played_at).toLocaleString();
      }
      
      // Get room count
      const roomCountResult = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM rooms WHERE game_id = ?',
        [gameId]
      );
      if (roomCountResult) {
        gameState.roomCount = roomCountResult.count;
      }
      
      // Get current room name
      const session = this.gameStateManager.getCurrentSession();
      if (session.roomId) {
        const room = await this.db.get<{ name: string }>(
          'SELECT name FROM rooms WHERE id = ?',
          [session.roomId]
        );
        if (room) {
          gameState.currentRoomName = room.name;
        }
      }
      
      // Update the TUI display
      this.tui.updateStatus(gameState);
    } catch (error) {
      // Silent fail - status will just show basic info
    }
  }

  /**
   * Remove event listeners (for test cleanup)
   */
  public removeEventListeners() {
    // TUI cleanup handled by destroy method
  }

  /**
   * Cleanup method for test environments
   * Cleans up HTTP connections and other resources
   */
  public cleanup() {
    if (this.grokClient) {
      this.grokClient.cleanup();
    }
  }


  private async processCommand(input: string) {
    if (!input) return;

    // Allow certain commands even during processing (quit, exit, help)
    const allowedDuringProcessing = ['quit', 'exit', 'help', 'q'];
    const commandName = input.split(' ')[0].toLowerCase();
    
    // Check if a command is currently processing and this isn't an allowed command
    if (this.commandState.isProcessing && !allowedDuringProcessing.includes(commandName)) {
      const elapsed = Date.now() - (this.commandState.startTime || 0);
      const elapsedSeconds = Math.floor(elapsed / 1000);
      this.tui.display(`⏳ Please wait for the current command to complete... (${elapsedSeconds}s elapsed)`, MessageType.SYSTEM);
      this.tui.display(`📋 Processing: "${this.commandState.currentCommand}"`, MessageType.SYSTEM);
      this.tui.display(`💡 Tip: You can still type "quit" or "help" commands`, MessageType.SYSTEM);
      return;
    }

    try {
      // Mark command as processing (unless it's a quick command like help/quit)
      if (!allowedDuringProcessing.includes(commandName)) {
        this.commandState.isProcessing = true;
        this.commandState.currentCommand = input;
        this.commandState.startTime = Date.now();
      }

      // Add command to game state manager's history
      this.gameStateManager.addRecentCommand(input);

      // Create execution context
      const executionContext: CommandExecutionContext = {
        gameContext: await this.gameStateManager.buildGameContext(),
        recentCommands: this.gameStateManager.getRecentCommands()
      };

      // Delegate to command router
      await this.commandRouter.processCommand(input, executionContext);
    } finally {
      // Reset command state (only if we set it)
      if (!allowedDuringProcessing.includes(commandName)) {
        this.commandState = {
          isProcessing: false
        };
      }
    }
  }


  private showWelcome() {
    this.tui.showWelcome('Welcome to Shadow Kingdom!');
    this.tui.display('A dynamic, AI-powered text adventure.');
    this.tui.display('Type "help" for commands or "new" to start a new adventure.');
  }

  private showNLPStats() {
    this.tui.display('📊 Natural Language Processing Statistics', MessageType.NORMAL);
    this.tui.display('=========================================', MessageType.NORMAL);
    
    const commandStats = this.commandRouter.getStats();
    const nlpStats = commandStats.nlpStats;
    const config = this.nlpEngine.getConfig();
    
    this.tui.display('🎮 Command Router Statistics:', MessageType.NORMAL);
    this.tui.display(`  Commands registered: ${commandStats.totalCommands}`, MessageType.NORMAL);
    this.tui.display(`  Game commands registered: ${commandStats.gameCommandCount}`, MessageType.NORMAL);
    this.tui.display(`  Total commands registered: ${commandStats.totalCommands}`, MessageType.NORMAL);
    
    this.tui.display('🎯 Processing Statistics:', MessageType.NORMAL);
    this.tui.display(`  Total commands processed: ${nlpStats.totalCommands}`, MessageType.NORMAL);
    this.tui.display(`  Local pattern matches: ${nlpStats.localMatches} (${(nlpStats.localSuccessRate * 100).toFixed(1)}%)`, MessageType.NORMAL);
    this.tui.display(`  AI fallback matches: ${nlpStats.aiMatches} (${(nlpStats.aiSuccessRate * 100).toFixed(1)}%)`, MessageType.NORMAL);
    this.tui.display(`  Failed to parse: ${nlpStats.failures} (${((nlpStats.failures / nlpStats.totalCommands) * 100 || 0).toFixed(1)}%)`, MessageType.NORMAL);
    this.tui.display(`  Overall success rate: ${(nlpStats.successRate * 100).toFixed(1)}%`, MessageType.NORMAL);
    this.tui.display(`  Average processing time: ${nlpStats.avgProcessingTime.toFixed(2)}ms`, MessageType.NORMAL);
    
    this.tui.display('⚙️  Configuration:', MessageType.NORMAL);
    this.tui.display(`  Local confidence threshold: ${(config.localConfidenceThreshold * 100).toFixed(0)}%`, MessageType.NORMAL);
    this.tui.display(`  AI confidence threshold: ${(config.aiConfidenceThreshold * 100).toFixed(0)}%`, MessageType.NORMAL);
    this.tui.display(`  AI fallback enabled: ${config.enableAIFallback ? 'Yes' : 'No'}`, MessageType.NORMAL);
    this.tui.display(`  Max processing time: ${config.maxProcessingTime}ms`, MessageType.NORMAL);
    this.tui.display(`  Debug logging: ${config.enableDebugLogging ? 'Enabled' : 'Disabled'}`, MessageType.NORMAL);
    
    this.tui.display('🧠 Local Processor:', MessageType.NORMAL);
    this.tui.display(`  Patterns loaded: ${nlpStats.localProcessor.patternsLoaded}`, MessageType.NORMAL);
    this.tui.display(`  Synonyms loaded: ${nlpStats.localProcessor.synonymsLoaded}`, MessageType.NORMAL);
    this.tui.display(`  Uptime: ${nlpStats.localProcessor.uptimeMs}ms`, MessageType.NORMAL);
    
    if (config.enableAIFallback) {
      this.tui.display('🤖 AI Usage:', MessageType.NORMAL);
      this.tui.display(`  Estimated cost: ${nlpStats.aiUsage.estimatedCost}`, MessageType.NORMAL);
      this.tui.display(`  Tokens used: ${nlpStats.aiUsage.tokensUsed.input} input, ${nlpStats.aiUsage.tokensUsed.output} output`, MessageType.NORMAL);
    }
    
    this.tui.display('💡 Tip: Use NLP_DEBUG_LOGGING=true to see real-time processing details.', MessageType.NORMAL);
  }

  private async startNewGame() {
    this.tui.display('Creating a new adventure...', MessageType.SYSTEM);
    
    // Create game automatically with timestamp name - no user input required
    const result = await this.gameManagementService.createGameAutomatic();
    
    if (!result.success) {
      this.tui.display(result.error || 'Failed to create new adventure.', MessageType.ERROR);
      return;
    }
    
    if (result.game) {
      // Start game session using game state manager
      await this.gameStateManager.startGameSession(result.game.id);
      
      this.tui.clear();
      this.tui.showWelcome('Welcome to Shadow Kingdom!');
      this.tui.display(`Adventure: ${new Date(result.game.created_at).toLocaleString()}`);
      this.tui.display('Initializing game world...');
      this.tui.display('Type "help" for available commands.');
      this.tui.display('Type "look" to see where you are.');
      this.tui.display('Type "games" to manage adventures.');
      
      // Show initial room
      await this.lookAround();
      this.updateStatusDisplay();
      
      // Start input processing loop
      this.processInput();
    }
  }

  private async loadGame() {
    this.tui.display('Loading existing games...', MessageType.SYSTEM);
    
    const game = await this.selectGameFromTUI('load');
    
    if (game) {
      await this.loadSelectedGame(game);
    }
  }

  private async deleteGame() {
    this.tui.display('Deleting games...', MessageType.SYSTEM);
    
    const game = await this.selectGameFromTUI('delete');
    
    if (game) {
      // Confirm deletion via TUI
      this.tui.display(`Are you sure you want to delete the adventure from ${new Date(game.last_played_at).toLocaleString()}?`, MessageType.SYSTEM);
      this.tui.display('This action cannot be undone.', MessageType.SYSTEM);
      this.tui.display('Type "yes" to confirm, or anything else to cancel:', MessageType.SYSTEM);
      
      const confirmation = await this.tui.getInput();
      
      if (confirmation.toLowerCase() === 'yes') {
        const deleteResult = await this.gameManagementService.deleteGameById(game.id);
        if (deleteResult.success) {
          this.tui.display(`Adventure from ${new Date(game.last_played_at).toLocaleString()} has been deleted.`, MessageType.SYSTEM);
        } else {
          this.tui.display(deleteResult.error || 'Deletion failed.', MessageType.ERROR);
        }
      } else {
        this.tui.display('Deletion cancelled.', MessageType.SYSTEM);
      }
    }
  }

  private async listGames() {
    try {
      const games = await this.gameManagementService.getAllGames();
      
      if (games.length === 0) {
        this.tui.display('No adventures found. Type "new" to start your first adventure!', MessageType.SYSTEM);
        return;
      }
      
      this.tui.display('Your adventures:', MessageType.SYSTEM);
      this.tui.display('================', MessageType.SYSTEM);
      
      games.forEach((game: any, index: number) => {
        const isCurrentGame = this.gameStateManager.getCurrentSession().gameId === game.id;
        const status = isCurrentGame ? ' (current)' : '';
        const lastPlayed = new Date(game.last_played_at).toLocaleString();
        this.tui.display(`${index + 1}. Last played: ${lastPlayed}${status}`);
      });
      
      this.tui.display('\nType "load [number]" to switch to an adventure, or "new" to start a new one.', MessageType.SYSTEM);
    } catch (error) {
      this.tui.display('Error listing adventures: ' + error, MessageType.ERROR);
    }
  }

  private async selectGameFromTUI(purpose: 'load' | 'delete'): Promise<Game | null> {
    try {
      const games = await this.gameManagementService.getAllGames();

      if (!games || games.length === 0) {
        const message = purpose === 'load' ? 'No saved games found. Create a new game first.' : 'No saved games found to delete.';
        this.tui.display(message, MessageType.SYSTEM);
        return null;
      }

      const actionText = purpose === 'load' ? 'load' : 'delete';
      this.tui.display(`Select a game to ${actionText}:`, MessageType.SYSTEM);
      
      games.forEach((game: any, index: number) => {
        const lastPlayed = new Date(game.last_played_at).toLocaleDateString();
        this.tui.display(`${index + 1}. Last played: ${lastPlayed}`, MessageType.SYSTEM);
      });
      this.tui.display('0. Cancel', MessageType.SYSTEM);

      const choice = await this.tui.getInput();
      const choiceNum = parseInt(choice.trim());

      if (isNaN(choiceNum) || choiceNum === 0) {
        this.tui.display('Cancelled.', MessageType.SYSTEM);
        return null;
      }

      if (choiceNum < 1 || choiceNum > games.length) {
        this.tui.display('Invalid choice. Please select a number from the list.', MessageType.ERROR);
        return await this.selectGameFromTUI(purpose); // Recursively ask again
      }

      return games[choiceNum - 1];
    } catch (error) {
      this.tui.display('Error loading games list.', MessageType.ERROR);
      return null;
    }
  }


  private async lookAround() {
    if (!this.gameStateManager.isInGame()) {
      this.tui.display('No game is currently loaded.', MessageType.SYSTEM);
      return;
    }

    const session = this.gameStateManager.getCurrentSession();

    try {
      const room = await this.gameStateManager.getCurrentRoom();

      if (room) {
        // Trigger automatic room generation on entry (new auto-generation feature)
        this.backgroundGenerationService.generateForRoomEntry(session.roomId!, session.gameId!);
        
        // Trigger background generation for unfilled connections (existing system)
        this.backgroundGenerationService.preGenerateAdjacentRooms(session.roomId!, session.gameId!);

        // Get available connections from this room within this game
        const connections = await this.gameStateManager.getCurrentRoomConnections();
        
        // Use TUI to display the room
        const exitNames = connections.map((c: any) => c.name === c.direction ? c.direction : `${c.name} (${c.direction})`);
        this.tui.displayRoom(room.name, room.description, exitNames);
        
        // Display items in the room
        const roomItems = await this.itemService.getRoomItems(room.id);
        if (roomItems.length > 0) {
          this.tui.display('', MessageType.NORMAL); // Add spacing
          this.tui.display('You see:', MessageType.SYSTEM);
          roomItems.forEach(roomItem => {
            const quantityText = roomItem.quantity > 1 ? ` x${roomItem.quantity}` : '';
            this.tui.display(`• ${roomItem.item.name}${quantityText}`, MessageType.NORMAL);
          });
        }
      } else {
        this.tui.display('You are in a void. Something went wrong!', MessageType.ERROR);
      }
    } catch (error) {
      this.tui.showError('Error looking around', (error as Error)?.message);
    }
  }

  private async move(args: string[]) {
    if (!this.gameStateManager.isInGame()) {
      this.tui.display('No game is currently loaded.', MessageType.SYSTEM);
      return;
    }

    if (args.length === 0) {
      this.tui.display('Move where? Specify a direction (e.g., "go north")', MessageType.SYSTEM);
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
              this.tui.display(`${sourceIcon} NLP resolved "${userInput}" → "${resolvedDirection}"`, MessageType.SYSTEM);
              if (nlpResult.reasoning) {
                this.tui.display(`   Reasoning: ${nlpResult.reasoning}`, MessageType.SYSTEM);
              }
            }
            
            // Check if NLP connection needs room generation
            if (!nlpConnection.to_room_id) {
              this.tui.showAIProgress('Generating new room', resolvedDirection);
              
              // Generate room synchronously for unfilled connection
              const unfilledConnection = nlpConnection as any; // Cast to allow null to_room_id
              const generationResult = await this.roomGenerationService.generateRoomForConnection(unfilledConnection);
              
              if (!generationResult.success) {
                this.tui.display('❌ Failed to generate room. You cannot go that way.', MessageType.ERROR);
                return;
              }
              
              // Update connection with newly generated room
              nlpConnection.to_room_id = generationResult.roomId!;
              this.tui.display('✅ Room generation complete!', MessageType.AI_GENERATION);
            }
            
            // Move to the new room using game state manager
            await this.gameStateManager.moveToRoom(nlpConnection.to_room_id);
            
            // Show the new room
            await this.lookAround();
            
            // Update status display after room change
            this.updateStatusDisplay();
            return;
          } else {
            // NLP resolved direction but no connection exists - try to generate room
            // Fall through to check if resolved direction is a basic direction
          }
        }

        // No valid connection found - show appropriate error
        
        this.tui.display(`You can't go ${userInput} from here.`, MessageType.ERROR);
        return;
      }

      // Check if connection needs room generation
      if (!connection.to_room_id) {
        this.tui.showAIProgress('Generating new room', userInput);
        
        // Generate room synchronously for unfilled connection
        const unfilledConnection = connection as any; // Cast to allow null to_room_id
        const generationResult = await this.roomGenerationService.generateRoomForConnection(unfilledConnection);
        
        if (!generationResult.success) {
          this.tui.display('❌ Failed to generate room. You cannot go that way.', MessageType.ERROR);
          return;
        }
        
        // Update connection with newly generated room
        connection.to_room_id = generationResult.roomId!;
        this.tui.display('✅ Room generation complete!', MessageType.AI_GENERATION);
      }
      
      // Move to the new room using game state manager
      await this.gameStateManager.moveToRoom(connection.to_room_id);
      
      // Show the new room
      await this.lookAround();
      
      // Update status display after room change
      this.updateStatusDisplay();
      
    } catch (error) {
      console.error('Error moving:', error);
    }
  }

  private async exit() {
    await this.cleanup();
    this.tui.display('Goodbye!', MessageType.SYSTEM);
    this.tui.destroy();
    process.exit(0);
  }




  private async loadSelectedGame(game: Game) {
    try {
      // Start game session using game state manager
      await this.gameStateManager.startGameSession(game.id);
      
      this.tui.clear();
      this.tui.showWelcome('Welcome back to Shadow Kingdom!');
      this.tui.display(`Adventure: ${new Date(game.last_played_at).toLocaleString()}`);
      this.tui.display('Loading your saved game...');
      this.tui.display('Type "help" for available commands.');
      this.tui.display('Type "look" to see where you are.');
      this.tui.display('Type "games" to manage adventures.');
      
      // Show current room
      await this.lookAround();
      this.updateStatusDisplay();
      
      // Start input processing loop
      this.processInput();
    } catch (error) {
      console.error('Failed to load selected game:', error);
    }
  }

  /**
   * Initialize services (called from constructor for backward compatibility)
   */
  private initializeServices(): void {
    // Initialize services
    const serviceOptions = {
      enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
    };
    
    ServiceFactory.logConfiguration();
    
    const services = ServiceFactory.createServices(this.db, this.tui, this.grokClient, serviceOptions);
    
    // Assign services from factory
    this.gameStateManager = services.gameStateManager;
    this.gameManagementService = services.gameManagementService;
    this.regionService = services.regionService;
    this.roomGenerationService = services.roomGenerationService;
    this.backgroundGenerationService = services.backgroundGenerationService;
    this.itemService = services.itemService;
    this.equipmentService = services.equipmentService;
    this.characterService = services.characterService;
    this.actionValidator = services.actionValidator;
    this.healthService = services.healthService;
    this.eventTriggerService = services.eventTriggerService;
    
    // Set up commands
    this.setupCommands();
  }

  /**
   * Initialize TUI interface
   */
  private async initializeTUI(): Promise<void> {
    await this.tui.initialize();
    
    // Configure database to use TUI for output
    this.db.setTUI(this.tui);
    
    this.updateStatusDisplay();
  }

  public async start() {
    // Initialize TUI interface
    await this.initializeTUI();
    
    // Try to automatically load the most recent game
    const mostRecentGame = await this.gameManagementService.getMostRecentGame();
    
    if (mostRecentGame) {
      // Auto-load the most recent game
      this.tui.showWelcome('Welcome back to Shadow Kingdom!');
      this.tui.display(`Continuing adventure from: ${new Date(mostRecentGame.last_played_at).toLocaleString()}`);
      this.tui.display('Type "games" to manage adventures or "help" for commands.');
      
      await this.loadSelectedGame(mostRecentGame);
    } else {
      // No games exist, auto-create new game
      this.tui.showWelcome('Welcome to Shadow Kingdom!');
      this.tui.display('Starting your first adventure...');
      
      const result = await this.gameManagementService.createGameAutomatic();
      if (result.success && result.game) {
        this.tui.display(`Created new adventure: ${new Date(result.game.created_at).toLocaleString()}`);
        await this.loadSelectedGame(result.game);
      } else {
        // Fallback if auto-creation fails
        this.showWelcome();
        this.processInput(); // Start input processing loop
      }
    }
  }

  /**
   * Get current session for testing purposes
   */
  public getCurrentSession() {
    return this.gameStateManager.getCurrentSession();
  }

  /**
   * Create a mock TUI for testing that doesn't use blessed.js
   */
  private createMockTUI(): TUIInterface {
    return {
      initialize: async () => {},
      display: () => {},
      displayLines: () => {},
      showWelcome: () => {},
      showError: () => {},
      getInput: () => Promise.resolve(''),
      updateStatus: () => {},
      clear: () => {},
      destroy: () => {},
      setPrompt: () => {},
      setStatus: () => {},
      showAIProgress: () => {},
      displayRoom: () => {}
    };
  }

  /**
   * Validate an action before executing it
   * @param actionType The type of action to validate
   * @param context Additional context for validation
   * @returns ValidationResult indicating if action is allowed
   */
  private async validateAction(
    actionType: string,
    context: Partial<ActionContext> = {}
  ): Promise<ValidationResult> {
    try {
      const session = this.gameStateManager.getCurrentSession();
      if (!session.gameId || !session.roomId) {
        return {
          allowed: false,
          reason: 'No active game session.',
          hint: 'Start a new game or load an existing one.'
        };
      }

      // Get current character
      const character = await this.characterService.getPlayerCharacter(session.gameId);
      if (!character) {
        return {
          allowed: false,
          reason: 'Player character not found.',
          hint: 'This may be a game data issue.'
        };
      }

      // Build complete action context
      const actionContext: ActionContext = {
        roomId: session.roomId,
        characterId: character.id,
        itemId: context.itemId,
        direction: context.direction,
        targetId: context.targetId,
        additionalData: context.additionalData
      };

      // Validate the action
      return await this.actionValidator.canPerformAction(
        actionType,
        character,
        actionContext
      );

    } catch (error) {
      console.error('Error during action validation:', error);
      return {
        allowed: false,
        reason: 'An error occurred while validating the action.',
        hint: 'Please try again or report this issue.'
      };
    }
  }

  /**
   * Execute an action with validation
   * @param actionType The type of action to perform
   * @param context Additional context for validation
   * @param executeAction The function to execute if validation passes
   */
  private async executeValidatedAction(
    actionType: string,
    context: Partial<ActionContext>,
    executeAction: () => Promise<void>
  ): Promise<void> {
    const validation = await this.validateAction(actionType, context);

    if (!validation.allowed) {
      this.tui.display(validation.reason || 'Action not allowed', MessageType.ERROR);
      if (validation.hint) {
        this.tui.display(`Hint: ${validation.hint}`, MessageType.SYSTEM);
      }
      return;
    }

    // Execute the action
    await executeAction();
    
    // Process event triggers after successful action
    await this.processTriggers(actionType, context);
  }

  /**
   * Process event triggers for a completed action
   */
  private async processTriggers(actionType: string, context: Partial<ActionContext>): Promise<void> {
    try {
      const session = this.gameStateManager.getCurrentSession();
      if (!session) return;

      // Get current game state
      const gameState = await this.gameStateManager.getGameState(session.gameId);
      if (!gameState || !gameState.character_id) return;

      // Get player character
      const character = await this.characterService.getCharacter(gameState.character_id);
      if (!character) return;

      // Get current room
      const room = await this.gameStateManager.getCurrentRoom();

      // Build trigger context
      const triggerContext: TriggerContext = {
        character,
        room: room || undefined,
        eventData: { 
          actionType,
          ...context 
        }
      };

      // Add item context if available
      if (context.itemId) {
        const item = await this.itemService.getItem(context.itemId);
        if (item) {
          triggerContext.item = item;
        }
      }

      // Map action types to trigger events
      const eventTypeMap: Record<string, string> = {
        'equip': 'equip',
        'unequip': 'unequip',
        'pickup': 'pickup',
        'drop': 'drop',
        'use': 'use',
        'examine': 'examine'
      };

      const eventType = eventTypeMap[actionType];
      if (!eventType) return;

      // Process item-specific triggers
      if (context.itemId) {
        await this.eventTriggerService.processTrigger(
          eventType,
          'item',
          context.itemId,
          triggerContext
        );
      }

      // Process room-specific triggers for movement events
      if (room && (actionType === 'enter' || actionType === 'exit')) {
        await this.eventTriggerService.processTrigger(
          eventType,
          'room',
          room.id,
          triggerContext
        );
      }

      // Process global triggers
      await this.eventTriggerService.processTrigger(
        eventType,
        'global',
        null,
        triggerContext
      );

    } catch (error) {
      console.error('Error processing triggers:', error);
      // Don't throw - gameplay should continue even if triggers fail
    }
  }

  /**
   * Show region information for the current room
   */
  private async showRegionInfo(): Promise<void> {
    try {
      const session = this.gameStateManager.getCurrentSession();
      if (!session.gameId || !session.roomId) {
        this.tui.display('No active game session.', MessageType.SYSTEM);
        return;
      }

      const room = await this.db.get<any>('SELECT * FROM rooms WHERE id = ?', [session.roomId]);
      if (!room) {
        this.tui.display('Current room not found.', MessageType.ERROR);
        return;
      }

      if (!room.region_id) {
        this.tui.display('Current room is not part of any region.', MessageType.SYSTEM);
        return;
      }

      const region = await this.regionService.getRegion(room.region_id);
      if (!region) {
        this.tui.display('Region not found.', MessageType.ERROR);
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
      
      this.tui.display(output.trim());
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
        this.tui.display('No active game session.', MessageType.SYSTEM);
        return;
      }

      const regions = await this.regionService.getRegionsForGame(session.gameId);
      
      if (regions.length === 0) {
        this.tui.display('No regions found in current game.', MessageType.SYSTEM);
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
      
      this.tui.display(output.trim());
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
        this.tui.display('No active game session.', MessageType.SYSTEM);
        return;
      }

      const stats = await this.regionService.getRegionStats(session.gameId);
      
      if (stats.length === 0) {
        this.tui.display('No regions found in current game.', MessageType.SYSTEM);
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
      
      this.tui.display(output.trim());
    } catch (error) {
      console.error('Error showing region stats:', error);
    }
  }

  /**
   * Handle pickup command - pick up items from current room
   */
  private async handlePickup(itemName: string): Promise<void> {
    if (!this.gameStateManager.isInGame()) {
      this.tui.display('No game is currently loaded.', MessageType.SYSTEM);
      return;
    }

    if (!itemName) {
      this.tui.display('Pick up what?', MessageType.ERROR);
      return;
    }

    try {
      const session = this.gameStateManager.getCurrentSession();
      const currentRoom = await this.gameStateManager.getCurrentRoom();
      
      if (!currentRoom) {
        this.tui.display('Error: Unable to determine current room.', MessageType.ERROR);
        return;
      }

      // Get all items in the current room
      const roomItems = await this.itemService.getRoomItems(currentRoom.id);
      
      if (roomItems.length === 0) {
        this.tui.display('There are no items here to pick up.', MessageType.ERROR);
        return;
      }

      // Find item by name (case-insensitive partial match)
      const targetItem = this.itemService.findItemByName(roomItems, itemName);

      if (!targetItem) {
        this.tui.display(`There is no ${itemName} here.`, MessageType.ERROR);
        
        // Show available items as a suggestion
        this.tui.display('Available items:', MessageType.SYSTEM);
        roomItems.forEach(roomItem => {
          const quantityText = roomItem.quantity > 1 ? ` x${roomItem.quantity}` : '';
          this.tui.display(`• ${roomItem.item.name}${quantityText}`, MessageType.NORMAL);
        });
        return;
      }

      // Check if the item is fixed (scenery that cannot be picked up)
      if (targetItem.item.is_fixed) {
        this.tui.display(`The ${targetItem.item.name} is fixed in place and cannot be taken.`, MessageType.NORMAL);
        return;
      }

      // For this phase, use game ID as character ID (simple approach for single-player game)
      const characterId = session.gameId!;

      // Check if character can add another item to inventory
      const canAddItem = await this.itemService.canAddItemToInventory(characterId);
      if (!canAddItem) {
        const inventoryStatus = await this.itemService.getInventoryStatus(characterId);
        this.tui.display('Your inventory is full!', MessageType.ERROR);
        this.tui.display(inventoryStatus, MessageType.SYSTEM);
        return;
      }

      // Transfer item from room to character inventory
      await this.itemService.transferItemToInventory(
        characterId, 
        targetItem.item_id, 
        targetItem.room_id,
        1
      );

      this.tui.display(`You pick up the ${targetItem.item.name}.`, MessageType.NORMAL);
      
      // Refresh room display to show updated items
      await this.lookAround();

    } catch (error) {
      console.error('Error picking up item:', error);
      this.tui.showError('Error picking up item', (error as Error)?.message);
    }
  }

  /**
   * Handle inventory command - display character's carried items
   */
  private async handleInventory(): Promise<void> {
    if (!this.gameStateManager.isInGame()) {
      this.tui.display('No game is currently loaded.', MessageType.SYSTEM);
      return;
    }

    try {
      const session = this.gameStateManager.getCurrentSession();
      
      // For this phase, use game ID as character ID (simple approach for single-player game)
      const characterId = session.gameId!;

      // Get character's inventory
      const inventory = await this.itemService.getCharacterInventory(characterId);
      
      if (inventory.length === 0) {
        const inventoryStatus = await this.itemService.getInventoryStatus(characterId);
        this.tui.display('Your inventory is empty.', MessageType.NORMAL);
        this.tui.display(inventoryStatus, MessageType.SYSTEM);
        return;
      }

      // Show inventory status and items
      const inventoryStatus = await this.itemService.getInventoryStatus(characterId);
      this.tui.display(inventoryStatus, MessageType.SYSTEM);
      this.tui.display('You are carrying:', MessageType.SYSTEM);
      inventory.forEach(invItem => {
        const quantityText = invItem.quantity > 1 ? ` x${invItem.quantity}` : '';
        const equippedText = invItem.equipped ? ' (equipped)' : '';
        this.tui.display(`• ${invItem.item.name}${quantityText}${equippedText}`, MessageType.NORMAL);
      });

    } catch (error) {
      console.error('Error displaying inventory:', error);
      this.tui.showError('Error displaying inventory', (error as Error)?.message);
    }
  }

  /**
   * Handle drop command - drop items from inventory to current room
   */
  private async handleDrop(itemName: string): Promise<void> {
    if (!this.gameStateManager.isInGame()) {
      this.tui.display('No game is currently loaded.', MessageType.SYSTEM);
      return;
    }

    if (!itemName) {
      this.tui.display('Drop what?', MessageType.ERROR);
      return;
    }

    try {
      const session = this.gameStateManager.getCurrentSession();
      const currentRoom = await this.gameStateManager.getCurrentRoom();
      
      if (!currentRoom) {
        this.tui.display('Error: Unable to determine current room.', MessageType.ERROR);
        return;
      }

      // For this phase, use game ID as character ID (simple approach for single-player game)
      const characterId = session.gameId!;

      // Get character's inventory
      const inventory = await this.itemService.getCharacterInventory(characterId);
      
      if (inventory.length === 0) {
        this.tui.display('Your inventory is empty.', MessageType.ERROR);
        return;
      }

      // Find item by name (case-insensitive partial match)
      const targetItem = this.itemService.findItemByName(inventory, itemName);

      if (!targetItem) {
        this.tui.display(`You don't have a ${itemName}.`, MessageType.ERROR);
        
        // Show available items as a suggestion
        this.tui.display('You are carrying:', MessageType.SYSTEM);
        inventory.forEach(invItem => {
          const quantityText = invItem.quantity > 1 ? ` x${invItem.quantity}` : '';
          this.tui.display(`• ${invItem.item.name}${quantityText}`, MessageType.NORMAL);
        });
        return;
      }

      // Validate the drop action with item context
      await this.executeValidatedAction(
        'drop',
        { itemId: targetItem.item_id },
        async () => {
          // Transfer item from character inventory to room
          await this.itemService.transferItemToRoom(
            characterId,
            targetItem.item_id,
            currentRoom.id,
            1
          );

          this.tui.display(`You drop the ${targetItem.item.name}.`, MessageType.NORMAL);
          
          // Refresh room display to show updated items
          await this.lookAround();
        }
      );

    } catch (error) {
      console.error('Error dropping item:', error);
      this.tui.showError('Error dropping item', (error as Error)?.message);
    }
  }

  /**
   * Handle examine command - examine items in detail
   */
  private async handleExamine(itemName: string): Promise<void> {
    if (!this.gameStateManager.isInGame()) {
      this.tui.display('No game is currently loaded.', MessageType.SYSTEM);
      return;
    }

    if (!itemName) {
      this.tui.display('Examine what?', MessageType.ERROR);
      return;
    }

    try {
      const session = this.gameStateManager.getCurrentSession();
      const currentRoom = await this.gameStateManager.getCurrentRoom();
      
      if (!currentRoom) {
        this.tui.display('Error: Unable to determine current room.', MessageType.ERROR);
        return;
      }

      // For this phase, use game ID as character ID (simple approach for single-player game)
      const characterId = session.gameId!;

      // Check inventory first
      const inventory = await this.itemService.getCharacterInventory(characterId);
      let targetInventoryItem = this.itemService.findItemByName(inventory, itemName);
      let targetRoomItem = null;
      let itemLocation = 'inventory';

      // If not found in inventory, check current room
      if (!targetInventoryItem) {
        const roomItems = await this.itemService.getRoomItems(currentRoom.id);
        targetRoomItem = this.itemService.findItemByName(roomItems, itemName);
        itemLocation = 'room';
      }

      const foundItem = targetInventoryItem || targetRoomItem;
      if (!foundItem) {
        this.tui.display(`There is no ${itemName} here or in your inventory.`, MessageType.ERROR);
        return;
      }

      // Display detailed item information
      this.displayItemDetails(foundItem.item, itemLocation);

    } catch (error) {
      console.error('Error examining item:', error);
      this.tui.showError('Error examining item', (error as Error)?.message);
    }
  }

  /**
   * Display detailed information about an item
   */
  private displayItemDetails(item: any, location: string): void {
    this.tui.display(`${item.name}`, MessageType.NORMAL);
    this.tui.display(`${item.description}`, MessageType.NORMAL);
  }

  /**
   * Handle rest command - rest to restore health and energy
   */
  private async handleRest(): Promise<void> {
    if (!this.gameStateManager.isInGame()) {
      this.tui.display('No game is currently loaded.', MessageType.SYSTEM);
      return;
    }

    try {
      const session = this.gameStateManager.getCurrentSession();
      const currentRoom = await this.gameStateManager.getCurrentRoom();
      
      if (!currentRoom) {
        this.tui.display('Error: Unable to determine current room.', MessageType.ERROR);
        return;
      }

      // Validate the rest action
      await this.executeValidatedAction(
        'rest',
        {},
        async () => {
          // Get player character for healing
          const character = await this.characterService.getPlayerCharacter(session.gameId!);
          
          if (!character) {
            this.tui.display('Error: Unable to find player character.', MessageType.ERROR);
            return;
          }

          // Initialize health if needed
          if (await this.healthService.needsHealthInitialization(character.id)) {
            await this.healthService.initializeHealth(character.id);
          }

          // Check if character is dead
          const currentHealth = await this.healthService.getHealthStatus(character.id);
          if (currentHealth.isDead) {
            this.tui.display('💀 You cannot rest while dead. Seek resurrection first.', MessageType.ERROR);
            return;
          }

          // Restore to full health
          const newHealth = await this.healthService.restoreToFull(character.id);
          const healthDisplay = this.healthService.getHealthDisplay(newHealth);

          this.tui.display('You rest peacefully, feeling refreshed.', MessageType.NORMAL);
          this.tui.display('The mystical energy around you provides comfort and restoration.', MessageType.SYSTEM);
          this.tui.display(`Your health has been restored: ${healthDisplay}`, MessageType.NORMAL);
        }
      );

    } catch (error) {
      console.error('Error resting:', error);
      this.tui.showError('Error resting', (error as Error)?.message);
    }
  }

  /**
   * Show current health status
   */
  private async showHealthStatus(): Promise<void> {
    if (!this.gameStateManager.isInGame()) {
      this.tui.display('No game is currently loaded.', MessageType.SYSTEM);
      return;
    }

    try {
      const character = await this.characterService.getPlayerCharacter(this.gameStateManager.getCurrentGameId());
      
      if (!character) {
        this.tui.display('Error: Unable to find player character.', MessageType.ERROR);
        return;
      }

      // Initialize health if needed
      if (await this.healthService.needsHealthInitialization(character.id)) {
        await this.healthService.initializeHealth(character.id);
      }

      const healthStatus = await this.healthService.getHealthStatus(character.id);
      const healthDisplay = this.healthService.getHealthDisplay(healthStatus);
      
      this.tui.display('=== HEALTH STATUS ===', MessageType.SYSTEM);
      this.tui.display(healthDisplay, MessageType.NORMAL);
      
      // Additional status information
      if (healthStatus.status === 'dead') {
        this.tui.display('💀 You have fallen! Seek resurrection or start anew.', MessageType.ERROR);
      } else if (healthStatus.status === 'critical') {
        this.tui.display('⚠️ You are critically injured! Seek healing immediately!', MessageType.ERROR);
      } else if (healthStatus.status === 'injured') {
        this.tui.display('🩹 You have sustained some injuries. Rest or seek healing.', MessageType.NORMAL);
      } else {
        this.tui.display('✨ You are in good health.', MessageType.NORMAL);
      }

    } catch (error) {
      console.error('Error showing health status:', error);
      this.tui.showError('Error showing health status', (error as Error)?.message);
    }
  }

  /**
   * Handle equipping an item from inventory
   */
  private async handleEquip(itemName: string): Promise<void> {
    if (!this.gameStateManager.isInGame()) {
      this.tui.display('No game is currently loaded.', MessageType.SYSTEM);
      return;
    }

    if (!itemName) {
      this.tui.display('Equip what?', MessageType.ERROR);
      return;
    }

    try {
      const session = this.gameStateManager.getCurrentSession();
      const characterId = session.gameId!; // Use game ID as character ID for single-player

      // Find the item in inventory that can be equipped
      const item = await this.equipmentService.findEquippableItem(characterId, itemName);
      if (!item) {
        this.tui.display(`You don't have an equippable item called "${itemName}" in your inventory.`, MessageType.ERROR);
        return;
      }

      // Validate the equip action with item context
      await this.executeValidatedAction(
        'equip',
        { itemId: item.item_id },
        async () => {
          // Try to equip the item
          await this.equipmentService.equipItem(characterId, item.item_id);
          
          this.tui.display(`You equipped ${item.item.name}.`, MessageType.SYSTEM);
        }
      );

    } catch (error) {
      console.error('Error equipping item:', error);
      this.tui.display((error as Error).message, MessageType.ERROR);
    }
  }

  /**
   * Handle unequipping an equipped item
   */
  private async handleUnequip(itemName: string): Promise<void> {
    if (!this.gameStateManager.isInGame()) {
      this.tui.display('No game is currently loaded.', MessageType.SYSTEM);
      return;
    }

    if (!itemName) {
      this.tui.display('Unequip what?', MessageType.ERROR);
      return;
    }

    try {
      const session = this.gameStateManager.getCurrentSession();
      const characterId = session.gameId!; // Use game ID as character ID for single-player

      // Get equipped items
      const equippedItems = await this.equipmentService.getEquippedItems(characterId);
      const item = this.itemService.findItemByName(equippedItems, itemName);
      
      if (!item) {
        this.tui.display(`You don't have "${itemName}" equipped.`, MessageType.ERROR);
        return;
      }

      // Unequip the item
      await this.equipmentService.unequipItem(characterId, item.item_id);
      
      this.tui.display(`You unequipped ${item.item.name}.`, MessageType.SYSTEM);

    } catch (error) {
      console.error('Error unequipping item:', error);
      this.tui.display((error as Error).message, MessageType.ERROR);
    }
  }

  /**
   * Show all equipped items
   */
  private async handleEquipment(): Promise<void> {
    if (!this.gameStateManager.isInGame()) {
      this.tui.display('No game is currently loaded.', MessageType.SYSTEM);
      return;
    }

    try {
      const session = this.gameStateManager.getCurrentSession();
      const characterId = session.gameId!; // Use game ID as character ID for single-player

      const equipmentSummary = await this.equipmentService.getEquipmentSummary(characterId);
      
      this.tui.display('═══ EQUIPMENT ═══', MessageType.NORMAL);
      
      // Show all 4 slots
      const slots = ['hand', 'head', 'body', 'foot'] as const;
      
      for (const slot of slots) {
        const item = equipmentSummary[slot];
        const slotLabel = slot.toUpperCase();
        if (item) {
          this.tui.display(`${slotLabel}: ${item.item.name}`, MessageType.NORMAL);
        } else {
          this.tui.display(`${slotLabel}: [Empty]`, MessageType.NORMAL);
        }
      }

    } catch (error) {
      console.error('Error showing equipment:', error);
      this.tui.display('Error displaying equipment.', MessageType.ERROR);
    }
  }

  /**
   * Handle stats command - display character attributes and status
   */
  private async handleStats(): Promise<void> {
    try {
      const session = this.gameStateManager.getCurrentSession();
      if (!session) {
        this.tui.display('No active game session.', MessageType.ERROR);
        return;
      }

      // Get character ID from game state
      const gameState = await this.gameStateManager.getGameState(session.gameId);
      if (!gameState || !gameState.character_id) {
        this.tui.display('No character found for this game.', MessageType.ERROR);
        return;
      }

      // Get character information
      const character = await this.characterService.getCharacter(gameState.character_id);
      if (!character) {
        this.tui.display('Character not found.', MessageType.ERROR);
        return;
      }

      // Initialize health if needed
      if (await this.healthService.needsHealthInitialization(character.id)) {
        await this.healthService.initializeHealth(character.id);
      }

      // Get character health using new health service
      const healthStatus = await this.healthService.getHealthStatus(character.id);

      // Get character modifiers
      const modifiers = this.characterService.getCharacterModifiers(character);

      // Display character information
      this.tui.display(`\n=== ${character.name.toUpperCase()} ===`, MessageType.SYSTEM);
      this.tui.display(`Type: ${character.type.charAt(0).toUpperCase() + character.type.slice(1)}`, MessageType.NORMAL);
      
      this.tui.display('\n--- ATTRIBUTES ---', MessageType.SYSTEM);
      this.tui.display(`Strength:     ${character.strength.toString().padStart(2)} (${modifiers.strength >= 0 ? '+' : ''}${modifiers.strength})`, MessageType.NORMAL);
      this.tui.display(`Dexterity:    ${character.dexterity.toString().padStart(2)} (${modifiers.dexterity >= 0 ? '+' : ''}${modifiers.dexterity})`, MessageType.NORMAL);
      this.tui.display(`Intelligence: ${character.intelligence.toString().padStart(2)} (${modifiers.intelligence >= 0 ? '+' : ''}${modifiers.intelligence})`, MessageType.NORMAL);
      this.tui.display(`Constitution: ${character.constitution.toString().padStart(2)} (${modifiers.constitution >= 0 ? '+' : ''}${modifiers.constitution})`, MessageType.NORMAL);
      this.tui.display(`Wisdom:       ${character.wisdom.toString().padStart(2)} (${modifiers.wisdom >= 0 ? '+' : ''}${modifiers.wisdom})`, MessageType.NORMAL);
      this.tui.display(`Charisma:     ${character.charisma.toString().padStart(2)} (${modifiers.charisma >= 0 ? '+' : ''}${modifiers.charisma})`, MessageType.NORMAL);

      this.tui.display('\n--- HEALTH ---', MessageType.SYSTEM);
      const healthDisplay = this.healthService.getHealthDisplay(healthStatus);
      this.tui.display(healthDisplay, MessageType.NORMAL);

      // Show equipment summary
      this.tui.display('\n--- EQUIPMENT ---', MessageType.SYSTEM);
      const equipmentSummary = await this.equipmentService.getEquipmentSummary(character.id);
      const slots = ['hand', 'head', 'body', 'foot'] as const;
      
      for (const slot of slots) {
        const item = equipmentSummary[slot];
        const slotLabel = slot.charAt(0).toUpperCase() + slot.slice(1);
        if (item) {
          this.tui.display(`${slotLabel}: ${item.item.name}`, MessageType.NORMAL);
        } else {
          this.tui.display(`${slotLabel}: [Empty]`, MessageType.NORMAL);
        }
      }

    } catch (error) {
      console.error('Error displaying character stats:', error);
      this.tui.display('Error displaying character stats.', MessageType.ERROR);
    }
  }
}