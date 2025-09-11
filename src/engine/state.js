import { TILE } from './constants.js';
import { enemyMookSheet, enemyFeaturedSheet, enemyBossSheet, enemyMookPalette, enemyFeaturedPalette, enemyBossPalette } from './sprites.js';
import { enemyPalettes } from '../data/enemy_palettes.js';
import { makeSpriteSheet } from './sprites.js';

// World and camera
export const world = {
  tileW: 100,
  tileH: 60,
  showGrid: false,
  get w() { return this.tileW * TILE; },
  get h() { return this.tileH * TILE; },
};
export const camera = { x: 0, y: 0, w: 320, h: 180 };

// Player and actors
export const player = {
  x: world.w / 2,
  y: world.h / 2,
  w: 12,
  h: 16,
  speed: 100,
  dir: 'down',
  moving: false,
  animTime: 0,
  animFrame: 0,
  hp: 10,
  maxHp: 10,
  level: 1,
  xp: 0,
  attackCooldown: 0.35,
  lastAttack: -999,
  attacking: false,
  attackTimer: 0,
  attackDuration: 0.18,
  damage: 1,
  // Hit response
  invulnTimer: 0, // seconds of invincibility after being hit
  knockbackX: 0,
  knockbackY: 0,
  inventory: { items: [], equipped: { head: null, torso: null, legs: null, leftHand: null, rightHand: null } },
};

export const enemies = [];
export const companions = [];
export const npcs = [];
export const obstacles = [];
export const corpses = [];
export const stains = [];
export const sparkles = [];
export const itemsOnGround = [];
// Enemy spawners (runtime)
export const spawners = [];

export function addSpawner(cfg = {}) {
  const now = (typeof runtime?._timeSec === 'number') ? runtime._timeSec : 0;
  const id = String(cfg.id || `sp_${Date.now().toString(36)}_${Math.floor(Math.random()*1e6).toString(36)}`);
  // If a spawner with this id already exists, replace it (prevents duplicates across loads)
  const existingIdx = spawners.findIndex(s => s && s.id === id);
  const sp = {
    id,
    x: Math.max(0, Math.floor(cfg.x || 0)),
    y: Math.max(0, Math.floor(cfg.y || 0)),
    w: Math.max(1, Math.floor(cfg.w || 12)),
    h: Math.max(1, Math.floor(cfg.h || 12)),
    visible: !!cfg.visible,
    // Enemy template
    enemy: Object.assign({ kind: 'mook' }, cfg.enemy || {}),
    // Behavior/config
    batchSize: Math.max(1, Math.floor(cfg.batchSize || 1)),
    intervalSec: Math.max(0.1, Number(cfg.intervalSec || 6)),
    initialDelaySec: Math.max(0, Number(cfg.initialDelaySec || 0)),
    jitterSec: Math.max(0, Number(cfg.jitterSec || 0)),
    totalToSpawn: (typeof cfg.totalToSpawn === 'number') ? Math.max(0, Math.floor(cfg.totalToSpawn)) : null, // null=infinite
    concurrentCap: (typeof cfg.concurrentCap === 'number') ? Math.max(1, Math.floor(cfg.concurrentCap)) : null,
    // Proximity gating
    proximityMode: (cfg.proximityMode === 'near' || cfg.proximityMode === 'far') ? cfg.proximityMode : 'ignore',
    radiusPx: Math.max(1, Math.floor(cfg.radiusPx || 160)),
    // Flags
    active: (cfg.active !== false),
    disabled: !!cfg.disabled,
    gates: cfg.gates ? { ...cfg.gates } : null,
    // Runtime state
    spawnedCount: Math.max(0, Math.floor(cfg.spawnedCount || 0)),
    nextAt: now + Math.max(0, Number(cfg.initialDelaySec || 0)),
    currentlyAliveIds: new Set(Array.isArray(cfg.currentlyAliveIds) ? cfg.currentlyAliveIds : []),
  };
  if (existingIdx !== -1) spawners.splice(existingIdx, 1, sp);
  else spawners.push(sp);
  return sp;
}

