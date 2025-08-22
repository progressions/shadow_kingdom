# Comprehensive Logging System for Game Sessions and AI Responses

**Created**: 2025-08-22  
**Completed**: 2025-08-22  
**Priority**: High  
**Category**: Development Tools / Debugging  
**Estimated Effort**: 4-6 hours  
**Status**: ✅ **Completed**

## Problem Statement

Currently, Shadow Kingdom lacks comprehensive logging capabilities, making it difficult to:
- Debug game sessions and user interactions
- Monitor AI response quality and performance
- Analyze player behavior patterns
- Troubleshoot issues without reproducing them manually
- Follow game progression through log files

## Requirements

### 1. AI Response Logging
- **File**: `logs/grok_responses.log`
- **Content**: All Grok API requests and responses
- **Format**: Structured JSON with timestamps
- **Include**: Prompts, responses, token usage, error details

### 2. Game Session Logging
- **Files**: 
  - `logs/development.log` (NODE_ENV=development)
  - `logs/test.log` (NODE_ENV=test)
  - `logs/production.log` (NODE_ENV=production)
- **Content**: Complete game interaction log
- **Real-time**: Support `tail -f` for live monitoring

### 3. User Input Logging
- Log all user commands with `>` prefix
- Examples:
  ```
  [2025-08-22 14:30:15] > look
  [2025-08-22 14:30:16] > examine guardian
  [2025-08-22 14:30:18] > go north
  [2025-08-22 14:30:20] > attack ghost
  ```

### 4. System Output Logging
- Room descriptions and environmental text
- Character dialogue and interactions
- Combat messages and system notifications
- Error messages and validation feedback

## Detailed Logging Requirements

### Game Session Events
```
[2025-08-22 14:30:15] SESSION_START: Player entered game (Game ID: 1, Room: Grand Entrance Hall)
[2025-08-22 14:30:15] > look
[2025-08-22 14:30:16] ROOM_DESCRIPTION: Grand Entrance Hall - A magnificent foyer with...
[2025-08-22 14:30:16] CHARACTERS_PRESENT: • Ancient Guardian (neutral)
[2025-08-22 14:30:16] EXITS_AVAILABLE: north, south, east
[2025-08-22 14:30:17] > examine guardian
[2025-08-22 14:30:18] CHARACTER_EXAMINE: A spectral protector of ancient secrets...
[2025-08-22 14:30:19] > talk guardian  
[2025-08-22 14:30:20] DIALOGUE: Ancient Guardian says "Welcome, traveler."
[2025-08-22 14:30:22] > go north
[2025-08-22 14:30:23] MOVEMENT: Moving north to Scholar's Library
[2025-08-22 14:30:23] ROOM_DESCRIPTION: Scholar's Library - Towering bookshelves...
[2025-08-22 14:30:25] > attack ghost
[2025-08-22 14:30:26] COMBAT_START: Attacking Ghost
[2025-08-22 14:30:26] COMBAT_HIT: You strike the Ghost for 8 damage
[2025-08-22 14:30:27] COMBAT_DEATH: You killed the Ghost
[2025-08-22 14:30:28] LOOT_DROP: Ghost dropped: Ancient Key, Silver Coin
```

### AI Response Logging
```json
{
  "timestamp": "2025-08-22T14:30:15.123Z",
  "request_id": "req_001",
  "endpoint": "room_generation",
  "prompt": "Generate a room north of the Library...",
  "response": {
    "name": "Private Study",
    "description": "A cozy reading nook...",
    "connections": ["south: back to library"]
  },
  "tokens": {
    "input": 45,
    "output": 28
  },
  "duration_ms": 1250,
  "success": true
}
```

### Error and Debug Logging
```
[2025-08-22 14:30:15] ERROR: Failed to load room 99: Room not found
[2025-08-22 14:30:16] WARNING: Player inventory full, cannot pick up Ancient Key
[2025-08-22 14:30:17] DEBUG: Background generation triggered for room 5
[2025-08-22 14:30:18] AI_FALLBACK: Command "examine mysterious orb" fell back to AI processing
```

## Technical Implementation

### 1. Logger Service
```typescript
interface LoggerService {
  // Game session logging
  logUserInput(command: string): void;
  logSystemOutput(message: string, type: 'room' | 'dialogue' | 'combat' | 'system'): void;
  logGameEvent(event: GameEvent): void;
  
  // AI response logging  
  logGrokRequest(prompt: string, endpoint: string): string; // returns request_id
  logGrokResponse(requestId: string, response: any, tokens?: TokenUsage): void;
  logGrokError(requestId: string, error: Error): void;
}

interface GameEvent {
  type: 'session_start' | 'movement' | 'combat' | 'dialogue' | 'room_generation';
  details: Record<string, any>;
  gameId?: number;
  playerId?: number;
  roomId?: number;
}
```

