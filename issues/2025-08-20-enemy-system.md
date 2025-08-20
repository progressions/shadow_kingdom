# Enemy System

**Date**: 2025-08-20  
**Status**: Open  
**Priority**: High  
**Category**: Feature  

## Description

Implement an enemy system that generates AI-powered creatures appropriate to each region, with stats, behaviors, and loot drops that provide challenging and rewarding combat encounters.

## Details

**What is the requirement?**
Create an enemy system with the following features:

- **AI-Generated Enemies**: Context-appropriate creatures for each region type
- **Enemy Stats**: Health, attributes, and combat abilities
- **Regional Appropriateness**: Mansion ghosts, forest beasts, cave monsters, town guards
- **Behavioral AI**: Different enemy types with unique combat patterns
- **Loot Tables**: Appropriate item drops for defeated enemies
- **Encounter Rates**: Configurable enemy spawn chances
- **Scaling Difficulty**: Enemies appropriate to player level

**Acceptance criteria:**
- [ ] Database schema for enemy data storage
- [ ] AI generation of enemies based on region context
- [ ] Enemy stat calculation (HP, attributes, armor class)
- [ ] Enemy behavior patterns in combat
- [ ] Loot drop system with regional item appropriateness
- [ ] Random encounter system for enemy spawning
- [ ] Enemy descriptions and atmospheric text
- [ ] Integration with combat system

## Technical Notes

### Database Schema
```sql
CREATE TABLE enemies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  region_id INTEGER,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  max_hp INTEGER NOT NULL,
  current_hp INTEGER NOT NULL,
  strength INTEGER DEFAULT 10,
  dexterity INTEGER DEFAULT 10,
  constitution INTEGER DEFAULT 10,
  armor_class INTEGER DEFAULT 10,
  attack_bonus INTEGER DEFAULT 0,
  damage_dice TEXT DEFAULT '1d6', -- e.g., '1d8+2'
  behavior_type TEXT DEFAULT 'aggressive', -- aggressive, defensive, cunning
  loot_table TEXT, -- JSON array of possible drops
  encounter_chance REAL DEFAULT 0.1, -- 10% chance
  region_type TEXT, -- mansion, forest, cave, town
  created_by_ai BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE SET NULL
);
```

### AI Enemy Generation
```typescript
// Regional enemy prompts
const ENEMY_PROMPTS = {
  mansion: "Generate a ghostly or undead creature fitting an abandoned mansion",
  forest: "Generate a wild beast or nature spirit appropriate for an ancient forest", 
  cave: "Generate a subterranean monster or cave-dwelling creature",
  town: "Generate a bandit, guard, or urban threat appropriate for a settlement"
};

// Example AI request
const generateEnemy = async (region: Region, playerLevel: number) => {
  const prompt = `${ENEMY_PROMPTS[region.type]}
  
  Player level: ${playerLevel}
  Region: ${region.description}
  
  Generate an enemy with:
  - Atmospheric name and description
  - Appropriate challenge level for player
  - 2-3 combat behaviors/tactics
  - Fitting loot drops for this creature type`;
};
```

### Enemy Behaviors
- **Aggressive**: Always attacks, high damage output
- **Defensive**: Uses blocking/parrying, higher armor
- **Cunning**: Uses special abilities, tries to escape when low HP
- **Swarm**: Multiple weak enemies that coordinate attacks
- **Elite**: Single powerful enemy with multiple abilities

### Encounter System
- **Room Entry**: % chance to spawn enemy in new rooms
- **Region Scaling**: Enemy level scales with region distance from start
- **Player Level**: Enemy stats scale relative to player progression
- **Cooldown**: Prevent constant enemy spawning

### Implementation Areas
- **Enemy Service**: Generate and manage enemy data
- **Encounter Service**: Handle random enemy spawning
- **AI Integration**: Generate contextual enemies with GrokClient
- **Combat Integration**: Enemy AI behaviors during combat
- **Loot System**: Handle item drops from defeated enemies

## Related

- Dependencies: Character System, Region System, AI Integration
- Enables: Combat System, Loot System, Challenge progression
- Integration: Room generation should consider enemy placement
- References: `specs/rpg-systems-comprehensive.md` Combat System section