export function findSpawnerById(id) {
  const key = String(id || '');
  return spawners.find(s => s && s.id === key) || null;
}
let _nextPickupId = 1;

export function spawnPickup(x, y, item) {
  if (!item) return null;
  const w = 10, h = 10;
  const p = { id: 'p' + (_nextPickupId++), x: Math.round(x), y: Math.round(y), w, h, item };
  itemsOnGround.push(p);
  return p;
}

// Inventory helpers (stacking)
export function addItemToInventory(inv, item) {
  if (!inv || !item) return;
  if (item.stackable) {
    const max = item.maxQty || 99;
    // try to merge with existing stacks
    const stacks = (inv.items || []).filter(x => x && x.stackable && x.id === item.id);
    let remaining = item.qty || 1;
    for (const s of stacks) {
      const room = Math.max(0, (s.maxQty || max) - (s.qty || 0));
      if (room <= 0) continue;
      const take = Math.min(room, remaining);
      s.qty = (s.qty || 0) + take;
      remaining -= take;
      if (remaining <= 0) break;
    }
    if (remaining > 0) {
      const copy = { ...item, qty: remaining };
      if (!inv.items) inv.items = [];
      inv.items.push(copy);
    }
  } else {
    if (!inv.items) inv.items = [];
    inv.items.push(item);
  }
}

// ---- Inventory auto-equip helpers ----
function isValidEquipSlot(slot) {
  return slot === 'head' || slot === 'torso' || slot === 'legs' || slot === 'leftHand' || slot === 'rightHand';
}

function scoreForSlot(item, slot) {
  if (!item) return [0, 0];
  const atk = typeof item.atk === 'number' ? item.atk : 0;
  const dr = typeof item.dr === 'number' ? item.dr : 0;
  const s = String(slot || item.slot || '');
  if (s === 'rightHand') return [atk, dr];
  if (s === 'leftHand') return [dr, atk];
  // Armor slots default to DR primary, ATK secondary (in case of odd items)
  return [dr, atk];
}

function isBetterForSlot(a, b, slot) {
  // Returns true if item a is strictly better than b for the slot
  const [ap, as] = scoreForSlot(a, slot);
  const [bp, bs] = scoreForSlot(b, slot);
  if (ap !== bp) return ap > bp;
  if (as !== bs) return as > bs;
  return false;
}

export async function autoEquipIfBetter(actor, slotOrItem) {
  const actorRef = actor || null;
  if (!actorRef || !actorRef.inventory) return false;
  const inv = actorRef.inventory;
  const slot = typeof slotOrItem === 'string' ? slotOrItem : (slotOrItem?.slot || null);
  if (!slot) return false;
  if (!isValidEquipSlot(slot)) return false;
  const sKey = String(slot);
  const eq = inv.equipped || {};
  const current = eq[sKey] || null;
  // Consider only non-stackable candidates for auto-equip
  const candidates = (inv.items || []).filter(it => it && it.slot === sKey && !it.stackable);
  if (!candidates.length) {
    // Nothing to equip from backpack
    return false;
  }
  // Find best candidate by score for this slot
  let best = candidates[0];
  let bestIdx = (inv.items || []).indexOf(best);
  for (let i = 1; i < candidates.length; i++) {
    const c = candidates[i];
    if (isBetterForSlot(c, best, sKey)) {
      best = c;
      bestIdx = (inv.items || []).indexOf(c);
    }
  }
  // If nothing equipped, or best is better than current, equip it
  if (!current || isBetterForSlot(best, current, sKey)) {
    // Move currently equipped back to backpack
    if (current) (inv.items || (inv.items = [])).push(current);
    // Equip best and remove from backpack
    eq[sKey] = best;
    if (bestIdx !== -1) (inv.items || []).splice(bestIdx, 1);
    // Refresh UI and show banner
    try { (await import('./ui.js')).updatePartyUI && (await import('./ui.js')).updatePartyUI(companions); } catch {}
    try {
      const nm = actorRef === player ? 'Auto-equipped' : `${actorRef.name || 'Companion'} auto-equipped`;
      (await import('./ui.js')).showBanner && (await import('./ui.js')).showBanner(`${nm} ${best.name}`);
    } catch {}
    return true;
  }
  return false;
}

