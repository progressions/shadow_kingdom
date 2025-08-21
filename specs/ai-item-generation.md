# AI Item Generation Specification

## Overview

This specification defines the AI-powered item generation system for Shadow Kingdom, which automatically creates thematically appropriate items when rooms are generated. The system distinguishes between fixed scenery items and portable items, adding depth to exploration and world-building.

## Core Concepts

### Item Types

1. **Fixed Items (Scenery)**
   - Part of the room's permanent features
   - Can be examined but not picked up
   - Examples: statues, fountains, bookshelves, altars
   - Enhance room atmosphere and storytelling

2. **Portable Items**
   - Can be picked up, carried, and dropped
   - Add collectible elements to exploration
   - Examples: journals, crystals, medallions, artifacts
   - Use existing inventory mechanics

### Generation Rules

- **Spawn Chance**: 30% probability per room (configurable)
- **Item Count**: 1-2 items when generation triggers
- **Fixed Ratio**: 40% of generated items are fixed
- **Item Type**: All generated items use ItemType.MISC initially
- **No Combat Stats**: Items are purely atmospheric/collectible

## Implementation Phases

### Phase 1: Database Foundation
**Objective**: Add support for fixed items

1. **Add is_fixed column**
   ```sql
   ALTER TABLE items ADD COLUMN is_fixed BOOLEAN DEFAULT FALSE;
   ```

2. **Update TypeScript interfaces**
   ```typescript
   interface Item {
     // existing fields...
     is_fixed?: boolean;
   }
   ```

3. **Migration strategy**
   - Existing items default to moveable (is_fixed = false)
   - Preserve backward compatibility

### Phase 2: Item Generation Service
**Objective**: Create service for AI-powered item generation

1. **Create ItemGenerationService**
   ```typescript
   export class ItemGenerationService {
     constructor(
       private db: Database,
       private grokClient: GrokClient,
       private itemService: ItemService
     ) {}
     
     async generateRoomItem(
       room: Room,
       region: Region,
       isFixed: boolean
     ): Promise<GeneratedItem>
     
     async shouldGenerateItems(): Promise<boolean>
     
     async determineItemCount(): Promise<number>
     
     async populateRoomWithItems(
       roomId: number,
       room: Room,
       region: Region
     ): Promise<void>
   }
   ```

2. **Configuration management**
   ```typescript
   interface ItemGenerationConfig {
     spawnChance: number;      // 0.0 to 1.0
     maxItemsPerRoom: number;  // typically 2
     fixedItemChance: number;  // 0.0 to 1.0
     enabled: boolean;         // feature flag
   }
   ```

3. **AI prompt templates**
   - Separate prompts for fixed vs portable items
   - Include room context and regional theme
   - Request appropriate names and descriptions

### Phase 3: Core Integration
**Objective**: Integrate item generation with room creation

1. **Modify RoomGenerationService**
   - Call item generation after room creation
   - Handle generation failures gracefully
   - Log generated items in debug mode

2. **Update pickup command**
   - Check is_fixed status before allowing pickup
   - Provide appropriate feedback for fixed items
   - Maintain existing behavior for portable items

3. **Update examine command**
   - Work identically for fixed and portable items
   - Show item description regardless of type

### Phase 4: AI Prompts and Templates
**Objective**: Define effective prompts for item generation

1. **Fixed item prompt template**
   ```
   Generate a fixed scenery item for this room:
   
   Room: [room name]
   Description: [room description]
   Region: [region name and type]
   
   This should be part of the room's permanent features - something that
   can be examined but not taken. Examples: furniture, architectural features,
   decorations, monuments.
   
   Provide a name (2-4 words) and atmospheric description (1-2 sentences).
   ```

2. **Portable item prompt template**
   ```
   Generate a portable item for this room:
   
   Room: [room name]
   Description: [room description]
   Region: [region name and type]
   
   This should be something interesting that can be picked up and carried.
   It should fit the room's theme but be small enough to take.
   Examples: books, artifacts, tools, curiosities.
   
   Provide a name (2-4 words) and atmospheric description (1-2 sentences).
   ```

3. **Response parsing**
   - Validate JSON structure
   - Sanitize generated text
   - Apply length limits

### Phase 5: Testing and Validation
**Objective**: Ensure reliable item generation

1. **Unit tests**
   - Item generation logic
   - Fixed vs portable behavior
   - Configuration management

2. **Integration tests**
   - Room creation with items
   - Pickup command with fixed items
   - AI generation fallbacks

3. **Manual testing checklist**
   - [ ] Items generate at expected rate
   - [ ] Fixed items cannot be picked up
   - [ ] Portable items work with inventory
   - [ ] Generated items fit room themes
   - [ ] Error handling works correctly

## Configuration

### Environment Variables
```bash
# Item generation settings
ITEM_GENERATION_ENABLED=true
ITEM_SPAWN_CHANCE=0.30
MAX_ITEMS_PER_ROOM=2
FIXED_ITEM_CHANCE=0.40
```

