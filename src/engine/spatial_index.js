import { obstacles, runtime, world } from './state.js';

function key(cx, cy) { return `${cx},${cy}`; }

export function rebuildObstacleIndex(cellSize = 64) {
  const cs = Math.max(8, Math.floor(cellSize));
  const cols = Math.max(1, Math.ceil(world.w / cs));
  const rows = Math.max(1, Math.ceil(world.h / cs));
  const map = new Map();
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i]; if (!o) continue;
    const cx0 = Math.max(0, Math.floor(o.x / cs));
    const cy0 = Math.max(0, Math.floor(o.y / cs));
    const cx1 = Math.min(cols - 1, Math.floor((o.x + o.w) / cs));
    const cy1 = Math.min(rows - 1, Math.floor((o.y + o.h) / cs));
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const k = key(cx, cy);
        let arr = map.get(k);
        if (!arr) { arr = []; map.set(k, arr); }
        arr.push(i);
      }
    }
  }
  runtime._obIndex = { cs, cols, rows, map, builtAt: Date.now() };
  return runtime._obIndex;
}

function candidatesForAABB(x, y, w, h) {
  const idx = runtime._obIndex; if (!idx) return null;
  const { cs, cols, rows, map } = idx;
  const cx0 = Math.max(0, Math.floor(x / cs));
  const cy0 = Math.max(0, Math.floor(y / cs));
  const cx1 = Math.min(cols - 1, Math.floor((x + w) / cs));
  const cy1 = Math.min(rows - 1, Math.floor((y + h) / cs));
  const set = new Set();
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const arr = map.get(key(cx, cy));
      if (!arr) continue;
      for (let i = 0; i < arr.length; i++) set.add(arr[i]);
    }
  }
  const out = [];
  for (const i of set) { const o = obstacles[i]; if (o) out.push(o); }
  return out;
}

export function queryObstaclesAABB(x, y, w, h) {
  const c = candidatesForAABB(x, y, w, h);
  return c || obstacles;
}

export function queryObstaclesSegment(x1, y1, x2, y2, pad = 4) {
  const minx = Math.min(x1, x2) - pad;
  const miny = Math.min(y1, y2) - pad;
  const w = Math.abs(x2 - x1) + pad * 2;
  const h = Math.abs(y2 - y1) + pad * 2;
  const c = candidatesForAABB(minx, miny, w, h);
  return c || obstacles;
}

export function markObstacleIndexDirty() {
  // For future use; queries fall back to obstacles if index is absent
  runtime._obIndex = null;
}

