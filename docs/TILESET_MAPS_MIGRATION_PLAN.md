# Tileset-Based Maps Migration Plan

This document outlines how to migrate the game to use tileset‑driven maps (Tiled JSON or an embedded map module) without adding external dependencies or changing core systems. It builds on existing rendering, collision, pathfinding, saves, and UI.

## Goals
- Author maps visually using a 16×16 tileset in Tiled.
- Bake visible tile layers into one terrain bitmap for fast rendering.
- Derive collisions, hazards, props, gates, and spawns from the map data.
- Keep existing systems working (pathfinding, saves, minimap, enemies/NPCs).
- No bundler; work via ES modules and fetch where possible.

## Scope & Assumptions
- Tile size: `16` (`TILE` constant). Sprite size unchanged.
- Single tileset image per level to start (atlas at `assets/tilesets/overworld.png`).
- No runtime autotile logic; use Tiled’s editor rules (Wang/terrain) to paint edges.
- PNG color map loader remains as a fallback (Level 1 already supports PNG via `applyPngMap`).

## Assets & Data
- Tileset image: `assets/tilesets/overworld.png` (16×16 grid). Define per‑tile properties in Tiled:
  - `collide` (bool): blocks movement.
  - `hazard` (string): `mud|fire|lava` (affects path costs; non‑blocking).
  - `type` (string): render/collision hints: `wood|wall|water|rock|tree|gate|block`.
  - `blocksAttacks` (bool): optional; if true projectile line tests should stop.
- Map file (choose one):
  1) Tiled JSON (TMJ) under `assets/maps/level_01.tmj` (use Node server to serve it), or
  2) Embedded ES module under `src/data/maps/level_01_map.js` exporting the JSON object.

## Map Conventions (Tiled)
- Layers (draw order):
  - `ground` (base terrain),
  - `water` (visual water),
  - `walls` (visual walls/cliffs),
  - `deco` (non‑blocking decorations),
  - `overlay` (optional highlights above actors).
- Object layer (`objects`):
  - Spawns: `player_spawn`, `spawn_mook`, `spawn_featured_ranged`, `spawn_guardian`, `spawn_boss`.
  - NPCs: `canopy_spawn`, `yorna_spawn`, `hola_spawn`.
  - Props: `chest` (properties: `id`, `itemId`), `barrel`.
  - Gates: `gate` (properties: `id`, `keyId`, `locked` bool).
  - Lights (optional): `light` (properties: `level`, `radius`).
  - Regions (optional): `spawn_zone`, `arena` (rects for future logic).

## Engine Changes (no external deps)
Add two small ES modules. Keep them side‑effect‑free and composable.

1) `src/engine/tilemap_loader.js`
   - Responsibilities:
     - Load map JSON (via fetch from `assets/maps/*.tmj`) or accept an imported object.
     - Set `world.tileW/tileH`, derive `world.w/world.h`.
     - Build per‑tile grids by reading layer tiles and tile properties:
       - `collide` grid (true/false) and `hazard` grid (`0..3`).
       - Optional `type` grid for structural merging (`wall|water|wood|rock|tree|gate|block`).
     - Convert contiguous blocks into merged obstacle rectangles (reuse the row/column run + vertical merge approach used in `map_loader.js`).
       - Use `type: 'block'` for invisible colliders (so `drawObstacles` ignores rendering).
       - Hazards become non‑blocking obstacles: `type: 'mud'|'fire'|'lava'` sized to tile bounds.
       - Gates become obstacles with `{ type:'gate', id, keyId, locked, blocksAttacks:true }`.
     - Parse `objects` for player/NPC/enemy spawns, chests/barrels (with stable `id`s), and lights.
     - Rebuild spatial index; return `{ terrainBitmap, obstacles }` for the renderer.

2) `src/engine/tile_renderer.js`
   - Responsibilities:
     - Prebake the visible tile layers to an offscreen canvas or ImageBitmap.
     - Draw order: `ground → water → walls → deco → overlay`.
     - Output is a single `terrainBitmap` used by existing `render()`.
   - Optional later: chunked baking if levels become very large.

