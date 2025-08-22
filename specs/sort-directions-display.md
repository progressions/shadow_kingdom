# Sort Directions Display Specification

## Overview
Implement standardized direction sorting for all room displays to ensure consistent user experience with cardinal directions first, followed by alphabetically sorted non-cardinal directions.

## Requirements

### Functional Requirements
1. **Direction Priority**: Cardinal directions (north, south, east, west) must appear first in that exact order
2. **Alphabetical Sorting**: Non-cardinal directions (up, down, northeast, custom directions) appear after cardinals, sorted alphabetically
3. **Case Insensitive**: Direction sorting must be case-insensitive but preserve original case in display
4. **Custom Direction Preservation**: Thematic/custom direction names must be preserved exactly as entered but sorted appropriately

### Technical Requirements
1. **Central Sorting Function**: Create a reusable `sortDirections()` utility function
2. **Room Display Integration**: Apply sorting to all room description displays
3. **Connection Processing**: Apply sorting to connection queries/processing
4. **Command Suggestions**: Apply sorting to movement command suggestions
5. **Backward Compatibility**: No existing functionality should be broken

## Implementation Plan

### Phase 1: Core Sorting Function
- Create `src/utils/directionSorter.ts` with `sortDirections()` function
- Implement priority-based sorting with fallback to alphabetical
- Add comprehensive unit tests

### Phase 2: Integration Points
- Identify all locations where directions are displayed
- Update room display logic to use direction sorting
- Update connection processing to maintain sorted order
- Update command suggestion systems

### Phase 3: Testing & Validation
- Create integration tests for direction display
- Test edge cases (custom directions, case sensitivity)
- Validate all existing functionality remains intact

## Acceptance Criteria

### Sorting Behavior
- [ ] Cardinal directions always appear in order: north, south, east, west
- [ ] Non-cardinal directions appear after cardinals, alphabetically sorted
- [ ] Case-insensitive sorting (North, NORTH, north all treated as north)
- [ ] Custom direction names preserved exactly as entered
- [ ] Empty direction lists handled gracefully

### Integration Points
- [ ] Room descriptions show sorted directions
- [ ] Movement command suggestions use sorted directions
- [ ] All connection displays show consistent ordering
- [ ] No regression in existing room/movement functionality

### Testing Coverage
- [ ] Unit tests for sorting function with all edge cases
- [ ] Integration tests for room display
- [ ] End-to-end tests for player movement and direction display

## Edge Cases

### Direction Variations
- Case sensitivity: `North`, `NORTH`, `north` → all treated as cardinal north
- Custom directions: `"through the crystal archway"`, `"down the spiral staircase"`
- Direction aliases: Both `"n"` and `"north"` should be treated as north priority

### Data Scenarios
- Empty direction lists
- Single direction
- All cardinal directions
- All non-cardinal directions
- Mixed cardinal and non-cardinal directions

## Files to Modify

### New Files
- `src/utils/directionSorter.ts` - Core sorting logic
- `tests/directionSorter.test.ts` - Unit tests

### Existing Files to Update
- Room display components (identify via code search)
- Connection processing logic
- Command suggestion systems
- Any component that lists available directions

## Example Output

### Before
```
Exits: west, north, up, south, northeast
Available directions: down, east, through the archway, north
```

### After
```
Exits: north, south, west, northeast, up
Available directions: north, east, down, through the archway
```