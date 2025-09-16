import { runtime, player, camera, world, xpToNext, obstacles as OBSTACLES, npcs as NPCS, enemies as ENEMIES } from './state.js';
import { companionEffectsByKey } from '../data/companion_effects.js';
import { getEquipStats } from './utils.js';
import { tryStartMusic, stopMusic, initAudioUnlock, playTitleFanfare } from './audio.js';
import { playSfx } from './audio.js';
import { TILE } from './constants.js';
import { sampleLightAtPx, MAX_LIGHT_LEVEL } from './lighting.js';
export const canvas = document.getElementById('game');
export const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const overlay = document.getElementById('portrait-overlay');
const overlayImg = document.getElementById('portrait-img');
const overlayVideo = document.getElementById('portrait-video');
const overlayName = document.getElementById('portrait-name');
const vnName = document.getElementById('vn-name');
const vnText = document.getElementById('vn-text');
const vnChoices = document.getElementById('vn-choices');
const vnPortraitBox = document.querySelector('.vn-portrait');
const partyUI = document.getElementById('party-ui');
const bannerEl = document.getElementById('banner');
const fadeEl = document.getElementById('fade');
const questHintEl = document.getElementById('quest-hint');
const targetInfoEl = document.getElementById('target-info');
const levelTitleEl = document.getElementById('level-title');
const musicThemeEl = document.getElementById('music-theme');
// Title screen refs
const titleEl = document.getElementById('title-screen');
const titleWindowEl = document.getElementById('title-window');
const titleMenuEl = document.getElementById('title-menu');
const titleBgVideo = document.getElementById('title-bg');
const titleBgLoopVideo = document.getElementById('title-bg-loop');
const btnContinue = document.getElementById('btn-continue');
const btnNew = document.getElementById('btn-new');
const btnLoad = document.getElementById('btn-load');
// Minimap
const minimapEl = document.getElementById('minimap');
let _miniBase = null;      // offscreen base (walls/water/objectives)
let _miniFog = null;       // offscreen fog layer
let _miniFogImage = null;  // ImageData for fog compositing
let _visited = null;       // Uint8Array flags per tile
let _miniW = 0, _miniH = 0;
// Minimap incremental update caches
let _miniLastCam = { x0: -1, y0: -1, x1: -1, y1: -1 };
let _miniLastPlayer = { tx: -1, ty: -1 };
let _miniVisitedDirty = false;
let _miniFogLastSec = 0;
// Gate fog compositing to at most ~every 2 frames (≈33ms at 60fps)
let _miniFogIntervalSec = 1 / 30;
let _titleKeyHandler = null;
let _titleFocusIndex = 0;
let _titleButtons = [];
let _titleHandlers = { onContinue: null, onNew: null, onLoad: null };
// Minimap UI state
let _miniMode = 1;      // 0=off,1=compact,2=large
let _miniPeek = false;  // temporary show while holding key

// Persistent music theme label (top-left)
export function showMusicTheme(label) {
  if (!musicThemeEl) return;
  try { musicThemeEl.textContent = label ? `♪ ${label}` : ''; } catch {}
  musicThemeEl.classList.add('show');
}

// Sidebar removed: VN overlay handles all dialog UI

// Helper: fully unload a <video> element so the decoder/GPU resources are released
function unloadVideo(el) {
  try { if (!el) return; } catch { return; }
  try { el.pause(); } catch {}
  try { el.removeAttribute('src'); } catch {}
  try { while (el.firstChild) el.removeChild(el.firstChild); } catch {}
  try { el.load(); } catch {}
}

export function enterChat(runtime) {
  runtime.gameState = 'chat';
  runtime.keys.clear();
  // No sidebar input focus; VN overlay handles choices
  try { updateOverlayDim(); } catch {}
  // Show portrait overlay if NPC has one
  const npc = runtime.activeNpc;
  if (overlay) {
    overlay.style.display = 'block';
    // Ensure any screen fade is cleared so background is dimmed, not black
    try { if (fadeEl) fadeEl.classList.remove('show'); } catch {}
    playSfx('uiOpen');
    if (npc && npc.portraitSrc) {
      if (vnPortraitBox) vnPortraitBox.style.display = '';
      const isVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(npc.portraitSrc);
      if (isVideo && overlayVideo) {
        if (overlayImg) { overlayImg.src = ''; overlayImg.style.display = 'none'; }
        overlayVideo.src = addAssetVersion(npc.portraitSrc);
        overlayVideo.style.display = '';
        try { overlayVideo.play().catch(()=>{}); } catch {}
      } else {
        if (overlayVideo) { unloadVideo(overlayVideo); overlayVideo.style.display = 'none'; }
        if (overlayImg) { overlayImg.src = addAssetVersion(npc.portraitSrc); overlayImg.style.display = ''; }
      }
      if (overlayName) overlayName.textContent = npc.name || 'NPC';
      if (vnName) vnName.textContent = npc.name || 'NPC';
    } else {
      // Hide portrait area when there is no portrait (e.g., companion menus)
      if (vnPortraitBox) vnPortraitBox.style.display = 'none';
      if (overlayImg) { overlayImg.src = ''; overlayImg.style.display = 'none'; }
      if (overlayVideo) { unloadVideo(overlayVideo); overlayVideo.style.display = 'none'; }
      if (overlayName) overlayName.textContent = '';
      if (vnName) vnName.textContent = '';
    }
  }
}

