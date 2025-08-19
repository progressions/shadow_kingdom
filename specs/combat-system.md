# Shadow Kingdom: Combat System Specification

**Date**: 2025-01-21  
**Version**: 1.0  
**Type**: Technical Specification  

## Overview

The Combat System provides turn-based tactical combat for Shadow Kingdom, featuring strategic decision-making, equipment effects, and AI-driven opponents. Combat is designed to be engaging while maintaining the text-based interface's accessibility.

## Core Combat Mechanics

### 1. Combat Flow

#### Combat Initiation
```typescript
enum CombatTrigger {
  PLAYER_ATTACK = 'player_attack',     // Player initiates combat
  NPC_AGGRESSION = 'npc_aggression',   // Hostile NPC attacks player
  ROOM_ENCOUNTER = 'room_encounter',   // Entering room with hostiles
  QUEST_COMBAT = 'quest_combat'        // Story-driven combat
}

interface CombatInitiation {
  trigger: CombatTrigger;
  participants: Character[];
  location: Room;
  surprise_round?: boolean;
}
```

#### Turn-Based Structure
1. **Initiative Phase**: Roll initiative, determine turn order
2. **Combat Rounds**: Each participant takes actions in order
3. **Resolution Phase**: Apply damage, check for death/victory
4. **Cleanup Phase**: Award XP, distribute loot, update state

### 2. Initiative System

```typescript
interface InitiativeRoll {
  character_id: number;
  base_initiative: number;
  equipment_bonus: number;
  random_roll: number;
  total_initiative: number;
}

function calculateInitiative(character: Character, equipment: Item[]): number {
  const baseInitiative = 10;
  const levelBonus = character.level;
  const dexterityBonus = character.dexterity || 0; // Future stat
  const equipmentBonus = equipment.reduce((sum, item) => 
    sum + (item.properties.initiative_bonus || 0), 0
  );
  const randomRoll = randomInt(1, 20);
  
  return baseInitiative + levelBonus + dexterityBonus + equipmentBonus + randomRoll;
}
```

### 3. Combat Actions

#### Primary Actions (One per turn)
```typescript
enum CombatAction {
  ATTACK = 'attack',           // Standard weapon/unarmed attack
  DEFEND = 'defend',           // Increase defense until next turn
  USE_ITEM = 'use_item',       // Consume potion or activate item
  CAST_SPELL = 'cast_spell',   // Use magical abilities (future)
  FLEE = 'flee'                // Attempt to escape combat
}

interface ActionResult {
  action: CombatAction;
  actor_id: number;
  target_id?: number;
  success: boolean;
  damage_dealt?: number;
  effects_applied?: StatusEffect[];
  message: string;
}
```

#### Secondary Actions (Free with primary)
- **Move**: Change position in formation
- **Speak**: Attempt diplomacy or intimidation
- **Draw/Sheathe**: Change equipped weapon
- **Drop Item**: Free inventory space

### 4. Damage System

#### Attack Resolution
```typescript
interface AttackRoll {
  attacker_id: number;
  target_id: number;
  weapon?: Item;
  accuracy_roll: number;
  hit_threshold: number;
  is_hit: boolean;
  is_critical: boolean;
  base_damage: number;
  final_damage: number;
}

function resolveAttack(
  attacker: Character, 
  target: Character, 
  weapon?: Item
): AttackRoll {
  // Accuracy check
  const accuracyRoll = randomInt(1, 20);
  const attackBonus = attacker.level + (weapon?.properties.accuracy || 0);
  const defenseValue = 10 + target.defense + target.level;
  const isHit = (accuracyRoll + attackBonus) >= defenseValue;
  
  if (!isHit) {
    return {
      attacker_id: attacker.id,
      target_id: target.id,
      weapon,
      accuracy_roll: accuracyRoll,
      hit_threshold: defenseValue,
      is_hit: false,
      is_critical: false,
      base_damage: 0,
      final_damage: 0
    };
  }
  
  // Damage calculation
  const weaponDamage = weapon?.properties.damage || 0;
  const baseDamage = attacker.attack + weaponDamage;
  const targetDefense = target.defense;
  const rawDamage = Math.max(1, baseDamage - targetDefense);
  
  // Critical hit check (natural 20 or weapon crit range)
  const critThreshold = weapon?.properties.crit_range || 20;
  const isCritical = accuracyRoll >= critThreshold;
  const critMultiplier = weapon?.properties.crit_multiplier || 2;
  const finalDamage = isCritical ? rawDamage * critMultiplier : rawDamage;
  
  return {
    attacker_id: attacker.id,
    target_id: target.id,
    weapon,
    accuracy_roll: accuracyRoll,
    hit_threshold: defenseValue,
    is_hit: true,
    is_critical: isCritical,
    base_damage: rawDamage,
    final_damage: finalDamage
  };
}
```

