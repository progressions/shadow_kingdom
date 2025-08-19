# Shadow Kingdom: Database Schema Specification

**Date**: 2025-01-21  
**Version**: 2.0  
**Type**: Technical Specification  

## Overview

This document defines the complete database schema for Shadow Kingdom's RPG system, extending the existing adventure game foundation with comprehensive RPG mechanics including characters, combat, inventory, NPCs, quests, and loot systems.

## Current Schema (v1.0)

### Existing Tables

```sql
-- Game sessions
CREATE TABLE games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_played_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Room definitions
CREATE TABLE rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  generation_processed BOOLEAN DEFAULT FALSE,
  region_id INTEGER,
  region_distance INTEGER, -- Distance from region center (0 = center)
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (region_id) REFERENCES regions(id)
);

-- Room connections
CREATE TABLE connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  from_room_id INTEGER NOT NULL,
  to_room_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (from_room_id) REFERENCES rooms(id),
  FOREIGN KEY (to_room_id) REFERENCES rooms(id)
);

-- Player state
CREATE TABLE game_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL UNIQUE,
  current_room_id INTEGER NOT NULL,
  player_name TEXT,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (current_room_id) REFERENCES rooms(id)
);
```

## Enhanced Schema (v2.0)

### New RPG Tables

#### Regions Table
Manages thematic world regions for contextual AI generation.

```sql
CREATE TABLE regions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  name TEXT, -- "Blackwood Mansion", "Whispering Forest"
  type TEXT NOT NULL, -- "mansion", "forest", "cave", "dungeon", "town"
  description TEXT NOT NULL, -- Rich context for AI: "A decaying Victorian mansion with dark secrets and overgrown gardens"
  center_room_id INTEGER, -- The discovered center room (null until found)
  
  -- Generation metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (center_room_id) REFERENCES rooms(id)
);

-- Index for region queries
CREATE INDEX idx_regions_game ON regions(game_id);
CREATE INDEX idx_regions_type ON regions(type);
```

### Enhanced Existing Tables

#### Rooms Enhancement
Add region support and distance-based generation.

```sql
-- Add new columns to existing rooms table
ALTER TABLE rooms ADD COLUMN region_id INTEGER;
ALTER TABLE rooms ADD COLUMN region_distance INTEGER; -- 0 = center, 1-7 = distance from center

-- Add foreign key for regions (during migration)
-- ALTER TABLE rooms ADD FOREIGN KEY (region_id) REFERENCES regions(id);

-- Additional room enhancements
ALTER TABLE rooms ADD COLUMN room_type TEXT DEFAULT 'normal' 
  CHECK (room_type IN ('normal', 'shop', 'temple', 'dungeon', 'safe_zone', 'region_center'));
ALTER TABLE rooms ADD COLUMN features JSON; -- {lighting: 'dark', temperature: 'cold', hazards: ['trap']}
ALTER TABLE rooms ADD COLUMN containers JSON; -- [{"name": "chest", "locked": true, "items": [1,2,3]}]
ALTER TABLE rooms ADD COLUMN npcs_spawned BOOLEAN DEFAULT FALSE;

-- Indexes for room queries
CREATE INDEX idx_rooms_region ON rooms(region_id);
CREATE INDEX idx_rooms_region_distance ON rooms(region_id, region_distance);
CREATE INDEX idx_rooms_region_center ON rooms(region_id) WHERE region_distance = 0;
```

#### Characters Table
Stores all character data for both players and NPCs.

```sql
CREATE TABLE characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('player', 'npc')),
  
  -- Core Stats
  level INTEGER DEFAULT 1 CHECK (level > 0),
  experience INTEGER DEFAULT 0 CHECK (experience >= 0),
  hp INTEGER NOT NULL CHECK (hp >= 0),
  max_hp INTEGER NOT NULL CHECK (max_hp > 0),
  attack INTEGER DEFAULT 10 CHECK (attack > 0),
  defense INTEGER DEFAULT 5 CHECK (defense >= 0),
  
  -- Resources
  gold INTEGER DEFAULT 0 CHECK (gold >= 0),
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  UNIQUE(game_id, name) -- Unique names per game
);

-- Trigger to update last_updated on character changes
CREATE TRIGGER update_character_timestamp 
  AFTER UPDATE ON characters
  BEGIN
    UPDATE characters SET last_updated = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
```

#### Items Table
Defines all possible items in the game.

