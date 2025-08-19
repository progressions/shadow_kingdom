# Shadow Kingdom: Inventory System Specification

**Date**: 2025-01-21  
**Version**: 1.0  
**Type**: Technical Specification  

## Overview

The Inventory System manages all items that characters can carry, equip, and use within Shadow Kingdom. This system provides the foundation for equipment progression, item-based puzzles, resource management, and player choice in character development.

## Core Components

### 1. Item Types and Categories

#### Item Classifications
```typescript
enum ItemType {
  WEAPON = 'weapon',           // Swords, axes, bows, etc.
  ARMOR = 'armor',             // Helmets, chest, shields, etc.
  CONSUMABLE = 'consumable',   // Potions, food, scrolls
  KEY = 'key',                 // Door keys, chest keys
  QUEST = 'quest',             // Story items, artifacts
  TREASURE = 'treasure',       // Gems, art, valuables
  TOOL = 'tool',              // Lockpicks, torches, rope
  MATERIAL = 'material'        // Crafting components (future)
}

enum ItemSubtype {
  // Weapons
  SWORD = 'sword',
  AXE = 'axe', 
  BOW = 'bow',
  DAGGER = 'dagger',
  STAFF = 'staff',
  
  // Armor
  HELMET = 'helmet',
  CHEST = 'chest', 
  LEGS = 'legs',
  BOOTS = 'boots',
  SHIELD = 'shield',
  GLOVES = 'gloves',
  
  // Consumables
  POTION = 'potion',
  FOOD = 'food',
  SCROLL = 'scroll',
  
  // Keys
  DOOR_KEY = 'door_key',
  CHEST_KEY = 'chest_key',
  SPECIAL_KEY = 'special_key'
}
```

#### Item Properties
```typescript
interface ItemProperties {
  // Combat Properties
  damage?: number;              // Weapon damage bonus
  defense?: number;             // Armor defense bonus
  accuracy?: number;            // Hit chance modifier
  critical_chance?: number;     // Crit probability increase
  initiative_bonus?: number;    // Initiative modifier
  
  // Utility Properties
  healing?: number;             // HP restoration
  mana_restore?: number;        // Mana restoration (future)
  duration?: number;            // Effect duration in turns
  charges?: number;             // Number of uses
  
  // Special Effects
  effects?: string[];           // Status effects granted
  immunities?: string[];        // Status immunities
  abilities?: string[];         // Special abilities
  
  // Physical Properties
  weight: number;               // Inventory weight
  durability?: number;          // Item condition
  max_durability?: number;      // Maximum condition
  
  // Restrictions
  required_level?: number;      // Minimum level to use
  required_class?: string[];    // Class restrictions (future)
  
  // Identification
  unlocks?: string[];           // What this key opens
  quest_flags?: string[];       // Quest-related flags
}
```

### 2. Item Database Model

```typescript
interface Item {
  id: number;
  name: string;
  type: ItemType;
  subtype?: ItemSubtype;
  
  // Economics
  value: number;                // Base sell price
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  
  // Stacking
  stackable: boolean;
  max_stack: number;
  
  // Properties
  properties: ItemProperties;
  
  // Descriptions
  description: string;
  flavor_text?: string;
  
  // Metadata
  created_at: Date;
}

// Example items
const IRON_SWORD: Item = {
  id: 1,
  name: "Iron Sword",
  type: ItemType.WEAPON,
  subtype: ItemSubtype.SWORD,
  value: 100,
  rarity: 'common',
  stackable: false,
  max_stack: 1,
  properties: {
    damage: 15,
    accuracy: 2,
    weight: 3,
    durability: 100,
    max_durability: 100,
    required_level: 1
  },
  description: "A sturdy iron blade with a simple crossguard.",
  flavor_text: "Forged by local smiths, reliable if unremarkable."
};

const HEALTH_POTION: Item = {
  id: 2,
  name: "Health Potion",
  type: ItemType.CONSUMABLE,
  subtype: ItemSubtype.POTION,
  value: 25,
  rarity: 'common',
  stackable: true,
  max_stack: 10,
  properties: {
    healing: 50,
    weight: 1,
    charges: 1
  },
  description: "A red liquid that restores vitality.",
  flavor_text: "Tastes terrible, but works wonders."
};
```

