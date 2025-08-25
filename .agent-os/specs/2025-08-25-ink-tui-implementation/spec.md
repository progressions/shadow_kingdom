# Spec Requirements Document

> Spec: Ink-based TUI Implementation
> Created: 2025-08-25
> Status: Planning

## Overview

Implement a modern three-section terminal interface using Ink (React for terminals) to replace the current readline-based interface in Shadow Kingdom. The new TUI will feature a scrollable game pane, bordered input bar, and compact status pane to enhance the text adventure gameplay experience.

## User Stories

### Modern Terminal Experience
As a Shadow Kingdom player, I want a professional-looking terminal interface with clear visual sections, so that I can easily distinguish between game content, my input area, and current status without confusion.

The player opens the game and sees three distinct areas: the main game content scrolling in the top section, a clearly marked input area with borders where they type commands, and a status line showing their current location and game state. When they type commands, the input area stays fixed while game responses scroll smoothly above.

### Seamless Command Input
As a Shadow Kingdom player, I want to use arrow keys to navigate through my previous commands and have my input clearly separated from game output, so that I can efficiently replay actions and maintain focus on gameplay.

The player can press up/down arrows to cycle through command history while the input area remains visually distinct from game content. The input area has clear borders and stays at a fixed position, making it obvious where to type next commands.

## Spec Scope

1. **Game Pane Component** - Scrollable content area spanning most of screen height that initially echoes back user input exactly (no command processing)
2. **Bordered Input Bar** - Fixed position input field with ASCII borders for command entry with visual separation from content
3. **Status Pane Display** - Compact 2-line status area below input showing basic static information (initially placeholder text)
4. **Command History Integration** - Arrow key navigation through previous commands with persistent storage across sessions
5. **Responsive Layout System** - Adaptive three-section layout that gracefully handles terminal resizing and maintains usability

## Out of Scope

- Mouse interaction support
- Graphical terminal features beyond ASCII characters
- Multiple window or tab management
- Custom color themes beyond basic message type differentiation
- Complex animations or transitions
- Command parsing and game logic integration (Phase 2 feature)

## Expected Deliverable

1. Functioning Ink-based TUI with three distinct visual sections that launches when running `npm run dev`
2. Input bar with borders that accepts commands and maintains command history navigation with arrow keys
3. Game pane that echoes back typed input exactly with smooth scrolling behavior (no command processing)

## Spec Documentation

- Tasks: @.agent-os/specs/2025-08-25-ink-tui-implementation/tasks.md
- Technical Specification: @.agent-os/specs/2025-08-25-ink-tui-implementation/sub-specs/technical-spec.md