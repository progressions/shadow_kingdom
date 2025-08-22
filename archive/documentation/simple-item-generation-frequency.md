# Simple Item Generation Frequency

**Implementation**: Simple dice-based item generation  
**Complexity**: Minimal - AI prompt changes only  
**Goal**: Reduce item saturation by making items rare discoveries  

## Overview

Replace the current "always generate 1-3 items" approach with a dice-based system that naturally creates item scarcity.

## Current System

**Current AI Prompt**: 
```
IMPORTANT: The "items" array is REQUIRED. Always include 1-3 items that fit the room.
```

**Result**: Every room has 1-3 items (100% item frequency)

## New System: 1d6-3 Item Generation

**New Logic**: Roll 1d6, subtract 3 to get item count
- Roll 1-3: 0 items (50% of rooms empty)
- Roll 4: 1 item (16.7% of rooms)  
- Roll 5: 2 items (16.7% of rooms)
- Roll 6: 3 items (16.7% of rooms)

**Distribution**: 50% empty rooms, 50% rooms with 1-3 items

## Implementation Details

### File to Modify
- `src/ai/grokClient.ts` - Room generation prompt logic

### Changes Required

1. **Add dice roll logic** in room generation method
2. **Modify AI prompt** based on dice result
3. **Handle empty item case** in prompt

### Pseudo-code
```typescript
// In generateRoom method
const itemCount = Math.max(0, Math.floor(Math.random() * 6) + 1 - 3); // 1d6-3, minimum 0

const itemPrompt = itemCount === 0 
  ? `IMPORTANT: The "items" array should be EMPTY for this room. Focus on atmospheric description.`
  : `IMPORTANT: The "items" array is REQUIRED. Include exactly ${itemCount} items that fit the room.`;
```

### Prompt Variations

**Empty Room (itemCount = 0)**:
```
IMPORTANT: The "items" array should be EMPTY for this room. Focus on atmospheric description without objects.
```

**Room with Items (itemCount > 0)**:
```
IMPORTANT: The "items" array is REQUIRED. Include exactly ${itemCount} items that fit the room.
```

## Benefits

1. **Natural Scarcity**: 50% of rooms have no items
2. **Simple Implementation**: Just dice logic, no configuration
3. **No Breaking Changes**: Existing systems handle empty arrays
4. **Enhanced Discovery**: Items feel more special when found

## Testing Strategy

### Unit Tests
- Test dice roll logic produces correct distribution
- Verify prompt generation for each item count (0, 1, 2, 3)
- Ensure existing ItemGenerationService handles empty arrays

### Integration Tests  
- Generate 100 rooms and verify distribution roughly matches expected
- Test that empty-item rooms still generate quality descriptions
- Verify items are properly created when present

### Manual Testing
- Play through generated areas to feel the difference
- Verify atmospheric quality of itemless rooms
- Confirm item discoveries feel more meaningful

## Success Criteria

- [x] Dice roll (1d6-3) correctly determines item count per room
- [x] AI prompts dynamically request correct number of items or none
- [x] ~50% of rooms generated have no items  
- [x] Room generation quality maintained for itemless rooms
- [x] No regression in existing item generation functionality
- [x] All tests pass