## Integration Points
- `src/main.js`:
  - Attempt `applyTileMap('assets/maps/level_01.tmj')` (or module import) on load.
  - On success, swap `terrain = terrainBitmap`, replace obstacles, rebuild minimap via `initMinimap()`.
  - On failure, fall back to existing `applyPngMap` route.
- `src/engine/map_loader.js`:
  - Export or share merging helpers so both PNG and Tiled paths use the same rectangle packing where possible.

## Save/Load Compatibility
- Keep chest and gate `id`s stable from map objects so the save system persists their state (opened/locked) unchanged.
- Spawns from the map replace defaults only when present (current behavior in `applyPngMap`).

## Performance Notes
- One offscreen terrain bitmap per level; no per‑frame tile blitting.
- Merge colliders aggressively to reduce obstacle count.
- Keep hazards coarse (tile‑aligned) for cheap path cost computation.

## Editor Workflow (Tiled)
1) Set map tile size to 16×16, orthographic.
2) Add `overworld.png` tileset and define per‑tile properties once.
3) Paint `ground/water/walls/deco/overlay` layers with Tiled autotiling (optional).
4) Add `objects` with required `type` and properties for spawns/props/gates.
5) Export to `assets/maps/level_01.tmj` or copy JSON into `src/data/maps/level_01_map.js` (ES module export) for file:// runs.

## Manual Test Steps
- Load the game and verify:
  - Camera shows the prebaked tilemap; grid toggle still works.
  - Player/NPC/chest/barrel/gate positions match the map.
  - Collisions line up with visual walls/water; no diagonal corner cuts.
  - Hazards affect enemy pathfinding (mud slower; fire/lava avoided where possible).
  - Minimap matches the new terrain.
  - Save/reload preserves opened chests and unlocked gates by `id`.

## Rollout Plan
1) Implement `tilemap_loader.js` and `tile_renderer.js` (simple, dependency‑free).
2) Convert Level 1 to a Tiled map; keep PNG as fallback during transition.
3) Migrate Level 5 (temple) layout to tiles, encoding gates and water via tile/object properties.
4) Iterate: add light objects and region triggers as needed.

## Risks & Mitigations
- Large maps: prebaked canvas may be big — mitigate with chunked baking if needed.
- Asset serving in file:// mode: embed JSON as ES module or use the included Node server.
- Double‑render walls/water: mark colliders as `type:'block'` or `render:false` so only the tilemap supplies visuals.

## Minimal Data Contract (reference)
- Tileset tile properties used by the loader: `collide?:bool`, `hazard?:'mud'|'fire'|'lava'`, `type?:string`, `blocksAttacks?:bool`.
- Object `type` strings recognized: `player_spawn`, `spawn_mook`, `spawn_featured_ranged`, `spawn_guardian`, `spawn_boss`, `canopy_spawn`, `yorna_spawn`, `hola_spawn`, `chest`, `barrel`, `gate`, `light`.
- Gate object props: `id:string`, `keyId?:string`, `locked?:bool`.
- Chest props: `id:string`, `itemId?:string`.

This plan keeps the engine’s draw and AI loops intact while switching the world to a tileset‑authored source. Implementation can proceed incrementally per level.

## Sample TMJ (Tiled JSON) — Minimal Schema
Below is a compact example showing the parts the loader will read. Numbers are illustrative. Coordinates are pixels (Tiled default). Tile size is 16×16.

