# Target Disambiguation Service Comprehensive Specification

**Created**: 2025-08-24  
**Based on**: issues/2025-08-24-target-disambiguation-service.md  
**Status**: Implementation Ready

## Overview

This specification outlines the implementation of a centralized Target Disambiguation Service that handles target resolution for all game commands, with comprehensive support for "all" targets and consistent disambiguation logic across the entire command system.

## Current State Analysis

### Problems with Current Architecture

The current implementation has each command handler performing its own target resolution:

```typescript
// Anti-pattern: Duplicate logic in every handler
async handlePickup(itemName: string) {
  const cleanItemName = stripArticles(itemName);
  const roomItems = await this.itemService.getRoomItems(roomId);
  const targetItem = roomItems.find(item => 
    item.name.toLowerCase().includes(cleanItemName.toLowerCase())
  );
  // ... duplicate logic across all handlers
}
```

**Problems:**
- Target resolution logic duplicated across 8+ command handlers
- Inconsistent matching behavior between commands
- Limited "all" support (only `pickup all` implemented)
- Violates DRY principle and PARSING.md architecture philosophy
- Each handler must understand game context and entity relationships

### Current "All" Target Implementation

Only `pickup all` is currently supported with a hardcoded check:

```typescript
// In GameController.ts - current pickup command
handler: async (args) => {
  if (args.length === 1 && args[0].toLowerCase() === 'all') {
    await this.handlePickupAll();
  } else {
    await this.handlePickup(args.join(' '));
  }
}
```

This approach doesn't scale and requires duplication for each command that needs "all" support.

## Target Architecture

### Core Components

#### 1. Target Context Definition

```typescript
enum TargetContext {
  ROOM_ITEMS = 'room_items',           // Items available for pickup in current room
  INVENTORY_ITEMS = 'inventory_items', // Items in player's inventory for dropping/giving
  ROOM_CHARACTERS = 'room_characters', // NPCs and characters for interaction
  ANY_ENTITY = 'any_entity',          // Flexible context for examine, attack, etc.
  MIXED_CONTEXT = 'mixed_context'      // For commands like "give all to X"
}
```

#### 2. Resolved Target Interface

```typescript
interface ResolvedTarget {
  id: string;                    // Unique entity identifier
  name: string;                  // Display name for user feedback
  type: EntityType;              // Type classification
  entity: GameEntity;            // The actual game object
  location: EntityLocation;      // Where the entity is located
  metadata?: TargetMetadata;     // Additional context information
}

enum EntityType {
  ITEM = 'item',
  CHARACTER = 'character', 
  EXIT = 'exit',
  FEATURE = 'feature'
}

enum EntityLocation {
  ROOM = 'room',
  INVENTORY = 'inventory',
  EQUIPPED = 'equipped'
}

interface TargetMetadata {
  canPickup?: boolean;
  canDrop?: boolean;
  canGive?: boolean;
  canExamine?: boolean;
  isFixed?: boolean;
  isHostile?: boolean;
}
```

#### 3. Enhanced Command Definition

```typescript
interface EnhancedCommand {
  name: string;
  description: string;
  targetContext: TargetContext;
  supportsAll: boolean;
  requiresTarget: boolean;
  maxTargets?: number;
  handler: (targets: ResolvedTarget[], context: GameContext) => Promise<void>;
}
```

## Implementation Plan

### Phase 1: Core Service Creation (4 hours)

#### Step 1.1: Create Target Resolution Service
- [ ] **Create** `src/services/targetResolutionService.ts`
- [ ] **Define** core interfaces in `src/types/targetResolution.ts`
- [ ] **Implement** `TargetResolutionService` class with core methods

