# Duplicate Room Generation Bug

**Status:** Open  
**Priority:** High  
**Category:** Bug / Room Generation  
**Found:** 2025-08-20  

## Problem Description

When moving in the same direction multiple times (e.g., typing "e" twice), the system generates different rooms for the same connection, creating duplicate/conflicting content.

## Reproduction Steps

1. Start a game session
2. From a room with an eastern exit, type `e` to go east
3. Immediately type `e` again (same direction)
4. System generates a second, different room for the same eastern connection

## Expected Behavior

- Going east from the same room should always lead to the same destination
- Once a connection is established, it should be persistent
- No duplicate room generation for existing connections

## Actual Behavior

Two different rooms are generated:

**First "e" command:**
```
Astral Reflecting Pool
======================
Emerging through the starlit eastern corridor, you find yourself standing at the edge of a serene reflecting pool...
Exits: across the rune-etched bridge (east), toward the shadowed celestial archway (north), along the moonlit garden path (south), back through the starlit eastern corridor (west)
```

**Second "e" command:**
```
Astral Balcony
==============
Emerging through the starlit eastern corridor, you step onto a sweeping balcony that overlooks the shadowy expanse...
Exits: toward the whispering tower spire (east), along the shadowed upper walkway (north), down the moonlit garden path (south), back through the starlit eastern corridor (west)
```

## Technical Analysis

**Root Cause**: Asynchronous room generation with poor user feedback

The system shows "Generating room..." but immediately returns to a command prompt, making users think the command failed. When they retry the same command, it creates a race condition where:

1. **First command**: Starts async room generation
2. **User sees prompt**: Thinks command failed, tries again  
3. **Second command**: Starts another async generation for same connection
4. **Both complete**: Last one wins, overwriting the first

This suggests issues with:
1. **User feedback**: No loading state or "please wait" indication
2. **Command queuing**: System accepts new commands while processing
3. **Race condition handling**: Multiple generations for same connection
4. **Async flow**: Poor UX during background operations

## Impact

- **High**: Breaks core game navigation consistency
- **User Experience**: Confusing and immersion-breaking
- **Data Integrity**: Creates orphaned rooms and invalid world state
- **Performance**: Unnecessary room generation and storage

## Affected Systems

- Room generation service
- Movement/navigation logic
- Connection management
- Database persistence layer

## Investigation Required

1. **UX Flow**: Review async feedback and loading states
2. **Command Queueing**: Implement command blocking during generation
3. **Race Condition**: Add connection locking/deduplication
4. **Database Transactions**: Ensure atomic connection creation
5. **Progress Indication**: Better user feedback during generation

## Potential Solutions

1. **Block subsequent commands** until current generation completes
2. **Show persistent loading indicator** instead of immediate prompt return
3. **Add connection existence checks** before starting generation
4. **Implement proper async/await flows** in the UI layer
5. **Add generation deduplication** to prevent duplicate work

## Notes

- Bug observed during real AI system usage while exploring regions
- Affects the core Grok AI generation system
- Long AI generation times make this more likely to occur
- Users naturally retry commands when they don't see immediate feedback
- This is an existing production bug, not related to mock AI system
- Needs immediate attention as it breaks fundamental game mechanics

---
*Reported by: User during region exploration*  
*Environment: Real AI system (Grok API)*