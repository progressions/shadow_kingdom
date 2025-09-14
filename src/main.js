// Modular bootstrap
import { canvas, ctx, setupChatInputHandlers, setupTitleScreen, showTitleScreen, hideTitleScreen, rebuildTitleButtons } from './engine/ui.js';
import { world, camera, player, enemies, npcs, obstacles, spawnEnemy, spawnCompanion, spawnNpc, runtime } from './engine/state.js';
import { TILE } from './engine/constants.js';
import { makeSpriteSheet } from './engine/sprites.js';
import { buildTerrainBitmap, buildObstacles, drawObstacles } from './engine/terrain.js';
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
import { AI_TUNING } from './data/ai_tuning.js';

// Initial level: use loader registry (Level 1 by default)
let terrain = loadLevel1();
try { initMinimap(); } catch {}
try { showLevelTitle(levelNameFor(1)); } catch {}
// If a PNG map is present for Level 1, apply it asynchronously using the provided color legend.
// The PNG should be 1 pixel per tile and live at assets/maps/level_01.png.
(async function tryApplyL1Png(){
  try {
    const url = 'assets/maps/level_01.png';
    const legend = {
      theme: 'default',
      colors: {
        // hex without leading '#'
        '49aa10': { type: 'grass' },
        '797979': { type: 'wall' },
        'a2a2a2': { type: 'rock' },
        '386d00': { type: 'tree' },
        '4161fb': { type: 'water' },
      },
    };
    const M = await import('./engine/map_loader.js');
    const t = await M.applyPngMap(url, legend);
    if (t) {
      terrain = t;
      // Refresh minimap base after terrain/obstacles change
      try { import('./engine/ui.js').then(u => u.initMinimap && u.initMinimap()).catch(()=>{}); } catch {}
    }
  } catch {}
})();

// Input and UI
setupChatInputHandlers(runtime);
initInput();
updatePartyUI([]);

// Use user's single-frame 16×16 sprite at assets/sprites/custom/player.png
try { player.spriteId = 'assets/sprites/custom/player.png'; } catch {}

