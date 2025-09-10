# Save System — Full Game State Persistence

This document describes what the game saves, how the payload is structured, and how each field maps to in‑game systems. The save system is designed to fully restore a session so the player can continue exactly where they left off — level, positions, actors, inventory, flags, VN intros, key guardians, and ground items.

## Goals

- Resume precisely: same level, camera context, player position, HP, companions, enemies, NPCs.
- Persist everything that changes as you play (gates unlocked, chests opened, breakables broken, items on the ground, quests)
- Keep saves robust across versions by adding fields conservatively and handling defaults.

## Where Saves Live

- Local: `localStorage` key per slot — `shadow_kingdom_save_<slot>`
- Remote: if `API_URL` is configured, saves load/store via `/api/save?slot=<n>` with JSON payload

## Save/Load Flow

- Serialize: `serializePayload()` gathers all state into a plain JSON object.
- Load route: `loadDataPayload(data)` compares `data.currentLevel` to the current level.
  - If different, it stashes the payload, sets `runtime.pendingLevel = target`, and shows a banner.
  - The main loop swaps to the requested level via the loader registry, then calls `applyPendingRestore()` to apply the saved payload to the new scene.
- VN/overlays are closed before a level swap; after swap the saved state is applied.

## Payload Structure (Top‑Level)

```jsonc
{
  "version": 1,
  "at": 1712345678901,              // ms timestamp
  "currentLevel": 1,                // numeric level id
  "player": { ... },                // player state
  "enemies": [ ... ],               // live enemies (hp > 0)
  "companions": [ ... ],            // current party
  "npcs": [ ... ],                  // wandering/talkable NPCs
  "playerInv": { ... },             // inventory + equipped items
  "world": { "w": 1600, "h": 960 },    // px dimensions at time of save
  "unlockedGates": [ ... ],         // gate ids that are unlocked
  "groundItems": [ ... ],           // items on the ground
  "openedChests": [ ... ],          // chest ids opened
  "brokenBreakables": [ ... ],      // barrel/crate ids removed
  "vnSeen": [ ... ],                // VN-on-sight ids (e.g., "npc:canopy")
  "affinityFlags": [ ... ],         // one-time affinity awards
  "questFlags": [ ... ],            // quest flags
  "questCounters": { ... }          // quest counters/progress
}
```

## Player

```jsonc
"player": {
  "x": 123.4, "y": 567.8,          // position in px (bottom/left of sprite box)
  "hp": 9.5,                       // current HP
  "dir": "left",                   // facing dir ('up'|'down'|'left'|'right')
  "level": 1, "xp": 10             // player progression
}
```

- Derived stats (e.g., `player.damage`, DR bonuses) are recomputed on load.

## Inventory

- `playerInv.items`: stacked/loose items in the backpack.
- `playerInv.equipped`: equipment by slot (`head`, `torso`, `legs`, `leftHand`, `rightHand`).
- Items are defined by id (see `src/data/items.js`) and include attributes (`atk`, `dr`, `keyId`, etc.).
- Key items use slot `misc` with a `keyId` that matches a gate’s `keyId`.

## Enemies (live)

Each live enemy entry restores an entity verbatim:

```jsonc
{
  "x": 1107.99, "y": 725.10,
  "dir": "right",
  "kind": "mook|featured|boss",
  "name": "Mook|Gorg|...",
  "hp": 7, "maxHp": 7,
  "touchDamage": 5, "speed": 10,
  "w": 12, "h": 16, "spriteScale": 1,
  "_secondPhase": false,            // boss phase marker
  "portrait": "...",                // VN portraits (bosses/featured)
  "portraitPowered": "...",
  "portraitOverpowered": "...",
  "portraitDefeated": "...",
  "sheetPalette": null,             // custom tinting (optional)
  "questId": null,                  // quest linkage if spawned for a quest
  "guaranteedDropId": null,         // e.g., key_bronze, key_temple
  "onDefeatNextLevel": null         // boss transitions
}
```

