# Map System

**Date**: 2025-08-20  
**Status**: Open  
**Priority**: Medium  
**Category**: Feature  

## Description

Implement a visual map system that tracks explored areas, displays ASCII art regional maps, shows player location, and provides navigation assistance for the procedurally generated world.

## Details

**What is the requirement?**
Create a map system with the following features:

- **Exploration Tracking**: Record all visited rooms and connections
- **ASCII Map Display**: Visual representation of explored areas
- **Player Location**: Current position indicator on maps
- **Regional Maps**: Separate maps for each region type
- **Navigation Assistance**: Distance and direction information
- **Map Markers**: Notable locations like region centers, NPCs, quests
- **Zoom Levels**: Local area vs regional overview maps

**Acceptance criteria:**
- [ ] `map` command to display current area map
- [ ] `worldmap` command for full regional overview
- [ ] ASCII art representation of room connections
- [ ] Player position clearly marked on map
- [ ] Different symbols for different room/location types
- [ ] Unexplored connections shown as possibilities
- [ ] Map legend explaining symbols and markers
- [ ] Integration with existing room and region systems

## Technical Notes

### Map Data Structure
```typescript
interface MapData {
  gameId: number;
  rooms: MapRoom[];
  connections: MapConnection[];
  regions: MapRegion[];
  playerLocation: { roomId: number; x: number; y: number };
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

interface MapRoom {
  id: number;
  name: string;
  x: number;
  y: number;
  regionId: number;
  roomType: 'normal' | 'center' | 'entrance' | 'special';
  isVisited: boolean;
  hasNPC: boolean;
  hasQuest: boolean;
  hasShop: boolean;
}

interface MapConnection {
  fromRoomId: number;
  toRoomId: number;
  direction: string;
  isExplored: boolean;
  connectionName?: string;
}
```

### Database Schema Extensions
```sql
-- Add to rooms table for map coordinates
ALTER TABLE rooms ADD COLUMN map_x INTEGER DEFAULT 0;
ALTER TABLE rooms ADD COLUMN map_y INTEGER DEFAULT 0;
ALTER TABLE rooms ADD COLUMN is_mapped BOOLEAN DEFAULT FALSE;

CREATE TABLE map_markers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  room_id INTEGER NOT NULL,
  marker_type TEXT NOT NULL, -- npc, quest, shop, treasure, danger
  marker_symbol TEXT NOT NULL, -- ASCII character for display
  description TEXT,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);
```

### Map Generation Algorithm
```typescript
const generateMapCoordinates = (gameId: number): void => {
  // Starting room at origin (0, 0)
  const startingRoom = getStartingRoom(gameId);
  updateRoomCoordinates(startingRoom.id, 0, 0);
  
  // BFS to assign coordinates based on connections
  const queue = [{ roomId: startingRoom.id, x: 0, y: 0 }];
  const visited = new Set([startingRoom.id]);
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    const connections = getConnectionsFromRoom(current.roomId);
    
    connections.forEach(connection => {
      if (visited.has(connection.to_room_id)) return;
      
      // Calculate new coordinates based on direction
      const newCoords = calculateNewCoordinates(
        current.x, 
        current.y, 
        connection.direction
      );
      
      updateRoomCoordinates(connection.to_room_id, newCoords.x, newCoords.y);
      queue.push({ roomId: connection.to_room_id, ...newCoords });
      visited.add(connection.to_room_id);
    });
  }
};

const calculateNewCoordinates = (x: number, y: number, direction: string): {x: number, y: number} => {
  const directionMap = {
    'north': { x: 0, y: -1 },
    'south': { x: 0, y: 1 },
    'east': { x: 1, y: 0 },
    'west': { x: -1, y: 0 },
    'up': { x: 0, y: -2 },
    'down': { x: 0, y: 2 }
  };
  
  const offset = directionMap[direction] || { x: 0, y: 0 };
  return { x: x + offset.x, y: y + offset.y };
};
```

### ASCII Map Rendering
```typescript
const MAP_SYMBOLS = {
  UNEXPLORED: '?',
  CURRENT_PLAYER: '@',
  VISITED_ROOM: '•',
  REGION_CENTER: '★',
  NPC_LOCATION: 'N',
  QUEST_GIVER: 'Q',
  SHOP: '$',
  TREASURE: 'T',
  DANGER: '!',
  CONNECTION_NS: '|',
  CONNECTION_EW: '─',
  CONNECTION_CORNER: '+',
  EMPTY_SPACE: ' '
};

const renderLocalMap = (gameId: number, centerRoomId: number, radius: number = 3): string[] => {
  const mapData = getMapData(gameId);
  const centerRoom = mapData.rooms.find(r => r.id === centerRoomId);
  if (!centerRoom) return ['Map data not available'];
  
  const minX = centerRoom.x - radius;
  const maxX = centerRoom.x + radius;
  const minY = centerRoom.y - radius;
  const maxY = centerRoom.y + radius;
  
  const mapLines: string[] = [];
  
  for (let y = minY; y <= maxY; y++) {
    let line = '';
    for (let x = minX; x <= maxX; x++) {
      const room = mapData.rooms.find(r => r.x === x && r.y === y);
      
      if (room) {
        if (room.id === centerRoomId) {
          line += MAP_SYMBOLS.CURRENT_PLAYER;
        } else if (room.roomType === 'center') {
          line += MAP_SYMBOLS.REGION_CENTER;
        } else if (room.hasNPC) {
          line += MAP_SYMBOLS.NPC_LOCATION;
        } else if (room.hasQuest) {
          line += MAP_SYMBOLS.QUEST_GIVER;
        } else if (room.hasShop) {
          line += MAP_SYMBOLS.SHOP;
        } else if (room.isVisited) {
          line += MAP_SYMBOLS.VISITED_ROOM;
        } else {
          line += MAP_SYMBOLS.UNEXPLORED;
        }
      } else {
        line += MAP_SYMBOLS.EMPTY_SPACE;
      }
      
      // Add connection indicators between rooms
      if (x < maxX) {
        const eastConnection = hasConnection(mapData, x, y, x + 1, y);
        line += eastConnection ? MAP_SYMBOLS.CONNECTION_EW : MAP_SYMBOLS.EMPTY_SPACE;
      }
    }
    mapLines.push(line);
    
    // Add vertical connections
    if (y < maxY) {
      let connectionLine = '';
      for (let x = minX; x <= maxX; x++) {
        const southConnection = hasConnection(mapData, x, y, x, y + 1);
        connectionLine += southConnection ? MAP_SYMBOLS.CONNECTION_NS : MAP_SYMBOLS.EMPTY_SPACE;
        
        if (x < maxX) {
          connectionLine += MAP_SYMBOLS.EMPTY_SPACE;
        }
      }
      mapLines.push(connectionLine);
    }
  }
  
  return mapLines;
};
```

