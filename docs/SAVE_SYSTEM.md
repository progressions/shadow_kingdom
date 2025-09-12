# Save System — Deterministic World + Explicit Enemies

This document describes the current save system. It stores stable world deltas and explicit enemies, and restores the scene deterministically. The storage schema is `schema: "save"` with `version: 3`.

## Goals

- Click Save → Load resumes exactly: level, player position/HP/dir/XP, companions (with palette), inventory, gates/chests/breakables, ground items, VN/quest flags, and enemies (both bosses/guardians and newly spawned generics) in the same positions with the same HP.
- Avoid saving static geometry; loaders build levels, saves apply deltas and actors.

## Where Saves Live

- Local: `localStorage` per slot — `shadow_kingdom_save_<slot>` using an atomic double‑buffer (`..._A`/`..._B` and a pointer key) to guard against partial writes
- Autosave: `shadow_kingdom_autosave` (does not overwrite slots)

## Load Flow

- `loadGame(slot)`: parses payload (schema `save`). If `currentLevel` differs, stashes payload and sets `runtime.pendingLevel`. The main loop loads the target level, then `applyPendingRestore()` applies the payload.
- VN intros and spawners are suppressed during the transition; after swap the saved world/enemies are applied and play resumes.

## Payload Structure (Top‑Level)

```jsonc
{
  "schema": "save",
  "version": 3,
  "at": 1757600000000,
  "currentLevel": 1,
  "player": { "x": 800, "y": 520, "hp": 10, "dir": "down", "level": 1, "xp": 6 },
  "companions": [ { "name": "Canopy", "x": 792, "y": 520, "dir": "left", "sheetPalette": { /* colors */ }, "affinity": 6.0, "level": 1, "xp": 0 } ],
  "playerInv": { /* items, equipped */ },
  "world": { "w": 1600, "h": 960 },
  "gateStates": { "castle_gate": "locked" },
  "openedChests": [ "chest_l1_sword" ],
  "brokenBreakables": [ "brk_l1_0" ],
  "groundItems": [ { "id": "p1", "x": 900, "y": 600, "item": { "id": "torch", "qty": 2 } } ],
  "vnSeen": [ "npc:canopy" ],
  "affinityFlags": [ "canopy_intro_encourage" ],
  "questFlags": [ "yorna_knot_started" ],
  "questCounters": { "yorna_knot_remaining": 2 },
  "uniqueActors": {                // boss/guardian status by vnId
    "enemy:vast": { "state": "alive", "hp": 30 },
    "enemy:gorg": { "state": "defeated" }
  },
  "dynamicEnemies": [             // all non-unique enemies are explicit
    { "id": "de_kx9...", "kind": "mook", "x": 760, "y": 540, "hp": 3, "dir": "left", "w": 12, "h": 16, "spriteScale": 1 }
  ]
}
```

Notes:
- uniqueActors uses stable ids (vnId: `enemy:vast`, `enemy:gorg`, etc.). Loaders spawn defaults; the restore path removes/keeps and sets HP based on this map.
- dynamicEnemies preserves every non-unique enemy exactly (position, HP, basic stats), so a saved crowd loads identically.

## Player / Companions / Inventory

- Player: position/hp/dir/level/xp persisted; derived stats recomputed.
- Companions: restored with `sheetPalette` if present; legacy saves fallback to canonical palettes by name (blue dress for Canopy, etc.).
- Inventory: backpack items and equipped slots persisted.

## World Deltas

- gateStates: `{ id: 'locked'|'unlocked' }` (applied to obstacle gates).
- openedChests: chest ids set `opened=true`.
- brokenBreakables: obstacle ids removed.
- groundItems: all items on the ground with positions and full item data.

## VN / Flags / Quests

- vnSeen: prevents re‑playing VN intros (NPCs only; enemy intros are derived by encounter id).
- affinityFlags: once-only affinity awards.
- questFlags / questCounters: booleans and numeric progress.

## Enemies

- uniqueActors (bosses/guardians by vnId):
  - `unspawned` (default), `alive` (with optional hp), `defeated`.
  - On load: if `defeated`/`unspawned`, remove default spawn; if `alive`, keep default and set hp if provided.
- dynamicEnemies (all non-unique):
  - Saved explicitly with x/y/dir/hp/size/speed/touchDamage/spriteScale and optional `sheetPalette` and tags (`questId`, `source`).
  - On load: validated/clamped and spawned exactly so that “three mooks at these positions with this hp” round-trips.

## Portraits

