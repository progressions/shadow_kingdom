# Shadow Kingdom

A dynamic, AI-powered text adventure game built with Node.js, TypeScript, and Grok AI featuring region-based world generation.

## Overview

Shadow Kingdom is an interactive text-based adventure game that uses AI to generate rich, atmospheric rooms and connections within thematically coherent regions. Players explore a mysterious fantasy kingdom where each area tells a cohesive story through connected spaces, from grand manor estates to ancient crypts and mystical gardens.

## Features

- **🏰 Region-Based World Generation**: Thematically coherent areas (mansions, forests, caves, towns) with distance-based transitions
- **🤖 AI-Generated Content**: Rooms, descriptions, and connections dynamically created by Grok AI with regional context
- **⚡ Background Generation**: World expands automatically as you explore - new rooms generate in real-time
- **🧭 Dual Navigation System**: Navigate using cardinal directions ("north") or atmospheric descriptions ("through the crystal archway")
- **💾 Persistent Worlds**: Save and load multiple game sessions with SQLite database
- **📍 Region Discovery**: Explore region centers containing important content and NPCs
- **🎯 Session Interface**: Programmatic command execution for automation and testing
- **🔍 Debug Commands**: Inspect region statistics and world structure
- **🏛️ Visit-to-Lock System**: Rooms maintain consistent layout after first visit

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/progressions/shadow_kingdom.git
   cd shadow_kingdom
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your Grok API key
   ```

4. **Build the project**:
   ```bash
   npm run build
   ```

## Configuration

### Required Environment Variables

- `GROK_API_KEY`: Your Grok API key from [x.ai](https://x.ai)

### Optional Settings

- `GROK_MODEL`: AI model to use (default: "grok-3")
- `MAX_ROOMS_PER_GAME`: Maximum rooms per game (default: 100)
- `AI_MOCK_MODE`: Use mock AI responses for testing (default: false)

See `.env` for all available configuration options.

## Usage

### Starting the Game

```bash
npm start
```

### Main Menu Commands

- `new` - Start a new game
- `load` - Load an existing game
- `delete` - Delete a saved game
- `help` - Show available commands
- `exit` - Quit the application

### In-Game Commands

#### Movement & Exploration
- `look` - Examine your current location
- `go <direction>` - Move in a direction (e.g., "go north")
- `<direction>` - Direct movement shortcuts (n, s, e, w, up, down)
- `<thematic name>` - Use atmospheric connection names

#### Region Commands
- `region` - Show current room's region information
- `regions` - List all regions in current game
- `region-stats` - Show detailed region statistics

#### System Commands
- `help` - Show game commands
- `menu` - Return to main menu

### Session Interface

For automation and testing, use the session interface:

```bash
# Basic exploration
npm run dev -- --cmd "look"                    # Start new game and look around
npm run dev -- --cmd "go north" --game-id 1    # Move north in existing game

# With debug output to see background generation
AI_DEBUG_LOGGING=true npm run dev -- --cmd "look"  # Shows room generation in real-time

# Region inspection
npm run dev -- --cmd "region" --game-id 1     # Show current room's region
npm run dev -- --cmd "regions" --game-id 1    # List all regions in game
npm run dev -- --cmd "region-stats" --game-id 1  # Show detailed region statistics

# Get help
npm run dev -- --cmd "help" --game-id 1       # Show available commands
```

### Example Gameplay

```
> look

Grand Entrance Hall
===================
You stand in a magnificent entrance hall that speaks of forgotten grandeur. 
Towering marble columns stretch up to a vaulted ceiling painted with faded 
celestial murals...

Exits: through the ornate archway beneath celestial murals (north), 
through the glass doors that shimmer with moonlight (east), 
up the stone steps to the winding tower (west)

> region

Current Region: Shadow Kingdom Manor
Type: mansion
Description: A grand manor estate shrouded in mystery, filled with elegant 
halls, ancient libraries, and moonlit gardens where forgotten secrets await discovery.
Distance from center: 0
Total rooms in region: 6
Center room: Grand Entrance Hall

