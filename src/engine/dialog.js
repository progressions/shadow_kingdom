import { runtime, npcs, companions, spawnCompanion, removeCompanion } from './state.js';
import { enterChat, setOverlayDialog, exitChat, updatePartyUI, showBanner } from './ui.js';

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
      // Spawn as companion using NPC sheet if available
      spawnCompanion(npc.x, npc.y, npc.sheet || null, { name: npc.name || 'Companion' });
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
    if (comp) {
      removeCompanion(comp);
      updatePartyUI(companions);
      showBanner(`${comp.name || 'Companion'} left your party.`);
    }
    endDialog();
    exitChat(runtime);
    return;
  }
  if (choice.next) { runtime.activeDialog.nodeId = choice.next; renderCurrentNode(); return; }
}

// Text submission removed; choices selected via number keys or clicked buttons

export function endDialog() {
  runtime.activeDialog = null;
  // keep chat mode open but clear choices; caller may exit chat
}