### 3. Inventory Management

#### Character Inventory
```typescript
interface InventorySlot {
  id: number;
  character_id: number;
  item_id: number;
  quantity: number;
  equipped: boolean;
  equipment_slot?: EquipmentSlot;
  durability?: number;          // Current durability
  acquired_at: Date;
}

enum EquipmentSlot {
  MAIN_HAND = 'main_hand',      // Primary weapon
  OFF_HAND = 'off_hand',        // Shield or secondary weapon
  HEAD = 'head',                // Helmet
  CHEST = 'chest',              // Armor
  LEGS = 'legs',                // Leg armor
  FEET = 'feet',                // Boots
  HANDS = 'hands',              // Gloves
  RING_1 = 'ring_1',           // First ring slot
  RING_2 = 'ring_2',           // Second ring slot
  NECK = 'neck'                 // Amulet/necklace
}
```

#### Inventory Constraints
```typescript
interface InventoryLimits {
  max_weight: number;           // Total weight capacity
  max_slots: number;            // Number of inventory slots
  equipped_only: boolean;       // Items must be equipped to provide benefits
}

function calculateCarryCapacity(character: Character): number {
  const baseCapacity = 50;
  const strengthBonus = (character.strength || 10) - 10; // Future stat
  const levelBonus = character.level * 2;
  return baseCapacity + strengthBonus + levelBonus;
}

function calculateInventoryWeight(characterId: number): Promise<number> {
  const inventory = await getCharacterInventory(characterId);
  return inventory.reduce((total, slot) => {
    const item = getItem(slot.item_id);
    return total + (item.properties.weight * slot.quantity);
  }, 0);
}
```

### 4. Equipment System

#### Equipment Management
```typescript
interface EquipmentService {
  // Equipment Actions
  equipItem(characterId: number, itemId: number, slot: EquipmentSlot): Promise<boolean>;
  unequipItem(characterId: number, slot: EquipmentSlot): Promise<boolean>;
  
  // Equipment Queries
  getEquippedItems(characterId: number): Promise<InventorySlot[]>;
  getEquippedItem(characterId: number, slot: EquipmentSlot): Promise<InventorySlot | null>;
  isSlotOccupied(characterId: number, slot: EquipmentSlot): Promise<boolean>;
  
  // Equipment Effects
  calculateEquipmentBonuses(characterId: number): Promise<EquipmentBonuses>;
  getEquipmentEffects(characterId: number): Promise<StatusEffect[]>;
  
  // Validation
  canEquipItem(characterId: number, itemId: number, slot: EquipmentSlot): Promise<ValidationResult>;
  validateEquipmentSlot(item: Item, slot: EquipmentSlot): boolean;
}

interface EquipmentBonuses {
  attack: number;
  defense: number;
  accuracy: number;
  initiative: number;
  critical_chance: number;
  resistances: Record<string, number>;
}
```

#### Auto-Equipment Rules
```typescript
function getValidEquipmentSlots(item: Item): EquipmentSlot[] {
  switch (item.subtype) {
    case ItemSubtype.SWORD:
    case ItemSubtype.AXE:
    case ItemSubtype.STAFF:
      return [EquipmentSlot.MAIN_HAND];
      
    case ItemSubtype.DAGGER:
      return [EquipmentSlot.MAIN_HAND, EquipmentSlot.OFF_HAND];
      
    case ItemSubtype.SHIELD:
      return [EquipmentSlot.OFF_HAND];
      
    case ItemSubtype.HELMET:
      return [EquipmentSlot.HEAD];
      
    case ItemSubtype.CHEST:
      return [EquipmentSlot.CHEST];
      
    default:
      return [];
  }
}

async function autoEquipItem(characterId: number, itemId: number): Promise<boolean> {
  const item = await getItem(itemId);
  const validSlots = getValidEquipmentSlots(item);
  
  for (const slot of validSlots) {
    const canEquip = await canEquipItem(characterId, itemId, slot);
    if (canEquip.valid) {
      await equipItem(characterId, itemId, slot);
      return true;
    }
  }
  
  return false;
}
```

### 5. Item Usage System

