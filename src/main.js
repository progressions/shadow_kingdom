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
import { updatePartyUI, fadeTransition, updateQuestHint, exitChat, showLevelTitle, levelNameFor } from './engine/ui.js';
import { applyPendingRestoreV2 } from './engine/save_v2.js';
import { loadLevel1, loadLevel2, loadLevel3, loadLevel4, loadLevel5, loadLevel6, LEVEL_LOADERS } from './engine/levels.js';

// Initial level: use loader registry (Level 1 by default)
let terrain = loadLevel1();
try { showLevelTitle(levelNameFor(1)); } catch {}

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
  try { updateQuestHint(); } catch {}
  // Avoid rendering default level spawns between a level swap and save restore
  if (runtime._suspendRenderUntilRestore) { requestAnimationFrame(loop); return; }
  // Handle pending level transitions after VN closes (runtime set in step.js)
  if (typeof runtime.pendingLevel === 'number' && runtime.pendingLevel > 0) {
    const lvl = runtime.pendingLevel;
    const doSwap = () => {
      const loader = LEVEL_LOADERS[lvl] || loadLevel1;
      terrain = loader();
      // Snap camera to player
      camera.x = Math.max(0, Math.min(world.w - camera.w, Math.round(player.x + player.w/2 - camera.w/2)));
      camera.y = Math.max(0, Math.min(world.h - camera.h, Math.round(player.y + player.h/2 - camera.h/2)));
      runtime.currentLevel = lvl;
      runtime.pendingLevel = null;
      // If a v2 load is waiting, apply it now that the level is loaded
      try { applyPendingRestoreV2(); } catch {}
    };
    // Ensure any VN overlay is closed before transitioning
    if (runtime.gameState === 'chat') { try { exitChat(runtime); } catch {} }
    fadeTransition({ toBlackMs: 400, holdMs: 100, toClearMs: 400, during: () => { doSwap(); try { showLevelTitle(levelNameFor(lvl)); } catch {} } });
  }
  render(terrain, obstacles);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Debug helpers (call from browser console):
try {
  // Enable enemy debug logs by default
  window.DEBUG_ENEMIES = true;
  window.gotoLevel2 = () => { runtime.pendingLevel = 2; };
  window.gotoLevel3 = () => { runtime.pendingLevel = 3; };
  window.gotoLevel4 = () => { runtime.pendingLevel = 4; };
  window.gotoLevel5 = () => { runtime.pendingLevel = 5; };
  window.gotoLevel1 = () => { runtime.pendingLevel = 1; };
  window.gotoLevel6 = () => { runtime.pendingLevel = 6; };
  window.centerOn = (x, y) => { camera.x = Math.max(0, Math.min(world.w - camera.w, Math.round(x - camera.w/2))); camera.y = Math.max(0, Math.min(world.h - camera.h, Math.round(y - camera.h/2))); };
  window.gotoEnemy = async (matcher) => {
    const S = await import('./engine/state.js');
    const enemies = S.enemies || [];
    let found = null;
    if (typeof matcher === 'string') {
      found = enemies.find(e => e && ((e.vnId && e.vnId === matcher) || ((e.name||'').toLowerCase().includes(matcher.toLowerCase()))));
    } else if (typeof matcher === 'function') {
      found = enemies.find(matcher);
    }
    if (found) {
      window.centerOn(found.x + found.w/2, found.y + found.h/2);
      return found;
    }
    return null;
  };
} catch {}

// Load lightweight debug tests (exposes window.testOpenedChestPersistence, window.testVnIntroCooldown)
try { import('./dev/light_tests.js').catch(()=>{}); } catch {}
