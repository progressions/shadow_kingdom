# Quest System

**Date**: 2025-08-20  
**Status**: Open  
**Priority**: Medium  
**Category**: Feature  

## Description

Implement a comprehensive quest system that provides structured objectives, meaningful progression, and engaging storylines through NPC interactions, exploration goals, and dynamic quest generation appropriate to each region.

## Details

**What is the requirement?**
Create a quest system with the following features:

- **Quest Types**: Fetch, delivery, combat, exploration, and puzzle quests
- **Dynamic Generation**: AI-generated quests appropriate to region and context
- **Quest Tracking**: Progress monitoring and objective completion
- **Reward System**: XP, items, currency, and reputation rewards
- **Quest Chains**: Multi-part quests with branching storylines
- **NPC Integration**: Quests given and completed through NPC interactions
- **Player Journal**: Quest log with descriptions and progress tracking

**Acceptance criteria:**
- [ ] Database schema for quest data and player progress
- [ ] AI generation of contextual quests for each region
- [ ] `quests` command to view active and completed quests
- [ ] Quest acceptance and completion through NPC dialogue
- [ ] Objective tracking and progress updates
- [ ] Reward distribution upon quest completion
- [ ] Quest journal with detailed descriptions and hints
- [ ] Integration with existing game systems (combat, exploration, items)

## Technical Notes

### Database Schema
```sql
CREATE TABLE quest_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  quest_type TEXT NOT NULL, -- fetch, delivery, combat, exploration, puzzle
  region_type TEXT, -- mansion, forest, cave, town, any
  objectives TEXT NOT NULL, -- JSON array of objectives
  rewards TEXT NOT NULL, -- JSON object with XP, items, gold, reputation
  prerequisites TEXT, -- JSON array of required quests or conditions
  level_requirement INTEGER DEFAULT 1,
  is_repeatable BOOLEAN DEFAULT FALSE,
  created_by_ai BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE character_quests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id INTEGER NOT NULL,
  quest_template_id INTEGER NOT NULL,
  giver_npc_id INTEGER,
  status TEXT DEFAULT 'active', -- active, completed, failed, abandoned
  current_objectives TEXT, -- JSON array tracking objective progress
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  FOREIGN KEY (quest_template_id) REFERENCES quest_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (giver_npc_id) REFERENCES npcs(id) ON DELETE SET NULL
);

CREATE TABLE quest_objectives (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quest_template_id INTEGER NOT NULL,
  objective_order INTEGER NOT NULL,
  objective_type TEXT NOT NULL, -- kill, collect, deliver, visit, interact
  description TEXT NOT NULL,
  target_type TEXT, -- enemy, item, npc, room, region
  target_identifier TEXT, -- specific target name or ID
  required_quantity INTEGER DEFAULT 1,
  is_optional BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (quest_template_id) REFERENCES quest_templates(id) ON DELETE CASCADE
);
```

### Quest Types and Generation
```typescript
enum QuestType {
  FETCH = 'fetch',           // Collect specific items
  DELIVERY = 'delivery',     // Transport items between NPCs
  COMBAT = 'combat',         // Defeat specific enemies
  EXPLORATION = 'exploration', // Visit specific locations
  PUZZLE = 'puzzle',         // Solve riddles or environmental puzzles
  SOCIAL = 'social',         // Interact with specific NPCs
  CHAIN = 'chain'            // Multi-part quest with multiple objectives
}

const QUEST_GENERATION_PROMPTS = {
  mansion: {
    fetch: "Generate a quest to find a lost family heirloom or important document in the mansion",
    delivery: "Create a quest to deliver a message or item between mansion residents or spirits",
    combat: "Design a quest to deal with hostile spirits or intruders in the mansion",
    exploration: "Create a quest to explore hidden areas or secret passages in the mansion"
  },
  forest: {
    fetch: "Generate a quest to gather rare herbs, fruits, or natural materials from the forest",
    delivery: "Create a quest to deliver supplies to hermits or rangers in the forest",
    combat: "Design a quest to eliminate dangerous beasts threatening forest travelers",
    exploration: "Create a quest to discover ancient groves or mystical forest locations"
  },
  cave: {
    fetch: "Generate a quest to mine specific ores or find precious gems in the caves",
    delivery: "Create a quest to deliver mining equipment or messages to cave dwellers",
    combat: "Design a quest to clear out dangerous cave creatures",
    exploration: "Create a quest to map unexplored cave passages or find lost miners"
  },
  town: {
    fetch: "Generate a quest to acquire goods or information needed by town merchants",
    delivery: "Create a quest to deliver goods or messages between town locations",
    combat: "Design a quest to deal with bandits or troublemakers near the town",
    exploration: "Create a quest to investigate mysterious activities in town areas"
  }
};
```

