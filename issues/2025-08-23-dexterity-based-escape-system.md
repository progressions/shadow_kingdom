# Dexterity-Based Enemy Escape System

**Date**: 2025-08-23  
**Status**: Completed  
**Priority**: Medium  
**Category**: Combat Enhancement  
**Completed**: 2025-08-23  

## Description

Update the enemy blocking system to use a skill-based dexterity check instead of the current binary blocking mechanism. Players should be able to attempt to escape from hostile enemies using agility and quick movement rather than being completely blocked.

## Background

Currently, hostile enemies completely block player movement - once engaged with a hostile character, the player cannot leave the room until the enemy is defeated or becomes non-hostile. This creates a rigid combat system that doesn't allow for tactical retreating or evasion tactics.

The new system will introduce skill-based escape attempts that mirror the combat system's mechanics, giving players more tactical options while maintaining the threat level of hostile enemies.

## Requirements

### Core Mechanics
- **Escape Attempt**: Player attempts to leave room with hostile enemies present
- **Die Roll**: Roll 1d20 + player's Dexterity modifier
- **Target Number**: 10 + enemy's Dexterity modifier  
- **Success**: Move to intended room if roll ≥ target number
- **Failure**: Remain in current room, potentially trigger enemy attacks

### Dexterity Modifier Calculation
- Uses existing `getAttributeModifier()` function
- Dexterity 1-7: -3 modifier
- Dexterity 8-9: -2 modifier  
- Dexterity 10-11: -1 modifier
- Dexterity 12-13: +0 modifier
- Dexterity 14-15: +1 modifier
- Dexterity 16-17: +2 modifier
- Dexterity 18-20: +3 modifier

### Multiple Enemy Scenarios
- **Single Enemy**: Roll against that enemy's dexterity
- **Multiple Enemies**: Use the highest enemy dexterity modifier
- **Alternative**: Roll against each enemy separately (all must succeed)

### Visual Feedback
- Success: `"You slip past the [Enemy Name] and escape to [Direction]!"`
- Failure: `"You try to escape but the [Enemy Name] blocks your path! [Roll: X+Y=Z vs Target]"`
- Multiple enemies: `"The enemies surround you, preventing escape!"`

## Technical Implementation

### Movement Command Updates
```typescript
// In GameController movement handling
async attemptMovement(direction: string): Promise<boolean> {
  const hostileEnemies = await this.getHostileEnemiesInRoom();
  
  if (hostileEnemies.length === 0) {
    return await this.executeMovement(direction);
  }
  
  return await this.attemptEscapeFromEnemies(hostileEnemies, direction);
}

private async attemptEscapeFromEnemies(enemies: Character[], direction: string): Promise<boolean> {
  const playerCharacter = await this.getPlayerCharacter();
  const playerDexModifier = getAttributeModifier(playerCharacter.dexterity);
  
  // Use highest enemy dex modifier as target
  const highestEnemyDexModifier = Math.max(
    ...enemies.map(enemy => getAttributeModifier(enemy.dexterity))
  );
  
  const d20Roll = Math.floor(Math.random() * 20) + 1;
  const totalRoll = d20Roll + playerDexModifier;
  const targetNumber = 10 + highestEnemyDexModifier;
  
  const success = totalRoll >= targetNumber;
  
  if (success) {
    const enemyNames = enemies.length > 1 
      ? `${enemies.length} enemies` 
      : enemies[0].name;
    this.tui.display(
      `You slip past the ${enemyNames} and escape ${direction}! [Roll: ${d20Roll}${this.formatModifier(playerDexModifier)}=${totalRoll} vs ${targetNumber}]`,
      MessageType.SYSTEM
    );
    return await this.executeMovement(direction);
  } else {
    const blockerName = enemies.length > 1 ? 'enemies' : enemies[0].name;
    this.tui.display(
      `You try to escape but the ${blockerName} blocks your path! [Roll: ${d20Roll}${this.formatModifier(playerDexModifier)}=${totalRoll} vs ${targetNumber}]`,
      MessageType.ERROR
    );
    return false;
  }
}

private formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}
```