// Clear the black fade layer immediately (used by phase VNs)
export function clearFadeOverlay() {
  try { if (fadeEl) fadeEl.classList.remove('show'); } catch {}
}
export function exitChat(runtime) {
  runtime.gameState = 'play';
  runtime.activeNpc = null;
  // no-op
  if (overlay) overlay.style.display = 'none';
  playSfx('uiClose');
  // Always unlock overlay on exit
  runtime.lockOverlay = false;
  // If a phase cutscene requested invulnerability, grant it now so it doesn't tick down during pause/pan
  try {
    const t = Number(runtime._grantInvulnOnChatExit || 0);
    if (t > 0) {
      player.invulnTimer = Math.max(player.invulnTimer || 0, t);
      runtime._grantInvulnOnChatExit = 0;
    }
  } catch {}
  // Resuming from pause: restart music if applicable
  if (runtime.paused) {
    runtime.paused = false;
    try { tryStartMusic('ambient'); } catch {}
  }
  // If there are queued VN prompts, show the next one immediately instead of panning/transitioning
  try {
    if (Array.isArray(runtime._queuedVNs) && runtime._queuedVNs.length > 0) {
      const next = runtime._queuedVNs.shift();
      if (next && next.text) {
        if (next.pan && next.actor && typeof next.actor.x === 'number' && typeof next.actor.y === 'number') {
          const toX = Math.round(next.actor.x + (next.actor.w || 12)/2 - camera.w/2);
          const toY = Math.round(next.actor.y + (next.actor.h || 16)/2 - camera.h/2);
          runtime.cameraPan = {
            fromX: camera.x,
            fromY: camera.y,
            toX: Math.max(0, Math.min(world.w - camera.w, toX)),
            toY: Math.max(0, Math.min(world.h - camera.h, toY)),
            t: 0,
            dur: 0.6,
          };
          runtime.pendingIntro = { actor: next.actor, text: next.text };
        } else {
          import('../engine/dialog.js').then(mod => {
            const actor = next.actor || null;
            const more = Array.isArray(runtime._queuedVNs) && runtime._queuedVNs.length > 0;
            const choices = more ? [ { label: 'Continue', action: 'vn_continue' } ] : [];
            mod.startPrompt(actor, next.text, choices);
          }).catch(()=>{});
        }
        return;
      }
    }
  } catch {}
  try {
    if (Array.isArray(runtime._queuedCompanionTalks) && runtime._queuedCompanionTalks.length > 0) {
      const next = runtime._queuedCompanionTalks.shift();
      if (next && next.comp) {
        const delay = Math.max(0, next.delay || 0);
        setTimeout(() => {
          import('./dialog.js').then(mod => {
            if (mod.openCompanionTalk) mod.openCompanionTalk(next.comp);
          }).catch(()=>{});
        }, delay);
        return;
      }
    }
  } catch {}
  // Smooth pan back to player after VN exits
  const toX = Math.round(player.x + player.w/2 - camera.w/2);
  const toY = Math.round(player.y + player.h/2 - camera.h/2);
  const clampedX = Math.max(0, Math.min(world.w - camera.w, toX));
  const clampedY = Math.max(0, Math.min(world.h - camera.h, toY));
  const dx = Math.abs(clampedX - camera.x);
  const dy = Math.abs(clampedY - camera.y);
  const dist = Math.max(dx, dy);
  if (dist > 4) {
    runtime.cameraPan = { fromX: camera.x, fromY: camera.y, toX: clampedX, toY: clampedY, t: 0, dur: 0.6 };
  } else {
    camera.x = clampedX; camera.y = clampedY;
  }
  // Stop and fully unload any portrait video playback after exit
  if (overlayVideo) { unloadVideo(overlayVideo); overlayVideo.style.display = 'none'; }
  // If there is a pending level change queued until after VN sequence, set it now
  try {
    if (typeof runtime._afterQueuePendingLevel === 'number' && runtime._afterQueuePendingLevel > 0) {
      runtime.pendingLevel = runtime._afterQueuePendingLevel;
      runtime._afterQueuePendingLevel = null;
    }
  } catch {}
}

export function setupChatInputHandlers(runtime) {
  canvas.addEventListener('mousedown', () => {
    if (runtime.gameState === 'chat' && !runtime.lockOverlay) exitChat(runtime);
  });
}

// --- Title screen ---
export function setupTitleScreen(opts = {}) {
  // Ensure image uses asset versioning if available
  try {
    if (titleWindowEl) {
      // Prefer ultrawide background; fall back handled by browser cache if missing
      const url = addAssetVersion('assets/Trio w Logo Ultrawide.jpg');
      titleWindowEl.style.backgroundImage = `url('${url}')`;
    }
  } catch {}
  // Configure title background video if present
  try {
    if (titleBgVideo) {
      // Load MP4 once; do not loop. Keep final frame visible.
      titleBgVideo.loop = false;
      titleBgVideo.autoplay = true; // will work due to muted
      titleBgVideo.muted = true;
      titleBgVideo.playsInline = true;
      titleBgVideo.src = addAssetVersion('assets/Trio w Logo Ultrawide.mp4');
      // On end, pause to freeze on the last frame
      titleBgVideo.addEventListener('ended', () => {
        try { titleBgVideo.pause(); } catch {}
      });
      // Best effort start (some browsers require user interaction, but muted should allow)
      try { titleBgVideo.play().catch(()=>{}); } catch {}
    }
  } catch {}
  // Prepare optional loop video to follow seamlessly (no crossfade)
  try {
    if (titleBgLoopVideo) {
      titleBgLoopVideo.loop = true;
      titleBgLoopVideo.muted = true;
      titleBgLoopVideo.playsInline = true;
      // Optional: set to your loop asset (safe if missing; browser will just not play)
      titleBgLoopVideo.src = addAssetVersion('assets/Trio Loop Palindrome HQ.mp4');
      // Preload for seamless switch
      try { titleBgLoopVideo.load(); } catch {}
      // Start the loop just before the intro ends so the first
      // visible frame matches (loop is authored to start on the last intro frame)
      if (titleBgVideo) {
        let armed = false;
        const lead = 0.08; // seconds before end to pre-start loop
        const armLoop = () => {
          if (armed) return;
          const dur = Number(titleBgVideo.duration || 0);
          if (dur > 0 && titleBgVideo.currentTime >= (dur - lead)) {
            armed = true;
            try { titleBgLoopVideo.currentTime = 0; } catch {}
            try { titleBgLoopVideo.play().catch(()=>{}); } catch {}
            titleBgVideo.removeEventListener('timeupdate', armLoop);
          }
        };
        titleBgVideo.addEventListener('timeupdate', armLoop);
        // On end, instantly swap visibility with no transition
        titleBgVideo.addEventListener('ended', () => {
          try {
            titleBgLoopVideo.style.transition = 'none';
            titleBgVideo.style.transition = 'none';
            titleBgLoopVideo.style.opacity = '1';
            titleBgVideo.style.opacity = '0';
            // Remove from flow to ensure clicks reach menu
            titleBgVideo.style.display = 'none';
          } catch {}
        }, { once: true });
      }
    }
  } catch {}
  _titleHandlers.onContinue = (typeof opts.onContinue === 'function') ? opts.onContinue : null;
  _titleHandlers.onNew = (typeof opts.onNew === 'function') ? opts.onNew : null;
  _titleHandlers.onLoad = (typeof opts.onLoad === 'function') ? opts.onLoad : null;
  if (btnContinue) {
    btnContinue.setAttribute('data-action', 'continue');
    btnContinue.onclick = (ev) => { ev.preventDefault(); initAudioUnlock(); playSfx('uiSelect'); if (_titleHandlers.onContinue) _titleHandlers.onContinue(); };
    btnContinue.addEventListener('mouseenter', () => { playSfx('uiMove'); });
  }
  if (btnNew) {
    btnNew.setAttribute('data-action', 'new');
    btnNew.onclick = (ev) => { ev.preventDefault(); initAudioUnlock(); playSfx('uiSelect'); if (_titleHandlers.onNew) _titleHandlers.onNew(); };
    btnNew.addEventListener('mouseenter', () => { playSfx('uiMove'); });
  }
  if (btnLoad) {
    btnLoad.setAttribute('data-action', 'load');
    btnLoad.onclick = (ev) => { ev.preventDefault(); initAudioUnlock(); playSfx('uiSelect'); if (_titleHandlers.onLoad) _titleHandlers.onLoad(); };
    btnLoad.addEventListener('mouseenter', () => { playSfx('uiMove'); });
  }
}

