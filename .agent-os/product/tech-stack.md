# Technical Stack

> Last Updated: 2025-08-25
> Version: 1.0.0

## Application Framework

- **Runtime:** Node.js 18+
- **Language:** TypeScript 5+ with strict type checking
- **Package Manager:** npm with package-lock.json for deterministic builds

## Database

- **Primary Database:** SQLite with WAL mode for development and production
- **ORM:** Prisma ORM for type-safe database operations and automated migrations
- **Schema Management:** Prisma schema with automated migration generation
- **Test Isolation:** In-memory SQLite databases for test isolation

## AI Integration

- **Primary AI Service:** Claude API (Anthropic) for superior natural language processing
- **Migration Path:** Transitioning from Grok AI to Claude API for better context understanding
- **Fallback System:** Mock mode and keyword-based fallbacks for service outages
- **Context Management:** Comprehensive prompt engineering with room context and player history

## User Interface

- **Terminal UI Framework:** Ink (React-inspired TUI framework) for modern terminal interfaces
- **Layout System:** Adaptive three-panel layout (scrollable content, floating input bar, dynamic status area)
- **Command History:** Persistent command storage with arrow key navigation
- **Color Scheme:** Claude Code-inspired color palette with message type differentiation

## Architecture Patterns

- **Design Pattern:** Clean Architecture with clear separation of concerns
- **Dependency Injection:** Constructor injection for service dependencies
- **Service Layer:** Centralized business logic in dedicated service classes
- **Event System:** Event-driven architecture for game state changes and AI generation

## Core Services

### World Generation
- **RegionService:** Distance-based probability for thematic region transitions
- **RoomGenerationService:** AI-powered room creation with regional context
- **BackgroundGenerationService:** Proactive world expansion without blocking gameplay
- **ConnectionService:** Spatial consistency management with visit-to-lock mechanisms

### Game Logic
- **GameStateManager:** Session management and game state persistence
- **CommandRouter:** Command parsing and routing with natural language fallback
- **TargetResolutionService:** Universal target disambiguation for all commands
- **ItemService:** Inventory and item interaction management

### AI and Natural Language
- **GrokClient/ClaudeClient:** AI service integration with fallback handling
- **AICommandFallback:** Natural language command parsing when standard parsing fails
- **MessageFormatter:** Contextual message formatting with type-safe color schemes
- **PromptEngineering:** Sophisticated prompt templates for consistent AI responses

## Testing Infrastructure

- **Testing Framework:** Jest with TypeScript support
- **Test Coverage:** 800+ comprehensive tests across all major systems
- **Integration Testing:** End-to-end command flow testing with isolated databases
- **Mocking Strategy:** Service-level mocking for AI calls and external dependencies
- **Performance Testing:** Load testing for world generation and command processing

## Development Tools

- **Build System:** TypeScript compiler with watch mode for development
- **Code Quality:** ESLint with TypeScript rules and Prettier for formatting
- **Development Server:** Hot reload development server with automatic TypeScript compilation
- **Debugging:** Comprehensive logging system with configurable verbosity levels

## Command Interface Architecture

### Dual Interface Design
- **Interactive Mode:** Full TUI interface for human players with command history and visual feedback
- **Programmatic Mode:** Command-line interface for testing and automation (`--cmd "command"`)
- **Session Interface:** Stateful API for programmatic interaction without UI overhead

### Command Processing Pipeline
```typescript
User Input → Exact Match → Article Parser → NLP Engine → AI Fallback → Target Resolution → Handler Execution
```

### Input Processing Layers
1. **Exact Command Matching:** Direct command name lookup for performance
2. **Article Stripping:** Remove "the", "a", "an" for natural language support  
3. **NLP Enhancement:** Basic natural language processing for common patterns
4. **AI Fallback:** Claude API for complex natural language interpretation
5. **Target Resolution:** Universal target disambiguation service
6. **Command Execution:** Type-safe handler execution with resolved targets

## Data Architecture

### Database Schema Design
- **Games Table:** Session and game state management
- **Rooms Table:** Room definitions with regional and spatial metadata
- **Regions Table:** Thematic region definitions with generation context
- **Connections Table:** Bidirectional spatial connections with thematic names
- **Items Table:** Item definitions with metadata and interaction capabilities
- **Characters Table:** NPC and character data with AI-generated backstories

### Spatial Consistency System
- **Connection-Based Generation:** Pre-create unfilled connections that AI fills to prevent phantom exits
- **Visit-to-Lock Mechanism:** Lock room layouts after player visits to maintain spatial consistency
- **Regional Distance Tracking:** Track distance from region centers for probability calculations
- **Background Processing:** Non-blocking world expansion triggered by player movement

## Performance and Scalability

### Optimization Strategies
- **Connection Pooling:** Efficient database connection management for concurrent operations
- **Query Optimization:** Indexed database queries for spatial and regional lookups
- **Memory Management:** Bounded content buffers and cleanup for long-running sessions
- **AI Request Throttling:** Rate limiting for AI service calls to manage costs and quotas

### Monitoring and Logging
- **Structured Logging:** JSON-formatted logs with configurable levels and contexts
- **Performance Metrics:** Command execution timing and AI generation performance tracking
- **Error Handling:** Comprehensive error tracking with graceful degradation strategies
- **Debug Modes:** Development-friendly debug logging for AI interactions and system behavior

## Environment Configuration

### Required Environment Variables
```bash
CLAUDE_API_KEY=your_claude_api_key_here    # Claude API for AI generation
DATABASE_URL=file:./shadow_kingdom.db      # SQLite database location
```

### Optional Configuration
```bash
# AI Configuration
AI_MOCK_MODE=false                         # Use mock responses for testing
AI_DEBUG_LOGGING=false                     # Enable AI interaction logging
CHARACTER_GENERATION_FREQUENCY=40          # Percentage of rooms with NPCs

# Performance Tuning
MAX_ROOMS_PER_GAME=100                     # Maximum rooms per game session
GENERATION_COOLDOWN_MS=10000               # Cooldown between AI generation calls
REGION_EXPANSION_TRIGGER=4                 # Rooms to generate per expansion

# UI Configuration  
TUI_SHOW_BORDERS=true                      # Terminal UI border display
TUI_AUTO_SCROLL=true                       # Auto-scroll to new content
COMMAND_HISTORY_SIZE=100                   # Maximum stored commands
```

## Migration Strategy

### AI Service Migration (Grok → Claude)
1. **Parallel Implementation:** Maintain both Grok and Claude clients during transition
2. **Feature Flags:** Environment-based switching between AI services
3. **Prompt Adaptation:** Refine prompt templates for Claude's specific response patterns
4. **Response Validation:** Ensure response format compatibility across services
5. **Fallback Preservation:** Maintain existing fallback mechanisms during transition

### Interface Migration (Readline → Ink)
1. **Gradual Rollout:** Implement TUI while preserving readline compatibility
2. **Session Interface Isolation:** Ensure programmatic interfaces remain unchanged
3. **Command History Preservation:** Migrate existing command history to new system
4. **Terminal Compatibility:** Ensure TUI works across major terminal applications
5. **Performance Validation:** Maintain or improve response times with new interface