# Event Trigger System Implementation Specification

## Overview

The Event Trigger System provides comprehensive event-driven gameplay mechanics that execute configurable effects and consequences based on player actions, item interactions, and game state changes. This system enables reactive gameplay where actions have dynamic consequences beyond their immediate effects.

## Architecture

### Core Components

1. **EventTriggerService** - Main service for processing and executing triggers
2. **Database Schema** - Tables for storing trigger definitions, conditions, and effects
3. **StatusEffectProcessor** - Handles ongoing status effects on characters
4. **Integration Points** - Hooks into existing game systems

### Database Schema

The system uses four main tables:

```sql
-- Main trigger definitions
CREATE TABLE event_triggers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  entity_type TEXT NOT NULL,     -- 'item', 'room', 'connection', 'npc', 'global'
  entity_id INTEGER,             -- ID of the entity (null for global)
  event_type TEXT NOT NULL,      -- 'equip', 'unequip', 'pickup', 'drop', 'enter', 'exit', 'use', 'examine'
  priority INTEGER DEFAULT 0,    -- Execution order (lower = first)
  enabled BOOLEAN DEFAULT TRUE,
  max_executions INTEGER,        -- Limit executions (null = unlimited)
  execution_count INTEGER DEFAULT 0,
  cooldown_seconds INTEGER,      -- Minimum time between executions
  last_executed DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Conditions that must be met for trigger to fire
CREATE TABLE trigger_conditions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger_id INTEGER NOT NULL,
  condition_order INTEGER DEFAULT 0,
  condition_type TEXT NOT NULL,  -- 'attribute_check', 'item_possessed', 'health_check', 'room_check', 'random_chance'
  comparison_operator TEXT,      -- '>', '<', '=', '>=', '<=', '!=', 'contains'
  condition_value TEXT NOT NULL, -- JSON-encoded value
  logic_operator TEXT DEFAULT 'AND', -- 'AND' or 'OR' with next condition
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trigger_id) REFERENCES event_triggers(id) ON DELETE CASCADE
);

-- Effects that execute when trigger fires
CREATE TABLE trigger_effects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger_id INTEGER NOT NULL,
  effect_order INTEGER DEFAULT 0,
  effect_type TEXT NOT NULL,     -- 'spawn_creature', 'damage', 'heal', 'add_item', 'remove_item', 'apply_status'
  target_type TEXT NOT NULL,     -- 'self', 'character', 'room', 'item', 'connection'
  target_specifier TEXT,         -- Additional targeting info
  effect_data TEXT NOT NULL,     -- JSON-encoded effect parameters
  delay_seconds INTEGER DEFAULT 0,
  duration_seconds INTEGER,      -- For temporary effects
  message TEXT,                  -- Message to display
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trigger_id) REFERENCES event_triggers(id) ON DELETE CASCADE
);

-- Track trigger execution history
CREATE TABLE trigger_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger_id INTEGER NOT NULL,
  character_id INTEGER,
  room_id INTEGER,
  event_type TEXT NOT NULL,
  event_data TEXT,              -- JSON context
  effects_applied TEXT,         -- JSON array of effects
  execution_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trigger_id) REFERENCES event_triggers(id) ON DELETE CASCADE
);

-- Status effects applied to characters
CREATE TABLE character_status_effects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id INTEGER NOT NULL,
  status_type TEXT NOT NULL,     -- 'cursed', 'blessed', 'poisoned', 'strengthened'
  source_trigger_id INTEGER,
  effect_data TEXT,             -- JSON data for the effect
  expires_at DATETIME,          -- When the effect expires
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  FOREIGN KEY (source_trigger_id) REFERENCES event_triggers(id) ON DELETE SET NULL
);
```

