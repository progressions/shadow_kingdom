import { runtime, npcs, companions, spawnCompanion, removeCompanion, spawnNpc, obstacles, world, player } from './state.js';
import { setTorchBearer, nearestCompanionTo } from './state.js';
import { sampleLightAtPx } from './lighting.js';
import { enterChat, setOverlayDialog, exitChat, updatePartyUI, showBanner, showMusicTheme, hideBanner, showPersistentBanner } from './ui.js';
import { companionDialogs } from '../data/companion_dialogs.js';
import { canopyDialog, yornaDialog, holaDialog } from '../data/dialogs.js';
import { introTriads, companionTemperaments, temperamentProfiles } from '../data/companion_meta.js';
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
  const list = companions.map((c, i) => {
    let label = c.name || `Companion ${i+1}`;
    try {
      const nm = String(c?.name || '').toLowerCase();
      const inds = runtime.questIndicators || {};
      let found = null;
      for (const k of Object.keys(inds)) { if (nm.includes(k)) { found = inds[k]; break; } }
      if (found && found.new && (runtime?.uiSettings?.questIndicators || 'normal') !== 'off') label = `${label} wants to talk to you`;
    } catch {}
    return { label, action: 'companion_select', data: i };
  });
  if (list.length === 0) {
    // Non-blocking notice; do not enter chat mode
    showBanner('You have no companions.');
    return;
  }
  startPrompt(null, 'Choose a companion:', [ ...list, { label: 'Cancel', action: 'end' } ]);
}

export function startCompanionAction(comp) {
  if (!comp) { startCompanionSelector(); return; }
  const torchOn = (runtime._torchBearerRef === comp);
  const torchLabel = torchOn ? 'Stop carrying torch' : 'Carry a torch (hold the light)';
  const torchAction = torchOn ? 'companion_torch_stop' : 'companion_torch_start';
  // Adjust Talk label when this companion has a new quest available
  let talkLabel = 'Talk';
  try {
    const nm = String(comp?.name || '').toLowerCase();
    const inds = runtime.questIndicators || {};
    let found = null;
    for (const k of Object.keys(inds)) { if (nm.includes(k)) { found = inds[k]; break; } }
    if (found && found.new && (runtime?.uiSettings?.questIndicators || 'normal') !== 'off') {
      talkLabel = `Find out what ${comp.name || 'she'} wants`;
    }
  } catch {}
  startPrompt(comp, `What do you want to do with ${comp.name || 'this companion'}?`, [
    { label: talkLabel, action: 'companion_talk', data: comp },
    { label: torchLabel, action: torchAction, data: comp },
    { label: 'Dismiss', action: 'dismiss_companion', data: comp },
    { label: 'Back', action: 'companion_back' },
  ]);
}

function keyForCompanion(comp) {
  try {
    const raw = String(comp?.name || '').trim().toLowerCase();
    if (!raw) return null;
    if (companionDialogs[raw]) return raw;
    const keys = Object.keys(companionDialogs);
    const exact = keys.find(k => raw === k);
    if (exact) return exact;
    const partial = keys.find(k => raw.includes(k));
    if (partial) return partial;
    return null;
  } catch { return null; }
}

export function openCompanionTalk(comp) {
  if (!comp) return;
  const key = keyForCompanion(comp);
  if (key) {
    try { comp._dialogKey = key; } catch {}
  }
  const tree = key ? companionDialogs[key] : null;
  if (tree) {
    runtime.activeNpc = comp;
    runtime.activeDialog = { tree, nodeId: tree.start || 'root' };
    enterChat(runtime);
    renderCurrentNode();
  } else {
    startPrompt(comp, `${comp?.name || 'Companion'}: Let's keep moving.`, [
      { label: 'Back to companions', action: 'companion_back' },
      { label: 'Close', action: 'end' },
    ]);
  }
  try {
    if ((runtime.musicMode || 'normal') === 'normal') {
      showMusicTheme(`Companion: ${comp?.name || 'Companion'}`);
    }
  } catch {}
}

function torchBark(comp) {
  const name = (comp?.name || '').toLowerCase();
  const aff = (typeof comp?.affinity === 'number') ? comp.affinity : 5;
  const tier = aff >= 8 ? 'high' : aff >= 4 ? 'mid' : 'low';
  const pick = (lines) => lines[Math.floor(Math.random() * lines.length)];
  if (name.includes('twil')) {
    if (tier === 'high') return pick(["I'll carry this one while you carry me later.", "Fire looks better on us."]); 
    if (tier === 'mid') return pick(["I've been carrying a torch for you anyway.", "High or close? I’ll set your angles."]); 
    return pick(["I—uh—yes! The light. I’ll hold the light.", "Got it. Keep aiming."]); 
  }
  if (name.includes('oyin')) {
    if (tier === 'high') return pick(["Torch for you. Courage for me.", "If you lead, I can keep pace."]); 
    if (tier === 'mid') return pick(["I can carry it—if you call the count.", "I’ll match your steps."]); 
    return pick(["I can carry it.", "I’ll hold the light."]); 
  }
  if (name.includes('hola')) {
    if (tier === 'high') return pick(["If you hold the bow, I’ll hold the light.", "Stand close; I’ll speak louder."]); 
    if (tier === 'mid') return pick(["I can hold the light.", "I’ll keep it steady."]); 
    return pick(["Okay. I’ll carry it."]); 
  }
  // Generic
  return "I’ll carry the torch.";
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
    { label: 'Lighting: Ambient 0 (Dark)', action: 'light_ambient', data: 0 },
    { label: 'Lighting: Ambient 4 (Dim)', action: 'light_ambient', data: 4 },
    { label: 'Lighting: Ambient 8 (Bright)', action: 'light_ambient', data: 8 },
    { label: 'Give Torches x3', action: 'debug_give_torches' },
    { label: 'Give Arrows x50', action: 'debug_give_arrows' },
    { label: `God Mode: ${runtime.godMode ? 'On' : 'Off'}`, action: 'toggle_godmode' },
    { label: `Snake Mode: ${runtime.snakeMode ? 'On' : 'Off'}`, action: 'toggle_snake_mode' },
    { label: 'Back', action: 'end' },
  ];
  startPrompt(null, 'Debug', choices);
}

