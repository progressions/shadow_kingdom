# AI Character Generation in Rooms

**Date**: 2025-08-21  
**Status**: ✅ COMPLETED  
**Priority**: Medium  
**Category**: Feature  

## Description

Extend the AI room generation system to include characters (NPCs and enemies) alongside the existing item generation. Currently, the AI generates items when creating rooms, but it should also be able to create contextually appropriate characters that inhabit those rooms.

## Details

**What is the requirement?**
Enhance the AI room generation prompts and processing to include character creation:

- **Room-Integrated Characters**: AI can generate NPCs/enemies when creating rooms
- **Contextual Appropriateness**: Characters match the room's theme and region type
- **Character Types**: Support for friendly NPCs, neutral characters, and enemies
- **Automatic Character Creation**: Characters are automatically added to rooms during generation
- **Environmental Configuration**: Toggle character generation on/off like item generation

**Acceptance criteria:**
- [ ] Extend GeneratedRoom interface to include optional characters array
- [ ] Update AI prompts to request character generation alongside items
- [ ] Modify room generation service to process and create characters
- [ ] Add environment variable AI_CHARACTER_GENERATION_ENABLED (default: true)
- [ ] Characters generated with appropriate attributes based on region/theme
- [ ] Support for both NPC and enemy character types in rooms
- [ ] Integration with existing CharacterService for character creation
- [ ] Mock AI engine support for character generation testing
- [ ] Clear logging when characters are generated vs skipped

## Technical Notes

### Interface Extensions

```typescript
export interface GeneratedRoom {
  name: string;
  description: string;
  connections?: {
    direction: string;
    name: string;
  }[];
  items?: {
    name: string;
    description: string;
    isFixed: boolean;
  }[];
  characters?: GeneratedCharacter[]; // NEW
}

export interface GeneratedCharacter {
  name: string;
  description: string;
  type: 'npc' | 'enemy';           // Character type for database
  personality?: string;             // NPC personality/behavior
  level?: number;                   // Enemy level/difficulty
  attributes?: {                    // Optional custom attributes
    strength?: number;
    dexterity?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;
  };
  initialDialogue?: string;         // First thing NPC says
  isHostile?: boolean;             // Whether enemy attacks on sight
}
```

### AI Prompt Enhancement

Current room generation prompts should be extended:

```
Generate a fantasy room with the following requirements:
- Room name and atmospheric description
- Connections to other areas (if any)
- Items that would realistically be found here
- Characters (NPCs or enemies) that would inhabit this space  // NEW

For characters, consider:
- Who would realistically be in this type of room?
- Are they friendly, neutral, or hostile?
- What would their role or purpose be?
- What would they say when first encountered?

Return as JSON with: name, description, connections, items, characters
```

### Room Generation Service Integration

```typescript
// In RoomGenerationService.createRoom()
if (newRoom.characters && newRoom.characters.length > 0) {
  await this.createCharactersFromGeneration(savedRoom.id, newRoom.characters);
}

private async createCharactersFromGeneration(
  roomId: number, 
  characters: GeneratedCharacter[]
): Promise<void> {
  for (const charData of characters) {
    // Create character with appropriate type and attributes
    const character = await this.characterService.createCharacter({
      game_id: this.gameId,
      name: charData.name,
      description: charData.description,
      type: charData.type,
      current_room_id: roomId,
      // Set attributes or use defaults
      strength: charData.attributes?.strength || 10,
      dexterity: charData.attributes?.dexterity || 10,
      // ... other attributes
    });
    
    if (process.env.AI_DEBUG_LOGGING === 'true') {
      console.log(`Generated ${charData.type}: ${charData.name} in room ${roomId}`);
    }
  }
}
```

### Environment Configuration

```bash
# Enable/disable character generation (default: true)
AI_CHARACTER_GENERATION_ENABLED=true

# Control character generation rate (0.0-1.0, default: 0.3)
AI_CHARACTER_GENERATION_RATE=0.3

# Maximum characters per room (default: 2)
MAX_CHARACTERS_PER_ROOM=2
```

