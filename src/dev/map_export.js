// Export the current level as a 1px-per-tile PNG based on the active world state.
// Usage in console: exportCurrentMapPNG() or exportCurrentMapPNG('level_02_base.png')
import { world, obstacles, enemies, npcs, player, runtime } from '../engine/state.js';
import { TILE } from '../engine/constants.js';
import { buildTerrainBitmap, drawObstacles } from '../engine/terrain.js';

function hexToRgb(hex) {
  const h = String(hex).replace(/^#/,'');
  const r = parseInt(h.slice(0,2), 16);
  const g = parseInt(h.slice(2,4), 16);
  const b = parseInt(h.slice(4,6), 16);
  return { r, g, b };
}

// Color legend aligned with docs/TERRAIN_MAP_01.md
const COLORS = {
  grass: '49aa10',
  wood: '8a8a00',
  wall: '797979',
  rock: 'a2a2a2',
  tree: '386d00',
  water: '4161fb',
  gate: '794100',
  torch_node: 'a2ffcb',
  // Props
  barrel: 'ffbaeb',
  crate: 'ffbaeb', // share with barrel for now
  chest: '71f341', // L1 dagger chest color by default
  // Spawns
  player_spawn: 'ebebeb',
  boss: 'b21030',
  guardian: 'db4161',
  featured_ranged: 'ff61b2',
  mook: '9a2079',
  leashed_mook: 'db41c3',
  leashed_featured: 'f361ff',
  leashed_featured_ranged: 'e3b2ff',
  // NPCs (L1 legend)
  canopy_spawn: '61d3e3',
  yorna_spawn: 'a271ff',
  hola_spawn: 'c3b2ff',
  // Fallback for unknowns
  unknown: 'ff00ff',
};

function setPx(img, w, x, y, hex) {
  if (x < 0 || y < 0 || x >= w) return;
  const { r, g, b } = hexToRgb(hex);
  const i = (y * w + x) * 4;
  img.data[i] = r; img.data[i+1] = g; img.data[i+2] = b; img.data[i+3] = 255;
}

function fill(img, hex) {
  const { r, g, b } = hexToRgb(hex);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = r; img.data[i+1] = g; img.data[i+2] = b; img.data[i+3] = 255;
  }
}

function typeToColorHex(type) {
  const t = String(type || '').toLowerCase();
  if (COLORS[t]) return COLORS[t];
  // Map obstacle types to known colors
  switch (t) {
    case 'mud':
    case 'fire':
    case 'lava':
    case 'marble':
    case 'ruin':
    case 'column':
    case 'sun':
      return COLORS.unknown;
    default:
      return COLORS.unknown;
  }
}

function nameToNpcColorHex(name) {
  const nm = String(name || '').toLowerCase();
  if (nm.includes('canopy')) return COLORS.canopy_spawn;
  if (nm.includes('yorna')) return COLORS.yorna_spawn;
  if (nm.includes('hola')) return COLORS.hola_spawn;
  return null;
}

