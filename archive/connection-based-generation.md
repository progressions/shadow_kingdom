# Connection-Based Generation System Specification

**Version**: 1.0  
**Date**: 2025-08-19  
**Status**: Draft  

## Overview

This specification defines the transition from room-centric to connection-centric background generation to eliminate phantom connection bugs and ensure spatial consistency in the Shadow Kingdom text adventure game.

## Problem Statement

### Current System Issues

The existing room-based generation system suffers from a fundamental design flaw:

1. **AI Intent Ignored**: When the AI generates a room, it specifies multiple intended connections (e.g., north, east, south), but the system only creates the return path connection immediately
2. **Phantom Connections**: Background generation later adds different connections to existing rooms, violating the AI's original design intent
3. **Spatial Inconsistency**: Players encounter rooms with different connection counts between visits, breaking text adventure spatial consistency principles

### Root Cause Analysis

**Current Flow (Broken):**
```
AI generates room → Specifies [north, east, south] connections
System creates   → Only [south] return path connection  
Background gen   → Adds [north, west] connections later
Result          → Room layout differs from AI intent
```

**Example from RoomGenerationService.ts lines 352-358:**
```typescript
} else {
  // For other directions, we'll create stub rooms later (in Phase 4)
  // For now, just log that we have additional connections planned
  if (this.isDebugEnabled()) {
    console.log(`🔗 Planned connection: ${connection.name} (${connection.direction})`);
  }
}
```

The system logs "planned connections" but never creates them, leading to inconsistent room layouts.

## Proposed Solution: Connection-Based Generation

### Core Concept

Shift the atomic unit of generation from **rooms** to **connections**:
- Connections with `to_room_id = NULL` represent unexplored areas
- Background generation fills NULL connections with appropriate rooms
- Once a connection has a destination room, it's permanent and immutable

### Key Principles

1. **AI Intent Preservation**: All AI-specified connections created immediately
2. **Immutable Room Layouts**: Connections never added to existing rooms
3. **Connection-Centric Processing**: Background generation operates on unfilled connections
4. **Atomic Room Creation**: Each room's complete connection layout established at creation time

## Technical Architecture

### Schema Changes

**Current connections table:**
```sql
CREATE TABLE connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  from_room_id INTEGER NOT NULL,
  to_room_id INTEGER NOT NULL,  -- Current: NOT NULL
  direction TEXT,
  name TEXT NOT NULL,
  FOREIGN KEY (to_room_id) REFERENCES rooms(id)
);
```

**New connections table:**
```sql
CREATE TABLE connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  from_room_id INTEGER NOT NULL,
  to_room_id INTEGER,           -- New: Nullable for unfilled connections
  direction TEXT,
  name TEXT NOT NULL,
  FOREIGN KEY (to_room_id) REFERENCES rooms(id)
);
```

### Data Model Updates

**Connection Interface:**
```typescript
interface Connection {
  id: number;
  game_id: number;
  from_room_id: number;
  to_room_id: number | null;  // Changed: nullable for unfilled connections
  direction: string;
  name: string;
}

interface UnfilledConnection extends Connection {
  to_room_id: null;  // Type narrowing for unfilled connections
}
```

### Generation Flow Architecture

#### New Room Creation Flow

**Phase 1: AI Room Generation**
```typescript
// AI generates room with intended connections
const aiRoom = await grokClient.generateRoom(context);
// aiRoom.connections = [
//   { direction: 'north', name: 'through the crystal archway' },
//   { direction: 'east', name: 'via the moonlit passage' },
//   { direction: 'south', name: 'back to the entrance hall' }
// ];
```

**Phase 2: Room & Connection Creation**
```typescript
// Create room
const roomResult = await db.run('INSERT INTO rooms ...');
const roomId = roomResult.lastID;

// Create ALL AI-specified connections (some with NULL to_room_id)
for (const connection of aiRoom.connections) {
  const toRoomId = connection.isReturnPath ? context.fromRoomId : null;
  
  await db.run(
    'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
    [gameId, roomId, toRoomId, connection.direction, connection.name]
  );
}
```

