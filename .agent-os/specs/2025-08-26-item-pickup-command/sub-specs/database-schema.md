# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-08-26-item-pickup-command/spec.md

> Created: 2025-08-26
> Version: 1.0.0

## Schema Modifications

### Item Table Updates

The existing Item model already supports inventory tracking through the `characterId` field, which can be used to track player ownership. No structural changes needed, but we'll utilize:

```prisma
model Item {
  id                    Int          @id @default(autoincrement())
  gameId                Int          @map("game_id")
  roomId                Int?         @map("room_id")        // null when in inventory
  characterId           Int?         @map("character_id")   // player ID when in inventory
  name                  String
  description           String
  // ... existing fields
}
```

### Inventory Tracking Approach

1. **Items in Room**: `roomId` is set, `characterId` is null
2. **Items in Inventory**: `roomId` is null, `characterId` is set to player ID
3. **Items on NPCs**: `roomId` is null, `characterId` is set to NPC ID

## Database Operations

### Query Items in Room
```sql
SELECT * FROM items 
WHERE room_id = ? 
  AND character_id IS NULL
  AND game_id = ?;
```

### Pick Up Single Item
```sql
UPDATE items 
SET room_id = NULL, 
    character_id = ?,
    updated_at = CURRENT_TIMESTAMP
WHERE id = ? 
  AND room_id = ?
  AND character_id IS NULL;
```

### Pick Up All Items (Transaction)
```sql
BEGIN TRANSACTION;

UPDATE items 
SET room_id = NULL, 
    character_id = ?,
    updated_at = CURRENT_TIMESTAMP
WHERE room_id = ? 
  AND character_id IS NULL
  AND game_id = ?;

COMMIT;
```

### Get Player Inventory
```sql
SELECT * FROM items 
WHERE character_id = ? 
  AND game_id = ?
ORDER BY name;
```

### Count Inventory Items
```sql
SELECT COUNT(*) as inventory_count 
FROM items 
WHERE character_id = ? 
  AND game_id = ?;
```

## Indexes

Add indexes for performance optimization:

```sql
CREATE INDEX idx_items_room_lookup 
ON items(room_id, character_id, game_id) 
WHERE character_id IS NULL;

CREATE INDEX idx_items_inventory 
ON items(character_id, game_id) 
WHERE character_id IS NOT NULL;
```

## Migration Notes

Since we're using the existing Item model structure, no migration is needed. The `characterId` field already exists and can be repurposed for player inventory tracking.

For future consideration:
- We may want to add a dedicated Player table to properly track the player as a special Character
- Consider adding an inventory_order field for custom inventory sorting
- May need a separate Inventory table if we implement containers or equipment slots

## Data Integrity Rules

1. **Exclusive Location**: An item cannot be in both a room and inventory simultaneously (enforced by setting one field to null when setting the other)
2. **Game Isolation**: Items can only be picked up within their own game (enforced by game_id check)
3. **Character Validation**: Only valid character IDs (including player ID) can own items
4. **Capacity Enforcement**: Implement in application layer (not database constraint) to allow for future variable capacity

## Performance Considerations

- The compound index on (room_id, character_id, game_id) optimizes the common "find all items in room" query
- The filtered index on character_id optimizes inventory queries
- Using transactions for "take all" ensures consistency even if multiple items are involved
- Consider implementing a materialized view for inventory count if it becomes a bottleneck