# Simple Combat System

## Description
Implement an extremely simple combat system where players can attack any character with a fixed damage amount.

## Requirements
- Add an `attack` command that accepts a character name as target
- When player attacks a character, reduce target's health by exactly 2 points
- If character's health reaches 0 or below, mark them as dead
- No additional database changes needed - use existing character health field
- No stats, tracking, or complexity - just basic damage dealing

## Implementation Details
- Command: `attack [character name]` or `attack [character]`
- Fixed damage: 2 points per attack
- Death condition: health <= 0
- Works on any type of character (NPCs, enemies, etc.)

## Acceptance Criteria
- [ ] Player can use `attack` command to target characters in current room
- [ ] Each attack reduces target health by exactly 2 points
- [ ] Characters with health <= 0 are marked as dead
- [ ] Dead characters cannot be attacked again
- [ ] Appropriate feedback messages for successful attacks and deaths
- [ ] Error handling for invalid targets or already dead characters

## Technical Notes
- Modify existing character health field, no new database schema required
- Add attack command handler to GameController
- Update character state in database when health changes
- Simple boolean dead/alive state based on health value