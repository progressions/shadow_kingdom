import { TILE } from './constants.js';
import { world, player, enemies, npcs, companions, obstacles, corpses, stains, floaters, sparkles, spawners, runtime, spawnEnemy, spawnNpc, addSpawner } from './state.js';
import { addLightNode, clearLightNodes, MAX_LIGHT_LEVEL } from './lighting.js';
import { buildTerrainBitmap } from './terrain.js';
import { sheetForName } from './sprites.js';
import { rebuildObstacleIndex } from './spatial_index.js';
import { setNpcDialog } from './dialog.js';
import { introTexts } from '../data/intro_texts.js';
// NPC dialogs will be attached via dynamic import to avoid large static imports here

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
  const mergeable = new Set(packWater ? ['wall', 'gate', 'wood', 'rock', 'marble', 'gold_wall', 'wood_wall'] : ['wall', 'water', 'gate', 'wood', 'rock', 'marble', 'gold_wall', 'wood_wall']);
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
  const pri = (t) => (t === 'water') ? 0 : (t === 'wood') ? 1 : (t === 'wall' || t === 'wood_wall' || t === 'marble' || t === 'gold_wall') ? 2 : (t === 'gate') ? 3 : (t === 'rock') ? 4 : 9;
  rects.sort((a, b) => pri(a.type) - pri(b.type));
  for (const r of rects) {
    const type = r.type;
    const o = { x: r.x * TILE, y: r.y * TILE, w: r.w * TILE, h: r.h * TILE, type, blocksAttacks: (type === 'wall' || type === 'marble' || type === 'gold_wall' || type === 'wood_wall' || (type === 'gate')) };
    if (type === 'gate') { o.locked = true; o.id = o.id || 'castle_gate'; o.keyId = o.keyId || 'castle_gate'; }
    obstacles.push(o);
  }
  // Second pass: trees/cacti/reeds as 1x1 tiles (rocks are merged above)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = grid[y*w + x];
      if (t === 'tree' || t === 'cactus' || t === 'reed') {
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
    const enemySpawns = []; // { kind: 'mook'|'featured_ranged'|'guardian'|'boss'|'leashed_mook'|'leashed_featured'|'leashed_featured_ranged', x, y }
    const spawnerMooks = [];     // { x, y }
    const spawnerFeatureds = []; // { x, y }
    let playerSpawn = null; // { x, y }
    const npcSpawns = [];   // { who: 'canopy'|'yorna'|'hola'|'oyin'|'twil'|'urn'|'varabella', x, y }
    const chestSpawns = []; // { id?, itemId?, lootTier?, x, y }
    const breakables = [];  // { type: 'barrel', x, y }
    const torchNodes = [];  // { x, y }
    const hazards = [];     // { type: 'lava'|'fire'|'mud', x, y }
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
          case 'cactus':
          case 'gate':
          case 'reed':
          case 'marble':
          case 'gold_wall':
          case 'wood_wall':
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
          case 'oyin_spawn':   npcSpawns.push({ who: 'oyin',       x, y }); break;
          case 'twil_spawn':   npcSpawns.push({ who: 'twil',       x, y }); break;
          case 'urn_spawn':    npcSpawns.push({ who: 'urn',        x, y }); break;
          case 'varabella_spawn': npcSpawns.push({ who: 'varabella', x, y }); break;
          // Props
          case 'chest_dagger': chestSpawns.push({ id: 'chest_l1_weapon', itemId: 'dagger',   x, y }); break;
          case 'chest_bow':    chestSpawns.push({ id: 'chest_l1_bow',    itemId: 'bow_wood', x, y }); break;
          case 'chest':        chestSpawns.push({ lootTier: 'common', x, y }); break;
          case 'barrel':       breakables.push({ type: 'barrel', x, y }); break;
          case 'torch_node':   torchNodes.push({ x, y }); break;
          case 'lava':         hazards.push({ type: 'lava', x, y }); break;
          // Enemies
          case 'spawn_mook': enemySpawns.push({ kind: 'mook', x, y }); break;
          case 'spawn_featured_ranged': enemySpawns.push({ kind: 'featured_ranged', x, y }); break;
          case 'spawn_featured': enemySpawns.push({ kind: 'featured', x, y }); break;
          case 'spawn_guardian': enemySpawns.push({ kind: 'guardian', x, y }); break;
          case 'spawn_boss': enemySpawns.push({ kind: 'boss', x, y }); break;
          case 'spawn_leashed_mook': enemySpawns.push({ kind: 'leashed_mook', x, y }); break;
          case 'spawn_leashed_featured': enemySpawns.push({ kind: 'leashed_featured', x, y }); break;
          case 'spawn_leashed_featured_ranged': enemySpawns.push({ kind: 'leashed_featured_ranged', x, y }); break;
          // Spawners (map-authored)
          case 'spawner_mook':      spawnerMooks.push({ x, y }); break;
          case 'spawner_featured':  spawnerFeatureds.push({ x, y }); break;
          case 'tin_spawn':    npcSpawns.push({ who: 'tin', x, y }); break;
          case 'nellis_spawn': npcSpawns.push({ who: 'nellis', x, y }); break;
          case 'ell_spawn':    npcSpawns.push({ who: 'ell', x, y }); break;
          case 'cowsill_spawn': npcSpawns.push({ who: 'cowsill', x, y }); break;
        }
      }
    }
    // Build obstacles from the grid
    buildObstaclesFromGrid(grid, legend);
    // If legend provides gate settings, apply to all gates
    try {
      if (legend && legend.gate && typeof legend.gate === 'object') {
        for (const o of obstacles) {
          if (!o || o.type !== 'gate') continue;
          if (legend.gate.id) o.id = legend.gate.id;
          if (legend.gate.keyId) o.keyId = legend.gate.keyId;
        }
      }
    } catch {}

    // Clear any previous authored light nodes to avoid duplication when applying maps repeatedly
    try { clearLightNodes(); } catch {}

    // Player spawn override (tile origin)
    if (playerSpawn) {
      player.x = Math.floor(playerSpawn.x * TILE);
      player.y = Math.floor(playerSpawn.y * TILE);
      // Re-fan companions around player
      for (let i = 0; i < companions.length; i++) { const c = companions[i]; if (!c) continue; c.x = player.x + 12 * (i + 1); c.y = player.y + 8 * (i + 1); }
    }

    // Add invisible proximity spawners defined in the map
    try {
      const lvl = runtime.currentLevel || 1;
      const mkEnemy = (kind) => {
        if (lvl === 1) {
          return (kind === 'mook')
            ? { kind: 'mook', name: 'Greenwood Bandit' }
            : { kind: 'featured', name: 'Woodland Brute', hp: 8, dmg: 4 };
        } else if (lvl === 2) {
          return (kind === 'mook')
            ? { kind: 'mook', name: 'Urathar Scout', hp: 5, dmg: 4 }
            : { kind: 'featured', name: 'Desert Marauder', hp: 12, dmg: 6 };
        } else if (lvl === 3) {
          return (kind === 'mook')
            ? { kind: 'mook', name: 'Marsh Whisperer', hp: 7, dmg: 5 }
            : { kind: 'featured', name: 'Marsh Stalker', hp: 14, dmg: 6 };
        } else if (lvl === 4) {
          return (kind === 'mook')
            ? { kind: 'mook', name: 'Urathar Soldier', hp: 9, dmg: 6 }
            : { kind: 'featured', name: 'City Brute', hp: 18, dmg: 7 };
        } else if (lvl === 5) {
          return (kind === 'mook')
            ? { kind: 'mook', name: 'Temple Guard', hp: 12, dmg: 7 }
            : { kind: 'featured', name: 'Temple Sentinel', hp: 22, dmg: 9 };
        }
        return (kind === 'mook') ? { kind: 'mook', name: 'Bandit' } : { kind: 'featured', name: 'Featured Foe' };
      };
      const addMapSpawner = (idBase, tx, ty, kind) => {
        const base = {
          id: `${idBase}_${tx}_${ty}`,
          x: tx * TILE,
          y: ty * TILE,
          w: TILE,
          h: TILE,
          visible: false,
          enemy: mkEnemy(kind),
          batchSize: 1,
          proximityMode: 'near',
          radiusPx: 200,
        };
        // Level 5 featured spawners: 1 at a time, 10s cooldown, max 6 total
        if (lvl === 5 && kind === 'featured') {
          base.intervalSec = 10;
          base.concurrentCap = 1;
          base.totalToSpawn = 6;
        } else {
          base.concurrentCap = 2;
        }
        addSpawner(base);
      };
      for (const p of spawnerMooks) addMapSpawner(`sp_map_mook_l${lvl}`, p.x, p.y, 'mook');
      for (const p of spawnerFeatureds) addMapSpawner(`sp_map_feat_l${lvl}`, p.x, p.y, 'featured');
    } catch {}

    // Place chests and barrels (props)
    for (const c of chestSpawns) {
      const id = c.id || `ch_png_${c.x}_${c.y}`;
      const base = { x: c.x * TILE, y: c.y * TILE, w: 12, h: 10, type: 'chest', id, opened: false, locked: false };
      if (c.itemId) obstacles.push({ ...base, fixedItemId: c.itemId });
      else obstacles.push({ ...base, lootTier: c.lootTier || 'common' });
    }
    let brkIdx = 0;
    for (const b2 of breakables) {
      const id = `brk_l1_${brkIdx++}`;
      obstacles.push({ x: b2.x * TILE, y: b2.y * TILE, w: 12, h: 12, type: 'barrel', id, hp: 2 });
    }

    // Place torch nodes (blocking props) and add static light sources
    for (const t of torchNodes) {
      const px = t.x * TILE, py = t.y * TILE;
      // Torch nodes should not block projectiles/LoS
      obstacles.push({ x: px, y: py, w: 10, h: 10, type: 'torch_node', blocksAttacks: false });
      try { addLightNode({ x: px + 5, y: py + 5, level: MAX_LIGHT_LEVEL, radius: 6, enabled: true }); } catch {}
    }
    // Hazards (lava/fire/mud) single-tile areas
    for (const h2 of hazards) {
      const px = h2.x * TILE, py = h2.y * TILE;
      obstacles.push({ x: px, y: py, w: TILE, h: TILE, type: h2.type, blocksAttacks: false });
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
        } else if (s.kind === 'featured') {
          spawnEnemy(ex, ey, 'featured', { name: 'Desert Marauder', hp: 12, dmg: 6 });
        } else if (s.kind === 'guardian') {
          // Guardian spawn template: prefer legend.actors.guardian, else branch by level
          const lvl = runtime.currentLevel || 1;
          const tpl = legend?.actors?.guardian || null;
          if (tpl) {
            spawnEnemy(ex, ey, tpl.kind || 'featured', { ...tpl.opts, guardian: true });
          } else if (lvl === 2) {
            spawnEnemy(ex, ey, 'featured', {
              name: 'Aarg', vnId: 'enemy:aarg', guaranteedDropId: 'key_nethra', guardian: true,
              hp: 52, dmg: 7, hitCooldown: 0.6, aggroRadius: 180,
              vnOnSight: { text: introTexts.aarg },
              portrait: 'assets/portraits/level02/Aarg/Aarg.mp4',
            });
          } else {
            // Level 1 default: Gorg
            spawnEnemy(ex, ey, 'featured', {
              name: 'Gorg', vnId: 'enemy:gorg', guaranteedDropId: 'key_bronze', guardian: true,
              hp: 40, dmg: 6, hitCooldown: 0.65, aggroRadius: 160,
              vnOnSight: { text: introTexts.gorg },
              portrait: 'assets/portraits/level01/Gorg/Gorg.mp4',
            });
          }
        } else if (s.kind === 'boss') {
          // Boss spawn template: prefer legend.actors.boss, else branch by level
          const lvl = runtime.currentLevel || 1;
          const tpl = legend?.actors?.boss || null;
          if (tpl) {
            spawnEnemy(ex, ey, 'boss', { ...tpl });
          } else if (lvl === 2) {
            spawnEnemy(ex, ey, 'boss', {
              name: 'Nethra', vnId: 'enemy:nethra',
              portrait: 'assets/portraits/level02/Nethra/Nethra.mp4',
              portraitPowered: 'assets/portraits/level02/Nethra/Nethra powered.mp4',
              portraitDefeated: 'assets/portraits/level02/Nethra/Nethra defeated.mp4',
              onDefeatNextLevel: 3,
              hp: 50, dmg: 9, speed: 12, hitCooldown: 0.7,
              vnOnSight: { text: introTexts.nethra },
              ap: 2,
            });
          } else {
            // Level 1 default: Vast
            spawnEnemy(ex, ey, 'boss', {
              name: 'Vast', vnId: 'enemy:vast',
              portrait: 'assets/portraits/level01/Vast/Vast video.mp4',
              portraitPowered: 'assets/portraits/level01/Vast/Vast powered.mp4',
              portraitDefeated: 'assets/portraits/level01/Vast/Vast defeated.mp4',
              onDefeatNextLevel: 2,
              vnOnSight: { text: introTexts.vast },
            });
          }
        } else if (s.kind === 'leashed_mook') {
          spawnEnemy(ex, ey, 'mook', { name: 'Greenwood Bandit', leashed: true, aggroRadius: 160 });
        } else if (s.kind === 'leashed_featured') {
          spawnEnemy(ex, ey, 'featured', { name: 'Featured Foe', leashed: true, aggroRadius: 180 });
        } else if (s.kind === 'leashed_featured_ranged') {
          spawnEnemy(ex, ey, 'featured', {
            name: 'Bandit Lieutenant', leashed: true, aggroRadius: 180,
            hp: 12, dmg: 6, ranged: true, shootRange: 160, shootCooldown: 1.0, projectileSpeed: 200, projectileDamage: 3, aimError: 0.03,
          });
        }
      }
    }

    // NPCs: if defined by map, replace existing NPCs
    if (npcSpawns.length > 0) {
      npcs.length = 0;
      // Registry-driven NPC spawns (reduces long else-if chains)
      const NPCS = {
        canopy:    { name: 'Canopy',    dir: 'right', portrait: 'assets/portraits/level01/Canopy/Canopy video.mp4',    dialogId: 'canopy',    sheet: 'Canopy' },
        yorna:     { name: 'Yorna',     dir: 'down',  portrait: 'assets/portraits/level01/Yorna/Yorna video.mp4',     dialogId: 'yorna',     sheet: 'Yorna' },
        hola:      { name: 'Hola',      dir: 'left',  portrait: 'assets/portraits/level01/Hola/Hola video.mp4',      dialogId: 'hola',      sheet: 'Hola' },
        oyin:      { name: 'Oyin',      dir: 'right', portrait: 'assets/portraits/level02/Oyin/Oyin.mp4',            dialogId: 'oyin',      sheet: 'Oyin' },
        twil:      { name: 'Twil',      dir: 'left',  portrait: 'assets/portraits/level02/Twil/Twil.mp4',            dialogId: 'twil',      sheet: 'Twil' },
        urn:       { name: 'Urn',       dir: 'up',    portrait: 'assets/portraits/level04/Urn/Urn.mp4',              dialogId: 'urn',       sheet: 'Urn' },
        varabella: { name: 'Varabella', dir: 'down',  portrait: 'assets/portraits/level04/Varabella/Varabella.mp4',  dialogId: 'varabella', sheet: 'Varabella' },
        tin:       { name: 'Tin',       dir: 'right', portrait: 'assets/portraits/level03/Tin/Tin.mp4',              dialogId: 'tin',       sheet: 'Tin' },
        nellis:    { name: 'Nellis',    dir: 'left',  portrait: 'assets/portraits/level03/Nellis/Nellis.mp4',        dialogId: 'nellis',    sheet: 'Nellis' },
        cowsill:   { name: 'Cowsill',   dir: 'down',  portrait: 'assets/portraits/level05/Cowsill/Cowsill.mp4',      dialogId: 'cowsill',   sheet: 'Cowsill' },
        ell:       { name: 'Ell',       dir: 'down',  portrait: 'assets/portraits/level06/Ell/Ell.mp4',              dialogId: 'ell',       sheet: 'Ell' },
      };
      const inParty = (name) => {
        try { return companions.some(c => c && (c.name||'').toLowerCase() === String(name||'').toLowerCase()); } catch { return false; }
      };
      const attachDialogById = (npc, dialogId) => {
        try {
          import('../data/dialogs.js').then(mod => {
            const key = `${String(dialogId||'') }Dialog`;
            const tree = mod[key];
            if (tree) setNpcDialog(npc, tree);
          }).catch(()=>{});
        } catch {}
      };
      for (const s of npcSpawns) {
        const px = s.x * TILE, py = s.y * TILE;
        const key = String(s.who || '').toLowerCase();
        const cfg = NPCS[key];
        if (!cfg) continue;
        if (inParty(cfg.name)) continue; // do not spawn an NPC duplicate if companion is in party
        const n = spawnNpc(px, py, cfg.dir || 'down', {
          name: cfg.name,
          portrait: cfg.portrait || null,
          dialogId: cfg.dialogId || key,
          sheet: sheetForName(cfg.sheet || cfg.name),
        });
        if (key === 'ell') {
          // Simple one-line dialog while boss is alive
          const tree = { start: 'root', nodes: { root: { text: 'Help me', choices: [ { label: 'Back', action: 'end' } ] } } };
          try { setNpcDialog(n, tree); } catch {}
        } else {
          attachDialogById(n, cfg.dialogId || key);
        }
      }
    }

    // Rebuild spatial index after obstacles/props are finalized
    try { rebuildObstacleIndex(64); } catch {}
    // Build a terrain bitmap using existing generator (by provided theme)
    const terrain = buildTerrainBitmap(world, legend?.theme || 'default');
    return terrain;
  } catch (e) {
    try { console.warn('applyPngMap failed', e); } catch {}
    return null;
  }
}
