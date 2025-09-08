import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 8080;
const DATA_PATH = process.env.DATA_PATH || path.resolve('./data/saves.json');
const API_KEY = process.env.SAVE_API_KEY || '';

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
  if (API_KEY && req.get('x-api-key') !== API_KEY) {
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

app.listen(PORT, () => {
  console.log(`Save server listening on :${PORT}`);
});

