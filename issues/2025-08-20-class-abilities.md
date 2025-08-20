# Character Classes and Abilities

**Date**: 2025-08-20  
**Status**: Open  
**Priority**: Low  
**Category**: Feature  

## Description

Implement a character class system with five distinct classes (Warrior, Rogue, Mage, Cleric, Ranger), each featuring unique abilities, skill trees, and progression paths that provide specialized gameplay experiences.

## Details

**What is the requirement?**
Create a class system with the following features:

- **Five Character Classes**: Warrior, Rogue, Mage, Cleric, Ranger with distinct roles
- **Class Selection**: Choose class during character creation
- **Unique Abilities**: Special powers and techniques for each class
- **Skill Trees**: Branching progression paths within each class
- **Ability Points**: Earned through leveling for ability advancement
- **Class Restrictions**: Equipment and spell limitations based on class
- **Passive Benefits**: Always-active bonuses specific to each class

**Acceptance criteria:**
- [ ] Character class selection during game creation
- [ ] Database schema for class data and character abilities
- [ ] Unique ability trees for each of the five classes
- [ ] `abilities` command to view class skills and progression
- [ ] Ability point system for upgrading class abilities
- [ ] Class-specific equipment and spell restrictions
- [ ] Active and passive abilities with clear effects
- [ ] Integration with existing combat and exploration systems

## Technical Notes

### Character Classes
```typescript
enum CharacterClass {
  WARRIOR = 'warrior',
  ROGUE = 'rogue', 
  MAGE = 'mage',
  CLERIC = 'cleric',
  RANGER = 'ranger'
}

const CLASS_DESCRIPTIONS = {
  [CharacterClass.WARRIOR]: {
    name: "Warrior",
    description: "Melee combat specialist with high health and armor proficiency",
    primaryAttributes: ['strength', 'constitution'],
    hitDieBonus: 3, // Extra HP per level
    armorProficiency: ['light', 'medium', 'heavy'],
    weaponProficiency: ['simple', 'martial']
  },
  [CharacterClass.ROGUE]: {
    name: "Rogue", 
    description: "Stealth and precision specialist with critical hits and utility skills",
    primaryAttributes: ['dexterity', 'intelligence'],
    hitDieBonus: 1,
    armorProficiency: ['light'],
    weaponProficiency: ['simple', 'finesse']
  },
  [CharacterClass.MAGE]: {
    name: "Mage",
    description: "Spellcasting focus with elemental damage and magical utility",
    primaryAttributes: ['intelligence', 'wisdom'],
    hitDieBonus: 0, // Standard HP
    armorProficiency: ['light'],
    weaponProficiency: ['simple'],
    spellcasting: true
  },
  [CharacterClass.CLERIC]: {
    name: "Cleric",
    description: "Support and healing specialist with undead resistance",
    primaryAttributes: ['wisdom', 'constitution'],
    hitDieBonus: 2,
    armorProficiency: ['light', 'medium'],
    weaponProficiency: ['simple'],
    spellcasting: true
  },
  [CharacterClass.RANGER]: {
    name: "Ranger",
    description: "Ranged combat and nature skills with survival expertise",
    primaryAttributes: ['dexterity', 'wisdom'],
    hitDieBonus: 2,
    armorProficiency: ['light', 'medium'],
    weaponProficiency: ['simple', 'martial', 'ranged']
  }
};
```

### Database Schema
```sql
-- Add to characters table
ALTER TABLE characters ADD COLUMN character_class TEXT DEFAULT 'warrior';
ALTER TABLE characters ADD COLUMN ability_points INTEGER DEFAULT 0;

CREATE TABLE class_abilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_name TEXT NOT NULL,
  ability_name TEXT NOT NULL,
  ability_type TEXT NOT NULL, -- active, passive, toggle
  description TEXT NOT NULL,
  level_requirement INTEGER DEFAULT 1,
  prerequisite_abilities TEXT, -- JSON array of required abilities
  max_rank INTEGER DEFAULT 1,
  effect_data TEXT, -- JSON effect parameters
  cooldown_seconds INTEGER DEFAULT 0,
  resource_cost INTEGER DEFAULT 0, -- mana, stamina, etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE character_abilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id INTEGER NOT NULL,
  ability_id INTEGER NOT NULL,
  current_rank INTEGER DEFAULT 1,
  learned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used DATETIME,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  FOREIGN KEY (ability_id) REFERENCES class_abilities(id) ON DELETE CASCADE
);
```

