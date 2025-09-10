// Save System v2 — deterministic deltas + unique actor status
import { player, companions, obstacles, itemsOnGround, world, enemies, runtime, spawnCompanion, spawnNpc } from './state.js';
import { updatePartyUI, showBanner } from './ui.js';
import { makeSpriteSheet, sheetForName } from './sprites.js';

const UNIQUE_VNIDS = new Set([
  'enemy:vast', 'enemy:gorg',
  'enemy:aarg', 'enemy:nethra',
  'enemy:wight', 'enemy:luula',
  'enemy:blurb', 'enemy:vanificia',
  'enemy:fana', 'enemy:vorthak',
]);

function gatherGateStates() {
  const states = {};
  for (const o of obstacles) {
    if (!o || o.type !== 'gate' || !o.id) continue;
    states[o.id] = (o.locked === false) ? 'unlocked' : 'locked';
  }
  return states;
}

export function serializeV2() {
  // Unique actors: record by vnId (or name fallback)
  const uniqueActors = {};
  for (const e of enemies) {
    if (!e) continue;
    const key = e.vnId || (e.name ? `enemy:${String(e.name).toLowerCase()}` : null);
    if (!key || !UNIQUE_VNIDS.has(key)) continue;
    if (e.hp > 0) {
      uniqueActors[key] = { state: 'alive', hp: e.hp };
    } else {
      uniqueActors[key] = { state: 'defeated' };
    }
  }
  // Ensure keys exist for current level's known uniques if absent
  for (const k of UNIQUE_VNIDS) { if (!uniqueActors[k]) uniqueActors[k] = { state: 'unspawned' }; }

  return {
    schema: 'v2',
    version: 2,
    at: Date.now(),
    currentLevel: runtime.currentLevel || 1,
    player: { x: player.x, y: player.y, hp: player.hp, dir: player.dir, level: player.level||1, xp: player.xp||0 },
    companions: companions.map(c => ({ name: c.name, x: c.x, y: c.y, dir: c.dir, portrait: c.portraitSrc || null, sheetPalette: c.sheetPalette || null, inventory: c.inventory || null, affinity: (typeof c.affinity === 'number') ? c.affinity : 2, level: c.level||1, xp: c.xp||0 })),
    playerInv: player.inventory || null,
    world: { w: world.w, h: world.h },
    gateStates: gatherGateStates(),
    openedChests: obstacles.filter(o => o && o.type === 'chest' && o.opened && o.id).map(o => o.id),
    brokenBreakables: Object.keys(runtime?.brokenBreakables || {}),
    groundItems: (Array.isArray(itemsOnGround) ? itemsOnGround.map(g => ({ id: g.id, x: g.x, y: g.y, item: g.item })) : []),
    vnSeen: Object.keys(runtime?.vnSeen || {}),
    affinityFlags: Object.keys(runtime?.affinityFlags || {}),
    questFlags: Object.keys(runtime?.questFlags || {}),
    questCounters: Object.assign({}, runtime?.questCounters || {}),
    uniqueActors,
  };
}

function applyGateStates(data) {
  const gs = data.gateStates || {};
  for (const o of obstacles) {
    if (!o || o.type !== 'gate' || !o.id) continue;
    const st = gs[o.id];
    if (!st) continue;
    o.locked = (st === 'unlocked') ? false : true;
    if (st === 'unlocked') o.blocksAttacks = false;
  }
}

export function applyPendingRestoreV2() {
  const data = runtime._pendingRestoreV2;
  if (!data) return;
  runtime._pendingRestoreV2 = null;
  try {
    // Player
    if (data.player) {
      player.x = data.player.x; player.y = data.player.y; player.dir = data.player.dir || 'down';
      if (typeof data.player.hp === 'number') player.hp = data.player.hp;
      player.level = Math.max(1, data.player.level || 1);
      player.xp = Math.max(0, data.player.xp || 0);
    }
    // Flags
    runtime.vnSeen = {}; (data.vnSeen||[]).forEach(k => runtime.vnSeen[k]=true);
    runtime.affinityFlags = {}; (data.affinityFlags||[]).forEach(k => runtime.affinityFlags[k]=true);
    runtime.questFlags = {}; (data.questFlags||[]).forEach(k => runtime.questFlags[k]=true);
    runtime.questCounters = {}; Object.assign(runtime.questCounters, data.questCounters||{});
    // Companions
    companions.length = 0;
    if (Array.isArray(data.companions)) {
      for (const c of data.companions) {
        const sheet = c.sheetPalette ? makeSpriteSheet(c.sheetPalette) : sheetForName(c.name);
        const comp = spawnCompanion(c.x, c.y, sheet, { name: c.name, portrait: c.portrait || null, sheetPalette: c.sheetPalette || null, affinity: (typeof c.affinity === 'number') ? c.affinity : 2, level: c.level||1, xp: c.xp||0 });
        comp.dir = c.dir || 'down';
        if (c.inventory) comp.inventory = c.inventory;
      }
      updatePartyUI(companions);
    }
    // World deltas
    applyGateStates(data);
    if (Array.isArray(data.openedChests)) { for (const o of obstacles) if (o && o.type==='chest' && o.id && data.openedChests.includes(o.id)) o.opened = true; }
    if (Array.isArray(data.brokenBreakables)) {
      for (let i = obstacles.length - 1; i >= 0; i--) { const o = obstacles[i]; if (o && (o.type==='barrel'||o.type==='crate') && o.id && data.brokenBreakables.includes(o.id)) obstacles.splice(i,1); }
    }
    // Ground items
    try { itemsOnGround.length=0; (data.groundItems||[]).forEach(g=>itemsOnGround.push({ id:g.id, x:g.x, y:g.y, w:10, h:10, item:g.item })); } catch {}
    // Unique actors: remove or keep defaults based on state; adjust hp if provided
    const ua = data.uniqueActors || {};
    const byKey = (vnId, name) => enemies.find(e => e && ((e.vnId && e.vnId===vnId) || ((name && e.name) && e.name.toLowerCase()===name.toLowerCase())));
    const pairs = [
      ['enemy:vast','vast'], ['enemy:gorg','gorg'], ['enemy:aarg','aarg'], ['enemy:nethra','nethra'],
      ['enemy:wight','wight'], ['enemy:luula','luula'], ['enemy:blurb','blurb'], ['enemy:vanificia','vanificia'],
      ['enemy:fana','fana'], ['enemy:vorthak','vorthak'],
    ];
    for (const [vn, nm] of pairs) {
      const st = ua[vn]; if (!st) continue;
      const ent = byKey(vn, nm);
      if (!ent) continue;
      if (st.state === 'defeated' || st.state === 'unspawned') {
        const idx = enemies.indexOf(ent); if (idx !== -1) enemies.splice(idx,1);
      } else if (st.state === 'alive' && typeof st.hp === 'number') {
        ent.hp = Math.max(1, Math.min(ent.maxHp||st.hp, st.hp));
      }
    }
    showBanner('Game loaded (v2)');
  } catch (e) {
    console.error('Apply v2 failed', e);
    showBanner('Load failed');
  }
}

export function loadDataPayloadV2(data) {
  try {
    const target = (data && typeof data.currentLevel === 'number') ? data.currentLevel : 1;
    if (target !== (runtime.currentLevel || 1)) {
      runtime._pendingRestoreV2 = data;
      runtime.pendingLevel = target;
      showBanner(`Loading… switching to Level ${target}`);
      return;
    }
    runtime._pendingRestoreV2 = data;
    applyPendingRestoreV2();
  } catch (e) {
    console.error('Load v2 route failed', e);
    showBanner('Load failed');
  }
}