### EventTriggerService Interface

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
  async processTrigger(
    eventType: string,
    entityType: string,
    entityId: number | null,
    context: TriggerContext
  ): Promise<void>;

  private async findApplicableTriggers(
    eventType: string,
    entityType: string,
    entityId: number | null
  ): Promise<any[]>;

  private canExecuteTrigger(trigger: any): boolean;
  private async evaluateConditions(triggerId: number, context: TriggerContext): Promise<boolean>;
  private async executeTriggerEffects(trigger: any, context: TriggerContext): Promise<void>;
}
```

## Implementation Phases

### Phase 1: Core Infrastructure
1. Create database tables
2. Implement EventTriggerService base class
3. Basic trigger execution without conditions
4. Integration with existing command system

### Phase 2: Condition System
1. Condition evaluation engine
2. Complex condition logic (AND/OR)
3. Game state checks
4. Health and attribute conditions

### Phase 3: Effect Types
1. Basic effects (damage, heal, spawn)
2. Status effect system
3. Temporary modifiers
4. Item manipulation effects

### Phase 4: Advanced Features
1. Cascading triggers
2. Delayed and duration-based effects
3. Performance optimization
4. Trigger debugging tools

## Integration Points

### Equipment System Integration
```typescript
// In GameController equip command
async handleEquip(itemName: string) {
  // ... existing logic ...
  
  // After successful equip
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
}
```

### Movement System Integration
```typescript
// In movement system
async moveToRoom(roomId: number) {
  const oldRoom = this.currentRoom;
  
  // Trigger exit event
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
  
  // Trigger enter event
  await this.eventTriggerService.processTrigger(
    'enter',
    'room',
    roomId,
    { character: this.character, room: newRoom }
  );
}
```

## Testing Strategy

### Unit Tests
- EventTriggerService trigger processing
- Condition evaluation logic
- Effect execution
- Status effect processing

### Integration Tests
- Trigger execution with real game context
- Database operations
- Performance with multiple triggers

### Example Test Cases
```typescript
describe('EventTriggerService', () => {
  test('should execute trigger on item equip', async () => {
    // Setup cursed sword trigger
    // Equip cursed sword
    // Verify guardian spawned
  });

  test('should evaluate conditions correctly', async () => {
    // Setup health-based trigger
    // Test with different health values
    // Verify condition evaluation
  });
});
```

## Example Trigger Configurations

### Cursed Sword Example
```sql
-- Trigger definition
INSERT INTO event_triggers (name, entity_type, entity_id, event_type) 
VALUES ('Cursed Sword Guardian', 'item', 42, 'equip');

-- Effect: spawn guardian
INSERT INTO trigger_effects (trigger_id, effect_type, effect_data, message)
VALUES (
  1, 
  'spawn_creature',
  '{"creature_name": "Spectral Guardian", "attributes": {"strength": 16}}',
  'A spectral guardian materializes!'
);
```

### Healing Spring Example
```sql
-- Trigger: entering room heals player
INSERT INTO event_triggers (name, entity_type, entity_id, event_type)
VALUES ('Healing Spring', 'room', 15, 'enter');

INSERT INTO trigger_effects (trigger_id, effect_type, effect_data, message)
VALUES (
  2,
  'heal',
  '{"amount": 5}',
  'The healing waters restore your vitality.'
);
```

### Poison Trap Example
```sql
-- Random chance poison when picking up gold
INSERT INTO event_triggers (name, entity_type, entity_id, event_type)
VALUES ('Poisoned Gold', 'item', 10, 'pickup');

-- Condition: 30% chance
INSERT INTO trigger_conditions (trigger_id, condition_type, condition_value)
VALUES (3, 'random_chance', '{"probability": 0.3}');

-- Effect: apply poison status
INSERT INTO trigger_effects (trigger_id, effect_type, effect_data, message)
VALUES (
  3,
  'apply_status',
  '{"status_type": "poisoned", "damage_per_turn": 2}',
  'The gold was poisoned! You feel sick.'
);
```

## Performance Considerations

### Optimization Strategies
1. **Trigger Indexing**: Database indexes on entity_type, entity_id, event_type
2. **Condition Caching**: Cache frequently-evaluated conditions
3. **Loop Prevention**: Active trigger tracking to prevent infinite loops
4. **Batch Processing**: Group multiple effects for performance

### Memory Management
- Clean up expired status effects
- Rotate trigger history periodically
- Limit concurrent active triggers

## Error Handling

### Graceful Degradation
- Continue gameplay if trigger execution fails
- Log trigger errors for debugging
- Fallback to normal command execution

### Validation
- Validate trigger definitions on creation
- Sanitize effect data to prevent exploits
- Verify target entities exist before execution

## Future Enhancements

### Planned Extensions
1. **Scripting Integration**: Lua or JavaScript for complex triggers
2. **Trigger Templates**: Pre-built common trigger patterns
3. **Analytics**: Track trigger usage and effectiveness

### Integration Opportunities
- Quest system integration
- Dialogue consequence triggers
- Combat combo effects
- Environmental storytelling

## Success Metrics

### Functional Metrics
- Trigger execution accuracy: 100%
- Performance impact: <50ms per trigger
- System reliability: 99.9% uptime

### Gameplay Metrics
- Enhanced player engagement
- Increased world interactivity
- Rich consequence system for actions

This specification provides the foundation for implementing a comprehensive event trigger system that enhances Shadow Kingdom's interactive gameplay while maintaining performance and reliability.