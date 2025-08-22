# Hostile Character Blocking System

**Date**: 2025-08-22  
**Status**: ✅ Completed  
**Priority**: High  
**Category**: Feature  

## Description

Implement a system where hostile characters can block player movement from rooms, creating strategic gameplay where players must defeat or pacify enemies before escaping dangerous encounters.

## Details

**What is the requirement?**
Create a hostile character blocking system with the following features:

- **Hostility Flag**: Add `is_hostile` boolean to characters to mark those that block movement
- **Movement Validation**: Check for hostile characters before allowing player to leave room
- **Clear Feedback**: Display appropriate error messages when movement is blocked
- **Visual Indicators**: Show hostile status in room display with icons
- **Death State**: Dead hostile characters don't block movement
- **Default Behavior**: Enemies are hostile by default, NPCs are not

**Acceptance criteria:**
- [x] Database column `is_hostile` added to characters table
- [x] Character interface updated with hostility flag
- [x] Movement blocking logic implemented in GameController
- [x] Movement blocking logic implemented in SessionInterface
- [x] Character service methods for managing hostile characters
- [x] Visual indicators for hostile characters in room display
- [x] Enemies set as hostile by default during generation
- [x] Dead hostile characters don't block movement
- [x] Clear error messages when movement blocked
- [x] Comprehensive test coverage

## Implementation Summary

### Database Changes
- Added `is_hostile` BOOLEAN column to characters table with default FALSE
- Migration added to `initDb.ts` for existing databases

### Core Components Modified
1. **Character Type** (`src/types/character.ts`)
   - Added `is_hostile?: boolean` to Character interface
   - Added `is_hostile?: boolean` to CreateCharacterData interface

2. **Character Service** (`src/services/characterService.ts`)
   - Added `getHostileCharacters(roomId)` - Get all living hostile characters
   - Added `hasHostileCharacters(roomId)` - Quick check for hostiles
   - Added `setCharacterHostility(characterId, isHostile)` - Update hostility
   - Updated create to set hostility based on character type

3. **Movement Validation** 
   - **GameController** (`src/gameController.ts`): Checks for hostiles before movement
   - **SessionInterface** (`src/sessionInterface.ts`): Same validation for CLI mode
   - **GameStateManager** (`src/services/gameStateManager.ts`): Added `getCurrentRoomId()` method

4. **Display Enhancement** (`src/services/unifiedRoomDisplayService.ts`)
   - Shows ⚔️ icon for hostile characters
   - Shows 💀 icon for dead characters  
   - Shows 👤 icon for friendly NPCs

5. **Character Generation** (`src/services/characterGenerationService.ts`)
   - Enemies automatically set as hostile
   - NPCs default to non-hostile

### Testing
- Created comprehensive test suite in `tests/hostile-character-blocking.test.ts`
- 13 tests covering all aspects of the feature
- Updated existing tests to match new display format
- All 747 tests pass

### User Experience

**When hostile enemy present:**
```
You cannot flee! The Goblin Warrior blocks your path!
```

**Room display with hostile:**
```
Characters present:
👤 Garden Spirit
  A benevolent nature spirit that tends to the garden
⚔️ Goblin Warrior ⚔️ (hostile)
  A fierce goblin warrior with rusty armor
```

**Dead hostile (doesn't block):**
```
Characters present:
💀 Goblin Warrior 💀 (dead)
  A fierce goblin warrior with rusty armor
```

## Future Enhancements

- Combat system to defeat hostile characters
- Flee mechanics with Dexterity checks
- Directional blocking (hostiles block specific exits)
- Faction/reputation system for dynamic hostility
- Pacification options (diplomacy, stealth, items)

## Technical Notes

The system uses the character's `is_hostile` flag combined with `is_dead` status to determine blocking. Only living hostile characters block movement. The check happens before any movement processing, ensuring players get immediate feedback.

## Testing Instructions

1. Enter a room with a hostile enemy
2. Try to move in any direction
3. Movement should be blocked with clear message
4. Kill or pacify the enemy
5. Movement should now succeed

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>