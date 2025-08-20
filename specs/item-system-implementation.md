# Item System Implementation Specification

**Date**: 2025-08-20  
**Version**: 1.0  
**Status**: Implementation Plan  

## Overview

This specification outlines the detailed implementation plan for the Shadow Kingdom item system, broken down into 15 phases of atomic work units. Each phase is designed to be independently testable, functionally complete, and incrementally complex.

## Implementation Phases

### Phase 1: Database Foundation
**Objective**: Establish database schema and TypeScript types for items.

#### Step 1: Create item tables schema
- **File**: `src/utils/initDb.ts`
- **Action**: Add three new tables to database initialization
- **Tables**:
  ```sql
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL, -- weapon, armor, consumable, misc, quest
    weight REAL DEFAULT 0.0,
    value INTEGER DEFAULT 0, -- in copper pieces
    stackable BOOLEAN DEFAULT FALSE,
    max_stack INTEGER DEFAULT 1,
    weapon_damage TEXT, -- e.g., '1d6+1'
    armor_rating INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS character_inventory (
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

  CREATE TABLE IF NOT EXISTS room_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  );
  ```
- **Test**: Verify tables exist and have correct schema

#### Step 2: Create TypeScript interfaces
- **File**: `src/types/item.ts` (new file)
- **Interfaces**:
  ```typescript
  export enum ItemType {
    WEAPON = 'weapon',
    ARMOR = 'armor',
    CONSUMABLE = 'consumable',
    MISC = 'misc',
    QUEST = 'quest'
  }

  export interface Item {
    id: number;
    name: string;
    description: string;
    type: ItemType;
    weight: number;
    value: number;
    stackable: boolean;
    max_stack: number;
    weapon_damage?: string;
    armor_rating?: number;
    created_at: string;
  }

  export interface InventoryItem {
    id: number;
    character_id: number;
    item_id: number;
    item: Item;
    quantity: number;
    equipped: boolean;
    equipped_slot?: string;
    created_at: string;
  }

  export interface RoomItem {
    id: number;
    room_id: number;
    item_id: number;
    item: Item;
    quantity: number;
    created_at: string;
  }
  ```
- **Test**: Verify types compile correctly

#### Step 3: Create basic ItemService class
- **File**: `src/services/itemService.ts` (new file)
- **Class structure**:
  ```typescript
  import Database from '../utils/database';
  import { Item, InventoryItem, RoomItem } from '../types/item';

  export class ItemService {
    constructor(private db: Database) {}

    // Placeholder methods - will be implemented in later phases
    async createItem(item: Omit<Item, 'id' | 'created_at'>): Promise<number> {
      throw new Error('Not implemented');
    }

    async getItem(id: number): Promise<Item | null> {
      throw new Error('Not implemented');
    }

    async listItems(): Promise<Item[]> {
      throw new Error('Not implemented');
    }
  }
  ```
- **Test**: Verify class instantiates without errors

#### Step 4: Add test coverage
- **File**: `tests/services/itemService.test.ts` (new file)
- **Tests**:
  - Database schema creation
  - TypeScript interface compilation
  - ItemService instantiation
- **Test framework**: Jest (existing)

---

### Phase 2: Basic Item Management
**Objective**: Implement backend CRUD operations for items.

