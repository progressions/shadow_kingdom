# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-08-25-game-pane-text-display/spec.md

> Created: 2025-08-25
> Status: In Progress
> Last Updated: 2025-08-26

## Tasks

- [x] 1. Create Message Structure and Update GamePane Component
  - [x] 1.1 Write tests for Message interface and GamePane individual message rendering
  - [x] 1.2 Create Message interface with id, content, and timestamp fields
  - [x] 1.3 Refactor GamePane to render each message as individual Box component
  - [ ] 1.4 Update GamePane to use Message interface instead of string[]
  - [ ] 1.5 Update GameApplication to use Message objects for setMessages calls
  - [ ] 1.6 Test scrolling behavior with multiple messages
  - [ ] 1.7 Verify all tests pass

- [ ] 2. Implement Scrollback Buffer Management
  - [ ] 2.1 Write tests for scrollback buffer trimming logic
  - [ ] 2.2 Define MAX_SCROLLBACK constant (500 messages)
  - [ ] 2.3 Create buffer management utility function
  - [ ] 2.4 Update GameApplication handleCommandSubmit to use buffer management
  - [ ] 2.5 Update all setMessages calls to include buffer management
  - [ ] 2.6 Test performance with 500+ messages
  - [ ] 2.7 Verify memory usage doesn't grow unbounded
  - [ ] 2.8 Verify all tests pass

- [ ] 3. Fix Height Calculation and Layout Constraints
  - [ ] 3.1 Write tests for height calculation logic
  - [ ] 3.2 Update gameAreaHeight calculation in GameApplication component
  - [ ] 3.3 Apply explicit height constraints to GamePane container Box
  - [ ] 3.4 Add flexShrink={0} to fixed elements (InputBar, StatusPane)
  - [ ] 3.5 Ensure maxLines prop calculation accounts for terminal height properly
  - [ ] 3.6 Test layout with different terminal sizes (80x24, 120x40, etc.)
  - [ ] 3.7 Verify messages don't overflow beneath input bar
  - [ ] 3.8 Verify all tests pass

- [ ] 4. Integration Testing and Verification
  - [ ] 4.1 Test echo functionality with new message structure
  - [ ] 4.2 Test navigation commands (look, go) with proper scrolling
  - [ ] 4.3 Test long session stability (100+ commands)
  - [ ] 4.4 Verify no overflow beneath input bar in various terminal sizes
  - [ ] 4.5 Test terminal resize behavior and layout adaptation
  - [ ] 4.6 Ensure command history still works properly with new message structure
  - [ ] 4.7 Test memory usage during extended gameplay sessions
  - [ ] 4.8 Verify all integration tests pass
  - [ ] 4.9 Performance verification: smooth scrolling with full 500-message buffer

## Progress Notes

**Task 1 Status (Partially Complete):**
- ✅ Message interface created in `/src/types/Message.ts`
- ✅ GamePane refactored to render individual Box components per message
- ⚠️ GamePane still uses `string[]` instead of `Message[]` interface
- ⚠️ GameApplication still passing string arrays to GamePane
- ⚠️ Need to fully integrate Message interface throughout the component chain

**Remaining Critical Work:**
- Complete Message interface integration in GamePane and GameApplication
- Implement 500-message scrollback buffer with automatic trimming
- Fix height calculation to prevent overflow beneath input bar
- Comprehensive testing of layout constraints and scrolling behavior