```typescript
class TargetResolutionService {
  constructor(
    private itemService: ItemService,
    private characterService: CharacterService,
    private gameStateManager: GameStateManager
  ) {}

  /**
   * Main resolution method - handles both single targets and "all"
   */
  async resolveTargets(
    targetInput: string,
    context: TargetContext,
    gameContext: GameContext
  ): Promise<ResolvedTarget[]>

  /**
   * Resolve "all" targets based on context
   */
  private async resolveAllTargets(
    context: TargetContext,
    gameContext: GameContext
  ): Promise<ResolvedTarget[]>

  /**
   * Resolve single target with partial matching and article stripping
   */
  private async resolveSingleTarget(
    targetName: string,
    context: TargetContext,
    gameContext: GameContext
  ): Promise<ResolvedTarget | null>

  /**
   * Get all entities for a given context
   */
  private async getEntitiesForContext(
    context: TargetContext,
    gameContext: GameContext
  ): Promise<GameEntity[]>
}
```

#### Step 1.2: Implement Core Resolution Logic
- [ ] **Implement** `resolveTargets()` main method
- [ ] **Add** "all" keyword detection and handling
- [ ] **Integrate** existing `stripArticles()` utility
- [ ] **Implement** partial name matching logic

#### Step 1.3: Context-Specific Entity Retrieval
- [ ] **Implement** `ROOM_ITEMS` context resolution
- [ ] **Implement** `INVENTORY_ITEMS` context resolution  
- [ ] **Implement** `ROOM_CHARACTERS` context resolution
- [ ] **Implement** `ANY_ENTITY` context resolution

### Phase 2: "All" Target Resolution (3 hours)

#### Step 2.1: All Targets Implementation
- [ ] **Implement** `resolveAllTargets()` for each context type
- [ ] **Add** filtering logic (exclude fixed items, hostile characters blocking, etc.)
- [ ] **Handle** empty result scenarios appropriately

#### Step 2.2: Context-Specific All Resolution
- [ ] **`ROOM_ITEMS` all**: Return all non-fixed items in current room
- [ ] **`INVENTORY_ITEMS` all**: Return all items in player inventory
- [ ] **`ROOM_CHARACTERS` all**: Return all NPCs in current room
- [ ] **`ANY_ENTITY` all**: Return all examinable entities (items + characters + exits)

#### Step 2.3: All Target Filtering
- [ ] **Filter fixed items** from pickup operations
- [ ] **Apply hostile character blocking** rules for Vault Key
- [ ] **Handle equipped items** appropriately for drop operations
- [ ] **Respect item constraints** (can't give, can't drop, etc.)

### Phase 3: Command Router Integration (2 hours)

#### Step 3.1: Enhanced Command Registration
- [ ] **Update** `Command` interface to include target context
- [ ] **Modify** `addGameCommand()` to accept enhanced command definition
- [ ] **Update** existing command registrations with context information

#### Step 3.2: Command Processing Pipeline Update
- [ ] **Modify** `processCommand()` to include target resolution phase
- [ ] **Add** target resolution before handler execution
- [ ] **Implement** error handling for target not found scenarios

```typescript
// Enhanced processCommand method
async processCommand(input: string, context: CommandExecutionContext): Promise<boolean> {
  const parsed = this.parseCommand(input);
  const command = this.getCommand(parsed.verb);
  
  if (!command) return false;

  // NEW: Target resolution phase
  if (command.requiresTarget && !parsed.target) {
    this.showTargetRequiredError(command.name);
    return false;
  }

  let resolvedTargets: ResolvedTarget[] = [];
  if (parsed.target) {
    resolvedTargets = await this.targetResolver.resolveTargets(
      parsed.target,
      command.targetContext,
      context.gameContext
    );

    if (resolvedTargets.length === 0 && command.requiresTarget) {
      this.showTargetNotFoundError(parsed.target);
      return false;
    }
  }

  // Execute handler with resolved targets
  await command.handler(resolvedTargets, context.gameContext);
  return true;
}
```

#### Step 3.3: Input Parsing Enhancement  
- [ ] **Improve** command parsing to separate verb from targets
- [ ] **Handle** complex commands like "give all to merchant"
- [ ] **Preserve** existing exact command matching as primary path

### Phase 4: Command Handler Migration (3 hours)

#### Step 4.1: Update Pickup Command
- [ ] **Modify** pickup command registration to use target context
- [ ] **Refactor** `handlePickup()` to accept resolved targets
- [ ] **Remove** duplicate target resolution logic
- [ ] **Ensure** "pickup all" continues to work

