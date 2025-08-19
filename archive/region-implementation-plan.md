# Region System: Step-by-Step Implementation Plan

**Date**: 2025-01-19  
**Version**: 1.0  
**Type**: Implementation Guide  

## Overview

This document breaks down the region-based world generation system into tiny, testable chunks that can be implemented incrementally without breaking existing functionality.

## Implementation Phases

---

## Phase 1: Database Foundation (2-3 hours)

### Step 1.1: Create Regions Table
**Goal**: Add the regions table without affecting existing functionality
**Time**: 30 minutes

```sql
-- migration: 001_add_regions_table.sql
CREATE TABLE regions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  name TEXT,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  center_room_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX idx_regions_game ON regions(game_id);
```

**Test**: 
- Create a test game
- Insert a test region
- Verify foreign key constraints work

### Step 1.2: Add Region Columns to Rooms
**Goal**: Extend rooms table with region support
**Time**: 30 minutes

```sql
-- migration: 002_add_room_region_columns.sql
ALTER TABLE rooms ADD COLUMN region_id INTEGER;
ALTER TABLE rooms ADD COLUMN region_distance INTEGER;

CREATE INDEX idx_rooms_region ON rooms(region_id);
```

**Test**:
- Update existing room with region_id and region_distance
- Verify columns accept null values
- Query rooms by region_id

### Step 1.3: Add Database Validation
**Goal**: Basic data integrity for regions
**Time**: 45 minutes

```sql
-- migration: 003_add_region_constraints.sql
-- Trigger to set region center when distance 0 room created
CREATE TRIGGER set_region_center
  AFTER INSERT ON rooms
  WHEN NEW.region_distance = 0 AND NEW.region_id IS NOT NULL
  BEGIN
    UPDATE regions 
    SET center_room_id = NEW.id
    WHERE id = NEW.region_id AND center_room_id IS NULL;
  END;
```

**Test**:
- Create region and room with distance 0
- Verify region.center_room_id gets set automatically
- Test that second center room attempt doesn't break system

### Step 1.4: TypeScript Interfaces
**Goal**: Type safety for new database schema
**Time**: 30 minutes

```typescript
// src/types/region.ts
export interface Region {
  id: number;
  game_id: number;
  name: string | null;
  type: string;
  description: string;
  center_room_id: number | null;
  created_at: Date;
}

// Extend existing Room interface
export interface Room {
  id: number;
  game_id: number;
  name: string;
  description: string;
  generation_processed: boolean;
  region_id: number | null;  // NEW
  region_distance: number | null;  // NEW
}
```

**Test**:
- Import interfaces in existing files
- Verify TypeScript compilation succeeds
- No runtime changes yet

---

## Phase 2: Basic Region Service (3-4 hours)

### Step 2.1: Basic RegionService Class
**Goal**: Create service with essential region operations
**Time**: 1 hour

```typescript
// src/services/regionService.ts
export class RegionService {
  constructor(private db: Database) {}

  async createRegion(gameId: number, type: string, description: string, name?: string): Promise<Region> {
    const result = await this.db.run(
      'INSERT INTO regions (game_id, name, type, description) VALUES (?, ?, ?, ?)',
      [gameId, name, type, description]
    );
    
    return this.getRegion(result.lastID!);
  }

  async getRegion(regionId: number): Promise<Region | null> {
    return this.db.get<Region>('SELECT * FROM regions WHERE id = ?', [regionId]);
  }

  async findRegionByRoom(roomId: number): Promise<Region | null> {
    return this.db.get<Region>(
      'SELECT r.* FROM regions r JOIN rooms rm ON r.id = rm.region_id WHERE rm.id = ?',
      [roomId]
    );
  }
}
```

**Test**:
- Create RegionService instance
- Create a test region
- Query region by ID and by room
- Verify all methods return expected data

### Step 2.2: Distance Probability Logic
**Goal**: Implement core distance-based probability calculation
**Time**: 45 minutes

