import { world, player, enemies, companions, npcs, obstacles, corpses, stains, floaters, sparkles, runtime } from './state.js';
import { buildObstacles, buildTerrainBitmap } from './terrain.js';
import { makeSpriteSheet } from './sprites.js';
import { spawnEnemy, spawnNpc } from './state.js';
import { TILE } from './constants.js';
import { setNpcDialog } from './dialog.js';
import { canopyDialog, yornaDialog, holaDialog } from '../data/dialogs.js';
import { clearArenaInteriorAndGate } from './arena.js';
import { introTexts } from '../data/intro_texts.js';

// Returns a new terrain bitmap after building the level.
export function loadLevel2() {
  // Resize world for level 2
  world.tileW = 120;
  world.tileH = 70;
  // Mark progression flag for gating dialog/quests
  try { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['level2_reached'] = true; } catch {}
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
    // Level 2 mooks: modest HP bump + small dmg bump
    spawnEnemy(bx, by, 'mook', { hp: 5, dmg: 4 });
  }
  // Two featured foes, also well outside the initial camera view
  spawnEnemy(player.x + 320, player.y - 220, 'featured', { hp: 10, dmg: 5 });
  spawnEnemy(player.x - 340, player.y + 240, 'featured', { hp: 10, dmg: 5 });

  // Chests and breakables (desert) — spaced around player
  obstacles.push({ x: Math.round(player.x + TILE * 14), y: Math.round(player.y - TILE * 10), w: 12, h: 10, type: 'chest', id: 'chest_l2_armor', fixedItemId: 'armor_chain', opened: false, locked: false });
  obstacles.push({ x: Math.round(player.x - TILE * 18), y: Math.round(player.y + TILE * 8), w: 12, h: 12, type: 'barrel', id: 'brk_l2_a', hp: 2 });
  obstacles.push({ x: Math.round(player.x + TILE * 10), y: Math.round(player.y + TILE * 12), w: 12, h: 12, type: 'crate', id: 'brk_l2_b', hp: 2 });

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
    name: 'Nethra',
    portrait: 'assets/portraits/Nethra/Nethra.mp4',
    portraitPowered: 'assets/portraits/Nethra/Nethra powered.mp4',
    portraitDefeated: 'assets/portraits/Nethra/Nethra defeated.mp4',
    onDefeatNextLevel: 3,
    // Level 2 boss: HP and contact damage bump
    hp: 40,
    dmg: 9,
    vnOnSight: { text: introTexts.nethra },
  });
  // Four mooks inside the arena with Nethra
  spawnEnemy(cx - 24, cy, 'mook', { hp: 5, dmg: 4 });
  spawnEnemy(cx + 24, cy, 'mook', { hp: 5, dmg: 4 });
  spawnEnemy(cx, cy - 24, 'mook', { hp: 5, dmg: 4 });
  spawnEnemy(cx, cy + 24, 'mook', { hp: 5, dmg: 4 });
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
      // Level 2 featured foe: higher HP and dmg
      hp: 18,
      dmg: 5,
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
  // Mark progression flag for gating dialog/quests
  try { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['level3_reached'] = true; } catch {}
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
  for (let k = 0; k < 6; k++) { const bx = Math.round(player.x + (Math.random() * 400 - 200)); const by = Math.round(player.y + (Math.random() * 300 - 150)); spawnEnemy(bx, by, 'mook', { hp: 7, dmg: 5 }); }

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
  spawnEnemy(wx, wy, 'featured', { name: 'Wight', portrait: 'assets/portraits/Wight/Wight.mp4', vnOnSight: { text: introTexts.wight }, guaranteedDropId: 'key_reed', sheet: wightSheet, hp: 16, dmg: 6 });

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
    name: 'Luula',
    vnOnSight: { text: introTexts.luula },
    sheet: luulaSheet,
    portrait: 'assets/portraits/Luula/Luula.mp4',
    portraitPowered: 'assets/portraits/Luula/Luula powered.mp4',
    portraitDefeated: 'assets/portraits/Luula/Luula defeated.mp4',
    onDefeatNextLevel: 4,
    hp: 50,
    dmg: 10,
  });
  // A couple of mooks near Luula
  spawnEnemy(cx - 24, cy, 'mook', { hp: 7, dmg: 5 });
  spawnEnemy(cx + 24, cy, 'mook', { hp: 7, dmg: 5 });

  // Recruitable NPCs: Tin & Nellis
  const tinSheet = makeSpriteSheet({ hair: '#6fb7ff', longHair: true, dress: true, dressColor: '#4fa3ff', shirt: '#bfdcff' });
  const nellisSheet = makeSpriteSheet({ hair: '#a15aff', longHair: true, dress: true, dressColor: '#f5f5f5', shirt: '#e0e0e0' });
  const tin = spawnNpc(player.x - 140, player.y - 80, 'right', { name: 'Tin', sheet: tinSheet, portrait: 'assets/portraits/Tin/Tin.mp4', vnOnSight: { text: introTexts.tin } });
  const nel = spawnNpc(player.x + 100, player.y + 140, 'left', { name: 'Nellis', sheet: nellisSheet, portrait: 'assets/portraits/Nellis/Nellis.mp4', vnOnSight: { text: introTexts.nellis } });
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
  enemies.length = 0; npcs.length = 0; obstacles.length = 0; corpses.length = 0; stains.length = 0; floaters.length = 0; sparkles.length = 0;
  // Place player near center and gather companions near
  player.x = Math.floor(world.w / 2);
  player.y = Math.floor(world.h / 2);
  for (let i = 0; i < companions.length; i++) { const c = companions[i]; c.x = player.x + 12 * (i + 1); c.y = player.y + 8 * (i + 1); }

  // Build ruined city terrain and obstacles
  // Use default theme (greens/stone) and procedural obstacles; arena walls form the city plaza
  const terrain = buildTerrainBitmap(world, 'default');
  obstacles.push(...buildObstacles(world, player, enemies, npcs, 'default'));

  // Scatter a few enemy mooks around (off-camera)
  for (let k = 0; k < 6; k++) {
    const bx = Math.round(player.x + (Math.random() * 400 - 200));
    const by = Math.round(player.y + (Math.random() * 300 - 150));
    // Level 4 mooks: larger HP bump
    spawnEnemy(bx, by, 'mook', { hp: 9, dmg: 6 });
  }

  // Featured foe: Blurb — drops City Sigil Key
  const blurbX = player.x - 200, blurbY = player.y - 120;
  const blurbSheet = makeSpriteSheet({
    // Green grotesque tinting, similar to Gorg/Aarg/Wight style overrides
    skin: '#6fdd6f',
    hair: '#0a2a0a',
    longHair: false,
    dress: false,
    shirt: '#4caf50',
    pants: '#2e7d32',
    outline: '#000000'
  });
  spawnEnemy(blurbX, blurbY, 'featured', {
    name: 'Blurb', sheet: blurbSheet,
    portrait: 'assets/portraits/Blurb/Blurb.mp4',
    vnOnSight: { text: (introTexts && introTexts.blurb) || 'Blurb: Glub-glub… key mine!' },
    guaranteedDropId: 'key_sigil', hp: 18, dmg: 6
  });

  // Boss arena (city plaza) with a top gate requiring Iron Sigil
  const rw = TILE * 12, rh = TILE * 8, t = 8;
  const rx = Math.max(TILE * 6, Math.min(world.w - rw - TILE * 6, player.x + 260));
  const ry = Math.max(TILE * 6, Math.min(world.h - rh - TILE * 6, player.y + 140));
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
  // Locked gate requires key_sigil
  obstacles.push({ x: gapX, y: ry, w: gapW, h: t, type: 'gate', id: 'city_gate', keyId: 'key_sigil', locked: true, blocksAttacks: true });

  // Boss: Vanificia inside arena
  const cx = rx + rw/2 - 6; const cy = ry + rh/2 - 8;
  const vaniSheet = makeSpriteSheet({ hair: '#8a3dff', longHair: true, dress: true, dressColor: '#2a123a', shirt: '#4a2a6b', outline: '#000000' });
  spawnEnemy(cx, cy, 'boss', {
    name: 'Vanificia', sheet: vaniSheet,
    vnOnSight: { text: (introTexts && introTexts.vanificia) || 'Vanificia: You trespass in Urathar\'s city. Kneel, or be unmade.' },
    portrait: 'assets/portraits/Vanificia/Vanificia.mp4',
    portraitPowered: 'assets/portraits/Vanificia/Vanificia powered.mp4',
    portraitDefeated: 'assets/portraits/Vanificia/Vanificia defeated.mp4',
    hp: 60,
    dmg: 11,
  });
  // Guards near the boss
  spawnEnemy(cx - 24, cy, 'mook', { hp: 9, dmg: 6 });
  spawnEnemy(cx + 24, cy, 'mook', { hp: 9, dmg: 6 });

  // Recruitable NPCs: Urn & Varabella
  const urnSheet = makeSpriteSheet({ hair: '#4fa36b', longHair: true, dress: true, dressColor: '#3a7f4f', shirt: '#9bd6b0' });
  const varaSheet = makeSpriteSheet({ hair: '#d14a24', longHair: true, dress: true, dressColor: '#1a1a1a', shirt: '#4a4a4a' });
  const urn = spawnNpc(player.x - 140, player.y + 100, 'up', { name: 'Urn', sheet: urnSheet, portrait: 'assets/portraits/Urn/Urn.mp4', affinity: 5, vnOnSight: { text: (introTexts && introTexts.urn) || 'Urn: If you lead, I can keep pace.' } });
  const vara = spawnNpc(player.x + 140, player.y - 120, 'down', { name: 'Varabella', sheet: varaSheet, portrait: 'assets/portraits/Varabella/Varabella.mp4', affinity: 5, vnOnSight: { text: (introTexts && introTexts.varabella) || 'Varabella: Need a sharper eye and a steadier hand?' } });
  import('../data/dialogs.js').then(mod => { if (mod.urnDialog) setNpcDialog(urn, mod.urnDialog); if (mod.varabellaDialog) setNpcDialog(vara, mod.varabellaDialog); }).catch(()=>{});

  return terrain;
}
