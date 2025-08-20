# Inventory System

**Date**: 2025-08-20  
**Status**: In Progress - Phase 1 Complete  
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
- [ ] Weight calculation and carrying capacity limits
- [ ] `inventory` command to display all carried items
- [ ] `pickup`/`get` commands to take items from environment
- [ ] `drop` command to place items in current room
- [ ] `examine` command for detailed item inspection
- [ ] `use` command for consumable items
- [ ] Item weight affects movement speed or other mechanics
- [ ] Clear feedback when inventory is full or overweight

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

### Carrying Capacity
```typescript
// Carrying capacity calculation
const getCarryingCapacity = (strength: number): number => {
  const baseCapacity = 50; // pounds
  const strModifier = Math.floor((strength - 10) / 2);
  return baseCapacity + (strModifier * 10);
};

// Encumbrance levels
const getEncumbranceLevel = (currentWeight: number, maxCapacity: number): string => {
  const ratio = currentWeight / maxCapacity;
  if (ratio <= 0.5) return 'unencumbered';
  if (ratio <= 0.75) return 'lightly encumbered';
  if (ratio <= 1.0) return 'heavily encumbered';
  return 'overloaded';
};
```

### Item Commands Implementation
```typescript
// Core inventory commands
'pickup <item>': async (itemName: string) => {
  // Find item in current room
  // Check weight limits
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
  // Show weight and capacity
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
│ Weight: 23.5 / 70 lbs (Unencumbered)           │
├─────────────────────────────────────────────────┤
│ WEAPONS                                         │
│ • Iron Sword (2.5 lbs) - 1d8+1 damage         │
│ • Wooden Bow (1.5 lbs) - 1d6 damage, ranged   │
│                                                 │
│ ARMOR                                           │
│ • Leather Armor (8 lbs) - +2 AC               │
│                                                 │
│ CONSUMABLES                                     │
│ • Health Potion x3 (0.5 lbs each)             │
│ • Bread Ration x5 (0.2 lbs each)              │
│                                                 │
│ MISCELLANEOUS                                   │
│ • Ancient Key (0.1 lbs)                        │
│ • Gold Coins x47 (1.2 lbs)                    │
└─────────────────────────────────────────────────┘
```

### Implementation Areas
- **Inventory Service**: Manage item storage and weight calculations
- **Item Database**: Predefined and AI-generated items
- **Command System**: New inventory-related commands
- **UI Integration**: Inventory display in game interface
- **Room Integration**: Items can be placed and found in rooms

## Related

- Dependencies: Character Attributes System (Strength for carrying capacity)
- Enables: Equipment System, Trading System, Item Discovery
- Integration: Room system for item placement
- Future: Containers (bags, chests), item durability
- References: `specs/rpg-systems-comprehensive.md` Inventory and Equipment section