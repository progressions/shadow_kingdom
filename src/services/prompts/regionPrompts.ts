/**
 * Prompt templates for Claude region generation
 */

export interface RegionThemePromptContext {
  previousRegion?: {
    name: string;
    theme: string;
    exitDirection?: string;
  } | null;
  direction: string;
  worldSeed?: string;
  existingRegions?: string[]; // List of already generated region themes to avoid duplicates
}

export class RegionPromptTemplates {
  /**
   * System prompt for region theme generation
   */
  static getThemeSystemPrompt(): string {
    return `You are the creative director for Shadow Kingdom, a fantasy text adventure game.
    Your role is to generate unique, immersive regions that form a coherent fantasy world.
    
    Each region must:
    - Have a distinct theme that creates a memorable atmosphere
    - Connect logically to adjacent regions (consider geography and narrative flow)
    - Include a guardian creature that fits the theme
    - Feature a key item with lore significance
    - Maintain internal consistency across all 12 rooms
    
    Design Principles:
    - Variety: Each region should feel unique and offer different gameplay experiences
    - Mystery: Include hints about the larger world and its history
    - Coherence: Themes should flow naturally from one region to another
    
    You must respond with valid JSON matching this exact structure:
    {
      "name": "Region Name (2-3 words, capitalized)",
      "theme": "core theme concept (e.g., 'ancient dwarven mines', 'enchanted grove')",
      "description": "1-2 sentences describing the region's essence and what makes it unique",
      "atmosphere": "the mood and feeling (e.g., 'oppressive and claustrophobic', 'serene but unsettling')",
      "guardianConcept": {
        "name": "Guardian Name",
        "type": "creature type (e.g., 'undead', 'elemental', 'beast')",
        "description": "appearance and nature of the guardian"
      },
      "keyConcept": {
        "name": "Key Item Name",
        "description": "physical description and magical properties",
        "hint": "subtle clue about where to find it or how to obtain it"
      },
      "lockedExitDescription": "description of the locked passage to the next region"
    }`;
  }

  /**
   * User prompt for region theme generation
   */
  static getThemeUserPrompt(context: RegionThemePromptContext): string {
    const parts: string[] = [];

    // Starting context
    if (!context.previousRegion) {
      parts.push("Generate the FIRST region of a new adventure.");
      parts.push("This is where the player's journey begins.");
      parts.push("Make it welcoming but with hints of danger ahead.");
    } else {
      parts.push(`The player is traveling ${context.direction.toUpperCase()} from:`);
      parts.push(`Previous Region: "${context.previousRegion.name}"`);
      parts.push(`Theme: ${context.previousRegion.theme}`);
      if (context.previousRegion.exitDirection) {
        parts.push(`Exit was to the ${context.previousRegion.exitDirection}`);
      }
      parts.push("");
      parts.push("The new region should:");
      parts.push("- Feel like a natural progression from the previous area");
      parts.push("- Offer a contrasting but connected theme");
      parts.push("- Escalate or vary the challenge appropriately");
    }


    // Avoid duplicates
    if (context.existingRegions && context.existingRegions.length > 0) {
      parts.push("");
      parts.push("Already explored regions (avoid similar themes):");
      context.existingRegions.slice(-5).forEach(r => parts.push(`- ${r}`));
    }

    // Direction-based suggestions
    parts.push("");
    parts.push(getDirectionalHints(context.direction));

    return parts.join("\n");
  }

  /**
   * System prompt for room batch generation
   */
  static getRoomBatchSystemPrompt(): string {
    return `You are designing the detailed layout of a Shadow Kingdom region.
    Your task is to create 12 interconnected rooms that bring the region's theme to life.
    
    Room Design Principles:
    - Variety: Each room should offer something unique while maintaining thematic coherence
    - Navigation: Rooms should connect logically with clear paths and occasional secrets
    - Storytelling: Use environmental details to tell the region's story
    - Gameplay: Balance exploration, combat, puzzles, and discovery
    
    Special Room Requirements:
    - The guardian room should be climactic and memorable
    - The key room should reward careful exploration
    - Entry and exit rooms should provide clear transitions
    - Include at least 2-3 rooms with special features or secrets
    
    You must respond with a JSON array of exactly 12 room objects:
    [
      {
        "index": <0-11>,
        "name": "Room Name",
        "description": "Detailed description including sights, sounds, smells, and atmosphere",
        "features": ["notable feature 1", "notable feature 2"],
        "hasGuardian": <true/false>,
        "hasKey": <true/false>,
        "connections": ["north", "south", "east", "west"],
        "secrets": "optional hidden elements or easter eggs"
      }
    ]`;
  }

