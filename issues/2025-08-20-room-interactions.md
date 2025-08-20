# Enhanced Room Interactions

**Date**: 2025-08-20  
**Status**: Open  
**Priority**: Medium  
**Category**: Feature  

## Description

Implement enhanced room interaction system that allows players to examine objects, search for hidden items, interact with environmental elements, and discover secrets through detailed exploration commands.

## Details

**What is the requirement?**
Create an enhanced interaction system with the following features:

- **Detailed Examination**: `examine <object>` to get detailed descriptions
- **Search Functionality**: Find hidden items, secret passages, and clues
- **Interactive Objects**: Touch, pull, push, and activate room elements
- **Hidden Discoveries**: Secret doors, concealed treasures, and environmental puzzles
- **Contextual Actions**: Room-specific interaction options
- **Investigation Mechanics**: Skill-based discovery with success/failure outcomes
- **Environmental Storytelling**: Rich descriptions and atmospheric details

**Acceptance criteria:**
- [ ] `examine <object>` command for detailed object inspection
- [ ] `search [location]` command to find hidden items and secrets
- [ ] Interactive object system with touch, pull, push actions
- [ ] Hidden element discovery with skill checks
- [ ] Room-specific interaction menus and options
- [ ] Environmental clues and atmospheric storytelling
- [ ] Integration with existing room generation system
- [ ] Persistence of discovered secrets and interactions

## Technical Notes

### Room Interaction Data Structure
```typescript
interface RoomInteraction {
  id: string;
  roomId: number;
  objectName: string;
  interactionType: 'examine' | 'search' | 'touch' | 'pull' | 'push' | 'activate';
  description: string;
  hiddenUntilDiscovered: boolean;
  requiredSkill?: string;
  skillDifficulty?: number;
  discoveryRewards?: DiscoveryReward[];
  prerequisites?: string[]; // Other interactions that must be done first
}

interface DiscoveryReward {
  type: 'item' | 'gold' | 'experience' | 'passage' | 'information';
  value: string | number;
  description: string;
}

interface ExaminableObject {
  name: string;
  shortDescription: string;
  detailedDescription: string;
  keywords: string[];
  isInteractive: boolean;
  interactions: RoomInteraction[];
}
```

### Database Schema Extensions
```sql
CREATE TABLE room_objects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  object_name TEXT NOT NULL,
  short_description TEXT NOT NULL,
  detailed_description TEXT NOT NULL,
  keywords TEXT, -- JSON array of searchable terms
  is_visible BOOLEAN DEFAULT TRUE,
  is_interactive BOOLEAN DEFAULT FALSE,
  object_type TEXT DEFAULT 'decoration', -- decoration, furniture, mechanism, treasure
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE TABLE room_interactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  object_id INTEGER,
  interaction_name TEXT NOT NULL,
  interaction_type TEXT NOT NULL,
  description TEXT NOT NULL,
  success_message TEXT,
  failure_message TEXT,
  skill_required TEXT, -- perception, strength, intelligence, etc.
  difficulty_class INTEGER DEFAULT 10,
  is_hidden BOOLEAN DEFAULT FALSE,
  is_repeatable BOOLEAN DEFAULT TRUE,
  reward_data TEXT, -- JSON data for rewards
  prerequisites TEXT, -- JSON array of required interactions
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (object_id) REFERENCES room_objects(id) ON DELETE CASCADE
);

CREATE TABLE character_discoveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id INTEGER NOT NULL,
  room_id INTEGER NOT NULL,
  interaction_id INTEGER NOT NULL,
  discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (interaction_id) REFERENCES room_interactions(id) ON DELETE CASCADE,
  UNIQUE(character_id, interaction_id)
);
```

