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
import { updatePartyUI } from './engine/ui.js';

// Initialize enemies (7 mooks, 2 featured foes, 1 boss)
// Mooks
spawnEnemy(world.w * 0.20, world.h * 0.20, 'mook');
spawnEnemy(world.w * 0.30, world.h * 0.60, 'mook');
spawnEnemy(world.w * 0.75, world.h * 0.50, 'mook');
spawnEnemy(world.w * 0.50, world.h * 0.25, 'mook');
spawnEnemy(world.w * 0.50, world.h * 0.75, 'mook');
spawnEnemy(world.w * 0.80, world.h * 0.20, 'mook');
spawnEnemy(world.w * 0.80, world.h * 0.80, 'mook');
// Featured foes
spawnEnemy(world.w * 0.35, world.h * 0.35, 'featured');
spawnEnemy(world.w * 0.65, world.h * 0.65, 'featured');
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
  const add = (x, y, w, h) => obstacles.push({ x, y, w, h, type: 'wall', blocksAttacks: true });
  // top left and right segments
  add(cx, cy, gapX - cx, t);
  add(gapX + gap, cy, (cx + cw) - (gapX + gap), t);
  // bottom wall
  add(cx, cy + ch - t, cw, t);
  // left and right walls
  add(cx, cy, t, ch);
  add(cx + cw - t, cy, t, ch);
  return { x: cx, y: cy, w: cw, h: ch, gapX, gapW: gap };
})();
// Boss at center of castle interior
spawnEnemy(castle.x + castle.w / 2 - 6, castle.y + castle.h / 2 - 8, 'boss');
// NPCs with portraits (place your images at assets/portraits/*.png)
// Place them near the starting area
// Canopy: brown hair, feminine look, pink dress
const canopySheet = makeSpriteSheet({ hair: '#6b3f2b', longHair: true, dress: true, dressColor: '#ff77c8', shirt: '#ffd3ea' });
const canopy = spawnNpc(player.x + 56, player.y + 8, 'left', { name: 'Canopy', portrait: 'assets/portraits/Canopy.png', sheet: canopySheet });
setNpcDialog(canopy, canopyDialog);

// Yorna: red hair, warm orange dress
const yornaSheet = makeSpriteSheet({ hair: '#d14a24', longHair: true, dress: true, dressColor: '#ff9a4a', shirt: '#ffd1a6' });
const yorna = spawnNpc(player.x - 72, player.y - 24, 'right', { name: 'Yorna', portrait: 'assets/portraits/Yorna.png', sheet: yornaSheet });
setNpcDialog(yorna, yornaDialog);

// Hola: black hair, cool blue dress
const holaSheet = makeSpriteSheet({ hair: '#1b1b1b', longHair: true, dress: true, dressColor: '#6fb7ff', shirt: '#bfe1ff' });
const hola = spawnNpc(player.x + 24, player.y + 72, 'up', { name: 'Hola', portrait: 'assets/portraits/Hola.png', sheet: holaSheet });
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
