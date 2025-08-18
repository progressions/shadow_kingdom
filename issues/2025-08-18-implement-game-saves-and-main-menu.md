# Implement Game Saves and Main Menu System

**Date**: 2025-08-18  
**Status**: Open  
**Priority**: High  
**Category**: Feature  

## Description

Add a game save system with main menu to allow players to create multiple games, save progress, and resume from where they left off.

## Details

**What is the requirement?**
Replace the current direct-to-game startup with a main menu system that allows:
- Creating new games with custom names
- Loading existing games
- Deleting old games
- Automatic save/resume functionality

**User Experience Flow:**
1. Game starts with main menu instead of directly entering the world
2. Players can create new games with custom names
3. Games auto-save player location on room changes
4. Players can return to menu and switch between games
5. Game list shows last played timestamps

**Acceptance Criteria:**
- [ ] Main menu with options: New Game, Load Game, Delete Game, Exit
- [ ] New Game prompts for game name and creates fresh world
- [ ] Load Game shows list of existing games with last played times
- [ ] Current room auto-saves when moving between rooms
- [ ] Game state persists between CLI sessions
- [ ] Multiple games can exist simultaneously
- [ ] Games are completely isolated from each other

## Technical Implementation

**Database Schema Changes:**

```sql
-- New table for games
games table:
- id (primary key)
- name (user-chosen name like "Epic Adventure")
- created_at
- last_played_at

-- Modify existing tables to add game_id
rooms table:
- id (primary key) 
- game_id (foreign key to games)  -- ADD THIS
- name, description

connections table:
- id (primary key)
- game_id (foreign key to games)  -- ADD THIS  
- from_room_id, to_room_id, name

-- New table for player state
game_state table:
- id (primary key)
- game_id (foreign key to games)
- current_room_id
- player_name (optional)
```

**Code Changes Required:**
- Add database migration to create new schema
- Implement main menu CLI interface
- Update all room/connection queries to include game_id filter
- Add game creation logic (copy seed data for new games)
- Add game state save/load functionality
- Modify CLI startup to show menu instead of direct game entry

**Data Migration:**
- Existing rooms/connections need to be assigned to a default game
- Current player position needs to be saved to game_state table

## Technical Notes

**Menu Interface Example:**
```
Welcome to Shadow Kingdom!

1. New Game
2. Load Game  
3. Delete Game
4. Exit

> 

Select a game:
1. Epic Adventure (Last played: 2 hours ago)
2. Quick Test (Last played: yesterday)  
3. My Story (Last played: 3 days ago)

Enter number, or 'back' to return:
> 
```

**Auto-save Strategy:**
- Save current room to game_state on every room change
- Update last_played_at timestamp on game activity
- No manual save command needed initially

**Game Isolation:**
- Each game gets its own copy of the initial 3 rooms
- Rooms and connections are completely separate between games
- Future AI-generated content will be game-specific

## Implementation Order

1. Add new database tables and schema migration
2. Implement basic main menu interface
3. Add new game creation functionality
4. Add game loading/selection
5. Implement auto-save on room changes
6. Add game deletion feature
7. Update all existing queries to be game-aware
8. Test multi-game isolation

## Resolution

*To be filled when issue is resolved*

## Related

- Current CLI entry point: src/index.ts
- Database schema: src/utils/initDb.ts
- Future: AI content generation will need to be game-scoped