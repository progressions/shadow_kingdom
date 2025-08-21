# Universal Examine System for All Game Entities

**Created**: 2025-08-21  
**Priority**: High  
**Category**: Game Mechanics / User Experience  
**Estimated Effort**: 6-8 hours  

## Problem Summary

The game currently lacks a **universal examine system** that allows players to get detailed information about any entity they encounter. Players should be able to use `look at <target>` or `examine <target>` commands on **every interactive element** in the game world for rich, immersive gameplay.

## Current State Analysis

### What Can Be Examined (Limited)
- **Items in inventory**: Basic item properties
- **Rooms**: Full descriptions via `look` command
- **Some items in rooms**: Limited to pickup/drop interactions

### What Cannot Be Examined (Missing)
- **Characters/NPCs**: No way to get detailed character information
- **Enemies**: Cannot examine before combat to assess threat
- **Room exits**: Cannot examine connections for additional description
- **Environmental features**: Room descriptions mention objects that can't be examined
- **Equipment on characters**: Cannot examine what others are wearing
- **Status effects**: No way to examine active effects on characters

## Design Vision

### Universal Examine Interface
Every entity in the game should implement an **IExaminable** interface:

```typescript
interface IExaminable {
  getExamineText(): string;
  getDetailedDescription(): string;
  getExamineProperties(): ExamineProperty[];
  canBeExamined(): boolean;
}

interface ExamineProperty {
  name: string;
  value: string;
  category: 'physical' | 'magical' | 'mechanical' | 'social';
}
```

### Examine Command Examples

**Characters:**
```
> examine ancient guardian
You study the Ancient Guardian closely.

The spectral figure stands nearly eight feet tall, its translucent form shimmering 
with ethereal energy. Wisps of silver light dance around its ancient armor, which 
bears the heraldic symbols of a long-forgotten royal house. Its hollow eyes burn 
with unwavering loyalty, and you sense an aura of protective magic surrounding it.

Type: NPC (Non-hostile)
Level: 15
Health: Full
Disposition: Neutral
Notable: Immune to physical attacks
```

**Items:**
```
> examine dusty crate
You inspect the dusty crate carefully.

This weathered wooden crate shows signs of age and travel. Iron bands reinforce 
the corners, and a complex lock mechanism suggests it once held valuable contents. 
Strange symbols are carved into the lid, still faintly glowing with residual magic.

Type: Container (Fixed)
Weight: 999 lbs
Condition: Weathered
Lock: Magical (Requires Ancient Key)
Contents: Unknown
```

**Room Exits:**
```
> examine north exit
You study the ornate archway to the north.

The archway soars twelve feet high, carved from black marble veined with silver. 
Ancient runes spiral up the pillars, pulsing with a soft blue light that seems 
to beckon travelers forward. Beyond the threshold, you can see the warm glow of 
reading lamps and catch the scent of old parchment.

Leads to: Scholar's Library
Difficulty: Open passage
Atmosphere: Scholarly, mysterious
Recent activity: Footprints in the dust suggest recent passage
```

## Implementation Strategy

### Phase 1: Core Examine System (2 hours)

#### 1.1 Create Universal Examine Interface
```typescript
// src/types/examinable.ts
export interface IExaminable {
  id: string;
  type: ExaminableType;
  getExamineText(): string;
  getDetailedDescription(): string;
  getExamineProperties(): ExamineProperty[];
  canBeExamined(): boolean;
}

export enum ExaminableType {
  CHARACTER = 'character',
  ITEM = 'item', 
  EXIT = 'exit',
  ENVIRONMENTAL = 'environmental'
}
```

#### 1.2 Create Examine Service
```typescript
// src/services/examineService.ts
export class ExamineService {
  async findExaminableTarget(
    roomId: number, 
    gameId: number, 
    targetName: string
  ): Promise<IExaminable | null> {
    // Search characters, items, exits, environmental features
    // Return first matching examinable object
  }

  async examineTarget(target: IExaminable): Promise<string> {
    // Generate full examine text with properties
  }
}
```

#### 1.3 Add Examine Commands
```typescript
// Add to both GameController and SessionInterface
commandRouter.addGameCommand({
  name: 'examine',
  aliases: ['look at', 'inspect'],
  description: 'Examine something in detail',
  handler: async (args: string[]) => {
    if (args.length === 0) {
      this.tui.display('Examine what?', MessageType.SYSTEM);
      return;
    }
    
    const targetName = args.join(' ');
    const target = await this.examineService.findExaminableTarget(
      this.gameStateManager.getCurrentSession().roomId!,
      this.gameStateManager.getCurrentSession().gameId!,
      targetName
    );
    
    if (!target) {
      this.tui.display(`You don't see any "${targetName}" here.`, MessageType.NORMAL);
      return;
    }
    
    const examineText = await this.examineService.examineTarget(target);
    this.tui.display(examineText, MessageType.NORMAL);
  }
});
```

### Phase 2: Character Examination (1.5 hours)

#### 2.1 Make Characters Examinable
```typescript
// src/types/character.ts
export interface Character extends IExaminable {
  // existing character properties...
  
