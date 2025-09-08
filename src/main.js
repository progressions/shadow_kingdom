// Modular bootstrap
import { canvas, ctx, setupChatInputHandlers } from './engine/ui.js';
import { world, camera, player, enemies, npcs, obstacles, spawnEnemy, spawnCompanion, spawnNpc, runtime } from './engine/state.js';
import { companionSheets } from './engine/sprites.js';
import { buildTerrainBitmap, buildObstacles } from './engine/terrain.js';
import { initInput } from './engine/input.js';
import { render } from './engine/render.js';
import { step } from './systems/step.js';

// Initialize actors
spawnEnemy(world.w * 0.25, world.h * 0.5);
spawnNpc(world.w * 0.75, world.h * 0.5, 'left');
spawnCompanion(player.x - 10, player.y + 10, companionSheets[0]);
spawnCompanion(player.x - 16, player.y + 18, companionSheets[1]);
spawnCompanion(player.x - 22, player.y + 26, companionSheets[2]);

// Build terrain and obstacles
const terrain = buildTerrainBitmap(world);
obstacles.push(...buildObstacles(world, player, enemies, npcs));

// Input and UI
setupChatInputHandlers(runtime);
initInput();

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

