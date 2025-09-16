import { world, player, enemies, companions, npcs, obstacles, corpses, stains, floaters, sparkles, runtime, spawners } from './state.js';
import { buildTerrainBitmap } from './terrain.js';
import { LEVEL5_TEMPLE_SIZE, LEVEL5_TEMPLE_FEATURES } from '../data/level5_temple_layout.js';
import { makeSpriteSheet, sheetForName } from './sprites.js';
import { setMusicLocation } from './audio.js';
import { spawnNpc, addItemToInventory } from './state.js';
import { TILE } from './constants.js';
import { setNpcDialog, startDialog } from './dialog.js';
import { canopyDialog, yornaDialog, holaDialog, snakeDialog } from '../data/dialogs.js';
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
  // Terrain placeholder; PNG map will overwrite geometry/assets asynchronously.
  const terrain = buildTerrainBitmap(world);
  // Level 1 defaults: start dim and equip a torch
  (function initDarkStart() {
    try {
      // Start fully dark in Level 1
      import('./lighting.js').then(m => m.setAmbientLevel(0)).catch(()=>{});
      // Give the player a small torch stack and equip a lit torch for visibility
      addItemToInventory(player.inventory, { id: 'torch', name: 'Torch', slot: 'leftHand', stackable: true, maxQty: 99, qty: 3 });
      // Do not auto-equip; torches begin unlit in the inventory
    } catch {}
  })();
  // PNG map (assets/maps/level_01.png) will populate the level; procedural fallback removed
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
  // Level 2: full daylight — set bright ambient lighting
  try { import('./lighting.js').then(m => m.setAmbientLevel(8)).catch(()=>{}); } catch {}

  // Trigger Level 2 feud (Canopy ↔ Yorna) immediately after companions are repositioned
  (function maybeStartCanopyYornaFeud() {
    try {
      const flags = (runtime.questFlags ||= {});
      if (flags['canopy_yorna_feud_resolved']) return; // already decided
      const lower = (s) => String(s || '').toLowerCase();
      const findBy = (key) => companions.find(c => lower(c?.name).includes(key));
      const canopyComp = findBy('canopy');
      const yornaComp = findBy('yorna');
      if (!canopyComp || !yornaComp) return;
      flags['canopy_yorna_feud_active'] = true;
      const vnActor = { name: 'Canopy & Yorna', portraitSrc: 'assets/portraits/level02/Canopy Yorna/Canopy Yorna.mp4' };
      const tree = {
        start: 'root',
        nodes: {
          root: {
            text: (
              "The tension between Yorna and Canopy has been building for miles. " +
              "Every decision has become a quiet struggle. Yorna pushes the pace, her frustration clear in her clipped movements. " +
              "Canopy urges caution, her disapproval shown in steady, deliberate slowness.\n\n" +
              "Now, they have stopped. The argument is no longer quiet.\n\n" +
              "Yorna: Chief, she is too slow. If we wait, we will be surrounded. We must attack now. You have to choose.\n" +
              "Canopy: My Lord, to attack without knowing what is there is a mistake. We will lose people. I cannot support a plan that is so careless."
            ),
            choices: [
              { label: 'Keep Canopy (Healer · Regeneration · Shield)', action: 'feud_keep_canopy' },
              { label: 'Keep Yorna (Frontliner · ATK · Reach)', action: 'feud_keep_yorna' },
            ],
          },
          kept_canopy: {
            text: "Yorna: Fine. I’ll step back. Call when you want to move faster.\nCanopy: My Lord, I’ll keep you standing. We go careful; we don’t lose people.",
            choices: [ { label: 'Continue', action: 'set_flag', data: { key: 'canopy_yorna_feud_resolved' }, next: 'end' } ],
          },
          kept_yorna: {
            text: "Canopy: I won’t walk behind that pace. I’ll step back.\nYorna: Good. We move now. Stay tight—I’ll make the openings.",
            choices: [ { label: 'Continue', action: 'set_flag', data: { key: 'canopy_yorna_feud_resolved' }, next: 'end' } ],
          },
          end: {
            text: '',
            choices: [ { label: 'Continue', action: 'vn_continue' } ],
          },
        },
      };
      runtime.lockOverlay = true;
      const actor = { name: vnActor.name, portraitSrc: vnActor.portraitSrc, dialog: tree };
      startDialog(actor);
    } catch {}
  })();

  // Recompute quest indicators (NPCs will be placed via the map legend)
  try { import('./quest_indicators.js').then(m => m.recomputeQuestIndicators && m.recomputeQuestIndicators()); } catch {}

  return terrain;
}

