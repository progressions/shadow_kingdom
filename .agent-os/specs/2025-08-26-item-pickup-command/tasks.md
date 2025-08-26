# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-08-26-item-pickup-command/spec.md

> Created: 2025-08-26
> Status: Ready for Implementation

## Tasks

- [ ] 1. Target Disambiguation Service Implementation
  - [ ] 1.1 Write comprehensive tests for TargetDisambiguationService
    - Test "all" keyword resolution based on command context
    - Test partial name matching with fuzzy search
    - Test ambiguity handling with multiple matches
    - Test confidence scoring system (0.0-1.0)
  - [ ] 1.2 Create TargetDisambiguationService class in src/services/
    - Implement context-aware target resolution
    - Add confidence scoring for parse attempts
    - Create room context builder with items, NPCs, exits
    - Design for future AI resolver integration
  - [ ] 1.3 Implement parse failure context capture
    - Create ParseResult interface with success/failure states
    - Capture attempted parsers and confidence scores
    - Build comprehensive room context for AI handoff
    - Add partial match tracking for debugging
  - [ ] 1.4 Verify all disambiguation tests pass

- [ ] 2. Pickup Command Implementation
  - [ ] 2.1 Write tests for pickup command handling
    - Test take, pickup, get commands and aliases (t, p, g)
    - Test single item pickup with various syntaxes
    - Test "take all" functionality
    - Test error cases (item not found, inventory full)
  - [ ] 2.2 Extend CommandRouter with pickup commands
    - Register take/pickup/get as game commands
    - Implement shared handler for all pickup verbs
    - Add command aliases support
    - Integrate with TargetDisambiguationService
  - [ ] 2.3 Implement pickup command execution
    - Validate item existence in room
    - Handle "all" target for bulk pickup
    - Return appropriate success/failure messages
    - Update room state after successful pickup
  - [ ] 2.4 Verify all pickup command tests pass

- [ ] 3. Inventory System Integration
  - [ ] 3.1 Write tests for inventory management
    - Test adding items to inventory
    - Test inventory capacity limits (10 items)
    - Test inventory persistence across sessions
    - Test inventory state in GameSession
  - [ ] 3.2 Update GameStateManager with inventory support
    - Add inventory array to GameSession interface
    - Implement addToInventory(itemId) method
    - Implement removeFromRoom(roomId, itemId) method
    - Add getInventory() and getInventoryCount() methods
  - [ ] 3.3 Implement inventory capacity checking
    - Check capacity before pickup attempts
    - Provide clear error messages when full
    - Support future variable capacity upgrades
  - [ ] 3.4 Verify all inventory tests pass

- [ ] 4. Database Operations and Persistence
  - [ ] 4.1 Write tests for database operations
    - Test item queries by room
    - Test item location updates (room → inventory)
    - Test batch operations for "take all"
    - Test transaction rollback on errors
  - [ ] 4.2 Implement item location tracking
    - Use existing characterId field for player ownership
    - Set roomId=null when item picked up
    - Support batch updates for multiple items
    - Add proper database transaction handling
  - [ ] 4.3 Add performance optimizations
    - Create indexes for item.roomId queries
    - Implement room item caching
    - Batch database operations for "take all"
  - [ ] 4.4 Verify all database operation tests pass

- [ ] 5. User Feedback and Integration Testing
  - [ ] 5.1 Write integration tests for complete pickup flow
    - Test full command flow from input to feedback
    - Test interaction with existing room navigation
    - Test edge cases and error recovery
    - Test AI handoff preparation (parse failures)
  - [ ] 5.2 Implement comprehensive feedback messages
    - Success messages for single/multiple/all items
    - Failure messages with helpful context
    - Disambiguation prompts for unclear targets
    - Integration with existing command feedback
  - [ ] 5.3 Update room display to show items
    - Modify getCurrentRoomInfo() to include items
    - Format item list in room descriptions
    - Show item count in status pane (optional)
  - [ ] 5.4 Run full test suite and verify all tests pass
  - [ ] 5.5 Manual testing of pickup commands in game