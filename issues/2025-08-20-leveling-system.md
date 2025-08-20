# Leveling System

**Date**: 2025-08-20  
**Status**: Open  
**Priority**: High  
**Category**: Feature  

## Description

Implement an experience point (XP) and leveling system that provides character progression through exploration, combat, and accomplishments, with meaningful advancement choices.

## Details

**What is the requirement?**
Create a leveling system with the following features:

- **Experience Points (XP)**: Gained from exploration, combat, quest completion
- **Level Progression**: Character advancement from level 1 to 20+ 
- **Stat Increases**: Attribute bonuses on level up
- **HP Increases**: Health scaling with character level
- **Level Notifications**: Clear feedback when player advances
- **XP Sources**: Multiple ways to gain experience

**Acceptance criteria:**
- [ ] XP tracking and storage in database
- [ ] Level calculation based on XP thresholds
- [ ] Automatic level up when XP threshold reached
- [ ] Attribute increases on level up (player choice or automatic)
- [ ] HP increases based on new level and Constitution
- [ ] Level up notifications and summaries
- [ ] XP gain from various sources (exploration, combat, discoveries)
- [ ] `level` or `experience` command to view progression

## Technical Notes

### Database Schema Extensions
```sql
-- Add to characters table
ALTER TABLE characters ADD COLUMN level INTEGER DEFAULT 1;
ALTER TABLE characters ADD COLUMN experience INTEGER DEFAULT 0;
ALTER TABLE characters ADD COLUMN skill_points INTEGER DEFAULT 0;
```

### XP and Level Progression
```typescript
// XP thresholds for levels (exponential growth)
const getXPForLevel = (level: number): number => {
  return Math.floor(100 * Math.pow(1.5, level - 1));
};

// XP sources and amounts
const XP_SOURCES = {
  ROOM_DISCOVERY: 10,      // Entering new room
  REGION_DISCOVERY: 50,    // First room in new region
  COMBAT_VICTORY: 25,      // Defeating enemy
  QUEST_COMPLETION: 100,   // Completing quest
  PUZZLE_SOLVED: 30,       // Solving room puzzle
  ITEM_DISCOVERED: 15      // Finding special items
};
```

### Level Up Mechanics
- **Automatic**: Constitution-based HP increase
- **Player Choice**: 2 attribute points to distribute per level
- **Skill Points**: 1 skill point per level for future abilities
- **Notifications**: Display gains clearly in game

### Implementation Areas
- **Experience Service**: Manage XP calculations and level progression
- **Character System**: Integration with attributes and HP
- **Game Events**: Award XP for various accomplishments
- **Commands**: `level`, `experience` display commands
- **Notifications**: Level up messages and summaries

### XP Award Integration Points
- Room generation/exploration (RegionService)
- Combat victories (future Combat System)
- Quest completion (future Quest System)
- Special discoveries (enhanced room interactions)

## Related

- Dependencies: Character Attributes System, Health System
- Enables: Advanced character progression, skill systems
- Integration: All future gameplay systems should award XP
- References: `specs/rpg-systems-comprehensive.md` Progression Mechanics section