// Adjust overlay dimness based on current light at player position
export function updateOverlayDim() {
  try {
    if (!overlay || overlay.style.display !== 'block') return;
    const px = player.x + player.w/2, py = player.y + player.h/2;
    const lv = sampleLightAtPx(px, py);
    const ratio = Math.max(0, Math.min(1, MAX_LIGHT_LEVEL ? (lv / MAX_LIGHT_LEVEL) : 0));
    const alpha = Math.max(0.25, Math.min(0.65, 0.65 - 0.30 * ratio));
    overlay.style.background = `rgba(0,0,0,${alpha.toFixed(2)})`;
  } catch {}
}

export function showTitleScreen() {
  if (!titleEl) return;
  // If videos were unloaded previously, reattach sources
  try {
    if (titleBgVideo && !titleBgVideo.currentSrc && !titleBgVideo.src) {
      titleBgVideo.loop = false;
      titleBgVideo.autoplay = true;
      titleBgVideo.muted = true;
      titleBgVideo.playsInline = true;
      titleBgVideo.src = addAssetVersion('assets/Trio w Logo Ultrawide.mp4');
      try { titleBgVideo.load(); } catch {}
    }
    if (titleBgLoopVideo && !titleBgLoopVideo.currentSrc && !titleBgLoopVideo.src) {
      titleBgLoopVideo.loop = true;
      titleBgLoopVideo.muted = true;
      titleBgLoopVideo.playsInline = true;
      titleBgLoopVideo.src = addAssetVersion('assets/Trio Loop Palindrome HQ.mp4');
      try { titleBgLoopVideo.load(); } catch {}
    }
  } catch {}
  titleEl.style.display = 'grid';
  // Fade-in menu after a short delay
  window.setTimeout(() => { try { if (titleMenuEl) titleMenuEl.classList.add('show'); } catch {} }, 400);
  // Initialize buttons and focus
  try {
    _titleButtons = Array.from(titleMenuEl.querySelectorAll('button:not([disabled])'));
    _titleFocusIndex = 0;
    refreshTitleFocus();
  } catch {}
  enableTitleKeyHandlers();
  // Do not auto‑play here (can be blocked by autoplay policy). We'll play on first gesture.
  // Gesture on overlay also unlocks audio and retries fanfare (for browsers requiring interaction)
  try {
    titleEl.addEventListener('pointerdown', () => {
      // Prevent double-play if a key has already started the fanfare
      if (runtime._titleFanfareFired) return;
      runtime._titleFanfareFired = true;
      initAudioUnlock();
      try {
        stopMusic();
        playTitleFanfare();
        // Fade in ambient after the fanfare finishes
        import('./audio.js').then(m => m.startAmbientAfterFanfare && m.startAmbientAfterFanfare(2.8, 1.6)).catch(()=>{});
      } catch {}
    }, { once: true });
  } catch {}
}

export function hideTitleScreen() {
  if (!titleEl) return;
  titleEl.style.display = 'none';
  try { if (titleMenuEl) titleMenuEl.classList.remove('show'); } catch {}
  disableTitleKeyHandlers();
  // Fully unload background title videos to release decoder/GPU when hidden
  try { if (titleBgVideo) { unloadVideo(titleBgVideo); } } catch {}
  try { if (titleBgLoopVideo) { unloadVideo(titleBgLoopVideo); } } catch {}
}

export function moveTitleFocus(delta) {
  if (!_titleButtons || _titleButtons.length === 0) return;
  const n = _titleButtons.length;
  _titleFocusIndex = ( (_titleFocusIndex + delta) % n + n ) % n;
  refreshTitleFocus();
  try { playSfx('uiMove'); } catch {}
}

export function activateTitleSelection() {
  if (!_titleButtons || _titleButtons.length === 0) return;
  const btn = _titleButtons[_titleFocusIndex];
  if (!btn) return;
  const action = btn.getAttribute('data-action');
  if (action === 'continue' && _titleHandlers.onContinue) _titleHandlers.onContinue();
  if (action === 'new' && _titleHandlers.onNew) _titleHandlers.onNew();
  else if (action === 'load' && _titleHandlers.onLoad) _titleHandlers.onLoad();
}

function refreshTitleFocus() {
  if (!_titleButtons) return;
  for (let i = 0; i < _titleButtons.length; i++) {
    const b = _titleButtons[i];
    if (!b) continue;
    if (i === _titleFocusIndex) b.classList.add('focused');
    else b.classList.remove('focused');
  }
}

function enableTitleKeyHandlers() {
  if (_titleKeyHandler) return;
  _titleKeyHandler = (e) => {
    // Capture phase handler to block downstream game input when title is up
    if (!titleEl || titleEl.style.display === 'none') return;
    const key = e.key;
    // On first key interaction at title, unlock audio and fire fanfare (mirrors pointerdown path)
    try {
      if (!runtime._titleFanfareFired) {
        runtime._titleFanfareFired = true;
        initAudioUnlock();
        try {
          stopMusic();
          playTitleFanfare();
          import('./audio.js').then(m => m.startAmbientAfterFanfare && m.startAmbientAfterFanfare(2.8, 1.6)).catch(()=>{});
        } catch {}
      }
    } catch {}
    // Move focus left/up
    if (key === 'ArrowUp' || key === 'ArrowLeft' || key.toLowerCase() === 'k' || key.toLowerCase() === 'w' || key.toLowerCase() === 'a') {
      e.preventDefault(); e.stopPropagation(); moveTitleFocus(-1); return;
    }
    // Move focus right/down
    if (key === 'ArrowDown' || key === 'ArrowRight' || key.toLowerCase() === 'j' || key.toLowerCase() === 's' || key.toLowerCase() === 'd') {
      e.preventDefault(); e.stopPropagation(); moveTitleFocus(1); return;
    }
    if (key === 'Enter' || key === ' ') {
      e.preventDefault(); e.stopPropagation(); activateTitleSelection(); return;
    }
    if (key === 'Escape' || key.toLowerCase() === 'x') {
      // No-op on title; prevent pause menu
      e.preventDefault(); e.stopPropagation(); return;
    }
  };
  window.addEventListener('keydown', _titleKeyHandler, true); // capture phase
}

