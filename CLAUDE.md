# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shadow Kingdom is a fully functional AI-powered text adventure game built with TypeScript and Node.js featuring region-based world generation. Players explore a dynamically generated fantasy kingdom where AI creates rooms, descriptions, and atmospheric connections within thematically coherent regions using Grok AI.

**Core Architecture:**
- **GameController**: Main game logic, command processing, and state management with region integration
- **RegionService**: Region-based world generation with distance-based probability transitions
- **GrokClient**: AI integration for content generation with fallback systems
- **SessionInterface**: Programmatic command execution for automation and testing
- **Database**: SQLite-based persistence for games, rooms, connections, regions, and player state
- **Dual-Mode System**: Main menu for game management + in-game exploration interface

## Development Commands

```bash
# Install dependencies
npm install

# Run development server with hot reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Run built application
npm start

# Testing
npm test                    # Run all tests with Jest
npm run test:watch         # Watch mode for tests
npm run test:coverage      # Generate coverage report

# AI-specific test scripts
npm run test:grok          # Test Grok AI integration
npm run test:bg            # Test background room generation
npm run test:limits        # Test generation limits
npm run test:errors        # Test error handling
npm run test:tracking      # Test generation tracking
```

## Architecture Overview

### Core Components

**GameController** (`src/gameController.ts`):
- Dual-mode operation: menu mode and game mode
- Command system with separate menu and game command sets including region debug commands
- Background room generation with rate limiting and cooldown
- Game save/load system with SQLite persistence
- Natural language movement supporting both cardinal directions and thematic names
- Region commands: `region`, `regions`, `region-stats`

**RegionService** (`src/services/regionService.ts`):
- Region-based world generation with distance-based probability (15% base + 12% per distance)
- CRUD operations for regions and room-region assignments
- Region context building for AI generation
- Region statistics and analysis
- Support for region types: mansion, forest, cave, town

**SessionInterface** (`src/sessionInterface.ts`):
- Programmatic command execution without interactive CLI
- Supports all game commands including region commands
- Game ID targeting for automation and testing
- Used via: `node dist/sessionInterface.js --cmd "command" --game-id 1`

**GrokClient** (`src/ai/grokClient.ts`):
- Grok AI integration for generating rooms, NPCs, and dialogue
- Comprehensive fallback system for when AI calls fail
- Token usage tracking and cost estimation
- Mock mode for testing without API calls
- Structured JSON responses for all AI-generated content

**Database** (`src/utils/database.ts`):
- SQLite wrapper with async/await support
- Generic type support for query results
- Proper connection management and error handling

### Database Schema

**Location:** Database schema defined in `src/utils/initDb.ts`

Key tables and relationships:
- **games**: Game sessions with metadata (name, created_at, last_played_at)
- **regions**: Thematic areas (mansion, forest, cave, town) with names, descriptions, and center tracking
- **rooms**: AI-generated rooms with names, descriptions, processing state, and region assignments (region_id, region_distance)
- **connections**: Bidirectional room links with both mechanical directions and thematic names
- **game_state**: Current player position and game state per game

**Database Triggers:**
- `set_region_center`: Automatically sets region.center_room_id when a room with distance=0 is created

**Key Relationships:**
```sql
games.id → regions.game_id → rooms.region_id
rooms.region_distance → distance from region center (0 = center)
rooms.id ← connections.from_room_id / to_room_id
```

### AI Integration Architecture

**Region-Based Generation System:**
- Distance-based probability for region transitions (15% base + 12% per distance unit, capped at 80%)
- Region types with specialized AI prompts: mansion, forest, cave, town
- AI receives regional context and adjacent room descriptions for coherent generation
- Visit-to-lock system: rooms maintain consistent layout after first player visit
- Background generation with configurable limits and cooldown periods

**Content Generation:**
- Regional contextual generation: AI knows current region type and theme
- Adjacent room awareness: AI receives descriptions of connected rooms
- Thematic connection names complement mechanical directions
- Bidirectional connection creation with complementary thematic names
- Fallback content when AI generation fails

**Room Generation Services:** Located in `src/services/`
- `RoomGenerationService`: Core room creation logic
- `BackgroundGenerationService`: Proactive room generation
- `RegionService`: Region management and context building

## Key Features Implementation

### Region-Based World Generation
**Location:** `src/services/regionService.ts`
- Distance-based probability system for region transitions
- Region types: mansion, forest, cave, town with thematic coherence
- Center discovery: database triggers automatically mark region centers
- Regional context for AI generation: `buildRegionContext()`, `buildRoomGenerationPrompt()`