export function exportCurrentMapPNG(filename) {
  try {
    const tw = world.tileW|0, th = world.tileH|0;
    if (!(tw > 0 && th > 0)) { console.warn('[MapExport] Invalid world size'); return null; }
    // Build offscreen canvas per-tile
    const can = document.createElement('canvas');
    can.width = tw; can.height = th;
    const g = can.getContext('2d');
    const img = g.createImageData(tw, th);
    // Background: default to grass
    fill(img, COLORS.grass);

    // Mark obstacles by type
    for (const o of obstacles) {
      if (!o) continue;
      const type = String(o.type || '').toLowerCase();
      let hex = null;
      if (COLORS[type]) hex = COLORS[type];
      else if (type === 'gate') hex = COLORS.gate;
      else if (type === 'wood') hex = COLORS.wood;
      else if (type === 'water') hex = COLORS.water;
      else if (type === 'wall') hex = COLORS.wall;
      else if (type === 'tree') hex = COLORS.tree;
      else if (type === 'rock') hex = COLORS.rock;
      else if (type === 'torch_node') hex = COLORS.torch_node;
      else if (type === 'barrel') hex = COLORS.barrel;
      else if (type === 'crate') hex = COLORS.crate;
      else if (type === 'chest') hex = COLORS.chest;
      else hex = typeToColorHex(type);
      const tx0 = Math.max(0, Math.floor(o.x / TILE));
      const ty0 = Math.max(0, Math.floor(o.y / TILE));
      const tx1 = Math.min(tw - 1, Math.floor((o.x + o.w - 1) / TILE));
      const ty1 = Math.min(th - 1, Math.floor((o.y + o.h - 1) / TILE));
      for (let ty = ty0; ty <= ty1; ty++) {
        for (let tx = tx0; tx <= tx1; tx++) setPx(img, tw, tx, ty, hex);
      }
    }

    // Mark spawns by actor positions (overlay last so they are visible)
    // Player current tile
    try { setPx(img, tw, Math.floor(player.x / TILE), Math.floor(player.y / TILE), COLORS.player_spawn); } catch {}
    // NPC spawn hints
    for (const n of npcs) {
      if (!n) continue; const hex = nameToNpcColorHex(n.name); if (!hex) continue;
      setPx(img, tw, Math.floor(n.x / TILE), Math.floor(n.y / TILE), hex);
    }
    // Enemies by kind/flags
    for (const e of enemies) {
      if (!e || e.hp <= 0) continue;
      const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE);
      const kind = String(e.kind || 'mook').toLowerCase();
      let hex = null;
      if (kind === 'boss') hex = COLORS.boss;
      else if (e.guardian) hex = COLORS.guardian;
      else if (e.leashed && kind === 'mook') hex = COLORS.leashed_mook;
      else if (e.leashed && kind === 'featured' && e.ranged) hex = COLORS.leashed_featured_ranged;
      else if (e.leashed && kind === 'featured') hex = COLORS.leashed_featured;
      else if (kind === 'featured' && e.ranged) hex = COLORS.featured_ranged;
      else if (kind === 'mook') hex = COLORS.mook;
      // Optional: generic featured = unknown/fallback (skip if you prefer to infer later)
      if (!hex) continue;
      setPx(img, tw, tx, ty, hex);
    }

    // Commit pixels and export
    g.putImageData(img, 0, 0);
    const name = filename || `level_${runtime.currentLevel || 1}_export.png`;
    can.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    }, 'image/png');
    return true;
  } catch (e) {
    console.error('[MapExport] Failed', e);
    return false;
  }
}

try { window.exportCurrentMapPNG = exportCurrentMapPNG; } catch {}

// Export the full-resolution view (1px-per-pixel) of the current level.
// Usage in console: exportCurrentFullViewPNG() or exportCurrentFullViewPNG('level_02_full.png')
export function exportCurrentFullViewPNG(filename) {
  try {
    const W = world.w|0, H = world.h|0;
    if (!(W > 0 && H > 0)) { console.warn('[MapExport] Invalid world size'); return null; }
    const can = document.createElement('canvas');
    can.width = W; can.height = H;
    const g = can.getContext('2d');
    g.imageSmoothingEnabled = false;
    // Pick terrain theme based on current level
    const lvl = (runtime?.currentLevel || 1) | 0;
    const themeByLevel = { 1: 'default', 2: 'desert', 3: 'marsh', 4: 'city', 5: 'city', 6: 'city' };
    const theme = themeByLevel[lvl] || 'default';
    // Draw terrain bitmap for the whole world
    const terrain = buildTerrainBitmap(world, theme);
    try { g.drawImage(terrain, 0, 0); } catch {}
    // Draw all obstacles on top using a full-world camera
    const fullCam = { x: 0, y: 0, w: W, h: H };
    try { drawObstacles(g, obstacles, fullCam); } catch {}
    // Export to PNG
    const name = filename || `level_${lvl}_full.png`;
    can.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    }, 'image/png');
    return true;
  } catch (e) {
    console.error('[MapExport] Full-view export failed', e);
    return false;
  }
}

try { window.exportCurrentFullViewPNG = exportCurrentFullViewPNG; } catch {}

