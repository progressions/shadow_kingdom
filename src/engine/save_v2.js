// Save System v2 — deterministic deltas + unique actor status
import { player, companions, obstacles, itemsOnGround, world, enemies, runtime, spawnCompanion } from './state.js';
import { updatePartyUI, showBanner } from './ui.js';
import { makeSpriteSheet, sheetForName } from './sprites.js';
import { descriptorForLevel } from './level_descriptors.js';
import { ensureEnemyIdentity } from './identity.js';

function uniqueSetForLevel(level) {
  const d = descriptorForLevel(level);
  return new Set(d.uniqueActors || []);
}

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
  const level = runtime.currentLevel || 1;
  const uniques = uniqueSetForLevel(level);
  for (const e of enemies) {
    if (!e) continue;
    const key = e.vnId || (e.name ? `enemy:${String(e.name).toLowerCase()}` : null);
    if (!key || !uniques.has(key)) continue;
    const base = (e.hp > 0)
      ? { state: 'alive', hp: e.hp }
      : { state: 'defeated' };
    // Persist visual identity for unique actors (e.g., featured foe tints)
    if (e.sheetPalette) base.sheetPalette = e.sheetPalette;
    uniqueActors[key] = base;
  }
  // Ensure keys exist for current level's known uniques if absent
  for (const k of uniques) { if (!uniqueActors[k]) uniqueActors[k] = { state: 'unspawned' }; }

  // Dynamic enemies (non-unique)
  const dynamicEnemies = [];
  for (const e of enemies) {
    if (!e || e.hp <= 0) continue;
    const key = e.vnId || (e.name ? `enemy:${String(e.name).toLowerCase()}` : null);
    if (key && uniques.has(key)) continue; // skip uniques; tracked separately
    const rec = {
      id: e.id || null,
      kind: e.kind || 'mook',
      name: e.name || null,
      vnId: e.vnId || null,
      x: e.x, y: e.y,
      dir: e.dir || 'down',
      hp: e.hp, maxHp: e.maxHp,
      touchDamage: e.touchDamage, speed: e.speed,
      w: e.w, h: e.h, spriteScale: e.spriteScale || 1,
      sheetPalette: e.sheetPalette || null,
      questId: e.questId || null,
      source: e.source || null,
      createdAt: e.createdAt || null,
    };
    // Guard against invalid coords
    if (typeof rec.x !== 'number' || typeof rec.y !== 'number' || !Number.isFinite(rec.x) || !Number.isFinite(rec.y)) continue;
    dynamicEnemies.push(rec);
  }
  // Cap to avoid bloat
  const DYNAMIC_CAP = 200;
  if (dynamicEnemies.length > DYNAMIC_CAP) dynamicEnemies.length = DYNAMIC_CAP;

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
    dynamicEnemies,
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
    const byKey = (vnId) => enemies.find(e => e && e.vnId && e.vnId === vnId);
    const uniques = descriptorForLevel(runtime.currentLevel || 1).uniqueActors || [];
    for (const vn of uniques) {
      const st = ua[vn]; if (!st) continue;
      const ent = byKey(vn);
      if (!ent) continue;
      if (st.state === 'defeated' || st.state === 'unspawned') {
        const idx = enemies.indexOf(ent); if (idx !== -1) enemies.splice(idx,1);
      } else if (st.state === 'alive' && typeof st.hp === 'number') {
        ent.hp = Math.max(1, Math.min(ent.maxHp||st.hp, st.hp));
        // Apply persisted palette for unique actor, if present
        if (st.sheetPalette) {
          try {
            ent.sheetPalette = st.sheetPalette;
            ent.sheet = makeSpriteSheet(st.sheetPalette);
          } catch {}
        }
      }
    }
    // Dynamic enemies: append serialized spawns (non-unique)
    const dyn = Array.isArray(data.dynamicEnemies) ? data.dynamicEnemies : [];
    for (const d of dyn) {
      try {
        // Validate and clamp
        let x = Number(d.x), y = Number(d.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        x = Math.max(0, Math.min(world.w - 12, x));
        y = Math.max(0, Math.min(world.h - 16, y));
        const kind = String(d.kind || 'mook').toLowerCase();
        const base = (kind === 'boss') ? { name: 'Boss', speed: 12, hp: 30, dmg: 8 }
          : (kind === 'featured') ? { name: 'Featured Foe', speed: 11, hp: 5, dmg: 3 }
          : { name: 'Mook', speed: 10, hp: 3, dmg: 3 };
        const hp = (typeof d.hp === 'number') ? d.hp : base.hp;
        const maxHp = (typeof d.maxHp === 'number') ? d.maxHp : hp;
        const dmg = (typeof d.touchDamage === 'number') ? d.touchDamage : base.dmg;
        const speed = (typeof d.speed === 'number') ? d.speed : base.speed;
        const w = (typeof d.w === 'number') ? d.w : 12;
        const h = (typeof d.h === 'number') ? d.h : 16;
        enemies.push({
          id: d.id || (`de_${Date.now().toString(36)}_${Math.floor(Math.random()*1e6).toString(36)}`),
          x, y, w, h,
          speed, dir: d.dir || 'down', moving: true,
          animTime: 0, animFrame: 0, hp, maxHp, touchDamage: dmg, hitTimer: 0, hitCooldown: 0.8,
          knockbackX: 0, knockbackY: 0,
          name: d.name || base.name, kind,
          portraitSrc: null,
          portraitPowered: null,
          portraitOverpowered: null,
          portraitDefeated: null,
          onDefeatNextLevel: null,
          questId: d.questId || null,
          guaranteedDropId: null,
          _secondPhase: false,
          sheetPalette: d.sheetPalette || null,
          spriteScale: (typeof d.spriteScale === 'number') ? d.spriteScale : 1,
          vnId: d.vnId || null,
          vnOnSight: null,
          source: d.source || null,
          createdAt: d.createdAt || null,
        });
      } catch {}
    }
    // Ensure enemy identity (intro + default palette) for all enemies based on vnId and registry
    try { for (const e of enemies) ensureEnemyIdentity(e, runtime); } catch {}

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
