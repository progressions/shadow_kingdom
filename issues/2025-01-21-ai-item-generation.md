# AI Item Generation for Rooms

**Date**: 2025-01-21  
**Status**: Not Started  
**Priority**: Medium  
**Category**: Feature  

## Description

Implement AI-powered item generation that creates thematically appropriate items when rooms are generated. Items can be either fixed (scenery) or moveable (pickupable), adding atmospheric detail and exploration rewards to the world.

## Details

**What is the requirement?**
Create an AI item generation system with the following features:

- **Automatic Item Generation**: When rooms are created, chance to spawn 1-2 items
- **Fixed vs Moveable Items**: Some items are scenery (examine only), others can be picked up
- **Thematic Appropriateness**: AI generates items that match room and region atmosphere
- **Simple Items First**: Start with decorative/flavor items, no combat stats
- **Configurable Spawn Rates**: Control item generation probability
- **Database Support**: Track fixed status for items

**Acceptance criteria:**
- [ ] Database schema includes `is_fixed` boolean for items
- [ ] Item generation integrated into room creation process
- [ ] AI generates appropriate item names and descriptions
- [ ] Fixed items cannot be picked up (examine only)
- [ ] Moveable items use existing pickup/drop mechanics
- [ ] Clear feedback when attempting to pick up fixed items
- [ ] Configurable spawn chance (default 30%)
- [ ] Support for 0-2 items per room

## Technical Notes

### Database Schema Extension
```sql
-- Add fixed status to items table
ALTER TABLE items ADD COLUMN is_fixed BOOLEAN DEFAULT FALSE;

-- Fixed items remain in room_items even when "examined"
-- Moveable items can transfer to character_inventory
```

### Item Generation Configuration
```typescript
interface ItemGenerationConfig {
  spawnChance: number;        // 0.30 = 30% chance
  maxItemsPerRoom: number;    // 1-2 items typically
  fixedItemChance: number;    // 0.40 = 40% of items are fixed
}

const DEFAULT_CONFIG: ItemGenerationConfig = {
  spawnChance: 0.30,
  maxItemsPerRoom: 2,
  fixedItemChance: 0.40
};
```

### AI Generation Prompt
```typescript
const generateRoomItem = async (room: Room, region: Region, isFixed: boolean): Promise<GeneratedItem> => {
  const itemType = isFixed ? "fixed scenery" : "portable object";
  
  const prompt = `Generate a ${itemType} item for this room:
  
  Room: ${room.name}
  Description: ${room.description}
  Region: ${region.name} (${region.type})
  
  Create a non-weapon, non-combat item that fits this room's atmosphere.
  ${isFixed 
    ? "This is a fixed item - part of the room's scenery that can be examined but not taken."
    : "This is a portable item - something interesting that can be picked up and carried."}
  
  Examples of appropriate items:
  - Fixed: ancient tapestry, stone statue, ornate fountain, heavy bookshelf
  - Portable: old journal, strange crystal, silver medallion, dusty bottle
  
  Respond with JSON:
  {
    "name": "item name (2-4 words max)",
    "description": "1-2 sentence atmospheric description that fits the room's theme"
  }`;
  
  return await grokClient.generateItem(prompt);
};
```

### Fixed Item Behavior
```typescript
// In pickup command handler
async handlePickup(itemName: string): Promise<void> {
  const roomItems = await this.itemService.getRoomItems(roomId);
  const targetItem = this.findItemByName(roomItems, itemName);
  
  if (!targetItem) {
    this.tui.display(`There's no ${itemName} here.`, MessageType.ERROR);
    return;
  }
  
  const item = await this.itemService.getItem(targetItem.item_id);
  
  if (item.is_fixed) {
    // Provide contextual message for fixed items
    this.tui.display(
      `The ${item.name} is fixed in place and cannot be taken.`,
      MessageType.NORMAL
    );
    return;
  }
  
  // Normal pickup logic for moveable items
  await this.transferItemToInventory(...);
}
```

### Integration with Room Generation
```typescript
// In RoomGenerationService.generateRoom()
private async generateRoomItems(
  roomId: number, 
  room: Room, 
  region: Region
): Promise<void> {
  const config = this.getItemGenerationConfig();
  
  // Roll for item generation
  if (Math.random() > config.spawnChance) {
    return; // No items this room
  }
  
  // Determine number of items (1 to max)
  const itemCount = Math.floor(Math.random() * config.maxItemsPerRoom) + 1;
  
  for (let i = 0; i < itemCount; i++) {
    // Determine if fixed or moveable
    const isFixed = Math.random() < config.fixedItemChance;
    
    try {
      // Generate item via AI
      const generatedItem = await this.generateRoomItem(room, region, isFixed);
      
      // Create item in database
      const itemId = await this.itemService.createItem({
        name: generatedItem.name,
        description: generatedItem.description,
        type: ItemType.MISC,
        weight: isFixed ? 999 : 0.5, // Fixed items are "heavy"
        value: Math.floor(Math.random() * 50) + 1,
        stackable: false,
        max_stack: 1,
        is_fixed: isFixed
      });
      
      // Place item in room
      await this.itemService.placeItemInRoom(roomId, itemId, 1);
      
      if (this.isDebugEnabled()) {
        console.log(`🎁 Generated ${isFixed ? 'fixed' : 'moveable'} item: ${generatedItem.name}`);
      }
    } catch (error) {
      // Log but don't fail room generation
      console.error('Failed to generate item:', error);
    }
  }
}
```

### Example Generated Items

**Fixed Items (Scenery):**
- "Ancient Stone Altar" - *A weathered altar covered in mysterious runes that glow faintly.*
- "Ornate Mirror" - *A full-length mirror in a gilded frame, its surface oddly clouded.*
- "Dusty Bookshelf" - *Rows of leather-bound tomes, their spines too faded to read.*

**Moveable Items (Portable):**
- "Tarnished Compass" - *An old brass compass that spins lazily, never pointing north.*
- "Crystal Shard" - *A fragment of deep blue crystal that feels warm to the touch.*
- "Leather Journal" - *A worn journal filled with sketches of unfamiliar landscapes.*

### Implementation Areas
- **ItemGenerationService**: New service for AI item generation
- **ItemService**: Update to handle is_fixed flag
- **RoomGenerationService**: Integration point for item generation
- **GameController**: Update pickup command to check fixed status
- **Database Migration**: Add is_fixed column to items table

## Related

- Dependencies: AI Integration (GrokClient), Item System, Room Generation
- Enables: Richer exploration, environmental storytelling
- Integration: Pickup/drop commands, examine command
- Future: Item rarity, special properties, puzzle items
- References: Phase 13 in item-system-implementation.md

## Future Enhancements

- **Item Rarity**: Add rarity tiers affecting spawn rates
- **Interactive Fixed Items**: Some fixed items could have interactions (pull lever, read book)
- **Container Items**: Fixed items that contain other items (chest, drawer)
- **Puzzle Elements**: Items that interact with each other or the environment
- **Regional Item Themes**: Stronger correlation between region type and item types