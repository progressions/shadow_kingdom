// Save System — deterministic deltas + unique actor status
import { player, companions, npcs, obstacles, itemsOnGround, world, enemies, runtime, spawnCompanion, spawnNpc } from './state.js';
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

export function serializeSave() {
  // Optional: capture RNG seeds if present
  const rng = (runtime && runtime.rng) ? { ...runtime.rng } : undefined;
  // Unique actors: record by vnId (or name fallback)
  const uniqueActors = {};
  const level = runtime.currentLevel || 1;
  const uniques = uniqueSetForLevel(level);
  for (const e of enemies) {
    if (!e) continue;
    const key = e.vnId || (e.name ? `enemy:${String(e.name).toLowerCase()}` : null);
    if (!key || !uniques.has(key)) continue;
    if (e.hp > 0) {
      // Store pose + core combat fields at top-level for loader simplicity
      uniqueActors[key] = {
        state: 'alive',
        x: e.x, y: e.y,
        dir: e.dir || 'down',
        hp: e.hp,
        w: e.w, h: e.h,
        speed: e.speed,
        touchDamage: e.touchDamage,
        spriteScale: e.spriteScale || 1,
        sheetPalette: e.sheetPalette || null,
      };
    } else {
      uniqueActors[key] = { state: 'defeated' };
    }
  }
  // Ensure keys exist for current level's known uniques if absent
  for (const k of uniques) { if (!uniqueActors[k]) uniqueActors[k] = { state: 'unspawned' }; }

  // Dynamic enemies (non-unique)
  const dynamicEnemies = [];
  for (const e of enemies) {
    if (!e || e.hp <= 0) continue;
    const key = e.vnId || (e.name ? `enemy:${String(e.name).toLowerCase()}` : null);
    if (key && uniques.has(key)) continue; // skip uniques; tracked separately
    const rec = serializeEnemyEntity(e);
    if (typeof rec.x !== 'number' || typeof rec.y !== 'number' || !Number.isFinite(rec.x) || !Number.isFinite(rec.y)) continue;
    dynamicEnemies.push(rec);
  }
  // Cap to avoid bloat
  const DYNAMIC_CAP = 200;
  if (dynamicEnemies.length > DYNAMIC_CAP) dynamicEnemies.length = DYNAMIC_CAP;

  // Persist VN seen only for NPCs; enemy intro seen state is derived by encounter
  const vnSeenNpcOnly = Object.keys(runtime?.vnSeen || {}).filter(k => !/^enemy:/.test(k));

  const payload = {
    schema: 'save',
    version: 3,
    at: Date.now(),
    currentLevel: runtime.currentLevel || 1,
    rng,
    player: { x: player.x, y: player.y, hp: player.hp, dir: player.dir, level: player.level||1, xp: player.xp||0 },
    companions: companions.map(c => serializeCompanionEntity(c)),
    npcs: npcs.map(n => serializeNpcEntity(n)),
    playerInv: player.inventory || null,
    world: { w: world.w, h: world.h },
    gateStates: gatherGateStates(),
    openedChests: obstacles.filter(o => o && o.type === 'chest' && o.opened && o.id).map(o => o.id),
    brokenBreakables: Object.keys(runtime?.brokenBreakables || {}),
    groundItems: (Array.isArray(itemsOnGround) ? itemsOnGround.map(g => ({ id: g.id, x: g.x, y: g.y, item: g.item })) : []),
    vnSeen: vnSeenNpcOnly,
    affinityFlags: Object.keys(runtime?.affinityFlags || {}),
    questFlags: Object.keys(runtime?.questFlags || {}),
    questCounters: Object.assign({}, runtime?.questCounters || {}),
    uniqueActors,
    dynamicEnemies,
  };
  return normalizeSave(payload);
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

// --- Helpers to serialize/restore enemy entities ---
function serializeEnemyEntity(e) {
  return {
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
    guaranteedDropId: e.guaranteedDropId || null,
    onDefeatNextLevel: (typeof e.onDefeatNextLevel === 'number') ? e.onDefeatNextLevel : null,
    portraitSrc: e.portraitSrc || null,
    portraitPowered: e.portraitPowered || null,
    portraitOverpowered: e.portraitOverpowered || null,
    portraitDefeated: e.portraitDefeated || null,
    hitCooldown: e.hitCooldown || 0.8,
    source: e.source || null,
    createdAt: e.createdAt || null,
  };
}

function spawnEnemyFromRecord(d) {
  let x = Number(d.x), y = Number(d.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
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
    animTime: 0, animFrame: 0, hp, maxHp, touchDamage: dmg, hitTimer: 0, hitCooldown: (typeof d.hitCooldown === 'number') ? d.hitCooldown : 0.8,
    knockbackX: 0, knockbackY: 0,
    name: d.name || base.name, kind,
    portraitSrc: d.portraitSrc || null,
    portraitPowered: d.portraitPowered || null,
    portraitOverpowered: d.portraitOverpowered || null,
    portraitDefeated: d.portraitDefeated || null,
    onDefeatNextLevel: (typeof d.onDefeatNextLevel === 'number') ? d.onDefeatNextLevel : null,
    questId: d.questId || null,
    guaranteedDropId: d.guaranteedDropId || null,
    _secondPhase: false,
    sheetPalette: d.sheetPalette || null,
    spriteScale: (typeof d.spriteScale === 'number') ? d.spriteScale : 1,
    vnId: d.vnId || null,
    vnOnSight: null,
    source: d.source || null,
    createdAt: d.createdAt || null,
  });
}

