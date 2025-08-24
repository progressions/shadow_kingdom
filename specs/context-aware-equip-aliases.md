# Context-Aware Equip Aliases Specification

## Overview

This specification defines the implementation of context-aware aliases for the equip command that provide more intuitive, natural language commands for players.

## Core Features

### Command Aliases
- **`wear`** - For armor-type items (helmets, boots, armor, shields, etc.)
- **`use`** - For weapon-type items (swords, axes, staves, daggers, etc.)

### Behavior
- Both aliases route to the existing `equip` command functionality
- Include context validation to prevent inappropriate usage
- Maintain existing `equip` command for all item types
- Support partial item name matching (same as existing equip)

## Implementation Components

### 1. Item Type Detection

#### Armor Detection
Items classified as armor if they match any of:
- **Type**: `armor`, `helmet`, `boots`, `gloves`, `shield`, `cloak`, `ring`, `amulet`
- **Name contains**: armor type keywords
- **Description contains**: `wear` or `armor` keywords

#### Weapon Detection  
Items classified as weapons if they match any of:
- **Type**: `weapon`, `sword`, `axe`, `bow`, `dagger`, `staff`, `mace`, `hammer`
- **Name contains**: weapon type keywords  
- **Description contains**: `weapon` or `wield` keywords

### 2. Command Handlers

#### `wear` Command
1. Find item in inventory by name (partial matching)
2. Validate item exists
3. Validate item is armor-type
4. Route to existing equip functionality

#### `use` Command  
1. Find item in inventory by name (partial matching)
2. Validate item exists
3. Validate item is weapon-type
4. Route to existing equip functionality

### 3. Error Messages

#### Item Not Found
- `"You don't have a {itemName}."`

#### Wrong Item Type for `wear`
- `"You can't wear a {itemName}. Try \"equip\" or \"use\" instead."`

#### Wrong Item Type for `use`
- `"You can't use a {itemName} as a weapon. Try \"equip\" or \"wear\" instead."`

## Test Scenarios

### Valid Usage Tests
1. **Armor Items**
   - `wear chain mail` → Equips Chain Mail
   - `wear boots` → Equips Leather Boots
   - `wear helmet` → Equips Iron Helmet

2. **Weapon Items**
   - `use sword` → Equips Iron Sword
   - `use staff` → Equips Wooden Staff
   - `use dagger` → Equips Ancient Dagger

### Context Validation Tests
1. **Wrong Context**
   - `wear sword` → Error: "You can't wear a Iron Sword..."
   - `use boots` → Error: "You can't use a Leather Boots as a weapon..."

2. **Missing Items**
   - `wear nonexistent` → Error: "You don't have a nonexistent."
   - `use missing` → Error: "You don't have a missing."

### Edge Cases
1. **Empty Commands**
   - `wear` (no args) → Command usage help
   - `use` (no args) → Command usage help

2. **Partial Name Matching**
   - `wear chain` → Matches "Chain Mail"
   - `use iron` → Matches "Iron Sword"

## Implementation Files

### Primary Changes
- **`src/gameController.ts`** - Add command registration and handlers
- **`src/services/itemService.ts`** - Add item type detection utilities

### Test Files
- **`tests/commands/context-aware-equip.test.ts`** - Unit tests
- **`tests/e2e/context-aware-equip.test.ts`** - End-to-end tests

## Command Help Integration

Update help system to include:
- `wear <item>` - Equip armor items (helmets, boots, armor, etc.)
- `use <item>` - Equip weapons (swords, axes, staves, etc.)

## Acceptance Criteria

- [ ] `wear` command only works for armor-type items
- [ ] `use` command only works for weapon-type items  
- [ ] Both commands route to existing equip functionality
- [ ] Appropriate error messages for wrong item types
- [ ] Help text updated to show new aliases
- [ ] Existing `equip` command continues to work for all item types
- [ ] Commands work with partial item names
- [ ] Unit tests cover all scenarios
- [ ] End-to-end tests verify complete functionality

## Future Extensions

This pattern could extend to other context-aware aliases:
- `drink` for potions
- `read` for books/scrolls
- `light` for torches/candles
- `throw` for projectiles