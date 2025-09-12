import { world, player, enemies, companions, npcs, obstacles, corpses, stains, floaters, sparkles, runtime, spawners } from './state.js';
import { buildObstacles, buildTerrainBitmap, tileType } from './terrain.js';
import { LEVEL4_CITY_WALL_RECTS, LEVEL4_SIZE } from '../data/level4_city_walls.js';
import { LEVEL5_CITY_WALL_RECTS, LEVEL5_SIZE } from '../data/level5_city_walls.js';
import { LEVEL5_TEMPLE_SIZE, LEVEL5_TEMPLE_WALLS, LEVEL5_TEMPLE_FEATURES, findSafeSpawn } from '../data/level5_temple_layout.js';
import { makeSpriteSheet, sheetForName, makeSnakeSpriteSheet } from './sprites.js';
import { setMusicLocation } from './audio.js';
import { spawnEnemy, spawnNpc, addItemToInventory } from './state.js';
import { TILE } from './constants.js';
import { setNpcDialog } from './dialog.js';
import { canopyDialog, yornaDialog, holaDialog, snakeDialog } from '../data/dialogs.js';
import { clearArenaInteriorAndGate } from './arena.js';
import { introTexts } from '../data/intro_texts.js';

// Level 1: Greenwood — initial world (moved from main.js to support load route)
export function loadLevel1() {
  // Base world size
  world.tileW = 100; world.tileH = 60;
  enemies.length = 0; npcs.length = 0; obstacles.length = 0; corpses.length = 0; stains.length = 0; floaters.length = 0; sparkles.length = 0; spawners.length = 0;
  // Place player near center
  player.x = Math.floor(world.w / 2);
  player.y = Math.floor(world.h / 2);
  for (let i = 0; i < companions.length; i++) { const c = companions[i]; c.x = player.x + 12 * (i + 1); c.y = player.y + 8 * (i + 1); }
  // Terrain and procedural obstacles
  const terrain = buildTerrainBitmap(world);
  obstacles.push(...buildObstacles(world, player, enemies, npcs));
  // Level 1 defaults: start dim and equip a torch
  (function initDarkStart() {
    try {
      // Start dim in Level 1
      import('./lighting.js').then(m => m.setAmbientLevel(4)).catch(()=>{});
      // Give the player a small torch stack and equip a lit torch for visibility
      addItemToInventory(player.inventory, { id: 'torch', name: 'Torch', slot: 'leftHand', stackable: true, maxQty: 99, qty: 3 });
      // Do not auto-equip; torches begin unlit in the inventory
    } catch {}
  })();

  // Place some chests and breakables similar to start
  obstacles.push({ x: Math.round(player.x + TILE * 6), y: Math.round(player.y - TILE * 4), w: 12, h: 10, type: 'chest', id: 'chest_l1_sword', fixedItemId: 'sword_fine', opened: false, locked: false });
  obstacles.push({ x: Math.round(player.x - TILE * 8), y: Math.round(player.y + TILE * 6), w: 12, h: 10, type: 'chest', id: 'chest_l1_extra', lootTier: 'rare', opened: false, locked: false });
  const brk = [
    { x: Math.round(player.x + TILE * 10), y: Math.round(player.y + TILE * 6) },
    { x: Math.round(player.x - TILE * 12), y: Math.round(player.y - TILE * 8) },
  ];
  for (let i = 0; i < brk.length; i++) obstacles.push({ ...brk[i], w: 12, h: 12, type: (i%2? 'crate': 'barrel'), id: `brk_l1_${i}`, hp: 2 });

  // Nearby NPC positions
  const canopyPos = { x: Math.round(player.x + 172), y: Math.round(player.y - 10) };
  const holaPos   = { x: Math.round(player.x + 260), y: Math.round(player.y + 180) };
  const yornaPos  = { x: Math.round(player.x - 340), y: Math.round(player.y - 240) };

  // Initial enemies around NPCs
  // Canopy: three nearby mooks to hint at immediate pressure
  spawnEnemy(canopyPos.x + 28, canopyPos.y + 8,  'mook', { name: 'Greenwood Bandit' });
  spawnEnemy(canopyPos.x - 22, canopyPos.y - 14, 'mook', { name: 'Greenwood Bandit' });
  spawnEnemy(canopyPos.x + 6,  canopyPos.y - 24, 'mook', { name: 'Greenwood Bandit' });
  spawnEnemy(holaPos.x - 42, holaPos.y - 20,     'mook', { name: 'Greenwood Bandit' });
  spawnEnemy(holaPos.x + 42, holaPos.y - 20,     'mook', { name: 'Greenwood Bandit' });
  spawnEnemy(holaPos.x + 0,  holaPos.y + 38,     'mook', { name: 'Greenwood Bandit' });
  spawnEnemy(yornaPos.x - 36,  yornaPos.y + 0,   'mook', { name: 'Greenwood Bandit' });
  spawnEnemy(yornaPos.x + 36,  yornaPos.y + 0,   'mook', { name: 'Greenwood Bandit' });
  spawnEnemy(yornaPos.x + 0,   yornaPos.y + 36,  'mook', { name: 'Greenwood Bandit' });
  // Gorg — featured key-bearer
  const gorgPalette = { skin: '#ff4a4a', shirt: '#8a1a1a', pants: '#6a0f0f', hair: '#2a0000', outline: '#000000' };
  const gorgSheet = makeSpriteSheet(gorgPalette);

  // Castle with boss Vast
  const cw = TILE * 14, ch = TILE * 10, t = 8, gap = 16;
  const cxw = Math.min(world.w - cw - TILE * 2, Math.max(TILE * 2, world.w * 0.82));
  const cyw = Math.min(world.h - ch - TILE * 2, Math.max(TILE * 2, world.h * 0.78));
  const gapX = cxw + (cw - gap) / 2;
  const add = (x, y, w, h, type='wall', extra={}) => obstacles.push(Object.assign({ x, y, w, h, type, blocksAttacks: type==='wall' }, extra));
  add(cxw, cyw, gapX - cxw, t);
  add(gapX + gap, cyw, (cxw + cw) - (gapX + gap), t);
  add(cxw, cyw + ch - t, cw, t);
  add(cxw, cyw, t, ch);
  add(cxw + cw - t, cyw, t, ch);
  add(gapX, cyw, gap, t, 'gate', { locked: true, blocksAttacks: true, id: 'castle_gate', keyId: 'castle_gate' });
  // Subtle gate lights: a soft beacon at the gap and two small sidelights to hint the doorway
  try {
    if (!runtime._l1GateLightsAdded) {
      import('./lighting.js').then(m => {
        try {
          // Center beacon just outside the gate opening (above the top wall)
          const gx = Math.round(gapX + gap / 2);
          const gy = Math.max(0, Math.round(cyw - 10));
          m.addLightNode({ x: gx, y: gy, level: 5, radius: 4 });
          // Sidelights just inside the top wall, left and right edges of the gap
          const leftX = Math.round(gapX - 6), rightX = Math.round(gapX + gap + 6);
          const sideY = Math.round(cyw + 4);
          m.addLightNode({ x: leftX,  y: sideY, level: 3, radius: 2 });
          m.addLightNode({ x: rightX, y: sideY, level: 3, radius: 2 });
        } catch {}
      }).catch(()=>{});
      runtime._l1GateLightsAdded = true;
    }
  } catch {}
  // Move Key Guardian Gorg near the boss arena (outside, above the top wall)
  // Place him just outside the arena in the lower-right region so he's closer to the gate
  (function placeGorgNearCastle() {
    const gorgX = Math.round(cxw + cw/2 - 12); // near arena center horizontally
    const gorgY = Math.round(cyw - TILE * 4);  // above top wall, safely outside
    spawnEnemy(gorgX, gorgY, 'featured', {
      name: 'Gorg', vnId: 'enemy:gorg', guaranteedDropId: 'key_bronze', vnOnSight: { text: introTexts.gorg }, portrait: 'assets/portraits/level01/Gorg/Gorg.mp4', sheet: gorgSheet, sheetPalette: gorgPalette,
      hp: 20, dmg: 6, hitCooldown: 0.65,
    });
    // Two normal featured foes flanking Gorg
    spawnEnemy(gorgX - 28, gorgY - 12, 'featured', { name: 'Woodland Brute', hp: 8, dmg: 4 });
    spawnEnemy(gorgX + 30, gorgY + 10,  'featured', { name: 'Woodland Brute', hp: 8, dmg: 4 });
  })();
  // Rocky terrain above the castle: clustered rounded rock outcrops (blocking)
  (function placeRockyOutcrops() {
    // Build several overlapping rock chunks above and slightly left of the gate,
    // leaving a central lane clear to approach the arena opening.
    const rocks = [
      // big base chunks
      { x: Math.round(cxw + cw * 0.08), y: Math.round(cyw - TILE * 7 - 4), w: 44, h: 22 },
      { x: Math.round(cxw + cw * 0.20), y: Math.round(cyw - TILE * 6 - 2), w: 36, h: 20 },
      // rounded lobes
      { x: Math.round(cxw + cw * 0.05), y: Math.round(cyw - TILE * 5 - 10), w: 26, h: 16 },
      { x: Math.round(cxw + cw * 0.17), y: Math.round(cyw - TILE * 7 - 14), w: 24, h: 16 },
      { x: Math.round(cxw + cw * 0.28), y: Math.round(cyw - TILE * 6 - 16), w: 22, h: 14 },
      // smaller accent stones
      { x: Math.round(cxw + cw * 0.12), y: Math.round(cyw - TILE * 8 - 6), w: 16, h: 12 },
      { x: Math.round(cxw + cw * 0.02), y: Math.round(cyw - TILE * 6 - 8), w: 18, h: 12 },
    ];
    for (const r of rocks) {
      // Ensure within world bounds
      const rx = Math.max(0, Math.min(world.w - 12, r.x));
      const ry = Math.max(0, Math.min(world.h - 12, r.y));
      obstacles.push({ x: rx, y: ry, w: r.w, h: r.h, type: 'rock' });
    }
  })();
  // Dense rocks in the upper-right corner: scatter 20–30 rock obstacles
  (function placeUpperRightRocks() {
    const rng = () => Math.random();
    // Define a corner region near the upper-right of the world
    const margin = TILE * 2;
    const areaW = TILE * 18;
    const areaH = TILE * 14;
    const ax0 = Math.max(margin, world.w - areaW - margin);
    const ay0 = Math.max(margin, margin);
    const count = 26; // between 20 and 30
    const placed = [];
    const maxTries = 12;
    for (let i = 0; i < count; i++) {
      let placedOne = false;
      for (let t = 0; t < maxTries && !placedOne; t++) {
        const w = (12 + Math.floor(rng() * 18)) | 0;   // 12–30 px
        const h = (10 + Math.floor(rng() * 14)) | 0;   // 10–24 px
        const x = Math.round(ax0 + rng() * Math.max(1, areaW - w));
        const y = Math.round(ay0 + rng() * Math.max(1, areaH - h));
        // Avoid overlapping heavily with previously placed in this cluster
        const rect = { x, y, w, h };
        let heavyOverlap = false;
        for (const p of placed) {
          const ix = Math.max(0, Math.min(rect.x + rect.w, p.x + p.w) - Math.max(rect.x, p.x));
          const iy = Math.max(0, Math.min(rect.y + rect.h, p.y + p.h) - Math.max(rect.y, p.y));
          const inter = ix * iy;
          if (inter > 0 && inter >= 0.4 * Math.min(rect.w * rect.h, p.w * p.h)) { heavyOverlap = true; break; }
        }
        if (heavyOverlap) continue;
        obstacles.push({ x, y, w, h, type: 'rock' });
        placed.push(rect);
        placedOne = true;
      }
      // If we failed to place without heavy overlap, place anyway on last try with a tiny jitter
      if (!placedOne) {
        const w = 18, h = 14;
        const x = Math.round(ax0 + rng() * Math.max(1, areaW - w));
        const y = Math.round(ay0 + rng() * Math.max(1, areaH - h));
        obstacles.push({ x, y, w, h, type: 'rock' });
        placed.push({ x, y, w, h });
      }
    }
  })();
  // Additional dense rocks in the upper-right corner: +30 more
  (function placeUpperRightRocksMore() {
    const rng = () => Math.random();
    const margin = TILE * 2;
    // Slightly expand/spread area to fit more rocks without extreme overlap
    const areaW = TILE * 22;
    const areaH = TILE * 16;
    const ax0 = Math.max(margin, world.w - areaW - margin);
    const ay0 = Math.max(margin, margin);
    const count = 30;
    const placed = [];
    const maxTries = 12;
    for (let i = 0; i < count; i++) {
      let placedOne = false;
      for (let t = 0; t < maxTries && !placedOne; t++) {
        const w = (12 + Math.floor(rng() * 20)) | 0;   // 12–32 px
        const h = (10 + Math.floor(rng() * 16)) | 0;   // 10–26 px
        const x = Math.round(ax0 + rng() * Math.max(1, areaW - w));
        const y = Math.round(ay0 + rng() * Math.max(1, areaH - h));
        const rect = { x, y, w, h };
        let heavyOverlap = false;
        for (const p of placed) {
          const ix = Math.max(0, Math.min(rect.x + rect.w, p.x + p.w) - Math.max(rect.x, p.x));
          const iy = Math.max(0, Math.min(rect.y + rect.h, p.y + p.h) - Math.max(rect.y, p.y));
          const inter = ix * iy;
          if (inter > 0 && inter >= 0.5 * Math.min(rect.w * rect.h, p.w * p.h)) { heavyOverlap = true; break; }
        }
        if (heavyOverlap) continue;
        obstacles.push({ x, y, w, h, type: 'rock' });
        placed.push(rect);
        placedOne = true;
      }
      if (!placedOne) {
        const w = 20, h = 16;
        const x = Math.round(ax0 + rng() * Math.max(1, areaW - w));
        const y = Math.round(ay0 + rng() * Math.max(1, areaH - h));
        obstacles.push({ x, y, w, h, type: 'rock' });
        placed.push({ x, y, w, h });
      }
    }
  })();

  // Distribute additional trees across the whole level (30 more)
  (function scatterMoreTrees() {
    const count = 30;
    const placed = 0;
    const tryPlace = () => {
      // Pick a random tile; avoid 1-tile border
      const tx = 1 + Math.floor(Math.random() * Math.max(1, world.tileW - 2));
      const ty = 1 + Math.floor(Math.random() * Math.max(1, world.tileH - 2));
      // Skip water tiles
      try { if (tileType(tx, ty) === 'water') return false; } catch {}
      const w = 12, h = 12;
      const x = tx * TILE + 2;
      const y = ty * TILE + 4;
      // Avoid heavy overlap with existing obstacles (allow light touch for natural clustering)
      const rect = { x, y, w, h };
      for (const o of obstacles) {
        if (!o) continue;
        const ix = Math.max(0, Math.min(rect.x + rect.w, o.x + o.w) - Math.max(rect.x, o.x));
        const iy = Math.max(0, Math.min(rect.y + rect.h, o.y + o.h) - Math.max(rect.y, o.y));
        const inter = ix * iy;
        if (inter > 0 && inter >= 0.25 * Math.min(rect.w * rect.h, (o.w||0) * (o.h||0))) return false;
      }
      obstacles.push({ x, y, w, h, type: 'tree' });
      return true;
    };
    for (let i = 0; i < count; i++) {
      let ok = false;
      for (let t = 0; t < 20 && !ok; t++) ok = tryPlace();
      if (!ok) {
        // Force place somewhere near last random pick with smaller size
        const tx = 1 + Math.floor(Math.random() * Math.max(1, world.tileW - 2));
        const ty = 1 + Math.floor(Math.random() * Math.max(1, world.tileH - 2));
        const w = 10, h = 10;
        const x = tx * TILE + 3;
        const y = ty * TILE + 5;
        obstacles.push({ x, y, w, h, type: 'tree' });
      }
    }
  })();

  // Distribute 30 more trees across the level (second pass)
  (function scatterMoreTrees2() {
    const count = 30;
    function tryPlace() {
      const tx = 1 + Math.floor(Math.random() * Math.max(1, world.tileW - 2));
      const ty = 1 + Math.floor(Math.random() * Math.max(1, world.tileH - 2));
      try { if (tileType(tx, ty) === 'water') return false; } catch {}
      const w = 12, h = 12;
      const x = tx * TILE + 2;
      const y = ty * TILE + 4;
      const rect = { x, y, w, h };
      for (const o of obstacles) {
        if (!o) continue;
        const ix = Math.max(0, Math.min(rect.x + rect.w, o.x + o.w) - Math.max(rect.x, o.x));
        const iy = Math.max(0, Math.min(rect.y + rect.h, o.y + o.h) - Math.max(rect.y, o.y));
        const inter = ix * iy;
        if (inter > 0 && inter >= 0.25 * Math.min(rect.w * rect.h, (o.w||0) * (o.h||0))) return false;
      }
      obstacles.push({ x, y, w, h, type: 'tree' });
      return true;
    }
    for (let i = 0; i < count; i++) {
      let ok = false;
      for (let t = 0; t < 20 && !ok; t++) ok = tryPlace();
      if (!ok) {
        // force place with a slight jitter
        const tx = 1 + Math.floor(Math.random() * Math.max(1, world.tileW - 2));
        const ty = 1 + Math.floor(Math.random() * Math.max(1, world.tileH - 2));
        const x = tx * TILE + 3;
        const y = ty * TILE + 5;
        obstacles.push({ x, y, w: 10, h: 10, type: 'tree' });
      }
    }
  })();

  // Add more barrels and crates across the level to supply torches (barrels drop torches more often)
  (function scatterMoreBreakables() {
    const wantBarrels = 16;
    const wantCrates = 8;
    const inViewRadius = 120; // try not to spawn too close to initial player camera center
    // Compute next breakable id index to avoid collisions with earlier IDs
    let nextIdx = 0;
    for (const o of obstacles) if (o && (o.type === 'barrel' || o.type === 'crate') && typeof o.id === 'string' && o.id.startsWith('brk_l1_')) {
      const n = parseInt(o.id.slice('brk_l1_'.length), 10);
      if (!isNaN(n)) nextIdx = Math.max(nextIdx, n + 1);
    }
    function place(kind) {
      const w = 12, h = 12;
      for (let t = 0; t < 40; t++) {
        const x = Math.round(Math.random() * Math.max(0, world.w - w));
        const y = Math.round(Math.random() * Math.max(0, world.h - h));
        // Avoid water tiles roughly by sampling tile center
        try {
          const tx = Math.floor((x + w/2) / TILE), ty = Math.floor((y + h/2) / TILE);
          if (tileType(tx, ty) === 'water') continue;
        } catch {}
        // Avoid near-initial camera center to reduce immediate clutter
        const dx = (x + w/2) - player.x;
        const dy = (y + h/2) - player.y;
        if ((dx*dx + dy*dy) < (inViewRadius * inViewRadius)) continue;
        // Avoid heavy overlap
        const rect = { x, y, w, h };
        let blocked = false;
        for (const o of obstacles) {
          if (!o) continue;
          const ix = Math.max(0, Math.min(rect.x + rect.w, o.x + o.w) - Math.max(rect.x, o.x));
          const iy = Math.max(0, Math.min(rect.y + rect.h, o.y + o.h) - Math.max(rect.y, o.y));
          const inter = ix * iy;
          if (inter > 0 && inter >= 0.35 * Math.min(rect.w * rect.h, (o.w||0) * (o.h||0))) { blocked = true; break; }
        }
        if (blocked) continue;
        const id = `brk_l1_${nextIdx++}`;
        obstacles.push({ x, y, w, h, type: kind, id, hp: 2 });
        return true;
      }
      return false;
    }
    let b = 0, c = 0;
    while (b < wantBarrels) { if (place('barrel')) b++; else break; }
    while (c < wantCrates) { if (place('crate')) c++; else break; }
  })();
  // Boss Vast inside
  const boss1x = cxw + cw/2 - 6;
  const boss1y = cyw + ch/2 - 8;
  spawnEnemy(boss1x, boss1y, 'boss', {
    name: 'Vast', vnId: 'enemy:vast', portrait: 'assets/portraits/level01/Vast/Vast video.mp4', portraitPowered: 'assets/portraits/level01/Vast/Vast powered.mp4', portraitDefeated: 'assets/portraits/level01/Vast/Vast defeated.mp4', onDefeatNextLevel: 2, vnOnSight: { text: introTexts.vast },
    hp: 35, dmg: 5, speed: 10, hitCooldown: 0.75,  // Level 1 boss buff (reduced dmg again)
    ap: 1, // light armor piercing
  });
  // Boss arena adds: 3 mooks + 1 featured foe around the boss
  spawnEnemy(boss1x - 24, boss1y,      'mook', { name: 'Greenwood Bandit' });
  spawnEnemy(boss1x + 24, boss1y,      'mook', { name: 'Greenwood Bandit' });
  spawnEnemy(boss1x,      boss1y + 24, 'mook', { name: 'Greenwood Bandit' });
  spawnEnemy(boss1x,      boss1y - 28, 'featured', { name: 'Bandit Lieutenant', hp: 12, dmg: 6 });

  // Add an ambient light source inside the boss arena to soften darkness
  try {
    if (!runtime._l1ArenaLightAdded) {
      const cx = Math.round(cxw + cw / 2);
      const cy = Math.round(cyw + ch / 2);
      import('./lighting.js').then(m => { try { m.addLightNode({ x: cx, y: cy, level: 7 }); } catch {} });
      runtime._l1ArenaLightAdded = true;
    }
  } catch {}

  // NPCs - with feminine shape
  const canopyPalette = { hair: '#ffeb3b', longHair: true, dress: true, dressColor: '#4fa3ff', shirt: '#bfdcff', feminineShape: true };
  const yornaPalette  = { hair: '#d14a24', longHair: true, dress: true, dressColor: '#1a1a1a', shirt: '#4a4a4a', feminineShape: true };
  const holaPalette   = { hair: '#1b1b1b', longHair: true, dress: true, dressColor: '#f5f5f5', shirt: '#e0e0e0', feminineShape: true };
  const canopySheet = makeSpriteSheet(canopyPalette);
  const yornaSheet = makeSpriteSheet(yornaPalette);
  const holaSheet = makeSpriteSheet(holaPalette);
  const canopy = spawnNpc(canopyPos.x, canopyPos.y, 'left', { name: 'Canopy', dialogId: 'canopy', portrait: 'assets/portraits/level01/Canopy/Canopy video.mp4', sheet: canopySheet, sheetPalette: canopyPalette, vnOnSight: { text: introTexts.canopy } });
  const yorna = spawnNpc(yornaPos.x, yornaPos.y, 'right', { name: 'Yorna', dialogId: 'yorna', portrait: 'assets/portraits/level01/Yorna/Yorna video.mp4', sheet: yornaSheet, sheetPalette: yornaPalette, vnOnSight: { text: introTexts.yorna } });
  const hola = spawnNpc(holaPos.x, holaPos.y, 'up', { name: 'Hola', dialogId: 'hola', portrait: 'assets/portraits/level01/Hola/Hola video.mp4', sheet: holaSheet, sheetPalette: holaPalette, vnOnSight: { text: introTexts.hola } });
  setNpcDialog(canopy, canopyDialog); setNpcDialog(yorna, yornaDialog); setNpcDialog(hola, holaDialog);

  // Snake companion (Level 1): small slow aura + small bite (ATK) — gated by Snake Mode
  if (runtime.snakeMode) {
    try {
      const snakeSheet = null; // use external sprite
      const sx = Math.max(0, Math.min(world.w - 12, player.x + 140));
      const sy = Math.max(0, Math.min(world.h - 16, player.y + 60));
      const snake = spawnNpc(sx, sy, 'left', { name: 'Snek', dialogId: 'snake', sheet: snakeSheet, spriteId: 'assets/snake_sprite_strip_64x20', vnOnSight: { text: 'Snek: My Lord… sssafe. I follow if you wish.' } });
      setNpcDialog(snake, snakeDialog);
    } catch {}
  }

  return terrain;
}

