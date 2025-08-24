# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shadow Kingdom is a fully functional AI-powered text adventure game built with TypeScript and Node.js featuring region-based world generation. Players explore a dynamically generated fantasy kingdom where AI creates rooms, descriptions, and atmospheric connections within thematically coherent regions using Grok AI.

## Development Commands

```bash
# Development
npm install              # Install dependencies
npm run dev              # Run development server with hot reload
npm run build            # Build TypeScript to JavaScript
npm start               # Run built application

# Testing
npm test                # Run all tests with Jest
npm run test:watch      # Watch mode for tests
npm run test:coverage   # Generate coverage report

# Playing the Game
npm run dev                # Start interactive game

# Programmatic Testing Interface
AI_DEBUG_LOGGING=false npm run dev -- --cmd "look"          # Execute single command
AI_DEBUG_LOGGING=true npm run dev -- --cmd "go north"       # Execute with debug logging
```

## Architecture Overview

**Core Services:**
- **GameController** (`src/gameController.ts`): Main game logic and TUI interface
- **RegionService** (`src/services/regionService.ts`): Region-based world generation with distance probability
- **GrokClient** (`src/ai/grokClient.ts`): AI integration with fallback systems and mock mode
- **BackgroundGenerationService**: Proactive room generation triggered by player movement

**Key Systems:**
- **Visit-to-Lock Mechanism**: Prevents phantom connections, maintains spatial consistency
- **Connection-Based Generation**: Pre-creates unfilled connections that background generation fills
- **Region-Based World**: Distance-based probability for thematic coherence (15% base + 12% per distance)
- **AI Character Generation**: Automatically creates NPCs and enemies during room generation with fallback keyword matching

## Development Patterns

### Database Operations - CRITICAL REQUIREMENT
**⚠️ MANDATORY: ALL DATABASE ACCESS MUST USE PRISMA ONLY**

Every single database operation MUST go through Prisma ORM. No exceptions. Do not create legacy SQL-based services.

```typescript
// ✅ CORRECT - Use Prisma services only
const room = await this.prismaService.room.findFirst({ where: { id: roomId } });
const connections = await this.prismaService.connection.findMany({ where: { gameId } });

// ❌ FORBIDDEN - Direct SQL or legacy database wrappers
const room = await this.db.get<Room>('SELECT * FROM rooms WHERE id = ?', [roomId]);
```

### AI Integration Patterns
All AI calls include fallback handling:
```typescript
try {
  const result = await this.grokClient.generateRoom(context);
  return result;
} catch (error) {
  return this.getFallbackContent(context);
}
```

### Command System
**Menu commands:**
```typescript
this.commandRouter.addMenuCommand({
  name: 'commandname',
  description: 'Description',
  handler: async () => await this.handleCommand()
});
```

**Game commands:**
```typescript
this.commandRouter.addGameCommand({
  name: 'commandname', 
  description: 'Description',
  handler: async (args) => await this.handleCommand(args)
});
```

## Environment Configuration

Required:
```bash
GROK_API_KEY=your_grok_api_key_here
```

Optional:
```bash
AI_MOCK_MODE=true                    # Use mock responses for testing
AI_DEBUG_LOGGING=true                # Enable debug output
MAX_ROOMS_PER_GAME=100              # Maximum rooms per game
GENERATION_COOLDOWN_MS=10000        # Cooldown between generations

# Character Generation Control
CHARACTER_GENERATION_FREQUENCY=40   # Percentage (0-100) of rooms that get character generation requests
```

## Key Files and Locations

### Core Game Logic
- `src/gameController.ts` - Main game controller with dual-mode operation
- `src/services/gameStateManager.ts` - Game state and session management
- `src/services/commandRouter.ts` - Command registration and routing

### World Generation System
- `src/services/regionService.ts` - Region management and probability logic
- `src/services/roomGenerationService.ts` - Room creation with region integration
- `src/services/backgroundGenerationService.ts` - Proactive generation system

### Data Layer
- `src/utils/initDb.ts` - Database schema and migrations

### AI Integration
- `src/ai/grokClient.ts` - Grok AI integration with fallback systems

### Testing Infrastructure
- `tests/` - Jest test suite with comprehensive coverage
- `tests/CLAUDE.md` - Test execution guidelines and patterns

## Documentation Reference

- **specs/world-generation-comprehensive.md** - Complete world generation system documentation
- **specs/rpg-systems-comprehensive.md** - Future RPG systems design
- **docs/BACKGROUND_GENERATION_SYSTEM.md** - Detailed background generation guide
- **archive/completed-issues/** - Completed feature implementations and resolved issues
- **archive/documentation/** - Comprehensive specs and detailed technical documentation

## Game Testing and Development Interface

### Interactive Mode
Start the game in interactive mode with a text-based interface:
```bash
npm run dev
```

Navigate using commands like `go north`, `look`, `examine sword`, `pickup key`, `inventory`, etc.

### Programmatic Command Interface
Execute single commands programmatically for testing and development:

```bash
# Basic command execution (quiet logging)
AI_DEBUG_LOGGING=false npm run dev -- --cmd "look"

# Command execution with debug logging (shows AI generation details)
AI_DEBUG_LOGGING=true npm run dev -- --cmd "go north"

# Common test commands
npm run dev -- --cmd "go south"
npm run dev -- --cmd "pickup ancient key"
npm run dev -- --cmd "inventory"
npm run dev -- --cmd "examine iron sword"
```

**Key Parameters:**
- `--cmd`: The game command to execute
- `AI_DEBUG_LOGGING`: Set to `true` to see detailed AI generation logs, `false` for clean output

**Output Logging:**
- Game responses and state changes are logged to the development log
- AI generation details (prompts, responses, fallbacks) shown when debug logging is enabled
- Session state changes and room generation events are tracked
- Use this interface to test command behaviors and observe system responses

## Common Development Tasks

**Adding new commands**: Update GameController with command handlers
**Database schema changes**: Update `initDb.ts` with migration logic and TypeScript interfaces
**AI features**: Extend GrokClient with new generation methods and fallback handling
**Testing**: Use Jest with isolated test databases (`:memory:`) for reliable testing

## System Status

✅ **Core Systems Complete:**
- Region-based world generation with distance probability
- Connection-based generation eliminating phantom connections
- Visit-to-lock mechanism ensuring spatial consistency
- Background generation with 4+ rooms per trigger
- Session interface for programmatic access
- Comprehensive test suite (802/802 tests passing)

🚧 **Future Development:**
- Character progression system
- Combat mechanics
- Inventory and equipment
- Advanced quest system
- Remember that in SQLite, boolean values are stored as 0 for false and 1 for true.
