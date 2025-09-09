import { world, player, enemies, companions, npcs, obstacles, corpses, stains, floaters, sparkles } from './state.js';
import { buildObstacles, buildTerrainBitmap } from './terrain.js';
import { makeSpriteSheet } from './sprites.js';
import { spawnEnemy, spawnNpc } from './state.js';
import { TILE } from './constants.js';
import { setNpcDialog } from './dialog.js';
import { canopyDialog, yornaDialog, holaDialog } from '../data/dialogs.js';
import { introTexts } from '../data/intro_texts.js';

// Returns a new terrain bitmap after building the level.
export function loadLevel2() {
  // Resize world for level 2
  world.tileW = 120;
  world.tileH = 70;
  // Clear dynamic arrays
  enemies.length = 0;
  npcs.length = 0;
  obstacles.length = 0;
  corpses.length = 0;
  stains.length = 0;
  floaters.length = 0;
  sparkles.length = 0;
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
  // New spawns for level 2
  // Space enemies farther from the player spawn so the immediate vicinity is calmer
  // A few mook packs in an annulus 280–460px away from player
  for (let k = 0; k < 6; k++) {
    const ang = Math.random() * Math.PI * 2;
    const r = 280 + Math.random() * 180; // 280–460 px
    const bx = Math.round(player.x + Math.cos(ang) * r);
    const by = Math.round(player.y + Math.sin(ang) * r);
    spawnEnemy(bx, by, 'mook');
  }
  // Two featured foes, also well outside the initial camera view
  spawnEnemy(player.x + 320, player.y - 220, 'featured');
  spawnEnemy(player.x - 340, player.y + 240, 'featured');

  // Chests and breakables (desert) — spaced around player
  obstacles.push({ x: Math.round(player.x + TILE * 14), y: Math.round(player.y - TILE * 10), w: 12, h: 10, type: 'chest', id: 'chest_l2_armor', fixedItemId: 'armor_chain', opened: false, locked: false });
  obstacles.push({ x: Math.round(player.x - TILE * 18), y: Math.round(player.y + TILE * 8), w: 12, h: 12, type: 'barrel', id: 'brk_l2_a', hp: 2 });
  obstacles.push({ x: Math.round(player.x + TILE * 10), y: Math.round(player.y + TILE * 12), w: 12, h: 12, type: 'crate', id: 'brk_l2_b', hp: 2 });

  // Boss arena (ruins ring) and Nethra spawn
  const rw = TILE * 12, rh = TILE * 8, t = 8;
  const rx = Math.max(TILE * 6, Math.min(world.w - rw - TILE * 6, player.x + 220));
  const ry = Math.max(TILE * 6, Math.min(world.h - rh - TILE * 6, player.y + 180));
  const add = (x,y,w,h,type='wall',extra={}) => obstacles.push(Object.assign({ x, y, w, h, type, blocksAttacks: type==='wall' }, extra));
  // Clear any procedural obstacles inside the arena footprint and where the gate opening will be
  (function clearArenaInteriorAndGap() {
    const inner = { x: rx + t, y: ry + t, w: rw - 2 * t, h: rh - 2 * t };
    const gapW = 24; // must match below
    const gapX = rx + (rw - gapW) / 2;
    const gapRect = { x: gapX, y: ry, w: gapW, h: t };
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i]; if (!o) continue;
      const r = { x: o.x, y: o.y, w: o.w, h: o.h };
      const intersects = !(r.x + r.w <= inner.x || r.x >= inner.x + inner.w || r.y + r.h <= inner.y || r.y >= inner.y + inner.h);
      const gapOverlap = !(r.x + r.w <= gapRect.x || r.x >= gapRect.x + gapRect.w || r.y + r.h <= gapRect.y || r.y >= gapRect.y + gapRect.h);
      if (intersects || gapOverlap) obstacles.splice(i, 1);
    }
  })();
  // Top wall with a central gap for the gate
  const gapW = 24;
  const gapX = rx + (rw - gapW) / 2;
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
    name: 'Nethra',
    portrait: 'assets/portraits/Nethra/Nethra.mp4',
    portraitPowered: 'assets/portraits/Nethra/Nethra powered.mp4',
    portraitDefeated: 'assets/portraits/Nethra/Nethra defeated.mp4',
    onDefeatNextLevel: 3,
    vnOnSight: { text: introTexts.nethra },
  });
  // Four mooks inside the arena with Nethra
  spawnEnemy(cx - 24, cy, 'mook');
  spawnEnemy(cx + 24, cy, 'mook');
  spawnEnemy(cx, cy - 24, 'mook');
  spawnEnemy(cx, cy + 24, 'mook');
  // Aarg — blue serpent featured foe outside, holding the ruin gate key (fully blue-tinted like Gorg was fully red)
  const aargSheet = makeSpriteSheet({
    skin: '#6fb3ff',
    hair: '#0a1b4a',
    longHair: false,
    dress: true,
    dressColor: '#274b9a',
    shirt: '#7aa6ff',
    pants: '#1b2e5a',
    outline: '#000000',
  });
  spawnEnemy(
    rx + rw/2 - 20,
    ry - TILE * 4,
    'featured',
    {
      name: 'Aarg',
      sheet: aargSheet,
      portrait: 'assets/portraits/Aarg/Aarg.mp4',
      vnOnSight: { text: introTexts.aarg },
      guaranteedDropId: 'key_nethra',
      hp: 14,
      dmg: 4,
    }
  );
  // Player remains at initial center spawn; companions already placed near player above

  // New recruitable companions for level 2: Oyin and Twil
  // Appearances: Oyin (blonde hair, green dress), Twil (red hair, black dress)
  const oyinSheet = makeSpriteSheet({ hair: '#e8d18b', longHair: true, dress: true, dressColor: '#2ea65a', shirt: '#b7f0c9' });
  const twilSheet = makeSpriteSheet({ hair: '#d14a24', longHair: true, dress: true, dressColor: '#1a1a1a', shirt: '#4a4a4a' });
  // Place Oyin/Twil away from initial camera so VN intros don't trigger immediately
  const off = 240; // px offset to ensure out of view (camera ~160x90 half extents)
  const oyinX = Math.max(0, Math.min(world.w - 12, player.x - off));
  const oyinY = Math.max(0, Math.min(world.h - 16, player.y - off)); // upper-left quadrant
  const twilX = Math.max(0, Math.min(world.w - 12, player.x - off));
  const twilY = Math.max(0, Math.min(world.h - 16, player.y + off)); // lower-left quadrant
  const oyin = spawnNpc(oyinX, oyinY, 'right', { name: 'Oyin', sheet: oyinSheet, portrait: 'assets/portraits/Oyin/Oyin.mp4', vnOnSight: { text: introTexts.oyin } });
  const twil = spawnNpc(twilX, twilY, 'left', { name: 'Twil', sheet: twilSheet, portrait: 'assets/portraits/Twil/Twil.mp4', vnOnSight: { text: introTexts.twil } });
  // Attach basic recruit dialogs
  import('../data/dialogs.js').then(mod => { setNpcDialog(oyin, mod.oyinDialog); setNpcDialog(twil, mod.twilDialog); }).catch(()=>{});

  return terrain;
}

