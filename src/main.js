// Modular bootstrap
import { canvas, ctx, setupChatInputHandlers, setupTitleScreen, showTitleScreen, hideTitleScreen, rebuildTitleButtons } from './engine/ui.js';
import { world, camera, player, enemies, npcs, obstacles, spawnEnemy, spawnCompanion, spawnNpc, runtime } from './engine/state.js';
import { TILE } from './engine/constants.js';
import { makeSpriteSheet } from './engine/sprites.js';
import { buildTerrainBitmap, buildObstacles } from './engine/terrain.js';
import { initInput } from './engine/input.js';
import { render } from './engine/render.js';
import { step } from './systems/step.js';
import { setNpcDialog, startPrompt, startSaveMenu } from './engine/dialog.js';
import { canopyDialog, yornaDialog, holaDialog } from './data/dialogs.js';
import { introTexts } from './data/intro_texts.js';
import { updatePartyUI, fadeTransition, updateQuestHint, exitChat, showLevelTitle, levelNameFor, initMinimap, updateMinimap, showPersistentBanner, hideBanner } from './engine/ui.js';
import { applyPendingRestore } from './engine/save_core.js';
import { loadGame, getSaveMeta } from './engine/save.js';
import { loadLevel1, loadLevel2, loadLevel3, loadLevel4, loadLevel5, loadLevel6, LEVEL_LOADERS } from './engine/levels.js';

// Initial level: use loader registry (Level 1 by default)
let terrain = loadLevel1();
try { initMinimap(); } catch {}
try { showLevelTitle(levelNameFor(1)); } catch {}

// Input and UI
setupChatInputHandlers(runtime);
initInput();
updatePartyUI([]);

// Use user's single-frame 16×16 sprite at assets/sprites/custom/player.png
try { player.spriteId = 'assets/sprites/custom/player'; } catch {}

// Title screen setup: show image, then fade-in menu
function startIntroScene() {
  try {
    if (!runtime.questFlags) runtime.questFlags = {};
    if (!runtime.questFlags['intro_scene_done']) {
      runtime.questFlags['intro_scene_done'] = true;
      const canopy = npcs.find(n => (n?.name || '').toLowerCase().includes('canopy')) || null;
      const canopyIntroActor = canopy
        ? { name: 'Canopy', x: canopy.x, y: canopy.y, w: canopy.w, h: canopy.h, portraitSrc: 'assets/portraits/level01/Canopy/Canopy scared.mp4' }
        : { name: 'Canopy', portraitSrc: 'assets/portraits/level01/Canopy/Canopy scared.mp4' };
      const lines = [
        { actor: null, text: 'You jolt awake. The desk is gone. The classroom is gone. Your cheek still remembers wood grain, but the air smells like pine and iron. It\'s dark between the trees—and your hand is wrapped around a torch, cold and unlit.' },
        { actor: null, text: 'The grove around you is torn—scuffed earth, snapped reeds, a smear of blood. You look down: your clothes aren\'t yours. Native garb. Sturdy boots. A knife scar on the belt.' },
        { actor: canopyIntroActor, text: 'Off in the distance, a blonde girl struggles against a soldier.', pan: true },
      ];
      // Show a persistent top banner hint to open inventory and equip a torch until the player opens it
      try { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['tutorial_inv_equip_torch'] = true; showPersistentBanner('Press I to open Inventory and equip a torch'); } catch {}
      if (!Array.isArray(runtime._queuedVNs)) runtime._queuedVNs = [];
      for (let i = 1; i < lines.length; i++) runtime._queuedVNs.push(lines[i]);
      const more = runtime._queuedVNs.length > 0;
      const choices = more ? [ { label: 'Continue', action: 'vn_continue' } ] : [];
      startPrompt(lines[0].actor, lines[0].text, choices);
    }
  } catch {}
}

// Show title and pause world until a selection is made
runtime.paused = true;
let continueSlot = null; // 'auto' or 1
setupTitleScreen({
  onContinue: () => {
    if (continueSlot == null) return; // disabled if none
    hideTitleScreen();
    runtime.paused = false;
    loadGame(continueSlot);
  },
  onNew: () => {
    hideTitleScreen();
    runtime.paused = false;
    // Safe spawn: brief invulnerability on new game so nearby enemies can't insta-hit
    try { player.invulnTimer = Math.max(player.invulnTimer || 0, 1.5); } catch {}
    startIntroScene();
  },
  onLoad: () => {
    // Open the Save/Load interface to choose a slot to load
    hideTitleScreen();
    runtime.paused = false;
    startSaveMenu();
  }
});
showTitleScreen();

// Enable Continue if a recent save exists (check autosave and slot 1)
(async function enableContinueIfAvailable(){
  try {
    const [ma, m1] = await Promise.allSettled([ getSaveMeta('auto'), getSaveMeta(1) ]);
    const A = (ma.status === 'fulfilled') ? ma.value : { exists:false, at:null };
    const B = (m1.status === 'fulfilled') ? m1.value : { exists:false, at:null };
    let best = null;
    if (A && A.exists) best = { slot: 'auto', at: Number(A.at || 0) };
    if (B && B.exists) {
      const at1 = Number(B.at || 0);
      if (!best || at1 > best.at) best = { slot: 1, at: at1 };
    }
    if (best) {
      continueSlot = best.slot;
      const btn = document.getElementById('btn-continue');
      if (btn) { btn.disabled = false; }
      rebuildTitleButtons();
    }
  } catch {}
})();

// Safe spawn timer will be applied on New Game selection

// No turn-based battle; all combat is realtime.

// Main loop
camera.w = canvas.width; camera.h = canvas.height;
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  step(dt);
  try { updateQuestHint(); } catch {}
  // Track render suspension, but still allow level swap/restore to proceed
  const suspendRender = !!runtime._suspendRenderUntilRestore;
  // Handle pending level transitions after VN closes (runtime set in step.js)
  if (typeof runtime.pendingLevel === 'number' && runtime.pendingLevel > 0) {
    const lvl = runtime.pendingLevel;
    const doSwap = () => {
      const loader = LEVEL_LOADERS[lvl] || loadLevel1;
      terrain = loader();
      try { initMinimap(); } catch {}
      // Geometry-only: if a pending restore exists, strip default actors spawned by loader
      try { if (runtime && runtime._pendingRestore) { enemies.length = 0; npcs.length = 0; } } catch {}
      // Snap camera to player
      camera.x = Math.max(0, Math.min(world.w - camera.w, Math.round(player.x + player.w/2 - camera.w/2)));
      camera.y = Math.max(0, Math.min(world.h - camera.h, Math.round(player.y + player.h/2 - camera.h/2)));
      runtime.currentLevel = lvl;
      runtime.pendingLevel = null;
      // Apply pending save restore now that the level is loaded
      try { applyPendingRestore(); } catch {}
    };
    // Ensure any VN overlay is closed before transitioning
    if (runtime.gameState === 'chat') { try { exitChat(runtime); } catch {} }
    fadeTransition({ toBlackMs: 400, holdMs: 100, toClearMs: 400, during: () => { doSwap(); try { showLevelTitle(levelNameFor(lvl)); } catch {} } });
  }
  if (!suspendRender) render(terrain, obstacles);
  try { updateMinimap(); } catch {}
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Debug helpers (call from browser console):
try {
  // Enemy debug logs are opt-in; set in console if needed
  // window.DEBUG_ENEMIES = true;
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