```sql
CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  
  -- Item Classification
  type TEXT NOT NULL CHECK (type IN ('weapon', 'armor', 'consumable', 'key', 'quest', 'treasure')),
  subtype TEXT, -- sword, potion, door_key, etc.
  
  -- Properties
  value INTEGER DEFAULT 0 CHECK (value >= 0), -- sell price in gold
  weight INTEGER DEFAULT 1 CHECK (weight > 0), -- inventory weight
  stackable BOOLEAN DEFAULT FALSE, -- can multiple be in one slot
  max_stack INTEGER DEFAULT 1 CHECK (max_stack > 0),
  
  -- Item Effects (JSON)
  properties JSON, -- {damage: 15, durability: 100, effects: ['sharp']}
  
  -- Description
  description TEXT NOT NULL,
  flavor_text TEXT, -- additional lore/description
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CHECK (NOT stackable OR max_stack > 1)
);

-- Example item properties structures:
-- Weapon: {"damage": 15, "durability": 100, "effects": ["sharp", "magical"]}
-- Armor: {"defense": 8, "durability": 80, "slot": "chest", "effects": ["fire_resist"]}
-- Consumable: {"healing": 50, "effects": ["regeneration"], "duration": 300}
-- Key: {"unlocks": ["dungeon_door", "chest_123"]}
```

#### Inventory Table
Manages character inventories and equipment.

```sql
CREATE TABLE inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  
  -- Quantity and State
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  equipped BOOLEAN DEFAULT FALSE,
  equipment_slot TEXT, -- weapon, helmet, chest, legs, boots, ring, etc.
  
  -- Item Condition
  durability INTEGER, -- current durability (null for non-degradable)
  
  -- Metadata
  acquired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id),
  
  -- Constraints
  UNIQUE(character_id, equipment_slot) WHERE equipped = TRUE, -- one item per slot
  CHECK (NOT equipped OR equipment_slot IS NOT NULL) -- equipped items need slots
);

-- Index for efficient inventory queries
CREATE INDEX idx_inventory_character ON inventory(character_id);
CREATE INDEX idx_inventory_equipped ON inventory(character_id, equipped);
```

#### NPCs Table
Stores NPC-specific data and AI behaviors.

```sql
CREATE TABLE npcs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id INTEGER NOT NULL,
  room_id INTEGER NOT NULL,
  
  -- AI Behavior
  disposition TEXT DEFAULT 'neutral' CHECK (disposition IN ('friendly', 'neutral', 'hostile')),
  ai_personality TEXT NOT NULL, -- AI prompt for personality
  
  -- Dialogue System
  dialogue_state JSON, -- conversation history and current state
  last_interaction DATETIME,
  
  -- Movement
  movement_pattern TEXT DEFAULT 'stationary' CHECK (movement_pattern IN ('stationary', 'wandering', 'patrol')),
  patrol_route JSON, -- room IDs for patrol route
  
  -- Spawning
  spawn_rate REAL DEFAULT 1.0 CHECK (spawn_rate >= 0.0 AND spawn_rate <= 1.0),
  respawn_timer INTEGER DEFAULT 0, -- seconds until respawn
  original_room_id INTEGER, -- where NPC originally spawned
  
  -- Trading (for merchant NPCs)
  is_merchant BOOLEAN DEFAULT FALSE,
  trade_inventory JSON, -- merchant-specific inventory
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (original_room_id) REFERENCES rooms(id)
);

-- Indexes for NPC queries
CREATE INDEX idx_npcs_room ON npcs(room_id);
CREATE INDEX idx_npcs_disposition ON npcs(disposition);
CREATE INDEX idx_npcs_merchant ON npcs(is_merchant) WHERE is_merchant = TRUE;
```

#### Quests Table
Manages quest system and objectives.

```sql
CREATE TABLE quests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  
  -- Quest Definition
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'side' CHECK (category IN ('main', 'side', 'daily', 'hidden')),
  
  -- Objectives (JSON array)
  objectives JSON NOT NULL, -- [{"type": "kill", "target": "goblin", "count": 5, "completed": false}]
  
  -- Status
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'active', 'completed', 'failed', 'abandoned')),
  
  -- Rewards (JSON)
  rewards JSON, -- {"experience": 100, "gold": 50, "items": [{"id": 1, "quantity": 1}]}
  
  -- Quest Giver
  giver_npc_id INTEGER, -- which NPC gave the quest (null for system quests)
  
  -- Prerequisites
  required_level INTEGER DEFAULT 1,
  required_quests JSON, -- quest IDs that must be completed first
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (giver_npc_id) REFERENCES npcs(id)
);

-- Indexes for quest queries
CREATE INDEX idx_quests_game_status ON quests(game_id, status);
CREATE INDEX idx_quests_giver ON quests(giver_npc_id);
```

#### Combat Encounters Table
Tracks active combat sessions.

