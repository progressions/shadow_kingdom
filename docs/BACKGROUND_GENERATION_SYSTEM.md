# Shadow Kingdom Background Room Generation System

**CRITICAL REFERENCE DOCUMENT**: Read this before making any changes to background generation!

## How Background Generation Actually Works

### ⚠️ STOP: Don't Guess - This is How It Really Works

Background room generation is **NOT** about visiting unprocessed rooms. It's about finding existing unprocessed rooms that need more connections and generating new rooms for them.

### The Real System Flow

#### 1. **When Background Generation Triggers**
- Background generation triggers when player enters ANY room (processed or unprocessed)  
- This happens via `backgroundGenerationService.preGenerateAdjacentRooms(currentRoomId, gameId)`
- The `currentRoomId` parameter is just the trigger - it doesn't mean we're generating FROM that room

#### 2. **What Background Generation Actually Does**
```typescript
// Background generation looks for:
// 1. Connections FROM the current room TO other rooms
// 2. Of those target rooms, which ones are unprocessed
// 3. For each unprocessed target room, generate missing connections

const connections = await this.db.all(
  'SELECT c.*, r.generation_processed FROM connections c ' +
  'JOIN rooms r ON c.to_room_id = r.id ' +
  'WHERE c.from_room_id = ? AND c.game_id = ? AND (r.generation_processed = FALSE OR r.generation_processed IS NULL)',
  [currentRoomId, gameId]
);
```

#### 3. **The Real Logic**
- **Current room**: Where player is standing (trigger point)
- **Target rooms**: Rooms connected FROM current room
- **Generation targets**: Unprocessed target rooms that need more connections
- **Action**: Generate new rooms connected TO those unprocessed target rooms

### Example Scenario

```
Player enters Room A (processed)
Room A connects to: Room B (unprocessed), Room C (processed)

Background generation:
1. Finds connection A -> B  
2. Sees Room B is unprocessed
3. Generates new rooms connected TO Room B
4. Room B now has more connections and can be marked as processed
```

### Why Our Current System Doesn't Work

#### ❌ **Wrong Understanding** (What I Thought):
- Visit unprocessed leaf room → Generate new rooms connected to it
- Room 4 (unprocessed) → Generate rooms connected to Room 4

#### ✅ **Correct Understanding** (What Actually Happens):
- Visit any room that has connections TO unprocessed rooms
- Current room has connection to Room 4 (unprocessed) → Generate rooms connected to Room 4

### The Starter Game Problem

Our starter game has this structure:
```
Room 1 (Entrance Hall) - processed
├── connects to Room 2 (Library) - processed  
├── connects to Room 3 (Garden) - processed
└── connects to Room 4 (Tower Stairs) - unprocessed

Room 2 (Library) - processed
├── connects to Room 1 (Entrance) - processed
├── connects to Room 3 (Garden) - processed  
└── connects to Room 5 (Crypt) - unprocessed

Room 3 (Garden) - processed
├── connects to Room 1 (Entrance) - processed
└── connects to Room 6 (Observatory) - unprocessed
```

**Background generation SHOULD work when:**
1. Player enters Room 1 → Sees connection to Room 4 (unprocessed) → Generates rooms for Room 4
2. Player enters Room 2 → Sees connection to Room 5 (unprocessed) → Generates rooms for Room 5  
3. Player enters Room 3 → Sees connection to Room 6 (unprocessed) → Generates rooms for Room 6

### Why It's Not Working

#### Issue 1: Fire-and-Forget vs Await
```typescript
// Background generation uses fire-and-forget in production
if (this.options.disableBackgroundGeneration) {
  await this.expandFromAdjacentRooms(currentRoomId, gameId);
} else {
  // Fire and forget - database closes before this completes!
  const promise = this.expandFromAdjacentRooms(currentRoomId, gameId);
}
```

#### Issue 2: Wrong Room Processing Order  
```typescript
// SessionInterface marks room as processed BEFORE background generation
if (!room.generation_processed) {
  await db.run('UPDATE rooms SET generation_processed = TRUE WHERE id = ?', [session.roomId]);
}
```

But background generation needs target rooms to stay unprocessed until generation completes!

#### Issue 3: Missing Debug Information
Background generation fails silently. We need to see:
- Which rooms it finds as unprocessed targets
- Whether AI generation is actually being called
- What's happening with cooldowns and limits

### How to Fix It

#### 1. **Enable Test Mode for SessionInterface**
```typescript
// In sessionInterface, enable test mode to avoid fire-and-forget
const backgroundGenerationService = new BackgroundGenerationService(db, roomGenerationService, {
  enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true',
  disableBackgroundGeneration: true  // Force await mode
});
```

#### 2. **Fix Processing Order**
```typescript
// DON'T mark current room as processed until after background generation
// Background generation marks TARGET rooms as processed after expanding them
await backgroundGenerationService.preGenerateAdjacentRooms(session.roomId!, session.gameId!);
// Only mark current room as processed if it was specifically a generation target
```

#### 3. **Add Debug Logging**
Enable debug logging to see what's actually happening:
```bash
AI_DEBUG_LOGGING=true npm run dev -- --cmd "look" --game-id 1
```

### Expected Behavior

When working correctly:
1. **Enter Room 1**: Should generate new rooms connected to Room 4, Room 4 gets marked processed
2. **Enter Room 2**: Should generate new rooms connected to Room 5, Room 5 gets marked processed  
3. **Enter Room 3**: Should generate new rooms connected to Room 6, Room 6 gets marked processed
4. **Room count increases**: From 6 rooms to 9+ rooms as new rooms are generated

### Test Commands

```bash
# Create fresh game
rm shadow_kingdom_session.db

# Enable debug logging and test
AI_DEBUG_LOGGING=true npm run dev -- --cmd "look"           # Should show generation for Room 4, 5, 6
AI_DEBUG_LOGGING=true npm run dev -- --cmd "go north"       # Enter Room 2, should generate for Room 5
AI_DEBUG_LOGGING=true npm run dev -- --cmd "go south"       # Back to Room 1  
AI_DEBUG_LOGGING=true npm run dev -- --cmd "go east"        # Enter Room 3, should generate for Room 6

# Check room count
sqlite3 shadow_kingdom_session.db "SELECT COUNT(*) FROM rooms WHERE game_id = 1"
# Should be > 6 if generation worked
```

### Key Files and Methods

- **BackgroundGenerationService.preGenerateAdjacentRooms()**: Entry point (line 40)
- **BackgroundGenerationService.expandFromAdjacentRooms()**: Main logic (line 92)  
- **RoomGenerationService.countMissingRoomsFor()**: Counts how many rooms to generate
- **RoomGenerationService.generateSingleRoom()**: Actually creates new rooms

### Common Mistakes to Avoid

1. **Don't think visiting unprocessed rooms triggers generation for that room**
2. **Don't mark rooms as processed before background generation completes**
3. **Don't ignore fire-and-forget mode - it causes database closure issues**
4. **Don't assume generation will work without proper debug logging**
5. **Don't change the core logic without understanding the flow**

---

**Remember**: Background generation finds unprocessed rooms that are connected FROM your current location and generates more rooms FOR those unprocessed rooms. It's NOT about generating rooms for where you're standing.