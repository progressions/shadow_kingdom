# Duplicate and New Connections Being Created After Room Visits

**Date**: 2025-01-19  
**Status**: Open  
**Priority**: High  
**Category**: Bug  

## Summary

The game is creating duplicate connections and generating new connections even after a player has visited a room, violating the visit-to-lock mechanism that should prevent "phantom connections" from appearing on return visits.

## Problem Statement

The visit-to-lock system is designed to maintain spatial consistency by locking a room's layout after the first player visit (`generation_processed = TRUE`). However, the system is still:

1. **Creating duplicate connections** to already-connected rooms
2. **Generating new connections** from rooms that have already been visited and should be locked
3. **Breaking spatial consistency** and the player's mental map of the world

This undermines the core design principle that rooms should maintain consistent layouts once visited.

## Expected Behavior

According to the visit-to-lock mechanism documented in CLAUDE.md:

- Rooms marked as `generation_processed = FALSE` when first created
- Player visit locks the room layout (`generation_processed = TRUE`) 
- Prevents "phantom connections" appearing on return visits
- Maintains spatial consistency and player mental map

## Current Behavior

- Rooms that have been visited (`generation_processed = TRUE`) are still generating new connections
- Duplicate connections are being created between rooms that are already connected
- The world layout changes unpredictably, confusing players

## Technical Investigation Needed

### Database Query Analysis
Check if the visit-to-lock logic is properly implemented:
```sql
-- Check rooms that should be locked but might still be generating
SELECT id, name, generation_processed 
FROM rooms 
WHERE generation_processed = TRUE;

-- Check for duplicate connections
SELECT from_room_id, to_room_id, COUNT(*) as connection_count
FROM connections 
GROUP BY from_room_id, to_room_id 
HAVING COUNT(*) > 1;
```

### Code Review Areas

**Background Generation Service** (`src/services/backgroundGenerationService.ts`):
- Verify `shouldGenerateConnections()` respects `generation_processed` flag
- Check if connection generation is properly gated by visit status
- Ensure duplicate connection prevention is working

**Room Generation Logic**:
- Confirm that `generation_processed` is set to `TRUE` on first visit
- Verify that locked rooms are excluded from further generation
- Check if bidirectional connection creation is creating duplicates

**Game State Management**:
- Ensure player movement properly triggers room locking
- Verify that room visit tracking is consistent
- Check if race conditions could cause multiple generations

## Steps to Reproduce

1. Start a new game
2. Move to several rooms, noting the connections
3. Return to previously visited rooms
4. Observe new connections appearing that weren't there before
5. Check database for duplicate connection entries

## Acceptance Criteria

- [ ] Rooms with `generation_processed = TRUE` do not generate new connections
- [ ] No duplicate connections exist between any two rooms
- [ ] Room layouts remain consistent across multiple visits
- [ ] Background generation respects the visit-to-lock mechanism
- [ ] Database constraints prevent duplicate connection creation

## Potential Root Causes

### 1. Background Generation Race Condition
The background generation might be triggering on already-visited rooms due to timing issues or incorrect state checking.

### 2. Incomplete Visit-to-Lock Implementation
The visit detection and room locking might not be happening at the right time or might be missing edge cases.

### 3. Bidirectional Connection Logic
The system that creates both directions of a connection might be creating duplicates if called multiple times.

### 4. Database Constraint Issues
Missing unique constraints on the connections table could allow duplicate entries.

## Suggested Investigation Steps

1. **Add Logging**: Enhance connection generation with detailed logging to track when and why connections are created
2. **Database Analysis**: Run queries to identify duplicate connections and their creation patterns
3. **State Verification**: Add assertions to verify room visit states before allowing generation
4. **Unique Constraints**: Add database constraints to prevent duplicate connections at the schema level

## Impact

**Player Experience**: Breaks immersion and spatial consistency  
**Game Design**: Undermines the core visit-to-lock mechanism  
**World Building**: Creates confusing and unpredictable world layouts  
**Technical Debt**: Indicates potential issues with state management and generation logic  

## Related Systems

- Background room generation (`src/services/backgroundGenerationService.ts`)
- Room visit tracking in GameController
- Connection creation and bidirectional linking
- Database schema and constraints for connections table

## Success Metrics

- Zero duplicate connections in the database
- Consistent room layouts across multiple visits
- Proper respect for `generation_processed` flags
- No new connections generated from visited rooms

---

**Investigation Priority**: This should be addressed before implementing the region system, as it could compound the connection duplication issues and make debugging more complex.