# Inventory System

**Date**: 2025-08-20  
**Status**: In Progress - Phase 6 Complete  
**Priority**: Medium  
**Category**: Feature  

## Description

Implement a comprehensive inventory management system that allows players to carry, organize, and use items with weight-based encumbrance, item stacking, and intuitive commands for item manipulation.

## Details

**What is the requirement?**
Create an inventory system with the following features:

- **Item Storage**: Carry multiple items with organized display
- **Weight System**: Encumbrance based on Strength attribute
- **Item Commands**: Pick up, drop, examine, use item functionality
- **Item Stacking**: Similar items stack together (potions, coins, etc.)
- **Inventory Display**: Clear UI showing items, weight, and capacity
- **Item Categories**: Weapons, armor, consumables, misc items
- **Quick Access**: Shortcuts for commonly used items

**Acceptance criteria:**
- [x] Database schema for player inventory items (Phase 1 Complete)
- [ ] Simple item count limit system (Phase 7)
- [x] `inventory` command to display all carried items (Phase 5 Complete)
- [x] `pickup`/`get` commands to take items from environment (Phase 4 Complete)
- [x] `drop` command to place items in current room (Phase 6 Complete)
- [ ] `examine` command for detailed item inspection (Phase 9)
- [ ] `use` command for consumable items (Future)
- [ ] Item weight affects movement speed or other mechanics (Future)
- [ ] Clear feedback when inventory is full (Phase 7)

## Recent Updates

**2025-08-20**: ✅ **Phase 6: Drop Command Complete**
- Implemented `transferItemToRoom()` method in ItemService for moving items from inventory to room
- Added drop command to GameController with proper error handling and feedback
- Created comprehensive test coverage with 7 new tests covering all drop scenarios
- Supports stacking with existing room items and partial quantity drops
- Includes helpful error messages and item suggestions when commands fail
- All 353 tests passing, including new Phase 6 functionality

**2025-08-20**: ✅ **Iron Sword Seed Data Enhancement**
- Iron Sword now automatically placed in every new game's Grand Entrance Hall
- Players always have a starter item to test inventory system
- No more manual database manipulation needed for testing
- Enhanced player experience with consistent item availability

## Technical Notes

### Database Schema
```sql
CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL, -- weapon, armor, consumable, misc, quest
  weight REAL DEFAULT 0.0,
  value INTEGER DEFAULT 0, -- in copper pieces
  stackable BOOLEAN DEFAULT FALSE,
  max_stack INTEGER DEFAULT 1,
  use_effect TEXT, -- JSON effect for consumables
  weapon_damage TEXT, -- e.g., '1d6+1'
  armor_rating INTEGER DEFAULT 0,
  attribute_bonuses TEXT, -- JSON attribute modifiers
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE character_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  equipped BOOLEAN DEFAULT FALSE,
  equipped_slot TEXT, -- weapon, armor, accessory
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE room_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);
```

### Item Count Limits
```typescript
// Simple item count system
const getMaxInventoryItems = (): number => {
  return parseInt(process.env.MAX_INVENTORY_ITEMS || '10');
};

// Check if inventory has room for more items
const canAddItemToInventory = (currentItemCount: number): boolean => {
  return currentItemCount < getMaxInventoryItems();
};

// Get inventory status
const getInventoryStatus = (currentItemCount: number): string => {
  const maxItems = getMaxInventoryItems();
  return `Items: ${currentItemCount}/${maxItems}`;
};
```

### Item Commands Implementation
```typescript
// Core inventory commands
'pickup <item>': async (itemName: string) => {
  // Find item in current room
  // Check item count limits
  // Transfer item to inventory
  // Stack if stackable
};

'drop <item>': async (itemName: string) => {
  // Find item in inventory
  // Transfer to current room
  // Handle quantity for stackable items
};

'inventory': async () => {
  // Display organized item list
  // Show item count and limit
  // Group by item type
};

'examine <item>': async (itemName: string) => {
  // Show detailed item information
  // Display stats, effects, value
};

'use <item>': async (itemName: string) => {
  // Apply item effects
  // Remove consumable items
  // Handle cooldowns/restrictions
};
```

### Inventory Display Format
```
┌─ INVENTORY ─────────────────────────────────────┐
│ Items: 7/10                                     │
├─────────────────────────────────────────────────┤
│ WEAPONS                                         │
│ • Iron Sword - 1d8+1 damage                   │
│ • Wooden Bow - 1d6 damage, ranged             │
│                                                 │
│ ARMOR                                           │
│ • Leather Armor - +2 AC                       │
│                                                 │
│ CONSUMABLES                                     │
│ • Health Potion x3                             │
│ • Bread Ration x5                              │
│                                                 │
│ MISCELLANEOUS                                   │
│ • Ancient Key                                   │
│ • Gold Coins x47                               │
└─────────────────────────────────────────────────┘
```

### Implementation Areas
- **Inventory Service**: Manage item storage and count limitations
- **Item Database**: Predefined and AI-generated items
- **Command System**: New inventory-related commands
- **UI Integration**: Inventory display in game interface
- **Room Integration**: Items can be placed and found in rooms
- **Environment Configuration**: MAX_INVENTORY_ITEMS setting

## Related

- Dependencies: Environment configuration system
- Enables: Equipment System, Trading System, Item Discovery
- Integration: Room system for item placement
- Future: Containers (bags, chests), item durability
- References: `specs/rpg-systems-comprehensive.md` Inventory and Equipment section

## Environment Configuration

```bash
# Maximum number of items a player can carry (default: 10)
MAX_INVENTORY_ITEMS=10
```