// Registry of level loaders by numeric id
export const LEVEL_LOADERS = {
  1: loadLevel1,
  2: loadLevel2,
  3: loadLevel3,
  4: loadLevel4,
  5: loadLevel5,
  6: loadLevel6,
};
// Returns a new terrain bitmap after building the level.
export function loadLevel2() {
  // Resize world for level 2
  world.tileW = 120;
  world.tileH = 70;
  // Mark progression flag for gating dialog/quests
  try { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['level2_reached'] = true; } catch {}
  // Clear dynamic arrays
  enemies.length = 0; npcs.length = 0; obstacles.length = 0; corpses.length = 0; stains.length = 0; floaters.length = 0; sparkles.length = 0; spawners.length = 0;
  // Place player near center
  player.x = Math.floor(world.w / 2);
  player.y = Math.floor(world.h / 2);
  // Keep companions; move them near player
  for (let i = 0; i < companions.length; i++) {
    const c = companions[i];
    c.x = player.x + 12 * (i + 1);
    c.y = player.y + 8 * (i + 1);
  }
  // Build terrain + obstacles (desert theme)
  const terrain = buildTerrainBitmap(world, 'desert');
  obstacles.push(...buildObstacles(world, player, enemies, npcs, 'desert'));
  // Level 2: full daylight — set bright ambient lighting
  try { import('./lighting.js').then(m => m.setAmbientLevel(8)).catch(()=>{}); } catch {}
  // Environmental tiles: patches of mud (slow) and fire (burn) in the desert
  obstacles.push({ x: Math.round(player.x + TILE * 8), y: Math.round(player.y + TILE * 6), w: TILE * 4, h: TILE * 2, type: 'mud' });
  obstacles.push({ x: Math.round(player.x - TILE * 10), y: Math.round(player.y - TILE * 6), w: TILE * 3, h: TILE * 2, type: 'fire' });
  // New spawns for level 2
  // Space enemies farther from the player spawn so the immediate vicinity is calmer
  // A few mook packs in an annulus 280–460px away from player
  for (let k = 0; k < 6; k++) {
    const ang = Math.random() * Math.PI * 2;
    const r = 280 + Math.random() * 180; // 280–460 px
    const bx = Math.round(player.x + Math.cos(ang) * r);
    const by = Math.round(player.y + Math.sin(ang) * r);
    // Level 2 mooks: modest HP bump + small dmg bump
    spawnEnemy(bx, by, 'mook', { name: 'Urathar Scout', hp: 5, dmg: 4 });
  }
  // Two featured foes, also well outside the initial camera view
  spawnEnemy(player.x + 320, player.y - 220, 'featured', { hp: 12, dmg: 6 });
  spawnEnemy(player.x - 340, player.y + 240, 'featured', { hp: 12, dmg: 6 });
  // Enemy spawner — trickle of Urathar Scouts near the dunes (invisible)
  // Approx coords: center ~ (player.x + 360, player.y - 200)
  import('./state.js').then(m => {
    m.addSpawner({
      id: 'l2_dunes_trickle', visible: false,
      x: Math.round(player.x + 360), y: Math.round(player.y - 200), w: 24, h: 16,
      enemy: { kind: 'mook', name: 'Urathar Scout', hp: 5, dmg: 4 },
      batchSize: 1, intervalSec: 9, initialDelaySec: 8, jitterSec: 1.0,
      totalToSpawn: 3, concurrentCap: 1,
      proximityMode: 'near', radiusPx: 200,
    });
  }).catch(()=>{});

  // Chests and breakables (desert) — spaced around player
  obstacles.push({ x: Math.round(player.x + TILE * 14), y: Math.round(player.y - TILE * 10), w: 12, h: 10, type: 'chest', id: 'chest_l2_armor', fixedItemId: 'armor_chain', opened: false, locked: false });
  obstacles.push({ x: Math.round(player.x - TILE * 18), y: Math.round(player.y + TILE * 8), w: 12, h: 12, type: 'barrel', id: 'brk_l2_a', hp: 2 });
  obstacles.push({ x: Math.round(player.x + TILE * 10), y: Math.round(player.y + TILE * 12), w: 12, h: 12, type: 'crate', id: 'brk_l2_b', hp: 2 });
  // Fetch/Delivery quest pedestal: keyed to Sister's Ribbon (relic_canopy)
  obstacles.push({ x: Math.round(player.x + TILE * 8), y: Math.round(player.y - TILE * 14), w: 20, h: 8, type: 'gate', id: 'ribbon_pedestal', keyId: 'relic_canopy', locked: true, blocksAttacks: true, name: 'Ribbon Pedestal' });

  // Boss arena (ruins ring) and Nethra spawn
  const rw = TILE * 12, rh = TILE * 8, t = 8;
  const rx = Math.max(TILE * 6, Math.min(world.w - rw - TILE * 6, player.x + 220));
  const ry = Math.max(TILE * 6, Math.min(world.h - rh - TILE * 6, player.y + 180));
  const add = (x,y,w,h,type='wall',extra={}) => obstacles.push(Object.assign({ x, y, w, h, type, blocksAttacks: type==='wall' }, extra));
  // Top wall with a central gap for the gate
  const gapW = 24;
  const gapX = rx + (rw - gapW) / 2;
  // Clear any procedural obstacles inside the arena footprint and at the gate opening
  clearArenaInteriorAndGate(obstacles, { x: rx, y: ry, w: rw, h: rh }, t, { x: gapX, y: ry, w: gapW, h: t });
  // left and right top segments
  add(rx, ry, gapX - rx, t);
  add(gapX + gapW, ry, (rx + rw) - (gapX + gapW), t);
  // bottom, left, right walls
  add(rx, ry + rh - t, rw, t);
  add(rx, ry, t, rh);
  add(rx + rw - t, ry, t, rh);
  // Locked gate spans the gap; requires key_nethra
  obstacles.push({ x: gapX, y: ry, w: gapW, h: t, type: 'gate', id: 'nethra_gate', keyId: 'key_nethra', locked: true, blocksAttacks: true });
  const cx = rx + rw/2 - 6;
  const cy = ry + rh/2 - 8;
  spawnEnemy(cx, cy, 'boss', {
    name: 'Nethra', vnId: 'enemy:nethra',
    portrait: 'assets/portraits/level02/Nethra/Nethra.mp4',
    portraitPowered: 'assets/portraits/level02/Nethra/Nethra powered.mp4',
    portraitDefeated: 'assets/portraits/level02/Nethra/Nethra defeated.mp4',
    onDefeatNextLevel: 3,
    // Level 2 boss: buffed stats
    hp: 50,
    dmg: 9,
    speed: 12,
    hitCooldown: 0.7,
    vnOnSight: { text: introTexts.nethra },
    ap: 2,
  });
  // Boss arena adds: 4 mooks + 2 featured foes inside the arena
  spawnEnemy(cx - 24, cy,      'mook', { name: 'Urathar Scout', hp: 5, dmg: 4 });
  spawnEnemy(cx + 24, cy,      'mook', { name: 'Urathar Scout', hp: 5, dmg: 4 });
  spawnEnemy(cx, cy - 24,      'mook', { name: 'Urathar Scout', hp: 5, dmg: 4 });
  spawnEnemy(cx, cy + 24,      'mook', { name: 'Urathar Scout', hp: 5, dmg: 4 });
  spawnEnemy(cx - 34, cy - 18, 'featured', { name: 'Desert Enforcer', hp: 14, dmg: 6 });
  spawnEnemy(cx + 34, cy + 18, 'featured', { name: 'Desert Enforcer', hp: 14, dmg: 6 });
  // Aarg — blue serpent featured foe outside, holding the ruin gate key (fully blue-tinted like Gorg was fully red)
  const aargPalette = {
    skin: '#6fb3ff',
    hair: '#0a1b4a',
    longHair: false,
    dress: true,
    dressColor: '#274b9a',
    shirt: '#7aa6ff',
    pants: '#1b2e5a',
    outline: '#000000',
  };
  const aargSheet = makeSpriteSheet(aargPalette);
  spawnEnemy(
    rx + rw/2 - 20,
    ry - TILE * 4,
    'featured',
    {
      name: 'Aarg', vnId: 'enemy:aarg',
      sheet: aargSheet,
      sheetPalette: aargPalette,
      portrait: 'assets/portraits/level02/Aarg/Aarg.mp4',
      vnOnSight: { text: introTexts.aarg },
      guaranteedDropId: 'key_nethra',
      // Level 2 key guardian: buffed stats
      hp: 26,
      dmg: 7,
      hitCooldown: 0.6,
    }
  );
  // Two normal featured foes near Aarg
  spawnEnemy(rx + rw/2 - 56, ry - TILE * 3, 'featured', { name: 'Desert Marauder', hp: 12, dmg: 6 });
  spawnEnemy(rx + rw/2 + 20, ry - TILE * 5, 'featured', { name: 'Desert Marauder', hp: 12, dmg: 6 });
  // Player remains at initial center spawn; companions already placed near player above

  // New recruitable companions for level 2: Oyin and Twil
  // Appearances: Oyin (blonde hair, green dress), Twil (red hair, black dress)
  const oyinPalette = { hair: '#e8d18b', longHair: true, dress: true, dressColor: '#2ea65a', shirt: '#b7f0c9', feminineShape: true };
  const twilPalette = { hair: '#d14a24', longHair: true, dress: true, dressColor: '#1a1a1a', shirt: '#4a4a4a', feminineShape: true };
  const oyinSheet = makeSpriteSheet(oyinPalette);
  const twilSheet = makeSpriteSheet(twilPalette);
  // Place Oyin/Twil away from initial camera so VN intros don't trigger immediately
  const off = 240; // px offset to ensure out of view (camera ~160x90 half extents)
  const oyinX = Math.max(0, Math.min(world.w - 12, player.x - off));
  const oyinY = Math.max(0, Math.min(world.h - 16, player.y - off)); // upper-left quadrant
  const twilX = Math.max(0, Math.min(world.w - 12, player.x - off));
  const twilY = Math.max(0, Math.min(world.h - 16, player.y + off)); // lower-left quadrant
  const oyin = spawnNpc(oyinX, oyinY, 'right', { name: 'Oyin', dialogId: 'oyin', sheet: oyinSheet, sheetPalette: oyinPalette, portrait: 'assets/portraits/level02/Oyin/Oyin.mp4', vnOnSight: { text: introTexts.oyin } });
  const twil = spawnNpc(twilX, twilY, 'left', { name: 'Twil', dialogId: 'twil', sheet: twilSheet, sheetPalette: twilPalette, portrait: 'assets/portraits/level02/Twil/Twil.mp4', vnOnSight: { text: introTexts.twil } });
  // Attach basic recruit dialogs
  import('../data/dialogs.js').then(mod => { setNpcDialog(oyin, mod.oyinDialog); setNpcDialog(twil, mod.twilDialog); }).catch(()=>{});

  return terrain;
}

