# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-08-26-new-game-command/spec.md

> Created: 2025-08-26
> Status: Not Started

## Tasks

- [x] 1. **Command Registration and Handler**
  - [x] 1.1 Write tests for new command registration and basic handler
  - [x] 1.2 Register "new" command in CommandRouter service
  - [x] 1.3 Create basic command handler that responds to "new" input
  - [x] 1.4 Implement case-insensitive command matching
  - [x] 1.5 Add command to help system with description
  - [x] 1.6 Verify all tests pass

- [ ] 2. **Confirmation Dialog System**
  - [ ] 2.1 Write tests for confirmation prompt flow
  - [ ] 2.2 Implement confirmation prompt display in GameApplication
  - [ ] 2.3 Create input validation for yes/no responses
  - [ ] 2.4 Handle programmatic mode to skip confirmation
  - [ ] 2.5 Add re-prompt logic for invalid responses
  - [ ] 2.6 Verify all tests pass

- [ ] 3. **Game State Reset Implementation**
  - [ ] 3.1 Write tests for game state reset functionality
  - [ ] 3.2 Create new Game database entry with unique ID
  - [ ] 3.3 Update GameStateManager to handle game switching
  - [ ] 3.4 Clear current room and inventory from session
  - [ ] 3.5 Reset command history while preserving navigation
  - [ ] 3.6 Clear any in-memory caches or temporary state
  - [ ] 3.7 Verify all tests pass

- [ ] 4. **Starting Room Initialization**
  - [ ] 4.1 Write tests for starting room setup
  - [ ] 4.2 Load Castle Entrance from YAML seed data
  - [ ] 4.3 Set new game's current_room_id to starting room
  - [ ] 4.4 Ensure room connections are properly loaded
  - [ ] 4.5 Display room description as if "look" was executed
  - [ ] 4.6 Verify all tests pass

- [ ] 5. **UI Integration and Error Handling**
  - [ ] 5.1 Write tests for UI updates and error scenarios
  - [ ] 5.2 Clear all existing messages from GamePane
  - [ ] 5.3 Display welcome message and introduction text
  - [ ] 5.4 Implement error handling for database failures
  - [ ] 5.5 Add fallback for missing starting room
  - [ ] 5.6 Integrate with LoggingService for debugging
  - [ ] 5.7 Ensure sub-500ms performance target
  - [ ] 5.8 Verify all tests pass