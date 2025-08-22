# Simple Character Dialogue System

**Date**: 2025-08-22  
**Status**: Open  
**Priority**: Low  
**Category**: Feature  

## Description

Implement a basic character dialogue system that allows players to talk to any character (NPC or enemy) in their current room. All characters respond with the same simple phrase "Lovely day." regardless of their type or state.

## Details

**What is the requirement?**
Create a minimal dialogue system with the following features:

- **Talk Command**: `talk <character_name>` command to initiate dialogue
- **Character Verification**: Confirm character exists in current room  
- **Fixed Response**: All characters respond with "Lovely day."
- **Universal**: Works with all character types (NPCs, enemies)

**Acceptance criteria:**
- [ ] `talk <character_name>` command added to game commands
- [ ] Command verifies character exists in player's current room
- [ ] All characters respond with "Lovely day." when talked to
- [ ] Error message displayed if character not found in room
- [ ] Works with existing character system (no database changes needed)

## Technical Implementation

### Command Handler
```typescript
'talk': async (characterName: string) => {
  const currentRoom = await this.getCurrentRoom();
  const character = await this.findCharacterInRoom(characterName, currentRoom.id);
  
  if (!character) {
    return `There is no one named "${characterName}" here.`;
  }
  
  return `${character.name} says: "Lovely day."`;
}
```

### Character Lookup
```typescript
private async findCharacterInRoom(characterName: string, roomId: number): Promise<Character | null> {
  return await this.db.get<Character>(
    'SELECT * FROM characters WHERE LOWER(name) = LOWER(?) AND current_room_id = ?',
    [characterName, roomId]
  );
}
```

### Implementation Areas
- **GameController**: Add talk command handler
- **Database Query**: Find character by name in current room  
- **Response Display**: Show fixed dialogue response
- **Error Handling**: Handle character not found case

## Simplicity Features

- **No AI Integration**: Fixed response, no dynamic generation
- **No Dialogue Trees**: Single response only
- **No State Tracking**: No memory or conversation history
- **No Personality**: All characters respond identically
- **No Complex Logic**: Minimal implementation for proof of concept

## Future Expansion

This simple system can later be enhanced with:
- Dynamic AI-generated responses
- Character-specific dialogue
- Conversation trees and options
- Memory and relationship tracking
- Personality-based responses

## Related

- Uses: Existing character system (`src/types/character.ts`)
- Database: No schema changes needed
- Integration: GameController command system
- Foundation for: Future complex dialogue systems