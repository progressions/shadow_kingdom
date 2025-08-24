# Context-Aware Equip Aliases

**Date**: 2025-08-24  
**Status**: Completed  
**Priority**: Medium  
**Category**: Enhancement/Commands  

## Description

Add intuitive, context-aware aliases for the equip command that map to appropriate item types:
- `wear` for armor items (helmets, boots, armor, etc.)
- `use` for weapons (swords, axes, weapons, etc.)

## Goal

Improve player experience with more natural language commands that match real-world usage patterns.

## Implementation

### Core Deliverable
- Add `wear` alias that only works for armor-type items
- Add `use` alias that only works for weapon-type items  
- Both aliases should route to the existing equip functionality with appropriate validation

### Command Logic
```typescript
// Enhanced equip command with context-aware aliases
async handleWear(itemName: string): Promise<void> {
  const item = this.findItemInInventory(itemName);
  if (!item) {
    this.display(`You don't have a ${itemName}.`);
    return;
  }
  
  // Validate item is armor-type
  if (!this.isArmorItem(item)) {
    this.display(`You can't wear a ${item.name}. Try "equip" or "use" instead.`);
    return;
  }
  
  // Route to existing equip logic
  return this.handleEquip(itemName);
}

async handleUse(itemName: string): Promise<void> {
  const item = this.findItemInInventory(itemName);
  if (!item) {
    this.display(`You don't have a ${itemName}.`);
    return;
  }
  
  // Validate item is weapon-type
  if (!this.isWeaponItem(item)) {
    this.display(`You can't use a ${item.name} as a weapon. Try "equip" or "wear" instead.`);
    return;
  }
  
  // Route to existing equip logic
  return this.handleEquip(itemName);
}
```

### Item Type Detection
```typescript
private isArmorItem(item: Item): boolean {
  const armorTypes = ['armor', 'helmet', 'boots', 'gloves', 'shield', 'cloak', 'ring', 'amulet'];
  return armorTypes.some(type => 
    item.type === type || 
    item.name.toLowerCase().includes(type) ||
    item.description.toLowerCase().includes('wear') ||
    item.description.toLowerCase().includes('armor')
  );
}

private isWeaponItem(item: Item): boolean {
  const weaponTypes = ['weapon', 'sword', 'axe', 'bow', 'dagger', 'staff', 'mace', 'hammer'];
  return weaponTypes.some(type => 
    item.type === type || 
    item.name.toLowerCase().includes(type) ||
    item.description.toLowerCase().includes('weapon') ||
    item.description.toLowerCase().includes('wield')
  );
}
```

### Command Registration
Add to command router with appropriate help text:
- `wear <item>` - Equip armor items (helmets, boots, armor, etc.)
- `use <item>` - Equip weapons (swords, axes, staves, etc.)

## Examples

### Valid Usage
```
> wear chain mail
You equip the Chain Mail.

> wear boots  
You equip the Leather Boots.

> use sword
You equip the Iron Sword.

> use staff
You equip the Wooden Staff.
```

### Context Validation
```
> wear sword
You can't wear a Iron Sword. Try "equip" or "use" instead.

> use boots
You can't use a Leather Boots as a weapon. Try "equip" or "wear" instead.
```

## Acceptance Criteria

- [x] `wear` command only works for armor-type items
- [x] `use` command only works for weapon-type items  
- [x] Both commands route to existing equip functionality
- [x] Appropriate error messages for wrong item types
- [x] Help text updated to show new aliases
- [x] Existing `equip` command continues to work for all item types
- [x] Commands work with partial item names (same matching as equip)

## Test Cases

### Armor Items Test
```
inventory: Chain Mail, Leather Boots, Iron Helmet
> wear chain mail     ✅ Equips Chain Mail
> wear boots         ✅ Equips Leather Boots  
> wear helmet        ✅ Equips Iron Helmet
> wear sword         ❌ "You can't wear a Iron Sword..."
```

### Weapon Items Test
```
inventory: Iron Sword, Wooden Staff, Ancient Dagger
> use sword          ✅ Equips Iron Sword
> use staff          ✅ Equips Wooden Staff
> use dagger         ✅ Equips Ancient Dagger  
> use boots          ❌ "You can't use a Leather Boots as a weapon..."
```

### Edge Cases Test
```
> wear nonexistent   ❌ "You don't have a nonexistent."
> use missing        ❌ "You don't have a missing."
> wear               ❌ Command usage help
> use                ❌ Command usage help
```

## Implementation Location

- **Command Registration**: `src/gameController.ts` or command router
- **Item Type Detection**: Utility functions or item service
- **Help System**: Update command help to include new aliases
- **Error Messages**: Consistent with existing equip command messages

## Future Enhancements

This pattern could extend to other context-aware aliases:
- `drink` for potions
- `read` for books/scrolls  
- `light` for torches/candles
- `throw` for projectiles

## Player Experience

Players can use more intuitive, natural language:
- "wear chain mail" feels more natural than "equip chain mail"
- "use sword" is more intuitive than "equip sword"  
- Context validation prevents confusion and guides correct usage
- Existing `equip` command remains available for all item types