import winston from 'winston';
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';

export type MessageType = 'ROOM' | 'COMMAND' | 'RESPONSE' | 'ERROR' | 'SYSTEM';

interface LogEntry {
  timestamp: string;
  sessionId: string;
  type: MessageType;
  message: string;
}

export class LoggingService {
  private static instance: LoggingService;
  private logger: winston.Logger | null = null;
  private sessionId: string;
  private enabled: boolean;
  private logPath: string;
  private silentErrors: boolean;
  private retryEnabled: boolean = false;
  private maxRetries: number = 3;
  private bufferEnabled: boolean = false;
  private messageBuffer: Array<{ message: string; type: MessageType }> = [];
  private bufferTimer: NodeJS.Timeout | null = null;
  private readonly BUFFER_FLUSH_INTERVAL = 100; // ms
  private readonly BUFFER_SIZE_LIMIT = 10;

  private constructor() {
    this.sessionId = randomUUID();
    this.enabled = this.isLoggingEnabled();
    this.logPath = this.getLogPath();
    this.silentErrors = process.env.LOG_SILENT_ERRORS === 'true';

    try {
      this.logger = this.createLogger();
    } catch (error) {
      if (!this.silentErrors) {
        console.error('Failed to create logger:', error);
      }
      this.logger = null;
      this.enabled = false;
    }
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  private isLoggingEnabled(): boolean {
    const logEnabled = process.env.LOG_ENABLED;
    if (!logEnabled) return true; // Default to enabled
    
    const falseValues = ['false', 'FALSE', 'False', '0', 'no', 'NO'];
    return !falseValues.includes(logEnabled);
  }

  private getLogPath(): string {
    const logPath = process.env.LOG_PATH || 'log/development.log';
    
    // Validate path
    if (!logPath || logPath.trim().length === 0) {
      return 'log/development.log';
    }
    
    // Check for invalid characters or patterns
    const invalidPatterns = ['\0', '../', '..\\'];
    if (invalidPatterns.some(pattern => logPath.includes(pattern))) {
      if (!this.silentErrors) {
        console.warn(`Invalid log path: ${logPath}, using default`);
      }
      return 'log/development.log';
    }
    
    return logPath.trim();
  }

  private createLogger(): winston.Logger {
    const logDir = path.dirname(this.logPath);
    
    // Ensure log directory exists synchronously before creating logger
    this.ensureLogDirectorySync(logDir);

    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
      }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, type, sessionId }) => {
        return `[${timestamp}] [${sessionId}] [${type}] ${message}`;
      })
    );

    return winston.createLogger({
      level: 'info',
      format: logFormat,
      transports: [
        new winston.transports.File({
          filename: this.logPath,
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 5,
          tailable: true,
        })
      ],
      exitOnError: false,
    });
  }

  private ensureLogDirectorySync(dirPath: string): void {
    const fsSync = require('fs');
    try {
      if (!fsSync.existsSync(dirPath)) {
        fsSync.mkdirSync(dirPath, { recursive: true });
      }
    } catch (error) {
      if (!this.silentErrors) {
        console.warn(`Failed to create log directory: ${dirPath}`, error);
      }
    }
  }

  private async ensureLogDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      try {
        await fs.mkdir(dirPath, { recursive: true });
      } catch (error) {
        if (!this.silentErrors) {
          console.warn(`Failed to create log directory: ${dirPath}`, error);
        }
      }
    }
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public enableBuffering(): void {
    this.bufferEnabled = true;
    this.startBufferTimer();
  }

  public disableBuffering(): void {
    this.bufferEnabled = false;
    if (this.bufferTimer) {
      clearInterval(this.bufferTimer);
      this.bufferTimer = null;
    }
    this.flushBuffer();
  }

  private startBufferTimer(): void {
    if (!this.bufferTimer) {
      this.bufferTimer = setInterval(() => {
        this.flushBuffer();
      }, this.BUFFER_FLUSH_INTERVAL);
    }
  }

  private flushBuffer(): void {
    const messages = [...this.messageBuffer];
    this.messageBuffer = [];

    messages.forEach(async ({ message, type }) => {
      await this.writeLog(message, type);
    });
  }

  private async writeLog(message: string, type: MessageType, retryCount: number = 0): Promise<void> {
    if (!this.enabled || !this.logger) return;

    try {
      const metadata = {
        type,
        sessionId: this.sessionId,
      };

      if (type === 'ERROR') {
        this.logger.error(message, metadata);
      } else {
        this.logger.info(message, metadata);
      }
    } catch (error) {
      if (this.retryEnabled && retryCount < this.maxRetries - 1) {
        // Exponential backoff: 100ms, 200ms, 400ms
        const delay = Math.pow(2, retryCount) * 100;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.writeLog(message, type, retryCount + 1);
      }
      
      if (!this.silentErrors) {
        if (retryCount > 0) {
          console.warn(`Failed to write to log after ${retryCount + 1} attempts:`, error);
        } else {
          console.warn('Failed to write to log:', error);
        }
      }
    }
  }

  public async logMessage(message: string, type: MessageType): Promise<void> {
    if (!this.enabled) {
      console.log('[DEBUG] Logging disabled, skipping:', message.substring(0, 30));
      return;
    }

    // Debug output
    if (process.env.DEBUG_LOGGING === 'true') {
      console.log(`[DEBUG] Logging ${type}: ${message.substring(0, 50)}...`);
    }

    if (this.bufferEnabled) {
      this.messageBuffer.push({ message, type });
      
      if (this.messageBuffer.length >= this.BUFFER_SIZE_LIMIT) {
        this.flushBuffer();
      }
    } else {
      await this.writeLog(message, type);
    }
  }

  public async logSessionStart(): Promise<void> {
    const message = `=== SESSION START ===`;
    await this.logMessage(message, 'SYSTEM');
  }

  public async logSessionEnd(): Promise<void> {
    const message = `=== SESSION END ===`;
    await this.logMessage(message, 'SYSTEM');
  }

  public enableRetry(maxRetries: number = 3): void {
    this.retryEnabled = true;
    this.maxRetries = maxRetries;
  }

  public disableRetry(): void {
    this.retryEnabled = false;
  }

  public async shutdown(): Promise<void> {
    if (this.bufferEnabled) {
      this.flushBuffer();
      this.disableBuffering();
    }

    return new Promise((resolve) => {
      if (this.logger) {
        // Winston's close method doesn't take a callback in v3
        // We'll just close it synchronously
        try {
          this.logger.close();
        } catch (error) {
          if (!this.silentErrors) {
            console.warn('Error closing logger:', error);
          }
        }
        resolve();
      } else {
        resolve();
      }
    });
  }
}