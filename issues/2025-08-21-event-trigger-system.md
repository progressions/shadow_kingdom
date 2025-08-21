# Event Trigger System

**Date**: 2025-08-21  
**Status**: Open  
**Priority**: High  
**Category**: Feature  

## Description

Implement a comprehensive event-driven trigger system that executes effects and consequences based on player actions, item interactions, and game state changes. This system complements the Action Validation System by providing reactive gameplay mechanics where actions have dynamic consequences beyond their immediate effects.

## Details

**What is the requirement?**
Create a flexible trigger system that responds to game events with configurable effects:

- **Item Triggers**: Effects when items are equipped, unequipped, picked up, or dropped
- **Movement Triggers**: Events when entering/exiting rooms or using specific exits
- **Combat Triggers**: Reactions to attacks, damage, kills, and deaths
- **Environmental Triggers**: Time-based, proximity-based, and state-based events
- **Interaction Triggers**: Consequences for examining, using, or interacting with objects
- **Chain Reactions**: Triggers that can activate other triggers (with loop prevention)

**Acceptance criteria:**
- [ ] EventTriggerService that processes and executes triggers
- [ ] Database schema for storing trigger definitions and conditions
- [ ] Integration with item, equipment, and movement systems
- [ ] Support for multiple effects per trigger
- [ ] Cascading event support with infinite loop prevention
- [ ] Conditional execution based on game state
- [ ] Clear logging of trigger executions for debugging
- [ ] Performance optimization for frequent trigger checks

## Technical Notes

### Database Schema

```sql
-- Main trigger definitions
CREATE TABLE event_triggers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                    -- Human-readable trigger name
  description TEXT,                       -- What this trigger does
  entity_type TEXT NOT NULL,             -- 'item', 'room', 'connection', 'npc', 'global'
  entity_id INTEGER,                      -- ID of the entity (null for global)
  event_type TEXT NOT NULL,              -- 'equip', 'unequip', 'pickup', 'drop', 'enter', 'exit', 'use', 'examine', 'attack', 'damage', 'kill', 'timer'
  priority INTEGER DEFAULT 0,             -- Execution order (lower = first)
  enabled BOOLEAN DEFAULT TRUE,           -- Can be disabled temporarily
  max_executions INTEGER,                 -- Limit how many times it can fire (null = unlimited)
  execution_count INTEGER DEFAULT 0,      -- Track how many times it has fired
  cooldown_seconds INTEGER,               -- Minimum time between executions
  last_executed DATETIME,                 -- Track last execution for cooldown
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_entity_trigger (entity_type, entity_id, event_type),
  INDEX idx_event_type (event_type)
);

-- Conditions that must be met for trigger to fire
CREATE TABLE trigger_conditions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger_id INTEGER NOT NULL,
  condition_order INTEGER DEFAULT 0,      -- Order to evaluate conditions
  condition_type TEXT NOT NULL,           -- 'attribute_check', 'item_possessed', 'health_check', 'room_check', 'flag_check', 'random_chance'
  comparison_operator TEXT,                -- '>', '<', '=', '>=', '<=', '!=', 'contains'
  condition_value TEXT NOT NULL,          -- JSON-encoded value for complex conditions
  logic_operator TEXT DEFAULT 'AND',      -- 'AND' or 'OR' with next condition
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trigger_id) REFERENCES event_triggers(id) ON DELETE CASCADE,
  INDEX idx_trigger_conditions (trigger_id, condition_order)
);

-- Effects that execute when trigger fires
CREATE TABLE trigger_effects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger_id INTEGER NOT NULL,
  effect_order INTEGER DEFAULT 0,         -- Order to execute effects
  effect_type TEXT NOT NULL,              -- 'spawn_creature', 'damage', 'heal', 'add_item', 'remove_item', 'apply_status', 'modify_attribute', 'lock_exit', 'unlock_exit', 'teleport', 'message', 'activate_trigger'
  target_type TEXT NOT NULL,              -- 'self', 'character', 'room', 'item', 'connection'
  target_specifier TEXT,                  -- Additional targeting info (e.g., 'all_in_room', 'random', specific ID)
  effect_data TEXT NOT NULL,              -- JSON-encoded effect parameters
  delay_seconds INTEGER DEFAULT 0,        -- Delay before effect executes
  duration_seconds INTEGER,                -- For temporary effects
  message TEXT,                            -- Message to display when effect occurs
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trigger_id) REFERENCES event_triggers(id) ON DELETE CASCADE,
  INDEX idx_trigger_effects (trigger_id, effect_order)
);

-- Track trigger execution history (for debugging and gameplay)
CREATE TABLE trigger_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger_id INTEGER NOT NULL,
  character_id INTEGER,
  room_id INTEGER,
  event_type TEXT NOT NULL,
  event_data TEXT,                        -- JSON context of the event
  effects_applied TEXT,                   -- JSON array of effects that were applied
  execution_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trigger_id) REFERENCES event_triggers(id) ON DELETE CASCADE,
  INDEX idx_trigger_history (trigger_id, execution_time),
  INDEX idx_character_history (character_id, execution_time)
);

-- Status effects applied to characters
CREATE TABLE character_status_effects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id INTEGER NOT NULL,
  status_type TEXT NOT NULL,              -- 'cursed', 'blessed', 'poisoned', 'strengthened', 'weakened', 'invisible', 'paralyzed'
  source_trigger_id INTEGER,              -- Which trigger applied this
  effect_data TEXT,                       -- JSON data for the effect
  expires_at DATETIME,                    -- When the effect expires
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  FOREIGN KEY (source_trigger_id) REFERENCES event_triggers(id) ON DELETE SET NULL,
  INDEX idx_character_status (character_id, status_type),
  INDEX idx_status_expiry (expires_at)
);
```