### Character Service Integration
```typescript
// In CharacterService
async getHostileEnemiesInRoom(roomId: number): Promise<Character[]> {
  return await this.db.all<Character>(
    `SELECT * FROM characters 
     WHERE current_room_id = ? 
     AND sentiment IN ('hostile', 'aggressive')
     AND type = 'enemy'
     AND (is_dead IS NULL OR is_dead = 0)
     ORDER BY dexterity DESC`,
    [roomId]
  );
}
```

### Combat Integration
- Failed escape attempts could trigger immediate enemy attacks
- Successful escapes prevent enemy attacks for that turn
- Consider adding cooldown to prevent escape spam

## Configuration Options

### Environment Variables
```bash
# Escape system settings
ESCAPE_BASE_DIFFICULTY=10           # Base target number
ESCAPE_ALLOW_MULTI_ATTEMPTS=true   # Allow multiple escape attempts
ESCAPE_COOLDOWN_MS=3000            # Cooldown between escape attempts
ESCAPE_TRIGGERS_ATTACKS=true       # Failed escapes trigger enemy attacks
```

### Difficulty Variants
- **Easy Mode**: Base difficulty 8 instead of 10
- **Hard Mode**: Base difficulty 12, or require beating ALL enemies
- **Realistic Mode**: Each enemy gets separate roll (all must succeed)

## User Experience Considerations

### Strategic Depth
- High-dexterity characters become natural scouts/escape artists
- Low-dexterity characters must rely more on combat
- Adds tactical decision-making to combat encounters

### Balance Concerns  
- Prevent infinite escape loops with cooldowns
- Ensure combat remains engaging, not easily avoided
- Consider story/quest implications of escape mechanics

### Accessibility
- Clear feedback on why escape failed
- Show probability information if requested
- Allow players to see enemy dexterity through examine

## Test Cases

### Basic Functionality
- [ ] Single enemy with equal dexterity (50% escape chance)
- [ ] High-dex player vs low-dex enemy (high escape chance)  
- [ ] Low-dex player vs high-dex enemy (low escape chance)
- [ ] Multiple enemies use highest dexterity modifier
- [ ] Successful escape moves player to intended room
- [ ] Failed escape keeps player in current room

### Edge Cases
- [ ] Player with dexterity 1 (minimum modifier)
- [ ] Player with dexterity 20 (maximum modifier)
- [ ] Enemy with extreme dexterity values
- [ ] Zero hostile enemies (should move normally)
- [ ] Dead enemies don't block movement
- [ ] Non-enemy characters don't trigger escape mechanics

### Integration Tests
- [ ] Escape attempts work with all movement commands
- [ ] Failed escapes trigger enemy attacks (if configured)
- [ ] Successful escapes prevent enemy attacks for that turn
- [ ] Cooldown system prevents escape spam
- [ ] Visual feedback matches roll results

## Implementation Areas

- **Movement System**: Update go/movement commands with escape logic
- **Combat Integration**: Connect escape failures to enemy attack triggers  
- **Character Stats**: Utilize existing dexterity attribute system
- **User Interface**: Clear feedback for escape attempts and results
- **Configuration**: Environment-based difficulty and behavior settings

## Related Systems

- **Dependencies**: Attribute system, character service, movement commands
- **Integrates With**: Combat system, enemy AI, character sentiment
- **Enables**: Tactical retreat, scout-like gameplay, attribute specialization
- **Future**: Could expand to other skill checks (strength for breaking barriers, etc.)

## Success Metrics

- Players can successfully escape from combat when appropriate
- Dexterity becomes a meaningful character attribute for exploration
- Combat feels less restrictive while maintaining challenge
- Clear feedback helps players understand the mechanics
- System balances strategic options with combat engagement

## Notes

This system transforms the binary block/no-block mechanism into a skill-based probability system, adding depth to both character builds and tactical combat decisions. The dexterity-based approach creates natural character archetypes (agile scouts vs sturdy fighters) while maintaining the threat level of hostile encounters.

The escape system should feel fair and predictable - players should understand their chances and feel that success/failure is based on character capabilities rather than arbitrary restrictions.