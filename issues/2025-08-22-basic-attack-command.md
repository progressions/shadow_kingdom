# Basic Attack Command

**Date**: 2025-08-22  
**Status**: Open  
**Priority**: Medium  
**Category**: Feature  

## Description

Implement the most basic attack command that allows players to type "attack [character]" to instantly kill the target character. No combat mechanics, randomness, or damage calculations - just immediate death.

## Details

**What is the requirement?**
Create a simple attack command with the following features:

- **Attack Command**: `attack [character name]` targets a character in the room
- **Character Finding**: Support partial name matching (e.g., "attack goblin" finds "Goblin Warrior")
- **Instant Death**: Attacked character immediately dies (is_dead = true)
- **Case Insensitive**: Command works regardless of character name case
- **Clear Feedback**: Show that the character has been killed

**Acceptance criteria:**
- [ ] Attack command registered in GameController and SessionInterface
- [ ] Command finds characters by partial name match
- [ ] Attack sets character's is_dead status to true
- [ ] Attack displays: "You killed the [Character Name]"
- [ ] Error message if character not found: "There is no [name] here to attack"
- [ ] Cannot attack already dead characters
- [ ] Works with NPCs, enemies, and other players
- [ ] Case-insensitive character name matching
- [ ] Test coverage for attack command

## Examples

### Successful Attack
```
> attack goblin
You killed the Goblin Warrior.

> attack crypt keeper
You killed the Crypt Keeper.

> attack spider
You killed the Giant Spider.
```

### Failed Attack (Character Not Found)
```
> attack dragon
There is no dragon here to attack.
```

### Failed Attack (Dead Character)
```
> attack goblin
The Goblin Warrior is already dead.
```

## Technical Notes

### Command Implementation
```typescript
// In GameController and SessionInterface
commandRouter.addGameCommand({
  name: 'attack',
  description: 'Attack a character in the room',
  handler: async (args: string[]) => {
    if (args.length === 0) {
      console.log('Attack who? Specify a target (e.g., "attack goblin")');
      return;
    }
    
    const targetName = args.join(' ').toLowerCase();
    const currentRoomId = gameStateManager.getCurrentRoomId();
    
    // Find character in room by partial name match
    const characters = await characterService.getRoomCharacters(currentRoomId);
    const target = characters.find(char => 
      char.name.toLowerCase().includes(targetName)
    );
    
    if (!target) {
      console.log(`There is no ${targetName} here to attack.`);
      return;
    }
    
    if (target.is_dead) {
      console.log(`The ${target.name} is already dead.`);
      return;
    }
    
    // Kill the character
    await characterService.setCharacterDead(target.id);
    console.log(`You killed the ${target.name}.`);
  }
});
```

### Character Service Extension
- Use existing `getRoomCharacters()` method
- Add `setCharacterDead(characterId)` method to update character status
- Add character name matching logic similar to item service

## Future Enhancements

This basic instant-kill attack command lays the foundation for a full combat system:

1. **Health System**: Add health points instead of instant death
2. **Damage Calculation**: Apply actual damage based on player stats
3. **Combat Feedback**: Show damage numbers and health remaining
4. **Hostile Response**: Attacked NPCs become hostile
5. **Counter-attacks**: Enemies fight back
6. **Weapons & Armor**: Equipment affects damage
7. **Combat Log**: Detailed combat messages
8. **Experience Gain**: Reward XP for defeating enemies

## Testing Approach

1. Create room with multiple characters (NPC and enemy)
2. Test attacking by full name
3. Test attacking by partial name
4. Test attacking non-existent character
5. Test attacking dead character
6. Test case-insensitive matching

## Dependencies

- Requires character service to find characters in room
- Uses existing character death state (`is_dead` field)
- Builds on hostile character system for future enhancements