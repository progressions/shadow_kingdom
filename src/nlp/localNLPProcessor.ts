import { CommandPattern, LocalCommandResult, GameContext } from './types';

export class LocalNLPProcessor {
  private patterns: CommandPattern[] = [];
  private synonyms: Map<string, string> = new Map();
  private readonly startTime = Date.now();

  constructor() {
    this.initializeSynonyms();
    this.initializePatterns();
  }

  /**
   * Process a command using local pattern matching
   * @param input The user's command input
   * @param context Current game context for pattern matching
   * @returns LocalCommandResult if matched, null if no match found
   */
  public processCommand(input: string, context: GameContext): LocalCommandResult | null {
    const startTime = Date.now();
    
    if (!input || !input.trim()) {
      return null;
    }

    const normalizedInput = this.normalizeInput(input);
    
    // Try pattern matching in priority order
    const result = this.matchPatterns(normalizedInput, context);
    
    if (result) {
      result.processingTime = Date.now() - startTime;
      return result;
    }

    return null;
  }

  /**
   * Add a new command pattern to the processor
   * @param pattern The command pattern to add
   */
  public addPattern(pattern: CommandPattern): void {
    this.patterns.push(pattern);
    // Re-sort patterns by priority (higher priority first)
    this.patterns.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get all registered patterns (for testing/debugging)
   */
  public getPatterns(): CommandPattern[] {
    return [...this.patterns];
  }

  /**
   * Add synonym mappings
   * @param synonym The word that should be replaced
   * @param canonical The canonical word to replace it with
   */
  public addSynonym(synonym: string, canonical: string): void {
    this.synonyms.set(synonym.toLowerCase(), canonical.toLowerCase());
  }

  private initializeSynonyms(): void {
    // Movement synonyms
    this.synonyms.set('walk', 'go');
    this.synonyms.set('move', 'go');
    this.synonyms.set('head', 'go');
    this.synonyms.set('travel', 'go');
    this.synonyms.set('proceed', 'go');
    this.synonyms.set('advance', 'go');
    
    // Direction synonyms
    this.synonyms.set('n', 'north');
    this.synonyms.set('s', 'south');
    this.synonyms.set('e', 'east');
    this.synonyms.set('w', 'west');
    this.synonyms.set('u', 'up');
    this.synonyms.set('d', 'down');
    
    // Examination synonyms
    this.synonyms.set('examine', 'look');
    this.synonyms.set('inspect', 'look');
    this.synonyms.set('check', 'look');
    this.synonyms.set('observe', 'look');
    this.synonyms.set('study', 'look');
    this.synonyms.set('view', 'look');
    
    // Interaction synonyms
    this.synonyms.set('grab', 'take');
    this.synonyms.set('get', 'take');
    this.synonyms.set('collect', 'take');
    
    this.synonyms.set('speak', 'talk');
    this.synonyms.set('chat', 'talk');
    this.synonyms.set('converse', 'talk');
    
    // System synonyms
    this.synonyms.set('quit', 'exit');
    this.synonyms.set('leave', 'exit');
    this.synonyms.set('q', 'exit');
  }

  private initializePatterns(): void {
    // Movement patterns (highest priority)
    this.addPattern({
      pattern: /^(?:go|move|walk|head|travel|proceed|advance)\s+(north|south|east|west|up|down|n|s|e|w|u|d)$/i,
      action: 'go',
      priority: 100,
      category: 'movement',
      extractParams: (match) => [this.expandDirection(match[1])],
      description: 'Basic movement commands with directions'
    });

    this.addPattern({
      pattern: /^(north|south|east|west|up|down|n|s|e|w|u|d)$/i,
      action: 'go',
      priority: 95,
      category: 'movement',
      extractParams: (match) => [this.expandDirection(match[1])],
      description: 'Direct cardinal direction commands'
    });

    this.addPattern({
      pattern: /^(?:climb|ascend)\s+(?:up|stairs|ladder|steps)$/i,
      action: 'go',
      priority: 90,
      category: 'movement',
      extractParams: () => ['up'],
      description: 'Climbing variations for upward movement'
    });

    this.addPattern({
      pattern: /^(?:descend|go down|climb down)\s*(?:the\s+)?(?:stairs|steps|ladder)?$/i,
      action: 'go',
      priority: 90,
      category: 'movement',
      extractParams: () => ['down'],
      description: 'Descending variations for downward movement'
    });

    // Examination patterns
    this.addPattern({
      pattern: /^(?:look|examine|inspect|check|observe|study|view)(?:\s+(?:at|around))?$/i,
      action: 'look',
      priority: 80,
      category: 'examination',
      extractParams: () => [],
      description: 'Look around the current area'
    });

    this.addPattern({
      pattern: /^(?:look|examine|inspect|check|observe|study|view)\s+(?:at\s+)?(.+)$/i,
      action: 'examine',
      priority: 75,
      category: 'examination',
      extractParams: (match) => [match[1].trim()],
      description: 'Examine specific objects'
    });

    // Interaction patterns
    this.addPattern({
      pattern: /^pick\s+up\s+(.+)$/i,
      action: 'take',
      priority: 75,
      category: 'interaction',
      extractParams: (match) => [match[1].trim()],
      description: 'Pick up items'
    });

    this.addPattern({
      pattern: /^pickup\s+(.+)$/i,
      action: 'take',
      priority: 75,
      category: 'interaction',
      extractParams: (match) => [match[1].trim()],
      description: 'Pickup items (one word)'
    });

    this.addPattern({
      pattern: /^(?:take|grab|get|collect)\s+(.+)$/i,
      action: 'take',
      priority: 70,
      category: 'interaction',
      extractParams: (match) => [match[1].trim()],
      description: 'Take or collect items'
    });

    this.addPattern({
      pattern: /^pick\s+(.+)$/i,
      action: 'take',
      priority: 65,
      category: 'interaction',
      extractParams: (match) => [match[1].trim()],
      description: 'Pick items (without up)'
    });

    this.addPattern({
      pattern: /^(?:talk|speak|chat|converse)\s+(?:to|with)\s+(.+)$/i,
      action: 'talk',
      priority: 70,
      category: 'interaction',
      extractParams: (match) => [match[1].trim()],
      description: 'Talk to NPCs'
    });

    this.addPattern({
      pattern: /^(?:use|activate|operate)\s+(.+)$/i,
      action: 'use',
      priority: 65,
      category: 'interaction',
      extractParams: (match) => [match[1].trim()],
      description: 'Use or activate items'
    });

    // System patterns (lower priority)
    this.addPattern({
      pattern: /^(?:help|h|\?)$/i,
      action: 'help',
      priority: 50,
      category: 'system',
      extractParams: () => [],
      description: 'Show help information'
    });

    this.addPattern({
      pattern: /^(?:quit|exit|leave|q)$/i,
      action: 'exit',
      priority: 50,
      category: 'system',
      extractParams: () => [],
      description: 'Exit the game or return to menu'
    });

    this.addPattern({
      pattern: /^(?:clear|cls)$/i,
      action: 'clear',
      priority: 50,
      category: 'system',
      extractParams: () => [],
      description: 'Clear the screen'
    });
  }

  private normalizeInput(input: string): string {
    let normalized = input.trim().toLowerCase();
    
    // Apply synonym substitutions
    const words = normalized.split(/\s+/);
    const substituted = words.map(word => {
      const synonym = this.synonyms.get(word);
      return synonym || word;
    });
    
    return substituted.join(' ');
  }

  private matchPatterns(input: string, context: GameContext): LocalCommandResult | null {
    for (const pattern of this.patterns) {
      const match = input.match(pattern.pattern);
      if (match) {
        try {
          const params = pattern.extractParams(match);
          return {
            action: pattern.action,
            params,
            confidence: this.calculateConfidence(pattern, match, context),
            source: 'pattern',
            pattern: pattern.pattern.source,
            processingTime: 0 // Will be set by caller
          };
        } catch (error) {
          // If parameter extraction fails, continue to next pattern
          console.warn(`Pattern parameter extraction failed for: ${pattern.pattern.source}`, error);
          continue;
        }
      }
    }
    
    return null;
  }

  private calculateConfidence(pattern: CommandPattern, match: RegExpMatchArray, context: GameContext): number {
    let confidence = 0.75; // Base confidence for pattern matches
    
    // Increase confidence for higher priority patterns
    if (pattern.priority >= 90) confidence += 0.15;
    else if (pattern.priority >= 70) confidence += 0.1;
    else if (pattern.priority >= 50) confidence += 0.05;
    
    // Increase confidence for exact matches
    if (match[0] === match.input) confidence += 0.05;
    
    // Context-based confidence adjustments
    if (context.mode === 'game' && pattern.category === 'movement') {
      confidence += 0.1; // Movement commands more likely in game mode
    }
    
    return Math.min(confidence, 0.98); // Cap at 98% to allow room for comparison
  }

  private expandDirection(direction: string): string {
    const expansions: { [key: string]: string } = {
      'n': 'north',
      's': 'south', 
      'e': 'east',
      'w': 'west',
      'u': 'up',
      'd': 'down'
    };
    
    return expansions[direction.toLowerCase()] || direction.toLowerCase();
  }

  /**
   * Get processing statistics
   */
  public getStats() {
    return {
      patternsLoaded: this.patterns.length,
      synonymsLoaded: this.synonyms.size,
      uptimeMs: Date.now() - this.startTime
    };
  }
}