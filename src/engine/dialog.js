import { runtime, npcs, companions, spawnCompanion, removeCompanion, spawnNpc, obstacles, world, player } from './state.js';
import { enterChat, setOverlayDialog, exitChat, updatePartyUI, showBanner, showMusicTheme } from './ui.js';
import { companionDialogs } from '../data/companion_dialogs.js';
import { canopyDialog, yornaDialog, holaDialog } from '../data/dialogs.js';
import { saveGame, loadGame, clearSave, getSaveMeta } from './save.js';
import { TILE } from './constants.js';
import { rectsIntersect } from './utils.js';
import { sampleItems, cloneItem } from '../data/items.js';
import { playSfx } from './audio.js';

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

// Debug menu
export function startDebugMenu() {
  const choices = [
    { label: 'Run Light Tests (both)', action: 'debug_run_all' },
    { label: 'Test: Opened Chest Persistence', action: 'debug_run_chest' },
    { label: 'Test: VN Intro Cooldown', action: 'debug_run_vn' },
    { label: 'Test: Enemy Intro After Load (vnId)', action: 'debug_run_enemy_intro' },
    { label: `God Mode: ${runtime.godMode ? 'On' : 'Off'}`, action: 'toggle_godmode' },
    { label: 'Back', action: 'end' },
  ];
  startPrompt(null, 'Debug', choices);
}

export function renderCurrentNode() {
  if (!runtime.activeDialog) return;
  const { tree, nodeId } = runtime.activeDialog;
  const node = tree.nodes[nodeId];
  if (!node) { setOverlayDialog('...', []); return; }
  // Filter choices by optional requirements (affinity and/or flags)
  const rawChoices = node.choices || [];
  const filtered = [];
  for (const ch of rawChoices) {
    if (!ch || !ch.requires) { filtered.push(ch); continue; }
    if (meetsRequirement(ch.requires)) filtered.push(ch);
  }
  setOverlayDialog(node.text || '', filtered);
  // Sidebar placeholder removed; VN overlay displays choices
}