// Level 3: Watery Marsh
export function loadLevel3() {
  // Resize world for level 3
  world.tileW = 130;
  world.tileH = 80;
  // Mark progression flag for gating dialog/quests
  try { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['level3_reached'] = true; } catch {}
  enemies.length = 0; npcs.length = 0; obstacles.length = 0; corpses.length = 0; stains.length = 0; floaters.length = 0; sparkles.length = 0; spawners.length = 0;
  // Place player near center
  player.x = Math.floor(world.w / 2);
  player.y = Math.floor(world.h / 2);
  for (let i = 0; i < companions.length; i++) { const c = companions[i]; c.x = player.x + 12 * (i + 1); c.y = player.y + 8 * (i + 1); }
  // Build marsh terrain and obstacles
  const terrain = buildTerrainBitmap(world, 'marsh');
  obstacles.push(...buildObstacles(world, player, enemies, npcs, 'marsh'));
  // Marsh mud pools near player
  obstacles.push({ x: Math.round(player.x - TILE * 6), y: Math.round(player.y + TILE * 6), w: TILE * 5, h: TILE * 3, type: 'mud' });
  // Add a few large water pools (blocking)
  const pools = [
    { x: player.x + 120, y: player.y - 60, w: TILE * 10, h: TILE * 6 },
    { x: player.x - 200, y: player.y + 100, w: TILE * 12, h: TILE * 7 },
    { x: player.x - 260, y: player.y - 140, w: TILE * 8, h: TILE * 5 },
  ];
  for (const p of pools) obstacles.push({ x: Math.max(0, Math.min(world.w - TILE, p.x)), y: Math.max(0, Math.min(world.h - TILE, p.y)), w: p.w, h: p.h, type: 'water', blocksAttacks: true });

  // Spawns
  for (let k = 0; k < 6; k++) { const bx = Math.round(player.x + (Math.random() * 400 - 200)); const by = Math.round(player.y + (Math.random() * 300 - 150)); spawnEnemy(bx, by, 'mook', { name: 'Marsh Whisperer', hp: 7, dmg: 5 }); }

  // Chests and breakables (marsh) — spaced around player
  obstacles.push({ x: Math.round(player.x - TILE * 16), y: Math.round(player.y - TILE * 12), w: 12, h: 10, type: 'chest', id: 'chest_l3_helm', fixedItemId: 'helm_iron', opened: false, locked: false });
  obstacles.push({ x: Math.round(player.x + TILE * 12), y: Math.round(player.y - TILE * 8), w: 12, h: 12, type: 'barrel', id: 'brk_l3_a', hp: 2 });
  obstacles.push({ x: Math.round(player.x - TILE * 10), y: Math.round(player.y + TILE * 14), w: 12, h: 12, type: 'crate', id: 'brk_l3_b', hp: 2 });

  // Featured foe: Wight — drops Reed Key (bone-white override like Gorg/Aarg)
  const wx = player.x + 180, wy = player.y - 120;
  const wightPalette = {
    skin: '#f5f5f5',
    hair: '#e6e6e6',
    shirt: '#cfcfcf',
    pants: '#9e9e9e',
    outline: '#000000',
    longHair: false,
    dress: false,
  };
  const wightSheet = makeSpriteSheet(wightPalette);
  spawnEnemy(wx, wy, 'featured', { 
    name: 'Wight', vnId: 'enemy:wight', portrait: 'assets/portraits/level03/Wight/Wight.mp4', 
    vnOnSight: { text: introTexts.wight }, guaranteedDropId: 'key_reed', 
    sheet: wightSheet, sheetPalette: wightPalette, 
    hp: 32, dmg: 8, hitCooldown: 0.55,  // Level 3 key guardian buff (tougher featured foe)
  });
  // Two normal featured foes near Wight
  spawnEnemy(wx - 36, wy + 16, 'featured', { name: 'Marsh Stalker', hp: 14, dmg: 6 });
  spawnEnemy(wx + 28, wy - 18, 'featured', { name: 'Marsh Stalker', hp: 14, dmg: 6 });

  // Boss arena (island with gate requiring Reed Key)
  const rw = TILE * 12, rh = TILE * 8, t = 8; const rx = Math.max(TILE * 6, Math.min(world.w - rw - TILE * 6, player.x + 260)); const ry = Math.max(TILE * 6, Math.min(world.h - rh - TILE * 6, player.y + 160));
  const add = (x,y,w,h,type='wall',extra={}) => obstacles.push(Object.assign({ x, y, w, h, type, blocksAttacks: type==='wall' }, extra));
  const gapW = 24; const gapX = rx + (rw - gapW) / 2;
  // Clear any procedural obstacles inside the arena footprint and at the gate opening
  clearArenaInteriorAndGate(obstacles, { x: rx, y: ry, w: rw, h: rh }, t, { x: gapX, y: ry, w: gapW, h: t });
  add(rx, ry + rh - t, rw, t); add(rx, ry, t, rh); add(rx + rw - t, ry, t, rh); // bottom, left, right
  // Top splits around gate
  add(rx, ry, gapX - rx, t); add(gapX + gapW, ry, (rx + rw) - (gapX + gapW), t);
  obstacles.push({ x: gapX, y: ry, w: gapW, h: t, type: 'gate', id: 'marsh_gate', keyId: 'key_reed', locked: true, blocksAttacks: true });
  // Boss spawn: Luula inside the arena (blue hair, black dress)
  const cx = rx + rw/2 - 6;
  const cy = ry + rh/2 - 8;
  const luulaSheet = makeSpriteSheet({
    hair: '#6fb7ff',
    longHair: true,
    dress: true,
    dressColor: '#1a1a1a',
    shirt: '#4a4a4a',
    outline: '#000000',
  });
  spawnEnemy(cx, cy, 'boss', {
    name: 'Luula', vnId: 'enemy:luula',
    vnOnSight: { text: introTexts.luula },
    sheet: luulaSheet,
    portrait: 'assets/portraits/level03/Luula/Luula.mp4',
    portraitPowered: 'assets/portraits/level03/Luula/Luula powered.mp4',
    portraitDefeated: 'assets/portraits/level03/Luula/Luula defeated.mp4',
    onDefeatNextLevel: 4,
    hp: 65,
    dmg: 11,
    speed: 14,
    hitCooldown: 0.65,  // Level 3 boss buff
    ap: 2,
  });
  // Boss arena adds: 5 mooks + 2 featured foes inside the arena
  spawnEnemy(cx - 26, cy,        'mook', { name: 'Marsh Whisperer', hp: 7, dmg: 5 });
  spawnEnemy(cx + 26, cy,        'mook', { name: 'Marsh Whisperer', hp: 7, dmg: 5 });
  spawnEnemy(cx,        cy - 26, 'mook', { name: 'Marsh Whisperer', hp: 7, dmg: 5 });
  spawnEnemy(cx,        cy + 26, 'mook', { name: 'Marsh Whisperer', hp: 7, dmg: 5 });
  spawnEnemy(cx - 18,   cy - 18, 'mook', { name: 'Marsh Whisperer', hp: 7, dmg: 5 });
  spawnEnemy(cx - 34,   cy + 16, 'featured', { name: 'Marsh Stalker', hp: 14, dmg: 6 });
  spawnEnemy(cx + 34,   cy - 16, 'featured', { name: 'Marsh Stalker', hp: 14, dmg: 6 });

  // Recruitable NPCs: Tin & Nellis
  const tinPalette = { hair: '#6fb7ff', longHair: true, dress: true, dressColor: '#4fa3ff', shirt: '#bfdcff', feminineShape: true };
  const nellisPalette = { hair: '#a15aff', longHair: true, dress: true, dressColor: '#f5f5f5', shirt: '#e0e0e0', feminineShape: true };
  const tinSheet = makeSpriteSheet(tinPalette);
  const nellisSheet = makeSpriteSheet(nellisPalette);
  // Move Tin further from spawn and avoid water tiles
  (function placeTinSafe() {
    // Desired offset away from player spawn
    const desired = { x: player.x - 220, y: player.y - 180 };
    const toTile = (val) => Math.max(0, Math.floor(val / TILE));
    let best = { x: desired.x, y: desired.y };
    // Spiral search for a non-water, in-bounds tile near desired
    const startTx = toTile(desired.x), startTy = toTile(desired.y);
    let found = null;
    for (let r = 0; r <= 30 && !found; r++) {
      for (let dy = -r; dy <= r && !found; dy++) {
        for (let dx = -r; dx <= r && !found; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const tx = startTx + dx, ty = startTy + dy;
          if (tx < 0 || ty < 0 || tx >= world.tileW || ty >= world.tileH) continue;
          if (tileType(tx, ty) === 'water') continue;
          const px = tx * TILE + (TILE - 12) / 2;
          const py = ty * TILE + (TILE - 16) / 2;
          found = { x: px|0, y: py|0 };
        }
      }
    }
    if (!found) found = best;
    spawnNpc(found.x, found.y, 'right', { name: 'Tin', dialogId: 'tin', sheet: tinSheet, sheetPalette: tinPalette, portrait: 'assets/portraits/level03/Tin/Tin.mp4', vnOnSight: { text: introTexts.tin } });
  })();
  const nel = spawnNpc(player.x + 100, player.y + 140, 'left', { name: 'Nellis', dialogId: 'nellis', sheet: nellisSheet, sheetPalette: nellisPalette, portrait: 'assets/portraits/level03/Nellis/Nellis.mp4', vnOnSight: { text: introTexts.nellis } });
  import('../data/dialogs.js').then(mod => { if (mod.tinDialog) setNpcDialog(tin, mod.tinDialog); if (mod.nellisDialog) setNpcDialog(nel, mod.nellisDialog); }).catch(()=>{});

  return terrain;
}