```sql
CREATE TABLE combat_encounters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  room_id INTEGER NOT NULL,
  
  -- Combat Participants
  participants JSON NOT NULL, -- [{"character_id": 1, "type": "player"}, {"character_id": 2, "type": "npc"}]
  
  -- Turn Management
  turn_order JSON NOT NULL, -- character IDs in initiative order
  current_turn INTEGER DEFAULT 0,
  round_number INTEGER DEFAULT 1,
  
  -- Combat State
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'fled')),
  winner TEXT, -- 'player', 'npcs', or null for fled/ongoing
  
  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME,
  
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

-- Index for active combats
CREATE INDEX idx_combat_active ON combat_encounters(game_id, status) WHERE status = 'active';
```

#### Loot Tables
Defines what items can be dropped by NPCs or found in containers.

```sql
CREATE TABLE loot_tables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Loot Source
  source_type TEXT NOT NULL CHECK (source_type IN ('npc', 'chest', 'quest_reward', 'room')),
  source_id INTEGER, -- NPC ID, quest ID, or room ID
  
  -- Loot Definition
  item_id INTEGER NOT NULL,
  drop_rate REAL DEFAULT 0.1 CHECK (drop_rate >= 0.0 AND drop_rate <= 1.0),
  min_quantity INTEGER DEFAULT 1 CHECK (min_quantity > 0),
  max_quantity INTEGER DEFAULT 1 CHECK (max_quantity >= min_quantity),
  
  -- Conditions
  required_level INTEGER DEFAULT 1,
  conditions JSON, -- additional requirements like quest completion
  
  FOREIGN KEY (item_id) REFERENCES items(id),
  
  -- Polymorphic relationship constraints
  CHECK (
    (source_type = 'npc' AND source_id IN (SELECT character_id FROM npcs)) OR
    (source_type = 'quest' AND source_id IN (SELECT id FROM quests)) OR
    (source_type = 'room' AND source_id IN (SELECT id FROM rooms)) OR
    (source_type = 'chest' AND source_id IS NOT NULL)
  )
);

-- Indexes for loot lookups
CREATE INDEX idx_loot_source ON loot_tables(source_type, source_id);
CREATE INDEX idx_loot_item ON loot_tables(item_id);
```

### Enhanced Existing Tables

#### Connections Enhancement
Add locking and interaction mechanics.

```sql
-- Add new columns to existing connections table
ALTER TABLE connections ADD COLUMN locked BOOLEAN DEFAULT FALSE;
ALTER TABLE connections ADD COLUMN required_item_id INTEGER;
ALTER TABLE connections ADD COLUMN interaction_type TEXT DEFAULT 'move' 
  CHECK (interaction_type IN ('move', 'unlock', 'activate', 'hidden'));
ALTER TABLE connections ADD COLUMN interaction_message TEXT;

-- Add foreign key for required items
-- Note: This would be added during migration
-- ALTER TABLE connections ADD FOREIGN KEY (required_item_id) REFERENCES items(id);
```


#### Game State Enhancement
Add player character reference and gameplay state.

```sql
-- Add new columns to existing game_state table
ALTER TABLE game_state ADD COLUMN player_character_id INTEGER;
ALTER TABLE game_state ADD COLUMN game_mode TEXT DEFAULT 'exploration' 
  CHECK (game_mode IN ('exploration', 'combat', 'dialogue', 'trading'));
ALTER TABLE game_state ADD COLUMN active_encounter_id INTEGER;

-- Add foreign keys (during migration)
-- ALTER TABLE game_state ADD FOREIGN KEY (player_character_id) REFERENCES characters(id);
-- ALTER TABLE game_state ADD FOREIGN KEY (active_encounter_id) REFERENCES combat_encounters(id);
```

## Indexes and Performance

### Primary Indexes
```sql
-- Character lookups
CREATE INDEX idx_characters_game_type ON characters(game_id, type);
CREATE INDEX idx_characters_level ON characters(level);

-- Inventory performance
CREATE INDEX idx_inventory_character_item ON inventory(character_id, item_id);
CREATE INDEX idx_inventory_item_equipped ON inventory(item_id, equipped);

-- Room and connection lookups
CREATE INDEX idx_rooms_type ON rooms(room_type);
CREATE INDEX idx_connections_locked ON connections(locked) WHERE locked = TRUE;

-- Region-specific indexes
CREATE INDEX idx_regions_center ON regions(center_room_id) WHERE center_room_id IS NOT NULL;

-- Quest tracking
CREATE INDEX idx_quests_active ON quests(game_id, status) WHERE status IN ('available', 'active');

-- Combat performance
CREATE INDEX idx_combat_room ON combat_encounters(room_id, status);
```

## Data Validation and Constraints

### Business Rules
1. **Character Health**: HP cannot exceed max_hp
2. **Experience**: Must be non-negative and increase monotonically
3. **Inventory Weight**: Total weight should not exceed character capacity
4. **Equipment Slots**: Only one item per equipment slot when equipped
5. **Quest Prerequisites**: Cannot start quest without meeting requirements
6. **Combat Participants**: Must have at least 2 participants
7. **Loot Rates**: Drop rates must sum to ≤ 1.0 per source
8. **Region Distance**: Must be non-negative, 0 indicates region center
9. **Region Centers**: Each region can have at most one center room
10. **Room Regions**: Rooms with region_distance must belong to a region

