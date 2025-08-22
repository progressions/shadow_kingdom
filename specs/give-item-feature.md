# Give Item Feature Specification

## Overview
Implement a "give" command that allows players to give items from their inventory to NPCs, with the NPC acknowledging receipt. The item is removed from the player's inventory.

## Command Syntax
```
give [item] to [character]
give gold to troll
give sword to ogre
give hat to squirrel
```

## Implementation Plan

### 1. Command Architecture

#### GameController Updates
```typescript
// Add to game commands
this.commandRouter.addGameCommand({
  name: 'give',
  description: 'Give an item to a character',
  handler: async (args) => await this.handleGiveCommand(args)
});

private async handleGiveCommand(args: string[]): Promise<void> {
  // Parse: "give [item] to [character]"
  const toIndex = args.indexOf('to');
  if (toIndex === -1 || toIndex === 0) {
    this.display.error('Usage: give [item] to [character]');
    return;
  }
  
  const itemName = args.slice(0, toIndex).join(' ');
  const characterName = args.slice(toIndex + 1).join(' ');
  
  // Validate and execute transfer
  await this.characterService.giveItemToCharacter(
    this.gameId,
    this.currentRoomId,
    itemName,
    characterName
  );
}
```

### 2. Character Service Implementation

```typescript
// characterService.ts additions
async giveItemToCharacter(
  gameId: number,
  roomId: number,
  itemName: string,
  characterName: string
): Promise<GiveItemResult> {
  // 1. Find character in current room
  const character = await this.findCharacterInRoom(roomId, characterName);
  if (!character) {
    return { success: false, message: `There is no ${characterName} here.` };
  }
  
  // 2. Find item in player inventory
  const item = await this.inventoryService.findItem(gameId, itemName);
  if (!item) {
    return { success: false, message: `You don't have a ${itemName}.` };
  }
  
  // 3. Remove item from player inventory
  await this.inventoryService.removeFromPlayer(gameId, item.id);
  
  // 4. Generate response (simple for now)
  const response = "Thank you.";
  
  return { 
    success: true, 
    message: `You give the ${item.name} to ${character.name}.`,
    characterResponse: response
  };
}
```

### 3. Inventory Service Updates

```typescript
// inventoryService.ts
async findItem(gameId: number, itemName: string): Promise<Item | null> {
  // Case-insensitive partial match
  const query = `
    SELECT i.* FROM items i
    JOIN inventory inv ON i.id = inv.item_id
    WHERE inv.game_id = ? 
    AND LOWER(i.name) LIKE LOWER(?)
  `;
  return await this.db.get<Item>(query, [gameId, `%${itemName}%`]);
}

async removeFromPlayer(gameId: number, itemId: number): Promise<void> {
  await this.db.run(
    'DELETE FROM inventory WHERE game_id = ? AND item_id = ?',
    [gameId, itemId]
  );
}
```

### 4. Character Matching Logic

```typescript
// Flexible character name matching
private async findCharacterInRoom(
  roomId: number,
  searchName: string
): Promise<Character | null> {
  // Try exact match first
  let character = await this.db.get<Character>(
    'SELECT * FROM characters WHERE room_id = ? AND LOWER(name) = LOWER(?)',
    [roomId, searchName]
  );
  
  if (!character) {
    // Try partial match
    character = await this.db.get<Character>(
      'SELECT * FROM characters WHERE room_id = ? AND LOWER(name) LIKE LOWER(?)',
      [roomId, `%${searchName}%`]
    );
  }
  
  return character;
}
```

### 5. Display Formatting

```typescript
// unifiedRoomDisplayService.ts update
private formatGiveResult(result: GiveItemResult): string {
  if (!result.success) {
    return `\n${result.message}`;
  }
  
  return `
${result.message}

${result.characterName} says, "${result.characterResponse}"
`;
}
```

## Testing Strategy

### Unit Tests
- Test item parsing from command
- Test character name matching (exact and partial)
- Test inventory validation
- Test item transfer logic
- Test error cases (no item, no character, wrong room)

### Integration Tests
```typescript
describe('Give Command', () => {
  it('should remove item from player inventory when given to NPC', async () => {
    // Setup: Create room with NPC, give player an item
    const gameId = await createGame();
    await createCharacter(roomId, 'Ancient Guardian');
    await addItemToInventory(gameId, 'golden coin');
    
    // Execute give command
    await session.executeCommand('give golden coin to guardian', gameId);
    
    // Verify item removed from player
    const playerInventory = await getPlayerInventory(gameId);
    expect(playerInventory).not.toContain('golden coin');
    
    // Verify NPC response
    expect(output).toContain('Ancient Guardian says, "Thank you."');
  });
});
```

## Future Enhancements

### Phase 2: Contextual Responses
- AI-generated responses based on character personality
- Different responses for different item types
- Character memory of received items

### Phase 3: Quest Integration
- Giving quest items triggers quest completion
- Special dialogue for quest-related items
- Rewards for giving specific items

### Phase 4: Character Reactions
- Characters may refuse certain items
- Different responses based on character mood/relationship
- Trade system where characters offer items in return
- Track given items in character memory (without storing in inventory)

## Edge Cases to Handle
1. Multiple items with similar names (disambiguation)
2. Multiple characters with similar names
3. Giving equipped items (unequip first)
4. Giving quest-critical items (warning)
5. Character inventory limits
6. Giving cursed/special items

## Success Criteria
- [x] Player can give items to NPCs using natural language
- [x] Items are removed from player inventory
- [x] NPCs acknowledge receipt with "Thank you"
- [x] Clear error messages for invalid scenarios
- [x] Partial name matching for both items and characters
- [x] Comprehensive test coverage