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

export interface TokenUsage {
  input: number;
  output: number;
}