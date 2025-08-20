import { GeneratedRoom, GeneratedRegion, GeneratedNPC, RoomContext, RegionGenerationContext, NPCContext } from './grokClient';

// Enhanced mock content interfaces
export interface MockRoom {
  id: string;                      // Unique identifier for tracking usage
  name: string;                    // Base room name
  description: string;             // Primary description
  themes: string[];               // ['mansion', 'library', 'luxurious']
  keywords: string[];             // ['books', 'fireplace', 'crystal', 'mahogany']
  mood: string;                   // 'mysterious' | 'welcoming' | 'ominous' | 'peaceful'
  size: string;                   // 'intimate' | 'spacious' | 'vast' | 'cramped'
  lighting: string;               // 'dim' | 'bright' | 'flickering' | 'ethereal'
  
  // Variation support
  nameVariations: string[];       // Alternative names
  descriptionVariations: string[]; // Alternative descriptions
  
  // Connection hints
  connectionHints: {
    architectural: string[];      // 'grand_staircase', 'hidden_door'
    natural: string[];           // 'forest_path', 'mountain_pass'
    mystical: string[];          // 'magic_portal', 'ethereal_gateway'
    mechanical: string[];        // 'steam_lift', 'gear_mechanism'
  };
  
  // Contextual modifiers
  adjacencyBonus: string[];       // Themes that pair well
  adjacencyPenalty: string[];     // Themes to avoid nearby
  regionFit: number;             // How well this fits in region (0-1)
}

export interface MockRegion {
  id: string;
  name: string;
  type: string;                   // 'mansion', 'forest', 'cave', etc.
  description: string;
  themes: string[];
  mood: string;
  
  // Generation hints
  preferredRoomCount: number;     // Suggested room count
  connectionStyles: string[];     // Preferred connection types
  roomTypes: string[];           // Types of rooms that fit
  
  // Variation support
  nameVariations: string[];
  descriptionVariations: string[];
}

export interface MockConnection {
  id: string;                    // Unique identifier
  description: string;           // 'An ornate doorway carved with intricate patterns'
  style: string;                 // 'architectural', 'natural', etc.
  themes: string[];              // Applicable themes
  rarity: number;                // Rarity score 0-1
  bidirectional: boolean;        // Can be used both ways
  reverseDescription: string;    // Description for return path
}

export interface MockNPC {
  id: string;
  name: string;
  description: string;
  personality: string;
  initialDialogue: string;
  themes: string[];              // Applicable themes
  locations: string[];           // Suitable location types
}

// Content pool structure
export interface MockContentPools {
  rooms: {
    [theme: string]: MockRoom[];
  };
  regions: {
    [theme: string]: MockRegion[];
  };
  connections: {
    architectural: MockConnection[];
    natural: MockConnection[];
    mystical: MockConnection[];
    mechanical: MockConnection[];
  };
  npcs: {
    [theme: string]: MockNPC[];
  };
}

// Analysis and context interfaces
export interface ThemeProfile {
  themes: string[];
  keywords: string[];
  mood?: string;
  regionTheme?: string;
  coherenceWeight?: number;
  requirements?: string[];
}

export interface MockAIConfig {
  quality: 'high' | 'medium' | 'basic';
  variation: boolean;
  debug: boolean;
  contextSensitivity: number;     // 0-1
  creativityLevel: number;        // 0-1
  repetitionAvoidance: boolean;
  fallbackEnabled: boolean;
  seed?: number;
  themeCoherence: number;         // 0-1
}

export interface MockDebugInfo {
  selectedContentId: string;
  selectionReason: string;
  themeAnalysis: ThemeProfile;
  candidateCount: number;
  scoreBreakdown: Record<string, number>;
  variationsApplied: string[];
}

/**
 * Core Mock AI Engine for generating rich, context-aware responses
 * without expensive API calls
 */
export class MockAIEngine {
  private config: MockAIConfig;
  private contentPools: MockContentPools;
  private usedContent: Map<string, Set<string>>; // Track usage by session/context
  private random: () => number;

  constructor(config: Partial<MockAIConfig> = {}) {
    this.config = {
      quality: 'high',
      variation: true,
      debug: false,
      contextSensitivity: 0.8,
      creativityLevel: 0.3,
      repetitionAvoidance: true,
      fallbackEnabled: true,
      themeCoherence: 0.8,
      ...config
    };

    // Initialize seeded random if provided
    if (config.seed !== undefined) {
      this.random = this.createSeededRandom(config.seed);
    } else {
      this.random = Math.random;
    }

    this.usedContent = new Map();
    this.contentPools = this.initializeContentPools();
  }

