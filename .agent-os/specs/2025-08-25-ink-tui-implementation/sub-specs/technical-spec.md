# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-08-25-ink-tui-implementation/spec.md

> Created: 2025-08-25
> Version: 1.0.0

## Technical Requirements

### Ink Framework Integration
Replace current readline-based input with Ink components using React-like patterns

### Three-Component Layout
- **GamePane**: flex-grow for height to echo back user input exactly (no command processing initially)
- **InputBar**: fixed height with box borders for command input
- **StatusPane**: fixed 2-line height for static placeholder information

### Simple Echo System
Initially implement basic text echoing - when user presses Enter, display their input in the GamePane (MessageType integration for Phase 2)

### Command History Service
Interface with existing HistoryManager for arrow key navigation and persistent storage

### Terminal Responsiveness
Handle terminal resize events and maintain minimum 80x24 character compatibility

### Input State Management
Manage command input state, cursor position, and text entry with proper React state patterns

### Scroll Behavior
Implement auto-scroll in GamePane when new content exceeds visible area

### Border Rendering
Use Ink's Box component with ASCII borders for input area visual separation

### Clipboard Integration
- **Text Selection**: Enable text selection from GamePane content using standard terminal selection (mouse drag or Shift+arrow keys)
- **Copy Operation**: Support Ctrl+C for copying selected text from game output to system clipboard
- **Paste Operation**: Support Ctrl+V for pasting clipboard content into InputBar command field
- **Terminal Compatibility**: Ensure clipboard operations work across major terminal applications (iTerm2, Terminal.app, Windows Terminal, etc.)

## External Dependencies

- **ink** (^3.2.0) - Already in package.json, React-inspired framework for building terminal UIs
- **ink-text-input** (^4.0.3) - Already in package.json, text input component for Ink applications
- **react** (^17.0.2) - Already in package.json, required peer dependency for Ink

**Justification:** All required dependencies are already present in the existing package.json, indicating the previous implementation had planned for Ink integration. No new external dependencies needed.