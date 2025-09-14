import { TILE } from './constants.js';
import { world, player, enemies, npcs, companions, obstacles, corpses, stains, floaters, sparkles, spawners, runtime } from './state.js';
import { buildTerrainBitmap } from './terrain.js';

function rgbToHex(r, g, b) {
  const h = (n) => n.toString(16).padStart(2, '0');
  return `${h(r)}${h(g)}${h(b)}`.toLowerCase();
}

// Merge horizontal runs of the same type into single obstacle rows
function addMergedRowObstacles(y, typesRow, mergeableTypes, addRect) {
  const w = world.tileW;
  let x = 0;
  while (x < w) {
    const t = typesRow[x];
    if (!t || !mergeableTypes.has(t)) { x++; continue; }
    let x2 = x + 1;
    while (x2 < w && typesRow[x2] === t) x2++;
    // Create a rectangle spanning [x, x2)
    addRect(t, x, y, x2 - x, 1);
    x = x2;
  }
}

// Build obstacles from a color-indexed 2D grid
function buildObstaclesFromGrid(grid, legend) {
  obstacles.length = 0;
  const h = world.tileH, w = world.tileW;
  // Fast pass: merge water and wall horizontally by rows
  const mergeable = new Set(['wall', 'water']);
  for (let y = 0; y < h; y++) {
    const row = new Array(w);
    for (let x = 0; x < w; x++) row[x] = grid[y*w + x];
    addMergedRowObstacles(y, row, mergeable, (type, x, y, dx, dy) => {
      // Translate to pixels
      obstacles.push({ x: x * TILE, y: y * TILE, w: dx * TILE, h: dy * TILE, type, blocksAttacks: (type === 'wall') });
    });
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
    // Reset dynamic arrays
    enemies.length = 0; npcs.length = 0; obstacles.length = 0; corpses.length = 0; stains.length = 0; floaters.length = 0; sparkles.length = 0; spawners.length = 0;
    // Place player near center
    player.x = Math.floor(world.w / 2);
    player.y = Math.floor(world.h / 2);
    for (let i = 0; i < companions.length; i++) { const c = companions[i]; if (!c) continue; c.x = player.x + 12 * (i + 1); c.y = player.y + 8 * (i + 1); }
    // Read pixels
    const off = document.createElement('canvas');
    off.width = width; off.height = height;
    const g = off.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(img, 0, 0);
    const data = g.getImageData(0, 0, width, height).data;
    // Map pixels -> type grid
    const map = legend && legend.colors ? legend.colors : {};
    const grid = new Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx], gg = data[idx + 1], b = data[idx + 2];
        const hex = rgbToHex(r, gg, b);
        const def = map[hex] || null;
        const type = def ? def.type : null;
        grid[y*width + x] = type || null; // 'grass' omitted
      }
    }
    // Build obstacles from the grid
    buildObstaclesFromGrid(grid, legend);
    // Build a terrain bitmap using existing generator (default theme)
    const terrain = buildTerrainBitmap(world, legend?.theme || 'default');
    return terrain;
  } catch (e) {
    try { console.warn('applyPngMap failed', e); } catch {}
    return null;
  }
}

