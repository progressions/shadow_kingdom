# TODO — Item Acquisition (Phase 1)

Scope: Implement organic item acquisition via ground pickups, enemy drops, and a few fixed chests. Persist state. Keep PRs small and focused.

## 1) Ground Pickups

- [ ] State: add `itemsOnGround` to `src/engine/state.js` (array of `{ id, x, y, w, h, item }`).
- [ ] Helpers: `spawnPickup(x, y, item)` and `collectPickup(index)` in `src/engine/state.js` or a small `engine/items.js`.
- [ ] Render: draw pickups in `src/engine/render.js` (simple 10×10 box + tint + small sparkle).
- [ ] Auto-pickup: in `src/systems/step.js`, if player within ~12 px, collect and show banner (`showBanner`), play pickup sting.
- [ ] Interact pickup: modify `tryInteract()` in `src/systems/combat.js` to pick up adjacent item when in range.
- [ ] Audio: add `playSfx('pickup')` variant in `src/engine/audio.js` chip synth (soft chime).

## 2) Enemy Drops (basic tables)

- [ ] Data: add `ENEMY_LOOT` map (inline or `src/data/loot.js`) with weighted items for `mook`, `featured`, `boss`.
- [ ] Hook: after enemy death removal in `src/systems/step.js`, roll drops and `spawnPickup`.
- [ ] Balance: boss guaranteed key (`key_bronze` → `castle_gate`), featured > mook.

## 3) Fixed Chests (2–3 near start)

- [ ] Obstacles: support `type:'chest'` in `src/engine/terrain.js` (or spawn a few programmatically in `src/main.js`).
- [ ] Draw: add chest drawing in `drawObstacles()` with `opened` visual.
- [ ] Interact: in `tryInteract()`, if facing a chest: open → spawn items; if `locked`, check player inventory for matching `keyId`.
- [ ] IDs: each chest has a stable `id` and `lootTier` (e.g., `common`, `rare`).

## 4) Save / Load

- [ ] Serialize: extend `src/engine/save.js` to include `groundItems: [{ id, x, y, item }]`.
- [ ] Serialize: include `openedChests: string[]`.
- [ ] Deserialize: respawn pickups and mark opened chests.
- [ ] Safety: ensure transient fields (sparkles) do not persist.

## 5) UX Polish

- [ ] Banner: on pickup show `Picked up X` with item name (from `src/data/items.js`).
- [ ] Clamp world items: optional cap (e.g., 30) to prevent clutter; oldest despawn first (non-keys only).
- [ ] Sparkles: reuse `spawnSparkle` for pickup blink.

## Nice-to-haves (Phase 2)

- [ ] Breakables: barrels/crates that drop items on attack.
- [ ] Forage nodes: herbs/ore with respawn timer and simple visuals.
- [ ] VN actions: `grant_item`, `open_shop` in `src/engine/dialog.js`.

## Testing Checklist

- [ ] Pickups collect reliably by proximity and via Interact.
- [ ] Drops appear on enemy death; boss always drops a key.
- [ ] Chests can be opened once; locked chests respect keys.
- [ ] Save/load preserves ground items and opened chests.
- [ ] No excessive item clutter; pickup banners and sounds trigger once.