// Ensure inventory consistency: no non-equip items left in equipped map
export function normalizeInventory(inv) {
  if (!inv) return;
  const eq = inv.equipped || {};
  const items = inv.items || (inv.items = []);
  for (const k of Object.keys(eq)) {
    const it = eq[k];
    if (!it) continue;
    if (!isValidEquipSlot(k) || !isValidEquipSlot(it.slot)) {
      // Move to backpack and clear slot
      items.push(it);
      eq[k] = null;
    }
  }
}

export function spawnEnemy(x, y, type = 'mook', opts = {}) {
  // Three classes: mook, featured, boss
  const T = String(type).toLowerCase();
  const cfg = (T === 'boss')
    ? { name: 'Boss', speed: 12, hp: 30, dmg: 8, sheet: enemyBossSheet, kind: 'boss' }
    : (T === 'featured' || T === 'foe' || T === 'elite')
      ? { name: 'Featured Foe', speed: 11, hp: 5, dmg: 3, sheet: enemyFeaturedSheet, kind: 'featured' }
      : { name: 'Mook', speed: 10, hp: 3, dmg: 3, sheet: enemyMookSheet, kind: 'mook' };
  const hp = (typeof opts.hp === 'number') ? opts.hp : cfg.hp;
  const dmg = (typeof opts.dmg === 'number') ? opts.dmg : ((typeof opts.touchDamage === 'number') ? opts.touchDamage : cfg.dmg);
  const w = (typeof opts.w === 'number') ? opts.w : 12;
  const h = (typeof opts.h === 'number') ? opts.h : 16;
  // Finalize base speed with small global bumps:
  // - mooks: +1 (tiny)
  // - featured: +1 (little)
  // - key guardians (featured with guaranteedDropId): +1 more
  // - bosses: +2 (bit more)
  let finalSpeed = cfg.speed;
  if (T === 'mook') finalSpeed += 1;
  if (T === 'featured') finalSpeed += 1;
  if (T === 'boss') finalSpeed += 2;
  if (opts.guaranteedDropId) finalSpeed += 1;

  const ent = {
    spriteId: opts.spriteId || null,
    id: opts.id || (`de_${Date.now().toString(36)}_${Math.floor(Math.random()*1e6).toString(36)}`),
    x, y,
    w, h,
    speed: finalSpeed,
    dir: 'down',
    moving: true,
    animTime: 0,
    animFrame: 0,
    name: opts.name || cfg.name,
    kind: cfg.kind,
    hp,
    maxHp: hp,
    touchDamage: dmg,
    hitTimer: 0,
    hitCooldown: 0.8,
    knockbackX: 0,
    knockbackY: 0,
    avoidSign: Math.random() < 0.5 ? 1 : -1,
    stuckTime: 0,
    sheet: opts.sheet || cfg.sheet,
    sheetPalette: opts.sheetPalette || (T === 'boss' ? enemyBossPalette : (T === 'featured' ? enemyFeaturedPalette : enemyMookPalette)),
    // Optional portrait for VN overlay on enemies
    portraitSrc: opts.portrait || null,
    // Optional portraits for empowered/defeated VNs (boss flow)
    portraitPowered: opts.portraitPowered || null,
    portraitOverpowered: opts.portraitOverpowered || null,
    portraitDefeated: opts.portraitDefeated || null,
    // Optional spawner link
    spawnerId: opts.spawnerId || null,
    // Optional minimal VN intro config
    vnOnSight: opts.vnOnSight || null,
    // Stable VN identity key (e.g., 'enemy:gorg') for persistence
    vnId: opts.vnId || null,
    // Optional guaranteed drop item id (e.g., 'key_bronze')
    guaranteedDropId: opts.guaranteedDropId || null,
    // Optional next level to transition after boss defeat
    onDefeatNextLevel: (typeof opts.onDefeatNextLevel === 'number') ? opts.onDefeatNextLevel : null,
    // Optional quest linkage
    questId: opts.questId || null,
    // Optional sprite scale for rendering (1 = 16x16, 2 = 32x32)
    spriteScale: (typeof opts.spriteScale === 'number') ? Math.max(0.5, Math.min(4, opts.spriteScale)) : 1,
    source: opts.source || null,
    createdAt: typeof opts.createdAt === 'number' ? opts.createdAt : (performance && performance.now ? performance.now() : Date.now()),
  };
  // Apply vnId-specific default palette automatically if provided in registry and not explicitly set
  try {
    const key = (opts.vnId || '').replace(/^enemy:/,'').toLowerCase();
    if (key && !opts.sheetPalette) {
      const pal = enemyPalettes[key];
      if (pal) {
        ent.sheetPalette = pal;
        try { ent.sheet = makeSpriteSheet(pal); } catch {}
      }
    }
  } catch {}
  enemies.push(ent);
  try {
    if (window && window.DEBUG_ENEMIES) {
      console.log('[ENEMY SPAWN]', {
        name: ent.name, kind: ent.kind, x: ent.x, y: ent.y, hp: ent.hp, vnId: ent.vnId || null,
      });
    }
  } catch {}
  return ent;
}

