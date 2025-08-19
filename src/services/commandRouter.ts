import { UnifiedNLPEngine } from '../nlp/unifiedNLPEngine';
import { GameContext, NLPResult } from '../nlp/types';

export interface Command {
  name: string;
  description: string;
  handler: (args: string[]) => void | Promise<void>;
}

export type Mode = 'menu' | 'game';

export interface CommandExecutionContext {
  mode: Mode;
  gameContext: GameContext;
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
  private menuCommands: Map<string, Command> = new Map();
  private gameCommands: Map<string, Command> = new Map();
  private nlpEngine: UnifiedNLPEngine;
  private options: CommandRouterOptions;

  constructor(nlpEngine: UnifiedNLPEngine, options: CommandRouterOptions = {}) {
    this.nlpEngine = nlpEngine;
    this.options = {
      enableDebugLogging: false,
      ...options
    };
  }

  /**
   * Register a command for menu mode
   */
  addMenuCommand(command: Command): void {
    this.menuCommands.set(command.name.toLowerCase(), command);
  }

  /**
   * Register a command for game mode
   */
  addGameCommand(command: Command): void {
    this.gameCommands.set(command.name.toLowerCase(), command);
  }

  /**
   * Get all commands for a specific mode
   */
  getCommands(mode: Mode): Map<string, Command> {
    return mode === 'menu' ? this.menuCommands : this.gameCommands;
  }

  /**
   * Process and execute a command with full context
   */
  async processCommand(input: string, context: CommandExecutionContext): Promise<boolean> {
    if (!input) return false;

    // First try exact command matching
    const parts = input.split(' ');
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);

    const commands = this.getCommands(context.mode);
    const exactCommand = commands.get(commandName);
    
    if (exactCommand) {
      try {
        await exactCommand.handler(args);
        return true;
      } catch (error) {
        console.error(`Error executing command "${commandName}":`, error);
        return false;
      }
    }

    // If exact match fails, try unified NLP processing
    const nlpResult = await this.nlpEngine.processCommand(input, context.gameContext);

    if (nlpResult) {
      const success = await this.executeNLPResult(nlpResult, commands, input);
      if (success) return true;
    }

    // If neither exact nor NLP matching worked, show error
    console.log(`Unknown command: ${commandName}. Type "help" for available commands.`);
    
    // In debug mode, show NLP analysis
    if (this.isDebugEnabled() && nlpResult) {
      console.log(`🧠 NLP attempted: "${nlpResult.action}" but command not found in ${context.mode} mode`);
    }
    
    return false;
  }

  /**
   * Execute a command result from NLP processing
   */
  private async executeNLPResult(
    nlpResult: NLPResult, 
    commands: Map<string, Command>, 
    originalInput: string
  ): Promise<boolean> {
    const resolvedCommand = commands.get(nlpResult.action);
    
    if (resolvedCommand) {
      try {
        if (this.isDebugEnabled()) {
          const sourceIcon = nlpResult.source === 'local' ? '🎯' : '🤖';
          console.log(`${sourceIcon} NLP: "${originalInput}" → "${nlpResult.action} ${nlpResult.params.join(' ')}" (confidence: ${nlpResult.confidence.toFixed(2)}, source: ${nlpResult.source})`);
          if (nlpResult.reasoning) {
            console.log(`   Reasoning: ${nlpResult.reasoning}`);
          }
        }
        await resolvedCommand.handler(nlpResult.params);
        return true;
      } catch (error) {
        console.error(`Error executing NLP-resolved command "${nlpResult.action}":`, error);
        return false;
      }
    }
    
    return false;
  }

  /**
   * Show help for the current mode
   */
  showHelp(mode: Mode): void {
    const commands = this.getCommands(mode);
    const title = mode === 'menu' ? 'Main Menu Commands:' : 'Available commands:';
    
    console.log(`\n${title}`);
    console.log('==================');
    
    commands.forEach((command) => {
      console.log(`  ${command.name.padEnd(12)} - ${command.description}`);
    });
    
    console.log('\nPress Ctrl+C or type "exit" to quit.\n');
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
      menuCommandCount: this.menuCommands.size,
      gameCommandCount: this.gameCommands.size,
      totalCommands: this.menuCommands.size + this.gameCommands.size,
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
    this.menuCommands.clear();
    this.gameCommands.clear();
  }
}