Notes:
- Only enemies with `hp > 0` are saved (dead entities are not serialized).
- Featured foes (key guardians) retain identity by `name` and `guaranteedDropId`. On load, if `name` is missing in older payloads, identity is inferred from `guaranteedDropId` (e.g., `key_bronze` ⇒ `Gorg`) and default tints may be applied.
- Boss phase markers: `_secondPhase` persisted. Some bosses (e.g., Vorthak) may also track `_thirdPhase` at runtime; a missing field defaults safely.

## Companions

```jsonc
{
  "name": "Canopy",
  "x": 1177.99, "y": 765.05, "dir": "up",
  "portrait": "assets/portraits/Canopy/Canopy video.mp4",
  "inventory": { ... },
  "affinity": 5.3, "level": 1, "xp": 0
}
```

- On load, companions are spawned and their auras/derived values are recomputed per tick.

## NPCs

```jsonc
{
  "name": "Hola",
  "x": 1168.9, "y": 775.7, "dir": "up",
  "portrait": "assets/portraits/Hola/Hola video.mp4",
  "affinity": 5
}
```

- Dialog trees are reattached by name (`Canopy`, `Yorna`, `Hola`, etc.).
- VN-on-sight restoration: if the VN hasn’t been seen (`vnSeen` lacks `npc:<name>`), a default intro text is reattached so VN intros can still trigger after load.

## World/Geometry State

- `world`: pixel dimensions at save time (`w`, `h`). Actual geometry is produced by the level loader; dynamic states below patch that geometry.
- `unlockedGates`: array of gate `id`s that are unlocked. On load, any gate with a matching `id` is set to `locked=false`.
- `openedChests`: array of chest `id`s that should be loaded as opened (`opened=true`).
- `brokenBreakables`: array of obstacle ids (`barrel`/`crate`) that should be removed on load.
- Hazards (`mud`, `fire`, `lava`) and static walls are rebuilt by the current level loader; only dynamic deltas are saved.

## Ground Items

```jsonc
"groundItems": [
  { "id": "p17", "x": 1012, "y": 744, "item": { "id": "key_temple", "name": "Temple Key", "slot": "misc", "keyId": "key_temple" } }
]
```

- All world items (drops, key items from featured foes) are persisted with their position and full item data.
- On load, `itemsOnGround` is rebuilt, so the player can pick them up later.

## VN / Flags / Quests

- `vnSeen`: string keys of intro VNs that have been shown (e.g., `npc:canopy`, `enemy:gorg`). Prevents re‑playing intros after load.
- `affinityFlags`: one‑time affinity rewards earned (prevents repeat awards in dialog trees).
- `questFlags`: boolean flags for quest state (e.g., `..._started`, `..._cleared`, `..._done`, hub/unlock flags, etc.).
- `questCounters`: numeric progress for active quests (e.g., remaining kills, uses).

## Level Switching on Load

- Saves include `currentLevel`.
- On load:
  1) If the saved level differs from the current scene, the payload is stashed and the game sets `runtime.pendingLevel`.
  2) The main loop swaps to the correct level via `LEVEL_LOADERS[level]`.
  3) After the swap, `applyPendingRestore()` applies the saved payload (actors, flags, items), ensuring a precise resume.

## Identity and VN Robustness (Compatibility)

- Named featured foes: if older payloads lacked `name`, we infer name from `guaranteedDropId` and set default tints to preserve identity.
- NPC VN-on-sight: if an NPC’s intro hasn’t been seen, we restore `vnOnSight` text from `introTexts` so intros still trigger after load.

## Not Persisted (By Design)

- Transient runtime effects (e.g., camera pans, pre‑intro freezes, queued VNs) are not saved. The world will be unfrozen after load and won’t auto‑replay pre‑intros.
- Static level geometry is not serialized; loaders build walls/terrain and the save applies dynamic deltas (gates/chests/breakables/ground items).

## Versioning and Extensions

- `version` at top‑level allows migration in future.
- Adding new fields:
  - Default missing fields in `deserializePayload`.
  - Gatekeeper checks: keep new fields optional and compute safe defaults when absent.

## Example (Truncated)

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
