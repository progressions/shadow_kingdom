# Achievement System

**Date**: 2025-08-20  
**Status**: Open  
**Priority**: Low  
**Category**: Feature  

## Description

Implement an achievement system that tracks player accomplishments, milestones, and special feats throughout their adventures, providing recognition, rewards, and additional gameplay goals.

## Details

**What is the requirement?**
Create an achievement system with the following features:

- **Achievement Categories**: Exploration, combat, social, progression, and special achievements
- **Progress Tracking**: Monitor player actions toward achievement goals
- **Unlock Notifications**: Clear feedback when achievements are earned
- **Reward System**: XP, items, titles, or other benefits for achievements
- **Achievement Display**: View earned and available achievements
- **Statistics Integration**: Track detailed player statistics for achievement criteria
- **Hidden Achievements**: Secret accomplishments to discover

**Acceptance criteria:**
- [ ] Database schema for achievements and player progress
- [ ] Achievement definition system with criteria and rewards
- [ ] `achievements` command to view earned and available achievements
- [ ] Real-time progress tracking during gameplay
- [ ] Achievement unlock notifications with rewards
- [ ] Statistics tracking for achievement requirements
- [ ] Achievement categories and difficulty tiers
- [ ] Integration with existing game systems for progress detection

## Technical Notes

### Achievement Categories
```typescript
enum AchievementCategory {
  EXPLORATION = 'exploration',
  COMBAT = 'combat', 
  SOCIAL = 'social',
  PROGRESSION = 'progression',
  COLLECTION = 'collection',
  SPECIAL = 'special',
  HIDDEN = 'hidden'
}

enum AchievementTier {
  BRONZE = 'bronze',   // Common achievements
  SILVER = 'silver',   // Uncommon achievements  
  GOLD = 'gold',       // Rare achievements
  PLATINUM = 'platinum' // Legendary achievements
}
```

### Database Schema
```sql
CREATE TABLE achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  tier TEXT NOT NULL,
  criteria_type TEXT NOT NULL, -- count, milestone, condition, sequence
  criteria_data TEXT NOT NULL, -- JSON criteria parameters
  reward_xp INTEGER DEFAULT 0,
  reward_items TEXT, -- JSON array of reward items
  reward_title TEXT, -- Special title for character
  is_hidden BOOLEAN DEFAULT FALSE,
  is_repeatable BOOLEAN DEFAULT FALSE,
  points_value INTEGER DEFAULT 10,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE character_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id INTEGER NOT NULL,
  achievement_id INTEGER NOT NULL,
  progress_current INTEGER DEFAULT 0,
  progress_required INTEGER DEFAULT 1,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at DATETIME,
  times_earned INTEGER DEFAULT 0, -- For repeatable achievements
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
  UNIQUE(character_id, achievement_id)
);

CREATE TABLE character_statistics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id INTEGER NOT NULL,
  stat_name TEXT NOT NULL,
  stat_value INTEGER DEFAULT 0,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  UNIQUE(character_id, stat_name)
);
```