function disableTitleKeyHandlers() {
  if (!_titleKeyHandler) return;
  window.removeEventListener('keydown', _titleKeyHandler, true);
  _titleKeyHandler = null;
}

export function rebuildTitleButtons() {
  try {
    _titleButtons = Array.from(titleMenuEl.querySelectorAll('button:not([disabled])'));
    if (_titleButtons.length === 0) { _titleFocusIndex = 0; return; }
    _titleFocusIndex = Math.max(0, Math.min(_titleButtons.length - 1, _titleFocusIndex));
    refreshTitleFocus();
  } catch {}
}

// VN dialog content helpers
export function setOverlayDialog(text, choices) {
  if (vnText) vnText.textContent = text || '';
  if (vnChoices) {
    vnChoices.innerHTML = '';
    if (Array.isArray(choices) && choices.length) {
      choices.forEach((c, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        let label = String(c.label || '');
        // Add small badges for quest Start/Turn-In entries (VN dialog only)
        try {
          const show = (runtime?.uiSettings?.questIndicators || 'normal') !== 'off';
          if (show && runtime.activeDialog && runtime.activeDialog.tree) {
            const tree = runtime.activeDialog.tree;
            // Turn-In detection by label or by presence of start_quest in target node
            const low = label.toLowerCase();
            let suffix = '';
            if (low.startsWith('turn in') || low.startsWith('turn-in')) {
              suffix = ' (Turn-In)';
            } else if (c && c.action === 'start_quest') {
              suffix = ' (New)';
            } else if (c && c.next && tree.nodes && tree.nodes[c.next]) {
              const node = tree.nodes[c.next];
              const nc = Array.isArray(node.choices) ? node.choices : [];
              if (nc.some(n => n && n.action === 'start_quest')) suffix = ' (New)';
            }
            if (suffix) label = `${label}${suffix}`;
          }
        } catch {}
        btn.textContent = `${i+1}) ${label}`;
        btn.dataset.index = String(i);
        if (c && typeof c.hint === 'string' && c.hint.trim().length) {
          btn.title = c.hint;
        }
        vnChoices.appendChild(btn);
      });
      // Append Exit (X) unless suppressed (e.g., queued VN with Continue)
      const isContinue = choices.some(c => c && c.action === 'vn_continue');
      const suppressExit = isContinue && Array.isArray(runtime._queuedVNs) && runtime._queuedVNs.length > 0;
      if (!runtime.lockOverlay && !suppressExit) {
        const exitBtn = document.createElement('button');
        exitBtn.type = 'button';
        exitBtn.textContent = 'Exit (X)';
        exitBtn.onclick = () => exitChat(runtime);
        vnChoices.appendChild(exitBtn);
      }
      // Click handling (delegated)
      vnChoices.onclick = (ev) => {
        const t = ev.target;
        if (t && t.dataset && t.dataset.index !== undefined) {
          const idx = parseInt(t.dataset.index, 10);
          import('../engine/dialog.js').then(mod => mod.selectChoice(idx));
        }
      };
      // Initialize keyboard focus state
      runtime.vnChoiceCount = choices.length;
      runtime.vnFocusIndex = 0;
      refreshChoiceFocus();
    } else {
      vnChoices.onclick = null;
      runtime.vnChoiceCount = 0;
      // Still add Exit (X) if no choices and not locked
      if (!runtime.lockOverlay) {
        const exitBtn = document.createElement('button');
        exitBtn.type = 'button';
        exitBtn.textContent = 'Exit (X)';
        exitBtn.onclick = () => exitChat(runtime);
        vnChoices.appendChild(exitBtn);
      }
    }
  }
}

