# Region-Based World Generation

**Status**: 🚧 PLANNED - Comprehensive redesign of world generation system  
**Last Updated**: 2025-08-23  
**Priority**: HIGH - Core architecture change  

## Executive Summary

Transform Shadow Kingdom from reactive room-by-room generation to proactive region-based generation. Each region is a self-contained adventure area with 12 interconnected rooms, a guardian monster, a key, and a locked exit to the next region.

## Core Concepts

### Region Structure
- Each region contains exactly 12 pre-generated rooms
- One guardian monster that must be defeated to obtain the region key
- One locked exit door requiring the key to progress to next region
- Multiple interconnected paths between rooms (not linear)
- First region is hardcoded for quality control
- Subsequent regions are AI-generated in background

### Generation Flow
1. **Game Start**: Load hardcoded Region 1 (tutorial area)
2. **Background Generation**: While player explores Region 1, AI generates Region 2
3. **Region Transition**: When player unlocks Region 2, AI begins generating Region 3
4. **Continuous Pattern**: Always stay one region ahead of player

### Player Progression Model
```
Region 1 (Hardcoded) → Region 2 (AI) → Region 3 (AI) → ...
   ↓                     ↓               ↓
[12 rooms]            [12 rooms]      [12 rooms]
[Guardian]            [Guardian]      [Guardian]
[Key → Exit]          [Key → Exit]    [Key → Exit]
```

## Two-Phase AI Generation System

### Phase 1: Region Concept Generation
Quick generation (2-3 seconds) of high-level theme and elements:

```json
{
  "name": "The Crystal Caverns",
  "theme": "Ancient crystal mines overtaken by magical growth",
  "atmosphere": "Ethereal glow, echoing chambers, crystalline formations",
  "history": "Former mining operation transformed by magical crystal infection",
  "guardian": {
    "name": "The Crystal Warden",
    "description": "A former mine foreman transformed into living crystal",
    "personality": "Protective of crystals, speaks in resonant echoes",
    "combatStyle": "Shatters into shards, reforms from walls"
  },
  "key": {
    "name": "Prism Key",
    "description": "A key carved from pure rainbow crystal"
  },
  "lockedExit": {
    "name": "The Resonance Gate", 
    "description": "A barrier of harmonizing crystal that requires the Prism Key"
  },
  "suggestedElements": [
    "mining equipment", "crystal formations", "underground lakes", 
    "abandoned camps", "echo effects", "refracted light"
  ]
}
```

### Phase 2: Individual Room Generation
Generate each of 12 rooms (1-2 seconds each) using concept as context:

**Room Distribution:**
- **Room 1**: Region entrance (connects to previous region)
- **Rooms 2-9**: Exploration rooms (varied purposes)
- **Room 10**: Guardian's lair (contains guardian and key)
- **Room 11**: Exit chamber (contains locked door to next region)
- **Room 12**: Additional exploration room

**Per-Room AI Prompt:**
```
Generate room X of 12 for the Crystal Caverns region.
Region theme: Ancient crystal mines overtaken by magical growth
Atmosphere: Ethereal glow, echoing chambers, crystalline formations

Create a unique room with:
- Distinctive name and 2-3 sentence description
- 1-3 appropriate items for the theme
- 0-2 NPCs or creatures (if thematically appropriate)
- Connections in compass directions

[Special instructions for guardian room, exit room, etc.]
```

## Room Connectivity System

### Graph-Based Connection Algorithm

**Core Principles:**
- All rooms must be reachable (no isolated areas)
- Multiple paths between areas (not just linear)
- Guardian room doesn't need to block exit
- Players can discover exit before finding guardian

**Connection Rules:**
1. **Minimum connections**: Every room has at least 2 connections (except entrance/exit may have 1)
2. **Maximum connections**: No room has more than 4 connections (NSEW)
3. **Connectivity guarantee**: Use minimum spanning tree algorithm
4. **Exploration enhancement**: Add 30-40% extra edges for loops and alternate paths

```typescript
interface RoomConnection {
  roomId: number;
  direction: 'north' | 'south' | 'east' | 'west';
  connectedRoomId: number;
  connectionName: string; // "through the crystal archway"
}

class RegionConnector {
  connect(rooms: Room[]): RoomConnection[] {
    // 1. Build minimum spanning tree (guarantees connectivity)
    const graph = this.buildConnectedGraph(rooms);
    
    // 2. Add extra edges for interesting topology
    const extraEdges = Math.floor(rooms.length * 0.35);
    this.addAlternatePaths(graph, extraEdges);
    
    // 3. Convert graph to directional connections
    return this.graphToDirections(graph);
  }
}
```

