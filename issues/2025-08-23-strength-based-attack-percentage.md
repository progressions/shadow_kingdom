# Implement Strength-Based Attack Percentage

## Issue Description

Currently, attack success is likely using a fixed percentage or basic calculation. We need to modify the attack system to incorporate a character's Strength attribute into their chance to hit.

## Requirements

- Modify attack percentage calculation to factor in character Strength
- Determine appropriate formula for how Strength affects hit chance
- Ensure the system works for both players and NPCs/enemies
- Maintain balanced gameplay mechanics

## Implementation Notes

- Need to determine the exact formula (e.g., base hit chance + Strength modifier)
- Consider how this affects game balance
- Update attack resolution logic in the combat system
- Ensure proper integration with existing character stats

## Acceptance Criteria

- [x] Attack percentage calculation includes Strength attribute
- [x] Formula provides balanced gameplay mechanics
- [x] System works for all character types (player, NPCs, enemies)
- [x] Tests verify the new calculation logic
- [x] Documentation updated to reflect the change

## COMPLETED

**Status**: ✅ COMPLETED

**Implementation Summary**:
- Implemented D20-based combat system with STR vs DEX mechanics
- Attack roll: 1d20 + STR modifier vs target number (10 + DEX modifier)
- Unified system used by both player attacks and enemy attacks
- Added detailed combat messages showing calculation breakdowns
- All tests updated and passing
- No database changes required - uses existing character attributes

**Files Modified**:
- `src/utils/combat.ts` - New unified combat calculation system
- `src/gameController.ts` - Updated attack methods to use new system
- Multiple test files updated for new message format

**Combat Message Examples**:
- Hit: `You attack the Goblin. The Goblin takes 2 damage. [Roll: 19+0=19 vs 10 (10+0)]`
- Miss: `You attack the Goblin, but miss! [Roll: 1+0=1 vs 12 (10+2)]`

## Related Systems

- Character stats system
- Combat mechanics
- Attack command handling