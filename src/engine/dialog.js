import { runtime, npcs, companions, spawnCompanion, removeCompanion, spawnNpc, obstacles, world, player } from './state.js';
import { enterChat, setOverlayDialog, exitChat, updatePartyUI, showBanner } from './ui.js';
import { companionDialogs } from '../data/companion_dialogs.js';
import { canopyDialog, yornaDialog, holaDialog } from '../data/dialogs.js';
import { saveGame, loadGame, clearSave, getSaveMeta } from './save.js';
import { TILE } from './constants.js';
import { rectsIntersect } from './utils.js';

// Attach a dialog tree to an NPC object
export function setNpcDialog(npc, tree) {
  npc.dialog = tree;
}

export function startDialog(npc) {
  if (!npc || !npc.dialog) return;
  runtime.activeNpc = npc;
  runtime.activeDialog = { tree: npc.dialog, nodeId: npc.dialog.start || 'root' };
  enterChat(runtime);
  renderCurrentNode();
}

// Build a temporary dialog session with provided text and choices
export function startPrompt(actor, text, choices) {
  runtime.activeNpc = actor || null;
  runtime.activeDialog = {
    tree: { start: 'p', nodes: { p: { text, choices } } },
    nodeId: 'p',
  };
  enterChat(runtime);
  renderCurrentNode();
}

// Open a menu to choose a companion to interact with
export function startCompanionSelector() {
  const list = companions.map((c, i) => ({ label: c.name || `Companion ${i+1}`, action: 'companion_select', data: i }));
  if (list.length === 0) {
    // Non-blocking notice; do not enter chat mode
    showBanner('You have no companions.');
    return;
  }
  startPrompt(null, 'Choose a companion:', [ ...list, { label: 'Cancel', action: 'end' } ]);
}

export function startCompanionAction(comp) {
  if (!comp) { startCompanionSelector(); return; }
  startPrompt(comp, `What do you want to do with ${comp.name || 'this companion'}?`, [
    { label: 'Talk', action: 'companion_talk', data: comp },
    { label: 'Dismiss', action: 'dismiss_companion', data: comp },
    { label: 'Back', action: 'companion_back' },
  ]);
}

// Save/Load menu
export function startSaveMenu() {
  // Show placeholder then load metadata and refresh menu labels
  startPrompt(null, 'Save/Load', [ { label: 'Loading…', action: 'end' } ]);
  buildAndShowSaveMenu();
}

async function buildAndShowSaveMenu() {
  const metas = await Promise.all([1,2,3].map(s => getSaveMeta(s)));
  const format = (i, type) => {
    const m = metas[i-1];
    if (!m.exists) return `${type} Slot ${i} — empty`;
    const when = timeAgo(m.at);
    return `${type} Slot ${i} — saved ${when}`;
  };
  const choices = [
    { label: `${format(1, 'Slot')}`, action: 'open_slot', data: 1 },
    { label: `${format(2, 'Slot')}`, action: 'open_slot', data: 2 },
    { label: `${format(3, 'Slot')}`, action: 'open_slot', data: 3 },
    { label: `Autosave: ${runtime.autosaveEnabled ? 'On' : 'Off'} (60s)`, action: 'toggle_autosave' },
    { label: 'Close', action: 'end' },
  ];
  // Rebuild the active dialog node so keyboard selection maps to these choices
  startPrompt(null, 'Save/Load', choices);
}

