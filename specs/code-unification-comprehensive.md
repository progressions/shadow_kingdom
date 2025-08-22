# Code Unification Comprehensive Specification

**Created**: 2025-08-22  
**Based on**: issues/2025-08-21-unify-room-display-systems.md  
**Status**: Implementation Ready

## Overview

This specification outlines the step-by-step implementation to unify duplicate room display systems in the Shadow Kingdom codebase. The current architecture has two separate room display implementations that duplicate logic and require double implementation of every room-related feature.

## Problem Statement

The codebase currently has **two separate room display systems**:

1. **GameController** (`src/gameController.ts`) - Interactive TUI mode
2. **SessionInterface** (`src/sessionInterface.ts`) - Command-line `--cmd` mode

This creates maintenance burden, inconsistency risk, and forces every new feature to be implemented twice.

## Implementation Plan

### Phase 1: Analysis and Mapping (30 minutes)

#### Step 1.1: Identify All Room Display Locations
- [ ] **GameController**: Map all room display call sites
  - [ ] `lookAround()` method (line 737)
  - [ ] Any other room display locations
- [ ] **SessionInterface**: Map all room display call sites  
  - [ ] "look" command handler (line 211)
  - [ ] "go" command handler (line 267)
  - [ ] Any other room display locations

#### Step 1.2: Document Current Duplication Points
- [ ] **Room display logic** - Compare implementations
- [ ] **Character display** - Document both versions
- [ ] **Item display** - Document both versions  
- [ ] **Exit formatting** - Compare differences
- [ ] **Error handling** - Document different approaches

#### Step 1.3: Behavior Analysis
- [ ] **Test current GameController** room display behavior
- [ ] **Test current SessionInterface** room display behavior
- [ ] **Document any differences** in output format or content

### Phase 2: Create Unified Service (1.5 hours)

#### Step 2.1: Create Output Interface
- [ ] **Create** `src/interfaces/outputInterface.ts`
- [ ] **Define OutputInterface** with methods:
  - `display(message: string, type?: MessageType): void`
  - `displayRoom(name: string, description: string, exits: string[]): void`
- [ ] **Add MessageType enum** if not already available

#### Step 2.2: Create Unified Room Display Service
- [ ] **Create** `src/services/unifiedRoomDisplayService.ts`
- [ ] **Implement UnifiedRoomDisplayService** class with:
  - `displayRoomComplete()` method
  - Integration with existing services (ItemService, CharacterService, etc.)
  - Proper error handling
- [ ] **Extract common logic** from both existing implementations
- [ ] **Ensure all current features** are included:
  - Room name, description, exits
  - Items in room
  - Characters in room
  - Any other room-related displays

#### Step 2.3: Unit Tests for Unified Service
- [ ] **Create** `tests/services/unifiedRoomDisplayService.test.ts`
- [ ] **Test room display** with mock output interface
- [ ] **Test with items** in room
- [ ] **Test with characters** in room
- [ ] **Test with no items/characters**
- [ ] **Test error conditions**

### Phase 3: Create Output Adapters (45 minutes)

#### Step 3.1: TUI Output Adapter
- [ ] **Create** `src/adapters/tuiOutputAdapter.ts`
- [ ] **Implement TUIOutputAdapter** class
- [ ] **Integrate with existing TUI** interface
- [ ] **Preserve exact formatting** of current GameController output

#### Step 3.2: Console Output Adapter  
- [ ] **Create** `src/adapters/consoleOutputAdapter.ts`
- [ ] **Implement ConsoleOutputAdapter** class
- [ ] **Match exact formatting** of current SessionInterface output
- [ ] **Handle console.log formatting** correctly

#### Step 3.3: Adapter Tests
- [ ] **Create** `tests/adapters/tuiOutputAdapter.test.ts`
- [ ] **Create** `tests/adapters/consoleOutputAdapter.test.ts`
- [ ] **Test output formatting** matches existing behavior
- [ ] **Test edge cases** (empty strings, special characters, etc.)

### Phase 4: Refactor GameController (30 minutes)

#### Step 4.1: Update GameController Dependencies
- [ ] **Import UnifiedRoomDisplayService** and TUIOutputAdapter
- [ ] **Initialize services** in constructor
- [ ] **Update constructor types** if needed

#### Step 4.2: Replace lookAround() Method
- [ ] **Backup current implementation** (comment out)
- [ ] **Replace lookAround()** with unified service call
- [ ] **Create TUIOutputAdapter** instance
- [ ] **Call displayRoomComplete()** with proper parameters