export function updatePartyUI(companions) {
  if (!partyUI) return;
  partyUI.innerHTML = '';
  companions.forEach((c, idx) => {
    const chip = document.createElement('div');
    chip.className = 'party-chip';
    // Base name (party UI stays unchanged)
    const nameSpan = document.createElement('span');
    const lv = Math.max(1, (c.level||1));
    nameSpan.textContent = `Lv ${lv} · ${c.name || `Companion ${idx+1}`}`;
    chip.appendChild(nameSpan);
    // Quest indicator dot (subtle)
    try {
      const nm = String(c?.name || '').toLowerCase();
      const inds = runtime.questIndicators || {};
      let found = null;
      for (const k of Object.keys(inds)) { if (nm.includes(k)) { found = inds[k]; break; } }
      if (found && (found.new || found.turnIn) && (runtime?.uiSettings?.questIndicators || 'normal') !== 'off') {
        const dot = document.createElement('span');
        dot.textContent = '•';
        dot.style.marginLeft = '6px';
        dot.style.fontSize = '14px';
        dot.style.opacity = '0.9';
        dot.title = found.turnIn ? 'Quest turn-in available' : 'New quest available';
        dot.style.color = found.turnIn ? '#62e563' : '#5ec3ff';
        chip.appendChild(dot);
      }
    } catch {}
    // Affinity hearts (0–3 hearts, 0.5 steps). 3 hearts ≈ affinity 10; 1.5 hearts ≈ affinity 5
    const aff = (typeof c.affinity === 'number') ? c.affinity : 2;
    const heartsVal = Math.max(0, Math.min(3, Math.round((aff / (10/3)) * 2) / 2));
    const fullHearts = Math.floor(heartsVal);
    const hasHalf = (heartsVal - fullHearts) >= 0.5;
    const affSpan = document.createElement('span');
    affSpan.className = 'affinity';
    affSpan.style.marginLeft = '6px';
    affSpan.style.opacity = '0.9';
    affSpan.title = `Affinity ${(Math.round(aff*100)/100)} / 10`;
    // Render full hearts
    for (let h = 0; h < fullHearts; h++) {
      const heart = document.createElement('span');
      heart.textContent = '♥';
      affSpan.appendChild(heart);
    }
    // Render half heart as a dimmed heart
    if (hasHalf) {
      const half = document.createElement('span');
      half.textContent = '♥';
      half.style.opacity = '0.5';
      affSpan.appendChild(half);
    }
    if (affSpan.childNodes.length > 0) chip.appendChild(affSpan);
    // Debug numeric affinity next to hearts (rounded to 2 decimals)
    const affNum = document.createElement('span');
    affNum.className = 'affinity-num';
    affNum.style.marginLeft = '4px';
    affNum.style.opacity = '0.8';
    affNum.textContent = `${Number(aff).toFixed(2)}`;
    chip.appendChild(affNum);
    chip.dataset.index = String(idx);
    // Role badges
    const roles = rolesForCompanion(c?.name || '');
    if (roles.length) {
      const badges = document.createElement('span');
      badges.className = 'role-badges';
      for (const r of roles) {
        const b = document.createElement('span');
        b.className = `role-badge ${r.cls}`;
        b.title = r.title;
        b.textContent = r.label;
        badges.appendChild(b);
      }
      // Torch bearer badge
      try {
        if (runtime._torchBearerRef === c) {
          const tb = document.createElement('span');
          tb.className = 'role-badge';
          tb.title = 'Torch Bearer';
          tb.textContent = 'To';
          badges.appendChild(tb);
        }
      } catch {}
      chip.appendChild(badges);
    }
    // XP bar (small)
    try {
      const need = xpToNext(Math.max(1, c.level||1));
      const cur = Math.max(0, c.xp||0);
      const pct = Math.max(0, Math.min(1, need > 0 ? (cur / need) : 0));
      const bar = document.createElement('div');
      bar.style.width = '100%';
      bar.style.height = '4px';
      bar.style.background = '#2a2a2a';
      bar.style.border = '1px solid #444';
      bar.style.borderRadius = '3px';
      bar.style.marginTop = '4px';
      const fill = document.createElement('div');
      fill.style.height = '100%';
      fill.style.width = `${Math.round(pct * 100)}%`;
      fill.style.background = '#8ab4ff';
      fill.style.borderRadius = '2px';
      bar.appendChild(fill);
      chip.appendChild(bar);
    } catch {}
    partyUI.appendChild(chip);
  });
  // Player equipped items box
  const eq = player?.inventory?.equipped || {};
  const box = document.createElement('div');
  box.className = 'equip-box';
  const mods = getEquipStats(player);
  const lines = [
    `<div class="equip-title">Equipment <span class="mods">ATK +${mods.atk||0} · DR +${mods.dr||0}</span></div>`,
    `<div>Head: ${eq.head ? eq.head.name : '(empty)'}</div>`,
    `<div>Torso: ${eq.torso ? eq.torso.name : '(empty)'}</div>`,
    `<div>Legs: ${eq.legs ? eq.legs.name : '(empty)'}</div>`,
    `<div>L-Hand: ${eq.leftHand ? eq.leftHand.name : '(empty)'}</div>`,
    `<div>R-Hand: ${eq.rightHand ? eq.rightHand.name : '(empty)'}</div>`,
  ];
  box.innerHTML = lines.join('');
  partyUI.appendChild(box);
  // Buff badges from companions
  const buffs = runtime?.combatBuffs || { atk:0, dr:0, regen:0, range:0, touchDR:0, rangedDR:0 };
  const f2 = (v) => Number(v || 0).toFixed(2);
  const bb = document.createElement('div');
  bb.className = 'buffs-box';
  const mk = (label, val, suffix='') => {
    const div = document.createElement('div');
    div.className = 'buff';
    div.title = label;
    div.textContent = `${label}: ${val}${suffix}`;
    return div;
  };
  bb.appendChild(mk('ATK', `+${f2(buffs.atk)}`));
  bb.appendChild(mk('DR', `+${f2(buffs.dr)}`));
  bb.appendChild(mk('Regen', f2(buffs.regen), '/s'));
  bb.appendChild(mk('Range', `+${f2(buffs.range)}`, 'px'));
  bb.appendChild(mk('tDR', `+${f2(buffs.touchDR)}`));
  bb.appendChild(mk('rDR', `+${f2(buffs.rangedDR)}`));
  if (typeof buffs.aspd === 'number') {
    const pct = (Number(buffs.aspd || 0) * 100).toFixed(0);
    bb.appendChild(mk('ASpd', `+${pct}`, '%'));
  }
  partyUI.appendChild(bb);
  // Click to manage companion
  partyUI.onclick = (ev) => {
    const t = ev.target;
    if (!t || t.dataset.index === undefined) return;
    const idx = parseInt(t.dataset.index, 10);
    const comp = companions[idx];
    if (!comp) return;
    import('../engine/dialog.js').then(mod => mod.startCompanionAction(comp));
  };
}

// Update the buffs badge values without rebuilding the whole panel
export function updateBuffBadges() {
  const container = document.getElementById('party-ui');
  if (!container) return;
  const bb = container.querySelector('.buffs-box');
  if (!bb) return;
  const b = runtime?.combatBuffs || { atk:0, dr:0, regen:0, range:0, touchDR:0, rangedDR:0 };
  const f2 = (v) => Number(v || 0).toFixed(2);
  const texts = [
    `ATK: +${f2(b.atk)}`,
    `DR: +${f2(b.dr)}`,
    `Regen: ${f2(b.regen)}/s`,
    `Range: +${f2(b.range)}px`,
    `tDR: +${f2(b.touchDR)}`,
    `rDR: +${f2(b.rangedDR)}`,
  ];
  // Ensure we have 5 children; if not, rebuild
  const need = 6;
  if (bb.children.length !== need) {
    bb.innerHTML = '';
    texts.forEach(t => { const d = document.createElement('div'); d.className = 'buff'; d.textContent = t; bb.appendChild(d); });
    return;
  }
  for (let i = 0; i < need; i++) {
    const child = bb.children[i];
    if (child) child.textContent = texts[i];
  }
}

export function showBanner(text, durationMs = 1800) {
  if (!bannerEl) return;
  bannerEl.textContent = text;
  bannerEl.classList.add('show');
  // Overlay temporary banner, then restore persistent banner if one is active
  const hadPersistent = !!(runtime && runtime._persistentBannerActive && runtime._persistentBannerText);
  window.clearTimeout(showBanner._t);
  showBanner._t = window.setTimeout(() => {
    if (hadPersistent && runtime && runtime._persistentBannerActive && runtime._persistentBannerText) {
      // Restore the persistent banner text and keep it visible
      try { bannerEl.textContent = runtime._persistentBannerText; } catch {}
      showBanner._t = null;
      return;
    }
    bannerEl.classList.remove('show');
  }, durationMs);
}

// Persistent banner helpers (stay until explicitly hidden)
export function showPersistentBanner(text) {
  if (!bannerEl) return;
  if (runtime) {
    runtime._persistentBannerActive = true;
    runtime._persistentBannerText = text || '';
  }
  bannerEl.textContent = text;
  bannerEl.classList.add('show');
  window.clearTimeout(showBanner._t);
  showBanner._t = null;
}
export function hideBanner() {
  if (!bannerEl) return;
  bannerEl.classList.remove('show');
  if (runtime) { runtime._persistentBannerActive = false; runtime._persistentBannerText = ''; }
  window.clearTimeout(showBanner._t);
  showBanner._t = null;
}

// Lower-right identifier for last combat interaction
export function showTargetInfo(text, durationMs = 1600) {
  if (!targetInfoEl) return;
  targetInfoEl.textContent = text || '';
  targetInfoEl.classList.add('show');
  window.clearTimeout(showTargetInfo._t);
  showTargetInfo._t = window.setTimeout(() => {
    targetInfoEl.classList.remove('show');
  }, Math.max(250, durationMs|0));
}

