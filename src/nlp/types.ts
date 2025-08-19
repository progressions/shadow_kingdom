// Types and interfaces for Natural Language Processing

export interface CommandPattern {
  pattern: RegExp;
  action: string;
  priority: number;
  category: 'movement' | 'examination' | 'interaction' | 'system';
  extractParams: (match: RegExpMatchArray) => string[];
  description?: string;
}

export interface LocalCommandResult {
  action: string;
  params: string[];
  confidence: number;
  source: 'pattern' | 'exact';
  pattern?: string;
  processingTime: number;
}

export interface GameContext {
  currentRoom?: {
    id: number;
    name: string;
    description: string;
    availableExits: string[];
  };
  gameId?: number;
  mode: 'menu' | 'game';
  recentCommands?: string[];
}

export interface NLPResult {
  action: string;
  params: string[];
  confidence: number;
  source: 'local' | 'ai' | 'exact';
  processingTime: number;
  reasoning?: string;
}

export interface PatternMatchOptions {
  caseSensitive?: boolean;
  wholWordOnly?: boolean;
  priority?: number;
}