  /**
   * Generate a room using context-aware mock selection
   */
  async generateRoom(prompt: string, context: RoomContext): Promise<GeneratedRoom> {
    const themeProfile = this.analyzePromptAndContext(prompt, context);
    const usedRoomIds = this.getUsedContent('rooms', this.getContextKey(context));
    
    const selectedRoom = this.selectBestRoom(themeProfile, context, usedRoomIds);
    const generatedRoom = this.addRoomVariation(selectedRoom, context, themeProfile);

    // Track usage
    this.trackUsage('rooms', selectedRoom.id, this.getContextKey(context));

    if (this.config.debug) {
      this.logDebugInfo('room', {
        selectedContentId: selectedRoom.id,
        selectionReason: `Matched themes: ${themeProfile.themes.join(', ')}`,
        themeAnalysis: themeProfile,
        candidateCount: this.countCandidates('rooms', themeProfile.themes),
        scoreBreakdown: this.getLastScoreBreakdown(),
        variationsApplied: this.getAppliedVariations()
      });
    }

    return generatedRoom;
  }

  /**
   * Generate a region using context-aware mock selection
   */
  async generateRegion(prompt: string, context: RegionGenerationContext): Promise<GeneratedRegion> {
    const themeProfile = this.analyzeRegionPrompt(prompt, context);
    const usedRegionIds = this.getUsedContent('regions', this.getRegionContextKey(context));
    
    const selectedRegion = this.selectBestRegion(themeProfile, context, usedRegionIds);
    const generatedRegion = this.addRegionVariation(selectedRegion, context, themeProfile);

    // Track usage
    this.trackUsage('regions', selectedRegion.id, this.getRegionContextKey(context));

    return generatedRegion;
  }

  /**
   * Generate an NPC using context-aware mock selection
   */
  async generateNPC(prompt: string, context: NPCContext): Promise<GeneratedNPC> {
    const themeProfile = this.analyzeNPCPrompt(prompt, context);
    const usedNPCIds = this.getUsedContent('npcs', this.getNPCContextKey(context));
    
    const selectedNPC = this.selectBestNPC(themeProfile, context, usedNPCIds);
    const generatedNPC = this.addNPCVariation(selectedNPC, context, themeProfile);

    // Track usage
    this.trackUsage('npcs', selectedNPC.id, this.getNPCContextKey(context));

    return generatedNPC;
  }

  /**
   * Analyze prompt and context to extract themes and requirements
   */
  private analyzePromptAndContext(prompt: string, context: RoomContext): ThemeProfile {
    const promptThemes = this.extractThemesFromPrompt(prompt);
    const promptKeywords = this.extractKeywordsFromPrompt(prompt);
    const mood = this.detectMood(prompt);
    
    // Analyze adjacent content for coherence
    const adjacentThemes = this.extractAdjacentThemes(context);
    const regionTheme = context.theme || (context as any).region?.type;

    // Combine and weight themes based on context sensitivity
    const combinedThemes = this.combineThemes(promptThemes, adjacentThemes, regionTheme);

    return {
      themes: combinedThemes,
      keywords: promptKeywords,
      mood,
      regionTheme,
      coherenceWeight: this.config.themeCoherence,
      requirements: this.parseRequirements(prompt)
    };
  }

  /**
   * Select the best room from content pools based on theme matching and scoring
   */
  private selectBestRoom(themeProfile: ThemeProfile, context: RoomContext, usedIds: Set<string>): MockRoom {
    const candidates = this.findRoomCandidates(themeProfile.themes, usedIds);
    
    if (candidates.length === 0) {
      // Fallback: allow reuse or use basic content
      return this.getFallbackRoom(themeProfile);
    }

    // Score each candidate
    const scored = candidates.map(room => ({
      room,
      score: this.scoreRoomFit(room, themeProfile, context)
    }));

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    // Select from top candidates with some randomization
    const topCount = Math.min(3, scored.length);
    const topCandidates = scored.slice(0, topCount);
    const selectedIndex = Math.floor(this.random() * topCandidates.length);

    return topCandidates[selectedIndex].room;
  }

  /**
   * Add variation to selected room based on context and creativity settings
   */
  private addRoomVariation(room: MockRoom, context: RoomContext, themeProfile: ThemeProfile): GeneratedRoom {
    let name = room.name;
    let description = room.description;

    // Apply name variations
    if (this.config.variation && room.nameVariations.length > 0 && this.random() < this.config.creativityLevel) {
      name = room.nameVariations[Math.floor(this.random() * room.nameVariations.length)];
    }

    // Apply description variations
    if (this.config.variation && room.descriptionVariations.length > 0 && this.random() < this.config.creativityLevel) {
      description = room.descriptionVariations[Math.floor(this.random() * room.descriptionVariations.length)];
    }

    // Add contextual details if connection-based generation
    if ((context as any).connectionName) {
      description = this.addConnectionContext(description, (context as any).connectionName);
    }

    // Generate connections
    const connections = this.generateConnections(room, context, themeProfile);

    return { name, description, connections };
  }

