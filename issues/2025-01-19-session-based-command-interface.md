# Session-Based Command Interface for AI Interaction

**Date**: 2025-01-19  
**Status**: Open  
**Priority**: Medium  
**Category**: Feature  
**Estimated Time**: 2-3 hours  

## Description

Create a simple command-line interface that allows external tools (particularly Claude Code) to interact with Shadow Kingdom games programmatically without the complexity of readline timing and input piping issues.

## Problem Statement

Currently, interacting with the game programmatically is difficult because:
- Readline interface requires complex timing for input sequences
- Bash piping with `echo` commands is unreliable for interactive sessions  
- Testing game functionality requires manual interaction or fragile scripts
- AI assistants cannot easily "play" the game to test features or debug issues

## Proposed Solution

### Session-Based Command Interface

Add command-line arguments to support session-based interaction:

```bash
# Start a persistent game session (creates/loads game, enters game mode)
npm run dev -- --start-session [--game "game-name" | --new-game "name" | --temp-game]

# Send individual commands to the running session  
npm run dev -- --cmd "look"
npm run dev -- --cmd "go north"
npm run dev -- --cmd "examine surroundings"

# End the session cleanly
npm run dev -- --end-session
```

### Key Features

1. **Session Management**: Start/end persistent game sessions without readline complexity
2. **Single Command Execution**: Send one command at a time, receive clean output
3. **Game State Persistence**: Maintain game state between individual command calls
4. **Clean Output**: Structured output without interactive prompts or formatting
5. **Multiple Game Support**: Create new games, load existing games, or use temporary test games

## Technical Implementation

### Command Line Arguments

- `--start-session`: Initialize a persistent game session
  - `--game "name"`: Load specific existing game
  - `--new-game "name"`: Create new game with given name  
  - `--temp-game`: Create temporary game for testing
- `--cmd "command"`: Execute single command in active session
- `--end-session`: Cleanly terminate active session

### Session State Management

```typescript
interface GameSession {
  gameId: number;
  sessionId: string;
  mode: 'menu' | 'game';
  lastActivity: Date;
}

class SessionManager {
  startSession(options: SessionOptions): SessionInfo
  executeCommand(sessionId: string, command: string): CommandResult  
  endSession(sessionId: string): void
}
```

### Output Format

**Standard Command Output:**
```
> look

Grand Entrance Hall
===================
[room description]
Region: Elegant Mansion [CENTER]
Exits: north, east, west

SESSION_STATUS: active
ROOM_ID: 123
GAME_ID: 456
```

**Error Output:**
```
ERROR: You can't go south from here.
SESSION_STATUS: active
```

**Session Management Output:**
```
SESSION_STARTED: session-123
GAME_LOADED: TestGame (ID: 456)
MODE: game
```

## Use Cases

### AI Testing and Interaction
```bash
# Start testing session
npm run dev -- --start-session --temp-game

# Test region generation
npm run dev -- --cmd "look"
npm run dev -- --cmd "go north" 
npm run dev -- --cmd "look"    # Check if new region appears

# Clean up
npm run dev -- --end-session
```

### Bug Investigation
```bash
# Load specific problematic game
npm run dev -- --start-session --game "BuggyGame"

# Navigate to problem area
npm run dev -- --cmd "go west"
npm run dev -- --cmd "go west" 
npm run dev -- --cmd "look"    # Observe issue

npm run dev -- --end-session
```

### Automated Testing
```bash
#!/bin/bash
npm run dev -- --start-session --new-game "AutoTest"
npm run dev -- --cmd "look" | grep "Region:"  # Verify region display
npm run dev -- --cmd "go north"
npm run dev -- --cmd "look" | grep "Region:"  # Check region consistency  
npm run dev -- --end-session
```

## Implementation Strategy

### Phase 1: Basic Session Management
1. Add command-line argument parsing for session commands
2. Implement session state storage (file-based or in-memory)
3. Create session manager class with start/end methods
4. Update main application entry point to handle session vs interactive modes

### Phase 2: Command Execution
1. Implement `--cmd` argument handling
2. Execute commands against active session
3. Return clean output without interactive prompts
4. Handle command errors gracefully

### Phase 3: Enhanced Features
1. Add game creation and loading options  
2. Implement session timeout and cleanup
3. Add structured output options (JSON mode)
4. Create helper scripts for common testing scenarios

## Benefits

1. **Natural AI Interaction**: Claude Code can play the game interactively to test features
2. **Reliable Testing**: No more bash piping timing issues
3. **Debug Efficiency**: Easy to investigate specific game scenarios
4. **Automated Testing**: Support for programmatic game testing
5. **Development Workflow**: Faster iteration when testing game mechanics

## Acceptance Criteria

- [ ] Can start a game session with `--start-session`
- [ ] Can execute individual commands with `--cmd "command"`
- [ ] Can end sessions cleanly with `--end-session`  
- [ ] Session state persists between command executions
- [ ] Output is clean and parseable (no interactive prompts)
- [ ] Supports creating new games, loading existing games, and temporary games
- [ ] Error handling provides meaningful feedback
- [ ] Session management prevents conflicts between multiple sessions

## Technical Notes

- Use process-based session management or simple file-based state persistence
- Avoid complex IPC - keep implementation straightforward  
- Ensure backward compatibility with existing interactive mode
- Consider session timeout to prevent abandoned sessions
- Clean output should be easily parseable but still human-readable

## Related

- Complements existing game testing infrastructure
- Enhances AI integration capabilities  
- Supports automated testing initiatives
- Improves developer debugging workflow

---

**Implementation Priority**: This feature would significantly improve AI interaction with the game and streamline testing workflows, making it easier to verify game mechanics and debug issues programmatically.