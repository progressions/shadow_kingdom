# Shadow Kingdom: Character System Specification

**Date**: 2025-01-21  
**Version**: 1.0  
**Type**: Technical Specification  

## Overview

The Character System is the foundation of Shadow Kingdom's RPG mechanics, managing player and NPC statistics, progression, and abilities. This system provides the framework for combat, skill development, and character differentiation.

## Core Components

### 1. Character Attributes

#### Primary Stats
- **Hit Points (HP)**: Current health (0 = unconscious/dead)
- **Maximum HP**: Total health capacity
- **Attack**: Base damage modifier for physical attacks
- **Defense**: Damage reduction from incoming attacks
- **Level**: Overall character progression indicator
- **Experience (XP)**: Points accumulated toward next level

#### Secondary Stats (Derived)
- **Initiative**: Turn order in combat (base + equipment + random)
- **Carry Capacity**: Maximum inventory weight (base + strength modifiers)
- **Accuracy**: Hit chance modifier (base + weapon + level)
- **Critical Hit Chance**: Probability of dealing double damage

#### Resources
- **Gold**: Primary currency for trading
- **Mana**: Magic points for spellcasting (future feature)
- **Stamina**: Action points for special abilities (future feature)

### 2. Character Types

#### Player Characters
- Single character per game session
- Full progression and customization
- Persistent across game saves
- Death results in respawn with penalties

#### NPCs (Non-Player Characters)
- AI-controlled entities
- Simplified stat sets for performance
- Respawn based on configuration
- Behavior driven by disposition and AI personality

## Character Progression

### 1. Experience and Leveling

#### Experience Sources
```typescript
interface ExperienceSource {
  combat_victory: number;    // XP per enemy defeated
  quest_completion: number;  // XP per quest finished
  discovery: number;         // XP for finding new areas
  interaction: number;       // XP for successful dialogue/trade
}
```

#### Level Progression
```typescript
// XP required for next level: 100 * level^1.5
function getXPRequiredForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

// Total XP required to reach a level
function getTotalXPForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += getXPRequiredForLevel(i);
  }
  return total;
}
```

#### Level Benefits
Each level provides:
- **+10 Maximum HP**
- **+2 Attack** (alternating levels)
- **+1 Defense** (alternating levels)
- **+5 Carry Capacity**
- **Skill Point** for abilities (future)

### 2. Character Creation

#### Default Player Stats (Level 1)
```typescript
interface DefaultPlayerStats {
  level: 1;
  experience: 0;
  hp: 100;
  max_hp: 100;
  attack: 12;
  defense: 8;
  gold: 50;
}
```

#### Stat Allocation (Future Enhancement)
Players can distribute points among stats:
- **Strength**: Increases attack and carry capacity
- **Constitution**: Increases HP and defense
- **Dexterity**: Increases accuracy and initiative
- **Intelligence**: Increases mana and spell effectiveness
- **Charisma**: Improves NPC interactions and trade prices

## Character Classes (Future Feature)

### Base Classes
1. **Fighter**: High HP and attack, moderate defense
2. **Rogue**: High dexterity and critical chance, low HP
3. **Mage**: High intelligence for spells, low physical stats
4. **Cleric**: Balanced stats with healing abilities

### Class Progression
- Unique abilities and bonuses per class
- Different stat growth rates
- Class-specific equipment restrictions
- Special class quests and storylines

## Character Services

### 1. CharacterService Class

```typescript
interface CharacterService {
  // Character Management
  createCharacter(gameId: number, name: string, type: 'player' | 'npc'): Promise<Character>;
  getCharacter(characterId: number): Promise<Character | null>;
  updateCharacter(characterId: number, updates: Partial<Character>): Promise<void>;
  deleteCharacter(characterId: number): Promise<void>;
  
  // Experience and Leveling
  awardExperience(characterId: number, amount: number): Promise<void>;
  checkLevelUp(characterId: number): Promise<boolean>;
  levelUpCharacter(characterId: number): Promise<void>;
  
  // Health Management
  dealDamage(characterId: number, amount: number): Promise<void>;
  healCharacter(characterId: number, amount: number): Promise<void>;
  isCharacterAlive(characterId: number): Promise<boolean>;
  
  // Resource Management
  addGold(characterId: number, amount: number): Promise<void>;
  removeGold(characterId: number, amount: number): Promise<boolean>;
  getGold(characterId: number): Promise<number>;
  
  // Stat Calculations
  getEffectiveStats(characterId: number): Promise<EffectiveStats>;
  calculateCarryCapacity(characterId: number): Promise<number>;
  calculateInitiative(characterId: number): Promise<number>;
}
```

