# Hostile Character Blocking System Specification

**Date**: 2025-08-22  
**Status**: In Development  
**Version**: 1.0  

## Overview

The hostile character blocking system prevents players from leaving a room when hostile characters are present. This creates strategic gameplay where players must either defeat hostile enemies or find alternative ways to escape dangerous situations.

## System Components

### 1. Database Schema

#### Characters Table Extension
```sql
ALTER TABLE characters ADD COLUMN is_hostile BOOLEAN DEFAULT FALSE;
```

- **is_hostile**: Boolean flag indicating whether a character blocks player movement
- Default value: FALSE (non-hostile)
- Applies to all character types (player, npc, enemy)

### 2. Character Types and Hostility

| Character Type | Default is_hostile | Behavior |
|---------------|-------------------|----------|
| player | FALSE | Never blocks movement |
| npc | FALSE | Usually non-hostile, can be set hostile situationally |
| enemy | TRUE | Typically hostile, blocks player escape |

### 3. Movement Validation

#### Validation Flow
1. Player attempts to move (e.g., "go north")
2. System checks for hostile characters in current room
3. If any character has `is_hostile = true`:
   - Movement is blocked
   - Error message displayed
4. If no hostile characters or all have `is_hostile = false`:
   - Movement proceeds normally

#### Error Messages
- Single hostile: "You cannot flee! The [enemy name] blocks your path!"
- Multiple hostiles: "You cannot flee! Hostile enemies block your escape!"

### 4. Character Service API

#### New Methods

```typescript
interface CharacterService {
  // Get all hostile characters in a room
  getHostileCharacters(roomId: number): Promise<Character[]>;
  
  // Check if room has any hostile characters
  hasHostileCharacters(roomId: number): Promise<boolean>;
  
  // Update character hostility
  setCharacterHostility(characterId: number, isHostile: boolean): Promise<void>;
}
```

### 5. Display Indicators

#### Room Display
When listing characters in a room:
- Hostile characters: "⚔️ [Name] (hostile)"
- Non-hostile NPCs: "👤 [Name]"
- Dead characters: "💀 [Name] (dead)"

#### Character Examination
When examining a character:
- Show hostility status in character details
- Example: "The goblin warrior eyes you with open hostility."

### 6. Character Generation

#### AI Generation
When generating characters via AI:
- Enemy type characters: Set `is_hostile = true` by default
- NPC type characters: Set `is_hostile = false` by default
- Allow AI to override based on character description

#### Manual Creation
- Provide option to set hostility when creating characters
- Default based on character type

## Implementation Details

### GameController Movement Method

```typescript
private async move(args: string[]) {
  // ... existing validation ...
  
  // Check for hostile characters blocking movement
  const hostileCharacters = await this.characterService.getHostileCharacters(currentRoomId);
  
  if (hostileCharacters.length > 0) {
    const hostileName = hostileCharacters[0].name;
    this.tui.display(
      `You cannot flee! The ${hostileName} blocks your path!`,
      MessageType.ERROR
    );
    return;
  }
  
  // ... proceed with movement ...
}
```

### Character Service Implementation

```typescript
async getHostileCharacters(roomId: number): Promise<Character[]> {
  return await this.db.all<Character>(
    'SELECT * FROM characters WHERE current_room_id = ? AND is_hostile = 1 AND (is_dead IS NULL OR is_dead = 0)',
    [roomId]
  );
}

async hasHostileCharacters(roomId: number): Promise<boolean> {
  const result = await this.db.get<{ count: number }>(
    'SELECT COUNT(*) as count FROM characters WHERE current_room_id = ? AND is_hostile = 1 AND (is_dead IS NULL OR is_dead = 0)',
    [roomId]
  );
  return result?.count > 0;
}
```

## Future Enhancements

### Phase 2: Combat Resolution
- Implement combat system to defeat hostile characters
- Dead hostile characters no longer block movement
- Victory conditions and rewards

### Phase 3: Escape Mechanics
- Dexterity-based flee checks
- Special abilities to bypass hostiles
- Stealth/invisibility options

### Phase 4: Directional Blocking
- Hostiles can block specific exits
- Strategic positioning in rooms
- Flanking and tactical movement

### Phase 5: Faction System
- Dynamic hostility based on player actions
- Reputation affects NPC hostility
- Diplomacy options to de-escalate

## Testing Strategy

### Manual Testing Commands

1. **Create hostile enemy**
```bash
npm run dev -- --cmd "spawn enemy goblin hostile" --game-id 1
```

2. **Test movement blocking**
```bash
npm run dev -- --cmd "go north" --game-id 1
# Should see: "You cannot flee! The goblin blocks your path!"
```

3. **Toggle hostility**
```bash
npm run dev -- --cmd "pacify goblin" --game-id 1
npm run dev -- --cmd "go north" --game-id 1
# Movement should now succeed
```

### Automated Tests

1. Test hostile character creation
2. Test movement blocking with hostile present
3. Test movement allowed with non-hostile
4. Test dead hostile doesn't block
5. Test multiple hostiles in room

## Configuration

### Environment Variables
```bash
DEFAULT_ENEMY_HOSTILITY=true  # Whether enemies are hostile by default
HOSTILE_BLOCK_ENABLED=true    # Toggle the blocking system on/off
```

### Game Settings
- Allow per-game configuration of hostility rules
- Difficulty modes affecting hostile behavior

## Migration Path

1. Add database column with migration
2. Update Character interfaces
3. Implement CharacterService methods
4. Add movement validation
5. Update character generation
6. Enhance display indicators
7. Test thoroughly
8. Document for players

## Success Metrics

- Players encounter and must deal with hostile enemies
- Strategic gameplay emerges around hostile encounters
- Clear feedback when movement is blocked
- System is intuitive and consistent