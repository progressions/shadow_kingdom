// Modular bootstrap
import { canvas, ctx, setupChatInputHandlers } from './engine/ui.js';
import { world, camera, player, enemies, npcs, obstacles, spawnEnemy, spawnCompanion, spawnNpc, runtime } from './engine/state.js';
import { makeSpriteSheet } from './engine/sprites.js';
import { buildTerrainBitmap, buildObstacles } from './engine/terrain.js';
import { initInput } from './engine/input.js';
import { render } from './engine/render.js';
import { step } from './systems/step.js';
import { setNpcDialog } from './engine/dialog.js';
import { canopyDialog, yornaDialog, holaDialog } from './data/dialogs.js';
import { updatePartyUI } from './engine/ui.js';

// Initialize actors
spawnEnemy(world.w * 0.25, world.h * 0.5);
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