### 2. Character Data Model

```typescript
interface Character {
  id: number;
  game_id: number;
  name: string;
  type: 'player' | 'npc';
  
  // Core Stats
  level: number;
  experience: number;
  hp: number;
  max_hp: number;
  attack: number;
  defense: number;
  
  // Resources
  gold: number;
  
  // Metadata
  created_at: Date;
  last_updated: Date;
}

interface EffectiveStats {
  hp: number;
  max_hp: number;
  attack: number;      // base + equipment bonuses
  defense: number;     // base + equipment bonuses
  initiative: number;  // derived stat
  carry_capacity: number;
  accuracy: number;
  critical_chance: number;
}
```

### 3. NPC Management

#### NPC Generation
```typescript
interface NPCTemplate {
  name: string;
  level_range: [number, number];
  disposition: 'friendly' | 'neutral' | 'hostile';
  base_stats: {
    hp_multiplier: number;
    attack_multiplier: number;
    defense_multiplier: number;
  };
  ai_personality: string;
  loot_table_id?: number;
}

// Generate NPC from template
async function generateNPC(template: NPCTemplate, gameId: number, roomId: number): Promise<NPC> {
  const level = randomInt(template.level_range[0], template.level_range[1]);
  const baseHP = 80 + (level * 8);
  const baseAttack = 8 + (level * 1.5);
  const baseDefense = 5 + (level * 1);
  
  return {
    character: {
      game_id: gameId,
      name: template.name,
      type: 'npc',
      level: level,
      hp: Math.floor(baseHP * template.base_stats.hp_multiplier),
      max_hp: Math.floor(baseHP * template.base_stats.hp_multiplier),
      attack: Math.floor(baseAttack * template.base_stats.attack_multiplier),
      defense: Math.floor(baseDefense * template.base_stats.defense_multiplier),
      gold: randomInt(level * 5, level * 15),
      experience: 0
    },
    npc_data: {
      room_id: roomId,
      disposition: template.disposition,
      ai_personality: template.ai_personality,
      movement_pattern: 'stationary'
    }
  };
}
```

#### NPC Behavior States
```typescript
interface NPCBehavior {
  id: number;
  character_id: number;
  current_state: 'idle' | 'patrolling' | 'combat' | 'fleeing' | 'trading' | 'dialogue';
  target_character_id?: number;
  state_data: Record<string, any>; // State-specific data
  last_action: Date;
}
```

## Combat Integration

### 1. Combat Stats

#### Damage Calculation
```typescript
function calculateDamage(
  attacker: EffectiveStats, 
  defender: EffectiveStats, 
  weapon?: Item
): number {
  const baseDamage = attacker.attack + (weapon?.properties.damage || 0);
  const defense = defender.defense;
  const rawDamage = Math.max(1, baseDamage - defense);
  
  // Critical hit check
  const isCritical = Math.random() < attacker.critical_chance;
  const finalDamage = isCritical ? rawDamage * 2 : rawDamage;
  
  return Math.floor(finalDamage);
}
```

#### Initiative System
```typescript
function rollInitiative(character: Character, equipment: Item[]): number {
  const baseInitiative = 10;
  const levelBonus = character.level;
  const equipmentBonus = equipment.reduce((sum, item) => 
    sum + (item.properties.initiative_bonus || 0), 0
  );
  const randomRoll = randomInt(1, 20);
  
  return baseInitiative + levelBonus + equipmentBonus + randomRoll;
}
```

### 2. Death and Respawn

#### Player Death
```typescript
async function handlePlayerDeath(characterId: number): Promise<void> {
  const character = await getCharacter(characterId);
  
  // Apply death penalty
  const xpLoss = Math.floor(character.experience * 0.1); // 10% XP loss
  const goldLoss = Math.floor(character.gold * 0.2);     // 20% gold loss
  
  await updateCharacter(characterId, {
    hp: character.max_hp, // Full heal on respawn
    experience: Math.max(0, character.experience - xpLoss),
    gold: Math.max(0, character.gold - goldLoss)
  });
  
  // Move to respawn location (usually starting room)
  await movePlayerToRespawnPoint(character.game_id);
}
```