```json
{
  "type": "map",
  "tiledversion": "1.10.2",
  "orientation": "orthogonal",
  "renderorder": "right-down",
  "tilewidth": 16,
  "tileheight": 16,
  "width": 100,
  "height": 60,
  "infinite": false,
  "tilesets": [
    {
      "firstgid": 1,
      "source": "../tilesets/overworld.tsj"
    }
  ],
  "layers": [
    {
      "id": 1,
      "name": "ground",
      "type": "tilelayer",
      "width": 100,
      "height": 60,
      "encoding": "csv",
      "data": [ /* gids … truncated … */ ]
    },
    {
      "id": 2,
      "name": "water",
      "type": "tilelayer",
      "width": 100,
      "height": 60,
      "encoding": "csv",
      "data": [ /* gids … truncated … */ ]
    },
    {
      "id": 3,
      "name": "walls",
      "type": "tilelayer",
      "width": 100,
      "height": 60,
      "encoding": "csv",
      "data": [ /* gids … truncated … */ ]
    },
    {
      "id": 4,
      "name": "deco",
      "type": "tilelayer",
      "width": 100,
      "height": 60,
      "encoding": "csv",
      "data": [ /* gids … truncated … */ ]
    },
    {
      "id": 5,
      "name": "objects",
      "type": "objectgroup",
      "objects": [
        { "id": 101, "name": "", "type": "player_spawn", "x": 800, "y": 480, "point": true },
        { "id": 102, "name": "", "type": "spawn_mook", "x": 720, "y": 420, "point": true },
        { "id": 103, "name": "", "type": "spawn_featured_ranged", "x": 960, "y": 500, "point": true },
        { "id": 104, "name": "", "type": "canopy_spawn", "x": 760, "y": 480, "point": true },
        { "id": 105, "name": "chest_l1_weapon", "type": "chest", "x": 864, "y": 416, "width": 16, "height": 16,
          "properties": [
            { "name": "id", "type": "string", "value": "chest_l1_weapon" },
            { "name": "itemId", "type": "string", "value": "dagger" }
          ]
        },
        { "id": 106, "name": "castle_gate", "type": "gate", "x": 1200, "y": 224, "width": 16, "height": 32,
          "properties": [
            { "name": "id", "type": "string", "value": "castle_gate" },
            { "name": "keyId", "type": "string", "value": "castle_gate" },
            { "name": "locked", "type": "bool", "value": true }
          ]
        },
        { "id": 107, "name": "", "type": "light", "x": 1184, "y": 208, "width": 0, "height": 0,
          "properties": [
            { "name": "level", "type": "int", "value": 5 },
            { "name": "radius", "type": "int", "value": 4 }
          ]
        }
      ]
    }
  ]
}
```

### Sample TSJ (Tileset JSON) — Tile Properties
Attach properties to specific tile IDs in the tileset. The loader reads these to build collisions and hazards.

```json
{
  "type": "tileset",
  "name": "overworld",
  "tilewidth": 16,
  "tileheight": 16,
  "tilecount": 256,
  "columns": 16,
  "image": "../tilesets/overworld.png",
  "imagewidth": 256,
  "imageheight": 256,
  "tiles": [
    { "id": 5,  "properties": [ { "name": "collide", "type": "bool", "value": true }, { "name": "type", "type": "string", "value": "wall" }, { "name": "blocksAttacks", "type": "bool", "value": true } ] },
    { "id": 6,  "properties": [ { "name": "collide", "type": "bool", "value": true }, { "name": "type", "type": "string", "value": "water" } ] },
    { "id": 7,  "properties": [ { "name": "collide", "type": "bool", "value": false }, { "name": "type", "type": "string", "value": "wood" } ] },
    { "id": 8,  "properties": [ { "name": "collide", "type": "bool", "value": true }, { "name": "type", "type": "string", "value": "rock" } ] },
    { "id": 9,  "properties": [ { "name": "collide", "type": "bool", "value": true }, { "name": "type", "type": "string", "value": "tree" } ] },
    { "id": 10, "properties": [ { "name": "hazard",  "type": "string", "value": "mud" } ] },
    { "id": 11, "properties": [ { "name": "hazard",  "type": "string", "value": "fire" } ] },
    { "id": 12, "properties": [ { "name": "hazard",  "type": "string", "value": "lava" } ] },
    { "id": 13, "properties": [ { "name": "collide", "type": "bool", "value": true }, { "name": "type", "type": "string", "value": "gate" } ] },
    { "id": 14, "properties": [ { "name": "collide", "type": "bool", "value": true }, { "name": "type", "type": "string", "value": "block" } ] }
  ]
}
```

Notes:
- Tile IDs in `tiles` are zero‑based within the tileset. The TMJ layer `data` uses GIDs which add `firstgid`.
- Colliders created from `type: 'block'|'wall'|'water'|'rock'|'tree'|'gate'` are merged into rectangles; hazards are kept tile‑aligned.
- Objects provide gameplay entities (spawns, chests, barrels, gates, lights) with stable IDs for save/load.