**Phase 3: Background Generation**
```typescript
// Background generation finds and fills unfilled connections
const unfilledConnections = await db.all(
  'SELECT * FROM connections WHERE to_room_id IS NULL AND game_id = ?',
  [gameId]
);

for (const connection of unfilledConnections) {
  const newRoom = await generateRoomForConnection(connection);
  
  await db.run(
    'UPDATE connections SET to_room_id = ? WHERE id = ?',
    [newRoom.id, connection.id]
  );
}
```

#### Background Generation Refactor

**Current (Room-Centric):**
```typescript
async findUnprocessedRooms() {
  return await db.all(
    'SELECT * FROM rooms WHERE generation_processed = FALSE'
  );
}
```

**New (Connection-Centric):**
```typescript
async findUnfilledConnections(gameId: number): Promise<UnfilledConnection[]> {
  return await db.all(
    'SELECT c.*, r.name as from_room_name FROM connections c ' +
    'JOIN rooms r ON c.from_room_id = r.id ' +
    'WHERE c.to_room_id IS NULL AND c.game_id = ? ' +
    'ORDER BY c.id LIMIT ?',
    [gameId, MAX_CONCURRENT_GENERATIONS]
  );
}

async fillConnection(connection: UnfilledConnection): Promise<Room> {
  // Generate room specifically for this connection
  const context = {
    gameId: connection.game_id,
    incomingDirection: connection.direction,
    fromRoomId: connection.from_room_id,
    connectionName: connection.name
  };
  
  const newRoom = await generateRoomForConnection(context);
  
  // Update connection to point to new room
  await db.run(
    'UPDATE connections SET to_room_id = ? WHERE id = ?',
    [newRoom.id, connection.id]
  );
  
  return newRoom;
}
```

### Service Layer Changes

#### RoomGenerationService Refactor

**Key Method Changes:**

1. **generateSingleRoom()**: Create ALL AI-specified connections immediately
2. **Remove generation_processed logic**: No longer needed
3. **fillUnfilledConnection()**: New method to fill specific connections

```typescript
async generateRoomForConnection(connection: UnfilledConnection): Promise<Room> {
  const fromRoom = await this.getRoom(connection.from_room_id);
  
  // Generate room with context about incoming connection
  const aiRoom = await this.grokClient.generateRoom({
    incomingFrom: fromRoom,
    incomingDirection: connection.direction,
    connectionName: connection.name
  });
  
  // Create room
  const roomResult = await this.db.run(
    'INSERT INTO rooms (game_id, name, description, region_id, region_distance) VALUES (?, ?, ?, ?, ?)',
    [connection.game_id, aiRoom.name, aiRoom.description, regionId, regionDistance]
  );
  
  const roomId = roomResult.lastID;
  
  // Update the original connection
  await this.db.run(
    'UPDATE connections SET to_room_id = ? WHERE id = ?',
    [roomId, connection.id]
  );
  
  // Create return connection (filled immediately)
  const returnDirection = this.getReverseDirection(connection.direction);
  if (returnDirection) {
    await this.db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
      [connection.game_id, roomId, connection.from_room_id, returnDirection, aiRoom.returnConnectionName]
    );
  }
  
  // Create other AI-specified connections (unfilled)
  for (const newConnection of aiRoom.connections) {
    if (newConnection.direction !== returnDirection) {
      await this.db.run(
        'INSERT INTO connections (game_id, from_room_id, to_room_id, direction, name) VALUES (?, ?, ?, ?, ?)',
        [connection.game_id, roomId, null, newConnection.direction, newConnection.name]
      );
    }
  }
  
  return { id: roomId, ...aiRoom };
}
```

#### BackgroundGenerationService Refactor

**Key Changes:**

1. **preGenerateAdjacentRooms()**: Find unfilled connections instead of unprocessed rooms
2. **expandFromConnections()**: Process connection queue instead of room expansion
3. **Remove room processing logic**: Focus purely on connection filling

