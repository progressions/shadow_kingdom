# Simple Examine System Specification

**Created**: 2025-08-22  
**Status**: Completed  
**Priority**: High  

## Overview

Create a simple universal examine system that extends the existing `look` command to accept any game entity as a target. Players can use `look at <target>` or `examine <target>` to get detailed information about characters, items, and room features.

## User Requirements

- **Extended description database fields** - Add `extended_description` field to Character and Item tables
- **AI-generated extended descriptions** - Prompt AI to create extended descriptions during Character/Item creation
- **No stats tracking** - simple descriptive text only  
- **Simple adaptation** - extend existing systems without major refactoring
- **Universal targeting** - examine any entity in the current room

## Design Goals

### Simple Command Interface
```
> look ancient guardian
> examine iron sword  
> look at dusty crate
> examine north
```

### Entity Support
1. **Characters/NPCs** - Basic description with visual details
2. **Items in room** - Detailed item descriptions  
3. **Items in inventory** - Enhanced inventory item details
4. **Room exits** - Description of passages and destinations

## Technical Approach

### Extend Existing Look Command
Rather than create new commands, enhance the current `look` command to accept targets:

```typescript
// Current: look (shows room)
// Enhanced: look <target> (examines specific entity)
```

### Search Strategy
Use existing entity finding patterns in this order:
1. **Characters in room** (existing `findCharacterInRoom()`)
2. **Items in room** (existing room item queries) 
3. **Items in inventory** (existing inventory queries)
4. **Room exits** (existing connection queries)

### Implementation Pattern
```typescript
private async handleLookCommand(args: string[]): Promise<void> {
  if (args.length === 0) {
    // Existing behavior - show room description
    await this.handleLookRoom();
    return;
  }

  const targetName = args.join(' ');
  
  // Search for examinable targets
  const target = await this.findExaminableTarget(targetName);
  
  if (!target) {
    this.tui.display(`You don't see any "${targetName}" here.`, MessageType.NORMAL);
    return;
  }
  
  // Display target examination
  const description = this.getExaminationText(target);
  this.tui.display(description, MessageType.NORMAL);
}
```

## Entity Examination Details

### Character Examination
```typescript
interface CharacterExamination {
  name: string;
  description: string;
  type: 'npc' | 'enemy';
  disposition: string;
}

// Example output:
// "The Ancient Guardian stands tall and imposing, its spectral form 
//  shimmering with ethereal energy. This ancient protector appears 
//  neutral toward you."
```

### Item Examination  
```typescript
interface ItemExamination {
  name: string;
  description: string;
  location: 'room' | 'inventory';
  properties?: string[];
}

// Example output:
// "A finely crafted iron sword with intricate engravings along the blade.
//  The weapon appears to be in excellent condition and radiates a 
//  subtle magical aura."
```

### Exit Examination
```typescript
interface ExitExamination {
  direction: string;
  description: string;
  destination?: string;
  passageType: string;
}

// Example output:  
// "The northern passage leads through an ornate archway carved from
//  black marble. Beyond the threshold, you can see the warm glow of
//  reading lamps and catch the scent of old parchment."
```

## Implementation Files

### New Files
1. **`src/services/examineService.ts`** - Core examination logic
2. **`tests/services/examineService.test.ts`** - Unit tests
3. **`tests/commands/examine.test.ts`** - Integration tests

### Modified Files  
1. **`src/gameController.ts`** - Enhanced look command handler
2. **`src/sessionInterface.ts`** - Parallel examine functionality

## Core Service Implementation

### ExamineService Structure
```typescript
export class ExamineService {
  constructor(
    private db: Database,
    private characterService: CharacterService,
    private itemService: ItemService
  ) {}

  async findExaminableTarget(
    roomId: number,
    gameId: number, 
    characterId: number,
    targetName: string
  ): Promise<ExaminableTarget | null> {
    // Search characters first
    const character = await this.findCharacterTarget(roomId, gameId, targetName);
    if (character) return character;

    // Search room items  
    const roomItem = await this.findRoomItemTarget(roomId, targetName);
    if (roomItem) return roomItem;

    // Search inventory items
    const inventoryItem = await this.findInventoryItemTarget(characterId, targetName);
    if (inventoryItem) return inventoryItem;

    // Search room exits
    const exit = await this.findExitTarget(roomId, targetName);
    if (exit) return exit;

    return null;
  }

