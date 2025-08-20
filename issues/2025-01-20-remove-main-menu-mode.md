# Remove Main Menu Mode and Convert to Adventure Commands

**Status:** Completed  
**Priority:** Medium  
**Type:** Refactoring  
**Created:** 2025-01-20

## Summary

Remove the dual-mode system (menu/game) and convert main menu commands (`new`, `load`, `delete`) into regular adventure mode commands. This will simplify the user interface and eliminate the complexity of managing two different interaction modes.

## Current State

The game currently operates in two modes:
- **Menu Mode**: Shows game list, allows creating/loading/deleting games
- **Adventure Mode**: Active gameplay with movement, examination, etc.

Users must switch between these modes, which creates UX friction and code complexity.

## Proposed Changes

### 1. Remove Menu Mode Infrastructure
- Remove `mode` field from game sessions
- Remove menu-specific command routing in `CommandRouter`
- Remove menu display logic in `TUIManager`
- Simplify `GameController` to single-mode operation

### 2. Convert Menu Commands to Adventure Commands
- **`new [game-name]`**: Create new game and start playing immediately
- **`load [game-name|game-id]`**: Load existing game 
- **`delete [game-name|game-id]`**: Delete game (with confirmation)
- **`games`**: List all available games
- **`save`**: Save current game progress

### 3. Startup Behavior
- If no games exist: Show welcome message and prompt to create first game
- If games exist: Auto-load most recently played game
- Always start in adventure mode

### 4. Game Management Integration
- Commands work from any room in any game
- Switching games preserves current room state
- Confirmation prompts for destructive operations

## Technical Implementation

### Files to Modify
- `src/gameController.ts`: Remove dual-mode logic
- `src/services/commandRouter.ts`: Convert menu commands to game commands  
- `src/services/gameStateManager.ts`: Simplify session management
- `src/ui/TUIManager.ts`: Remove menu display methods
- `src/sessionInterface.ts`: Update for single-mode operation

### Database Changes
- Remove `mode` from any session tracking
- Update game loading to be command-driven

### Command Examples
```
> new "Epic Adventure"
Creating new game "Epic Adventure"...
You find yourself in a dimly lit chamber...

> games
Available games:
1. Epic Adventure (current) - Last played: 2025-01-20
2. Shadow Quest - Last played: 2025-01-19  
3. Dungeon Crawler - Last played: 2025-01-18

> load "Shadow Quest"
Loading "Shadow Quest"...
You are standing in the town square...

> delete "Dungeon Crawler"
Are you sure you want to delete "Dungeon Crawler"? (yes/no)
> yes
Game "Dungeon Crawler" has been deleted.
```

## Benefits

1. **Simplified UX**: Single interface for all interactions
2. **Reduced Complexity**: Eliminate dual-mode state management
3. **Better Flow**: No context switching between menu and game
4. **Consistent Commands**: All commands work in same environment
5. **Easier Testing**: Single interaction pattern to test

## Backwards Compatibility

- Session interface commands remain the same
- Game data and saves are preserved
- Command-line arguments still work

## Testing Requirements

- Update all tests to expect single-mode operation
- Test game management commands in adventure context
- Verify startup behavior with/without existing games
- Test command-line game loading integration

## Acceptance Criteria

- [x] Menu mode completely removed from codebase
- [x] All menu commands converted to game commands  
- [x] Startup auto-loads most recent game or prompts for new game
- [x] Game management works seamlessly within adventure mode
- [x] All existing tests pass with single-mode operation
- [x] Session interface maintains compatibility

## Completion Summary (2025-01-20)

Successfully implemented all requirements:
- ✅ Removed Mode enum and dual-mode infrastructure
- ✅ Unified CommandRouter to single command system
- ✅ Converted new/load/delete to adventure mode commands
- ✅ Implemented timestamp-based automatic game naming
- ✅ Updated GameController for single-mode operation
- ✅ Fixed all test compilation and runtime issues
- ✅ Achieved 100% test suite pass rate (33/33 test suites passing)
- ✅ Maintained session interface compatibility

## Related Issues

- Relates to TUI implementation (2025-01-18-terminal-ui-interface.md)
- May simplify command routing and reduce duplication issues