#### Damage Types (Future Enhancement)
- **Physical**: Reduced by armor defense
- **Magical**: Reduced by magical resistance
- **Elemental**: Fire, ice, lightning effects
- **True**: Bypasses all defenses

### 5. Status Effects

```typescript
interface StatusEffect {
  id: string;
  name: string;
  type: 'buff' | 'debuff' | 'neutral';
  duration: number; // turns remaining
  effects: {
    hp_change?: number;      // damage/healing per turn
    stat_modifiers?: {       // temporary stat changes
      attack?: number;
      defense?: number;
      accuracy?: number;
    };
    action_restrictions?: CombatAction[]; // blocked actions
  };
  description: string;
}

// Common status effects
const POISON: StatusEffect = {
  id: 'poison',
  name: 'Poisoned',
  type: 'debuff',
  duration: 3,
  effects: { hp_change: -5 },
  description: 'Taking poison damage each turn'
};

const DEFEND_BONUS: StatusEffect = {
  id: 'defending',
  name: 'Defending',
  type: 'buff',
  duration: 1,
  effects: { stat_modifiers: { defense: 5 } },
  description: 'Increased defense until next turn'
};
```

## Combat States and Management

### 1. Combat Encounter

```typescript
interface CombatEncounter {
  id: number;
  game_id: number;
  room_id: number;
  participants: CombatParticipant[];
  turn_order: number[];
  current_turn: number;
  round_number: number;
  status: 'active' | 'completed' | 'fled';
  winner?: 'player' | 'npcs';
  created_at: Date;
  ended_at?: Date;
}

interface CombatParticipant {
  character_id: number;
  faction: 'player' | 'npcs';
  initiative: number;
  position: number; // formation position
  status_effects: StatusEffect[];
  is_alive: boolean;
  actions_taken: CombatAction[];
}
```

### 2. Combat Service

```typescript
interface CombatService {
  // Combat Management
  initiateCombat(
    gameId: number, 
    roomId: number, 
    participants: Character[]
  ): Promise<CombatEncounter>;
  
  endCombat(encounterId: number, result: CombatResult): Promise<void>;
  fleeCombat(encounterId: number, fleeingCharacterId: number): Promise<boolean>;
  
  // Turn Management
  getCurrentActor(encounterId: number): Promise<Character>;
  advanceTurn(encounterId: number): Promise<void>;
  isPlayerTurn(encounterId: number): Promise<boolean>;
  
  // Combat Actions
  executeAttack(
    encounterId: number, 
    attackerId: number, 
    targetId: number
  ): Promise<ActionResult>;
  
  executeDefend(encounterId: number, defenderId: number): Promise<ActionResult>;
  executeUseItem(
    encounterId: number, 
    userId: number, 
    itemId: number, 
    targetId?: number
  ): Promise<ActionResult>;
  
  // Status Effects
  applyStatusEffect(
    encounterId: number, 
    characterId: number, 
    effect: StatusEffect
  ): Promise<void>;
  
  processStatusEffects(encounterId: number): Promise<ActionResult[]>;
  
  // AI Combat
  executeAITurn(encounterId: number, npcId: number): Promise<ActionResult>;
}
```

### 3. Combat Result

```typescript
interface CombatResult {
  victory_type: 'defeat_all' | 'flee_successful' | 'surrender';
  survivors: number[];
  casualties: number[];
  experience_awarded: number;
  loot_generated: Item[];
  duration_rounds: number;
}

async function resolveCombatVictory(
  encounter: CombatEncounter, 
  survivors: Character[]
): Promise<CombatResult> {
  const casualties = encounter.participants
    .filter(p => !p.is_alive)
    .map(p => p.character_id);
  
  // Award experience to survivors
  const totalXP = casualties.reduce((sum, casualtyId) => {
    const casualty = encounter.participants.find(p => p.character_id === casualtyId);
    return sum + calculateCombatXP(casualty?.character_id);
  }, 0);
  
  for (const survivor of survivors) {
    await awardExperience(survivor.id, totalXP);
  }
  
  // Generate loot from defeated NPCs
  const loot = await generateCombatLoot(casualties);
  
  return {
    victory_type: 'defeat_all',
    survivors: survivors.map(s => s.id),
    casualties,
    experience_awarded: totalXP,
    loot_generated: loot,
    duration_rounds: encounter.round_number
  };
}
```

## AI Combat Behavior

### 1. NPC Combat AI