```typescript
async preGenerateAdjacentRooms(currentRoomId: number, gameId: number): Promise<void> {
  // Find unfilled connections accessible from current area
  const nearbyUnfilledConnections = await this.findNearbyUnfilledConnections(currentRoomId, gameId);
  
  // Fill connections in background
  if (this.options.disableBackgroundGeneration) {
    await this.fillConnections(nearbyUnfilledConnections);
  } else {
    const promise = this.fillConnections(nearbyUnfilledConnections);
    this.backgroundPromises.add(promise);
    promise.finally(() => this.backgroundPromises.delete(promise));
  }
}

async findNearbyUnfilledConnections(currentRoomId: number, gameId: number): Promise<UnfilledConnection[]> {
  // Find connections within discovery radius that need filling
  return await this.db.all(`
    WITH RECURSIVE reachable_rooms(room_id, distance) AS (
      SELECT ?, 0
      UNION ALL
      SELECT c.to_room_id, r.distance + 1
      FROM connections c
      JOIN reachable_rooms r ON c.from_room_id = r.room_id
      WHERE c.to_room_id IS NOT NULL AND r.distance < ?
    )
    SELECT c.* FROM connections c
    JOIN reachable_rooms r ON c.from_room_id = r.room_id
    WHERE c.to_room_id IS NULL AND c.game_id = ?
    ORDER BY r.distance, c.id
    LIMIT ?
  `, [currentRoomId, DISCOVERY_RADIUS, gameId, MAX_CONCURRENT_FILLS]);
}
```

## AI Integration Changes

### Enhanced Context for Connection-Specific Generation

**Current AI Prompt:**
```typescript
generateRoom({
  currentRoom: fromRoom,
  direction: 'north',
  theme: 'mysterious fantasy'
});
```

**New AI Prompt:**
```typescript
generateRoomForConnection({
  incomingFrom: {
    room: fromRoom,
    connectionName: 'through the crystal archway',
    direction: 'north'
  },
  expectedTheme: 'crystal chamber',
  regionContext: currentRegion,
  adjacentRooms: nearbyRoomDescriptions
});
```

### AI Response Format Enhancement

**Current Response:**
```json
{
  "name": "Crystal Chamber",
  "description": "A shimmering chamber...",
  "connections": [
    {"direction": "south", "name": "back through the archway"},
    {"direction": "east", "name": "toward the crystal spires"},
    {"direction": "west", "name": "through the gem-encrusted passage"}
  ]
}
```

**Enhanced Response:**
```json
{
  "name": "Crystal Chamber",
  "description": "A shimmering chamber...",
  "returnConnection": {
    "direction": "south",
    "name": "back through the crystal archway",
    "complementsIncoming": true
  },
  "newConnections": [
    {"direction": "east", "name": "toward the crystal spires", "expectedTheme": "spire chamber"},
    {"direction": "west", "name": "through the gem passage", "expectedTheme": "gem cavern"}
  ]
}
```

## Migration Strategy

### Phase 1: Schema Migration (Backward Compatible)

**Step 1: Update Table Definition**
```sql
-- Allow NULL in existing connections table
PRAGMA foreign_keys=off;

CREATE TABLE connections_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  from_room_id INTEGER NOT NULL,
  to_room_id INTEGER,  -- Now nullable
  direction TEXT,
  name TEXT NOT NULL,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (from_room_id) REFERENCES rooms(id),
  FOREIGN KEY (to_room_id) REFERENCES rooms(id)
);

INSERT INTO connections_new SELECT * FROM connections;
DROP TABLE connections;
ALTER TABLE connections_new RENAME TO connections;

PRAGMA foreign_keys=on;
```

**Step 2: Update Indexes**
```sql
CREATE INDEX idx_connections_unfilled ON connections(game_id, from_room_id) 
WHERE to_room_id IS NULL;

CREATE INDEX idx_connections_filled ON connections(game_id, from_room_id, to_room_id) 
WHERE to_room_id IS NOT NULL;
```

### Phase 2: Service Layer Migration

1. **Update TypeScript interfaces** to reflect nullable to_room_id
2. **Modify room generation** to create all AI-specified connections
3. **Refactor background generation** to process unfilled connections
4. **Update movement logic** to handle NULL connections gracefully

### Phase 3: Legacy Compatibility

**Gradual Transition:**
- Existing games continue working with filled connections
- New room generation uses connection-based approach
- Background generation handles both old (room-based) and new (connection-based) patterns during transition

**Fallback Mechanisms:**
```typescript
async findGenerationTargets(gameId: number): Promise<GenerationTarget[]> {
  // Try new connection-based approach first
  const unfilledConnections = await this.findUnfilledConnections(gameId);
  if (unfilledConnections.length > 0) {
    return unfilledConnections.map(c => ({ type: 'connection', data: c }));
  }
  
  // Fallback to room-based approach for legacy games
  const unprocessedRooms = await this.findUnprocessedRooms(gameId);
  return unprocessedRooms.map(r => ({ type: 'room', data: r }));
}
```

