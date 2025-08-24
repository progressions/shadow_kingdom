# Target Disambiguation Service

## Issue Details

**Date**: 2025-08-24  
**Status**: Open  
**Priority**: High  
**Category**: Architecture  

## Description

Create a centralized Target Disambiguation Service that handles target resolution for all game commands, with special focus on "all" target support and consistent disambiguation logic across the entire command system.

## Details

**What is the problem/requirement?**
Currently, each command handler (pickup, drop, give, examine, etc.) implements its own target resolution logic, leading to:
- Duplicated disambiguation code across handlers
- Inconsistent behavior between commands
- Limited "all" target support (only "pickup all" is implemented)
- Violation of DRY principle and PARSING.md philosophy

**What should happen instead?**
Implement a centralized service that handles all target disambiguation before commands are executed, following the philosophy outlined in PARSING.md where "the command parser handles all disambiguation, and handlers receive clean, resolved targets."

## Core Requirements

### 1. **Centralized Target Resolution**
- Single service responsible for all target disambiguation
- Command handlers receive pre-resolved targets
- Consistent behavior across all commands

### 2. **Context-Aware "All" Target Support**
- `get all` → resolves to all items in room
- `drop all` → resolves to all items in inventory
- `give all to [character]` → resolves to all items in inventory
- `examine all` → resolves to all examinable entities in context

### 3. **Target Context Types**
Define specific contexts for different command types:
- `ROOM_ITEMS` - items available for pickup in current room
- `INVENTORY_ITEMS` - items in player's inventory for dropping/giving
- `ROOM_CHARACTERS` - NPCs and characters for interaction
- `ANY_ENTITY` - flexible context for commands like examine

### 4. **Enhanced Command Registration**
Commands specify their target requirements:
```typescript
commandRouter.addGameCommand({
  name: 'pickup',
  targetContext: TargetContext.ROOM_ITEMS,
  supportsAll: true,
  handler: async (targets: ResolvedTarget[]) => {...}
});
```

## Acceptance Criteria

- [ ] Create `TargetResolutionService` class with context-aware resolution
- [ ] Define `TargetContext` enum and `ResolvedTarget` interface
- [ ] Update `CommandRouter` to perform target resolution before handler execution
- [ ] Support "all" keyword resolution for appropriate command contexts
- [ ] Maintain existing article stripping and partial name matching
- [ ] Update command registration to include target context hints
- [ ] Refactor existing commands to use resolved targets
- [ ] Add comprehensive test coverage for all resolution scenarios
- [ ] Preserve backward compatibility during migration
- [ ] Document the new target resolution architecture

## Technical Implementation

### Core Architecture

```typescript
enum TargetContext {
  ROOM_ITEMS = 'room_items',
  INVENTORY_ITEMS = 'inventory_items', 
  ROOM_CHARACTERS = 'room_characters',
  ANY_ENTITY = 'any_entity'
}

interface ResolvedTarget {
  id: string;
  name: string;
  type: 'item' | 'character' | 'exit' | 'feature';
  entity: Item | Character | Connection | any;
  location: 'room' | 'inventory';
}

interface CommandDefinition {
  name: string;
  description: string;
  targetContext: TargetContext;
  supportsAll: boolean;
  handler: (targets: ResolvedTarget[], context: GameContext) => Promise<void>;
}
```

### Target Resolution Service

```typescript
class TargetResolutionService {
  async resolveTargets(
    targetInput: string, 
    context: TargetContext, 
    gameContext: GameContext
  ): Promise<ResolvedTarget[]>

  private async resolveAllTargets(
    context: TargetContext, 
    gameContext: GameContext
  ): Promise<ResolvedTarget[]>

  private async resolveSingleTarget(
    targetName: string,
    context: TargetContext,
    gameContext: GameContext  
  ): Promise<ResolvedTarget | null>
}
```

### Command Router Integration

