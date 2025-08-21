# Health System

**Date**: 2025-08-20  
**Status**: Open  
**Priority**: High  
**Category**: Feature  

## Description

Implement a health point (HP) system that tracks player vitality, handles damage, healing, and death mechanics as the foundation for combat and survival gameplay.

## Details

**What is the requirement?**
Create a health system with the following components:

- **Hit Points (HP)**: Constitution-based health with level scaling
- **Current/Maximum HP**: Track current health vs maximum capacity
- **Death Mechanics**: Handle player death state
- **Healing Sources**: Support for rest command and future potions/spells

**Acceptance criteria:**
- [ ] HP calculation based on Constitution attribute (base + CON modifier)
- [ ] Current HP tracking that cannot exceed maximum
- [ ] Death state when HP reaches 0
- [ ] HP display in game status/UI
- [ ] Damage application function for future combat
- [ ] Healing application function for recovery
- [ ] Rest command for health recovery

## Technical Notes

### Database Schema Extensions
```sql
-- Add to characters table
ALTER TABLE characters ADD COLUMN max_hp INTEGER DEFAULT 0;
ALTER TABLE characters ADD COLUMN current_hp INTEGER DEFAULT 0;
ALTER TABLE characters ADD COLUMN last_heal_time DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE characters ADD COLUMN is_dead BOOLEAN DEFAULT FALSE;
```

### HP Calculation Formula
```typescript
// Base HP calculation (no levels yet)
const baseHP = 10; // Starting HP
const conModifier = Math.floor((constitution - 10) / 2);
const maxHP = baseHP + conModifier;
```

### Healing Mechanics
- **Rest Healing**: Restore health when using `rest` command
- **Death State**: Character marked as dead at 0 HP (prevents actions)

### Implementation Areas
- **Health Service**: Manage HP calculations, damage, healing
- **Character System**: Integration with character attributes
- **Commands**: `health`, `rest` commands
- **Status Display**: Show HP in game UI

## Related

- Dependencies: Character Attributes System, Action Validation System
- Enables: Combat System, Item System (healing potions)
- Works WITH: Event Trigger System (damage/heal effects)
- Related: Death mechanics
- References: `specs/rpg-systems-comprehensive.md` Damage and Health section

## Notes

- Death state will use the Action Validation System to block most actions
- Rest command will check for hostile presence via the validator
- Low health could potentially restrict certain actions through validation
- Event Triggers can apply damage/healing effects based on actions
- Status effects from triggers (poison, regeneration) interact with health