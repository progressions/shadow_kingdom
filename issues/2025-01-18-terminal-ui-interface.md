# Terminal UI (TUI) Interface Implementation

**Issue Type:** Enhancement  
**Priority:** Medium  
**Complexity:** Medium  
**Date:** 2025-01-18  

## Summary

Replace the current simple `readline` interface with a modern Terminal UI (TUI) similar to Claude Code's interface. This will provide a fixed input bar at the bottom, a status line, and a scrollable content area above, creating a more professional and user-friendly experience.

## Current State

- Uses basic `readline` interface for command input
- Game output mixed with command prompts via `console.log`
- No persistent status information
- Limited command history functionality
- Output scrolls away and cannot be easily reviewed

## Target Interface Design

```
┌─────────────────────────────────────────────────────────────┐
│ Welcome to Shadow Kingdom!                                  │
│                                                             │
│ Entrance Hall                                               │
│ ════════════                                                │
│ A grand entrance hall with marble floors and towering      │
│ columns. Dust motes dance in the light streaming through   │
│ tall windows.                                               │
│                                                             │
│ Exits: north, east                                          │
│                                                             │
│ > go north                                                  │
│                                                             │
│ Library                                                     │
│ ═══════                                                     │
│ Ancient bookshelves line the walls, filled with leather-   │
│ bound tomes. The air smells of old paper and mystery.      │
│                                                             │
│ Exits: south, bookshelf                                     │
│ ✨ Generated new area: Crystal Sanctum (north)              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ > look around                                               │
├─────────────────────────────────────────────────────────────┤
│ Game: My Adventure | Room: Library | Rooms: 12 | AI: Ready │
└─────────────────────────────────────────────────────────────┘
```

## Goals

1. **Professional Interface**: Modern TUI similar to Claude Code, vim, or htop
2. **Clear Separation**: Distinct areas for content, input, and status
3. **Scrollable History**: Ability to scroll back through game output
4. **Persistent Status**: Always-visible game state information
5. **Better UX**: More intuitive and polished user experience

## Technical Requirements

### Library Selection: blessed.js

**Chosen Library:** `blessed` - The most mature and feature-complete TUI library for Node.js

**Installation:**
```bash
npm install blessed @types/blessed
```

**Why blessed.js:**
- Mature and well-documented
- Excellent layout system
- Support for scrolling, colors, borders
- Active maintenance and large community
- Cross-platform compatibility

### Interface Components

#### 1. Main Layout Structure
```typescript
interface TUILayout {
  screen: blessed.Widgets.Screen;           // Main screen
  contentBox: blessed.Widgets.ScrollableText; // Game content (scrollable)
  inputBox: blessed.Widgets.Textbox;        // Command input
  statusBox: blessed.Widgets.Box;           // Status information
}
```

#### 2. Content Area (Top Panel)
- **Scrollable text widget** for game output
- **Auto-scroll** to bottom for new content
- **Manual scroll** with arrow keys/page up-down
- **Color coding** for different message types:
  - Normal text: Default color
  - Room descriptions: Bright white/yellow
  - System messages: Gray/dim
  - Error messages: Red
  - AI generation: Green/cyan
  - Exits: Blue

#### 3. Input Area (Middle Panel)
- **Fixed position** at bottom of content area
- **Command prompt** with customizable prompt text
- **Input history** with up/down arrow navigation
- **Tab completion** for common commands
- **Command validation** and highlighting

#### 4. Status Line (Bottom Panel)
- **Game Information**: Current game name
- **Location**: Current room name
- **Statistics**: Total rooms explored, items, etc.
- **AI Status**: Generation status, token usage
- **Connection**: Online/offline status for web mode

### Implementation Architecture

#### New TUI Interface Class
```typescript
class TUIInterface implements IGameInterface {
  private screen: blessed.Widgets.Screen;
  private contentBox: blessed.Widgets.ScrollableText;
  private inputBox: blessed.Widgets.Textbox;
  private statusBox: blessed.Widgets.Box;
  private commandHistory: string[] = [];
  private historyIndex: number = -1;

  constructor();
  async initialize(): Promise<void>;
  async displayMessage(message: string, type?: MessageType): Promise<void>;
  async displayRoom(room: Room, connections: Connection[]): Promise<void>;
  async promptInput(prompt: string): Promise<string>;
  async updateStatus(status: GameStatus): Promise<void>;
  async clearContent(): Promise<void>;
  async cleanup(): Promise<void>;
}
```

#### Message Types and Styling
```typescript
enum MessageType {
  NORMAL = 'normal',
  ROOM_TITLE = 'room_title',
  ROOM_DESCRIPTION = 'room_description',
  EXITS = 'exits',
  SYSTEM = 'system',
  ERROR = 'error',
  AI_GENERATION = 'ai_generation',
  COMMAND_ECHO = 'command_echo'
}
```

