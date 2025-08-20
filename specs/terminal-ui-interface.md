# Terminal UI Interface Specification

**Date**: 2025-08-20  
**Status**: In Development  
**Related Issue**: `issues/2025-01-18-terminal-ui-interface.md`  

## Overview

Replace Shadow Kingdom's basic readline interface with a modern Terminal UI (TUI) using blessed.js, creating a Claude Code-style adaptive layout with scrollable content, floating input bar, and dynamic status area.

## Architecture Design

### Adaptive Layout System

The interface uses a three-component layout with dynamic sizing:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  CONTENT AREA (scrollable, fills available space)          │
│                                                             │
│  Welcome to Shadow Kingdom!                                 │
│                                                             │
│  Entrance Hall                                              │
│  ════════════                                               │
│  A grand entrance hall with marble floors and towering     │
│  columns. Dust motes dance in the light streaming through  │
│  tall windows.                                              │
│                                                             │
│  Exits: north, east                                         │
│  ✨ Generating new area: Crystal Sanctum (north)           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ > look around                                               │ ← INPUT BAR (floats above status)
├─────────────────────────────────────────────────────────────┤
│ Game: My Adventure | Room: Library | Rooms: 12             │ ← STATUS AREA (1-4 lines, grows dynamically)
│ Region: Castle Keep | AI: Generating...                    │
└─────────────────────────────────────────────────────────────┘
```

### Component Behaviors

1. **Content Area** (Top, Variable Height)
   - Scrollable text area for all game output
   - Auto-scrolls to bottom for new content
   - Manual scroll with Page Up/Down, arrow keys
   - Maintains scroll position during layout changes
   - Color-coded message types

2. **Input Bar** (Middle, Fixed 3 lines with borders)
   - Always visible command prompt
   - Floats above status area
   - Moves up/down as status area grows/shrinks
   - Command history with arrow key navigation
   - Focus maintained during layout updates

3. **Status Area** (Bottom, 1-4 lines)
   - Dynamic height based on game state
   - Contextual information display
   - Minimal when idle, detailed when active

## Technical Implementation

### Core Components

#### TUIManager (`src/ui/TUIManager.ts`)
```typescript
export class TUIManager {
  private screen: blessed.Widgets.Screen;
  private contentBox: blessed.Widgets.Box;
  private inputBox: blessed.Widgets.Textbox;
  private statusBox: blessed.Widgets.Box;
  
  // Layout management
  public updateLayout(): void;
  private calculateStatusHeight(): number;
  
  // Display operations
  public display(message: string, type?: MessageType): void;
  public getInput(): Promise<string>;
  public updateStatus(status: StatusInfo): void;
  public clear(): void;
  public destroy(): void;
}
```

#### StatusManager (`src/ui/StatusManager.ts`)
```typescript
export class StatusManager {
  // Dynamic status content based on game state
  public generateStatus(gameState: GameState): StatusInfo;
  private formatStatusLine(info: any): string;
  
  // Status line states:
  // - Minimal (1 line): Game, room, basic stats
  // - Normal (2 lines): Add region info
  // - Active (3 lines): Add AI generation status  
  // - Busy (4 lines): Add generation queue, tokens
}
```

#### MessageFormatter (`src/ui/MessageFormatter.ts`)
```typescript
export enum MessageType {
  NORMAL = 'normal',
  ROOM_TITLE = 'room_title',
  ROOM_DESCRIPTION = 'room_description', 
  EXITS = 'exits',
  SYSTEM = 'system',
  ERROR = 'error',
  AI_GENERATION = 'ai_generation',
  COMMAND_ECHO = 'command_echo'
}

