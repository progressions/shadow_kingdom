# Streamlined Game Startup Experience

**Date**: 2025-01-19  
**Category**: Enhancement  
**Priority**: Medium  
**Status**: Open

## Problem Description

The current game startup experience is friction-heavy and interrupts immersion:

1. **Forced Menu Mode**: App always starts in main menu mode rather than continuing the current game
2. **Manual Game Naming**: User must manually type a game name every time they create a new game
3. **Context Switching**: Players have to navigate menu → select/create game → enter game mode instead of jumping straight into gameplay
4. **No Default Game**: No concept of a "current" or "active" game that can be resumed automatically

## Current Behavior

```
App Start → Main Menu → User Types Game Name → Game Mode
         ↑                                         ↓
         ← ← ← ← ← ← User Quits ← ← ← ← ← ← ← ← ← ←
```

## Desired Behavior

```
App Start → Game Mode (Current Game)
         ↑         ↓
    Main Menu ← Quit
```

## Proposed Solution

### Phase 1: Auto-Resume Current Game
- Track "current game" by `last_played_at` timestamp
- On app startup, automatically load the most recently played game directly into game mode
- Skip main menu entirely for returning players

### Phase 2: Character-Based Experience  
- Replace "game name" concept with "character name"
- Ask for character name instead of game name when creating new games
- AI can generate random fantasy character names as suggestions
- Games become sessions associated with characters

### Phase 3: Enhanced Startup Flow
- **First-time users**: Brief character creation → straight to game
- **Returning users**: Auto-resume current character → straight to game  
- **Menu access**: Only when user explicitly quits from game mode

## Technical Implementation

### Database Changes
```sql
-- Track current/active game per user (future multi-user support)
ALTER TABLE games ADD COLUMN is_current BOOLEAN DEFAULT FALSE;

-- Character-focused approach
ALTER TABLE games ADD COLUMN character_name TEXT;
```

### Startup Logic
```typescript
async startApp() {
  const currentGame = await this.getCurrentGame();
  
  if (currentGame) {
    // Auto-resume current game
    await this.startGameMode(currentGame.id);
  } else {
    // First-time user or no current game
    await this.createCharacterAndStart();
  }
}
```

### AI Character Generation
- Integrate with Grok AI to generate fantasy character names
- Provide 3-5 suggestions for user to choose from
- Fallback to simple random names if AI fails

## User Experience Improvements

### Before (Current)
1. Start app
2. See main menu 
3. Type "new" command
4. Enter game name manually
5. Finally enter game mode

### After (Proposed)  
1. Start app
2. **Immediately in game mode** (current character)

### New Player Experience
1. Start app
2. "Choose your character name:" → AI suggestions or custom input
3. **Immediately in game mode**

## Benefits

- **Reduced Friction**: Eliminates menu navigation for 95% of use cases
- **Better Immersion**: Jump straight into the fantasy world
- **Character Connection**: Players develop attachment to named characters rather than abstract "games"
- **Faster Iteration**: Developers can test gameplay faster without menu navigation

## Edge Cases to Handle

- **No existing games**: Graceful first-time user flow
- **Corrupted current game**: Fall back to menu or create new character
- **Multiple characters**: Future enhancement for character selection
- **Menu access**: Clear path back to menu when needed (`quit` command)

## Implementation Priority

1. **High**: Auto-resume current game on startup
2. **Medium**: Character-based game creation  
3. **Low**: AI-generated character names
4. **Future**: Multiple character support

## Acceptance Criteria

- [ ] App starts directly in game mode for returning players
- [ ] Most recently played game is automatically resumed
- [ ] `quit` command takes user to main menu (not app exit)
- [ ] New players get character creation flow instead of game naming
- [ ] AI can suggest fantasy character names for new players
- [ ] No regression in existing game management functionality
- [ ] Startup time remains under 2 seconds

## Related Issues

- Could tie into future save/load system improvements
- May impact multiplayer character selection (future feature)
- Related to session persistence and auto-save functionality

## Notes

This enhancement transforms Shadow Kingdom from a "game launcher" experience into a "living world" experience where players inhabit their characters rather than managing abstract game sessions.