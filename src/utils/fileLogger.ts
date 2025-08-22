import * as fs from 'fs';
import * as path from 'path';
import { LogLevel } from '../types/logging';
import { LogFormatter } from './logFormatter';

export class FileLogger {
  private logDirectory: string;
  private environment: string;

  constructor(logDirectory: string = 'logs') {
    this.logDirectory = logDirectory;
    this.environment = process.env.NODE_ENV || 'development';
    this.ensureLogDirectory();
  }

  /**
   * Ensure the log directory exists
   */
  private ensureLogDirectory(): void {
    try {
      if (!fs.existsSync(this.logDirectory)) {
        fs.mkdirSync(this.logDirectory, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  /**
   * Get the appropriate log file path based on type
   */
  private getLogFilePath(type: 'session' | 'ai'): string {
    if (type === 'ai') {
      return path.join(this.logDirectory, 'grok_responses.log');
    }
    return path.join(this.logDirectory, `${this.environment}.log`);
  }

  /**
   * Write to session log file
   */
  writeSessionLog(message: string): void {
    this.writeToFile('session', message);
  }

  /**
   * Write structured data to AI log file
   */
  writeAILog(data: object): void {
    try {
      this.writeToFile('ai', JSON.stringify(data));
    } catch (error) {
      // Handle circular references or other JSON errors
      try {
        this.writeToFile('ai', JSON.stringify(data, this.getCircularReplacer()));
      } catch (fallbackError) {
        // Final fallback - log the error instead
        this.writeToFile('ai', JSON.stringify({
          error: 'Failed to serialize log data',
          originalError: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }));
      }
    }
  }

  /**
   * Write error message to session log
   */
  writeError(error: Error, context?: Record<string, any>): void {
    const message = LogFormatter.formatLogEntry(LogLevel.ERROR, error.message, context);
    this.writeToFile('session', message);
  }

  /**
   * Write warning message to session log
   */
  writeWarning(message: string, context?: Record<string, any>): void {
    const formatted = LogFormatter.formatLogEntry(LogLevel.WARN, message, context);
    this.writeToFile('session', formatted);
  }

  /**
   * Write info message to session log
   */
  writeInfo(message: string, context?: Record<string, any>): void {
    const formatted = LogFormatter.formatLogEntry(LogLevel.INFO, message, context);
    this.writeToFile('session', formatted);
  }

  /**
   * Write debug message to session log
   */
  writeDebug(message: string, context?: Record<string, any>): void {
    const formatted = LogFormatter.formatLogEntry(LogLevel.DEBUG, message, context);
    this.writeToFile('session', formatted);
  }

  /**
   * Low-level file writing with error handling
   */
  private writeToFile(type: 'session' | 'ai', content: string): void {
    try {
      const filePath = this.getLogFilePath(type);
      const fullContent = content + '\n';
      
      // Use appendFileSync for immediate writes to support tail -f
      fs.appendFileSync(filePath, fullContent);
    } catch (error) {
      // Fail silently to avoid disrupting game flow
      // Only log to console if not in test environment to avoid test noise
      if (process.env.NODE_ENV !== 'test') {
        console.error('Failed to write to log file:', error);
      }
    }
  }

  /**
   * Get log file paths for testing/validation
   */
  getLogFilePaths(): { session: string; ai: string } {
    return {
      session: this.getLogFilePath('session'),
      ai: this.getLogFilePath('ai')
    };
  }

  /**
   * Check if log files exist
   */
  logFilesExist(): { session: boolean; ai: boolean } {
    return {
      session: fs.existsSync(this.getLogFilePath('session')),
      ai: fs.existsSync(this.getLogFilePath('ai'))
    };
  }

  /**
   * Helper to handle circular references in JSON.stringify
   */
  private getCircularReplacer() {
    const seen = new WeakSet();
    return (key: string, value: any) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      return value;
    };
  }
}