### Achievement Definitions
```typescript
const ACHIEVEMENT_DEFINITIONS = [
  // Exploration Achievements
  {
    name: "First Steps",
    description: "Enter your first room in Shadow Kingdom",
    category: AchievementCategory.EXPLORATION,
    tier: AchievementTier.BRONZE,
    criteria: { type: 'milestone', target: 'rooms_visited', value: 1 },
    rewards: { xp: 10 }
  },
  {
    name: "Explorer",
    description: "Visit 25 different rooms",
    category: AchievementCategory.EXPLORATION,
    tier: AchievementTier.SILVER,
    criteria: { type: 'count', target: 'rooms_visited', value: 25 },
    rewards: { xp: 100, title: "Explorer" }
  },
  {
    name: "Cartographer", 
    description: "Visit 100 different rooms",
    category: AchievementCategory.EXPLORATION,
    tier: AchievementTier.GOLD,
    criteria: { type: 'count', target: 'rooms_visited', value: 100 },
    rewards: { xp: 500, items: ['Magical Compass'], title: "Cartographer" }
  },
  
  // Combat Achievements
  {
    name: "First Blood",
    description: "Defeat your first enemy",
    category: AchievementCategory.COMBAT,
    tier: AchievementTier.BRONZE,
    criteria: { type: 'milestone', target: 'enemies_defeated', value: 1 },
    rewards: { xp: 25 }
  },
  {
    name: "Warrior",
    description: "Defeat 50 enemies in combat",
    category: AchievementCategory.COMBAT,
    tier: AchievementTier.SILVER,
    criteria: { type: 'count', target: 'enemies_defeated', value: 50 },
    rewards: { xp: 200, title: "Warrior" }
  },
  
  // Progression Achievements  
  {
    name: "Level Up!",
    description: "Reach character level 5",
    category: AchievementCategory.PROGRESSION,
    tier: AchievementTier.BRONZE,
    criteria: { type: 'milestone', target: 'character_level', value: 5 },
    rewards: { xp: 100 }
  },
  {
    name: "Veteran Adventurer",
    description: "Reach character level 10",
    category: AchievementCategory.PROGRESSION,
    tier: AchievementTier.SILVER,
    criteria: { type: 'milestone', target: 'character_level', value: 10 },
    rewards: { xp: 300, title: "Veteran" }
  },
  
  // Social Achievements
  {
    name: "Conversationalist",
    description: "Have conversations with 10 different NPCs",
    category: AchievementCategory.SOCIAL,
    tier: AchievementTier.BRONZE,
    criteria: { type: 'count', target: 'npcs_talked_to', value: 10 },
    rewards: { xp: 75 }
  },
  
  // Collection Achievements
  {
    name: "Treasure Hunter",
    description: "Find 20 treasure items",
    category: AchievementCategory.COLLECTION,
    tier: AchievementTier.SILVER,
    criteria: { type: 'count', target: 'treasures_found', value: 20 },
    rewards: { xp: 150, title: "Treasure Hunter" }
  },
  
  // Special/Hidden Achievements
  {
    name: "Secret Keeper",
    description: "Discover a hidden room",
    category: AchievementCategory.HIDDEN,
    tier: AchievementTier.GOLD,
    criteria: { type: 'condition', target: 'hidden_room_found', value: true },
    rewards: { xp: 300, items: ['Ancient Map Fragment'] },
    isHidden: true
  }
];
```

### Achievement Tracking System
```typescript
interface AchievementProgress {
  achievementId: number;
  current: number;
  required: number;
  isCompleted: boolean;
}

const updateStatistic = async (characterId: number, statName: string, increment: number = 1) => {
  // Update character statistics
  await db.run(`
    INSERT OR REPLACE INTO character_statistics (character_id, stat_name, stat_value, last_updated)
    VALUES (?, ?, COALESCE((SELECT stat_value FROM character_statistics 
             WHERE character_id = ? AND stat_name = ?), 0) + ?, CURRENT_TIMESTAMP)
  `, [characterId, statName, characterId, statName, increment]);
  
  // Check for achievement progress
  await checkAchievementProgress(characterId, statName);
};

const checkAchievementProgress = async (characterId: number, triggerStat: string) => {
  // Get all achievements that could be affected by this stat
  const relevantAchievements = await getAchievementsByStat(triggerStat);
  
  for (const achievement of relevantAchievements) {
    const progress = await getAchievementProgress(characterId, achievement.id);
    
    if (progress.isCompleted) continue;
    
    const currentValue = await getStatistic(characterId, triggerStat);
    const newProgress = Math.min(currentValue, achievement.criteria.value);
    
    await updateAchievementProgress(characterId, achievement.id, newProgress);
    
    // Check if achievement is now complete
    if (newProgress >= achievement.criteria.value) {
      await completeAchievement(characterId, achievement);
    }
  }
};

const completeAchievement = async (characterId: number, achievement: Achievement) => {
  // Mark achievement as completed
  await db.run(`
    UPDATE character_achievements 
    SET is_completed = TRUE, completed_at = CURRENT_TIMESTAMP, times_earned = times_earned + 1
    WHERE character_id = ? AND achievement_id = ?
  `, [characterId, achievement.id]);
  
  // Award rewards
  await awardAchievementRewards(characterId, achievement);
  
  // Display notification
  await displayAchievementUnlock(achievement);
};
```

