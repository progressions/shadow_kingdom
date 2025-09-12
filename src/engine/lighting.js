import { TILE } from './constants.js';
import { world, player, runtime, obstacles } from './state.js';

export const MAX_LIGHT_LEVEL = 8; // 0..8 coarse lighting like Minecraft

function ensureGrid() {
  if (!runtime.lighting) runtime.lighting = {};
  const L = runtime.lighting;
  const w = world.tileW|0, h = world.tileH|0;
  if (!L.grid || L._w !== w || L._h !== h) {
    L._w = w; L._h = h;
    L.grid = new Uint8Array(w * h);
  }
  if (!Array.isArray(L.nodes)) L.nodes = [];
  if (typeof L.ambientLevel !== 'number') L.ambientLevel = 0;
  if (typeof L._throttleMs !== 'number') L._throttleMs = 0;
  return L;
}

export function setAmbientLevel(level = 0) {
  ensureGrid();
  runtime.lighting.ambientLevel = Math.max(0, Math.min(MAX_LIGHT_LEVEL, Math.floor(level)));
}

export function addLightNode(node) {
  const L = ensureGrid();
  const n = Object.assign({ enabled: true, level: MAX_LIGHT_LEVEL, radius: 6 }, node || {});
  L.nodes.push(n);
  return n;
}

export function clearLightNodes() {
  ensureGrid();
  runtime.lighting.nodes = [];
}

function buildBlockerGrid() {
  const w = world.tileW|0, h = world.tileH|0;
  const blk = new Uint8Array(w * h); // 1 = blocks light
  const mark = (tx0, ty0, tx1, ty1) => {
    const x0 = Math.max(0, Math.min(w - 1, tx0|0));
    const y0 = Math.max(0, Math.min(h - 1, ty0|0));
    const x1 = Math.max(0, Math.min(w - 1, tx1|0));
    const y1 = Math.max(0, Math.min(h - 1, ty1|0));
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) blk[ty * w + tx] = 1;
    }
  };
  for (const o of obstacles) {
    if (!o) continue;
    const type = String(o.type || '').toLowerCase();
    const blocks = (o.blocksAttacks === true) || type === 'wall' || type === 'rock' || (type === 'gate' && o.locked !== false);
    if (!blocks) continue;
    const tx0 = Math.floor(o.x / TILE), ty0 = Math.floor(o.y / TILE);
    const tx1 = Math.floor((o.x + o.w - 1) / TILE), ty1 = Math.floor((o.y + o.h - 1) / TILE);
    mark(tx0, ty0, tx1, ty1);
  }
  return blk;
}

function addSource(sources, x, y, level = MAX_LIGHT_LEVEL, radius = 6) {
  const tx = Math.max(0, Math.min(world.tileW - 1, Math.floor(x / TILE)));
  const ty = Math.max(0, Math.min(world.tileH - 1, Math.floor(y / TILE)));
  sources.push({ tx, ty, level: Math.max(0, Math.min(MAX_LIGHT_LEVEL, Math.floor(level))), radius: Math.max(0, Math.floor(radius)) });
}

function collectSources() {
  const sources = [];
  // Player-carried torch emits if equipped (checked in render step for position changes each frame)
  try {
    const LH = player?.inventory?.equipped?.leftHand || null;
    if (LH && LH.id === 'torch') {
      addSource(sources, player.x + player.w/2, player.y + player.h/2, MAX_LIGHT_LEVEL, 6);
    }
  } catch {}
  // Invisible authorable nodes
  const L = ensureGrid();
  for (const n of L.nodes) {
    if (!n || n.enabled === false) continue;
    addSource(sources, n.x, n.y, n.level ?? MAX_LIGHT_LEVEL, n.radius ?? 6);
  }
  return sources;
}

export function rebuildLighting(throttleMs = 0) {
  const L = ensureGrid();
  // Optional throttle in milliseconds to avoid recomputing too often
  const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  if (throttleMs > 0 && L._nextOkAt && now < L._nextOkAt) return;
  if (throttleMs > 0) L._nextOkAt = now + throttleMs;

  const w = world.tileW|0, h = world.tileH|0;
  // Start with ambient
  L.grid.fill(Math.max(0, Math.min(MAX_LIGHT_LEVEL, L.ambientLevel|0)));

  const blk = buildBlockerGrid();
  const sources = collectSources();
  if (!sources.length) return;
  // BFS per source with 4-way propagation, decrease level by 1 each step, stop on blockers
  const queueTx = new Int16Array(w * h);
  const queueTy = new Int16Array(w * h);
  const queueLv = new Int8Array(w * h);
  let qs = 0, qe = 0;
  const enqueue = (tx, ty, lv) => {
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) return;
    const idx = ty * w + tx;
    if (lv <= L.grid[idx]) return; // already brighter or equal
    L.grid[idx] = lv;
    queueTx[qe] = tx; queueTy[qe] = ty; queueLv[qe] = lv; qe++;
  };
  for (const s of sources) {
    const lv0 = Math.max(0, Math.min(MAX_LIGHT_LEVEL, s.level|0));
    enqueue(s.tx, s.ty, lv0);
    while (qs < qe) {
      const tx = queueTx[qs]|0, ty = queueTy[qs]|0, lv = queueLv[qs]|0; qs++;
      if (lv <= 1) continue;
      const nl = lv - 1;
      // 4-neighbors; light blocked tiles but do not propagate through them
      const handle = (nx, ny) => {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
        const idx = ny * w + nx;
        if (blk[idx]) {
          // Let light hit the blocker tile (so rocks/walls can be visibly lit) but stop there
          if (nl > L.grid[idx]) L.grid[idx] = nl;
        } else {
          enqueue(nx, ny, nl);
        }
      };
      handle(tx, ty - 1);
      handle(tx, ty + 1);
      handle(tx - 1, ty);
      handle(tx + 1, ty);
    }
    // reset queue for next source
    qs = 0; qe = 0;
  }
}

export function sampleLightAtPx(x, y) {
  const L = ensureGrid();
  const tx = Math.max(0, Math.min(world.tileW - 1, Math.floor(x / TILE)));
  const ty = Math.max(0, Math.min(world.tileH - 1, Math.floor(y / TILE)));
  const lv = L.grid[ty * L._w + tx] | 0;
  return Math.max(0, Math.min(MAX_LIGHT_LEVEL, lv));
}