// Level 4: Ruined City — plaza arena with a portcullis gate keyed by Blurb's drop; boss Vanificia
export function loadLevel4() {
  // Resize world for level 4
  world.tileW = 140;
  world.tileH = 85;
  // Mark progression flag for gating dialog/quests
  try { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['level4_reached'] = true; } catch {}
  // Clear dynamic arrays
  enemies.length = 0; npcs.length = 0; obstacles.length = 0; corpses.length = 0; stains.length = 0; floaters.length = 0; sparkles.length = 0; spawners.length = 0;
  // Place player near center and gather companions near
  player.x = Math.floor(world.w / 2);
  player.y = Math.floor(world.h / 2);
  for (let i = 0; i < companions.length; i++) { const c = companions[i]; c.x = player.x + 12 * (i + 1); c.y = player.y + 8 * (i + 1); }

  // Build ruined city terrain
  const terrain = buildTerrainBitmap(world, 'city');
  // We'll populate city obstacles from an authored JSON mask (assets/level4.json)
  // City hazards: scattered fire tiles
  obstacles.push({ x: Math.round(player.x + TILE * 6), y: Math.round(player.y - TILE * 8), w: TILE * 3, h: TILE * 2, type: 'fire' });

  // Scatter a few enemy mooks around (off-camera)
  for (let k = 0; k < 6; k++) {
    const bx = Math.round(player.x + (Math.random() * 400 - 200));
    const by = Math.round(player.y + (Math.random() * 300 - 150));
    // Level 4 mooks: larger HP bump
    spawnEnemy(bx, by, 'mook', { name: 'Urathar Soldier', hp: 9, dmg: 6 });
  }
  // Enemy spawner — city patrol squads when player is far (invisible)
  // Approx coords: center ~ (player.x - 220, player.y + 160)
  import('./state.js').then(m => {
    m.addSpawner({
      id: 'l4_plaza_patrol', visible: false,
      x: Math.round(player.x - 220), y: Math.round(player.y + 160), w: 28, h: 18,
      enemy: { kind: 'mook', name: 'Urathar Soldier', hp: 9, dmg: 6 },
      batchSize: 2, intervalSec: 8, initialDelaySec: 3, jitterSec: 2,
      totalToSpawn: 6, concurrentCap: 3,
      proximityMode: 'far', radiusPx: 260,
    });
  }).catch(()=>{});
  // Enemy spawner (visible glyph) — city patrol squads when player is far
  // Approx coords: center ~ (player.x - 220, player.y + 160)
  import('./state.js').then(m => {
    m.addSpawner({
      id: 'l4_plaza_patrol', visible: true,
      x: Math.round(player.x - 220), y: Math.round(player.y + 160), w: 28, h: 18,
      enemy: { kind: 'mook', name: 'Urathar Soldier', hp: 9, dmg: 6 },
      batchSize: 2, intervalSec: 8, initialDelaySec: 3, jitterSec: 2,
      totalToSpawn: 6, concurrentCap: 3,
      proximityMode: 'far', radiusPx: 260,
    });
  }).catch(()=>{});

  // Featured foe: Blurb — drops City Sigil Key
  const blurbX = player.x - 200, blurbY = player.y - 120;
  const blurbPalette = {
    // Green grotesque tinting, similar to Gorg/Aarg/Wight style overrides
    skin: '#6fdd6f',
    hair: '#0a2a0a',
    longHair: false,
    dress: false,
    shirt: '#4caf50',
    pants: '#2e7d32',
    outline: '#000000'
  };
  const blurbSheet = makeSpriteSheet(blurbPalette);
  spawnEnemy(blurbX, blurbY, 'featured', {
    name: 'Blurb', vnId: 'enemy:blurb', sheet: blurbSheet,
    portrait: 'assets/portraits/level04/Blurb/Blurb.mp4',
    vnOnSight: { text: (introTexts && introTexts.blurb) || 'Blurb: Glub-glub… key mine!' },
    guaranteedDropId: 'key_sigil', 
    hp: 38, dmg: 9, hitCooldown: 0.5,  // Level 4 key guardian buff (tougher featured foe)
    sheetPalette: blurbPalette,
  });
  // Two normal featured foes near Blurb
  spawnEnemy(blurbX - 32, blurbY + 12, 'featured', { name: 'City Brute', hp: 18, dmg: 7 });
  spawnEnemy(blurbX + 34, blurbY - 14, 'featured', { name: 'City Brute', hp: 18, dmg: 7 });

  // Boss arena (city plaza) with a top gate requiring Iron Sigil
  const rw = TILE * 12, rh = TILE * 8, t = 8;
  // Fixed position near coordinates (92, 51)
  const rx = 86 * TILE;  // Position arena around x:86-98
  const ry = 48 * TILE;  // Position arena around y:48-56
  const add = (x,y,w,h,type='wall',extra={}) => obstacles.push(Object.assign({ x, y, w, h, type, blocksAttacks: type==='wall' }, extra));
  const gapW = 24; const gapX = rx + (rw - gapW) / 2;
  // Clear any procedural obstacles inside the arena footprint and at the gate opening
  clearArenaInteriorAndGate(obstacles, { x: rx, y: ry, w: rw, h: rh }, t, { x: gapX, y: ry, w: gapW, h: t });
  // Build walls with a gap for the gate
  add(rx, ry + rh - t, rw, t); // bottom
  add(rx, ry, t, rh);          // left
  add(rx + rw - t, ry, t, rh); // right
  add(rx, ry, gapX - rx, t);   // top-left
  add(gapX + gapW, ry, (rx + rw) - (gapX + gapW), t); // top-right
  // Locked gate requires key_sigil — single entry point only
  obstacles.push({ x: gapX, y: ry, w: gapW, h: t, type: 'gate', id: 'city_gate', keyId: 'key_sigil', locked: true, blocksAttacks: true });

  // Boss: Vanificia inside arena
  const cx = rx + rw/2 - 6; const cy = ry + rh/2 - 8;
  const vaniSheet = makeSpriteSheet({ hair: '#8a3dff', longHair: true, dress: true, dressColor: '#2a123a', shirt: '#4a2a6b', outline: '#000000' });
  spawnEnemy(cx, cy, 'boss', {
    name: 'Vanificia', vnId: 'enemy:vanificia', sheet: vaniSheet,
    vnOnSight: { text: (introTexts && introTexts.vanificia) || 'Vanificia: You trespass in Urathar\'s city. Kneel, or be unmade.' },
    portrait: 'assets/portraits/level04/Vanificia/Vanificia.mp4',
    portraitPowered: 'assets/portraits/level04/Vanificia/Vanificia powered.mp4',
    portraitDefeated: 'assets/portraits/level04/Vanificia/Vanificia defeated.mp4',
    hp: 80,
    dmg: 13,
    speed: 16,
    hitCooldown: 0.6,  // Level 4 boss buff
    onDefeatNextLevel: 5,
    ap: 3,
  });
  // Boss arena adds: 6 mooks + 2 featured foes inside the arena
  spawnEnemy(cx - 26, cy,        'mook', { name: 'Urathar Soldier', hp: 9, dmg: 6 });
  spawnEnemy(cx + 26, cy,        'mook', { name: 'Urathar Soldier', hp: 9, dmg: 6 });
  spawnEnemy(cx,        cy - 26, 'mook', { name: 'Urathar Soldier', hp: 9, dmg: 6 });
  spawnEnemy(cx,        cy + 26, 'mook', { name: 'Urathar Soldier', hp: 9, dmg: 6 });
  spawnEnemy(cx - 18,   cy - 18, 'mook', { name: 'Urathar Soldier', hp: 9, dmg: 6 });
  spawnEnemy(cx + 18,   cy + 18, 'mook', { name: 'Urathar Soldier', hp: 9, dmg: 6 });
  spawnEnemy(cx - 36,   cy + 16, 'featured', { name: 'City Brute', hp: 18, dmg: 7 });
  spawnEnemy(cx + 36,   cy - 16, 'featured', { name: 'City Brute', hp: 18, dmg: 7 });

  

  // Synchronous: add hard-coded wall rectangles from data (tiles -> pixels)
  for (const r of LEVEL4_CITY_WALL_RECTS) {
    obstacles.push({ x: r.x * TILE, y: r.y * TILE, w: r.w * TILE, h: r.h * TILE, type: 'wall', blocksAttacks: true });
  }
  // Re-clear arena and spawn safety after adding walls
  clearArenaInteriorAndGate(obstacles, { x: rx, y: ry, w: rw, h: rh }, t, { x: gapX, y: ry, w: gapW, h: t });
  const spawnSafe = { x: player.x - TILE * 5, y: player.y - TILE * 5, w: TILE * 10, h: TILE * 10 };
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i]; if (!o) continue;
    if (o.type !== 'wall') continue;
    const inter = !(o.x + o.w <= spawnSafe.x || o.x >= spawnSafe.x + spawnSafe.w || o.y + o.h <= spawnSafe.y || o.y >= spawnSafe.y + spawnSafe.h);
    if (inter) obstacles.splice(i, 1);
  }

  // Recruitable NPCs: Urn & Varabella
  const urnPalette = { hair: '#4fa36b', longHair: true, dress: true, dressColor: '#3a7f4f', shirt: '#9bd6b0', feminineShape: true };
  const varaPalette = { hair: '#d14a24', longHair: true, dress: true, dressColor: '#1a1a1a', shirt: '#4a4a4a', feminineShape: true };
  const urnSheet = makeSpriteSheet(urnPalette);
  const varaSheet = makeSpriteSheet(varaPalette);
  const urn = spawnNpc(player.x - 140, player.y + 100, 'up', { name: 'Urn', dialogId: 'urn', sheet: urnSheet, sheetPalette: urnPalette, portrait: 'assets/portraits/level04/Urn/Urn.mp4', affinity: 5, vnOnSight: { text: (introTexts && introTexts.urn) || 'Urn: If you lead, I can keep pace.' } });
  let vara;
  // Place Varabella; avoid spawning on fire/lava tiles
  (function placeVarabella() {
    const start = { x: player.x + 140, y: player.y - 120 };
    const rect = (x,y) => ({ x, y, w: 12, h: 16 });
    const overlapsHazard = (r) => obstacles.some(o => (o.type === 'fire' || o.type === 'lava') && !(r.x + r.w <= o.x || r.x >= o.x + o.w || r.y + r.h <= o.y || r.y >= o.y + o.h));
    const candidates = [
      { x: start.x, y: start.y },
      { x: start.x + TILE * 4, y: start.y },
      { x: start.x - TILE * 4, y: start.y },
      { x: start.x, y: start.y + TILE * 4 },
      { x: start.x, y: start.y - TILE * 4 },
      { x: start.x + TILE * 4, y: start.y + TILE * 4 },
      { x: start.x - TILE * 4, y: start.y + TILE * 4 },
      { x: start.x + TILE * 4, y: start.y - TILE * 4 },
      { x: start.x - TILE * 4, y: start.y - TILE * 4 },
    ];
    let spot = candidates.find(p => !overlapsHazard(rect(p.x, p.y))) || start;
    vara = spawnNpc(spot.x, spot.y, 'down', { name: 'Varabella', dialogId: 'varabella', sheet: varaSheet, sheetPalette: varaPalette, portrait: 'assets/portraits/level04/Varabella/Varabella.mp4', affinity: 5, vnOnSight: { text: (introTexts && introTexts.varabella) || 'Varabella: Need a sharper eye and a steadier hand?' } });
  })();
  import('../data/dialogs.js').then(mod => { if (mod.urnDialog) setNpcDialog(urn, mod.urnDialog); if (mod.varabellaDialog) setNpcDialog(vara, mod.varabellaDialog); }).catch(()=>{});

  return terrain;
}