  /**
   * Generate thematically appropriate connections for a room
   */
  private generateConnections(room: MockRoom, context: RoomContext, themeProfile: ThemeProfile): Array<{direction: string, name: string}> {
    const connections: Array<{direction: string, name: string}> = [];

    // Add return connection if this is connection-based generation
    const contextWithDirection = context as any;
    if (contextWithDirection.direction) {
      const returnDirection = this.getReverseDirection(contextWithDirection.direction);
      if (returnDirection) {
        const returnConnection = this.createReturnConnection(returnDirection, contextWithDirection);
        connections.push(returnConnection);
      }
    }

    // Add additional connections based on room hints and dice roll
    const additionalCount = this.rollConnectionCount();
    const usedDirections = new Set(connections.map(c => c.direction));
    const availableDirections = ['north', 'south', 'east', 'west', 'up', 'down']
      .filter(dir => !usedDirections.has(dir));

    for (let i = 0; i < additionalCount && connections.length < 4 && i < availableDirections.length; i++) {
      const direction = availableDirections[i];
      const connection = this.createThematicConnection(direction, room, themeProfile);
      connections.push(connection);
    }

    return connections;
  }

  /**
   * Initialize content pools - load from content files
   */
  private initializeContentPools(): MockContentPools {
    // Import content pools
    const { mansionRooms } = require('../data/mockContent/rooms/mansion');
    const { forestRooms } = require('../data/mockContent/rooms/forest');
    const { caveRooms } = require('../data/mockContent/rooms/cave');
    
    const { architecturalConnections } = require('../data/mockContent/connections/architectural');
    const { naturalConnections } = require('../data/mockContent/connections/natural');
    const { mysticalConnections } = require('../data/mockContent/connections/mystical');
    const { mechanicalConnections } = require('../data/mockContent/connections/mechanical');

    return {
      rooms: {
        mansion: mansionRooms,
        forest: forestRooms,
        cave: caveRooms
      },
      regions: {},
      connections: {
        architectural: architecturalConnections,
        natural: naturalConnections,
        mystical: mysticalConnections,
        mechanical: mechanicalConnections
      },
      npcs: {}
    };
  }

  // Utility methods for theme extraction, scoring, etc.
  private extractThemesFromPrompt(prompt: string): string[] {
    const themePatterns = {
      mansion: /mansion|estate|manor|grand|luxurious|opulent|ballroom|library/i,
      forest: /forest|woodland|tree|grove|natural|wilderness|clearing|path/i,
      cave: /cave|cavern|underground|subterranean|rocky|crystal|stalactite/i,
      volcanic: /volcanic|lava|fire|forge|molten|obsidian|thermal|ember/i,
      necropolis: /necropolis|tomb|crypt|burial|death|cemetery|ossuary|memorial/i,
      laboratory: /laboratory|experiment|alchemy|arcane|magical|potion|apparatus/i,
      town: /town|village|market|shop|tavern|inn|street|plaza/i,
      castle: /castle|fortress|tower|battlements|throne|dungeon|armory/i
    };

    return Object.entries(themePatterns)
      .filter(([theme, pattern]) => pattern.test(prompt))
      .map(([theme]) => theme);
  }

  private extractKeywordsFromPrompt(prompt: string): string[] {
    // Extract important descriptive keywords from prompt
    const keywords: string[] = [];
    const keywordPatterns = [
      /crystal/i, /golden?/i, /silver/i, /ancient/i, /mysterious/i,
      /glowing?/i, /dark/i, /bright/i, /shadowy?/i, /ethereal/i,
      /ornate/i, /simple/i, /grand/i, /small/i, /vast/i, /tiny/i
    ];

    keywordPatterns.forEach(pattern => {
      const match = prompt.match(pattern);
      if (match) {
        keywords.push(match[0].toLowerCase());
      }
    });

    return keywords;
  }

  private detectMood(prompt: string): string {
    if (/dark|ominous|foreboding|sinister|threatening/i.test(prompt)) return 'ominous';
    if (/peaceful|serene|calm|tranquil|welcoming/i.test(prompt)) return 'peaceful';
    if (/mysterious|enigmatic|cryptic|hidden|secret/i.test(prompt)) return 'mysterious';
    if (/bright|cheerful|warm|inviting|comfortable/i.test(prompt)) return 'welcoming';
    return 'neutral';
  }

