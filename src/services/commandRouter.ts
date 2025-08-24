import { UnifiedNLPEngine } from '../nlp/unifiedNLPEngine';
import { GameContext as NLPGameContext, NLPResult } from '../nlp/types';
import { TUIInterface } from '../ui/TUIInterface';
import { MessageType } from '../ui/MessageFormatter';
import { AICommandFallback } from './aiCommandFallback';
import { GrokClient } from '../ai/grokClient';
import { CommandParsingError } from './commandParsingError';
import { TargetResolutionService } from './targetResolutionService';
import { TargetContext, ResolvedTarget, GameContext } from '../types/targetResolution';
import { ItemService } from './itemService';
import { CharacterService } from './characterService';
import { GameStateManager } from './gameStateManager';
import Database from '../utils/database';

// Legacy command interface for backward compatibility
export interface Command {
  name: string;
  description: string;
  handler: (args: string[]) => void | Promise<void>;
}

// Enhanced command interface with target resolution support
export interface EnhancedCommand {
  name: string;
  description: string;
  targetContext?: TargetContext;
  supportsAll?: boolean;
  requiresTarget?: boolean;
  maxTargets?: number;
  resolutionOptions?: {
    includeFixed?: boolean;
    includeHostileBlocked?: boolean;
    includeEquipped?: boolean;
    maxResults?: number;
    exactMatchOnly?: boolean;
  };
  handler: (targets: ResolvedTarget[], context: GameContext) => void | Promise<void>;
}

// Union type for both command types
export type AnyCommand = Command | EnhancedCommand;

export interface CommandExecutionContext {
  gameContext: NLPGameContext;
  recentCommands: string[];
}

export interface CommandRouterOptions {
  enableDebugLogging?: boolean;
}

/**
 * CommandRouter handles command registration, routing, and execution.
 * It supports both exact command matching and NLP-based command resolution.
 */
export class CommandRouter {
  private commands: Map<string, AnyCommand> = new Map();
  private nlpEngine: UnifiedNLPEngine;
  private options: CommandRouterOptions;
  private tui: TUIInterface | null;
  private aiCommandFallback: AICommandFallback | null = null;
  private targetResolver: TargetResolutionService;
  private gameStateManager: GameStateManager;

  constructor(
    nlpEngine: UnifiedNLPEngine, 
    grokClient: GrokClient, 
    db: Database, 
    itemService: ItemService,
    characterService: CharacterService,
    gameStateManager: GameStateManager,
    tui: TUIInterface | null = null, 
    options: CommandRouterOptions = {}
  ) {
    this.nlpEngine = nlpEngine;
    this.tui = tui;
    this.options = {
      enableDebugLogging: false,
      ...options
    };
    this.aiCommandFallback = new AICommandFallback(grokClient, db, tui, {
      enableDebugLogging: options.enableDebugLogging || false
    });
    this.gameStateManager = gameStateManager;
    this.targetResolver = new TargetResolutionService(
      db,
      itemService,
      characterService,
      gameStateManager
    );
  }

  /**
   * Register a command (legacy support)
   */
  addCommand(command: Command): void {
    this.commands.set(command.name.toLowerCase(), command);
  }

  /**
   * Register an enhanced command with target resolution support
   */
  addEnhancedCommand(command: EnhancedCommand): void {
    this.commands.set(command.name.toLowerCase(), command);
  }

  /**
   * Get all commands
   */
  getCommands(): Map<string, AnyCommand> {
    return this.commands;
  }

  /**
   * Register a command (legacy menu command method for backward compatibility)
   * @deprecated Use addCommand() instead
   */
  addMenuCommand(command: Command): void {
    this.addCommand(command);
  }

  /**
   * Register a command (legacy game command method for backward compatibility)
   * @deprecated Use addCommand() instead
   */
  addGameCommand(command: Command): void {
    this.addCommand(command);
  }

  /**
   * Check if a command is enhanced (has target resolution support)
   */
  private isEnhancedCommand(command: AnyCommand): command is EnhancedCommand {
    return 'targetContext' in command;
  }

