# Command History Implementation Specification

**Feature**: Add command history navigation with arrow keys
**Branch**: feature/command-history
**Issue**: issues/2025-08-18-add-command-history.md

## Overview

Implement persistent command history functionality that allows users to navigate through previously entered commands using UP/DOWN arrow keys. History should persist between game sessions.

## Requirements

### Core Functionality
- **UP arrow key**: Navigate backwards through command history
- **DOWN arrow key**: Navigate forwards through command history  
- **Persistent storage**: History survives game session restarts
- **Size limit**: Maximum 100 commands stored
- **Duplicate prevention**: Don't store consecutive duplicate commands
- **Empty command filtering**: Don't store empty commands

### Technical Implementation

#### 1. History Storage
- **File location**: `~/.shadow_kingdom_history`
- **Format**: Plain text, one command per line
- **Loading**: Read history file on GameController initialization
- **Saving**: Append new commands immediately after execution

#### 2. Readline Integration
- **Built-in support**: Use Node.js readline's native history functionality
- **Configuration**: Set historySize and load existing history
- **No custom key handling**: Leverage readline's built-in UP/DOWN behavior

#### 3. History Management
- **Maximum entries**: 100 commands (configurable)
- **Duplicate handling**: Skip if same as last command
- **Empty filtering**: Skip empty strings and whitespace-only commands
- **File rotation**: When limit reached, remove oldest entries

## Implementation Plan

### Step 1: History File Management
```typescript
class HistoryManager {
  private historyFile: string;
  private maxEntries: number;
  
  async loadHistory(): Promise<string[]>;
  async saveCommand(command: string): Promise<void>;
  private filterCommand(command: string): boolean;
  private rotateHistory(history: string[]): string[];
}
```

### Step 2: GameController Integration  
```typescript
// In GameController constructor
this.historyManager = new HistoryManager();
const history = await this.historyManager.loadHistory();

this.rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'menu> ',
  historySize: 100,
  history: history.reverse() // readline expects reverse order
});
```

### Step 3: Command Tracking
```typescript
// In command execution
private async executeCommand(input: string): Promise<void> {
  const trimmed = input.trim();
  if (trimmed) {
    await this.historyManager.saveCommand(trimmed);
  }
  // ... existing command execution logic
}
```

## File Structure

### New Files
- `src/utils/historyManager.ts` - History file management
- `tests/historyManager.test.ts` - Unit tests

### Modified Files
- `src/gameController.ts` - Integration with readline and command tracking

## Configuration

### Environment Variables
```bash
COMMAND_HISTORY_ENABLED=true        # Enable/disable feature
COMMAND_HISTORY_SIZE=100            # Maximum history entries
COMMAND_HISTORY_FILE=~/.shadow_kingdom_history  # Custom file location
```

## Testing Strategy

### Unit Tests
- History file loading/saving
- Command filtering (empty, duplicates)
- History rotation when limit exceeded
- File creation when doesn't exist

### Integration Tests  
- GameController history integration
- Command execution and storage
- Readline history functionality

### Manual Testing
- Start game, enter commands, use UP/DOWN arrows
- Restart game, verify history persists
- Test edge cases (empty commands, duplicates)

## User Experience

### Before
```
> look
[room description]
> go north
[new room]  
> look        <- User has to retype this
```

### After
```
> look
[room description]
> go north
[new room]
> [UP ARROW]  <- Displays "look"
> look        <- User can press ENTER to execute
```

## Success Criteria

- [ ] UP/DOWN arrows navigate through command history
- [ ] History persists between game sessions
- [ ] Maximum 100 commands stored
- [ ] Duplicate consecutive commands not stored
- [ ] Empty commands not stored in history
- [ ] History file created automatically if missing
- [ ] All existing game functionality unchanged
- [ ] No performance impact during normal gameplay

## Edge Cases

### File System Issues
- **Missing directory**: Create ~/.shadow_kingdom_history directory if needed
- **Permission errors**: Graceful fallback to in-memory history only
- **Corrupted history file**: Skip invalid entries, continue with valid ones

### Large History Files
- **File rotation**: Remove oldest entries when limit exceeded
- **Startup performance**: Async loading doesn't block game start

### Terminal Compatibility
- **Arrow key support**: Should work in all major terminals
- **Fallback**: If arrows don't work, history still loads (no degradation)

## Implementation Notes

- Use Node.js built-in readline history functionality
- Keep changes minimal - only add history file persistence
- Maintain existing prompt behavior and command processing
- No changes to game logic or command routing
- Focus on this single feature - no TUI or interface changes