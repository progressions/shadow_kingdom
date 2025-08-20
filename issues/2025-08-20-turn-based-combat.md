# Turn-Based Combat System

**Date**: 2025-08-20  
**Status**: Open  
**Priority**: High  
**Category**: Feature  

## Description

Implement a turn-based combat system that provides tactical, engaging battles using character attributes, with initiative order, action economy, and various combat actions.

## Details

**What is the requirement?**
Create a combat system with the following mechanics:

- **Initiative System**: Dexterity-based turn order with modifiers
- **Action Economy**: Move, standard action, bonus action per turn
- **Combat Actions**: Attack, defend, special abilities, items
- **Damage Calculation**: Attribute-based damage with weapon modifiers
- **Combat Resolution**: Victory/defeat conditions and consequences
- **Status Effects**: Basic effects like poisoned, stunned, etc.

**Acceptance criteria:**
- [ ] Combat initiation when encountering enemies
- [ ] Initiative order calculation and turn management
- [ ] Player action menu during combat turns
- [ ] Attack resolution with hit chance and damage calculation
- [ ] Defensive actions (block, dodge, parry)
- [ ] Combat UI showing participants, HP, and status
- [ ] Victory/defeat resolution with XP and loot rewards
- [ ] Escape/flee mechanics
- [ ] Integration with existing Health and Character systems

## Technical Notes

### Database Schema
```sql
CREATE TABLE combat_encounters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  character_id INTEGER NOT NULL,
  enemy_ids TEXT, -- JSON array of enemy IDs
  turn_order TEXT, -- JSON array of initiative order
  current_turn INTEGER DEFAULT 0,
  combat_round INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE TABLE combat_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  encounter_id INTEGER NOT NULL,
  actor_type TEXT NOT NULL, -- 'player' or 'enemy'
  actor_id INTEGER NOT NULL,
  action_type TEXT NOT NULL, -- 'attack', 'defend', 'item', 'spell'
  target_type TEXT,
  target_id INTEGER,
  damage_dealt INTEGER DEFAULT 0,
  effect_applied TEXT,
  round_number INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (encounter_id) REFERENCES combat_encounters(id) ON DELETE CASCADE
);
```

### Combat Flow
```typescript
1. Combat Initiation
   - Encounter trigger (room entry, enemy spawn)
   - Roll initiative for all participants
   - Enter combat mode

2. Turn Processing
   - Display combat state (HP, status effects)
   - Present action options to current actor
   - Resolve chosen action
   - Apply damage/effects
   - Check victory conditions

3. Combat Resolution
   - Award XP and loot for victory
   - Handle death/defeat consequences
   - Return to exploration mode
```

### Core Mechanics
- **Initiative**: `1d20 + DEX modifier + situational bonuses`
- **Attack Roll**: `1d20 + STR/DEX modifier + weapon bonus vs Armor Class`
- **Damage**: `Weapon damage + STR/DEX modifier`
- **Armor Class**: `10 + DEX modifier + armor bonus`

### Implementation Areas
- **Combat Service**: Manage combat state and resolution
- **Combat Commands**: Attack, defend, item, flee commands during combat
- **Combat UI**: Status display, action menus, combat log
- **Game State**: Track when player is in combat vs exploration
- **Integration**: Health system damage, XP system rewards

## Related

- Dependencies: Character Attributes System, Health System, Enemy System
- Enables: Equipment effects on combat, Magic system integration
- Related: Status effects, combat items, tactical positioning
- References: `specs/rpg-systems-comprehensive.md` Combat System section