#### Step 4.2: Update Drop Command  
- [ ] **Add** "drop all" support using `INVENTORY_ITEMS` context
- [ ] **Refactor** `handleDrop()` to accept resolved targets
- [ ] **Remove** duplicate target resolution logic

#### Step 4.3: Update Give Command
- [ ] **Implement** mixed context resolution for "give all to X"
- [ ] **Refactor** `handleGiveCommand()` to use resolved targets
- [ ] **Preserve** existing give validation and effect triggering

#### Step 4.4: Update Other Commands
- [ ] **Refactor** `handleExamine()` to use resolved targets
- [ ] **Update** attack, talk, and other commands
- [ ] **Maintain** backward compatibility throughout migration

### Phase 5: Testing and Validation (2 hours)

#### Step 5.1: Unit Tests for Target Resolution
- [ ] **Create** `tests/services/targetResolutionService.test.ts`
- [ ] **Test** single target resolution for each context
- [ ] **Test** "all" target resolution for each context
- [ ] **Test** partial name matching and article stripping
- [ ] **Test** edge cases (empty contexts, invalid targets)

#### Step 5.2: Integration Tests
- [ ] **Create** `tests/integration/targetResolution.test.ts`
- [ ] **Test** end-to-end command processing with resolved targets
- [ ] **Test** multi-target command execution
- [ ] **Test** error handling and fallback scenarios

#### Step 5.3: Command-Specific Tests
- [ ] **Test** "pickup all" behavior preservation
- [ ] **Test** "drop all" new functionality
- [ ] **Test** "give all to X" implementation
- [ ] **Test** examine, attack, and other commands

## Detailed Implementation Examples

### Example 1: Single Target Resolution

```typescript
// Input: "pickup rusty sword"
const targets = await targetResolver.resolveTargets(
  'rusty sword',
  TargetContext.ROOM_ITEMS,
  gameContext
);

// Results in:
[{
  id: 'item_123',
  name: 'Rusty Iron Sword',
  type: EntityType.ITEM,
  entity: RoomItem { item: Item { name: 'Rusty Iron Sword', ... }, ... },
  location: EntityLocation.ROOM,
  metadata: { canPickup: true, isFixed: false }
}]
```

### Example 2: All Targets Resolution

```typescript
// Input: "pickup all"
const targets = await targetResolver.resolveTargets(
  'all',
  TargetContext.ROOM_ITEMS,
  gameContext
);

// Results in:
[
  { id: 'item_123', name: 'Rusty Iron Sword', ... },
  { id: 'item_456', name: 'Health Potion', ... },
  { id: 'item_789', name: 'Ancient Key', ... }
  // Fixed items filtered out
  // Hostile-character-blocked items filtered out
]
```

### Example 3: Mixed Context Resolution

```typescript
// Input: "give all to merchant"
// First resolve inventory items, then resolve character
const inventoryTargets = await targetResolver.resolveTargets(
  'all',
  TargetContext.INVENTORY_ITEMS,
  gameContext
);

const characterTargets = await targetResolver.resolveTargets(
  'merchant',
  TargetContext.ROOM_CHARACTERS,
  gameContext
);
```

### Example 4: Enhanced Command Handler