> go through the glass doors
> north
> through ornate archway
```

## Architecture

### Core Components

- **GameController** (`src/gameController.ts`): Main game logic and command processing
- **RegionService** (`src/services/regionService.ts`): Region-based world generation and management
- **GrokClient** (`src/ai/grokClient.ts`): AI integration for content generation
- **SessionInterface** (`src/sessionInterface.ts`): Programmatic command execution
- **Database** (`src/utils/database.ts`): SQLite database wrapper
- **CLI Interface**: Interactive command-line interface with readline

### Data Model

The game uses a comprehensive SQLite database schema:

#### Core Tables
- **`games`**: Game sessions with metadata and timestamps
- **`rooms`**: Generated rooms with descriptions, processing state, and region assignments
- **`connections`**: Bidirectional room links with both cardinal directions and thematic names
- **`game_state`**: Current player position and session state

#### Region System
- **`regions`**: Thematic areas with types (mansion, forest, cave, town), descriptions, and center tracking
- **Room Columns**: `region_id`, `region_distance` for distance-based probability transitions
- **Database Triggers**: Automatic region center discovery when distance-0 rooms are created

#### Key Relationships
```sql
-- Rooms belong to regions with distance from center
rooms.region_id → regions.id
rooms.region_distance → distance from region center (0 = center)

-- Connections link rooms with dual addressing
connections.from_room_id → rooms.id
connections.to_room_id → rooms.id
connections.direction → cardinal direction (north, south, etc.)
connections.name → thematic description (through crystal archway)

-- Games contain regions which contain rooms
games.id → regions.game_id → rooms.region_id
```

### AI Integration

The game uses Grok AI to generate:
- **Regional Content**: Room names and descriptions that fit thematic region types
- **Contextual Generation**: AI receives adjacent room descriptions and regional themes
- **Thematic Connections**: Atmospheric connection names that enhance immersion
- **Distance-Based Transitions**: Probability-driven region changes based on distance from center
- **Fallback Systems**: Graceful degradation when AI generation fails

## Development

### Scripts

```bash
npm run dev     # Start development server with hot reload
npm run build   # Build TypeScript to JavaScript
npm run start   # Run the built application
npm test        # Run Jest test suite
npm run lint    # Run ESLint
```

### Testing

```bash
# Run all tests
npm test

# Run specific test files
npm test -- tests/regionService.test.ts
npm test -- tests/sessionInterface.test.ts

# Run tests with coverage
npm run test:coverage

# AI-specific test scripts
npm run test:grok          # Test Grok AI integration
npm run test:bg            # Test background room generation
npm run test:limits        # Test generation limits
```

### Project Structure

```
src/
├── ai/                    # AI integration
│   └── grokClient.ts
├── services/              # Business logic services
│   ├── regionService.ts   # Region management and probability
│   ├── gameStateManager.ts
│   ├── commandRouter.ts
│   └── ...
├── types/                 # TypeScript type definitions
│   └── region.ts
├── utils/                 # Utilities and database
│   ├── database.ts
│   └── initDb.ts
├── gameController.ts      # Main game controller
├── sessionInterface.ts    # Programmatic interface
└── index.ts              # Entry point
```

### Key Features Implementation

#### Region-Based Generation
- **Distance-Based Probability**: 15% base chance + 12% per distance unit for new region transitions
- **Region Types**: mansion, forest, cave, town with specialized AI prompts
- **Center Discovery**: Database triggers automatically mark region centers when distance-0 rooms created
- **Thematic Coherence**: All rooms within region maintain consistent atmosphere

#### Dual Navigation System
- **Cardinal Directions**: Traditional north/south/east/west movement
- **Thematic Names**: "through the crystal archway", "up the starlit steps to the garden"
- **Case-Insensitive Matching**: Natural language input processing
- **AI-Generated Names**: Contextual connection descriptions that enhance immersion

#### Visit-to-Lock System
- **Layout Consistency**: Rooms lock their connection layout when first visited
- **Phantom Prevention**: Eliminates connections appearing/disappearing on return visits
- **Spatial Memory**: Maintains player mental map and world believability

#### Session Interface
- **Programmatic Access**: Execute commands without interactive CLI
- **Automation Support**: Ideal for testing, scripting, and external integrations
- **Game ID Targeting**: Command specific game sessions
- **Full Command Set**: All game and region commands available

## API Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GROK_API_KEY` | Required | API key for Grok AI |
| `MAX_ROOMS_PER_GAME` | 100 | Maximum rooms per game |
| `MAX_GENERATION_DEPTH` | 5 | Levels of background generation |
| `GENERATION_COOLDOWN_MS` | 5000 | Cooldown between generations |
| `AI_MOCK_MODE` | false | Use mock responses for testing |

### Connection Format

Connections support dual addressing:
- **Direction**: Cardinal directions (north, south, east, west, up, down)
- **Thematic Name**: AI-generated atmospheric descriptions

Example:
```sql
INSERT INTO connections (direction, name) VALUES 
('north', 'through the ornate archway beneath celestial murals');
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Grok AI](https://x.ai) for content generation
- Inspired by classic text adventure games
- Uses SQLite for persistent game storage