### Class Ability Trees
```typescript
const WARRIOR_ABILITIES = [
  {
    name: "Power Strike",
    type: "active",
    description: "Deal extra damage with your next melee attack",
    levelReq: 1,
    maxRank: 5,
    effect: { damageMultiplier: 1.5, bonusDamage: "1d6" },
    cooldown: 3
  },
  {
    name: "Defensive Stance", 
    type: "toggle",
    description: "Reduce damage taken but move slower",
    levelReq: 3,
    effect: { damageReduction: 0.2, speedPenalty: 0.3 }
  },
  {
    name: "Weapon Master",
    type: "passive", 
    description: "Gain bonus to hit and damage with weapons",
    levelReq: 5,
    maxRank: 3,
    effect: { attackBonus: 1, damageBonus: 1 }
  },
  {
    name: "Berserker Rage",
    type: "active",
    description: "Enter rage state for increased damage and resistance",
    levelReq: 10,
    prerequisites: ["Power Strike"],
    effect: { duration: 10, damageBonus: 0.5, damageResistance: 0.3 },
    cooldown: 60
  }
];

const ROGUE_ABILITIES = [
  {
    name: "Sneak Attack",
    type: "passive",
    description: "Deal extra damage when attacking from stealth or flanking",
    levelReq: 1,
    maxRank: 5,
    effect: { bonusDamage: "1d6", conditions: ["stealth", "flanking"] }
  },
  {
    name: "Stealth",
    type: "active", 
    description: "Become invisible to enemies for a short time",
    levelReq: 2,
    effect: { duration: 5, invisibility: true },
    cooldown: 10
  },
  {
    name: "Lockpicking",
    type: "passive",
    description: "Ability to pick locks and disarm traps",
    levelReq: 3,
    maxRank: 3,
    effect: { skillBonus: 5 }
  },
  {
    name: "Assassinate",
    type: "active",
    description: "Attempt to instantly kill a surprised enemy",
    levelReq: 8,
    prerequisites: ["Sneak Attack", "Stealth"],
    effect: { instantKillChance: 0.3, extraDamage: "4d6" },
    cooldown: 30
  }
];

const MAGE_ABILITIES = [
  {
    name: "Arcane Mastery",
    type: "passive",
    description: "Reduced mana costs and increased spell damage",
    levelReq: 1,
    maxRank: 5,
    effect: { manaCostReduction: 0.1, spellDamageBonus: 0.15 }
  },
  {
    name: "Magic Shield",
    type: "active",
    description: "Create a magical barrier that absorbs damage",
    levelReq: 3,
    effect: { shieldHP: 20, duration: 30 },
    manaCost: 5,
    cooldown: 15
  },
  {
    name: "Spell Focus",
    type: "toggle",
    description: "Channel magic for increased spell effectiveness",
    levelReq: 5,
    effect: { spellDamageBonus: 0.3, manaCostIncrease: 0.2 }
  },
  {
    name: "Arcane Explosion",
    type: "active", 
    description: "Devastating area damage around the caster",
    levelReq: 10,
    prerequisites: ["Arcane Mastery"],
    effect: { areaDamage: "3d8", radius: 2 },
    manaCost: 15,
    cooldown: 45
  }
];
```

### Ability System Implementation
```typescript
interface CharacterAbility {
  id: string;
  name: string;
  type: 'active' | 'passive' | 'toggle';
  currentRank: number;
  maxRank: number;
  isActive?: boolean; // For toggle abilities
  lastUsed?: Date;
  cooldownRemaining?: number;
}

'abilities': async () => {
  // Display available and learned abilities
  // Show ability points available
  // Highlight abilities that can be learned/upgraded
};

'learn <ability>': async (abilityName: string) => {
  // Check prerequisites and ability points
  // Learn new ability or increase rank
  // Deduct ability points
};

'use <ability> [target]': async (abilityName: string, target?: string) => {
  // Check if ability is known and off cooldown
  // Apply ability effects
  // Start cooldown timer
};

'toggle <ability>': async (abilityName: string) => {
  // Toggle ability on/off
  // Apply/remove passive effects
};
```

### Class-Specific Mechanics
```typescript
const getClassBonuses = (character: Character): ClassBonuses => {
  const classData = CLASS_DESCRIPTIONS[character.character_class];
  
  return {
    hitPointBonus: classData.hitDieBonus * character.level,
    armorProficiency: classData.armorProficiency,
    weaponProficiency: classData.weaponProficiency,
    spellcasting: classData.spellcasting || false,
    primaryAttributes: classData.primaryAttributes
  };
};

const canUseEquipment = (character: Character, item: Item): boolean => {
  const classBonuses = getClassBonuses(character);
  
  if (item.type === 'armor') {
    return classBonuses.armorProficiency.includes(item.armorType);
  }
  
  if (item.type === 'weapon') {
    return classBonuses.weaponProficiency.includes(item.weaponType);
  }
  
  return true;
};
```

### Ability Point System
```typescript
const calculateAbilityPoints = (character: Character): number => {
  // Gain 1 ability point per level
  const basePoints = character.level;
  
  // Bonus points for reaching certain milestones
  const milestoneBonus = Math.floor(character.level / 5);
  
  return basePoints + milestoneBonus;
};

const getAbilityCost = (ability: ClassAbility, currentRank: number): number => {
  // Cost increases with each rank
  return ability.level_requirement + currentRank;
};
```

### Implementation Areas
- **Class Service**: Manage class selection and bonuses
- **Ability System**: Handle ability learning, usage, and effects
- **Equipment Integration**: Class restrictions on gear
- **Combat Integration**: Class abilities in combat scenarios
- **Character Creation**: Class selection during game start

## Related

- Dependencies: Character Attributes System, Leveling System
- Enables: Specialized gameplay styles, tactical depth
- Integration: Combat System (class abilities), Magic System (spellcasters)
- Future: Multiclassing, prestige classes, class-specific quests
- References: `specs/rpg-systems-comprehensive.md` Character Classes section