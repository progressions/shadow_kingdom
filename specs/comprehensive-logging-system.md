# Comprehensive Logging System Implementation Specification

**Created**: 2025-08-22  
**Status**: Implementation Ready  
**Audience**: Developers implementing the logging system  
**Related Issue**: issues/2025-08-22-comprehensive-logging-system.md

## Overview

This specification details the implementation of a comprehensive logging system for Shadow Kingdom that captures all game interactions, AI responses, and system events for debugging, monitoring, and analysis purposes.

## Architecture

### Core Components

1. **LoggerService** - Central logging coordinator
2. **FileLogger** - File-based log writing
3. **LogFormatter** - Message formatting and timestamps
4. **LogRotation** - File rotation and cleanup
5. **LoggerFactory** - Environment-specific logger creation

### Data Flow

```
Game Events → LoggerService → FileLogger → Log Files
AI Requests → GrokClient → LoggerService → AI Log Files
User Input → GameController → LoggerService → Session Log Files
System Output → UI Layer → LoggerService → Session Log Files
```

## Implementation Phases

### Phase 1: Core Infrastructure

#### 1.1 Create Logging Types and Interfaces
**File**: `src/types/logging.ts`

```typescript
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN', 
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
}

export interface GameEvent {
  type: 'session_start' | 'movement' | 'combat' | 'dialogue' | 'room_generation';
  details: Record<string, any>;
  gameId?: number;
  playerId?: number;
  roomId?: number;
}

export interface GrokLogEntry {
  timestamp: string;
  request_id: string;
  endpoint: string;
  prompt: string;
  response?: any;
  tokens?: {
    input: number;
    output: number;
  };
  duration_ms?: number;
  success: boolean;
  error?: string;
}

export interface LoggerConfig {
  logLevel: LogLevel;
  logToConsole: boolean;
  logDirectory: string;
  rotationDays: number;
  logAiResponses: boolean;
  logUserCommands: boolean;
  logSystemOutput: boolean;
}
```

#### 1.2 Create Log Formatter Utility
**File**: `src/utils/logFormatter.ts`

```typescript
import { LogLevel, LogEntry } from '../types/logging';

export class LogFormatter {
  static formatTimestamp(date: Date = new Date()): string {
    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
  }

  static formatLogEntry(level: LogLevel, message: string, context?: Record<string, any>): string {
    const timestamp = this.formatTimestamp();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level}: ${message}${contextStr}`;
  }

  static formatUserInput(command: string): string {
    const timestamp = this.formatTimestamp();
    return `[${timestamp}] > ${command}`;
  }

  static formatSystemOutput(message: string, type: string): string {
    const timestamp = this.formatTimestamp();
    return `[${timestamp}] ${type.toUpperCase()}: ${message}`;
  }

  static formatGameEvent(event: GameEvent): string {
    const timestamp = this.formatTimestamp();
    const context = {
      gameId: event.gameId,
      playerId: event.playerId,
      roomId: event.roomId,
      ...event.details
    };
    return `[${timestamp}] ${event.type.toUpperCase()}: ${JSON.stringify(context)}`;
  }
}
```

#### 1.3 Create File Logger
**File**: `src/utils/fileLogger.ts`

```typescript
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

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }
  }

  private getLogFilePath(type: 'session' | 'ai'): string {
    if (type === 'ai') {
      return path.join(this.logDirectory, 'grok_responses.log');
    }
    return path.join(this.logDirectory, `${this.environment}.log`);
  }

  writeSessionLog(message: string): void {
    this.writeToFile('session', message);
  }

  writeAILog(data: object): void {
    this.writeToFile('ai', JSON.stringify(data) + '\n');
  }

  writeError(error: Error, context?: Record<string, any>): void {
    const message = LogFormatter.formatLogEntry(LogLevel.ERROR, error.message, context);
    this.writeToFile('session', message);
  }

  writeWarning(message: string, context?: Record<string, any>): void {
    const formatted = LogFormatter.formatLogEntry(LogLevel.WARN, message, context);
    this.writeToFile('session', formatted);
  }

  writeInfo(message: string, context?: Record<string, any>): void {
    const formatted = LogFormatter.formatLogEntry(LogLevel.INFO, message, context);
    this.writeToFile('session', formatted);
  }

  writeDebug(message: string, context?: Record<string, any>): void {
    const formatted = LogFormatter.formatLogEntry(LogLevel.DEBUG, message, context);
    this.writeToFile('session', formatted);
  }

  private writeToFile(type: 'session' | 'ai', content: string): void {
    try {
      const filePath = this.getLogFilePath(type);
      fs.appendFileSync(filePath, content + '\n');
    } catch (error) {
      // Fail silently to avoid disrupting game flow
      console.error('Failed to write to log file:', error);
    }
  }
}
```

#### 1.4 Create Core Logger Service
**File**: `src/services/loggerService.ts`

```typescript
import { FileLogger } from '../utils/fileLogger';
import { LogFormatter } from '../utils/logFormatter';
import { GameEvent, GrokLogEntry, LoggerConfig, LogLevel } from '../types/logging';

