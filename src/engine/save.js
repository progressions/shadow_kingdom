import { player, enemies, companions, npcs, world } from './state.js';
import { spawnCompanion, spawnNpc } from './state.js';
import { updatePartyUI, showBanner } from './ui.js';
import { sheetForName } from './sprites.js';
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
      .then(json=>deserializePayload(json.payload))
      .then(()=>showBanner('Game loaded (remote)'))
      .catch((e)=>{ console.error('Remote load failed', e); showBanner('Remote load failed'); });
    return;
  }
  try {
    const raw = localStorage.getItem(getLocalKey(slot));
    if (!raw) { showBanner('No save found'); return; }
    const data = JSON.parse(raw);
    deserializePayload(data);
    showBanner('Game loaded');
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
    player: { x: player.x, y: player.y, hp: player.hp, dir: player.dir },
    enemies: enemies.filter(e => e.hp > 0).map(e => ({ x: e.x, y: e.y, hp: e.hp, dir: e.dir, kind: e.kind || 'mook' })),
    companions: companions.map(c => ({ name: c.name, x: c.x, y: c.y, dir: c.dir, portrait: c.portraitSrc || null, inventory: c.inventory || null })),
    npcs: npcs.map(n => ({ name: n.name, x: n.x, y: n.y, dir: n.dir, portrait: n.portraitSrc || null })),
    playerInv: player.inventory || null,
    world: { w: world.w, h: world.h },
  };
}

function deserializePayload(data) {
  // Restore player
  if (data.player) {
    player.x = data.player.x; player.y = data.player.y; player.dir = data.player.dir || 'down';
    if (typeof data.player.hp === 'number') player.hp = data.player.hp;
  }
  // Inventory
  if (data.playerInv) player.inventory = data.playerInv;
  // Clear arrays
  enemies.length = 0;
  companions.length = 0;
  npcs.length = 0;
  // Restore enemies
  if (Array.isArray(data.enemies)) {
    for (const e of data.enemies) {
      const kind = (e.kind || 'mook').toLowerCase();
      const base = (kind === 'boss') ? { name: 'Boss', speed: 12, hp: 20, dmg: 6 }
        : (kind === 'featured') ? { name: 'Featured Foe', speed: 11, hp: 5, dmg: 3 }
        : { name: 'Mook', speed: 10, hp: 3, dmg: 3 };
      enemies.push({
        x: e.x, y: e.y, w: 12, h: 16, speed: base.speed, dir: e.dir || 'down', moving: true,
        animTime: 0, animFrame: 0, hp: e.hp ?? base.hp, maxHp: base.hp, touchDamage: base.dmg, hitTimer: 0, hitCooldown: 0.8,
        knockbackX: 0, knockbackY: 0,
        name: base.name, kind,
      });
    }
    // Attach class sheets lazily after module loads
    import('./sprites.js').then(mod => {
      for (const e of enemies) {
        if (!e.kind) continue;
        if (e.kind === 'boss') e.sheet = mod.enemyBossSheet;
        else if (e.kind === 'featured') e.sheet = mod.enemyFeaturedSheet;
        else e.sheet = mod.enemyMookSheet;
      }
    }).catch(()=>{});
  }
  // Helper: attach NPC dialog by name
  const attachDialogByName = (npc) => {
    const key = (npc.name || '').toLowerCase();
    if (key.includes('canopy')) npc.dialog = canopyDialog;
    else if (key.includes('yorna')) npc.dialog = yornaDialog;
    else if (key.includes('hola')) npc.dialog = holaDialog;
  };
  // Restore companions
  if (Array.isArray(data.companions)) {
    for (const c of data.companions) {
      const sheet = sheetForName(c.name);
      const comp = spawnCompanion(c.x, c.y, sheet, { name: c.name, portrait: c.portrait || null });
      comp.dir = c.dir || 'down';
      if (c.inventory) comp.inventory = c.inventory;
    }
    updatePartyUI(companions);
  }
  // Restore NPCs
  if (Array.isArray(data.npcs)) {
    for (const n of data.npcs) {
      const sheet = sheetForName(n.name);
      const npc = spawnNpc(n.x, n.y, n.dir || 'down', { name: n.name, sheet, portrait: n.portrait || null });
      attachDialogByName(npc);
    }
  }
}
