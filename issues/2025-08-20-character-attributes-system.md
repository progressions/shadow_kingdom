# Character Attributes System

**Date**: 2025-08-20  
**Status**: Open  
**Priority**: High  
**Category**: Feature  

## Description

Implement a character attributes system that provides the foundation for all RPG mechanics in Shadow Kingdom, including six core attributes that affect various aspects of gameplay.

## Details

**What is the requirement?**
Create a character system with six primary attributes that influence player capabilities:

- **Strength**: Physical power, melee damage, carrying capacity
- **Dexterity**: Agility, ranged accuracy, dodge chance, initiative  
- **Intelligence**: Spell power, mana pool, learning speed
- **Constitution**: Health points, stamina, resistance to effects
- **Wisdom**: Perception, spell resistance, insight checks
- **Charisma**: Social interactions, leadership, merchant dealings

**Acceptance criteria:**
- [ ] Database schema for storing character attributes
- [ ] Character creation with initial attribute allocation
- [ ] Display character stats in game status
- [ ] Attributes affect relevant game mechanics
- [ ] Attribute values can be modified (leveling, items, effects)
- [ ] Input validation for attribute ranges (1-20 base range)

## Technical Notes

### Database Schema
```sql
CREATE TABLE characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  strength INTEGER DEFAULT 10,
  dexterity INTEGER DEFAULT 10,
  intelligence INTEGER DEFAULT 10,
  constitution INTEGER DEFAULT 10,
  wisdom INTEGER DEFAULT 10,
  charisma INTEGER DEFAULT 10,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);
```

### Implementation Areas
- **Character Service**: Manage attribute calculations and modifiers
- **Status Display**: Show attributes in game UI
- **Game State**: Track character reference in game sessions
- **Commands**: Add `stats` or `character` command to view attributes

### Attribute Modifiers
- Base range: 1-20 (10 = average)
- Modifier calculation: `(attribute - 10) / 2` rounded down
- Example: STR 14 = +2 modifier, STR 8 = -1 modifier

## Related

- Dependencies: None (foundation system)
- Enables: Health System, Combat System, Leveling System
- References: `specs/rpg-systems-comprehensive.md` Character System section