### Triggers for Data Integrity
```sql
-- Ensure HP doesn't exceed max_hp
CREATE TRIGGER enforce_hp_limit
  BEFORE UPDATE ON characters
  WHEN NEW.hp > NEW.max_hp
  BEGIN
    UPDATE characters SET hp = NEW.max_hp WHERE id = NEW.id;
  END;

-- Update quest status when all objectives completed
CREATE TRIGGER check_quest_completion
  AFTER UPDATE ON quests
  WHEN NEW.objectives != OLD.objectives
  BEGIN
    UPDATE quests 
    SET status = 'completed', completed_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id 
    AND status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM json_each(NEW.objectives) 
      WHERE json_extract(value, '$.completed') = FALSE
    );
  END;

-- Clean up combat encounters when characters die
CREATE TRIGGER cleanup_combat_on_death
  AFTER UPDATE ON characters
  WHEN OLD.hp > 0 AND NEW.hp = 0
  BEGIN
    UPDATE combat_encounters 
    SET status = 'completed', ended_at = CURRENT_TIMESTAMP
    WHERE status = 'active' 
    AND json_extract(participants, '$[*].character_id') LIKE '%' || NEW.id || '%';
  END;

-- Set region center when distance 0 room is created
CREATE TRIGGER set_region_center
  AFTER INSERT ON rooms
  WHEN NEW.region_distance = 0 AND NEW.region_id IS NOT NULL
  BEGIN
    UPDATE regions 
    SET center_room_id = NEW.id
    WHERE id = NEW.region_id AND center_room_id IS NULL;
  END;

-- Ensure only one region center per region
CREATE TRIGGER prevent_multiple_centers
  BEFORE INSERT ON rooms
  WHEN NEW.region_distance = 0 AND NEW.region_id IS NOT NULL
  BEGIN
    SELECT RAISE(ABORT, 'Region already has a center room')
    WHERE EXISTS (
      SELECT 1 FROM regions 
      WHERE id = NEW.region_id AND center_room_id IS NOT NULL
    );
  END;
```

## Migration Strategy

### Phase 1: Core Tables
1. Create regions table for world structure
2. Create new RPG tables (characters, items, inventory)
3. Enhance rooms table with region support
4. Migrate existing player data to characters table
5. Create basic items for testing

### Phase 2: Gameplay Tables
1. Add NPCs, quests, combat_encounters tables
2. Enhance existing tables with additional columns
3. Create indexes and triggers for region support
4. Implement region-based room generation logic

### Phase 3: Data Population
1. Generate starter items and equipment
2. Create initial regions for existing rooms
3. Create initial NPCs with region-appropriate content
4. Add basic quests and loot tables with regional themes

## Example Data

### Sample Items
```sql
INSERT INTO items (name, type, subtype, value, weight, properties, description) VALUES
('Iron Sword', 'weapon', 'sword', 100, 3, '{"damage": 15, "durability": 100}', 'A sturdy iron blade.'),
('Leather Armor', 'armor', 'chest', 80, 5, '{"defense": 8, "durability": 80, "slot": "chest"}', 'Flexible leather protection.'),
('Health Potion', 'consumable', 'potion', 25, 1, '{"healing": 50}', 'Restores 50 HP when consumed.'),
('Rusty Key', 'key', 'door_key', 10, 1, '{"unlocks": ["dungeon_door"]}', 'An old key that might open something.');
```

### Sample Character
```sql
INSERT INTO characters (game_id, name, type, level, experience, hp, max_hp, attack, defense, gold) 
VALUES (1, 'Hero', 'player', 1, 0, 100, 100, 12, 8, 50);
```

### Sample Quest
```sql
INSERT INTO quests (game_id, name, description, objectives, rewards, category) VALUES
(1, 'Clear the Rats', 'The cellar is infested with giant rats. Clear them out!', 
'[{"type": "kill", "target": "giant_rat", "count": 5, "completed": false}]',
'{"experience": 100, "gold": 75}', 'side');
```

## Future Considerations

### Scalability
- Consider partitioning large tables by game_id
- Implement soft deletes for important records
- Add audit trails for character progression

### New Features
- Player guilds/parties (new tables needed)
- Crafting system (recipes, materials tables)
- Player housing (property ownership)
- Auction house (player trading)

### Performance Optimization
- Implement caching layer for frequently accessed data
- Consider denormalization for read-heavy operations
- Add database connection pooling for concurrent users

---

*This schema provides a solid foundation for Shadow Kingdom's RPG mechanics while maintaining flexibility for future enhancements.*