// Lightweight corpse entity (pass-through, fades out)
export function spawnCorpse(x, y, opts = {}) {
  corpses.push({
    x, y,
    w: 12, h: 16,
    dir: opts.dir || 'down',
    kind: opts.kind || 'enemy',
    sheet: opts.sheet || null,
    t: 0, // elapsed seconds
    life: typeof opts.life === 'number' ? opts.life : 1.5, // fade duration
    angle: typeof opts.angle === 'number' ? opts.angle : ([-Math.PI/2, 0, Math.PI/2, Math.PI][(Math.random()*4)|0] + (Math.random()*0.2 - 0.1)),
  });
}

export function spawnStain(x, y, opts = {}) {
  const life = typeof opts.life === 'number' ? opts.life : 2.5;
  const count = opts.count || (3 + (Math.random()*3|0));
  const blobs = [];
  for (let i = 0; i < count; i++) {
    const r = 2 + Math.random()*3;
    const ox = (Math.random()*8 - 4);
    const oy = (Math.random()*6 - 3);
    blobs.push({ ox, oy, r });
  }
  stains.push({ x, y, t: 0, life, blobs });
}

// Floating combat text (pass-through, fades and rises)
export const floaters = [];
export function spawnFloatText(x, y, text, opts = {}) {
  let disp;
  if (typeof text === 'number') {
    disp = text.toFixed(2);
  } else if (typeof text === 'string') {
    const trimmed = text.trim();
    if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
      const n = parseFloat(trimmed);
      disp = Number.isFinite(n) ? n.toFixed(2) : trimmed;
    } else {
      disp = text;
    }
  } else {
    disp = String(text);
  }
  floaters.push({ x, y, text: disp, color: opts.color || '#eaeaea', t: 0, life: opts.life || 0.8 });
}

// Healing sparkle particles (pass-through, fade and drift up)
export function spawnSparkle(x, y, opts = {}) {
  sparkles.push({
    x, y,
    vx: (Math.random() * 10 - 5) * 0.5,
    vy: -15 - Math.random() * 10,
    t: 0,
    life: opts.life || 0.6,
    color: opts.color || '#8effc1',
    r: opts.r || (1 + Math.random()*1.5),
  });
}

