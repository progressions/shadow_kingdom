# Magic System

**Date**: 2025-08-20  
**Status**: Open  
**Priority**: Low  
**Category**: Feature  

## Description

Implement a comprehensive magic system with spell schools, mana management, spell learning, and magical effects that integrate with combat, exploration, and social interactions.

## Details

**What is the requirement?**
Create a magic system with the following features:

- **Spell Schools**: Six schools of magic with distinct themes and effects
- **Mana System**: Intelligence-based magical energy for casting spells
- **Spell Learning**: Discover spells through books, NPCs, and exploration
- **Spell Components**: Material requirements for powerful spells
- **Magical Effects**: Spells affecting combat, environment, and interactions
- **Spell Preparation**: Limited spell selection per day/rest
- **Ritual Casting**: Extended casting for powerful non-combat effects

**Acceptance criteria:**
- [ ] Database schema for spells and character spell knowledge
- [ ] Mana point system based on Intelligence attribute
- [ ] Six spell schools with distinct spell lists
- [ ] `cast <spell>` command for spell casting
- [ ] `spells` command to view known spells and mana
- [ ] Spell learning through items, NPCs, and exploration
- [ ] Component system for advanced spells
- [ ] Integration with combat and exploration systems

## Technical Notes

### Spell Schools
```typescript
enum SpellSchool {
  EVOCATION = 'evocation',        // Direct damage and energy
  ENCHANTMENT = 'enchantment',    // Mind control and behavior
  TRANSMUTATION = 'transmutation', // Physical transformation
  DIVINATION = 'divination',      // Information and foresight
  NECROMANCY = 'necromancy',      // Death and undead magic
  HEALING = 'healing'             // Restoration and protection
}

const SPELL_SCHOOL_THEMES = {
  [SpellSchool.EVOCATION]: {
    description: "Direct damage and energy manipulation",
    examples: ["Magic Missile", "Fireball", "Lightning Bolt", "Energy Shield"]
  },
  [SpellSchool.ENCHANTMENT]: {
    description: "Mind control and behavior modification", 
    examples: ["Charm Person", "Sleep", "Confusion", "Suggestion"]
  },
  [SpellSchool.TRANSMUTATION]: {
    description: "Physical transformation and alteration",
    examples: ["Strength Enhancement", "Stone Skin", "Polymorph", "Teleport"]
  },
  [SpellSchool.DIVINATION]: {
    description: "Information gathering and future sight",
    examples: ["Detect Magic", "Identify", "Scrying", "True Seeing"]
  },
  [SpellSchool.NECROMANCY]: {
    description: "Death magic and undead manipulation",
    examples: ["Drain Life", "Speak with Dead", "Animate Skeleton", "Death Ward"]
  },
  [SpellSchool.HEALING]: {
    description: "Restoration and protective magic",
    examples: ["Heal Wounds", "Cure Disease", "Protection Circle", "Regeneration"]
  }
};
```

### Database Schema
```sql
CREATE TABLE spells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  school TEXT NOT NULL, -- evocation, enchantment, etc.
  level INTEGER NOT NULL, -- 1-9 spell level
  mana_cost INTEGER NOT NULL,
  casting_time TEXT DEFAULT 'standard', -- standard, ritual, instant
  components TEXT, -- JSON array of required components
  target_type TEXT DEFAULT 'single', -- single, area, self, touch
  duration INTEGER DEFAULT 0, -- duration in rounds, 0 = instant
  damage_dice TEXT, -- for damage spells: '2d6+int'
  effect_type TEXT, -- damage, healing, buff, debuff, utility
  effect_data TEXT, -- JSON data for spell effects
  learnable_by TEXT, -- JSON array of classes/conditions
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE character_spells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id INTEGER NOT NULL,
  spell_id INTEGER NOT NULL,
  learned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  times_cast INTEGER DEFAULT 0,
  mastery_level INTEGER DEFAULT 1, -- 1-5, affects effectiveness
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  FOREIGN KEY (spell_id) REFERENCES spells(id) ON DELETE CASCADE
);

-- Add to characters table
ALTER TABLE characters ADD COLUMN max_mana INTEGER DEFAULT 0;
ALTER TABLE characters ADD COLUMN current_mana INTEGER DEFAULT 0;
ALTER TABLE characters ADD COLUMN spell_save_dc INTEGER DEFAULT 8; -- 8 + proficiency + int modifier
```

