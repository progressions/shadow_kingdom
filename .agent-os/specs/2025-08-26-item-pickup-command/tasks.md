# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-08-26-item-pickup-command/spec.md

> Created: 2025-08-26
> Status: Completed

## Tasks

- [x] 1. Target Disambiguation Service Implementation
  - [x] 1.1 Write comprehensive tests for TargetDisambiguationService
    - Test "all" keyword resolution based on command context
    - Test partial name matching with fuzzy search
    - Test ambiguity handling with multiple matches
    - Test confidence scoring system (0.0-1.0)
  - [x] 1.2 Create TargetDisambiguationService class in src/services/
    - Implement context-aware target resolution
    - Add confidence scoring for parse attempts
    - Create room context builder with items, NPCs, exits
    - Design for future AI resolver integration
  - [x] 1.3 Implement parse failure context capture
    - Create ParseResult interface with success/failure states
    - Capture attempted parsers and confidence scores
    - Build comprehensive room context for AI handoff
    - Add partial match tracking for debugging
  - [x] 1.4 Verify all disambiguation tests pass

- [x] 2. Pickup Command Implementation
  - [x] 2.1 Write tests for pickup command handling
    - Test take, pickup, get commands and aliases (t, p, g)
    - Test single item pickup with various syntaxes
    - Test "take all" functionality
    - Test error cases (item not found, inventory full)
  - [x] 2.2 Extend CommandRouter with pickup commands
    - Register take/pickup/get as game commands
    - Implement shared handler for all pickup verbs
    - Add command aliases support
    - Integrate with TargetDisambiguationService
  - [x] 2.3 Implement pickup command execution
    - Validate item existence in room
    - Handle "all" target for bulk pickup
    - Return appropriate success/failure messages
    - Update room state after successful pickup
  - [x] 2.4 Verify all pickup command tests pass

- [x] 3. Inventory System Integration
  - [x] 3.1 Write tests for inventory management
    - Test adding items to inventory
    - Test inventory capacity limits (10 items)
    - Test inventory persistence across sessions
    - Test inventory state in GameSession
  - [x] 3.2 Update GameStateManager with inventory support
    - Add inventory array to GameSession interface
    - Implement addToInventory(itemId) method
    - Implement removeFromRoom(roomId, itemId) method
    - Add getInventory() and getInventoryCount() methods
  - [x] 3.3 Implement inventory capacity checking
    - Check capacity before pickup attempts
    - Provide clear error messages when full
    - Support future variable capacity upgrades
  - [x] 3.4 Verify all inventory tests pass

- [x] 4. Database Operations and Persistence
  - [x] 4.1 Write tests for database operations
    - Test item queries by room
    - Test item location updates (room → inventory)
    - Test batch operations for "take all"
    - Test transaction rollback on errors
  - [x] 4.2 Implement item location tracking
    - Use existing characterId field for player ownership
    - Set roomId=null when item picked up
    - Support batch updates for multiple items
    - Add proper database transaction handling
  - [x] 4.3 Add performance optimizations
    - Create indexes for item.roomId queries
    - Implement room item caching
    - Batch database operations for "take all"
  - [x] 4.4 Verify all database operation tests pass

- [x] 5. User Feedback and Integration Testing
  - [x] 5.1 Write integration tests for complete pickup flow
    - Test full command flow from input to feedback
    - Test interaction with existing room navigation
    - Test edge cases and error recovery
    - Test AI handoff preparation (parse failures)
  - [x] 5.2 Implement comprehensive feedback messages
    - Success messages for single/multiple/all items
    - Failure messages with helpful context
    - Disambiguation prompts for unclear targets
    - Integration with existing command feedback
  - [x] 5.3 Update room display to show items
    - Modify getCurrentRoomInfo() to include items
    - Format item list in room descriptions
    - Show item count in status pane (optional)
  - [x] 5.4 Run full test suite and verify all tests pass
  - [x] 5.5 Manual testing of pickup commands in game

## Completion Summary

All tasks have been successfully completed. The item pickup system is fully functional with:
- Complete target disambiguation service with intelligent parsing
- Full pickup, inventory, and drop command support
- Inventory persistence across game sessions
- Comprehensive test coverage (51+ tests passing)
- Integration with existing room navigation system
- Clear user feedback and error messages
- Support for "all" commands and partial name matching