### EventTriggerService

```typescript
interface TriggerContext {
  character: Character;
  room?: Room;
  item?: Item;
  targetEntity?: any;
  eventData?: Record<string, any>;
}

interface TriggerEffect {
  type: string;
  target: string;
  data: any;
  delay?: number;
  duration?: number;
  message?: string;
}

class EventTriggerService {
  private activeTriggers = new Set<number>(); // Prevent infinite loops
  
  constructor(
    private db: Database,
    private characterService: CharacterService,
    private itemService: ItemService,
    private roomService: RoomService
  ) {}

  /**
   * Main trigger processing method
   */
  async processTrigger(
    eventType: string,
    entityType: string,
    entityId: number | null,
    context: TriggerContext
  ): Promise<void> {
    // Find applicable triggers
    const triggers = await this.findApplicableTriggers(
      eventType,
      entityType,
      entityId
    );

    for (const trigger of triggers) {
      // Prevent infinite loops
      if (this.activeTriggers.has(trigger.id)) {
        console.log(`Preventing infinite loop for trigger ${trigger.id}`);
        continue;
      }

      // Check execution limits
      if (!this.canExecuteTrigger(trigger)) {
        continue;
      }

      // Evaluate conditions
      const conditionsMet = await this.evaluateConditions(
        trigger.id,
        context
      );

      if (!conditionsMet) {
        continue;
      }

      // Execute effects
      this.activeTriggers.add(trigger.id);
      try {
        await this.executeTriggerEffects(trigger, context);
        await this.updateTriggerExecution(trigger.id);
        await this.logTriggerExecution(trigger, context);
      } finally {
        this.activeTriggers.delete(trigger.id);
      }
    }
  }

  /**
   * Find triggers that match the event
   */
  private async findApplicableTriggers(
    eventType: string,
    entityType: string,
    entityId: number | null
  ): Promise<any[]> {
    const query = entityId
      ? `SELECT * FROM event_triggers 
         WHERE event_type = ? AND entity_type = ? AND entity_id = ? 
           AND enabled = TRUE 
         ORDER BY priority`
      : `SELECT * FROM event_triggers 
         WHERE event_type = ? AND entity_type = ? AND entity_id IS NULL 
           AND enabled = TRUE 
         ORDER BY priority`;
    
    const params = entityId 
      ? [eventType, entityType, entityId]
      : [eventType, entityType];
    
    return await this.db.all(query, params);
  }

  /**
   * Check if trigger can execute (cooldown, max executions)
   */
  private canExecuteTrigger(trigger: any): boolean {
    // Check max executions
    if (trigger.max_executions && 
        trigger.execution_count >= trigger.max_executions) {
      return false;
    }

    // Check cooldown
    if (trigger.cooldown_seconds && trigger.last_executed) {
      const lastExec = new Date(trigger.last_executed).getTime();
      const now = Date.now();
      const cooldownMs = trigger.cooldown_seconds * 1000;
      
      if (now - lastExec < cooldownMs) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate all conditions for a trigger
   */
  private async evaluateConditions(
    triggerId: number,
    context: TriggerContext
  ): Promise<boolean> {
    const conditions = await this.db.all(
      `SELECT * FROM trigger_conditions 
       WHERE trigger_id = ? 
       ORDER BY condition_order`,
      [triggerId]
    );

    if (conditions.length === 0) {
      return true; // No conditions = always fire
    }

    let result = true;
    let previousLogic = 'AND';

    for (const condition of conditions) {
      const met = await this.evaluateCondition(condition, context);
      
      if (previousLogic === 'AND') {
        result = result && met;
      } else {
        result = result || met;
      }
      
      previousLogic = condition.logic_operator || 'AND';
    }

    return result;
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: any,
    context: TriggerContext
  ): Promise<boolean> {
    const value = JSON.parse(condition.condition_value);
    
    switch (condition.condition_type) {
      case 'attribute_check':
        return this.checkAttribute(
          context.character,
          value.attribute,
          condition.comparison_operator,
          value.value
        );
      
      case 'item_possessed':
        return await this.checkItemPossessed(
          context.character.id,
          value.item_id
        );
      
      case 'health_check':
        return this.checkHealth(
          context.character,
          condition.comparison_operator,
          value.threshold
        );
      
      case 'room_check':
        return context.room?.id === value.room_id;
      
      case 'flag_check':
        return await this.checkGameFlag(
          context.character.game_id,
          value.flag_name,
          value.expected_value
        );
      
      case 'random_chance':
        return Math.random() < value.probability;
      
      default:
        return false;
    }
  }

  /**
   * Execute all effects for a trigger
   */
  private async executeTriggerEffects(
    trigger: any,
    context: TriggerContext
  ): Promise<void> {
    const effects = await this.db.all(
      `SELECT * FROM trigger_effects 
       WHERE trigger_id = ? 
       ORDER BY effect_order`,
      [trigger.id]
    );

    for (const effect of effects) {
      if (effect.delay_seconds > 0) {
        // Schedule delayed effect
        setTimeout(
          () => this.executeEffect(effect, context),
          effect.delay_seconds * 1000
        );
      } else {
        await this.executeEffect(effect, context);
      }
    }
  }

  /**
   * Execute a single effect
   */
  private async executeEffect(
    effect: any,
    context: TriggerContext
  ): Promise<void> {
    const data = JSON.parse(effect.effect_data);
    
    // Display message if provided
    if (effect.message) {
      // Send message to appropriate display service
      console.log(effect.message);
    }

    switch (effect.effect_type) {
      case 'spawn_creature':
        await this.spawnCreature(data, context);
        break;
      
      case 'damage':
        await this.applyDamage(
          this.resolveTarget(effect, context),
          data.amount
        );
        break;
      
      case 'heal':
        await this.applyHealing(
          this.resolveTarget(effect, context),
          data.amount
        );
        break;
      
      case 'add_item':
        await this.addItem(
          this.resolveTarget(effect, context),
          data.item_id,
          data.quantity || 1
        );
        break;
      
      case 'remove_item':
        await this.removeItem(
          this.resolveTarget(effect, context),
          data.item_id,
          data.quantity || 1
        );
        break;
      
      case 'apply_status':
        await this.applyStatusEffect(
          this.resolveTarget(effect, context),
          data.status_type,
          effect.duration_seconds,
          data
        );
        break;
      
      case 'modify_attribute':
        await this.modifyAttribute(
          this.resolveTarget(effect, context),
          data.attribute,
          data.modifier,
          effect.duration_seconds
        );
        break;
      
      case 'lock_exit':
        await this.lockExit(context.room?.id, data.direction);
        break;
      
      case 'unlock_exit':
        await this.unlockExit(context.room?.id, data.direction);
        break;
      
      case 'teleport':
        await this.teleportCharacter(
          context.character.id,
          data.room_id
        );
        break;
      
      case 'activate_trigger':
        // Recursively activate another trigger
        await this.processTrigger(
          data.event_type,
          data.entity_type,
          data.entity_id,
          context
        );
        break;
    }

    // Handle temporary effects
    if (effect.duration_seconds) {
      setTimeout(
        () => this.removeTemporaryEffect(effect, context),
        effect.duration_seconds * 1000
      );
    }
  }

  /**
   * Resolve target for an effect
   */
  private resolveTarget(effect: any, context: TriggerContext): any {
    switch (effect.target_type) {
      case 'self':
        return context.character;
      case 'room':
        return context.room;
      case 'item':
        return context.item;
      default:
        return context.targetEntity;
    }
  }

  // Effect implementation methods...
  private async spawnCreature(data: any, context: TriggerContext) {
    await this.characterService.createCharacter({
      game_id: context.character.game_id,
      name: data.creature_name,
      type: CharacterType.ENEMY,
      current_room_id: context.room?.id || context.character.current_room_id,
      ...data.attributes
    });
  }

  private async applyDamage(target: Character, amount: number) {
    const health = await this.characterService.getCharacterHealth(target.id);
    if (health) {
      await this.characterService.updateCharacterHealth(
        target.id,
        health.current - amount
      );
    }
  }

  private async applyHealing(target: Character, amount: number) {
    const health = await this.characterService.getCharacterHealth(target.id);
    if (health) {
      await this.characterService.updateCharacterHealth(
        target.id,
        Math.min(health.current + amount, health.max)
      );
    }
  }

  private async applyStatusEffect(
    target: Character,
    statusType: string,
    duration: number | undefined,
    data: any
  ) {
    const expiresAt = duration 
      ? new Date(Date.now() + duration * 1000).toISOString()
      : null;

    await this.db.run(`
      INSERT INTO character_status_effects 
      (character_id, status_type, effect_data, expires_at)
      VALUES (?, ?, ?, ?)
    `, [target.id, statusType, JSON.stringify(data), expiresAt]);
  }

  // Additional helper methods...
}
```

