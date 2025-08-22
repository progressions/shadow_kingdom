# Reduce Repetitive Room Descriptions Specification

## Overview

Currently, room descriptions are displayed after every action, creating verbose and repetitive output. This specification defines changes to limit room descriptions to only appear when entering a room or explicitly using the "look" command.

## Current Behavior

Room descriptions are currently displayed in these scenarios:
1. When using the "look" command (✅ should stay)
2. When starting a new game (✅ should stay)
3. When loading an existing game (✅ should stay)
4. When moving to a new room via movement commands (✅ should stay)
5. **When picking up items (❌ should be removed)**
6. **When dropping items (❌ should be removed)**
7. After other actions that don't involve room changes (❌ should be removed)

## Target Behavior

Room descriptions should ONLY appear in these scenarios:
1. **Room Entry**: When the player moves to a new room (via movement commands)
2. **Look Command**: When the player explicitly uses the "look" command
3. **Game Initialization**: When starting a new game or loading an existing game

## Implementation Plan

### Phase 1: Identify Current Issues
1. ✅ Find all calls to `lookAround()` in gameController.ts
2. ✅ Categorize each call as "should stay" vs "should be removed"

### Phase 2: Remove Inappropriate Room Displays
1. Remove `lookAround()` call after item pickup (line 1387)
2. Remove `lookAround()` call after item drop (line 1501)
3. Ensure these actions still provide appropriate feedback without full room description

### Phase 3: Validate Appropriate Room Displays
Ensure these scenarios still show room descriptions:
1. ✅ Look command handler (line 169)
2. ✅ New game initialization (line 612)
3. ✅ Game loading (line 888)
4. ✅ Movement commands (lines 815, 854)

### Phase 4: Testing
1. Test that "look" command shows room description
2. Test that movement shows room description
3. Test that pickup/drop actions don't show room description
4. Test that other non-movement actions don't show room description
5. Test game initialization scenarios

## Code Changes Required

### File: `src/gameController.ts`

**Remove these calls to `lookAround()`:**

1. **Line 1387** in `handlePickup()`:
   ```typescript
   // Remove this line:
   await this.lookAround();
   ```

2. **Line 1501** in `handleDrop()`:
   ```typescript
   // Remove this line:
   await this.lookAround();
   ```

**Replace with appropriate action feedback:**
- For pickup: Just show "You pick up the [item]" message
- For drop: Just show "You drop the [item]" message

## Expected User Experience

### Before (Repetitive):
```
> inventory
Your inventory is empty.

[ROOM DESCRIPTION]
An ancient stone chamber filled with mystical energy...
[FULL ROOM DETAILS]

> pickup sword
You pick up the rusty sword.

[ROOM DESCRIPTION - REPEATED]
An ancient stone chamber filled with mystical energy...
[FULL ROOM DETAILS - REPEATED]

> drop sword
You drop the rusty sword.

[ROOM DESCRIPTION - REPEATED AGAIN]
An ancient stone chamber filled with mystical energy...
[FULL ROOM DETAILS - REPEATED AGAIN]
```

### After (Concise):
```
> inventory
Your inventory is empty.

> pickup sword
You pick up the rusty sword.

> drop sword
You drop the rusty sword.

> look
[ROOM DESCRIPTION]
An ancient stone chamber filled with mystical energy...
[FULL ROOM DETAILS]
```

## Acceptance Criteria

1. ✅ Room descriptions only appear when entering a room
2. ✅ Room descriptions only appear when using the "look" command
3. ✅ Room descriptions appear during game initialization (new/load)
4. ❌ Room descriptions do NOT appear after pickup actions
5. ❌ Room descriptions do NOT appear after drop actions
6. ❌ Room descriptions do NOT appear after inventory/examine/stats commands
7. ✅ Action feedback still provides appropriate confirmation messages
8. ✅ Game flow feels less repetitive and more responsive

## Risk Assessment

**Low Risk Changes:**
- Removing `lookAround()` calls is safe as it only reduces output
- Action feedback is preserved through existing display messages
- Core game functionality (movement, look command) remains unchanged

**Testing Requirements:**
- Verify all movement scenarios still work correctly
- Verify look command still works correctly  
- Verify pickup/drop still provide feedback without room description
- Test edge cases like invalid commands, empty rooms, etc.

## Implementation Steps

1. Remove the two identified `lookAround()` calls
2. Verify that pickup/drop actions still show appropriate feedback
3. Run existing tests to ensure no regressions
4. Add new tests to verify room descriptions are not shown inappropriately
5. Manual testing of user scenarios