```typescript
enum CombatPersonality {
  AGGRESSIVE = 'aggressive',   // Always attacks, prefers damage
  DEFENSIVE = 'defensive',     // Uses defend action, cautious
  TACTICAL = 'tactical',       // Adapts to situation
  BERSERKER = 'berserker',     // Reckless attacks, ignores defense
  COWARD = 'coward'           // Attempts to flee when low HP
}

interface NPCCombatBehavior {
  personality: CombatPersonality;
  target_priority: 'lowest_hp' | 'highest_threat' | 'random' | 'player_first';
  flee_threshold: number; // HP percentage to attempt flee
  item_usage: 'never' | 'healing_only' | 'tactical';
  special_abilities?: string[]; // Future: unique NPC abilities
}

async function determineAIAction(
  npc: Character, 
  encounter: CombatEncounter, 
  behavior: NPCCombatBehavior
): Promise<CombatAction> {
  const hpPercentage = npc.hp / npc.max_hp;
  
  // Check flee condition
  if (hpPercentage <= behavior.flee_threshold && behavior.personality !== 'berserker') {
    return CombatAction.FLEE;
  }
  
  // Check item usage
  if (hpPercentage < 0.5 && behavior.item_usage !== 'never') {
    const healingItem = await findHealingItem(npc.id);
    if (healingItem) {
      return CombatAction.USE_ITEM;
    }
  }
  
  // Determine attack target
  const targets = getValidTargets(encounter, npc.id);
  if (targets.length === 0) return CombatAction.DEFEND;
  
  const target = selectTarget(targets, behavior.target_priority);
  
  // Action based on personality
  switch (behavior.personality) {
    case CombatPersonality.AGGRESSIVE:
    case CombatPersonality.BERSERKER:
      return CombatAction.ATTACK;
      
    case CombatPersonality.DEFENSIVE:
      return Math.random() < 0.7 ? CombatAction.DEFEND : CombatAction.ATTACK;
      
    case CombatPersonality.TACTICAL:
      return analyzeTacticalSituation(npc, encounter, targets);
      
    default:
      return CombatAction.ATTACK;
  }
}
```

### 2. Dynamic AI Responses

```typescript
function analyzeTacticalSituation(
  npc: Character, 
  encounter: CombatEncounter, 
  targets: Character[]
): CombatAction {
  const npcHpRatio = npc.hp / npc.max_hp;
  const averageEnemyHp = targets.reduce((sum, t) => sum + (t.hp / t.max_hp), 0) / targets.length;
  
  // Defensive if outnumbered or low HP
  if (targets.length > 1 || npcHpRatio < 0.4) {
    return CombatAction.DEFEND;
  }
  
  // Aggressive if enemies are weak
  if (averageEnemyHp < 0.3) {
    return CombatAction.ATTACK;
  }
  
  // Default tactical choice
  return Math.random() < 0.6 ? CombatAction.ATTACK : CombatAction.DEFEND;
}
```

## Player Combat Interface

### 1. Combat Commands

```typescript
// Combat-specific commands (only available during combat)
interface CombatCommands {
  'attack <target>': 'Attack specified target';
  'defend': 'Increase defense until next turn';
  'use <item>': 'Use item from inventory';
  'flee': 'Attempt to escape combat';
  'look': 'Examine combat situation';
  'status': 'Show character status and effects';
  'targets': 'List available targets';
  'inventory': 'Show usable items';
}

// Example combat command handlers
async function handleAttackCommand(
  gameId: number, 
  args: string[]
): Promise<string> {
  const encounter = await getActiveCombat(gameId);
  if (!encounter) return "You are not in combat.";
  
  const targetName = args.join(' ');
  const target = await findTargetByName(encounter.id, targetName);
  if (!target) return `No target named "${targetName}" found.`;
  
  const playerId = await getPlayerCharacterId(gameId);
  const result = await executeAttack(encounter.id, playerId, target.id);
  
  return formatCombatResult(result);
}
```

### 2. Combat Display

```typescript
function formatCombatStatus(encounter: CombatEncounter): string {
  const currentActor = getCurrentActor(encounter);
  const participants = encounter.participants;
  
  let output = "=== COMBAT ===\n";
  output += `Round ${encounter.round_number}\n`;
  output += `Current Turn: ${currentActor.name}\n\n`;
  
  // Show all participants with HP
  for (const participant of participants) {
    const character = getCharacter(participant.character_id);
    const statusIcons = participant.status_effects.map(e => getStatusIcon(e)).join(' ');
    const hpBar = createHPBar(character.hp, character.max_hp);
    
    output += `${character.name}: ${hpBar} ${statusIcons}\n`;
  }
  
  output += "\nAvailable actions: attack, defend, use, flee, look\n";
  return output;
}

function createHPBar(current: number, max: number): string {
  const percentage = current / max;
  const barLength = 20;
  const filled = Math.floor(percentage * barLength);
  const empty = barLength - filled;
  
  return `[${'\u2588'.repeat(filled)}${'\u2591'.repeat(empty)}] ${current}/${max}`;
}
```

