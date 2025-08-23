# Dexterity-Based Enemy Escape System Specification

**Date**: 2025-08-23  
**Status**: In Development  
**Version**: 2.0  
**Extends**: hostile-character-blocking.md

## Overview

This specification extends the existing hostile character blocking system by replacing the binary **movement** block/no-block mechanism with a skill-based dexterity check system. Players can now attempt to escape from hostile enemies using tactical movement and agility.

**Important Scope**: This system **only affects movement commands** (go north, move east, etc.). Hostile characters continue to block other interactions (pickup, examine items, talk, etc.) using the existing binary blocking system.

## System Evolution

### From Binary Blocking to Skill-Based Escape

**Previous System (v1.0):**
- Hostile characters completely prevent **all interactions** including movement
- Binary: blocked or not blocked
- No player agency in escape scenarios

**New System (v2.0):**  
- **Movement**: Skill-based escape attempts using dexterity
- **Other Actions**: Continue using existing binary blocking (pickup, examine, talk, etc.)
- Probability-based movement outcomes with clear feedback
- Maintains strategic threat while adding tactical movement options

## Core Mechanics

### Escape Attempt Process

1. **Trigger**: Player attempts movement with hostile enemies present
2. **Roll**: 1d20 + player dexterity modifier  
3. **Target**: 10 + highest enemy dexterity modifier
4. **Success**: Move to intended room if roll ≥ target
5. **Failure**: Remain in current room, show roll details

### Dexterity Modifier Integration

Uses existing `getAttributeModifier()` function from character system:

| Dexterity | Modifier | Escape Bonus |
|-----------|----------|--------------|
| 1-7       | -3       | Poor escape chances |
| 8-9       | -2       | Below average agility |
| 10-11     | -1       | Slightly clumsy |
| 12-13     | +0       | Average agility |
| 14-15     | +1       | Above average |
| 16-17     | +2       | Very agile |
| 18-20     | +3       | Exceptional agility |

### Multiple Enemy Handling

**Primary Approach**: Use highest enemy dexterity modifier
- Simulates coordinated blocking by most agile enemy
- Simpler calculation and clearer feedback
- Maintains reasonable difficulty scaling

**Alternative**: Separate rolls per enemy (future enhancement)
- More realistic but potentially punitive
- Could be difficulty setting option

## Technical Implementation

### 1. Character Service Extensions

```typescript
// New method in CharacterService
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

**Key Changes from v1.0:**
- Uses sentiment-based hostility instead of `is_hostile` boolean
- Filters for `type = 'enemy'` (NPCs don't block even if hostile)
- Orders by dexterity DESC for easy max selection

### 2. GameController Movement Updates

```typescript
// Replace existing movement blocking logic (ONLY for movement commands)
// Other commands (pickup, examine, talk) continue using existing blocking
private async handleGoCommand(direction: string): Promise<void> {
  // ... existing validation ...
  
  const hostileEnemies = await this.characterService.getHostileEnemiesInRoom(currentRoomId);
  
  if (hostileEnemies.length === 0) {
    // No hostile enemies - move normally
    return await this.executeMovement(direction);
  }
  
  // Attempt escape from hostile enemies
  const escapeSuccessful = await this.attemptEscapeFromEnemies(hostileEnemies, direction);
  
  if (escapeSuccessful) {
    await this.executeMovement(direction);
  }
  // If escape failed, player remains in room
}

private async attemptEscapeFromEnemies(enemies: Character[], direction: string): Promise<boolean> {
  const session = this.gameStateManager.getCurrentSession();
  if (!session) return false;
  
  const playerCharacter = await this.characterService.getPlayerCharacter(session.gameId!);
  if (!playerCharacter) return false;
  
  // Calculate escape attempt
  const playerDexModifier = getAttributeModifier(playerCharacter.dexterity);
  const highestEnemyDexModifier = Math.max(
    ...enemies.map(enemy => getAttributeModifier(enemy.dexterity))
  );
  
  const d20Roll = Math.floor(Math.random() * 20) + 1;
  const totalRoll = d20Roll + playerDexModifier;
  const targetNumber = 10 + highestEnemyDexModifier;
  
  const success = totalRoll >= targetNumber;
  
  // Display outcome with roll details
  if (success) {
    const enemyDescription = enemies.length > 1 
      ? `${enemies.length} enemies` 
      : `the ${enemies[0].name}`;
    this.tui.display(
      `You slip past ${enemyDescription} and escape ${direction}! [Roll: ${d20Roll}${this.formatModifier(playerDexModifier)}=${totalRoll} vs ${targetNumber}]`,
      MessageType.SYSTEM
    );
  } else {
    const blockerDescription = enemies.length > 1 
      ? 'the enemies' 
      : `the ${enemies[0].name}`;
    this.tui.display(
      `You try to escape but ${blockerDescription} block your path! [Roll: ${d20Roll}${this.formatModifier(playerDexModifier)}=${totalRoll} vs ${targetNumber}]`,
      MessageType.ERROR
    );
  }
  
  return success;
}

private formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
}
```

### 3. Utility Integration

```typescript
// Import existing attribute system
import { getAttributeModifier } from '../types/character';
```

Uses the established attribute modifier calculation system from character types.

## Migration from v1.0

### Database Schema
- **No database changes needed** - system uses existing sentiment and dexterity fields
- Backward compatible with existing characters
- `is_hostile` boolean deprecated in favor of sentiment-based system

### Behavior Changes
- **NPCs**: No longer block movement even when hostile (sentiment can be hostile but they don't physically block)
- **Enemies**: Now use dexterity-based escape checks instead of absolute blocking
- **Dead characters**: Continue to not block movement (existing behavior)

### Configuration Migration
```bash
# Old environment variables (deprecated)
DEFAULT_ENEMY_HOSTILITY=true
HOSTILE_BLOCK_ENABLED=true