### Interaction Commands Implementation
```typescript
'examine <object>': async (objectName: string) => {
  const currentRoom = getCurrentRoom(character);
  const object = findObjectInRoom(currentRoom.id, objectName);
  
  if (!object) {
    const suggestions = getSimilarObjectNames(currentRoom.id, objectName);
    if (suggestions.length > 0) {
      display(`I don't see a ${objectName} here. Did you mean: ${suggestions.join(', ')}?`, MessageType.ERROR);
    } else {
      display(`I don't see a ${objectName} here.`, MessageType.ERROR);
    }
    return;
  }
  
  // Show detailed description
  display(object.detailed_description, MessageType.NORMAL);
  
  // Reveal any hidden interactions based on examination
  await revealHiddenInteractions(character, object);
  
  // Show available interactions
  const interactions = getAvailableInteractions(character, object);
  if (interactions.length > 0) {
    display('You notice you could:', MessageType.SYSTEM);
    interactions.forEach(interaction => {
      display(`  ${interaction.interaction_type} ${object.object_name}`, MessageType.NORMAL);
    });
  }
};

'search [location]': async (location?: string) => {
  const currentRoom = getCurrentRoom(character);
  let searchTarget = location || 'room';
  
  display(`You search ${searchTarget === 'room' ? 'the area' : searchTarget} carefully...`, MessageType.NORMAL);
  
  // Skill check for search success
  const perceptionCheck = rollSkillCheck(character, 'perception', 15);
  
  if (perceptionCheck.success) {
    const discoveries = await findHiddenElements(character, currentRoom.id, searchTarget);
    
    if (discoveries.length > 0) {
      display('Your search reveals:', MessageType.SYSTEM);
      for (const discovery of discoveries) {
        display(`• ${discovery.description}`, MessageType.NORMAL);
        await applyDiscoveryReward(character, discovery);
      }
    } else {
      display('You find nothing of interest.', MessageType.NORMAL);
    }
  } else {
    display('Your search turns up nothing unusual.', MessageType.NORMAL);
  }
};

'touch <object>': async (objectName: string) => {
  await executeInteraction(character, objectName, 'touch');
};

'pull <object>': async (objectName: string) => {
  await executeInteraction(character, objectName, 'pull');
};

'push <object>': async (objectName: string) => {
  await executeInteraction(character, objectName, 'push');
};

'interact': async () => {
  // Show all interactive elements in current room
  const currentRoom = getCurrentRoom(character);
  const interactiveObjects = getInteractiveObjects(currentRoom.id);
  
  if (interactiveObjects.length === 0) {
    display('There is nothing interactive in this room.', MessageType.NORMAL);
    return;
  }
  
  display('Interactive elements in this room:', MessageType.SYSTEM);
  interactiveObjects.forEach(obj => {
    const actions = getAvailableActions(character, obj);
    display(`${obj.object_name} - ${actions.join(', ')}`, MessageType.NORMAL);
  });
};
```

### Interaction Execution System
```typescript
const executeInteraction = async (
  character: Character, 
  objectName: string, 
  interactionType: string
): Promise<void> => {
  const currentRoom = getCurrentRoom(character);
  const object = findObjectInRoom(currentRoom.id, objectName);
  
  if (!object) {
    display(`There is no ${objectName} here.`, MessageType.ERROR);
    return;
  }
  
  const interaction = findInteraction(object, interactionType);
  if (!interaction) {
    display(`You can't ${interactionType} the ${objectName}.`, MessageType.ERROR);
    return;
  }
  
  // Check if already discovered (for non-repeatable interactions)
  if (!interaction.is_repeatable && hasDiscovered(character, interaction.id)) {
    display(`You've already ${interactionType}ed the ${objectName}.`, MessageType.NORMAL);
    return;
  }
  
  // Check prerequisites
  if (!checkPrerequisites(character, interaction)) {
    display(interaction.failure_message || `Nothing happens when you ${interactionType} the ${objectName}.`, MessageType.NORMAL);
    return;
  }
  
  // Skill check if required
  if (interaction.skill_required) {
    const skillCheck = rollSkillCheck(character, interaction.skill_required, interaction.difficulty_class);
    
    if (!skillCheck.success) {
      display(interaction.failure_message || `Your attempt to ${interactionType} the ${objectName} fails.`, MessageType.NORMAL);
      return;
    }
  }
  
  // Execute successful interaction
  display(interaction.success_message || interaction.description, MessageType.NORMAL);
  
  // Apply rewards
  if (interaction.reward_data) {
    const rewards = JSON.parse(interaction.reward_data);
    for (const reward of rewards) {
      await applyInteractionReward(character, reward);
    }
  }
  
  // Mark as discovered
  await markInteractionDiscovered(character.id, interaction.id);
};

