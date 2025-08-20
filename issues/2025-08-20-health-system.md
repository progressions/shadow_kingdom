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
- **Natural Healing**: Gradual health recovery over time or through rest
- **Death Mechanics**: Handle player death and respawn
- **Healing Sources**: Support for potions, spells, and rest

**Acceptance criteria:**
- [ ] HP calculation based on Constitution attribute (base + CON modifier + level)
- [ ] Current HP tracking that cannot exceed maximum
- [ ] Natural healing over time (configurable rate)
- [ ] Death state when HP reaches 0
- [ ] Respawn mechanism with penalty (HP reduction, location reset)
- [ ] HP display in game status/UI
- [ ] Damage application function for future combat
- [ ] Healing application function for recovery

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
// Base HP calculation
const baseHP = 10; // Starting HP
const conModifier = Math.floor((constitution - 10) / 2);
const maxHP = baseHP + conModifier + (level - 1) * (6 + conModifier);
```

### Healing Mechanics
- **Natural Healing**: 1 HP per 10 minutes of real time (configurable)
- **Rest Healing**: Full heal when using `rest` command (once per hour)
- **Death Penalty**: Respawn with 50% max HP at starting location

### Implementation Areas
- **Health Service**: Manage HP calculations, damage, healing
- **Character System**: Integration with character attributes
- **Game Loop**: Passive healing over time
- **Commands**: `health`, `rest` commands
- **Status Display**: Show HP in game UI

## Related

- Dependencies: Character Attributes System
- Enables: Combat System, Item System (healing potions)
- Related: Death mechanics, respawn system
- References: `specs/rpg-systems-comprehensive.md` Damage and Health section