#### Step 5: Implement createItem method
- **File**: `src/services/itemService.ts`
- **Method**:
  ```typescript
  async createItem(item: Omit<Item, 'id' | 'created_at'>): Promise<number> {
    const result = await this.db.run(`
      INSERT INTO items (name, description, type, weight, value, stackable, max_stack, weapon_damage, armor_rating)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [item.name, item.description, item.type, item.weight, item.value, item.stackable, item.max_stack, item.weapon_damage, item.armor_rating]);
    
    return result.lastID!;
  }
  ```
- **Test**: Create item and verify it exists in database

#### Step 6: Implement getItem method
- **File**: `src/services/itemService.ts`
- **Method**:
  ```typescript
  async getItem(id: number): Promise<Item | null> {
    return await this.db.get<Item>('SELECT * FROM items WHERE id = ?', [id]);
  }
  ```
- **Test**: Retrieve existing and non-existing items

#### Step 7: Implement listItems method
- **File**: `src/services/itemService.ts`
- **Method**:
  ```typescript
  async listItems(): Promise<Item[]> {
    return await this.db.all<Item>('SELECT * FROM items ORDER BY name');
  }
  ```
- **Test**: List items when table is empty and populated

#### Step 8: Add seed items
- **File**: `src/utils/seedItems.ts` (new file)
- **Items to create**:
  - Iron Sword (weapon, 2.5 lbs, 1d8+1 damage)
  - Leather Armor (armor, 8 lbs, +2 AC)
  - Health Potion (consumable, 0.5 lbs, stackable)
  - Bread (consumable, 0.2 lbs, stackable)
  - Gold Coins (misc, 0.025 lbs each, stackable)
- **Integration**: Call from initDb.ts if items table is empty
- **Test**: Verify seed items exist after database initialization

#### Step 9: Add test coverage
- **Tests**:
  - CRUD operations for ItemService
  - Seed item creation
  - Database constraints and foreign keys

---

### Phase 3: Room Items
**Objective**: Items can exist in the game world.

#### Step 10: Implement placeItemInRoom
- **File**: `src/services/itemService.ts`
- **Method**:
  ```typescript
  async placeItemInRoom(roomId: number, itemId: number, quantity: number = 1): Promise<void> {
    await this.db.run(`
      INSERT INTO room_items (room_id, item_id, quantity)
      VALUES (?, ?, ?)
    `, [roomId, itemId, quantity]);
  }
  ```
- **Test**: Place items in rooms and verify database entries

#### Step 11: Implement getRoomItems
- **File**: `src/services/itemService.ts`
- **Method**:
  ```typescript
  async getRoomItems(roomId: number): Promise<RoomItem[]> {
    return await this.db.all<RoomItem>(`
      SELECT ri.*, i.* 
      FROM room_items ri 
      JOIN items i ON ri.item_id = i.id 
      WHERE ri.room_id = ?
    `, [roomId]);
  }
  ```
- **Test**: Retrieve items from rooms with and without items

#### Step 12: Modify room display
- **File**: `src/ui/InkTUIBridge.ts`
- **Modification**: Update `displayRoom` method to show items
- **Format**:
  ```
  You see:
  • Iron Sword
  • Health Potion x3
  ```
- **Integration**: Call ItemService.getRoomItems in displayRoom
- **Test**: Verify items appear in room descriptions

#### Step 13: Add test coverage
- **Tests**:
  - Room item placement
  - Room item retrieval
  - Room display with items
  - Multiple items in same room

---

### Phase 4: Pickup Command
**Objective**: Players can pick up items from rooms.

#### Step 14: Add pickup command parser
- **File**: `src/gameController.ts`
- **Command registration**:
  ```typescript
  this.commandRouter.addGameCommand({
    name: 'pickup',
    aliases: ['get', 'take'],
    description: 'Pick up an item from the current room',
    handler: async (args) => await this.handlePickup(args[0])
  });
  ```
- **Test**: Verify command is registered and callable

#### Step 15: Implement pickup logic
- **File**: `src/gameController.ts`
- **Method**:
  ```typescript
  private async handlePickup(itemName: string): Promise<void> {
    if (!itemName) {
      this.tui.display('Pick up what?', MessageType.ERROR);
      return;
    }

    const currentRoom = await this.getCurrentRoom();
    const roomItems = await this.itemService.getRoomItems(currentRoom.id);
    const targetItem = roomItems.find(ri => 
      ri.item.name.toLowerCase().includes(itemName.toLowerCase())
    );

    if (!targetItem) {
      this.tui.display(`There is no ${itemName} here.`, MessageType.ERROR);
      return;
    }

    // Transfer item from room to character inventory
    await this.itemService.transferItemToInventory(
      this.character.id, 
      targetItem.item_id, 
      targetItem.room_id,
      1
    );

    this.tui.display(`You pick up the ${targetItem.item.name}.`, MessageType.NORMAL);
  }
  ```
- **Test**: Pick up existing and non-existing items

#### Step 16: Add pickup feedback
- **Messages**:
  - Success: "You pick up the [item]."
  - Item not found: "There is no [item] here."
  - Multiple matches: "Which [item] did you mean: [list]?"
- **Test**: Verify appropriate messages appear

#### Step 17: Handle item not found
- **Features**:
  - Fuzzy matching for similar item names
  - Suggestions for partial matches
  - Clear error messages
- **Test**: Test various invalid item names

#### Step 18: Add test coverage
- **Tests**:
  - Successful item pickup
  - Item not found scenarios
  - Partial name matching
  - Command aliases (get, take)

---

### Phase 5: Basic Inventory Display
**Objective**: Players can view their carried items.

#### Step 19: Add inventory command
- **File**: `src/gameController.ts`
- **Command registration**:
  ```typescript
  this.commandRouter.addGameCommand({
    name: 'inventory',
    aliases: ['inv', 'i'],
    description: 'Show your inventory',
    handler: async () => await this.handleInventory()
  });
  ```
- **Test**: Verify command registration

#### Step 20: Implement basic inventory display
- **File**: `src/gameController.ts`
- **Method**:
  ```typescript
  private async handleInventory(): Promise<void> {
    const inventory = await this.itemService.getCharacterInventory(this.character.id);
    
    if (inventory.length === 0) {
      this.tui.display('Your inventory is empty.', MessageType.NORMAL);
      return;
    }

    this.tui.display('You are carrying:', MessageType.SYSTEM);
    inventory.forEach(invItem => {
      const quantityText = invItem.quantity > 1 ? ` x${invItem.quantity}` : '';
      this.tui.display(`• ${invItem.item.name}${quantityText}`, MessageType.NORMAL);
    });
  }
  ```
- **Test**: Display empty and populated inventories

#### Step 21: Add test coverage
- **Tests**:
  - Empty inventory display
  - Single item inventory
  - Multiple items inventory
  - Command aliases

---

### Phase 6: Drop Command
**Objective**: Players can drop items from inventory.

#### Step 22: Add drop command parser
- **File**: `src/gameController.ts`
- **Command registration**:
  ```typescript
  this.commandRouter.addGameCommand({
    name: 'drop',
    description: 'Drop an item from your inventory',
    handler: async (args) => await this.handleDrop(args[0])
  });
  ```

#### Step 23: Implement drop logic
- **File**: `src/gameController.ts`
- **Method**:
  ```typescript
  private async handleDrop(itemName: string): Promise<void> {
    if (!itemName) {
      this.tui.display('Drop what?', MessageType.ERROR);
      return;
    }

    const inventory = await this.itemService.getCharacterInventory(this.character.id);
    const targetItem = inventory.find(invItem => 
      invItem.item.name.toLowerCase().includes(itemName.toLowerCase())
    );

    if (!targetItem) {
      this.tui.display(`You don't have a ${itemName}.`, MessageType.ERROR);
      return;
    }

    const currentRoom = await this.getCurrentRoom();
    await this.itemService.transferItemToRoom(
      targetItem.character_id,
      targetItem.item_id,
      currentRoom.id,
      1
    );

    this.tui.display(`You drop the ${targetItem.item.name}.`, MessageType.NORMAL);
  }
  ```

#### Step 24: Add drop feedback
- **Messages**:
  - Success: "You drop the [item]."
  - Item not in inventory: "You don't have a [item]."
- **Test**: Verify appropriate feedback

#### Step 25: Add test coverage
- **Tests**:
  - Drop existing inventory item
  - Drop non-existing item
  - Verify item appears in room after dropping

---

### Phase 7: Weight System
**Objective**: Implement carrying capacity based on character strength.

#### Step 26: Add weight to items
- **Database**: Weight column already exists in schema
- **Seed data**: Update seed items with realistic weights
- **Test**: Verify all items have weight values

#### Step 27: Implement carrying capacity
- **File**: `src/services/itemService.ts`
- **Methods**:
  ```typescript
  calculateCarryingCapacity(strength: number): number {
    const baseCapacity = 50; // pounds
    const strModifier = Math.floor((strength - 10) / 2);
    return baseCapacity + (strModifier * 10);
  }

  async getCurrentWeight(characterId: number): Promise<number> {
    const inventory = await this.getCharacterInventory(characterId);
    return inventory.reduce((total, invItem) => 
      total + (invItem.item.weight * invItem.quantity), 0
    );
  }

  getEncumbranceLevel(currentWeight: number, maxCapacity: number): string {
    const ratio = currentWeight / maxCapacity;
    if (ratio <= 0.5) return 'unencumbered';
    if (ratio <= 0.75) return 'lightly encumbered';
    if (ratio <= 1.0) return 'heavily encumbered';
    return 'overloaded';
  }
  ```

#### Step 28: Add weight validation
- **File**: `src/gameController.ts`
- **Modification**: Update handlePickup to check weight limits
- **Logic**: Prevent pickup if item would exceed carrying capacity
- **Test**: Verify overweight prevention

#### Step 29: Display weight in inventory
- **File**: `src/gameController.ts`
- **Modification**: Update handleInventory to show weight
- **Format**: "Weight: 23.5 / 70 lbs (Unencumbered)"
- **Test**: Verify weight display

#### Step 30: Add test coverage
- **Tests**:
  - Carrying capacity calculation
  - Weight validation on pickup
  - Encumbrance level calculation
  - Weight display in inventory

---

### Phase 8: Item Stacking
**Objective**: Stack similar items together in inventory.

#### Step 31: Add stackable property
- **Database**: Stackable and max_stack columns already exist
- **Seed data**: Update consumables to be stackable
- **Test**: Verify stackable items are marked correctly

#### Step 32: Implement quantity tracking
- **File**: `src/services/itemService.ts`
- **Modification**: Update transferItemToInventory to handle stacking
- **Logic**: Combine quantities for stackable items
- **Test**: Verify quantity updates correctly

#### Step 33: Modify pickup for stacking
- **File**: `src/gameController.ts`
- **Logic**: When picking up stackable item, add to existing stack
- **Test**: Pick up multiple stackable items

#### Step 34: Modify drop for quantities
- **File**: `src/gameController.ts`
- **Enhancement**: Support "drop 3 potions" syntax
- **Parser**: Extract quantity from command
- **Test**: Drop specific quantities

#### Step 35: Add test coverage
- **Tests**:
  - Stacking behavior
  - Quantity-based drops
  - Stack limits
  - Non-stackable item behavior

---

### Phase 9: Item Examination
**Objective**: Detailed item inspection.

#### Step 36: Add examine command
- **File**: `src/gameController.ts`
- **Command registration**:
  ```typescript
  this.commandRouter.addGameCommand({
    name: 'examine',
    aliases: ['ex', 'look'],
    description: 'Examine an item in detail',
    handler: async (args) => await this.handleExamine(args[0])
  });
  ```

#### Step 37: Implement detailed descriptions
- **File**: `src/gameController.ts`
- **Method**: Show full item stats, weight, value, special properties
- **Format**: Detailed item card display
- **Test**: Examine items in inventory and room

#### Step 38: Add test coverage
- **Tests**:
  - Examine inventory items
  - Examine room items
  - Examine non-existing items

---

### Phase 10: Equipment Foundation
**Objective**: Basic equipment slot system.

#### Step 39: Add equipment slots
- **Database**: Equipped and equipped_slot columns already exist
- **Types**: Add EquipmentSlot enum
- **Test**: Verify equipment tracking

#### Step 40: Create EquipmentService
- **File**: `src/services/equipmentService.ts` (new file)
- **Methods**: Basic equip/unequip functionality
- **Test**: Service instantiation

#### Step 41: Add equip command
- **File**: `src/gameController.ts`
- **Command**: Register equip command
- **Logic**: Basic item equipping
- **Test**: Equip items successfully

#### Step 42: Implement basic equip logic
- **Logic**: Mark items as equipped in appropriate slots
- **Validation**: Check item type vs slot compatibility
- **Test**: Equipment slot assignment

#### Step 43: Add test coverage
- **Tests**:
  - Basic equipment functionality
  - Slot validation
  - Equipment state tracking

---

### Phase 11: Equipment Display
**Objective**: Show equipped items to player.

#### Step 44: Add equipment command
- **File**: `src/gameController.ts`
- **Command**: Show all equipped items
- **Format**: Equipment slot display
- **Test**: Equipment command output

#### Step 45: Add unequip command
- **File**: `src/gameController.ts`
- **Command**: Remove equipped items
- **Logic**: Return items to inventory
- **Test**: Unequip functionality

#### Step 46: Modify inventory display
- **Modification**: Show equipped status in inventory
- **Format**: Mark equipped items clearly
- **Test**: Equipped items marked in inventory

#### Step 47: Add test coverage
- **Tests**:
  - Equipment display
  - Unequip functionality
  - Inventory equipment status

---

### Phase 12: Equipment Effects
**Objective**: Equipment affects character stats.

#### Step 48: Add weapon damage
- **Database**: Weapon_damage column already exists
- **Implementation**: Parse damage dice notation
- **Test**: Weapon damage calculation

#### Step 49: Add armor rating
- **Database**: Armor_rating column already exists
- **Implementation**: AC calculation with equipment
- **Test**: Armor class calculation

#### Step 50: Display equipment bonuses
- **Enhancement**: Show stat bonuses in equipment display
- **Format**: Total bonuses summary
- **Test**: Bonus calculation display

#### Step 51: Add test coverage
- **Tests**:
  - Weapon damage effects
  - Armor rating effects
  - Stat bonus calculations

---

### Phase 13: Item Discovery
**Objective**: AI-generated items in world.

#### Step 52: Create ItemGenerationService
- **File**: `src/services/itemGenerationService.ts` (new file)
- **Integration**: AI client for item generation
- **Test**: Service instantiation

#### Step 53: Add regional item templates
- **Data**: Region-appropriate item types and themes
- **Logic**: Template-based generation
- **Test**: Template system

#### Step 54: Implement generateItem
- **Method**: AI-powered item creation
- **Integration**: Grok AI client
- **Test**: Item generation

#### Step 55: Add item placement logic
- **Integration**: Place generated items in new rooms
- **Logic**: Probability-based item spawning
- **Test**: Item spawning in rooms

#### Step 56: Add test coverage
- **Tests**:
  - Item generation
  - Regional appropriateness
  - Placement logic

---

### Phase 14: Search Command
**Objective**: Find hidden items in rooms.

#### Step 57: Add search command
- **File**: `src/gameController.ts`
- **Command**: Register search command
- **Test**: Command registration

#### Step 58: Implement search logic
- **Logic**: Skill-based discovery of hidden items
- **Mechanics**: Perception-based success rates
- **Test**: Search functionality

#### Step 59: Add search feedback
- **Messages**: Discovery and failure messages
- **Format**: Atmospheric search descriptions
- **Test**: Search result display

#### Step 60: Add test coverage
- **Tests**:
  - Successful searches
  - Failed searches
  - Hidden item discovery

---

### Phase 15: Item Rarity
**Objective**: Item quality system.

#### Step 61: Add rarity system
- **Database**: Add rarity column to items table
- **Types**: ItemRarity enum
- **Test**: Rarity system foundation

#### Step 62: Implement rarity in generation
- **Logic**: Weighted rarity distribution
- **Integration**: Rarity affects item stats
- **Test**: Rarity generation

#### Step 63: Display rarity in examine
- **Enhancement**: Show item quality level
- **Format**: Color-coded rarity display
- **Test**: Rarity display

#### Step 64: Add test coverage
- **Tests**:
  - Rarity distribution
  - Rarity effects on stats
  - Rarity display

## Testing Strategy

### Unit Tests
- Each service method has dedicated tests
- Database operations tested with in-memory database
- TypeScript type safety verified at compile time

### Integration Tests
- Command parsing and execution
- Database schema integrity
- Service interaction testing

### End-to-End Tests
- Complete item workflows (pickup → inventory → drop)
- Equipment workflows (equip → effects → unequip)
- Discovery workflows (search → find → examine)

### Performance Tests
- Large inventory handling
- Item generation speed
- Database query optimization

## Success Criteria

Each phase is considered complete when:
1. All implementation tasks are finished
2. All tests pass (minimum 90% coverage)
3. User-facing features work as expected
4. Documentation is updated
5. No breaking changes to existing functionality

## Dependencies

### Internal Dependencies
- Database system (utils/database.ts)
- Command router (services/commandRouter.ts)
- Game controller (gameController.ts)
- AI client (ai/grokClient.ts)

### External Dependencies
- SQLite (existing)
- Jest testing framework (existing)
- TypeScript (existing)

## Migration Path

This implementation plan is designed to be additive - no existing functionality is modified in breaking ways. The item system integrates cleanly with the existing room and character systems.

## Future Enhancements

After Phase 15, the following features become possible:
- Crafting system
- Item enchantments
- Trading with NPCs
- Quest items
- Container items (bags, chests)
- Item durability
- Set bonuses for equipment