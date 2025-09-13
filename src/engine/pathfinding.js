import { runtime, world, player, obstacles } from './state.js';
import { TILE } from './constants.js';

const INF = 0xffff;

function ensureFlowStruct() {
  if (!runtime._flow) runtime._flow = { dist: null, w: 0, h: 0, lastBuildAt: 0, lastPlayerTx: -1, lastPlayerTy: -1, dirty: true };
  return runtime._flow;
}

function buildBlockedGrid() {
  const w = world.tileW|0, h = world.tileH|0;
  const blocked = new Uint8Array(w * h);
  // Mark any obstacle that blocks movement (mirrors moveWithCollision logic)
  for (const o of obstacles) {
    if (!o) continue;
    if (o.type === 'gate' && o.locked === false) continue; // opened gates do not block
    // Non-blocking types
    if (o.type === 'chest' || o.type === 'mud' || o.type === 'fire' || o.type === 'lava') continue;
    const x1 = Math.max(0, Math.floor(o.x / TILE));
    const y1 = Math.max(0, Math.floor(o.y / TILE));
    const x2 = Math.min(w - 1, Math.floor((o.x + o.w - 1) / TILE));
    const y2 = Math.min(h - 1, Math.floor((o.y + o.h - 1) / TILE));
    for (let ty = y1; ty <= y2; ty++) {
      for (let tx = x1; tx <= x2; tx++) {
        blocked[ty * w + tx] = 1;
      }
    }
  }
  return blocked;
}

function bfsFromPlayer(blocked) {
  const w = world.tileW|0, h = world.tileH|0;
  const dist = new Uint16Array(w * h);
  dist.fill(INF);
  const sx = Math.max(0, Math.min(w - 1, Math.floor(player.x / TILE)));
  const sy = Math.max(0, Math.min(h - 1, Math.floor(player.y / TILE)));
  const si = sy * w + sx;
  if (blocked[si]) return dist; // player tile blocked — leave INF (shouldn't happen)
  const qx = new Int16Array(w * h);
  const qy = new Int16Array(w * h);
  let head = 0, tail = 0;
  qx[tail] = sx; qy[tail] = sy; tail++;
  dist[si] = 0;
  // 8 neighbors; prevent diagonal corner cutting
  const dirs = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1,-1], [1,-1], [-1,1], [1,1]
  ];
  while (head !== tail) {
    const x = qx[head], y = qy[head]; head++;
    const d = dist[y * w + x] + 1;
    for (let k = 0; k < dirs.length; k++) {
      const nx = x + dirs[k][0];
      const ny = y + dirs[k][1];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (blocked[ni]) continue;
      // Prevent cutting diagonally through corners
      if (dirs[k][0] !== 0 && dirs[k][1] !== 0) {
        const ax = x + dirs[k][0], ay = y; // horizontal neighbor
        const bx = x, by = y + dirs[k][1]; // vertical neighbor
        if (ax < 0 || ay < 0 || ax >= w || ay >= h) continue;
        if (bx < 0 || by < 0 || bx >= w || by >= h) continue;
        if (blocked[ay * w + ax] && blocked[by * w + bx]) continue;
      }
      if (dist[ni] !== INF) continue;
      dist[ni] = d;
      qx[tail] = nx; qy[tail] = ny; tail++;
    }
  }
  return dist;
}

export function rebuildFlowField(throttleMs = 200) {
  try {
    const flow = ensureFlowStruct();
    const now = (performance && performance.now) ? performance.now() : Date.now();
    const w = world.tileW|0, h = world.tileH|0;
    const ptx = Math.max(0, Math.min(w - 1, Math.floor(player.x / TILE)));
    const pty = Math.max(0, Math.min(h - 1, Math.floor(player.y / TILE)));
    const movedTile = (ptx !== flow.lastPlayerTx || pty !== flow.lastPlayerTy);
    if (!flow.dirty && !movedTile && (now - (flow.lastBuildAt || 0)) < throttleMs) return;
    const blocked = buildBlockedGrid();
    const dist = bfsFromPlayer(blocked);
    flow.dist = dist; flow.w = w; flow.h = h; flow.lastBuildAt = now; flow.lastPlayerTx = ptx; flow.lastPlayerTy = pty; flow.dirty = false;
  } catch {}
}

export function sampleFlowDirAt(px, py) {
  try {
    const flow = runtime._flow; if (!flow || !flow.dist) return null;
    const w = flow.w|0, h = flow.h|0;
    const tx = Math.max(0, Math.min(w - 1, Math.floor(px / TILE)));
    const ty = Math.max(0, Math.min(h - 1, Math.floor(py / TILE)));
    const di = ty * w + tx;
    const d = flow.dist[di];
    if (d === INF || d === 0) return null; // unreachable or already at player tile
    let best = { d: d, nx: tx, ny: ty };
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (ox === 0 && oy === 0) continue;
        const nx = tx + ox, ny = ty + oy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const nd = flow.dist[ny * w + nx];
        if (nd < best.d) best = { d: nd, nx, ny };
      }
    }
    if (best.nx === tx && best.ny === ty) return null;
    const vx = best.nx - tx, vy = best.ny - ty;
    const len = Math.hypot(vx, vy) || 1;
    return { x: vx / len, y: vy / len };
  } catch { return null; }
}

export function markFlowDirty() {
  try { ensureFlowStruct().dirty = true; } catch {}
}