```typescript
// Add to RegionService class
export class RegionService {
  generateRegionDistance(): number {
    return Math.floor(Math.random() * 6) + 2; // 2-7
  }

  shouldCreateNewRegion(currentDistance: number): boolean {
    const baseProbability = 0.15;
    const distanceMultiplier = 0.12;
    const probability = Math.min(0.8, baseProbability + (currentDistance * distanceMultiplier));
    
    return Math.random() < probability;
  }

  getNewRegionProbability(currentDistance: number): number {
    const baseProbability = 0.15;
    const distanceMultiplier = 0.12;
    return Math.min(0.8, baseProbability + (currentDistance * distanceMultiplier));
  }
}
```

**Test**:
- Test `generateRegionDistance()` returns values 2-7
- Test `shouldCreateNewRegion()` with various distances
- Verify probability increases with distance
- Run 1000 iterations to check probability distribution

### Step 2.3: Integration with GameController
**Goal**: Add RegionService to existing game structure
**Time**: 1 hour

```typescript
// src/gameController.ts - add to constructor
export class GameController {
  private regionService: RegionService;

  constructor(dbPath: string) {
    // existing constructor code...
    this.regionService = new RegionService(this.db);
  }

  // Add helper method for testing
  async getRegionService(): Promise<RegionService> {
    return this.regionService;
  }
}
```

**Test**:
- Start game and access RegionService
- Create region through game controller
- Verify integration doesn't break existing functionality

### Step 2.4: Basic Room-Region Assignment
**Goal**: Manually assign regions to rooms for testing
**Time**: 1 hour

```typescript
// Add to RegionService
async assignRoomToRegion(roomId: number, regionId: number, distance: number): Promise<void> {
  await this.db.run(
    'UPDATE rooms SET region_id = ?, region_distance = ? WHERE id = ?',
    [regionId, distance, roomId]
  );
}

async getRoomsInRegion(regionId: number): Promise<Room[]> {
  return this.db.all<Room>(
    'SELECT * FROM rooms WHERE region_id = ? ORDER BY region_distance',
    [regionId]
  );
}
```

**Test**:
- Create region and assign existing rooms to it
- Query rooms by region
- Verify distance-based ordering works
- Test center room (distance 0) sets region.center_room_id

---

## Phase 3: Enhanced Room Generation (4-5 hours)

### Step 3.1: Region Context for AI
**Goal**: Pass region information to AI for room generation
**Time**: 2 hours

```typescript
// Add to RegionService
interface RegionContext {
  region: Region;
  isCenter: boolean;
  distanceFromCenter: number;
}

async buildRegionContext(roomId: number): Promise<RegionContext | null> {
  const room = await this.db.get<Room>('SELECT * FROM rooms WHERE id = ?', [roomId]);
  if (!room?.region_id) return null;
  
  const region = await this.getRegion(room.region_id);
  if (!region) return null;
  
  return {
    region,
    isCenter: room.region_distance === 0,
    distanceFromCenter: room.region_distance || 0
  };
}

buildRegionPrompt(context: RegionContext): string {
  const { region, isCenter, distanceFromCenter } = context;
  
  let prompt = `Generate a room in the ${region.type} region`;
  if (region.name) {
    prompt += ` called "${region.name}"`;
  }
  prompt += `. Region context: ${region.description}`;
  
  if (isCenter) {
    prompt += ` This is the CENTER of the region - make it grand and significant.`;
  } else {
    prompt += ` This room is ${distanceFromCenter} steps from the region center.`;
  }
  
  return prompt;
}
```

**Test**:
- Create room with region assignment
- Generate region context
- Verify prompt includes region information
- Test both center and non-center room prompts

### Step 3.2: Adjacent Room Context
**Goal**: Include adjacent room descriptions in AI prompts
**Time**: 1.5 hours