export function spawnCompanion(x, y, sheet, opts = {}) {
  const comp = {
    spriteId: opts.spriteId || null,
    x, y,
    w: 12, h: 16,
    speed: 110,
    dir: 'down',
    moving: false,
    animTime: 0,
    animFrame: 0,
    sheet,
    sheetPalette: opts.sheetPalette || null,
    name: opts.name || 'Companion',
    portraitSrc: opts.portrait || opts.portraitSrc || null,
    inventory: { items: [], equipped: { head: null, torso: null, legs: null, leftHand: null, rightHand: null } },
    affinity: (typeof opts.affinity === 'number') ? opts.affinity : 5,
    level: typeof opts.level === 'number' ? opts.level : 1,
    xp: typeof opts.xp === 'number' ? opts.xp : 0,
  };
  companions.push(comp);
  return comp;
}

export function removeCompanion(comp) {
  const idx = companions.indexOf(comp);
  if (idx !== -1) companions.splice(idx, 1);
}

export function spawnNpc(x, y, dir = 'down', opts = {}) {
  const npc = { 
    spriteId: opts.spriteId || null,
    x, y, w: 12, h: 16, dir, animFrame: 0, idleTime: 0,
    name: opts.name || 'NPC',
    portraitSrc: opts.portrait || null,
    portrait: null,
    dialog: null,
    dialogId: opts.dialogId || null,
    sheet: opts.sheet || null,
    sheetPalette: opts.sheetPalette || null,
    // Minimal VN intro flag: if present, a simple VN appears once when first seen
    vnOnSight: opts.vnOnSight || null,
    // Affinity before recruitment (carried into party on join)
    affinity: (typeof opts.affinity === 'number') ? opts.affinity : 5,
  };
  // Preload portrait only for image extensions (with asset version)
  if (npc.portraitSrc && /\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(npc.portraitSrc)) {
    try {
      const img = new Image();
      let src = npc.portraitSrc;
      try {
        const v = (window && window.ASSET_VERSION) ? String(window.ASSET_VERSION) : null;
        if (v) src = `${src}${src.includes('?') ? '&' : '?'}v=${encodeURIComponent(v)}`;
      } catch {}
      img.src = src;
      npc.portrait = img;
    } catch {}
  }
  npcs.push(npc);
  return npc;
}

// Runtime (input + mode)
export const runtime = {
  keys: new Set(),
  gameState: 'play', // 'play' | 'chat'
  activeNpc: null,
  activeDialog: null, // { tree, nodeId }
  vnFocusIndex: 0,
  vnChoiceCount: 0,
  interactLock: 0, // seconds remaining where interaction is disabled
  autosaveEnabled: false,
  autosaveTimer: 0,
  autosaveIntervalSec: 60,
  // Overlay lock prevents closing VN overlay via Esc/mouse (used for Game Over)
  lockOverlay: false,
  // Set when the player has died and Game Over screen is shown
  gameOver: false,
  // Simple camera pan for VN intros
  cameraPan: null, // { fromX, fromY, toX, toY, t, dur }
  pendingIntro: null, // { actor, text }
  vnSeen: {}, // map of intro keys that have been shown
  // Cooldown preventing back-to-back VN intros (seconds)
  introCooldown: 0,
  
  // Aggregated companion buffs (recomputed each frame)
  combatBuffs: { atk: 0, dr: 0, regen: 0, range: 0, touchDR: 0, aspd: 0 },
  // Companion ability cooldowns and shield state (Phase 2)
  companionCDs: { yornaEcho: 0, canopyShield: 0, holaGust: 0 },
  shieldActive: false,
  shieldTimer: 0,
  paused: false,
  // Music mode: 'normal' | 'low' | 'high'
  musicMode: 'normal',
  musicModePending: null,
  musicModeSwitchTimer: 0,
  // Persistence for removed breakables (ids)
  brokenBreakables: {},
  // Persistence for opened chests (ids)
  openedChests: {},
  // Level/scene management
  currentLevel: 1,
  pendingLevel: null,
  // Global pause toggle for race-free load/restore
  paused: false,
  // Disable VN triggers during critical phases
  disableVN: false,
  // RNG seeds bucket (optional systems)
  rng: { world: null, combat: null, loot: null },
  // Temporary combat buffs (timed)
  tempAtkBonus: 0,
  _tempAtkTimer: 0,
  // One-time VN affinity flags to prevent repeats
  affinityFlags: {},
  questFlags: {},
  questCounters: {},
  // If >0, grant player invulnerability (seconds) when VN overlay closes
  _grantInvulnOnChatExit: 0,
  // Optional per-quest metadata (e.g., fetch item behavior)
  // Shape per id: { keyId?: string, gateId?: string, consumeOnUse?: boolean }
  questMeta: {},
  // Chemistry/tension helpers
  _timeSec: 0,
  _lowHpTimer: 0,
  _recentKillTimes: [],
  _loadedAt: 0,
  // Rendering guard during level swap+restore to avoid showing default spawns
  _suspendRenderUntilRestore: false,

};