const rollSkillCheck = (character: Character, skill: string, dc: number): {success: boolean, roll: number} => {
  const baseRoll = Math.floor(Math.random() * 20) + 1;
  const skillBonus = getSkillBonus(character, skill);
  const total = baseRoll + skillBonus;
  
  return {
    success: total >= dc,
    roll: total
  };
};

const getSkillBonus = (character: Character, skill: string): number => {
  const skillMap = {
    'perception': 'wisdom',
    'strength': 'strength',
    'intelligence': 'intelligence',
    'investigation': 'intelligence',
    'athletics': 'strength'
  };
  
  const attribute = skillMap[skill] || 'wisdom';
  const attributeValue = character[attribute] || 10;
  const modifier = Math.floor((attributeValue - 10) / 2);
  
  return modifier;
};
```

### Dynamic Room Object Generation
```typescript
interface RoomObjectTemplate {
  objectType: string;
  probability: number;
  possibleInteractions: InteractionTemplate[];
}

const ROOM_OBJECT_TEMPLATES = {
  library: [
    {
      objectType: 'bookshelf',
      probability: 0.8,
      possibleInteractions: [
        { type: 'examine', reveals: 'hidden_book', probability: 0.3 },
        { type: 'search', skill: 'perception', dc: 12, reward: 'spell_scroll' }
      ]
    },
    {
      objectType: 'reading_desk',
      probability: 0.6,
      possibleInteractions: [
        { type: 'examine', reveals: 'notes' },
        { type: 'search', skill: 'investigation', dc: 15, reward: 'secret_compartment' }
      ]
    }
  ],
  dungeon: [
    {
      objectType: 'stone_altar',
      probability: 0.4,
      possibleInteractions: [
        { type: 'examine', reveals: 'ancient_runes' },
        { type: 'touch', skill: 'intelligence', dc: 14, reward: 'magical_effect' }
      ]
    },
    {
      objectType: 'torture_device',
      probability: 0.3,
      possibleInteractions: [
        { type: 'examine', reveals: 'hidden_key' },
        { type: 'search', skill: 'perception', dc: 13, reward: 'treasure' }
      ]
    }
  ]
};

const generateRoomObjects = async (room: Room): Promise<void> => {
  const templates = ROOM_OBJECT_TEMPLATES[room.region_type] || [];
  
  for (const template of templates) {
    if (Math.random() < template.probability) {
      const object = await createRoomObject(room.id, template);
      await generateInteractions(object, template.possibleInteractions);
    }
  }
};
```

### Integration with AI Generation
```typescript
const generateContextualInteractions = async (room: Room): Promise<RoomInteraction[]> => {
  const prompt = `Generate 2-3 interactive elements for this room:
Room: ${room.name}
Description: ${room.description}
Region: ${room.region_type}

For each interactive element, provide:
1. Object name
2. What the player can do with it (examine, search, touch, pull, push)
3. What they might discover (items, secrets, information)
4. Required skill and difficulty (if any)

Make interactions feel natural and fit the room's atmosphere.`;

  try {
    const response = await this.grokClient.generateContent(prompt);
    return parseInteractionResponse(response, room.id);
  } catch (error) {
    return generateFallbackInteractions(room);
  }
};

const parseInteractionResponse = (response: string, roomId: number): RoomInteraction[] => {
  // Parse AI response and convert to RoomInteraction objects
  // Implementation depends on AI response format
};
```

### Implementation Areas
- **Object Management**: Create and manage interactive room objects
- **Interaction System**: Handle all interaction types and outcomes
- **Discovery Mechanics**: Skill-based hidden element revelation
- **Reward System**: Apply discovery rewards (items, information, passages)
- **AI Integration**: Generate contextual interactions for rooms

## Related

- Dependencies: Room System, Character Attributes (for skill checks)
- Integration: Item System (discovery rewards), Quest System (hidden clues)
- Enables: Deeper exploration, environmental storytelling, hidden content
- Future: Complex puzzles, multi-step interactions, room-specific mechanics
- References: Current room descriptions in Room Generation Service