  private extractAdjacentThemes(context: RoomContext): string[] {
    // Extract themes from current room description
    if (context.currentRoom?.description) {
      return this.extractThemesFromPrompt(context.currentRoom.description);
    }
    return [];
  }

  private combineThemes(promptThemes: string[], adjacentThemes: string[], regionTheme?: string): string[] {
    const combined = new Set<string>();

    // Add prompt themes (highest priority)
    promptThemes.forEach(theme => combined.add(theme));

    // Add region theme with high weight
    if (regionTheme) {
      combined.add(regionTheme);
    }

    // Add adjacent themes with context sensitivity weighting
    if (this.config.contextSensitivity > 0.5) {
      adjacentThemes.forEach(theme => combined.add(theme));
    }

    return Array.from(combined);
  }

  private parseRequirements(prompt: string): string[] {
    const requirements: string[] = [];
    
    if (/connection.*name|thematic.*connection/i.test(prompt)) {
      requirements.push('thematic_connections');
    }
    if (/return.*path|back.*connection/i.test(prompt)) {
      requirements.push('return_path');
    }
    if (/unique|different|new/i.test(prompt)) {
      requirements.push('unique_content');
    }

    return requirements;
  }

  // Simple room candidate selection
  private findRoomCandidates(themes: string[], usedIds: Set<string>): MockRoom[] {
    const candidates: MockRoom[] = [];
    
    // Get all rooms from all themes that match
    Object.entries(this.contentPools.rooms).forEach(([themeType, rooms]) => {
      if (themes.length === 0 || themes.includes(themeType)) {
        // Add rooms that haven't been used or allow reuse if repetition avoidance is off
        const availableRooms = rooms.filter(room => 
          !this.config.repetitionAvoidance || !usedIds.has(room.id)
        );
        candidates.push(...availableRooms);
      }
    });

    // If no candidates found, try any room that matches partial themes
    if (candidates.length === 0 && themes.length > 0) {
      Object.values(this.contentPools.rooms).forEach(rooms => {
        rooms.forEach(room => {
          const hasMatchingTheme = room.themes.some(roomTheme => themes.includes(roomTheme));
          if (hasMatchingTheme && (!this.config.repetitionAvoidance || !usedIds.has(room.id))) {
            candidates.push(room);
          }
        });
      });
    }

    return candidates;
  }

  private scoreRoomFit(room: MockRoom, themeProfile: ThemeProfile, context: RoomContext): number {
    let score = 0;

    // Theme matching (highest weight)
    const themeOverlap = room.themes.filter(t => themeProfile.themes.includes(t)).length;
    score += themeOverlap * 15;

    // Region coherence
    if (themeProfile.regionTheme && room.themes.includes(themeProfile.regionTheme)) {
      score += 20;
    }

    // Keyword matching
    const keywordOverlap = room.keywords.filter(k => themeProfile.keywords.includes(k)).length;
    score += keywordOverlap * 8;

    // Mood compatibility
    if (themeProfile.mood && room.mood === themeProfile.mood) {
      score += 10;
    }

    // Adjacency bonuses/penalties
    const adjacentThemes = this.extractAdjacentThemes(context);
    score += room.adjacencyBonus.filter(t => adjacentThemes.includes(t)).length * 5;
    score -= room.adjacencyPenalty.filter(t => adjacentThemes.includes(t)).length * 8;

    // Region fit score
    score += room.regionFit * 12;

    return score;
  }

  private getFallbackRoom(themeProfile: ThemeProfile): MockRoom {
    // Simple fallback room
    return {
      id: 'fallback_room',
      name: 'Mysterious Chamber',
      description: 'A simple chamber with stone walls and a single torch flickering in a wall sconce.',
      themes: themeProfile.themes.length > 0 ? themeProfile.themes : ['generic'],
      keywords: ['stone', 'torch', 'simple'],
      mood: 'neutral',
      size: 'intimate',
      lighting: 'dim',
      nameVariations: [],
      descriptionVariations: [],
      connectionHints: {
        architectural: ['doorway'],
        natural: [],
        mystical: [],
        mechanical: []
      },
      adjacencyBonus: [],
      adjacencyPenalty: [],
      regionFit: 0.5
    };
  }

  private createSeededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  // Utility methods for tracking and context
  private getContextKey(context: RoomContext): string {
    return `game_${(context as any).gameId || 'default'}`;
  }

  private getRegionContextKey(context: RegionGenerationContext): string {
    return `game_${context.gameId || 'default'}`;
  }

