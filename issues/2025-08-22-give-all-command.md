# Give All to Character Command

## Issue Details

**Date**: 2025-08-22  
**Status**: Open  
**Priority**: Medium  
**Category**: Feature  

## Description

Implement a "give all to [character]" command that executes the 'give' command for all items in the player's inventory to a specified character, with proper action validation and effect triggering.

## Details

**What is the requirement?**
Create a bulk give command with the following features:

- **Give All Command**: `give all to [character name]` gives all inventory items to target
- **Character Finding**: Support partial name matching for target character
- **Action Validation**: Each item must pass validation before being given
- **Effect Triggering**: All 'give' action effects must be triggered for each item
- **Individual Processing**: Process each item separately through existing give logic
- **Case Insensitive**: Command works regardless of character name case
- **Comprehensive Feedback**: Show results for each item given or failed

**Acceptance criteria:**
- [ ] "give all to [character]" command registered in GameController and SessionInterface
- [ ] Command finds target character by partial name match
- [ ] Iterates through all player inventory items
- [ ] Each item goes through existing give command validation
- [ ] Each successful give triggers item's give action effects
- [ ] Failed gives (validation failures) are reported but don't stop processing
- [ ] Clear feedback for each item: success or failure reason
- [ ] Error message if character not found
- [ ] Error message if inventory is empty
- [ ] Works with NPCs, enemies, and other players
- [ ] Test coverage for give all command

## Examples

### Successful Give All
```
> give all to wraith
You gave Ancient Key to Wraith.
You gave Healing Herbs to Wraith.
You gave Iron Sword to Wraith.
You gave 3 items to Wraith.
```

### Partial Success (Some Items Can't Be Given)
```
> give all to merchant
You gave Ancient Key to Merchant.
Iron Sword cannot be given - it's cursed to your hand.
You gave Healing Herbs to Merchant.
You gave 2 out of 3 items to Merchant.
```

### Failed Give All (Character Not Found)
```
> give all to dragon
There is no dragon here to give items to.
```

### Failed Give All (Empty Inventory)
```
> give all to wraith
You have no items to give.
```

## Technical Notes

### Command Implementation
```typescript
// In GameController and SessionInterface
commandRouter.addGameCommand({
  name: 'give',
  description: 'Give an item or all items to a character',
  handler: async (args: string[]) => {
    if (args.length < 3 || args[1] !== 'to') {
      console.log('Usage: give <item|all> to <character>');
      return;
    }
    
    const itemName = args[0].toLowerCase();
    const targetName = args.slice(2).join(' ').toLowerCase();
    
    if (itemName === 'all') {
      await this.handleGiveAll(targetName);
    } else {
      await this.handleGiveSingle(itemName, targetName);
    }
  }
});

async handleGiveAll(targetName: string) {
  const currentRoomId = gameStateManager.getCurrentRoomId();
  
  // Find target character
  const characters = await characterService.getRoomCharacters(currentRoomId);
  const target = characters.find(char => 
    char.name.toLowerCase().includes(targetName)
  );
  
  if (!target) {
    console.log(`There is no ${targetName} here to give items to.`);
    return;
  }
  
  // Get all player inventory items
  const inventory = await itemService.getPlayerInventory();
  
  if (inventory.length === 0) {
    console.log('You have no items to give.');
    return;
  }
  
  let successCount = 0;
  let totalCount = inventory.length;
  
  // Process each item through existing give logic
  for (const item of inventory) {
    try {
      // Use existing give validation and processing
      const canGive = await actionValidationService.validateGive(item, target);
      
      if (canGive.valid) {
        await itemService.transferItem(item.id, target.id);
        await actionEffectService.triggerGiveEffects(item, target);
        console.log(`You gave ${item.name} to ${target.name}.`);
        successCount++;
      } else {
        console.log(`${item.name} cannot be given - ${canGive.reason}.`);
      }
    } catch (error) {
      console.log(`Failed to give ${item.name} - ${error.message}.`);
    }
  }
  
  console.log(`You gave ${successCount} out of ${totalCount} items to ${target.name}.`);
}
```

### Integration Points
- **Existing Give Command**: Reuse validation and effect logic from single-item give
- **Action Validation**: Use existing `actionValidationService.validateGive()`
- **Effect Triggering**: Use existing `actionEffectService.triggerGiveEffects()`
- **Item Transfer**: Use existing `itemService.transferItem()`
- **Character Finding**: Reuse character lookup logic from other commands

### Service Dependencies
```typescript
// Ensure these services have the required methods
interface ActionValidationService {
  validateGive(item: Item, target: Character): Promise<{valid: boolean, reason?: string}>;
}

interface ActionEffectService {
  triggerGiveEffects(item: Item, target: Character): Promise<void>;
}

interface ItemService {
  getPlayerInventory(): Promise<Item[]>;
  transferItem(itemId: number, targetCharacterId: number): Promise<void>;
}
```

## Future Enhancements

1. **Give All Except**: `give all except sword to merchant` - exclude specific items
2. **Give All Type**: `give all weapons to guard` - give all items of a specific type
3. **Confirmation Prompt**: Ask for confirmation before giving valuable items
4. **Undo Give**: Allow undoing recent bulk give operations
5. **Give Limits**: Characters may have limits on how many items they can accept
6. **Bulk Effect Optimization**: Batch similar effects for performance

## Testing Approach

1. **Setup**: Create room with character and player with multiple items
2. **Test Cases**:
   - Give all items to valid character (all succeed)
   - Give all items where some fail validation
   - Give all to non-existent character
   - Give all with empty inventory
   - Give all where some items have special effects
   - Case-insensitive character matching
3. **Effect Verification**: Ensure all item effects are properly triggered
4. **State Verification**: Confirm items are properly transferred

## Dependencies

- Requires existing give command infrastructure
- Uses action validation system
- Uses action effect system
- Builds on character and item services
- Extends current give command rather than replacing it

## Related

- Links to existing give command implementation
- References action validation system issue
- Builds on item transfer mechanics
- Foundation for future bulk action commands