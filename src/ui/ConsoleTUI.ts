/**
 * Simple console-based TUI for command-line execution mode
 * This is used when running single commands with --cmd flag
 */

import { TUIInterface } from './TUIInterface';
import { MessageType } from './MessageFormatter';
import { GameState } from './StatusManager';
import { LoggerService } from '../services/loggerService';

export class ConsoleTUI implements TUIInterface {
  private prompt: string = '> ';
  private loggerService?: LoggerService;

  constructor(loggerService?: LoggerService) {
    this.loggerService = loggerService;
  }

  async initialize(): Promise<void> {
    // No initialization needed for console output
  }

  display(message: string, type?: MessageType): void {
    console.log(message);
    
    // Also log to development log
    if (this.loggerService) {
      const logType = this.mapMessageTypeToLogType(type);
      this.loggerService.logSystemOutput(message, logType);
    }
  }

  displayLines(lines: string[], type?: MessageType): void {
    lines.forEach(line => {
      console.log(line);
      if (this.loggerService) {
        const logType = this.mapMessageTypeToLogType(type);
        this.loggerService.logSystemOutput(line, logType);
      }
    });
  }

  private mapMessageTypeToLogType(type?: MessageType): 'room' | 'dialogue' | 'combat' | 'system' {
    if (!type) return 'system';
    
    switch (type) {
      case MessageType.ROOM_TITLE:
      case MessageType.ROOM_DESCRIPTION:
      case MessageType.EXITS:
        return 'room';
      case MessageType.ERROR:
        return 'system';
      default:
        return 'system';
    }
  }

  async getInput(): Promise<string> {
    // Not used in command mode
    throw new Error('getInput not supported in command mode');
  }

  updateStatus(gameState: GameState): void {
    // Status not shown in command mode
  }

  setStatus(message: string): void {
    // Status not shown in command mode
  }

  clear(): void {
    // Not clearing in command mode
  }

  destroy(): void {
    // No cleanup needed
  }

  setPrompt(prompt: string): void {
    this.prompt = prompt;
  }

  showWelcome(message: string): void {
    console.log(`=== ${message} ===`);
  }

  showError(message: string, details?: string): void {
    console.log(`Error: ${message}`);
    if (details) {
      console.log(`Details: ${details}`);
    }
  }

  showAIProgress(action: string, target: string, elapsed?: number): void {
    console.log(`AI: ${action} ${target}${elapsed ? ` (${elapsed}ms)` : ''}`);
  }

  displayRoom(roomName: string, description: string, exits: string[]): void {
    const lines = [
      '',
      roomName,
      '═'.repeat(roomName.length),
      description,
      '',
      exits.length > 0 ? `Exits: ${exits.join(', ')}` : 'No exits visible.',
      ''
    ];
    
    lines.forEach(line => {
      console.log(line);
      if (this.loggerService) {
        this.loggerService.logSystemOutput(line, 'room');
      }
    });
  }
  
  setLoggerService(loggerService: LoggerService): void {
    this.loggerService = loggerService;
  }
}