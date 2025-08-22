# Simple Character Dialogue System Specification

**Date**: 2025-08-22  
**Status**: 🚧 IMPLEMENTATION - Basic Talk Command  
**Coverage**: Character interaction, basic dialogue system

## Overview

This specification defines the implementation of a minimal character dialogue system that allows players to interact with any character (NPC or enemy) in their current room using a simple `talk` command.

## Core Requirements

### Talk Command
- **Command Syntax**: `talk <character_name>`
- **Function**: Initiate dialogue with specified character
- **Response**: Fixed message "Lovely day." from all characters
- **Scope**: Works with all character types (NPCs, enemies)

### Character Verification
- **Location Check**: Verify character exists in player's current room
- **Case Insensitive**: Match character names regardless of case
- **Error Handling**: Clear message when character not found

## Implementation Details

### 1. Command Registration
Add `talk` command to GameController game commands:
```typescript
this.commandRouter.addGameCommand({
  name: 'talk',
  description: 'Talk to a character in the current room',
  handler: async (characterName: string) => await this.handleTalkCommand(characterName)
});
```

### 2. Command Handler Implementation
```typescript
private async handleTalkCommand(characterName: string): Promise<string> {
  if (!characterName) {
    return 'Who would you like to talk to?';
  }

  const currentRoom = await this.getCurrentRoom();
  const character = await this.findCharacterInRoom(characterName, currentRoom.id);
  
  if (!character) {
    return `There is no one named "${characterName}" here.`;
  }
  
  return `${character.name} says: "Lovely day."`;
}
```

### 3. Character Lookup Method
```typescript
private async findCharacterInRoom(characterName: string, roomId: number): Promise<Character | null> {
  return await this.db.get<Character>(
    'SELECT * FROM characters WHERE LOWER(name) = LOWER(?) AND current_room_id = ?',
    [characterName, roomId]
  );
}
```

## Database Integration

### Existing Schema Usage
- **Table**: `characters` (already exists)
- **Key Fields**: `name`, `current_room_id`
- **No Changes**: Uses existing database structure

### Query Pattern
- **Case Insensitive**: `LOWER(name) = LOWER(?)`
- **Room Filter**: `current_room_id = ?`
- **Single Result**: Returns first matching character

## Testing Requirements

### Unit Tests
```typescript
describe('Talk Command', () => {
  test('should find character in current room', async () => {
    // Create character in room
    // Execute talk command
    // Verify "Lovely day." response
  });

  test('should handle character not found', async () => {
    // Execute talk with non-existent character
    // Verify error message
  });

  test('should handle missing character name', async () => {
    // Execute talk without character name
    // Verify prompt message
  });

  test('should be case insensitive', async () => {
    // Create character "Goblin"
    // Test talk with "goblin", "GOBLIN", "Goblin"
    // Verify all work
  });
});
```

### Integration Tests
- **Character Interaction**: End-to-end talk command flow
- **Room Context**: Character in different rooms
- **Multiple Characters**: Handle multiple characters in same room

## File Modifications

### Primary Changes
1. **src/gameController.ts**:
   - Add `handleTalkCommand` method
   - Add `findCharacterInRoom` helper method
   - Register talk command in constructor

### Test Files
1. **tests/simple-character-dialogue.test.ts**:
   - Unit tests for talk command functionality
   - Character lookup and error handling tests

## Acceptance Criteria

- [ ] `talk <character_name>` command registered and functional
- [ ] Character verification works for current room only
- [ ] All characters respond with "Lovely day." message
- [ ] Error handling for character not found
- [ ] Error handling for missing character name parameter
- [ ] Case insensitive character name matching
- [ ] Unit tests covering all scenarios
- [ ] Integration tests for end-to-end functionality

## Implementation Notes

### Simplicity First
- **Fixed Response**: No dynamic or AI-generated content
- **No State**: No conversation history or memory
- **Universal**: Same behavior for all character types
- **Minimal Code**: Straightforward implementation

### Future Extensibility
- **Foundation**: Structure allows for future dialogue complexity
- **Character System**: Builds on existing character infrastructure
- **Command Pattern**: Follows established command registration pattern