// --- Unique obstacle tiles (transparent) atlas export ---
// Build a transparent atlas of one representative sprite per unique obstacle type in the current level.
// - Draws only obstacle shapes (no terrain background)
// - Packs tiles into a simple grid with labels
// Usage: exportUniqueObstacleTilesPNG() or showUniqueObstacleTilesPage()

function specsForType(type) {
  const t = String(type || '').toLowerCase();
  const S = {
    tree:        { w: 12, h: 12, pad: 4, extraTop: 6 },
    rock:        { w: 10, h:  8, pad: 4 },
    wall:        { w: 16, h: 16, pad: 3 },
    gate:        { w: 24, h:  8, pad: 3 },
    chest:       { w: 12, h: 10, pad: 3 },
    barrel:      { w: 12, h: 12, pad: 3 },
    crate:       { w: 12, h: 12, pad: 3 },
    cactus:      { w: 12, h: 12, pad: 3 },
    ruin:        { w: 10, h:  8, pad: 3 },
    reed:        { w: 12, h: 12, pad: 3 },
    log:         { w: 20, h: 10, pad: 3 },
    water:       { w: 16, h: 16, pad: 3 },
    mud:         { w: 16, h: 16, pad: 3 },
    fire:        { w: 16, h: 16, pad: 3 },
    lava:        { w: 16, h: 16, pad: 3 },
    marble:      { w: 16, h: 16, pad: 3 },
    gold_wall:   { w: 16, h: 16, pad: 3 },
    wood_wall:   { w: 16, h: 16, pad: 3 },
    column:      { w: 12, h: 12, pad: 3 },
    sun:         { w: 16, h: 12, pad: 3 },
    torch_node:  { w: 10, h: 12, pad: 3 },
    wood:        { w: 24, h:  8, pad: 3 },
    // Pseudo-entries: split tree into trunk/canopy for tileset authoring
    tree_trunk:  { w: 12, h: 12, pad: 4 },
    tree_canopy: { w: 16, h: 10, pad: 4 },
  };
  return S[t] || { w: 16, h: 16, pad: 3 };
}

function drawSingleObstacleTile(type) {
  const key = String(type || '').toLowerCase();
  const spec = specsForType(key);
  const pad = Math.max(0, spec.pad || 0);
  const extraTop = Math.max(0, spec.extraTop || 0);
  // Tile size accounts for padding and any canopy overdraw
  const tileW = spec.w + pad * 2;
  const tileH = spec.h + pad * 2 + extraTop;
  const can = document.createElement('canvas');
  can.width = tileW; can.height = tileH;
  const g = can.getContext('2d');
  g.imageSmoothingEnabled = false;
  const cam = { x: 0, y: 0, w: tileW, h: tileH };
  if (key === 'tree_trunk') {
    // Render just the trunk with same style as drawObstacles()
    // Trunk centered in the bottom portion of the nominal tree size
    const sx = pad; const sy = pad; const w = spec.w; const h = spec.h;
    g.fillStyle = '#6e4b2a';
    g.fillRect(sx + ((w/2 - 2)|0), sy + 6, 4, h - 6);
    return { canvas: can, w: tileW, h: tileH };
  }
  if (key === 'tree_canopy') {
    // Two canopy layers only
    const sx = pad; const sy = pad + extraTop - 6; const w = Math.max(spec.w, 12);
    g.fillStyle = '#245f33'; g.fillRect(sx - 1, sy, w + 2, 8);
    g.fillStyle = '#2f7a42'; g.fillRect(sx, sy + 4, w, 6);
    return { canvas: can, w: tileW, h: tileH };
  }
  // Draw using drawObstacles() with a single obstacle instance
  const ox = pad;
  const oy = pad + (key === 'tree' ? extraTop : 0);
  const obstacle = { x: ox, y: oy, w: spec.w, h: spec.h, type: key, locked: true };
  try { drawObstacles(g, [obstacle], cam); } catch {}
  return { canvas: can, w: tileW, h: tileH };
}

