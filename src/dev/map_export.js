// Export the current level as a 1px-per-tile PNG based on the active world state.
// Usage in console: exportCurrentMapPNG() or exportCurrentMapPNG('level_02_base.png')
import { world, obstacles, enemies, npcs, player, runtime } from '../engine/state.js';
import { TILE } from '../engine/constants.js';

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