// Title screen setup: show image, then fade-in menu
function startIntroScene() {
  try {
    if (!runtime.questFlags) runtime.questFlags = {};
    if (!runtime.questFlags['intro_scene_done']) {
      runtime.questFlags['intro_scene_done'] = true;
      const canopy = npcs.find(n => (n?.name || '').toLowerCase().includes('canopy')) || null;
      const canopyIntroActor = canopy
        ? { name: 'Canopy', x: canopy.x, y: canopy.y, w: canopy.w, h: canopy.h, portraitSrc: 'assets/portraits/level01/Canopy/Canopy scared.mp4', vnOnSight: { lock: true } }
        : { name: 'Canopy', portraitSrc: 'assets/portraits/level01/Canopy/Canopy scared.mp4', vnOnSight: { lock: true } };
      const lines = [
        { actor: null, text: 'You jolt awake. The desk is gone. The classroom is gone. Your cheek still remembers wood grain, but the air smells like pine and iron. It\'s dark between the trees—and your hand is wrapped around a torch, cold and unlit.' },
        { actor: null, text: 'The grove around you is torn—scuffed earth, snapped reeds, a smear of blood. You look down: your clothes aren\'t yours. Native garb. Sturdy boots. A knife scar on the belt.' },
        { actor: canopyIntroActor, text: 'Off in the distance, a blonde girl struggles against bandits.', pan: true },
      ];
      // Show a persistent top banner hint to light a torch with hotkey T
      try { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['tutorial_inv_equip_torch'] = true; showPersistentBanner('Press T to light a torch'); } catch {}
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

// Enable Continue if a recent save exists (check autosave and slots 1-3; pick most recent)
(async function enableContinueIfAvailable(){
  try {
    const settled = await Promise.allSettled([
      getSaveMeta('auto'),
      getSaveMeta(1),
      getSaveMeta(2),
      getSaveMeta(3),
    ]);
    const slots = ['auto', 1, 2, 3];
    let best = null; // { slot, at }
    for (let i = 0; i < settled.length; i++) {
      const res = settled[i];
      const meta = (res.status === 'fulfilled') ? res.value : { exists: false, at: null };
      if (meta && meta.exists) {
        const at = Number(meta.at || 0);
        if (!best || at > best.at) best = { slot: slots[i], at };
      }
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
  // Keep overlay dim in sync with lighting while inventory/dialog overlay is open
  try { if (runtime.gameState === 'chat') { import('./engine/ui.js').then(u => u.updateOverlayDim && u.updateOverlayDim()).catch(()=>{}); } } catch {}
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
  // Expose AI tuning for quick iteration from console
  window.AI_TUNING = AI_TUNING;
  window.setAITuning = function(kind, path, value) {
    try {
      const k = String(kind || '').toLowerCase();
      const obj = (AI_TUNING[k] || AI_TUNING.global);
      const parts = String(path || '').split('.').filter(Boolean);
      let ref = (parts[0] === 'global') ? AI_TUNING.global : obj;
      if (parts[0] === 'global') parts.shift();
      for (let i = 0; i < parts.length - 1; i++) { const p = parts[i]; if (!(p in ref)) ref[p] = {}; ref = ref[p]; }
      ref[parts[parts.length - 1]] = value;
      return true;
    } catch (e) { console.warn('setAITuning failed', e); return false; }
  };
  window.giveArrows = async (qty = 50) => {
    try {
      const S = await import('./engine/state.js');
      const U = await import('./engine/ui.js');
      const n = Math.max(1, Math.floor(Number(qty || 50)));
      S.addItemToInventory(player.inventory, { id: 'arrow_basic', name: 'Arrows', slot: 'misc', stackable: true, maxQty: 25, qty: n });
      U.showBanner && U.showBanner(`Added ${n} Arrows`);
      return n;
    } catch (e) { try { console.warn('giveArrows failed:', e); } catch {} return 0; }
  };

  // --- Affinity debug helpers ---
  window.setAffinity = async (who, value) => {
    try {
      const v = Math.max(1, Math.min(10, Number(value || 1)));
      let matched = 0;
      if (typeof who === 'number') {
        const idx = who|0;
        if (companions[idx]) { companions[idx].affinity = v; matched++; }
      } else if (typeof who === 'string') {
        const key = who.toLowerCase();
        for (const c of companions) { if ((c.name||'').toLowerCase().includes(key)) { c.affinity = v; matched++; } }
      } else if (who && who.name) {
        for (const c of companions) { if (c === who) { c.affinity = v; matched++; } }
      }
      if (matched > 0) { updatePartyUI(companions); console.log(`[Affinity] Set ${matched} companion(s) to`, v); }
      return matched;
    } catch (e) { console.warn('setAffinity failed', e); return 0; }
  };
  window.setAllAffinity = async (value = 10) => {
    try { const v = Math.max(1, Math.min(10, Number(value||10))); for (const c of companions) if (c) c.affinity = v; updatePartyUI(companions); console.log('[Affinity] All companions set to', v); return v; } catch (e) { console.warn('setAllAffinity failed', e); return 0; }
  };
  window.maxAffinityAll = async () => window.setAllAffinity(10);
  window.setUrnVara10 = async () => {
    try { let n=0; for (const c of companions) { const nm=(c.name||'').toLowerCase(); if (nm.includes('urn')||nm.includes('varabella')) { c.affinity = 10; n++; } } updatePartyUI(companions); console.log('[Affinity] Set Urn/Varabella to 10 (matched:',n,')'); return n; } catch(e){ console.warn('setUrnVara10 failed', e); return 0; }
  };

  // Export full map PNG of current level (terrain + obstacles)
  window.exportMapPng = () => {
    try {
      const w = world.w|0, h = world.h|0;
      if (!(w > 0 && h > 0)) { console.warn('World size invalid'); return false; }
      const off = document.createElement('canvas');
      off.width = w; off.height = h;
      const g = off.getContext('2d');
      g.imageSmoothingEnabled = false;
      // Draw base terrain and all obstacles with a world-sized camera
      try { g.drawImage(terrain, 0, 0); } catch {}
      try { drawObstacles(g, obstacles, { x: 0, y: 0, w, h }); } catch {}
      const url = off.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      const lvl = (runtime.currentLevel || 1);
      a.download = `level_${lvl}_map.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    } catch (e) { console.warn('exportMapPng failed', e); return false; }
  };
} catch {}

// Load lightweight debug tests (exposes window.testOpenedChestPersistence, window.testVnIntroCooldown)
try { import('./dev/light_tests.js').catch(()=>{}); } catch {}