  /**
   * Process an enhanced command with target resolution
   */
  private async processEnhancedCommand(
    command: EnhancedCommand, 
    targetString: string, 
    context: CommandExecutionContext
  ): Promise<boolean> {
    // Check if target is required but not provided
    if (command.requiresTarget && (!targetString || !targetString.trim())) {
      this.showError(`${command.name} requires a target. Usage: ${command.name} <target>`);
      return false;
    }

    let resolvedTargets: ResolvedTarget[] = [];

    // Resolve targets if provided and context is available
    if (targetString && targetString.trim() && command.targetContext) {
      try {
        // Convert NLPGameContext to enhanced GameContext for target resolution
        // Get actual character ID from game state
        const currentCharacterId = await this.gameStateManager.getCurrentCharacterId();
        const session = this.gameStateManager.getCurrentSession();
        
        const enhancedGameContext: GameContext = {
          currentRoom: context.gameContext.currentRoom,
          characterId: currentCharacterId,
          gameId: context.gameContext.gameId || session.gameId || 1,
          sessionId: 'session-' + Date.now()
        };
        
        resolvedTargets = await this.targetResolver.resolveTargets(
          targetString.trim(),
          command.targetContext,
          enhancedGameContext,
          command.resolutionOptions
        );

        // Check if targets were found when required
        if (command.requiresTarget && resolvedTargets.length === 0) {
          this.showError(`Could not find "${targetString}".`);
          return false;
        }

        // Check target limits
        if (command.maxTargets && resolvedTargets.length > command.maxTargets) {
          resolvedTargets = resolvedTargets.slice(0, command.maxTargets);
        }

      } catch (error) {
        this.showError(`Error resolving target "${targetString}": ${error}`);
        return false;
      }
    }

    // Execute the enhanced command with resolved targets
    try {
      // Convert NLPGameContext to enhanced GameContext for command execution
      const currentCharacterId = await this.gameStateManager.getCurrentCharacterId();
      const enhancedGameContext: GameContext = {
        currentRoom: context.gameContext.currentRoom,
        gameId: context.gameContext.gameId || 1,
        characterId: currentCharacterId,
        sessionId: 'session-' + Date.now()
      };
      
      await command.handler(resolvedTargets, enhancedGameContext);
      return true;
    } catch (error) {
      this.showError(`Error executing ${command.name}: ${error}`);
      return false;
    }
  }

  /**
   * Display error message to user
   */
  private showError(message: string): void {
    if (this.tui) {
      this.tui.display(message, MessageType.ERROR);
    } else {
      console.error(message);
    }
  }

  /**
   * Process and execute a command with full context
   */
  async processCommand(input: string, context: CommandExecutionContext): Promise<boolean> {
    if (!input) return false;

    const commands = this.getCommands();
    
    // Parse command input
    const parts = input.trim().split(' ');
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);
    const targetString = args.join(' ');
    
    const exactCommand = commands.get(commandName);
    if (exactCommand) {
      try {
        // Handle enhanced commands with target resolution
        if (this.isEnhancedCommand(exactCommand)) {
          return await this.processEnhancedCommand(exactCommand, targetString, context);
        }
        
        // Handle legacy commands
        await exactCommand.handler(args);
        return true;
      } catch (error) {
        // If exact command fails, fall through to NLP processing
        if (this.isDebugEnabled()) {
          if (this.tui) {
            this.tui.display(`⚠️ Exact command "${commandName}" failed, trying NLP: ${error}`, MessageType.SYSTEM);
          }
        }
      }
    }
    
    // If no exact match or exact command failed, try NLP for entity resolution
    const nlpResult = await this.nlpEngine.processCommand(input, context.gameContext);

    if (nlpResult) {
      const success = await this.executeNLPResult(nlpResult, commands, input);
      if (success) return true;
    }

    // If neither exact nor NLP matching worked, try AI command fallback
    if (this.aiCommandFallback) {
      try {
        const availableCommands = Array.from(commands.keys());
        const aiResult = await this.aiCommandFallback.parseCommand(input, context.gameContext, availableCommands);
        
        if (aiResult) {
          const success = await this.executeNLPResult(aiResult, commands, input);
          if (success) return true;
        }
      } catch (error) {
        if (this.isDebugEnabled()) {
          if (this.tui) {
            this.tui.display(`🤖 AI fallback error: ${error}`, MessageType.SYSTEM);
          } else {
            console.log(`🤖 AI fallback error: ${error}`);
          }
        }
      }
    }

    // If all parsing methods failed, show error
    const failedCommandName = input.split(' ')[0];
    if (this.tui) {
      this.tui.display(`Unknown command: ${failedCommandName}. Type "help" for available commands.`, MessageType.ERROR);
    } else {
      console.log(`Unknown command: ${failedCommandName}. Type "help" for available commands.`);
    }
    
