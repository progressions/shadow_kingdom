# Multi-Interface Architecture Refactor

**Issue Type:** Enhancement  
**Priority:** Medium  
**Complexity:** High  
**Date:** 2025-01-18  

## Summary

Refactor Shadow Kingdom to support both command-line interface (CLI) and web browser interface, allowing the game to be played either in a terminal or through a web browser. This involves separating the game logic from the interface layer and creating an abstraction that supports multiple interface implementations.

## Current State

- Shadow Kingdom is currently a CLI-only application
- Game logic is tightly coupled with `readline` interface in `GameController`
- All output goes directly to `console.log`
- Single-user experience only

## Goals

1. **Interface Flexibility**: Support both CLI and web interfaces from the same codebase
2. **Code Reuse**: Maintain all existing game logic, AI integration, and database operations
3. **Scalability**: Enable multiple concurrent web users
4. **Maintainability**: Single codebase for both interfaces

## Technical Requirements

### Core Architecture Changes

#### 1. Interface Abstraction Layer
Create `IGameInterface` to abstract all user interaction:

```typescript
interface IGameInterface {
  displayMessage(message: string): Promise<void>;
  displayRoom(room: Room, connections: Connection[]): Promise<void>;
  promptInput(prompt: string): Promise<string>;
  showError(error: string): Promise<void>;
  showGameList(games: Game[]): Promise<number>;
  confirmAction(message: string): Promise<boolean>;
  clearScreen(): Promise<void>;
}
```

#### 2. Game Engine Separation
Extract pure game logic from `GameController` into `GameEngine`:

**Responsibilities:**
- Room navigation and state management
- AI integration (Grok client)
- Database operations
- Background room generation
- Game save/load logic

**Interface-agnostic:**
- No `console.log` or `readline` dependencies
- Returns data structures instead of printing
- Uses interface abstraction for all user communication

#### 3. Session Management
Create `GameSession` class for handling individual game instances:

```typescript
class GameSession {
  private gameEngine: GameEngine;
  private interface: IGameInterface;
  private sessionId: string;
  
  constructor(interface: IGameInterface, sessionId?: string);
  async start(): Promise<void>;
  async processCommand(command: string): Promise<void>;
  async cleanup(): Promise<void>;
}
```

### Implementation Structure

```
src/
├── core/
│   ├── GameEngine.ts          # Pure game logic (no UI dependencies)
│   ├── GameSession.ts         # Session management
│   ├── interfaces/
│   │   └── IGameInterface.ts  # Interface abstraction
│   └── types/
│       ├── Game.ts           # Shared type definitions
│       ├── Room.ts
│       └── Session.ts
├── cli/
│   ├── CLIInterface.ts        # Readline implementation
│   ├── CLIGameController.ts   # CLI-specific controller
│   └── cli.ts                 # CLI entry point
├── web/
│   ├── WebInterface.ts        # WebSocket/HTTP implementation
│   ├── WebGameController.ts   # Web-specific controller
│   ├── server.ts             # Express server
│   ├── routes/
│   │   ├── api.ts            # REST API endpoints
│   │   └── websocket.ts      # WebSocket handlers
│   └── static/
│       ├── index.html        # Game interface
│       ├── game.js           # Frontend logic
│       └── styles.css        # Basic styling
└── shared/
    ├── utils/
    └── constants.ts
```

### Interface Implementations

#### CLI Interface (`CLIInterface.ts`)
- Wraps existing `readline` functionality
- Maintains current terminal experience
- Handles console output formatting

#### Web Interface (`WebInterface.ts`)
- WebSocket-based real-time communication
- Handles multiple concurrent sessions
- JSON message protocol for commands/responses

### Web Implementation Details

#### Backend (Express + WebSocket)
- **REST API**: Game management (create, list, delete)
- **WebSocket**: Real-time game commands and responses
- **Session Management**: Track multiple concurrent players
- **Static Serving**: Serve HTML/JS/CSS frontend

#### Frontend (HTML/JS)
- **Simple Interface**: Text area for output, input field for commands
- **WebSocket Client**: Connect to game server
- **Game State**: Track current game and session
- **Responsive Design**: Works on desktop and mobile

#### Message Protocol
```typescript
// Client to Server
interface GameCommand {
  type: 'command' | 'create_game' | 'load_game';
  sessionId: string;
  data: string | GameAction;
}

// Server to Client
interface GameResponse {
  type: 'message' | 'room_update' | 'error' | 'game_list';
  sessionId: string;
  data: string | Room | Game[] | ErrorInfo;
}
```

## Implementation Steps

### Phase 1: Core Refactoring
1. Create interface abstraction (`IGameInterface`)
2. Extract `GameEngine` from `GameController`
3. Create `GameSession` wrapper
4. Implement `CLIInterface` to maintain current functionality

### Phase 2: Web Foundation
1. Set up Express server structure
2. Implement basic WebSocket handling
3. Create `WebInterface` implementation
4. Build simple HTML frontend

### Phase 3: Web Game Integration
1. Integrate `GameEngine` with web interface
2. Implement session management for multiple users
3. Add REST API for game management
4. Test concurrent user scenarios

### Phase 4: Enhancement
1. Improve web UI/UX
2. Add web-specific features (game sharing, spectating)
3. Performance optimization
4. Mobile responsiveness

## Benefits

1. **Dual Interface Support**: Same game, multiple ways to play
2. **Code Maintainability**: Single game logic codebase
3. **Scalability**: Web version supports multiple concurrent users
4. **Future Flexibility**: Easy to add more interface types
5. **Testing**: Game logic can be unit tested independently

## Considerations

### Technical Challenges
- **State Synchronization**: Ensuring consistent game state across interfaces
- **Session Management**: Handling multiple concurrent web sessions
- **Error Handling**: Interface-specific error presentation
- **Performance**: Database connection pooling for web mode

### Compatibility
- Maintain 100% backward compatibility with CLI interface
- All existing features must work identically in both modes
- Database schema remains unchanged

### Security (Web Mode)
- Session validation and cleanup
- Input sanitization for web interface
- Rate limiting for API endpoints
- Basic CORS configuration

## Testing Strategy

1. **Unit Tests**: Core game logic (interface-agnostic)
2. **Integration Tests**: Both CLI and web interfaces
3. **Concurrent User Tests**: Multiple web sessions
4. **Cross-Interface Tests**: Same game logic produces same results

## Deployment Options

### Development
```bash
# CLI mode (current)
npm run dev

# Web mode
npm run web:dev    # Start web server
```

### Production
```bash
# CLI distribution (current)
npm run build:cli

# Web deployment
npm run build:web  # Build static assets
npm run start:web  # Production web server
```

## Migration Path

1. **No Breaking Changes**: CLI interface remains identical
2. **Gradual Rollout**: Web interface can be developed alongside CLI
3. **Shared Database**: Both interfaces use same game saves
4. **Optional Web**: Web interface is additive, not replacement

## Success Criteria

- [ ] CLI interface maintains 100% current functionality
- [ ] Web interface supports all game features
- [ ] Multiple concurrent web users can play simultaneously
- [ ] Shared game logic produces identical behavior across interfaces
- [ ] Performance remains acceptable for both interfaces
- [ ] Test coverage maintained for refactored code

## Future Enhancements

- **Mobile App**: React Native interface using same core
- **Discord Bot**: Chat-based interface
- **API Access**: Third-party integrations
- **Multiplayer**: Shared worlds across interfaces