### Mana System
```typescript
const calculateMaxMana = (character: Character): number => {
  const baseMana = 10; // Starting mana
  const intModifier = Math.floor((character.intelligence - 10) / 2);
  const levelBonus = (character.level - 1) * 5; // 5 mana per level
  
  return baseMana + intModifier + levelBonus;
};

const calculateSpellSaveDC = (character: Character): number => {
  const baseDC = 8;
  const proficiencyBonus = Math.floor((character.level + 7) / 4); // +2 to +6
  const intModifier = Math.floor((character.intelligence - 10) / 2);
  
  return baseDC + proficiencyBonus + intModifier;
};

const restoreMana = (character: Character, amount: number) => {
  character.current_mana = Math.min(
    character.max_mana,
    character.current_mana + amount
  );
};
```

### Spell Learning System
```typescript
interface SpellSource {
  type: 'scroll' | 'book' | 'npc' | 'exploration' | 'level';
  requirements: {
    level?: number;
    intelligence?: number;
    school_familiarity?: SpellSchool;
    quest_completed?: string;
  };
}

const canLearnSpell = (character: Character, spell: Spell): boolean => {
  // Check level requirement
  if (character.level < spell.level) return false;
  
  // Check intelligence requirement
  const intRequirement = 10 + spell.level;
  if (character.intelligence < intRequirement) return false;
  
  // Check if already known
  if (character.knowsSpell(spell.id)) return false;
  
  return true;
};

const learnSpell = async (character: Character, spell: Spell, source: SpellSource): Promise<boolean> => {
  if (!canLearnSpell(character, spell)) return false;
  
  // Learning success based on intelligence and spell level
  const difficulty = 10 + (spell.level * 2);
  const intBonus = Math.floor((character.intelligence - 10) / 2);
  const roll = Math.random() * 20 + intBonus;
  
  if (roll >= difficulty) {
    await addSpellToCharacter(character.id, spell.id);
    return true;
  }
  
  return false;
};
```

### Spell Casting System
```typescript
interface SpellCastResult {
  success: boolean;
  damage?: number;
  healing?: number;
  effects?: StatusEffect[];
  message: string;
}

'cast <spell> [target]': async (spellName: string, target?: string) => {
  const spell = findKnownSpell(character, spellName);
  if (!spell) return "You don't know that spell.";
  
  // Check mana cost
  if (character.current_mana < spell.mana_cost) {
    return "You don't have enough mana to cast that spell.";
  }
  
  // Determine target
  const spellTarget = resolveSpellTarget(spell, target, character);
  if (!spellTarget && spell.target_type !== 'self') {
    return "Invalid target for that spell.";
  }
  
  // Cast the spell
  character.current_mana -= spell.mana_cost;
  const result = executeSpell(spell, character, spellTarget);
  
  // Update spell usage statistics
  incrementSpellUsage(character.id, spell.id);
  
  return result.message;
};

'spells': async () => {
  // Display known spells by school
  // Show mana: current/max
  // Include spell levels and costs
};
```

### Spell Effects System
```typescript
const executeSpell = (spell: Spell, caster: Character, target?: any): SpellCastResult => {
  const intModifier = Math.floor((caster.intelligence - 10) / 2);
  
  switch (spell.effect_type) {
    case 'damage':
      const damage = rollDamage(spell.damage_dice, intModifier);
      applyDamage(target, damage);
      return { success: true, damage, message: `${spell.name} deals ${damage} damage!` };
    
    case 'healing':
      const healing = rollHealing(spell.damage_dice, intModifier);
      applyHealing(target, healing);
      return { success: true, healing, message: `${spell.name} heals ${healing} HP!` };
    
    case 'buff':
      const effect = createBuffEffect(spell, caster);
      applyStatusEffect(target, effect);
      return { success: true, message: `${target.name} is enhanced by ${spell.name}!` };
    
    case 'utility':
      return executeUtilitySpell(spell, caster, target);
  }
};
```

### Component System
```typescript
interface SpellComponent {
  type: 'material' | 'somatic' | 'verbal';
  name: string;
  consumed: boolean; // Is component used up?
  cost: number; // Cost in gold pieces
}

const checkSpellComponents = (character: Character, spell: Spell): boolean => {
  if (!spell.components) return true;
  
  const components = JSON.parse(spell.components);
  
  return components.every(component => {
    if (component.type === 'material') {
      const hasComponent = character.hasItem(component.name);
      return hasComponent;
    }
    return true; // Somatic and verbal components always available
  });
};
```

### Implementation Areas
- **Spell Service**: Manage spell data, learning, and casting
- **Mana System**: Track magical energy and regeneration
- **Effect System**: Apply spell effects to targets
- **Learning System**: Spell acquisition through various sources
- **Combat Integration**: Spell effects in combat scenarios

## Related

- Dependencies: Character Attributes System (Intelligence), Combat System
- Enables: Advanced character customization, tactical combat options
- Integration: Item System (spell components), NPC System (spell teachers)
- Future: Spell crafting, magical items, spell research
- References: `specs/rpg-systems-comprehensive.md` Magic System section