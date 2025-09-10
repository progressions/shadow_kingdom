import { runtime } from './state.js';
import { showBanner } from './ui.js';
import { serializeSave, loadDataPayload } from './save_core.js';

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

// --- Atomic localStorage with checksum ---
const NS = 'shadow_kingdom_save';
function checksum(str){ let h=0x811c9dc5>>>0; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,0x01000193); } return (h>>>0).toString(16); }
function wrapForStorage(payload){
  const base = { meta:{ schema:payload.schema, version:payload.version, at:payload.at }, payload, checksum:'' };
  const tmp = JSON.stringify({ ...base, checksum:'' });
  return JSON.stringify({ ...base, checksum: checksum(tmp) });
}
function readWrapped(json){
  const obj = JSON.parse(json); const cs=obj.checksum; const tmp=JSON.stringify({ ...obj, checksum:'' });
  if (checksum(tmp)!==cs) throw new Error('Corrupt save (checksum mismatch)');
  return obj.payload;
}
function slotPrefix(slot){ return `${NS}_${slot}`; }
function writeSaveAtomic(slot, payload){
  const ptrKey=`${slotPrefix(slot)}_ptr`; const active=localStorage.getItem(ptrKey)||'A';
  const next= active==='A' ? 'B' : 'A'; const keyNext=`${slotPrefix(slot)}_${next}`;
  const blob=wrapForStorage(payload);
  localStorage.setItem(keyNext, blob); // 1) write
  localStorage.setItem(ptrKey, next);  // 2) flip pointer
}
function readSaveAtomic(slot){
  const ptrKey=`${slotPrefix(slot)}_ptr`; const active=localStorage.getItem(ptrKey)||'A';
  const keys=[ `${slotPrefix(slot)}_${active}`, `${slotPrefix(slot)}_${active==='A'?'B':'A'}` ];
  for (const k of keys){ const j=localStorage.getItem(k); if(!j) continue; try { return readWrapped(j); } catch(e){} }
  throw new Error('No valid save buffers');
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
  try { const data = readSaveAtomic(getLocalKey(slot)); return { exists: true, at: data.at || null }; }
  catch { return { exists: false, at: null }; }
}

export function saveGame(slot = 1) {
  try {
    const payload = serializeSave();
    writeSaveAtomic(getLocalKey(slot), payload);
    showBanner('Game saved');
  } catch (e) {
    console.error('Save failed', e);
    showBanner('Save failed');
  }
}

export function loadGame(slot = 1) {
  try {
    const data = readSaveAtomic(getLocalKey(slot));
    if (!data || data.schema !== 'save') { showBanner('Save schema mismatch'); return; }
    loadDataPayload(data);
  } catch (e) {
    console.error('Load failed', e);
    showBanner('Load failed');
  }
}

export function clearSave(slot = 1) {
  try {
    const pref = slotPrefix(getLocalKey(slot));
    localStorage.removeItem(`${pref}_A`);
    localStorage.removeItem(`${pref}_B`);
    localStorage.removeItem(`${pref}_ptr`);
    showBanner('Save cleared');
  } catch (e) {
    console.error('Clear save failed', e);
    showBanner('Clear save failed');
  }
}
