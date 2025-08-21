# Shadow Kingdom: Comprehensive RPG Systems Specification

**Last Updated**: 2025-08-19  
**Status**: 🚧 FUTURE DEVELOPMENT - Core Game Systems Design  
**Coverage**: Character system, combat mechanics, inventory management, RPG vision

## Executive Summary

Shadow Kingdom's RPG systems are designed around immersive text-based interaction with deep character progression, tactical combat, and meaningful equipment choices. While the core world generation is complete, these systems represent the next phase of development.

## Character System

### Core Attributes
- **Strength**: Physical power, melee damage, carrying capacity
- **Dexterity**: Agility, ranged accuracy, dodge chance, initiative
- **Intelligence**: Spell power, mana pool, learning speed
- **Constitution**: Health points, stamina, resistance to effects
- **Wisdom**: Perception, spell resistance, insight checks
- **Charisma**: Social interactions, leadership, merchant dealings

### Progression Mechanics
- **Level-based advancement**: Classic RPG leveling with meaningful choices
- **Skill trees**: Specialized development paths per character class
- **Experience sources**: Combat, exploration, quest completion, problem solving
- **Stat allocation**: Player choice in character development direction

### Character Classes
1. **Warrior**: Melee combat specialist, high health and armor
2. **Rogue**: Stealth and precision, critical hits and lockpicking
3. **Mage**: Spellcasting focus, elemental damage and utility
4. **Cleric**: Support and healing, undead resistance
5. **Ranger**: Ranged combat and nature skills, animal companions

## Combat System

### Turn-Based Mechanics
- **Initiative order**: Dexterity-based with modifiers
- **Action economy**: Move, standard action, bonus action per turn
- **Positioning**: Front/middle/back row tactical positioning
- **Cover and terrain**: Environmental tactical advantages

### Combat Actions
- **Attack types**: Melee, ranged, spell, special abilities
- **Defensive options**: Block, dodge, parry, counter-attack
- **Status effects**: Poison, paralysis, sleep, charm, fear
- **Combo system**: Chained abilities for enhanced effects

### Damage and Health
- **Hit Points**: Constitution-based with level scaling
- **Armor Class**: Equipment and dexterity-based defense
- **Critical hits**: Enhanced damage on high attack rolls
- **Healing**: Natural recovery, potions, spells, rest

## Inventory and Equipment

### Equipment Slots
- **Weapons**: Main hand, off-hand, ranged weapon
- **Armor**: Head, body, legs, feet, hands
- **Accessories**: Rings, amulets, cloaks, special items
- **Tools**: Lockpicks, rope, torches, utility items

### Item Quality System
1. **Common**: Basic equipment, readily available
2. **Uncommon**: Enhanced stats, minor special properties
3. **Rare**: Significant bonuses, useful special abilities
4. **Epic**: Major stat boosts, powerful abilities
5. **Legendary**: Unique items with game-changing effects

### Item Properties
- **Base stats**: Damage, armor rating, durability
- **Enchantments**: Magical bonuses and special effects
- **Durability**: Equipment degradation and repair needs
- **Weight**: Encumbrance and carrying capacity limits

### Crafting System
- **Materials**: Resources gathered from exploration and combat
- **Recipes**: Learned from NPCs, books, or experimentation
- **Skill requirements**: Character abilities affect crafting success
- **Customization**: Player choice in item enhancement paths

## Economic System

### Currency
- **Gold pieces**: Primary currency for major transactions
- **Silver pieces**: Common currency for everyday items
- **Copper pieces**: Small denomination for minor purchases
- **Trade goods**: Barter system for remote or specialized markets

### Merchant Interactions
- **Price negotiation**: Charisma-based haggling mechanics
- **Reputation effects**: Past dealings affect future prices
- **Supply and demand**: Regional price variations
- **Special orders**: Custom equipment creation requests

## Progression and Quests

### Quest Types
1. **Main storyline**: Core narrative progression
2. **Regional quests**: Area-specific challenges and stories
3. **Character quests**: Personal development and backstory
4. **Exploration challenges**: Discovery and puzzle-solving
5. **Dynamic events**: Procedurally generated situations

### Reward Systems
- **Experience points**: Primary progression currency
- **Equipment rewards**: Unique items from major accomplishments
- **Skill unlocks**: New abilities from quest completion
- **Reputation gains**: Social standing improvements
- **Story progression**: Narrative advancement opportunities

## Social and Interaction Systems

### NPC Interactions
- **Dialogue trees**: Branching conversation options
- **Personality system**: NPC reactions based on player choices
- **Relationship tracking**: Long-term consequences of interactions
- **Information gathering**: Investigation and social mechanics

### Faction System
- **Multiple factions**: Competing groups with different goals
- **Reputation tracking**: Standing with each faction
- **Exclusive content**: Faction-specific quests and rewards
- **Conflict resolution**: Player choice in faction disputes

## Magic System

### Spell Schools
1. **Evocation**: Direct damage and energy manipulation
2. **Enchantment**: Mind control and behavior modification
3. **Transmutation**: Physical transformation and alteration
4. **Divination**: Information gathering and future sight
5. **Necromancy**: Death magic and undead manipulation
6. **Healing**: Restoration and protective magic

### Casting Mechanics
- **Mana system**: Resource management for spellcasting
- **Spell preparation**: Limited spell selection per day
- **Ritual casting**: Extended casting for powerful effects
- **Component requirements**: Material components for spells

## Implementation Priority

### Phase 1: Core Character System
- Basic attributes and leveling
- Simple combat mechanics
- Essential inventory management

**Testing Strategy**: Update `createGameWithRooms()` in `src/utils/initDb.ts` to include test characters and equipment in starting rooms for immediate validation of new mechanics.

### Phase 2: Enhanced Combat
- Full tactical combat system
- Status effects and special abilities
- Equipment enhancement

**Testing Strategy**: Add hostile NPCs with various combat abilities to starting rooms; include weapons with special effects for immediate combat testing.

### Phase 3: Advanced Systems
- Crafting and enchantment
- Complex quest mechanics
- Faction interactions

**Testing Strategy**: Place crafting materials, faction representatives, and quest-giving NPCs in starting rooms to enable immediate testing of advanced mechanics.

### Phase 4: Polish and Balance
- Comprehensive testing
- Balance adjustments
- Quality of life improvements

This comprehensive RPG system design provides the framework for transforming Shadow Kingdom from a world exploration game into a full-featured text-based RPG experience.