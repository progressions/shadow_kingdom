# Spec Requirements Document

> Spec: New Game Command
> Created: 2025-08-26

## Overview

Implement a "new" command that allows users to start a fresh game session, creating a new game database entry and resetting all game state. This feature enables players to restart their adventure at any time without manually clearing data or restarting the application.

## User Stories

### Starting Fresh

As a player, I want to type "new" to start a brand-new game, so that I can begin a fresh adventure without my previous progress.

When a player types the "new" command, the system should prompt for confirmation to prevent accidental data loss. Upon confirmation, the game creates a new database entry, generates a fresh starting room, resets all game state including inventory and visited rooms, and presents the initial game introduction. This allows players to experience the game from the beginning again, try different approaches, or start over after getting stuck.

### Quick Restart for Testing

As a developer or tester, I want to quickly create new game instances, so that I can test different scenarios and game states efficiently.

The new command streamlines the testing process by providing a clean slate without requiring application restart or manual database manipulation. This is particularly useful when testing room generation, game progression, or debugging specific scenarios that require a fresh game state.

## Spec Scope

1. **Command Registration** - Register "new" command with the CommandRouter service for consistent command handling
2. **Confirmation Dialog** - Implement a confirmation prompt to prevent accidental game resets
3. **Game State Reset** - Create new game entry in database and reset all session-specific state
4. **Starting Room Generation** - Initialize the game with the default starting room from YAML seed data
5. **UI Feedback** - Clear game pane and display new game introduction message

## Out of Scope

- Saving or backing up the current game before creating new one
- Multiple save slots or game profiles
- Importing/exporting game states
- Customizable starting conditions or difficulty settings
- Deleting old game records from the database

## Expected Deliverable

1. Users can type "new" command and receive a confirmation prompt before game reset
2. Confirmed new game creates fresh database entry with new game ID and resets all state
3. Game pane clears and displays the starting room description for the new game

## Spec Documentation

- Spec Summary: @.agent-os/specs/2025-08-26-new-game-command/spec-lite.md
- Technical Specification: @.agent-os/specs/2025-08-26-new-game-command/sub-specs/technical-spec.md