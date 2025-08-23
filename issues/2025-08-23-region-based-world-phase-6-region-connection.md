# Region-Based World Phase 6: Region Connection

**Date**: 2025-08-23  
**Status**: Open  
**Priority**: High  
**Category**: Feature/World System  

## Description

Connect Region 1's exit to Region 2's entrance, enabling natural progression between regions.

## Goal

Players can complete Region 1 (defeat guardian, get key) and progress to explore complete Region 2.

## Dependencies

- Phase 5: Database Region Instantiation (Region 2 must exist in database)

## Implementation

### Core Deliverable
- Connect the locked exit from Region 1 to Region 2's entrance room
- Modify locked connection in Region 1 to point to Region 2's first room
- Test complete progression flow: guardian → key → unlock → new region

### Connection Modification
```typescript
async connectRegions(fromRegionExitRoomId: number, toRegionEntranceRoomId: number): Promise<void> {
  // Update the locked connection in Region 1 to point to Region 2
  await this.db.run(
    'UPDATE connections SET to_room_id = ? WHERE from_room_id = ? AND locked = TRUE AND to_room_id IS NULL',
    [toRegionEntranceRoomId, fromRegionExitRoomId]
  );
}
```

### Integration Points
- **Region 1 exit**: Currently has locked connection with `to_room_id = NULL`
- **Region 2 entrance**: First room of newly generated region
- **Key mechanics**: Existing Vault Key from Region 1 should unlock progression
- **Connection naming**: Update connection name to reflect transition

### Progression Flow
1. Player defeats Stone Sentinel in Region 1 guardian room
2. Player picks up Vault Key from defeated guardian
3. Player goes to Region 1 exit (Vault Door)
4. Player uses Vault Key to unlock connection  
5. Player enters Region 2 and begins exploring new themed area

## Acceptance Criteria

- [x] Player can defeat Region 1 guardian and obtain Vault Key
- [x] Vault Key successfully unlocks exit from Region 1
- [x] Unlocked exit leads directly to Region 2's entrance room
- [x] Player can explore complete Region 2 (all 12 rooms accessible)
- [x] Region 2 has its own guardian, key, and locked exit
- [x] Progression feels natural and seamless
- [x] Both regions remain fully functional after connection

## Test Plan

### Complete Progression Test
- Start new game in Region 1
- Complete Region 1: defeat Stone Sentinel, get Vault Key
- Unlock exit with Vault Key and enter Region 2
- Explore all of Region 2, verify 12 rooms are accessible
- Find Region 2's guardian and verify it has different theme/key
- Verify Region 2's exit exists but is locked (leads nowhere for now)

### Connection Verification
- Verify connection points to correct room ID
- Test that key requirement works properly
- Check connection description makes sense
- Verify no other connections accidentally modified

### Data Integrity  
- Verify connection foreign keys are correct
- Check no duplicate connections created
- Test save/load works with connected regions
- Verify region themes are distinct and appropriate

## Game State Impact

**Major gameplay expansion** - Players can now progress through 2 complete themed regions (24 total rooms). Natural progression system established that will scale to infinite regions in later phases.

## Player Experience

Players will experience:
- Completion of tutorial/starter region (The Forsaken Monastery)
- Discovery of new themed region with fresh atmosphere and challenges
- Sense of progression and world expansion
- New guardian to defeat and new key to find in Region 2

## Next Phase

Phase 7 will add dynamic generation of Region 3 when player progresses to Region 2, creating infinite expandability.