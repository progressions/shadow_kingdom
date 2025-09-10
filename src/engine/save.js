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
  try {
    const payload = serializeSave();
    localStorage.setItem(getLocalKey(slot), JSON.stringify(payload));
    showBanner('Game saved');
  } catch (e) {
    console.error('Save failed', e);
    showBanner('Save failed');
  }
}

export function loadGame(slot = 1) {
  try {
    const raw = localStorage.getItem(getLocalKey(slot));
    if (!raw) { showBanner('No save found'); return; }
    const data = JSON.parse(raw);
    if (!data || data.schema !== 'save') {
      try { localStorage.removeItem(getLocalKey(slot)); } catch {}
      showBanner('Old save cleared');
      return;
    }
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

