import { TILE } from './constants.js';
import { world, player, enemies, npcs, companions, obstacles, corpses, stains, floaters, sparkles, spawners, runtime, spawnEnemy, spawnNpc } from './state.js';
import { buildTerrainBitmap } from './terrain.js';
import { sheetForName } from './sprites.js';
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
  // Fast pass: gather horizontal runs for mergeable types, then merge vertically
  const mergeable = new Set(['wall', 'water', 'gate', 'wood']);
  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = new Array(w);
    for (let x = 0; x < w; x++) row[x] = grid[y*w + x];
    addMergedRowRuns(y, row, mergeable, rows);
  }
  const rects = mergeVerticalRuns(rows, mergeable);
  // Draw order: water first, then wood (bridge), then walls/gates
  const pri = (t) => (t === 'water') ? 0 : (t === 'wood') ? 1 : (t === 'wall') ? 2 : (t === 'gate') ? 3 : 9;
  rects.sort((a, b) => pri(a.type) - pri(b.type));
  for (const r of rects) {
    const type = r.type;
    const o = { x: r.x * TILE, y: r.y * TILE, w: r.w * TILE, h: r.h * TILE, type, blocksAttacks: (type === 'wall' || (type === 'gate')) };
    if (type === 'gate') { o.locked = true; o.id = o.id || 'castle_gate'; o.keyId = o.keyId || 'castle_gate'; }
    obstacles.push(o);
  }
  // Second pass: trees and rocks as 1x1 tiles
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = grid[y*w + x];
      if (t === 'tree' || t === 'rock') {
        const px = x * TILE, py = y * TILE;
        const size = TILE; // full-tile footprint
        obstacles.push({ x: px, y: py, w: size, h: size, type: t });
      }
    }
  }
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
          case 'wood':  tForGrid = null; break; // passable floor, not an obstacle
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
        // Optional enemy spawn markers defined in the map
        switch (type) {
          case 'spawn_mook': enemySpawns.push({ kind: 'mook', x, y }); break;
          case 'spawn_featured_ranged': enemySpawns.push({ kind: 'featured_ranged', x, y }); break;
          case 'spawn_guardian': enemySpawns.push({ kind: 'guardian', x, y }); break;
          case 'spawn_boss': enemySpawns.push({ kind: 'boss', x, y }); break;
        }
      }
    }
    // Build obstacles from the grid
    buildObstaclesFromGrid(grid, legend);

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

    // Build a terrain bitmap using existing generator (default theme)
    const terrain = buildTerrainBitmap(world, legend?.theme || 'default');
    return terrain;
  } catch (e) {
    try { console.warn('applyPngMap failed', e); } catch {}
    return null;
  }
}
