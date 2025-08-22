# Ink React TUI Migration Specification

**Document Type:** Technical Specification  
**Priority:** High  
**Complexity:** High  
**Date:** 2025-08-20  
**Status:** ✅ Completed - All phases implemented successfully, tests pass (301/301), cursor style restored  

## Summary

Migrate Shadow Kingdom's Terminal UI from blessed.js to ink (React for terminals) to modernize the interface architecture while maintaining full functionality and addressing text selection limitations.

## Background

### Current State
- Uses blessed.js for Terminal UI rendering
- Imperative API with manual DOM-like manipulation
- Text selection prevented by blessed.js mouse handling
- Character duplication bug required complex workarounds
- Complex event handling and state management

### Problem Statement
1. **Text Selection Issue**: blessed.js prevents natural terminal text selection and copy/paste
2. **Architecture Complexity**: Imperative API leads to complex state management
3. **Maintenance Burden**: blessed.js requires manual event handling and layout management
4. **Modern Development**: Team prefers React's declarative approach

### Solution Overview
Replace blessed.js with ink, which provides:
- Real React components rendering to terminal
- Declarative UI updates with hooks and state
- Modern development experience
- Better component reusability

## Technical Requirements

### Dependencies
- **Add**: `ink`, `react`, `ink-text-input`
- **Add Dev**: `@types/react`
- **Remove**: `blessed`, `@types/blessed`

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "jsx": "react",
    "moduleResolution": "node"
  }
}
```

### Interface Compatibility
Must maintain exact same public interface as current TUIManager:
```typescript
interface TUIInterface {
  initialize(): Promise<void>;
  display(message: string, type?: MessageType): void;
  displayLines(lines: string[], type?: MessageType): void;
  getInput(): Promise<string>;
  updateStatus(gameState: GameState): void;
  setStatus(message: string): void;
  clear(): void;
  destroy(): void;
  setPrompt(prompt: string): void;
  showWelcome(message: string): void;
  showError(message: string, details?: string): void;
  showAIProgress(action: string, target: string, elapsed?: number): void;
  displayRoom(roomName: string, description: string, exits: string[]): void;
}
```

## Architecture Design

### Component Hierarchy
```
InkTUIApp (React Component)
├── ContentArea (Scrollable message list)
├── InputSection (Command input with history)
└── StatusBar (Game state display)
```

### Bridge Pattern Implementation
```typescript
// InkTUIBridge.ts - Maintains imperative interface
export class InkTUIBridge implements TUIInterface {
  private app: React.ComponentType;
  private eventEmitter: EventEmitter;
  private inputPromise?: Promise<string>;
  
