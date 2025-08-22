# Character Individual Dialogue Responses Specification

**Date**: 2025-08-22  
**Status**: 🚧 PLANNING - Individual Character Dialogue Enhancement  
**Coverage**: Character dialogue system enhancement with unique responses

## Overview

This specification defines the enhancement of the existing simple character dialogue system to support individual dialogue responses for each character, replacing the universal "Lovely day." response with character-specific dialogue.

## Current State

The current dialogue system uses a fixed response for all characters:
- All characters respond with "Lovely day." when talked to
- No character-specific personality or dialogue differentiation
- Simple but lacks immersion and character personality

## Proposed Enhancement

### Core Requirement
Add a `dialogue_response` field to the Character object so each character can have their own unique response when talked to.

### Technical Implementation

#### 1. Database Schema Changes
**File**: `src/utils/initDb.ts`

Add migration to include `dialogue_response` column:
```sql
ALTER TABLE characters ADD COLUMN dialogue_response TEXT DEFAULT 'Lovely day.';
```

**Benefits**:
- Backward compatibility with default value
- Existing characters get fallback response
- New characters can have custom responses

#### 2. Type System Updates
**File**: `src/types/character.ts`

Update Character interface:
```typescript
export interface Character {
  // ... existing fields
  dialogue_response?: string | null;   // Custom dialogue response
}

export interface CreateCharacterData {
  // ... existing fields
  dialogue_response?: string;          // Custom dialogue response for new characters
}
```

#### 3. Game Controller Updates
**File**: `src/gameController.ts`

Modify `handleTalkCommand` method:
```typescript
// Replace fixed response
this.tui.display(`${character.name} says: "Lovely day."`, MessageType.NORMAL);

// With dynamic response
const response = character.dialogue_response || "Lovely day.";
this.tui.display(`${character.name} says: "${response}"`, MessageType.NORMAL);
```

#### 4. Session Interface Updates
**File**: `src/sessionInterface.ts`

Modify talk command handler:
```typescript
// Replace fixed response
console.log(`${character.name} says: "Lovely day."`);

// With dynamic response
const response = character.dialogue_response || "Lovely day.";
console.log(`${character.name} says: "${response}"`);
```

#### 5. Character Seed Data Enhancement
**File**: `src/utils/initDb.ts`

Update seeded characters with unique responses:
```typescript
const characterSeeds = [
  {
    roomId: entranceId,
    character: {
      name: 'Ancient Guardian',
      description: 'A spectral guardian that watches over the entrance hall with eternal vigilance',
      type: 'npc' as const,
      dialogue_response: 'These halls have stood for centuries, and I shall guard them for centuries more.'
    },
    roomName: 'Grand Entrance Hall'
  },
  {
    roomId: libraryId,
    character: {
      name: 'Scholar Wraith',
      description: 'A ghostly figure in scholarly robes, eternally tending to the ancient tomes',
      type: 'npc' as const,
      dialogue_response: 'So many books, so little time... even in death.'
    },
    roomName: 'Scholar\'s Library'
  }
];
```

## Character-Specific Dialogue Examples

### Ancient Guardian
- **Response**: "These halls have stood for centuries, and I shall guard them for centuries more."
- **Personality**: Ancient, dutiful, protective

### Scholar Wraith
- **Response**: "So many books, so little time... even in death."
- **Personality**: Academic, melancholic, scholarly

### Future Characters
Examples of appropriate responses by character type:
- **Guards**: "Stay vigilant, stranger."
- **Merchants**: "What wares do you seek?"
- **Enemies**: "You dare disturb my rest?"
- **Wise Characters**: "Knowledge is the greatest treasure."

## Implementation Strategy

### Phase 1: Core Infrastructure
1. Add database migration for `dialogue_response` column
2. Update TypeScript interfaces
3. Modify dialogue display logic in both interfaces

### Phase 2: Content Enhancement
1. Add unique responses to existing seeded characters
2. Update character generation to include dialogue options
3. Ensure AI character generation includes dialogue responses

### Phase 3: Testing & Validation
1. Update existing tests to handle dynamic responses
2. Add tests for custom vs default dialogue behavior
3. End-to-end testing with various character types

## Backward Compatibility

- **Existing Characters**: Automatically get "Lovely day." as default
- **Existing Code**: No breaking changes to dialogue system
- **Database**: Migration adds column without disrupting existing data
- **Tests**: Existing tests continue to work with minor updates

## Testing Requirements

### Unit Tests
```typescript
describe('Character Dialogue Responses', () => {
  test('should use custom dialogue response when available', () => {
    // Character with custom response
    // Verify custom response is used
  });

  test('should fall back to default when dialogue_response is null', () => {
    // Character without custom response
    // Verify "Lovely day." fallback is used
  });

  test('should handle empty string dialogue response', () => {
    // Character with empty dialogue_response
    // Verify appropriate fallback behavior
  });
});
```

### Integration Tests
- Test dialogue with seeded characters (Ancient Guardian, Scholar Wraith)
- Test dialogue with newly created characters
- Test partial name matching with custom responses
- Test session interface dialogue with custom responses

## Future Enhancements

This foundation enables future dialogue system improvements:
- **Multiple Responses**: Array of responses for variety
- **Conditional Dialogue**: Responses based on game state
- **Mood System**: Responses change based on character mood
- **Quest Integration**: Dialogue changes based on quest progress
- **Relationship System**: Responses vary based on player reputation

## Benefits

1. **Enhanced Immersion**: Each character feels unique and alive
2. **Character Personality**: Dialogue reflects character background and role
3. **Simple Implementation**: Minimal code changes with maximum impact
4. **Extensible Foundation**: Easy to build more complex dialogue systems later
5. **Backward Compatible**: No disruption to existing functionality

## Acceptance Criteria

- [ ] Database migration adds `dialogue_response` column successfully
- [ ] Character types updated to include dialogue_response field
- [ ] Game Controller uses character-specific dialogue responses
- [ ] Session Interface uses character-specific dialogue responses
- [ ] Ancient Guardian says: "These halls have stood for centuries, and I shall guard them for centuries more."
- [ ] Scholar Wraith says: "So many books, so little time... even in death."
- [ ] Characters without custom responses default to "Lovely day."
- [ ] All existing tests pass with minor updates
- [ ] New tests cover custom dialogue functionality
- [ ] End-to-end testing confirms feature works in both game modes