# New environment variables
ESCAPE_BASE_DIFFICULTY=10           # Base target number for escape
ESCAPE_SYSTEM_ENABLED=true          # Toggle new escape system
ESCAPE_USE_LEGACY_BLOCKING=false    # Fallback to v1.0 behavior
```

## Test Implementation Strategy

### Unit Tests: `tests/services/escape-system.test.ts`

```typescript
describe('Dexterity-Based Escape System', () => {
  describe('escape calculations', () => {
    it('should calculate correct target numbers', () => {
      // Player dex 14 (+1) vs Enemy dex 12 (+0)
      // Target: 10 + 0 = 10
      // Player needs 9+ on d20 to succeed
    });
    
    it('should handle multiple enemies using highest dex', () => {
      // Multiple enemies with different dex values
      // Should use highest enemy modifier
    });
    
    it('should format roll results correctly', () => {
      // Test positive and negative modifier formatting
    });
  });
  
  describe('character service integration', () => {
    it('should find hostile enemies in room', () => {
      // Test getHostileEnemiesInRoom method
    });
    
    it('should ignore NPCs even when hostile', () => {
      // NPCs with hostile sentiment should not block
    });
    
    it('should ignore dead enemies', () => {
      // Dead enemies should not block movement
    });
  });
});
```

### Integration Tests: `tests/commands/movement-escape.test.ts`

```typescript
describe('Movement with Escape System', () => {
  describe('escape attempts', () => {
    it('should allow movement when no hostile enemies present', () => {
      // Standard movement should work normally
    });
    
    it('should attempt escape when hostile enemies present', () => {
      // Movement should trigger escape mechanics
    });
    
    it('should show appropriate success/failure messages', () => {
      // Test message formatting and display
    });
  });
  
  describe('probability scenarios', () => {
    it('should succeed with guaranteed high rolls', () => {
      // Mock Math.random for predictable outcomes
    });
    
    it('should fail with guaranteed low rolls', () => {
      // Test failure scenarios and messaging
    });
  });
});
```

### End-to-End Tests: `tests/e2e/escape-system-e2e.test.ts`

```typescript
describe('Escape System E2E', () => {
  it('should complete full escape scenario', () => {
    // Create hostile enemy in room
    // Attempt movement
    // Verify escape attempt and outcome
    // Confirm player location after attempt
  });
  
  it('should handle multiple escape attempts', () => {
    // Test repeated escape attempts
    // Verify consistent behavior
  });
});
```

## User Experience Design

### Visual Feedback Examples

**Successful Escape:**
```
> go north
You slip past the goblin warrior and escape north! [Roll: 15+1=16 vs 10]
```

**Failed Escape:**  
```
> go north  
You try to escape but the goblin warrior blocks your path! [Roll: 7+1=8 vs 10]
```

**Multiple Enemies:**
```
> go east
You try to escape but the 3 enemies block your path! [Roll: 12-1=11 vs 13]
```

### Probability Communication

Players can examine enemies to see their dexterity and estimate escape chances:

```
> examine goblin
The goblin warrior is a nimble fighter. [Dexterity: 14]
```

This allows tactical assessment without explicitly showing mathematical odds.

## Implementation Phases

### Phase 1: Core Mechanics
- [ ] Implement `getHostileEnemiesInRoom()` in CharacterService
- [ ] Add `attemptEscapeFromEnemies()` to GameController
- [ ] Update movement commands to use new escape logic
- [ ] Basic success/failure messaging

### Phase 2: Polish & Feedback
- [ ] Enhanced visual feedback with roll details
- [ ] Proper message formatting and styling
- [ ] Integration with examine command for dexterity display

### Phase 3: Testing & Validation
- [ ] Comprehensive unit test suite
- [ ] Integration tests with movement system
- [ ] End-to-end scenario testing
- [ ] Balance testing with different dexterity ranges

### Phase 4: Configuration & Tuning
- [ ] Environment variable support
- [ ] Difficulty setting integration
- [ ] Performance optimization
- [ ] Documentation updates

## Success Metrics

### Functional Requirements
- ✅ Escape system replaces binary blocking
- ✅ Dexterity becomes meaningful for exploration
- ✅ Clear feedback on escape attempts and outcomes
- ✅ Backward compatible with existing character system

### Player Experience Goals
- Players understand why escape succeeded/failed
- High-dex characters feel more agile and scout-like
- Combat maintains strategic weight while allowing tactical options  
- System feels fair and skill-based rather than arbitrary

### Technical Quality
- No performance regression on movement commands
- Comprehensive test coverage (>90%)
- Clean integration with existing systems
- Maintainable and extensible code architecture

## Future Enhancements

### Advanced Escape Mechanics
- Equipment bonuses (light armor = dex bonus)
- Environmental factors (narrow passages favor dex)
- Character abilities (thief skills, magic)

### Combat Integration
- Failed escapes trigger opportunity attacks
- Successful escapes grant temporary immunity
- Chase mechanics for persistent enemies

### Tactical Depth
- Directional escape difficulties
- Group coordination for multiple party members
- Stealth-based escape alternatives

This specification provides a complete roadmap for implementing the dexterity-based escape system while maintaining compatibility with the existing character blocking infrastructure.