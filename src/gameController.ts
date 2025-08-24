#!/usr/bin/env node

import { InkTUIBridge } from './ui/InkTUIBridge';
import { ConsoleTUI } from './ui/ConsoleTUI';
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
import { TargetContext, ResolvedTarget } from './types/targetResolution';
import { GameStateManager } from './services/gameStateManager';
import { RoomDisplayService } from './services/roomDisplayService';
import { CommandParsingError } from './services/commandParsingError';
import { RoomGenerationService } from './services/roomGenerationService';
import { BackgroundGenerationService } from './services/backgroundGenerationService';
import { GameManagementService } from './services/gameManagementService';
import { RegionService } from './services/regionService';
import { ServiceFactory, ServiceInstances } from './services/serviceFactory';
import { ActionValidator } from './services/actionValidator';
import { ValidationResult, ActionContext } from './types/validation';
import { HealthService, HealthStatus } from './services/healthService';
import { EventTriggerService, TriggerContext } from './services/eventTriggerService';
import { CharacterType, Character, CharacterSentiment, getAttributeModifier } from './types/character';
import { Item } from './types/item';
import { UnifiedRoomDisplayService } from './services/unifiedRoomDisplayService';
import { TUIOutputAdapter } from './adapters/tuiOutputAdapter';
import { stripArticles, parseTalkCommand, parseGiveCommand } from './utils/articleParser';


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
  private examineService!: ServiceInstances['examineService']; // Initialized in initializeReadlineInterface()
  private loggerService!: ServiceInstances['loggerService']; // Initialized in initializeReadlineInterface()
  private unifiedRoomDisplayService: UnifiedRoomDisplayService;
  private commandState: CommandState;
  private commandToExecute?: string;

  constructor(db: Database, command?: string, tui?: TUIInterface) {
    this.db = db;
    this.commandToExecute = command;
    this.grokClient = new GrokClient();
    
    // Initialize command state
    this.commandState = {
      isProcessing: false
    };
    
    // Initialize unified NLP engine with configuration
    const baseConfig = getNLPConfig();
    const config = applyEnvironmentOverrides(baseConfig);
    this.nlpEngine = new UnifiedNLPEngine(this.grokClient, config, this.db);
    
    // Initialize room display service
    this.roomDisplayService = new RoomDisplayService({
      enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
    });
    
    // Initialize unified room display service
    this.unifiedRoomDisplayService = new UnifiedRoomDisplayService();
    
    // Initialize history manager
    const maxHistorySize = parseInt(process.env.COMMAND_HISTORY_SIZE || '100');
    this.historyManager = new HistoryManager(process.env.COMMAND_HISTORY_FILE, maxHistorySize);
    
    // Initialize TUI (use provided TUI or create new one)
    // In test environment or command mode, create a mock TUI to avoid blessed.js TTY requirements
    if (tui) {
      this.tui = tui;
    } else if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      // Create a minimal mock TUI for tests
      this.tui = this.createMockTUI();
    } else if (command) {
      // Use ConsoleTUI for command mode to output to console
      // Logger service will be set after initialization
      this.tui = new ConsoleTUI();
    } else {
      this.tui = new InkTUIBridge(undefined, this.historyManager);
    }
    
    // Initialize services first
    this.initializeServices();
    
    // Initialize command router (after services are available)
    this.commandRouter = new CommandRouter(
      this.nlpEngine, 
      this.grokClient, 
      this.db, 
      this.itemService,
      this.characterService,
      this.gameStateManager,
      this.tui, 
      {
        enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
      }
    );
    
    // Set up commands after CommandRouter is initialized
    this.setupCommands();
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
      description: 'Look around the current room or examine something specific',
      handler: async (args: string[]) => {
        if (args.length === 0) {
          await this.lookAround();
        } else {
          const handled = await this.handleExamine(args);
          if (!handled) {
            // Target not found, let NLP handle the full command
            throw new Error(`Target "${args.join(' ')}" not found, falling back to AI`);
          }
        }
      }
    });

    // Add examine alias
    this.commandRouter.addCommand({
      name: 'examine',
      description: 'Examine something specific (alias for "look <target>")',
      handler: async (args: string[]) => {
        const handled = await this.handleExamine(args);
        if (!handled) {
          // Target not found, let NLP handle the full command
          throw new Error(`Target "${args.join(' ')}" not found, falling back to AI`);
        }
      }
    });

    // Add short alias
    this.commandRouter.addCommand({
      name: 'l',
      description: 'Look around or examine something (short alias)',
      handler: async (args: string[]) => {
        if (args.length === 0) {
          await this.lookAround();
        } else {
          const handled = await this.handleExamine(args);
          if (!handled) {
            // Target not found, let NLP handle the full command
            throw new Error(`Target "${args.join(' ')}" not found, falling back to AI`);
          }
        }
      }
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

    // Emergency teleport command for debugging and escaping dead ends
    this.commandRouter.addCommand({
      name: 'teleport',
      description: 'Emergency teleport to a room by name (debug command)',
      handler: async (args) => await this.handleTeleport(args)
    });

    this.commandRouter.addCommand({
      name: 'tp',
      description: 'Emergency teleport (short alias for "teleport")',
      handler: async (args) => await this.handleTeleport(args)
    });

    // Item system commands
    this.commandRouter.addCommand({
      name: 'pickup',
      description: 'Pick up an item from the current room',
      handler: async (args) => {
        if (args.length === 1 && args[0].toLowerCase() === 'all') {
          await this.handlePickupAll();
        } else {
          await this.handlePickup(args.join(' '));
        }
      }
    });

    this.commandRouter.addCommand({
      name: 'get',
      description: 'Pick up an item from the current room (alias for "pickup")',
      handler: async (args) => {
        if (args.length === 1 && args[0].toLowerCase() === 'all') {
          await this.handlePickupAll();
        } else {
          await this.handlePickup(args.join(' '));
        }
      }
    });

    this.commandRouter.addCommand({
      name: 'take',
      description: 'Pick up an item from the current room (alias for "pickup")',
      handler: async (args) => {
        if (args.length === 1 && args[0].toLowerCase() === 'all') {
          await this.handlePickupAll();
        } else {
          await this.handlePickup(args.join(' '));
        }
      }
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

    this.commandRouter.addEnhancedCommand({
      name: 'drop',
      description: 'Drop items from your inventory',
      targetContext: TargetContext.INVENTORY_ITEMS,
      supportsAll: true,
      requiresTarget: true,
      resolutionOptions: {
        includeEquipped: true // Include equipped items so we can decide what to do with them
      },
      handler: async (targets: ResolvedTarget[]) => await this.handleDropWithTargets(targets)
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

    // Context-aware equip aliases
    this.commandRouter.addCommand({
      name: 'wear',
      description: 'Equip armor items (helmets, boots, armor, etc.)',
      handler: async (args) => await this.handleWear(args.join(' '))
    });

    this.commandRouter.addCommand({
      name: 'use',
      description: 'Equip weapons (swords, axes, staves, etc.)',
      handler: async (args) => await this.handleUse(args.join(' '))
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

    this.commandRouter.addCommand({
      name: 'talk',
      description: 'Talk to a character in the current room',
      handler: async (args) => await this.handleTalkCommand(args)
    });

    this.commandRouter.addCommand({
      name: 'attack',
      description: 'Attack a character in the room',
      handler: async (args) => await this.handleAttackCommand(args.join(' '))
    });

    // Add "a" alias for attack command with auto-targeting
    this.commandRouter.addCommand({
      name: 'a',
      description: 'Attack shortcut (auto-targets single hostile character)',
      handler: async (args) => await this.handleAttackShortcutCommand(args)
    });

    this.commandRouter.addCommand({
      name: 'give',
      description: 'Give an item to a character',
      handler: async (args) => await this.handleGiveCommand(args)
    });
  }

  /**
   * Display message to user and log it
   */
  private displayAndLog(message: string, type: MessageType = MessageType.NORMAL): void {
    this.tui.display(message, type);
    
    // Map MessageType to log categories
    const logType = this.mapMessageTypeToLogType(type);
    this.loggerService.logSystemOutput(message, logType);
  }

  /**
   * Map MessageType to log categories
   */
  private mapMessageTypeToLogType(type: MessageType): 'room' | 'dialogue' | 'combat' | 'system' {
    switch (type) {
      case MessageType.NORMAL:
        return 'room';
      case MessageType.ERROR:
        return 'system';
      case MessageType.SYSTEM:
        return 'system';
      case MessageType.AI_GENERATION:
        return 'system';
      default:
        return 'system';
    }
  }

  private async processInput(): Promise<void> {
    while (true) {
      try {
        const input = await this.tui.getInput();
        const command = input.trim();
        if (!command) {
          continue; // Skip empty commands
        }
        
        // User input logging is handled by TUI display echo
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

      // Save command to persistent history
      await this.historyManager.saveCommand(input);

      // Create execution context
      const executionContext: CommandExecutionContext = {
        gameContext: await this.gameStateManager.buildGameContext(),
        recentCommands: this.gameStateManager.getRecentCommands()
      };

      // Delegate to command router
      await this.commandRouter.processCommand(input, executionContext);

      // Process enemy attacks after player command (only for game commands)
      if (this.gameStateManager.isInGame() && 
          !allowedDuringProcessing.includes(commandName) && 
          process.env.DISABLE_ENEMY_ATTACKS !== 'true') {
        if (process.env.AI_DEBUG_LOGGING === 'true') {
          console.log(`Triggering enemy attacks after command: ${commandName}`);
        }
        await this.processEnemyAttacks();
      } else if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log(`Enemy attacks NOT triggered: inGame=${this.gameStateManager.isInGame()}, allowedDuringProcessing=${allowedDuringProcessing.includes(commandName)}, disabled=${process.env.DISABLE_ENEMY_ATTACKS}`);
      }
    } finally {
      // Reset command state (only if we set it)
      if (!allowedDuringProcessing.includes(commandName)) {
        this.commandState = {
          isProcessing: false
        };
      }
      
      // Refresh history in TUI after command processing is complete
      if (this.tui && 'refreshHistory' in this.tui && typeof this.tui.refreshHistory === 'function') {
        this.tui.refreshHistory();
      }
    }
  }

  /**
   * Process enemy attacks - enemies with hostile/aggressive sentiment attack the player
   */
  private async processEnemyAttacks(): Promise<void> {
    if (process.env.AI_DEBUG_LOGGING === 'true') {
      console.log('processEnemyAttacks called');
    }
    try {
      const session = this.gameStateManager.getCurrentSession();
      if (!session) {
        if (process.env.AI_DEBUG_LOGGING === 'true') {
          console.log('No session found for enemy attacks');
        }
        return;
      }

      const currentRoom = await this.gameStateManager.getCurrentRoom();
      if (!currentRoom) {
        if (process.env.AI_DEBUG_LOGGING === 'true') {
          console.log('No current room found for enemy attacks');
        }
        return;
      }

      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log(`Current room for enemy attacks: ${currentRoom.id}`);
      }

      // Get player character
      const playerCharacter = await this.characterService.getPlayerCharacter(session.gameId!);
      if (!playerCharacter || playerCharacter.is_dead) {
        if (process.env.AI_DEBUG_LOGGING === 'true') {
          console.log(`Player character issue: exists=${!!playerCharacter}, dead=${playerCharacter?.is_dead}`);
        }
        return;
      }

      // Find hostile/aggressive enemies in current room (not NPCs)
      const enemies = await this.db.all<Character>(`
        SELECT * FROM characters 
        WHERE current_room_id = ? 
        AND (sentiment = 'hostile' OR sentiment = 'aggressive')
        AND (is_dead IS NULL OR is_dead = 0)
        AND type = 'enemy'
        ORDER BY name
      `, [currentRoom.id]);

      if (enemies.length === 0) {
        if (process.env.AI_DEBUG_LOGGING === 'true') {
          console.log(`No enemies found for attack in room ${currentRoom.id}`);
        }
        return;
      }

      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log(`Found ${enemies.length} enemies to attack:`, enemies.map(e => `${e.name} (${e.sentiment})`));
      }

      // Each enemy attacks using strength vs dexterity system
      let totalFinalDamage = 0;
      const attackMessages: string[] = [];
      const { calculateAttack } = await import('./utils/combat');

      for (const enemy of enemies) {
        // Calculate attack with detailed results
        const attackResult = calculateAttack(enemy.strength, playerCharacter.dexterity);
        
        if (!attackResult.hits) {
          const strModText = attackResult.strengthModifier >= 0 ? `+${attackResult.strengthModifier}` : `${attackResult.strengthModifier}`;
          const dexModText = attackResult.dexterityModifier >= 0 ? `+${attackResult.dexterityModifier}` : `${attackResult.dexterityModifier}`;
          attackMessages.push(`The ${enemy.name} attacks you, but misses! [Roll: ${attackResult.d20Roll}${strModText}=${attackResult.attackRoll} vs ${attackResult.targetNumber} (10${dexModText})]`);
        } else {
          const baseDamage = 2; // Base damage per attack
          
          // Apply armor damage reduction
          const finalDamage = await this.equipmentService.calculateDamageAfterArmor(playerCharacter.id, baseDamage);
          const armorPoints = await this.equipmentService.calculateArmorPoints(playerCharacter.id);
          const damageAbsorbed = baseDamage - finalDamage;
          
          totalFinalDamage += finalDamage;
          
          // Create attack calculation display text
          const strModText = attackResult.strengthModifier >= 0 ? `+${attackResult.strengthModifier}` : `${attackResult.strengthModifier}`;
          const dexModText = attackResult.dexterityModifier >= 0 ? `+${attackResult.dexterityModifier}` : `${attackResult.dexterityModifier}`;
          const rollText = `[Roll: ${attackResult.d20Roll}${strModText}=${attackResult.attackRoll} vs ${attackResult.targetNumber} (10${dexModText})]`;
          
          // Create detailed attack message showing armor absorption
          if (armorPoints > 0) {
            if (finalDamage <= 0) {
              // Armor completely blocks the attack
              attackMessages.push(`The ${enemy.name} attacks doing ${baseDamage} damage but your armor completely blocks it! ${rollText}`);
            } else {
              // Partial armor absorption
              const actualAbsorbed = baseDamage - finalDamage;
              attackMessages.push(`The ${enemy.name} attacks doing ${baseDamage} damage but your armor absorbs ${actualAbsorbed}, you take ${finalDamage} damage! ${rollText}`);
            }
          } else {
            attackMessages.push(`The ${enemy.name} attacks you for ${finalDamage} damage! ${rollText}`);
          }
        }
      }

      // Apply total final damage to player
      const playerHealth = await this.characterService.getCharacterHealth(playerCharacter.id);
      if (!playerHealth) return;

      const newHealth = Math.max(0, playerHealth.current - totalFinalDamage);
      await this.characterService.updateCharacterHealth(playerCharacter.id, newHealth);

      // Display attack messages
      for (const message of attackMessages) {
        this.tui.display(message, MessageType.ERROR);
      }

      // Only show health updates if damage was actually taken
      if (totalFinalDamage > 0) {
        // Handle player death
        if (newHealth <= 0) {
          await this.characterService.setCharacterDead(playerCharacter.id);
          this.tui.display('', MessageType.NORMAL);
          this.tui.display('💀 You have been slain! 💀', MessageType.ERROR);
          this.tui.display('Your adventure ends here...', MessageType.ERROR);
          this.tui.display('', MessageType.NORMAL);
        } else {
          // Show remaining health
          const healthPercent = Math.round((newHealth / playerHealth.max) * 100);
          this.tui.display(`💔 Your health: ${newHealth}/${playerHealth.max} (${healthPercent}%)`, MessageType.SYSTEM);
        }
      }

    } catch (error) {
      // Silent error handling - don't break the game flow
      console.error('Error processing enemy attacks:', error);
    }
  }

  private showWelcome() {
    this.tui.showWelcome('Welcome to Shadow Kingdom!');
    this.tui.display('A dynamic, AI-powered text adventure.');
    this.tui.display('Type "help" for commands or "new" to start a new adventure.');
  }

  /**
   * Wait for any key press from user
   */
  private async waitForAnyKey(): Promise<void> {
    await this.tui.getInput();
  }

  /**
   * Create a new game for a dead player character
   */
  private async createNewGameForDeadPlayer(oldGameId: number): Promise<void> {
    try {
      this.tui.clear();
      this.tui.display('Creating new adventure...', MessageType.SYSTEM);

      // Create a new game with unique timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const newGameName = `New Adventure ${timestamp}`;
      const result = await this.gameManagementService.createGameWithName(newGameName);
      
      if (!result.success || !result.game) {
        throw new Error(`Failed to create new game: ${result.error}`);
      }
      
      const newGame = result.game;
      if (newGame) {
        await this.loadSelectedGame(newGame, false);
      }
    } catch (error) {
      console.error('Error creating new game for dead player:', error);
      this.tui.display('Error creating new game. Please try again.', MessageType.ERROR);
    }
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
        // Get available connections from this room within this game
        const connections = await this.gameStateManager.getCurrentRoomConnections();
        
        // Use unified room display service with TUI adapter
        const tuiAdapter = new TUIOutputAdapter(this.tui);
        await this.unifiedRoomDisplayService.displayRoomComplete(
          room,
          connections,
          session.gameId!,
          tuiAdapter,
          {
            itemService: this.itemService,
            characterService: this.characterService,
            backgroundGenerationService: this.backgroundGenerationService
          }
        );
      } else {
        this.tui.display('You are in a void. Something went wrong!', MessageType.ERROR);
      }
    } catch (error) {
      this.tui.showError('Error looking around', (error as Error)?.message);
    }
  }

  /**
   * Handle examine command for specific targets
   * Returns true if handled, false if should fall back to AI
   */
  private async handleExamine(args: string[]): Promise<boolean> {
    if (!this.gameStateManager.isInGame()) {
      this.tui.display('No game is currently loaded.', MessageType.SYSTEM);
      return true; // Handled (error case)
    }

    const session = this.gameStateManager.getCurrentSession();
    const targetName = stripArticles(args.join(' '));

    if (!targetName) {
      this.tui.display('Examine what? Please specify something to examine.', MessageType.SYSTEM);
      return true; // Handled (error case)
    }

    try {
      // Find the examinable target
      const target = await this.examineService.findExaminableTarget(
        session.roomId!,
        session.gameId!,
        session.characterId!,
        targetName
      );

      if (!target) {
        // Target not found - let AI handle it
        return false;
      }

      // Get and display examination text
      const examinationText = this.examineService.getExaminationText(target);
      this.tui.display(examinationText, MessageType.NORMAL);
      return true; // Successfully handled

    } catch (error) {
      console.error('Error examining target:', error);
      this.tui.showError('Error examining target', (error as Error)?.message);
      return true; // Handled (error case)
    }
  }

  private async attemptEscapeFromEnemies(enemies: Character[], direction: string): Promise<boolean> {
    const session = this.gameStateManager.getCurrentSession();
    if (!session) return false;
    
    const playerCharacter = await this.characterService.getPlayerCharacter(session.gameId!);
    if (!playerCharacter) return false;
    
    // Calculate escape attempt
    const playerDexModifier = getAttributeModifier(playerCharacter.dexterity);
    const highestEnemyDexModifier = Math.max(
      ...enemies.map(enemy => getAttributeModifier(enemy.dexterity))
    );
    
    const d20Roll = Math.floor(Math.random() * 20) + 1;
    const totalRoll = d20Roll + playerDexModifier;
    const targetNumber = 10 + highestEnemyDexModifier;
    
    const success = totalRoll >= targetNumber;
    
    // Display outcome with roll details
    if (success) {
      const enemyDescription = enemies.length > 1 
        ? `${enemies.length} enemies` 
        : `the ${enemies[0].name}`;
      this.tui.display(
        `You slip past ${enemyDescription} and escape ${direction}! [Roll: ${d20Roll}${this.formatModifier(playerDexModifier)}=${totalRoll} vs ${targetNumber}]`,
        MessageType.SYSTEM
      );
    } else {
      const blockerDescription = enemies.length > 1 
        ? 'the enemies' 
        : `the ${enemies[0].name}`;
      this.tui.display(
        `You try to escape but ${blockerDescription} block your path! [Roll: ${d20Roll}${this.formatModifier(playerDexModifier)}=${totalRoll} vs ${targetNumber}]`,
        MessageType.ERROR
      );
    }
    
    return success;
  }

  private formatModifier(modifier: number): string {
    return modifier >= 0 ? `+${modifier}` : `${modifier}`;
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

    // Check for hostile enemies that could block movement (dexterity-based escape system)
    const currentRoomId = this.gameStateManager.getCurrentRoomId();
    if (currentRoomId) {
      const hostileEnemies = await this.characterService.getHostileEnemiesInRoom(currentRoomId);
      
      if (hostileEnemies.length > 0) {
        const escapeSuccessful = await this.attemptEscapeFromEnemies(hostileEnemies, userInput);
        
        if (!escapeSuccessful) {
          return; // Escape failed, player remains in room
        }
        // If escape succeeded, continue with movement
      }
    }

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
            
            // Check if NLP connection is locked
            if (nlpConnection.locked && nlpConnection.required_key_name) {
              try {
                // Check if player has the required key
                const characterId = await this.getCurrentCharacterId();
                const hasKey = await this.itemService.hasItemByPartialName(
                  characterId, 
                  nlpConnection.required_key_name
                );
                
                if (!hasKey) {
                  this.tui.display(
                    `This passage is locked. You need a ${nlpConnection.required_key_name} to pass.`,
                    MessageType.ERROR
                  );
                  return;
                }
                
                // Player has the key - allow movement and show success message
                this.tui.display(
                  `You unlock the passage with the ${nlpConnection.required_key_name} and go ${resolvedDirection}.`,
                  MessageType.NORMAL
                );
              } catch (error) {
                this.tui.display('This passage is locked.', MessageType.ERROR);
                return;
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

      // Check if connection is locked
      if (connection.locked && connection.required_key_name) {
        try {
          // Check if player has the required key
          const characterId = await this.getCurrentCharacterId();
          const hasKey = await this.itemService.hasItemByPartialName(
            characterId, 
            connection.required_key_name
          );
          
          if (!hasKey) {
            this.tui.display(
              `This passage is locked. You need a ${connection.required_key_name} to pass.`,
              MessageType.ERROR
            );
            return;
          }
          
          // Player has the key - allow movement and show success message
          this.tui.display(
            `You unlock the passage with the ${connection.required_key_name} and go ${userInput}.`,
            MessageType.NORMAL
          );
        } catch (error) {
          this.tui.display('This passage is locked.', MessageType.ERROR);
          return;
        }
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




  private async loadSelectedGame(game: Game, suppressRoomDisplay: boolean = false) {
    try {
      // Start game session using game state manager
      await this.gameStateManager.startGameSession(game.id);
      
      // Check if player character is dead
      const playerCharacter = await this.characterService.getPlayerCharacter(game.id);
      if (playerCharacter && (playerCharacter.is_dead || (playerCharacter.current_health !== null && playerCharacter.current_health <= 0))) {
        // Player is dead - handle gracefully
        this.tui.clear();
        this.tui.showWelcome('Welcome back to Shadow Kingdom!');
        this.tui.display('Your character died in the last game.');
        this.tui.display('Creating a new adventure for you...', MessageType.SYSTEM);
        
        // Don't wait for input - just create a new game immediately
        // This fixes the hanging issue where the game waits for input that never comes
        await this.createNewGameForDeadPlayer(game.id);
        return;
      }
      
      this.tui.clear();
      this.tui.showWelcome('Welcome back to Shadow Kingdom!');
      this.tui.display(`Adventure: ${new Date(game.last_played_at).toLocaleString()}`);
      this.tui.display('Loading your saved game...');
      this.tui.display('Type "help" for available commands.');
      this.tui.display('Type "look" to see where you are.');
      this.tui.display('Type "games" to manage adventures.');
      
      // Show current room only if not suppressed
      if (!suppressRoomDisplay) {
        await this.lookAround();
      }
      this.updateStatusDisplay();
      
      // Start input processing loop (only in interactive mode)
      if (!this.commandToExecute) {
        this.processInput();
      }
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
    this.examineService = services.examineService;
    this.loggerService = services.loggerService;
    
    // Set logger service on TUI if it supports it (InkTUIBridge or ConsoleTUI)
    if (this.tui && typeof (this.tui as any).setLoggerService === 'function') {
      (this.tui as any).setLoggerService(this.loggerService);
    }
    
    // Set logger service on GrokClient
    this.grokClient.setLoggerService(this.loggerService);
    
    // Commands will be set up after CommandRouter is initialized
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
      
      await this.loadSelectedGame(mostRecentGame, !!this.commandToExecute);
    } else {
      // No games exist, auto-create new game
      this.tui.showWelcome('Welcome to Shadow Kingdom!');
      this.tui.display('Starting your first adventure...');
      
      const result = await this.gameManagementService.createGameAutomatic();
      if (result.success && result.game) {
        this.tui.display(`Created new adventure: ${new Date(result.game.created_at).toLocaleString()}`);
        await this.loadSelectedGame(result.game, !!this.commandToExecute);
      } else {
        // Fallback if auto-creation fails
        this.showWelcome();
        this.processInput(); // Start input processing loop
        return;
      }
    }

    // Execute command if provided, then exit
    if (this.commandToExecute) {
      // Log the command being executed
      this.tui.display(`> ${this.commandToExecute}`);
      await this.processCommand(this.commandToExecute);
      
      await this.cleanup();
      this.tui.destroy();
      process.exit(0);
    } else {
      // Start input processing loop for interactive mode
      this.processInput();
    }
  }

  /**
   * Get current session for testing purposes
   */
  public getCurrentSession() {
    return this.gameStateManager.getCurrentSession();
  }

  /**
   * Get the current character ID from game state
   * @returns Promise<number> The character ID for the current game session
   * @throws Error if no session or character found
   */
  private async getCurrentCharacterId(): Promise<number> {
    const session = this.gameStateManager.getCurrentSession();
    if (!session) {
      throw new Error('No active game session');
    }

    // Get character ID from game state (proper approach)
    const gameState = await this.gameStateManager.getGameState(session.gameId);
    if (!gameState || !gameState.character_id) {
      throw new Error('No character found for this game');
    }
    
    return gameState.character_id;
  }

  /**
   * Display equipment summary for a character
   * @param characterId Character ID to display equipment for
   * @param showTitle Whether to show the equipment title
   */
  private async displayEquipmentSummary(characterId: number, showTitle: boolean = true): Promise<void> {
    const equipmentSummary = await this.equipmentService.getEquipmentSummary(characterId);
    
    if (showTitle) {
      this.tui.display('═══ EQUIPMENT ═══', MessageType.NORMAL);
    } else {
      this.tui.display('\n--- EQUIPMENT ---', MessageType.SYSTEM);
    }
    
    const slots = ['hand', 'head', 'body', 'foot'] as const;
    
    for (const slot of slots) {
      const item = equipmentSummary[slot];
      const slotLabel = showTitle ? slot.toUpperCase() : (slot.charAt(0).toUpperCase() + slot.slice(1));
      if (item) {
        this.tui.display(`${slotLabel}: ${item.item.name}`, MessageType.NORMAL);
      } else {
        this.tui.display(`${slotLabel}: [Empty]`, MessageType.NORMAL);
      }
    }
  }

  /**
   * Create a mock TUI for testing that doesn't use blessed.js
   */
  private createMockTUI(): TUIInterface {
    const mockTUI = {
      initialize: async () => {},
      display: (message: string, type?: MessageType) => {
        // Log to development log if logger service is available
        if (this.loggerService) {
          // Map MessageType to logger type
          let logType: 'room' | 'dialogue' | 'combat' | 'system' = 'system';
          if (type === MessageType.ROOM_TITLE || type === MessageType.ROOM_DESCRIPTION) {
            logType = 'room';
          } else if (type === MessageType.ERROR) {
            logType = 'combat';
          }
          this.loggerService.logSystemOutput(message, logType);
        } else {
          // Fallback to console output for debugging
          console.log(message);
        }
      },
      displayLines: (lines: string[], type?: MessageType) => {
        lines.forEach(line => mockTUI.display(line, type));
      },
      showWelcome: () => {},
      showError: (message: string) => {
        mockTUI.display(message, MessageType.ERROR);
      },
      getInput: () => Promise.resolve(''),
      updateStatus: () => {},
      clear: () => {},
      destroy: () => {},
      setPrompt: () => {},
      setStatus: () => {},
      showAIProgress: () => {},
      displayRoom: () => {}
    };
    return mockTUI;
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
      if (!gameState) return;

      // Get player character - try character_id from game state first, then fall back to game ID as character ID
      let character;
      if (gameState.character_id) {
        character = await this.characterService.getCharacter(gameState.character_id);
      } else {
        // Fallback: use gameId as characterId (legacy approach used throughout the codebase)
        character = await this.characterService.getCharacter(session.gameId!);
      }
      
      if (!character) {
        return;
      }

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

      // Generate unique action ID for deduplication
      const actionId = `${Date.now()}-${Math.random()}`;
      
      // Process item-specific triggers
      if (context.itemId) {
        await this.eventTriggerService.processTrigger(
          eventType,
          'item',
          context.itemId,
          { ...triggerContext, actionId }
        );
      }

      // Process room-specific triggers for movement events
      if (room && (actionType === 'enter' || actionType === 'exit')) {
        await this.eventTriggerService.processTrigger(
          eventType,
          'room',
          room.id,
          { ...triggerContext, actionId }
        );
      }

      // Process global triggers
      await this.eventTriggerService.processTrigger(
        eventType,
        'global',
        null,
        { ...triggerContext, actionId }
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

    // Strip articles from item name for more natural language processing
    const cleanItemName = stripArticles(itemName);

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
      const targetItem = this.itemService.findItemByName(roomItems, cleanItemName);

      if (!targetItem) {
        this.tui.display(`There is no ${cleanItemName} here.`, MessageType.ERROR);
        
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

      // Check if hostile characters are blocking the Vault Key
      if (targetItem.item.name === 'Vault Key') {
        const hostileCharacters = await this.characterService.getHostileCharacters(currentRoom.id);
        if (hostileCharacters.length > 0) {
          // Find the Stone Sentinel specifically
          const stoneSentinel = hostileCharacters.find(c => c.name === 'Stone Sentinel');
          if (stoneSentinel) {
            this.tui.display('The Stone Sentinel blocks your path to the key!', MessageType.ERROR);
            this.tui.display('You must defeat it first.', MessageType.SYSTEM);
          } else {
            this.tui.display('Hostile creatures block your path to the key!', MessageType.ERROR);
            this.tui.display('You must defeat them first.', MessageType.SYSTEM);
          }
          return;
        }
      }

      const characterId = await this.getCurrentCharacterId();

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
      
      // Process pickup triggers for the item
      await this.executeValidatedAction(
        'pickup',
        { itemId: targetItem.item_id },
        async () => {
          // Action already executed above, this is just for trigger processing
        }
      );

    } catch (error) {
      console.error('Error picking up item:', error);
      this.tui.showError('Error picking up item', (error as Error)?.message);
    }
  }

  /**
   * Handle pickup all command - pick up all non-fixed items from current room
   */
  private async handlePickupAll(): Promise<void> {
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

      // Get all items in the current room
      const roomItems = await this.itemService.getRoomItems(currentRoom.id);
      
      if (roomItems.length === 0) {
        this.tui.display('There are no items here to pick up.', MessageType.ERROR);
        return;
      }

      // Filter out fixed items
      let pickupableItems = roomItems.filter((item: any) => !item.item.is_fixed);
      
      // Check if hostile characters are blocking the Vault Key
      const hostileCharacters = await this.characterService.getHostileCharacters(currentRoom.id);
      if (hostileCharacters.length > 0) {
        // Filter out Vault Key if hostile characters are present
        const vaultKeyInRoom = pickupableItems.find((item: any) => item.item.name === 'Vault Key');
        if (vaultKeyInRoom) {
          pickupableItems = pickupableItems.filter((item: any) => item.item.name !== 'Vault Key');
          // We'll report this after checking if there are other items
        }
      }
      
      if (pickupableItems.length === 0) {
        // Check if the only item was the blocked Vault Key
        const vaultKeyInRoom = roomItems.find((item: any) => item.item.name === 'Vault Key' && !item.item.is_fixed);
        if (vaultKeyInRoom && hostileCharacters.length > 0) {
          const stoneSentinel = hostileCharacters.find(c => c.name === 'Stone Sentinel');
          if (stoneSentinel) {
            this.tui.display('The Stone Sentinel blocks your path to the Vault Key!', MessageType.ERROR);
            this.tui.display('You must defeat it first.', MessageType.SYSTEM);
          } else {
            this.tui.display('Hostile creatures block your path to the key!', MessageType.ERROR);
            this.tui.display('You must defeat them first.', MessageType.SYSTEM);
          }
        } else {
          this.tui.display('There are no items here that can be picked up.', MessageType.ERROR);
        }
        return;
      }

      const characterId = await this.getCurrentCharacterId();
      const pickedUpItems: string[] = [];
      const failedItems: { name: string; reason: string }[] = [];

      const processedItemIds: number[] = [];
      
      // Process each item
      for (const roomItem of pickupableItems) {
        // Check if character can add another item to inventory
        const canAddItem = await this.itemService.canAddItemToInventory(characterId);
        
        if (!canAddItem) {
          // Inventory full - stop processing and report what we got
          const inventoryStatus = await this.itemService.getInventoryStatus(characterId);
          failedItems.push({ 
            name: roomItem.item.name, 
            reason: 'inventory full' 
          });
          
          // Stop processing if inventory is full
          if (pickedUpItems.length === 0) {
            this.tui.display('Your inventory is full!', MessageType.ERROR);
            this.tui.display(inventoryStatus, MessageType.SYSTEM);
            return;
          }
          break;
        }

        try {
          // Transfer item from room to character inventory
          await this.itemService.transferItemToInventory(
            characterId, 
            roomItem.item_id, 
            roomItem.room_id,
            1
          );

          pickedUpItems.push(roomItem.item.name);
          processedItemIds.push(roomItem.item_id);

        } catch (error) {
          // Individual item failure - continue with others
          failedItems.push({ 
            name: roomItem.item.name, 
            reason: 'error during pickup' 
          });
        }
      }

      // Process pickup triggers for all successfully picked up items (batched to prevent duplicate messages)
      if (processedItemIds.length > 0) {
        const session = this.gameStateManager.getCurrentSession();
        const character = await this.characterService.getPlayerCharacter(session.gameId!);
        const room = await this.gameStateManager.getCurrentRoom();
        
        if (character && room) {
          const actionId = Date.now().toString(); // Single action ID for the entire batch
          const triggerContext = {
            character,
            room,
            actionId
          };

          // Process triggers for each item with the same action ID to prevent duplicates
          for (const itemId of processedItemIds) {
            const item = await this.itemService.getItem(itemId);
            if (item) {
              await this.eventTriggerService.processTrigger(
                'pickup',
                'item',
                itemId,
                { ...triggerContext, item }
              );
            }
          }
        }
      }

      // Report results
      if (pickedUpItems.length > 0 && failedItems.length === 0) {
        // Complete success
        this.tui.display(`You pick up: ${pickedUpItems.join(', ')}.`, MessageType.NORMAL);
      } else if (pickedUpItems.length > 0 && failedItems.length > 0) {
        // Partial success
        this.tui.display(`You pick up: ${pickedUpItems.join(', ')}.`, MessageType.NORMAL);
        const failedReasons = failedItems.map(f => `${f.name} (${f.reason})`).join(', ');
        this.tui.display(`Could not pick up: ${failedReasons}.`, MessageType.SYSTEM);
      } else if (pickedUpItems.length === 0 && failedItems.length > 0) {
        // Complete failure
        const failedReasons = failedItems.map(f => `${f.name} (${f.reason})`).join(', ');
        this.tui.display(`You cannot pick up any items: ${failedReasons}.`, MessageType.ERROR);
      }

    } catch (error) {
      console.error('Error picking up all items:', error);
      this.tui.showError('Error picking up items', (error as Error)?.message);
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
      if (!session) {
        this.tui.display('No active game session.', MessageType.ERROR);
        return;
      }

      // Get character ID from game state (proper approach)
      const gameState = await this.gameStateManager.getGameState(session.gameId);
      if (!gameState || !gameState.character_id) {
        this.tui.display('No character found for this game.', MessageType.ERROR);
        return;
      }
      
      const characterId = gameState.character_id;

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
   * Handle drop command with resolved targets - supports both single items and "drop all"
   */
  private async handleDropWithTargets(targets: ResolvedTarget[]): Promise<void> {
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

      const characterId = await this.getCurrentCharacterId();
      const droppedItems: string[] = [];
      const failedItems: string[] = [];

      // Process each target with full validation
      for (const target of targets) {
        try {
          // Skip equipped items (they shouldn't be in the targets, but double-check)
          if (target.metadata?.isEquipped) {
            failedItems.push(`${target.name} (equipped)`);
            continue;
          }

          // Validate the drop action with item context
          await this.executeValidatedAction(
            'drop',
            { itemId: target.entity.item_id },
            async () => {
              // Transfer item from character inventory to room
              await this.itemService.transferItemToRoom(
                characterId,
                target.entity.item_id,
                currentRoom.id,
                1
              );

              droppedItems.push(target.name);
            }
          );

        } catch (error) {
          console.error(`Error dropping ${target.name}:`, error);
          failedItems.push(target.name);
        }
      }

      // Display results
      if (droppedItems.length > 0) {
        if (droppedItems.length === 1) {
          this.tui.display(`You drop the ${droppedItems[0]}.`, MessageType.NORMAL);
        } else {
          this.tui.display(`You drop: ${droppedItems.join(', ')}.`, MessageType.NORMAL);
        }
      }

      if (failedItems.length > 0) {
        this.tui.display(`Could not drop: ${failedItems.join(', ')}.`, MessageType.ERROR);
      }

      if (droppedItems.length === 0 && failedItems.length === 0) {
        this.tui.display('Nothing to drop.', MessageType.ERROR);
      }

    } catch (error) {
      console.error('Error in drop command:', error);
      this.tui.showError('Error dropping items', (error as Error)?.message);
    }
  }

  /**
   * Handle drop command - drop items from inventory to current room (legacy)
   * @deprecated Use handleDropWithTargets for enhanced functionality
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

    // Strip articles from item name for more natural language processing
    const cleanItemName = stripArticles(itemName);

    try {
      const session = this.gameStateManager.getCurrentSession();
      const currentRoom = await this.gameStateManager.getCurrentRoom();
      
      if (!currentRoom) {
        this.tui.display('Error: Unable to determine current room.', MessageType.ERROR);
        return;
      }

      const characterId = await this.getCurrentCharacterId();

      // Get character's inventory
      const inventory = await this.itemService.getCharacterInventory(characterId);
      
      if (inventory.length === 0) {
        this.tui.display('Your inventory is empty.', MessageType.ERROR);
        return;
      }

      // Find item by name (case-insensitive partial match)
      const targetItem = this.itemService.findItemByName(inventory, cleanItemName);

      if (!targetItem) {
        this.tui.display(`You don't have a ${cleanItemName}.`, MessageType.ERROR);
        
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
        }
      );

    } catch (error) {
      console.error('Error dropping item:', error);
      this.tui.showError('Error dropping item', (error as Error)?.message);
    }
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
      const session = this.gameStateManager.getCurrentSession();
      if (!session.gameId) {
        this.tui.display('No active game session.', MessageType.ERROR);
        return;
      }
      
      const character = await this.characterService.getPlayerCharacter(session.gameId);
      
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
      const characterId = await this.getCurrentCharacterId();

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
      const characterId = await this.getCurrentCharacterId();

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
      if (!session) {
        this.tui.display('No active game session.', MessageType.ERROR);
        return;
      }

      // Get character ID from game state (proper approach)
      const gameState = await this.gameStateManager.getGameState(session.gameId);
      if (!gameState || !gameState.character_id) {
        this.tui.display('No character found for this game.', MessageType.ERROR);
        return;
      }
      
      const characterId = gameState.character_id;

      // Use the consolidated equipment display method
      await this.displayEquipmentSummary(characterId, true);

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

      // Get character ID from game state (proper approach)
      const gameState = await this.gameStateManager.getGameState(session.gameId);
      if (!gameState || !gameState.character_id) {
        this.tui.display('No character found for this game.', MessageType.ERROR);
        return;
      }
      
      const characterId = gameState.character_id;
      console.log(`DEBUG: Stats command - Using character ID: ${characterId} from game state`);

      // Get character information
      const character = await this.characterService.getCharacter(characterId);
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

      // Get character modifiers including status effects
      const modifiers = await this.characterService.getCharacterModifiersWithEffects(character.id);

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

      // Show equipment summary using consolidated method
      await this.displayEquipmentSummary(characterId, false);

      // Show armor bonus
      this.tui.display('\n--- ARMOR ---', MessageType.SYSTEM);
      const totalArmorPoints = await this.equipmentService.calculateArmorPoints(characterId);
      this.tui.display(`🛡️  Total Armor: ${totalArmorPoints} (damage reduction)`, MessageType.NORMAL);

    } catch (error) {
      console.error('Error displaying character stats:', error);
      this.tui.display('Error displaying character stats.', MessageType.ERROR);
    }
  }

  /**
   * Handle talk command - talk to a character in the current room
   */
  private async handleTalkCommand(args: string[]): Promise<void> {
    if (!this.gameStateManager.isInGame()) {
      this.tui.display('No game is currently loaded.', MessageType.SYSTEM);
      return;
    }

    // Parse talk command with article stripping and "to" handling  
    const characterName = parseTalkCommand(args);
    
    if (!characterName) {
      this.tui.display('Who would you like to talk to?', MessageType.ERROR);
      return;
    }

    try {
      const session = this.gameStateManager.getCurrentSession();
      const currentRoom = await this.gameStateManager.getCurrentRoom();
      
      if (!currentRoom) {
        this.tui.display('Error: Unable to determine current room.', MessageType.ERROR);
        return;
      }

      const character = await this.findCharacterInRoom(characterName, currentRoom.id);
      
      if (!character) {
        this.tui.display(`There is no one named "${characterName}" here.`, MessageType.ERROR);
        return;
      }
      
      // Check if character is dead
      if (character.is_dead) {
        this.tui.display(`${character.name} is lifeless and does not respond.`, MessageType.NORMAL);
        return;
      }

      // Use custom dialogue response if available, otherwise use sentiment-based response
      let response: string;
      if (character.dialogue_response && character.dialogue_response.trim() !== '') {
        response = character.dialogue_response;
      } else {
        // Get character's current sentiment
        const sentiment = await this.characterService.getSentiment(character.id);
        response = this.characterService.getSentimentDialogueResponse(sentiment);
      }

      this.tui.display(`${character.name} says: "${response}"`, MessageType.NORMAL);

    } catch (error) {
      console.error('Error talking to character:', error);
      this.tui.showError('Error talking to character', (error as Error)?.message);
    }
  }

  /**
   * Handle attack command - attack a character in the current room
   */
  private async handleAttackCommand(targetName: string): Promise<void> {
    if (!this.gameStateManager.isInGame()) {
      this.tui.display('No game is currently loaded.', MessageType.SYSTEM);
      return;
    }

    if (!targetName) {
      this.tui.display('Attack who? Specify a target (e.g., "attack goblin")', MessageType.ERROR);
      return;
    }

    // Strip articles from target name for more natural language processing
    const cleanTargetName = stripArticles(targetName);

    const session = this.gameStateManager.getCurrentSession();
    const currentRoom = await this.gameStateManager.getCurrentRoom();
    
    if (!currentRoom) {
      this.tui.display('Error: Unable to determine current room.', MessageType.ERROR);
      return;
    }

    const character = await this.findCharacterInRoom(cleanTargetName, currentRoom.id);
    
    if (!character) {
      // Throw error to trigger AI fallback instead of handling gracefully
      throw new Error(`Character not found: ${cleanTargetName}`);
    }

    try {
      
      if (character.is_dead) {
        this.tui.display(`The ${character.name} is already dead.`, MessageType.ERROR);
        return;
      }
      
      // Get current health status
      const healthStatus = await this.characterService.getCharacterHealth(character.id);
      if (!healthStatus) {
        this.tui.display('Error: Unable to get character health.', MessageType.ERROR);
        return;
      }
      
      // Get game state and attacker character for strength-based attack calculation
      const session = this.gameStateManager.getCurrentSession();
      if (!session) {
        this.tui.display('No active game session.', MessageType.ERROR);
        return;
      }

      const gameState = await this.gameStateManager.getGameState(session.gameId);
      if (!gameState || !gameState.character_id) {
        this.tui.display('No character found for this game.', MessageType.ERROR);
        return;
      }
      
      const attackerCharacterId = gameState.character_id;
      const attacker = await this.characterService.getCharacter(attackerCharacterId);
      if (!attacker) {
        this.tui.display('Error: Unable to get attacker character.', MessageType.ERROR);
        return;
      }
      
      // Calculate attack with detailed results
      const { calculateAttack } = await import('./utils/combat');
      const attackResult = calculateAttack(attacker.strength, character.dexterity);
      
      if (!attackResult.hits) {
        const strModText = attackResult.strengthModifier >= 0 ? `+${attackResult.strengthModifier}` : `${attackResult.strengthModifier}`;
        const dexModText = attackResult.dexterityModifier >= 0 ? `+${attackResult.dexterityModifier}` : `${attackResult.dexterityModifier}`;
        this.tui.display(
          `You attack the ${character.name}, but miss! [Roll: ${attackResult.d20Roll}${strModText}=${attackResult.attackRoll} vs ${attackResult.targetNumber} (10${dexModText})]`, 
          MessageType.NORMAL
        );
        return;
      }
      
      // Calculate damage including weapon bonus (attacker)
      const baseDamage = 2;
      const attackDamage = await this.equipmentService.calculateAttackDamage(attackerCharacterId, baseDamage);
      
      // Apply armor damage reduction (defender)
      const finalDamage = await this.equipmentService.calculateDamageAfterArmor(character.id, attackDamage);
      const newHealth = Math.max(0, healthStatus.current - finalDamage);
      
      // Update character health
      await this.characterService.updateCharacterHealth(character.id, newHealth);

      // Update character sentiment to hostile after successful attack
      const oldSentiment = await this.characterService.getSentiment(character.id);
      await this.characterService.setSentiment(character.id, CharacterSentiment.HOSTILE);
      const newSentiment = await this.characterService.getSentiment(character.id);
      
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log(`💥 Sentiment change: ${character.name} (${character.type}) ${oldSentiment} -> ${newSentiment}`);
      }
      
      // Inform player that the character became hostile (if not already hostile)
      if (oldSentiment !== CharacterSentiment.HOSTILE && newSentiment === CharacterSentiment.HOSTILE) {
        this.tui.display(`The ${character.name} becomes hostile toward you!`, MessageType.SYSTEM);
      }
      
      const strModText = attackResult.strengthModifier >= 0 ? `+${attackResult.strengthModifier}` : `${attackResult.strengthModifier}`;
      const dexModText = attackResult.dexterityModifier >= 0 ? `+${attackResult.dexterityModifier}` : `${attackResult.dexterityModifier}`;
      this.tui.display(
        `You attack the ${character.name}. The ${character.name} takes ${finalDamage} damage. [Roll: ${attackResult.d20Roll}${strModText}=${attackResult.attackRoll} vs ${attackResult.targetNumber} (10${dexModText})]`, 
        MessageType.NORMAL
      );
      
      // Check if character died from the attack
      if (newHealth <= 0) {
        await this.characterService.setCharacterDead(character.id);
        this.tui.display(`The ${character.name} dies from your attack!`, MessageType.NORMAL);
      }

    } catch (error) {
      console.error('Error attacking character:', error);
      this.tui.showError('Error attacking character', (error as Error)?.message);
    }
  }

  /**
   * Handle attack shortcut command - "a" with auto-targeting for hostile characters
   */
  private async handleAttackShortcutCommand(args: string[]): Promise<void> {
    if (!this.gameStateManager.isInGame()) {
      this.tui.display('No game is currently loaded.', MessageType.SYSTEM);
      return;
    }

    const currentRoom = await this.gameStateManager.getCurrentRoom();
    if (!currentRoom) {
      this.tui.display('Error: Unable to determine current room.', MessageType.ERROR);
      return;
    }

    if (args.length === 0) {
      // Auto-targeting logic when no arguments provided
      const hostileCharacters = await this.characterService.getHostileCharacters(currentRoom.id);
      
      if (hostileCharacters.length === 0) {
        this.tui.display("There's nothing to attack here.", MessageType.ERROR);
        return;
      } else if (hostileCharacters.length === 1) {
        // Auto-target the single hostile character
        const targetName = hostileCharacters[0].name;
        await this.handleAttackCommand(targetName);
      } else {
        // Multiple hostile characters - prompt for manual targeting
        this.tui.display('Multiple targets available. Please specify: attack [character name]', MessageType.ERROR);
        return;
      }
    } else {
      // Manual targeting with specified arguments - behave like normal attack
      const targetName = args.join(' ');
      await this.handleAttackCommand(targetName);
    }
  }

  /**
   * Handle give command - give an item to a character
   */
  private async handleGiveCommand(args: string[]): Promise<void> {
    if (!this.gameStateManager.isInGame()) {
      this.tui.display('No game is currently loaded.', MessageType.SYSTEM);
      return;
    }

    // Parse give command with article stripping and preposition handling
    const parsed = parseGiveCommand(args);
    
    if (!parsed.item || !parsed.target) {
      this.tui.display('Give what to whom? Use: give [item] to [character]', MessageType.ERROR);
      return;
    }

    try {
      const session = this.gameStateManager.getCurrentSession();
      const currentRoom = await this.gameStateManager.getCurrentRoom();
      
      if (!currentRoom) {
        this.tui.display('Error: Unable to determine current room.', MessageType.ERROR);
        return;
      }

      const itemName = parsed.item;
      const characterName = parsed.target;

      // Get player inventory
      const characterId = await this.getCurrentCharacterId();
      const inventory = await this.itemService.getCharacterInventory(characterId);
      
      // Find item in inventory
      const item = this.itemService.findItemByName(inventory, itemName);
      if (!item) {
        this.tui.display(`You don't have "${itemName}" in your inventory.`, MessageType.ERROR);
        return;
      }

      // Find character in room
      const character = await this.findCharacterInRoom(characterName, currentRoom.id);
      
      if (!character) {
        this.tui.display(`There is no one named "${characterName}" here.`, MessageType.ERROR);
        return;
      }

      // Check if character is dead
      if (character.is_dead) {
        this.tui.display(`${character.name} is dead and cannot receive items.`, MessageType.ERROR);
        return;
      }

      // Remove item from player inventory (reduce quantity or delete if quantity is 1)
      if (item.quantity > 1) {
        await this.db.run(
          'UPDATE character_inventory SET quantity = quantity - 1 WHERE character_id = ? AND item_id = ?',
          [characterId, item.item_id]
        );
      } else {
        await this.db.run(
          'DELETE FROM character_inventory WHERE character_id = ? AND item_id = ?',
          [characterId, item.item_id]
        );
      }

      // Display success messages
      this.tui.display(`You give the ${item.item.name} to the ${character.name}.`, MessageType.NORMAL);
      
      // Handle sentiment improvement for giving items to NPCs
      let sentimentMessage = `${character.name} says, "Thank you."`;
      
      if (character.type === CharacterType.NPC && !character.is_dead) {
        try {
          // Improve sentiment by one step for any item given
          const oldSentiment = await this.characterService.getSentiment(character.id);
          const newSentiment = await this.characterService.changeSentiment(character.id, 1);
          
          // If sentiment actually improved, show additional message
          if (newSentiment !== oldSentiment) {
            const sentimentMessages = {
              [CharacterSentiment.HOSTILE]: `${character.name} seems slightly less hostile toward you.`,
              [CharacterSentiment.AGGRESSIVE]: `${character.name} appears to be warming up to you.`,
              [CharacterSentiment.INDIFFERENT]: `${character.name} looks at you with newfound interest.`,
              [CharacterSentiment.FRIENDLY]: `${character.name} smiles warmly at your generosity.`,
              [CharacterSentiment.ALLIED]: `${character.name} regards you as a trusted ally.`
            };
            
            sentimentMessage += ` ${sentimentMessages[newSentiment] || ''}`;
          }
        } catch (error) {
          console.error('Error updating character sentiment:', error);
          // Continue with basic message if sentiment update fails
        }
      }
      
      this.tui.display(sentimentMessage, MessageType.NORMAL);

    } catch (error) {
      console.error('Error giving item:', error);
      this.tui.showError('Error giving item to character', (error as Error)?.message);
    }
  }

  /**
   * Find a character in the specified room by name (case-insensitive, supports partial matching)
   */
  private async findCharacterInRoom(characterName: string, roomId: number): Promise<Character | null> {
    // Get all characters in the room
    const characters = await this.db.all<Character>(
      'SELECT * FROM characters WHERE current_room_id = ?',
      [roomId]
    );
    
    // Find character using partial name matching (similar to item service)
    const foundCharacter = characters.find(character => 
      character.name.toLowerCase().includes(characterName.toLowerCase())
    );
    
    return foundCharacter || null;
  }

  /**
   * Handle teleport command - emergency teleport to escape dead-ends
   */
  private async handleTeleport(args: string[]): Promise<void> {
    if (!this.gameStateManager.isInGame()) {
      this.tui.display('No game is currently loaded.', MessageType.SYSTEM);
      return;
    }

    if (args.length === 0) {
      this.tui.display('Usage: teleport <room_name>', MessageType.SYSTEM);
      this.tui.display('Examples: teleport Library, teleport Entrance Hall, teleport Garden', MessageType.SYSTEM);
      this.tui.display('This is an emergency command for escaping dead-end rooms.', MessageType.SYSTEM);
      return;
    }

    const target = args.join(' ');
    const session = this.gameStateManager.getCurrentSession();
    
    if (!session.gameId) {
      this.tui.display('Error: No current game found.', MessageType.ERROR);
      return;
    }

    try {
      // First, try exact name match within the current game
      let targetRoom = await this.db.get<any>(
        'SELECT * FROM rooms WHERE game_id = ? AND name = ?',
        [session.gameId, target]
      );

      // If no exact match, try case-insensitive partial matching
      if (!targetRoom) {
        targetRoom = await this.db.get<any>(
          'SELECT * FROM rooms WHERE game_id = ? AND LOWER(name) LIKE LOWER(?)',
          [session.gameId, `%${target}%`]
        );
      }

      // If still no match and target is a number, try room ID as fallback
      if (!targetRoom) {
        const roomId = parseInt(target);
        if (!isNaN(roomId)) {
          targetRoom = await this.db.get<any>(
            'SELECT * FROM rooms WHERE game_id = ? AND id = ?',
            [session.gameId, roomId]
          );
        }
      }

      if (!targetRoom) {
        // Show available rooms to help the user
        const allRooms = await this.db.all<{name: string}>(
          'SELECT name FROM rooms WHERE game_id = ? ORDER BY name',
          [session.gameId]
        );
        
        this.tui.display(`Could not find room: "${target}"`, MessageType.ERROR);
        if (allRooms.length > 0) {
          this.tui.display('Available rooms:', MessageType.SYSTEM);
          allRooms.forEach(room => {
            this.tui.display(`  • ${room.name}`, MessageType.SYSTEM);
          });
        }
        return;
      }

      // Use the game state manager to move to the room (handles both state and DB updates)
      await this.gameStateManager.moveToRoom(targetRoom.id);

      this.tui.display(`🌟 Emergency teleport successful!`, MessageType.SYSTEM);
      this.tui.display(`You have been teleported to: ${targetRoom.name}`, MessageType.NORMAL);
      this.tui.display('', MessageType.NORMAL); // Add spacing
      
      // Show the new room automatically
      try {
        await this.lookAround();
      } catch (displayError) {
        console.error('Error displaying room after teleport:', displayError);
        this.tui.display('You are now in the room, but there was an issue displaying it.', MessageType.ERROR);
        this.tui.display('Try using the "look" command.', MessageType.SYSTEM);
      }

    } catch (error) {
      console.error('Error during teleport:', error);
      this.tui.showError('Teleport failed', (error as Error)?.message);
    }
  }

  /**
   * Check if an item is armor-type (can be worn)
   */
  private isArmorItem(item: Item): boolean {
    const armorTypes = ['armor', 'helmet', 'boots', 'gloves', 'shield', 'cloak', 'ring', 'amulet'];
    return armorTypes.some(type => 
      item.type === type || 
      item.name.toLowerCase().includes(type) ||
      item.description.toLowerCase().includes('wear') ||
      item.description.toLowerCase().includes('armor')
    );
  }

  /**
   * Check if an item is weapon-type (can be used as a weapon)
   */
  private isWeaponItem(item: Item): boolean {
    const weaponTypes = ['weapon', 'sword', 'axe', 'bow', 'dagger', 'staff', 'mace', 'hammer'];
    return weaponTypes.some(type => 
      item.type === type || 
      item.name.toLowerCase().includes(type) ||
      item.description.toLowerCase().includes('weapon') ||
      item.description.toLowerCase().includes('wield')
    );
  }

  /**
   * Handle wearing armor items (context-aware equip alias)
   */
  private async handleWear(itemName: string): Promise<void> {
    if (!this.gameStateManager.isInGame()) {
      this.tui.display('No game is currently loaded.', MessageType.SYSTEM);
      return;
    }

    if (!itemName) {
      this.tui.display('Wear what?', MessageType.ERROR);
      return;
    }

    try {
      const characterId = await this.getCurrentCharacterId();

      // Find the item in inventory that can be equipped
      const item = await this.equipmentService.findEquippableItem(characterId, itemName);
      if (!item) {
        this.tui.display(`You don't have a ${itemName}.`, MessageType.ERROR);
        return;
      }

      // Validate item is armor-type
      if (!this.isArmorItem(item.item)) {
        this.tui.display(`You can't wear a ${item.item.name}. Try "equip" or "use" instead.`, MessageType.ERROR);
        return;
      }

      // Route to existing equip logic
      return this.handleEquip(itemName);

    } catch (error) {
      console.error('Error wearing item:', error);
      this.tui.display((error as Error).message, MessageType.ERROR);
    }
  }

  /**
   * Handle using weapon items (context-aware equip alias)
   */
  private async handleUse(itemName: string): Promise<void> {
    if (!this.gameStateManager.isInGame()) {
      this.tui.display('No game is currently loaded.', MessageType.SYSTEM);
      return;
    }

    if (!itemName) {
      this.tui.display('Use what?', MessageType.ERROR);
      return;
    }

    try {
      const characterId = await this.getCurrentCharacterId();

      // Find the item in inventory that can be equipped
      const item = await this.equipmentService.findEquippableItem(characterId, itemName);
      if (!item) {
        this.tui.display(`You don't have a ${itemName}.`, MessageType.ERROR);
        return;
      }

      // Validate item is weapon-type
      if (!this.isWeaponItem(item.item)) {
        this.tui.display(`You can't use a ${item.item.name} as a weapon. Try "equip" or "wear" instead.`, MessageType.ERROR);
        return;
      }

      // Route to existing equip logic
      return this.handleEquip(itemName);

    } catch (error) {
      console.error('Error using item:', error);
      this.tui.display((error as Error).message, MessageType.ERROR);
    }
  }

}