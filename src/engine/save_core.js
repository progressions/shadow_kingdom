// Save System — deterministic deltas + unique actor status
import { player, companions, npcs, obstacles, itemsOnGround, world, enemies, runtime, spawnCompanion, spawnNpc, spawners, addSpawner } from './state.js';
import { updatePartyUI, showBanner } from './ui.js';
import { makeSpriteSheet, sheetForName, enemyMookSheet, enemyFeaturedSheet, enemyBossSheet } from './sprites.js';
import { descriptorForLevel } from './level_descriptors.js';
import { loadLevel1, LEVEL_LOADERS } from './levels.js';
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

  // Dynamic enemies (non-unique). Prioritize those near anchors (player and alive uniques)
  // so critical encounters are preserved even if we cap the list.
  const anchors = [];
  try {
    anchors.push({ x: player.x + player.w/2, y: player.y + player.h/2 });
    for (const e of enemies) {
      if (!e || e.hp <= 0) continue;
      const key = e.vnId || null;
      if (key && uniques.has(key)) anchors.push({ x: e.x + (e.w||12)/2, y: e.y + (e.h||16)/2 });
    }
  } catch {}
  const candidates = [];
  for (const e of enemies) {
    if (!e || e.hp <= 0) continue;
    const key = e.vnId || (e.name ? `enemy:${String(e.name).toLowerCase()}` : null);
    if (key && uniques.has(key)) continue; // skip uniques; tracked separately
    const rec = serializeEnemyEntity(e);
    if (e.spawnerId) rec.spawnerId = e.spawnerId;
    if (typeof rec.x !== 'number' || typeof rec.y !== 'number' || !Number.isFinite(rec.x) || !Number.isFinite(rec.y)) continue;
    // Compute priority: closer to any anchor = higher priority
    let best = Infinity;
    try {
      const cx = e.x + (e.w||12)/2, cy = e.y + (e.h||16)/2;
      for (const a of anchors) {
        const dx = (cx - a.x), dy = (cy - a.y);
        const d2 = dx*dx + dy*dy; if (d2 < best) best = d2;
      }
    } catch {}
    candidates.push({ rec, prio: (Number.isFinite(best) ? -best : 0) });
  }
  // Cap to avoid bloat; keep highest-priority first
  const DYNAMIC_CAP = 300;
  let dynamicEnemies;
  if (candidates.length > DYNAMIC_CAP) {
    candidates.sort((a, b) => b.prio - a.prio);
    dynamicEnemies = candidates.slice(0, DYNAMIC_CAP).map(c => c.rec);
  } else {
    dynamicEnemies = candidates.map(c => c.rec);
  }

  // Persist VN seen (NPCs and enemies); only keep truthy flags
  const vnSeenAll = Object.keys(runtime?.vnSeen || {}).filter(k => !!runtime.vnSeen[k]);

  // Spawners (runtime state)
  const spawnerRecords = [];
  try {
    for (const sp of spawners) {
      if (!sp) continue;
      const now = runtime._timeSec || 0;
      const nextAtDelay = Math.max(0, (sp.nextAt || now) - now);
      const alive = Array.isArray(sp.currentlyAliveIds) ? sp.currentlyAliveIds : (sp.currentlyAliveIds ? Array.from(sp.currentlyAliveIds) : []);
      spawnerRecords.push({
        id: sp.id,
        x: sp.x, y: sp.y, w: sp.w, h: sp.h,
        visible: !!sp.visible,
        enemy: sp.enemy || { kind: 'mook' },
        batchSize: sp.batchSize, intervalSec: sp.intervalSec, initialDelaySec: sp.initialDelaySec || 0, jitterSec: sp.jitterSec || 0,
        totalToSpawn: (typeof sp.totalToSpawn === 'number') ? sp.totalToSpawn : null,
        concurrentCap: (typeof sp.concurrentCap === 'number') ? sp.concurrentCap : null,
        proximityMode: sp.proximityMode || 'ignore', radiusPx: sp.radiusPx || 160,
        active: sp.active !== false,
        disabled: !!sp.disabled,
        gates: sp.gates || null,
        spawnedCount: sp.spawnedCount|0,
        nextAtDelay,
        currentlyAliveIds: alive,
      });
    }
  } catch {}

  const payload = {
    schema: 'save',
    version: 3,
    at: Date.now(),
    currentLevel: runtime.currentLevel || 1,
    rng,
    loadouts: (function(){
      try {
        const LO = runtime._loadouts || {};
        const melee = LO.melee || {}; const ranged = LO.ranged || {};
        return {
          melee: { rightHandId: melee.rightHandId || null, leftHandId: melee.leftHandId || null },
          ranged: { rightHandId: ranged.rightHandId || null },
        };
      } catch { return null; }
    })(),
    player: { x: player.x, y: player.y, hp: player.hp, dir: player.dir, level: player.level||1, xp: player.xp||0 },
    companions: companions.map(c => serializeCompanionEntity(c)),
    // Torch bearer state (companion index + remaining burn)
    torch: (function(){
      try {
        const idx = runtime._torchBearerRef ? companions.indexOf(runtime._torchBearerRef) : -1;
        if (idx >= 0) return { bearerIndex: idx, burnMs: Math.max(0, Math.floor(runtime._torchBurnMs || 0)) };
      } catch {}
      return { bearerIndex: -1, burnMs: 0 };
    })(),
    npcs: npcs.map(n => serializeNpcEntity(n)),
    playerInv: player.inventory || null,
    world: { w: world.w, h: world.h },
    gateStates: gatherGateStates(),
    openedChests: obstacles.filter(o => o && o.type === 'chest' && o.opened && o.id).map(o => o.id),
    brokenBreakables: Object.keys(runtime?.brokenBreakables || {}),
    groundItems: (Array.isArray(itemsOnGround) ? itemsOnGround.map(g => ({ id: g.id, x: g.x, y: g.y, item: g.item })) : []),
    vnSeen: vnSeenAll,
    affinityFlags: Object.keys(runtime?.affinityFlags || {}).filter(k => !!runtime.affinityFlags[k]),
    // Persist only truthy quest flags so false/cleared flags don't revive on load
    questFlags: Object.keys(runtime?.questFlags || {}).filter(k => !!runtime.questFlags[k]),
    questCounters: Object.assign({}, runtime?.questCounters || {}),
    questMeta: Object.assign({}, runtime?.questMeta || {}),
    uniqueActors,
    dynamicEnemies,
    spawners: spawnerRecords,
    // Feature toggles
    snakeMode: !!(runtime && runtime.snakeMode),
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
    spriteId: e.spriteId || null,
    kind: e.kind || 'mook',
    name: e.name || null,
    vnId: e.vnId || null,
    x: e.x, y: e.y,
    dir: e.dir || 'down',
    hp: e.hp, maxHp: e.maxHp,
    touchDamage: e.touchDamage, speed: e.speed,
    w: e.w, h: e.h, spriteScale: e.spriteScale || 1,
    sheetPalette: e.sheetPalette || null,
    spawnerId: e.spawnerId || null,
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
    // Leash/guardian behavior persistence for dynamic enemies
    guardian: !!e.guardian,
    leashed: !!e.leashed,
    leashRadius: (typeof e.leashRadius === 'number') ? e.leashRadius : undefined,
    guardianRegen: (typeof e.guardianRegen === 'number') ? e.guardianRegen : undefined,
    homeX: (typeof e.homeX === 'number') ? e.homeX : undefined,
    homeY: (typeof e.homeY === 'number') ? e.homeY : undefined,
    aggroRadius: (typeof e.aggroRadius === 'number') ? e.aggroRadius : undefined,
    // LoS tuning
    requiresLoS: (typeof e.requiresLoS === 'boolean') ? e.requiresLoS : undefined,
    losMemorySec: (typeof e.losMemorySec === 'number') ? e.losMemorySec : undefined,
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
  const sheetFromKind = (k) => (k === 'boss' ? enemyBossSheet : (k === 'featured' ? enemyFeaturedSheet : enemyMookSheet));
  const sheet = d.sheetPalette ? makeSpriteSheet(d.sheetPalette) : sheetFromKind(kind);
  enemies.push({
    id: d.id || (`de_${Date.now().toString(36)}_${Math.floor(Math.random()*1e6).toString(36)}`),
    spriteId: d.spriteId || null,
    x, y, w, h,
    speed, dir: d.dir || 'down', moving: true,
    animTime: 0, animFrame: 0, hp, maxHp, touchDamage: dmg, hitTimer: 0, hitCooldown: (typeof d.hitCooldown === 'number') ? d.hitCooldown : 0.8,
    knockbackX: 0, knockbackY: 0,
    name: d.name || base.name, kind,
    sheet,
    sheetPalette: d.sheetPalette || null,
    portraitSrc: d.portraitSrc || null,
    portraitPowered: d.portraitPowered || null,
    portraitOverpowered: d.portraitOverpowered || null,
    portraitDefeated: d.portraitDefeated || null,
    onDefeatNextLevel: (typeof d.onDefeatNextLevel === 'number') ? d.onDefeatNextLevel : null,
    questId: d.questId || null,
    guaranteedDropId: d.guaranteedDropId || null,
    spawnerId: d.spawnerId || null,
    _secondPhase: false,
    spriteScale: (typeof d.spriteScale === 'number') ? d.spriteScale : 1,
    vnId: d.vnId || null,
    vnOnSight: null,
    source: d.source || null,
    createdAt: d.createdAt || null,
    // Guardian/leash flags
    guardian: !!d.guardian,
    leashed: !!d.leashed,
    leashRadius: (typeof d.leashRadius === 'number') ? d.leashRadius : undefined,
    guardianRegen: (typeof d.guardianRegen === 'number') ? d.guardianRegen : undefined,
    homeX: (typeof d.homeX === 'number') ? d.homeX : Math.round(x + w/2),
    homeY: (typeof d.homeY === 'number') ? d.homeY : Math.round(y + h/2),
    aggroRadius: (typeof d.aggroRadius === 'number') ? d.aggroRadius : undefined,
    // LoS tuning (defaults match runtime defaults)
    requiresLoS: (typeof d.requiresLoS === 'boolean') ? d.requiresLoS : true,
    losMemorySec: (typeof d.losMemorySec === 'number') ? Math.max(0, d.losMemorySec) : 0.8,
  });
}

