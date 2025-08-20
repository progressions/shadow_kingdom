#!/usr/bin/env node

import { TUIManager } from './ui/TUIManager';
import { GameState as TUIGameState } from './ui/StatusManager';
import { MessageType } from './ui/MessageFormatter';
import Database from './utils/database';
import { HistoryManager } from './utils/historyManager';
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
import { ServiceFactory, ServiceInstances } from './services/serviceFactory';


// Interfaces imported from GameStateManager
import { Game, Room, Connection, GameState } from './services/gameStateManager';

interface CommandState {
  isProcessing: boolean;
  currentCommand?: string;
  startTime?: number;
}

export class GameController {
  private tui: TUIManager;
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
  private commandState: CommandState;

  constructor(db: Database) {
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
    
    // Initialize command router
    this.commandRouter = new CommandRouter(this.nlpEngine, {
      enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
    });
    
    // Initialize room display service
    this.roomDisplayService = new RoomDisplayService({
      enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
    });
    
    // Initialize history manager
    const maxHistorySize = parseInt(process.env.COMMAND_HISTORY_SIZE || '100');
    this.historyManager = new HistoryManager(process.env.COMMAND_HISTORY_FILE, maxHistorySize);
    
    // Initialize services immediately for backward compatibility with tests
    this.initializeServices();
    
    // Initialize TUI
    this.tui = new TUIManager();
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
      handler: (args) => this.tui.display(args.join(' '))
    });

    this.commandRouter.addGameCommand({
      name: 'clear',
      description: 'Clear the screen',
      handler: () => {
        this.tui.clear();
        this.tui.showWelcome('Welcome to Shadow Kingdom!');
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
        return {
          mode: 'menu'
        };
      }
      
      // Get basic game info (synchronously for now)
      const gameState: TUIGameState = {
        mode: 'game'
      };
      
      // Fetch game data asynchronously and update later
      this.updateGameStateAsync(session.gameId, gameState);
      
      return gameState;
    } catch (error) {
      return {
        mode: 'menu'
      };
    }
  }

  private async updateGameStateAsync(gameId: number, gameState: TUIGameState): Promise<void> {
    try {
      // Get game name
      const game = await this.gameManagementService.getGameById(gameId);
      if (game) {
        gameState.gameName = game.name;
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
        mode: this.gameStateManager.getCurrentSession().mode,
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
    this.tui.display('Type "help" for commands or "new" to start your first game.');
  }

  private showNLPStats() {
    this.tui.display('📊 Natural Language Processing Statistics', MessageType.NORMAL);
    this.tui.display('=========================================', MessageType.NORMAL);
    
    const commandStats = this.commandRouter.getStats();
    const nlpStats = commandStats.nlpStats;
    const config = this.nlpEngine.getConfig();
    
    this.tui.display('🎮 Command Router Statistics:', MessageType.NORMAL);
    this.tui.display(`  Menu commands registered: ${commandStats.menuCommandCount}`, MessageType.NORMAL);
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
    this.tui.display('Starting a new game...', MessageType.SYSTEM);
    this.tui.display('Enter a name for your new game:', MessageType.SYSTEM);
    
    // Get game name from user via TUI
    const gameName = await this.tui.getInput();
    
    if (!gameName.trim()) {
      this.tui.display('Game name cannot be empty.', MessageType.ERROR);
      return;
    }
    
    // Create game with the provided name
    const result = await this.gameManagementService.createGameWithName(gameName.trim());
    
    if (!result.success) {
      this.tui.display(result.error || 'Failed to create new game. Returning to main menu.', MessageType.ERROR);
      return;
    }
    
    if (result.game) {
      // Start game session using game state manager
      await this.gameStateManager.startGameSession(result.game.id);
      
      this.tui.clear();
      this.tui.showWelcome('Welcome to Shadow Kingdom!');
      this.tui.display(`Game: ${result.game.name}`);
      this.tui.display('Initializing game world...');
      this.tui.display('Type "help" for available commands.');
      this.tui.display('Type "look" to see where you are.');
      this.tui.display('Type "menu" to return to main menu.');
      
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
      this.tui.display(`Are you sure you want to delete "${game.name}"?`, MessageType.SYSTEM);
      this.tui.display('This action cannot be undone.', MessageType.SYSTEM);
      this.tui.display('Type "yes" to confirm, or anything else to cancel:', MessageType.SYSTEM);
      
      const confirmation = await this.tui.getInput();
      
      if (confirmation.toLowerCase() === 'yes') {
        const deleteResult = await this.gameManagementService.deleteGameById(game.id);
        if (deleteResult.success) {
          this.tui.display(`Game "${game.name}" has been deleted.`, MessageType.SYSTEM);
        } else {
          this.tui.display(deleteResult.error || 'Deletion failed.', MessageType.ERROR);
        }
      } else {
        this.tui.display('Deletion cancelled.', MessageType.SYSTEM);
      }
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
      
      games.forEach((game, index) => {
        const lastPlayed = new Date(game.last_played_at).toLocaleDateString();
        this.tui.display(`${index + 1}. ${game.name} (Last played: ${lastPlayed})`, MessageType.SYSTEM);
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

  private async returnToMenu() {
    this.tui.display('Returning to main menu...', MessageType.SYSTEM);
    
    // End game session (automatically saves state)
    await this.gameStateManager.endGameSession();
    
    this.tui.clear();
    this.showWelcome();
    this.updateStatusDisplay();
    
    // Start input processing loop
    this.processInput();
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
        const exitNames = connections.map(c => c.name === c.direction ? c.direction : `${c.name} (${c.direction})`);
        this.tui.displayRoom(room.name, room.description, exitNames);
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
      this.tui.display(`Game: ${game.name}`);
      this.tui.display('Loading your saved game...');
      this.tui.display('Type "help" for available commands.');
      this.tui.display('Type "look" to see where you are.');
      this.tui.display('Type "menu" to return to main menu.');
      
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
    
    // Set up commands
    this.setupMenuCommands();
    this.setupGameCommands();
  }

  /**
   * Initialize TUI interface
   */
  private async initializeTUI(): Promise<void> {
    await this.tui.initialize();
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
      this.tui.display(`Continuing: "${mostRecentGame.name}"`);
      this.tui.display('Type "menu" to manage games.');
      
      await this.loadSelectedGame(mostRecentGame);
    } else {
      // No games exist, auto-create new game
      this.tui.showWelcome('Welcome to Shadow Kingdom!');
      this.tui.display('Starting your first adventure...');
      
      const result = await this.gameManagementService.createGameAutomatic();
      if (result.success && result.game) {
        this.tui.display(`Created: "${result.game.name}"`);
        await this.loadSelectedGame(result.game);
      } else {
        // Fallback to menu if auto-creation fails
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
}