export function selectChoice(index) {
  if (!runtime.activeDialog) return;
  const { tree } = runtime.activeDialog;
  const node = tree.nodes[runtime.activeDialog.nodeId];
  if (!node || !node.choices) return;
  // Apply the same filter as render to maintain index mapping
  const rawChoices = node.choices || [];
  const choices = [];
  for (const ch of rawChoices) { if (!ch || !ch.requires || meetsRequirement(ch.requires)) choices.push(ch); }
  const choice = choices[index];
  if (!choice) return;
  // No turn-based battle actions; only VN/inventory/save actions are handled.
  if (choice.action === 'end') { endDialog(); exitChat(runtime); return; }
  if (choice.action === 'game_over_restart') { try { window.location.reload(); } catch {} return; }
  if (choice.action === 'affinity_add') { handleAffinityAdd(choice.data); if (!choice.next) { endDialog(); exitChat(runtime); } else { runtime.activeDialog.nodeId = choice.next; renderCurrentNode(); } return; }
  if (choice.action === 'start_quest') { handleStartQuest(choice.data); if (!choice.next) { endDialog(); exitChat(runtime); } else { runtime.activeDialog.nodeId = choice.next; renderCurrentNode(); } return; }
  if (choice.action === 'set_flag') { handleSetFlag(choice.data); if (!choice.next) { endDialog(); exitChat(runtime); } else { runtime.activeDialog.nodeId = choice.next; renderCurrentNode(); } return; }
  if (choice.action === 'join_party') {
    const npc = runtime.activeNpc;
    if (npc) {
      // Enforce party size limit
      if (companions.length >= 3) {
        setOverlayDialog('Your party is full (max 3).', [ { label: 'Ok', action: 'end' } ]);
        return;
      }
      // Spawn as companion using NPC sheet if available
      spawnCompanion(npc.x, npc.y, npc.sheet || null, { name: npc.name || 'Companion', portrait: npc.portraitSrc, affinity: (typeof npc.affinity === 'number') ? npc.affinity : 5 });
      // Remove NPC from world
      const idx = npcs.indexOf(npc);
      if (idx !== -1) npcs.splice(idx, 1);
      updatePartyUI(companions);
      showBanner(`${npc.name || 'Companion'} joined your party!`);
      try { playSfx('partyJoin'); } catch {}
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
    // If peaceful, show the companion theme label (actual spotlighting depends on audio system)
    try { if ((runtime.musicMode || 'normal') === 'normal') showMusicTheme(`Companion: ${comp?.name || 'Companion'}`); } catch {}
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
  if (choice.action === 'vn_continue') {
    // Close this VN; ui.exitChat will immediately open the next queued VN if any
    exitChat(runtime);
    return;
  }
  if (choice.action === 'save_game_slot') { requestSaveSlot(choice.data || 1); return; }
  if (choice.action === 'load_game_slot') { runtime.lockOverlay = false; loadGame(choice.data || 1); endDialog(); exitChat(runtime); runtime.gameOver = false; return; }
  if (choice.action === 'clear_save_slot') { requestClearSlot(choice.data || 1); return; }
  if (choice.action === 'toggle_autosave') { runtime.autosaveEnabled = !runtime.autosaveEnabled; buildAndShowSaveMenu(); return; }
  if (choice.action === 'open_slot') { openSaveSlotMenu(choice.data || 1); return; }
  if (choice.action === 'open_save_menu') { startSaveMenu(); return; }
  if (choice.action === 'confirm_save_slot') { saveGame(choice.data || 1); endDialog(); exitChat(runtime); return; }
  if (choice.action === 'confirm_clear_slot') { clearSave(choice.data || 1); endDialog(); exitChat(runtime); return; }
  if (choice.action === 'save_menu_back') { buildAndShowSaveMenu(); return; }
  if (choice.action === 'open_debug') { startDebugMenu(); return; }
  if (choice.action === 'toggle_godmode') { runtime.godMode = !runtime.godMode; showBanner(`God Mode ${runtime.godMode ? 'Enabled' : 'Disabled'}`); startDebugMenu(); return; }
  if (choice.action === 'debug_run_all') {
    (async () => {
      try {
        const mod = await import('../dev/light_tests.js');
        const res = await (mod.runLightSaveTests ? mod.runLightSaveTests() : window.runLightSaveTests());
        const text = res && res.ok ? 'All debug tests passed.' : 'Debug tests failed. See console.';
        startPrompt(null, text, [ { label: 'OK', action: 'end' } ]);
      } catch (e) {
        startPrompt(null, 'Could not run debug tests.', [ { label: 'OK', action: 'end' } ]);
      }
    })();
    return;
  }
  if (choice.action === 'debug_run_chest') {
    (async () => {
      try {
        const mod = await import('../dev/light_tests.js');
        const res = await (mod.testOpenedChestPersistence ? mod.testOpenedChestPersistence(9) : window.testOpenedChestPersistence(9));
        const text = res && res.ok ? 'Chest persistence: OK' : `Chest persistence: FAIL (${res && res.details || 'See console'})`;
        startPrompt(null, text, [ { label: 'OK', action: 'end' } ]);
      } catch (e) {
        startPrompt(null, 'Could not run chest test.', [ { label: 'OK', action: 'end' } ]);
      }
    })();
    return;
  }
  if (choice.action === 'debug_run_vn') {
    (async () => {
      try {
        const mod = await import('../dev/light_tests.js');
        const res = await (mod.testVnIntroCooldown ? mod.testVnIntroCooldown() : window.testVnIntroCooldown());
        const text = res && res.ok ? 'VN intro cooldown: OK' : `VN intro cooldown: FAIL (${res && res.details || 'See console'})`;
        startPrompt(null, text, [ { label: 'OK', action: 'end' } ]);
      } catch (e) {
        startPrompt(null, 'Could not run VN cooldown test.', [ { label: 'OK', action: 'end' } ]);
      }
    })();
    return;
  }
  if (choice.action === 'debug_run_enemy_intro') {
    (async () => {
      try {
        const mod = await import('../dev/light_tests.js');
        const res = await (mod.testEnemyIntroAfterLoadById ? mod.testEnemyIntroAfterLoadById(8) : window.testEnemyIntroAfterLoadById(8));
        const text = res && res.ok ? 'Enemy intro after load: OK' : `Enemy intro after load: FAIL (${res && res.details || 'See console'})`;
        startPrompt(null, text, [ { label: 'OK', action: 'end' } ]);
      } catch (e) {
        startPrompt(null, 'Could not run enemy intro test.', [ { label: 'OK', action: 'end' } ]);
      }
    })();
    return;
  }
  if (choice.action === 'inventory_back') { startInventoryMenu(); return; }
  if (choice.action === 'inv_slot') { openSlotMenu(choice.data.actorTag, choice.data.slot); return; }
  if (choice.action === 'inv_equip') { doEquip(choice.data.actorTag, choice.data.slot, undefined, choice.data.itemId); openInventoryMenu(choice.data.actorTag); return; }
  if (choice.action === 'inv_unequip') { doUnequip(choice.data.actorTag, choice.data.slot); openInventoryMenu(choice.data.actorTag); return; }
  if (choice.action === 'inv_add_samples') { addSamples(choice.data.actorTag); openInventoryMenu(choice.data.actorTag); return; }
  if (choice.action === 'inv_transfer_pick') { openTransferSelectItem(choice.data.actorTag); return; }
  if (choice.action === 'inv_transfer_target') { openTransferSelectTarget(choice.data.actorTag, choice.data.itemId); return; }
  if (choice.action === 'inv_transfer_do') { doTransfer(choice.data.from, choice.data.to, choice.data.itemId); openInventoryMenu(choice.data.from); return; }
  if (choice.action === 'inv_quick_list') { openQuickEquipList(choice.data.actorTag); return; }
  if (choice.action === 'inv_quick_equip') { doEquip(choice.data.actorTag, choice.data.slot, undefined, choice.data.itemId); openQuickEquipList(choice.data.actorTag); return; }
  if (choice.action === 'inv_item_actions') { openItemActions(choice.data.actorTag, choice.data.itemId); return; }
  if (choice.action === 'inv_drop_one') { dropItem(choice.data.actorTag, choice.data.itemId, 1); openQuickEquipList(choice.data.actorTag); return; }
  if (choice.action === 'inv_drop_all') { dropItem(choice.data.actorTag, choice.data.itemId, Infinity); openQuickEquipList(choice.data.actorTag); return; }
  if (choice.action === 'inv_salvage_one') { salvageItem(choice.data.actorTag, choice.data.itemId, 1); openQuickEquipList(choice.data.actorTag); return; }
  if (choice.action === 'inv_salvage_all') { salvageItem(choice.data.actorTag, choice.data.itemId, Infinity); openQuickEquipList(choice.data.actorTag); return; }
  if (choice.next) { runtime.activeDialog.nodeId = choice.next; renderCurrentNode(); return; }
}

// ---- Affinity helpers ----
function getCompanionByName(nameLower) {
  const key = String(nameLower || '').toLowerCase();
  if (!key) return null; // avoid matching every name with empty string
  for (const c of companions) {
    const nm = (c.name || '').toLowerCase();
    if (nm.includes(key)) return c;
  }
  return null;
}

function resolveEntityForAffinity(target) {
  if (!target) return null;
  const t = String(target).toLowerCase();
  if (t === 'active') {
    // Prefer active NPC; if absent, do not guess — fail gating cleanly
    const actor = runtime.activeNpc;
    return actor || null;
  }
  // Try companions first, then NPCs by name includes
  const comp = getCompanionByName(t);
  if (comp) return comp;
  const key = t;
  for (const n of npcs) { const nm = (n.name || '').toLowerCase(); if (nm.includes(key)) return n; }
  return null;
}

function meetsRequirement(req) {
  try {
    // Affinity gate
    if (req.target || typeof req.min === 'number' || typeof req.max === 'number') {
      const t = resolveEntityForAffinity(req.target || 'active');
      if (!t) return false;
      const aff = typeof t.affinity === 'number' ? t.affinity : 0;
      if (typeof req.min === 'number' && aff < req.min) return false;
      if (typeof req.max === 'number' && aff > req.max) return false;
    }
    // Flag gate
    if (req.flag) {
      const has = !!(runtime.questFlags && runtime.questFlags[req.flag]);
      if (req.not) { if (has) return false; } else { if (!has) return false; }
    }
    if (req.hasFlag) {
      const key = String(req.hasFlag);
      if (!(runtime.questFlags && runtime.questFlags[key])) return false;
    }
    if (req.missingFlag) {
      const key = String(req.missingFlag);
      if (runtime.questFlags && runtime.questFlags[key]) return false;
    }
    // Party composition gates
    if (req.partyHas) {
      const names = Array.isArray(req.partyHas) ? req.partyHas : [req.partyHas];
      for (const nm of names) {
        const key = String(nm || '').toLowerCase();
        if (!key) return false;
        const found = companions.some(c => (c.name || '').toLowerCase().includes(key));
        if (!found) return false; // require all listed to be present
      }
    }
    if (req.partyHasAny) {
      const list = Array.isArray(req.partyHasAny) ? req.partyHasAny : [req.partyHasAny];
      const hasAny = list.some(nm => companions.some(c => (c.name || '').toLowerCase().includes(String(nm || '').toLowerCase())));
      if (!hasAny) return false;
    }
    return true;
  } catch { return true; }
}

function handleAffinityAdd(data) {
  try {
    const amt = (typeof data?.amount === 'number') ? data.amount : 0;
    const tgt = data?.target || 'active';
    const flag = data?.flag || null;
    if (flag && runtime.affinityFlags && runtime.affinityFlags[flag]) return; // already applied
    const ent = resolveEntityForAffinity(tgt);
    if (!ent) return;
    let delta = amt;
    // Chemistry dampeners (only for positive deltas and companions in party)
    try {
      if (delta > 0 && Array.isArray(companions) && companions.includes(ent)) {
        const names = companions.map(c => (c.name || '').toLowerCase());
        const has = (n) => names.some(x => x.includes(String(n).toLowerCase()));
        const flags = runtime.questFlags || {};
        // Twil ↔ Hola: Hola gets -40% while Twil present and no truce
        if (!flags['hola_twil_truce'] && has('twil') && has('hola')) {
          if ((ent.name || '').toLowerCase().includes('hola')) delta *= 0.6;
        }
        // Yorna ↔ Oyin: Oyin -30%, Yorna -10% while together without truce
        if (!flags['yorna_oyin_truce'] && has('yorna') && has('oyin')) {
          const nm = (ent.name || '').toLowerCase();
          if (nm.includes('oyin')) delta *= 0.7;
          else if (nm.includes('yorna')) delta *= 0.9;
        }
        // Canopy ↔ Yorna: soft cap at 8.0 until respect
        if (!flags['canopy_yorna_respect'] && has('canopy') && has('yorna')) {
          const current = (typeof ent.affinity === 'number') ? ent.affinity : 5;
          const cap = 8.0;
          if (current < cap && current + delta > cap) delta = cap - current;
        }
      }
    } catch {}
    ent.affinity = Math.max(1, Math.min(10, (typeof ent.affinity === 'number' ? ent.affinity : 5) + delta));
    if (flag) runtime.affinityFlags[flag] = true;
    // Feedback
    try { const shown = Math.round(delta * 100) / 100; if (shown !== 0) showBanner(`${ent.name || 'Companion'} affinity ${delta >= 0 ? '+' : ''}${shown}`); } catch {}
    // Refresh party UI so hearts/values reflect the new affinity immediately
    try { updatePartyUI(companions); } catch {}
    // Player XP: floor(10 * positive delta)
    try {
      const pos = Math.max(0, delta);
      const xp = Math.floor(10 * pos);
      if (xp > 0) import('./state.js').then(m => m.grantXpToActor(m.player, xp));
    } catch {}
  } catch {}
}

function handleSetFlag(data) {
  try {
    const key = String(data?.key || '').trim();
    if (!key) return;
    if (!runtime.questFlags) runtime.questFlags = {};
    runtime.questFlags[key] = true;
  } catch {}
}

function handleStartQuest(data) {
  try {
    const id = String(data?.id || '').trim();
    if (!id) return;
    if (!runtime.questFlags) runtime.questFlags = {};
    if (runtime.questFlags[id + '_started']) return; // already started
    runtime.questFlags[id + '_started'] = true;
    if (!runtime.questCounters) runtime.questCounters = {};
    // Fetch/Deliver: Canopy — Sister's Ribbon (spawn quest item near player)
    if (id === 'canopy_fetch_ribbon') {
      import('./state.js').then(m => {
        const { player, spawnPickup } = m;
        import('../data/loot.js').then(L => {
          try {
            const it = L.itemById('relic_canopy');
            if (it) spawnPickup(Math.round(player.x + 30), Math.round(player.y), it);
          } catch {}
        }).catch(()=>{});
        try {
          if (!runtime.questMeta) runtime.questMeta = {};
          runtime.questMeta['canopy_fetch_ribbon'] = { keyId: 'relic_canopy', gateId: 'ribbon_pedestal', consumeOnUse: true, clearBanner: 'Quest updated: Ribbon returned' };
        } catch {}
      }).catch(()=>{});
      try { showBanner('Quest started: Return the Ribbon — Find and place it'); } catch {}
    }
    // Yorna: Cut the Knot — spawn two featured targets
    if (id === 'yorna_knot') {
      import('./state.js').then(m => {
        const { player, spawnEnemy } = m;
        const dx = 160, dy = 120;
        spawnEnemy(player.x + dx, player.y - dy, 'featured', { name: 'Ambusher', questId: 'yorna_knot', hp: 7, dmg: 4 });
        spawnEnemy(player.x - dx, player.y + dy, 'featured', { name: 'Stalker', questId: 'yorna_knot', hp: 7, dmg: 4 });
      }).catch(()=>{});
      runtime.questCounters['yorna_knot_remaining'] = 2;
      try { showBanner('Quest started: Cut the Knot — 2 targets'); } catch {}
    } else if (id === 'canopy_triage') {
      import('./state.js').then(m => {
        const { player, spawnEnemy } = m;
        const dx = 120, dy = 90;
        spawnEnemy(player.x + dx, player.y, 'mook', { name: 'Snare', questId: 'canopy_triage', hp: 6, dmg: 5 });
        spawnEnemy(player.x - dx, player.y - dy, 'mook', { name: 'Snare', questId: 'canopy_triage', hp: 6, dmg: 5 });
        spawnEnemy(player.x, player.y + dy, 'mook', { name: 'Snare', questId: 'canopy_triage', hp: 6, dmg: 5 });
      }).catch(()=>{});
      runtime.questCounters['canopy_triage_remaining'] = 3;
      try { showBanner('Quest started: Breath and Bandages — 3 targets'); } catch {}
  } else if (id === 'hola_practice') {
      runtime.questCounters['hola_practice_uses'] = 0;
      try { showBanner('Quest started: Find Her Voice — Use Gust twice'); } catch {}
    } else if (id === 'oyin_fuse') {
      runtime.questCounters['oyin_fuse_kindled'] = 0;
      runtime.questFlags['oyin_fuse_rally'] = false;
      try { showBanner('Quest started: Light the Fuse — Kindle 3 + Rally once'); } catch {}
    } else if (id === 'twil_trace') {
      import('./state.js').then(m => {
        const { player, spawnEnemy } = m;
        const dx = 140, dy = 100;
        spawnEnemy(player.x + dx, player.y - dy, 'mook', { name: 'Shadow', questId: 'twil_trace', hp: 6, dmg: 5 });
        spawnEnemy(player.x - dx, player.y + dy, 'mook', { name: 'Shadow', questId: 'twil_trace', hp: 6, dmg: 5 });
        spawnEnemy(player.x + dx, player.y + dy, 'mook', { name: 'Shadow', questId: 'twil_trace', hp: 6, dmg: 5 });
      }).catch(()=>{});
      runtime.questCounters['twil_trace_remaining'] = 3;
      try { showBanner('Quest started: Trace the Footprints — 3 targets'); } catch {}
    } else if (id === 'yorna_ring') {
      // Level 2 Yorna quest: defeat three Ring Captains (featured foes)
      import('./state.js').then(m => {
        const { player, spawnEnemy } = m;
        const dx = 160, dy = 120;
        spawnEnemy(player.x + dx, player.y - dy, 'featured', { name: 'Ring Captain', questId: 'yorna_ring', hp: 8, dmg: 4 });
        spawnEnemy(player.x - dx, player.y + dy, 'featured', { name: 'Ring Captain', questId: 'yorna_ring', hp: 8, dmg: 4 });
        spawnEnemy(player.x + dx, player.y + dy, 'featured', { name: 'Ring Captain', questId: 'yorna_ring', hp: 8, dmg: 4 });
      }).catch(()=>{});
      runtime.questCounters['yorna_ring_remaining'] = 3;
      try { showBanner('Quest started: Shatter the Ring — 3 targets'); } catch {}
    } else if (id === 'yorna_causeway') {
      // Level 3 Yorna quest: defeat three Causeway Wardens (tougher mooks)
      import('./state.js').then(m => {
        const { player, spawnEnemy } = m;
        const dx = 160, dy = 120;
        spawnEnemy(player.x + dx, player.y - dy, 'mook', { name: 'Causeway Warden', questId: 'yorna_causeway', hp: 6, dmg: 5 });
        spawnEnemy(player.x - dx, player.y + dy, 'mook', { name: 'Causeway Warden', questId: 'yorna_causeway', hp: 6, dmg: 5 });
        spawnEnemy(player.x + dx, player.y + dy, 'mook', { name: 'Causeway Warden', questId: 'yorna_causeway', hp: 6, dmg: 5 });
      }).catch(()=>{});
      runtime.questCounters['yorna_causeway_remaining'] = 3;
      try { showBanner('Quest started: Hold the Causeway — 3 targets'); } catch {}
    } else if (id === 'canopy_sister2') {
      // Level 2 quest: defeat three Urathar scouts to recover a ribbon clue
      import('./state.js').then(m => {
        const { player, spawnEnemy } = m;
        const dx = 150, dy = 110;
        spawnEnemy(player.x + dx, player.y - dy, 'featured', { name: 'Urathar Scout', questId: 'canopy_sister2', hp: 7, dmg: 4 });
        spawnEnemy(player.x - dx, player.y + dy, 'featured', { name: 'Urathar Scout', questId: 'canopy_sister2', hp: 7, dmg: 4 });
        spawnEnemy(player.x + dx, player.y + dy, 'featured', { name: 'Urathar Scout', questId: 'canopy_sister2', hp: 7, dmg: 4 });
      }).catch(()=>{});
      runtime.questCounters['canopy_sister2_remaining'] = 3;
      try { showBanner('Quest started: Ribbon in the Dust — 3 scouts'); } catch {}
    } else if (id === 'canopy_sister3') {
      // Level 3 quest: defeat three Marsh Whisperers to fix the direction of the sister
      import('./state.js').then(m => {
        const { player, spawnEnemy } = m;
        const dx = 160, dy = 120;
        spawnEnemy(player.x + dx, player.y - dy, 'mook', { name: 'Marsh Whisperer', questId: 'canopy_sister3', hp: 6, dmg: 5 });
        spawnEnemy(player.x - dx, player.y + dy, 'mook', { name: 'Marsh Whisperer', questId: 'canopy_sister3', hp: 6, dmg: 5 });
        spawnEnemy(player.x - dx, player.y - dy, 'mook', { name: 'Marsh Whisperer', questId: 'canopy_sister3', hp: 6, dmg: 5 });
      }).catch(()=>{});
      runtime.questCounters['canopy_sister3_remaining'] = 3;
      try { showBanner('Quest started: Reeds and Echoes — 3 whisperers'); } catch {}
    } else if (id === 'hola_silence') {
      // Level 2 Hola quest: defeat three Silencers
      import('./state.js').then(m => {
        const { player, spawnEnemy } = m;
        const dx = 150, dy = 110;
        spawnEnemy(player.x + dx, player.y - dy, 'featured', { name: 'Silencer', questId: 'hola_silence', hp: 7, dmg: 4 });
        spawnEnemy(player.x - dx, player.y + dy, 'featured', { name: 'Silencer', questId: 'hola_silence', hp: 7, dmg: 4 });
        spawnEnemy(player.x + dx, player.y + dy, 'featured', { name: 'Silencer', questId: 'hola_silence', hp: 7, dmg: 4 });
      }).catch(()=>{});
      runtime.questCounters['hola_silence_remaining'] = 3;
      try { showBanner('Quest started: Break the Silence — 3 targets'); } catch {}
    } else if (id === 'hola_breath_bog') {
      // Level 3 Hola quest: defeat three Marsh Whisperers
      import('./state.js').then(m => {
        const { player, spawnEnemy } = m;
        const dx = 160, dy = 120;
        spawnEnemy(player.x + dx, player.y - dy, 'mook', { name: 'Marsh Whisperer', questId: 'hola_breath_bog', hp: 6, dmg: 5 });
        spawnEnemy(player.x - dx, player.y + dy, 'mook', { name: 'Marsh Whisperer', questId: 'hola_breath_bog', hp: 6, dmg: 5 });
        spawnEnemy(player.x - dx, player.y - dy, 'mook', { name: 'Marsh Whisperer', questId: 'hola_breath_bog', hp: 6, dmg: 5 });
      }).catch(()=>{});
      runtime.questCounters['hola_breath_bog_remaining'] = 3;
      try { showBanner('Quest started: Breath Over Bog — 3 whisperers'); } catch {}
    } else if (id === 'oyin_ember') {
      // Level 3 Oyin quest: defeat three Lantern Bearers (featured foes)
      import('./state.js').then(m => {
        const { player, spawnEnemy } = m;
        const dx = 160, dy = 120;
        spawnEnemy(player.x + dx, player.y - dy, 'featured', { name: 'Lantern Bearer', questId: 'oyin_ember', hp: 8, dmg: 4 });
        spawnEnemy(player.x - dx, player.y + dy, 'featured', { name: 'Lantern Bearer', questId: 'oyin_ember', hp: 8, dmg: 4 });
        spawnEnemy(player.x + dx, player.y + dy, 'featured', { name: 'Lantern Bearer', questId: 'oyin_ember', hp: 8, dmg: 4 });
      }).catch(()=>{});
      runtime.questCounters['oyin_ember_remaining'] = 3;
      try { showBanner('Quest started: Carry the Ember — 3 targets'); } catch {}
    } else if (id === 'twil_wake') {
      // Level 3 Twil quest: defeat three Skimmers (tough mooks)
      import('./state.js').then(m => {
        const { player, spawnEnemy } = m;
        const dx = 160, dy = 120;
        spawnEnemy(player.x + dx, player.y - dy, 'mook', { name: 'Skimmer', questId: 'twil_wake', hp: 6, dmg: 5 });
        spawnEnemy(player.x - dx, player.y + dy, 'mook', { name: 'Skimmer', questId: 'twil_wake', hp: 6, dmg: 5 });
        spawnEnemy(player.x + dx, player.y + dy, 'mook', { name: 'Skimmer', questId: 'twil_wake', hp: 6, dmg: 5 });
      }).catch(()=>{});
      runtime.questCounters['twil_wake_remaining'] = 3;
      try { showBanner('Quest started: Cut the Wake — 3 targets'); } catch {}
    } else if (id === 'tin_shallows') {
      // Level 3 Tin quest: defeat three Marsh Stalkers (featured foes)
      import('./state.js').then(m => {
        const { player, spawnEnemy } = m;
        const dx = 160, dy = 120;
        spawnEnemy(player.x + dx, player.y - dy, 'featured', { name: 'Marsh Stalker', questId: 'tin_shallows', hp: 8, dmg: 4 });
        spawnEnemy(player.x - dx, player.y + dy, 'featured', { name: 'Marsh Stalker', questId: 'tin_shallows', hp: 8, dmg: 4 });
        spawnEnemy(player.x + dx, player.y + dy, 'featured', { name: 'Marsh Stalker', questId: 'tin_shallows', hp: 8, dmg: 4 });
      }).catch(()=>{});
      runtime.questCounters['tin_shallows_remaining'] = 3;
      try { showBanner('Quest started: Mark the Shallows — 3 targets'); } catch {}
    } else if (id === 'nellis_beacon') {
      // Level 3 Nellis quest: defeat three Lantern Bearers (featured foes)
      import('./state.js').then(m => {
        const { player, spawnEnemy } = m;
        const dx = 160, dy = 120;
        spawnEnemy(player.x + dx, player.y - dy, 'featured', { name: 'Lantern Bearer', questId: 'nellis_beacon', hp: 8, dmg: 4 });
        spawnEnemy(player.x - dx, player.y + dy, 'featured', { name: 'Lantern Bearer', questId: 'nellis_beacon', hp: 8, dmg: 4 });
        spawnEnemy(player.x + dx, player.y + dy, 'featured', { name: 'Lantern Bearer', questId: 'nellis_beacon', hp: 8, dmg: 4 });
      }).catch(()=>{});
      runtime.questCounters['nellis_beacon_remaining'] = 3;
      try { showBanner('Quest started: Raise the Beacon — 3 targets'); } catch {}
    } else if (id === 'canopy_streets4') {
      // Level 4 Canopy quest: defeat three Street Bleeders (mooks)
      import('./state.js').then(m => {
        const { player, spawnEnemy } = m;
        const dx = 150, dy = 110;
        spawnEnemy(player.x + dx, player.y - dy, 'mook', { name: 'Street Bleeder', questId: 'canopy_streets4', hp: 6, dmg: 5 });
        spawnEnemy(player.x - dx, player.y + dy, 'mook', { name: 'Street Bleeder', questId: 'canopy_streets4', hp: 6, dmg: 5 });
        spawnEnemy(player.x + dx, player.y + dy, 'mook', { name: 'Street Bleeder', questId: 'canopy_streets4', hp: 6, dmg: 5 });
      }).catch(()=>{});
      runtime.questCounters['canopy_streets4_remaining'] = 3;
      try { showBanner('Quest started: Stitch the Streets — 3 bleeders'); } catch {}
    } else if (id === 'tin_gaps4') {
      // Level 4 Tin quest: defeat three Gap Runners (mooks)
      import('./state.js').then(m => {
        const { player, spawnEnemy } = m;
        const dx = 150, dy = 110;
        spawnEnemy(player.x + dx, player.y - dy, 'mook', { name: 'Gap Runner', questId: 'tin_gaps4', hp: 6, dmg: 5 });
        spawnEnemy(player.x - dx, player.y + dy, 'mook', { name: 'Gap Runner', questId: 'tin_gaps4', hp: 6, dmg: 5 });
        spawnEnemy(player.x + dx, player.y + dy, 'mook', { name: 'Gap Runner', questId: 'tin_gaps4', hp: 6, dmg: 5 });
      }).catch(()=>{});
      runtime.questCounters['tin_gaps4_remaining'] = 3;
      try { showBanner('Quest started: Flag the Gaps — 3 runners'); } catch {}
    } else if (id === 'nellis_crossroads4') {
      // Level 4 Nellis quest: defeat three Signal Thieves (featured foes)
      import('./state.js').then(m => {
        const { player, spawnEnemy } = m;
        const dx = 160, dy = 120;
        spawnEnemy(player.x + dx, player.y - dy, 'featured', { name: 'Signal Thief', questId: 'nellis_crossroads4', hp: 8, dmg: 4 });
        spawnEnemy(player.x - dx, player.y + dy, 'featured', { name: 'Signal Thief', questId: 'nellis_crossroads4', hp: 8, dmg: 4 });
        spawnEnemy(player.x + dx, player.y + dy, 'featured', { name: 'Signal Thief', questId: 'nellis_crossroads4', hp: 8, dmg: 4 });
      }).catch(()=>{});
      runtime.questCounters['nellis_crossroads4_remaining'] = 3;
      try { showBanner('Quest started: Light the Crossroads — 3 thieves'); } catch {}
    } else if (id === 'urn_rooftops') {
      // Level 4 Urn quest: defeat three Rooftop Lurkers (mooks) to secure paths
      import('./state.js').then(m => {
        const { player, spawnEnemy } = m;
        const dx = 150, dy = 110;
        spawnEnemy(player.x + dx, player.y - dy, 'mook', { name: 'Rooftop Lurker', questId: 'urn_rooftops', hp: 6, dmg: 5 });
        spawnEnemy(player.x - dx, player.y + dy, 'mook', { name: 'Rooftop Lurker', questId: 'urn_rooftops', hp: 6, dmg: 5 });
        spawnEnemy(player.x + dx, player.y + dy, 'mook', { name: 'Rooftop Lurker', questId: 'urn_rooftops', hp: 6, dmg: 5 });
      }).catch(()=>{});
      runtime.questCounters['urn_rooftops_remaining'] = 3;
      try { showBanner('Quest started: Secure the Rooftops — 3 nests'); } catch {}
    } else if (id === 'varabella_crossfire') {
      // Level 4 Varabella quest: defeat three Crossfire Captains (featured) to break posts
      import('./state.js').then(m => {
        const { player, spawnEnemy } = m;
        const dx = 160, dy = 120;
        spawnEnemy(player.x + dx, player.y - dy, 'featured', { name: 'Crossfire Captain', questId: 'varabella_crossfire', hp: 8, dmg: 4 });
        spawnEnemy(player.x - dx, player.y + dy, 'featured', { name: 'Crossfire Captain', questId: 'varabella_crossfire', hp: 8, dmg: 4 });
        spawnEnemy(player.x + dx, player.y + dy, 'featured', { name: 'Crossfire Captain', questId: 'varabella_crossfire', hp: 8, dmg: 4 });
      }).catch(()=>{});
      runtime.questCounters['varabella_crossfire_remaining'] = 3;
      try { showBanner('Quest started: Cut the Crossfire — 3 posts'); } catch {}
    }
  } catch {}
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

function sortItemsDefault(items) {
  const order = { head: 0, torso: 1, legs: 2, leftHand: 3, rightHand: 4 };
  return [...items].sort((a, b) => {
    const sa = order[a.slot] ?? 99; const sb = order[b.slot] ?? 99;
    if (sa !== sb) return sa - sb;
    const na = (a.name || '').toLowerCase();
    const nb = (b.name || '').toLowerCase();
    if (na < nb) return -1; if (na > nb) return 1; return 0;
  });
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
    { label: 'Backpack', action: 'inv_quick_list', data: { actorTag } },
    { label: 'Transfer Items (Backpack)', action: 'inv_transfer_pick', data: { actorTag } },
    { label: 'Add Sample Items', action: 'inv_add_samples', data: { actorTag } },
    { label: 'Back', action: 'inventory_back' },
  ];
  startPrompt(actor, `${actor.name || 'Player'} — Equipment`, [...equippedLines, ...actions]);
}

function openSlotMenu(actorTag, slot) {
  const actor = resolveActor(actorTag);
  if (!actor) { startInventoryMenu(); return; }
  let items = (actor.inventory?.items || []).filter(it => it.slot === slot);
  items = sortItemsDefault(items);
  const eq = actor.inventory?.equipped || {};
  const choices = [];
  if (eq[slot]) choices.push({ label: `Unequip ${eq[slot].name}`, action: 'inv_unequip', data: { actorTag, slot } });
  if (items.length) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const suffix = (it.stackable && it.qty > 1) ? ` x${it.qty}` : '';
      choices.push({ label: `Equip ${it.name}${suffix}`, action: 'inv_equip', data: { actorTag, slot, itemId: it.id } });
    }
  } else {
    choices.push({ label: 'No items for this slot', action: 'inventory_back' });
  }
  choices.push({ label: 'Back', action: 'open_inventory', data: actorTag });
  startPrompt(actor, `${slotLabel(slot)} — Choose`, choices);
}