// Append cache-busting version to asset URLs
function addAssetVersion(url) {
  try {
    const v = (window && window.ASSET_VERSION) ? String(window.ASSET_VERSION) : null;
    if (!v || typeof url !== 'string') return url;
    const hasQuery = url.includes('?');
    return `${url}${hasQuery ? '&' : '?'}v=${encodeURIComponent(v)}`;
  } catch { return url; }
}

// ---- Minimap ----
export function initMinimap() {
  if (!minimapEl) return;
  _miniW = world.tileW|0; _miniH = world.tileH|0;
  minimapEl.width = Math.max(1, _miniW);
  minimapEl.height = Math.max(1, _miniH);
  // Offscreen layers
  _miniBase = document.createElement('canvas');
  _miniBase.width = _miniW; _miniBase.height = _miniH;
  _miniFog = document.createElement('canvas');
  _miniFog.width = _miniW; _miniFog.height = _miniH;
  _miniFogImage = _miniFog.getContext('2d').createImageData(_miniW, _miniH);
  _visited = new Uint8Array(_miniW * _miniH);
  // Reset incremental caches
  _miniLastCam = { x0: -1, y0: -1, x1: -1, y1: -1 };
  _miniLastPlayer = { tx: -1, ty: -1 };
  _miniVisitedDirty = true;
  _miniFogLastSec = 0;

  const bctx = _miniBase.getContext('2d');
  // Base floor tint
  bctx.fillStyle = '#151515';
  bctx.fillRect(0, 0, _miniW, _miniH);
  const drawRect = (x,y,w,h,color) => { bctx.fillStyle = color; bctx.fillRect(x,y,w,h); };
  const obs = OBSTACLES || [];
  for (let i = 0; i < obs.length; i++) {
    const o = obs[i]; if (!o) continue;
    const tx = Math.max(0, Math.floor(o.x / TILE));
    const ty = Math.max(0, Math.floor(o.y / TILE));
    const tw = Math.max(1, Math.ceil(o.w / TILE));
    const th = Math.max(1, Math.ceil(o.h / TILE));
    switch (o.type) {
      case 'wall':
      case 'marble':
        drawRect(tx, ty, tw, th, '#555');
        break;
      case 'water':
        drawRect(tx, ty, tw, th, '#2b5c93');
        break;
      case 'wood':
        // Wood bridge planks
        drawRect(tx, ty, tw, th, '#8a6a3a');
        break;
      case 'rock':
        drawRect(tx, ty, tw, th, '#777');
        break;
      case 'gate':
        drawRect(tx, ty, tw, th, '#caa24a');
        break;
      case 'chest':
        drawRect(tx, ty, tw, th, '#d6d67a');
        break;
      default:
        break;
    }
  }
  // Load preference and apply display/size
  try {
    const saved = Number(localStorage.getItem('minimapMode') || '1');
    if (!Number.isNaN(saved)) _miniMode = Math.max(0, Math.min(2, saved));
  } catch {}
  applyMinimapMode();
}

export function updateMinimap() {
  if (!minimapEl) return;
  if ((_miniW !== (world.tileW|0)) || (_miniH !== (world.tileH|0)) || !_miniBase || !_visited) {
    initMinimap();
  }
  // Reveal by camera view and a small radius around player
  try {
    const cx0 = Math.max(0, Math.floor(camera.x / TILE));
    const cy0 = Math.max(0, Math.floor(camera.y / TILE));
    const cx1 = Math.min(_miniW - 1, Math.ceil((camera.x + camera.w) / TILE));
    const cy1 = Math.min(_miniH - 1, Math.ceil((camera.y + camera.h) / TILE));
    // Update visited only if camera tile rect changed
    if (cx0 !== _miniLastCam.x0 || cy0 !== _miniLastCam.y0 || cx1 !== _miniLastCam.x1 || cy1 !== _miniLastCam.y1) {
      for (let y = cy0; y <= cy1; y++) {
        let idx = y * _miniW + cx0;
        for (let x = cx0; x <= cx1; x++, idx++) _visited[idx] = 1;
      }
      _miniLastCam = { x0: cx0, y0: cy0, x1: cx1, y1: cy1 };
      _miniVisitedDirty = true;
    }
    // Reveal small radius around the player only if player tile changed
    const ptx = Math.max(0, Math.min(_miniW-1, Math.floor(player.x / TILE)));
    const pty = Math.max(0, Math.min(_miniH-1, Math.floor(player.y / TILE)));
    if (ptx !== _miniLastPlayer.tx || pty !== _miniLastPlayer.ty) {
      const r = 4;
      for (let dy = -r; dy <= r; dy++) {
        const yy = pty + dy; if (yy < 0 || yy >= _miniH) continue;
        const from = Math.max(0, ptx - r), to = Math.min(_miniW-1, ptx + r);
        let idx = yy * _miniW + from;
        for (let x = from; x <= to; x++, idx++) _visited[idx] = 1;
      }
      _miniLastPlayer = { tx: ptx, ty: pty };
      _miniVisitedDirty = true;
    }
  } catch {}

  // Fog compositing
  const nowSec = (runtime && typeof runtime._timeSec === 'number') ? runtime._timeSec : (performance && performance.now ? performance.now()/1000 : Date.now()/1000);
  if (_miniVisitedDirty && (nowSec - _miniFogLastSec) >= _miniFogIntervalSec) {
    const data = _miniFogImage.data;
    const n = _miniW * _miniH;
    for (let i = 0, di = 0; i < n; i++, di += 4) {
      const seen = _visited[i] === 1;
      data[di+0] = 0; data[di+1] = 0; data[di+2] = 0; data[di+3] = seen ? 0 : 180;
    }
    const fctx = _miniFog.getContext('2d');
    fctx.putImageData(_miniFogImage, 0, 0);
    _miniVisitedDirty = false;
    _miniFogLastSec = nowSec;
  }

  // Compose
  const ctx = minimapEl.getContext('2d');
  ctx.clearRect(0, 0, _miniW, _miniH);
  ctx.drawImage(_miniBase, 0, 0);
  ctx.drawImage(_miniFog, 0, 0);
  // Quest markers on minimap (NPCs/enemies with questId)
  try {
    const colorFor = (qid) => {
      switch (qid) {
        case 'yorna_knot': return '#ff8a3d';
        case 'canopy_triage': return '#8effc1';
        case 'twil_trace': return '#e0b3ff';
        case 'twil_fuse': return '#ffd166';
        case 'hola_find_yorna': return '#6fb7ff';
        default: return '#9ae6ff';
      }
    };
    const drawEnt = (ent) => {
      if (!ent || !ent.questId) return;
      const tx = Math.max(0, Math.min(_miniW-1, Math.floor(ent.x / TILE)));
      const ty = Math.max(0, Math.min(_miniH-1, Math.floor(ent.y / TILE)));
      ctx.fillStyle = colorFor(ent.questId);
      ctx.fillRect(tx, ty, 1, 1);
    };
    // Draw markers for quest-tagged NPCs and live enemies
    for (const n of (NPCS || [])) drawEnt(n);
    for (const e of (ENEMIES || [])) if (e && e.hp > 0) drawEnt(e);
  } catch {}
  // Tutorial objective: highlight Level 1 sword chest on minimap
  try {
    const f = runtime.questFlags || {};
    if (f['tutorial_find_sword'] && !f['tutorial_find_sword_done'] && (runtime.currentLevel || 1) === 1) {
      const chest = (OBSTACLES || []).find(o => o && o.type === 'chest' && o.id === 'chest_l1_weapon' && !o.opened);
      if (chest) {
        const tx = Math.max(0, Math.min(_miniW-1, Math.floor(chest.x / TILE)));
        const ty = Math.max(0, Math.min(_miniH-1, Math.floor(chest.y / TILE)));
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(tx, ty, Math.max(1, Math.ceil(chest.w / TILE)), Math.max(1, Math.ceil(chest.h / TILE)));
        // small pulsing ring
        ctx.strokeStyle = 'rgba(0,0,0,0.9)';
        ctx.lineWidth = 1;
        ctx.strokeRect(tx-1, ty-1, Math.max(3, Math.ceil(chest.w / TILE)+2), Math.max(3, Math.ceil(chest.h / TILE)+2));
      }
    }
  } catch {}
  // Player dot
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(Math.floor(player.x / TILE), Math.floor(player.y / TILE), 1, 1);
  // Camera rectangle
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1;
  const rx = Math.floor(camera.x / TILE), ry = Math.floor(camera.y / TILE);
  const rw = Math.max(1, Math.ceil(camera.w / TILE)), rh = Math.max(1, Math.ceil(camera.h / TILE));
  ctx.strokeRect(rx, ry, rw, rh);
}

