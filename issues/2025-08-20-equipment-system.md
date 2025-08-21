# Equipment System

**Date**: 2025-08-20  
**Status**: Phase 10 Step 39 Complete - Equipment Slot Foundation
**Priority**: Medium  
**Category**: Feature  

## Description

Implement an equipment system that allows players to equip weapons, armor, and accessories that modify character attributes, combat effectiveness, and other gameplay mechanics.

## Details

**What is the requirement?**
Create an equipment system with the following features:

- **Equipment Slots**: Weapon, armor, and accessory slots for character
- **Stat Modifications**: Equipment affects combat stats, attributes, and abilities
- **Equip/Unequip Commands**: Simple commands to manage equipped items
- **Equipment Restrictions**: Class or attribute requirements for certain items
- **Visual Feedback**: Clear display of equipped items and their effects
- **Armor Class Calculation**: Equipment contributes to defensive ratings
- **Weapon Damage**: Different weapons provide varied damage and properties

**Acceptance criteria:**
- [x] Equipment slot system (hand, head, body, foot) - 4-slot foundation (Phase 10 Step 39 Complete)
- [ ] `equip <item>` and `unequip <item>` commands
- [ ] Automatic stat recalculation when equipment changes
- [ ] Equipment display in character status
- [ ] Armor Class calculation including equipped armor and dexterity
- [ ] Weapon damage integration with combat system
- [ ] Equipment requirements and restrictions
- [ ] Clear feedback for equipment changes and restrictions

## Technical Notes

### Equipment Slots
```typescript
enum EquipmentSlot {
  MAIN_HAND = 'main_hand',
  OFF_HAND = 'off_hand',
  ARMOR = 'armor',
  HELMET = 'helmet',
  BOOTS = 'boots',
  GLOVES = 'gloves',
  RING_1 = 'ring_1',
  RING_2 = 'ring_2',
  AMULET = 'amulet',
  CLOAK = 'cloak'
}
```

### Database Schema Extensions
```sql
-- Add equipment tracking to character_inventory
-- equipped column and equipped_slot already included

-- Add item properties for equipment
ALTER TABLE items ADD COLUMN slot_type TEXT; -- which slot this item goes in
ALTER TABLE items ADD COLUMN str_requirement INTEGER DEFAULT 0;
ALTER TABLE items ADD COLUMN dex_requirement INTEGER DEFAULT 0;
ALTER TABLE items ADD COLUMN int_requirement INTEGER DEFAULT 0;
ALTER TABLE items ADD COLUMN str_bonus INTEGER DEFAULT 0;
ALTER TABLE items ADD COLUMN dex_bonus INTEGER DEFAULT 0;
ALTER TABLE items ADD COLUMN int_bonus INTEGER DEFAULT 0;
ALTER TABLE items ADD COLUMN con_bonus INTEGER DEFAULT 0;
ALTER TABLE items ADD COLUMN wis_bonus INTEGER DEFAULT 0;
ALTER TABLE items ADD COLUMN cha_bonus INTEGER DEFAULT 0;
```

### Equipment Effects System
```typescript
interface EquipmentEffects {
  attributeBonuses: {
    strength?: number;
    dexterity?: number;
    intelligence?: number;
    constitution?: number;
    wisdom?: number;
    charisma?: number;
  };
  combatBonuses: {
    armorClass?: number;
    attackBonus?: number;
    damageBonus?: number;
    hitPointBonus?: number;
  };
  specialEffects: string[]; // Future: magical effects, resistances
}

const calculateEquippedEffects = (character: Character): EquipmentEffects => {
  // Sum all bonuses from equipped items
  // Apply to character's effective stats
};
```

### Equipment Commands
```typescript
'equip <item>': async (itemName: string) => {
  // Find item in inventory
  // Check requirements (stats, class)
  // Check slot availability
  // Unequip existing item if needed
  // Equip new item
  // Recalculate character stats
};

'unequip <item>': async (itemName: string) => {
  // Find equipped item
  // Remove from equipment slot
  // Recalculate character stats
  // Item returns to inventory
};

'equipment': async () => {
  // Display all equipped items
  // Show empty slots
  // Display total bonuses
};
```

### Armor Class Calculation
```typescript
const calculateArmorClass = (character: Character, equippedItems: Item[]): number => {
  let baseAC = 10; // Base armor class
  let dexBonus = Math.floor((character.dexterity - 10) / 2);
  
  // Find equipped armor
  const armor = equippedItems.find(item => item.slot_type === 'armor');
  if (armor) {
    baseAC = armor.armor_rating || 10;
    // Some armor limits dex bonus
    const maxDexBonus = armor.max_dex_bonus || 99;
    dexBonus = Math.min(dexBonus, maxDexBonus);
  }
  
  // Add bonuses from other equipment
  const totalACBonus = equippedItems.reduce((bonus, item) => {
    return bonus + (item.ac_bonus || 0);
  }, 0);
  
  return baseAC + dexBonus + totalACBonus;
};
```

### Equipment Display
```
┌─ EQUIPMENT ─────────────────────────────────────┐
│ Main Hand: Iron Sword (+1 Attack, 1d8+1 dmg)   │
│ Off Hand:  [Empty]                              │
│ Armor:     Leather Armor (+2 AC)               │
│ Helmet:    [Empty]                              │
│ Boots:     Sturdy Boots (+1 Dex)               │
│ Gloves:    [Empty]                              │
│ Ring 1:    [Empty]                              │
│ Ring 2:    [Empty]                              │
│ Amulet:    [Empty]                              │
│ Cloak:     [Empty]                              │
├─────────────────────────────────────────────────┤
│ TOTAL BONUSES:                                  │
│ • Armor Class: 13 (10 base + 2 armor + 1 dex)  │
│ • Attack Bonus: +1                              │
│ • Attribute Bonuses: +1 Dex                     │
└─────────────────────────────────────────────────┘
```

### Implementation Areas
- **Equipment Service**: Manage equipped items and stat calculations
- **Character Stats**: Dynamic stat calculation including equipment
- **Item System**: Equipment properties and restrictions
- **Combat Integration**: Equipment effects on combat calculations
- **UI Display**: Equipment status in character interface

## Related

- Dependencies: Inventory System, Character Attributes System
- Enables: Enhanced combat effectiveness, character customization
- Integration: Combat System (AC, weapon damage), Item Discovery
- Future: Enchantments, item durability, set bonuses
- References: `specs/rpg-systems-comprehensive.md` Equipment Slots section

## Recent Updates

**2025-08-20**: ✅ **Phase 10 Step 39: Equipment Slot Foundation Complete**
- Implemented 4-slot equipment system (HAND, HEAD, BODY, FOOT)
- Added EquipmentSlot enum to item type definitions
- Updated database schema with equipment_slot column and migration
- Enhanced seed items with equipment slots:
  - Iron Sword → HAND slot
  - Leather Armor → BODY slot  
  - Iron Helmet → HEAD slot (new item)
  - Leather Boots → FOOT slot (new item)
  - Wooden Staff → HAND slot
- Updated ItemService to handle equipment_slot in CRUD operations
- Added 3 comprehensive tests for equipment slot functionality
- All 84 ItemService tests passing with new Phase 10 features

**Foundation ready for Step 40: Create EquipmentService class**