function serializeCompanionEntity(c) {
  return {
    spriteId: c.spriteId || null,
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
  // Add feminineShape flag to companions when loading from saves
  const paletteWithShape = d.sheetPalette ? { ...d.sheetPalette, feminineShape: true } : null;
  const sheet = paletteWithShape ? makeSpriteSheet(paletteWithShape) : sheetForName(d.name);
  const nameKey = String(d.name || '').toLowerCase();
  const spriteId = d.spriteId || ( (nameKey.includes('snek') || nameKey.includes('snake') || nameKey.includes('smek')) ? 'assets/snake_sprite_strip_64x20' : null );
  const comp = spawnCompanion(d.x, d.y, sheet, {
    spriteId,
    name: d.name,
    portrait: d.portrait || null,
    sheetPalette: d.sheetPalette || null,
    affinity: (typeof d.affinity === 'number') ? d.affinity : ((String(d.name||'').toLowerCase()==='codex') ? 5 : 3),
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
    spriteId: n.spriteId || null,
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
    affinity: (typeof n.affinity === 'number') ? n.affinity : ((String(n.name||'').toLowerCase()==='codex') ? 5 : 3),
    questId: n.questId || null,
  };
}

function attachDialogById(npc, id) {
  const key = String(id || '').toLowerCase();
  if (!key) return;
  import('../data/dialogs.js').then(mod => {
    if (key === 'canopy' && mod.canopyDialog) npc.dialog = mod.canopyDialog;
    else if (key === 'yorna' && mod.yornaDialog) npc.dialog = mod.yornaDialog;
    else if (key === 'hola' && mod.holaDialog) npc.dialog = mod.holaDialog;
    else if (key === 'oyin' && mod.oyinDialog) npc.dialog = mod.oyinDialog;
    else if (key === 'twil' && mod.twilDialog) npc.dialog = mod.twilDialog;
    else if (key === 'tin' && mod.tinDialog) npc.dialog = mod.tinDialog;
    else if (key === 'nellis' && mod.nellisDialog) npc.dialog = mod.nellisDialog;
    else if (key === 'urn' && mod.urnDialog) npc.dialog = mod.urnDialog;
    else if (key === 'varabella' && mod.varabellaDialog) npc.dialog = mod.varabellaDialog;
    else if (key === 'villager' && mod.villagerDialog) npc.dialog = mod.villagerDialog;
    else if (key === 'fana_freed' && mod.fanaFreedDialog) npc.dialog = mod.fanaFreedDialog;
    else if (key === 'rose' && mod.roseDialog) npc.dialog = mod.roseDialog;
  }).catch(()=>{});
}

function attachOnSightById(npc, id) {
  const key = String(id || '').toLowerCase();
  const seenKey = `npc:${key}`;
  if (runtime.vnSeen && runtime.vnSeen[seenKey]) return;
  import('../data/intro_texts.js').then(mod => {
    const t = mod.introTexts || {};
    const text = t[key];
    if (text && !npc.vnOnSight) npc.vnOnSight = { text };
  }).catch(()=>{});
}

function spawnNpcFromRecord(d) {
  // Add feminineShape flag to female NPCs when loading from saves
  const isFemaleNpc = d.name && ['canopy', 'yorna', 'hola', 'oyin', 'twil', 'tin', 'nellis', 'urn', 'varabella', 'ell', 'fana', 'rose'].some(n => d.name.toLowerCase().includes(n));
  const paletteWithShape = (d.sheetPalette && isFemaleNpc) ? { ...d.sheetPalette, feminineShape: true } : d.sheetPalette;
  const sheet = paletteWithShape ? makeSpriteSheet(paletteWithShape) : sheetForName(d.name);
  const nameKey2 = String(d.name || '').toLowerCase();
  const spriteId2 = d.spriteId || ( (nameKey2.includes('snek') || nameKey2.includes('snake') || nameKey2.includes('smek')) ? 'assets/snake_sprite_strip_64x20' : null );
  const npc = spawnNpc(d.x, d.y, d.dir || 'down', {
    spriteId: spriteId2,
    name: d.name,
    sheet,
    portrait: d.portrait || null,
    sheetPalette: d.sheetPalette || null,
    affinity: (typeof d.affinity === 'number') ? d.affinity : ((String(d.name||'').toLowerCase()==='codex') ? 5 : 3),
    dialogId: d.dialogId || null,
  });
  npc.dialogId = d.dialogId || npc.dialogId || null;
  if (d.questId) npc.questId = d.questId;
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
    // Keep render suspended during restore; cleared at the end.
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
    // Player inventory
    if (data.playerInv) { try { player.inventory = data.playerInv; } catch {} }
    // RNG seeds
    if (data.rng && runtime.rng) { Object.assign(runtime.rng, data.rng); }
    // Flags
    runtime.vnSeen = {}; (data.vnSeen||[]).forEach(k => runtime.vnSeen[k]=true);
    runtime.affinityFlags = {}; (data.affinityFlags||[]).forEach(k => runtime.affinityFlags[k]=true);
    runtime.questFlags = {}; (data.questFlags||[]).forEach(k => runtime.questFlags[k]=true);
    runtime.questCounters = {}; Object.assign(runtime.questCounters, data.questCounters||{});
    runtime.questMeta = {}; Object.assign(runtime.questMeta, data.questMeta||{});
    // Re-show persistent tutorial banner if applicable and no torch bearer saved
    try {
      const hasBearer = !!(data.torch && typeof data.torch.bearerIndex === 'number' && data.torch.bearerIndex >= 0);
      if (runtime.questFlags['tutorial_canopy_torch'] === true && !hasBearer) {
        import('./ui.js').then(u => u.showPersistentBanner && u.showPersistentBanner('Ask Canopy to hold the torch, press C for companions')).catch(()=>{});
      }
    } catch {}
    // Loadouts (melee/ranged)
    try {
      const LO = data.loadouts || null;
      if (LO && typeof LO === 'object') {
        runtime._loadouts = {
          melee: { rightHandId: LO.melee?.rightHandId || null, leftHandId: LO.melee?.leftHandId || null },
          ranged: { rightHandId: LO.ranged?.rightHandId || null },
        };
      }
    } catch {}
    // Feature toggles
    runtime.snakeMode = !!data.snakeMode;
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
    // Torch bearer (companion index) restore
    try {
      const torch = data.torch || null;
      if (torch && typeof torch.bearerIndex === 'number' && torch.bearerIndex >= 0) {
        const comp = companions[torch.bearerIndex] || null;
        if (comp) {
          runtime._torchBearerRef = comp;
          runtime._torchBurnMs = Math.max(0, Math.floor(torch.burnMs || 0));
          import('./lighting.js').then(m => {
            try {
              const node = m.addLightNode({ x: comp.x + comp.w/2, y: comp.y + comp.h/2, level: m.MAX_LIGHT_LEVEL, radius: 6, enabled: true });
              runtime._torchLightNode = node;
            } catch {}
          }).catch(()=>{});
        }
      }
    } catch {}
    // World deltas
    applyGateStates(data);
    if (Array.isArray(data.openedChests)) {
      // Mark opened states and remove opened chest obstacles from the world
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        if (!o || o.type !== 'chest' || !o.id) continue;
        if (data.openedChests.includes(o.id)) {
          o.opened = true;
          obstacles.splice(i, 1);
        }
      }
    }
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
    const classifyUnique = (vnId) => {
      const id = String(vnId || '').toLowerCase();
      return (id.includes('vorthak') || id.includes('vast') || id.includes('nethra') || id.includes('luula') || id.includes('vanificia')) ? 'boss' : 'featured';
    };
    for (const vn of uniques) {
      const st = ua[vn]; if (!st) continue;
      const ent = byKey(vn);
      if (st.state === 'defeated' || st.state === 'unspawned') {
        if (ent) { const idx = enemies.indexOf(ent); if (idx !== -1) enemies.splice(idx,1); }
        continue;
      }
      if (st.state === 'alive' && ent) {
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
        if (st.sheetPalette) { try { ent.sheetPalette = st.sheetPalette; ent.sheet = makeSpriteSheet(st.sheetPalette); } catch {} }
        continue;
      }
      if (st.state === 'alive' && !ent) {
        // Spawn unique actor from saved pose/stats since loader baseline was cleared
        const kind = classifyUnique(vn);
        const rec = {
          id: `u_${vn}_${Date.now().toString(36)}`,
          kind,
          name: null,
          vnId: vn,
          x: clamp(Math.round(st.x || 0), 0, Math.max(0, world.w - 12)),
          y: clamp(Math.round(st.y || 0), 0, Math.max(0, world.h - 16)),
          dir: st.dir || 'down',
          hp: (typeof st.hp === 'number') ? st.hp : 10,
          touchDamage: (typeof st.touchDamage === 'number') ? st.touchDamage : (kind === 'boss' ? 8 : 4),
          speed: (typeof st.speed === 'number') ? st.speed : (kind === 'boss' ? 12 : 11),
          w: (typeof st.w === 'number') ? st.w : 12,
          h: (typeof st.h === 'number') ? st.h : 16,
          spriteScale: (typeof st.spriteScale === 'number') ? st.spriteScale : (kind === 'boss' ? 2 : 1),
          sheetPalette: st.sheetPalette || null,
        };
        try { spawnEnemyFromRecord(rec); } catch {}
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
    // Rebuild spawner links after enemies have been spawned
    try {
      const byId = new Map();
      for (const e of enemies) { if (e && e.id) byId.set(e.id, e); }
      const list = Array.isArray(data.spawners) ? data.spawners : [];
      // Reset runtime spawners to saved ones
      try {
        const now = runtime._timeSec || 0;
        spawners.length = 0;
        for (const s of list) {
          const sp = addSpawner({
              id: s.id, x: s.x, y: s.y, w: s.w, h: s.h, visible: s.visible,
              enemy: s.enemy,
              batchSize: s.batchSize, intervalSec: s.intervalSec, initialDelaySec: s.initialDelaySec,
              jitterSec: s.jitterSec, totalToSpawn: s.totalToSpawn, concurrentCap: s.concurrentCap,
              proximityMode: s.proximityMode, radiusPx: s.radiusPx,
              active: s.active, disabled: s.disabled, gates: s.gates,
              spawnedCount: s.spawnedCount, currentlyAliveIds: [],
          });
          // Resume timer
          sp.nextAt = now + Math.max(0, Number(s.nextAtDelay || 0));
          // Rebuild live set
          if (Array.isArray(s.currentlyAliveIds)) {
            for (const id of s.currentlyAliveIds) {
              if (byId.has(id)) sp.currentlyAliveIds.add(id);
            }
          }
        }
      } catch {}
    } catch {}
    // Ensure enemy identity (intro + default palette) for all enemies based on vnId and registry
    try { for (const e of enemies) ensureEnemyIdentity(e, runtime); } catch {}
    // Ensure intros can trigger later: clear stale flags on enemies and NPCs
    try {
      for (const e of enemies) { if (e) e._vnShown = false; }
      for (const n of npcs) { if (n) n._vnShown = false; }
      runtime.introCooldown = 0.2;
    } catch {}

    showBanner('Game loaded');
    try { runtime._loadedAt = (performance && performance.now) ? performance.now() : Date.now(); } catch { runtime._loadedAt = Date.now(); }
    // Resume systems next tick; re-enable VN
    try { setTimeout(() => { runtime.disableVN = false; runtime.paused = false; }, 0); } catch { runtime.disableVN = false; runtime.paused = false; }
    // Allow render again
    runtime._suspendRenderUntilRestore = false;
  } catch (e) {
    console.error('Apply restore failed', e);
    showBanner('Load failed');
    runtime.disableVN = false; runtime.paused = false;
    runtime._suspendRenderUntilRestore = false;
  }
}

export function loadDataPayload(data) {
  try {
    const target = (data && typeof data.currentLevel === 'number') ? data.currentLevel : 1;
    if (target !== (runtime.currentLevel || 1)) {
      runtime._pendingRestore = data;
      runtime.pendingLevel = target;
      runtime._suspendRenderUntilRestore = true;
      // Prevent simulation and VN triggers while swapping level
      runtime.paused = true;
      runtime.disableVN = true;
      showBanner(`Loading… switching to Level ${target}`);
      return;
    }
    // For same-level loads, suspend render during restore to avoid showing baseline entities.
    runtime._suspendRenderUntilRestore = true;
    runtime.paused = true;
    runtime.disableVN = true;
    runtime._pendingRestore = data;
    applyPendingRestore();
  } catch (e) {
    console.error('Load route failed', e);
    showBanner('Load failed');
  }
}

// --- Loader/Writer helper APIs (guide-friendly) ---
export function pauseSimulation() { runtime.paused = true; }
export function resumeSimulation() { runtime.paused = false; }
export function disableAllSpawnersAndVN() { runtime.disableVN = true; }
export function enableAllSpawnersAndVN() { runtime.disableVN = false; }
export function resetLevelToGeometryOnly() { try { enemies.length = 0; npcs.length = 0; } catch {} }
export function loadLevelGeometryOnly(level) {
  const lvl = (typeof level === 'number' && level > 0) ? level : 1;
  const loader = LEVEL_LOADERS[lvl] || loadLevel1;
  const terrain = loader();
  resetLevelToGeometryOnly();
  runtime.currentLevel = lvl;
  return terrain;
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
  // Normalize spawners
  if (Array.isArray(out.spawners)) {
    out.spawners = out.spawners.map(s => ({
      ...s,
      id: String(s.id || ''),
      x: clamp(Math.round(s.x|0), 0, Math.max(0, W-1)),
      y: clamp(Math.round(s.y|0), 0, Math.max(0, H-1)),
      w: Math.max(1, Math.round((s.w||12)|0)),
      h: Math.max(1, Math.round((s.h||12)|0)),
      nextAtDelay: Math.max(0, Number(s.nextAtDelay || 0)),
      batchSize: Math.max(1, Math.floor(s.batchSize || 1)),
      intervalSec: Math.max(0.1, Number(s.intervalSec || 6)),
      totalToSpawn: (typeof s.totalToSpawn === 'number') ? Math.max(0, Math.floor(s.totalToSpawn)) : null,
      concurrentCap: (typeof s.concurrentCap === 'number') ? Math.max(1, Math.floor(s.concurrentCap)) : null,
      currentlyAliveIds: Array.isArray(s.currentlyAliveIds) ? uniq(s.currentlyAliveIds) : [],
      proximityMode: (s.proximityMode === 'near' || s.proximityMode === 'far') ? s.proximityMode : 'ignore',
      radiusPx: Math.max(1, Math.floor(s.radiusPx || 160)),
      active: s.active !== false,
      disabled: !!s.disabled,
    }));
  }
  // Normalize loadouts
  if (!out.loadouts || typeof out.loadouts !== 'object') {
    out.loadouts = { melee: { rightHandId: null, leftHandId: null }, ranged: { rightHandId: null } };
  } else {
    const m = out.loadouts.melee || {}; const r = out.loadouts.ranged || {};
    out.loadouts = {
      melee: { rightHandId: m.rightHandId || null, leftHandId: m.leftHandId || null },
      ranged: { rightHandId: r.rightHandId || null },
    };
  }
  // Normalize torch bearer
  if (!out.torch || typeof out.torch !== 'object') {
    out.torch = { bearerIndex: -1, burnMs: 0 };
  } else {
    out.torch.bearerIndex = (typeof out.torch.bearerIndex === 'number') ? Math.max(-1, Math.floor(out.torch.bearerIndex)) : -1;
    out.torch.burnMs = Math.max(0, Math.floor(out.torch.burnMs || 0));
  }
  return out;
}
