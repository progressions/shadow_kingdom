# Sort Directions Display

**Date**: 2025-01-22  
**Status**: Open  
**Priority**: Low  
**Category**: Enhancement  

## Description

Standardize the display order of movement directions to show cardinal directions first (north, south, east, west) followed by other directions in alphabetical order.

## Details

### What is the problem?
Directions are currently displayed in the order they appear in the database or are processed, which can be inconsistent and confusing for players.

### What should happen instead?
Display directions in a standardized order:
1. **Cardinal directions**: North, South, East, West (in that exact order)
2. **Other directions**: Any non-cardinal directions (up, down, northeast, custom directions, etc.) in alphabetical order

### Example
Before: `Exits: west, north, up, south, northeast`
After: `Exits: north, south, west, up, northeast`

### Acceptance Criteria
- [ ] Cardinal directions always appear first in order: north, south, east, west
- [ ] Non-cardinal directions appear after cardinal ones, sorted alphabetically
- [ ] Direction sorting is case-insensitive
- [ ] Custom/thematic direction names are preserved but sorted appropriately
- [ ] All room displays show consistent direction ordering
- [ ] No existing functionality is broken

## Technical Notes

### Sorting Logic
```typescript
const DIRECTION_PRIORITY = {
  'north': 1,
  'south': 2, 
  'east': 3,
  'west': 4
};

function sortDirections(directions: string[]): string[] {
  return directions.sort((a, b) => {
    const priorityA = DIRECTION_PRIORITY[a.toLowerCase()] || 999;
    const priorityB = DIRECTION_PRIORITY[b.toLowerCase()] || 999;
    
    // If both have priority (cardinal directions), sort by priority
    if (priorityA !== 999 && priorityB !== 999) {
      return priorityA - priorityB;
    }
    
    // If one has priority and other doesn't, priority goes first
    if (priorityA !== 999) return -1;
    if (priorityB !== 999) return 1;
    
    // If neither has priority, sort alphabetically
    return a.toLowerCase().localeCompare(b.toLowerCase());
  });
}
```

### Implementation Points
- Room display logic (likely in UI/display components)
- Connection query/processing logic  
- Command suggestions for movement
- Any command that lists available directions

### Edge Cases
- Case sensitivity: Handle `North`, `NORTH`, `north` consistently
- Custom direction names: "through the crystal archway", "down the spiral staircase"
- Direction aliases: Both "n" and "north" should be treated as north

## Resolution

*To be filled when issue is resolved*

## Related

- Room display system
- Connection management
- Command suggestion system
- Movement command processing