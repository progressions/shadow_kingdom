# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-26-new-game-command/spec.md

## Technical Requirements

### Command Implementation
- Register "new" command in CommandRouter service with appropriate handler
- Command should work in both interactive TUI mode and programmatic execution mode
- Implement case-insensitive command matching ("new", "NEW", "New" all work)

### Confirmation Dialog Flow
- Display confirmation prompt: "Are you sure you want to start a new game? Your current progress will be lost. (yes/no)"
- Accept "yes", "y", "YES", "Y" as confirmation
- Accept "no", "n", "NO", "N" as cancellation
- Any other input should re-prompt for valid response
- In programmatic mode (--cmd flag), skip confirmation and proceed directly

### Game State Reset Process
1. Create new Game entry in database with unique ID
2. Reset GameStateManager's current game reference to new game ID
3. Clear the current room and inventory from session state
4. Clear command history in the TUI (but preserve it for up/down arrow navigation)
5. Reset any in-memory caches or temporary state

### Starting Room Initialization
- Load the default starting room from the YAML seed data (Castle Entrance)
- Set the new game's current_room_id to the starting room
- Ensure room connections are properly loaded for navigation
- Display the room's full description as if "look" command was executed

### Message Display Sequence
1. Clear all existing messages from GamePane
2. Display game title/banner (optional enhancement)
3. Show introduction text: "Welcome to Shadow Kingdom! Your adventure begins..."
4. Display starting room description with available exits
5. Show initial prompt for user input

### Error Handling
- If database creation fails, show error message and maintain current game state
- If starting room cannot be found, fall back to creating a basic default room
- Log all errors to the logging service for debugging
- Provide user-friendly error messages without technical details

### Integration Points
- **GameEngine**: Call initialization methods for new game setup
- **GameStateManager**: Update to handle game switching and state reset
- **CommandRouter**: Register new command with appropriate priority
- **PrismaService**: Create new game record and handle transactions
- **LoggingService**: Log new game creation with session details
- **GameApplication**: Handle UI updates and message clearing

### Performance Considerations
- New game creation should complete in under 500ms
- Database transaction should be atomic (all or nothing)
- Avoid memory leaks by properly cleaning up old game state
- Cache invalidation for any room or game-specific caches