import { runtime, player, camera, world, xpToNext } from './state.js';
import { getEquipStats } from './utils.js';
import { tryStartMusic, stopMusic } from './audio.js';
import { playSfx } from './audio.js';
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
const levelTitleEl = document.getElementById('level-title');

// Sidebar removed: VN overlay handles all dialog UI

export function enterChat(runtime) {
  runtime.gameState = 'chat';
  runtime.keys.clear();
  // No sidebar input focus; VN overlay handles choices
  // Show portrait overlay if NPC has one
  const npc = runtime.activeNpc;
  if (overlay) {
    overlay.style.display = 'block';
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
        if (overlayVideo) { try { overlayVideo.pause(); } catch {}; overlayVideo.removeAttribute('src'); overlayVideo.style.display = 'none'; }
        if (overlayImg) { overlayImg.src = addAssetVersion(npc.portraitSrc); overlayImg.style.display = ''; }
      }
      if (overlayName) overlayName.textContent = npc.name || 'NPC';
      if (vnName) vnName.textContent = npc.name || 'NPC';
    } else {
      // Hide portrait area when there is no portrait (e.g., companion menus)
      if (vnPortraitBox) vnPortraitBox.style.display = 'none';
      if (overlayImg) { overlayImg.src = ''; overlayImg.style.display = 'none'; }
      if (overlayVideo) { try { overlayVideo.pause(); } catch {}; overlayVideo.removeAttribute('src'); overlayVideo.style.display = 'none'; }
      if (overlayName) overlayName.textContent = '';
      if (vnName) vnName.textContent = '';
    }
  }
}
export function exitChat(runtime) {
  runtime.gameState = 'play';
  runtime.activeNpc = null;
  // no-op
  if (overlay) overlay.style.display = 'none';
  playSfx('uiClose');
  // Always unlock overlay on exit
  runtime.lockOverlay = false;
  // Resuming from pause: restart music if applicable
  if (runtime.paused) {
    runtime.paused = false;
    try { tryStartMusic('ambient'); } catch {}
  }
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
  // Stop any portrait video playback after exit
  if (overlayVideo) { try { overlayVideo.pause(); } catch {}; overlayVideo.removeAttribute('src'); overlayVideo.style.display = 'none'; }
}

export function setupChatInputHandlers(runtime) {
  canvas.addEventListener('mousedown', () => {
    if (runtime.gameState === 'chat' && !runtime.lockOverlay) exitChat(runtime);
  });
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
        btn.textContent = `${i+1}) ${c.label}`;
        btn.dataset.index = String(i);
        vnChoices.appendChild(btn);
      });
      // Append a universal Exit (X) button at the bottom when not locked
      if (!runtime.lockOverlay) {
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
    // Base name
    const nameSpan = document.createElement('span');
    const lv = Math.max(1, (c.level||1));
    nameSpan.textContent = `Lv ${lv} · ${c.name || `Companion ${idx+1}`}`;
    chip.appendChild(nameSpan);
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
  const buffs = runtime?.combatBuffs || { atk:0, dr:0, regen:0, range:0, touchDR:0 };
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
  const b = runtime?.combatBuffs || { atk:0, dr:0, regen:0, range:0, touchDR:0 };
  const f2 = (v) => Number(v || 0).toFixed(2);
  const texts = [
    `ATK: +${f2(b.atk)}`,
    `DR: +${f2(b.dr)}`,
    `Regen: ${f2(b.regen)}/s`,
    `Range: +${f2(b.range)}px`,
    `tDR: +${f2(b.touchDR)}`,
  ];
  // Ensure we have 5 children; if not, rebuild
  const need = 5;
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
  window.clearTimeout(showBanner._t);
  showBanner._t = window.setTimeout(() => {
    bannerEl.classList.remove('show');
  }, durationMs);
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
    if (f['yorna_knot_started'] && !f['yorna_knot_cleared']) {
      const left = c['yorna_knot_remaining'] ?? 2;
      msg = `Quest — Cut the Knot: ${left} target${left===1?'':'s'} left`;
    } else if (f['canopy_triage_started'] && !f['canopy_triage_cleared']) {
      const left = c['canopy_triage_remaining'] ?? 3;
      msg = `Quest — Breath and Bandages: ${left} target${left===1?'':'s'} left`;
    } else if (f['hola_practice_started'] && !f['hola_practice_cleared']) {
      const used = c['hola_practice_uses'] ?? 0;
      msg = `Quest — Find Her Voice: Gust ${used}/2`;
    } else if (f['oyin_fuse_started'] && !f['oyin_fuse_cleared']) {
      const k = c['oyin_fuse_kindled'] ?? 0; const r = f['oyin_fuse_rally'] ? '1/1' : '0/1';
      msg = `Quest — Light the Fuse: Kindle ${k}/3, Rally ${r}`;
    } else if (f['twil_trace_started'] && !f['twil_trace_cleared']) {
      const left = c['twil_trace_remaining'] ?? 3;
      msg = `Quest — Trace the Footprints: ${left} left`;
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
    } else if (f['oyin_ember_started'] && !f['oyin_ember_cleared']) {
      const left = c['oyin_ember_remaining'] ?? 3;
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
      { cls: 'd', label: 'DR', title: 'Defense Aura' },
      { cls: 'rg', label: 'Rg', title: 'Regen Aura' },
      { cls: 'sh', label: 'Sh', title: 'Safeguard Shield' },
    ];
  }
  if (key.includes('yorna')) {
    return [
      { cls: 'a', label: 'A', title: 'Attack Aura' },
      { cls: 'r', label: 'R', title: 'Range Aura' },
      { cls: 'ec', label: 'E', title: 'Echo Strike' },
    ];
  }
  if (key.includes('hola')) {
    return [
      { cls: 'sl', label: 'Sl', title: 'Slow Aura' },
      { cls: 'td', label: 'tDR', title: 'Touch Damage Reduction' },
      { cls: 'gs', label: 'G', title: 'Gust' },
    ];
  }
  if (key.includes('oyin')) {
    return [
      { cls: 'a', label: 'A', title: 'Attack Aura' },
      { cls: 'r', label: 'R', title: 'Range Aura' },
      { cls: 'ec', label: 'E', title: 'Echo Strike' },
    ];
  }
  if (key.includes('twil')) {
    return [
      { cls: 'sl', label: 'Sl', title: 'Slow Aura' },
      { cls: 'd', label: 'DR', title: 'Defense Aura' },
      { cls: 'gs', label: 'G', title: 'Gust' },
    ];
  }
  if (key.includes('tin')) {
    return [
      { cls: 'as', label: 'AS', title: 'Hype (Attack Speed)' },
    ];
  }
  if (key.includes('nellis')) {
    return [
      { cls: 'd', label: 'DR', title: 'Steady Pace (Defense Aura)' },
      { cls: 'be', label: 'Be', title: 'Beacon (Range Boost)' },
    ];
  }
  if (key.includes('urn')) {
    return [
      { cls: 'rg', label: 'Rg', title: 'Regen Aura' },
      { cls: 'ch', label: 'Ch', title: 'Cheer (Burst Heal)' },
    ];
  }
  if (key.includes('varabella')) {
    return [
      { cls: 'r', label: 'R', title: 'Range Aura' },
      { cls: 'an', label: 'An', title: 'Call the Angle' },
    ];
  }
  return [];
}