// Level 3: Watery Marsh
export function loadLevel3() {
  // Resize world for level 3
  world.tileW = 130;
  world.tileH = 80;
  enemies.length = 0; npcs.length = 0; obstacles.length = 0; corpses.length = 0; stains.length = 0; floaters.length = 0; sparkles.length = 0;
  // Place player near center
  player.x = Math.floor(world.w / 2);
  player.y = Math.floor(world.h / 2);
  for (let i = 0; i < companions.length; i++) { const c = companions[i]; c.x = player.x + 12 * (i + 1); c.y = player.y + 8 * (i + 1); }
  // Build marsh terrain and obstacles
  const terrain = buildTerrainBitmap(world, 'marsh');
  obstacles.push(...buildObstacles(world, player, enemies, npcs, 'marsh'));
  // Add a few large water pools (blocking)
  const pools = [
    { x: player.x + 120, y: player.y - 60, w: TILE * 10, h: TILE * 6 },
    { x: player.x - 200, y: player.y + 100, w: TILE * 12, h: TILE * 7 },
    { x: player.x - 260, y: player.y - 140, w: TILE * 8, h: TILE * 5 },
  ];
  for (const p of pools) obstacles.push({ x: Math.max(0, Math.min(world.w - TILE, p.x)), y: Math.max(0, Math.min(world.h - TILE, p.y)), w: p.w, h: p.h, type: 'water', blocksAttacks: true });

  // Spawns
  for (let k = 0; k < 6; k++) { const bx = Math.round(player.x + (Math.random() * 400 - 200)); const by = Math.round(player.y + (Math.random() * 300 - 150)); spawnEnemy(bx, by, 'mook'); }

  // Chests and breakables (marsh) — spaced around player
  obstacles.push({ x: Math.round(player.x - TILE * 16), y: Math.round(player.y - TILE * 12), w: 12, h: 10, type: 'chest', id: 'chest_l3_helm', fixedItemId: 'helm_iron', opened: false, locked: false });
  obstacles.push({ x: Math.round(player.x + TILE * 12), y: Math.round(player.y - TILE * 8), w: 12, h: 12, type: 'barrel', id: 'brk_l3_a', hp: 2 });
  obstacles.push({ x: Math.round(player.x - TILE * 10), y: Math.round(player.y + TILE * 14), w: 12, h: 12, type: 'crate', id: 'brk_l3_b', hp: 2 });

  // Featured foe: Wight — drops Reed Key (bone-white override like Gorg/Aarg)
  const wx = player.x + 180, wy = player.y - 120;
  const wightSheet = makeSpriteSheet({
    skin: '#f5f5f5',
    hair: '#e6e6e6',
    shirt: '#cfcfcf',
    pants: '#9e9e9e',
    outline: '#000000',
    longHair: false,
    dress: false,
  });
  spawnEnemy(wx, wy, 'featured', { name: 'Wight', portrait: 'assets/portraits/Wight/Wight.mp4', vnOnSight: { text: introTexts.wight }, guaranteedDropId: 'key_reed', sheet: wightSheet, hp: 12, dmg: 4 });

  // Boss arena (island with gate requiring Reed Key)
  const rw = TILE * 12, rh = TILE * 8, t = 8; const rx = Math.max(TILE * 6, Math.min(world.w - rw - TILE * 6, player.x + 260)); const ry = Math.max(TILE * 6, Math.min(world.h - rh - TILE * 6, player.y + 160));
  const add = (x,y,w,h,type='wall',extra={}) => obstacles.push(Object.assign({ x, y, w, h, type, blocksAttacks: type==='wall' }, extra));
  const gapW = 24; const gapX = rx + (rw - gapW) / 2;
  // Clear any procedural obstacles inside the arena footprint and in the gate opening
  (function clearArena2InteriorAndGap() {
    const inner = { x: rx + t, y: ry + t, w: rw - 2 * t, h: rh - 2 * t };
    const gapRect = { x: gapX, y: ry, w: gapW, h: t };
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i]; if (!o) continue;
      const r = { x: o.x, y: o.y, w: o.w, h: o.h };
      const intersects = !(r.x + r.w <= inner.x || r.x >= inner.x + inner.w || r.y + r.h <= inner.y || r.y >= inner.y + inner.h);
      const gapOverlap = !(r.x + r.w <= gapRect.x || r.x >= gapRect.x + gapRect.w || r.y + r.h <= gapRect.y || r.y >= gapRect.y + gapRect.h);
      if (intersects || gapOverlap) obstacles.splice(i, 1);
    }
  })();
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
    name: 'Luula',
    vnOnSight: { text: introTexts.luula },
    sheet: luulaSheet,
    portraitPowered: 'assets/portraits/Luula/Luula powered.mp4',
    portraitDefeated: 'assets/portraits/Luula/Luula defeated.mp4',
  });
  // A couple of mooks near Luula
  spawnEnemy(cx - 24, cy, 'mook');
  spawnEnemy(cx + 24, cy, 'mook');

  // Recruitable NPCs: Tin & Nellis
  const tinSheet = makeSpriteSheet({ hair: '#6fb7ff', longHair: true, dress: true, dressColor: '#4fa3ff', shirt: '#bfdcff' });
  const nellisSheet = makeSpriteSheet({ hair: '#a15aff', longHair: true, dress: true, dressColor: '#f5f5f5', shirt: '#e0e0e0' });
  const tin = spawnNpc(player.x - 140, player.y - 80, 'right', { name: 'Tin', sheet: tinSheet, portrait: 'assets/portraits/Tin/Tin.mp4', vnOnSight: { text: introTexts.tin } });
  const nel = spawnNpc(player.x + 100, player.y + 140, 'left', { name: 'Nellis', sheet: nellisSheet, portrait: 'assets/portraits/Nellis/Nellis.mp4', vnOnSight: { text: introTexts.nellis } });
  import('../data/dialogs.js').then(mod => { if (mod.tinDialog) setNpcDialog(tin, mod.tinDialog); if (mod.nellisDialog) setNpcDialog(nel, mod.nellisDialog); }).catch(()=>{});

  return terrain;
}