function timeAgo(ts) {
  if (!ts) return 'just now';
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function renderCurrentNode() {
  if (!runtime.activeDialog) return;
  const { tree, nodeId } = runtime.activeDialog;
  const node = tree.nodes[nodeId];
  if (!node) { setOverlayDialog('...', []); return; }
  setOverlayDialog(node.text || '', node.choices || []);
  // Sidebar placeholder removed; VN overlay displays choices
}

export function selectChoice(index) {
  if (!runtime.activeDialog) return;
  const { tree } = runtime.activeDialog;
  const node = tree.nodes[runtime.activeDialog.nodeId];
  if (!node || !node.choices) return;
  const choice = node.choices[index];
  if (!choice) return;
  if (choice.action === 'end') { endDialog(); exitChat(runtime); return; }
  if (choice.action === 'join_party') {
    const npc = runtime.activeNpc;
    if (npc) {
      // Enforce party size limit
      if (companions.length >= 3) {
        setOverlayDialog('Your party is full (max 3).', [ { label: 'Ok', action: 'end' } ]);
        return;
      }
      // Spawn as companion using NPC sheet if available
      spawnCompanion(npc.x, npc.y, npc.sheet || null, { name: npc.name || 'Companion', portrait: npc.portraitSrc });
      // Remove NPC from world
      const idx = npcs.indexOf(npc);
      if (idx !== -1) npcs.splice(idx, 1);
      updatePartyUI(companions);
      showBanner(`${npc.name || 'Companion'} joined your party!`);
    }
    endDialog();
    exitChat(runtime);
    return;
  }
  if (choice.action === 'dismiss_companion') {
    const comp = choice.data || (companions.includes(runtime.activeNpc) ? runtime.activeNpc : null);
    // Ask for confirmation before dismissing
    if (!choice.confirmed) {
      startPrompt(comp || null, `Dismiss ${comp?.name || 'this companion'}?`, [
        { label: 'Yes', action: 'dismiss_companion', data: comp, confirmed: true },
        { label: 'No', action: 'companion_back' },
      ]);
      return;
    }
    if (comp) {
      // Convert companion back into an NPC near their current position (nudge to nearest free tile)
      const spot = findNearbyFreeSpot(comp.x, comp.y, comp.w, comp.h);
      const nx = spot ? spot.x : comp.x;
      const ny = spot ? spot.y : comp.y;
      const npc = spawnNpc(nx, ny, comp.dir || 'down', {
        name: comp.name || 'Companion',
        sheet: comp.sheet || null,
        portrait: comp.portraitSrc || null,
      });
      // Attach appropriate dialog so you can re-recruit them
      const key = (npc.name || '').toLowerCase();
      if (key.includes('canopy')) setNpcDialog(npc, canopyDialog);
      else if (key.includes('yorna')) setNpcDialog(npc, yornaDialog);
      else if (key.includes('hola')) setNpcDialog(npc, holaDialog);
      // Remove from party
      removeCompanion(comp);
      updatePartyUI(companions);
      showBanner(`${comp.name || 'Companion'} left your party.`);
    }
    endDialog();
    exitChat(runtime);
    return;
  }
  if (choice.action === 'companion_select') {
    const idx = typeof choice.data === 'number' ? choice.data : -1;
    const comp = companions[idx];
    startCompanionAction(comp);
    return;
  }
  if (choice.action === 'companion_talk') {
    const comp = choice.data || runtime.activeNpc;
    // Open companion-specific dialog tree if defined
    const key = ((comp?.name) || '').toLowerCase();
    const tree = companionDialogs[key];
    if (tree) {
      runtime.activeNpc = comp;
      runtime.activeDialog = { tree, nodeId: tree.start || 'root' };
      enterChat(runtime);
      renderCurrentNode();
    } else {
      // Fallback simple line
      startPrompt(comp, `${comp?.name || 'Companion'}: Let's keep moving.`, [
        { label: 'Back to companions', action: 'companion_back' },
        { label: 'Close', action: 'end' },
      ]);
    }
    return;
  }
  if (choice.action === 'companion_back') {
    startCompanionSelector();
    return;
  }
  if (choice.action === 'save_game_slot') { requestSaveSlot(choice.data || 1); return; }
  if (choice.action === 'load_game_slot') { loadGame(choice.data || 1); endDialog(); exitChat(runtime); return; }
  if (choice.action === 'clear_save_slot') { requestClearSlot(choice.data || 1); return; }
  if (choice.action === 'toggle_autosave') { runtime.autosaveEnabled = !runtime.autosaveEnabled; buildAndShowSaveMenu(); return; }
  if (choice.action === 'open_slot') { openSlotMenu(choice.data || 1); return; }
  if (choice.action === 'confirm_save_slot') { saveGame(choice.data || 1); endDialog(); exitChat(runtime); return; }
  if (choice.action === 'confirm_clear_slot') { clearSave(choice.data || 1); endDialog(); exitChat(runtime); return; }
  if (choice.action === 'save_menu_back') { buildAndShowSaveMenu(); return; }
  if (choice.next) { runtime.activeDialog.nodeId = choice.next; renderCurrentNode(); return; }
}

async function openSlotMenu(slot) {
  const meta = await getSaveMeta(slot);
  const label = meta.exists ? `Slot ${slot} — saved ${timeAgo(meta.at)}` : `Slot ${slot} — empty`;
  const choices = [
    { label: `Load Slot ${slot}`, action: 'load_game_slot', data: slot },
    { label: `Save Slot ${slot}`, action: 'save_game_slot', data: slot },
    { label: `Clear Slot ${slot}`, action: 'clear_save_slot', data: slot },
    { label: 'Back', action: 'save_menu_back' },
  ];
  startPrompt(null, label, choices);
}

// Text submission removed; choices selected via number keys or clicked buttons

export function endDialog() {
  runtime.activeDialog = null;
  // keep chat mode open but clear choices; caller may exit chat
}

function findNearbyFreeSpot(x, y, w, h) {
  const startTx = Math.floor(x / TILE);
  const startTy = Math.floor(y / TILE);
  const maxR = 6;
  const actors = [
    { x: player.x, y: player.y, w: player.w, h: player.h },
    ...companions.map(c => ({ x: c.x, y: c.y, w: c.w, h: c.h })),
    ...npcs.map(n => ({ x: n.x, y: n.y, w: n.w, h: n.h })),
  ];
  function isFree(px, py) {
    const rect = { x: px, y: py, w, h };
    if (px < 0 || py < 0 || px + w > world.w || py + h > world.h) return false;
    for (const o of obstacles) if (rectsIntersect(rect, o)) return false;
    for (const a of actors) if (rectsIntersect(rect, a)) return false;
    return true;
  }
  for (let r = 0; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const tx = startTx + dx;
        const ty = startTy + dy;
        const px = Math.floor(tx * TILE + (TILE - w) / 2);
        const py = Math.floor(ty * TILE + (TILE - h) / 2);
        if (isFree(px, py)) return { x: px, y: py };
      }
    }
  }
  return null;
}
