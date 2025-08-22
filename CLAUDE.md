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
npm run dev -- --cmd "look"                    # Start new game and look around
AI_DEBUG_LOGGING=true npm run dev -- --cmd "look"  # Start with debug output
npm run dev -- --cmd "go north" --game-id 1    # Move north in existing game
npm run dev -- --cmd "regions" --game-id 1     # Show all regions in game
```

## Architecture Overview

**Core Services:**
- **GameController** (`src/gameController.ts`): Main game logic, dual-mode operation (menu/game), region commands
- **RegionService** (`src/services/regionService.ts`): Region-based world generation with distance probability
- **SessionInterface** (`src/sessionInterface.ts`): Programmatic command execution for automation
- **GrokClient** (`src/ai/grokClient.ts`): AI integration with fallback systems and mock mode
- **BackgroundGenerationService**: Proactive room generation triggered by player movement

**Key Systems:**
- **Visit-to-Lock Mechanism**: Prevents phantom connections, maintains spatial consistency
- **Connection-Based Generation**: Pre-creates unfilled connections that background generation fills
- **Region-Based World**: Distance-based probability for thematic coherence (15% base + 12% per distance)
- **AI Character Generation**: Automatically creates NPCs and enemies during room generation with fallback keyword matching

## Development Patterns

### Database Operations
All database operations use the async Database wrapper (`src/utils/database.ts`):
```typescript
const room = await this.db.get<Room>('SELECT * FROM rooms WHERE id = ?', [roomId]);
const connections = await this.db.all<Connection>('SELECT * FROM connections WHERE game_id = ?', [gameId]);
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
- `src/utils/database.ts` - SQLite wrapper with async/await support
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

## Common Development Tasks

**Adding new commands**: Update GameController and SessionInterface with command handlers
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