// Level 5: Temple District — dungeon layout with rooms and corridors
export function loadLevel5() {
  world.tileW = LEVEL5_TEMPLE_SIZE.tileW;
  world.tileH = LEVEL5_TEMPLE_SIZE.tileH;
  try { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['level5_reached'] = true; } catch {}
  enemies.length = 0; npcs.length = 0; obstacles.length = 0; corpses.length = 0; stains.length = 0; floaters.length = 0; sparkles.length = 0; spawners.length = 0;

  // Spawn player in top-left entrance room
  const spawnPoint = LEVEL5_TEMPLE_FEATURES.playerSpawn;
  player.x = spawnPoint.x * TILE;
  player.y = spawnPoint.y * TILE;
  for (let i = 0; i < companions.length; i++) { const c = companions[i]; c.x = player.x + 12 * (i + 1); c.y = player.y + 8 * (i + 1); }

  const terrain = buildTerrainBitmap(world, 'city');
  
  // Add all temple walls from the map layout
  for (const wall of LEVEL5_TEMPLE_WALLS) {
    obstacles.push({
      x: wall.x * TILE,
      y: wall.y * TILE,
      w: wall.w * TILE,
      h: wall.h * TILE,
      type: 'wall',
      blocksAttacks: true
    });
  }
  
  // Add water pool as a hazard
  const water = LEVEL5_TEMPLE_FEATURES.waterPool;
  obstacles.push({
    x: water.x * TILE,
    y: water.y * TILE,
    w: water.w * TILE,
    h: water.h * TILE,
    type: 'water',
    blocksAttacks: true
  });
  
  // Add gates between rooms
  for (const gate of LEVEL5_TEMPLE_FEATURES.gates) {
    obstacles.push({
      x: gate.x * TILE,
      y: gate.y * TILE,
      w: gate.w * TILE,
      h: gate.h * TILE,
      type: 'gate',
      id: gate.keyId,
      keyId: gate.keyId,
      locked: gate.locked !== false,
      blocksAttacks: true
    });
  }

  // Enemy spawner — temple guard reinforcements (invisible), continuous when near
  // Center approx near central corridor: (player.x + 220, player.y + 120)
  import('./state.js').then(m => {
    m.addSpawner({
      id: 'l5_temple_guards', visible: false,
      x: Math.round(player.x + 220), y: Math.round(player.y + 120), w: 28, h: 18,
      enemy: { kind: 'mook', name: 'Temple Guard', hp: 12, dmg: 7 },
      batchSize: 2, intervalSec: 10, initialDelaySec: 6, jitterSec: 1.5,
      // infinite total; limit concurrent to avoid floods
      concurrentCap: 6,
      proximityMode: 'near', radiusPx: 220,
    });
  }).catch(()=>{});

  // Add some fire hazards in corridors
  obstacles.push({ x: 55 * TILE, y: 50 * TILE, w: TILE * 2, h: TILE * 2, type: 'fire' });
  obstacles.push({ x: 100 * TILE, y: 48 * TILE, w: TILE * 2, h: TILE * 2, type: 'fire' });
  
  // Key guardian: Fana (enslaved sorceress); drops the first temple key
  // Place in the middle-right room
  const fanaSpawn = findSafeSpawn(105, 52);
  const kgx = fanaSpawn.x * TILE, kgy = fanaSpawn.y * TILE;
  spawnEnemy(kgx, kgy, 'featured', {
    name: 'Fana', vnId: 'enemy:fana',
    portrait: 'assets/portraits/level05/Fana/Fana villain.mp4',
    portraitDefeated: 'assets/portraits/level05/Fana/Fana.mp4',  // Shows normal Fana when defeated
    vnOnSight: { text: (introTexts && introTexts.fana_enslaved) || 'Fana: I must... protect the temple... Vorthak commands...', lock: true, preDelaySec: 0.8 },
    guaranteedDropId: 'key_temple',  // Boss gate key
    hp: 46, dmg: 11, hitCooldown: 0.45,  // Level 5 key guardian buff (tougher featured foe)
  });
  // Two normal featured foes near Fana
  spawnEnemy(kgx - TILE * 2, kgy + TILE * 1, 'featured', { name: 'Temple Sentinel', hp: 22, dmg: 9 });
  spawnEnemy(kgx + TILE * 2, kgy - TILE * 1, 'featured', { name: 'Temple Sentinel', hp: 22, dmg: 9 });

  // Additional featured foe in the central pillar room
  const sentinelSpawn = findSafeSpawn(65, 16);
  const ff2x = sentinelSpawn.x * TILE, ff2y = sentinelSpawn.y * TILE;
  spawnEnemy(ff2x, ff2y, 'featured', { name: 'Temple Sentinel', hp: 30, dmg: 9 });

  // Boss Vorthak (2x visual scale) in the bottom-right boss arena
  const bossLoc = LEVEL5_TEMPLE_FEATURES.bossLocation;
  const cx = bossLoc.x * TILE; const cy = bossLoc.y * TILE;
  spawnEnemy(cx, cy, 'boss', {
    name: 'Vorthak', vnId: 'enemy:vorthak', spriteScale: 2, w: 24, h: 32, 
    hp: 100, dmg: 15, speed: 18, hitCooldown: 0.55,  // Level 5 boss buff (reduced dmg)
    ap: 5,
    // Boss portraits for VN overlays
    portrait: 'assets/portraits/level05/Vorthak/Vorthak.mp4',
    portraitPowered: 'assets/portraits/level05/Vorthak/Vorthak powered.mp4',
    portraitOverpowered: 'assets/portraits/level05/Vorthak/Vorthak overpowered.mp4',
    portraitDefeated: 'assets/portraits/level05/Vorthak/Vorthak defeated.mp4',
    onDefeatNextLevel: 6,
    vnOnSight: { text: (introTexts && introTexts.vorthak) || 'Vorthak: The heart is mine. Turn back or burn.' },
  });
  spawnEnemy(cx - 28, cy,      'mook', { name: 'Temple Guard', hp: 10, dmg: 7 });
  spawnEnemy(cx + 28, cy,      'mook', { name: 'Temple Guard', hp: 10, dmg: 7 });

  // Boss arena mook spawner (proximity-activated)
  import('./state.js').then(m => {
    m.addSpawner({
      id: 'l5_boss_arena_mooks', visible: false,
      x: Math.round(cx - 24), y: Math.round(cy - 16), w: 48, h: 32,
      enemy: { kind: 'mook', name: 'Temple Guard', hp: 12, dmg: 7 },
      batchSize: 2, intervalSec: 8, initialDelaySec: 2, jitterSec: 1.2,
      // infinite waves, but cap concurrency in arena
      concurrentCap: 4,
      proximityMode: 'near', radiusPx: 140,
    });
  }).catch(()=>{});

  // Spawn enemies in designated zones
  (function addMooks() {
    for (const zone of LEVEL5_TEMPLE_FEATURES.enemyZones) {
      // Spawn 3-5 mooks per zone for more challenge
      const count = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const x = zone.x + Math.floor(Math.random() * zone.w);
        const y = zone.y + Math.floor(Math.random() * zone.h);
        const safePos = findSafeSpawn(x, y);
        spawnEnemy(safePos.x * TILE, safePos.y * TILE, 'mook', { name: 'Temple Guard', hp: 12, dmg: 7 });
      }
    }
    
    // Add extra wandering temple guards
    const extraGuards = [
      { x: 35, y: 45 }, { x: 85, y: 30 }, { x: 115, y: 25 },
      { x: 25, y: 60 }, { x: 95, y: 70 }, { x: 125, y: 55 },
      { x: 50, y: 90 }, { x: 70, y: 45 }, { x: 40, y: 25 }
    ];
    for (const pos of extraGuards) {
      const safePos = findSafeSpawn(pos.x, pos.y);
      spawnEnemy(safePos.x * TILE, safePos.y * TILE, 'mook', { name: 'Temple Guard', hp: 14, dmg: 7 });
    }
  })();

  // High-quality loot chests
  // Chest 1: Master Sword - hidden in top-right room
  obstacles.push({
    x: 118 * TILE, y: 12 * TILE, w: TILE, h: TILE,
    type: 'chest', id: 'chest_l5_sword', fixedItemId: 'master_sword', opened: false, locked: false
  });
  
  // Chest 2: Plate Mail - in bottom-left stairs room
  obstacles.push({
    x: 20 * TILE, y: 85 * TILE, w: TILE, h: TILE,
    type: 'chest', id: 'chest_l5_armor', fixedItemId: 'plate_mail', opened: false, locked: false
  });
  
  // Chest 3: Plate Boots - near water room
  obstacles.push({
    x: 165 * TILE, y: 55 * TILE, w: TILE, h: TILE,
    type: 'chest', id: 'chest_l5_boots', fixedItemId: 'plate_boots', opened: false, locked: false
  });
  
  // Chest 4: Heavy Shield - in central corridor
  obstacles.push({
    x: 60 * TILE, y: 60 * TILE, w: TILE, h: TILE,
    type: 'chest', id: 'chest_l5_shield', fixedItemId: 'heavy_shield', opened: false, locked: false
  });
  
  // Barrels scattered throughout
  obstacles.push({ x: 15 * TILE, y: 10 * TILE, w: TILE, h: TILE, type: 'barrel' });
  obstacles.push({ x: 75 * TILE, y: 35 * TILE, w: TILE, h: TILE, type: 'barrel' });
  obstacles.push({ x: 105 * TILE, y: 50 * TILE, w: TILE, h: TILE, type: 'barrel' });
  obstacles.push({ x: 55 * TILE, y: 85 * TILE, w: TILE, h: TILE, type: 'barrel' });
  
  // Boxes for cover and exploration
  obstacles.push({ x: 58 * TILE, y: 14 * TILE, w: TILE, h: TILE, type: 'box' });
  obstacles.push({ x: 95 * TILE, y: 45 * TILE, w: TILE, h: TILE, type: 'box' });
  obstacles.push({ x: 35 * TILE, y: 75 * TILE, w: TILE, h: TILE, type: 'box' });

  // Recruitable NPC: Cowsill — use canonical palette (bright blonde + black dress, feminine)
  const cowsillSheet = sheetForName('cowsill');
  // Place Cowsill in the bottom-center safe room
  const cowsillSpawn = LEVEL5_TEMPLE_FEATURES.npcSpawns[2]; // Third NPC spawn point
  const cowsillX = cowsillSpawn.x * TILE;
  const cowsillY = cowsillSpawn.y * TILE;
  const cowsill = spawnNpc(cowsillX, cowsillY, 'down', { 
    name: 'Cowsill', 
    dialogId: 'cowsill', 
    sheet: cowsillSheet, 
    portrait: 'assets/portraits/level05/Cowsill/Cowsill.mp4',
    affinity: 5,
    vnOnSight: { text: (introTexts && introTexts.cowsill) || 'Cowsill: "Hey there! Need a strike partner? Together we hit twice as hard!"' }
  });
  import('../data/dialogs.js').then(mod => { 
    if (mod.cowsillDialog) setNpcDialog(cowsill, mod.cowsillDialog); 
  }).catch(()=>{});

  return terrain;
}