### Example Region Layout
```
    [Treasury]───[Library]
         │           │
[Armory]─┼─[Hub]──────┼───[Shrine]
    │        │               │
[Entrance]──[Plaza]────[Courtyard]
             │               │
        [Storage]    [Guardian🗡️]
                           │
                      [Exit🔒]
```

## Guardian Combat System

### Guardian Mechanics

**Core Behavior:**
- Guardian blocks access to key item (not the exit door)
- Key is visible but untouchable until guardian defeated
- Simple turn-based combat resolution
- Once defeated, guardian stays defeated

```typescript
class GuardianRoom extends Room {
  private guardian: Guardian;
  private keyItem: Item;
  private isDefeated: boolean = false;

  async onEnter(player: Player) {
    if (!this.isDefeated) {
      this.display(`${this.guardian.name} blocks your path to the ${this.keyItem.name}!`);
      this.display("You must defeat it to claim the key.");
    } else {
      this.display(`The defeated ${this.guardian.name} lies motionless.`);
      if (!this.keyTaken) {
        this.display(`The ${this.keyItem.name} glints on the ground.`);
      }
    }
  }

  async onPickup(itemName: string): Promise<boolean> {
    if (!this.isDefeated && itemName.includes(this.keyItem.name)) {
      this.display(`You cannot reach the ${this.keyItem.name}! ${this.guardian.name} blocks your way!`);
      return false; // Block pickup
    }
    return true; // Allow normal pickup
  }

  async onAttack(target: string): Promise<void> {
    if (target.includes(this.guardian.name)) {
      const result = await this.resolveCombat(player, this.guardian);
      if (result.winner === 'player') {
        this.isDefeated = true;
        this.display(`You defeated the ${this.guardian.name}!`);
        this.display(`The ${this.keyItem.name} is now yours to take.`);
      } else {
        this.display("You are defeated! Try again with better equipment or tactics.");
      }
    }
  }
}
```

### Combat Resolution
```typescript
interface CombatResult {
  winner: 'player' | 'guardian';
  damageDealt: number;
  damageReceived: number;
}

async resolveCombat(player: Character, guardian: Guardian): Promise<CombatResult> {
  // Simple stat-based combat
  const playerAttack = player.strength + Math.random() * 6;
  const guardianDefense = guardian.defense + Math.random() * 6;
  
  if (playerAttack > guardianDefense) {
    return { winner: 'player', damageDealt: playerAttack, damageReceived: 0 };
  } else {
    return { winner: 'guardian', damageDealt: 0, damageReceived: guardianDefense };
  }
}
```

## Database Schema Changes

### New Tables

```sql
-- Store AI-generated region plans
CREATE TABLE region_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  sequence_number INTEGER NOT NULL, -- 1, 2, 3, etc.
  name TEXT NOT NULL,
  concept_json TEXT NOT NULL, -- Full region concept from Phase 1
  room_count INTEGER DEFAULT 12,
  status TEXT DEFAULT 'generating', -- generating/ready/instantiated
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

-- Track individual room generation within region plans
CREATE TABLE region_room_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  region_plan_id INTEGER NOT NULL,
  room_sequence INTEGER NOT NULL, -- 1-12
  room_name TEXT NOT NULL,
  room_description TEXT NOT NULL,
  items_json TEXT, -- Array of items to place
  characters_json TEXT, -- Array of NPCs/creatures
  is_entrance BOOLEAN DEFAULT FALSE,
  is_guardian_room BOOLEAN DEFAULT FALSE,
  is_exit_room BOOLEAN DEFAULT FALSE,
  instantiated_room_id INTEGER, -- Links to actual room once created
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (region_plan_id) REFERENCES region_plans(id) ON DELETE CASCADE
);

-- Track guardian states per game/region
CREATE TABLE guardian_states (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  region_id INTEGER NOT NULL,
  guardian_room_id INTEGER NOT NULL,
  guardian_name TEXT NOT NULL,
  key_item_id INTEGER NOT NULL,
  is_defeated BOOLEAN DEFAULT FALSE,
  key_taken BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE CASCADE
);

-- Create indices for performance
CREATE INDEX idx_region_plans_game_sequence ON region_plans(game_id, sequence_number);
CREATE INDEX idx_region_templates_plan ON region_room_templates(region_plan_id);
CREATE INDEX idx_guardian_states_game_region ON guardian_states(game_id, region_id);
```

