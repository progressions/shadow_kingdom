# NPC System

**Date**: 2025-08-20  
**Status**: Open  
**Priority**: Medium  
**Category**: Feature  

## Description

Implement a non-player character (NPC) system that generates AI-powered characters with personalities, dialogue, and persistent memory, providing meaningful social interactions and quest opportunities throughout the world.

## Details

**What is the requirement?**
Create an NPC system with the following features:

- **AI-Generated NPCs**: Context-appropriate characters for each region
- **Personality System**: Distinct character traits and behaviors
- **Dialogue Trees**: Branching conversation options and responses
- **Memory System**: NPCs remember past interactions and player actions
- **Regional Integration**: NPCs appropriate to their environment and role
- **Quest Givers**: NPCs can provide missions and objectives
- **Relationship Tracking**: Player reputation and standing with individual NPCs

**Acceptance criteria:**
- [ ] Database schema for NPC data and states
- [ ] AI generation of NPCs with personality and backstory
- [ ] `talk <npc>` command to initiate conversations
- [ ] Dialogue system with multiple response options
- [ ] NPC memory of player actions and conversation history
- [ ] Regional NPC spawning in appropriate locations
- [ ] NPC descriptions and atmospheric presence
- [ ] Integration with quest and reputation systems

## Technical Notes

### Database Schema
```sql
CREATE TABLE npcs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  region_id INTEGER,
  room_id INTEGER,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  personality_traits TEXT, -- JSON array of traits
  backstory TEXT,
  occupation TEXT,
  dialogue_state TEXT, -- JSON current conversation state
  relationship_level INTEGER DEFAULT 0, -- -100 to +100
  reputation_tags TEXT, -- JSON array of player reputation aspects
  quest_giver BOOLEAN DEFAULT FALSE,
  merchant BOOLEAN DEFAULT FALSE,
  created_by_ai BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

CREATE TABLE npc_memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  npc_id INTEGER NOT NULL,
  character_id INTEGER NOT NULL,
  memory_type TEXT NOT NULL, -- conversation, action, quest, reputation
  memory_content TEXT NOT NULL,
  importance_level INTEGER DEFAULT 1, -- 1-10 scale
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE TABLE npc_dialogue_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  npc_id INTEGER NOT NULL,
  option_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  conditions TEXT, -- JSON conditions for showing option
  effects TEXT, -- JSON effects when chosen
  unlocks_options TEXT, -- JSON array of option IDs this unlocks
  one_time_only BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE
);
```

### AI NPC Generation
```typescript
const NPC_GENERATION_PROMPTS = {
  mansion: "Generate an NPC for an abandoned mansion - could be a caretaker, ghost, family member, or servant",
  forest: "Generate an NPC for an ancient forest - druid, ranger, hermit, or nature spirit",
  cave: "Generate an NPC for underground caves - miner, dwarf, treasure hunter, or cave dweller", 
  town: "Generate an NPC for a town setting - merchant, guard, citizen, or traveler"
};

const generateNPC = async (region: Region, room: Room): Promise<NPC> => {
  const prompt = `${NPC_GENERATION_PROMPTS[region.type]}
  
  Location: ${room.name} - ${room.description}
  Region: ${region.description}
  
  Create an NPC with:
  - Compelling name and appearance description
  - 3-4 distinct personality traits
  - Brief backstory explaining their presence here
  - Occupation or role in this location
  - Initial dialogue greeting appropriate to their personality
  - 2-3 conversation topics they might discuss`;
  
  const aiResponse = await grokClient.generateNPC(prompt);
  return parseNPCFromAI(aiResponse, region, room);
};
```

### Personality System
```typescript
interface NPCPersonality {
  traits: string[]; // friendly, suspicious, helpful, greedy, wise, etc.
  motivations: string[]; // what drives this NPC
  fears: string[]; // what they're afraid of
  interests: string[]; // topics they're passionate about
  speechPatterns: {
    formality: 'formal' | 'casual' | 'rustic';
    verbosity: 'terse' | 'normal' | 'verbose';
    quirks: string[]; // unique speech habits
  };
}

const generateDialogueResponse = (npc: NPC, playerInput: string, context: ConversationContext): string => {
  // Use NPC personality to tailor response
  // Consider relationship level with player
  // Reference relevant memories
  // Apply speech patterns and quirks
};
```

### Dialogue System
```typescript
interface DialogueOption {
  id: string;
  text: string;
  conditions?: DialogueCondition[];
  effects?: DialogueEffect[];
  unlocks?: string[]; // IDs of options this unlocks
  oneTimeOnly?: boolean;
}

interface ConversationState {
  currentTopic: string;
  availableOptions: DialogueOption[];
  completedOptions: string[];
  relationshipModifier: number;
}

'talk <npc>': async (npcName: string) => {
  // Find NPC in current room
  // Load conversation state and memory
  // Generate contextual dialogue options
  // Present conversation interface
};

'say <response>': async (responseNumber: number) => {
  // Process player's dialogue choice
  // Update NPC memory and relationship
  // Generate NPC response
  // Update conversation state
};
```

### Memory System
```typescript
const addNPCMemory = (npc: NPC, character: Character, memoryType: string, content: string, importance: number) => {
  // Store memory with timestamp
  // Categorize by type (conversation, action, quest, reputation)
  // Weight by importance level
  // Limit total memories per NPC (keep most important)
};

const getRelevantMemories = (npc: NPC, character: Character, context: string): NPCMemory[] => {
  // Retrieve memories relevant to current context
  // Sort by importance and recency
  // Filter by memory type if specified
  // Return most relevant memories for dialogue generation
};
```

### NPC Interaction Commands
```typescript
'look <npc>': async (npcName: string) => {
  // Show detailed NPC description
  // Include current mood/state
  // Show relationship status
};

'talk <npc>': async (npcName: string) => {
  // Initiate conversation
  // Show greeting based on relationship
  // Present dialogue options
};

'give <item> to <npc>': async (itemName: string, npcName: string) => {
  // Transfer item to NPC
  // Generate reaction based on personality
  // Update relationship
  // Possibly trigger quest or dialogue
};
```

### Implementation Areas
- **NPC Service**: Manage NPC generation, state, and behavior
- **Dialogue System**: Conversation trees and option processing
- **Memory Service**: Store and retrieve NPC memories
- **AI Integration**: Generate contextual NPCs and dialogue
- **Relationship System**: Track player standing with each NPC

## Related

- Dependencies: Region System, AI Integration, Character System
- Enables: Quest System, Trading System, Social gameplay
- Integration: Room system for NPC placement, Reputation tracking
- Future: NPC movement, complex relationships, faction allegiances
- References: `specs/rpg-systems-comprehensive.md` NPC Interactions section