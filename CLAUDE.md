# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Shadow Kingdom is a browser-based HTML5 Canvas game with no build step or dependencies. It runs directly by opening `index.html` in a browser. The game features real-time combat, visual novel dialog systems, companion management, and save/load functionality.

## Commands

### Running the Game
- Open `index.html` directly in a browser - no build or install required
- For remote save functionality (optional): `cd server && npm install && npm start`

### Development
- No build process - changes to JS files are immediately reflected on page refresh
- Debug helpers available in browser console:
  - `window.gotoLevel1()` through `window.gotoLevel6()` - jump to specific levels
  - `window.centerOn(x, y)` - center camera at coordinates
  - `window.gotoEnemy(matcher)` - find and center on enemy by name/vnId

## Architecture

### Core Game Loop
The game runs through a requestAnimationFrame loop in `src/main.js`:
1. **step(dt)** (`src/systems/step.js`): Updates world state, player movement, enemy AI, combat, companions
2. **render()** (`src/engine/render.js`): Draws terrain, entities, UI elements

### Module Organization

#### Engine (`src/engine/`)
- **state.js**: Global game state (player, enemies, npcs, companions, world, camera)
- **ui.js**: DOM overlay management (VN dialog, party UI, menus)
- **dialog.js**: Dialog tree processing, save/load menu, companion menu
- **save_core.js**: Serialization/deserialization of game state
- **levels.js**: Level loaders (loadLevel1-6) with terrain generation and entity spawning
- **sprites.js**: Procedural sprite generation
- **terrain.js**: Terrain bitmap and obstacle generation
- **input.js**: Keyboard/mouse input handling
- **audio.js**: Sound effect and music management

#### Systems (`src/systems/`)
- **step.js**: Main update loop orchestrator
- **combat.js**: Attack handling, damage calculation, interaction detection

#### Data (`src/data/`)
- **dialogs.js**: NPC dialog trees
- **companion_dialogs.js**: Companion-specific dialog trees
- **items.js**: Item definitions and stats
- **loot.js**: Loot tables and drop rates
- **intro_texts.js**: VN intro texts for NPCs/bosses

### Key Patterns

#### Space Key Logic
Space key prioritizes attack if it would hit an enemy, otherwise attempts interaction:
```javascript
// src/systems/combat.js
if (willAttackHitEnemy()) {
    startAttack();
} else if (tryInteract()) {
    startDialog();
} else {
    startAttack();
}
```

#### Save System
- Local saves: Uses localStorage with keys `shadow_kingdom_save_{slot}`
- Remote saves: Optional Express server in `server/` for cloud saves
- Serializes: player stats, enemies, companions, NPCs, inventories, unlocked gates

#### Visual Novel System
- Overlays game with portrait + text + choices
- Supports images and video portraits
- First-sight intros for flagged NPCs/bosses with camera panning
- Dialog nodes support actions: recruit companion, dismiss, give items

#### Companion System
- Up to 3 companions follow player in a chain
- Each has inventory, equipment slots, and dialog tree
- Managed via C key menu (talk/dismiss)
- Companions provide passive auras and combat assistance

### Level Progression
Levels unlock sequentially after defeating bosses:
1. Forest → defeat Vast → unlock Level 2
2. Cave → defeat Nethra → unlock Level 3
3. Marsh → defeat Luula → unlock Level 4
4. City → defeat Vanificia → unlock Level 5
5. Castle → defeat Vorthak → unlock Level 6
6. Temple (hub level with portals back to previous areas)

### Important Files
- `src/main.js`: Entry point and game loop
- `src/engine/state.js`: All game state and entity spawning
- `src/systems/step.js`: Core update logic
- `src/engine/save_core.js`: Save/load implementation
- `src/engine/levels.js`: Level definitions and spawning