## Integration with Game Systems

### 1. Equipment Effects

```typescript
interface CombatEquipmentEffect {
  weapon_damage: number;
  armor_defense: number;
  accuracy_bonus: number;
  initiative_bonus: number;
  special_abilities: string[];
  status_immunities: string[];
}

function calculateEquipmentEffects(characterId: number): Promise<CombatEquipmentEffect> {
  const equipment = await getEquippedItems(characterId);
  
  return equipment.reduce((total, item) => ({
    weapon_damage: total.weapon_damage + (item.properties.damage || 0),
    armor_defense: total.armor_defense + (item.properties.defense || 0),
    accuracy_bonus: total.accuracy_bonus + (item.properties.accuracy || 0),
    initiative_bonus: total.initiative_bonus + (item.properties.initiative || 0),
    special_abilities: [...total.special_abilities, ...(item.properties.abilities || [])],
    status_immunities: [...total.status_immunities, ...(item.properties.immunities || [])]
  }), {
    weapon_damage: 0,
    armor_defense: 0,
    accuracy_bonus: 0,
    initiative_bonus: 0,
    special_abilities: [],
    status_immunities: []
  });
}
```

### 2. Room Integration

```typescript
interface CombatRoom {
  room_id: number;
  environmental_effects: EnvironmentalEffect[];
  escape_routes: number; // number of exits for flee attempts
  terrain_type: 'open' | 'cramped' | 'hazardous';
  lighting: 'bright' | 'dim' | 'dark';
}

interface EnvironmentalEffect {
  name: string;
  description: string;
  effects: {
    accuracy_modifier?: number;
    damage_modifier?: number;
    status_per_turn?: StatusEffect;
  };
}

// Example: Fighting in a dark room
const DARKNESS_EFFECT: EnvironmentalEffect = {
  name: 'Darkness',
  description: 'Limited visibility affects accuracy',
  effects: {
    accuracy_modifier: -3
  }
};
```

### 3. Experience and Loot Integration

```typescript
function calculateCombatXP(defeatedCharacter: Character): number {
  const baseXP = defeatedCharacter.level * 25;
  const difficultyMultiplier = 1.0; // Based on level difference
  return Math.floor(baseXP * difficultyMultiplier);
}

async function generateCombatLoot(defeatedNPCs: number[]): Promise<Item[]> {
  const loot: Item[] = [];
  
  for (const npcId of defeatedNPCs) {
    const npc = await getNPC(npcId);
    const lootTable = await getLootTable('npc', npc.character_id);
    
    for (const entry of lootTable) {
      if (Math.random() < entry.drop_rate) {
        const quantity = randomInt(entry.min_quantity, entry.max_quantity);
        loot.push(...await createItems(entry.item_id, quantity));
      }
    }
  }
  
  return loot;
}
```

## Performance and Optimization

### 1. Combat State Management

- **Active Combat Cache**: Keep combat encounters in memory
- **Turn Queue**: Pre-calculate turn order for efficiency
- **Batch Updates**: Group database writes
- **AI Decision Caching**: Cache AI decisions for similar situations

### 2. Database Optimization

```sql
-- Indexes for combat performance
CREATE INDEX idx_combat_active ON combat_encounters(game_id, status) 
WHERE status = 'active';

CREATE INDEX idx_combat_participants ON combat_encounters USING GIN(participants);

CREATE INDEX idx_character_combat_stats ON characters(id, hp, max_hp, attack, defense);
```

### 3. Concurrent Combat

- Handle multiple simultaneous combats per game
- Lock combat state during action execution
- Queue AI actions to prevent race conditions

## Future Enhancements

### 1. Advanced Combat Features

- **Formation System**: Positioning affects combat
- **Combo Attacks**: Chained actions for bonus effects
- **Environmental Interactions**: Use terrain in combat
- **Group Combat**: Multiple characters vs multiple NPCs

### 2. Special Abilities

- **Class Abilities**: Unique actions per character class
- **Magic System**: Spells with mana costs
- **Item Abilities**: Active use items with cooldowns
- **Passive Abilities**: Always-active character traits

### 3. Combat Modes

- **Stealth Combat**: Surprise attacks and hiding
- **Ranged Combat**: Bow/crossbow mechanics
- **Mounted Combat**: Fighting while on horseback
- **Naval Combat**: Ship-to-ship battles

---

*The Combat System provides engaging tactical gameplay while maintaining Shadow Kingdom's text-based accessibility and AI-driven narrative focus.*