#### Consumable Items
```typescript
interface ItemUsageResult {
  success: boolean;
  effects_applied: StatusEffect[];
  hp_restored?: number;
  mana_restored?: number;
  item_consumed: boolean;
  message: string;
}

async function useConsumableItem(
  characterId: number, 
  itemId: number, 
  targetId?: number
): Promise<ItemUsageResult> {
  const item = await getItem(itemId);
  const inventory = await getInventorySlot(characterId, itemId);
  
  if (!inventory || inventory.quantity === 0) {
    return {
      success: false,
      effects_applied: [],
      item_consumed: false,
      message: "You don't have that item."
    };
  }
  
  if (item.type !== ItemType.CONSUMABLE) {
    return {
      success: false,
      effects_applied: [],
      item_consumed: false,
      message: "That item cannot be consumed."
    };
  }
  
  const target = targetId ? await getCharacter(targetId) : await getCharacter(characterId);
  const result = await applyItemEffects(target, item);
  
  // Consume the item
  await reduceItemQuantity(characterId, itemId, 1);
  
  return {
    success: true,
    effects_applied: result.effects,
    hp_restored: result.hp_change,
    item_consumed: true,
    message: generateUsageMessage(item, result)
  };
}

function applyItemEffects(character: Character, item: Item): ItemEffectResult {
  const effects: StatusEffect[] = [];
  let hp_change = 0;
  
  // Apply healing
  if (item.properties.healing) {
    hp_change = Math.min(item.properties.healing, character.max_hp - character.hp);
    updateCharacterHP(character.id, character.hp + hp_change);
  }
  
  // Apply status effects
  if (item.properties.effects) {
    for (const effectName of item.properties.effects) {
      const effect = createStatusEffect(effectName, item.properties.duration || 1);
      effects.push(effect);
      applyStatusEffect(character.id, effect);
    }
  }
  
  return { effects, hp_change };
}
```

#### Key Items
```typescript
interface KeyUsageContext {
  room_id: number;
  connection_id?: number;
  container_id?: string;
  target_name?: string;
}

async function useKeyItem(
  characterId: number, 
  itemId: number, 
  context: KeyUsageContext
): Promise<ItemUsageResult> {
  const item = await getItem(itemId);
  const unlocks = item.properties.unlocks || [];
  
  // Check doors/connections
  if (context.connection_id) {
    const connection = await getConnection(context.connection_id);
    if (connection.required_item_id === itemId) {
      await unlockConnection(context.connection_id);
      return {
        success: true,
        effects_applied: [],
        item_consumed: false, // Keys usually aren't consumed
        message: `You unlock the ${connection.name} with the ${item.name}.`
      };
    }
  }
  
  // Check containers
  if (context.container_id && unlocks.includes(context.container_id)) {
    await unlockContainer(context.room_id, context.container_id);
    return {
      success: true,
      effects_applied: [],
      item_consumed: false,
      message: `You unlock the ${context.container_id} with the ${item.name}.`
    };
  }
  
  return {
    success: false,
    effects_applied: [],
    item_consumed: false,
    message: "The key doesn't seem to fit anything here."
  };
}
```

### 6. Inventory Service

```typescript
interface InventoryService {
  // Item Management
  addItem(characterId: number, itemId: number, quantity: number): Promise<boolean>;
  removeItem(characterId: number, itemId: number, quantity: number): Promise<boolean>;
  transferItem(fromId: number, toId: number, itemId: number, quantity: number): Promise<boolean>;
  
  // Inventory Queries
  getInventory(characterId: number): Promise<InventorySlot[]>;
  getInventorySlot(characterId: number, itemId: number): Promise<InventorySlot | null>;
  hasItem(characterId: number, itemId: number, quantity?: number): Promise<boolean>;
  getItemCount(characterId: number, itemId: number): Promise<number>;
  
  // Capacity Management
  getCurrentWeight(characterId: number): Promise<number>;
  getCarryCapacity(characterId: number): Promise<number>;
  canCarryItem(characterId: number, itemId: number, quantity: number): Promise<boolean>;
  getAvailableSlots(characterId: number): Promise<number>;
  
  // Item Operations
  useItem(characterId: number, itemId: number, targetId?: number): Promise<ItemUsageResult>;
  dropItem(characterId: number, itemId: number, quantity: number): Promise<boolean>;
  
  // Trading
  getTradeableItems(characterId: number): Promise<InventorySlot[]>;
  calculateItemValue(itemId: number, condition?: number): Promise<number>;
}
```

