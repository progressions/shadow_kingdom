# Get All Command

**Date**: 2025-01-22  
**Status**: Completed  
**Priority**: Medium  
**Category**: Feature  

## Description

Implement a "get all" command that allows players to pick up all non-fixed items in the current room with a single command.

## Details

### What is the requirement?
Players need a convenient way to pick up multiple items at once instead of individually picking up each item. This is a common quality-of-life feature in text adventure games.

### What should happen?
- Command aliases: `get all`, `take all`, `pickup all`
- Pick up only non-fixed items (where `is_fixed = FALSE`)
- Apply all existing pickup validations for each item
- Process items one at a time to ensure proper validation
- Provide clear feedback about successful and failed pickups

### Acceptance Criteria
- [ ] Command successfully picks up all valid items in room
- [ ] Respects all existing pickup validation rules (inventory limits, weight, curses)
- [ ] Provides clear feedback for success/failure scenarios
- [ ] Handles partial failures gracefully (some items picked up, others not)
- [ ] Integrates with existing item effect systems
- [ ] Performance under 500ms for typical rooms (1-10 items)

## Technical Notes

### Database Query
```sql
-- Get all pickupable items in room
SELECT ri.*, i.* 
FROM room_items ri 
JOIN items i ON ri.item_id = i.id 
WHERE ri.room_id = ? 
AND i.is_fixed = FALSE;
```

### Implementation Approach
- Use existing `ActionValidator.canPerformAction()` for each item
- Use existing `ItemService.canPickupItem()` validation
- Process items sequentially, not in batch
- Stop on critical failures (inventory full, weight exceeded)
- Skip non-critical failures (cursed items) and continue

### User Feedback Messages
- Success: "You pick up: [item1], [item2], [item3]..."
- Partial: "You pick up [successful items]. Could not pick up: [failed items with reasons]"
- Complete failure: "You cannot pick up any items: [reason]"
- Empty room: "There are no items here to pick up."

## Resolution

**Completed**: 2025-01-22

Implemented the "get all" command with the following features:
- Added support for `get all`, `pickup all`, and `take all` commands
- Filters out fixed items automatically
- Processes items sequentially with proper validation
- Respects inventory limits with clear feedback
- Handles partial success scenarios gracefully
- Performance optimized (<500ms for 10 items)
- Full test coverage with 9 comprehensive tests

Implementation in PR #48.

## Related

- ActionValidator service
- ItemService pickup methods
- Equipment system
- Inventory management
- Room item display