  private getNPCContextKey(context: NPCContext): string {
    return `room_${context.roomName || 'default'}`;
  }

  private getUsedContent(type: string, contextKey: string): Set<string> {
    const key = `${type}_${contextKey}`;
    if (!this.usedContent.has(key)) {
      this.usedContent.set(key, new Set());
    }
    return this.usedContent.get(key)!;
  }

  private trackUsage(type: string, contentId: string, contextKey: string): void {
    if (this.config.repetitionAvoidance) {
      const usedSet = this.getUsedContent(type, contextKey);
      usedSet.add(contentId);
    }
  }

  // Placeholder methods for features to be implemented
  private selectBestRegion(themeProfile: ThemeProfile, context: RegionGenerationContext, usedIds: Set<string>): MockRegion {
    throw new Error('Region selection not yet implemented');
  }

  private selectBestNPC(themeProfile: ThemeProfile, context: NPCContext, usedIds: Set<string>): MockNPC {
    throw new Error('NPC selection not yet implemented');
  }

  private addRegionVariation(region: MockRegion, context: RegionGenerationContext, themeProfile: ThemeProfile): GeneratedRegion {
    throw new Error('Region variation not yet implemented');
  }

  private addNPCVariation(npc: MockNPC, context: NPCContext, themeProfile: ThemeProfile): GeneratedNPC {
    throw new Error('NPC variation not yet implemented');
  }

  private analyzeRegionPrompt(prompt: string, context: RegionGenerationContext): ThemeProfile {
    throw new Error('Region prompt analysis not yet implemented');
  }

  private analyzeNPCPrompt(prompt: string, context: NPCContext): ThemeProfile {
    throw new Error('NPC prompt analysis not yet implemented');
  }

  private countCandidates(type: string, themes: string[]): number {
    return 0; // Placeholder
  }

  private getLastScoreBreakdown(): Record<string, number> {
    return {}; // Placeholder
  }

  private getAppliedVariations(): string[] {
    return []; // Placeholder
  }

  private logDebugInfo(type: string, info: MockDebugInfo): void {
    console.log(`🎭 Mock AI ${type} selection:`, info);
  }

  private addConnectionContext(description: string, connectionName: string): string {
    return `${description} You entered this space ${connectionName}.`;
  }

  private getReverseDirection(direction: string): string | null {
    const reverseMap: Record<string, string> = {
      'north': 'south',
      'south': 'north',
      'east': 'west',
      'west': 'east',
      'up': 'down',
      'down': 'up',
      'northeast': 'southwest',
      'northwest': 'southeast',
      'southeast': 'northwest',
      'southwest': 'northeast'
    };
    return reverseMap[direction] || null;
  }

  private createReturnConnection(direction: string, context: any): {direction: string, name: string} {
    const connectionName = context.connectionName || 'the entrance';
    return {
      direction,
      name: `back ${connectionName}`
    };
  }

  private createThematicConnection(direction: string, room: MockRoom, themeProfile: ThemeProfile): {direction: string, name: string} {
    // Select connection style based on room themes
    let style: keyof typeof this.contentPools.connections = 'architectural'; // default
    if (room.themes.includes('forest') || room.themes.includes('natural')) {
      style = 'natural';
    } else if (room.themes.includes('magical') || room.themes.includes('mystical')) {
      style = 'mystical';
    } else if (room.themes.includes('mechanical') || room.themes.includes('clockwork')) {
      style = 'mechanical';
    }

    // Get connections from the pool
    const connections = this.contentPools.connections[style];
    if (connections.length > 0) {
      // Filter by matching themes if possible
      const matchingConnections = connections.filter(conn => 
        conn.themes.some(theme => room.themes.includes(theme))
      );
      
      const selectedConnections = matchingConnections.length > 0 ? matchingConnections : connections;
      const connection = selectedConnections[Math.floor(this.random() * selectedConnections.length)];
      
      return {
        direction,
        name: connection.description.toLowerCase()
      };
    }

    // Fallback to room hints
    const hints = room.connectionHints[style] || ['passage'];
    const hint = hints[Math.floor(this.random() * hints.length)] || 'passage';

    return {
      direction,
      name: `through the ${hint}`
    };
  }

  private rollConnectionCount(): number {
    // Use environment variable or default 2d4 logic
    const diceEnv = process.env.CONNECTION_DICE || '2d4';
    if (diceEnv === '2d4') {
      return Math.floor(this.random() * 4) + 1 + Math.floor(this.random() * 4) + 1 - 1; // 2d4 - 1 for additional connections
    }
    return 2; // Default fallback
  }
}