export class LoggerService {
  private fileLogger: FileLogger;
  private config: LoggerConfig;
  private requestIdCounter: number = 0;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      logLevel: LogLevel.INFO,
      logToConsole: process.env.LOG_TO_CONSOLE === 'true',
      logDirectory: 'logs',
      rotationDays: 30,
      logAiResponses: process.env.LOG_AI_RESPONSES !== 'false',
      logUserCommands: process.env.LOG_USER_COMMANDS !== 'false',
      logSystemOutput: process.env.LOG_SYSTEM_OUTPUT !== 'false',
      ...config
    };

    this.fileLogger = new FileLogger(this.config.logDirectory);
  }

  // User Input Logging
  logUserInput(command: string): void {
    if (!this.config.logUserCommands) return;

    const message = LogFormatter.formatUserInput(command);
    this.fileLogger.writeSessionLog(message);
    
    if (this.config.logToConsole) {
      console.log(message);
    }
  }

  // System Output Logging
  logSystemOutput(message: string, type: 'room' | 'dialogue' | 'combat' | 'system' = 'system'): void {
    if (!this.config.logSystemOutput) return;

    const formatted = LogFormatter.formatSystemOutput(message, type);
    this.fileLogger.writeSessionLog(formatted);
    
    if (this.config.logToConsole) {
      console.log(formatted);
    }
  }

  // Game Event Logging
  logGameEvent(event: GameEvent): void {
    const formatted = LogFormatter.formatGameEvent(event);
    this.fileLogger.writeSessionLog(formatted);
    
    if (this.config.logToConsole) {
      console.log(formatted);
    }
  }

  // AI Request/Response Logging
  logGrokRequest(prompt: string, endpoint: string): string {
    if (!this.config.logAiResponses) return '';

    const requestId = `req_${++this.requestIdCounter}`;
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

  logGrokResponse(requestId: string, response: any, tokens?: { input: number; output: number }, durationMs?: number): void {
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

  // Standard Logging Methods
  error(message: string, context?: Record<string, any>): void {
    this.fileLogger.writeError(new Error(message), context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.fileLogger.writeWarning(message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.fileLogger.writeInfo(message, context);
  }

  debug(message: string, context?: Record<string, any>): void {
    if (this.config.logLevel === LogLevel.DEBUG) {
      this.fileLogger.writeDebug(message, context);
    }
  }
}
```

### Phase 2: Game Session Integration

#### 2.1 Integrate with GameController
**File**: `src/gameController.ts` - Add logging to input/output methods

```typescript
// Add to imports
import { LoggerService } from './services/loggerService';

// Add to class
private logger: LoggerService;

// In constructor, initialize logger
this.logger = services.loggerService;

// In processInput method, log user input
async processInput(input: string): Promise<void> {
  this.logger.logUserInput(input);
  // ... existing logic
}

// Log game events
private logSessionStart(gameId: number, roomName: string): void {
  this.logger.logGameEvent({
    type: 'session_start',
    details: { roomName },
    gameId
  });
}

private logMovement(fromRoom: string, toRoom: string, direction: string): void {
  this.logger.logGameEvent({
    type: 'movement', 
    details: { fromRoom, toRoom, direction },
    gameId: this.getCurrentSession()?.gameId
  });
}
```

#### 2.2 Integrate with TUIInterface
**File**: `src/ui/TUIInterface.ts` - Log all display output

```typescript
// Add logging to display methods
display(message: string, type: MessageType = MessageType.NORMAL): void {
  // Log to file before displaying
  const logType = this.getLogType(type);
  this.logger?.logSystemOutput(message, logType);
  
  // ... existing display logic
}

private getLogType(messageType: MessageType): 'room' | 'dialogue' | 'combat' | 'system' {
  switch (messageType) {
    case MessageType.ROOM_DESCRIPTION:
      return 'room';
    case MessageType.DIALOGUE:
      return 'dialogue';
    case MessageType.COMBAT:
      return 'combat';
    default:
      return 'system';
  }
}
```

#### 2.3 Integrate with SessionInterface  
**File**: `src/sessionInterface.ts` - Log programmatic commands

```typescript
// Add logging for session commands
export async function runSessionMode(): Promise<void> {
  const logger = new LoggerService();
  
  // Log session commands
  logger.logUserInput(command);
  
  // ... existing logic
}
```

### Phase 3: AI Response Integration

#### 3.1 Integrate with GrokClient
**File**: `src/ai/grokClient.ts` - Add request/response logging

```typescript
// Add to imports
import { LoggerService } from '../services/loggerService';

// Add to class
private logger: LoggerService;

// In constructor
this.logger = new LoggerService();

// In API call methods, add logging
async generateRoom(context: any): Promise<any> {
  const requestId = this.logger.logGrokRequest(
    JSON.stringify(context), 
    'room_generation'
  );
  
  const startTime = Date.now();
  
  try {
    const response = await this.makeAPICall(/* ... */);
    const duration = Date.now() - startTime;
    
    this.logger.logGrokResponse(requestId, response, undefined, duration);
    return response;
  } catch (error) {
    this.logger.logGrokError(requestId, error as Error);
    throw error;
  }
}
```

### Phase 4: Service Integration

#### 4.1 Add to Service Factory
**File**: `src/services/serviceFactory.ts`

```typescript
// Add to imports
import { LoggerService } from './loggerService';

// Add to ServiceInstances interface
export interface ServiceInstances {
  // ... existing services
  loggerService: LoggerService;
}

// In createServices functions
export function createServices(db: Database): ServiceInstances {
  // ... create other services
  
  const loggerService = new LoggerService();
  
  return {
    // ... other services
    loggerService
  };
}
```

### Phase 5: Testing and Validation

#### 5.1 Unit Tests
**File**: `tests/services/loggerService.test.ts`

```typescript
describe('LoggerService', () => {
  describe('User Input Logging', () => {
    it('should log user commands with > prefix');
    it('should include timestamps in correct format');
    it('should respect logUserCommands config');
  });

  describe('System Output Logging', () => {
    it('should log room descriptions');
    it('should log dialogue with proper formatting');
    it('should log combat messages');
  });

  describe('AI Response Logging', () => {
    it('should generate unique request IDs');
    it('should log requests and responses as JSON');
    it('should handle errors gracefully');
  });
});
```

#### 5.2 Integration Tests  
**File**: `tests/integration/logging-integration.test.ts`

```typescript
describe('Logging Integration', () => {
  it('should log complete game session');
  it('should handle concurrent logging requests');
  it('should maintain log file integrity');
});
```

#### 5.3 End-to-End Tests
**File**: `tests/e2e/logging-system.test.ts`

```typescript
describe('End-to-End Logging', () => {
  it('should create log files in correct directories');
  it('should log user input and system output');
  it('should support tail -f monitoring');
});
```

## Success Criteria Validation

### Automated Tests
1. **Log File Creation**: Verify logs directory and files are created
2. **User Input Logging**: Test `> command` format with timestamps  
3. **System Output Logging**: Test all message types are logged correctly
4. **AI Response Logging**: Test JSON format and request/response pairing
5. **Performance**: Ensure < 5ms overhead per log entry

### Manual Validation
1. **Tail Monitoring**: `tail -f logs/development.log` shows real-time game
2. **Complete Sessions**: Full game sessions readable in logs
3. **AI Monitoring**: Grok responses trackable in separate log file
4. **Error Handling**: Logging failures don't crash game

## Configuration

Create `.env` entries for logging configuration:

```bash
# Logging Configuration
LOG_LEVEL=info
LOG_TO_CONSOLE=false
LOG_ROTATION_DAYS=30
LOG_AI_RESPONSES=true
LOG_USER_COMMANDS=true
LOG_SYSTEM_OUTPUT=true
```

## Directory Setup

Create logs directory structure:

```bash
mkdir -p logs
echo "*.log" > logs/.gitignore
echo "archived/" >> logs/.gitignore
```

This specification provides a complete roadmap for implementing the comprehensive logging system with clear phases, detailed code examples, and validation criteria.