export class MessageFormatter {
  public format(message: string, type: MessageType): string;
  private applyColors(text: string, type: MessageType): string;
}
```

### Color Scheme

Following Claude Code's clean aesthetic:

- **Room Titles**: Bright yellow/white with underline separators
- **Room Descriptions**: Default white text
- **Exits**: Blue text for easy identification  
- **System Messages**: Gray/dim for less important info
- **Error Messages**: Red for attention
- **AI Generation**: Green/cyan for positive feedback
- **Command Echo**: Subtle color for user commands

### Status Area Content

**Minimal State (1 line):**
```
Game: My Adventure | Room: Entrance Hall | Rooms: 3
```

**Normal State (2 lines):**
```
Game: My Adventure | Room: Entrance Hall | Rooms: 8
Region: Castle Keep | Connections: 12 total, 3 unfilled
```

**Active State (3 lines):**
```
Game: My Adventure | Room: Entrance Hall | Rooms: 12
Region: Castle Keep | Connections: 18 total, 1 unfilled  
AI: Generating Crystal Sanctum (north)... [2.3s]
```

**Busy State (4 lines):**
```
Game: My Adventure | Room: Entrance Hall | Rooms: 15
Region: Castle Keep | Connections: 24 total, 5 unfilled
AI: Generating Crystal Sanctum (north)... [2.3s]
Queue: 3 rooms pending | Tokens: 1,245 | Cooldown: 7s
```

### Keyboard Controls

- **Enter**: Submit command
- **Up/Down Arrows**: Navigate command history  
- **Page Up/Down**: Scroll content area
- **Ctrl+L**: Clear content area
- **Ctrl+C**: Exit application gracefully
- **Tab**: Future command completion
- **Esc**: Cancel current input

### Integration Points

#### GameController Modifications
```typescript
export class GameController {
  // Replace readline interface
  private tui: TUIManager; // Instead of rl: readline.Interface
  
  // Update display methods
  private display(message: string, type?: MessageType): void {
    this.tui.display(message, type);
  }
  
  // Status updates after state changes
  private updateStatus(): void {
    const status = this.statusManager.generateStatus(this.getCurrentState());
    this.tui.updateStatus(status);
  }
}
```

#### SessionInterface Compatibility
- **No changes required** - SessionInterface bypasses display entirely
- Programmatic API remains identical for Claude and automation
- Tests continue to work without modification

### Performance Considerations

1. **Content Buffer Management**
   - Limit scrollback history to 2000 lines
   - Clean up old content to prevent memory bloat
   - Efficient rendering with blessed.js optimizations

2. **Layout Updates**
   - Only recalculate layout when status actually changes
   - Batch multiple status updates
   - Preserve content scroll position during reflows

3. **Terminal Compatibility**
   - Graceful degradation for limited terminals
   - Auto-detect color support and adjust accordingly
   - Handle terminal resize events smoothly

## Implementation Steps

### Phase 1: Core TUI Structure
1. ✅ Install blessed.js dependencies
2. Create MessageFormatter with color definitions
3. Create StatusManager for dynamic content
4. Create TUIManager with adaptive layout

### Phase 2: GameController Integration  
5. Replace readline interface with TUI
6. Route all console.log calls through TUI display
7. Add status updates after game state changes
8. Integrate existing HistoryManager

### Phase 3: Polish & Testing
9. Test all existing game functionality
10. Handle edge cases (terminal resize, long content)
11. Visual polish and smooth transitions
12. Ensure SessionInterface remains unaffected

## Success Criteria

- [ ] TUI displays correctly on major terminals (Terminal.app, iTerm2, Windows Terminal)
- [ ] All game functionality works identically to readline version
- [ ] Content scrolling is smooth with large amounts of text
- [ ] Command history navigation functions properly  
- [ ] Status area adapts dynamically based on game state
- [ ] Input bar floats correctly above variable status area
- [ ] Performance remains responsive during gameplay
- [ ] SessionInterface completely unaffected by changes
- [ ] Graceful handling of terminal resize events

## Configuration

Environment variables for TUI customization:
```bash
# Basic TUI settings
TUI_SHOW_BORDERS=true           # Show/hide panel borders
TUI_AUTO_SCROLL=true            # Auto-scroll to new content
TUI_SCROLL_BUFFER_SIZE=2000     # Max lines in scrollback

# Color and theme options  
TUI_THEME=default               # Color theme selection
TUI_DISABLE_COLORS=false        # Disable colors for compatibility
```

## Future Enhancements

### Short Term
- Command tab completion
- Configurable color themes
- Mouse support for scrolling
- Help overlay panel

### Long Term  
- Split-screen mode for multiple games
- Plugin system for UI extensions
- Integration with multi-interface architecture
- Advanced terminal features (mouse clicks, etc.)

This specification provides the foundation for a modern, professional Terminal UI that significantly enhances the Shadow Kingdom user experience while maintaining full backward compatibility with automation systems.