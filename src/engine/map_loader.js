import { TILE } from './constants.js';
import { world, player, enemies, npcs, companions, obstacles, corpses, stains, floaters, sparkles, spawners, runtime, spawnEnemy, spawnNpc } from './state.js';
import { buildTerrainBitmap } from './terrain.js';
import { sheetForName } from './sprites.js';
import { rebuildObstacleIndex } from './spatial_index.js';
import { setNpcDialog } from './dialog.js';
import { introTexts } from '../data/intro_texts.js';
import { canopyDialog, yornaDialog, holaDialog } from '../data/dialogs.js';

function rgbToHex(r, g, b) {
  const h = (n) => n.toString(16).padStart(2, '0');
  return `${h(r)}${h(g)}${h(b)}`.toLowerCase();
}

// Merge horizontal runs of the same type into single obstacle rows
function addMergedRowRuns(y, typesRow, mergeableTypes, rowsOut) {
  const w = world.tileW;
  let x = 0;
  while (x < w) {
    const t = typesRow[x];
    if (!t || !mergeableTypes.has(t)) { x++; continue; }
    let x2 = x + 1;
    while (x2 < w && typesRow[x2] === t) x2++;
    // Create a run spanning [x, x2)
    rowsOut.push({ type: t, x, y, w: (x2 - x), h: 1 });
    x = x2;
  }
}

// Merge vertically adjacent runs with same type/x/width into taller rectangles
function mergeVerticalRuns(runs, mergeableTypes) {
  // Group by (type|x|w) and sweep by y
  const groups = new Map();
  for (const r of runs) {
    if (!r || !mergeableTypes.has(r.type)) continue;
    const key = `${r.type}|${r.x}|${r.w}`;
    let arr = groups.get(key);
    if (!arr) { arr = []; groups.set(key, arr); }
    arr.push(r);
  }
  const merged = [];
  for (const arr of groups.values()) {
    arr.sort((a, b) => a.y - b.y);
    let cur = null;
    for (const r of arr) {
      if (!cur) { cur = { ...r }; continue; }
      if (r.y === cur.y + cur.h) { cur.h += 1; }
      else { merged.push(cur); cur = { ...r }; }
    }
    if (cur) merged.push(cur);
  }
  return merged;
}

// Build obstacles from a color-indexed 2D grid
function buildObstaclesFromGrid(grid, legend) {
  obstacles.length = 0;
  const h = world.tileH, w = world.tileW;
  // Optional region packing for large water areas (reduces rectangle count)
  const packWater = (legend && Object.prototype.hasOwnProperty.call(legend, 'packWater')) ? !!legend.packWater : true;
  // Fast pass: gather horizontal runs for mergeable types, then merge vertically
  const mergeable = new Set(packWater ? ['wall', 'gate', 'wood', 'rock'] : ['wall', 'water', 'gate', 'wood', 'rock']);
  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = new Array(w);
    for (let x = 0; x < w; x++) row[x] = grid[y*w + x];
    addMergedRowRuns(y, row, mergeable, rows);
  }
  let rects = mergeVerticalRuns(rows, mergeable);
  // If packing water, add region-packed rectangles now (in tile units)
  if (packWater) {
    const waterRects = packRectanglesForType(grid, 'water', w, h);
    rects = rects.concat(waterRects.map(r => ({ ...r, type: 'water' })));
  }
  // Draw order: water first, then wood (bridge), then walls/gates, then rocks
  const pri = (t) => (t === 'water') ? 0 : (t === 'wood') ? 1 : (t === 'wall') ? 2 : (t === 'gate') ? 3 : (t === 'rock') ? 4 : 9;
  rects.sort((a, b) => pri(a.type) - pri(b.type));
  for (const r of rects) {
    const type = r.type;
    const o = { x: r.x * TILE, y: r.y * TILE, w: r.w * TILE, h: r.h * TILE, type, blocksAttacks: (type === 'wall' || (type === 'gate')) };
    if (type === 'gate') { o.locked = true; o.id = o.id || 'castle_gate'; o.keyId = o.keyId || 'castle_gate'; }
    obstacles.push(o);
  }
  // Second pass: trees as 1x1 tiles (rocks are merged above)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = grid[y*w + x];
      if (t === 'tree') {
        const px = x * TILE, py = y * TILE;
        const size = TILE; // full-tile footprint
        obstacles.push({ x: px, y: py, w: size, h: size, type: t });
      }
    }
  }
}

