# Weapon Damage Value Field Specification

## Overview
Add support for numeric weapon damage values using the existing database "value" field to indicate additional damage points that weapons add to attacks.

## Current System Analysis
The item database already has:
- `value` field (INTEGER) - currently used for monetary value in copper pieces
- `weapon_damage` field (TEXT) - supports dice notation like "1d8+1"

## Requirements

### Database Schema
- **Field**: Use existing `value` INTEGER field 
- **Purpose**: When `type = 'weapon'`, the value field represents additional damage points
- **Compatibility**: Maintain existing monetary value usage for non-weapon items

### Implementation Details

#### Value Field Usage Pattern
```typescript
// For weapons: value = damage bonus
const sword: Item = {
  type: 'weapon',
  value: 1, // adds 1 damage point to attacks
  // ... other properties
};

// For non-weapons: value = monetary value
const potion: Item = {
  type: 'consumable', 
  value: 50, // worth 50 copper pieces
  // ... other properties
};
```

#### Combat Integration
- When player attacks with weapon, add weapon's `value` to base damage
- Base attack damage (from existing combat system): 2 points
- With weapon damage value: 2 + weapon.value points
- Example: Sword with value=1 deals 2+1=3 total damage

### Database Migration
**Status**: No migration needed - `value` field already exists

### TypeScript Interface Updates
**Status**: No changes needed - `value: number` already exists in Item interface

## Implementation Plan

### Phase 1: Core Logic
1. **Combat Service Update**
   - Modify attack damage calculation to include weapon value
   - Check if player has equipped weapon with damage value
   - Add weapon bonus to base damage

2. **Inventory Service Integration**
   - Method to get player's equipped weapon
   - Calculate total attack damage including weapon bonus

### Phase 2: Testing
1. **Unit Tests**
   - Test damage calculation with and without weapons
   - Test different weapon value amounts
   - Test non-weapon items don't affect damage

2. **Integration Tests**
   - Full attack command with weapon equipped
   - Weapon damage correctly applied in combat
   - Equipment changes affect damage calculations

### Phase 3: Seed Data
1. **Update existing weapons** in `seedItems.ts`:
   - Iron Sword: `value: 1` (adds 1 damage)
   - Wooden Staff: `value: 0` (no damage bonus)
   - Poisoned Dagger: `value: 2` (adds 2 damage)

## Technical Considerations

### Dual Purpose Value Field
The `value` field serves different purposes based on item type:
- **Weapons**: Damage bonus (combat value)
- **Other items**: Monetary value (economic value)

This approach:
- ✅ Meets exact requirement (field named "value")
- ✅ Uses existing database schema
- ✅ Maintains backward compatibility
- ✅ Supports both damage and monetary systems

### Combat System Integration
Current combat system (`simple-combat-system.md`):
- Base damage: 2 points per attack
- New calculation: `baseDamage + (equippedWeapon?.value || 0)`
- Maintains existing behavior when no weapon equipped

## Testing Strategy

### Test Cases
1. **No weapon equipped**: Damage = 2 (base only)
2. **Weapon with value=1**: Damage = 3 (2+1)
3. **Weapon with value=0**: Damage = 2 (2+0)
4. **Non-weapon equipped**: Damage = 2 (value ignored for non-weapons)

### Test Implementation
```typescript
describe('Weapon Damage Value', () => {
  it('should add weapon value to base damage', async () => {
    // Setup player with sword (value: 1)
    await equipWeapon(gameId, 'iron sword');
    
    // Execute attack
    const result = await attackCharacter(gameId, 'orc');
    
    // Verify damage = 2 (base) + 1 (weapon) = 3
    expect(result.damageDealt).toBe(3);
  });
  
  it('should use base damage when no weapon equipped', async () => {
    // Execute attack without weapon
    const result = await attackCharacter(gameId, 'orc');
    
    // Verify damage = 2 (base only)
    expect(result.damageDealt).toBe(2);
  });
});
```

## Success Criteria
- [x] Database has `value` field for weapons (already exists)
- [ ] Weapon value adds to attack damage in combat
- [ ] Non-weapon items maintain monetary value usage
- [ ] Combat system calculates: base damage + weapon value
- [ ] All tests pass
- [ ] Existing functionality unaffected

## Files to Modify
1. **Combat/Attack Logic**: Add weapon damage calculation
2. **Inventory Service**: Method to get equipped weapon
3. **Seed Data**: Update weapon values for damage bonuses
4. **Tests**: Comprehensive test coverage

## Edge Cases
1. Multiple weapons equipped (use main hand weapon)
2. Weapon with negative value (should not reduce damage below 1)
3. Non-numeric weapon values (validation/default to 0)
4. Equipment changes during combat (recalculate damage)