```typescript
// Add to RegionService
async getAdjacentRoomDescriptions(roomId: number): Promise<string[]> {
  const adjacentRooms = await this.db.all<Room>(`
    SELECT DISTINCT r.name, r.description 
    FROM rooms r
    JOIN connections c ON (c.from_room_id = r.id OR c.to_room_id = r.id)
    WHERE (c.from_room_id = ? OR c.to_room_id = ?) AND r.id != ?
  `, [roomId, roomId, roomId]);
  
  return adjacentRooms.map(room => `${room.name}: ${room.description}`);
}

async buildRoomGenerationPrompt(
  regionContext: RegionContext, 
  adjacentDescriptions: string[]
): Promise<string> {
  let prompt = this.buildRegionPrompt(regionContext);
  
  if (adjacentDescriptions.length > 0) {
    prompt += `\n\nAdjacent rooms:\n${adjacentDescriptions.join('\n')}`;
    prompt += `\nGenerate a room that logically connects to these adjacent spaces.`;
  }
  
  return prompt;
}
```

**Test**:
- Create connected rooms
- Get adjacent room descriptions
- Verify prompt includes adjacent room context
- Test with 0, 1, and multiple adjacent rooms

### Step 3.3: Modified Room Generation
**Goal**: Update existing room generation to optionally use regions
**Time**: 1.5 hours

```typescript
// Modify existing room generation in GameController or GrokClient
async generateRoomWithRegion(
  gameId: number, 
  fromRoomId?: number,
  forceNewRegion = false
): Promise<Room> {
  let regionId: number;
  let distance: number;
  
  if (fromRoomId && !forceNewRegion) {
    const fromRoom = await this.db.get<Room>('SELECT * FROM rooms WHERE id = ?', [fromRoomId]);
    
    if (fromRoom?.region_id && fromRoom.region_distance !== null) {
      // Check if we should stay in region or start new one
      const shouldNew = this.regionService.shouldCreateNewRegion(fromRoom.region_distance);
      
      if (!shouldNew) {
        // Stay in current region, increase distance
        regionId = fromRoom.region_id;
        distance = fromRoom.region_distance + 1;
      } else {
        // Create new region
        const newRegion = await this.createDefaultRegion(gameId);
        regionId = newRegion.id;
        distance = this.regionService.generateRegionDistance();
      }
    } else {
      // From room has no region, create new one
      const newRegion = await this.createDefaultRegion(gameId);
      regionId = newRegion.id;
      distance = this.regionService.generateRegionDistance();
    }
  } else {
    // New game or forced new region
    const newRegion = await this.createDefaultRegion(gameId);
    regionId = newRegion.id;
    distance = this.regionService.generateRegionDistance();
  }
  
  // Generate room using existing AI logic, but with region context
  const context: RegionContext = {
    region: await this.regionService.getRegion(regionId)!,
    isCenter: distance === 0,
    distanceFromCenter: distance
  };
  
  const adjacentDescriptions = fromRoomId ? 
    await this.regionService.getAdjacentRoomDescriptions(fromRoomId) : [];
  
  const prompt = await this.regionService.buildRoomGenerationPrompt(
    context, 
    adjacentDescriptions
  );
  
  // Use existing AI generation with enhanced prompt
  const roomData = await this.grokClient.generateRoom(prompt);
  
  // Create room with region assignment
  const room = await this.createRoom({
    ...roomData,
    game_id: gameId,
    region_id: regionId,
    region_distance: distance
  });
  
  return room;
}

private async createDefaultRegion(gameId: number): Promise<Region> {
  // For now, create basic regions - later phases will use AI
  const types = ['mansion', 'forest', 'cave', 'town'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  return this.regionService.createRegion(
    gameId,
    type,
    `A mysterious ${type} waiting to be explored.`
  );
}
```

**Test**:
- Generate rooms with region context
- Verify rooms get assigned to regions correctly
- Test distance progression and new region creation
- Check that AI receives enhanced prompts

---

## Phase 4: Commands and User Interface (2-3 hours)

### Step 4.1: Debug Commands
**Goal**: Add commands to inspect and test region system
**Time**: 1 hour

