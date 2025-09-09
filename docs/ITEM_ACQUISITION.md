# Item Acquisition — Options and Integration Plan

This document outlines approaches to obtaining items organically in the overworld, plus data/UX considerations and concrete integration hooks for this codebase.

## Goals

- Place items into the world in ways that fit exploration, combat, and VN dialogs.
- Keep implementation incremental: add pickups/drops first, then expand to chests/foraging.
- Persist world state (ground items, opened chests, node cooldowns) across saves.

## Options (Overview)

### Quick Wins
- Ground pickups: visible items on the map; press Interact or auto‑pickup in a small radius.
- Enemy drops: mooks/featured have weighted drops; boss/featured guarantee at least one item.
- Fixed chests: interactable world objects that grant items; locked variants require keys.

### World Objects
- Breakables: barrels/crates/vases that drop items when destroyed.
- Forage nodes: herbs/ore spawns in biomes; interact to harvest; optional respawn timers.
- Hidden caches: sparkles in the world hint at a hidden pickup; interact reveals the item.

### Procedural Placement
- Biome scatter: noise‑based density to place low‑tier items (herbs/coins) on valid tiles, with a min distance from player/NPCs.
- POI clusters: higher tiers near points of interest (NPCs, gates, castle) and further from the start.
- Event spawners: periodic off‑screen spawn rolls up to a cap to keep the world sprinkled.

### NPC/Quest Rewards
- NPC gifts: dialog choices award items directly (fits VN system via an action).
- Mini quests: simple fetch/defeat tasks tracked via dialog node flags; reward on completion.
- Companion interactions: occasional companion prompts that grant small consumables.

### Economy/Crafting
- Vendor NPC: VN menu to buy/sell; currency as a stackable item type.
- Crafting: recipes using foraged materials; output equipment or consumables.

### Progression/Keys
- Keys in chests or on featured enemies; open `gate` obstacles that check `item.keyId` (already supported).
- Boss rewards: guaranteed rare or key item; banner + sting.

## UX Considerations

- Pickup prompt: show “Pick up X” within ~12px, or auto‑pickup for coins/materials.
- Feedback: sparkle or subtle glow on items; small bounce when dropped; banner toast on pickup.
- Inventory full: VN prompt to swap/equip/leave; or auto‑drop least valuable.
- Rarity cues: tint/shine variations; tiny icon to hint slot/type (helm/weapon/key).
- Map clarity: optional markers for unopened chests; hide after opened.

## Data & Balance

- Source‑based loot tables: per enemy type, chest tier, forage node — with weights and min/max counts.
- World caps/timers: limit ground items to avoid clutter; despawn non‑key items after N minutes.
- Save/load: persist ground items, chest open state, node cooldowns, and currency.

## Integration With This Codebase

The following integrates naturally with current modules:

- Entities
  - `itemsOnGround` (new) in `engine/state.js`: array of `{ id, x, y, w, h, item, sparkleT }`.
  - Render in `engine/render.js`: draw a small icon/box and sparkle; y‑sorted with other drawables or as an overlay.
  - Interact/pickup in `systems/step.js` (proximity auto‑pickup) and/or `systems/combat.tryInteract` (button pickup).

- Enemy Drops
  - After enemy death cleanup in `systems/step.js`, roll per‑type loot and push into `itemsOnGround`.
  - Featured/boss: guarantee one drop; roll extra based on distance from start or menace level.

- Chests & Breakables
  - Reuse `obstacles` with `type: 'chest' | 'barrel' | 'crate'` and flags: `{ opened, locked, id, lootTier }`.
  - On interact (chest): if locked, check for key in inventory (`keyId` ↔ obstacle `id`), else open and spawn items or grant directly.
  - On attack (breakable): on HP=0 event, spawn items with short outward velocity.

- Forage Nodes
  - Lightweight actor list `forageNodes` with `{ id, x, y, kind, respawnAt }`.
  - Interact to harvest → grant item and set `respawnAt = now + cooldown`.

- Dialog Rewards
  - Add VN actions in `engine/dialog.js`:
    - `grant_item` (single or list),
    - `open_shop`,
    - `start_crafting` (optional later).

- Audio/FX
  - Play pickup sting on grant; small sparkle on item drop/harvest; banner shows item name.

## Minimal First Slice (Recommended)

1) Ground Pickups
- Add `itemsOnGround` store; helpers: `spawnPickup(x,y,item)` and `collectPickup(index)`.
- Render as small box with tint; idle sparkle.
- Auto‑pickup within ~10–12 px, or Interact to pick up when adjacent.
- Save/load: include list with position + item data.

2) Enemy Drops
- Add simple loot tables (JSON or inline map) for `mook`, `featured`, `boss`.
- On enemy removal in `systems/step.js`, roll and spawn pickups.
- Banner + sting on collect.

3) Fixed Chests (a few near start)
- Add obstacles of `type:'chest'` with `id` and `lootTier`.
- Interact opens, spawns items, flips `opened=true`.
- Save/load: persist opened chest `id`s.

## Save/Load Additions

- In `engine/save.serializePayload()` include:
  - `groundItems: [{ id, x, y, item }]`
  - `openedChests: [id, ...]`
  - `forageNodes: [{ id, respawnAt }]` (future)
- In `deserializePayload()` restore these and rehydrate visuals.

## Data Sketches

- Enemy loot tables (example):
```js
const ENEMY_LOOT = {
  mook:     [{ id: 'torch', w: 30 }, { id: 'stick', w: 20 }],
  featured: [{ id: 'dagger', w: 35 }, { id: 'buckler', w: 25 }],
  boss:     [{ id: 'key_bronze', w: 100 }], // guaranteed key for castle gate
};
```
- Chest tiers (example):
```js
const CHEST_LOOT = {
  common:  [{ id: 'torch', w: 40 }, { id: 'cap_leather', w: 25 }],
  rare:    [{ id: 'helm_bronze', w: 40 }, { id: 'dagger', w: 40 }],
};
```

## Rollout Plan

- Phase 1: Ground pickups + enemy drops + 2–3 chests; persist state; basic sparkle + banner.
- Phase 2: Breakables + forage nodes with cooldowns; VN actions for `grant_item` and `open_shop`.
- Phase 3: Vendors/crafting; rarity cues; map markers for unopened chests.

## Testing

- Verify auto‑pickup radius and interact prompt do not interfere with combat.
- Ensure save/load preserves ground items and chest states; re‑open session shows the same world.
- Drop table sanity: boss always drops a key; featured drop rates feel rewarding but not excessive.