export function renderCurrentNode() {
  if (!runtime.activeDialog) return;
  const { tree, nodeId } = runtime.activeDialog;
  const node = tree.nodes[nodeId];
  if (!node) { setOverlayDialog('...', []); return; }
  // Override: for companion talk intros, present temperament-based triads (Match/Clash/Defer)
  try {
    const nameKey = String(runtime?.activeNpc?.name || '').toLowerCase();
    const triad = (nodeId === 'intro' && nameKey) ? (introTriads[nameKey] || null) : null;
    if (triad) {
      const deferFlag = `${nameKey}_intro_deferred`;
      // Resolve deltas with temperament fallbacks
      const tempKey = companionTemperaments[nameKey] || null;
      const profile = tempKey ? temperamentProfiles[tempKey] : null;
      let matchDelta = (typeof triad.match?.delta === 'number') ? triad.match.delta : (profile ? (profile.introMatch ?? 0.3) : 0.3);
      if (!(matchDelta > 0)) matchDelta = Math.max(0.2, (profile ? (profile.introMatch ?? 0.3) : 0.3));
      let clashDelta = (typeof triad.clash?.delta === 'number') ? triad.clash.delta : (profile ? (profile.introClash ?? 0) : 0);
      const matchFlag = triad.match?.flag || null;
      const matchChoice = { label: String(triad.match?.label || 'Join me.'), action: 'vn_intro_recruit', data: { affinityDelta: matchDelta, flag: matchFlag } };
      const clashChoice = { label: String(triad.clash?.label || 'Join the party.'), action: 'vn_intro_recruit', data: { affinityDelta: clashDelta } };
      const deferChoice = { label: String(triad.defer?.label || 'Not right now.'), action: 'vn_intro_defer', data: { flag: deferFlag } };
      const matchFirst = (typeof triad.matchFirst === 'boolean') ? triad.matchFirst : true;
      const choices = matchFirst ? [ matchChoice, clashChoice, deferChoice ] : [ clashChoice, matchChoice, deferChoice ];
      try { runtime.activeDialog._resolved = { nodeId, choices }; } catch {}
      setOverlayDialog(node.text || '', choices);
      return;
    }
  } catch {}
  // Filter choices by optional requirements (affinity and/or flags)
  const rawChoices = node.choices || [];
  const filtered = [];
  for (const ch of rawChoices) {
    if (!ch || !ch.requires) { filtered.push(ch); continue; }
    if (meetsRequirement(ch.requires)) filtered.push(ch);
  }
  // Node variants: choose the first variant whose 'requires' pass, falling back to base node
  let effectiveText = node.text || '';
  let effectiveChoices = filtered;
  try {
    if (Array.isArray(node.variants) && node.variants.length) {
      let picked = null;
      for (const v of node.variants) {
        if (!v || !v.requires) continue;
        if (meetsRequirement(v.requires)) { picked = v; break; }
      }
      if (!picked) {
        // If a default variant (no requires) is present, use it
        picked = node.variants.find(v => v && !v.requires) || null;
      }
      if (picked) {
        if (typeof picked.text === 'string') effectiveText = picked.text;
        if (Array.isArray(picked.choices)) {
          // Re-filter the picked variant choices by requirements
          const pv = [];
          for (const ch of picked.choices) { if (!ch || !ch.requires || meetsRequirement(ch.requires)) pv.push(ch); }
          effectiveChoices = pv;
        }
      }
    }
  } catch {}
  // Helpers to resolve quest ids for Start and Turn-In entries (used only for sorting)
  function questIdForStartChoice(ch) {
    if (!ch) return null;
    if (ch.action === 'start_quest' && ch.data && ch.data.id) return String(ch.data.id);
    if (ch.next && tree && tree.nodes && tree.nodes[ch.next]) {
      const n2 = tree.nodes[ch.next];
      const q = Array.isArray(n2.choices) ? n2.choices.find(cc => cc && cc.action === 'start_quest' && cc.data && cc.data.id) : null;
      if (q) return String(q.data.id);
    }
    return null;
  }
  function baseFromFlag(flag) {
    try {
      const s = String(flag || '');
      const m = s.match(/^(.*)_(reward|done|cleared|turnin|turn_in)$/);
      return m ? m[1] : null;
    } catch { return null; }
  }
  function questIdFromNodeTurnIn(nid, depth = 0) {
    try {
      if (!nid || !tree || !tree.nodes) return null;
      const n = tree.nodes[nid];
      if (!n) return null;
      const choices = Array.isArray(n.choices) ? n.choices : [];
      for (const c of choices) {
        if (!c) continue;
        if (c.action === 'affinity_add' && c.data && c.data.flag) {
          const b = baseFromFlag(c.data.flag); if (b) return b;
        }
        if (c.action === 'set_flag' && c.data && c.data.key) {
          const b = baseFromFlag(c.data.key); if (b) return b;
        }
      }
      if (depth < 2) {
        for (const c of choices) {
          if (c && c.next) { const r = questIdFromNodeTurnIn(c.next, depth + 1); if (r) return r; }
        }
      }
    } catch {}
    return null;
  }
  function questIdForTurnInChoice(ch) {
    try {
      if (!ch) return null;
      // Prefer requires.flags on the choice itself (e.g., { flag: 'xxx_cleared', missingFlag: 'xxx_done' })
      const req = ch.requires || {};
      if (req && typeof req === 'object') {
        if (req.flag) { const b = baseFromFlag(req.flag); if (b) return b; }
        if (req.missingFlag) { const b = baseFromFlag(req.missingFlag); if (b) return b; }
      }
      // Fallback: inspect the target node for *_reward/_done flags
      if (ch.next) return questIdFromNodeTurnIn(ch.next, 0);
      return null;
    } catch { return null; }
  }

  // No decoration of labels — show authored quest names as-is.
  // Sort companion dialog choices so priority quest entries appear first.
  // Priority order: Turn-In quests first, then New quests, then everything else.
  // "New" = directly starts a quest or leads to a node that offers start_quest.
  // "Turn-In" = resolved via explicit quest flags/metadata.
  try {
    const looksNew = (ch) => !!questIdForStartChoice(ch);
    const looksTurnIn = (ch) => !!questIdForTurnInChoice(ch);
    const looksBack = (ch) => {
      const action = String(ch?.action || '').toLowerCase();
      return action === 'companion_back' || action === 'end';
    };
    const turnins = []; const news = []; const rest = []; const backs = [];
    for (const ch of effectiveChoices) {
      if (looksTurnIn(ch)) turnins.push(ch);
      else if (looksNew(ch)) news.push(ch);
      else if (looksBack(ch)) backs.push(ch);
      else rest.push(ch);
    }
    effectiveChoices = turnins.concat(news, rest, backs);
  } catch {}
  try { runtime.activeDialog._resolved = { nodeId, choices: effectiveChoices.slice() }; } catch {}
  setOverlayDialog(effectiveText, effectiveChoices);
  // Sidebar placeholder removed; VN overlay displays choices
}