### Mock AI Engine Support

```typescript
// In MockAIEngine.generateRoom()
private generateRoomCharacters(
  room: MockRoom, 
  themeProfile: ThemeProfile
): GeneratedCharacter[] {
  const characters: GeneratedCharacter[] = [];
  
  // Skip character generation if disabled
  if (process.env.AI_CHARACTER_GENERATION_ENABLED === 'false') {
    return characters;
  }
  
  const generationRate = parseFloat(process.env.AI_CHARACTER_GENERATION_RATE || '0.3');
  if (Math.random() > generationRate) {
    return characters;
  }
  
  // Generate thematically appropriate characters
  if (themeProfile.mystical > 0.6) {
    characters.push({
      name: "Ancient Sage",
      description: "A wise figure emanating mystical energy",
      type: "npc",
      personality: "Cryptic and knowledgeable",
      initialDialogue: "The paths of fate have brought you here..."
    });
  }
  // ... more character types based on themes
  
  return characters;
}
```

### Integration Points

1. **Room Generation**: Modify room generation to include character creation
2. **Character Service**: Use existing CharacterService for character CRUD
3. **Mock Content**: Add mock character data for different themes/regions
4. **Testing**: Ensure character generation works with both real AI and mock mode
5. **Region Appropriateness**: Characters should match region themes (mansion ghosts, forest creatures, cave monsters)

### Example Generated Content

**Mystical Library Room:**
```json
{
  "name": "Arcane Study",
  "description": "Ancient tomes line the walls of this circular chamber...",
  "items": [
    {"name": "Glowing Orb", "description": "A crystal orb pulsing with inner light", "isFixed": true}
  ],
  "characters": [
    {
      "name": "Librarian Sage",
      "description": "An elderly figure in star-covered robes tends to the books",
      "type": "npc",
      "personality": "Scholarly and helpful",
      "initialDialogue": "Ah, a seeker of knowledge! These tomes contain many secrets...",
      "attributes": {"intelligence": 16, "wisdom": 14}
    }
  ]
}
```

**Dungeon Chamber Room:**
```json
{
  "name": "Guard Post",
  "description": "A stone chamber with weapon racks and a smoldering brazier...",
  "items": [
    {"name": "Iron Spear", "description": "A well-maintained weapon", "isFixed": false}
  ],
  "characters": [
    {
      "name": "Dungeon Guard",
      "description": "A heavily armored warrior blocks the passage",
      "type": "enemy",
      "level": 2,
      "isHostile": true,
      "attributes": {"strength": 14, "constitution": 13}
    }
  ]
}
```

## Implementation Strategy

### Phase 1: Core Integration
- Extend GeneratedRoom interface with characters array
- Modify room generation service to process characters
- Add environment variable controls

### Phase 2: AI Prompt Enhancement  
- Update real AI prompts to request characters
- Enhance mock AI engine with character generation
- Add character generation rate controls

### Phase 3: Character Variety
- Add different character types for each region theme
- Implement character attribute generation
- Add personality and dialogue variations

### Phase 4: Advanced Features
- Character interaction systems
- Level-appropriate enemy generation
- Complex character relationships

## Related

- Dependencies: Character Attributes System ✅, CharacterService ✅
- Enhances: Room Generation System, AI Integration
- Enables: Dynamic NPC encounters, Enemy encounters during exploration
- Future: NPC System, Enemy System, Quest System
- Related Issues: Enemy System, NPC System, Turn-based Combat

## Notes

- Character generation should be optional and configurable
- Generated characters should use the existing character database schema
- Integration with existing CharacterService ensures consistency
- Mock mode support ensures testing without AI API calls
- Characters should be contextually appropriate to their rooms and regions
- Foundation for rich, populated game world with interactive characters