export function exportUniqueObstacleTilesPNG(filename, opts = {}) {
  try {
    // Determine unique obstacle types in current level
    const used = new Set();
    for (const o of obstacles) { if (!o || !o.type) continue; used.add(String(o.type).toLowerCase()); }
    // If trees are present, also include trunk/canopy pseudo-tiles for convenience
    if (used.has('tree')) { used.add('tree_trunk'); used.add('tree_canopy'); }
    const types = Array.from(used).sort();
    if (!types.length) { console.warn('[TilesAtlas] No obstacle types in this level'); return false; }
    // Pre-render each tile
    const tiles = types.map(t => ({ type: t, ...drawSingleObstacleTile(t) }));
    const includeLabels = opts.includeLabels !== false;
    const labelH = includeLabels ? 12 : 0;
    // Grid layout
    const cols = Math.max(1, Math.min(8, Number(opts.columns || 7)));
    const gap = 8;
    const maxW = Math.max(...tiles.map(t => t.w));
    const maxH = Math.max(...tiles.map(t => t.h));
    const cellW = maxW + gap;
    const cellH = maxH + labelH + gap;
    const rows = Math.ceil(tiles.length / cols);
    const atlasW = cols * cellW + gap;
    const atlasH = rows * cellH + gap;
    const atlas = document.createElement('canvas');
    atlas.width = atlasW; atlas.height = atlasH;
    const g = atlas.getContext('2d'); g.imageSmoothingEnabled = false;
    // Transparent background; draw tiles centered in their cells, with labels
    g.clearRect(0, 0, atlasW, atlasH);
    g.fillStyle = '#ddd'; g.font = '10px monospace'; g.textAlign = 'center'; g.textBaseline = 'top';
    tiles.forEach((t, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const cx = gap + c * cellW;
      const cy = gap + r * cellH;
      const dx = cx + Math.floor((cellW - t.w) / 2);
      const dy = cy + Math.floor((cellH - labelH - t.h) / 2);
      try { g.drawImage(t.canvas, dx, dy); } catch {}
      if (includeLabels) {
        const lx = cx + Math.floor(cellW / 2);
        const ly = cy + cellH - labelH + 2;
        // Text with subtle shadow for readability on transparency
        g.fillStyle = 'rgba(0,0,0,0.65)'; g.fillText(t.type, lx + 1, ly + 1);
        g.fillStyle = '#eaeaea'; g.fillText(t.type, lx, ly);
      }
    });
    const lvl = (runtime?.currentLevel || 1) | 0;
    const name = filename || `level_${lvl}_tiles.png`;
    atlas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    }, 'image/png');
    return true;
  } catch (e) {
    console.error('[TilesAtlas] Export failed', e);
    return false;
  }
}

export function showUniqueObstacleTilesPage(opts = {}) {
  try {
    const used = new Set();
    for (const o of obstacles) { if (!o || !o.type) continue; used.add(String(o.type).toLowerCase()); }
    if (used.has('tree')) { used.add('tree_trunk'); used.add('tree_canopy'); }
    const types = Array.from(used).sort();
    if (!types.length) { alert('No obstacle types in this level'); return false; }
    const win = window.open('', '_blank');
    if (!win) { console.warn('Popup blocked'); return false; }
    const doc = win.document;
    doc.title = 'Unique Obstacle Tiles';
    const style = doc.createElement('style');
    style.textContent = `body{background:#111;color:#ddd;font:12px system-ui;padding:16px} .tile{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;margin:8px;padding:8px;background:#1a1a1a;border:1px solid #333;border-radius:8px} canvas{image-rendering:pixelated}`;
    doc.head.appendChild(style);
    const container = doc.createElement('div');
    doc.body.appendChild(container);
    for (const t of types) {
      const card = doc.createElement('div'); card.className = 'tile';
      const { canvas } = drawSingleObstacleTile(t);
      const label = doc.createElement('div'); label.textContent = t; label.style.marginTop = '6px'; label.style.opacity = '0.9';
      card.appendChild(canvas); card.appendChild(label);
      container.appendChild(card);
    }
    return true;
  } catch (e) {
    console.error('[TilesAtlas] Page build failed', e);
    return false;
  }
}

try { window.exportUniqueObstacleTilesPNG = exportUniqueObstacleTilesPNG; } catch {}
try { window.showUniqueObstacleTilesPage = showUniqueObstacleTilesPage; } catch {}

