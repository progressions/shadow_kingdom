# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-26-interactive-room-navigation/spec.md

> Created: 2025-08-26
> Version: 1.0.0

## Technical Requirements

### Movement Command System

#### Command Registration
- Register directional movement commands in CommandRouter during initialization
- Support both full direction names: `north`, `south`, `east`, `west`, `up`, `down`
- Support abbreviated forms: `n`, `s`, `e`, `w`, `u`, `d`
- Commands should be case-insensitive and handle whitespace variations

#### Command Parsing Enhancement
- Extend `ParsedCommand` interface to properly categorize movement commands with `type: 'movement'`
- Set `direction` property to normalized direction string (e.g., "north" for both "n" and "north")
- Maintain original command in `raw` property for error reporting
- Set confidence score based on exact vs abbreviated match (1.0 for exact, 0.9 for abbreviated)

#### Movement Command Handlers
```typescript
// Required command handlers to implement
async handleNorthCommand(args: string[]): Promise<string>
async handleSouthCommand(args: string[]): Promise<string>  
async handleEastCommand(args: string[]): Promise<string>
async handleWestCommand(args: string[]): Promise<string>
async handleUpCommand(args: string[]): Promise<string>
async handleDownCommand(args: string[]): Promise<string>

// Generic movement handler
async handleMovementCommand(direction: string): Promise<string>
```

### Room Display System

#### Room Description Generation
- Generate comprehensive room descriptions including:
  - Room name and primary description
  - Atmospheric details and mood
  - Visible exits with direction labels
  - Interactive elements (items, characters, special features)
  - Current player context (health, inventory hints)

#### Exit Display Format
```typescript
// Exit display requirements
interface RoomDisplayOptions {
  showExitDetails: boolean;     // Show exit descriptions
  showExitCount: boolean;       // Show number of available exits  
  highlightBlockedExits: boolean; // Indicate locked/blocked exits
  sortExitsAlphabetically: boolean; // Consistent exit ordering
}

// Example output format:
// "Exits: north (leads to the dark corridor), east (locked wooden door), south"
```

#### Dynamic Content Integration
- Display items present in room with brief descriptions
- Show characters with their current status/mood
- Highlight interactive elements that accept commands
- Update room descriptions based on player actions and world state

### Service Integration Architecture

#### CommandRouter Integration
```typescript
// Required CommandRouter enhancements
class CommandRouter {
  // Add movement command registration
  private registerMovementCommands(): void {
    this.registerGameCommand({
      name: 'north', aliases: ['n'],
      description: 'Move north',
      handler: async (args) => await this.handleMovementCommand('north')
    });
    // ... repeat for all directions
  }

  // Enhanced command validation for movement
  async validateMovementCommand(direction: string): Promise<CommandValidationResult> {
    const currentRoom = await this.gameStateManager.getCurrentRoom();
    const validation = await this.roomNavigationEngine.validateMovement(currentRoom.id, direction);
    
    return {
      isValid: validation.isValid,
      error: validation.error,
      availableExits: validation.availableDirections
    };
  }
}
```

#### GameStateManager Integration
```typescript
// Required GameStateManager enhancements
class GameStateManager {
  // Track room transitions for history and undo
  private roomHistory: number[] = [];
  
  async moveToRoom(roomId: number): Promise<void> {
    const currentRoomId = await this.getCurrentRoomId();
    if (currentRoomId) {
      this.roomHistory.push(currentRoomId);
    }
    
    await this.setCurrentRoom(roomId);
    await this.updateLastActivity();
  }

  // Get available exits for current room
  async getAvailableExits(): Promise<ExitInfo[]> {
    const currentRoom = await this.getCurrentRoom();
    return await this.roomNavigationEngine.getAvailableExits(currentRoom.id);
  }
}
```

#### RoomNavigationEngine Integration
```typescript
// Required RoomNavigationEngine enhancements
class RoomNavigationEngine {
  // Core movement validation
  async validateMovement(fromRoomId: number, direction: string): Promise<MovementValidationResult> {
    const connection = await this.findConnection(fromRoomId, direction);
    
    if (!connection) {
      const availableDirections = await this.getAvailableDirections(fromRoomId);
      return {
        isValid: false,
        error: `You cannot go ${direction}. Available exits: ${availableDirections.join(', ')}`,
        availableDirections
      };
    }

    return {
      isValid: true,
      targetRoomId: connection.to_room_id,
      connection
    };
  }

  // Execute validated movement
  async executeMovement(fromRoomId: number, direction: string): Promise<MovementResult> {
    const validation = await this.validateMovement(fromRoomId, direction);
    
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error
      };
    }

    const targetRoom = await this.prismaService.room.findUnique({
      where: { id: validation.targetRoomId },
      include: { region: true, items: true, characters: true }
    });

    await this.gameStateManager.moveToRoom(validation.targetRoomId!);

    return {
      success: true,
      newRoom: targetRoom!,
      movementDescription: await this.generateMovementDescription(direction, targetRoom!)
    };
  }

  // Generate rich room descriptions
  async generateRoomDescription(room: Room): Promise<string> {
    const exits = await this.getAvailableExits(room.id);
    const items = await this.getRoomItems(room.id);
    const characters = await this.getRoomCharacters(room.id);
    
    return this.formatRoomDescription({
      room,
      exits,
      items,
      characters
    });
  }
}
```

