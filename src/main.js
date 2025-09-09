// Modular bootstrap
import { canvas, ctx, setupChatInputHandlers } from './engine/ui.js';
import { world, camera, player, enemies, npcs, obstacles, spawnEnemy, spawnCompanion, spawnNpc, runtime } from './engine/state.js';
import { TILE } from './engine/constants.js';
import { makeSpriteSheet } from './engine/sprites.js';
import { buildTerrainBitmap, buildObstacles } from './engine/terrain.js';
import { initInput } from './engine/input.js';
import { render } from './engine/render.js';
import { step } from './systems/step.js';
import { setNpcDialog } from './engine/dialog.js';
import { canopyDialog, yornaDialog, holaDialog } from './data/dialogs.js';
import { introTexts } from './data/intro_texts.js';
import { updatePartyUI } from './engine/ui.js';

// Initialize enemies positioned around the three NPCs
// Goal:
// - Canopy: closest to the player, with 1 mook near her
// - Hola: next closest, in a different location, with 4 mooks around her
// - Yorna: furthest, with 3 mooks and 1 featured foe near her
// - Keep the boss in the castle exactly as-is (see below)

// Choose relative positions from the player start to ensure distance ordering.
// Place Canopy just off-screen to the right at game start (still closer than Hola)
// Camera half-width is ~160px; +172 ensures she's initially not visible
const canopyPos = { x: Math.round(player.x + 172), y: Math.round(player.y - 10) };
const holaPos   = { x: Math.round(player.x + 140), y: Math.round(player.y + 100) };
const yornaPos  = { x: Math.round(player.x - 220), y: Math.round(player.y - 160) };

// Enemies near Canopy (1 mook), spaced a bit further
spawnEnemy(canopyPos.x + 28, canopyPos.y + 8, 'mook');

// Enemies near Hola (3 mooks, wider triangle)
spawnEnemy(holaPos.x - 36, holaPos.y - 16, 'mook');
spawnEnemy(holaPos.x + 36, holaPos.y - 16, 'mook');
spawnEnemy(holaPos.x + 0,  holaPos.y + 32, 'mook');

// Enemies near Yorna (3 mooks, wider spread + 1 featured)
spawnEnemy(yornaPos.x - 30,  yornaPos.y + 0,  'mook');
spawnEnemy(yornaPos.x + 30,  yornaPos.y + 0,  'mook');
spawnEnemy(yornaPos.x + 0,   yornaPos.y + 30, 'mook');
spawnEnemy(yornaPos.x + 36,  yornaPos.y + 28, 'featured');
// Boss — placed inside a small castle enclosure near bottom-right
const castle = (function buildCastle() {
  const cw = TILE * 14; // ~14 tiles wide
  const ch = TILE * 10; // ~10 tiles tall
  const t = 8;          // wall thickness in px
  const gap = 16;       // opening width
  const cx = Math.min(world.w - cw - TILE * 2, Math.max(TILE * 2, world.w * 0.82));
  const cy = Math.min(world.h - ch - TILE * 2, Math.max(TILE * 2, world.h * 0.78));
  // clear interior obstacles
  const inner = { x: cx + t, y: cy + t, w: cw - 2 * t, h: ch - 2 * t };
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    if (o.x < inner.x + inner.w && o.x + o.w > inner.x && o.y < inner.y + inner.h && o.y + o.h > inner.y) {
      obstacles.splice(i, 1);
    }
  }
  // walls (top with a centered gap)
  const gapX = cx + (cw - gap) / 2;
  const add = (x, y, w, h, type='wall', extra={}) => obstacles.push(Object.assign({ x, y, w, h, type, blocksAttacks: type==='wall' }, extra));
  // top left and right segments
  add(cx, cy, gapX - cx, t);
  add(gapX + gap, cy, (cx + cw) - (gapX + gap), t);
  // Gate in the opening (locked until key used by attacking it)
  add(gapX, cy, gap, t, 'gate', { locked: true, blocksAttacks: true, id: 'castle_gate', keyId: 'castle_gate' });
  // bottom wall
  add(cx, cy + ch - t, cw, t);
  // left and right walls
  add(cx, cy, t, ch);
  add(cx + cw - t, cy, t, ch);
  return { x: cx, y: cy, w: cw, h: ch, gapX, gapW: gap };
})();
// Boss at center of castle interior
spawnEnemy(
  castle.x + castle.w / 2 - 6,
  castle.y + castle.h / 2 - 8,
  'boss',
  {
    name: 'Vast',
    portrait: 'assets/portraits/Vast/Vast video.mp4',
    vnOnSight: { text: introTexts.vast },
  }
);
// NPCs with portraits (place your images at assets/portraits/*.png)
// Repositioned per request
// Canopy: closest to player
const canopySheet = makeSpriteSheet({ hair: '#6b3f2b', longHair: true, dress: true, dressColor: '#ff77c8', shirt: '#ffd3ea' });
const canopy = spawnNpc(canopyPos.x, canopyPos.y, 'left', {
  name: 'Canopy',
  portrait: 'assets/portraits/Canopy/Canopy video.mp4',
  sheet: canopySheet,
  vnOnSight: { text: introTexts.canopy },
});
setNpcDialog(canopy, canopyDialog);

// Yorna: furthest
const yornaSheet = makeSpriteSheet({ hair: '#d14a24', longHair: true, dress: true, dressColor: '#ff9a4a', shirt: '#ffd1a6' });
const yorna = spawnNpc(yornaPos.x, yornaPos.y, 'right', {
  name: 'Yorna',
  portrait: 'assets/portraits/Yorna/Yorna video.mp4',
  sheet: yornaSheet,
  vnOnSight: { text: introTexts.yorna },
});
setNpcDialog(yorna, yornaDialog);

// Hola: next closest in a different area
const holaSheet = makeSpriteSheet({ hair: '#1b1b1b', longHair: true, dress: true, dressColor: '#6fb7ff', shirt: '#bfe1ff' });
const hola = spawnNpc(holaPos.x, holaPos.y, 'up', {
  name: 'Hola',
  portrait: 'assets/portraits/Hola/Hola video.mp4',
  sheet: holaSheet,
  vnOnSight: { text: introTexts.hola },
});
setNpcDialog(hola, holaDialog);
// Start with zero companions

// Build terrain and obstacles
const terrain = buildTerrainBitmap(world);
obstacles.push(...buildObstacles(world, player, enemies, npcs));

// Input and UI
setupChatInputHandlers(runtime);
initInput();
updatePartyUI([]);

// Safe spawn: brief invulnerability on new game so nearby enemies can't insta-hit
player.invulnTimer = Math.max(player.invulnTimer || 0, 1.5);

// No turn-based battle; all combat is realtime.

// Main loop
camera.w = canvas.width; camera.h = canvas.height;
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  step(dt);
  render(terrain, obstacles);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