function openQuickEquipList(actorTag) {
  const actor = resolveActor(actorTag);
  if (!actor) { startInventoryMenu(); return; }
  let items = actor.inventory?.items || [];
  items = sortItemsDefault(items);
  const eq = actor.inventory?.equipped || {};
  const choices = [];
  // Unequip options for currently equipped gear
  const slots = ['head','torso','legs','leftHand','rightHand'];
  for (const s of slots) {
    const it = eq[s];
    if (it) choices.push({ label: `Unequip ${it.name} (${slotLabel(s)})`, action: 'inv_unequip', data: { actorTag, slot: s } });
  }
  if (items.length === 0) {
    choices.push({ label: 'Backpack is empty', action: 'open_inventory', data: actorTag });
  } else {
    for (const it of items) {
      const slot = it.slot;
      const suffix = (it.stackable && it.qty > 1) ? ` x${it.qty}` : '';
      const label = `Equip ${it.name}${suffix} (${slotLabel(slot)})`;
      choices.push({ label, action: 'inv_quick_equip', data: { actorTag, itemId: it.id, slot } });
    }
  }
  choices.push({ label: 'Back', action: 'open_inventory', data: actorTag });
  startPrompt(actor, 'Backpack — Click to Equip', choices);
}

function addSamples(actorTag) {
  const actor = resolveActor(actorTag);
  if (!actor) return;
  if (!actor.inventory) actor.inventory = { items: [], equipped: { head:null, torso:null, legs:null, leftHand:null, rightHand:null } };
  for (const s of sampleItems) {
    const it = cloneItem(s);
    import('./state.js').then(m => m.addItemToInventory(actor.inventory, it));
  }
}

