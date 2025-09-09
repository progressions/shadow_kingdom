import { runtime, npcs, companions, spawnCompanion, removeCompanion, spawnNpc, obstacles, world, player } from './state.js';
import { enterChat, setOverlayDialog, exitChat, updatePartyUI, showBanner } from './ui.js';
import { companionDialogs } from '../data/companion_dialogs.js';
import { canopyDialog, yornaDialog, holaDialog } from '../data/dialogs.js';
import { saveGame, loadGame, clearSave, getSaveMeta } from './save.js';
import { TILE } from './constants.js';
import { rectsIntersect } from './utils.js';
import { sampleItems, cloneItem } from '../data/items.js';

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

// Game Over overlay: lock exit and offer load/restart actions
export function startGameOver() {
  runtime.gameOver = true;
  runtime.lockOverlay = true;
  const choices = [
    { label: 'Load Slot 1', action: 'load_game_slot', data: 1 },
    { label: 'Load Slot 2', action: 'load_game_slot', data: 2 },
    { label: 'Load Slot 3', action: 'load_game_slot', data: 3 },
    { label: 'Restart', action: 'game_over_restart' },
  ];
  startPrompt(null, 'You have fallen. Game Over.', choices);
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
    { label: 'Inventory', action: 'open_inventory', data: comp },
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
  // No turn-based battle actions; only VN/inventory/save actions are handled.
  if (choice.action === 'end') { endDialog(); exitChat(runtime); return; }
  if (choice.action === 'game_over_restart') { try { window.location.reload(); } catch {} return; }
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
  if (choice.action === 'open_inventory') {
    const tag = (typeof choice.data !== 'undefined') ? choice.data : (runtime.activeNpc || null);
    openInventoryMenu(tag);
    return;
  }
  if (choice.action === 'save_game_slot') { requestSaveSlot(choice.data || 1); return; }
  if (choice.action === 'load_game_slot') { runtime.lockOverlay = false; loadGame(choice.data || 1); endDialog(); exitChat(runtime); runtime.gameOver = false; return; }
  if (choice.action === 'clear_save_slot') { requestClearSlot(choice.data || 1); return; }
  if (choice.action === 'toggle_autosave') { runtime.autosaveEnabled = !runtime.autosaveEnabled; buildAndShowSaveMenu(); return; }
  if (choice.action === 'open_slot') { openSaveSlotMenu(choice.data || 1); return; }
  if (choice.action === 'confirm_save_slot') { saveGame(choice.data || 1); endDialog(); exitChat(runtime); return; }
  if (choice.action === 'confirm_clear_slot') { clearSave(choice.data || 1); endDialog(); exitChat(runtime); return; }
  if (choice.action === 'save_menu_back') { buildAndShowSaveMenu(); return; }
  if (choice.action === 'inventory_back') { startInventoryMenu(); return; }
  if (choice.action === 'inv_slot') { openSlotMenu(choice.data.actorTag, choice.data.slot); return; }
  if (choice.action === 'inv_equip') { doEquip(choice.data.actorTag, choice.data.slot, undefined, choice.data.itemId); openInventoryMenu(choice.data.actorTag); return; }
  if (choice.action === 'inv_unequip') { doUnequip(choice.data.actorTag, choice.data.slot); openInventoryMenu(choice.data.actorTag); return; }
  if (choice.action === 'inv_add_samples') { addSamples(choice.data.actorTag); openInventoryMenu(choice.data.actorTag); return; }
  if (choice.action === 'inv_transfer_pick') { openTransferSelectItem(choice.data.actorTag); return; }
  if (choice.action === 'inv_transfer_target') { openTransferSelectTarget(choice.data.actorTag, choice.data.itemId); return; }
  if (choice.action === 'inv_transfer_do') { doTransfer(choice.data.from, choice.data.to, choice.data.itemId); openInventoryMenu(choice.data.from); return; }
  if (choice.next) { runtime.activeDialog.nodeId = choice.next; renderCurrentNode(); return; }
}

// Inventory menus
export function startInventoryMenu() {
  // Choose actor: Player or companions
  const choices = [
    { label: 'Player', action: 'open_inventory', data: 'player' },
    ...companions.map((c, i) => ({ label: c.name || `Companion ${i+1}`, action: 'open_inventory', data: i })),
    { label: 'Close', action: 'end' },
  ];
  startPrompt(null, 'Inventory — Choose Character', choices);
}

function resolveActor(tag) {
  if (tag === 'player') return runtime._playerRef || null;
  if (typeof tag === 'number') return companions[tag] || null;
  return tag || null;
}

function slotLabel(slot) {
  const map = { head: 'Head', torso: 'Torso', legs: 'Legs', leftHand: 'Left Hand', rightHand: 'Right Hand' };
  return map[slot] || slot;
}

async function openInventoryMenu(actorTag) {
  // Attach player ref once (runtime has no direct player export here)
  if (!runtime._playerRef) runtime._playerRef = (await import('./state.js')).player;
  const actor = resolveActor(actorTag);
  if (!actor) { startInventoryMenu(); return; }
  const eq = actor.inventory?.equipped || {};
  const equippedLines = ['head','torso','legs','leftHand','rightHand'].map(s => {
    const it = eq[s];
    return { label: `${slotLabel(s)}: ${it ? it.name : '(empty)'}`, action: 'inv_slot', data: { actorTag, slot: s } };
  });
  const actions = [
    { label: 'Transfer Items (Backpack)', action: 'inv_transfer_pick', data: { actorTag } },
    { label: 'Add Sample Items', action: 'inv_add_samples', data: { actorTag } },
    { label: 'Back', action: 'inventory_back' },
  ];
  startPrompt(actor, `${actor.name || 'Player'} — Equipment`, [...equippedLines, ...actions]);
}

