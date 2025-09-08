export const canvas = document.getElementById('game');
export const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const overlay = document.getElementById('portrait-overlay');
const overlayImg = document.getElementById('portrait-img');
const overlayName = document.getElementById('portrait-name');
const vnName = document.getElementById('vn-name');
const vnText = document.getElementById('vn-text');
const vnChoices = document.getElementById('vn-choices');
const partyUI = document.getElementById('party-ui');
const bannerEl = document.getElementById('banner');

// Sidebar removed: VN overlay handles all dialog UI

export function enterChat(runtime) {
  runtime.gameState = 'chat';
  runtime.keys.clear();
  // No sidebar input focus; VN overlay handles choices
  // Show portrait overlay if NPC has one
  const npc = runtime.activeNpc;
  if (overlay && npc && npc.portraitSrc) {
    overlay.style.display = 'block';
    if (overlayImg) overlayImg.src = npc.portraitSrc;
    if (overlayName) overlayName.textContent = npc.name || 'NPC';
    if (vnName) vnName.textContent = npc.name || 'NPC';
  }
}
export function exitChat(runtime) {
  runtime.gameState = 'play';
  runtime.activeNpc = null;
  // no-op
  if (overlay) overlay.style.display = 'none';
}

export function setupChatInputHandlers(runtime) {
  canvas.addEventListener('mousedown', () => { if (runtime.gameState === 'chat') exitChat(runtime); });
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
    } else {
      vnChoices.onclick = null;
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
  // Click to manage companion
  partyUI.onclick = (ev) => {
    const t = ev.target;
    if (!t || t.dataset.index === undefined) return;
    const idx = parseInt(t.dataset.index, 10);
    const comp = companions[idx];
    if (!comp) return;
    import('../engine/dialog.js').then(mod => {
      mod.startPrompt(comp, `Do you want ${comp.name || 'this companion'} to leave your party?`, [
        { label: 'Yes, dismiss', action: 'dismiss_companion', data: comp },
        { label: 'Cancel', action: 'end' },
      ]);
    });
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