function applyMinimapMode() {
  if (!minimapEl) return;
  if (_miniMode <= 0 && !_miniPeek) {
    minimapEl.style.display = 'none';
    return;
  }
  minimapEl.style.display = '';
  const w = (_miniMode === 2) ? 240 : 168; // display width in CSS pixels
  minimapEl.style.width = `${w}px`;
}

export function cycleMinimapMode() {
  _miniMode = (_miniMode + 1) % 3; // 0->1->2->0
  applyMinimapMode();
  try { localStorage.setItem('minimapMode', String(_miniMode)); } catch {}
}

export function beginMinimapPeek() {
  if (_miniMode > 0 || _miniPeek) return;
  _miniPeek = true;
  minimapEl && (minimapEl.style.display = '');
}

export function endMinimapPeek() {
  if (!_miniPeek) return;
  _miniPeek = false;
  applyMinimapMode();
}

// Level title overlay
export function showLevelTitle(text, durationMs = 2200) {
  if (!levelTitleEl) return;
  levelTitleEl.textContent = text || '';
  levelTitleEl.classList.add('show');
  window.clearTimeout(showLevelTitle._t);
  showLevelTitle._t = window.setTimeout(() => {
    levelTitleEl.classList.remove('show');
  }, Math.max(0, durationMs));
}

// Simple mapping from level index to biome-based name
export function levelNameFor(level) {
  const lv = Math.max(1, level|0);
  switch (lv) {
    case 1: return 'Greenwood';          // default grass/stone biome
    case 2: return 'Sunbreak Expanse';   // sandy ruins biome
    case 3: return 'Marsh';              // reed marsh biome
    case 4: return 'Aurelion';           // ruined city name
    case 5: return 'Heart of the Temple';
    case 6: return 'Temple of Aurelion'; // Hub
    default: return `Region ${lv}`;
  }
}

export function refreshChoiceFocus() {
  if (!vnChoices) return;
  const children = Array.from(vnChoices.children);
  children.forEach((el, i) => {
    if (!(el instanceof HTMLElement)) return;
    if (i === runtime.vnFocusIndex) el.classList.add('focused');
    else el.classList.remove('focused');
  });
}

export function moveChoiceFocus(delta) {
  if (runtime.vnChoiceCount <= 0) return;
  const max = runtime.vnChoiceCount - 1;
  runtime.vnFocusIndex = Math.max(0, Math.min(max, runtime.vnFocusIndex + delta));
  refreshChoiceFocus();
  playSfx('uiMove');
}

export function activateFocusedChoice() {
  if (runtime.vnChoiceCount <= 0) return;
  const idx = runtime.vnFocusIndex;
  playSfx('uiSelect');
  import('../engine/dialog.js').then(mod => mod.selectChoice(idx));
}

// Simple fade transition helper
export function fadeTransition(options) {
  const { toBlackMs = 400, holdMs = 0, toClearMs = 400, during } = options || {};
  if (!fadeEl) { if (typeof during === 'function') during(); return; }
  // Fade to black
  fadeEl.classList.add('show');
  window.setTimeout(() => {
    try { if (typeof during === 'function') during(); } catch {}
    // Hold, then fade back
    window.setTimeout(() => {
      fadeEl.classList.remove('show');
    }, Math.max(0, holdMs));
  }, Math.max(0, toBlackMs));
}

