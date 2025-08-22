import { FileLogger } from '../utils/fileLogger';
import { LogFormatter } from '../utils/logFormatter';
import { GameEvent, GrokLogEntry, LoggerConfig, LogLevel, TokenUsage } from '../types/logging';

export class LoggerService {
  private fileLogger: FileLogger;
  private config: LoggerConfig;
  private requestIdCounter: number = 0;

  constructor(config?: Partial<LoggerConfig>) {
    const loggingEnabled = process.env.LOGGING_ENABLED !== 'false';
    
    this.config = {
      logLevel: LogLevel.INFO,
      logToConsole: false,
      logDirectory: 'logs',
      rotationDays: 30,
      logAiResponses: loggingEnabled,
      logUserCommands: loggingEnabled,
      logSystemOutput: loggingEnabled,
      ...config
    };

    this.fileLogger = new FileLogger(this.config.logDirectory);
  }

  /**
   * Parse log level from string
   */
  private parseLogLevel(level?: string): LogLevel | undefined {
    if (!level) return undefined;
    
    const upperLevel = level.toUpperCase();
    if (Object.values(LogLevel).includes(upperLevel as LogLevel)) {
      return upperLevel as LogLevel;
    }
    return undefined;
  }

  /**
   * Check if log level should be written
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    const currentIndex = levels.indexOf(this.config.logLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex <= currentIndex;
  }

  /**
   * Log user input with > prefix
   */
  logUserInput(command: string): void {
    if (!this.config.logUserCommands) return;

    const message = LogFormatter.formatUserInput(command);
    this.fileLogger.writeSessionLog(message);
    
    if (this.config.logToConsole) {
      console.log(message);
    }
  }

  /**
   * Log system output with type designation
   */
  logSystemOutput(message: string, type: 'room' | 'dialogue' | 'combat' | 'system' = 'system'): void {
    if (!this.config.logSystemOutput) return;

    const formatted = LogFormatter.formatSystemOutput(message, type);
    this.fileLogger.writeSessionLog(formatted);
    
    if (this.config.logToConsole) {
      console.log(formatted);
    }
  }

  /**
   * Log structured game events
   */
  logGameEvent(event: GameEvent): void {
    const formatted = LogFormatter.formatGameEvent(event);
    this.fileLogger.writeSessionLog(formatted);
    
    if (this.config.logToConsole) {
      console.log(formatted);
    }
  }

  /**
   * Start logging an AI request and return request ID
   */
  logGrokRequest(prompt: string, endpoint: string): string {
    if (!this.config.logAiResponses) return '';

    const requestId = `req_${++this.requestIdCounter}_${Date.now()}`;
    const logEntry: Partial<GrokLogEntry> = {
      timestamp: new Date().toISOString(),
      request_id: requestId,
      endpoint,
      prompt,
      success: false // Will be updated on response
    };

    this.fileLogger.writeAILog(logEntry);
    return requestId;
  }

  /**
   * Log successful AI response
   */
  logGrokResponse(requestId: string, response: any, tokens?: TokenUsage, durationMs?: number): void {
    if (!this.config.logAiResponses || !requestId) return;

    const logEntry: Partial<GrokLogEntry> = {
      timestamp: new Date().toISOString(),
      request_id: requestId,
      response,
      tokens,
      duration_ms: durationMs,
      success: true
    };

    this.fileLogger.writeAILog(logEntry);
  }

  /**
   * Log AI request error
   */
  logGrokError(requestId: string, error: Error): void {
    if (!this.config.logAiResponses || !requestId) return;

    const logEntry: Partial<GrokLogEntry> = {
      timestamp: new Date().toISOString(),
      request_id: requestId,
      error: error.message,
      success: false
    };

    this.fileLogger.writeAILog(logEntry);
  }

  /**
   * Log error message
   */
  error(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.fileLogger.writeError(new Error(message), context);
      
      if (this.config.logToConsole) {
        console.error(LogFormatter.formatLogEntry(LogLevel.ERROR, message, context));
      }
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.fileLogger.writeWarning(message, context);
      
      if (this.config.logToConsole) {
        console.warn(LogFormatter.formatLogEntry(LogLevel.WARN, message, context));
      }
    }
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.fileLogger.writeInfo(message, context);
      
      if (this.config.logToConsole) {
        console.info(LogFormatter.formatLogEntry(LogLevel.INFO, message, context));
      }
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.fileLogger.writeDebug(message, context);
      
      if (this.config.logToConsole) {
        console.debug(LogFormatter.formatLogEntry(LogLevel.DEBUG, message, context));
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get log file paths for testing
   */
  getLogFilePaths(): { session: string; ai: string } {
    return this.fileLogger.getLogFilePaths();
  }

  /**
   * Check if log files exist
   */
  logFilesExist(): { session: boolean; ai: boolean } {
    return this.fileLogger.logFilesExist();
  }
}