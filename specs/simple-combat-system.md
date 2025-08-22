# Simple Combat System Specification

## Overview
Implement a minimal combat system that allows players to attack characters with fixed damage amounts.

## Core Requirements

### Command Interface
- **Command Name**: `attack`
- **Usage**: `attack [character name]`
- **Aliases**: None required
- **Arguments**: Single character name (required)

### Combat Mechanics
- **Damage**: Fixed 2 points per attack
- **Health System**: Use existing character health field
- **Death Condition**: health <= 0
- **Target Types**: Any character (NPCs, enemies, etc.)

### Database Integration
- No new tables or fields required
- Update existing character health field
- Mark characters as dead when health <= 0

## Implementation Details

### Command Handler
1. Parse character name from command arguments
2. Find character in current room
3. Validate target (exists, not dead, not player)
4. Apply damage (reduce health by 2)
5. Update database with new health value
6. Check for death condition
7. Provide appropriate feedback

### Error Handling
- Character not found in room
- Character already dead
- Invalid target (empty name, player self-attack)
- Database update failures

### Feedback Messages
- Successful attack: "You attack [character]. [Character] takes 2 damage."
- Character death: "[Character] dies from your attack!"
- Character not found: "There is no [character] here to attack."
- Already dead: "[Character] is already dead."

## Testing Requirements

### Unit Tests
- Command parsing and validation
- Damage calculation (always 2 points)
- Health updates and death detection
- Error handling for invalid targets

### Integration Tests  
- Full attack command flow
- Database updates persist correctly
- Character state changes reflected in game

### End-to-End Tests
- Player can attack characters in room
- Health decreases correctly
- Characters die when health <= 0
- Dead characters cannot be attacked again

## Technical Implementation

### Files to Modify
- `src/gameController.ts`: Add attack command handler
- `src/types.ts`: Ensure character types support health/death state

### Command Registration
```typescript
this.commandRouter.addGameCommand({
  name: 'attack',
  description: 'Attack a character',
  handler: async (args) => await this.handleAttackCommand(args)
});
```

### Attack Handler Flow
1. Parse target name from args
2. Get current room characters
3. Find target character
4. Validate target (alive, not player)
5. Apply 2 damage
6. Update database
7. Check death condition
8. Return appropriate message

## Success Criteria
- [ ] `attack [character]` command works in game
- [ ] Each attack reduces target health by exactly 2
- [ ] Characters die when health reaches 0 or below
- [ ] Dead characters cannot be attacked
- [ ] Appropriate error messages for invalid targets
- [ ] All unit tests pass
- [ ] Integration tests verify database updates
- [ ] End-to-end tests confirm full functionality