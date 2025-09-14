import { runtime, companions, npcs, camera, spawnFloatText, spawnSparkle } from './state.js';
import { companionDialogs } from '../data/companion_dialogs.js';
import { evalRequirement } from './dialog.js';
import { playSfx } from './audio.js';

function nowSec() { return (performance && performance.now ? performance.now() : Date.now()) / 1000; }

function nameToKey(name) {
  const nm = String(name || '').toLowerCase();
  if (!nm) return null;
  // Prefer direct keys
  for (const k of Object.keys(companionDialogs)) {
    if (nm.includes(k)) return k;
  }
  // Snake alias
  if (nm.includes('snake') || nm.includes('snek')) return 'snek';
  return null;
}

function scanRoot(compKey) {
  const tree = companionDialogs[compKey];
  const out = { newIds: new Set(), turnInIds: new Set() };
  if (!tree || !tree.nodes || !tree.nodes.root) return out;
  const root = tree.nodes.root;
  const choices = Array.isArray(root.choices) ? root.choices : [];
  for (const ch of choices) {
    // Respect root-level requires gate
    if (ch && ch.requires && !evalRequirement(ch.requires)) continue;
    // Turn-in detection via requires flags convention
    if (ch && ch.requires && ch.requires.flag && ch.requires.missingFlag && String(ch.label||'').toLowerCase().includes('turn in')) {
      const base = String(ch.requires.flag).replace(/_cleared$/,'');
      if (base) out.turnInIds.add(base);
    }
    // Start detection: follow next to node having a start_quest action
    const nid = ch && ch.next ? String(ch.next) : null;
    if (!nid) continue;
    const node = tree.nodes[nid];
    const nChoices = node && Array.isArray(node.choices) ? node.choices : [];
    for (const nc of nChoices) {
      if (nc && nc.action === 'start_quest' && nc.data && nc.data.id) {
        out.newIds.add(String(nc.data.id));
      }
    }
  }
  return out;
}

function actorForCompanion(key) {
  // Prefer party companion if present
  for (const c of companions) { if (nameToKey(c?.name) === key) return c; }
  // Fallback to NPC present in world
  for (const n of npcs) { if (nameToKey(n?.name) === key) return n; }
  return null;
}

function isVisible(actor) {
  if (!actor) return false;
  const ax = Math.round(actor.x + (actor.w||12)/2);
  const ay = Math.round(actor.y + Math.min(0, (actor.h||16) - 16));
  const { x, y, w, h } = camera;
  return ax >= x && ax <= x + w && ay >= y && ay <= y + h;
}

function playOverheadMark(actor) {
  if (!actor) return;
  const x = Math.round(actor.x + (actor.w||12)/2);
  const y = Math.round(actor.y - 4);
  try { spawnFloatText(x, y, '!', { color: '#8ab4ff', life: 1.2 }); } catch {}
  for (let i = 0; i < 6; i++) {
    try { spawnSparkle(x + (Math.random()*8-4), y + (Math.random()*6-10), { life: 0.6, color: '#8ab4ff' }); } catch {}
  }
  try { playSfx('unlock'); } catch {}
}

export function recomputeQuestIndicators() {
  try {
    if (!runtime.questIndicators) runtime.questIndicators = {};
    if (!runtime.questNotify) runtime.questNotify = {};
    const keys = Object.keys(companionDialogs);
    for (const k of keys) {
      const { newIds, turnInIds } = scanRoot(k);
      const prev = runtime.questIndicators[k] || { newIds: new Set(), turnInIds: new Set(), new: false, turnIn: false };
      const gainedNew = [...newIds].filter(id => !(prev.newIds && prev.newIds.has(id)));
      const gainedTurn = [...turnInIds].filter(id => !(prev.turnInIds && prev.turnInIds.has(id)));
      runtime.questIndicators[k] = {
        new: newIds.size > 0,
        turnIn: turnInIds.size > 0,
        newIds,
        turnInIds,
      };
      // Queue reveals for gains
      const Q = (runtime.questNotify[k] ||= { shown: {}, cooldownUntil: 0, queue: [] });
      for (const id of gainedNew) { if (!Q.shown[id]) Q.queue.push({ id, t: nowSec() }); }
      for (const id of gainedTurn) { if (!Q.shown[id]) Q.queue.push({ id, t: nowSec() }); }
    }
  } catch {}
}

export function tickQuestIndicatorQueue(dt) {
  try {
    if (!runtime.questNotify) return;
    const now = nowSec();
    // Skip during VN or camera pan
    if (runtime.gameState !== 'play' || runtime.cameraPan) return;
    for (const [k, rec] of Object.entries(runtime.questNotify)) {
      if (!rec || !Array.isArray(rec.queue) || rec.queue.length === 0) continue;
      if (now < (rec.cooldownUntil || 0)) continue;
      const actor = actorForCompanion(k);
      if (!actor || !isVisible(actor)) continue;
      // Dequeue one and reveal
      const item = rec.queue.shift();
      if (item && item.id) rec.shown[item.id] = true;
      playOverheadMark(actor);
      rec.cooldownUntil = now + 0.6; // small stagger
    }
  } catch {}
}

export function indicatorsForName(name) {
  try {
    const k = nameToKey(name);
    if (!k) return { new: false, turnIn: false };
    const rec = runtime.questIndicators && runtime.questIndicators[k];
    return rec ? { new: !!rec.new, turnIn: !!rec.turnIn } : { new: false, turnIn: false };
  } catch { return { new: false, turnIn: false }; }
}