function serializeCompanionEntity(c) {
  return {
    name: c.name || 'Companion',
    x: c.x, y: c.y,
    w: c.w || 12, h: c.h || 16,
    speed: (typeof c.speed === 'number') ? c.speed : 110,
    dir: c.dir || 'down',
    moving: !!c.moving,
    animTime: c.animTime || 0,
    animFrame: c.animFrame || 0,
    portrait: c.portraitSrc || null,
    sheetPalette: c.sheetPalette || null,
    inventory: c.inventory || null,
    affinity: (typeof c.affinity === 'number') ? c.affinity : 2,
    level: (typeof c.level === 'number') ? c.level : 1,
    xp: (typeof c.xp === 'number') ? c.xp : 0,
  };
}

function spawnCompanionFromRecord(d) {
  const sheet = d.sheetPalette ? makeSpriteSheet(d.sheetPalette) : sheetForName(d.name);
  const comp = spawnCompanion(d.x, d.y, sheet, {
    name: d.name,
    portrait: d.portrait || null,
    sheetPalette: d.sheetPalette || null,
    affinity: (typeof d.affinity === 'number') ? d.affinity : 2,
    level: (typeof d.level === 'number') ? d.level : 1,
    xp: (typeof d.xp === 'number') ? d.xp : 0,
  });
  comp.dir = d.dir || 'down';
  if (typeof d.w === 'number') comp.w = d.w;
  if (typeof d.h === 'number') comp.h = d.h;
  if (typeof d.speed === 'number') comp.speed = d.speed;
  if (typeof d.moving === 'boolean') comp.moving = d.moving;
  if (typeof d.animTime === 'number') comp.animTime = d.animTime;
  if (typeof d.animFrame === 'number') comp.animFrame = d.animFrame;
  if (d.inventory) comp.inventory = d.inventory;
}
function serializeNpcEntity(n) {
  return {
    name: n.name || 'NPC',
    dialogId: n.dialogId || null,
    x: n.x, y: n.y,
    w: n.w || 12, h: n.h || 16,
    speed: (typeof n.speed === 'number') ? n.speed : 100,
    dir: n.dir || 'down',
    moving: !!n.moving,
    animTime: n.animTime || 0,
    animFrame: n.animFrame || 0,
    portrait: n.portraitSrc || null,
    sheetPalette: n.sheetPalette || null,
    affinity: (typeof n.affinity === 'number') ? n.affinity : 5,
  };
}

function attachDialogById(npc, id) {
  const key = String(id || '').toLowerCase();
  if (!key) return;
  if (key === 'canopy') npc.dialog = canopyDialog;
  else if (key === 'yorna') npc.dialog = yornaDialog;
  else if (key === 'hola') npc.dialog = holaDialog;
  else {
    import('../data/dialogs.js').then(mod => {
      if (key === 'oyin' && mod.oyinDialog) npc.dialog = mod.oyinDialog;
      else if (key === 'twil' && mod.twilDialog) npc.dialog = mod.twilDialog;
      else if (key === 'tin' && mod.tinDialog) npc.dialog = mod.tinDialog;
      else if (key === 'nellis' && mod.nellisDialog) npc.dialog = mod.nellisDialog;
      else if (key === 'urn' && mod.urnDialog) npc.dialog = mod.urnDialog;
      else if (key === 'varabella' && mod.varabellaDialog) npc.dialog = mod.varabellaDialog;
      else if (key === 'villager' && mod.villagerDialog) npc.dialog = mod.villagerDialog;
      else if (key === 'fana_freed' && mod.fanaFreedDialog) npc.dialog = mod.fanaFreedDialog;
    }).catch(()=>{});
  }
}