### Thematic Connection System
**Location:** Connection logic in `src/services/gameStateManager.ts`
- Dual navigation: "go north" and "go through the crystal archway" both work
- AI generates atmospheric connection names that enhance immersion
- Database stores both mechanical direction and thematic name for each connection
- Case-insensitive matching for natural language input

### Visit-to-Lock Mechanism
**Location:** Room processing logic in generation services
- Rooms marked as `generation_processed = FALSE` when first created
- Player visit locks the room layout (`generation_processed = TRUE`)
- Prevents "phantom connections" appearing on return visits
- Maintains spatial consistency and player mental map

### Session Interface System
**Location:** `src/sessionInterface.ts`
- Programmatic command execution without interactive CLI
- Supports all game commands including region debug commands
- Game ID targeting for specific sessions
- Full command router integration with region commands

### Background Generation
**Location:** `src/services/backgroundGenerationService.ts`
- Proactive room generation triggered when player enters new areas
- Configurable generation depth and room limits per game
- Race condition prevention using `generationInProgress` Set
- Silent failure mode - game continues if generation fails

### Testing Infrastructure
**Location:** `tests/` directory with comprehensive test coverage
- Jest test suite with TypeScript support via ts-jest
- Database isolation for tests (separate test databases)
- RegionService comprehensive test coverage: `tests/regionService.test.ts`
- Session interface tests: `tests/sessionInterface.test.ts`
- AI integration tests and mocking
- Test scripts for specific AI integration scenarios

## Environment Configuration

Required environment variables:
```bash
GROK_API_KEY=your_grok_api_key_here
```

Optional configuration:
```bash
# AI Configuration
GROK_MODEL=grok-3                    # AI model to use
GROK_MAX_TOKENS=500                  # Max tokens per request
GROK_TEMPERATURE=0.8                 # AI creativity level
AI_MOCK_MODE=true                    # Use mock responses for testing
AI_DEBUG_LOGGING=true                # Enable debug output

# Generation Limits
MAX_ROOMS_PER_GAME=100              # Maximum rooms per game
MAX_GENERATION_DEPTH=5               # Background generation depth
GENERATION_COOLDOWN_MS=5000         # Cooldown between generations
```

## Development Patterns

### Model Definitions and Type Locations

**Core Game Types:** `src/services/gameStateManager.ts`
```typescript
interface Game, Room, Connection, GameState
```

**Region Types:** `src/types/region.ts`
```typescript
interface Region, RegionContext, RoomWithRegion
```

**Command Types:** `src/services/commandRouter.ts`
```typescript
interface Command, CommandExecutionContext
```

### Adding New Commands

**Location:** Commands added in `src/gameController.ts` (lines 263-279 for region commands)

For menu commands:
```typescript
this.commandRouter.addMenuCommand({
  name: 'commandname',
  description: 'Description shown in help',
  handler: async () => await this.handleCommand()
});
```

For game commands:
```typescript
this.commandRouter.addGameCommand({
  name: 'commandname', 
  description: 'Description shown in help',
  handler: async (args) => await this.handleCommand(args)
});
```

**Session Interface:** Also add commands to `setupGameCommands()` in `src/sessionInterface.ts`

### Database Operations

**Location:** Database wrapper at `src/utils/database.ts`

All database operations use the async Database wrapper:
```typescript
// Single row
const room = await this.db.get<Room>('SELECT * FROM rooms WHERE id = ?', [roomId]);

// Multiple rows  
const connections = await this.db.all<Connection>('SELECT * FROM connections WHERE game_id = ?', [gameId]);

// Insert/Update
const result = await this.db.run('INSERT INTO rooms (name, description) VALUES (?, ?)', [name, desc]);

// Region-specific queries (examples from RegionService)
const region = await this.db.get<Region>('SELECT * FROM regions WHERE id = ?', [regionId]);
const roomsInRegion = await this.db.all<RoomWithRegion>('SELECT * FROM rooms WHERE region_id = ? ORDER BY region_distance', [regionId]);
```

### AI Integration Patterns
All AI calls should include fallback handling:
```typescript
try {
  const result = await this.grokClient.generateRoom(context);
  return result;
} catch (error) {
  if (process.env.AI_DEBUG_LOGGING === 'true') {
    console.error('AI generation failed:', error);
  }
  return this.getFallbackContent(context);
}
```

## Testing Guidelines

