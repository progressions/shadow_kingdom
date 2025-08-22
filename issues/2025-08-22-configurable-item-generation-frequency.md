# Configurable Item Generation Frequency

**Created**: 2025-08-22  
**Priority**: Medium  
**Category**: Game Balance / Configuration  
**Estimated Effort**: 2-3 hours  

## Problem Summary

Currently, the AI is instructed to generate 1-3 items for **every single room** during world generation. This leads to an overabundance of items throughout the game world, reducing the sense of discovery and making item finds feel commonplace rather than special.

## Current Behavior

**AI Room Generation Prompt** (`src/ai/grokClient.ts:280-290`):
```
IMPORTANT: The "items" array is REQUIRED. Always include 1-3 items that fit the room.
```

**Result**: Every room contains 1-3 items, creating item saturation where players are overwhelmed with objects and the thrill of discovery is diminished.

## Expected Behavior

Items should be **rarer and more meaningful** discoveries. Not every room needs items - some rooms should be purely atmospheric spaces that build tension and make item discoveries more impactful when they do occur.

## Proposed Solution

### 1. Environment Variable for Item Generation Frequency

Add a new environment variable `ITEM_GENERATION_FREQUENCY` (0-100 percentage) that controls how often the AI is asked to generate items:

```bash
# Default: 40% of rooms get items (more balanced)
ITEM_GENERATION_FREQUENCY=40

# Conservative: 25% of rooms get items (rare discoveries)
ITEM_GENERATION_FREQUENCY=25

# Current behavior: 100% of rooms get items
ITEM_GENERATION_FREQUENCY=100
```

### 2. Dynamic Prompt Generation

Modify the AI prompt generation logic to conditionally request items based on the frequency setting:

**High-level approach:**
- Roll a random percentage (0-100) for each room generation
- If roll ≤ `ITEM_GENERATION_FREQUENCY`, request items in the prompt
- If roll > `ITEM_GENERATION_FREQUENCY`, specifically request no items

### 3. Prompt Variations

**With Items (when frequency roll succeeds):**
```
IMPORTANT: The "items" array is REQUIRED. Include 1-3 items that fit the room.
```

**Without Items (when frequency roll fails):**
```
IMPORTANT: The "items" array should be EMPTY for this room. Focus on atmospheric description without objects.
```

## Technical Implementation

### Files to Modify

1. **`src/ai/grokClient.ts`** - Modify room generation prompt logic
2. **Environment Configuration** - Add new environment variable
3. **Documentation** - Update CLAUDE.md with new configuration option

### Implementation Steps

#### Step 1: Add Environment Variable Support
```typescript
// In grokClient.ts constructor or config
const itemGenerationFrequency = parseInt(process.env.ITEM_GENERATION_FREQUENCY || '40');
```

#### Step 2: Modify Prompt Generation Logic
```typescript
// In generateRoom method, before building the prompt
const shouldIncludeItems = Math.random() * 100 <= itemGenerationFrequency;

const itemPromptSection = shouldIncludeItems 
  ? `IMPORTANT: The "items" array is REQUIRED. Include 1-3 items that fit the room.`
  : `IMPORTANT: The "items" array should be EMPTY for this room. Focus on atmospheric description.`;
```

#### Step 3: Update Prompt Building
Replace the hardcoded item requirement with the dynamic `itemPromptSection`.

#### Step 4: Handle Empty Items Array
Ensure `ItemGenerationService.createItemsFromRoomGeneration()` properly handles empty or undefined items arrays (it already does this gracefully).

## Benefits

### Game Experience
- **Enhanced Discovery**: Finding items becomes more meaningful and exciting
- **Better Pacing**: Players aren't overwhelmed with objects in every room
- **Atmospheric Rooms**: Some rooms can focus purely on mood and description
- **Strategic Exploration**: Players more motivated to thoroughly explore to find items

### Technical Benefits
- **Configurable Balance**: Easy to adjust item frequency without code changes
- **Testing Flexibility**: Can test different balance levels easily
- **Backwards Compatible**: Existing games unaffected, setting applies to new generation only

## Configuration Options

**Recommended Settings:**
- **Exploration-Heavy**: `ITEM_GENERATION_FREQUENCY=25` (rare discoveries)
- **Balanced**: `ITEM_GENERATION_FREQUENCY=40` (moderate finds) 
- **Item-Rich**: `ITEM_GENERATION_FREQUENCY=60` (frequent discoveries)
- **Current Behavior**: `ITEM_GENERATION_FREQUENCY=100` (every room)

## Implementation Considerations

### 1. Existing Item Systems Compatibility
- `ItemGenerationService` already handles empty item arrays gracefully
- No changes needed to database schema or item placement logic
- Environment variable is additive - doesn't break existing functionality

### 2. AI Prompt Quality
- Need to test that "no items" prompts still generate quality room descriptions
- May need A/B testing to ensure atmospheric rooms are as engaging
- Consider adding prompt guidance for making itemless rooms compelling

### 3. Game Balance Testing
- Test different frequency settings to find optimal balance
- Ensure essential starter items (like room 1 items) aren't affected
- May need special handling for tutorial/starting areas

## Success Criteria

- [x] `ITEM_GENERATION_FREQUENCY` environment variable controls item generation
- [x] Random percentage properly determines whether room gets items
- [x] AI prompts correctly request items or explicitly request none
- [x] Empty items array properly handled by existing systems
- [x] No regression in room generation quality or performance
- [x] Configuration documented in CLAUDE.md

## Testing Strategy

### Unit Tests
- Test frequency calculation with various environment variable values
- Verify prompt generation includes correct item instructions
- Test ItemGenerationService handles empty arrays

### Integration Tests  
- Generate 100 rooms with different frequency settings
- Verify actual item distribution matches expected frequency
- Test room quality with and without items

### Manual Testing
- Play through areas with different frequency settings
- Evaluate game feel and discovery excitement
- Ensure atmospheric quality maintained in itemless rooms

## Risk Assessment

**Low Risk** - This is a configuration addition that:
- Doesn't modify existing database schemas
- Doesn't break existing item systems
- Is purely additive functionality
- Can be easily reverted by setting frequency to 100

## Future Enhancements

### Smart Item Placement
- Weight item frequency by room type (treasure rooms more likely to have items)
- Consider region themes when determining item probability
- Factor in room importance or player progression

### Conditional Logic
- Higher frequency in unexplored areas vs. recently visited areas
- Special rules for starting areas or key quest locations
- Item frequency that adapts based on player's current inventory

### Analytics Integration
- Track item discovery patterns to optimize frequency
- A/B test different frequencies with different player groups
- Adaptive frequency based on player behavior patterns

---

**Related Issues:**
- Item System Implementation (inventory, equipment)
- Room Generation Quality and Atmospheric Description
- Game Balance and Progression Tuning