### 7. Item Generation and Loot

#### Dynamic Item Generation
```typescript
interface ItemGenerator {
  generateRandomItem(
    level: number, 
    type?: ItemType, 
    rarity?: string
  ): Promise<Item>;
  
  generateLootDrop(
    sourceType: 'npc' | 'chest' | 'quest', 
    sourceId: number, 
    playerLevel: number
  ): Promise<Item[]>;
  
  upgradeItem(baseItemId: number, enhancement: ItemEnhancement): Promise<Item>;
}

interface ItemEnhancement {
  prefix?: string;              // "Sharp", "Heavy", "Blessed"
  suffix?: string;              // "of Fire", "of Protection"
  stat_bonuses: Record<string, number>;
  special_effects?: string[];
}

// Example enhanced item generation
async function generateEnhancedWeapon(baseWeapon: Item, playerLevel: number): Promise<Item> {
  const enhancement = rollRandomEnhancement(playerLevel);
  
  return {
    ...baseWeapon,
    id: generateNewId(),
    name: `${enhancement.prefix} ${baseWeapon.name} ${enhancement.suffix}`,
    value: Math.floor(baseWeapon.value * enhancement.value_multiplier),
    rarity: enhancement.rarity,
    properties: {
      ...baseWeapon.properties,
      damage: baseWeapon.properties.damage + enhancement.stat_bonuses.damage,
      accuracy: baseWeapon.properties.accuracy + enhancement.stat_bonuses.accuracy,
      effects: [...(baseWeapon.properties.effects || []), ...enhancement.special_effects]
    },
    flavor_text: `${baseWeapon.flavor_text} ${enhancement.description}`
  };
}
```

#### Container and Loot Tables
```typescript
interface Container {
  id: string;
  room_id: number;
  name: string;
  locked: boolean;
  required_key?: string;
  contents: ContainerItem[];
  max_capacity: number;
  searched: boolean;
}

interface ContainerItem {
  item_id: number;
  quantity: number;
  hidden: boolean;           // Requires searching to find
  search_difficulty: number; // Skill check required
}

async function searchContainer(
  characterId: number, 
  roomId: number, 
  containerId: string
): Promise<SearchResult> {
  const container = await getContainer(roomId, containerId);
  const character = await getCharacter(characterId);
  
  if (container.locked) {
    return {
      success: false,
      message: "The container is locked.",
      items_found: []
    };
  }
  
  const searchSkill = character.level + randomInt(1, 20); // Base search
  const foundItems: Item[] = [];
  
  for (const item of container.contents) {
    if (!item.hidden || searchSkill >= item.search_difficulty) {
      foundItems.push(await getItem(item.item_id));
      await addItemToInventory(characterId, item.item_id, item.quantity);
    }
  }
  
  await markContainerSearched(roomId, containerId);
  
  return {
    success: true,
    message: foundItems.length > 0 ? 
      `You found: ${foundItems.map(i => i.name).join(', ')}` :
      "The container is empty.",
    items_found: foundItems
  };
}
```

## Command Interface

### 1. Inventory Commands

