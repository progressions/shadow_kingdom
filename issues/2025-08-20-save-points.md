# Save Points System

**Date**: 2025-08-20  
**Status**: Open  
**Priority**: Medium  
**Category**: Feature  

## Description

Implement a manual save system that allows players to create multiple save points, manage save slots, and have control over their game progress with clear save/load notifications and status.

## Details

**What is the requirement?**
Create a save points system with the following features:

- **Manual Save Command**: Player-controlled saving with `save` command
- **Multiple Save Slots**: Support for multiple save files per game
- **Save Slot Management**: List, name, and delete save slots
- **Quick Save/Load**: Rapid save and load functionality 
- **Save Status Display**: Show when game was last saved
- **Save Confirmation**: Clear feedback when saves are successful
- **Auto-save Option**: Optional periodic automatic saving

**Acceptance criteria:**
- [ ] `save [slot_name]` command to manually save game state
- [ ] `load <slot_name>` command to load specific save slot
- [ ] `saves` command to list all available save slots
- [ ] Save slot naming and management
- [ ] Save timestamps and game statistics
- [ ] Clear notifications for successful saves and loads
- [ ] Optional auto-save functionality
- [ ] Save file size optimization and cleanup

## Technical Notes

### Database Schema Extensions
```sql
CREATE TABLE save_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  slot_name TEXT NOT NULL,
  character_data TEXT NOT NULL, -- JSON snapshot of character state
  game_state_data TEXT NOT NULL, -- JSON snapshot of game state
  current_room_id INTEGER NOT NULL,
  playtime_seconds INTEGER DEFAULT 0,
  save_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  description TEXT, -- Optional player description
  is_auto_save BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (current_room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  UNIQUE(game_id, slot_name)
);
```

### Save Data Structure
```typescript
interface SaveData {
  character: {
    level: number;
    experience: number;
    attributes: CharacterAttributes;
    health: { current: number; max: number };
    inventory: InventoryItem[];
    equipment: EquippedItem[];
    abilities: CharacterAbility[];
    quests: QuestProgress[];
  };
  gameState: {
    currentRoomId: number;
    visitedRooms: number[];
    gameStatistics: GameStats;
    playtime: number;
    lastAutoSave: Date;
  };
  metadata: {
    saveVersion: string;
    gameVersion: string;
    timestamp: Date;
    description?: string;
  };
}
```

### Save Commands Implementation
```typescript
'save [slot_name]': async (slotName?: string) => {
  // Use default slot name if not provided
  const saveSlot = slotName || `save_${Date.now()}`;
  
  // Gather all character and game state data
  const saveData = await createSaveSnapshot(character, gameState);
  
  // Store save data to database
  await storeSavePoint(gameId, saveSlot, saveData);
  
  // Display confirmation
  display(`Game saved to slot: ${saveSlot}`, MessageType.SYSTEM);
  display(`Save time: ${new Date().toLocaleString()}`, MessageType.SYSTEM);
};

'quicksave': async () => {
  // Save to predefined quicksave slot
  await executeSave('quicksave');
  display('Quick save complete!', MessageType.SYSTEM);
};

'saves': async () => {
  // List all save slots for current game
  const saveSlots = await getSaveSlots(gameId);
  
  display('=== SAVE SLOTS ===', MessageType.SYSTEM);
  saveSlots.forEach(save => {
    const timeAgo = formatTimeAgo(save.save_timestamp);
    display(`${save.slot_name} - ${timeAgo} (${save.description || 'No description'})`, MessageType.NORMAL);
  });
};

'load <slot_name>': async (slotName: string) => {
  // Confirm load action (will lose current progress)
  const confirmed = await confirmAction(`Load save slot "${slotName}"? Current progress will be lost.`);
  if (!confirmed) return;
  
  // Load save data and restore game state
  const saveData = await loadSavePoint(gameId, slotName);
  if (!saveData) {
    display(`Save slot "${slotName}" not found.`, MessageType.ERROR);
    return;
  }
  
  // Restore character and game state
  await restoreFromSave(character, gameState, saveData);
  display(`Loaded save: ${slotName}`, MessageType.SYSTEM);
  
  // Show current location
  await executeCommand('look');
};

'deletesave <slot_name>': async (slotName: string) => {
  const confirmed = await confirmAction(`Delete save slot "${slotName}"? This cannot be undone.`);
  if (!confirmed) return;
  
  await deleteSavePoint(gameId, slotName);
  display(`Save slot "${slotName}" deleted.`, MessageType.SYSTEM);
};
```

### Auto-save System
```typescript
interface AutoSaveConfig {
  enabled: boolean;
  intervalMinutes: number;
  maxAutoSaves: number;
  triggers: AutoSaveTrigger[];
}

enum AutoSaveTrigger {
  LEVEL_UP = 'level_up',
  REGION_CHANGE = 'region_change', 
  MAJOR_QUEST = 'major_quest',
  COMBAT_VICTORY = 'combat_victory',
  TIME_INTERVAL = 'time_interval'
}

const autoSaveConfig: AutoSaveConfig = {
  enabled: true,
  intervalMinutes: 15,
  maxAutoSaves: 5,
  triggers: [
    AutoSaveTrigger.LEVEL_UP,
    AutoSaveTrigger.REGION_CHANGE,
    AutoSaveTrigger.TIME_INTERVAL
  ]
};

const checkAutoSave = async (trigger: AutoSaveTrigger) => {
  if (!autoSaveConfig.enabled) return;
  if (!autoSaveConfig.triggers.includes(trigger)) return;
  
  const slotName = `autosave_${trigger}_${Date.now()}`;
  await executeSave(slotName, true); // true = is auto save
  
  // Clean up old auto saves
  await cleanupOldAutoSaves(gameId, autoSaveConfig.maxAutoSaves);
  
  display('Game auto-saved', MessageType.SYSTEM);
};
```

### Save Data Optimization
```typescript
const createSaveSnapshot = async (character: Character, gameState: GameState): Promise<SaveData> => {
  // Only save essential data to minimize storage
  return {
    character: {
      level: character.level,
      experience: character.experience,
      attributes: extractAttributes(character),
      health: { current: character.current_hp, max: character.max_hp },
      inventory: compressInventory(character.inventory),
      equipment: character.equipment,
      abilities: character.abilities,
      quests: getActiveQuests(character)
    },
    gameState: {
      currentRoomId: gameState.currentRoomId,
      visitedRooms: gameState.visitedRooms,
      gameStatistics: gameState.statistics,
      playtime: gameState.playtime,
      lastAutoSave: new Date()
    },
    metadata: {
      saveVersion: '1.0',
      gameVersion: process.env.npm_package_version || '1.0.0',
      timestamp: new Date()
    }
  };
};
```

### Save Status Display
```typescript
const displaySaveStatus = () => {
  const lastSave = getLastSaveTime(gameId);
  if (lastSave) {
    const timeAgo = formatTimeAgo(lastSave);
    addToStatusBar(`Last saved: ${timeAgo}`);
  } else {
    addToStatusBar('Unsaved progress');
  }
};

const formatTimeAgo = (timestamp: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};
```

### Implementation Areas
- **Save Service**: Handle save data creation, storage, and loading
- **Command System**: Save/load commands with user feedback
- **Auto-save System**: Automatic saving on key events
- **Data Compression**: Optimize save file sizes
- **UI Integration**: Save status in game interface

## Related

- Dependencies: Character System, Game State Management
- Enables: Player progress security, game session management
- Integration: All game systems (saves complete game state)
- Future: Cloud saves, save file sharing, save file versioning
- References: Current game persistence in GameStateManager