### Modified Tables

```sql
-- Simplify regions table
ALTER TABLE regions ADD COLUMN sequence_number INTEGER; -- 1, 2, 3, etc.
ALTER TABLE regions ADD COLUMN entrance_room_id INTEGER REFERENCES rooms(id);
ALTER TABLE regions ADD COLUMN exit_room_id INTEGER REFERENCES rooms(id);  
ALTER TABLE regions ADD COLUMN guardian_room_id INTEGER REFERENCES rooms(id);
ALTER TABLE regions ADD COLUMN plan_id INTEGER REFERENCES region_plans(id);
ALTER TABLE regions ADD COLUMN is_active BOOLEAN DEFAULT FALSE; -- Player is currently here

-- Remove obsolete room columns  
ALTER TABLE rooms DROP COLUMN region_distance;
ALTER TABLE rooms DROP COLUMN generation_processed;

-- Add room role tracking
ALTER TABLE rooms ADD COLUMN room_role TEXT; -- 'entrance', 'guardian', 'exit', 'exploration'
ALTER TABLE rooms ADD COLUMN sequence_in_region INTEGER; -- 1-12
```

## Architecture Changes

### Eliminated Systems
The following current systems will be **completely removed**:

- **Distance-based region transitions** (`shouldCreateNewRegion()` probability)
- **Region distance tracking** (`region_distance` field)
- **Visit-to-lock mechanism** (`generation_processed` flags)
- **Unfilled connections** (`to_room_id = NULL` patterns)  
- **Movement-triggered generation** (BackgroundGenerationService triggers)
- **Incremental room creation** (rooms created as player moves)

### New Services

```typescript
// src/services/regionPlannerService.ts
export class RegionPlannerService {
  async generateRegionPlan(gameId: number, sequenceNumber: number): Promise<RegionPlan>
  async instantiateRegion(planId: number): Promise<Region>
  async isRegionReady(sequenceNumber: number): Promise<boolean>
}

// src/services/regionConnectorService.ts  
export class RegionConnectorService {
  connectRooms(rooms: Room[]): RoomConnection[]
  validateConnectivity(connections: RoomConnection[]): boolean
  generateConnectionNames(connections: RoomConnection[], theme: string): RoomConnection[]
}

// src/services/guardianService.ts
export class GuardianService {
  async createGuardian(room: Room, guardianData: GuardianData): Promise<Guardian>
  async handleCombat(player: Character, guardian: Guardian): Promise<CombatResult>
}
```

## Configuration

### Environment Variables
```bash
# Region Generation
REGION_SIZE=12                    # Rooms per region (fixed)
REGION_GENERATION_TIMEOUT=30000   # 30 seconds max per region  
ENABLE_GUARDIAN_COMBAT=true       # Enable combat system

# AI Generation  
AI_REGION_CONCEPT_RETRIES=3       # Retry failed concept generation
AI_ROOM_GENERATION_RETRIES=2      # Retry failed room generation
AI_GENERATION_PARALLEL_LIMIT=3    # Max concurrent room generations
```

## Success Criteria

### Technical Requirements
- ✅ Regions generate completely before player needs them
- ✅ All 12 rooms are accessible (no isolated rooms)  
- ✅ Guardian must be defeated to access key
- ✅ Key unlocks exit to next region
- ✅ Multiple paths exist between rooms within regions
- ✅ No generation lag during gameplay

### Quality Requirements  
- ✅ AI generates coherent, themed regions
- ✅ Rooms feel connected to region concept
- ✅ Guardian placement makes thematic sense
- ✅ Exploration is rewarded (multiple paths, hidden areas)
- ✅ Clear progression between regions

### Performance Requirements
- ✅ Region generation completes within 30 seconds
- ✅ No more than 13 AI calls per region (1 concept + 12 rooms)
- ✅ Database queries optimized for region loading
- ✅ Memory usage remains reasonable with multiple regions

## Benefits of New System

1. **Coherent World Design** - AI designs complete themed areas instead of random rooms
2. **Predictable Structure** - Always 12 rooms, 1 guardian, 1 key per region  
3. **Better Performance** - Fewer AI calls (13 per region vs 12+ incremental)
4. **No Generation Lag** - Regions ready before player needs them
5. **Clear Progression** - Linear region sequence with clear goals
6. **Exploration Freedom** - Non-linear room layout within each region
7. **Simpler Architecture** - Removes complex incremental generation logic

---

**Next Steps**: Begin implementation with database schema changes and RegionPlannerService foundation.