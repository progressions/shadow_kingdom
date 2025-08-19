# Shadow Kingdom: Region-Based World Generation System

**Date**: 2025-01-19  
**Version**: 1.0  
**Type**: Technical Specification  

## Overview

The Region System provides thematic world structure for Shadow Kingdom, using distance-based probability generation to create coherent areas that feel naturally designed while maintaining AI-driven procedural generation. This system replaces pure random room generation with contextual, region-aware world building.

## Core Concepts

### 1. Region Definition

**What is a Region?**
A region is a thematically coherent area containing multiple connected rooms. Examples:
- **Mansion**: Grand foyer, library, dining room, bedrooms, servant quarters
- **Forest**: Woodland paths, clearings, ancient groves, fairy circles
- **Cave System**: Winding tunnels, underground lakes, crystal chambers
- **Town**: Market square, tavern, shops, residential areas

**Region Properties:**
- **Type**: Categorical theme (mansion, forest, cave, dungeon, town)
- **Name**: AI-generated unique identifier ("Blackwood Mansion", "Whispering Woods")
- **Description**: Rich contextual information for AI generation
- **Center**: The most important room, discovered through exploration

### 2. Distance-Based Probability System

#### Generation Algorithm

**New Region Trigger:**
When moving from an existing room, probability of starting a new region:
```typescript
function getNewRegionProbability(currentRoomDistance: number): number {
  // Higher distance from center = higher chance of new region
  const baseProbability = 0.15; // 15% base chance
  const distanceMultiplier = 0.12; // 12% per distance unit
  return Math.min(0.8, baseProbability + (currentRoomDistance * distanceMultiplier));
}

// Example: Room at distance 3 from center has ~51% chance of triggering new region
```

**Distance Assignment:**
When new region is triggered, the entry room gets a random distance:
```typescript
function assignRegionDistance(): number {
  return randomInt(2, 7); // Entry rooms are 2-7 steps from (unknown) center
}
```

#### Retroactive Center Discovery

**Path Guarantee:**
Every new region room with distance N must have at least one connection leading to distance N-1, ensuring a guaranteed path to the center.

**Center Discovery:**
When a room is generated with distance 0, it becomes the region center:
- Region gains a focal point for future generation
- All connections from center start at distance 1
- Center rooms receive special AI generation prompts

### 3. AI Integration

#### Contextual Generation Prompts

**Region Creation:**
```
Generate a new region accessible from [previous room description]. 
The region should be thematically different from [previous region type].
Consider the transition from [indoor/outdoor/underground] environment.
Create a region name, type, and rich description for future room generation.
```

**Room Generation:**
```
Generate a room in the [region name] region ([region type]: [region description]).
This room is [distance] steps from the region center.
Adjacent rooms: [list of connected room descriptions]
[If distance = 0: This is the CENTER of the region - make it grand and significant]
[If distance > 0: This room should logically connect to adjacent spaces]
```

**Center Room Focus:**
```
Generate the centerpiece room of [region name]. This is the heart of the region where the most important elements should be located. Consider:
- For mansion: grand hall, ballroom, or master study
- For forest: sacred grove, ancient tree, or mystical clearing  
- For cave: vast cavern, underground lake, or treasure chamber
This room should feel significant and memorable.
```

## Database Implementation

### Region Table Schema
```sql
CREATE TABLE regions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  name TEXT, -- "Shadowmere Castle", "Moonlit Grove"
  type TEXT NOT NULL, -- "mansion", "forest", "cave", "dungeon", "town"
  description TEXT NOT NULL, -- Rich AI context
  center_room_id INTEGER, -- The discovered center (null until found)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (center_room_id) REFERENCES rooms(id)
);
```

### Enhanced Rooms Schema
```sql
-- Add region support to existing rooms table
ALTER TABLE rooms ADD COLUMN region_id INTEGER;
ALTER TABLE rooms ADD COLUMN region_distance INTEGER; -- 0 = center, 1+ = distance

-- Foreign key relationship
ALTER TABLE rooms ADD FOREIGN KEY (region_id) REFERENCES regions(id);
```

### Indexes for Performance
```sql
-- Region queries
CREATE INDEX idx_regions_game ON regions(game_id);
CREATE INDEX idx_regions_center ON regions(center_room_id) WHERE center_room_id IS NOT NULL;

-- Room region queries  
CREATE INDEX idx_rooms_region ON rooms(region_id);
CREATE INDEX idx_rooms_region_distance ON rooms(region_id, region_distance);
CREATE INDEX idx_rooms_region_center ON rooms(region_id) WHERE region_distance = 0;
```

## Service Architecture

### RegionService Class

