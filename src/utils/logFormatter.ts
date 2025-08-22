import { LogLevel, LogEntry, GameEvent } from '../types/logging';

export class LogFormatter {
  /**
   * Format timestamp in consistent format for logs
   */
  static formatTimestamp(date: Date = new Date()): string {
    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
  }

  /**
   * Format a standard log entry with timestamp, level, and message
   */
  static formatLogEntry(level: LogLevel, message: string, context?: Record<string, any>): string {
    const timestamp = this.formatTimestamp();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level}: ${message}${contextStr}`;
  }

  /**
   * Format user input with > prefix for easy identification
   */
  static formatUserInput(command: string): string {
    const timestamp = this.formatTimestamp();
    return `[${timestamp}] > ${command}`;
  }

  /**
   * Format system output with type designation
   */
  static formatSystemOutput(message: string, type: string): string {
    const timestamp = this.formatTimestamp();
    return `[${timestamp}] ${message}`;
  }

  /**
   * Format game events with structured context
   */
  static formatGameEvent(event: GameEvent): string {
    const timestamp = this.formatTimestamp();
    const context = {
      gameId: event.gameId,
      playerId: event.playerId,
      roomId: event.roomId,
      ...event.details
    };
    
    // Filter out undefined values for cleaner logs
    const cleanContext = Object.entries(context)
      .filter(([_, value]) => value !== undefined)
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    return `[${timestamp}] ${event.type.toUpperCase()}: ${JSON.stringify(cleanContext)}`;
  }

  /**
   * Format AI request/response entries as JSON
   */
  static formatGrokEntry(entry: Partial<any>): string {
    return JSON.stringify({
      ...entry,
      timestamp: this.formatTimestamp()
    });
  }
}