```typescript
interface InventoryCommands {
  'inventory' | 'inv': 'Show all carried items';
  'equipment' | 'eq': 'Show equipped items';
  'take <item>' | 'get <item>': 'Pick up item from room';
  'drop <item> [quantity]': 'Drop item in current room';
  'use <item> [target]': 'Use consumable or activate item';
  'equip <item>': 'Equip weapon or armor';
  'unequip <slot>': 'Remove equipped item';
  'examine <item>' | 'look <item>': 'Get detailed item information';
  'search [container]': 'Search room or specific container';
  'give <item> <target>': 'Give item to another character';
}

// Example command handlers
async function handleInventoryCommand(gameId: number): Promise<string> {
  const characterId = await getPlayerCharacterId(gameId);
  const inventory = await getInventory(characterId);
  const currentWeight = await getCurrentWeight(characterId);
  const maxWeight = await getCarryCapacity(characterId);
  
  if (inventory.length === 0) {
    return "Your inventory is empty.";
  }
  
  let output = `Inventory (${currentWeight}/${maxWeight} kg):\n`;
  
  const groupedItems = groupInventoryByItem(inventory);
  for (const [itemId, slots] of groupedItems) {
    const item = await getItem(itemId);
    const totalQuantity = slots.reduce((sum, slot) => sum + slot.quantity, 0);
    const quantityText = item.stackable && totalQuantity > 1 ? ` (${totalQuantity})` : '';
    const equippedText = slots.some(s => s.equipped) ? ' [equipped]' : '';
    
    output += `  ${item.name}${quantityText}${equippedText}\n`;
  }
  
  return output;
}

async function handleEquipCommand(gameId: number, args: string[]): Promise<string> {
  if (args.length === 0) {
    return "Equip what? Use 'equipment' to see equipped items.";
  }
  
  const itemName = args.join(' ');
  const characterId = await getPlayerCharacterId(gameId);
  const item = await findItemInInventory(characterId, itemName);
  
  if (!item) {
    return `You don't have a "${itemName}".`;
  }
  
  const validSlots = getValidEquipmentSlots(item);
  if (validSlots.length === 0) {
    return "That item cannot be equipped.";
  }
  
  // Try to equip in the first valid slot
  const success = await autoEquipItem(characterId, item.id);
  if (success) {
    return `You equip the ${item.name}.`;
  } else {
    return `You cannot equip the ${item.name} right now.`;
  }
}
```

### 2. Item Information Display

```typescript
function formatItemDetails(item: Item, quantity?: number): string {
  let output = `${item.name}`;
  if (quantity && quantity > 1) output += ` (${quantity})`;
  output += `\n`;
  
  // Rarity and value
  output += `Rarity: ${item.rarity} | Value: ${item.value} gold\n`;
  
  // Properties
  const props = item.properties;
  if (props.damage) output += `Damage: ${props.damage} `;
  if (props.defense) output += `Defense: ${props.defense} `;
  if (props.healing) output += `Healing: ${props.healing} `;
  if (props.weight) output += `Weight: ${props.weight} kg `;
  output += `\n`;
  
  // Durability
  if (props.durability && props.max_durability) {
    const condition = Math.floor((props.durability / props.max_durability) * 100);
    output += `Condition: ${condition}%\n`;
  }
  
  // Description
  output += `\n${item.description}`;
  if (item.flavor_text) {
    output += `\n\n"${item.flavor_text}"`;
  }
  
  return output;
}

function formatEquipmentDisplay(characterId: number): Promise<string> {
  const equipped = await getEquippedItems(characterId);
  const bonuses = await calculateEquipmentBonuses(characterId);
  
  let output = "Equipment:\n";
  
  for (const slot of Object.values(EquipmentSlot)) {
    const item = equipped.find(e => e.equipment_slot === slot);
    const slotName = slot.replace('_', ' ').toUpperCase();
    
    if (item) {
      const itemData = await getItem(item.item_id);
      output += `  ${slotName}: ${itemData.name}\n`;
    } else {
      output += `  ${slotName}: (empty)\n`;
    }
  }
  
  output += `\nTotal bonuses:\n`;
  output += `  Attack: +${bonuses.attack}\n`;
  output += `  Defense: +${bonuses.defense}\n`;
  output += `  Accuracy: +${bonuses.accuracy}\n`;
  
  return output;
}
```

## Integration with Other Systems

### 1. Trading System

```typescript
interface TradeOffer {
  seller_id: number;
  buyer_id: number;
  seller_items: TradeItem[];
  buyer_items: TradeItem[];
  seller_gold: number;
  buyer_gold: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
}

interface TradeItem {
  item_id: number;
  quantity: number;
}

async function createTradeOffer(
  sellerId: number, 
  buyerId: number, 
  offer: TradeOffer
): Promise<boolean> {
  // Validate that both parties have the offered items
  const sellerValid = await validateTradeItems(sellerId, offer.seller_items, offer.seller_gold);
  const buyerValid = await validateTradeItems(buyerId, offer.buyer_items, offer.buyer_gold);
  
  if (!sellerValid || !buyerValid) {
    return false;
  }
  
  await saveTradeOffer(offer);
  return true;
}
```

### 2. Quest Integration

```typescript
interface QuestItemRequirement {
  quest_id: number;
  item_id: number;
  quantity_required: number;
  consumed_on_completion: boolean;
}

