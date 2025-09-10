import { player, enemies, companions, npcs, world, runtime, obstacles } from './state.js';
import { itemsOnGround } from './state.js';
import { spawnCompanion, spawnNpc } from './state.js';
import { updatePartyUI, showBanner } from './ui.js';
import { sheetForName, makeSpriteSheet } from './sprites.js';
import { canopyDialog, yornaDialog, holaDialog } from '../data/dialogs.js';

function getLocalKey(slot = 1) {
  if (slot === 'auto' || slot === 0) return 'shadow_kingdom_autosave';
  return `shadow_kingdom_save_${slot}`;
}
const API_URL = window.SAVE_API_URL || null; // e.g., 'https://your-app.fly.dev'
const API_KEY = window.SAVE_API_KEY || null; // optional shared secret
function getUserId() {
  let id = localStorage.getItem('shadow_user_id');
  if (!id) { id = cryptoRandomId(); localStorage.setItem('shadow_user_id', id); }
  return id;
}
function cryptoRandomId() {
  try {
    const arr = new Uint8Array(16);
    (self.crypto || window.crypto).getRandomValues(arr);
    return Array.from(arr).map(b=>b.toString(16).padStart(2,'0')).join('');
  } catch {
    return String(Math.random()).slice(2) + String(Date.now());
  }
}
async function remote(method, path, body) {
  const headers = { 'content-type': 'application/json', 'x-user-id': getUserId() };
  if (API_KEY) headers['x-api-key'] = API_KEY;
  const res = await fetch(`${API_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(()=>({ ok:false,error:'bad json' }));
  if (!res.ok || json.ok === false) throw new Error(json.error || ('http '+res.status));
  return json;
}

// Normalize legacy portrait paths (without level folders) to new level-based layout.
function levelForNameOrId(nameLower, vnId) {
  const id = (vnId || '').toLowerCase();
  const nm = (nameLower || '').toLowerCase();
  const is = (s) => id === s || nm.includes(s.replace(/^enemy:/,''));
  if (is('enemy:gorg') || is('enemy:vast') || nm.includes('canopy') || nm.includes('yorna') || nm.includes('hola')) return 'level01';
  if (is('enemy:aarg') || is('enemy:nethra') || nm.includes('oyin') || nm.includes('twil')) return 'level02';
  if (is('enemy:wight') || is('enemy:luula') || nm.includes('tin') || nm.includes('nellis')) return 'level03';
  if (is('enemy:blurb') || is('enemy:vanificia') || nm.includes('urn') || nm.includes('varabella')) return 'level04';
  if (is('enemy:fana') || is('enemy:vorthak')) return 'level05';
  if (nm.includes('ell')) return 'level06';
  return null;
}

function normalizePortraitPath(p, name, vnId) {
  if (!p || typeof p !== 'string') return p;
  if (p.includes('/level0')) return p; // already normalized
  const m = p.match(/^assets\/portraits\/([^\/]+)\/(.+)$/i);
  if (!m) return p;
  const level = levelForNameOrId((name || m[1] || '').toLowerCase(), vnId);
  if (!level) return p;
  const nm = m[1];
  const rest = m[2];
  return `assets/portraits/${level}/${nm}/${rest}`;
}

// Canonical companion/NPC palettes used when legacy saves lack a sheetPalette
function canonicalPaletteForName(name) {
  const key = (name || '').toLowerCase();
  if (!key) return null;
  // Level 1 companions
  if (key.includes('canopy')) return { hair: '#e8d18b', longHair: true, dress: true, dressColor: '#4fa3ff', shirt: '#bfdcff' };
  if (key.includes('yorna'))  return { hair: '#d14a24', longHair: true, dress: true, dressColor: '#1a1a1a', shirt: '#4a4a4a' };
  if (key.includes('hola'))   return { hair: '#1b1b1b', longHair: true, dress: true, dressColor: '#f5f5f5', shirt: '#e0e0e0' };
  // Level 2
  if (key.includes('oyin'))   return { hair: '#e8d18b', longHair: true, dress: true, dressColor: '#2ea65a', shirt: '#b7f0c9' };
  if (key.includes('twil'))   return { hair: '#d14a24', longHair: true, dress: true, dressColor: '#1a1a1a', shirt: '#4a4a4a' };
  // Level 3
  if (key.includes('tin'))    return { hair: '#6fb7ff', longHair: true, dress: true, dressColor: '#4fa3ff', shirt: '#bfdcff' };
  if (key.includes('nellis')) return { hair: '#a15aff', longHair: true, dress: true, dressColor: '#f5f5f5', shirt: '#e0e0e0' };
  // Level 4
  if (key.includes('urn'))    return { hair: '#4fa36b', longHair: true, dress: true, dressColor: '#3a7f4f', shirt: '#9bd6b0' };
  if (key.includes('varabella')) return { hair: '#d14a24', longHair: true, dress: true, dressColor: '#1a1a1a', shirt: '#4a4a4a' };
  // Level 6
  if (key.includes('ell'))    return { hair: '#e8d18b', longHair: true, dress: true, dressColor: '#ffffff', shirt: '#f0f0f0' };
  return null;
}

export async function getSaveMeta(slot = 1) {
  if (API_URL) {
    try {
      const json = await remote('GET', `/api/save?slot=${encodeURIComponent(slot)}`);
      return { exists: true, at: json.at || null };
    } catch (e) {
      return { exists: false, at: null };
    }
  }
  try {
    const raw = localStorage.getItem(getLocalKey(slot));
    if (!raw) return { exists: false, at: null };
    const data = JSON.parse(raw);
    return { exists: true, at: data.at || null };
  } catch {
    return { exists: false, at: null };
  }
}

export function saveGame(slot = 1) {
  if (API_URL) {
    // remote save
    const payload = serializePayload();
    remote('POST', `/api/save?slot=${encodeURIComponent(slot)}` , { payload })
      .then(()=>showBanner('Game saved (remote)'))
      .catch((e)=>{ console.error('Remote save failed', e); showBanner('Remote save failed'); });
    return;
  }
  try {
    const data = serializePayload();
    localStorage.setItem(getLocalKey(slot), JSON.stringify(data));
    showBanner('Game saved');
  } catch (e) {
    console.error('Save failed', e);
    showBanner('Save failed');
  }
}

export function loadGame(slot = 1) {
  if (API_URL) {
    remote('GET', `/api/save?slot=${encodeURIComponent(slot)}`)
      .then(json=>loadDataPayload(json.payload))
      .catch((e)=>{ console.error('Remote load failed', e); showBanner('Remote load failed'); });
    return;
  }
  try {
    const raw = localStorage.getItem(getLocalKey(slot));
    if (!raw) { showBanner('No save found'); return; }
    const data = JSON.parse(raw);
    loadDataPayload(data);
  } catch (e) {
    console.error('Load failed', e);
    showBanner('Load failed');
  }
}

export function clearSave(slot = 1) {
  try {
    localStorage.removeItem(getLocalKey(slot));
    showBanner('Save cleared');
  } catch (e) {
    console.error('Clear save failed', e);
    showBanner('Clear save failed');
  }
}

function serializePayload() {
  return {
    version: 1,
    at: Date.now(),
    currentLevel: runtime.currentLevel || 1,
    player: { x: player.x, y: player.y, hp: player.hp, dir: player.dir, level: player.level||1, xp: player.xp||0 },
    enemies: enemies.filter(e => e.hp > 0).map(e => ({
      x: e.x, y: e.y, dir: e.dir, kind: e.kind || 'mook',
      name: e.name || null,
      vnId: e.vnId || vnIdForEnemy(e) || null,
      // Combat state
      hp: e.hp,
      maxHp: e.maxHp,
      touchDamage: e.touchDamage,
      speed: e.speed,
      _secondPhase: !!e._secondPhase,
      w: e.w, h: e.h, spriteScale: e.spriteScale || 1,
      // Visuals
      portrait: e.portraitSrc || null,
      portraitPowered: e.portraitPowered || null,
      portraitOverpowered: e.portraitOverpowered || null,
      portraitDefeated: e.portraitDefeated || null,
      sheetPalette: e.sheetPalette || null,
      // Logic/quest
      questId: e.questId || null,
      guaranteedDropId: e.guaranteedDropId || null,
      onDefeatNextLevel: (typeof e.onDefeatNextLevel === 'number') ? e.onDefeatNextLevel : null,
    })),
    companions: companions.map(c => ({ name: c.name, x: c.x, y: c.y, dir: c.dir, portrait: c.portraitSrc || null, sheetPalette: c.sheetPalette || null, inventory: c.inventory || null, affinity: (typeof c.affinity === 'number') ? c.affinity : 2, level: c.level||1, xp: c.xp||0 })),
    npcs: npcs.map(n => ({ name: n.name, x: n.x, y: n.y, dir: n.dir, portrait: n.portraitSrc || null, sheetPalette: n.sheetPalette || null, affinity: (typeof n.affinity === 'number') ? n.affinity : 5 })),
    playerInv: player.inventory || null,
    world: { w: world.w, h: world.h },
    unlockedGates: (Array.isArray(obstacles) ? obstacles.filter(o => o.type === 'gate' && o.locked === false && o.id).map(o => o.id) : []),
    groundItems: (Array.isArray(itemsOnGround) ? itemsOnGround.map(g => ({ id: g.id, x: g.x, y: g.y, item: g.item })) : []),
    // Persist opened chests via union of currently-opened obstacle chests and runtime map
    openedChests: (() => {
      const fromObs = Array.isArray(obstacles)
        ? obstacles.filter(o => o.type === 'chest' && o.opened && o.id).map(o => o.id)
        : [];
      const fromRt = Object.keys(runtime?.openedChests || {});
      // Deduplicate while preserving stable order (runtime first to prefer persisted state)
      const set = new Set([...fromRt, ...fromObs]);
      return Array.from(set);
    })(),
    brokenBreakables: Object.keys(runtime?.brokenBreakables || {}),
    vnSeen: Object.keys(runtime?.vnSeen || {}),
    affinityFlags: Object.keys(runtime?.affinityFlags || {}),
    questFlags: Object.keys(runtime?.questFlags || {}),
    questCounters: Object.assign({}, runtime?.questCounters || {}),
  };
}

function vnIdForEnemy(e) {
  // Prefer explicit id if present
  if (e && typeof e.vnId === 'string' && e.vnId) return e.vnId;
  // Map by guaranteed drop (featured key guardians)
  const mapByDrop = {
    'key_bronze': 'enemy:gorg',
    'key_nethra': 'enemy:aarg',
    'key_reed': 'enemy:wight',
    'key_sigil': 'enemy:blurb',
    'key_temple': 'enemy:fana',
  };
  const byDrop = mapByDrop[(e?.guaranteedDropId || '').toLowerCase()];
  if (byDrop) return byDrop;
  // Backward-compat fallback by name (kept only for old saves)
  const nm = (e?.name || '').toLowerCase();
  if (!nm) return null;
  const byName = (
    nm.includes('gorg') ? 'enemy:gorg'
    : nm.includes('aarg') ? 'enemy:aarg'
    : nm.includes('wight') ? 'enemy:wight'
    : nm.includes('blurb') ? 'enemy:blurb'
    : nm.includes('fana') ? 'enemy:fana'
    : nm.includes('vast') ? 'enemy:vast'
    : nm.includes('nethra') ? 'enemy:nethra'
    : nm.includes('luula') ? 'enemy:luula'
    : nm.includes('vanificia') ? 'enemy:vanificia'
    : nm.includes('vorthak') ? 'enemy:vorthak'
    : null
  );
  return byName;
}

function deserializePayload(data) {
  // Restore player
  if (data.player) {
    player.x = data.player.x; player.y = data.player.y; player.dir = data.player.dir || 'down';
    if (typeof data.player.hp === 'number') player.hp = data.player.hp;
    player.level = Math.max(1, data.player.level || 1);
    player.xp = Math.max(0, data.player.xp || 0);
    // Clear transient combat/motion state to avoid unintended hits/knockback on load
    player.attacking = false;
    player._didHit = false;
    player.attackTimer = 0;
    player.lastAttack = -999;
    player.knockbackX = 0; player.knockbackY = 0;
    player.invulnTimer = Math.max(player.invulnTimer || 0, 0.3); // brief safety window
    import('./state.js').then(m => m.recomputePlayerDerivedStats()).catch(()=>{});
  }
  // Inventory
  if (data.playerInv) player.inventory = data.playerInv;
  // Capture essential enemies from current scene (loader baseline) to merge back
  const baselineEssential = enemies
    .filter(e => e && (String(e.kind).toLowerCase() === 'boss' || !!e.guaranteedDropId))
    .map(e => ({
      x: e.x, y: e.y, dir: e.dir, kind: e.kind || 'mook',
      name: e.name || null,
      vnId: (typeof e.vnId === 'string' && e.vnId) ? e.vnId : null,
      hp: e.hp, maxHp: e.maxHp, touchDamage: e.touchDamage, speed: e.speed,
      w: e.w, h: e.h, spriteScale: e.spriteScale || 1,
      portrait: e.portraitSrc || null,
      portraitPowered: e.portraitPowered || null,
      portraitOverpowered: e.portraitOverpowered || null,
      portraitDefeated: e.portraitDefeated || null,
      sheetPalette: e.sheetPalette || null,
      questId: e.questId || null,
      guaranteedDropId: e.guaranteedDropId || null,
      onDefeatNextLevel: (typeof e.onDefeatNextLevel === 'number') ? e.onDefeatNextLevel : null,
      _secondPhase: !!e._secondPhase,
    }));

  // Clear arrays
  enemies.length = 0;
  companions.length = 0;
  npcs.length = 0;
  // Restore VN seen map (session-level)
  runtime.vnSeen = {};
  if (Array.isArray(data.vnSeen)) {
    for (const k of data.vnSeen) runtime.vnSeen[k] = true;
  }
  // Restore opened chest ids map (for persistence even if chests are removed at runtime)
  runtime.openedChests = {};
  if (Array.isArray(data.openedChests)) {
    for (const id of data.openedChests) if (id) runtime.openedChests[id] = true;
  }
  // Restore affinity flags
  runtime.affinityFlags = {};
  if (Array.isArray(data.affinityFlags)) {
    for (const k of data.affinityFlags) runtime.affinityFlags[k] = true;
  }
  // Restore quest flags
  runtime.questFlags = {};
  if (Array.isArray(data.questFlags)) {
    for (const k of data.questFlags) runtime.questFlags[k] = true;
  }
  // Restore quest counters (numeric progress)
  runtime.questCounters = {};
  if (data.questCounters && typeof data.questCounters === 'object') {
    for (const [k, v] of Object.entries(data.questCounters)) {
      if (typeof v === 'number') runtime.questCounters[k] = v;
    }
  }
  // Restore enemies
  if (Array.isArray(data.enemies)) {
    try { if (window && window.DEBUG_ENEMIES) console.log('[LOAD] restoring enemies:', data.enemies.length); } catch {}
    for (const e of data.enemies) {
      const kind = (e.kind || 'mook').toLowerCase();
      const base = (kind === 'boss') ? { name: 'Boss', speed: 12, hp: 30, dmg: 8 }
        : (kind === 'featured') ? { name: 'Featured Foe', speed: 11, hp: 5, dmg: 3 }
        : { name: 'Mook', speed: 10, hp: 3, dmg: 3 };
      const hp = (typeof e.hp === 'number') ? e.hp : base.hp;
      const maxHp = (typeof e.maxHp === 'number') ? e.maxHp : (typeof e.hp === 'number' ? e.hp : base.hp);
      const dmg = (typeof e.touchDamage === 'number') ? e.touchDamage : base.dmg;
      const speed = (typeof e.speed === 'number') ? e.speed : base.speed;
      const w = (typeof e.w === 'number') ? e.w : 12;
      const h = (typeof e.h === 'number') ? e.h : 16;
      // Preserve identity for named featured foes even if older saves lacked names
      const featuredNameFor = (dropId) => {
        switch ((dropId || '').toLowerCase()) {
          case 'key_bronze': return 'Gorg';
          case 'key_nethra': return 'Aarg';
          case 'key_reed': return 'Wight';
          case 'key_sigil': return 'Blurb';
          case 'key_temple': return 'Fana';
          default: return null;
        }
      };
      const resolvedName = (e && e.name && String(e.name).trim().length)
        ? e.name
        : (kind === 'featured' ? (featuredNameFor(e.guaranteedDropId) || base.name) : base.name);
      const ent = {
        x: e.x, y: e.y, w, h, speed, dir: e.dir || 'down', moving: true,
        animTime: 0, animFrame: 0, hp, maxHp, touchDamage: dmg, hitTimer: 0, hitCooldown: 0.8,
        knockbackX: 0, knockbackY: 0,
        name: resolvedName, kind,
        portraitSrc: normalizePortraitPath(e.portrait || null, e.name, e.vnId),
        portraitPowered: normalizePortraitPath(e.portraitPowered || null, e.name, e.vnId),
        portraitOverpowered: normalizePortraitPath(e.portraitOverpowered || null, e.name, e.vnId),
        portraitDefeated: normalizePortraitPath(e.portraitDefeated || null, e.name, e.vnId),
        onDefeatNextLevel: (typeof e.onDefeatNextLevel === 'number') ? e.onDefeatNextLevel : null,
        questId: e.questId || null,
        guaranteedDropId: e.guaranteedDropId || null,
        _secondPhase: !!e._secondPhase,
        sheetPalette: e.sheetPalette || null,
        spriteScale: (typeof e.spriteScale === 'number') ? e.spriteScale : 1,
        // Stable VN identity id for persistence
        vnId: (typeof e.vnId === 'string' && e.vnId) ? e.vnId : vnIdForEnemy(e),
        // vnOnSight is not persisted in saves; reattach by id below if not seen
        vnOnSight: null,
      };
      enemies.push(ent);
      try {
        if (window && window.DEBUG_ENEMIES) {
          console.log('[ENEMY RESTORE]', { name: ent.name, kind: ent.kind, x: ent.x, y: ent.y, hp: ent.hp, vnId: ent.vnId || null });
        }
      } catch {}
    }
    // Reattach VN-on-sight text for known enemies (featured/boss) using vnId when loading, if not already seen
    import('../data/intro_texts.js').then(mod => {
      try {
        const t = mod.introTexts || {};
        for (const e of enemies) {
          if (!e || e._vnShown || e.vnOnSight) continue;
          const key = e.vnId || vnIdForEnemy(e);
          if (!key) continue;
          if (runtime.vnSeen && runtime.vnSeen[key]) { e._vnShown = true; continue; }
          const id = String(key).replace(/^enemy:/,'');
          const text = (
            id === 'gorg' ? t.gorg
            : id === 'aarg' ? t.aarg
            : id === 'wight' ? t.wight
            : id === 'blurb' ? t.blurb
            : id === 'fana' ? (t.fana_enslaved || t.fana)
            : id === 'nethra' ? t.nethra
            : id === 'luula' ? t.luula
            : id === 'vanificia' ? t.vanificia
            : id === 'vorthak' ? t.vorthak
            : id === 'vast' ? t.vast
            : null
          );
          if (text) e.vnOnSight = { text };
        }
      } catch {}
    }).catch(()=>{});
    // Attach class sheets lazily after module loads
    import('./sprites.js').then(mod => {
      for (const e of enemies) {
        if (e.sheetPalette) {
          try { e.sheet = makeSpriteSheet(e.sheetPalette); } catch { /* fallback below */ }
        }
        // If a known named featured foe lacks a custom palette sheet, assign defaults for visual identity
        if (!e.sheet && e.kind === 'featured') {
          const name = (e.name || '').toLowerCase();
          if (name.includes('gorg')) {
            try { e.sheet = makeSpriteSheet({ skin: '#ff4a4a', shirt: '#8a1a1a', pants: '#6a0f0f', hair: '#2a0000', outline: '#000000' }); } catch {}
          } else if (name.includes('aarg')) {
            try { e.sheet = makeSpriteSheet({ skin: '#6fb3ff', hair: '#0a1b4a', longHair: false, dress: true, dressColor: '#274b9a', shirt: '#7aa6ff', pants: '#1b2e5a', outline: '#000000' }); } catch {}
          } else if (name.includes('wight')) {
            try { e.sheet = makeSpriteSheet({ skin: '#f5f5f5', hair: '#e6e6e6', shirt: '#cfcfcf', pants: '#9e9e9e', outline: '#000000' }); } catch {}
          } else if (name.includes('blurb')) {
            try { e.sheet = makeSpriteSheet({ skin: '#6fdd6f', hair: '#0a2a0a', longHair: false, dress: false, shirt: '#4caf50', pants: '#2e7d32', outline: '#000000' }); } catch {}
          }
        }
        if (!e.sheet) {
          if (e.kind === 'boss') e.sheet = mod.enemyBossSheet;
          else if (e.kind === 'featured') e.sheet = mod.enemyFeaturedSheet;
          else e.sheet = mod.enemyMookSheet;
        }
      }
    }).catch(()=>{});
    // Backfill boss metadata for older saves so level transitions work
    try {
      for (const e of enemies) {
        if ((e.kind || '').toLowerCase() !== 'boss') continue;
        if (typeof e.onDefeatNextLevel !== 'number') {
          const lv = runtime.currentLevel || 1;
          e.onDefeatNextLevel = (lv === 1) ? 2 : (lv === 2 ? 3 : null);
        }
      }
    } catch {}
  }

  // Merge back essential baseline enemies (bosses/key guardians) if they were not present in the saved payload
  try {
    const presentKeys = new Set();
    for (const e of enemies) {
      if (!e) continue;
      const key = e.vnId || (e.name ? `enemy:${String(e.name).toLowerCase()}` : null);
      if (key) presentKeys.add(key);
    }
    for (const b of baselineEssential) {
      const key = b.vnId || (b.name ? `enemy:${String(b.name).toLowerCase()}` : null);
      if (key && presentKeys.has(key)) continue;
      // Re-spawn baseline essential enemy since it was missing from the save
      const kind = (b.kind || 'mook').toLowerCase();
      const base = (kind === 'boss') ? { speed: 12, hp: 30, dmg: 8 }
        : (kind === 'featured') ? { speed: 11, hp: 5, dmg: 3 }
        : { speed: 10, hp: 3, dmg: 3 };
      const hp = (typeof b.hp === 'number') ? b.hp : base.hp;
      const maxHp = (typeof b.maxHp === 'number') ? b.maxHp : hp;
      const dmg = (typeof b.touchDamage === 'number') ? b.touchDamage : base.dmg;
      const speed = (typeof b.speed === 'number') ? b.speed : base.speed;
      const w = (typeof b.w === 'number') ? b.w : 12;
      const h = (typeof b.h === 'number') ? b.h : 16;
      const ent = {
        x: b.x, y: b.y, w, h, speed, dir: b.dir || 'down', moving: true,
        animTime: 0, animFrame: 0, hp, maxHp, touchDamage: dmg, hitTimer: 0, hitCooldown: 0.8,
        knockbackX: 0, knockbackY: 0,
        name: b.name || (kind === 'boss' ? 'Boss' : 'Featured Foe'), kind,
        portraitSrc: normalizePortraitPath(b.portrait || null, b.name, b.vnId),
        portraitPowered: normalizePortraitPath(b.portraitPowered || null, b.name, b.vnId),
        portraitOverpowered: normalizePortraitPath(b.portraitOverpowered || null, b.name, b.vnId),
        portraitDefeated: normalizePortraitPath(b.portraitDefeated || null, b.name, b.vnId),
        onDefeatNextLevel: (typeof b.onDefeatNextLevel === 'number') ? b.onDefeatNextLevel : null,
        questId: b.questId || null,
        guaranteedDropId: b.guaranteedDropId || null,
        _secondPhase: !!b._secondPhase,
        sheetPalette: b.sheetPalette || null,
        spriteScale: (typeof b.spriteScale === 'number') ? b.spriteScale : 1,
        vnId: b.vnId || null,
      };
      enemies.push(ent);
      try {
        if (window && window.DEBUG_ENEMIES) {
          console.log('[ENEMY MERGE BASELINE]', { name: ent.name, kind: ent.kind, x: ent.x, y: ent.y, hp: ent.hp, vnId: ent.vnId || null });
        }
      } catch {}
    }
  } catch {}
  // Helper: attach NPC dialog by name
  const attachDialogByName = (npc) => {
    const key = (npc.name || '').toLowerCase();
    if (key.includes('canopy')) npc.dialog = canopyDialog;
    else if (key.includes('yorna')) npc.dialog = yornaDialog;
    else if (key.includes('hola')) npc.dialog = holaDialog;
    else if (key.includes('oyin')) import('../data/dialogs.js').then(mod => npc.dialog = mod.oyinDialog).catch(()=>{});
    else if (key.includes('twil')) import('../data/dialogs.js').then(mod => npc.dialog = mod.twilDialog).catch(()=>{});
  };
  // Helper: reattach VN-on-sight text for known NPCs when loading, if not already seen
  const attachOnSightByName = (npc) => {
    const nameKey = (npc.name || '').toLowerCase();
    const seenKey = `npc:${nameKey.replace(/\s+/g,'')}`;
    if (runtime.vnSeen && runtime.vnSeen[seenKey]) return; // already shown
    import('../data/intro_texts.js').then(mod => {
      const t = mod.introTexts || {};
      let text = null;
      if (nameKey.includes('canopy')) text = t.canopy;
      else if (nameKey.includes('yorna')) text = t.yorna;
      else if (nameKey.includes('hola')) text = t.hola;
      else if (nameKey.includes('tin')) text = t.tin;
      else if (nameKey.includes('nellis')) text = t.nellis;
      else if (nameKey.includes('urn')) text = t.urn;
      else if (nameKey.includes('varabella')) text = t.varabella;
      if (text && !npc.vnOnSight) npc.vnOnSight = { text };
    }).catch(()=>{});
  };
  // Restore companions
  if (Array.isArray(data.companions)) {
    for (const c of data.companions) {
      let pal = c.sheetPalette || canonicalPaletteForName(c.name);
      const sheet = pal ? makeSpriteSheet(pal) : sheetForName(c.name);
      const comp = spawnCompanion(c.x, c.y, sheet, { name: c.name, portrait: c.portrait || null, sheetPalette: pal || null, affinity: (typeof c.affinity === 'number') ? c.affinity : 2, level: c.level||1, xp: c.xp||0 });
      comp.dir = c.dir || 'down';
      if (c.inventory) comp.inventory = c.inventory;
    }
    updatePartyUI(companions);
  }
  // Restore NPCs
  if (Array.isArray(data.npcs)) {
    for (const n of data.npcs) {
      let pal = n.sheetPalette || canonicalPaletteForName(n.name);
      const sheet = pal ? makeSpriteSheet(pal) : sheetForName(n.name);
      const npc = spawnNpc(n.x, n.y, n.dir || 'down', { name: n.name, sheet, sheetPalette: pal || null, portrait: normalizePortraitPath(n.portrait || null, n.name, null), affinity: (typeof n.affinity === 'number') ? n.affinity : 5 });
      attachDialogByName(npc);
      attachOnSightByName(npc);
    }
  }
  // Apply unlocked gates
  if (Array.isArray(data.unlockedGates)) {
    for (const o of obstacles) {
      if (o.type === 'gate' && o.id && data.unlockedGates.includes(o.id)) o.locked = false;
    }
  }
  // Restore opened chests onto any placed chest obstacles by id
  try {
    for (const o of obstacles) {
      if (!o || o.type !== 'chest' || !o.id) continue;
      if (runtime.openedChests && runtime.openedChests[o.id]) o.opened = true;
    }
  } catch {}
  // Remove broken breakables by id
  if (Array.isArray(data.brokenBreakables)) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      if (o && (o.type === 'barrel' || o.type === 'crate') && o.id && data.brokenBreakables.includes(o.id)) {
        obstacles.splice(i, 1);
      }
    }
  }
  // Restore ground items
  try {
    itemsOnGround.length = 0;
    if (Array.isArray(data.groundItems)) {
      for (const g of data.groundItems) {
        itemsOnGround.push({ id: g.id, x: g.x, y: g.y, w: 10, h: 10, item: g.item });
      }
    }
  } catch {}
  // Apply VN seen flags to current actors
  const markSeen = (ent) => {
    const type = (typeof ent.touchDamage === 'number') ? 'enemy' : 'npc';
    const key = ent.vnId || `${type}:${(ent.name || '').toLowerCase()}`;
    if (runtime.vnSeen && runtime.vnSeen[key]) ent._vnShown = true;
  };
  for (const e of enemies) markSeen(e);
  for (const n of npcs) markSeen(n);
}

// Route loaded data based on level; if different, defer restore until after level transition.
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
    deserializePayload(data);
    try { runtime._loadedAt = performance.now ? performance.now() : Date.now(); } catch { runtime._loadedAt = Date.now(); }
    showBanner(API_URL ? 'Game loaded (remote)' : 'Game loaded');
  } catch (e) {
    console.error('Load route failed', e);
    showBanner('Load failed');
  }
}

// Called by main loop after a level has been swapped in
export function applyPendingRestore() {
  const data = runtime._pendingRestore;
  if (!data) return;
  try {
    runtime._pendingRestore = null;
    deserializePayload(data);
    try { runtime._loadedAt = performance.now ? performance.now() : Date.now(); } catch { runtime._loadedAt = Date.now(); }
    showBanner(API_URL ? 'Game loaded (remote)' : 'Game loaded');
    runtime._suspendRenderUntilRestore = false;
  } catch (e) {
    console.error('Apply pending restore failed', e);
    showBanner('Load failed');
    runtime._suspendRenderUntilRestore = false;
  }
}
