import { runtime, player } from './state.js';
import { getEquipStats } from './utils.js';
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
