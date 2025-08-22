# Character Generation Frequency

**Implementation**: Percentage-based character generation control  
**Complexity**: Minimal - AI prompt changes only  
**Goal**: Control character encounter frequency for better game balance  

## Overview

Add a configurable percentage system to control how often the AI is asked to generate characters for rooms, making character encounters more meaningful and less overwhelming.

## Current System

**Current AI Prompt**: Characters are always requested with guidelines but no frequency control

**Result**: Character generation frequency is not controlled, potentially leading to character saturation

## New System: Percentage-Based Character Generation

**New Logic**: Roll random percentage (0-100) and compare to `CHARACTER_GENERATION_FREQUENCY`
- Default: 40% of rooms get character generation requests
- 60% of rooms focus on atmospheric description without characters

**Environment Variable**: `CHARACTER_GENERATION_FREQUENCY=40` (0-100 percentage)

## Implementation Details

### Files to Modify
- `src/ai/grokClient.ts` - Room generation prompt logic
- `src/ai/mockAIEngine.ts` - Mock AI consistency

### Changes Required

1. **Add percentage roll logic** in room generation method
2. **Modify AI character prompt** based on percentage result
3. **Handle no-character case** in prompt

### Pseudo-code
```typescript
// In buildPrompt method
const characterGenerationFrequency = parseInt(process.env.CHARACTER_GENERATION_FREQUENCY || '40');
const shouldIncludeCharacters = Math.random() * 100 <= characterGenerationFrequency;

const characterPrompt = shouldIncludeCharacters
  ? `CHARACTER GUIDELINES (include 0-2 characters that enhance the room):
- "type": "npc" for friendly/neutral characters, "enemy" for hostile ones
- Characters should fit the room's theme and atmosphere naturally
- NPCs can provide information, services, or atmospheric storytelling
- "personality": short description like "Scholarly and cryptic" or "Gruff but helpful"
- "initialDialogue": What they say when first met (one sentence)
- Only include characters if they genuinely enhance the room experience`
  : `CHARACTER GUIDELINES: This room should focus on atmospheric description without characters. Do not include any characters in the "characters" array - leave it empty.`;
```

### Prompt Variations

**With Characters (shouldIncludeCharacters = true)**:
```
CHARACTER GUIDELINES (include 0-2 characters that enhance the room):
- "type": "npc" for friendly/neutral characters, "enemy" for hostile ones
- Characters should fit the room's theme and atmosphere naturally
- NPCs can provide information, services, or atmospheric storytelling
- "personality": short description like "Scholarly and cryptic" or "Gruff but helpful" 
- "initialDialogue": What they say when first met (one sentence)
- Only include characters if they genuinely enhance the room experience
```

**Without Characters (shouldIncludeCharacters = false)**:
```
CHARACTER GUIDELINES: This room should focus on atmospheric description without characters. Do not include any characters in the "characters" array - leave it empty.
```

## Benefits

1. **Controlled Encounters**: Characters appear at predictable frequency
2. **Enhanced Significance**: Character encounters feel more meaningful
3. **Atmospheric Balance**: Some rooms focus purely on environment
4. **Simple Configuration**: Easy percentage-based control

## Testing Strategy

### Unit Tests
- Test percentage roll logic produces correct distribution
- Verify prompt generation for character/no-character cases
- Ensure existing CharacterGenerationService handles empty arrays

### Integration Tests  
- Generate 100 rooms and verify distribution roughly matches expected
- Test that character-less rooms still generate quality descriptions
- Verify characters are properly created when present

### Manual Testing
- Play through generated areas to feel the difference
- Verify atmospheric quality of character-less rooms
- Confirm character encounters feel more meaningful

## Success Criteria

- [x] Percentage roll correctly determines character generation per room
- [x] AI prompts dynamically request characters or explicitly request none
- [x] ~40% of rooms generated request character generation (configurable)
- [x] Room generation quality maintained for character-less rooms
- [x] No regression in existing character generation functionality
- [x] All tests pass