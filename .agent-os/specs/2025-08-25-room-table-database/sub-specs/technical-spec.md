# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-25-room-table-database/spec.md

> Created: 2025-08-25
> Version: 1.0.0

## YAML World Format Specification

### Starting Region YAML Structure

```yaml
# starting-region.yml - Complete 12-room starting region with locked expansion
world:
  name: "Ancient Castle Grounds"
  description: "A mysterious castle complex with hidden secrets and ancient guardians"
  
regions:
  - id: "castle_main"
    name: "Castle Main"  
    theme: "medieval_castle"
    description: "The primary castle structure with grand halls and chambers"
    
  - id: "castle_grounds"
    name: "Castle Grounds"
    theme: "medieval_courtyard" 
    description: "The outer areas and defensive structures of the castle"

rooms:
  # Castle Main (8 rooms)
  - id: "entrance_hall"
    region_id: "castle_main"
    name: "Grand Entrance Hall"
    description: "You stand in a magnificent hall with towering stone pillars supporting a vaulted ceiling. Faded tapestries hang from the walls."
    extended_description: "The entrance hall stretches impressively upward, with intricate stone carvings depicting ancient battles. A worn red carpet leads deeper into the castle, and you notice scorch marks on some of the pillars."
    starting_room: true
    
  - id: "throne_room"
    region_id: "castle_main" 
    name: "Abandoned Throne Room"
    description: "A vast chamber dominated by an empty stone throne. Dust motes dance in shafts of light from high windows."
    extended_description: "The throne room speaks of former grandeur, with its high ceiling and ornate columns. The throne itself is carved from black stone, with mysterious runes etched into its armrests. Behind it hangs a tattered banner."
    
  - id: "great_hall"
    region_id: "castle_main"
    name: "Great Hall"
    description: "Long wooden tables stretch across this cavernous dining hall. A massive fireplace dominates one wall."
    extended_description: "The great hall could once seat hundreds. The oak tables are scarred and stained, and rusty weapons still hang from wall mounts. The fireplace is cold and filled with old ash."
    
  - id: "library"
    region_id: "castle_main"
    name: "Dusty Library"
    description: "Towering bookshelves line the walls, filled with ancient tomes and scrolls. The air smells of aged parchment."
    extended_description: "Most books are too damaged to read, their pages cracked and yellowed. However, some astronomy and history texts remain intact on the higher shelves. A reading desk sits near a narrow window."
    
  - id: "armory"
    region_id: "castle_main"
    name: "Castle Armory"
    description: "Weapon racks and armor stands fill this rectangular chamber, though most equipment has long since rusted."
    extended_description: "The armory still contains serviceable weapons among the rust. Shield emblems on the wall show a dragon sigil. A heavy chest in the corner appears to have been forced open long ago."
    
  - id: "chapel"
    region_id: "castle_main"
    name: "Sacred Chapel"
    description: "A small stone chapel with stained glass windows casting colored light across worn wooden pews."
    extended_description: "The chapel's altar holds a stone basin filled with stagnant water. Religious symbols are carved into every surface, and votive candle stubs line the windowsills. The atmosphere feels both peaceful and ominous."
    
  - id: "kitchen"
    region_id: "castle_main"
    name: "Castle Kitchen"
    description: "A large kitchen with a massive stone hearth and preparation tables. Copper pots hang from iron hooks."
    extended_description: "The kitchen clearly served many people. A butcher block table shows knife marks, and dried herbs still hang from the rafters. The pantry door stands slightly ajar, revealing empty shelves within."
    
  - id: "study"
    region_id: "castle_main"
    name: "Scholar's Study"  
    description: "A private study filled with maps, scrolls, and arcane instruments. A desk sits beneath a circular window."
    extended_description: "Maps of the surrounding lands cover the walls, marked with cryptic symbols. Alchemical equipment sits on shelves, and a telescope points toward the window. The desk drawer appears to be locked."
    
  # Castle Grounds (4 rooms)
  - id: "courtyard"
    region_id: "castle_grounds"
    name: "Inner Courtyard"
    description: "An open courtyard surrounded by high stone walls. A dry fountain sits at the center, covered in climbing vines."
    extended_description: "The courtyard once served as the castle's heart. Guard towers overlook from each corner, and arrow slits are visible in the walls. The fountain's basin is cracked, and moss grows between the flagstones."
    
  - id: "guard_tower"
    region_id: "castle_grounds" 
    name: "Watch Tower"
    description: "A tall stone tower offering commanding views of the castle grounds. Narrow windows provide glimpses of the surrounding countryside."
    extended_description: "The tower served as the castle's primary lookout point. A spiral staircase leads to higher levels, and arrow loops face in all directions. Old torches remain in wall sconces."
    
  - id: "stable"
    region_id: "castle_grounds"
    name: "Abandoned Stables"
    description: "Stone stables with wooden stall doors hanging open. Hay still fills some of the feeding troughs."
    extended_description: "The stables could house dozens of horses. Bridles and saddles hang from wooden pegs, though leather has cracked with age. A tack room in the back contains grooming supplies."
    
  - id: "gatehouse" 
    region_id: "castle_grounds"
    name: "Castle Gatehouse"
    description: "A fortified gatehouse controls access to the castle. Heavy wooden doors stand partially open, and chains hang from a mechanism above."
    extended_description: "The gatehouse is heavily fortified with murder holes above and thick iron-bound doors. A winch mechanism once controlled a portcullis. Guard chambers on either side contain old weapon racks."

# Connections define all paths between rooms (uni-directional)
connections:
  # From entrance_hall
  - from: "entrance_hall"
    to: "throne_room"
    direction: "north" 
    description: "through the ornate archway"
    
  - from: "entrance_hall"
    to: "great_hall"
    direction: "east"
    description: "through wide double doors"
    
  - from: "entrance_hall"
    to: "courtyard"
    direction: "south"
    description: "through the main entrance"
    
  # From throne_room
  - from: "throne_room"
    to: "entrance_hall" 
    direction: "south"
    description: "back through the ornate archway"
    
  - from: "throne_room"
    to: "library"
    direction: "west"
    description: "through a carved wooden door"
    
  # From great_hall
  - from: "great_hall"
    to: "entrance_hall"
    direction: "west" 
    description: "back through the double doors"
    
  - from: "great_hall"
    to: "kitchen"
    direction: "north"
    description: "through the service entrance"
    
  - from: "great_hall"
    to: "armory"
    direction: "east"
    description: "through a reinforced door"
    
  # From library  
  - from: "library"
    to: "throne_room"
    direction: "east"
    description: "back through the carved wooden door"
    
  - from: "library" 
    to: "study"
    direction: "north"
    description: "up a narrow spiral staircase"
    
  # From kitchen
  - from: "kitchen"
    to: "great_hall"
    direction: "south"
    description: "back through the service entrance"
    
  - from: "kitchen"
    to: "chapel"
    direction: "west"
    description: "through a plain wooden door"
    
  # From armory
  - from: "armory"
    to: "great_hall"
    direction: "west"
    description: "back through the reinforced door"
    
  - from: "armory"
    to: "guard_tower"
    direction: "north"
    description: "up stone steps to the tower"
    
  # From chapel
  - from: "chapel"
    to: "kitchen"
    direction: "east" 
    description: "back through the plain wooden door"
    
  # From study
  - from: "study"
    to: "library"
    direction: "south"
    description: "down the narrow spiral staircase"
    
  # From courtyard
  - from: "courtyard"
    to: "entrance_hall"
    direction: "north"
    description: "back through the main entrance"
    
  - from: "courtyard"
    to: "stable"
    direction: "west"
    description: "through the stable doors"
    
  - from: "courtyard"
    to: "gatehouse"
    direction: "south"
    description: "toward the castle gate"
    
  # From guard_tower  
  - from: "guard_tower"
    to: "armory"
    direction: "south"
    description: "down stone steps from the tower"
    
  - from: "guard_tower"
    to: "courtyard"
    direction: "west"
    description: "down to the courtyard"
    
  # From stable
  - from: "stable"
    to: "courtyard" 
    direction: "east"
    description: "back through the stable doors"
    
  # From gatehouse
  - from: "gatehouse"
    to: "courtyard"
    direction: "north"
    description: "back toward the castle courtyard"
    
  # LOCKED UNFILLED CONNECTION - requires Ancient Iron Key
  - from: "gatehouse"
    to: null  # This will be filled by AI generation later
    direction: "south"
    description: "through the sealed iron gate"
    locked: true
    required_key: "ancient_iron_key"

# Items placed in rooms
items:
  - id: "ancient_iron_key"
    room_id: "study"
    name: "Ancient Iron Key"
    description: "A heavy iron key with intricate engravings and a dragon-head design."
    extended_description: "This key is surprisingly well-preserved, with dragon motifs carved into its bow. The shaft bears runic inscriptions that seem to shimmer in the light. It feels warm to the touch."
    type: "key"
    hidden: true  # Player must search/examine to find it
    examine_hint: "The desk drawer appears to be locked, but you notice it's slightly ajar."
    
  - id: "rusty_sword"
    room_id: "armory"
    name: "Rusty Iron Sword"
    description: "A well-used iron sword with surface rust but a still-sharp blade."
    type: "weapon"
    damage: 8
    
  - id: "leather_armor"
    room_id: "armory"
    name: "Studded Leather Armor"
    description: "Flexible leather armor reinforced with iron studs."
    type: "armor"
    defense: 3

# Characters (NPCs and enemies)
characters:
  - id: "castle_guardian"
    room_id: "throne_room"
    name: "Spectral Guardian"
    description: "A ghostly figure in ancient armor that materializes near the throne, wielding a ethereal sword."
    type: "hostile"
    health: 25
    attack: 6
    defense: 2
    behavior: "guards_throne"
    dialogue:
      hostile: "You dare defile this sacred hall? Face the wrath of the ancient guardian!"
      defeated: "The... castle... must... be... protected..."
    loot:
      - id: "guardian_essence"
        name: "Guardian's Essence"
        description: "A glowing orb that pulses with spectral energy."
        type: "consumable"
        effect: "restores_health"
        value: 15
```