#### Status Information Structure
```typescript
interface GameStatus {
  gameName?: string;
  roomName?: string;
  roomCount?: number;
  connectionCount?: number;
  aiStatus?: 'ready' | 'generating' | 'error';
  tokenUsage?: number;
  connectionStatus?: 'online' | 'offline';
}
```

### Key Features

#### 1. Keyboard Controls
- **Enter**: Submit command
- **Up/Down Arrows**: Navigate command history
- **Page Up/Down**: Scroll content area
- **Ctrl+L**: Clear content area
- **Ctrl+C**: Exit application
- **Tab**: Command completion (future)
- **Esc**: Cancel current input

#### 2. Visual Enhancements
- **Borders**: Clean borders around each panel
- **Colors**: Syntax highlighting for different content types
- **Indicators**: Visual cues for AI generation, new rooms, etc.
- **Responsive**: Adapts to terminal resize events

#### 3. Content Management
- **Buffer Management**: Limit content history to prevent memory issues
- **Smart Scrolling**: Auto-scroll for new content, preserve manual scroll
- **Line Wrapping**: Proper text wrapping for long descriptions
- **Formatting**: Preserve formatting for room descriptions and ASCII art

### Implementation Steps

#### Phase 1: Basic TUI Setup (1-2 days)
1. Install and configure blessed.js
2. Create basic three-panel layout
3. Replace readline with blessed input handling
4. Basic message display functionality
5. Test terminal compatibility

#### Phase 2: Core Functionality (2-3 days)
1. Implement scrollable content area
2. Add command history navigation
3. Create status line with basic game info
4. Color coding for different message types
5. Keyboard shortcut handling

#### Phase 3: Enhanced Features (2-3 days)
1. Advanced status information (room count, AI status)
2. Visual indicators for AI generation
3. Content buffer management
4. Terminal resize handling
5. Error handling and fallback mechanisms

#### Phase 4: Polish and Testing (1-2 days)
1. Fine-tune colors and layout
2. Performance optimization
3. Cross-platform testing
4. Documentation updates
5. User experience refinements

### Integration with Existing Code

#### Minimal Changes Required
- Create new `TUIInterface` class implementing `IGameInterface`
- Replace `CLIInterface` instantiation in main entry point
- Update message formatting to use TUI color codes
- Add status update calls in GameController

#### Backward Compatibility
- Keep `CLIInterface` as fallback option
- Environment variable to choose interface type:
  ```bash
  INTERFACE_TYPE=tui npm run dev    # New TUI interface
  INTERFACE_TYPE=cli npm run dev    # Original readline interface
  ```

### Technical Considerations

#### Terminal Compatibility
- **Primary Support**: Modern terminals (Terminal.app, iTerm2, Windows Terminal, GNOME Terminal)
- **Fallback Detection**: Detect terminal capabilities and fall back to readline if needed
- **Testing Matrix**: Test on macOS, Windows, Linux terminals

#### Performance
- **Content Buffering**: Limit scrollback buffer to reasonable size (1000-5000 lines)
- **Efficient Updates**: Only redraw changed areas
- **Memory Management**: Clean up old content periodically

#### Error Handling
- **Graceful Degradation**: Fall back to readline if TUI initialization fails
- **Terminal Issues**: Handle terminal resize, disconnect scenarios
- **Recovery**: Ability to reset screen state if corrupted

### Benefits

1. **Professional Appearance**: Much more polished than basic readline
2. **Better Information Display**: Persistent status and clear content areas
3. **Improved Navigation**: Easy to scroll back through game history
4. **Enhanced UX**: More intuitive interaction model
5. **Future Foundation**: Basis for more advanced UI features

### Potential Challenges

1. **Terminal Compatibility**: Some older or limited terminals may not support all features
2. **Complexity**: More complex than simple readline interface
3. **Dependencies**: Additional dependency on blessed.js
4. **Testing**: More complex UI requires more thorough testing

### Success Criteria

- [ ] TUI interface displays correctly on major terminal applications
- [ ] All current game functionality works through new interface
- [ ] Content scrolling works smoothly with large amounts of text
- [ ] Command history navigation functions properly
- [ ] Status line updates correctly with game state changes
- [ ] Performance remains responsive during gameplay
- [ ] Graceful fallback to readline if TUI fails
- [ ] Cross-platform compatibility maintained

### Future Enhancements

#### Short Term
- Command tab completion
- Help overlay panel
- Custom color themes
- Configurable key bindings

#### Long Term
- Split-screen mode for multiple game sessions
- Mouse support for scrolling and clicking
- Plugin system for UI extensions
- Integration with multi-interface architecture

### Configuration Options

Add to `.env` or command line options:
```bash
# Interface type
INTERFACE_TYPE=tui|cli

# TUI-specific options
TUI_THEME=dark|light|custom
TUI_SHOW_BORDERS=true|false
TUI_STATUS_LINE=true|false
TUI_SCROLL_BUFFER_SIZE=2000
TUI_AUTO_SCROLL=true|false
```

This enhancement would significantly improve the user experience while maintaining all existing functionality and providing a solid foundation for future UI improvements.