- Use Jest for all tests with TypeScript support via ts-jest
- Test database operations use isolated test databases
- Mock external dependencies (AI API calls) in unit tests
- Integration tests verify end-to-end game functionality
- Use descriptive test names that explain expected behavior

## Common Development Tasks

**Adding new room generation features:**
1. Update `GrokClient.generateRoom()` prompt and response interface
2. Modify database schema if new fields needed
3. Update fallback generation methods
4. Add tests for new functionality

**Extending command system:**
1. Add command to appropriate command map (menu or game)
2. Implement handler method in GameController
3. Update help text and documentation
4. Add unit tests for command functionality

**Database schema changes:**
1. Update `src/utils/initDb.ts` with migration logic
2. Modify TypeScript interfaces for new fields in `src/types/` or `src/services/gameStateManager.ts`
3. Update existing queries to handle new schema
4. Test migration with existing game data

**Adding new region functionality:**
1. Update `RegionService` methods in `src/services/regionService.ts`
2. Add new region types to type definitions in `src/types/region.ts`
3. Update AI prompts in `RegionService.buildRegionPrompt()`
4. Add tests in `tests/regionService.test.ts`

## Issue Tracking

The project uses a markdown-based issue tracking system in the `issues/` directory:

### Issue Management
- **File naming convention**: `YYYY-MM-DD-issue-name.md`
- **Template**: Use `issues/TEMPLATE.md` as the starting point for new issues
- **Categories**: Bug | Feature | Enhancement | Documentation | Performance
- **Priorities**: Low | Medium | High | Critical
- **Status tracking**: Open | In Progress | Resolved | Closed

### Creating New Issues
1. Copy `issues/TEMPLATE.md` to create a new issue file
2. Use descriptive names following the date convention
3. Include detailed description, technical notes, and acceptance criteria
4. Update status as work progresses

### Key Open Issues
- **Natural Language Command Processing** (`2025-01-18-natural-language-command-processing.md`): High-priority enhancement for implementing AI-powered natural language processing with local pattern matching and AI fallback system
- **Multi-Interface Architecture** (`2025-01-18-multi-interface-architecture.md`): Plans for extending beyond CLI to web and mobile interfaces
- **Terminal UI Interface** (`2025-01-18-terminal-ui-interface.md`): Enhanced terminal UI with ncurses-style interface

## Project Structure Details

```
src/
├── ai/
│   └── grokClient.ts          # AI integration with Grok API
├── services/                  # Business logic services
│   ├── regionService.ts       # Region management and probability (REGION CORE)
│   ├── gameStateManager.ts    # Game state and session management
│   ├── commandRouter.ts       # Command registration and routing
│   ├── roomDisplayService.ts  # Room presentation logic
│   ├── roomGenerationService.ts      # Room creation logic
│   ├── backgroundGenerationService.ts # Proactive generation
│   └── gameManagementService.ts       # Game CRUD operations
├── types/                     # TypeScript type definitions
│   └── region.ts             # Region interfaces and types (REGION TYPES)
├── utils/
│   ├── database.ts            # SQLite database wrapper
│   └── initDb.ts             # Database schema and migrations (REGION SCHEMA)
├── gameController.ts          # Main game logic and command processing
├── sessionInterface.ts        # Programmatic command interface (SESSION API)
└── index.ts                  # Application entry point

tests/                        # Jest test suite
├── regionService.test.ts     # Region system comprehensive tests (REGION TESTS)
├── sessionInterface.test.ts  # Session interface tests
└── ...                       # Other test files
scripts/                      # Utility scripts for testing AI features
issues/                       # Issue tracking in markdown format
└── ...                       # Tracked issues
```

### Key File Locations for Region System

- **🏗️ Region Service Core**: `src/services/regionService.ts` (main implementation)
- **🗄️ Database Schema**: `src/utils/initDb.ts` (tables, triggers, migrations)
- **🏷️ Type Definitions**: `src/types/region.ts` (interfaces)
- **🎮 Game Integration**: `src/gameController.ts` (lines 263-279, 585-703)
- **🔌 Session API**: `src/sessionInterface.ts` (lines 211-336)
- **🧪 Test Coverage**: `tests/regionService.test.ts` (14 comprehensive tests)

## Performance Considerations

- Background room generation uses fire-and-forget pattern to avoid blocking gameplay
- Generation cooldowns prevent excessive AI API calls
- Room limits prevent unbounded world growth
- Database queries use appropriate indexes for game and room lookups
- Mock mode available for testing without API costs