```typescript
// Enhanced processCommand method
async processCommand(input: string, context: CommandExecutionContext): Promise<boolean> {
  const parsed = this.parseCommand(input);
  const command = this.getCommand(parsed.verb);
  
  if (!command) return false;
  
  // NEW: Target resolution phase
  const resolvedTargets = await this.targetResolver.resolveTargets(
    parsed.target,
    command.targetContext,
    context.gameContext
  );
  
  if (resolvedTargets.length === 0) {
    this.showTargetNotFoundError(parsed.target);
    return false;
  }
  
  // Execute handler with resolved targets
  await command.handler(resolvedTargets, context.gameContext);
  return true;
}
```

## Examples

### Current State (Anti-Pattern)
```typescript
// Each handler does its own resolution
async handlePickup(args: string[]) {
  const itemName = stripArticles(args.join(' '));
  const roomItems = await this.itemService.getRoomItems(roomId);
  const targetItem = roomItems.find(item => 
    item.name.toLowerCase().includes(itemName.toLowerCase())
  );
  // ... duplicate logic in every handler
}
```

### Target State (Correct Pattern)
```typescript
// Clean handler receives resolved targets
async handlePickup(targets: ResolvedTarget[]) {
  for (const target of targets) {
    await this.itemService.moveItemToInventory(target.entity.id);
    this.display(`You picked up ${target.name}.`);
  }
}
```

## Command Examples with "All" Support

### Pickup All
```
> pickup all
Resolves to: [sword, potion, key] (all room items)
Result: "You picked up Iron Sword. You picked up Health Potion. You picked up Ancient Key."
```

### Drop All  
```
> drop all
Resolves to: [sword, potion] (all inventory items)
Result: "You dropped Iron Sword. You dropped Health Potion."
```

### Give All
```
> give all to merchant
Resolves to: inventory=[sword, potion], character=[Merchant NPC]
Result: "You gave Iron Sword to Merchant. You gave Health Potion to Merchant."
```

### Examine All
```
> examine all
Resolves to: [sword, merchant, exit] (all examinable entities)
Result: Detailed descriptions of all entities in current context
```

## Implementation Phases

### Phase 1: Core Service Creation
- Create `TargetResolutionService` class
- Implement basic target resolution without "all" support
- Add unit tests for core resolution logic

### Phase 2: "All" Target Support  
- Implement context-aware "all" resolution
- Add support for different target contexts
- Test "all" resolution for each context type

### Phase 3: Command Router Integration
- Update `CommandRouter` to use target resolution
- Modify command registration to include context hints
- Add integration tests

### Phase 4: Command Migration
- Refactor existing commands (pickup, drop, give, examine)
- Ensure backward compatibility
- Update command handlers to use resolved targets

### Phase 5: Testing & Polish
- Comprehensive test coverage
- Performance optimization
- Documentation updates

## Benefits

### Immediate
- Eliminates duplicate target resolution code
- Consistent "all" target behavior across all commands
- Cleaner command handler implementation

### Long-term  
- Easy to add "all" support to any command
- Single place to improve disambiguation logic
- Foundation for advanced target resolution features
- Better maintainability and extensibility

## Dependencies

- Existing `ItemService`, `CharacterService`, `CommandRouter`
- Current article parsing utilities (`stripArticles`, `parseGiveCommand`)
- Game state management and context building

## Related Issues

- Complements `2025-08-20-ai-command-disambiguation.md` (natural language processing)
- Enables completion of `2025-08-22-give-all-command.md` 
- Supports future bulk action commands
- Aligns with architecture principles in `PARSING.md`

## Testing Strategy

### Unit Tests
- Target resolution for each context type
- "All" target resolution scenarios
- Partial name matching and article stripping
- Edge cases (empty contexts, invalid targets)

### Integration Tests  
- End-to-end command processing with resolved targets
- Multi-target command execution
- Error handling and fallback scenarios

### Test Cases
1. **Single target resolution**: `pickup sword` → resolves to specific sword
2. **All target resolution**: `pickup all` → resolves to all room items
3. **Context-specific all**: `drop all` → resolves to inventory items only
4. **Partial matching**: `get rusty` → resolves to "Rusty Sword"
5. **Article stripping**: `examine the ancient key` → resolves to "Ancient Key"
6. **No targets found**: `pickup nonexistent` → appropriate error message
7. **Multiple matches**: `get sword` with multiple swords → disambiguation
8. **Mixed contexts**: `give all to fred` → inventory items + character resolution