### Integration with Existing Systems

```typescript
// In GameController - equip command
async handleEquip(itemName: string) {
  // ... existing validation and equip logic ...
  
  // After successful equip
  await this.equipmentService.equipItem(characterId, item.item_id);
  
  // Trigger equip event
  await this.eventTriggerService.processTrigger(
    'equip',
    'item',
    item.item_id,
    {
      character: this.character,
      room: this.currentRoom,
      item: item.item
    }
  );
  
  this.tui.display(`You equipped ${item.item.name}.`, MessageType.SYSTEM);
}

// In GameController - drop command
async handleDrop(itemName: string) {
  // ... existing validation and drop logic ...
  
  // After successful drop
  await this.itemService.transferItemToRoom(
    characterId,
    targetItem.item_id,
    currentRoom.id
  );
  
  // Trigger drop event
  await this.eventTriggerService.processTrigger(
    'drop',
    'item',
    targetItem.item_id,
    {
      character: this.character,
      room: this.currentRoom,
      item: targetItem.item
    }
  );
  
  this.tui.display(`You dropped ${targetItem.item.name}.`, MessageType.SYSTEM);
}

// In movement system
async moveToRoom(roomId: number) {
  const oldRoom = this.currentRoom;
  
  // Trigger exit event for old room
  if (oldRoom) {
    await this.eventTriggerService.processTrigger(
      'exit',
      'room',
      oldRoom.id,
      { character: this.character, room: oldRoom }
    );
  }
  
  // Move character
  await this.characterService.moveCharacter(this.character.id, roomId);
  
  // Trigger enter event for new room
  await this.eventTriggerService.processTrigger(
    'enter',
    'room',
    roomId,
    { character: this.character, room: newRoom }
  );
}
```

