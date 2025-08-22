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
    thematicExits?: Array<{direction: string; name: string}>;
  };
  gameId?: number;
  recentCommands?: string[];
}

export interface NLPResult {
  action: string;
  params: string[];
  source: 'local' | 'ai' | 'exact' | 'context';
  processingTime: number;
  reasoning?: string;
  resolvedObjects?: ResolvedObject[];
  isCompound?: boolean;
  compoundCommands?: ResolvedCommand[];
}

export interface ResolvedObject {
  originalRef: string;
  resolvedName: string; 
  resolutionType: 'exact' | 'pronoun' | 'spatial' | 'contextual';
  reasoning?: string;
}

export interface ResolvedCommand {
  action: string;
  params: string[];
  resolvedObjects: ResolvedObject[];
}

export interface PatternMatchOptions {
  caseSensitive?: boolean;
  wholWordOnly?: boolean;
  priority?: number;
}