#### Step 4.3: Test GameController Changes
- [ ] **Manual testing** of interactive mode
- [ ] **Verify identical output** to previous behavior
- [ ] **Test all room scenarios** (with/without items, characters, etc.)

### Phase 5: Refactor SessionInterface (30 minutes)

#### Step 5.1: Update SessionInterface Dependencies
- [ ] **Import UnifiedRoomDisplayService** and ConsoleOutputAdapter
- [ ] **Initialize services** in constructor or method scope
- [ ] **Update method signatures** if needed

#### Step 5.2: Replace Command Handlers
- [ ] **Backup current implementations** (comment out)
- [ ] **Replace "look" command handler** (line 211)
- [ ] **Replace "go" command handler** room display (line 267)
- [ ] **Create ConsoleOutputAdapter** instances
- [ ] **Call displayRoomComplete()** with proper parameters

#### Step 5.3: Test SessionInterface Changes
- [ ] **Manual testing** of command mode
- [ ] **Verify identical output** to previous behavior
- [ ] **Test all room scenarios** with --cmd flag

### Phase 6: Integration Testing (30 minutes)

#### Step 6.1: Cross-System Verification
- [ ] **Test same room** in both GameController and SessionInterface
- [ ] **Verify consistent content** (allowing for format differences)
- [ ] **Test edge cases** in both systems
- [ ] **Verify error handling** works in both systems

#### Step 6.2: Automated Test Suite
- [ ] **Run existing test suite**: `npm test`
- [ ] **Fix any broken tests** caused by refactoring
- [ ] **Add integration tests** if needed
- [ ] **Verify test coverage** maintained or improved

#### Step 6.3: End-to-End Testing
- [ ] **Test full game flow** in interactive mode
- [ ] **Test command-line operations**: `npm run dev -- --cmd "look"`
- [ ] **Test with different room types** (with items, characters, etc.)
- [ ] **Verify no regressions** in existing functionality

### Phase 7: Cleanup and Documentation (15 minutes)

#### Step 7.1: Remove Duplicate Code
- [ ] **Remove commented backup code** from GameController
- [ ] **Remove commented backup code** from SessionInterface
- [ ] **Clean up unused imports** 
- [ ] **Update any type definitions** if needed

#### Step 7.2: Update Tests
- [ ] **Remove/update tests** that tested the old duplicate logic
- [ ] **Ensure all tests pass** with new implementation
- [ ] **Add any missing test coverage** for new services

## Success Criteria

- [ ] **Single implementation** of room display logic in UnifiedRoomDisplayService
- [ ] **Identical output** between old and new systems (format may differ between TUI/console)
- [ ] **All existing tests pass** after refactoring
- [ ] **No behavior changes** for end users in either mode
- [ ] **Future features** only need single implementation in unified service
- [ ] **Code coverage** maintained or improved

## File Structure After Implementation

```
src/
├── interfaces/
│   └── outputInterface.ts          # New: Output abstraction
├── services/
│   └── unifiedRoomDisplayService.ts # New: Single room display logic
├── adapters/
│   ├── tuiOutputAdapter.ts         # New: TUI output formatting
│   └── consoleOutputAdapter.ts     # New: Console output formatting
├── gameController.ts               # Modified: Uses unified service
└── sessionInterface.ts             # Modified: Uses unified service

tests/
├── interfaces/
├── services/
│   └── unifiedRoomDisplayService.test.ts # New: Core logic tests
└── adapters/
    ├── tuiOutputAdapter.test.ts    # New: TUI adapter tests
    └── consoleOutputAdapter.test.ts # New: Console adapter tests
```

## Risk Mitigation

- **Backup strategy**: Comment out old code before deletion
- **Incremental testing**: Test each phase individually
- **Rollback plan**: Keep old implementations until full verification
- **Comprehensive testing**: Both manual and automated validation

## Benefits Achieved

### Immediate
- **Single source of truth** for room display logic
- **Consistent behavior** between interactive and command modes  
- **Easier feature development** - implement once, works everywhere

### Long-term
- **Reduced maintenance burden** - bugs fixed in one place
- **Better test coverage** - test core logic once
- **Architectural clarity** - clear separation of concerns

## Future Extensibility

The unified system will automatically support future room-related features:
- **Quest markers** in rooms
- **Dynamic lighting** descriptions
- **Weather effects** on room descriptions  
- **Interactive objects** beyond items/characters
- **Room states** (locked, damaged, etc.)

All of these will work in both interactive and command modes without duplication.