### Example Trigger Configurations

```sql
-- Cursed Sword: Equipping summons a hostile guardian
INSERT INTO event_triggers (name, entity_type, entity_id, event_type) 
VALUES ('Cursed Sword Guardian', 'item', 42, 'equip');

INSERT INTO trigger_effects (trigger_id, effect_type, effect_data, message)
VALUES (
  1, 
  'spawn_creature',
  '{"creature_name": "Spectral Guardian", "attributes": {"strength": 16, "constitution": 14}}',
  'A spectral guardian materializes, bound to protect the cursed blade!'
);

-- Healing Spring: Entering room provides regeneration
INSERT INTO event_triggers (name, entity_type, entity_id, event_type)
VALUES ('Healing Spring', 'room', 15, 'enter');

INSERT INTO trigger_effects (trigger_id, effect_type, effect_data, message)
VALUES (
  2,
  'heal',
  '{"amount": 5}',
  'The healing waters restore some of your vitality.'
);

-- Poison Trap: 30% chance when picking up gold
INSERT INTO event_triggers (name, entity_type, entity_id, event_type)
VALUES ('Poisoned Gold', 'item', 10, 'pickup');

INSERT INTO trigger_conditions (trigger_id, condition_type, condition_value)
VALUES (3, 'random_chance', '{"probability": 0.3}');

INSERT INTO trigger_effects (trigger_id, effect_type, effect_data, message)
VALUES (
  3,
  'apply_status',
  '{"status_type": "poisoned", "damage_per_turn": 2}',
  'The gold coins were coated with poison! You feel sick.'
);

-- Ancient Tome: Reading damages but grants wisdom
INSERT INTO event_triggers (name, entity_type, entity_id, event_type)
VALUES ('Forbidden Knowledge', 'item', 55, 'examine');

INSERT INTO trigger_effects (trigger_id, effect_order, effect_type, effect_data, message)
VALUES 
  (4, 0, 'damage', '{"amount": 10}', 'The forbidden knowledge burns your mind!'),
  (4, 1, 'modify_attribute', '{"attribute": "wisdom", "modifier": 2}', 'But you gain profound insight.');

-- Boss Room: Entering with low health spawns help
INSERT INTO event_triggers (name, entity_type, entity_id, event_type)
VALUES ('Divine Intervention', 'room', 100, 'enter');

INSERT INTO trigger_conditions (trigger_id, condition_type, comparison_operator, condition_value)
VALUES (5, 'health_check', '<', '{"threshold": 0.3}');

INSERT INTO trigger_effects (trigger_id, effect_type, effect_data, message)
VALUES (
  5,
  'spawn_creature',
  '{"creature_name": "Spirit Guide", "type": "npc", "attributes": {"charisma": 18}}',
  'Seeing your dire state, a spirit guide appears to aid you!'
);

-- Portal Stone: Using teleports to another room
INSERT INTO event_triggers (name, entity_type, entity_id, event_type)
VALUES ('Portal Stone Activation', 'item', 77, 'use');

INSERT INTO trigger_effects (trigger_id, effect_type, effect_data, message)
VALUES (
  6,
  'teleport',
  '{"room_id": 50}',
  'The portal stone glows brightly and you are transported to another place!'
);

-- Trap Door: Examining triggers fall to lower level
INSERT INTO event_triggers (name, entity_type, entity_id, event_type)
VALUES ('Hidden Trap Door', 'room', 25, 'examine');

INSERT INTO trigger_conditions (trigger_id, condition_type, condition_value)
VALUES (7, 'random_chance', '{"probability": 0.5}');

INSERT INTO trigger_effects (trigger_id, effect_order, effect_type, effect_data, message)
VALUES 
  (7, 0, 'damage', '{"amount": 5}', 'The floor gives way beneath you!'),
  (7, 1, 'teleport', '{"room_id": 26}', 'You fall through to the room below!');

-- Cursed Mirror: Looking teleports to mirror dimension
INSERT INTO event_triggers (name, entity_type, entity_id, event_type)
VALUES ('Mirror of Displacement', 'item', 88, 'examine');

INSERT INTO trigger_effects (trigger_id, effect_order, effect_type, effect_data, message)
VALUES (
  8, 0,
  'teleport',
  '{"room_id": 200}',
  'Your reflection reaches out and pulls you into the mirror world!'
);

-- Magic Circle: Entering with specific item teleports to secret area
INSERT INTO event_triggers (name, entity_type, entity_id, event_type)
VALUES ('Arcane Circle', 'room', 45, 'enter');

INSERT INTO trigger_conditions (trigger_id, condition_type, condition_value)
VALUES (9, 'item_possessed', '{"item_id": 99}');

INSERT INTO trigger_effects (trigger_id, effect_type, effect_data, message)
VALUES (
  9,
  'teleport',
  '{"room_id": 300}',
  'The mystic key resonates with the circle! You are transported to a hidden sanctum!'
);
```