async function checkQuestItemRequirements(
  characterId: number, 
  questId: number
): Promise<boolean> {
  const requirements = await getQuestItemRequirements(questId);
  
  for (const req of requirements) {
    const owned = await getItemCount(characterId, req.item_id);
    if (owned < req.quantity_required) {
      return false;
    }
  }
  
  return true;
}

async function consumeQuestItems(characterId: number, questId: number): Promise<void> {
  const requirements = await getQuestItemRequirements(questId);
  
  for (const req of requirements) {
    if (req.consumed_on_completion) {
      await removeItem(characterId, req.item_id, req.quantity_required);
    }
  }
}
```

### 3. Room Integration

```typescript
interface RoomItems {
  room_id: number;
  items: RoomItem[];
}

interface RoomItem {
  item_id: number;
  quantity: number;
  visible: boolean;          // Can be seen without searching
  respawns: boolean;         // Reappears over time
  respawn_timer: number;     // Hours until respawn
}

async function getRoomItems(roomId: number): Promise<RoomItem[]> {
  const roomItems = await queryRoomItems(roomId);
  return roomItems.filter(item => item.visible);
}

async function takeItemFromRoom(
  characterId: number, 
  roomId: number, 
  itemId: number, 
  quantity: number = 1
): Promise<boolean> {
  const roomItem = await getRoomItem(roomId, itemId);
  if (!roomItem || roomItem.quantity < quantity) {
    return false;
  }
  
  const canCarry = await canCarryItem(characterId, itemId, quantity);
  if (!canCarry) {
    return false;
  }
  
  await addItem(characterId, itemId, quantity);
  await removeRoomItem(roomId, itemId, quantity);
  
  return true;
}
```

## Performance Considerations

### 1. Database Optimization

```sql
-- Indexes for inventory performance
CREATE INDEX idx_inventory_character ON inventory(character_id);
CREATE INDEX idx_inventory_item ON inventory(item_id);
CREATE INDEX idx_inventory_equipped ON inventory(character_id, equipped);

-- Composite index for equipment queries
CREATE INDEX idx_inventory_char_equipped ON inventory(character_id, equipped, equipment_slot);

-- Index for item lookups
CREATE INDEX idx_items_type_subtype ON items(type, subtype);
CREATE INDEX idx_items_rarity ON items(rarity);
```

### 2. Caching Strategy

- **Item Cache**: Cache frequently accessed item definitions
- **Equipment Cache**: Cache character equipment bonuses
- **Inventory Cache**: Cache inventory state during active gameplay
- **Loot Table Cache**: Cache loot generation tables

### 3. Batch Operations

```typescript
// Batch inventory updates for performance
interface InventoryUpdate {
  character_id: number;
  item_id: number;
  quantity_change: number;
  operation: 'add' | 'remove' | 'set';
}

async function batchInventoryUpdates(updates: InventoryUpdate[]): Promise<void> {
  await database.transaction(async (tx) => {
    for (const update of updates) {
      await applyInventoryUpdate(tx, update);
    }
  });
}
```

## Future Enhancements

### 1. Advanced Features

- **Item Modification**: Enchanting, upgrading, socketing gems
- **Crafting System**: Combine materials to create new items
- **Item Sets**: Bonuses for wearing multiple related items
- **Cursed Items**: Items with negative effects that can't be removed easily

### 2. Quality of Life

- **Auto-sort**: Organize inventory automatically
- **Quick Use**: Hotkeys for frequently used items
- **Item Comparison**: Side-by-side stat comparison
- **Wishlist**: Track desired items

### 3. Social Features

- **Item Lending**: Temporary item sharing
- **Auction House**: Player-to-player trading
- **Item History**: Track item ownership and transfers
- **Item Ratings**: Community ratings for item usefulness

---

*The Inventory System provides the foundation for item-based gameplay progression, character customization, and player choice in Shadow Kingdom's RPG mechanics.*