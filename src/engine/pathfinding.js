import { runtime, world, player, obstacles } from './state.js';
import { TILE } from './constants.js';

const INF = 1e12; // large for weighted distances

function ensureFlowStruct() {
  if (!runtime._flow) runtime._flow = { dist: null, w: 0, h: 0, lastBuildAt: 0, lastPlayerTx: -1, lastPlayerTy: -1, dirty: true };
  return runtime._flow;
}

function buildBlockedAndHazardGrids() {
  const w = world.tileW|0, h = world.tileH|0;
  const blocked = new Uint8Array(w * h);
  const hazard = new Uint8Array(w * h); // 0=normal, 1=mud, 2=fire, 3=lava (weights will map)
  // Mark any obstacle that blocks movement (mirrors moveWithCollision logic)
  for (const o of obstacles) {
    if (!o) continue;
    if (o.type === 'gate' && o.locked === false) continue; // opened gates do not block
    // Non-blocking types
    // Decorative/pass-through only; movement should collide with barrels/boxes/chests, so do NOT skip them here
    if (o.type === 'wood' || o.type === 'reed') continue;
    const x1 = Math.max(0, Math.floor(o.x / TILE));
    const y1 = Math.max(0, Math.floor(o.y / TILE));
    const x2 = Math.min(w - 1, Math.floor((o.x + o.w - 1) / TILE));
    const y2 = Math.min(h - 1, Math.floor((o.y + o.h - 1) / TILE));
    // Hazard weights for mud/fire/lava (non-blocking)
    const hazCode = (o.type === 'mud') ? 1 : (o.type === 'fire') ? 2 : (o.type === 'lava') ? 3 : 0;
    for (let ty = y1; ty <= y2; ty++) {
      for (let tx = x1; tx <= x2; tx++) {
        const idx = ty * w + tx;
        if (hazCode) {
          // store max hazard level if overlapping
          if (hazard[idx] < hazCode) hazard[idx] = hazCode;
        } else {
          // blocking types: walls, rocks, locked gates, etc.
          if (o.type !== 'mud' && o.type !== 'fire' && o.type !== 'lava') blocked[idx] = 1;
        }
      }
    }
  }
  return { blocked, hazard };
}

function dijkstraFromPlayer(blocked, hazard) {
  const w = world.tileW|0, h = world.tileH|0;
  const dist = new Float32Array(w * h);
  for (let i = 0; i < dist.length; i++) dist[i] = INF;
  const sx = Math.max(0, Math.min(w - 1, Math.floor(player.x / TILE)));
  const sy = Math.max(0, Math.min(h - 1, Math.floor(player.y / TILE)));
  const si = sy * w + sx;
  if (blocked[si]) return dist; // player tile blocked — leave INF (shouldn't happen)
  dist[si] = 0;
  // Min-priority queue (array-based; acceptable at 6k tiles)
  const open = [ { x: sx, y: sy, f: 0 } ];
  const dirs = [
    [-1, 0, 10], [1, 0, 10], [0, -1, 10], [0, 1, 10],
    [-1,-1, 14], [1,-1, 14], [-1,1, 14], [1,1, 14]
  ];
  while (open.length) {
    // pop min
    let mi = 0; let mf = open[0].f;
    for (let i = 1; i < open.length; i++) { if (open[i].f < mf) { mf = open[i].f; mi = i; } }
    const node = open.splice(mi, 1)[0];
    const x = node.x, y = node.y;
    const base = dist[y * w + x];
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
      const step = dirs[k][2];
      const haz = hazard[ni] || 0;
      // hazard cost multipliers: mud×2, fire×4, lava×8 (encoded 1,2,3)
      const mult = haz === 1 ? 2 : haz === 2 ? 4 : haz === 3 ? 8 : 1;
      const nd = base + step * mult;
      if (nd < dist[ni]) {
        dist[ni] = nd;
        open.push({ x: nx, y: ny, f: nd });
      }
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
    const { blocked, hazard } = buildBlockedAndHazardGrids();
    const dist = dijkstraFromPlayer(blocked, hazard);
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
    if (!isFinite(d) || d === INF || d === 0) return null; // unreachable or already at player tile
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
