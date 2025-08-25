# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shadow Kingdom is an AI-powered text adventure game built with TypeScript, Node.js, and React Ink. It features a sophisticated TUI (Terminal User Interface) with dual-mode operation: interactive gameplay and programmatic command execution for automation/testing. The game uses Prisma ORM with SQLite for data persistence and supports YAML-based world seeding.

## Development Commands

```bash
# Core Development
npm install              # Install dependencies
npm run build            # Build TypeScript to JavaScript
npm run dev              # Start development server
npm start               # Run built application

# Database Operations (Prisma)
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema changes to database  
npm run db:migrate      # Create and apply migrations
npm run db:studio       # Open Prisma Studio GUI
npm run db:reset        # Reset database
npm run db:seed         # Seed world from YAML files

# Testing
npm test                # Run all tests with Jest
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Generate coverage report

# Run specific test files
npm test -- tests/services/gameEngine.test.ts
npm test -- tests/integration/tuiIntegration.test.ts

# Game Execution Modes
npm run dev                                    # Interactive TUI mode
npm run dev -- --cmd "look" --debug          # Programmatic command with debug
AI_DEBUG_LOGGING=true npm run dev -- --cmd "go north"  # Environment debug flag
```

## Architecture Overview

### Core Service Layer
The application follows a service-oriented architecture with dependency injection:

- **GameEngine** (`src/services/gameEngine.ts`): Game initialization, launch sequences, and error recovery
- **GameStateManager** (`src/services/gameStateManager.ts`): Session state management and room transitions  
- **CommandRouter** (`src/services/commandRouter.ts`): Command parsing, routing, and execution
- **RoomNavigationEngine** (`src/services/roomNavigationEngine.ts`): Movement validation, room transitions, interactive elements
- **PrismaService** (`src/services/prismaService.ts`): Database abstraction with connection management
- **YamlWorldService** (`src/services/yamlWorldService.ts`): YAML-based world seeding and validation

### TUI Component Layer (React Ink)
Modern React-based terminal interface:

- **GameApplication** (`src/components/GameApplication.tsx`): Main application component orchestrating all services
- **GamePane** (`src/components/GamePane.tsx`): Game output and message display  
- **InputBar** (`src/components/InputBar.tsx`): Command input with history navigation
- **StatusPane** (`src/components/StatusPane.tsx`): Dynamic status display with flexible layouts

### Service Integration Pattern
Services are initialized in dependency order and injected via constructors:

```typescript
const prismaService = PrismaService.getInstance();
const gameStateManager = new GameStateManager(prismaService);
const gameEngine = new GameEngine(prismaService, gameStateManager);
const navigationEngine = new RoomNavigationEngine(gameStateManager, prismaService);
const commandRouter = new CommandRouter(gameStateManager, prismaService);
```

### Dual-Mode Operation
The entry point (`src/index.ts`) supports both interactive TUI and programmatic execution:
- **Interactive Mode**: Full TUI with GamePane, InputBar, StatusPane
- **Programmatic Mode**: Single command execution for automation/testing

## Database Architecture (Prisma + SQLite)

**Critical Requirement: ALL database access MUST use Prisma ORM only. No direct SQL queries.**

### Core Schema
- **Game**: Game sessions with metadata and current state
- **Room**: Generated rooms with descriptions and region assignments  
- **Connection**: Uni-directional room links with optional descriptions
- **Region**: Thematic areas for world coherence
- **Character**: NPCs with dialogue and combat stats
- **Item**: Game objects with types and properties

### Key Relationships
```sql
-- Room navigation system
connections.from_room_id → rooms.id
connections.to_room_id → rooms.id (nullable for unfilled connections)

-- Region-based world organization  
rooms.region_id → regions.id
regions.game_id → games.id

-- Game state tracking
games.current_room_id → rooms.id
```

## Testing Architecture

### Test Organization
- `tests/components/` - TUI component tests with ink-testing-library
- `tests/services/` - Unit tests for service layer
- `tests/integration/` - End-to-end integration tests
- `tests/performance/` - Performance benchmarks

### Key Testing Patterns
```typescript
// Service mocking pattern for integration tests
jest.mock('../../src/services/gameEngine');
(GameEngine as jest.MockedClass<typeof GameEngine>).mockImplementation(() => mockGameEngine);

// Ink component testing
const { lastFrame, stdin } = render(React.createElement(Component));
expect(lastFrame()).toContain('expected output');
```

### Test Configuration
- **Serial execution**: `maxWorkers: 1` to avoid database conflicts
- **Module reset**: `resetModules: true` for test isolation  
- **In-memory databases**: Tests use `:memory:` SQLite for isolation

## Environment Configuration

### Required
```bash
DATABASE_URL=file:./data/db/shadow_kingdom.db
```

### Optional Development
```bash
AI_DEBUG_LOGGING=true                    # Enable detailed debug output
AI_MOCK_MODE=true                        # Use mock AI responses
GAME_ENGINE_SKIP_MENU=true               # Auto-launch for TUI integration
```

## Key Development Patterns

### Component Communication
TUI components use props and callbacks for state management:
```typescript
<GamePane messages={messages} maxLines={gameAreaHeight} />
<InputBar 
  onSubmit={handleCommandSubmit}
  commandHistory={commandHistory}
  onHistoryUpdate={setCommandHistory}
/>
```

### Error Handling
Comprehensive error boundaries with graceful fallbacks:
- Loading states during service initialization
- Error states with user-friendly messages  
- Service recovery mechanisms

### Command System
Commands registered with CommandRouter:
```typescript
this.commandRouter.addGameCommand({
  name: 'look',
  description: 'Examine your surroundings', 
  handler: async () => await this.handleLookCommand()
});
```

## Current Known Issues

### Runtime Issues
- **GameEngine launch failures**: "All recovery attempts failed" during initialization
- **Database connection issues**: May require schema investigation or migration fixes

### Test Issues  
- **Integration test limitations**: Some command processing tests fail due to stdin simulation vs InputBar component mismatch
- **Mocking complexity**: Service dependency injection requires careful mock setup

## File Structure Highlights

```
src/
├── components/          # React Ink TUI components
│   ├── GameApplication.tsx    # Main integrated application
│   ├── GamePane.tsx          # Game output display
│   ├── InputBar.tsx          # Command input with history  
│   └── StatusPane.tsx        # Dynamic status display
├── services/            # Core business logic services
│   ├── gameEngine.ts         # Game initialization & launch
│   ├── gameStateManager.ts   # Session & state management
│   ├── commandRouter.ts      # Command system
│   ├── roomNavigationEngine.ts # Movement & interactions
│   ├── prismaService.ts      # Database abstraction
│   └── yamlWorldService.ts   # World seeding
└── index.ts            # Entry point with CLI parsing

tests/
├── integration/         # End-to-end tests including TUI integration
├── services/           # Service unit tests
└── components/         # Component tests with ink-testing-library
```

## Development Workflow

1. **Service Changes**: Update service classes with proper dependency injection
2. **Component Changes**: Follow React Ink patterns with props/callbacks
3. **Database Changes**: Update Prisma schema, run migrations, regenerate client
4. **Testing**: Run relevant test suites, ensure mocking is properly configured
5. **Integration**: Test both interactive and programmatic modes

Remember: This codebase prioritizes service-oriented architecture with clear separation between business logic (services) and presentation (TUI components). All database operations must go through Prisma ORM.