function attachOnSightById(npc, id) {
  const key = String(id || '').toLowerCase();
  const seenKey = `npc:${key}`;
  if (runtime.vnSeen && runtime.vnSeen[seenKey]) return;
  const t = introTexts || {};
  const text = t[key];
  if (text && !npc.vnOnSight) npc.vnOnSight = { text };
}

function spawnNpcFromRecord(d) {
  const sheet = d.sheetPalette ? makeSpriteSheet(d.sheetPalette) : sheetForName(d.name);
  const npc = spawnNpc(d.x, d.y, d.dir || 'down', {
    name: d.name,
    sheet,
    portrait: d.portrait || null,
    sheetPalette: d.sheetPalette || null,
    affinity: (typeof d.affinity === 'number') ? d.affinity : 5,
    dialogId: d.dialogId || null,
  });
  npc.dialogId = d.dialogId || npc.dialogId || null;
  if (typeof d.w === 'number') npc.w = d.w;
  if (typeof d.h === 'number') npc.h = d.h;
  if (typeof d.speed === 'number') npc.speed = d.speed;
  if (typeof d.moving === 'boolean') npc.moving = d.moving;
  if (typeof d.animTime === 'number') npc.animTime = d.animTime;
  if (typeof d.animFrame === 'number') npc.animFrame = d.animFrame;
  // Attach by id if available; then intro by id
  if (npc.dialogId) attachDialogById(npc, npc.dialogId);
  if (npc.dialogId) attachOnSightById(npc, npc.dialogId);
}

export function applyPendingRestore() {
  let data = runtime._pendingRestore;
  if (!data) return;
  runtime._pendingRestore = null;
  try {
    runtime._suspendRenderUntilRestore = false;
    // Normalize and pause systems during restore
    data = normalizeSave(data);
    runtime.paused = true; runtime.disableVN = true;
    // Player
    if (data.player) {
      player.x = data.player.x; player.y = data.player.y; player.dir = data.player.dir || 'down';
      if (typeof data.player.hp === 'number') player.hp = data.player.hp;
      player.level = Math.max(1, data.player.level || 1);
      player.xp = Math.max(0, data.player.xp || 0);
    }
    // RNG seeds
    if (data.rng && runtime.rng) { Object.assign(runtime.rng, data.rng); }
    // Flags
    runtime.vnSeen = {}; (data.vnSeen||[]).forEach(k => runtime.vnSeen[k]=true);
    runtime.affinityFlags = {}; (data.affinityFlags||[]).forEach(k => runtime.affinityFlags[k]=true);
    runtime.questFlags = {}; (data.questFlags||[]).forEach(k => runtime.questFlags[k]=true);
    runtime.questCounters = {}; Object.assign(runtime.questCounters, data.questCounters||{});
    // Companions
    companions.length = 0;
    if (Array.isArray(data.companions)) {
      for (const c of data.companions) { try { spawnCompanionFromRecord(c); } catch {} }
      updatePartyUI(companions);
    }
    // NPCs
    npcs.length = 0;
    if (Array.isArray(data.npcs)) {
      for (const n of data.npcs) { try { spawnNpcFromRecord(n); } catch {} }
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
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    for (const vn of uniques) {
      const st = ua[vn]; if (!st) continue;
      const ent = byKey(vn);
      if (!ent) continue;
      if (st.state === 'defeated' || st.state === 'unspawned') {
        const idx = enemies.indexOf(ent); if (idx !== -1) enemies.splice(idx,1);
      } else if (st.state === 'alive') {
        // Apply top-level fields only (v2.1+)
        if (typeof st.hp === 'number') ent.hp = Math.max(1, Math.min(ent.maxHp || st.hp, st.hp));
        if (typeof st.x === 'number' && typeof st.y === 'number') {
          ent.x = clamp(Math.round(st.x), 0, Math.max(0, (world.w || 0) - (ent.w || 12)));
          ent.y = clamp(Math.round(st.y), 0, Math.max(0, (world.h || 0) - (ent.h || 16)));
        }
        if (st.dir) ent.dir = st.dir;
        if (typeof st.w === 'number') ent.w = st.w;
        if (typeof st.h === 'number') ent.h = st.h;
        if (typeof st.speed === 'number') ent.speed = st.speed;
        if (typeof st.touchDamage === 'number') ent.touchDamage = st.touchDamage;
        if (typeof st.spriteScale === 'number') ent.spriteScale = st.spriteScale;
        if (st.sheetPalette) {
          try { ent.sheetPalette = st.sheetPalette; ent.sheet = makeSpriteSheet(st.sheetPalette); } catch {}
        }
      }
    }
    // Dynamic enemies: replace all non-unique enemies with those from the save
    const dyn = Array.isArray(data.dynamicEnemies) ? data.dynamicEnemies : [];
    // Remove any existing non-unique enemies from the loader baseline
    try {
      const uniqSet = uniqueSetForLevel(runtime.currentLevel || 1);
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i]; if (!e) continue;
        const key = e.vnId || null;
        if (key && uniqSet.has(key)) continue; // keep uniques for status application above
        enemies.splice(i, 1);
      }
    } catch {}
    // Append saved dynamic enemies
    for (const d of dyn) { try { spawnEnemyFromRecord(d); } catch {} }
    // Ensure enemy identity (intro + default palette) for all enemies based on vnId and registry
    try { for (const e of enemies) ensureEnemyIdentity(e, runtime); } catch {}
    // Ensure intros can trigger later: clear stale flags but keep VN disabled until next tick
    try { for (const e of enemies) { if (e) e._vnShown = false; } runtime.introCooldown = 0.2; } catch {}

    showBanner('Game loaded');
    // Resume systems next tick; re-enable VN
    try { setTimeout(() => { runtime.disableVN = false; runtime.paused = false; }, 0); } catch { runtime.disableVN = false; runtime.paused = false; }
  } catch (e) {
    console.error('Apply restore failed', e);
    showBanner('Load failed');
    runtime.disableVN = false; runtime.paused = false;
  }
}