  // Wraps React component with imperative API
}
```

### State Management Flow
1. **Display Updates**: GameController → Bridge → Event Emitter → React State
2. **User Input**: React Component → Event Emitter → Bridge → Promise Resolution
3. **Status Updates**: GameController → Bridge → React Props

## Implementation Plan

### Phase 1: Foundation Setup
**Duration**: 1-2 hours

1. **Install Dependencies**
   ```bash
   npm install ink react ink-text-input
   npm install --save-dev @types/react
   npm uninstall blessed @types/blessed
   ```

2. **Update TypeScript Configuration**
   - Add JSX support
   - Ensure .tsx file compilation

3. **Create Basic React Component**
   - Simple ink app that renders "Hello World"
   - Verify React works in terminal

### Phase 2: Core Component Development
**Duration**: 2-3 hours

1. **Create InkTUIApp.tsx**
   ```tsx
   export const InkTUIApp: React.FC<Props> = ({ messages, onInput, gameState }) => {
     return (
       <Box flexDirection="column" height="100%">
         <ContentArea messages={messages} />
         <InputBar onInput={onInput} />
         <StatusBar gameState={gameState} />
       </Box>
     );
   };
   ```

2. **Implement Sub-components**
   - **ContentArea**: Scrollable message display with color coding
   - **InputBar**: Text input with command history
   - **StatusBar**: Dynamic status display

3. **State Management**
   - Use useState for messages array
   - useEffect for status updates
   - Custom hooks for input handling

### Phase 3: Bridge Implementation
**Duration**: 1-2 hours

1. **Create InkTUIBridge.ts**
   ```typescript
   export class InkTUIBridge implements TUIInterface {
     private render: RenderFunction;
     private messageEmitter: EventEmitter;
     
     constructor() {
       // Initialize React app rendering
       // Set up event communication
     }
   }
   ```

2. **Implement Interface Methods**
   - `display()`: Emit message event to React
   - `getInput()`: Return promise resolved by React input
   - `updateStatus()`: Update React props
   - All other methods following same pattern

3. **Event Communication**
   - EventEmitter for GameController → React
   - Callback functions for React → GameController

### Phase 4: Integration
**Duration**: 1 hour

1. **Update GameController**
   ```typescript
   // Change single import line
   import { InkTUIBridge } from './ui/InkTUIBridge';
   
   // Update instantiation
   this.tui = new InkTUIBridge();
   ```

2. **Test Basic Functionality**
   - Verify game starts and displays content
   - Test command input and processing
   - Validate status updates

### Phase 5: Feature Implementation
**Duration**: 2-3 hours

1. **Input Enhancements**
   - Command history with up/down arrows
   - Tab completion (future enhancement)
   - Input validation and highlighting

2. **Display Features**
   - Color coding for message types
   - Scrolling with PageUp/PageDown
   - ASCII art and formatting support

3. **Keyboard Shortcuts**
   - Ctrl+C for exit
   - Ctrl+L for clear
   - Custom shortcuts as needed

### Phase 6: Testing and Polish
**Duration**: 1-2 hours

1. **Test Suite Validation**
   - Run full test suite (443 tests)
   - Ensure MockTUI still works for tests
   - Fix any async/timing issues

2. **Performance Optimization**
   - Optimize React re-renders
   - Implement message buffer limits
   - Memory leak prevention

3. **Error Handling**
   - Graceful fallback on React errors
   - Terminal resize handling
   - Input error recovery

## Component Specifications

### InkTUIApp Component
```tsx
interface InkTUIAppProps {
  messages: Message[];
  gameState: GameState;
  onInput: (input: string) => void;
  onKeyPress: (key: string) => void;
}