export function selectChoice(index) {
  if (!runtime.activeDialog) return;
  const { tree } = runtime.activeDialog;
  const nodeId = runtime.activeDialog.nodeId;
  const node = tree.nodes[nodeId];
  if (!node || !node.choices) return;
  // Special handling: if this is a companion intro node with a temperament triad,
  // rebuild the same triad choices used in renderCurrentNode so indices match.
  try {
    const nameKey = String(runtime?.activeNpc?.name || '').toLowerCase();
    const isIntro = (runtime.activeDialog.nodeId === 'intro');
    const triad = (isIntro && nameKey) ? (introTriads[nameKey] || null) : null;
    if (triad) {
      const deferFlag = `${nameKey}_intro_deferred`;
      // Resolve deltas with temperament fallbacks
      const tempKey = companionTemperaments[nameKey] || null;
      const profile = tempKey ? temperamentProfiles[tempKey] : null;
      let matchDelta = (typeof triad.match?.delta === 'number') ? triad.match.delta : (profile ? (profile.introMatch ?? 0.3) : 0.3);
      if (!(matchDelta > 0)) matchDelta = Math.max(0.2, (profile ? (profile.introMatch ?? 0.3) : 0.3));
      let clashDelta = (typeof triad.clash?.delta === 'number') ? triad.clash.delta : (profile ? (profile.introClash ?? 0) : 0);
      const matchFlag = triad.match?.flag || null;
      const matchChoice = { label: String(triad.match?.label || 'Join me.'), action: 'vn_intro_recruit', data: { affinityDelta: matchDelta, flag: matchFlag } };
      const clashChoice = { label: String(triad.clash?.label || 'Join the party.'), action: 'vn_intro_recruit', data: { affinityDelta: clashDelta } };
      const deferChoice = { label: String(triad.defer?.label || 'Not right now.'), action: 'vn_intro_defer', data: { flag: deferFlag } };
      const matchFirst = (typeof triad.matchFirst === 'boolean') ? triad.matchFirst : true;
      const triadChoices = matchFirst ? [ matchChoice, clashChoice, deferChoice ] : [ clashChoice, matchChoice, deferChoice ];
      const choice = triadChoices[index];
      if (choice) {
        // Manually handle as if it were a standard choice
        if (choice.action === 'vn_intro_recruit') {
          // Reuse the handler below
          const delta = (typeof choice?.data?.affinityDelta === 'number') ? choice.data.affinityDelta : 0;
          const flag = (choice?.data?.flag) ? String(choice.data.flag) : '';
          if (delta !== 0 || flag) {
            handleAffinityAdd({ target: 'active', amount: delta, flag: flag || undefined });
          }
          const npc = runtime.activeNpc;
          let newComp = null;
          if (npc) {
            // Feud gating: Yorna ↔ Canopy cannot join together until truce
            try {
              const nm = String(npc.name || '').toLowerCase();
              const names = companions.map(c => (c.name || '').toLowerCase());
              const has = (s) => names.some(x => x.includes(String(s).toLowerCase()));
              const truce = !!(runtime.questFlags && runtime.questFlags['canopy_yorna_respect']);
              const afterL2 = !!(runtime.questFlags && runtime.questFlags['level2_reached']);
              if (!truce && afterL2) {
                if (nm.includes('yorna') && has('canopy')) {
                  startPrompt(npc, 'Yorna: No. Not while she’s on your line. Choose first.', [ { label: 'Back', action: 'end' } ]);
                  return;
                }
                if (nm.includes('canopy') && has('yorna')) {
                  startPrompt(npc, 'Canopy: My Lord, not with her in the party. Choose first.', [ { label: 'Back', action: 'end' } ]);
                  return;
                }
              }
            } catch {}
            if (companions.length >= 3) {
              const choices = companions.map((c, i) => ({ label: `Replace ${c.name || ('Companion ' + (i+1))}`, action: 'replace_companion', data: i }));
              choices.push({ label: 'I changed my mine, wait here.', action: 'end' });
              startPrompt(npc, `${npc.name || 'Companion'}: Your party is full. Who should I replace?`, choices);
              return;
            }
            newComp = spawnCompanion(npc.x, npc.y, npc.sheet || null, { spriteId: npc.spriteId || null, name: npc.name || 'Companion', portrait: npc.portraitSrc, affinity: (typeof npc.affinity === 'number') ? npc.affinity : ((String(npc.name||'').toLowerCase()==='codex') ? 5 : 3) });
            const idx = npcs.indexOf(npc);
            if (idx !== -1) npcs.splice(idx, 1);
            updatePartyUI(companions);
            const joinMsg = `${npc.name || 'Companion'} joined your party!`;
            const delay = (delta !== 0) ? 900 : 0;
            if (delay > 0) setTimeout(() => { try { showBanner(joinMsg); } catch {} }, delay);
            else showBanner(joinMsg);
            try {
              const nm = String(npc.name || '').toLowerCase();
              const id = String(npc.dialogId || '').toLowerCase();
              if (nm.includes('snake') || nm.includes('snek') || id === 'snake') playSfx('hiss');
              playSfx('partyJoin');
              // Hola quest: Find Yorna — grant reward on recruiting Yorna
              if (nm.includes('yorna')) {
                if (!runtime.questFlags) runtime.questFlags = {};
                if (runtime.questFlags['hola_find_yorna_started'] && !runtime.questFlags['hola_find_yorna_cleared']) {
                  runtime.questFlags['hola_find_yorna_cleared'] = true;
                  import('./quests.js').then(q => q.autoTurnInIfCleared && q.autoTurnInIfCleared('hola_find_yorna')).catch(()=>{});
                }
              }
              if (!runtime.questFlags) runtime.questFlags = {};
              if (nm.includes('hola')) {
                if (runtime.questFlags['yorna_find_hola_started'] && !runtime.questFlags['yorna_find_hola_cleared']) {
                  runtime.questFlags['yorna_find_hola_cleared'] = true;
                  import('./quests.js').then(q => q.autoTurnInIfCleared && q.autoTurnInIfCleared('yorna_find_hola')).catch(()=>{});
                }
              }
              if (nm.includes('canopy') && runtime.questFlags['tutorial_save_canopy']) {
                runtime.questFlags['tutorial_save_canopy_done'] = true;
                runtime.questFlags['tutorial_save_canopy'] = false;
                hideBanner();
              }
            } catch {}
          }
          endDialog();
          if (newComp) {
            exitChat(runtime);
            openCompanionTalk(newComp);
            return;
          }
          exitChat(runtime);
          return;
        }
        if (choice.action === 'vn_intro_defer') {
          try { if (choice?.data?.flag) handleSetFlag({ key: String(choice.data.flag) }); } catch {}
          endDialog(); exitChat(runtime); return;
        }
      }
      // If out-of-range or unrecognized, fall through to normal flow
    }
  } catch {}
  // Use the resolved/visible choices (sorted/filtered) to keep index mapping with the UI
  let choice = null;
  try {
    const r = runtime.activeDialog._resolved;
    if (r && r.nodeId === nodeId && Array.isArray(r.choices)) {
      choice = r.choices[index];
    }
  } catch {}
  if (!choice) {
    // Fallback: filter like render (without special sorting) if resolved mapping missing
    const rawChoices = node.choices || [];
    const choices = [];
    for (const ch of rawChoices) { if (!ch || !ch.requires || meetsRequirement(ch.requires)) choices.push(ch); }
    choice = choices[index];
  }
  if (!choice) return;
  // No turn-based battle actions; only VN/inventory/save actions are handled.
  if (choice.action === 'end') { endDialog(); exitChat(runtime); return; }
  if (choice.action === 'game_over_restart') { try { window.location.reload(); } catch {} return; }
  if (choice.action === 'affinity_add') { handleAffinityAdd(choice.data); if (!choice.next) { endDialog(); exitChat(runtime); } else { runtime.activeDialog.nodeId = choice.next; renderCurrentNode(); } return; }
  if (choice.action === 'start_quest') { handleStartQuest(choice.data); if (!choice.next) { endDialog(); exitChat(runtime); } else { runtime.activeDialog.nodeId = choice.next; renderCurrentNode(); } return; }
  if (choice.action === 'set_flag') { handleSetFlag(choice.data); if (!choice.next) { endDialog(); exitChat(runtime); } else { runtime.activeDialog.nodeId = choice.next; renderCurrentNode(); } return; }
  // VN intro helper: apply optional affinity, then recruit the active NPC
  if (choice.action === 'vn_intro_recruit') {
    try {
      const delta = (typeof choice?.data?.affinityDelta === 'number') ? choice.data.affinityDelta : 0;
      const flag = (choice?.data?.flag) ? String(choice.data.flag) : '';
      if (delta !== 0 || flag) {
        handleAffinityAdd({ target: 'active', amount: delta, flag: flag || undefined });
      }
    } catch {}
    // Fall through to recruitment logic mirroring 'join_party'
    const npc = runtime.activeNpc;
    if (npc) {
      if (companions.length >= 3) {
        const choices = companions.map((c, i) => ({ label: `Replace ${c.name || ('Companion ' + (i+1))}`, action: 'replace_companion', data: i }));
        choices.push({ label: 'I changed my mine, wait here.', action: 'end' });
        startPrompt(npc, `${npc.name || 'Companion'}: Your party is full. Who should I replace?`, choices);
        return;
      }
      const newComp = spawnCompanion(npc.x, npc.y, npc.sheet || null, { spriteId: npc.spriteId || null, name: npc.name || 'Companion', portrait: npc.portraitSrc, affinity: (typeof npc.affinity === 'number') ? npc.affinity : ((String(npc.name||'').toLowerCase()==='codex') ? 5 : 3) });
      const idx = npcs.indexOf(npc);
      if (idx !== -1) npcs.splice(idx, 1);
      updatePartyUI(companions);
      const delta = (typeof choice?.data?.affinityDelta === 'number') ? choice.data.affinityDelta : 0;
      const joinMsg = `${npc.name || 'Companion'} joined your party!`;
      const delay = (delta !== 0) ? 900 : 0;
      if (delay > 0) setTimeout(() => { try { showBanner(joinMsg); } catch {} }, delay);
      else showBanner(joinMsg);
      try {
        const nm = String(npc.name || '').toLowerCase();
        const id = String(npc.dialogId || '').toLowerCase();
        if (nm.includes('snake') || nm.includes('snek') || id === 'snake') playSfx('hiss');
        playSfx('partyJoin');
        if (!runtime.questFlags) runtime.questFlags = {};
        if (nm.includes('canopy') && runtime.questFlags['tutorial_save_canopy']) {
          runtime.questFlags['tutorial_save_canopy_done'] = true;
          runtime.questFlags['tutorial_save_canopy'] = false;
          hideBanner();
        }
      } catch {}
      endDialog();
      exitChat(runtime);
      if (newComp) { openCompanionTalk(newComp); }
      return;
    }
    endDialog(); exitChat(runtime); return;
  }
  if (choice.action === 'vn_intro_defer') {
    try { if (choice?.data?.flag) handleSetFlag({ key: String(choice.data.flag) }); } catch {}
    endDialog(); exitChat(runtime); return;
  }
  if (choice.action === 'join_party') {
    const npc = runtime.activeNpc;
    let newComp = null;
    if (npc) {
      // Enforce party size limit
      if (companions.length >= 3) {
        // Ask who to replace instead of blocking
        const choices = companions.map((c, i) => ({ label: `Replace ${c.name || ('Companion ' + (i+1))}`, action: 'replace_companion', data: i }));
        choices.push({ label: 'I changed my mine, wait here.', action: 'end' });
        startPrompt(npc, `${npc.name || 'Companion'}: Your party is full. Who should I replace?`, choices);
        return;
      }
      // Spawn as companion; preserve external sprite if present
      newComp = spawnCompanion(npc.x, npc.y, npc.sheet || null, { spriteId: npc.spriteId || null, name: npc.name || 'Companion', portrait: npc.portraitSrc, affinity: (typeof npc.affinity === 'number') ? npc.affinity : ((String(npc.name||'').toLowerCase()==='codex') ? 5 : 3) });
      // Remove NPC from world
      const idx = npcs.indexOf(npc);
      if (idx !== -1) npcs.splice(idx, 1);
      updatePartyUI(companions);
      showBanner(`${npc.name || 'Companion'} joined your party!`);
      try {
        const nm = String(npc.name || '').toLowerCase();
        const id = String(npc.dialogId || '').toLowerCase();
        if (nm.includes('snake') || nm.includes('snek') || id === 'snake') playSfx('hiss');
        playSfx('partyJoin');
        // Tutorial: clear healer banner when Canopy is recruited
        if (!runtime.questFlags) runtime.questFlags = {};
        if (nm.includes('canopy') && runtime.questFlags['tutorial_save_canopy']) {
          runtime.questFlags['tutorial_save_canopy_done'] = true;
          runtime.questFlags['tutorial_save_canopy'] = false;
          hideBanner();
        }
      } catch {}
    }
    endDialog();
    exitChat(runtime);
    if (newComp) openCompanionTalk(newComp);
    return;
  }
  if (choice.action === 'companion_torch_start') {
    const comp = choice.data || null;
    try {
      const ok = setTorchBearer(comp);
      if (ok) {
        // Confirmation with remaining time
        const ms = Math.max(0, Math.floor(runtime._torchBurnMs || 0));
        const mm = Math.floor(ms / 60000);
        const ss = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
        showBanner(`Torch handed to ${comp?.name || 'Companion'} (${mm}:${ss} left)`);
      } else {
        showBanner('No torches available');
      }
      updatePartyUI(companions);
    } catch {}
    endDialog(); exitChat(runtime); return;
  }
  if (choice.action === 'companion_torch_stop') {
    try {
      runtime._torchBearerRef = null;
      if (runtime._torchLightNode) runtime._torchLightNode.enabled = false;
      runtime._torchLightNode = null;
      runtime._torchBurnMs = 0;
      showBanner('Torch bearer dismissed');
      updatePartyUI(companions);
    } catch {}
    endDialog(); exitChat(runtime); return;
  }
  if (choice.action === 'assign_torch_bearer') {
    try {
      const idx = (typeof choice.data?.index === 'number') ? choice.data.index : -1;
      const comp = (idx >= 0 && idx < companions.length) ? companions[idx] : nearestCompanionTo(player.x + player.w/2, player.y + player.h/2);
      if (comp) {
        const ok = setTorchBearer(comp);
        if (ok) {
          const ms = Math.max(0, Math.floor(runtime._torchBurnMs || 0));
          const mm = Math.floor(ms / 60000);
          const ss = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
          showBanner(`Torch handed to ${comp.name || 'Companion'} (${mm}:${ss} left)`);
        } else {
          showBanner('No torches available');
        }
      }
    } catch {}
    endDialog(); exitChat(runtime); return;
  }
  if (choice.action === 'replace_companion') {
    const npc = runtime.activeNpc;
    const idx = (typeof choice.data === 'number') ? choice.data : -1;
    const comp = companions[idx];
    if (!npc || !comp) { endDialog(); exitChat(runtime); return; }
    // Dismiss the chosen companion without confirmation (spawn back as NPC nearby)
    const spot = findNearbyFreeSpot(comp.x, comp.y, comp.w, comp.h);
    const nx = spot ? spot.x : comp.x;
    const ny = spot ? spot.y : comp.y;
    const returned = spawnNpc(nx, ny, comp.dir || 'down', {
      name: comp.name || 'Companion',
      sheet: comp.sheet || null,
      spriteId: comp.spriteId || null,
      portrait: comp.portraitSrc || null,
    });
    // Reattach base dialog to allow future re-recruitment
    try {
      const key = (returned.name || '').toLowerCase();
      if (key.includes('canopy')) setNpcDialog(returned, canopyDialog);
      else if (key.includes('yorna')) setNpcDialog(returned, yornaDialog);
      else if (key.includes('hola')) setNpcDialog(returned, holaDialog);
    } catch {}
    removeCompanion(comp);
    // Recruit the active NPC into the now-free slot
    const newComp = spawnCompanion(npc.x, npc.y, npc.sheet || null, { spriteId: npc.spriteId || null, name: npc.name || 'Companion', portrait: npc.portraitSrc, affinity: (typeof npc.affinity === 'number') ? npc.affinity : ((String(npc.name||'').toLowerCase()==='codex') ? 5 : 3) });
    const ni = npcs.indexOf(npc); if (ni !== -1) npcs.splice(ni, 1);
    updatePartyUI(companions);
    showBanner(`${npc.name || 'Companion'} joined your party!`);
    try {
      playSfx('partyJoin');
      if (!runtime.questFlags) runtime.questFlags = {};
      const nm2 = String(npc.name || '').toLowerCase();
      if (nm2.includes('yorna')) {
        if (runtime.questFlags['hola_find_yorna_started'] && !runtime.questFlags['hola_find_yorna_cleared']) {
          runtime.questFlags['hola_find_yorna_cleared'] = true;
          import('./quests.js').then(q => q.autoTurnInIfCleared && q.autoTurnInIfCleared('hola_find_yorna')).catch(()=>{});
        }
      }
      if (nm2.includes('hola')) {
        if (runtime.questFlags['yorna_find_hola_started'] && !runtime.questFlags['yorna_find_hola_cleared']) {
          runtime.questFlags['yorna_find_hola_cleared'] = true;
          import('./quests.js').then(q => q.autoTurnInIfCleared && q.autoTurnInIfCleared('yorna_find_hola')).catch(()=>{});
        }
      }
      if (nm2.includes('canopy') && runtime.questFlags['tutorial_save_canopy']) {
        runtime.questFlags['tutorial_save_canopy_done'] = true;
        runtime.questFlags['tutorial_save_canopy'] = false;
        hideBanner();
      }
    } catch {}
    endDialog();
    exitChat(runtime);
    if (newComp) openCompanionTalk(newComp);
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
  if (choice.action === 'feud_keep_canopy' || choice.action === 'feud_keep_yorna') {
    // Resolve Level 2 feud by keeping one and dismissing the other
    try {
      const lower = (s) => String(s || '').toLowerCase();
      const findBy = (key) => companions.find(c => lower(c?.name).includes(key));
      const canopy = findBy('canopy');
      const yorna = findBy('yorna');
      const dismiss = (comp) => {
        if (!comp) return;
        // Convert companion back into an NPC near their current position (nudge to nearest free tile)
        const spot = findNearbyFreeSpot(comp.x, comp.y, comp.w, comp.h);
        const nx = spot ? spot.x : comp.x;
        const ny = spot ? spot.y : comp.y;
        const npc = spawnNpc(nx, ny, comp.dir || 'down', {
          name: comp.name || 'Companion',
          sheet: comp.sheet || null,
          portrait: comp.portraitSrc || null,
          affinity: (typeof comp.affinity === 'number') ? comp.affinity : undefined,
        });
        // Attach appropriate dialog so you can re-recruit them later
        const key = lower(npc.name);
        if (key.includes('canopy')) setNpcDialog(npc, canopyDialog);
        else if (key.includes('yorna')) setNpcDialog(npc, yornaDialog);
        else if (key.includes('hola')) setNpcDialog(npc, holaDialog);
        // Remove from party
        removeCompanion(comp);
        updatePartyUI(companions);
        showBanner(`${comp.name || 'Companion'} left your party.`);
      };
      if (choice.action === 'feud_keep_canopy') {
        // Yorna takes it personally: apply a larger negative affinity
        try { handleAffinityAdd({ target: 'yorna', amount: -1.0 }); } catch {}
        dismiss(yorna);
        // Follow-up VN line
        const actor = { name: 'Canopy & Yorna', portraitSrc: 'assets/portraits/level02/Canopy Yorna/Canopy Yorna.mp4' };
        // Mark flags
        try { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['canopy_yorna_feud_active'] = true; runtime.questFlags['canopy_yorna_feud_resolved'] = true; } catch {}
        startPrompt(actor, "Yorna: Fine. I’ll step back. Call when you want to move faster.\nCanopy: My Lord, I’ll keep you standing. We go careful; we don’t lose people.", [ { label: 'Continue', action: 'vn_continue' } ]);
        return;
      }
      if (choice.action === 'feud_keep_yorna') {
        // Canopy is hurt but steadier: smaller negative affinity
        try { handleAffinityAdd({ target: 'canopy', amount: -0.6 }); } catch {}
        dismiss(canopy);
        const actor = { name: 'Canopy & Yorna', portraitSrc: 'assets/portraits/level02/Canopy Yorna/Canopy Yorna.mp4' };
        try { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['canopy_yorna_feud_active'] = true; runtime.questFlags['canopy_yorna_feud_resolved'] = true; } catch {}
        startPrompt(actor, "Canopy: I won’t walk behind that pace. I’ll step back.\nYorna: Good. We move now. Stay tight—I’ll make the openings.", [ { label: 'Continue', action: 'vn_continue' } ]);
        return;
      }
    } catch {}
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
    openCompanionTalk(comp);
    return;
  }
  if (choice.action === 'companion_back') {
    startCompanionSelector();
    return;
  }
  if (choice.action === 'open_inventory') {
    // Only the Player has inventory; open directly
    openInventoryMenu('player');
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
  if (choice.action === 'light_ambient') {
    const val = Math.max(0, Math.min(8, Number(choice.data || 0)));
    import('./lighting.js').then(m => { try { m.setAmbientLevel(val); showBanner(`Ambient set to ${val}`); } catch {} startDebugMenu(); }).catch(() => startDebugMenu());
    return;
  }
  if (choice.action === 'debug_give_torches') {
    (async () => {
      try {
        const S = await import('./state.js');
        S.addItemToInventory(player.inventory, { id: 'torch', name: 'Torch', slot: 'leftHand', stackable: true, maxQty: 99, qty: 3 });
        showBanner('Added 3 Torches');
      } catch {}
      startDebugMenu();
    })();
    return;
  }
  if (choice.action === 'debug_give_arrows') {
    (async () => {
      try {
        const S = await import('./state.js');
        // Add 50 arrows across stacks (max 25/stack)
        S.addItemToInventory(player.inventory, { id: 'arrow_basic', name: 'Arrows', slot: 'misc', stackable: true, maxQty: 25, qty: 50 });
        showBanner('Added 50 Arrows');
      } catch {}
      startDebugMenu();
    })();
    return;
  }
  if (choice.action === 'toggle_godmode') { runtime.godMode = !runtime.godMode; showBanner(`God Mode ${runtime.godMode ? 'Enabled' : 'Disabled'}`); startDebugMenu(); return; }
  if (choice.action === 'toggle_snake_mode') {
    runtime.snakeMode = !runtime.snakeMode;
    showBanner(`Snake Mode ${runtime.snakeMode ? 'Enabled' : 'Disabled'}`);
    try {
      if ((runtime.currentLevel || 1) === 1) {
        if (runtime.snakeMode) {
          // Add Snek if not present
          const exists = npcs.some(n => n && (String(n.name||'').toLowerCase().includes('snek') || String(n.dialogId||'').toLowerCase()==='snake'));
          if (!exists) {
            const sx = Math.max(0, Math.min(world.w - 12, player.x + 100));
            const sy = Math.max(0, Math.min(world.h - 16, player.y + 40));
            const s = spawnNpc(sx, sy, 'left', { name: 'Snek', dialogId: 'snake', sheet: null, spriteId: 'assets/snake_sprite_strip_64x20', portrait: 'assets/portraits/level01/Snek/Snek.mp4', vnOnSight: { text: 'Snek: My Lord… sssafe. I follow if you wish.' } });
            import('../data/dialogs.js').then(d => { if (d.snakeDialog) setNpcDialog(s, d.snakeDialog); });
          }
        } else {
          // Remove Snek if present and not already a companion
          for (let i = npcs.length - 1; i >= 0; i--) {
            const n = npcs[i];
            if (n && (String(n.name||'').toLowerCase().includes('snek') || String(n.dialogId||'').toLowerCase()==='snake')) {
              npcs.splice(i, 1);
            }
          }
        }
      }
    } catch {}
    startDebugMenu();
    return;
  }
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
  if (choice.action === 'return_to_main') {
    try {
      // Close any dialog overlay
      endDialog();
      exitChat(runtime);
      // Pause the game and show the title screen
      runtime.paused = true;
      import('./audio.js').then(a => { try { a.stopMusic && a.stopMusic(); } catch {} });
      import('./ui.js').then(u => { try { u.showTitleScreen && u.showTitleScreen(); } catch {} });
    } catch {}
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
    // Level gate (exact match or one of)
    if (typeof req.level === 'number') {
      if ((runtime.currentLevel || 1) !== req.level) return false;
    } else if (Array.isArray(req.level)) {
      const lv = (runtime.currentLevel || 1);
      if (!req.level.includes(lv)) return false;
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
    // Party missing (all listed must be absent)
    if (req.partyMissing) {
      const list = Array.isArray(req.partyMissing) ? req.partyMissing : [req.partyMissing];
      const allAbsent = list.every(nm => !companions.some(c => (c.name || '').toLowerCase().includes(String(nm || '').toLowerCase())));
      if (!allAbsent) return false;
    }
    return true;
  } catch { return true; }
}

// Public adapter for requirement evaluation (used by quest indicator system)
export function evalRequirement(req) {
  return meetsRequirement(req);
}

function handleAffinityAdd(data) {
  try {
    const amt = (typeof data?.amount === 'number') ? data.amount : 0;
    const tgt = data?.target || 'active';
    const flag = data?.flag || null;
    const questFlag = data?.questFlag ? String(data.questFlag) : '';
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
    if (questFlag) {
      if (!runtime.questFlags) runtime.questFlags = {};
      runtime.questFlags[questFlag] = true;
    }
    if (flag) {
      if (!runtime.affinityFlags) runtime.affinityFlags = {};
      runtime.affinityFlags[flag] = true;
    }
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
    // Special: clearing Find Urn quest should remove the Urn marker immediately
    if (key === 'varabella_find_urn_cleared') {
      try {
        for (const n of npcs) {
          const nm = String(n?.name || '').toLowerCase();
          if (nm.includes('urn') && n.questId === 'varabella_find_urn') { delete n.questId; }
        }
      } catch {}
      try { showBanner('Quest updated: Find Urn — reunited'); } catch {}
    }
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
    } else if (id === 'canopy_gather_herbs') {
      // Multi-Fetch: Canopy — Gather 5 Reed Herbs
      import('./state.js').then(m => {
        const { player, spawnPickup } = m;
        import('../data/loot.js').then(L => {
          try {
            const pts = [ [28,0], [-26,6], [0,22], [18,-18], [-20,-20] ];
            for (const [ox, oy] of pts) {
              const it = L.itemById('herb_reed');
              if (it) spawnPickup(Math.round(player.x + ox), Math.round(player.y + oy), it);
            }
          } catch {}
        }).catch(()=>{});
        try {
          if (!runtime.questMeta) runtime.questMeta = {};
          runtime.questMeta['canopy_gather_herbs'] = {
            collectItemId: 'herb_reed',
            target: 5,
            counterKey: 'canopy_gather_herbs_collected',
            progressLabel: 'Gather Reeds',
            clearBanner: 'Quest updated: Gather Reeds — cleared'
          };
        } catch {}
      }).catch(()=>{});
      runtime.questCounters['canopy_gather_herbs_collected'] = 0;
      try { showBanner('Quest started: Gather Reeds — 0/5'); } catch {}
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
    } else if (id === 'twil_fuse') {
      runtime.questCounters['twil_fuse_kindled'] = 0;
      try { showBanner('Quest started: Light the Fuse — Kindle 3'); } catch {}
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
    } else if (id === 'twil_ember') {
      // Level 3 Oyin quest: defeat three Lantern Bearers (featured foes)
      import('./state.js').then(m => {
        const { player, spawnEnemy } = m;
        const dx = 160, dy = 120;
        spawnEnemy(player.x + dx, player.y - dy, 'featured', { name: 'Lantern Bearer', questId: 'twil_ember', hp: 8, dmg: 4 });
        spawnEnemy(player.x - dx, player.y + dy, 'featured', { name: 'Lantern Bearer', questId: 'twil_ember', hp: 8, dmg: 4 });
        spawnEnemy(player.x + dx, player.y + dy, 'featured', { name: 'Lantern Bearer', questId: 'twil_ember', hp: 8, dmg: 4 });
      }).catch(()=>{});
      runtime.questCounters['twil_ember_remaining'] = 3;
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
    } else if (id === 'snake_den') {
      // Level 1 Snake quest: defeat three nearby vermin
      import('./state.js').then(m => {
        const { player, spawnEnemy } = m;
        const dx = 120, dy = 90;
        spawnEnemy(player.x + dx, player.y - dy, 'mook', { name: 'Den Vermin', questId: 'snake_den', hp: 5, dmg: 4 });
        spawnEnemy(player.x - dx, player.y + dy, 'mook', { name: 'Den Vermin', questId: 'snake_den', hp: 5, dmg: 4 });
        spawnEnemy(player.x + dx, player.y + dy, 'mook', { name: 'Den Vermin', questId: 'snake_den', hp: 5, dmg: 4 });
      }).catch(()=>{});
      runtime.questCounters['snake_den_remaining'] = 3;
      try { showBanner('Quest started: Clear the Den — 3 pests'); } catch {}
    } else if (id === 'twil_scout_path') {
      // Survey/Scout: Twil — step through 3 marked zones
      try {
        const px = player.x + player.w/2;
        const py = player.y + player.h/2;
        const zones = [
          { x: Math.round(px + 180), y: Math.round(py), r: 28, flag: 'twil_scout_path_a' },
          { x: Math.round(px),       y: Math.round(py - 160), r: 28, flag: 'twil_scout_path_b' },
          { x: Math.round(px - 180), y: Math.round(py + 140), r: 28, flag: 'twil_scout_path_c' },
        ];
        if (!runtime.questMeta) runtime.questMeta = {};
        runtime.questMeta['twil_scout_path'] = {
          zones,
          target: 3,
          counterKey: 'twil_scout_path_steps',
          progressLabel: 'Scout the Trail',
          clearBanner: 'Quest updated: Scout the Trail — cleared'
        };
        if (!runtime.questCounters) runtime.questCounters = {};
        runtime.questCounters['twil_scout_path_steps'] = 0;
      } catch {}
      try { showBanner('Quest started: Scout the Trail — 0/3'); } catch {}
    } else if (id === 'hola_find_yorna') {
      // Level 1 Hola quest: point to Yorna's location; quest clears on recruiting Yorna
      try {
        // Find Yorna NPC and attach a quest marker
        for (const n of npcs) {
          const nm = String(n?.name || '').toLowerCase();
          if (nm.includes('yorna')) { n.questId = 'hola_find_yorna'; break; }
        }
      } catch {}
      try { showBanner('Quest started: Find Yorna — Talk to her'); } catch {}
    } else if (id === 'yorna_find_hola') {
      // Level 1 Yorna quest: point to Hola's location; quest clears on recruiting Hola
      try {
        // Find Hola NPC and attach a quest marker
        for (const n of npcs) {
          const nm = String(n?.name || '').toLowerCase();
          if (nm.includes('hola')) { n.questId = 'yorna_find_hola'; break; }
        }
      } catch {}
      try { showBanner('Quest started: Find the nervous girl — Talk to her'); } catch {}
    } else if (id === 'varabella_find_urn') {
      // Level 4 Varabella quest: point to Urn's location; clears on talking to Urn (or recruiting her)
      try {
        for (const n of npcs) {
          const nm = String(n?.name || '').toLowerCase();
          if (nm.includes('urn')) { n.questId = 'varabella_find_urn'; break; }
        }
      } catch {}
      try { showBanner('Quest started: Find Urn — Talk to her'); } catch {}
    }
    // Refresh quest indicators shortly after starting a quest
    try { import('./quest_indicators.js').then(m => m.recomputeQuestIndicators && m.recomputeQuestIndicators()); } catch {}
  } catch {}
}

// Inventory menus
export function startInventoryMenu() {
  // Open Player inventory directly
  openInventoryMenu('player');
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
  if (!actor) { openInventoryMenu('player'); return; }
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
  if (!actor) { openInventoryMenu('player'); return; }
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
  choices.push({ label: 'Back', action: 'open_inventory' });
  startPrompt(actor, `${slotLabel(slot)} — Choose`, choices);
}

function openQuickEquipList(actorTag) {
  const actor = resolveActor(actorTag);
  if (!actor) { openInventoryMenu('player'); return; }
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
    choices.push({ label: 'Backpack is empty', action: 'open_inventory' });
  } else {
    for (const it of items) {
      const slot = it.slot;
      const suffix = (it.stackable && it.qty > 1) ? ` x${it.qty}` : '';
      const label = `Equip ${it.name}${suffix} (${slotLabel(slot)})`;
      choices.push({ label, action: 'inv_quick_equip', data: { actorTag, itemId: it.id, slot } });
    }
  }
  choices.push({ label: 'Back', action: 'open_inventory' });
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
  if (!actor) { openInventoryMenu('player'); return; }
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
  // Two-handed constraint: block equipping left-hand if right-hand is 2H
  try {
    if (slot === 'leftHand' && eq.rightHand && eq.rightHand.twoHanded) {
      showBanner('Cannot equip left hand with two-handed weapon');
      return;
    }
  } catch {}
  // Special-case: Torch behavior (stackable) — equipping consumes 1 from stack and creates a single-use equipped torch
  const isTorch = (it && it.id === 'torch' && it.stackable && slot === 'leftHand');
  // Swap: if something already equipped in this slot
  if (eq[slot]) {
    const cur = eq[slot];
    // If currently equipped is a torch, unequipping it consumes it (do not return to backpack)
    if (slot === 'leftHand' && cur && cur.id === 'torch') {
      // drop without adding back
      eq[slot] = null;
    } else {
      items.push(cur);
      eq[slot] = null;
    }
  }
  if (isTorch) {
    // Consume 1 from the stack in backpack and equip a fresh single-use torch instance
    const stack = items[idx];
    if (!stack || stack.id !== 'torch') return;
    const qty = Math.max(0, stack.qty || 0);
    if (qty <= 0) return;
    stack.qty = qty - 1;
    if (stack.qty <= 0) items.splice(idx, 1);
    // Create equipped torch instance with burn timer (ms)
    const equippedTorch = { id: 'torch', name: stack.name || 'Torch', slot: 'leftHand', atk: 0, burnMsRemaining: 180000 };
    eq[slot] = equippedTorch;
    // Immediately rebuild lighting so the torch lights up even while inventory is open
    try {
      import('./lighting.js').then(m => m.rebuildLighting && m.rebuildLighting(0)).catch(()=>{});
      import('./ui.js').then(u => u.updateOverlayDim && u.updateOverlayDim()).catch(()=>{});
    } catch {}
    // Tutorial: after equipping a torch, prompt to find a weapon and mark the sword chest
    try {
      if (!runtime.questFlags) runtime.questFlags = {};
      // Clear the torch equip tutorial banner now that a torch is equipped
      if (runtime.questFlags['tutorial_inv_equip_torch']) {
        runtime.questFlags['tutorial_inv_equip_torch'] = false;
        try { hideBanner(); } catch {}
      }
      if (!runtime.questFlags['tutorial_find_sword_done'] && !runtime.questFlags['tutorial_find_sword']) {
        // Enable the top-of-screen quest hint and minimap marker
        runtime.questFlags['tutorial_find_sword'] = true;
        // Persistent banner: prompt to find a weapon chest
        try { showPersistentBanner('You need a weapon! Find a nearby chest'); } catch {}
      }
    } catch {}
  } else {
    // Normal equip flow: equip selected and remove from items
    // Two-handed handling for right-hand
    if (slot === 'rightHand' && it && it.twoHanded) {
      // Free left hand (consume torch; store shields/tools)
      if (eq.leftHand) {
        const curLH = eq.leftHand;
        if (curLH.id === 'torch') { eq.leftHand = null; try { showBanner('Torch consumed'); } catch {} }
        else { items.push(curLH); eq.leftHand = null; try { showBanner('Left hand freed for two-handed weapon'); } catch {} }
      }
    }
    eq[slot] = it;
    items.splice(idx, 1);
  }
  // Tutorial: Level 1 bow equip → recommend asking Canopy to carry torch (persist until Canopy bears torch)
  try {
    if (slot === 'rightHand' && it && it.ranged && (runtime.currentLevel || 1) === 1 && !runtime._torchBearerRef) {
      if (!runtime.questFlags) runtime.questFlags = {};
      if (!runtime.questFlags['tutorial_canopy_torch_done']) {
        runtime.questFlags['tutorial_canopy_torch'] = true;
        import('./ui.js').then(u => u.showPersistentBanner && u.showPersistentBanner('Ask Canopy to hold the torch, press C for companions')).catch(()=>{});
      }
    }
  } catch {}
  // Remember loadout preferences (last-used)
  try {
    if (!runtime._loadouts) runtime._loadouts = { melee: {}, ranged: {} };
    const LO = runtime._loadouts;
    const eqNow = actor.inventory.equipped;
    if (slot === 'rightHand') {
      if (it && it.ranged) { LO.ranged.rightHandId = it.id; }
      else if (it && !it.ranged) { LO.melee.rightHandId = it.id; }
    } else if (slot === 'leftHand') {
      if (it && !it.stackable && (it.isShield || /shield|buckler/i.test(String(it.name||it.id)) || (typeof it.dr==='number' && it.dr>0))) {
        LO.melee.leftHandId = it.id;
      } else if (it && it.id === 'torch') {
        // do not persist torch in melee loadout
        LO.melee.leftHandId = LO.melee.leftHandId || null;
      }
    }
  } catch {}
  // Refresh equipment panel
  updatePartyUI(companions);

  // If a two-handed right-hand was equipped in darkness, offer to assign a torch bearer (one-time per ask session)
  try {
    if (slot === 'rightHand' && eq.rightHand && eq.rightHand.twoHanded) {
      const lv = sampleLightAtPx(player.x + player.w/2, player.y + player.h/2);
      const dark = lv <= 1;
      const hasLight = !!(eq.leftHand && eq.leftHand.id === 'torch') || !!runtime._torchBearerRef;
      const canAsk = (!runtime._suppressTorchAsk) && (companions && companions.length > 0);
      if (dark && !hasLight && canAsk) {
        const c = nearestCompanionTo(player.x + player.w/2, player.y + player.h/2) || companions[0];
        const name = c?.name || 'Companion';
        const choices = [
          { label: `Ask ${name} to carry a torch`, action: 'assign_torch_bearer', data: { index: companions.indexOf(c) } },
          { label: 'Not now', action: 'end' },
          { label: "Don't ask again", action: 'set_flag', data: { key: '_suppressTorchAsk' } },
        ];
        startPrompt(null, 'It\'s dark. Your hands are full.', choices);
      }
    }
  } catch {}
}

function doUnequip(actorTag, slot) {
  const actor = resolveActor(actorTag);
  if (!actor || !actor.inventory) return;
  const eq = actor.inventory.equipped;
  if (!eq[slot]) return;
  // Torch rule: unequipping a lit torch consumes it (do not return to backpack)
  if (slot === 'leftHand' && eq[slot] && eq[slot].id === 'torch') {
    try { showBanner('Torch consumed'); } catch {}
    eq[slot] = null;
    // Rebuild lighting immediately so darkness updates while inventory is open
    try {
      import('./lighting.js').then(m => m.rebuildLighting && m.rebuildLighting(0)).catch(()=>{});
      import('./ui.js').then(u => u.updateOverlayDim && u.updateOverlayDim()).catch(()=>{});
    } catch {}
  } else {
    actor.inventory.items.push(eq[slot]);
    eq[slot] = null;
  }
  updatePartyUI(companions);
}
