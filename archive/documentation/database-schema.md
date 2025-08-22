# Shadow Kingdom Database Schema Documentation

**Document Version:** 1.0  
**Last Updated:** 2025-08-19  
**Database:** SQLite  
**Schema Version:** Connection-Based Generation System

## Overview

Shadow Kingdom uses SQLite as its database engine with a custom async wrapper. The schema supports a text-adventure game with AI-powered world generation, featuring multiple isolated games, region-based world building, and a connection-based room expansion system.

## Core Architecture Principles

- **Multi-Game Support**: Complete isolation between different game instances
- **Connection-Based Generation**: Unfilled connections (`to_room_id = NULL`) represent expansion points for AI generation
- **Region-Based World**: Thematic coherence through region assignment and distance tracking
- **Referential Integrity**: Foreign key constraints ensure data consistency

## Table Definitions

### games
Stores individual game instances with metadata.

```sql
CREATE TABLE games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_played_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
- `id`: Unique game identifier
- `name`: Human-readable game name (must be unique across all games)
- `created_at`: Game creation timestamp
- `last_played_at`: Last time this game was accessed (for sorting recent games)

**Indexes:**
- Primary key on `id`
- Unique constraint on `name`

### rooms
Individual locations within the game world, assigned to thematic regions.

```sql
CREATE TABLE rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  region_id INTEGER,
  region_distance INTEGER,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);
```

**Columns:**
- `id`: Unique room identifier
- `game_id`: Reference to parent game
- `name`: Room display name (e.g., "Grand Entrance Hall")
- `description`: Detailed atmospheric description shown to players
- `region_id`: Reference to the thematic region this room belongs to (nullable)
- `region_distance`: Distance from region center (0 = center, 1-7 = periphery)

**Foreign Keys:**
- `game_id` → `games(id)` ON DELETE CASCADE
- `region_id` → `regions(id)` (implicit, nullable)

**Indexes:**
- `idx_rooms_game_id` on `game_id`
- `idx_rooms_region_id` on `region_id` WHERE `region_id IS NOT NULL`

### connections
Directional passages between rooms, supporting both filled and unfilled connections.

```sql
CREATE TABLE connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  from_room_id INTEGER NOT NULL,
  to_room_id INTEGER,              -- NULL = unfilled connection (expansion point)
  direction TEXT,                  -- e.g., "north", "up", "bookshelf"
  name TEXT NOT NULL,              -- Thematic description (e.g., "through the crystal archway")
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (from_room_id) REFERENCES rooms(id),
  FOREIGN KEY (to_room_id) REFERENCES rooms(id)
);
```

**Columns:**
- `id`: Unique connection identifier
- `game_id`: Reference to parent game
- `from_room_id`: Source room (always filled)
- `to_room_id`: Destination room (NULL for unfilled connections awaiting background generation)
- `direction`: Movement direction or special connection type
- `name`: Atmospheric description of the passage

**Connection Types:**
- **Filled Connections**: `to_room_id` points to existing room
- **Unfilled Connections**: `to_room_id = NULL`, represents expansion point for AI generation
- **Bidirectional**: Most connections have reciprocal entries for both directions

**Foreign Keys:**
- `game_id` → `games(id)` ON DELETE CASCADE
- `from_room_id` → `rooms(id)`
- `to_room_id` → `rooms(id)` (when not NULL)

**Indexes:**
- `idx_connections_game_id` on `game_id`
- `idx_connections_from_room` on `from_room_id, direction, name`
- `idx_connections_unfilled` on `game_id, from_room_id` WHERE `to_room_id IS NULL`
- `idx_connections_filled` on `game_id, from_room_id, to_room_id` WHERE `to_room_id IS NOT NULL`

### game_state
Current player position and session data for each game.

```sql
CREATE TABLE game_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL UNIQUE,
  current_room_id INTEGER NOT NULL,
  player_name TEXT,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (current_room_id) REFERENCES rooms(id)
);
```

**Columns:**
- `id`: Unique state identifier
- `game_id`: Reference to game (unique - one state per game)
- `current_room_id`: Room where player is currently located
- `player_name`: Optional player name (nullable)

**Foreign Keys:**
- `game_id` → `games(id)` ON DELETE CASCADE
- `current_room_id` → `rooms(id)`

**Constraints:**
- Unique constraint on `game_id` (one state per game)

### regions
Thematic world areas that provide coherent AI generation context.

```sql
CREATE TABLE regions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  name TEXT,                       -- Human-readable region name (nullable)
  type TEXT NOT NULL,              -- Region category (e.g., "mansion", "forest", "catacombs")
  description TEXT NOT NULL,       -- Detailed thematic description for AI context
  center_room_id INTEGER,          -- Room at region center (distance 0)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);
