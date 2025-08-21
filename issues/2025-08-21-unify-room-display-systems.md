# Unify Duplicate Room Display Systems

**Created**: 2025-08-21  
**Priority**: Medium  
**Category**: Technical Debt / Architecture  
**Estimated Effort**: 4-6 hours  

## Problem Summary

The codebase currently has **two separate room display systems** that duplicate logic and require double implementation of every room-related feature:

1. **GameController** (`src/gameController.ts`) - Interactive TUI mode
2. **SessionInterface** (`src/sessionInterface.ts`) - Command-line `--cmd` mode

This architectural duplication creates maintenance burden, inconsistency risk, and forces every new feature to be implemented twice.

## Evidence of the Problem

**Example: AI Character Generation Feature**
When adding character display to rooms, the implementation had to be duplicated:

```typescript
// GameController (lines 750-769)
const roomCharacters = await this.characterService.getRoomCharacters(room.id, CharacterType.PLAYER);
if (roomCharacters.length > 0) {
  this.tui.display('Characters present:', MessageType.SYSTEM);
  // ... display logic
}

// SessionInterface (lines 213-225 AND 269-281) - DUPLICATED!
const roomCharacters = await characterService.getRoomCharacters(room.id, 'player');
if (roomCharacters.length > 0) {
  console.log('Characters present:');
  // ... same logic, different output
}
```

## Current Duplication Points

### Room Display Logic
- **GameController**: `lookAround()` method (line 737)
- **SessionInterface**: "look" command handler (line 211) + "go" command (line 267)

### Output Systems
- **GameController**: Uses `this.tui.displayRoom()` and `this.tui.display()`
- **SessionInterface**: Uses `roomDisplayService.displayRoom()` and `console.log()`

### Feature Implementation
- Items display: Duplicated between both systems
- Characters display: **Just duplicated** in both systems  
- Exit formatting: Different implementations
- Error handling: Separate approaches

## Root Cause Analysis

### Historical Development
1. **SessionInterface** created for automation/testing needs
2. **GameController** built for interactive user experience  
3. **No architectural planning** for shared components
4. **Different teams/timelines** led to parallel development

### Technical Debt Accumulation
- Each new room feature requires double implementation
- Bug fixes must be applied in two places
- Testing complexity doubled
- Code review burden increased

## Proposed Solution

### Phase 1: Create Unified Room Display Service

```typescript
// New: src/services/unifiedRoomDisplayService.ts
interface OutputInterface {
  display(message: string, type?: MessageType): void;
  displayRoom(name: string, description: string, exits: string[]): void;
}

class UnifiedRoomDisplayService {
  async displayRoomComplete(
    roomId: number, 
    gameId: number, 
    outputInterface: OutputInterface,
    services: {
      itemService: ItemService;
      characterService: CharacterService;
      gameStateManager: GameStateManager;
    }
  ): Promise<void> {
    // Single implementation for:
    // - Room name/description/exits
    // - Items in room  
    // - Characters in room
    // - Any future room features
  }
}
```

### Phase 2: Create Output Interface Adapters

```typescript
// TUI Adapter for GameController
class TUIOutputAdapter implements OutputInterface {
  constructor(private tui: TUIInterface) {}
  display(message: string, type?: MessageType) {
    this.tui.display(message, type || MessageType.NORMAL);
  }
  displayRoom(name: string, description: string, exits: string[]) {
    this.tui.displayRoom(name, description, exits);
  }
}

// Console Adapter for SessionInterface  
class ConsoleOutputAdapter implements OutputInterface {
  display(message: string) {
    console.log(message);
  }
  displayRoom(name: string, description: string, exits: string[]) {
    // Format for console output
    console.log(`\n${name}\n${'='.repeat(name.length)}`);
    console.log(description);
    if (exits.length > 0) {
      console.log(`\nExits: ${exits.join(', ')}`);
    }
  }
}
```

### Phase 3: Refactor Both Systems

```typescript
// GameController - Replace lookAround() method
async lookAround() {
  const adapter = new TUIOutputAdapter(this.tui);
  await this.unifiedRoomDisplay.displayRoomComplete(
    this.gameStateManager.getCurrentSession().roomId!,
    this.gameStateManager.getCurrentSession().gameId!,
    adapter,
    { itemService: this.itemService, characterService: this.characterService, gameStateManager: this.gameStateManager }
  );
}

// SessionInterface - Replace look and go command handlers
const adapter = new ConsoleOutputAdapter();
await unifiedRoomDisplay.displayRoomComplete(roomId, gameId, adapter, services);
```

## Benefits

### Immediate
- **Single source of truth** for room display logic
- **Consistent behavior** between interactive and command modes
- **Easier feature development** - implement once, works everywhere

### Long-term  
- **Reduced maintenance burden** - bugs fixed in one place
- **Better test coverage** - test core logic once
- **Architectural clarity** - clear separation of concerns

## Implementation Strategy

### Step 1: Analysis (1 hour)
- Map all current room display locations
- Identify all duplicated logic patterns
- Document current behavior differences

### Step 2: Create Unified Service (2 hours)
- Build UnifiedRoomDisplayService with output interfaces
- Implement all current features (room, items, characters)
- Create comprehensive unit tests

### Step 3: Create Adapters (1 hour)
- Build TUIOutputAdapter for GameController
- Build ConsoleOutputAdapter for SessionInterface
- Ensure feature parity with current implementations

### Step 4: Refactor Systems (1-2 hours)
- Replace GameController lookAround() method
- Replace SessionInterface look/go command handlers
- Update any other room display call sites

### Step 5: Testing & Validation (30 minutes)
- Manual testing of both interactive and command modes
- Verify all existing functionality preserved
- Run full test suite to ensure no regressions

## Success Criteria

- [ ] **Single implementation** of room display logic
- [ ] **Identical output** between old and new systems
- [ ] **All tests pass** after refactoring
- [ ] **No behavior changes** for end users
- [ ] **Future features** only need single implementation
- [ ] **Code coverage** maintained or improved

## Dependencies

- None - this is pure refactoring with no external dependencies

## Risk Assessment

**Low Risk** - This is internal refactoring with no external API changes:
- Output behavior remains identical
- Feature set unchanged
- Comprehensive testing possible
- Easy to rollback if issues discovered

## Future Considerations

This unified system will make future room-related features much easier:
- **Quest markers** in rooms
- **Dynamic lighting** descriptions  
- **Weather effects** on room descriptions
- **Interactive objects** beyond items/characters
- **Room states** (locked, damaged, etc.)

All of these will automatically work in both interactive and command modes once the unified system is in place.