# TUI Layout Improvements

**Document Type:** Issue Specification  
**Priority:** Medium  
**Complexity:** Medium  
**Date:** 2025-08-20  
**Status:** ✅ Completed - Layout improvements implemented, all tests pass (301/301)  

## Summary

Improve the visual layout of the Shadow Kingdom terminal UI to maximize screen real estate for game content. Currently the game pane is small relative to the terminal window - it should fill most of the screen with input and status controls positioned at the bottom.

## Current Layout Issues

### Current Structure (InkTUIApp.tsx)
```
┌─────────────────────────────┐
│ Status Bar (top)            │
├─────────────────────────────┤
│                             │
│ Content Area (game pane)    │  ← Small area
│                             │
├─────────────────────────────┤
│ Input Bar (bottom)          │
└─────────────────────────────┘
```

### Problems with Current Layout
1. **Limited content visibility**: Game descriptions, room details, and narrative text get cramped
2. **Poor screen utilization**: Large amounts of terminal space are unused
3. **Scrolling required frequently**: Small content area forces constant scrolling
4. **Reduced immersion**: Limited text display breaks narrative flow

## Desired Layout

### Target Structure
```
┌─────────────────────────────┐
│                             │
│                             │
│                             │
│                             │
│ Content Area (game pane)    │  ← Fills most of screen
│                             │
│                             │
│                             │
│                             │
├─────────────────────────────┤
│ Input Bar                   │
├─────────────────────────────┤
│ Status Bar                  │
└─────────────────────────────┘
```

### Layout Requirements
- **Content Area**: Should occupy ~80-85% of terminal height
- **Input Bar**: 1-2 lines for command input with cursor
- **Status Bar**: 1 line for game state, region info, etc.
- **Responsive**: Should adapt to different terminal sizes
- **Scrollable**: Content area maintains scroll history

## Technical Implementation

### Files to Modify
- `src/ui/InkTUIApp.tsx`: Primary layout component
- Potentially `src/ui/InkTUIBridge.ts`: Interface adjustments if needed

### Layout Components to Adjust

#### ContentArea Component
```typescript
// Current: Fixed height or default flex
<Box flexDirection="column" height={???}>

// Target: Use terminal dimensions for maximum height
<Box flexDirection="column" minHeight={terminalHeight - 4}>
```

#### StatusBar Component  
- Move from top to bottom position
- Ensure it's always visible (fixed position)

#### InputBar Component
- Keep at bottom but above status bar
- Maintain current input functionality

### Implementation Approach
1. **Measure terminal dimensions** using ink's `useStdout()` hook
2. **Calculate content area height** = terminal height - input bar - status bar
3. **Reorganize component order** to: Content → Input → Status
4. **Test responsive behavior** with different terminal sizes

## Benefits

### User Experience
- **More immersive storytelling**: Larger text display area for room descriptions
- **Reduced scrolling**: More content visible at once
- **Better information density**: Can see more game history and context
- **Professional appearance**: Better use of available screen space

### Technical Benefits
- **Better scalability**: Layout adapts to different terminal sizes
- **Improved readability**: More space for complex game text
- **Enhanced navigation**: Better spatial awareness of game content

## Acceptance Criteria

- [ ] Content area fills at least 80% of terminal height
- [ ] Input bar remains at bottom with full functionality
- [ ] Status bar positioned below input bar
- [ ] Layout responsive to terminal resize
- [ ] All existing functionality preserved
- [ ] Scroll behavior works correctly in expanded content area
- [ ] Visual design remains clean and uncluttered

## Technical Notes

### Current Layout Code Location
- Main layout: `src/ui/InkTUIApp.tsx:136-147` (InkTUIApp component)
- Content area: `src/ui/InkTUIApp.tsx:44-62` (ContentArea component)
- Status bar: `src/ui/InkTUIApp.tsx:137` (StatusBar component)
- Input bar: `src/ui/InkTUIApp.tsx:145` (InputBar component)

### Dependencies
- ink v3.2.0 layout system
- React hooks for terminal dimension detection
- Box component flexbox properties

## Related Issues

This builds upon the successful ink React TUI migration (#24) by improving the visual design and screen utilization of the new React-based interface.

## Priority Justification

**Medium Priority** - While the current interface is functional, improved layout would significantly enhance user experience and better utilize the modern React/ink architecture that was recently implemented.