    // In debug mode, show NLP analysis
    if (this.isDebugEnabled() && nlpResult) {
      if (this.tui) {
        this.tui.display(`🧠 NLP attempted: "${nlpResult.action}" but command not found`, MessageType.SYSTEM);
      } else {
        console.log(`🧠 NLP attempted: "${nlpResult.action}" but command not found`);
      }
    }
    
    return false;
  }

  /**
   * Execute a command result from NLP processing
   */
  private async executeNLPResult(
    nlpResult: NLPResult, 
    commands: Map<string, AnyCommand>, 
    originalInput: string
  ): Promise<boolean> {
    const resolvedCommand = commands.get(nlpResult.action);
    
    if (resolvedCommand) {
      try {
        if (this.isDebugEnabled()) {
          const sourceIcon = nlpResult.source === 'local' ? '🎯' : '🤖';
          const debugMessage = `${sourceIcon} NLP: "${originalInput}" → "${nlpResult.action} ${nlpResult.params.join(' ')}" (source: ${nlpResult.source})`;
          if (this.tui) {
            this.tui.display(debugMessage, MessageType.SYSTEM);
            if (nlpResult.reasoning) {
              this.tui.display(`   Reasoning: ${nlpResult.reasoning}`, MessageType.SYSTEM);
            }
          } else {
            console.log(debugMessage);
            if (nlpResult.reasoning) {
              console.log(`   Reasoning: ${nlpResult.reasoning}`);
            }
          }
        }
        // Handle enhanced vs legacy commands
        if (this.isEnhancedCommand(resolvedCommand)) {
          // For enhanced commands, we need to create a proper context
          // NLP processing doesn't support target resolution yet, so pass empty targets
          const currentCharacterId = await this.gameStateManager.getCurrentCharacterId();
          const enhancedGameContext: GameContext = {
            currentRoom: undefined,
            gameId: 1,
            characterId: currentCharacterId,
            sessionId: 'session-' + Date.now()
          };
          await resolvedCommand.handler([], enhancedGameContext);
        } else {
          await resolvedCommand.handler(nlpResult.params);
        }
        return true;
      } catch (error) {
        // If it's a CommandParsingError, don't show the error yet - let AI fallback try first
        if (CommandParsingError.isCommandParsingError(error)) {
          return false; // This will trigger AI fallback
        }
        
        // For other errors, show them
        if (this.tui) {
          this.tui.display(`Error executing NLP-resolved command "${nlpResult.action}": ${error}`, MessageType.ERROR);
        } else {
          console.error(`Error executing NLP-resolved command "${nlpResult.action}":`, error);
        }
        return false;
      }
    }
    
    return false;
  }

  /**
   * Show help for all available commands
   */
  showHelp(): void {
    const commands = this.getCommands();
    const title = 'Available commands:';
    
    if (this.tui) {
      const tui = this.tui; // Store reference for forEach
      tui.display(title, MessageType.SYSTEM);
      tui.display('==================', MessageType.SYSTEM);
      
      commands.forEach((command) => {
        tui.display(`  ${command.name.padEnd(12)} - ${command.description}`);
      });
      
      tui.display('Press Ctrl+C or type "exit" to quit.', MessageType.SYSTEM);
    } else {
      console.log(`\n${title}`);
      console.log('==================');
      
      commands.forEach((command) => {
        console.log(`  ${command.name.padEnd(12)} - ${command.description}`);
      });
      
      console.log('\nPress Ctrl+C or type "exit" to quit.\n');
    }
  }

  /**
   * Get command statistics
   */
  getStats(): { 
    menuCommandCount: number; 
    gameCommandCount: number; 
    totalCommands: number;
    nlpStats: any;
  } {
    return {
      menuCommandCount: 0, // Legacy field for compatibility
      gameCommandCount: this.commands.size,
      totalCommands: this.commands.size,
      nlpStats: this.nlpEngine.getStats()
    };
  }

  /**
   * Check if debug logging is enabled
   */
  private isDebugEnabled(): boolean {
    return this.options.enableDebugLogging || process.env.AI_DEBUG_LOGGING === 'true';
  }

  /**
   * Update router options
   */
  updateOptions(options: Partial<CommandRouterOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Clear all registered commands (useful for testing)
   */
  clearCommands(): void {
    this.commands.clear();
  }
}