### Map Commands Implementation
```typescript
'map': async () => {
  const currentRoom = getCurrentRoom(character);
  const mapLines = renderLocalMap(gameId, currentRoom.id, 4);
  
  display('=== LOCAL MAP ===', MessageType.SYSTEM);
  mapLines.forEach(line => display(line, MessageType.NORMAL));
  display('', MessageType.NORMAL);
  display('Legend: @ = You, • = Visited, ? = Unexplored, ★ = Region Center', MessageType.SYSTEM);
  display('        N = NPC, Q = Quest, $ = Shop, T = Treasure', MessageType.SYSTEM);
};

'worldmap': async () => {
  const regions = getVisitedRegions(gameId);
  
  display('=== WORLD MAP ===', MessageType.SYSTEM);
  regions.forEach(region => {
    display(`${region.name} (${region.type})`, MessageType.ROOM_TITLE);
    display(`  Rooms explored: ${region.visitedRooms}/${region.totalRooms}`, MessageType.NORMAL);
    display(`  Notable locations: ${region.markers.join(', ')}`, MessageType.NORMAL);
  });
};

'locate <target>': async (target: string) => {
  // Find NPCs, quests, or locations
  const locations = findMapLocations(gameId, target);
  
  if (locations.length === 0) {
    display(`No known locations matching "${target}"`, MessageType.ERROR);
    return;
  }
  
  display(`=== LOCATIONS: ${target.toUpperCase()} ===`, MessageType.SYSTEM);
  locations.forEach(loc => {
    const distance = calculateDistance(getCurrentRoom(character), loc);
    display(`${loc.name} - ${distance} rooms away (${loc.region})`, MessageType.NORMAL);
  });
};

'mark <name>': async (markerName: string) => {
  // Add custom marker to current location
  const currentRoom = getCurrentRoom(character);
  await addMapMarker(gameId, currentRoom.id, 'custom', markerName);
  display(`Marked current location as: ${markerName}`, MessageType.SYSTEM);
};
```

### Navigation Assistance
```typescript
const calculateDistance = (fromRoom: MapRoom, toRoom: MapRoom): number => {
  return Math.abs(fromRoom.x - toRoom.x) + Math.abs(fromRoom.y - toRoom.y);
};

const getDirectionTo = (fromRoom: MapRoom, toRoom: MapRoom): string => {
  const dx = toRoom.x - fromRoom.x;
  const dy = toRoom.y - fromRoom.y;
  
  const directions: string[] = [];
  
  if (dx > 0) directions.push('east');
  if (dx < 0) directions.push('west');
  if (dy > 0) directions.push('south');
  if (dy < 0) directions.push('north');
  
  return directions.join('-') || 'here';
};

'directions <target>': async (target: string) => {
  const targetRoom = findRoomByName(gameId, target);
  if (!targetRoom) {
    display(`Unknown location: ${target}`, MessageType.ERROR);
    return;
  }
  
  const currentRoom = getCurrentRoom(character);
  const distance = calculateDistance(currentRoom, targetRoom);
  const direction = getDirectionTo(currentRoom, targetRoom);
  
  display(`${target} is ${distance} rooms ${direction} from here.`, MessageType.SYSTEM);
};
```

### Map Updates
```typescript
const updateMapOnRoomEntry = (character: Character, newRoom: Room) => {
  // Mark room as visited
  markRoomVisited(newRoom.id);
  
  // Update map coordinates if not set
  if (!newRoom.is_mapped) {
    assignMapCoordinates(newRoom.id);
  }
  
  // Add automatic markers based on room contents
  updateRoomMarkers(newRoom);
};

const updateRoomMarkers = (room: Room) => {
  const markers: string[] = [];
  
  if (hasNPCInRoom(room.id)) markers.push('npc');
  if (hasQuestInRoom(room.id)) markers.push('quest');
  if (hasShopInRoom(room.id)) markers.push('shop');
  if (hasTreasureInRoom(room.id)) markers.push('treasure');
  
  markers.forEach(markerType => {
    addMapMarker(room.game_id, room.id, markerType);
  });
};
```

### Implementation Areas
- **Map Service**: Generate and maintain map data
- **Coordinate System**: Assign and track room positions
- **ASCII Renderer**: Create visual map representations
- **Navigation Service**: Provide direction and distance information
- **Marker System**: Track and display notable locations

## Related

- Dependencies: Room System, Region System, Game State Management
- Integration: All location-based systems (NPCs, quests, shops)
- Enables: Better navigation, exploration tracking, strategic planning
- Future: Detailed room layouts, dynamic map updates, sharing maps
- References: Current room navigation in GameController