  getExamineText(): string;
  getDetailedDescription(): string;
  getExamineProperties(): ExamineProperty[];
}
```

#### 2.2 Rich Character Descriptions
- **Physical appearance**: Generated based on character type/class
- **Equipment visible**: What they're wearing/carrying
- **Disposition**: Friendly, neutral, hostile indicators
- **Threat assessment**: Level relative to player
- **Special properties**: Magic auras, status effects

### Phase 3: Item Examination Enhancement (1.5 hours)

#### 3.1 Detailed Item Examination
- **Craftsmanship quality**: Examine condition and make
- **Magical properties**: Detect enchantments
- **Historical significance**: Lore and background
- **Practical assessment**: Weight, condition, value estimates

#### 3.2 Contextual Item Information
- **In inventory**: Full detailed stats
- **In room**: Visual description with hints about function
- **Equipped on others**: External appearance only

### Phase 4: Exit and Environmental Examination (2 hours)

#### 4.1 Examinable Exits
```typescript
// src/types/connection.ts
export interface Connection extends IExaminable {
  // existing connection properties...
  
  getExamineText(): string; // Detailed description of the passage
  getDestinationHints(): string; // What can be seen/heard/smelled
  getDifficultyAssessment(): string; // Any obvious challenges
}
```

#### 4.2 Environmental Features
Extract examinable objects from room descriptions:
- **Mentioned objects**: "marble fountain" → examinable fountain
- **Architectural features**: "vaulted ceiling" → detailed architecture
- **Atmospheric elements**: "flickering torches" → individual torch examination

### Phase 5: Dynamic Content Generation (1 hour)

#### 5.1 AI-Enhanced Descriptions
When rooms are AI-generated, extract examinable entities:
```typescript
interface GeneratedExaminables {
  environmental: EnvironmentalFeature[];
  hidden_details: HiddenDetail[];
  interactive_objects: InteractiveObject[];
}
```

#### 5.2 Fallback Content System
For non-AI generated content, provide rich fallback descriptions based on:
- **Entity type patterns**: "All stone pedestals have similar examine text"
- **Room theme context**: Library items get scholarly descriptions
- **Procedural generation**: Template-based descriptions with variation

## User Experience Benefits

### Immersion Enhancement
- **Rich world building**: Every element tells a story
- **Discovery rewards**: Hidden details for curious players
- **Environmental storytelling**: Objects reveal history and lore

### Gameplay Improvement
- **Strategic information**: Assess threats before engagement
- **Puzzle solving**: Examine objects for interaction clues
- **Character development**: Learn about NPCs before social interaction

### Accessibility
- **Clear feedback**: Always know what can be interacted with
- **Consistent interface**: Same command works for everything
- **Progressive disclosure**: Basic → detailed information levels

## Implementation Guidelines for New Features

### Design Rule: Everything Must Be Examinable
When adding **any new game entity**:

1. **Implement IExaminable**: Every entity must provide examine functionality
2. **Rich descriptions**: Minimum 2-3 sentences with sensory details
3. **Contextual properties**: Show relevant stats/information for entity type
4. **Update examine service**: Register new entity types in search logic

### Content Creation Standards
- **Sensory details**: What does it look/feel/smell/sound like?
- **Functional hints**: Suggest possible interactions without giving away solutions
- **World building**: Connect to larger game lore and atmosphere
- **Progressive revelation**: Basic examine → detailed study → hidden secrets

### Technical Requirements
- **Performance**: Examine lookups must be fast (< 100ms)
- **Flexibility**: Support aliasing (multiple names for same entity)
- **Extensibility**: Easy to add new examinable types
- **Consistency**: Same examine format across all entity types

## Testing Strategy

### Unit Tests
- Examine service target resolution
- All entity types implement IExaminable correctly
- Alias matching and fuzzy search
- Performance benchmarks for large rooms

### Integration Tests
- End-to-end examine commands in both TUI and session modes
- Character examination with various equipment states
- Item examination in different contexts (room vs inventory)
- Exit examination with various connection types

### User Experience Tests
- New player discoverability ("What can I examine?")
- Information progression (basic → detailed examination)
- Edge cases (examining non-existent targets)
- Command variations ("look at", "examine", "inspect")

## Success Criteria

- [ ] **All entity types** implement IExaminable interface
- [ ] **Every character** can be examined with rich descriptions
- [ ] **Every item** provides detailed examination text
- [ ] **Every room exit** can be examined for additional information
- [ ] **Environmental features** mentioned in room descriptions are examinable
- [ ] **Consistent examine format** across all entity types
- [ ] **Fast performance** (< 100ms examine lookups)
- [ ] **Comprehensive aliases** (multiple ways to refer to entities)
- [ ] **New entity guideline** documented for future development
- [ ] **Both interaction modes** (TUI and session) support full examine functionality

## Future Enhancements

### Advanced Examination
- **Skill-based information**: Higher perception reveals more details
- **Magical detection**: Sense enchantments and curses
- **Comparative analysis**: "This sword is sharper than your current weapon"
- **Dynamic updates**: Descriptions change based on character knowledge/experience

### Interactive Examination
- **Multi-step examination**: "examine closer", "examine underside"
- **Examination tools**: Magnifying glass, detect magic spells
- **Collaborative examination**: Multiple players can examine together
- **Examination history**: Remember what you've learned about entities

This universal examine system will transform the game from "what can I do?" to "what should I investigate next?" - creating a much more immersive and discoverable game world.