// Modular bootstrap
import { canvas, ctx, setupChatInputHandlers } from './engine/ui.js';
import { world, camera, player, enemies, npcs, obstacles, spawnEnemy, spawnCompanion, spawnNpc, runtime } from './engine/state.js';
import { makeSpriteSheet } from './engine/sprites.js';
import { buildTerrainBitmap, buildObstacles } from './engine/terrain.js';
import { initInput } from './engine/input.js';
import { render } from './engine/render.js';
import { step } from './systems/step.js';
import { setNpcDialog } from './engine/dialog.js';
import { canopyDialog } from './data/dialogs.js';
import { updatePartyUI } from './engine/ui.js';

// Initialize actors
spawnEnemy(world.w * 0.25, world.h * 0.5);
// Example NPC with portrait (place your image at assets/portraits/Canopy.png)
const canopySheet = makeSpriteSheet({ hair: '#e8d18b', longHair: true, dress: true, dressColor: '#ffc8e0', shirt: '#ffdbe8' });
const canopy = spawnNpc(world.w * 0.75, world.h * 0.5, 'left', { name: 'Canopy', portrait: 'assets/portraits/Canopy.png', sheet: canopySheet });
setNpcDialog(canopy, canopyDialog);
// Start with zero companions

// Build terrain and obstacles
const terrain = buildTerrainBitmap(world);
obstacles.push(...buildObstacles(world, player, enemies, npcs));

// Input and UI
setupChatInputHandlers(runtime);
initInput();
updatePartyUI([]);

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