### Default Values
- Spawn chance: 30%
- Max items: 2
- Fixed chance: 40%
- Weight for fixed items: 999 (prevents pickup)
- Weight for portable items: 0.5

## AI Generation Examples

### Fixed Items by Region Type

**Abandoned Mansion**
- "Dusty Grand Piano" - *An elegant piano covered in dust, its keys yellowed with age.*
- "Cracked Oil Painting" - *A portrait of a stern nobleman, the canvas torn across his face.*
- "Marble Fireplace" - *An ornate fireplace filled with cold ashes and cobwebs.*

**Ancient Forest**
- "Moss-Covered Stone" - *An ancient standing stone carved with weathered runes.*
- "Gnarled Oak Tree" - *A massive oak with a trunk wider than three men could embrace.*
- "Forest Shrine" - *A small wooden shrine adorned with wilted flower offerings.*

**Underground Cavern**
- "Stalactite Formation" - *Crystalline formations hang from the ceiling like frozen waterfalls.*
- "Underground Pool" - *A perfectly still pool of water reflecting the dim light.*
- "Cave Paintings" - *Primitive paintings on the wall depicting strange hunting scenes.*

### Portable Items by Region Type

**Abandoned Mansion**
- "Silver Locket" - *A tarnished locket containing a faded photograph.*
- "Leather Journal" - *A personal diary filled with cramped handwriting.*
- "Crystal Decanter" - *An empty decanter that still smells faintly of brandy.*

**Ancient Forest**
- "Carved Wooden Idol" - *A small figurine carved from dark wood in an unfamiliar style.*
- "Glowing Mushroom" - *A bioluminescent fungus that casts a soft blue light.*
- "Bird Feather" - *An iridescent feather from some exotic bird.*

**Underground Cavern**
- "Glowing Crystal" - *A small crystal that pulses with inner light.*
- "Ancient Coin" - *A corroded coin bearing the face of an unknown ruler.*
- "Fossil Fragment" - *A piece of stone containing the impression of prehistoric leaves.*

## Error Handling

### Generation Failures
- If AI generation fails, room creation continues without items
- Log errors for debugging but don't interrupt gameplay
- Consider fallback to predefined item templates

### Invalid AI Responses
- Validate JSON structure before parsing
- Apply reasonable defaults for missing fields
- Truncate overly long names/descriptions

### Database Errors
- Handle item creation failures gracefully
- Clean up partial data on transaction failure
- Report errors in debug mode only

## Future Enhancements

### Near Term
- **Item Categories**: Separate prompts for different item categories
- **Rarity System**: Variable spawn rates for common/rare items
- **Regional Themes**: Stronger item-region correlations

### Long Term
- **Interactive Items**: Fixed items with special interactions
- **Container System**: Items that contain other items
- **Puzzle Items**: Items that interact with environment
- **Quest Items**: Story-critical items with special properties
- **Crafting Materials**: Items usable in crafting system

## Success Metrics

1. **Generation Rate**: ~30% of rooms contain items
2. **Theme Coherence**: Items match room/region atmosphere
3. **Player Engagement**: Players examine and collect items
4. **Performance**: Item generation adds <100ms to room creation
5. **Error Rate**: <1% generation failure rate

## Dependencies

- **Required Systems**
  - GrokClient (AI generation)
  - ItemService (item management)
  - RoomGenerationService (integration point)
  - Database (storage)

- **Optional Enhancements**
  - Equipment system (for future equipment items)
  - Combat system (for future weapon/armor generation)
  - Quest system (for quest item generation)

## Migration Plan

1. **Phase 1**: Deploy database changes
   - Add is_fixed column
   - Update TypeScript types
   - Test with existing items

2. **Phase 2**: Deploy generation service
   - ItemGenerationService implementation
   - Integration with RoomGenerationService
   - Feature flag for gradual rollout

3. **Phase 3**: Enable generation
   - Start with low spawn rate (10%)
   - Monitor generation quality
   - Adjust prompts based on results
   - Increase to target rate (30%)

## Appendix: Sample Generated Items

### High-Quality Examples
These represent the target quality for generated items:

**Fixed Scenery**
- Name: "Ancient Stone Throne"
- Description: "A weathered throne carved from a single block of granite, its armrests worn smooth by countless hands."

**Portable Object**
- Name: "Mysterious Glass Orb"  
- Description: "A perfectly spherical orb that seems to contain swirling mists that move of their own accord."

### Edge Cases to Avoid

**Too Generic**
- Bad: "Old Book" - "It's an old book."
- Good: "Leather-Bound Tome" - "A thick tome bound in cracked leather, its pages filled with indecipherable script."

**Too Powerful**
- Bad: "Sword of Infinite Power" 
- Good: "Ceremonial Dagger" - "An ornate dagger meant for display rather than combat."

**Too Modern**
- Bad: "Laptop Computer"
- Good: "Mechanical Curiosity" - "A complex device of gears and springs whose purpose is unclear."