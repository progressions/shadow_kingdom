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
  // A few mook packs
  for (let k = 0; k < 6; k++) {
    const bx = Math.round(player.x + (Math.random() * 400 - 200));
    const by = Math.round(player.y + (Math.random() * 300 - 150));
    spawnEnemy(bx, by, 'mook');
  }
  // Two featured foes patrolling
  spawnEnemy(player.x + 140, player.y - 90, 'featured');
  spawnEnemy(player.x - 160, player.y + 110, 'featured');

  // Boss arena (ruins ring) and Nethra spawn
  const rw = TILE * 12, rh = TILE * 8, t = 8;
  const rx = Math.max(TILE * 6, Math.min(world.w - rw - TILE * 6, player.x + 220));
  const ry = Math.max(TILE * 6, Math.min(world.h - rh - TILE * 6, player.y + 180));
  const add = (x,y,w,h,type='wall',extra={}) => obstacles.push(Object.assign({ x, y, w, h, type, blocksAttacks: type==='wall' }, extra));
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
  spawnEnemy(cx, cy, 'boss', { name: 'Nethra', portrait: 'assets/portraits/Nethra/Nethra.mp4', vnOnSight: { text: introTexts.nethra } });
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