  /**
   * User prompt for room batch generation
   */
  static getRoomBatchUserPrompt(
    theme: any,
    guardianRoomIndex: number,
    keyRoomIndex: number,
    entranceDirection: string,
    exitDirection: string
  ): string {
    return `Generate 12 rooms for the region: "${theme.name}"
    
Regional Context:
- Theme: ${theme.theme}
- Atmosphere: ${theme.atmosphere}
- Description: ${theme.description}

Guardian: "${theme.guardianConcept.name}" (${theme.guardianConcept.type})
- ${theme.guardianConcept.description}
- Located in room ${guardianRoomIndex}

Key Item: "${theme.keyConcept.name}"
- ${theme.keyConcept.description}
- Located in room ${keyRoomIndex}
- Hint: ${theme.keyConcept.hint}

Layout Requirements:
- Room 0 is the ENTRANCE from the ${entranceDirection}
- Room 11 has the LOCKED EXIT leading ${exitDirection}
- Exit description: ${theme.lockedExitDescription}
- Guardian in room ${guardianRoomIndex} (make it a boss arena)
- Key in room ${keyRoomIndex} (make it rewarding to discover)

Create a cohesive layout where:
1. The entrance (room 0) welcomes players from the previous region
2. Rooms flow naturally with logical connections
3. The guardian encounter feels climactic
4. Finding the key feels rewarding
5. The locked exit (room 11) teases the next region

Include variety: combat rooms, puzzle rooms, treasure rooms, and atmospheric rooms.`;
  }
}

/**
 * Get directional hints for region generation
 */
function getDirectionalHints(direction: string): string {
  const hints: Record<string, string> = {
    north: "Consider: Higher elevation, colder climate, mountainous terrain, or ancient structures",
    south: "Consider: Warmer climate, lush vegetation, tropical elements, or desert transitions",
    east: "Consider: Sunrise themes, new beginnings, coastal regions, or mystical oriental influences",
    west: "Consider: Sunset themes, endings, wastelands, or western frontier elements",
  };
  
  return hints[direction.toLowerCase()] || "Consider the geographical and thematic flow from the previous region.";
}

/**
 * Theme progression suggestions based on previous theme
 */
export function getThemeProgressions(previousTheme: string): string[] {
  const progressions: Record<string, string[]> = {
    forest: ["ancient ruins", "druid grove", "spider caves", "treetop village", "corrupted woods"],
    caves: ["underground lake", "crystal caverns", "dwarven halls", "volcanic tubes", "mushroom kingdom"],
    castle: ["dungeon depths", "royal gardens", "abandoned wing", "wizard's tower", "siege grounds"],
    ruins: ["overgrown temple", "buried city", "archaeological site", "haunted battlefield", "time-worn palace"],
    swamp: ["witch's domain", "sunken village", "bog of eternal stench", "crocodile lair", "will-o'-wisp maze"],
    mountain: ["ice caves", "dragon's peak", "monastery", "giant's realm", "wind-swept plateau"],
    desert: ["oasis paradise", "sand-buried pyramid", "scorpion valley", "nomad camp", "glass desert"],
    underwater: ["coral palace", "shipwreck graveyard", "kraken's domain", "mer-city", "abyssal trench"],
  };

  // Extract key theme word
  const themeKey = Object.keys(progressions).find(key => 
    previousTheme.toLowerCase().includes(key)
  );

  return progressions[themeKey || 'forest'] || [
    "mysterious realm",
    "forgotten sanctuary",
    "cursed grounds",
    "ancient stronghold",
    "magical nexus"
  ];
}

/**
 * Guardian archetypes based on theme
 */
export function getGuardianArchetypes(theme: string): any[] {
  const archetypes = [
    {
      nature: ["Treant Sentinel", "Dire Wolf Pack Leader", "Corrupted Druid", "Vine Horror"],
      undead: ["Skeletal Champion", "Wraith Lord", "Zombie Horde Master", "Lich Apprentice"],
      elemental: ["Fire Sprite Swarm", "Stone Golem", "Wind Dancer", "Ice Construct"],
      beast: ["Mutant Spider Queen", "Cave Bear Matriarch", "Hydra Spawn", "Griffin Fledgling"],
      magical: ["Animated Armor", "Spell Wisp", "Rune Guardian", "Crystal Sentinel"],
      demonic: ["Imp Overseer", "Shadow Fiend", "Hellhound", "Lesser Demon"],
      construct: ["Clockwork Knight", "Iron Defender", "Jade Statue", "War Machine"],
      dragon: ["Wyrmling", "Drake", "Kobold Dragon-Priest", "Wyvern"],
    }
  ];

  // Return a selection based on theme keywords
  const themeCategories = [];
  
  if (theme.includes('forest') || theme.includes('grove')) themeCategories.push('nature');
  if (theme.includes('tomb') || theme.includes('crypt')) themeCategories.push('undead');
  if (theme.includes('crystal') || theme.includes('fire')) themeCategories.push('elemental');
  if (theme.includes('cave') || theme.includes('lair')) themeCategories.push('beast');
  if (theme.includes('magic') || theme.includes('wizard')) themeCategories.push('magical');
  if (theme.includes('hell') || theme.includes('cursed')) themeCategories.push('demonic');
  if (theme.includes('forge') || theme.includes('mechanical')) themeCategories.push('construct');
  if (theme.includes('hoard') || theme.includes('mountain')) themeCategories.push('dragon');

  return themeCategories.length > 0 ? themeCategories : ['beast', 'magical'];
}