```

**Columns:**
- `id`: Unique region identifier
- `game_id`: Reference to parent game
- `name`: Optional display name (can be NULL for unnamed regions)
- `type`: Category identifier used for AI generation prompts
- `description`: Rich description providing context for room generation
- `center_room_id`: Reference to the central room (region_distance = 0)
- `created_at`: Region creation timestamp

**Foreign Keys:**
- `game_id` → `games(id)` ON DELETE CASCADE
- `center_room_id` → `rooms(id)` (implicit, nullable)

**Indexes:**
- `idx_regions_game` on `game_id`

**Triggers:**
- `set_region_center`: Automatically sets `center_room_id` when a room with `region_distance = 0` is created

## Data Relationships

### Game Isolation
Each game is completely isolated with its own:
- Room set (via `rooms.game_id`)
- Connection network (via `connections.game_id`) 
- Player state (via `game_state.game_id`)
- Region definitions (via `regions.game_id`)

### Connection-Based Generation System
The core innovation of the current schema:

1. **Filled Connections**: Normal passages between existing rooms
   ```sql
   -- Example: Entrance Hall → Library
   INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name)
   VALUES (1, 100, 101, 'north', 'through the ornate archway');
   ```

2. **Unfilled Connections**: Expansion points for background generation
   ```sql
   -- Example: Library → [Future Room]
   INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name)
   VALUES (1, 101, NULL, 'east', 'through the mysterious passage');
   ```

3. **Background Generation Process**:
   - AI finds unfilled connections (`to_room_id IS NULL`)
   - Generates new room based on connection context
   - Updates connection to point to new room
   - Creates reciprocal connection back
   - Adds new unfilled connections from the new room

### Region System
Provides thematic coherence for AI generation:

- **Region Assignment**: Rooms belong to regions for thematic consistency
- **Distance Tracking**: `region_distance` determines proximity to region center
- **Transition Logic**: New regions created based on distance probability
- **AI Context**: Region descriptions guide room generation prompts

## Example Data Flow

### Game Creation
```sql
-- 1. Create game
INSERT INTO games (name) VALUES ('My Adventure');

-- 2. Create initial region
INSERT INTO regions (game_id, name, type, description) 
VALUES (1, 'Shadow Manor', 'mansion', 'A mysterious gothic manor...');

-- 3. Create starting room
INSERT INTO rooms (game_id, name, description, region_id, region_distance)
VALUES (1, 'Grand Entrance', 'You stand in a magnificent hall...', 1, 0);

-- 4. Set initial player position
INSERT INTO game_state (game_id, current_room_id) VALUES (1, 1);

-- 5. Create expansion connections
INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name)
VALUES (1, 1, NULL, 'north', 'through the shadowed archway');
```

### Room Generation
```sql
-- 1. Background service finds unfilled connection
SELECT * FROM connections WHERE to_room_id IS NULL LIMIT 1;

-- 2. AI generates new room
INSERT INTO rooms (game_id, name, description, region_id, region_distance)
VALUES (1, 'Dusty Library', 'Ancient books line the walls...', 1, 1);

-- 3. Fill the connection
UPDATE connections SET to_room_id = 2 WHERE id = 5;

-- 4. Create return connection
INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name)
VALUES (1, 2, 1, 'south', 'back through the entrance archway');

-- 5. Add new expansion connections
INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name)
VALUES (1, 2, NULL, 'east', 'through the hidden door');
```

## Migration History

The schema has evolved through several major versions:

1. **Initial Version**: Simple rooms and connections
2. **Multi-Game Support**: Added `game_id` columns and isolation
3. **Direction System**: Added `direction` column to connections
4. **Region System**: Added regions, region_id, and region_distance
5. **Connection-Based Generation**: Made `to_room_id` nullable for unfilled connections

## Performance Considerations

### Optimized Queries
- **Unfilled Connection Lookup**: `idx_connections_unfilled` for background generation
- **Room Navigation**: `idx_connections_from_room` for movement commands  
- **Game Isolation**: `idx_rooms_game_id`, `idx_connections_game_id` for filtering

### Common Query Patterns
```sql
-- Find available exits from current room
SELECT * FROM connections 
WHERE from_room_id = ? AND to_room_id IS NOT NULL;

-- Find unfilled connections for background generation
SELECT * FROM connections 
WHERE game_id = ? AND to_room_id IS NULL 
ORDER BY RANDOM() LIMIT 5;

-- Get all rooms in a region
SELECT * FROM rooms 
WHERE game_id = ? AND region_id = ?
ORDER BY region_distance;
```

## Data Integrity Rules

1. **Cascade Deletion**: Deleting a game removes all associated data
2. **Connection Consistency**: `from_room_id` must always reference existing room
3. **Game State Validity**: `current_room_id` must reference room in same game
4. **Region Distance**: Center rooms must have `region_distance = 0`
5. **Unique Game Names**: Prevents duplicate game creation

## Backup and Recovery

### Critical Data
- **Games**: Preserve game metadata and player progress
- **Rooms**: Essential world state and descriptions
- **Connections**: Both filled and unfilled connections preserve world structure
- **Game State**: Current player positions

### Migration Considerations
- Schema changes require careful handling of existing data
- Unfilled connections must be preserved during migration
- Region assignments should be maintained for consistency

## Future Considerations

This schema design supports future enhancements:
- **Combat System**: Can add combat-related tables
- **Inventory**: Player items and equipment tables
- **NPCs**: Character tables linked to rooms
- **Quests**: Task and objective tracking
- **Multiplayer**: Player table and session management

The connection-based generation system provides a robust foundation for AI-driven world expansion while maintaining referential integrity and performance.