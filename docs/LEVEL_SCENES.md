Designing A New Level: Arena, Gate, Key Guardian, Boss

This guide shows how to add a new level that follows the pattern used in Level 2 and 3: a themed biome, a boss arena gated by a locked gate, and a featured “key guardian” enemy that drops the key to open the gate.

1) High-level Steps

- Resize the world and clear dynamic arrays.
- Build terrain/obstacles for the biome.
- Spawn regular and featured enemies around the player (outside camera to reduce chaos at spawn).
- Build the boss arena (walls), leaving a central gap for a locked gate.
- Spawn a featured “key guardian” outside the arena that drops the gate key.
- Spawn the boss inside the arena (with optional mooks) and wire level transition after defeat.
- Assign stable ids at spawn time:
  - Gates: `id` (e.g., `castle_gate`, `nethra_gate`, …)
  - Chests: `id` (e.g., `chest_l1_sword`)
  - Breakables: `id` (e.g., `brk_l1_0`)
  - Unique actors: set `vnId` (e.g., `enemy:vast`, `enemy:gorg`).
- Add optional chests/breakables and any recruitable NPCs.
- Set a “levelN_reached” flag to gate dialogue/quests that unlock at that level.
 - Debug: While playtesting, press Shift+D to jump to the next level (currentLevel+1). Inventory and companions persist.

2) Code Locations

- Level definitions: `src/engine/levels.js`
- Spawns and state: `src/engine/state.js` exports `spawnEnemy`, `spawnNpc`, arrays (`enemies`, `obstacles`, etc.).
- Terrain/obstacles helpers: `src/engine/terrain.js`
- Boss defeat → next level: set `onDefeatNextLevel` on the boss spawn (handled in `src/systems/step.js`).
- Keys and gates:
  - Key Guardian: set `guaranteedDropId: 'key_<id>'` on a featured enemy.
  - Gate: push an obstacle `{ type: 'gate', id: '<gate_id>', keyId: 'key_<id>', locked: true, blocksAttacks: true }`.
- Level descriptors (v2 saves): `src/engine/level_descriptors.js` defines per-level ids for gates, chests, breakables, and unique actors. Keep these in sync with level spawns so saves can apply world deltas deterministically.

3) Template Snippet (inside a new `loadLevelN()`)

```js
import { world, player, enemies, companions, npcs, obstacles, corpses, stains, floaters, sparkles, runtime } from './state.js';
import { buildObstacles, buildTerrainBitmap } from './terrain.js';
import { makeSpriteSheet } from './sprites.js';
import { spawnEnemy, spawnNpc } from './state.js';
import { TILE } from './constants.js';

export function loadLevelN() {
  // Resize world for Level N
  world.tileW = 130; // tune per biome
  world.tileH = 80;  // tune per biome
  enemies.length = 0; npcs.length = 0; obstacles.length = 0; corpses.length = 0; stains.length = 0; floaters.length = 0; sparkles.length = 0;
  // Place player near center and gather companions nearby
  player.x = Math.floor(world.w / 2);
  player.y = Math.floor(world.h / 2);
  for (let i = 0; i < companions.length; i++) { const c = companions[i]; c.x = player.x + 12 * (i + 1); c.y = player.y + 8 * (i + 1); }
  // Mark progression flag for gating quests/dialogue
  try { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['levelN_reached'] = true; } catch {}

  // Build biome terrain and obstacles
  const terrain = buildTerrainBitmap(world, 'biome-id');
  obstacles.push(...buildObstacles(world, player, enemies, npcs, 'biome-id'));

  // Spawn some enemies around the player (off-camera)
  for (let k = 0; k < 6; k++) {
    const bx = Math.round(player.x + (Math.random() * 400 - 200));
    const by = Math.round(player.y + (Math.random() * 300 - 150));
    spawnEnemy(bx, by, 'mook');
  }

  // Boss arena footprint
  const rw = TILE * 12, rh = TILE * 8, t = 8;
  const rx = Math.max(TILE * 6, Math.min(world.w - rw - TILE * 6, player.x + 260));
  const ry = Math.max(TILE * 6, Math.min(world.h - rh - TILE * 6, player.y + 160));
  const add = (x,y,w,h,type='wall',extra={}) => obstacles.push(Object.assign({ x, y, w, h, type, blocksAttacks: type==='wall' }, extra));
  // Clear any procedural obstacles inside the arena and in the gate opening
  const gapW = 24; const gapX = rx + (rw - gapW) / 2;
  (function clearArenaInteriorAndGap() {
    const inner = { x: rx + t, y: ry + t, w: rw - 2*t, h: rh - 2*t };
    const gapRect = { x: gapX, y: ry, w: gapW, h: t };
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i]; if (!o) continue;
      const r = { x: o.x, y: o.y, w: o.w, h: o.h };
      const intersects = !(r.x + r.w <= inner.x || r.x >= inner.x + inner.w || r.y + r.h <= inner.y || r.y >= inner.y + inner.h);
      const gapOverlap = !(r.x + r.w <= gapRect.x || r.x >= gapRect.x + gapRect.w || r.y + r.h <= gapRect.y || r.y >= gapRect.y + gapRect.h);
      if (intersects || gapOverlap) obstacles.splice(i, 1);
    }
  })();
  // Build walls with a top gap for the gate
  add(rx, ry + rh - t, rw, t); // bottom
  add(rx, ry, t, rh);          // left
  add(rx + rw - t, ry, t, rh); // right
  add(rx, ry, gapX - rx, t);   // top-left segment
  add(gapX + gapW, ry, (rx + rw) - (gapX + gapW), t); // top-right segment
  // Locked gate spanning the gap; requires key
  obstacles.push({ x: gapX, y: ry, w: gapW, h: t, type: 'gate', id: 'gate_levelN', keyId: 'key_levelN', locked: true, blocksAttacks: true });

  // Key guardian (featured) outside arena with a guaranteed key drop
  const gx = player.x + 180, gy = player.y - 120;
  spawnEnemy(gx, gy, 'featured', { name: 'Guardian', guaranteedDropId: 'key_levelN', hp: 12, dmg: 4 });

  // Boss inside arena
  const cx = rx + rw/2 - 6;
  const cy = ry + rh/2 - 8;
  spawnEnemy(cx, cy, 'boss', {
    name: 'BossN',
    onDefeatNextLevel: N+1, // or null if this is the last level for now
    // Optional portraits for VN overlay
    portraitPowered: 'assets/portraits/BossN/BossN powered.mp4',
    portraitDefeated: 'assets/portraits/BossN/BossN defeated.mp4',
  });
  // Optional mooks guarding the boss
  spawnEnemy(cx - 24, cy, 'mook');
  spawnEnemy(cx + 24, cy, 'mook');

  // Return terrain for renderer
  return terrain;
}
```

