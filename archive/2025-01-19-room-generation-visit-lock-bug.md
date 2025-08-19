# Room Generation Visit-Lock Bug

**Date Created**: 2025-01-19
**Category**: Bug
**Priority**: High
**Status**: Open

## Issue Description

The visit-to-lock mechanism for room generation is not working correctly. Rooms that have already been visited by the player are having new exits added to them, which violates the core design principle of spatial consistency.

## Expected Behavior

1. When a player first visits a room, it should be marked as `generation_processed = TRUE`
2. Once a room is processed/locked, **no new exits should ever be added to it**
3. Background generation should only affect unvisited rooms
4. Players should be able to trust that room layouts remain consistent

## Actual Behavior

- Player visits "Moonlit Courtyard Garden" with exits: up, west
- Room gets visit-locked as expected
- Later, new exits appear: east, north, south, up, west
- Room layout changes while player is present, breaking spatial consistency

## Technical Details

**Root Cause Analysis Needed:**
- Visit-lock timing: Is `generation_processed = TRUE` being set immediately on room entry?
- Background generation logic: Is it properly checking the `generation_processed` flag?
- Race conditions: Could background generation be running before the visit-lock is applied?
- Database consistency: Are there issues with the flag persistence?

**Key Code Areas:**
- `gameController.ts:592` - Visit-lock application in `lookAround()`
- `gameController.ts:815` - Background generation query filtering
- `gameController.ts:893` - Visit-lock check in `countMissingRoomsFor()`
- `gameController.ts:923` - Visit-lock check in `generateMissingRoomsFor()`

## Steps to Reproduce

1. Start a new game
2. Navigate to any room (e.g., Moonlit Courtyard Garden)
3. Note the available exits
4. Wait in the room or perform other actions
5. Check exits again - new exits may have appeared

## Impact

- **High**: Breaks core game mechanic of spatial consistency
- **Player Confusion**: Mental map becomes unreliable
- **Immersion Breaking**: Violates player expectations
- **Trust Issue**: Players lose confidence in game state reliability

## Proposed Investigation Steps

1. **Add Debug Logging**: 
   - Log when `generation_processed` is set to TRUE
   - Log all background generation attempts with room IDs and processed status
   - Log when new connections are created

2. **Database Verification**:
   - Query to check `generation_processed` status before/after room visits
   - Verify that the flag persists correctly

3. **Race Condition Analysis**:
   - Check if background generation starts before visit-lock completes
   - Verify async operation ordering

4. **Code Review**:
   - Ensure all background generation paths check `generation_processed`
   - Verify visit-lock happens immediately on room entry, not just on `look` command

## Acceptance Criteria

- [ ] Rooms are immediately marked as processed when first visited
- [ ] Background generation never adds exits to processed rooms
- [ ] No race conditions between visit-lock and background generation
- [ ] Room layouts remain consistent after first visit
- [ ] Debug logging confirms proper visit-lock behavior
- [ ] Comprehensive test coverage for visit-lock mechanism

## Technical Notes

The visit-to-lock system is fundamental to player trust and spatial consistency in text adventures. This bug undermines a core game mechanic and needs to be fixed before any major releases.

**Related Systems:**
- Background room generation
- Room state management
- Database consistency
- Player movement system

## Priority Justification

High priority because:
1. Violates core game design principle
2. Breaks player trust and immersion
3. Makes the game world feel unreliable
4. Could lead to player confusion and frustration
5. Affects fundamental gameplay experience