export function loadDataPayload(data) {
  try {
    const target = (data && typeof data.currentLevel === 'number') ? data.currentLevel : 1;
    if (target !== (runtime.currentLevel || 1)) {
      runtime._pendingRestore = data;
      runtime.pendingLevel = target;
      runtime._suspendRenderUntilRestore = true;
      showBanner(`Loading… switching to Level ${target}`);
      return;
    }
    runtime._pendingRestore = data;
    applyPendingRestore();
  } catch (e) {
    console.error('Load route failed', e);
    showBanner('Load failed');
  }
}

// --- Normalization helpers ---
function normalizeSave(s) {
  const out = JSON.parse(JSON.stringify(s || {}));
  const uniq = a => Array.from(new Set(Array.isArray(a) ? a : [])).sort();
  const clamp = (v,min,max) => Math.max(min, Math.min(v, max));
  const W = out?.world?.w ?? world.w ?? 1e9;
  const H = out?.world?.h ?? world.h ?? 1e9;
  out.openedChests = uniq(out.openedChests);
  out.brokenBreakables = uniq(out.brokenBreakables);
  out.vnSeen = uniq(out.vnSeen);
  out.affinityFlags = uniq(out.affinityFlags);
  out.questFlags = uniq(out.questFlags);
  if (Array.isArray(out.dynamicEnemies)) {
    out.dynamicEnemies = out.dynamicEnemies.map(e => ({
      ...e,
      x: clamp(Math.round(e.x|0), 0, Math.max(0, W-1)),
      y: clamp(Math.round(e.y|0), 0, Math.max(0, H-1)),
      dir: e.dir || 'down',
      hp: Math.max(0, e.hp|0),
      spriteScale: (typeof e.spriteScale === 'number') ? e.spriteScale : 1,
    }));
  }
  if (out.uniqueActors && typeof out.uniqueActors === 'object') {
    for (const k of Object.keys(out.uniqueActors)) {
      const u = out.uniqueActors[k];
      if (!u || u.state !== 'alive') continue;
      if (typeof u.x === 'number') u.x = clamp(Math.round(u.x|0), 0, Math.max(0, W-1));
      if (typeof u.y === 'number') u.y = clamp(Math.round(u.y|0), 0, Math.max(0, H-1));
      if (!u.dir) u.dir = 'down';
      if (typeof u.hp === 'number') u.hp = Math.max(0, u.hp|0);
      if (typeof u.spriteScale !== 'number') u.spriteScale = 1;
    }
  }
  return out;
}
