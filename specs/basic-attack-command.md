# Basic Attack Command Implementation Spec

## Overview

Enhance the existing attack command to actually kill characters instead of just making them say "Ow". This implements instant-kill mechanics for simplicity without any combat system complexity.

## Current State

The attack command is already implemented in both:
- `src/gameController.ts` (handleAttackCommand method)  
- `src/sessionInterface.ts` (attack command handler)

Both implementations currently:
1. Find the character using partial name matching
2. Check if character exists and is alive
3. Make the character say "Ow"

## Required Changes

### 1. Add setCharacterDead method to CharacterService

**File**: `src/services/characterService.ts`

Add new method:
```typescript
async setCharacterDead(characterId: number): Promise<void> {
  await this.db.run(
    'UPDATE characters SET is_dead = ? WHERE id = ?',
    [true, characterId]
  );
}
```

### 2. Update GameController attack handler  

**File**: `src/gameController.ts` - line ~2110

Replace:
```typescript
// Character responds to attack
this.tui.display(`${character.name} says "Ow"`, MessageType.NORMAL);
```

With:
```typescript
// Kill the character
await this.characterService.setCharacterDead(character.id);
this.tui.display(`You killed the ${character.name}.`, MessageType.COMBAT);
```

### 3. Update SessionInterface attack handler

**File**: `src/sessionInterface.ts` - line ~992

Replace:
```typescript
// Character responds to attack
console.log(`${target.name} says "Ow"`);
```

With:
```typescript
// Kill the character
await characterService.setCharacterDead(target.id);
console.log(`You killed the ${target.name}.`);
```

## Expected Behavior After Changes

### Successful Attack
```
> attack goblin
You killed the Goblin Warrior.
```

### Failed Attack (Character Not Found) - Already Working
```
> attack dragon
There is no dragon here to attack.
```

### Failed Attack (Already Dead) - Already Working
```
> attack goblin  
The Goblin Warrior is already dead.
```

## Testing Requirements

1. **Character Death State**: Verify character's `is_dead` field is set to true
2. **Success Message**: Confirm correct kill message is displayed
3. **Cannot Attack Dead**: Verify dead characters cannot be attacked again
4. **Partial Name Matching**: Ensure partial names still work
5. **Case Insensitive**: Verify case-insensitive matching works
6. **Both Interfaces**: Test both GameController and SessionInterface work

## File Dependencies

- `src/services/characterService.ts` - Add new method
- `src/gameController.ts` - Update attack handler
- `src/sessionInterface.ts` - Update attack handler  
- `src/types/character.ts` - Character interface (already has is_dead field)

## Notes

- No database schema changes needed (is_dead field already exists)
- No new dependencies required
- Maintains existing error handling and validation
- Uses existing character finding logic
- Compatible with current character system