### Quest Objective System
```typescript
interface QuestObjective {
  id: string;
  type: ObjectiveType;
  description: string;
  target: string;
  currentProgress: number;
  requiredProgress: number;
  isCompleted: boolean;
  isOptional: boolean;
}

enum ObjectiveType {
  KILL_ENEMY = 'kill_enemy',
  COLLECT_ITEM = 'collect_item',
  DELIVER_ITEM = 'deliver_item',
  VISIT_LOCATION = 'visit_location',
  TALK_TO_NPC = 'talk_to_npc',
  SURVIVE_TIME = 'survive_time',
  REACH_LEVEL = 'reach_level'
}

const updateQuestProgress = (character: Character, action: GameAction) => {
  const activeQuests = getActiveQuests(character);
  
  activeQuests.forEach(quest => {
    quest.objectives.forEach(objective => {
      if (objective.isCompleted) return;
      
      switch (objective.type) {
        case ObjectiveType.KILL_ENEMY:
          if (action.type === 'enemy_defeated' && action.enemyType === objective.target) {
            objective.currentProgress++;
          }
          break;
        
        case ObjectiveType.COLLECT_ITEM:
          if (action.type === 'item_acquired' && action.itemName === objective.target) {
            objective.currentProgress += action.quantity;
          }
          break;
        
        case ObjectiveType.VISIT_LOCATION:
          if (action.type === 'room_entered' && action.roomName === objective.target) {
            objective.currentProgress = 1;
          }
          break;
      }
      
      if (objective.currentProgress >= objective.requiredProgress) {
        objective.isCompleted = true;
        notifyObjectiveCompleted(character, quest, objective);
      }
    });
    
    checkQuestCompletion(character, quest);
  });
};
```

### Quest Commands
```typescript
'quests': async () => {
  // Display active quests with progress
  // Show completed quests
  // Highlight available objectives
};

'quest <quest_name>': async (questName: string) => {
  // Show detailed quest information
  // Display all objectives and progress
  // Show rewards and NPC information
};

'abandon <quest_name>': async (questName: string) => {
  // Remove quest from active list
  // Confirm abandonment
  // Update NPC relationships if relevant
};

'journal': async () => {
  // Alias for quests command
  // Show quest log interface
};
```

### AI Quest Generation
```typescript
const generateQuest = async (region: Region, npc: NPC, playerLevel: number): Promise<QuestTemplate> => {
  const questType = selectAppropriateQuestType(region, npc, playerLevel);
  const prompt = `${QUEST_GENERATION_PROMPTS[region.type][questType]}
  
  Quest giver: ${npc.name} - ${npc.description}
  Player level: ${playerLevel}
  Region: ${region.description}
  
  Create a quest with:
  - Engaging title and description
  - Clear, achievable objectives appropriate for player level
  - Meaningful rewards (XP: ${playerLevel * 50-100}, items, gold)
  - Backstory explaining why this quest is needed
  - 2-4 specific objectives with clear completion criteria`;
  
  const aiResponse = await grokClient.generateQuest(prompt);
  return parseQuestFromAI(aiResponse, region, npc);
};
```

### Reward System
```typescript
interface QuestRewards {
  experiencePoints: number;
  goldPieces: number;
  items: RewardItem[];
  reputation: { [npcId: string]: number };
  unlocks: string[]; // Quest IDs or feature unlocks
}

const distributeQuestRewards = (character: Character, quest: QuestTemplate) => {
  const rewards = quest.rewards;
  
  // Award experience points
  character.addExperience(rewards.experiencePoints);
  
  // Award currency
  character.addGold(rewards.goldPieces);
  
  // Award items
  rewards.items.forEach(item => {
    character.addItemToInventory(item.id, item.quantity);
  });
  
  // Update reputation
  Object.entries(rewards.reputation).forEach(([npcId, change]) => {
    updateNPCRelationship(npcId, character.id, change);
  });
  
  // Display reward summary
  displayQuestCompletionSummary(character, quest, rewards);
};
```

### Implementation Areas
- **Quest Service**: Manage quest generation, tracking, and completion
- **Objective Tracking**: Monitor player actions against quest objectives
- **AI Integration**: Generate contextual quests for each region
- **Reward System**: Distribute XP, items, and reputation on completion
- **UI Integration**: Quest journal and progress display

## Related

- Dependencies: NPC System, Character System, AI Integration
- Enables: Structured gameplay progression, narrative content
- Integration: Combat System (kill quests), Item System (fetch/delivery)
- Future: Quest chains, dynamic events, player-created objectives
- References: `specs/rpg-systems-comprehensive.md` Progression and Quests section