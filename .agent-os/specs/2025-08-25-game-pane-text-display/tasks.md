# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-08-25-game-pane-text-display/spec.md

> Created: 2025-08-25
> Status: Ready for Implementation

## Tasks

- [ ] 1. Create Message Structure and Update GamePane Component
  - [ ] 1.1 Write tests for Message interface and GamePane individual message rendering
  - [ ] 1.2 Create Message interface with id, content, and timestamp fields
  - [ ] 1.3 Refactor GamePane to render each message as individual Box component
  - [ ] 1.4 Remove join('\n') pattern and implement proper key props
  - [ ] 1.5 Test scrolling behavior with multiple messages
  - [ ] 1.6 Verify all tests pass

- [ ] 2. Implement Scrollback Buffer Management
  - [ ] 2.1 Write tests for scrollback buffer trimming logic
  - [ ] 2.2 Define MAX_SCROLLBACK constant (500 messages)
  - [ ] 2.3 Update handleCommandSubmit to trim messages array when exceeding buffer
  - [ ] 2.4 Update all setMessages calls to include buffer management
  - [ ] 2.5 Test performance with 500+ messages
  - [ ] 2.6 Verify all tests pass

- [ ] 3. Fix Height Calculation and Layout Constraints
  - [ ] 3.1 Write tests for height calculation logic
  - [ ] 3.2 Update gameAreaHeight calculation to properly account for UI elements
  - [ ] 3.3 Apply explicit height constraints to GamePane container Box
  - [ ] 3.4 Add flexShrink={0} to fixed elements (InputBar, StatusPane)
  - [ ] 3.5 Ensure maxLines prop is properly passed and used
  - [ ] 3.6 Test layout with different terminal sizes
  - [ ] 3.7 Verify all tests pass

- [ ] 4. Integration Testing and Verification
  - [ ] 4.1 Test echo functionality with new message structure
  - [ ] 4.2 Test navigation commands (look, go) with proper scrolling
  - [ ] 4.3 Test long session stability (100+ commands)
  - [ ] 4.4 Verify no overflow beneath input bar
  - [ ] 4.5 Test terminal resize behavior
  - [ ] 4.6 Ensure command history still works properly
  - [ ] 4.7 Verify all integration tests pass