### 2. Integration Points
- **GameController**: Log user inputs and system responses
- **TUIInterface**: Log all display output
- **SessionInterface**: Log programmatic commands
- **GrokClient**: Log all AI requests/responses
- **Combat System**: Log battle events
- **Room Generation**: Log background generation events

### 3. Log Rotation and Management
- Daily log rotation (keep 30 days)
- Configurable log levels (ERROR, WARN, INFO, DEBUG)
- Environment-specific log files
- Optional log compression for older files

### 4. Configuration Options
```bash
# Environment variables
LOG_LEVEL=debug                    # error, warn, info, debug
LOG_TO_CONSOLE=true               # Also log to console
LOG_ROTATION_DAYS=30              # How many days to keep
LOG_AI_RESPONSES=true             # Log Grok interactions
LOG_USER_COMMANDS=true            # Log player input
LOG_SYSTEM_OUTPUT=true            # Log game responses
```

## Success Criteria

### Core Functionality
- [x] **Grok responses logged** to `logs/grok_responses.log` with structured JSON format
- [x] **Game sessions logged** to environment-specific log files
- [x] **User input captured** with `>` prefix and timestamps
- [x] **System output logged** including room descriptions, dialogue, combat messages
- [x] **Real-time monitoring** supports `tail -f logs/development.log`

### Integration Quality  
- [x] **All user interfaces** (TUI, Session) log consistently
- [x] **All AI interactions** captured with request/response details
- [x] **Error handling** includes proper logging context
- [x] **Performance impact** minimal (< 5ms overhead per log entry - validated at ~0.17ms average)

### Developer Experience
- [x] **Easy to follow** game sessions through logs
- [x] **Debugging enhanced** with detailed event tracking
- [x] **AI monitoring** enabled through structured response logs
- [x] **Log rotation** prevents disk space issues (30-day rotation configured)

## Implementation Plan

### Phase 1: Core Logger Service
1. Create `LoggerService` class with file writing capabilities
2. Implement environment-specific log file routing
3. Add timestamp formatting and structured logging
4. Create log directory and file management

### Phase 2: Game Session Integration
1. Integrate with GameController for user input/output logging
2. Add TUIInterface logging for all display messages
3. Implement SessionInterface logging for programmatic access
4. Add movement, combat, and dialogue event logging

### Phase 3: AI Response Logging
1. Integrate with GrokClient for request/response logging
2. Add structured JSON format for AI interactions
3. Include token usage and performance metrics
4. Add error handling and retry logging

### Phase 4: Advanced Features
1. Implement log rotation and cleanup
2. Add configurable log levels
3. Create log analysis utilities
4. Add optional log compression

## Files to Create/Modify

### New Files
- `src/services/loggerService.ts` - Core logging service
- `src/types/logging.ts` - Logging interfaces and types
- `src/utils/logRotation.ts` - Log rotation utilities

### Modified Files
- `src/gameController.ts` - Add session and input/output logging
- `src/ui/TUIInterface.ts` - Log all display messages
- `src/sessionInterface.ts` - Log programmatic commands
- `src/ai/grokClient.ts` - Add AI request/response logging
- `src/services/serviceFactory.ts` - Add LoggerService to DI

### Directory Structure
```
logs/
├── grok_responses.log          # AI interactions
├── development.log             # Dev environment game sessions
├── test.log                    # Test environment logs
├── production.log              # Production game logs
├── archived/                   # Rotated logs
│   ├── development.2025-08-21.log
│   └── grok_responses.2025-08-21.log
└── .gitignore                  # Exclude logs from git
```

## Expected Benefits

### For Developers
- **Faster debugging**: Complete session history available
- **AI monitoring**: Track response quality and performance
- **Issue reproduction**: Replay user sessions from logs
- **Performance analysis**: Identify bottlenecks and slow operations

### For Operations  
- **Live monitoring**: `tail -f` for real-time session tracking
- **Error detection**: Centralized error logging and alerting
- **Usage analytics**: Player behavior and command patterns
- **System health**: AI response rates and failure modes

### For Users (Indirect)
- **Faster bug fixes**: Better debugging leads to quicker resolutions
- **Improved AI**: Response quality monitoring enables improvements
- **Session recovery**: Potential to restore lost game sessions
- **Better support**: Detailed logs help with user assistance

This comprehensive logging system will transform Shadow Kingdom's debuggability and monitoring capabilities, enabling developers to follow complete game sessions and monitor AI performance in real-time.