import { runtime, player } from './state.js';
import { getEquipStats } from './utils.js';
import { tryStartMusic, stopMusic } from './audio.js';
import { playSfx } from './audio.js';
export const canvas = document.getElementById('game');
export const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const overlay = document.getElementById('portrait-overlay');
const overlayImg = document.getElementById('portrait-img');
const overlayName = document.getElementById('portrait-name');
const vnName = document.getElementById('vn-name');
const vnText = document.getElementById('vn-text');
const vnChoices = document.getElementById('vn-choices');
const vnPortraitBox = document.querySelector('.vn-portrait');
const partyUI = document.getElementById('party-ui');
const bannerEl = document.getElementById('banner');

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
      if (overlayImg) { overlayImg.src = npc.portraitSrc; overlayImg.style.display = ''; }
      if (overlayName) overlayName.textContent = npc.name || 'NPC';
      if (vnName) vnName.textContent = npc.name || 'NPC';
    } else {
      // Hide portrait area when there is no portrait (e.g., companion menus)
      if (vnPortraitBox) vnPortraitBox.style.display = 'none';
      if (overlayImg) { overlayImg.src = ''; overlayImg.style.display = 'none'; }
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
    chip.textContent = c.name || `Companion ${idx+1}`;
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
  const bb = document.createElement('div');
  bb.className = 'buffs-box';
  const mk = (label, val, suffix='') => {
    const div = document.createElement('div');
    div.className = 'buff';
    div.title = label;
    div.textContent = `${label}: ${val}${suffix}`;
    return div;
  };
  bb.appendChild(mk('ATK', `+${buffs.atk||0}`));
  bb.appendChild(mk('DR', `+${buffs.dr||0}`));
  bb.appendChild(mk('Regen', (buffs.regen||0).toFixed(1), '/s'));
  bb.appendChild(mk('Range', `+${buffs.range||0}`, 'px'));
  bb.appendChild(mk('tDR', `+${buffs.touchDR||0}`));
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
  const texts = [
    `ATK: +${b.atk||0}`,
    `DR: +${b.dr||0}`,
    `Regen: ${(b.regen||0).toFixed(1)}/s`,
    `Range: +${b.range||0}px`,
    `tDR: +${b.touchDR||0}`,
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
  return [];
}