// ---- Leveling helpers ----
export function xpToNext(level) {
  const lv = Math.max(1, level|0);
  return Math.round(50 * Math.pow(1.6, lv - 1));
}

export function recomputePlayerDerivedStats() {
  // Damage scales: base 1 + 1 every 2 levels
  player.damage = 1 + Math.floor((Math.max(1, player.level) - 1) / 2);
  // DR bonus scales 0.2 per level (applied in combat DR calc)
  player.levelDrBonus = 0.2 * (Math.max(1, player.level) - 1);
  // Ensure HP does not exceed max
  player.hp = Math.min(player.hp, player.maxHp);
}

export function applyLevelUp(actor) {
  if (!actor) return;
  if (actor === player) {
    actor.level = Math.max(1, (actor.level|0));
    actor.maxHp = (actor.maxHp || 10) + 2;
    actor.hp = actor.maxHp; // heal to full on level up
    recomputePlayerDerivedStats();
  } else {
    // Companions: auras/triggers scale via level in systems; no direct stat change here
    actor.level = Math.max(1, (actor.level|0));
  }
  // Play level-up SFX
  try { import('./audio.js').then(m => m.playSfx && m.playSfx('levelUp')).catch(()=>{}); } catch {}
  // Banner showing new level (helps confirm visually)
  try {
    const nm = actor === player ? 'Player' : (actor.name || 'Companion');
    import('./ui.js').then(u => u.showBanner && u.showBanner(`${nm} reached Lv ${actor.level}`));
  } catch {}
}

export function grantXpToActor(actor, amount) {
  const xp = Math.max(0, Math.floor(amount || 0));
  if (!actor || xp <= 0) return;
  actor.xp = Math.max(0, (actor.xp || 0) + xp);
  // Level up while exceeding threshold
  let safety = 0;
  while (safety++ < 50) {
    const need = xpToNext(actor.level || 1);
    if ((actor.xp || 0) >= need) {
      actor.xp -= need;
      actor.level = Math.max(1, (actor.level || 1) + 1);
      applyLevelUp(actor);
      try { spawnFloatText((actor.x||player.x) + 6, (actor.y||player.y) - 10, 'Level Up!', { color: '#ffd166', life: 1.0 }); } catch {}
    } else break;
  }
}

export function grantPartyXp(amount) {
  const xp = Math.max(0, Math.floor(amount || 0));
  if (xp <= 0) return;
  grantXpToActor(player, xp);
  for (const c of companions) grantXpToActor(c, xp);
}

export function completionXpForLevel(level) {
  // 5 + 10*level → L1=15, L2=25, L3=35, ...
  return Math.max(0, Math.floor(5 + 10 * Math.max(1, level|0)));
}