```typescript
// Add to GameController command handlers
private addRegionDebugCommands(): void {
  this.addGameCommand({
    name: 'region',
    description: 'Show current room region information',
    handler: async () => await this.handleRegionCommand()
  });

  this.addGameCommand({
    name: 'regions',
    description: 'List all regions in current game',
    handler: async () => await this.handleRegionsCommand()
  });

  this.addGameCommand({
    name: 'createregion',
    description: 'Create a test region (debug)',
    handler: async (args) => await this.handleCreateRegionCommand(args)
  });
}

private async handleRegionCommand(): Promise<string> {
  const gameState = await this.getGameState(this.currentGameId);
  const currentRoom = await this.db.get<Room>(
    'SELECT * FROM rooms WHERE id = ?', 
    [gameState.current_room_id]
  );
  
  if (!currentRoom?.region_id) {
    return "Current room is not part of any region.";
  }
  
  const region = await this.regionService.getRegion(currentRoom.region_id);
  if (!region) {
    return "Region not found.";
  }
  
  const roomsInRegion = await this.regionService.getRoomsInRegion(region.id);
  
  let output = `Current Region: ${region.name || region.type}\n`;
  output += `Type: ${region.type}\n`;
  output += `Description: ${region.description}\n`;
  output += `Distance from center: ${currentRoom.region_distance}\n`;
  output += `Total rooms in region: ${roomsInRegion.length}\n`;
  
  if (region.center_room_id) {
    const centerRoom = await this.db.get<Room>('SELECT * FROM rooms WHERE id = ?', [region.center_room_id]);
    output += `Center room: ${centerRoom?.name || 'Unknown'}\n`;
  } else {
    output += `Center: Not yet discovered\n`;
  }
  
  return output;
}

private async handleRegionsCommand(): Promise<string> {
  const regions = await this.db.all<Region>(
    'SELECT * FROM regions WHERE game_id = ? ORDER BY created_at',
    [this.currentGameId]
  );
  
  if (regions.length === 0) {
    return "No regions found in current game.";
  }
  
  let output = "Regions in current game:\n";
  for (const region of regions) {
    const roomCount = await this.db.get<{count: number}>(
      'SELECT COUNT(*) as count FROM rooms WHERE region_id = ?',
      [region.id]
    );
    
    output += `- ${region.name || region.type} (${region.type}): ${roomCount?.count || 0} rooms\n`;
  }
  
  return output;
}
```

**Test**:
- Use `region` command to inspect current room's region
- Use `regions` command to list all regions
- Create rooms and verify commands show correct information

### Step 4.2: Enhanced Room Display
**Goal**: Show region information in room descriptions
**Time**: 1 hour

```typescript
// Modify existing look/room description method
private async formatRoomDescription(room: Room): Promise<string> {
  let output = `${room.name}\n${room.description}`;
  
  // Add region context if available
  if (room.region_id) {
    const region = await this.regionService.getRegion(room.region_id);
    if (region) {
      if (room.region_distance === 0) {
        output += `\n\n[This is the heart of ${region.name || `the ${region.type}`}]`;
      } else if (region.name) {
        output += `\n\n[Part of ${region.name}]`;
      }
    }
  }
  
  // Existing code for connections, NPCs, etc.
  
  return output;
}
```

**Test**:
- Look at rooms with region assignments
- Verify region context appears in descriptions
- Test both center and non-center room displays

### Step 4.3: Region Transition Commands
**Goal**: Add commands to test region generation
**Time**: 1 hour

```typescript
// Add test command for generating new region rooms
this.addGameCommand({
  name: 'newregion',
  description: 'Force generation of room in new region (testing)',
  handler: async () => await this.handleNewRegionCommand()
});

private async handleNewRegionCommand(): Promise<string> {
  const gameState = await this.getGameState(this.currentGameId);
  const newRoom = await this.generateRoomWithRegion(
    this.currentGameId,
    gameState.current_room_id,
    true // force new region
  );
  
  // Create connection to new room
  await this.db.run(
    'INSERT INTO connections (game_id, from_room_id, to_room_id, name) VALUES (?, ?, ?, ?)',
    [this.currentGameId, gameState.current_room_id, newRoom.id, 'test exit']
  );
  
  return `Created new room "${newRoom.name}" in a new region. Use 'go test exit' to visit it.`;
}
```

**Test**:
- Use `newregion` command to create rooms in new regions
- Verify each new region gets appropriate type and description
- Test movement between regions

---

## Phase 5: AI Region Generation (3-4 hours)