- Portrait paths may be absolute or level‑scoped (e.g., `assets/portraits/levelXX/<Name>/<File>.mp4`).
- Legacy saves are normalized on load.

## Autosave

- Autosave writes to `shadow_kingdom_autosave` and never overwrites manual slots.

## Debug

- Set `window.DEBUG_ENEMIES = true` to log spawns/restores/removals and draw enemy markers on screen.

## Legacy Appendix (v1 examples)

The following examples reflect an earlier payload shape that stored all enemies in a single `enemies` array. They are retained for historical reference and do not represent the current on‑disk format.

```jsonc
{
  "version": 1,
  "at": 1757506505391,
  "currentLevel": 5,
  "player": { "x": 592, "y": 980, "hp": 10, "dir": "left", "level": 1, "xp": 10 },
  "enemies": [
    { "x": 1712, "y": 1152, "dir": "down", "kind": "featured", "name": "Fana", "hp": 22, "maxHp": 22,
      "touchDamage": 8, "speed": 11, "w": 12, "h": 16, "spriteScale": 1, "portrait": "assets/portraits/Fana/Fana villain.mp4",
      "guaranteedDropId": "key_temple" }
  ],
  "companions": [ { "name": "Canopy", "x": 580, "y": 988, "dir": "up", "portrait": "assets/portraits/Canopy/Canopy video.mp4", "affinity": 5.3, "level": 1, "xp": 0 } ],
  "npcs": [ { "name": "Hola", "x": 800, "y": 1100, "dir": "up", "portrait": "assets/portraits/Hola/Hola video.mp4", "affinity": 5 } ],
  "playerInv": { ... },
  "world": { "w": 3040, "h": 1760 },
  "unlockedGates": [ ],
  "groundItems": [ ],
  "openedChests": [ ],
  "brokenBreakables": [ ],
  "vnSeen": [ "npc:canopy", "enemy:gorg" ],
  "affinityFlags": [ "canopy_intro_encourage" ],
  "questFlags": [ "level5_reached" ],
  "questCounters": { }
}
```

---

With this structure and flow, the game resumes from any level with all pertinent state (actors, flags, items, VN intros) intact.

## Appendix — Full Sample Payloads

Below are complete, representative payloads you can use to sanity‑check saves/loads. Values are illustrative (floats rounded for readability).

### Full Sample: Level 1 (Greenwood)

```jsonc
{
  "version": 1,
  "at": 1757600000000,
  "currentLevel": 1,
  "player": { "x": 800, "y": 520, "hp": 10, "dir": "down", "level": 1, "xp": 6 },
  "enemies": [
    { "x": 972, "y": 522, "dir": "left", "kind": "mook", "name": "Mook", "hp": 3, "maxHp": 3, "touchDamage": 3, "speed": 10, "w": 12, "h": 16, "spriteScale": 1 },
    { "x": 1120, "y": 560, "dir": "down", "kind": "featured", "name": "Gorg", "hp": 16, "maxHp": 16, "touchDamage": 5, "speed": 11, "portrait": "assets/portraits/Gorg/Gorg.mp4", "guaranteedDropId": "key_bronze", "w": 12, "h": 16, "spriteScale": 1 }
  ],
  "companions": [],
  "npcs": [
    { "name": "Canopy",  "x": 972, "y": 510, "dir": "left",  "portrait": "assets/portraits/Canopy/Canopy video.mp4", "affinity": 5 },
    { "name": "Yorna",   "x": 460, "y": 280, "dir": "right", "portrait": "assets/portraits/Yorna/Yorna video.mp4",  "affinity": 5 },
    { "name": "Hola",     "x": 1060, "y": 700, "dir": "up",    "portrait": "assets/portraits/Hola/Hola video.mp4",   "affinity": 5 }
  ],
  "playerInv": {
    "items": [ { "id": "stick", "name": "Wooden Stick", "slot": "rightHand", "atk": 1 } ],
    "equipped": {
      "head": { "id": "cap_leather", "name": "Leather Cap", "slot": "head", "dr": 1 },
      "torso": null, "legs": null,
      "leftHand": null,
      "rightHand": { "id": "sword_fine", "name": "Fine Sword", "slot": "rightHand", "atk": 4 }
    }
  },
  "world": { "w": 1600, "h": 960 },
  "unlockedGates": [],
  "groundItems": [],
  "openedChests": [ "chest_l1_sword" ],
  "brokenBreakables": [ "brk_l1_b" ],
  "vnSeen": [ "npc:canopy" ],
  "affinityFlags": [ "canopy_intro_encourage" ],
  "questFlags": [ "level1_reached" ],
  "questCounters": {}
}
```