### Achievement Commands
```typescript
'achievements': async () => {
  const completed = await getCompletedAchievements(character.id);
  const inProgress = await getInProgressAchievements(character.id);
  
  display('=== ACHIEVEMENTS ===', MessageType.SYSTEM);
  
  // Show completed achievements
  if (completed.length > 0) {
    display('COMPLETED:', MessageType.ROOM_TITLE);
    completed.forEach(achievement => {
      const tierSymbol = getTierSymbol(achievement.tier);
      display(`${tierSymbol} ${achievement.name} - ${achievement.description}`, MessageType.NORMAL);
      if (achievement.reward_title) {
        display(`  Title earned: "${achievement.reward_title}"`, MessageType.SYSTEM);
      }
    });
    display('', MessageType.NORMAL);
  }
  
  // Show in-progress achievements (non-hidden)
  if (inProgress.length > 0) {
    display('IN PROGRESS:', MessageType.ROOM_TITLE);
    inProgress.filter(a => !a.is_hidden).forEach(progress => {
      const percent = Math.floor((progress.current / progress.required) * 100);
      display(`${progress.name} - ${progress.current}/${progress.required} (${percent}%)`, MessageType.NORMAL);
    });
  }
  
  // Show achievement statistics
  const totalPoints = completed.reduce((sum, a) => sum + a.points_value, 0);
  display(`Total Achievement Points: ${totalPoints}`, MessageType.SYSTEM);
};

'achievement <name>': async (achievementName: string) => {
  const achievement = await findAchievementByName(achievementName);
  if (!achievement) {
    display(`Achievement not found: ${achievementName}`, MessageType.ERROR);
    return;
  }
  
  const progress = await getAchievementProgress(character.id, achievement.id);
  
  display(`=== ${achievement.name.toUpperCase()} ===`, MessageType.ROOM_TITLE);
  display(achievement.description, MessageType.NORMAL);
  display(`Category: ${achievement.category} | Tier: ${achievement.tier}`, MessageType.SYSTEM);
  
  if (progress.isCompleted) {
    display('✓ COMPLETED', MessageType.SYSTEM);
    display(`Completed on: ${new Date(progress.completed_at).toLocaleDateString()}`, MessageType.NORMAL);
  } else {
    display(`Progress: ${progress.current}/${progress.required}`, MessageType.NORMAL);
    const percent = Math.floor((progress.current / progress.required) * 100);
    display(`${percent}% complete`, MessageType.SYSTEM);
  }
  
  // Show rewards
  if (achievement.reward_xp > 0) {
    display(`Reward XP: ${achievement.reward_xp}`, MessageType.NORMAL);
  }
  if (achievement.reward_items) {
    const items = JSON.parse(achievement.reward_items);
    display(`Reward Items: ${items.join(', ')}`, MessageType.NORMAL);
  }
  if (achievement.reward_title) {
    display(`Reward Title: "${achievement.reward_title}"`, MessageType.NORMAL);
  }
};
```

### Achievement Integration Points
```typescript
// Integration with game events
const STAT_TRACKING_EVENTS = {
  'room_entered': () => updateStatistic(character.id, 'rooms_visited'),
  'enemy_defeated': () => updateStatistic(character.id, 'enemies_defeated'),
  'level_gained': () => updateStatistic(character.id, 'character_level', character.level),
  'npc_talked_to': (npcId) => updateStatistic(character.id, 'npcs_talked_to'),
  'item_found': () => updateStatistic(character.id, 'items_found'),
  'treasure_discovered': () => updateStatistic(character.id, 'treasures_found'),
  'quest_completed': () => updateStatistic(character.id, 'quests_completed'),
  'spell_cast': () => updateStatistic(character.id, 'spells_cast'),
  'gold_earned': (amount) => updateStatistic(character.id, 'total_gold_earned', amount)
};
```

### Implementation Areas
- **Achievement Service**: Manage achievement definitions and progress
- **Statistics Tracking**: Monitor player actions for achievement criteria
- **Notification System**: Display achievement unlocks and progress
- **Reward System**: Award XP, items, and titles for achievements
- **UI Integration**: Achievement display and progress tracking

## Related

- Dependencies: Character System, Statistics tracking across all game systems
- Integration: All gameplay systems (combat, exploration, social, progression)
- Enables: Additional gameplay goals, player engagement, progression tracking
- Future: Achievement sharing, comparison with other players, seasonal achievements
- References: Current progression systems in Character and Experience systems