### Step 5.1: Enhanced Region Generation
**Goal**: Use AI to generate region names, types, and descriptions
**Time**: 2 hours

```typescript
// Add to GrokClient or create new RegionGenerator
interface RegionGenerationRequest {
  gameId: number;
  transitionFrom?: Room;
  previousRegion?: Region;
}

async generateRegionWithAI(request: RegionGenerationRequest): Promise<Region> {
  let prompt = "Generate a new thematic region for exploration. ";
  
  if (request.transitionFrom && request.previousRegion) {
    prompt += `Transitioning from: ${request.transitionFrom.name} (${request.transitionFrom.description}) `;
    prompt += `in a ${request.previousRegion.type} region (${request.previousRegion.description}). `;
    prompt += `Create a region that would logically connect but be thematically different. `;
  }
  
  prompt += `Respond with JSON: {
    "name": "Region name",
    "type": "region_type",
    "description": "Rich description for AI context in future room generation"
  }`;
  
  const response = await this.grokClient.generateContent(prompt);
  const regionData = JSON.parse(response);
  
  return this.regionService.createRegion(
    request.gameId,
    regionData.type,
    regionData.description,
    regionData.name
  );
}
```

**Test**:
- Generate regions using AI
- Verify JSON parsing works correctly
- Test regions have appropriate names and descriptions
- Check transitions make thematic sense

### Step 5.2: Center Room Special Generation
**Goal**: Enhanced AI prompts for region center rooms
**Time**: 1 hour

```typescript
// Modify room generation to use special center prompts
async generateCenterRoomPrompt(region: Region): Promise<string> {
  let prompt = `Generate the CENTER room of ${region.name || `a ${region.type}`} region. `;
  prompt += `Region context: ${region.description}. `;
  
  prompt += `This should be the most important and impressive room in the region. `;
  
  switch (region.type) {
    case 'mansion':
      prompt += `Consider: grand hall, ballroom, master study, or throne room. `;
      break;
    case 'forest':
      prompt += `Consider: sacred grove, ancient tree, mystical clearing, or druid circle. `;
      break;
    case 'cave':
      prompt += `Consider: vast cavern, underground lake, crystal chamber, or treasure vault. `;
      break;
    case 'town':
      prompt += `Consider: market square, town hall, central plaza, or main temple. `;
      break;
    default:
      prompt += `Make it grand and central to the ${region.type} theme. `;
  }
  
  prompt += `This room should contain important NPCs, unique items, or story elements.`;
  
  return prompt;
}
```

**Test**:
- Generate center rooms for different region types
- Verify center rooms feel appropriately grand
- Check that center room discovery triggers region.center_room_id update

### Step 5.3: Integration Testing
**Goal**: Test complete region system end-to-end
**Time**: 1 hour

```typescript
// Create comprehensive test scenario
async testCompleteRegionSystem(gameId: number): Promise<void> {
  console.log("Testing complete region system...");
  
  // 1. Generate first region and room
  const firstRegion = await this.generateRegionWithAI({ gameId });
  const firstRoom = await this.generateRoomWithRegion(gameId);
  
  // 2. Generate several connecting rooms
  let currentRoom = firstRoom;
  for (let i = 0; i < 5; i++) {
    const nextRoom = await this.generateRoomWithRegion(gameId, currentRoom.id);
    
    // Create connection
    await this.db.run(
      'INSERT INTO connections (game_id, from_room_id, to_room_id, name) VALUES (?, ?, ?, ?)',
      [gameId, currentRoom.id, nextRoom.id, `exit ${i + 1}`]
    );
    
    currentRoom = nextRoom;
    
    // Log region information
    const region = await this.regionService.findRegionByRoom(nextRoom.id);
    console.log(`Room ${i + 1}: ${nextRoom.name} (${region?.type}, distance ${nextRoom.region_distance})`);
  }
  
  // 3. Verify region centers were discovered
  const regions = await this.db.all<Region>('SELECT * FROM regions WHERE game_id = ?', [gameId]);
  for (const region of regions) {
    const centerRoom = region.center_room_id ? 
      await this.db.get<Room>('SELECT * FROM rooms WHERE id = ?', [region.center_room_id]) : null;
    console.log(`Region ${region.type}: ${centerRoom ? 'Center found' : 'No center yet'}`);
  }
}
```