// --- Strict 16x16 tiles atlas (no padding/labels) ---
// Builds a compact atlas where each tile is exactly 16x16 and tiles are packed edge-to-edge.
// This is intended for tileset creation workflows.

function drawObstacleTile16(type) {
  const TILE_SZ = 16;
  const key = String(type || '').toLowerCase();
  const can = document.createElement('canvas');
  can.width = TILE_SZ; can.height = TILE_SZ;
  const g = can.getContext('2d'); g.imageSmoothingEnabled = false;
  const cam = { x: 0, y: 0, w: TILE_SZ, h: TILE_SZ };
  const o = { x: 0, y: 0, w: TILE_SZ, h: TILE_SZ, type: key, locked: true };
  // Special-cases where drawObstacles would skip or overdraw
  if (key === 'tree_trunk') {
    g.clearRect(0, 0, TILE_SZ, TILE_SZ);
    g.fillStyle = '#6e4b2a';
    g.fillRect((TILE_SZ/2 - 2)|0, 6, 4, TILE_SZ - 6);
    return can;
  }
  if (key === 'tree_canopy') {
    g.clearRect(0, 0, TILE_SZ, TILE_SZ);
    // Canopy shaped to extend toward the bottom of the tile so it visually overlaps a trunk placed in the tile below (when layered above)
    g.fillStyle = '#245f33'; g.fillRect(1, 2, TILE_SZ - 2, 12); // broader base
    g.fillStyle = '#2f7a42'; g.fillRect(2, 6, TILE_SZ - 4, 8);  // highlight/lower fringe
    return can;
  }
  if (key === 'rock') {
    g.clearRect(0, 0, TILE_SZ, TILE_SZ);
    // Simple rock blob approximation with outline
    g.fillStyle = '#6f6f6f';
    g.fillRect(3, 5, 10, 8);
    g.strokeStyle = '#2a2a2e'; g.lineWidth = 1; g.strokeRect(3.5, 5.5, 9, 7);
    return can;
  }
  // Freeze animated patterns for deterministic tiles
  const oldT = runtime && runtime._timeSec;
  try { if (runtime) runtime._timeSec = 0; } catch {}
  try { drawObstacles(g, [o], cam); } catch {}
  try { if (runtime) runtime._timeSec = oldT; } catch {}
  return can;
}

export function exportObstacleTiles16PNG(filename, opts = {}) {
  try {
    const TILE_SZ = 16;
    const used = new Set();
    for (const o of obstacles) { if (!o || !o.type) continue; used.add(String(o.type).toLowerCase()); }
    // Include split tree variants for tiling if any trees exist
    if (used.has('tree')) { used.add('tree_trunk'); used.add('tree_canopy'); used.delete('tree'); }
    const types = Array.from(used).sort();
    if (!types.length) { console.warn('[Tiles16] No obstacle types found'); return false; }
    // Pre-render tiles
    const tiles = types.map(t => ({ type: t, canvas: drawObstacleTile16(t) }));
    // Layout: compact grid with no padding; columns configurable (default: near-square)
    const cols = Math.max(1, Number.isFinite(opts.columns) ? Math.floor(opts.columns) : Math.ceil(Math.sqrt(tiles.length)));
    const rows = Math.ceil(tiles.length / cols);
    const atlas = document.createElement('canvas');
    atlas.width = cols * TILE_SZ; atlas.height = rows * TILE_SZ;
    const g = atlas.getContext('2d'); g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, atlas.width, atlas.height);
    tiles.forEach((t, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const dx = c * TILE_SZ;
      const dy = r * TILE_SZ;
      try { g.drawImage(t.canvas, dx, dy); } catch {}
    });
    const lvl = (runtime?.currentLevel || 1) | 0;
    const name = filename || `level_${lvl}_tiles16.png`;
    atlas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    }, 'image/png');
    return true;
  } catch (e) {
    console.error('[Tiles16] Export failed', e);
    return false;
  }
}

try { window.exportObstacleTiles16PNG = exportObstacleTiles16PNG; } catch {}
