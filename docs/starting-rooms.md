# Starting Rooms in Shadow Kingdom

## Overview

Shadow Kingdom uses a carefully crafted set of starting rooms to provide players with an immersive introduction to the game world while establishing the foundation for AI-driven procedural generation. Rather than beginning with a single room, each new game creates a small, handcrafted "seed area" that serves as both narrative introduction and technical scaffold for the AI generation system.

## Game Concept

Shadow Kingdom is a fully functional AI-powered text adventure game where players explore a dynamically generated fantasy kingdom. The core concept revolves around:

- **Dynamic World Building**: AI creates rooms, descriptions, and connections in real-time
- **Persistent Exploration**: Player actions shape the world permanently 
- **Atmospheric Immersion**: Rich, descriptive text creates a living fantasy environment
- **Adaptive Storytelling**: The world responds and grows based on player choices

## Starting Room Architecture

### The Six-Room Foundation

When a new game is created, the system establishes six interconnected rooms that form the initial play area:

#### 1. **Grand Entrance Hall** (Primary Starting Point)
- **Function**: Main player spawn location and central hub
- **Description**: A magnificent marble hall with celestial murals and ancient tapestries
- **Design Purpose**: Establishes the grandeur and mystery of the forgotten kingdom
- **Connections**: Links to Library (east) and Courtyard Garden (west)

#### 2. **Scholar's Library** 
- **Function**: Eastern wing introducing lore and knowledge themes
- **Description**: Vast library with oak shelves, brass lamps, and ancient tomes
- **Design Purpose**: Suggests research, magic, and forgotten wisdom
- **Connections**: From Grand Entrance Hall, leads to Tower Stairs (up)

#### 3. **Moonlit Courtyard Garden**
- **Function**: Western wing providing natural/outdoor contrast  
- **Description**: Enchanted garden with glowing fountain and night-blooming flowers
- **Design Purpose**: Balances indoor architecture with mystical nature
- **Connections**: From Grand Entrance Hall, leads to Crypt Entrance (down)

#### 4. **Winding Tower Stairs** (Unprocessed)
- **Function**: Vertical expansion point for upper areas
- **Description**: Spiral staircase with narrow windows and ancient stonework
- **Design Purpose**: Promises exploration of towers, observatories, and heights
- **AI Expansion**: Marked as unprocessed for future AI development

#### 5. **Ancient Crypt Entrance** (Unprocessed)
- **Function**: Downward expansion point for underground areas
- **Description**: Mysterious crypt with carved symbols and burial niches
- **Design Purpose**: Opens possibilities for dungeons, tombs, and depths
- **AI Expansion**: Marked as unprocessed for future AI development

#### 6. **Observatory Steps** (Unprocessed)
- **Function**: Alternative vertical path with astronomical themes
- **Description**: Steps leading to observatory with star charts carved in stone
- **Design Purpose**: Suggests magical/scholarly pursuits and sky-bound secrets
- **AI Expansion**: Marked as unprocessed for future AI development

## Technical Implementation

### Database Structure

Starting rooms are created in `src/utils/initDb.ts` within the `createGameWithRooms()` function:

```typescript
// Core processed rooms (locked layouts)
const entranceResult = await db.run(
  'INSERT INTO rooms (game_id, name, description, generation_processed) VALUES (?, ?, ?, ?)',
  [gameId, 'Grand Entrance Hall', description, true]  // Processed = true
);

// Expansion point rooms (available for AI development)
const towerStairsResult = await db.run(
  'INSERT INTO rooms (game_id, name, description, generation_processed) VALUES (?, ?, ?, ?)',
  [gameId, 'Winding Tower Stairs', description, false]  // Processed = false
);
```

### Room Processing States

- **Processed (`generation_processed = true`)**: Fixed rooms with locked layouts
  - Grand Entrance Hall, Scholar's Library, Moonlit Courtyard Garden
  - These maintain consistent spatial relationships and descriptions
  
- **Unprocessed (`generation_processed = false`)**: Expansion points for AI
  - Winding Tower Stairs, Ancient Crypt Entrance, Observatory Steps  
  - AI can add connections and generate adjacent areas from these rooms

### Connection Network

The starting area uses a hub-and-spoke design centered on the Grand Entrance Hall:

```
                Tower Stairs (up)
                      |
                Scholar's Library
                      |
Observatory ---- Grand Entrance ---- Courtyard Garden
  Steps               Hall                    |
                                        Crypt Entrance
                                           (down)
```

## AI Integration Points

### Visit-to-Lock Mechanism

When players visit unprocessed rooms for the first time:
1. Room layout becomes "locked" (`generation_processed = true`)
2. AI cannot modify existing connections from that room
3. This preserves spatial consistency and player mental mapping

### Background Generation

The system proactively generates new areas:
- **Trigger**: When player enters any room
- **Target**: Adjacent unprocessed rooms become expansion candidates
- **Limits**: Configurable room count and generation depth limits
- **Cooldown**: Prevents excessive API calls during exploration

### Thematic Consistency

AI generation uses the starting rooms as thematic anchors:
- **Context Passing**: Existing room names and descriptions inform new generation
- **Atmospheric Matching**: New areas complement the established fantasy kingdom tone
- **Connection Naming**: Thematic passage names enhance immersion

## Design Philosophy

### Immediate Engagement
Starting rooms provide instant atmospheric immersion without requiring AI generation delays, ensuring players can begin exploring immediately.

### Narrative Foundation  
The handcrafted descriptions establish the game's tone, themes, and world-building style, which AI generation then extends and amplifies.

### Technical Scaffold
The room network provides tested, reliable connectivity that serves as a foundation for more complex AI-generated areas.

### Expansion Framework
Unprocessed rooms serve as "hooks" where AI can attach new content while maintaining spatial and thematic coherence.

## Future Enhancements

### Dynamic Starting Areas
Future versions could allow AI to generate variations of starting rooms while maintaining the core hub structure.

### Contextual Seeding
Starting room selection could vary based on player preferences or randomized themes (magical academy, ruined castle, etc.).

### Progressive Revelation
Starting rooms could include locked or hidden areas that become accessible as players progress through the broader kingdom.

---

The starting room system in Shadow Kingdom demonstrates how carefully designed handcrafted content can seamlessly integrate with AI-powered procedural generation, creating a cohesive and immersive player experience that feels both intentional and infinite.