# Thematic Room Connections with AI-Controlled Density

**Date**: 2025-01-18  
**Status**: Completed  
**Priority**: Medium  
**Category**: Enhancement  

## Problem

Currently, the room generation system has several limitations:

1. **Fixed Connection Density**: Every room tries to generate connections for all 6 directions (north, south, east, west, up, down), creating overly dense worlds where every room becomes a hub with 6 exits.

2. **Generic Connection Names**: All connections are named with basic directions ("north", "south", etc.) which lacks immersion and thematic consistency.

3. **No AI Control Over Layout**: The AI generates room content but has no say in the room's connectivity, missing opportunities for thematic integration.

4. **Unrealistic Room Layouts**: Real spaces don't typically have exits in every direction - some rooms should be dead ends, others should be corridors, others should be hubs.

## Solution

Implement AI-controlled thematic connections with variable density:

### Database Schema Changes

**Current connections table**:
```sql
connections (
  id INTEGER PRIMARY KEY,
  game_id INTEGER,
  from_room_id INTEGER,
  to_room_id INTEGER,
  name TEXT  -- just "north", "south", etc.
)
```

**New connections table**:
```sql
connections (
  id INTEGER PRIMARY KEY,
  game_id INTEGER,
  from_room_id INTEGER,
  to_room_id INTEGER,
  direction TEXT,  -- "north", "south", "east", "west", "up", "down"
  name TEXT        -- "through the crystal archway", "down the spiral staircase"
)
```

### Connection Generation Rules

1. **Minimum 1 Connection**: Always include the return path to the room the player came from
2. **20% Probability**: For each of the other 5 directions, roll a 20% chance to create an exit
3. **AI-Generated Names**: Connections have thematic names that fit the room's atmosphere
4. **Dual Addressing**: Players can use either the direction ("north") or the thematic name ("through crystal archway")

### AI Integration

Update the `generateRoom()` method to include connection generation:

```typescript
interface GeneratedRoom {
  name: string;
  description: string;
  connections: {
    direction: string;    // "north", "south", etc.
    name: string;        // "through the ornate doorway"
    probability?: number; // Optional: AI can suggest probability
  }[];
}
```

### Example Output

**Current system**:
```
Exits: north, south, east, west, up, down
```

**New system**:
```
Exits: through the ornate doorway (north), via the hidden trapdoor (down)
```

Player commands that would work:
- `go north` or `go through ornate doorway`
- `go down` or `go via hidden trapdoor`

## Implementation Plan

### Phase 1: Database Migration ✅ COMPLETED
- [x] Add `direction` column to connections table
- [x] Migrate existing connections to use both `direction` and `name`
- [x] Update database initialization for new games

### Phase 2: AI Prompt Updates ✅ COMPLETED
- [x] Update `generateRoom()` prompt to include connection generation
- [x] Implement 30% probability logic for each direction (increased from 20% for better world density)
- [x] Ensure return connection is always included

### Phase 3: Game Logic Updates ✅ COMPLETED
- [x] Update connection parsing to handle both direction and name
- [x] Modify movement commands to accept thematic names
- [x] Update room description display to show thematic exits

### Phase 4: Testing ✅ COMPLETED
- [x] Test connection generation with various room types
- [x] Validate that return paths are always created
- [x] Ensure movement commands work with both formats
- [x] Test edge cases (no additional connections, maximum connections)
- [x] Fix duplicate connection generation and race conditions
- [x] Add thematic descriptions to all connections

## Expected Benefits ✅ ACHIEVED

1. **More Realistic Layouts**: Average ~2-3 connections per room instead of 6 (30% probability per direction)
2. **Enhanced Immersion**: Thematic connection names fit each room's atmosphere
3. **Varied Exploration**: Mix of dead ends, corridors, and hub rooms
4. **Better AI Integration**: AI has creative control over room connectivity
5. **Flexible Navigation**: Players can use either mechanical or thematic names
6. **Visit-to-Lock System**: Rooms maintain consistent connections after first visit
7. **Duplicate Prevention**: Robust connection generation prevents phantom connections

## Technical Considerations

### Backward Compatibility
- Migration script needed for existing games
- Current tests will need updates for new schema

### Connection Parsing
- Need to handle both "north" and "through the ornate doorway" in command parsing
- Consider partial matching for long thematic names

### AI Prompt Design
- Ensure AI understands the return connection requirement
- Provide examples of good thematic connection names
- Handle cases where AI doesn't generate appropriate connections

## Risk Assessment

**Low Risk**: Changes are additive and can be implemented incrementally with proper migration scripts.

**Testing Strategy**: 
- Create comprehensive tests for connection generation
- Test migration scripts on sample databases
- Validate AI prompt reliability with multiple generation attempts

## Implementation Summary

**Completed**: 2025-08-18

This feature has been fully implemented with the following key achievements:

### Core Features Implemented
- **Database Schema Migration**: Added `direction` column to connections table with backward compatibility
- **AI-Controlled Connection Generation**: 30% probability per direction with thematic naming
- **Dual Navigation System**: Players can use either "north" or "through the crystal archway"
- **Visit-to-Lock Consistency**: Rooms maintain stable connections after first visit
- **Complementary Connection Naming**: Bidirectional connections have coherent thematic descriptions

### Technical Improvements
- **Race Condition Prevention**: Connection generation checks prevent duplicates
- **Enhanced AI Prompts**: Grok AI generates thematic connection names with proper probability
- **Expanded World Limits**: Increased to 100 rooms per game with 5-level depth generation
- **Environment Configuration**: Updated settings to match implementation (30% probability, faster cooldown)

### Files Modified
- `src/gameController.ts`: Core game logic and connection generation
- `src/ai/grokClient.ts`: AI prompt enhancement for thematic connections
- `src/utils/initDb.ts`: Database migration and seed room creation
- `.env`: Updated generation limits and probability settings

### Database Changes
- Added `direction` TEXT column to `connections` table
- Updated all existing connections with thematic descriptions
- Enhanced seed rooms with atmospheric descriptions and thematic connections

The thematic connections system is now fully operational and provides an immersive, consistent exploration experience with AI-generated atmospheric connection names.

## Related Issues

- Relates to ongoing AI generation improvements
- Builds on existing room generation infrastructure
- May impact future NPC and item generation systems