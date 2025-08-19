# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shadow Kingdom is a fully functional AI-powered text adventure game built with TypeScript and Node.js. Players explore a dynamically generated fantasy kingdom where AI creates rooms, descriptions, and atmospheric connections in real-time using Grok AI.

**Core Architecture:**
- **GameController**: Main game logic, command processing, and state management
- **GrokClient**: AI integration for content generation with fallback systems
- **Database**: SQLite-based persistence for games, rooms, connections, and player state
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
- Command system with separate menu and game command sets
- Background room generation with rate limiting and cooldown
- Game save/load system with SQLite persistence
- Natural language movement supporting both cardinal directions and thematic names

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

Key tables and relationships:
- **games**: Game sessions with metadata (name, created_at, last_played_at)
- **rooms**: AI-generated rooms with names, descriptions, and processing state
- **connections**: Bidirectional room links with both mechanical directions and thematic names
- **game_state**: Current player position and game state per game

### AI Integration Architecture

**Room Generation System:**
- 30% probability connections create realistic room layouts (average 2-4 exits per room)
- Visit-to-lock system: rooms maintain consistent layout after first player visit
- Background generation with configurable limits and cooldown periods
- Thematic connection names complement mechanical directions
- Duplicate prevention and uniqueness enforcement

**Content Generation:**
- Contextual room generation based on current location and game history
- Atmospheric descriptions that fit the fantasy kingdom theme
- Bidirectional connection creation with complementary thematic names
- Fallback content when AI generation fails

## Key Features Implementation

### Thematic Connection System
- Dual navigation: "go north" and "go through the crystal archway" both work
- AI generates atmospheric connection names that enhance immersion
- Database stores both mechanical direction and thematic name for each connection
- Case-insensitive matching for natural language input

### Visit-to-Lock Mechanism
- Rooms marked as `generation_processed = FALSE` when first created
- Player visit locks the room layout (`generation_processed = TRUE`)
- Prevents "phantom connections" appearing on return visits
- Maintains spatial consistency and player mental map

### Background Generation
- Proactive room generation triggered when player enters new areas
- Configurable generation depth and room limits per game
- Race condition prevention using `generationInProgress` Set
- Silent failure mode - game continues if generation fails

### Testing Infrastructure
- Jest test suite with TypeScript support
- Database isolation for tests (separate test databases)
- Comprehensive test coverage for generation, persistence, and game management
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

### Adding New Commands

For menu commands:
```typescript
this.addMenuCommand({
  name: 'commandname',
  description: 'Description shown in help',
  handler: async () => await this.handleCommand()
});
```

For game commands:
```typescript
this.addGameCommand({
  name: 'commandname', 
  description: 'Description shown in help',
  handler: async (args) => await this.handleCommand(args)
});
```

### Database Operations
All database operations use the async Database wrapper:
```typescript
// Single row
const room = await this.db.get<Room>('SELECT * FROM rooms WHERE id = ?', [roomId]);

// Multiple rows  
const connections = await this.db.all<Connection>('SELECT * FROM connections WHERE game_id = ?', [gameId]);

// Insert/Update
const result = await this.db.run('INSERT INTO rooms (name, description) VALUES (?, ?)', [name, desc]);
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
1. Update `initDb.ts` with migration logic
2. Modify TypeScript interfaces for new fields
3. Update existing queries to handle new schema
4. Test migration with existing game data

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
├── utils/
│   ├── database.ts            # SQLite database wrapper
│   └── initDb.ts             # Database initialization and migrations
├── gameController.ts          # Main game logic and command processing
└── index.ts                  # Application entry point

tests/                        # Jest test suite
scripts/                      # Utility scripts for testing AI features
issues/                       # Issue tracking in markdown format
├── TEMPLATE.md              # Template for creating new issues
├── 2025-01-18-natural-language-command-processing.md
├── 2025-01-18-multi-interface-architecture.md
└── ...                      # Other tracked issues
```

## Database Migration Guidelines

Shadow Kingdom uses a migration-style pattern in `src/utils/initDb.ts` to handle database schema changes safely and consistently.

### Migration Pattern

**1. Add Migration Function**
Create a new `ensure[FeatureName]` function in `initDb.ts`:
```typescript
async function ensureNewFeature(db: Database): Promise<void> {
  try {
    // Check if feature already exists
    const exists = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM sqlite_master 
       WHERE type='table' AND name='new_table'`
    );

    if (!exists || exists.count === 0) {
      console.log('Creating new feature...');
      
      // Create tables, columns, indexes, triggers
      await db.run(`CREATE TABLE new_table (...)`);
      await db.run('CREATE INDEX ...');
      
      console.log('New feature created successfully');
    }
  } catch (error) {
    console.error('Error ensuring new feature:', error);
    throw error;
  }
}
```

**2. Call Migration in initializeDatabase**
Add the call to `initializeDatabase()` function:
```typescript
export async function initializeDatabase(db: Database): Promise<void> {
  try {
    // ... existing migrations ...
    await ensureNewFeature(db);
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}
```

**3. Test Migration**
Create a test script to verify the migration:
```typescript
#!/usr/bin/env ts-node
import Database from './src/utils/database';
import { initializeDatabase } from './src/utils/initDb';

async function testMigration() {
  const db = new Database('test_migration.db');
  try {
    await db.connect();
    await initializeDatabase(db);
    // ... test the new feature ...
  } finally {
    await db.close();
  }
}
```

**4. Migration Best Practices**
- Always use `IF NOT EXISTS` for CREATE statements where possible
- Check for existence before making changes
- Use transactions for multi-step migrations
- Add appropriate indexes for performance
- Test on both fresh databases and existing data
- Never modify existing columns - always ADD new ones
- Use ALTER TABLE for additive changes only

**5. Example: Adding Region Support**
The region system migration demonstrates this pattern:
- `ensureRegionsTable()` - Creates regions table
- `ensureRoomRegionColumns()` - Adds region_id and region_distance to rooms
- `ensureRegionTriggers()` - Creates database triggers for data integrity

Each function checks for existence and only makes changes if needed, ensuring safe re-execution.

## Performance Considerations

- Background room generation uses fire-and-forget pattern to avoid blocking gameplay
- Generation cooldowns prevent excessive AI API calls
- Room limits prevent unbounded world growth
- Database queries use appropriate indexes for game and room lookups
- Mock mode available for testing without API costs