## YAML Parser Service Requirements

### TypeScript Interfaces

```typescript
interface WorldDefinition {
  world: {
    name: string;
    description: string;
  };
  regions: RegionDefinition[];
  rooms: RoomDefinition[];
  connections: ConnectionDefinition[];
  items?: ItemDefinition[];
  characters?: CharacterDefinition[];
}

interface RoomDefinition {
  id: string;
  region_id: string;
  name: string;
  description: string;
  extended_description?: string;
  starting_room?: boolean;
}

interface ConnectionDefinition {
  from: string;
  to: string | null;  // null for unfilled connections
  direction: string;
  description: string;
  locked?: boolean;
  required_key?: string;
}

interface ItemDefinition {
  id: string;
  room_id: string;
  name: string;
  description: string;
  extended_description?: string;
  type: string;
  hidden?: boolean;
  examine_hint?: string;
  damage?: number;
  defense?: number;
}

interface CharacterDefinition {
  id: string;
  room_id: string; 
  name: string;
  description: string;
  type: 'friendly' | 'hostile' | 'neutral';
  health?: number;
  attack?: number;
  defense?: number;
  behavior?: string;
  dialogue?: {
    hostile?: string;
    defeated?: string;
    friendly?: string;
  };
  loot?: ItemDefinition[];
}
```