function openTransferSelectItem(actorTag) {
  const actor = resolveActor(actorTag);
  if (!actor) return;
  let items = actor.inventory?.items || [];
  items = sortItemsDefault(items);
  const choices = [];
  if (items.length === 0) {
    choices.push({ label: 'Backpack is empty', action: 'open_inventory', data: actorTag });
  } else {
    for (const it of items) {
      const suffix = (it.stackable && it.qty > 1) ? ` x${it.qty}` : '';
      choices.push({ label: `Send ${it.name}${suffix} (${slotLabel(it.slot)})`, action: 'inv_transfer_target', data: { actorTag, itemId: it.id } });
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
  const addOne = async () => {
    const one = cloneItem(it);
    if (one.stackable) one.qty = 1;
    const m = await import('./state.js');
    m.addItemToInventory(to.inventory, one);
  };
  if (it.stackable) {
    it.qty = Math.max(0, (it.qty || 1) - 1);
    if (it.qty === 0) from.inventory.items.splice(idx, 1);
    await addOne();
  } else {
    from.inventory.items.splice(idx, 1);
    await addOne();
  }
}

function openItemActions(actorTag, itemId) {
  const actor = resolveActor(actorTag);
  if (!actor) { startInventoryMenu(); return; }
  const items = actor.inventory?.items || [];
  const idx = items.findIndex(x => x.id === itemId);
  if (idx === -1) { openQuickEquipList(actorTag); return; }
  const it = items[idx];
  const suffix = (it.stackable && it.qty > 1) ? ` x${it.qty}` : '';
  const choices = [];
  if (it.slot) choices.push({ label: `Equip ${it.name}${suffix} (${slotLabel(it.slot)})`, action: 'inv_quick_equip', data: { actorTag, itemId: it.id, slot: it.slot } });
  if (it.stackable && it.qty > 1) {
    choices.push({ label: `Drop 1 ${it.name}`, action: 'inv_drop_one', data: { actorTag, itemId: it.id } });
    choices.push({ label: `Drop all ${it.name} x${it.qty}`, action: 'inv_drop_all', data: { actorTag, itemId: it.id } });
    choices.push({ label: `Salvage 1 ${it.name}`, action: 'inv_salvage_one', data: { actorTag, itemId: it.id } });
    choices.push({ label: `Salvage all ${it.name} x${it.qty}`, action: 'inv_salvage_all', data: { actorTag, itemId: it.id } });
  } else {
    choices.push({ label: `Drop ${it.name}`, action: 'inv_drop_all', data: { actorTag, itemId: it.id } });
    choices.push({ label: `Salvage ${it.name}`, action: 'inv_salvage_all', data: { actorTag, itemId: it.id } });
  }
  choices.push({ label: 'Back', action: 'inv_quick_list', data: { actorTag } });
  startPrompt(actor, `${it.name} — Actions`, choices);
}

async function dropItem(actorTag, itemId, count) {
  const actor = resolveActor(actorTag);
  if (!actor || !actor.inventory) return;
  const idx = (actor.inventory.items || []).findIndex(x => x.id === itemId);
  if (idx === -1) return;
  const it = actor.inventory.items[idx];
  const n = Math.max(1, Math.floor(count || 1));
  const m = await import('./state.js');
  const dropOne = async () => {
    const d = cloneItem(it);
    if (d.stackable) d.qty = Math.min(d.qty || 1, 1);
    m.spawnPickup((actor.x || 0) + (actor.w || 0) / 2 - 5, (actor.y || 0) + (actor.h || 0) / 2 - 5, d);
  };
  if (it.stackable) {
    if (n === Infinity) {
      const all = cloneItem(it);
      m.spawnPickup((actor.x || 0) + (actor.w || 0) / 2 - 5, (actor.y || 0) + (actor.h || 0) / 2 - 5, all);
      actor.inventory.items.splice(idx, 1);
    } else {
      let left = Math.min(n, it.qty || 1);
      while (left-- > 0) await dropOne();
      it.qty = Math.max(0, (it.qty || 1) - Math.min(n, it.qty || 1));
      if (it.qty === 0) actor.inventory.items.splice(idx, 1);
    }
  } else {
    // Non-stackable: drop the single item
    await dropOne();
    actor.inventory.items.splice(idx, 1);
  }
}

function salvageItem(actorTag, itemId, count) {
  const actor = resolveActor(actorTag);
  if (!actor || !actor.inventory) return;
  const idx = (actor.inventory.items || []).findIndex(x => x.id === itemId);
  if (idx === -1) return;
  const it = actor.inventory.items[idx];
  const n = Math.max(1, Math.floor(count || 1));
  if (it.stackable) {
    if (n === Infinity) {
      actor.inventory.items.splice(idx, 1);
    } else {
      it.qty = Math.max(0, (it.qty || 1) - Math.min(n, it.qty || 1));
      if (it.qty === 0) actor.inventory.items.splice(idx, 1);
    }
  } else {
    actor.inventory.items.splice(idx, 1);
  }
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