// Greedy rectangle packing for a given tile type. Produces rectangles in tile units.
function packRectanglesForType(grid, type, w, h) {
  const rects = [];
  const seen = new Uint8Array(w * h);
  const idx = (x, y) => y * w + x;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y);
      if (seen[i]) continue;
      if (grid[i] !== type) continue;
      // Max width along this row until not matching or seen
      let maxW = 0;
      while ((x + maxW) < w) {
        const j = idx(x + maxW, y);
        if (seen[j] || grid[j] !== type) break;
        maxW++;
      }
      // Max height while each subsequent row has the full width of matching tiles
      let maxH = 1;
      outer: for (let yy = y + 1; yy < h; yy++) {
        for (let xx = x; xx < x + maxW; xx++) {
          const j = idx(xx, yy);
          if (seen[j] || grid[j] !== type) { break outer; }
        }
        maxH++;
      }
      // Mark region as seen and record rectangle (tile units)
      for (let yy = y; yy < y + maxH; yy++) {
        for (let xx = x; xx < x + maxW; xx++) seen[idx(xx, yy)] = 1;
      }
      rects.push({ x, y, w: maxW, h: maxH });
    }
  }
  return rects;
}

// Returns Promise<HTMLCanvasElement|ImageBitmap> terrain
export async function applyPngMap(url, legend) {
  try {
    // Load the image
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.crossOrigin = 'anonymous';
      i.onload = () => resolve(i);
      i.onerror = (e) => reject(e);
      i.src = url;
    });
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!(width > 0 && height > 0)) throw new Error('Invalid PNG dimensions');
    // Resize world to match the map
    world.tileW = width;
    world.tileH = height;
    // Reset only obstacles/visual detritus; keep enemies/NPCs to preserve vanilla behavior/spawns
    obstacles.length = 0; corpses.length = 0; stains.length = 0; floaters.length = 0; sparkles.length = 0;
    // Read pixels
    const off = document.createElement('canvas');
    off.width = width; off.height = height;
    const g = off.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(img, 0, 0);
    const data = g.getImageData(0, 0, width, height).data;
    // Map pixels -> type grid (structural) and optionally collect enemy spawns from the map.
    const map = legend && legend.colors ? legend.colors : {};
    const grid = new Array(width * height);
    const enemySpawns = []; // { kind: 'mook'|'featured_ranged'|'guardian'|'boss', x, y }
    let playerSpawn = null; // { x, y }
    const npcSpawns = [];   // { who: 'canopy'|'yorna'|'hola', x, y }
    const chestSpawns = []; // { id, itemId, x, y }
    const breakables = [];  // { type: 'barrel', x, y }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx], gg = data[idx + 1], b = data[idx + 2];
        const hex = rgbToHex(r, gg, b);
        const def = map[hex] || null;
        const type = def ? def.type : null;
        // Populate obstacle grid for structural tiles only
        let tForGrid = null;
        switch (type) {
          case 'grass': tForGrid = null; break;
          case 'wood':  tForGrid = 'wood'; break; // passable floor, rendered as bridge planks
          case 'wall':
          case 'water':
          case 'rock':
          case 'tree':
          case 'gate':
            tForGrid = type; break;
          default:
            tForGrid = null; break;
        }
        grid[y*width + x] = tForGrid;
        // Optional spawn/prop markers defined in the map
        switch (type) {
          // Player/NPCs
          case 'player_spawn': playerSpawn = playerSpawn || { x, y }; break;
          case 'canopy_spawn': npcSpawns.push({ who: 'canopy', x, y }); break;
          case 'yorna_spawn':  npcSpawns.push({ who: 'yorna',  x, y }); break;
          case 'hola_spawn':   npcSpawns.push({ who: 'hola',   x, y }); break;
          // Props
          case 'chest_dagger': chestSpawns.push({ id: 'chest_l1_weapon', itemId: 'dagger',   x, y }); break;
          case 'chest_bow':    chestSpawns.push({ id: 'chest_l1_bow',    itemId: 'bow_wood', x, y }); break;
          case 'barrel':       breakables.push({ type: 'barrel', x, y }); break;
          // Enemies
          case 'spawn_mook': enemySpawns.push({ kind: 'mook', x, y }); break;
          case 'spawn_featured_ranged': enemySpawns.push({ kind: 'featured_ranged', x, y }); break;
          case 'spawn_guardian': enemySpawns.push({ kind: 'guardian', x, y }); break;
          case 'spawn_boss': enemySpawns.push({ kind: 'boss', x, y }); break;
        }
      }
    }
    // Build obstacles from the grid
    buildObstaclesFromGrid(grid, legend);

    // Player spawn override (tile origin)
    if (playerSpawn) {
      player.x = Math.floor(playerSpawn.x * TILE);
      player.y = Math.floor(playerSpawn.y * TILE);
      // Re-fan companions around player
      for (let i = 0; i < companions.length; i++) { const c = companions[i]; if (!c) continue; c.x = player.x + 12 * (i + 1); c.y = player.y + 8 * (i + 1); }
    }

    // Place chests and barrels (props)
    for (const c of chestSpawns) {
      obstacles.push({ x: c.x * TILE, y: c.y * TILE, w: 12, h: 10, type: 'chest', id: c.id, fixedItemId: c.itemId, opened: false, locked: false });
    }
    let brkIdx = 0;
    for (const b2 of breakables) {
      const id = `brk_l1_${brkIdx++}`;
      obstacles.push({ x: b2.x * TILE, y: b2.y * TILE, w: 12, h: 12, type: 'barrel', id, hp: 2 });
    }

    // If the map defines any enemy spawns, replace the current enemies with the map-defined set
    if (enemySpawns.length > 0) {
      enemies.length = 0;
      for (const s of enemySpawns) {
        const ex = s.x * TILE, ey = s.y * TILE;
        if (s.kind === 'mook') {
          spawnEnemy(ex, ey, 'mook', { name: 'Greenwood Bandit' });
        } else if (s.kind === 'featured_ranged') {
          spawnEnemy(ex, ey, 'featured', { name: 'Bandit Lieutenant', hp: 12, dmg: 6, ranged: true, shootRange: 160, shootCooldown: 1.0, projectileSpeed: 200, projectileDamage: 3, aimError: 0.03 });
        } else if (s.kind === 'guardian') {
          // Key guardian stats aligned with Level 1 (tough featured foe)
          spawnEnemy(ex, ey, 'featured', {
            name: 'Gorg', vnId: 'enemy:gorg', guaranteedDropId: 'key_bronze',
            hp: 40, dmg: 6, hitCooldown: 0.65, aggroRadius: 160,
            vnOnSight: { text: introTexts.gorg },
            portrait: 'assets/portraits/level01/Gorg/Gorg.mp4',
          });
        } else if (s.kind === 'boss') {
          // Boss Vast with full VN portrait set and intro, like Level 1
          spawnEnemy(ex, ey, 'boss', {
            name: 'Vast', vnId: 'enemy:vast',
            portrait: 'assets/portraits/level01/Vast/Vast video.mp4',
            portraitPowered: 'assets/portraits/level01/Vast/Vast powered.mp4',
            portraitDefeated: 'assets/portraits/level01/Vast/Vast defeated.mp4',
            onDefeatNextLevel: 2,
            vnOnSight: { text: introTexts.vast },
          });
        }
      }
    }

    // NPCs: if defined by map, replace existing Level 1 NPCs
    if (npcSpawns.length > 0) {
      npcs.length = 0;
      for (const s of npcSpawns) {
        const px = s.x * TILE, py = s.y * TILE;
        if (s.who === 'canopy') {
          const n = spawnNpc(px, py, 'right', { name: 'Canopy', portrait: 'assets/portraits/level01/Canopy/Canopy video.mp4', dialogId: 'canopy', sheet: sheetForName('Canopy') });
          try { setNpcDialog(n, canopyDialog); } catch {}
        } else if (s.who === 'yorna') {
          const n = spawnNpc(px, py, 'down', { name: 'Yorna', portrait: 'assets/portraits/level01/Yorna/Yorna video.mp4', dialogId: 'yorna', sheet: sheetForName('Yorna') });
          try { setNpcDialog(n, yornaDialog); } catch {}
        } else if (s.who === 'hola') {
          const n = spawnNpc(px, py, 'left', { name: 'Hola', portrait: 'assets/portraits/level01/Hola/Hola video.mp4', dialogId: 'hola', sheet: sheetForName('Hola') });
          try { setNpcDialog(n, holaDialog); } catch {}
        }
      }
    }

    // Rebuild spatial index after obstacles/props are finalized
    try { rebuildObstacleIndex(64); } catch {}
    // Build a terrain bitmap using existing generator (default theme)
    const terrain = buildTerrainBitmap(world, legend?.theme || 'default');
    return terrain;
  } catch (e) {
    try { console.warn('applyPngMap failed', e); } catch {}
    return null;
  }
}