### Validation Requirements

- **Room Connectivity**: Ensure all rooms are reachable from starting room
- **Reference Integrity**: All room_id references in connections, items, characters must exist
- **Starting Room**: Exactly one room must have starting_room: true
- **Key Requirements**: Items referenced in locked connections must exist
- **Region Assignment**: All rooms must reference valid regions

### Database Creation Flow

1. **Parse YAML**: Validate structure and references
2. **Create Game**: Initialize new game record
3. **Create Regions**: Insert all region definitions
4. **Create Rooms**: Insert all room definitions with region references
5. **Create Connections**: Insert all connections with room references
6. **Create Items**: Insert items with room placement
7. **Create Characters**: Insert NPCs/enemies with room placement
8. **Set Starting Room**: Update game.currentRoomId to starting room

## Technical Implementation Requirements

### YAML Parser Service

The YAML parser service must:

1. **Load and Parse**: Read YAML files and parse into TypeScript interfaces
2. **Validate Structure**: Ensure all required fields are present
3. **Validate References**: Check that all ID references exist
4. **Create Database Records**: Transform YAML data into Prisma database operations
5. **Handle Transactions**: Ensure atomic creation of complete world state

### Database Schema Alignment

The YAML format must align with the existing Prisma schema:

- **Games**: world.name and world.description map to game metadata
- **Regions**: Direct mapping to regions table
- **Rooms**: Direct mapping to rooms table with region_id foreign key
- **Connections**: Direct mapping to connections table with room_id foreign keys
- **Items**: Direct mapping to items table with room_id foreign key
- **Characters**: Direct mapping to characters table with room_id foreign key

### Service Integration

The YAML parser service integrates with existing services:

- **GameStateManager**: For game creation and state initialization
- **PrismaService**: For all database operations
- **RegionService**: For region validation and management
- **ItemService**: For item creation and placement
- **CharacterService**: For character creation and behavior setup