## Benefits and Impacts

### Eliminated Issues

1. **Phantom Connections**: Impossible - no connections ever added to existing rooms
2. **AI Intent Violations**: Eliminated - all AI-specified connections created immediately
3. **Spatial Inconsistency**: Resolved - room layouts locked at creation time
4. **Visit-to-Lock Bugs**: Obsolete - room processing flags no longer needed

### Performance Improvements

1. **Faster Queries**: `WHERE to_room_id IS NULL` more efficient than complex room processing checks
2. **Reduced Complexity**: Single source of truth (connection state) vs dual state (room + connection processing)
3. **Better Indexing**: Dedicated indexes for filled/unfilled connections

### Enhanced AI Integration

1. **Context-Aware Generation**: Rooms generated specifically for incoming connections
2. **Thematic Consistency**: Connection names influence generated room themes
3. **Bidirectional Naming**: Complementary connection names for better immersion

## Testing Strategy

### Unit Tests

1. **Connection State Management**
   - Creating connections with NULL to_room_id
   - Filling connections with generated rooms
   - Preventing modification of filled connections

2. **Room Generation Flow**
   - AI response parsing and connection creation
   - Bidirectional connection establishment
   - Region assignment and thematic consistency

3. **Background Generation**
   - Finding unfilled connections
   - Prioritization and rate limiting
   - Concurrent generation handling

### Integration Tests

1. **End-to-End Generation Flow**
   - Player movement triggering background generation
   - Connection filling with appropriate rooms
   - Spatial consistency verification

2. **Migration Testing**
   - Legacy game compatibility
   - Schema migration validation
   - Performance comparison

3. **AI Integration**
   - Context-specific room generation
   - Connection name complementarity
   - Thematic coherence across regions

### Load Testing

1. **Large Game Performance**
   - Games with 1000+ rooms and connections
   - Background generation under load
   - Query performance with large unfilled connection sets

2. **Concurrent Generation**
   - Multiple players triggering generation simultaneously
   - Race condition prevention
   - Resource utilization optimization

## Success Metrics

### Functional Requirements

1. **Zero Phantom Connections**: No rooms gain connections after creation
2. **100% AI Intent Preservation**: All AI-specified connections created
3. **Spatial Consistency**: Identical room layouts on repeated visits
4. **Performance Maintenance**: Generation speed ≤ current system

### Quality Metrics

1. **Test Coverage**: >95% coverage for connection generation logic
2. **Error Rate**: <0.1% generation failures
3. **User Experience**: No perceptible delays in movement or generation
4. **Data Integrity**: No orphaned or invalid connections

## Implementation Timeline

### Phase 1: Foundation (Week 1)
- Schema migration implementation
- TypeScript interface updates
- Basic connection creation logic

### Phase 2: Core Logic (Week 2)
- Room generation refactor
- Background generation refactor
- AI integration updates

### Phase 3: Testing & Polish (Week 3)
- Comprehensive test suite
- Performance optimization
- Documentation updates

### Phase 4: Deployment & Monitoring (Week 4)
- Production migration
- Performance monitoring
- User experience validation

## Risk Assessment

### Technical Risks

1. **Migration Complexity**: Schema changes on existing databases
   - **Mitigation**: Comprehensive backup and rollback procedures

2. **Performance Impact**: Additional NULL checks and connection queries
   - **Mitigation**: Optimized indexes and query profiling

3. **AI Integration Changes**: Modified prompts affecting generation quality
   - **Mitigation**: A/B testing and gradual rollout

### Business Risks

1. **User Disruption**: Changes to game behavior during migration
   - **Mitigation**: Backward compatibility and transparent transition

2. **Development Time**: Significant refactor affecting other features
   - **Mitigation**: Incremental implementation and parallel development

## Conclusion

The connection-based generation system represents a fundamental architectural improvement that eliminates phantom connection bugs while preserving and enhancing AI-generated content quality. By shifting the atomic unit of generation from rooms to connections, we achieve perfect spatial consistency while simplifying the overall system design.

This specification provides a comprehensive roadmap for implementing this change with minimal risk and maximum benefit to the Shadow Kingdom game experience.