### Full Sample: Level 5 (Heart of the Temple — Aurelion)

```jsonc
{
  "version": 1,
  "at": 1757601000000,
  "currentLevel": 5,
  "player": { "x": 560, "y": 1680, "hp": 10, "dir": "left", "level": 2, "xp": 15 },
  "enemies": [
    // Outside approach — Fana (enslaved) + second featured foe + mooks
    { "x": 1488, "y": 1248, "dir": "down", "kind": "featured", "name": "Fana", "hp": 22, "maxHp": 22, "touchDamage": 8, "speed": 11, "portrait": "assets/portraits/Fana/Fana villain.mp4", "guaranteedDropId": "key_temple", "w": 12, "h": 16, "spriteScale": 1 },
    { "x": 1648, "y": 960,  "dir": "left", "kind": "featured", "name": "Temple Sentinel", "hp": 26, "maxHp": 26, "touchDamage": 8, "speed": 11, "w": 12, "h": 16, "spriteScale": 1 },
    { "x": 1360, "y": 1328, "dir": "right", "kind": "mook", "name": "Mook", "hp": 12, "maxHp": 12, "touchDamage": 7, "speed": 10, "w": 12, "h": 16, "spriteScale": 1 },
    { "x": 1200, "y": 1040, "dir": "right", "kind": "mook", "name": "Mook", "hp": 12, "maxHp": 12, "touchDamage": 7, "speed": 10, "w": 12, "h": 16, "spriteScale": 1 },

    // Inside arena — Vorthak + guards
    { "x": 2196, "y": 1140, "dir": "down", "kind": "boss", "name": "Vorthak", "hp": 80, "maxHp": 80, "touchDamage": 12, "speed": 12, "w": 24, "h": 32, "spriteScale": 2,
      "portrait": "assets/portraits/Vorthak/Vorthak.mp4", "portraitPowered": "assets/portraits/Vorthak/Vorthak powered.mp4", "portraitOverpowered": "assets/portraits/Vorthak/Vorthak overpowered.mp4", "portraitDefeated": "assets/portraits/Vorthak/Vorthak defeated.mp4",
      "_secondPhase": false, "onDefeatNextLevel": 6 },
    { "x": 2168, "y": 1140, "dir": "right", "kind": "mook", "name": "Mook", "hp": 10, "maxHp": 10, "touchDamage": 7, "speed": 10, "w": 12, "h": 16, "spriteScale": 1 },
    { "x": 2224, "y": 1140, "dir": "left",  "kind": "mook", "name": "Mook", "hp": 10, "maxHp": 10, "touchDamage": 7, "speed": 10, "w": 12, "h": 16, "spriteScale": 1 }
  ],

  "companions": [
    { "name": "Canopy", "x": 576, "y": 1692, "dir": "up",  "portrait": "assets/portraits/Canopy/Canopy video.mp4", "inventory": { "items": [], "equipped": { "head": null, "torso": null, "legs": null, "leftHand": null, "rightHand": null } }, "affinity": 5.4, "level": 2, "xp": 0 }
  ],

  "npcs": [
    { "name": "Urn", "x": 420, "y": 1720, "dir": "up", "portrait": "assets/portraits/Urn/Urn.mp4", "affinity": 5 }
  ],

  "playerInv": {
    "items": [ { "id": "torch", "name": "Torch", "slot": "leftHand", "atk": 0, "stackable": true, "maxQty": 99, "qty": 3 } ],
    "equipped": {
      "head": { "id": "helm_bronze", "name": "Bronze Helm", "slot": "head", "dr": 2 },
      "torso": { "id": "armor_leather", "name": "Leather Armor", "slot": "torso", "dr": 2 },
      "legs": null, "leftHand": null, "rightHand": { "id": "sword_fine", "name": "Fine Sword", "slot": "rightHand", "atk": 4 }
    }
  },

  "world": { "w": 3040, "h": 1760 },

  "unlockedGates": [],                 // gate locked until Fana’s key is used
  "groundItems": [ ],                  // (would include Temple Key if dropped and not picked up)
  "openedChests": [ ],
  "brokenBreakables": [ ],

  "vnSeen": [ "npc:canopy", "enemy:gorg" ],
  "affinityFlags": [ "canopy_intro_encourage" ],
  "questFlags": [ "level5_reached" ],
  "questCounters": { }
}
```