interface Message {
  id: string;
  content: string;
  type: MessageType;
  timestamp: Date;
}
```

### ContentArea Component
```tsx
interface ContentAreaProps {
  messages: Message[];
  maxHeight?: number;
  autoScroll?: boolean;
}
```

Features:
- Scrollable message list
- Color coding based on MessageType
- Auto-scroll to bottom for new messages
- Manual scroll with keyboard

### InputBar Component
```tsx
interface InputBarProps {
  onSubmit: (input: string) => void;
  placeholder?: string;
  history?: string[];
}
```

Features:
- Text input with cursor
- Command history navigation
- Input validation
- Submit on Enter

### StatusBar Component
```tsx
interface StatusBarProps {
  gameState: GameState;
  height?: number;
}
```

Features:
- Dynamic height based on content
- Game information display
- Room count, current location
- AI status indicators

## Color Scheme

### Message Type Colors
```typescript
const MESSAGE_COLORS = {
  [MessageType.ROOM_TITLE]: 'yellow',
  [MessageType.ROOM_DESCRIPTION]: 'white',
  [MessageType.EXITS]: 'blue',
  [MessageType.ERROR]: 'red',
  [MessageType.AI_GENERATION]: 'green',
  [MessageType.SYSTEM]: 'gray',
  [MessageType.COMMAND_ECHO]: 'cyan',
  [MessageType.NORMAL]: 'white'
};
```

### Layout Colors
- **Borders**: Gray
- **Input Focus**: Yellow
- **Status**: Gray
- **Cursor**: White on black

## Error Handling Strategy

### React Error Boundaries
```tsx
class TUIErrorBoundary extends React.Component {
  componentDidCatch(error: Error) {
    // Log error and fall back to console output
    console.error('TUI Error:', error);
    process.exit(1);
  }
}
```

### Graceful Degradation
1. **React Failure**: Fall back to console.log output
2. **Terminal Issues**: Detect terminal capabilities
3. **Input Errors**: Reset input state and continue

## Testing Strategy

### Unit Tests
- Test React components in isolation
- Mock ink rendering for faster tests
- Test bridge pattern communication

### Integration Tests
- Test full GameController → TUI flow
- Verify all interface methods work
- Test async input handling

### Test Infrastructure Updates
```typescript
// Keep existing MockTUI for tests
export class MockTUI implements TUIInterface {
  // Same interface, no React dependency
  // Fast test execution
}
```

### Test Execution
- All 443 existing tests must pass
- No new test dependencies
- Maintain test isolation

## Performance Considerations

### React Optimization
- Use React.memo for components
- Optimize message list rendering
- Implement virtual scrolling for large histories

### Memory Management
- Limit message buffer size (2000 lines)
- Clean up event listeners
- Proper React unmounting

### Rendering Performance
- Batch state updates
- Minimize re-renders
- Efficient diff algorithms

## Migration Path

### Development Strategy
1. **Parallel Development**: Keep blessed.js TUI working during development
2. **Feature Flags**: Environment variable to switch between implementations
3. **Gradual Migration**: Test extensively before full switch

### Rollback Plan
```typescript
// Environment-based selection
const USE_INK_TUI = process.env.USE_INK_TUI === 'true';
this.tui = USE_INK_TUI ? new InkTUIBridge() : new TUIManager();
```

### Deployment Strategy
1. **Development**: Use ink by default
2. **Testing**: Validate both implementations
3. **Production**: Switch after thorough validation

## Known Limitations

### Text Selection
- **Issue**: Ink still doesn't solve terminal text selection
- **Cause**: Fundamental limitation of terminal UI libraries
- **Workaround**: Consider "copy mode" command or system clipboard integration

### Bundle Size
- **Impact**: React adds ~100KB to bundle
- **Mitigation**: Acceptable for desktop CLI application

### Complexity
- **Trade-off**: More setup complexity for better maintainability
- **Benefit**: Modern development experience

## Success Criteria

### Functional Requirements
- [ ] All existing TUI functionality preserved
- [ ] Same visual appearance and behavior
- [ ] All 443 tests pass without modification
- [ ] Performance comparable to blessed.js
- [ ] Memory usage within acceptable limits

### Technical Requirements
- [ ] Clean React component architecture
- [ ] Maintainable code with proper TypeScript types
- [ ] Error handling and graceful degradation
- [ ] Easy to extend with new features

### User Experience
- [ ] No noticeable performance degradation
- [ ] Same keyboard shortcuts and navigation
- [ ] Proper color coding and formatting
- [ ] Responsive to terminal resize

## Future Enhancements

### Short Term
- Command tab completion
- Improved scrolling experience
- Better error messages

### Long Term
- Mouse support where beneficial
- Plugin system for UI extensions
- Split-screen mode for multiple views
- Integration with system clipboard

## Timeline

**Total Estimated Duration**: 8-12 hours

- **Phase 1** (Setup): 1-2 hours
- **Phase 2** (Components): 2-3 hours  
- **Phase 3** (Bridge): 1-2 hours
- **Phase 4** (Integration): 1 hour
- **Phase 5** (Features): 2-3 hours
- **Phase 6** (Testing): 1-2 hours

## Conclusion

This migration will modernize Shadow Kingdom's UI architecture while maintaining full backward compatibility. The React-based approach provides better maintainability, modern development experience, and a solid foundation for future enhancements.

The bridge pattern ensures minimal disruption to existing code while enabling the full power of React's declarative UI paradigm in the terminal environment.