// Level 3: Watery Marsh
export function loadLevel3() {
  // Resize world for level 3
  world.tileW = 130;
  world.tileH = 80;
  // Dim the marsh: ~50% ambient light
  try { import('./lighting.js').then(m => m.setAmbientLevel(Math.floor((m.MAX_LIGHT_LEVEL || 8) * 0.5))).catch(()=>{}); } catch {}
  // Mark progression flag for gating dialog/quests
  try { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['level3_reached'] = true; } catch {}
  enemies.length = 0; npcs.length = 0; obstacles.length = 0; corpses.length = 0; stains.length = 0; floaters.length = 0; sparkles.length = 0; spawners.length = 0;
  // Place player near center
  player.x = Math.floor(world.w / 2);
  player.y = Math.floor(world.h / 2);
  for (let i = 0; i < companions.length; i++) { const c = companions[i]; c.x = player.x + 12 * (i + 1); c.y = player.y + 8 * (i + 1); }
  const terrain = buildTerrainBitmap(world, 'marsh');
  try { import('./quest_indicators.js').then(m => m.recomputeQuestIndicators && m.recomputeQuestIndicators()); } catch {}
  return terrain;
}

// Level 4: Ruined City — plaza arena with a portcullis gate keyed by Blurb's drop; boss Vanificia
export function loadLevel4() {
  // Resize world for level 4
  world.tileW = 140;
  world.tileH = 85;
  // Turn out the lights in the city: fully dark ambient
  try { import('./lighting.js').then(m => m.setAmbientLevel(0)).catch(()=>{}); } catch {}
  // Mark progression flag for gating dialog/quests
  try { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['level4_reached'] = true; } catch {}
  enemies.length = 0; npcs.length = 0; obstacles.length = 0; corpses.length = 0; stains.length = 0; floaters.length = 0; sparkles.length = 0; spawners.length = 0;
  player.x = Math.floor(world.w / 2);
  player.y = Math.floor(world.h / 2);
  for (let i = 0; i < companions.length; i++) { const c = companions[i]; c.x = player.x + 12 * (i + 1); c.y = player.y + 8 * (i + 1); }
  const terrain = buildTerrainBitmap(world, 'city');
  try { import('./quest_indicators.js').then(m => m.recomputeQuestIndicators && m.recomputeQuestIndicators()); } catch {}
  return terrain;
}

// Level 5: Temple District — dungeon layout with rooms and corridors
export function loadLevel5() {
  world.tileW = LEVEL5_TEMPLE_SIZE.tileW;
  world.tileH = LEVEL5_TEMPLE_SIZE.tileH;
  try { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['level5_reached'] = true; } catch {}
  enemies.length = 0; npcs.length = 0; obstacles.length = 0; corpses.length = 0; stains.length = 0; floaters.length = 0; sparkles.length = 0; spawners.length = 0;
  const spawnPoint = LEVEL5_TEMPLE_FEATURES.playerSpawn;
  player.x = spawnPoint.x * TILE;
  player.y = spawnPoint.y * TILE;
  for (let i = 0; i < companions.length; i++) { const c = companions[i]; c.x = player.x + 12 * (i + 1); c.y = player.y + 8 * (i + 1); }
  const terrain = buildTerrainBitmap(world, 'city');
  try { import('./quest_indicators.js').then(m => m.recomputeQuestIndicators && m.recomputeQuestIndicators()); } catch {}
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
  // Recompute quest indicators when entering the hub to refresh tags
  try { import('./quest_indicators.js').then(m => m.recomputeQuestIndicators && m.recomputeQuestIndicators()); } catch {}
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
