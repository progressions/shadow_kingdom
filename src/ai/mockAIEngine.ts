import { GeneratedRoom, GeneratedRegion, GeneratedNPC, GeneratedCharacter, RoomContext, RegionGenerationContext, NPCContext, CharacterWithSentimentContext, GeneratedCharacterWithSentiment, BehavioralDialogueContext, GeneratedBehavioralDialogue } from './grokClient';

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
   * Generate room description with sentiment context
   */
  async generateRoomDescription(prompt: string, context?: any): Promise<{ name: string; description: string }> {
    // Extract sentiment information from the prompt
    const hasHostileCharacters = prompt.includes('hostile') || prompt.includes('aggressive');
    const hasFriendlyCharacters = prompt.includes('friendly') || prompt.includes('allied');
    const hasMixedSentiments = hasHostileCharacters && hasFriendlyCharacters;
    const hasNoCharacters = prompt.includes('No characters currently present');

    // Generate appropriate room description based on sentiment context
    let name: string;
    let description: string;

    if (hasNoCharacters) {
      name = 'Empty Chamber';
      description = 'A quiet, empty chamber with a neutral atmosphere. The silence is almost palpable.';
    } else if (hasMixedSentiments) {
      name = 'Tense Meeting Hall';
      description = 'A room charged with complex social dynamics. You can sense the tension between conflicting personalities, creating an atmosphere of uncertainty and potential conflict.';
    } else if (hasHostileCharacters) {
      name = 'Dangerous Den';
      description = 'A menacing space that radiates danger and hostility. The very air seems thick with threat and malice, making every shadow seem ominous.';
    } else if (hasFriendlyCharacters) {
      name = 'Welcoming Hall';
      description = 'A warm and inviting space that exudes comfort and safety. The atmosphere is friendly and peaceful, putting visitors at ease.';
    } else {
      name = 'Neutral Chamber';
      description = 'A functional space with a business-like atmosphere. Neither welcoming nor threatening, it serves its purpose efficiently.';
    }

    return { name, description };
  }

  /**
   * Generate character with appropriate sentiment based on context
   */
  async generateCharacterWithSentiment(prompt: string, context: CharacterWithSentimentContext): Promise<GeneratedCharacterWithSentiment> {
    const { roomName, roomDescription, regionName, existingCharacters } = context;
    
    // Analyze context to determine appropriate sentiment
    const isGuardedPlace = roomName.toLowerCase().includes('treasury') || 
                          roomName.toLowerCase().includes('vault') || 
                          roomName.toLowerCase().includes('fortress') ||
                          regionName.toLowerCase().includes('fortress') ||
                          regionName.toLowerCase().includes('dungeon');
    
    const isPeacefulPlace = roomName.toLowerCase().includes('village') || 
                           roomName.toLowerCase().includes('market') || 
                           roomName.toLowerCase().includes('peaceful') ||
                           regionName.toLowerCase().includes('village') ||
                           regionName.toLowerCase().includes('peaceful');
    
    const isNeutralPlace = roomName.toLowerCase().includes('outpost') || 
                          roomName.toLowerCase().includes('crossing') ||
                          roomName.toLowerCase().includes('guard') ||
                          roomName.toLowerCase().includes('hall');
    
    const isSpecialPlace = roomName.toLowerCase().includes('prison') || 
                          roomName.toLowerCase().includes('rescue') ||
                          roomName.toLowerCase().includes('cell');

    // Check for existing character conflicts
    const hasFriendlyCharacters = existingCharacters.some((char: any) => 
      char.sentiment === 'friendly' || char.sentiment === 'allied'
    );

    let sentiment: string;
    let characterType: 'npc' | 'enemy';
    let nameTemplate: string;
    let reasoning: string;

    if (isSpecialPlace) {
      sentiment = 'allied';
      characterType = 'npc';
      nameTemplate = 'Grateful Prisoner';
      reasoning = 'Rescued prisoners become allied due to gratitude';
    } else if (isGuardedPlace && hasFriendlyCharacters) {
      sentiment = 'hostile';
      characterType = 'enemy';
      nameTemplate = 'Rival Thief';
      reasoning = 'Creating conflict with existing friendly characters';
    } else if (isGuardedPlace) {
      sentiment = 'aggressive';
      characterType = 'enemy';
      nameTemplate = 'Gruff Guardian';
      reasoning = 'Guardian characters are typically aggressive toward intruders';
    } else if (isPeacefulPlace) {
      sentiment = 'friendly';
      characterType = 'npc';
      nameTemplate = 'Kind Merchant';
      reasoning = 'Merchants in peaceful villages are typically friendly to potential customers';
    } else if (isNeutralPlace) {
      sentiment = 'indifferent';
      characterType = 'npc';
      nameTemplate = 'Stoic Guard';
      reasoning = 'Guards at neutral outposts are typically indifferent to travelers';
    } else {
      sentiment = 'indifferent';
      characterType = 'npc';
      nameTemplate = 'Context Character';
      reasoning = 'Default indifferent character for unspecified context';
    }

    return {
      name: nameTemplate,
      type: characterType,
      sentiment: sentiment,
      description: `A character created by AI with ${sentiment} disposition`,
      contextReasoning: reasoning
    };
  }

  /**
   * Generate sentiment-based behavioral dialogue
   */
  async generateSentimentBasedDialogue(prompt: string, context: BehavioralDialogueContext): Promise<GeneratedBehavioralDialogue> {
    const sentiment = context.sentiment.toLowerCase();
    const playerCommand = context.playerCommand.toLowerCase();
    const hasHistory = context.conversationHistory && context.conversationHistory.length > 0;
    const isSpecialLocation = context.roomContext?.type === 'sacred' || 
                             context.roomContext?.name.toLowerCase().includes('temple') ||
                             context.roomContext?.name.toLowerCase().includes('sacred');
    
    // Adjust responses based on context
    switch (sentiment) {
      case 'hostile':
        if (isSpecialLocation) {
          return {
            response: "Even in this sacred place, I'll gladly spill your blood if you don't leave!",
            tone: 'threatening',
            action: 'prepares_for_combat',
            sentimentContext: 'hostile',
            locationModifier: 'sacred_space',
            suggestedPlayerActions: ['retreat', 'defend', 'attack']
          };
        }
        return {
          response: "You dare approach me?! Draw your weapon or flee, coward!",
          tone: 'threatening',
          action: 'prepares_for_combat',
          sentimentContext: 'hostile',
          suggestedPlayerActions: ['retreat', 'defend', 'attack']
        };

      case 'aggressive':
        if (hasHistory) {
          return {
            response: "We've spoken before. What more do you want?",
            tone: 'impatient',
            action: 'watches_warily',
            sentimentContext: 'aggressive',
            suggestedPlayerActions: ['explain_purpose', 'back_away']
          };
        }
        if (isSpecialLocation) {
          return {
            response: "In this sacred place, even I must speak softly. What brings you to this holy ground?",
            tone: 'reverent',
            action: 'speaks_quietly',
            sentimentContext: 'aggressive',
            locationModifier: 'sacred_space',
            suggestedPlayerActions: ['explain_purpose', 'show_respect']
          };
        }
        if (context.sentimentChange === 'recently_improved') {
          return {
            response: "You again? That gift you gave me... it was unexpected. Perhaps you're not so bad after all.",
            tone: 'softening',
            action: 'reconsiders_position',
            sentimentContext: 'indifferent',
            sentimentChange: 'recently_improved',
            suggestedPlayerActions: ['continue_conversation', 'offer_more_help']
          };
        }
        return {
          response: "State your business quickly. I don't have time for idle chatter.",
          tone: 'suspicious',
          action: 'watches_warily',
          sentimentContext: 'aggressive',
          suggestedPlayerActions: ['explain_purpose', 'show_credentials', 'back_away']
        };

      case 'friendly':
        if (playerCommand.includes('lost') || context.context.includes('lost')) {
          return {
            response: "You look lost, friend. Let me share what I know about these lands.",
            tone: 'helpful',
            action: 'offers_guidance',
            sentimentContext: 'friendly',
            suggestedPlayerActions: ['ask_for_directions', 'accept_help', 'trade_items']
          };
        }
        return {
          response: "Welcome, friend! How wonderful to see a new face. How can I help you today?",
          tone: 'welcoming',
          action: 'smiles_warmly',
          sentimentContext: 'friendly',
          suggestedPlayerActions: ['ask_for_help', 'trade_items', 'share_news']
        };

      case 'allied':
        return {
          response: "My trusted friend! I would follow you to the ends of the earth. What is our next move?",
          tone: 'devoted',
          action: 'stands_ready',
          sentimentContext: 'allied',
          suggestedPlayerActions: ['request_aid', 'share_plans', 'ask_advice']
        };

      default: // indifferent
        if (playerCommand.includes('examine')) {
          return {
            response: "Yes? What do you need? I'm quite busy with these ledgers.",
            tone: 'neutral',
            action: 'continues_working',
            sentimentContext: 'indifferent',
            suggestedPlayerActions: ['state_business', 'apologize', 'offer_payment']
          };
        }
        return {
          response: "Yes? What do you need? I'm quite busy with these ledgers.",
          tone: 'neutral',
          action: 'continues_working',
          sentimentContext: 'indifferent',
          suggestedPlayerActions: ['state_business', 'apologize', 'offer_payment']
        };
    }
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

    // Generate items for the room
    const items = this.generateRoomItems(room, themeProfile);

    // Generate characters for the room
    const characters = this.generateRoomCharacters(room, themeProfile);

    return { name, description, connections, items, characters };
  }

  /**
   * Generate items for a room based on its theme and dice roll logic
   */
  private generateRoomItems(room: MockRoom, themeProfile: ThemeProfile): Array<{name: string, description: string, isFixed: boolean}> {
    const items: Array<{name: string, description: string, isFixed: boolean}> = [];
    
    // Skip item generation if disabled
    if (process.env.AI_ITEM_GENERATION_ENABLED === 'false') {
      return items;
    }

    // Use same dice logic as real AI: 1d6-3 for item count (0-3 items, 50% chance of 0)
    const itemCount = Math.max(0, Math.floor(Math.random() * 6) + 1 - 3);
    
    // If dice roll results in 0 items, return empty array
    if (itemCount === 0) {
      return items;
    }

    // Common items based on room themes
    const themeItems: Record<string, Array<{name: string, description: string, isFixed: boolean}>> = {
      'library': [
        { name: 'Ancient Tome', description: 'A leather-bound book with yellowed pages and strange symbols.', isFixed: false },
        { name: 'Oak Bookshelf', description: 'Towering shelves filled with countless volumes of forgotten lore.', isFixed: true },
        { name: 'Reading Desk', description: 'A heavy wooden desk scarred by years of scholarly work.', isFixed: true }
      ],
      'garden': [
        { name: 'Stone Bench', description: 'A weathered bench covered in creeping moss.', isFixed: true },
        { name: 'Crystal Rose', description: 'A delicate flower that seems to glow with inner light.', isFixed: false },
        { name: 'Fountain', description: 'An ornate fountain with water that sparkles like starlight.', isFixed: true }
      ],
      'chamber': [
        { name: 'Four-Poster Bed', description: 'An elegant bed draped with faded velvet curtains.', isFixed: true },
        { name: 'Silver Mirror', description: 'An antique mirror that reflects more than just your image.', isFixed: false },
        { name: 'Wardrobe', description: 'A massive wardrobe of dark wood with intricate carvings.', isFixed: true }
      ],
      'hall': [
        { name: 'Marble Columns', description: 'Towering pillars of white marble veined with gold.', isFixed: true },
        { name: 'Tapestry', description: 'An ancient tapestry depicting scenes of a forgotten kingdom.', isFixed: true },
        { name: 'Ceremonial Sword', description: 'A decorative blade mounted on the wall, its steel still sharp.', isFixed: false }
      ],
      'default': [
        { name: 'Dusty Crate', description: 'A wooden crate covered in years of dust and cobwebs.', isFixed: true },
        { name: 'Old Lantern', description: 'A brass lantern that might still hold oil.', isFixed: false },
        { name: 'Stone Pedestal', description: 'A carved pedestal that once held something important.', isFixed: true }
      ]
    };

    // Determine which theme items to use
    let selectedItems = themeItems.default;
    for (const theme of themeProfile.themes) {
      if (themeItems[theme]) {
        selectedItems = themeItems[theme];
        break;
      }
    }

    // Select exactly itemCount items (already determined by dice roll above)
    const shuffled = [...selectedItems].sort(() => this.random() - 0.5);
    
    for (let i = 0; i < Math.min(itemCount, shuffled.length); i++) {
      items.push(shuffled[i]);
    }

    return items;
  }

  /**
   * Generate characters for a room based on its theme
   */
  private generateRoomCharacters(room: MockRoom, themeProfile: ThemeProfile): GeneratedCharacter[] {
    const characters: GeneratedCharacter[] = [];
    
    // Skip character generation if disabled
    if (process.env.AI_CHARACTER_GENERATION_ENABLED === 'false') {
      return characters;
    }

    // Use same percentage logic as real AI: CHARACTER_GENERATION_FREQUENCY (default 40%)
    const characterGenerationFrequency = parseInt(process.env.CHARACTER_GENERATION_FREQUENCY || '40');
    const shouldIncludeCharacters = this.random() * 100 <= characterGenerationFrequency;
    if (!shouldIncludeCharacters) {
      return characters;
    }

    // Character data organized by themes
    const themeCharacters: Record<string, GeneratedCharacter[]> = {
      'library': [
        {
          name: 'Elder Librarian',
          description: 'A wise keeper of ancient knowledge, surrounded by floating tomes',
          type: 'npc',
          personality: 'Scholarly and cryptic',
          initialDialogue: 'The secrets of ages past rest within these halls...',
          attributes: { intelligence: 16, wisdom: 14 }
        },
        {
          name: 'Spectral Scholar',
          description: 'The ghost of a long-dead researcher, still pursuing forgotten lore',
          type: 'npc',
          personality: 'Obsessive and distant',
          initialDialogue: 'Have you come seeking the truth that cost me my life?'
        }
      ],
      'garden': [
        {
          name: 'Garden Sprite',
          description: 'A tiny fae creature tending to magical plants',
          type: 'npc',
          personality: 'Playful and mischievous',
          initialDialogue: 'Welcome to my garden! Mind the thorns that bite back...',
          attributes: { dexterity: 15, charisma: 12 }
        },
        {
          name: 'Thorn Guardian',
          description: 'A creature of living vines and thorns protecting the garden',
          type: 'enemy',
          level: 2,
          isHostile: false,
          attributes: { constitution: 14, strength: 12 }
        }
      ],
      'chamber': [
        {
          name: 'Noble Phantom',
          description: 'The ghostly remains of the chamber\'s former occupant',
          type: 'npc',
          personality: 'Melancholic and nostalgic',
          initialDialogue: 'You dare disturb my eternal rest? State your purpose.',
          attributes: { charisma: 13, wisdom: 11 }
        }
      ],
      'hall': [
        {
          name: 'Palace Guard',
          description: 'An armored sentinel standing eternally at their post',
          type: 'enemy',
          level: 3,
          isHostile: false,
          attributes: { strength: 15, constitution: 14 }
        },
        {
          name: 'Court Herald',
          description: 'A ghostly figure in elaborate robes, eternally announcing visitors',
          type: 'npc',
          personality: 'Formal and ceremonial',
          initialDialogue: 'By royal decree, state your name and business in these halls!',
          attributes: { charisma: 14, intelligence: 12 }
        }
      ],
      'kitchen': [
        {
          name: 'Chef\'s Spirit',
          description: 'The ghost of a master chef, still preparing ethereal meals',
          type: 'npc',
          personality: 'Passionate and temperamental',
          initialDialogue: 'Perfect! A new taster for my spectral cuisine!',
          attributes: { dexterity: 13, constitution: 12 }
        }
      ],
      'armory': [
        {
          name: 'Weapon Master',
          description: 'An ancient warrior spirit bound to guard the weapons',
          type: 'enemy',
          level: 4,
          isHostile: false,
          attributes: { strength: 16, dexterity: 13 }
        }
      ],
      'mystical': [
        {
          name: 'Arcane Sentinel',
          description: 'A being of pure magical energy guarding mystical secrets',
          type: 'enemy',
          level: 3,
          isHostile: false,
          attributes: { intelligence: 15, wisdom: 13 }
        },
        {
          name: 'Crystal Oracle',
          description: 'A mysterious figure whose form shifts like flowing crystal',
          type: 'npc',
          personality: 'Enigmatic and all-knowing',
          initialDialogue: 'The threads of fate have brought you here, seeker.',
          attributes: { intelligence: 17, wisdom: 16 }
        }
      ],
      'natural': [
        {
          name: 'Forest Warden',
          description: 'A guardian spirit of the natural world',
          type: 'npc',
          personality: 'Protective and wise',
          initialDialogue: 'The forest speaks of your arrival, traveler.',
          attributes: { wisdom: 15, constitution: 13 }
        },
        {
          name: 'Wild Beast',
          description: 'A creature of the wilderness, wary but not immediately hostile',
          type: 'enemy',
          level: 2,
          isHostile: false,
          attributes: { dexterity: 14, constitution: 13 }
        }
      ],
      'mechanical': [
        {
          name: 'Clockwork Automaton',
          description: 'A mechanical being of brass and steel, still following ancient commands',
          type: 'npc',
          personality: 'Logical and precise',
          initialDialogue: 'QUERY: State your authorization to access this facility.',
          attributes: { intelligence: 13, constitution: 15 }
        }
      ]
    };

    // Find matching characters based on room themes
    let availableCharacters: GeneratedCharacter[] = [];
    
    for (const theme of room.themes) {
      if (themeCharacters[theme]) {
        availableCharacters.push(...themeCharacters[theme]);
      }
    }

    // Fallback to generic characters if no theme matches
    if (availableCharacters.length === 0) {
      availableCharacters = [
        {
          name: 'Mysterious Figure',
          description: 'A shadowy presence watching from the corners',
          type: 'npc',
          personality: 'Secretive and cautious',
          initialDialogue: 'You shouldn\'t be here...'
        },
        {
          name: 'Wandering Spirit',
          description: 'A lost soul searching for something long forgotten',
          type: 'npc',
          personality: 'Melancholic and searching',
          initialDialogue: 'Have you seen... no, you wouldn\'t have...'
        }
      ];
    }

    // Select 1-2 characters randomly, respecting max limit
    const maxCharacters = parseInt(process.env.MAX_CHARACTERS_PER_ROOM || '2');
    const characterCount = Math.min(
      Math.floor(this.random() * 2) + 1, // 1-2 characters
      maxCharacters,
      availableCharacters.length
    );
    
    const shuffled = [...availableCharacters].sort(() => this.random() - 0.5);
    
    for (let i = 0; i < characterCount; i++) {
      characters.push({ ...shuffled[i] }); // Clone to avoid reference issues
    }

    return characters;
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