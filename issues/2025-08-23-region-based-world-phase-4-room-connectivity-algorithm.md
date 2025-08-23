# Region-Based World Phase 4: Room Connectivity Algorithm

**Date**: 2025-08-23  
**Status**: Open  
**Priority**: High  
**Category**: Feature/World System  

## Description

Create graph-based algorithm to connect 12 rooms with non-linear, explorable connectivity patterns.

## Goal

Build RegionConnectorService with connectivity algorithms while keeping game fully playable in existing Region 1.

## Dependencies

- Phase 3: Complete Region Generation (for testing with room data)

## Implementation

### Core Deliverable
- Create `src/services/regionConnectorService.ts`
- Implement minimum spanning tree for base connectivity
- Add extra edges for exploration loops and alternate paths
- Assign compass directions (N/S/E/W) to connections

### Connectivity Algorithm
```typescript
interface RoomConnection {
  fromRoomId: number;
  toRoomId: number;
  direction: 'north' | 'south' | 'east' | 'west';
  name: string; // "through the crystal archway"
}

class RegionConnectorService {
  connectRooms(rooms: GeneratedRoom[]): RoomConnection[] {
    // 1. Build minimum spanning tree (guarantees all rooms reachable)
    const baseGraph = this.buildMinimumSpanningTree(rooms);
    
    // 2. Add 30-40% extra edges for interesting topology
    const extraEdges = Math.floor(rooms.length * 0.35);
    this.addAlternatePaths(baseGraph, extraEdges);
    
    // 3. Convert graph to directional connections with names
    return this.generateDirectionalConnections(baseGraph);
  }
}
```

### Connectivity Rules
1. **All rooms reachable** - Every room accessible from every other room
2. **Multiple paths** - Not just linear, include loops and shortcuts
3. **Connection limits** - Each room has 1-4 connections (compass directions)
4. **Thematic connection names** - "through crystal archway", "down spiral stairs"

### Connection Distribution
- **Minimum**: Every room has at least 1-2 connections
- **Maximum**: No room has more than 4 connections (NSEW limit)
- **Extra paths**: ~35% additional connections beyond minimum spanning tree
- **Special rooms**: Entrance/exit may have fewer connections by design

## Acceptance Criteria

- [x] All 12 rooms are reachable from any other room
- [x] Multiple paths exist between rooms (not linear progression)
- [x] Every room has 1-4 connections within compass direction limits
- [x] Connection directions are properly assigned (N/S/E/W)
- [x] No isolated rooms or unreachable areas
- [x] Graph traversal algorithms can verify full connectivity
- [x] Extra paths create interesting exploration opportunities
- [x] Connection names are thematically appropriate

## Test Plan

### Algorithm Testing
- Generate connectivity for mock 12-room data
- Verify graph connectivity using breadth-first search
- Verify multiple paths exist between distant rooms
- Check compass direction assignments don't conflict
- Test edge cases (minimum connections, maximum connections)

### Integration Testing
- Connect rooms from Phase 3's complete region generation
- Verify thematic connection names match region concept
- Test connectivity with different region themes
- Verify no connection direction conflicts or overlaps

## Graph Theory Validation

The algorithm must pass these connectivity tests:
- **Reachability**: BFS from any room reaches all 12 rooms
- **Multiple paths**: At least 2 different paths between entrance and exit
- **No isolated components**: Single connected graph component
- **Direction consistency**: Each room's connections use different compass directions

## Game State Impact

**No change to gameplay** - Player continues to play in hardcoded Region 1. This phase creates the connectivity foundation needed for Phase 5's database instantiation.

## Next Phase

Phase 5 will combine complete region generation with connectivity to instantiate full regions in the database.