export function updateQuestHint() {
  if (!questHintEl) return;
  let msg = '';
  try {
    const f = runtime.questFlags || {};
    const c = runtime.questCounters || {};
    // Fetch/Deliver — Canopy: Return the Ribbon
    if (f['canopy_fetch_ribbon_started'] && !f['canopy_fetch_ribbon_cleared']) {
      const items = (player?.inventory?.items || []);
      const hasRibbon = items.some(it => it && (it.id === 'relic_canopy' || it.keyId === 'relic_canopy'));
      msg = hasRibbon ? 'Quest — Return the Ribbon: Take it to the pedestal' : 'Quest — Return the Ribbon: Find the Ribbon';
    } else if (f['yorna_knot_started'] && !f['yorna_knot_cleared']) {
      const left = c['yorna_knot_remaining'] ?? 2;
      msg = `Quest — Cut the Knot: ${left} target${left===1?'':'s'} left`;
    } else if (f['canopy_triage_started'] && !f['canopy_triage_cleared']) {
      const left = c['canopy_triage_remaining'] ?? 3;
      msg = `Quest — Breath and Bandages: ${left} target${left===1?'':'s'} left`;
    } else if (f['hola_practice_started'] && !f['hola_practice_cleared']) {
      const used = c['hola_practice_uses'] ?? 0;
      msg = `Quest — Find Her Voice: Gust ${used}/2`;
    } else if (f['twil_fuse_started'] && !f['twil_fuse_cleared']) {
      const k = c['twil_fuse_kindled'] ?? 0;
      msg = `Quest — Light the Fuse: Kindle ${k}/3`;
    } else if (f['twil_trace_started'] && !f['twil_trace_cleared']) {
      const left = c['twil_trace_remaining'] ?? 3;
      msg = `Quest — Trace the Footprints: ${left} left`;
    } else if (f['hola_find_yorna_started'] && !f['hola_find_yorna_cleared']) {
      msg = 'Quest — Find Yorna: Talk to her';
    } else if (f['yorna_ring_started'] && !f['yorna_ring_cleared']) {
      const left = c['yorna_ring_remaining'] ?? 3;
      msg = `Quest — Shatter the Ring: ${left} left`;
    } else if (f['yorna_causeway_started'] && !f['yorna_causeway_cleared']) {
      const left = c['yorna_causeway_remaining'] ?? 3;
      msg = `Quest — Hold the Causeway: ${left} left`;
    } else if (f['hola_silence_started'] && !f['hola_silence_cleared']) {
      const left = c['hola_silence_remaining'] ?? 3;
      msg = `Quest — Break the Silence: ${left} left`;
    } else if (f['hola_breath_bog_started'] && !f['hola_breath_bog_cleared']) {
      const left = c['hola_breath_bog_remaining'] ?? 3;
      msg = `Quest — Breath Over Bog: ${left} left`;
    } else if (f['twil_ember_started'] && !f['twil_ember_cleared']) {
      const left = c['twil_ember_remaining'] ?? 3;
      msg = `Quest — Carry the Ember: ${left} left`;
    } else if (f['twil_wake_started'] && !f['twil_wake_cleared']) {
      const left = c['twil_wake_remaining'] ?? 3;
      msg = `Quest — Cut the Wake: ${left} left`;
    } else if (f['tin_shallows_started'] && !f['tin_shallows_cleared']) {
      const left = c['tin_shallows_remaining'] ?? 3;
      msg = `Quest — Mark the Shallows: ${left} left`;
    } else if (f['nellis_beacon_started'] && !f['nellis_beacon_cleared']) {
      const left = c['nellis_beacon_remaining'] ?? 3;
      msg = `Quest — Raise the Beacon: ${left} left`;
    } else if (f['canopy_sister2_started'] && !f['canopy_sister2_cleared']) {
      const left = c['canopy_sister2_remaining'] ?? 3;
      msg = `Quest — Ribbon in the Dust: ${left} left`;
    } else if (f['canopy_sister3_started'] && !f['canopy_sister3_cleared']) {
      const left = c['canopy_sister3_remaining'] ?? 3;
      msg = `Quest — Reeds and Echoes: ${left} left`;
    } else if (f['urn_rooftops_started'] && !f['urn_rooftops_cleared']) {
      const left = c['urn_rooftops_remaining'] ?? 3;
      msg = `Quest — Secure the Rooftops: ${left} left`;
    } else if (f['varabella_crossfire_started'] && !f['varabella_crossfire_cleared']) {
      const left = c['varabella_crossfire_remaining'] ?? 3;
      msg = `Quest — Cut the Crossfire: ${left} left`;
    } else if (f['canopy_streets4_started'] && !f['canopy_streets4_cleared']) {
      const left = c['canopy_streets4_remaining'] ?? 3;
      msg = `Quest — Stitch the Streets: ${left} left`;
    } else if (f['tin_gaps4_started'] && !f['tin_gaps4_cleared']) {
      const left = c['tin_gaps4_remaining'] ?? 3;
      msg = `Quest — Flag the Gaps: ${left} left`;
    } else if (f['nellis_crossroads4_started'] && !f['nellis_crossroads4_cleared']) {
      const left = c['nellis_crossroads4_remaining'] ?? 3;
      msg = `Quest — Light the Crossroads: ${left} left`;
    }
  } catch {}
  if (msg) { questHintEl.style.display = ''; questHintEl.textContent = msg; }
  else { questHintEl.style.display = 'none'; questHintEl.textContent = ''; }
}

function rolesForCompanion(name) {
  const key = (name || '').toLowerCase();
  if (key.includes('canopy')) {
    return [
      { cls: 'd', label: 'DR', title: 'Defense' },
      { cls: 'rg', label: 'Rg', title: 'Regeneration' },
      { cls: 'sh', label: 'Sh', title: 'Safeguard' },
    ];
  }
  if (key.includes('yorna')) {
    return [
      { cls: 'a', label: 'A', title: 'Frontline Power' },
      { cls: 'r', label: 'R', title: 'Extended Reach' },
      { cls: 'ec', label: 'E', title: 'Echo Strike' },
    ];
  }
  if (key.includes('hola')) {
    return [
      { cls: 'sl', label: 'Sl', title: 'Slow' },
      { cls: 'td', label: 'tDR', title: 'Guard (Contact DR)' },
      { cls: 'gs', label: 'G', title: 'Gust' },
    ];
  }
  if (key.includes('oyin')) {
    return [
      { cls: 'a', label: 'A', title: 'Rally (Attack)' },
      { cls: 'r', label: 'R', title: 'Extended Reach' },
      { cls: 'ec', label: 'E', title: 'Echo Strike' },
    ];
  }
  if (key.includes('twil')) {
    return [
      { cls: 'sl', label: 'Sl', title: 'Slow' },
      { cls: 'd', label: 'DR', title: 'Defense' },
      { cls: 'gs', label: 'G', title: 'Gust' },
    ];
  }
  if (key.includes('tin')) {
    const arr = [ { cls: 'as', label: 'AS', title: 'Tempo (Attack Speed)' } ];
    const eff = companionEffectsByKey[key];
    if (eff && Array.isArray(eff.auras) && eff.auras.some(a => a && a.type === 'waterWalk')) arr.push({ cls: 'ww', label: 'Ww', title: 'Water Walk' });
    return arr;
  }
  if (key.includes('nellis')) {
    return [
      { cls: 'd', label: 'DR', title: 'Steady Pace (Defense)' },
      { cls: 'be', label: 'Be', title: 'Beacon (Reach)' },
    ];
  }
  if (key.includes('urn')) {
    return [
      { cls: 'rg', label: 'Rg', title: 'Regeneration' },
      { cls: 'ch', label: 'Ch', title: 'Cheer (Burst Heal)' },
    ];
  }
  if (key.includes('varabella')) {
    return [
      { cls: 'r', label: 'R', title: 'Angles (Range)' },
      { cls: 'an', label: 'An', title: 'Call the Angle' },
    ];
  }
  return [];
}
