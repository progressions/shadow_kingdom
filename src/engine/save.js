import { player, enemies, companions, npcs, world, runtime, obstacles } from './state.js';
import { itemsOnGround } from './state.js';
import { spawnCompanion, spawnNpc } from './state.js';
import { updatePartyUI, showBanner } from './ui.js';
import { sheetForName, makeSpriteSheet } from './sprites.js';
import { canopyDialog, yornaDialog, holaDialog } from '../data/dialogs.js';

function getLocalKey(slot = 1) { return `shadow_kingdom_save_${slot}`; }
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
      // Combat state
      hp: e.hp,
      maxHp: e.maxHp,
      touchDamage: e.touchDamage,
      speed: e.speed,
      _secondPhase: !!e._secondPhase,
      // Visuals
      portrait: e.portraitSrc || null,
      portraitPowered: e.portraitPowered || null,
      portraitDefeated: e.portraitDefeated || null,
      sheetPalette: e.sheetPalette || null,
      // Logic/quest
      questId: e.questId || null,
      guaranteedDropId: e.guaranteedDropId || null,
      onDefeatNextLevel: (typeof e.onDefeatNextLevel === 'number') ? e.onDefeatNextLevel : null,
    })),
    companions: companions.map(c => ({ name: c.name, x: c.x, y: c.y, dir: c.dir, portrait: c.portraitSrc || null, inventory: c.inventory || null, affinity: (typeof c.affinity === 'number') ? c.affinity : 2, level: c.level||1, xp: c.xp||0 })),
    npcs: npcs.map(n => ({ name: n.name, x: n.x, y: n.y, dir: n.dir, portrait: n.portraitSrc || null, affinity: (typeof n.affinity === 'number') ? n.affinity : 5 })),
    playerInv: player.inventory || null,
    world: { w: world.w, h: world.h },
    unlockedGates: (Array.isArray(obstacles) ? obstacles.filter(o => o.type === 'gate' && o.locked === false && o.id).map(o => o.id) : []),
    groundItems: (Array.isArray(itemsOnGround) ? itemsOnGround.map(g => ({ id: g.id, x: g.x, y: g.y, item: g.item })) : []),
    openedChests: (Array.isArray(obstacles) ? obstacles.filter(o => o.type === 'chest' && o.opened && o.id).map(o => o.id) : []),
    brokenBreakables: Object.keys(runtime?.brokenBreakables || {}),
    vnSeen: Object.keys(runtime?.vnSeen || {}),
    affinityFlags: Object.keys(runtime?.affinityFlags || {}),
    questFlags: Object.keys(runtime?.questFlags || {}),
    questCounters: Object.assign({}, runtime?.questCounters || {}),
  };
}

