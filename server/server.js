import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 8080;
const API_KEY = process.env.SAVE_API_KEY || '';

// Resolve current file dir (ESM-compatible __dirname)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Where to persist saves (defaults to local ./data/ when not provided)
const DATA_PATH = process.env.DATA_PATH || path.resolve(__dirname, './data/saves.json');
// Public directory to serve static assets (defaults to repo root)
const PUBLIC_DIR = process.env.PUBLIC_DIR || path.resolve(__dirname, '..');

function ensureDir(p) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadStore() {
  try { return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); }
  catch { return { users: {} }; }
}

function saveStore(store) {
  ensureDir(DATA_PATH);
  fs.writeFileSync(DATA_PATH, JSON.stringify(store));
}

function auth(req, res, next) {
  // Allow same-origin browser requests without exposing API key.
  // Cross-origin callers must present the x-api-key when SAVE_API_KEY is set.
  const origin = req.get('origin') || '';
  const host = req.get('host') || '';
  const sameOrigin = !origin || origin.includes(host);
  if (API_KEY && !sameOrigin && req.get('x-api-key') !== API_KEY) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  const userId = req.get('x-user-id');
  if (!userId) return res.status(400).json({ ok: false, error: 'missing user id' });
  req.userId = userId;
  next();
}

app.get('/healthz', (req, res) => res.json({ ok: true }));

app.post('/api/save', auth, (req, res) => {
  const slot = String(req.query.slot || '1');
  const payload = req.body?.payload;
  if (!payload) return res.status(400).json({ ok: false, error: 'missing payload' });
  const store = loadStore();
  if (!store.users[req.userId]) store.users[req.userId] = {};
  store.users[req.userId][slot] = { payload, at: Date.now(), version: 1 };
  saveStore(store);
  res.json({ ok: true });
});

app.get('/api/save', auth, (req, res) => {
  const slot = String(req.query.slot || '1');
  const store = loadStore();
  const record = store.users?.[req.userId]?.[slot];
  if (!record) return res.status(404).json({ ok: false, error: 'not found' });
  res.json({ ok: true, payload: record.payload, at: record.at, version: record.version });
});

app.delete('/api/save', auth, (req, res) => {
  const slot = String(req.query.slot || '1');
  const store = loadStore();
  if (store.users?.[req.userId]) {
    delete store.users[req.userId][slot];
    saveStore(store);
  }
  res.json({ ok: true });
});

// Serve static site (index.html, assets, src modules)
app.use(express.static(PUBLIC_DIR));

// SPA fallback: serve index.html for unknown non-API paths
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  return res.status(404).send('Not found');
});

app.listen(PORT, () => {
  console.log(`Save server listening on :${PORT}`);
});