// Level 6: Temple of Aurelion (Hub — cleaned, no combat)
export function loadLevel6() {
  // Keep a compact interior map for the hub for now
  world.tileW = 60; // ~960 px wide
  world.tileH = 40; // ~640 px tall
  try { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['level6_reached'] = true; } catch {}
  enemies.length = 0; npcs.length = 0; obstacles.length = 0; corpses.length = 0; stains.length = 0; floaters.length = 0; sparkles.length = 0; spawners.length = 0;

  // Place player near center
  player.x = Math.floor(world.w * 0.5);
  player.y = Math.floor(world.h * 0.65);
  for (let i = 0; i < companions.length; i++) { const c = companions[i]; c.x = player.x + 12 * (i + 1); c.y = player.y + 8 * (i + 1); }

  // Clean marble interior (placeholder until clean map JSON is provided)
  const terrain = buildTerrainBitmap(world, 'city'); // neutral stone base
  const t = 8;
  const rw = TILE * 40, rh = TILE * 24; // main hall
  const rx = Math.round((world.w - rw) / 2);
  const ry = Math.round((world.h - rh) / 2);
  const add = (x,y,w,h,type='wall',extra={}) => obstacles.push(Object.assign({ x, y, w, h, type, blocksAttacks: type==='wall' || type==='marble' }, extra));
  // Perimeter marble walls
  // Top wall with a large central opening so you can exit the hall
  const openingW = TILE * 10; // wide doorway
  const openingX = rx + Math.floor((rw - openingW) / 2);
  // Left/top segment
  add(rx, ry, Math.max(0, openingX - rx), t, 'marble');
  // Right/top segment
  add(openingX + openingW, ry, Math.max(0, (rx + rw) - (openingX + openingW)), t, 'marble');
  add(rx, ry + rh - t, rw, t, 'marble'); // bottom
  add(rx, ry, t, rh, 'marble'); // left
  add(rx + rw - t, ry, t, rh, 'marble'); // right
  // Decorative columns
  const cols = [
    { x: rx + TILE * 6, y: ry + TILE * 6 }, { x: rx + TILE * 12, y: ry + TILE * 6 },
    { x: rx + TILE * 28, y: ry + TILE * 6 }, { x: rx + TILE * 34, y: ry + TILE * 6 },
    { x: rx + TILE * 6, y: ry + TILE * 16 }, { x: rx + TILE * 12, y: ry + TILE * 16 },
    { x: rx + TILE * 28, y: ry + TILE * 16 }, { x: rx + TILE * 34, y: ry + TILE * 16 },
  ];
  for (const c of cols) obstacles.push({ x: c.x, y: c.y, w: 12, h: 12, type: 'column', blocksAttacks: false });
  try { setMusicLocation('temple_heart'); } catch {}

  // Ell and Rose — centered pair in the main hall (Rose left of Ell)
  const centerX = rx + rw/2 - 6;
  const centerY = ry + Math.round(rh/2) - 8;
  const sisterX = centerX + TILE; const sisterY = centerY;
  const sisterPalette = { hair: '#e8d18b', longHair: true, dress: true, dressColor: '#ffffff', shirt: '#f0f0f0', feminineShape: true };
  const sisterSheet = makeSpriteSheet(sisterPalette);
  const sister = spawnNpc(sisterX, sisterY, 'down', { name: 'Ell', dialogId: 'villager', sheet: sisterSheet, sheetPalette: sisterPalette, portrait: 'assets/portraits/level06/Ell/Ell.mp4', affinity: 6 });
  import('../data/dialogs.js').then(mod => {
    // Placeholder: simple gratitude line; can be replaced with a bespoke tree later
    if (mod && mod.villagerDialog) setNpcDialog(sister, mod.villagerDialog);
  }).catch(()=>{});
  // Floor halos under Rose and Ell (non-blocking decorative)
  obstacles.push({ x: centerX - TILE - 2, y: centerY + 6, w: 16, h: 6, type: 'sun', blocksAttacks: false });
  obstacles.push({ x: centerX + TILE - 2, y: centerY + 6, w: 16, h: 6, type: 'sun', blocksAttacks: false });

  // Rose — Queen of Aurelion (non-companion), elegant and stately
  try {
    const roseX = centerX - TILE; const roseY = centerY;
    const roseSheet = sheetForName('rose');
    const rose = spawnNpc(roseX, roseY, 'down', { name: 'Rose', dialogId: 'rose', sheet: roseSheet, portrait: 'assets/portraits/level06/Rose/Rose.mp4', vnOnSight: { text: (introTexts && introTexts.rose) || 'Rose: Your sovereign thanks you for liberating Aurelion.' } });
    import('../data/dialogs.js').then(mod => { if (mod.roseDialog) setNpcDialog(rose, mod.roseDialog); }).catch(()=>{});
  } catch {}

  // Place all companion NPCs around the hall as non-recruit hub characters
  const placeNpc = (name, x, y, dir, opts = {}) => {
    const sheet = sheetForName(name);
    return spawnNpc(x, y, dir || 'down', Object.assign({ name, sheet, portrait: opts.portrait || null }, opts));
  };
  const inParty = (name) => companions.some(c => (c.name || '').toLowerCase().includes(String(name||'').toLowerCase()));
  // Convenient anchors around the main hall
  const midY = ry + rh/2 - 8;
  const topY = ry + TILE * 5;
  const botY = ry + rh - TILE * 5 - 16;
  const leftX = rx + TILE * 6;
  const rightX = rx + rw - TILE * 6 - 12;
  const midX = rx + rw/2 - 6;

  // Row near the top: Canopy, Yorna, Hola
  let canopy = null, yorna = null, hola = null;
  if (!inParty('canopy')) { canopy = placeNpc('Canopy', leftX, topY, 'right', { portrait: 'assets/portraits/level01/Canopy/Canopy video.mp4', dialogId: 'canopy' }); setNpcDialog(canopy, canopyDialog); }
  if (!inParty('yorna'))  { yorna  = placeNpc('Yorna',  midX - TILE * 4, topY, 'down', { portrait: 'assets/portraits/level01/Yorna/Yorna video.mp4', dialogId: 'yorna' }); setNpcDialog(yorna, yornaDialog); }
  if (!inParty('hola'))   { hola   = placeNpc('Hola',   rightX, topY, 'left', { portrait: 'assets/portraits/level01/Hola/Hola video.mp4', dialogId: 'hola' }); setNpcDialog(hola,  holaDialog); }

  // Middle row: Oyin, Twil, Tin, Nellis
  const oyin   = inParty('oyin')   ? null : placeNpc('Oyin',  leftX + TILE * 2, midY, 'right', { portrait: 'assets/portraits/level02/Oyin/Oyin.mp4', dialogId: 'oyin' });
  const twil   = inParty('twil')   ? null : placeNpc('Twil',  midX - TILE * 8,  midY + TILE * 1, 'right', { portrait: 'assets/portraits/level02/Twil/Twil.mp4', dialogId: 'twil' });
  const tin    = inParty('tin')    ? null : placeNpc('Tin',   midX + TILE * 4,  midY + TILE * 1, 'left',  { portrait: 'assets/portraits/level03/Tin/Tin.mp4', dialogId: 'tin' });
  const nellis = inParty('nellis') ? null : placeNpc('Nellis', rightX - TILE * 2, midY, 'left',  { portrait: 'assets/portraits/level03/Nellis/Nellis.mp4', dialogId: 'nellis' });

  // Bottom row right: Urn and Varabella next to each other
  const urnX = midX + TILE * 6; const varaX = urnX + 18;
  const urn  = inParty('urn') ? null : placeNpc('Urn', urnX, botY, 'right', { portrait: 'assets/portraits/level04/Urn/Urn.mp4', dialogId: 'urn' });
  const vara = inParty('varabella') ? null : placeNpc('Varabella', varaX, botY, 'left', { portrait: 'assets/portraits/level04/Varabella/Varabella.mp4', dialogId: 'varabella' });

  // Bottom row left: Cowsill (from L5)
  const cowsill = inParty('cowsill') ? null : placeNpc('Cowsill', leftX, botY, 'right', { portrait: 'assets/portraits/level05/Cowsill/Cowsill.mp4', dialogId: 'cowsill' });

  // Attach dialogs for companions loaded lazily
  import('../data/dialogs.js').then(mod => {
    if (oyin && mod.oyinDialog) setNpcDialog(oyin, mod.oyinDialog);
    if (twil && mod.twilDialog) setNpcDialog(twil, mod.twilDialog);
    if (tin && mod.tinDialog) setNpcDialog(tin, mod.tinDialog);
    if (nellis && mod.nellisDialog) setNpcDialog(nellis, mod.nellisDialog);
    if (urn && mod.urnDialog) setNpcDialog(urn, mod.urnDialog);
    if (vara && mod.varabellaDialog) setNpcDialog(vara, mod.varabellaDialog);
    if (cowsill && mod.cowsillDialog) setNpcDialog(cowsill, mod.cowsillDialog);
  }).catch(()=>{});

  return terrain;
}
