# Configurable Character Generation Frequency

**Created**: 2025-08-22  
**Completed**: 2025-08-22  
**Status**: ✅ COMPLETED  
**Priority**: Medium  
**Category**: Game Balance / Configuration  
**Estimated Effort**: 1-2 hours  

## Problem Summary

Currently, the AI character generation system appears to generate characters for rooms without a configurable frequency control. We need a simple percentage-based system to control how often the AI is asked to generate characters for rooms, making character encounters more meaningful and less overwhelming.

## Expected Behavior

Characters should appear in a controlled percentage of rooms rather than being generated arbitrarily. A configurable frequency will allow fine-tuning of character encounter rates for optimal game balance.

## Proposed Solution

### Environment Variable for Character Generation Frequency

Add a new environment variable `CHARACTER_GENERATION_FREQUENCY` (0-100 percentage) that controls how often the AI is asked to generate characters:

```bash
# Default: 40% of rooms get character generation requests
CHARACTER_GENERATION_FREQUENCY=40

# Conservative: 20% of rooms get characters (rare encounters)  
CHARACTER_GENERATION_FREQUENCY=20

# Frequent: 60% of rooms get characters (social/combat heavy)
CHARACTER_GENERATION_FREQUENCY=60

# Always generate: 100% of rooms get character generation requests
CHARACTER_GENERATION_FREQUENCY=100
```

### Implementation Approach

**Simple percentage roll approach:**
- Roll a random percentage (0-100) for each room generation
- If roll ≤ `CHARACTER_GENERATION_FREQUENCY`, request characters in the AI prompt
- If roll > `CHARACTER_GENERATION_FREQUENCY`, specifically request no characters

### Prompt Variations

**With Character Generation (when percentage roll succeeds):**
```
CHARACTER GUIDELINES (include 0-2 characters that enhance the room):
- "type": "npc" for friendly/neutral characters, "enemy" for hostile ones
- Characters should fit the room's theme and atmosphere naturally
- NPCs can provide information, services, or atmospheric storytelling
```

**Without Character Generation (when percentage roll fails):**
```
CHARACTER GUIDELINES: This room should focus on atmospheric description without characters. Do not include any characters in the "characters" array - leave it empty.
```

## Technical Implementation

### Files to Modify

1. **`src/ai/grokClient.ts`** - Modify room generation prompt logic for character requests
2. **Environment Configuration** - Add `CHARACTER_GENERATION_FREQUENCY` variable
3. **`src/ai/mockAIEngine.ts`** - Update mock AI to respect the same frequency logic

### Implementation Steps

#### Step 1: Add Environment Variable Support
```typescript
// In grokClient.ts buildPrompt method
const characterGenerationFrequency = parseInt(process.env.CHARACTER_GENERATION_FREQUENCY || '40');
const shouldIncludeCharacters = Math.random() * 100 <= characterGenerationFrequency;
```

#### Step 2: Modify Prompt Generation Logic
```typescript
const characterPromptSection = shouldIncludeCharacters
  ? `CHARACTER GUIDELINES (include 0-2 characters that enhance the room):
- "type": "npc" for friendly/neutral characters, "enemy" for hostile ones
- Characters should fit the room's theme and atmosphere naturally
- NPCs can provide information, services, or atmospheric storytelling
- "personality": short description like "Scholarly and cryptic" or "Gruff but helpful"
- "initialDialogue": What they say when first met (one sentence)
- Only include characters if they genuinely enhance the room experience`
  : `CHARACTER GUIDELINES: This room should focus on atmospheric description without characters. Do not include any characters in the "characters" array - leave it empty.`;
```

#### Step 3: Update Mock AI Engine
Update `MockAIEngine.generateRoomCharacters()` to use the same percentage logic for consistency between real and mock AI behavior.

#### Step 4: Replace Character Prompt Sections
Replace the existing hardcoded character guidelines with the dynamic `characterPromptSection`.

## Benefits

### Game Experience
- **Controlled Encounter Rate**: Characters appear at a predictable frequency
- **Enhanced Significance**: Character encounters feel more special and meaningful
- **Atmospheric Balance**: Some rooms can focus purely on environment without NPCs
- **Configurable Difficulty**: Adjust social/combat frequency without code changes

### Technical Benefits
- **Simple Configuration**: Easy percentage-based control
- **No Database Changes**: Works with existing character generation systems
- **Backwards Compatible**: Existing games unaffected
- **Testing Flexibility**: Easy to test different encounter rates

## Configuration Options

**Recommended Settings:**
- **Story-Heavy**: `CHARACTER_GENERATION_FREQUENCY=60` (frequent social encounters)
- **Balanced**: `CHARACTER_GENERATION_FREQUENCY=40` (moderate encounters) - **DEFAULT**
- **Exploration-Focused**: `CHARACTER_GENERATION_FREQUENCY=25` (rare encounters)
- **Empty World**: `CHARACTER_GENERATION_FREQUENCY=10` (mostly atmospheric)

## Success Criteria

- [x] `CHARACTER_GENERATION_FREQUENCY` environment variable controls character generation
- [x] Random percentage properly determines whether room gets character generation request
- [x] AI prompts correctly request characters or explicitly request none
- [x] Mock AI engine respects the same frequency logic
- [x] No regression in room generation quality or performance
- [x] Existing CharacterGenerationService handles empty arrays gracefully

## Testing Strategy

### Unit Tests
- Test percentage calculation with various environment variable values
- Verify prompt generation includes correct character instructions
- Test that frequency distribution roughly matches expected percentage

### Integration Tests
- Generate 100 rooms and verify character distribution matches expected frequency
- Test room quality with and without character generation requests
- Verify existing character systems handle empty character arrays

### Manual Testing
- Play through areas with different frequency settings
- Evaluate game feel and encounter pacing
- Ensure atmospheric quality maintained in character-less rooms

## Implementation Considerations

### 1. Existing Character Systems Compatibility
- `CharacterGenerationService` already handles empty character arrays gracefully
- No changes needed to database schema or character placement logic
- Environment variable is additive - doesn't break existing functionality

### 2. AI Prompt Quality
- Need to ensure "no characters" prompts still generate quality room descriptions
- Atmospheric rooms without characters should feel complete and engaging
- Character-focused rooms should have meaningful NPCs/enemies when requested

### 3. Game Balance Testing
- Test different frequency settings to find optimal encounter balance
- Consider special handling for starting areas or tutorial rooms
- Ensure essential story NPCs aren't affected by random generation

## Risk Assessment

**Low Risk** - This is a configuration addition that:
- Doesn't modify existing database schemas
- Doesn't break existing character systems
- Is purely additive functionality
- Can be easily reverted by setting frequency to 100

## Future Enhancements

### Smart Character Placement
- Weight character frequency by room type (social hubs more likely to have NPCs)
- Consider region themes when determining character probability
- Factor in story importance or quest relevance

### Conditional Logic
- Higher frequency in populated areas vs. wilderness
- Special rules for taverns, shops, or social gathering places
- Character frequency that adapts based on player progression

### Character Type Balancing
- Separate frequencies for NPCs vs. enemies
- Region-based character type preferences
- Story-driven character placement overrides

---

**Related Issues:**
- Dice-based Item Generation Frequency (recently implemented)
- Character System Implementation
- Game Balance and Encounter Design