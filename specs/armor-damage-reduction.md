# Armor Damage Reduction System

## Overview
This specification defines how armor items reduce damage taken by characters when they are successfully hit in combat. Similar to how weapon items use their `value` field to add damage, armor items use their `value` field to provide armor points that are subtracted from incoming damage.

## Current System Analysis

### Weapon Damage System (for reference)
- Base damage: 2 points per successful attack
- Weapon items add their `value` field to base damage
- Formula: `totalDamage = baseDamage + weaponValue`
- Minimum damage is clamped to 1 (even with negative weapon values)

### Attack System
- Hit chance: 50% (Math.random() < 0.5)
- Miss: No damage dealt
- Hit: Damage calculated and applied to target's health

## Armor Damage Reduction Requirements

### Core Functionality
1. **Armor Points Calculation**: Sum the `value` field of all equipped armor items
2. **Damage Reduction**: Subtract total armor points from incoming damage
3. **Minimum Damage**: Ensure damage never goes below 1 point (armor cannot completely negate damage)

### Implementation Details

#### Armor Point Sources
- **HEAD slot**: Helmets, hats, crowns (ItemType.ARMOR, EquipmentSlot.HEAD)
- **BODY slot**: Chest armor, robes, shirts (ItemType.ARMOR, EquipmentSlot.BODY)  
- **FOOT slot**: Boots, shoes, greaves (ItemType.ARMOR, EquipmentSlot.FOOT)
- **HAND slot**: Only weapons contribute to damage; non-weapons ignored for armor

#### Damage Calculation Formula
```
totalArmorPoints = sum(equipped_armor_items.value)
finalDamage = Math.max(1, baseDamage + weaponDamage - totalArmorPoints)
```

#### Example Calculations
1. **No armor**: 2 base + 0 weapon - 0 armor = 2 damage
2. **Light armor**: 2 base + 3 weapon - 2 armor = 3 damage
3. **Heavy armor**: 2 base + 0 weapon - 5 armor = 1 damage (minimum)
4. **Overpowered armor**: 2 base + 1 weapon - 10 armor = 1 damage (minimum)

### Database Schema
No schema changes required - using existing `value` field:
- `items.value`: For armor items, represents armor points
- `items.armor_rating`: Existing field, unused for this implementation
- `character_inventory.equipped`: Identifies equipped items
- `character_inventory.equipped_slot`: Identifies equipment slot

### Equipment Service Integration

#### New Methods Required
```typescript
/**
 * Calculate total armor points from all equipped armor
 * @param characterId Character ID
 * @returns Promise<number> - Total armor points
 */
async calculateArmorPoints(characterId: number): Promise<number>

/**
 * Calculate damage after armor reduction
 * @param characterId Character ID (defender) 
 * @param incomingDamage Damage before armor reduction
 * @returns Promise<number> - Final damage after armor reduction
 */
async calculateDamageAfterArmor(characterId: number, incomingDamage: number): Promise<number>
```

#### Attack System Integration
- Modify attack damage calculation to include armor reduction
- Apply armor reduction to the target character (defender)
- Maintain existing weapon damage bonus for attacker

## Test Requirements

### Unit Tests
1. **Armor Point Calculation**
   - No armor equipped → 0 armor points
   - Single armor piece → returns armor value
   - Multiple armor pieces → sum of all values
   - Non-armor items ignored → only armor items counted

2. **Damage Reduction**
   - No armor → full damage taken
   - Light armor → partial damage reduction
   - Heavy armor → minimum 1 damage enforced
   - Zero/negative armor values → no reduction or increase

3. **Equipment Integration**
   - Armor in inventory but not equipped → no effect
   - Equip/unequip armor → armor points update accordingly
   - Mixed equipment slots → all armor slots contribute

### Integration Tests
1. **Combat System**
   - Attack without armor → baseline damage
   - Attack with armor → reduced damage
   - Multiple attacks → consistent armor reduction
   - Weapon + armor interaction → both systems work together

2. **Character Death**
   - High armor preventing death → character survives with 1 HP
   - Armor vs high damage → death still occurs appropriately

### End-to-End Tests  
1. **Gameplay Scenarios**
   - Equip armor items and verify damage reduction in combat
   - Multiple armor pieces providing cumulative protection
   - Remove armor and verify increased damage taken

## Implementation Plan

### Phase 1: Core Armor Calculation
1. Add `calculateArmorPoints()` method to EquipmentService
2. Add `calculateDamageAfterArmor()` method to EquipmentService  
3. Unit tests for armor point calculation

### Phase 2: Attack System Integration
1. Modify attack damage calculation in GameController
2. Update attack methods to use armor reduction
3. Integration tests for combat damage

### Phase 3: Testing & Validation
1. End-to-end tests for complete gameplay scenarios
2. Edge case testing (negative values, zero armor, etc.)
3. Performance testing with multiple equipped items

## Compatibility

### Backward Compatibility
- Existing characters without armor → no functional change
- Existing armor items → `value` field immediately usable as armor points
- Weapon system → unchanged, continues to work as before

### Future Extensions
- Armor durability system could modify `value` over time
- Enchanted armor with special properties
- Armor penetration mechanics for certain weapons
- Layered armor system with multiple body slots