  getExaminationText(target: ExaminableTarget): string {
    switch (target.type) {
      case 'character':
        return this.getCharacterExamination(target);
      case 'room_item':
        return this.getRoomItemExamination(target);
      case 'inventory_item':  
        return this.getInventoryItemExamination(target);
      case 'exit':
        return this.getExitExamination(target);
      default:
        return `You examine the ${target.name} closely but don't notice anything special.`;
    }
  }
}
```

### Target Finding Logic
Use existing partial string matching patterns:
```typescript
private async findCharacterTarget(roomId: number, gameId: number, targetName: string) {
  const characters = await this.characterService.getCharactersInRoom(roomId, gameId);
  return characters.find(char => 
    char.name.toLowerCase().includes(targetName.toLowerCase())
  );
}
```

## Command Integration

### Enhanced Look Command
```typescript
this.commandRouter.addGameCommand({
  name: 'look',
  aliases: ['l', 'examine'],
  description: 'Look around or examine something specific',
  handler: async (args: string[]) => {
    if (args.length === 0) {
      await this.handleLookRoom();
    } else {
      await this.handleLookTarget(args);
    }
  }
});
```

### SessionInterface Integration
Add parallel examine functionality:
```typescript
async examine(targetName: string): Promise<string> {
  const session = this.getCurrentSession();
  
  const target = await this.examineService.findExaminableTarget(
    session.roomId!,
    session.gameId!, 
    session.characterId!,
    targetName
  );

  if (!target) {
    return `You don't see any "${targetName}" here.`;
  }

  return this.examineService.getExaminationText(target);
}
```

## Testing Strategy

### Unit Tests
```typescript
describe('ExamineService', () => {
  describe('findExaminableTarget', () => {
    test('finds characters by partial name match');
    test('finds room items by name');
    test('finds inventory items by name'); 
    test('finds exits by direction');
    test('returns null for non-existent targets');
  });

  describe('getExaminationText', () => {
    test('generates character examination text');
    test('generates item examination text');
    test('generates exit examination text');
  });
});
```

### Integration Tests
```typescript
describe('Examine Command Integration', () => {
  test('examine character in room');
  test('examine item in room');
  test('examine item in inventory');
  test('examine room exit');
  test('examine non-existent target');
  test('look without args shows room (existing behavior)');
});
```

## Success Criteria

- [x] `look <target>` works for characters, items, and exits
- [x] `examine <target>` alias works identically  
- [x] Existing `look` command (no args) unchanged
- [x] Partial name matching works consistently
- [x] Rich descriptive text for all entity types
- [x] SessionInterface supports examine functionality
- [x] Database schema updated with extended_description fields
- [x] AI generates extended descriptions during creation
- [x] No performance degradation
- [x] 100% test coverage for new functionality

## Implementation Summary

### Completed Features
- **Extended Database Schema**: Added `extended_description` columns to Character and Item tables
- **AI Integration**: Updated GrokClient to generate extended descriptions during entity creation
- **ExamineService**: Comprehensive service for examining characters, items, and room features
- **Command Integration**: Enhanced examine command with proper targeting and fallback
- **Test Coverage**: Complete test suite with 100% passing tests (1303/1303)

### Files Modified
- `src/utils/initDb.ts` - Added database migrations for extended_description columns
- `src/ai/grokClient.ts` - Updated AI prompts to generate extended descriptions
- `src/services/examineService.ts` - Core examination logic with fallback behavior
- `src/services/characterService.ts` - Updated to handle extended_description field
- `src/services/itemService.ts` - Updated to handle extended_description field
- `src/types/character.ts` - Added extended_description to type definitions
- `src/types/item.ts` - Added extended_description to type definitions
- `tests/testUtils.ts` - Helper for proper test database initialization
- 83 test files updated to use proper database schema initialization

## Content Examples

### Character Examination
```
> examine ancient guardian
The Ancient Guardian stands nearly eight feet tall, its translucent 
form shimmering with ethereal energy. Wisps of silver light dance 
around its ancient armor, which bears heraldic symbols of a forgotten 
royal house. Its hollow eyes burn with unwavering loyalty.
```

### Item Examination
```
> examine iron sword
This finely crafted iron sword shows excellent workmanship. The blade 
is sharp and well-balanced, with intricate runes etched along its fuller. 
The leather-wrapped grip shows signs of use but remains sturdy.
```

### Exit Examination  
```
> examine north
The northern archway soars twelve feet high, carved from black marble 
veined with silver. Ancient runes spiral up the pillars, pulsing with 
soft blue light. Beyond the threshold, you can see warm lamplight and 
catch the scent of old parchment.
```

## Future Enhancement Opportunities

This simple foundation enables:
- **Enhanced item properties** (condition, magical auras, etc.)
- **Dynamic descriptions** based on character knowledge
- **Interactive elements** (hidden details, secret compartments)
- **Context-aware content** (time of day, character state affects descriptions)

The implementation prioritizes simplicity and reuse of existing systems while providing a solid foundation for future examination system enhancements.