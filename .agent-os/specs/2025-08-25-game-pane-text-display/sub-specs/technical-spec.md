# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-25-game-pane-text-display/spec.md

> Created: 2025-08-25
> Version: 1.0.0

## Technical Requirements

### Message Structure Implementation
- Create a Message interface with id (string), content (string), and timestamp (Date) fields
- Generate unique message IDs using counter or timestamp-based approach
- Maintain messages as structured objects instead of plain strings

### GamePane Component Refactoring
- Replace single Text component with mapped Box components for each message
- Use React.useMemo to optimize message slicing calculations
- Implement proper key prop using message ID or index for React reconciliation
- Remove join('\n') pattern that causes rendering issues

### Height and Layout Management
- Calculate gameAreaHeight using terminal dimensions minus fixed UI elements
- Apply explicit height prop to GamePane container Box
- Use flexShrink={0} on fixed elements (InputBar, StatusPane)
- Pass maxLines prop from GameApplication to GamePane
- Account for padding (2 lines) in available line calculations

### Scrollback Buffer
- Define MAX_SCROLLBACK constant (500 messages)
- Implement array slicing when messages exceed buffer limit
- Apply trimming in setMessages callbacks to prevent unbounded growth
- Maintain performance during long sessions

### React Ink Box Structure
- Use flexDirection="column" for vertical layout
- Apply explicit height constraints to prevent overflow
- Ensure proper nesting of Box components
- Avoid flexGrow={1} on scrollable content area

## UI/UX Specifications

- Messages appear at bottom and scroll upward as new ones arrive
- Input bar remains fixed at bottom of terminal
- Status pane displays below input bar without overlap
- Smooth scrolling behavior without visual artifacts
- Consistent rendering across different terminal sizes

## Integration Requirements

- Maintain compatibility with existing CommandRouter integration
- Preserve command history functionality in InputBar
- Support both interactive and programmatic modes
- Ensure proper cleanup in useEffect hooks

## Performance Criteria

- Message rendering < 16ms for smooth 60fps updates
- Memory usage stable over 1000+ message sessions
- No performance degradation with scrollback buffer full
- Responsive command input even during rapid message updates