### Error Handling and Validation

#### Movement Error Types
```typescript
enum MovementError {
  NO_EXIT = 'NO_EXIT',
  LOCKED_DOOR = 'LOCKED_DOOR', 
  MISSING_KEY = 'MISSING_KEY',
  BLOCKED_PATH = 'BLOCKED_PATH',
  INVALID_DIRECTION = 'INVALID_DIRECTION',
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  DATABASE_ERROR = 'DATABASE_ERROR'
}

interface MovementErrorResponse {
  error: MovementError;
  message: string;
  suggestions?: string[];
  requiredItem?: string;
  alternativeExits?: string[];
}
```

#### Input Validation
- Validate direction strings against supported directions
- Handle typos and similar direction names with suggestions
- Provide helpful error messages for invalid input
- Suggest valid alternatives when movement fails

#### Database Error Recovery
- Handle database connection failures gracefully
- Implement retry logic for transient failures
- Fallback to cached room data when possible
- Log errors for debugging without breaking user experience

## UI/UX Specifications

### Room Display Layout
```
=====================================
[ROOM NAME]
[Room description paragraph with atmospheric details]

[Items present in room, if any]
[Characters present in room, if any]

Exits: north, east (locked), south
=====================================
```

### Movement Feedback Design

#### Successful Movement
```
You head north through the stone archway.

[NEW ROOM DISPLAY]
```

#### Failed Movement  
```
You cannot go north. There is no exit in that direction.
Available exits: east, south, west
```

#### Locked/Blocked Movement
```
You try to go east, but the heavy wooden door is locked.
A rusty keyhole suggests you need to find the right key.
Available exits: north, south, west
```

### Status Integration
- Update StatusPane with current room information
- Display available exit count in status bar
- Show movement history or breadcrumb navigation
- Indicate exploration progress within regions

### Performance Optimization

#### Database Query Efficiency
- Use Prisma's `include` to fetch related data in single queries
- Implement connection pooling and query caching for room data
- Prefetch adjacent room data for faster navigation
- Use indexes on connection queries (from_room_id, direction)

#### Memory Management
- Cache recently visited room descriptions
- Limit room history size to prevent memory bloat
- Lazy load room content (items, characters) only when needed
- Implement LRU cache for room display data

#### Response Time Requirements
- Room transitions must complete within 200ms
- Room description generation within 100ms  
- Movement validation within 50ms
- Error message generation within 25ms

## Performance Criteria

### Response Time Targets
- **Movement Command Processing**: < 200ms end-to-end
- **Room Description Generation**: < 100ms for complex rooms
- **Movement Validation**: < 50ms for database queries
- **Error Response**: < 25ms for validation failures

### Throughput Requirements
- Support up to 10 movement commands per second
- Handle concurrent room queries without blocking
- Process multiple validation requests simultaneously
- Maintain performance with 1000+ rooms in database

### Memory Usage Limits
- Room description cache: Maximum 50 recently visited rooms
- Movement history: Maximum 100 recent moves
- Connection cache: Maximum 500 frequently used connections
- Total navigation system memory: < 10MB overhead

### Database Performance
- Room queries must use proper indexes on id, region_id
- Connection queries indexed on (from_room_id, direction)
- Batch related queries using Prisma's include functionality
- Connection pool size: minimum 5, maximum 20 connections

## Approach

### Implementation Phases

#### Phase 1: Core Movement Commands (2-3 hours)
1. Register directional commands in CommandRouter
2. Implement basic movement validation in RoomNavigationEngine
3. Create movement command handlers with database integration
4. Add basic movement feedback and error messages

#### Phase 2: Room Display Enhancement (2-3 hours)  
1. Implement comprehensive room description generation
2. Add exit information display with formatting
3. Integrate item and character display in room descriptions
4. Create consistent room display layout and styling

#### Phase 3: Integration and Polish (1-2 hours)
1. Integrate movement system with GameStateManager state updates
2. Add movement history tracking and breadcrumb navigation
3. Implement performance optimizations and caching
4. Add comprehensive error handling and user feedback

### Integration Strategy
- Leverage existing service dependency injection pattern
- Maintain backward compatibility with current command system
- Use established Prisma ORM patterns for all database operations
- Follow React Ink component communication patterns for UI updates

### Testing Strategy
- Unit tests for movement validation logic
- Integration tests for command routing and execution
- Performance tests for room transition timing
- End-to-end tests for complete navigation workflows