**Test**:
- Run complete system test
- Verify regions are created appropriately
- Check distance progression and new region triggers
- Confirm center rooms are discovered and marked correctly

---

## Phase 6: Polish and Integration (2-3 hours)

### Step 6.1: Fallback and Error Handling
**Goal**: Ensure system gracefully handles failures
**Time**: 1 hour

```typescript
// Add robust error handling
async generateRoomWithRegion(gameId: number, fromRoomId?: number, forceNewRegion = false): Promise<Room> {
  try {
    // Existing generation logic...
    return generatedRoom;
  } catch (error) {
    console.warn('Region-based generation failed, falling back to legacy generation:', error);
    
    // Fall back to original room generation
    return this.generateRoomLegacy(gameId);
  }
}

private async generateRoomLegacy(gameId: number): Promise<Room> {
  // Original room generation logic without regions
  const roomData = await this.grokClient.generateRoom("Generate a mysterious room for exploration.");
  
  return this.createRoom({
    ...roomData,
    game_id: gameId
    // No region_id or region_distance
  });
}
```

**Test**:
- Simulate AI failures and verify fallback works
- Test with invalid region IDs
- Ensure existing games without regions continue working

### Step 6.2: Performance Optimization
**Goal**: Ensure region queries are efficient
**Time**: 45 minutes

```sql
-- Additional indexes for performance
CREATE INDEX idx_rooms_region_distance_combined ON rooms(region_id, region_distance) 
WHERE region_id IS NOT NULL;

CREATE INDEX idx_regions_center_lookup ON regions(center_room_id) 
WHERE center_room_id IS NOT NULL;
```

**Test**:
- Run queries on games with many regions
- Profile database performance
- Verify indexes are being used correctly

### Step 6.3: Documentation and Help
**Goal**: Update help system and add documentation
**Time**: 1 hour

```typescript
// Update help text to include region commands
private updateHelpText(): void {
  const regionHelp = `
Region Commands:
  region       - Show current room's region information
  regions      - List all regions in current game
  newregion    - Generate room in new region (testing)
  
Region System:
  The world is organized into thematic regions like mansions, forests, 
  caves, and towns. Each region has a center room with important content.
  Rooms farther from region centers are more likely to connect to new regions.
  `;
  
  // Add to existing help system
}
```

### Step 6.4: Final Integration Testing
**Goal**: Comprehensive testing with existing game features
**Time**: 1 hour

**Test Checklist**:
- [ ] New games start with region system active
- [ ] Existing games without regions continue working
- [ ] Region transitions feel natural and thematic
- [ ] AI-generated content maintains quality
- [ ] Performance remains acceptable
- [ ] Save/load preserves region information
- [ ] All debug commands work correctly
- [ ] Error handling prevents crashes
- [ ] Database migrations apply cleanly

---

## Testing Strategy

### Unit Tests
- `RegionService` methods with various inputs
- Probability calculations return expected ranges
- Database triggers fire correctly
- AI prompt generation includes correct context

### Integration Tests  
- End-to-end room generation with regions
- Region transitions and center discovery
- Command functionality with region data
- Performance with multiple regions

### Manual Testing
- Play through region discovery naturally
- Verify thematic consistency of generated content
- Test edge cases (single room regions, etc.)
- Ensure region information enhances rather than disrupts gameplay

### Performance Testing
- Generate 100+ rooms across multiple regions
- Measure database query performance
- Profile AI generation times with enhanced prompts
- Test memory usage with region caching

---

## Rollback Plan

If any step causes issues:

1. **Database Rollback**: Each migration is reversible
2. **Feature Toggle**: Add `ENABLE_REGIONS` environment variable
3. **Graceful Degradation**: System falls back to legacy room generation
4. **Data Preservation**: Existing rooms continue working without regions

---

*This implementation plan ensures the region system can be built incrementally, tested thoroughly at each step, and integrated smoothly with existing Shadow Kingdom functionality.*