```typescript
interface RegionService {
  // Region Management
  createRegion(gameId: number, type: string, name?: string, description?: string): Promise<Region>;
  getRegion(regionId: number): Promise<Region | null>;
  findRegionByRoom(roomId: number): Promise<Region | null>;
  
  // Center Discovery
  setRegionCenter(regionId: number, roomId: number): Promise<void>;
  findRegionCenter(regionId: number): Promise<Room | null>;
  isRegionCenterDiscovered(regionId: number): Promise<boolean>;
  
  // Generation Logic
  shouldCreateNewRegion(currentRoomId: number): Promise<boolean>;
  generateRegionDistance(): number;
  getAdjacentRoomDescriptions(roomId: number): Promise<string[]>;
  
  // AI Context
  buildRegionContext(regionId: number): Promise<RegionContext>;
  buildRoomGenerationPrompt(regionId: number, distance: number, adjacentRooms: Room[]): Promise<string>;
}

interface RegionContext {
  region: Region;
  adjacentRoomDescriptions: string[];
  isCenter: boolean;
  distanceFromCenter: number;
}
```

### Enhanced Room Generation

```typescript
async function generateNewRoom(
  fromRoomId: number, 
  direction: string
): Promise<Room> {
  const fromRoom = await getRoomById(fromRoomId);
  const shouldNewRegion = await regionService.shouldCreateNewRegion(fromRoomId);
  
  let regionId: number;
  let distance: number;
  
  if (shouldNewRegion) {
    // Create new region
    const newRegion = await generateRegionWithAI(fromRoom);
    regionId = newRegion.id;
    distance = regionService.generateRegionDistance();
  } else {
    // Continue in current region
    regionId = fromRoom.region_id;
    distance = fromRoom.region_distance + 1;
  }
  
  // Generate room with full context
  const context = await regionService.buildRegionContext(regionId);
  const prompt = await regionService.buildRoomGenerationPrompt(
    regionId, 
    distance, 
    await getAdjacentRooms(fromRoomId)
  );
  
  const roomData = await grokClient.generateRoom(prompt);
  
  return await createRoom({
    ...roomData,
    game_id: fromRoom.game_id,
    region_id: regionId,
    region_distance: distance
  });
}
```

## Gameplay Implications

### Player Experience

**Natural Exploration Flow:**
- Players experience coherent thematic transitions
- Each region feels purposefully designed  
- Discovery of region centers provides satisfying exploration goals
- Adjacent room context prevents jarring environmental shifts

**Regional Specialization:**
- **NPCs**: Merchants in towns, druids in forests, nobles in mansions
- **Items**: Region-appropriate loot (forest herbs, mansion silverware, cave gems)
- **Quests**: Thematically consistent storylines within regions
- **Challenges**: Environmental hazards match regional themes

### Distance-Based Content Distribution

**Center Rooms (distance 0):**
- 80% probability of important NPCs (region bosses, quest givers)
- Unique items and artifacts
- Major story revelations
- Architectural grandeur

**Near Center (distance 1-2):**
- 40-60% probability of significant content
- Supporting NPCs and moderate treasures
- Access to center room

**Region Edges (distance 3+):**
- 10-20% probability of major content
- Common items and basic NPCs
- Transition opportunities to new regions

## AI Content Quality

### Thematic Consistency

**Region Descriptions:**
The AI maintains consistent themes through rich regional context:
- Mansion regions generate formal, aristocratic environments
- Forest regions create natural, organic descriptions  
- Cave regions produce dark, underground atmospheres
- Town regions focus on social, commercial spaces

**Transition Logic:**
Adjacent room awareness prevents impossible geography:
- Library connects to study, not kitchen
- Cave tunnel doesn't lead directly to ballroom
- Forest path naturally connects to clearings

**Narrative Coherence:**
Each region tells a story through its spaces:
- Mansion: From servant quarters to master suite
- Forest: From edge paths to sacred grove
- Dungeon: From entrance to boss chamber

### Content Scaling

**Balanced Generation:**
- Region size naturally distributes around 4-8 rooms
- Single-room regions rare but possible (hidden chambers)
- Massive regions uncommon but memorable when they occur

**Difficulty Progression:**
- Region centers often contain challenges appropriate to region theme
- Distance from center can influence encounter difficulty
- Players naturally progress toward more significant content

## Implementation Phases

### Phase 1: Core Region System
1. Create regions table and enhance rooms schema
2. Implement RegionService with basic functionality
3. Add distance-based probability generation
4. Update room generation to use region context

### Phase 2: AI Integration
1. Enhance Grok prompts with regional context
2. Implement adjacent room description passing
3. Add special center room generation logic
4. Create region type templates and themes

### Phase 3: Content Integration
1. Update NPC generation to use regional themes
2. Implement region-appropriate item generation
3. Add region-specific quest generation
4. Balance content distribution across distances

### Phase 4: Polish and Optimization
1. Performance tune region queries
2. Add regional exploration commands
3. Implement region discovery notifications
4. Balance region transition probabilities

## Future Enhancements

### Advanced Features
- **Sub-regions**: Nested thematic areas within larger regions
- **Region History**: Tracking of player actions and changes over time
- **Dynamic Regions**: Regions that change based on player choices
- **Connected Regions**: Multi-region storylines and quest chains

### Player Tools
- **Region Map**: Visual representation of discovered areas
- **Region Journal**: Automatic logging of regional lore and discoveries
- **Fast Travel**: Quick movement between discovered region centers
- **Region Reputation**: Standing with different area inhabitants

---

*The Region System transforms Shadow Kingdom from a collection of random rooms into a living, breathing world with natural geographical and narrative structure, while maintaining the surprise and variety of AI-driven content generation.*