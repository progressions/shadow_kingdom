# Attack Shortcut Command Specification

## Overview
Implement a single-letter shortcut "a" for the attack command that automatically targets the only hostile character in the room when used without arguments.

## Core Requirements

### Command Interface
- **Command Name**: `a` (alias for `attack`)
- **Usage**: 
  - `a` (auto-target single hostile character)
  - `a [character name]` (target specific character)
- **Aliases**: `a` for `attack`
- **Arguments**: Optional character name

### Auto-Targeting Logic
- **Single Hostile Auto-Target**: When "a" is used alone:
  - Check for characters with sentiment 'hostile' or 'aggressive' in current room
  - If exactly one hostile character exists, auto-target and attack
  - If zero hostile characters, show "There's nothing to attack here."
  - If multiple hostile characters, show "Multiple targets available. Please specify: attack [character name]"
- **Manual Target**: When "a [target]" is used, behave exactly like "attack [target]"

### Integration with Existing Systems
- **Combat Mechanics**: Use existing attack system (damage, hit/miss chance, etc.)
- **Character Sentiment**: Query characters by sentiment field ('hostile', 'aggressive')
- **Command Router**: Register "a" as alias for attack command

## Implementation Details

### Command Handler Enhancement
1. Modify existing attack command handler to support auto-targeting
2. When no arguments provided:
   - Query hostile characters in current room
   - Apply targeting logic based on count
   - Auto-execute attack on single target
3. When arguments provided, use existing attack logic

### Character Query Logic
```typescript
const hostileCharacters = await this.db.all<Character>(
  'SELECT * FROM characters WHERE game_id = ? AND room_id = ? AND (sentiment = ? OR sentiment = ?) AND health > 0',
  [gameId, roomId, 'hostile', 'aggressive']
);
```

### Auto-Target Decision Tree
- 0 hostile characters: "There's nothing to attack here."
- 1 hostile character: Auto-attack that character
- 2+ hostile characters: Prompt for manual targeting

## Testing Requirements

### Unit Tests
- Auto-targeting with 0, 1, and multiple hostile characters
- Command alias registration ("a" routes to attack handler)
- Argument parsing for both "a" and "a [target]" forms
- Integration with character sentiment system

### Integration Tests
- Full "a" command flow with database queries
- Character sentiment filtering works correctly
- Auto-targeting respects health > 0 condition

### End-to-End Tests
- Player can use "a" to auto-attack single hostile character
- "a [target]" works identically to "attack [target]"
- Appropriate messages for different target count scenarios
- Integration with existing combat mechanics

## Technical Implementation

### Files to Modify
- `src/gameController.ts`: Enhance attack command handler with auto-targeting
- `src/services/commandRouter.ts`: Register "a" alias for attack command

### Command Registration
```typescript
this.commandRouter.addGameCommand({
  name: 'attack',
  aliases: ['a'],
  description: 'Attack a character (use "a" alone to auto-target)',
  handler: async (args) => await this.handleAttackCommand(args)
});
```

### Enhanced Attack Handler Flow
1. Check if arguments provided
2. If no arguments:
   - Query hostile characters in room
   - Apply auto-targeting logic
   - Execute attack on selected target or show appropriate message
3. If arguments provided:
   - Use existing attack logic

## Success Criteria
- [ ] "a" command registered as alias for "attack"
- [ ] Single hostile auto-targeting works correctly  
- [ ] Appropriate messages for 0, 1, or multiple hostile characters
- [ ] "a [target]" syntax works identically to "attack [target]"
- [ ] Respects existing combat mechanics
- [ ] Works with character sentiment system
- [ ] Full test coverage for all scenarios
- [ ] Command help updated to show "a" shortcut

## Example Usage
```
> look
You see a goblin here, snarling menacingly.

> a
You attack the goblin for 2 damage!

---

> look  
You see a friendly merchant and an angry orc here.

> a
You attack the orc for 2 damage!

---

> look
You see two goblins here.

> a
Multiple targets available. Please specify: attack [character name]

> a goblin
You attack the goblin for 2 damage!
```