### Status Effect Processing

```typescript
class StatusEffectProcessor {
  constructor(
    private db: Database,
    private characterService: CharacterService
  ) {}

  /**
   * Process active status effects (called each turn/tick)
   */
  async processStatusEffects(characterId: number): Promise<void> {
    // Get active effects
    const effects = await this.db.all(`
      SELECT * FROM character_status_effects
      WHERE character_id = ?
        AND (expires_at IS NULL OR expires_at > datetime('now'))
    `, [characterId]);

    for (const effect of effects) {
      const data = JSON.parse(effect.effect_data);
      
      switch (effect.status_type) {
        case 'poisoned':
          await this.processPoisonEffect(characterId, data);
          break;
        case 'blessed':
          await this.processBlessedEffect(characterId, data);
          break;
        case 'cursed':
          await this.processCursedEffect(characterId, data);
          break;
        // ... other status effects
      }
    }

    // Clean up expired effects
    await this.removeExpiredEffects(characterId);
  }

  private async processPoisonEffect(characterId: number, data: any) {
    const damage = data.damage_per_turn || 1;
    const health = await this.characterService.getCharacterHealth(characterId);
    if (health) {
      await this.characterService.updateCharacterHealth(
        characterId,
        health.current - damage
      );
      // Display poison damage message
    }
  }

  // ... other effect processors
}
```

## Implementation Strategy

### Phase 1: Core Infrastructure
- EventTriggerService base implementation
- Database tables and basic CRUD operations
- Simple trigger execution (no conditions)

### Phase 2: Condition System
- Condition evaluation engine
- Complex condition logic (AND/OR)
- Game state checks

### Phase 3: Effect Types
- Basic effects (damage, heal, spawn)
- Status effect system
- Temporary modifiers

### Phase 4: Advanced Features
- Cascading triggers
- Delayed and duration-based effects
- Performance optimization
- Trigger debugging tools

## Related

- Works WITH: Action Validation System (triggers fire after validation passes)
- Enables: Complex item behaviors, environmental hazards, story events
- Dependencies: Character System, Item System, Equipment System
- Integration: All action commands will check for triggers after execution
- Future: Quest triggers, dialogue consequences, combo effects

## Notes

- Triggers execute AFTER actions complete successfully
- Action Validation prevents actions; Triggers create consequences
- Loop prevention is critical for cascading triggers
- Performance impact should be monitored for rooms with many triggers
- Consider caching frequently-checked triggers for optimization