function openSlotMenu(actorTag, slot) {
  const actor = resolveActor(actorTag);
  if (!actor) { startInventoryMenu(); return; }
  const items = (actor.inventory?.items || []).filter(it => it.slot === slot);
  const eq = actor.inventory?.equipped || {};
  const choices = [];
  if (eq[slot]) choices.push({ label: `Unequip ${eq[slot].name}`, action: 'inv_unequip', data: { actorTag, slot } });
  if (items.length) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      choices.push({ label: `Equip ${it.name}`, action: 'inv_equip', data: { actorTag, slot, itemId: it.id } });
    }
  } else {
    choices.push({ label: 'No items for this slot', action: 'inventory_back' });
  }
  choices.push({ label: 'Back', action: 'open_inventory', data: actorTag });
  startPrompt(actor, `${slotLabel(slot)} — Choose`, choices);
}

function addSamples(actorTag) {
  const actor = resolveActor(actorTag);
  if (!actor) return;
  if (!actor.inventory) actor.inventory = { items: [], equipped: { head:null, torso:null, legs:null, leftHand:null, rightHand:null } };
  for (const s of sampleItems) actor.inventory.items.push(cloneItem(s));
}

function openTransferSelectItem(actorTag) {
  const actor = resolveActor(actorTag);
  if (!actor) return;
  const items = actor.inventory?.items || [];
  const choices = [];
  if (items.length === 0) {
    choices.push({ label: 'Backpack is empty', action: 'open_inventory', data: actorTag });
  } else {
    for (const it of items) {
      choices.push({ label: `Send ${it.name} (${slotLabel(it.slot)})`, action: 'inv_transfer_target', data: { actorTag, itemId: it.id } });
    }
  }
  choices.push({ label: 'Back', action: 'open_inventory', data: actorTag });
  startPrompt(actor, 'Select item to transfer', choices);
}

function openTransferSelectTarget(actorTag, itemId) {
  const actor = resolveActor(actorTag);
  if (!actor) return;
  const targets = [{ label: 'Player', tag: 'player' }, ...companions.map((c, i) => ({ label: c.name || `Companion ${i+1}`, tag: i }))]
    .filter(t => !(t.tag !== 'player' && resolveActor(t.tag) === actor));
  const choices = targets.map(t => ({ label: t.label, action: 'inv_transfer_do', data: { from: actorTag, to: t.tag, itemId } }));
  choices.push({ label: 'Back', action: 'inv_transfer_pick', data: { actorTag } });
  startPrompt(actor, 'Send to who?', choices);
}

async function doTransfer(fromTag, toTag, itemId) {
  if (!runtime._playerRef) runtime._playerRef = (await import('./state.js')).player;
  const from = resolveActor(fromTag);
  const to = resolveActor(toTag);
  if (!from || !to || !from.inventory || !to.inventory) return;
  const idx = (from.inventory.items || []).findIndex(x => x.id === itemId);
  if (idx === -1) return;
  const it = from.inventory.items[idx];
  // Only transfer backpack items; to equip, open their inventory later
  from.inventory.items.splice(idx, 1);
  to.inventory.items.push(cloneItem(it));
}

async function openSaveSlotMenu(slot) {
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

async function requestSaveSlot(slot) {
  const meta = await getSaveMeta(slot);
  if (meta.exists) {
    startPrompt(null, `Overwrite Slot ${slot}?`, [
      { label: 'Yes, overwrite', action: 'confirm_save_slot', data: slot },
      { label: 'Back', action: 'save_menu_back' },
    ]);
  } else {
    saveGame(slot); endDialog(); exitChat(runtime);
  }
}

async function requestClearSlot(slot) {
  const meta = await getSaveMeta(slot);
  if (!meta.exists) { buildAndShowSaveMenu(); return; }
  startPrompt(null, `Clear Slot ${slot}?`, [
    { label: 'Yes, clear', action: 'confirm_clear_slot', data: slot },
    { label: 'Back', action: 'save_menu_back' },
  ]);
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

function doEquip(actorTag, slot, index, itemId) {
  const actor = resolveActor(actorTag);
  if (!actor || !actor.inventory) return;
  const items = actor.inventory.items || [];
  let it = null; let idx = -1;
  if (itemId) {
    idx = items.findIndex(x => x.id === itemId && x.slot === slot);
    if (idx !== -1) it = items[idx];
  } else if (typeof index === 'number') {
    idx = index; it = items[index];
  }
  if (!it || it.slot !== slot) return;
  const eq = actor.inventory.equipped;
  // swap: move currently equipped back to items
  if (eq[slot]) items.push(eq[slot]);
  // equip selected and remove from items
  eq[slot] = it;
  items.splice(idx, 1);
  // Refresh equipment panel
  updatePartyUI(companions);
}

function doUnequip(actorTag, slot) {
  const actor = resolveActor(actorTag);
  if (!actor || !actor.inventory) return;
  const eq = actor.inventory.equipped;
  if (!eq[slot]) return;
  actor.inventory.items.push(eq[slot]);
  eq[slot] = null;
  updatePartyUI(companions);
}