4) Keys, Gates, and Interaction Notes

- Keys
  - Use a distinct id per level (e.g., `key_nethra`, `key_reed`, `key_levelN`).
  - Drop table integration is optional; a `guaranteedDropId` on a featured enemy ensures certainty.
- Gate obstacles
  - `type: 'gate'`, `id: '..._gate'`, `keyId: 'key_...'`, `locked: true`, `blocksAttacks: true`.
  - Combat code checks for `gate` collision in interact logic (opening requires having the key).
  - Save v2 records gate states by id and restores them on load.
- Clearing arena interior
  - Ensure to remove procedural obstacles inside the arena footprint and where the gate gap will be, or the gate may be blocked.

5) Level Flags and Gating

- Set a `levelN_reached` flag in `loadLevelN()` to gate character quests/dialogue specific to that level:

```js
try { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['levelN_reached'] = true; } catch {}
```

- Companion dialog trees use `requires: { hasFlag: 'level3_reached' }` (etc.) to show quests only after the level has been entered once.

6) Tuning

- Enemy toughness: current quest-spawned mooks are HP 6 / DMG 5; featured quest foes around HP 8 / DMG 4. Bosses are significantly higher and use a two‑phase flow on defeat where applicable.
- Place enemies far enough from player spawn so intros and combat aren’t instantaneous upon entering a level.

7) Examples

- See `loadLevel2()` for an arena with `nethra_gate` unlocked by key dropped from featured “Aarg”.
- See `loadLevel3()` for an island arena with `marsh_gate` unlocked by key dropped from featured “Wight”.

8) Debugging and Transitions

- Next-level jump: Press Shift+D to set `runtime.pendingLevel = (currentLevel || 1) + 1`. The main loop will load `loadLevel<N>` if implemented.
- Boss transition: Set `onDefeatNextLevel: N+1` on the boss to advance automatically after defeat. The defeated VN displays before fade.
- Level reach flags: In each `loadLevelN()`, set `runtime.questFlags['levelN_reached'] = true` to gate companion quests/dialogs.

9) Save v2 Notes for Level Authors
- Ensure ids are stable and present:
  - Gates in obstacles carry `id`; add them to the level descriptor.
  - Chests and breakables also have `id`; add them to the descriptor.
  - Boss/guardian spawns include a `vnId` (e.g., `enemy:vast`); list those in the descriptor’s `uniqueActors`.
- Generic (non-unique) enemies are saved explicitly with position/HP; you don’t need to predeclare them.
- Portraits: use level-scoped paths (`assets/portraits/levelXX/<Name>/<File>.mp4`).
