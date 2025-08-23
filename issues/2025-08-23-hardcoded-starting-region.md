# Hardcoded Starting Region

**Date**: 2025-08-23  
**Status**: Completed  
**Priority**: High  
**Category**: Feature  

## Description

Replace dynamic starter room generation with a hardcoded 12-room monastery region containing a guardian, key, and locked exit.

## Details

- Create "The Forsaken Monastery" as Region 1 with 12 interconnected rooms
- Add Stone Sentinel enemy in Room 11 (Meditation Chamber) 
- Enemy blocks access to Vault Key until defeated
- Room 12 (Vault Door) has locked connection requiring Vault Key
- Rooms have multiple connections for non-linear exploration

**Acceptance Criteria:**
- [x] New games start with 12 monastery rooms instead of 6 generated rooms
- [x] Stone Sentinel enemy blocks Vault Key pickup until defeated
- [x] Simple attack command can defeat enemy
- [x] Vault Key unlocks exit connection to future Region 2
- [x] All 12 rooms are interconnected with multiple paths

## Technical Notes

- Modify `createGameWithRooms()` in initDb.ts to create full monastery
- Place Stone Sentinel enemy in Meditation Chamber with Vault Key
- Implement key blocking mechanic when hostile characters present
- Create locked connection with `to_room_id = NULL` for future expansion
- Use existing combat system to defeat enemy

## Related

- Builds on locked connections feature
- First step toward region-based world generation
- References: `src/utils/initDb.ts`, `src/gameController.ts`