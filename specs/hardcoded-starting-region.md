# Hardcoded Starting Region Specification

**Status**: 🚧 PLANNED - Replace dynamic starter with monastery region  
**Last Updated**: 2025-08-23  
**Priority**: HIGH - First step toward region-based generation  

## Executive Summary

Replace the current 6-room dynamic starter area with a complete 12-room hardcoded monastery region featuring enemy combat, key collection, and locked progression mechanics.

## The Forsaken Monastery

### Theme
An abandoned monastery where shadow corruption has taken hold. Once a place of learning and meditation, now twisted by dark forces. The monks are gone, but their stone sentinel still guards the sacred vault key.

**Atmosphere**: Stone corridors, forgotten prayers etched in walls, broken stained glass, corrupted fountains, shadowy courtyards filled with ancient mystery.

### Region Layout

```
    [Meditation🗡️]---[Library]
             |           |
    [Dormitory]---[Inner Sanctum]---[Scriptorium]
         |            |                 |
    [Refectory]---[Central Courtyard]---[Bell Tower]
         |            |                 |
    [Kitchen]---[Entrance Hall]---[Chapel]
                      |
                [Vault Door🔒]
               (locked exit)
```

## Room Definitions

### 1. Entrance Hall (Starting Room)
- **Description**: "The monastery's entrance, with cracked marble floors and faded tapestries depicting forgotten saints"
- **Items**: Torn Prayer Book, Candle
- **Connections**: north → Central Courtyard, east → Chapel, west → Kitchen

### 2. Central Courtyard (Hub Room)
- **Description**: "An open courtyard with a corrupted fountain at its center, dark water bubbling with unnatural energy"
- **Items**: Broken Fountain Statue
- **Connections**: south → Entrance Hall, north → Inner Sanctum, east → Bell Tower, west → Refectory

### 3. Chapel
- **Description**: "Rows of broken pews face a shattered altar, moonlight streams through stained glass gaps"
- **Items**: Holy Symbol, Dusty Hymnal
- **Connections**: west → Entrance Hall

### 4. Kitchen
- **Description**: "Rusted pots hang from hooks above a cold hearth, remnants of simple monastic life"
- **Items**: Rusty Knife, Moldy Bread
- **Connections**: east → Entrance Hall, north → Refectory

### 5. Refectory
- **Description**: "Long dining tables covered in dust, wooden benches overturned in haste"
- **Items**: Pewter Mug
- **Connections**: south → Kitchen, east → Central Courtyard, north → Dormitory

### 6. Bell Tower
- **Description**: "A spiral staircase leads up to a cracked bell, shadows dance on the stone walls"
- **Items**: Frayed Rope, Bell Clapper
- **Connections**: west → Central Courtyard, north → Scriptorium

### 7. Inner Sanctum (Important Room)
- **Description**: "The monastery's heart, where the abbot once held council, now eerily silent"
- **Items**: Abbot's Journal
- **Connections**: south → Central Courtyard, north → Library, east → Scriptorium, west → Dormitory

### 8. Dormitory
- **Description**: "Simple beds arranged in rows, personal belongings scattered as if abandoned in panic"
- **Items**: Monk's Robe, Small Chest
- **Connections**: south → Refectory, east → Inner Sanctum, north → Meditation Chamber

### 9. Scriptorium
- **Description**: "Writing desks with dried inkwells and half-finished manuscripts, knowledge interrupted"
- **Items**: Quill Pen, Blank Parchment
- **Connections**: south → Bell Tower, west → Inner Sanctum, north → Library

### 10. Library
- **Description**: "Towering shelves of ancient books reach toward vaulted ceilings, wisdom gathering dust"
- **Items**: Ancient Tome, Reading Glasses
- **Connections**: south → Inner Sanctum, west → Meditation Chamber

### 11. Meditation Chamber (ENEMY ROOM)
- **Description**: "A circular room with prayer mats arranged around a Stone Sentinel that guards a glowing key"
- **Enemy**: **Stone Sentinel** - "An ancient golem of carved granite, eyes glowing with fading protective magic"
- **Key Item**: **Vault Key** - "An ornate key that pulses with holy light, warm to the touch"
- **Items**: Incense Burner
- **Connections**: south → Dormitory, east → Library
- **Special**: Enemy blocks access to Vault Key until defeated

### 12. Vault Door (EXIT ROOM)
- **Description**: "A massive iron door carved with religious symbols, sealed by divine magic that hums with power"
- **Locked Exit**: Requires **Vault Key** to unlock passage to next region
- **Items**: None
- **Connections**: north → Entrance Hall
- **Special**: Contains locked connection (`to_room_id = NULL`, `locked = 1`, `required_key_name = 'Vault Key'`)

## Enemy Combat System

### Stone Sentinel Mechanics
- **Location**: Meditation Chamber (Room 11)
- **Behavior**: Blocks access to Vault Key (visible but untouchable)
- **Combat**: Use existing combat system
- **Defeat State**: Once defeated, stays defeated (no respawning)

### Key Blocking Logic
```typescript
async handlePickup(itemName: string) {
  const room = await this.getCurrentRoom();
  const hostileCharacters = await this.getHostileCharacters(room.id);
  
  if (hostileCharacters.length > 0 && itemName.includes("Vault Key")) {
    this.display("The Stone Sentinel blocks your path to the key!");
    this.display("You must defeat it first.");
    return false;
  }
  
  return true; // Normal pickup
}
```

## Database Schema Changes

### No Additional Schema Changes Required
- Use existing characters table to place Stone Sentinel enemy
- Use existing locked connections system for vault door
- Leverage existing hostile character mechanics

### Room Generation Data
```typescript
const MONASTERY_ROOMS = [
  {
    id: 'entrance',
    name: 'Entrance Hall',
    description: '...',
    items: ['Torn Prayer Book', 'Candle'],
    connections: { north: 'courtyard', east: 'chapel', west: 'kitchen' }
  },
  // ... all 12 rooms
];
```

## Implementation Strategy

### Phase 1: Room Creation
1. Create monastery room data structure
2. Modify `createGameWithRooms()` function
3. Replace current 6-room generation with 12-room monastery

### Phase 2: Enemy & Items
1. Create Stone Sentinel enemy in Meditation Chamber
2. Place Vault Key in same room
3. Create locked vault door connection

### Phase 3: Pickup Blocking
1. Implement key blocking when hostile characters present
2. Test complete progression flow
3. Verify existing combat system works

## Testing Checklist

- [ ] New games create exactly 12 monastery rooms
- [ ] All rooms are properly connected (no isolated areas)
- [ ] Stone Sentinel enemy appears in Meditation Chamber
- [ ] Vault Key visible but blocked by hostile character
- [ ] Existing combat system can defeat enemy
- [ ] After defeat, Vault Key can be picked up
- [ ] Vault Key unlocks the vault door
- [ ] Locked connection leads to "next region" placeholder

## Benefits

1. **Consistent Tutorial**: Every new player gets same starting experience
2. **Combat Introduction**: Teaches combat mechanics early
3. **Progression Tutorial**: Shows key/lock mechanics
4. **Rich Exploration**: 12 interconnected rooms with multiple paths
5. **No Generation Lag**: Instant availability, no AI delays

## Integration Notes

- Maintains existing locked connection system
- Uses current item and character systems
- Minimal changes to game controller logic
- Foundation for future region-based generation
- Backward compatible (doesn't affect existing games)

---

**Next Steps**: Implement database changes and monastery room generation in `createGameWithRooms()` function.