#### NPC Death
```typescript
async function handleNPCDeath(npcId: number): Promise<void> {
  const npc = await getNPC(npcId);
  
  // Drop loot
  await generateLootDrop(npc.character_id, npc.room_id);
  
  // Award XP to killer(s)
  await awardCombatExperience(npc.character_id);
  
  // Schedule respawn if configured
  if (npc.spawn_rate > 0) {
    await scheduleNPCRespawn(npcId, npc.respawn_timer);
  }
  
  // Remove from current room
  await updateNPC(npcId, { room_id: null });
}
```

## Character Persistence

### 1. Save System Integration

#### Auto-save Triggers
- Level up achieved
- Significant stat changes (equipment, gold)
- Room transitions
- Combat resolution
- Quest completion

#### Manual Save
```typescript
async function saveCharacterState(characterId: number): Promise<void> {
  const character = await getCharacter(characterId);
  const inventory = await getCharacterInventory(characterId);
  const equipment = await getEquippedItems(characterId);
  
  // Update database with current state
  await updateCharacter(characterId, character);
  await saveInventoryState(characterId, inventory);
  await saveEquipmentState(characterId, equipment);
  
  // Update last_played timestamp
  await updateGameTimestamp(character.game_id);
}
```

### 2. Character Validation

#### Stat Validation
```typescript
function validateCharacterStats(character: Character): ValidationResult {
  const errors: string[] = [];
  
  if (character.hp < 0) errors.push("HP cannot be negative");
  if (character.hp > character.max_hp) errors.push("HP cannot exceed max HP");
  if (character.level < 1) errors.push("Level must be at least 1");
  if (character.experience < 0) errors.push("Experience cannot be negative");
  if (character.attack < 1) errors.push("Attack must be at least 1");
  if (character.defense < 0) errors.push("Defense cannot be negative");
  if (character.gold < 0) errors.push("Gold cannot be negative");
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

## Performance Considerations

### 1. Caching Strategy
- Cache frequently accessed character stats
- Invalidate cache on stat changes
- Use in-memory cache for active combat characters

### 2. Database Optimization
- Index on game_id and character type
- Batch stat updates where possible
- Use triggers for automatic calculations

### 3. Concurrent Access
- Handle multiple players in same game
- Lock character records during combat
- Queue stat updates to prevent race conditions

## Commands Integration

### Character-Related Commands
```typescript
// Player commands
'stats' | 'status'     // Show character stats and status
'level' | 'experience' // Show level and XP progress
'health' | 'hp'        // Show current and max HP

// Admin/debug commands  
'setlevel <level>'      // Set character level (testing)
'heal'                  // Restore full HP
'addxp <amount>'        // Add experience points
'addgold <amount>'      // Add gold
```

### Command Handlers
```typescript
async function handleStatsCommand(gameId: number): Promise<string> {
  const character = await getPlayerCharacter(gameId);
  const effectiveStats = await getEffectiveStats(character.id);
  
  return `
Character: ${character.name} (Level ${character.level})
HP: ${character.hp}/${character.max_hp}
Attack: ${effectiveStats.attack} | Defense: ${effectiveStats.defense}
Experience: ${character.experience}/${getXPRequiredForLevel(character.level + 1)}
Gold: ${character.gold}
  `.trim();
}
```

## Future Enhancements

### 1. Advanced Progression
- **Skill Trees**: Branching abilities per class
- **Prestige System**: Reset with bonuses
- **Multi-classing**: Hybrid character builds

### 2. Character Customization
- **Appearance**: Visual character description
- **Backstory**: Player-created character history
- **Personality**: Traits affecting NPC interactions

### 3. Social Features
- **Character Profiles**: Public character information
- **Leaderboards**: Level and achievement rankings
- **Character Comparison**: Stat comparison tools

---

*The Character System provides the foundation for all RPG mechanics in Shadow Kingdom, supporting both simple gameplay and complex character progression paths.*