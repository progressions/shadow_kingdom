# Automatic Room Generation on Entry

**Status:** Completed  
**Priority:** Medium  
**Category:** Enhancement / Room Generation  
**Created:** 2025-08-20  
**Completed:** 2025-08-20  

## Feature Request

Implement automatic background room generation that triggers immediately when a player enters any room, ensuring all unfilled connections start generating rooms asynchronously.

## Current Behavior

Room generation currently happens:
- **On-demand**: When player tries to move through an unfilled connection
- **Background triggers**: Based on specific conditions and cooldowns
- **Manual triggers**: Through specific game events

This can lead to:
- **Wait times**: Player has to wait for room generation when exploring
- **Dead ends**: Unfilled connections that feel incomplete
- **Inconsistent experience**: Some areas feel "unfinished"

## Desired Behavior

**Proactive Room Generation**: As soon as a player enters any room, automatically start generating rooms for all unfilled connections from that room in the background.

### Key Requirements

1. **Immediate Trigger**: Room entry should immediately queue generation for all unfilled connections
2. **Asynchronous Processing**: Generation happens in background without blocking player movement
3. **No Duplicates**: Don't start generation if already in progress for a connection
4. **Respect Limits**: Honor existing room limits and cooldowns
5. **Silent Operation**: Background generation shouldn't spam the console

## Technical Implementation

### Database Schema Enhancement

**Add Connection Processing Tracking**: Extend the `connections` table with a simple processing flag:

```sql
ALTER TABLE connections ADD COLUMN processing BOOLEAN DEFAULT FALSE;
```

**Connection States** (determined by existing fields + new processing flag):
- **Unfilled**: `to_room_id IS NULL AND processing = FALSE` - Ready for generation
- **Processing**: `to_room_id IS NULL AND processing = TRUE` - Currently generating
- **Filled**: `to_room_id IS NOT NULL` - Room exists (processing flag irrelevant)

**Benefits of Processing Boolean**:
- **Prevents Duplicate Generation**: Can check `processing = FALSE` before starting generation
- **Simple Logic**: Just a boolean flag, easy to understand and query
- **Uses Existing Data**: Leverages existing `to_room_id` field for filled/unfilled status
- **Performance**: Fast boolean queries
- **Persistence**: State survives server restarts
- **Clean Schema**: Minimal database changes

### Entry Point Detection
- **Room Entry Events**: Trigger on any room transition (movement, teleportation, etc.)
- **Game Start**: Trigger for starting room
- **Load Game**: Trigger when loading into an existing game

### Background Generation Queue
- **Connection Discovery**: Find connections with `to_room_id IS NULL AND processing = FALSE` from current room
- **Processing Flag**: Set `processing = TRUE` before starting generation
- **Generation Completion**: Set `to_room_id = newRoomId` and `processing = FALSE` when room created
- **Error Handling**: Set `processing = FALSE` on generation errors (allows retry)

### Integration Points

**GameController**: Add trigger in `lookAround()` or room transition logic
```typescript
// After room display
await this.triggerBackgroundGenerationForCurrentRoom();
```

**BackgroundGenerationService**: Extend to handle immediate room-entry triggers
```typescript
async generateForRoomEntry(roomId: number): Promise<void> {
  // Find unfilled connections that aren't already being processed
  const unfilledConnections = await this.db.all(`
    SELECT * FROM connections 
    WHERE from_room_id = ? AND to_room_id IS NULL AND processing = FALSE
  `, [roomId]);

  for (const connection of unfilledConnections) {
    // Mark as processing to prevent duplicates
    await this.db.run(`
      UPDATE connections SET processing = TRUE WHERE id = ?
    `, [connection.id]);
    
    // Queue for background generation
    this.queueGeneration(connection);
  }
}

async completeGeneration(connectionId: number, roomId: number): Promise<void> {
  // Update connection with room and clear processing flag
  await this.db.run(`
    UPDATE connections 
    SET to_room_id = ?, processing = FALSE 
    WHERE id = ?
  `, [roomId, connectionId]);
}

async failGeneration(connectionId: number, error: Error): Promise<void> {
  // Clear processing flag to allow retry
  await this.db.run(`
    UPDATE connections SET processing = FALSE WHERE id = ?
  `, [connectionId]);
  
  console.error(`Generation failed for connection ${connectionId}:`, error);
}
```

## Benefits

1. **Better UX**: Players never wait for room generation
2. **Seamless Exploration**: All connections feel "ready" to explore
3. **Immersive Experience**: World feels more complete and alive
4. **Reduced API Costs**: Can use mock mode for background generation
5. **Smoother Gameplay**: No interruptions during exploration

## Configuration Options

Add environment variables for control:
```env
AUTO_GENERATE_ON_ENTRY=true          # Enable/disable feature
AUTO_GENERATE_RADIUS=1               # Only generate for direct connections (vs. BFS radius)
AUTO_GENERATE_DELAY_MS=1000          # Delay before starting generation
AUTO_GENERATE_MAX_CONCURRENT=3       # Max concurrent generations per room entry
```

## Edge Cases to Handle

1. **Rapid Movement**: Player moving quickly between rooms
2. **Generation Failures**: Handle AI generation errors gracefully (set status = 'failed')
3. **Resource Limits**: Respect MAX_ROOMS_PER_GAME limits
4. **Network Issues**: Handle API timeouts and retries
5. **Memory Usage**: Manage generation queue size
6. **Status Consistency**: Handle cases where status = 'processing' but no actual generation is running
7. **Migration**: Update existing connections to have proper status values
8. **Concurrent Access**: Handle multiple processes trying to update same connection status

## Success Criteria

- [ ] Database migration adds `processing` boolean column to connections table
- [ ] Room entry triggers background generation for all unfilled connections
- [ ] No blocking or delays during player movement
- [ ] Generation happens silently in background
- [ ] No duplicate generation for same connection (prevented by processing flag)
- [ ] Processing flag accurately reflects generation state
- [ ] Failed generations can be retried
- [ ] Configurable through environment variables
- [ ] Respects existing limits and cooldowns
- [ ] Works with both real AI and mock AI modes
- [ ] Existing connections migrated to appropriate status values

## Testing Strategy

1. **Manual Testing**: Enter rooms and verify background generation starts
2. **Rapid Movement**: Test quick movement between multiple rooms
3. **Generation Monitoring**: Use debug logging to verify queue behavior
4. **Resource Testing**: Verify generation respects limits
5. **Mock Mode Testing**: Verify works with mock AI for development

## Implementation Notes

- Should integrate with existing BackgroundGenerationService
- May need to modify lookAround() in GameController
- Should respect existing GENERATION_COOLDOWN_MS settings
- Could use existing connection tracking infrastructure

## Priority Justification

**Medium Priority** because:
- Improves user experience significantly
- Reduces perceived wait times
- Makes world feel more complete
- Can reduce API costs by pre-generating with mock mode
- Builds on existing background generation infrastructure

---
*Created: 2025-08-20*  
*Motivated by: Need for seamless exploration experience without wait times*