```typescript
// Before: Complex target resolution in handler
async handlePickup(itemName: string): Promise<void> {
  const cleanItemName = stripArticles(itemName);
  const currentRoom = await this.gameStateManager.getCurrentRoom();
  const roomItems = await this.itemService.getRoomItems(currentRoom.id);
  
  let targetItem = roomItems.find(item => 
    item.item.name.toLowerCase().includes(cleanItemName.toLowerCase())
  );
  
  if (!targetItem) {
    // Try partial matching...
    // Handle articles...
    // Check for fixed items...
    // Apply hostile character blocking...
  }
  // ... lots of complex logic
}

// After: Clean handler with resolved targets
async handlePickup(targets: ResolvedTarget[]): Promise<void> {
  const characterId = await this.getCurrentCharacterId();
  
  for (const target of targets) {
    if (!target.metadata?.canPickup) {
      this.tui.display(`You can't pick up ${target.name}.`, MessageType.ERROR);
      continue;
    }
    
    await this.itemService.moveItemToInventory(target.entity.item_id, characterId);
    this.tui.display(`You picked up ${target.name}.`, MessageType.NORMAL);
    
    // Trigger pickup events
    await this.eventTriggerService.triggerItemEvent(
      'pickup',
      { itemId: target.entity.item_id }
    );
  }
}
```

## Command Mapping and Context Assignment

### Target Context Assignment by Command

| Command | Target Context | Supports All | Max Targets | Notes |
|---------|---------------|--------------|-------------|--------|
| pickup  | ROOM_ITEMS    | ✅ Yes       | Unlimited   | Existing "all" support |
| drop    | INVENTORY_ITEMS| ✅ Yes      | Unlimited   | New "all" support |
| give    | MIXED_CONTEXT | ✅ Yes       | Unlimited   | "give all to X" |
| examine | ANY_ENTITY    | ✅ Yes       | Unlimited   | Examine everything |
| attack  | ROOM_CHARACTERS| ❌ No       | 1           | Single target combat |
| talk    | ROOM_CHARACTERS| ❌ No       | 1           | Single conversation |
| use     | INVENTORY_ITEMS| ❌ No       | 1           | Single item usage |
| equip   | INVENTORY_ITEMS| ❌ No       | 1           | Single equipment |

### All Target Resolution by Context

| Context | "all" Resolves To | Filtering Applied |
|---------|-------------------|-------------------|
| ROOM_ITEMS | All items in current room | Exclude fixed items, apply hostile blocking |
| INVENTORY_ITEMS | All items in player inventory | Exclude equipped items if inappropriate |
| ROOM_CHARACTERS | All NPCs in current room | Include only interactable characters |
| ANY_ENTITY | Items + Characters + Exits | Context-appropriate filtering |

## Error Handling and Edge Cases

### Error Scenarios

1. **No targets found**: "There is no 'mysterious orb' here."
2. **Empty all context**: "There are no items here to pick up."  
3. **Target not in context**: "You don't have any 'sword' to drop."
4. **Multiple ambiguous matches**: Present options or take best match
5. **Invalid all context**: Commands that don't support "all"

### Resolution Priority Order

1. **Exact name match** (case-insensitive)
2. **Partial name match** (contains, case-insensitive)  
3. **Article-stripped match** (with article parsing)
4. **Fuzzy matching** (future enhancement)

## Benefits and Success Metrics

### Immediate Benefits
- **Code Reduction**: Eliminate ~200 lines of duplicate resolution code
- **Consistency**: Identical behavior across all commands  
- **Feature Completeness**: "All" support for drop, give, examine commands
- **Maintainability**: Single place to improve target resolution

### Success Metrics
- [ ] All existing command functionality preserved
- [ ] "pickup all", "drop all", "give all to X" commands working
- [ ] Zero duplicate target resolution code in handlers
- [ ] All tests passing with improved coverage
- [ ] Performance maintained or improved (cached lookups)

## Migration Strategy and Backward Compatibility

### Compatibility Guarantees
- All existing commands continue to work identically
- Existing "pickup all" behavior preserved exactly
- No changes to user-visible command syntax
- All existing tests continue to pass

### Migration Approach
1. **Phase-by-phase migration** of commands
2. **Feature flag support** for gradual rollout
3. **Parallel implementation** during transition
4. **Comprehensive testing** at each phase
5. **Rollback capability** if issues discovered

## Future Enhancements

### Advanced Features (Post-MVP)
- **Smart disambiguation**: AI-powered ambiguous target resolution
- **Context learning**: System learns user preferences for ambiguous cases
- **Complex all patterns**: "pickup all except sword", "give all weapons to guard"
- **Conditional targeting**: "attack all hostile characters"
- **Performance optimization**: Cached entity lookups, batch operations

### Integration Opportunities
- **Natural Language Processing**: Integrate with AI command disambiguation
- **Quest System**: Context-aware quest item handling
- **Trading System**: Bulk item trading operations
- **Combat System**: Multi-target combat commands

This comprehensive specification provides a complete roadmap for implementing the Target Disambiguation Service with full "all" target support while maintaining backward compatibility and following established architecture principles.