function deserializePayload(data) {
  // Restore player
  if (data.player) {
    player.x = data.player.x; player.y = data.player.y; player.dir = data.player.dir || 'down';
    if (typeof data.player.hp === 'number') player.hp = data.player.hp;
    player.level = Math.max(1, data.player.level || 1);
    player.xp = Math.max(0, data.player.xp || 0);
    import('./state.js').then(m => m.recomputePlayerDerivedStats()).catch(()=>{});
  }
  // Inventory
  if (data.playerInv) player.inventory = data.playerInv;
  // Clear arrays
  enemies.length = 0;
  companions.length = 0;
  npcs.length = 0;
  // Restore VN seen map (session-level)
  runtime.vnSeen = {};
  if (Array.isArray(data.vnSeen)) {
    for (const k of data.vnSeen) runtime.vnSeen[k] = true;
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
    for (const e of data.enemies) {
      const kind = (e.kind || 'mook').toLowerCase();
      const base = (kind === 'boss') ? { name: 'Boss', speed: 12, hp: 30, dmg: 8 }
        : (kind === 'featured') ? { name: 'Featured Foe', speed: 11, hp: 5, dmg: 3 }
        : { name: 'Mook', speed: 10, hp: 3, dmg: 3 };
      const hp = (typeof e.hp === 'number') ? e.hp : base.hp;
      const maxHp = (typeof e.maxHp === 'number') ? e.maxHp : (typeof e.hp === 'number' ? e.hp : base.hp);
      const dmg = (typeof e.touchDamage === 'number') ? e.touchDamage : base.dmg;
      const speed = (typeof e.speed === 'number') ? e.speed : base.speed;
      enemies.push({
        x: e.x, y: e.y, w: 12, h: 16, speed, dir: e.dir || 'down', moving: true,
        animTime: 0, animFrame: 0, hp, maxHp, touchDamage: dmg, hitTimer: 0, hitCooldown: 0.8,
        knockbackX: 0, knockbackY: 0,
        name: e.name || base.name, kind,
        portraitSrc: e.portrait || null,
        portraitPowered: e.portraitPowered || null,
        portraitDefeated: e.portraitDefeated || null,
        onDefeatNextLevel: (typeof e.onDefeatNextLevel === 'number') ? e.onDefeatNextLevel : null,
        questId: e.questId || null,
        guaranteedDropId: e.guaranteedDropId || null,
        _secondPhase: !!e._secondPhase,
        sheetPalette: e.sheetPalette || null,
      });
    }
    // Attach class sheets lazily after module loads
    import('./sprites.js').then(mod => {
      for (const e of enemies) {
        if (e.sheetPalette) {
          try { e.sheet = makeSpriteSheet(e.sheetPalette); } catch { /* fallback below */ }
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
  // Helper: attach NPC dialog by name
  const attachDialogByName = (npc) => {
    const key = (npc.name || '').toLowerCase();
    if (key.includes('canopy')) npc.dialog = canopyDialog;
    else if (key.includes('yorna')) npc.dialog = yornaDialog;
    else if (key.includes('hola')) npc.dialog = holaDialog;
    else if (key.includes('oyin')) import('../data/dialogs.js').then(mod => npc.dialog = mod.oyinDialog).catch(()=>{});
    else if (key.includes('twil')) import('../data/dialogs.js').then(mod => npc.dialog = mod.twilDialog).catch(()=>{});
  };
  // Restore companions
  if (Array.isArray(data.companions)) {
    for (const c of data.companions) {
      const sheet = sheetForName(c.name);
      const comp = spawnCompanion(c.x, c.y, sheet, { name: c.name, portrait: c.portrait || null, affinity: (typeof c.affinity === 'number') ? c.affinity : 2, level: c.level||1, xp: c.xp||0 });
      comp.dir = c.dir || 'down';
      if (c.inventory) comp.inventory = c.inventory;
    }
    updatePartyUI(companions);
  }
  // Restore NPCs
  if (Array.isArray(data.npcs)) {
    for (const n of data.npcs) {
      const sheet = sheetForName(n.name);
      const npc = spawnNpc(n.x, n.y, n.dir || 'down', { name: n.name, sheet, portrait: n.portrait || null, affinity: (typeof n.affinity === 'number') ? n.affinity : 5 });
      attachDialogByName(npc);
    }
  }
  // Apply unlocked gates
  if (Array.isArray(data.unlockedGates)) {
    for (const o of obstacles) {
      if (o.type === 'gate' && o.id && data.unlockedGates.includes(o.id)) o.locked = false;
    }
  }
  // Restore opened chests
  if (Array.isArray(data.openedChests)) {
    for (const o of obstacles) {
      if (o.type === 'chest' && o.id && data.openedChests.includes(o.id)) o.opened = true;
    }
  }
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
    const key = `${type}:${(ent.name || '').toLowerCase()}`;
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
      showBanner(`Loading… switching to Level ${target}`);
      return;
    }
    deserializePayload(data);
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
    showBanner(API_URL ? 'Game loaded (remote)' : 'Game loaded');
  } catch (e) {
    console.error('Apply pending restore failed', e);
    showBanner('Load failed');
  }
}
