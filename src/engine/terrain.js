import { TILE } from './constants.js';
import { runtime } from './state.js';

export function noise2D(ix, iy, seed = 1337) {
  const s = Math.sin((ix * 127.1 + iy * 311.7 + seed) * 0.017) * 43758.5453;
  return s - Math.floor(s);
}

export function tileType(tx, ty) {
  const n1 = noise2D(tx * 0.9, ty * 0.9, 11);
  const n2 = noise2D(tx * 0.35, ty * 0.35, 27);
  if (n1 < 0.08) return 'water';
  if (n2 > 0.72) return 'dirt';
  return 'grass';
}

export function buildTerrainBitmap(world, theme = 'default') {
  const off = (typeof OffscreenCanvas !== 'undefined')
    ? new OffscreenCanvas(world.w, world.h)
    : Object.assign(document.createElement('canvas'), { width: world.w, height: world.h });
  const g = off.getContext('2d');
  g.imageSmoothingEnabled = false;
  for (let ty = 0; ty < world.tileH; ty++) {
    for (let tx = 0; tx < world.tileW; tx++) {
      const tt = tileType(tx, ty);
      const n1 = noise2D(tx * 0.9, ty * 0.9, 11);
      const n2 = noise2D(tx * 0.35, ty * 0.35, 27);
      // Base palette by theme
      let baseColor = '#12381f'; // grass
      let dirtColor = '#4a3d2f';
      let waterColor = '#1b3566';
      if (theme === 'desert') { baseColor = '#c2b280'; dirtColor = '#a6906a'; waterColor = '#6fa3c9'; }
      if (theme === 'marsh') { baseColor = '#3b4a3a'; dirtColor = '#5a5b45'; waterColor = '#2a4f6d'; }
      if (theme === 'city')   { baseColor = '#3b3b3f'; dirtColor = '#57575e'; waterColor = '#2a4f6d'; }
      if (theme === 'temple') { baseColor = '#2e2e2f'; dirtColor = '#4a4a4c'; waterColor = '#3a3a3c'; }
      let color = baseColor;
      if (tt === 'water') color = waterColor; else if (tt === 'dirt') color = dirtColor;
      const n3 = noise2D(tx * 1.7, ty * 1.3, 99);
      const v = (n3 - 0.5) * 8;
      const tweak = (hex, dv) => {
        const r = Math.max(0, Math.min(255, parseInt(hex.slice(1,3),16) + dv));
        const g2 = Math.max(0, Math.min(255, parseInt(hex.slice(3,5),16) + dv));
        const b = Math.max(0, Math.min(255, parseInt(hex.slice(5,7),16) + dv));
        return `#${r.toString(16).padStart(2,'0')}${g2.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
      };
      g.fillStyle = tweak(color, v|0);
      g.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      if (theme === 'marsh') {
        if (n3 > 0.6 && tt !== 'water') {
          // reed/pebble specks
          g.fillStyle = '#6da86d';
          const px = (tx * TILE) + (n1 * TILE) | 0;
          const py = (ty * TILE) + (n2 * TILE) | 0;
          g.fillRect(px, py, 1, 1);
        }
      } else if (theme === 'city') {
        // cracked stone speckles
        if (n3 > 0.55 && tt !== 'water') {
          g.fillStyle = '#2a2a2e';
          const px = (tx * TILE) + (n1 * TILE) | 0;
          const py = (ty * TILE) + (n2 * TILE) | 0;
          g.fillRect(px, py, 1, 1);
        }
      } else if (theme === 'temple') {
        // Stone floor: subtle grey speckles, no blues
        if (n3 > 0.55 && tt !== 'water') {
          g.fillStyle = '#444446';
          const px = (tx * TILE) + (n1 * TILE) | 0;
          const py = (ty * TILE) + (n2 * TILE) | 0;
          g.fillRect(px, py, 1, 1);
        }
      } else if (theme !== 'desert') {
        if (tt === 'grass' && n3 > 0.6) {
          g.fillStyle = '#1a5a32';
          const px = (tx * TILE) + (n1 * TILE) | 0;
          const py = (ty * TILE) + (n2 * TILE) | 0;
          g.fillRect(px, py, 1, 1);
        }
      } else if (n3 > 0.7) {
        // desert pebbles
        g.fillStyle = '#b8a272';
        const px = (tx * TILE) + (n1 * TILE) | 0;
        const py = (ty * TILE) + (n2 * TILE) | 0;
        g.fillRect(px, py, 1, 1);
      }
    }
  }
  if (typeof off.transferToImageBitmap === 'function') { try { return off.transferToImageBitmap(); } catch (_) {} }
  return off;
}

// Cached repeating pattern for lava speckles
let _lavaPat = null;
let _lavaPatSize = 32;
let _rockPat = null;
let _rockPatSize = 32;
let _rockClusterCache = { sig: '', clusters: [] };
function ensureLavaPattern(ctx) {
  if (_lavaPat) return _lavaPat;
  const size = _lavaPatSize;
  const can = (typeof OffscreenCanvas !== 'undefined')
    ? new OffscreenCanvas(size, size)
    : Object.assign(document.createElement('canvas'), { width: size, height: size });
  if (!can) return null;
  if (!can.width) can.width = size;
  if (!can.height) can.height = size;
  const g = can.getContext('2d');
  if (!g) return null;
  g.clearRect(0, 0, size, size);
  // Subtle red speckles with slight alpha
  const dots = 42;
  for (let i = 0; i < dots; i++) {
    // Random-but-stable distribution using a simple LCG
    const r = (i * 1103515245 + 12345) & 0x7fffffff;
    const rx = (r % size);
    const ry = ((r >> 8) % size);
    const w = 1 + ((r >> 16) % 2); // 1-2 px
    const h = 1 + ((r >> 20) % 2);
    g.fillStyle = 'rgba(200, 16, 0, 0.35)';
    g.fillRect(rx, ry, w, h);
  }
  // A few brighter flecks
  for (let i = 0; i < 10; i++) {
    const r = (i * 1664525 + 1013904223) & 0x7fffffff;
    const rx = (r % size);
    const ry = ((r >> 9) % size);
    g.fillStyle = 'rgba(255, 48, 0, 0.25)';
    g.fillRect(rx, ry, 1, 1);
  }
  try { _lavaPat = ctx.createPattern(can, 'repeat'); } catch (_) { _lavaPat = null; }
  return _lavaPat;
}

// Cached repeating pattern for rock texture
function ensureRockPattern(ctx) {
  if (_rockPat) return _rockPat;
  const size = _rockPatSize;
  const can = (typeof OffscreenCanvas !== 'undefined')
    ? new OffscreenCanvas(size, size)
    : Object.assign(document.createElement('canvas'), { width: size, height: size });
  if (!can) return null;
  if (!can.width) can.width = size;
  if (!can.height) can.height = size;
  const g = can.getContext('2d');
  if (!g) return null;
  g.clearRect(0, 0, size, size);
  // Subtle darker speckles
  const dots = 46;
  for (let i = 0; i < dots; i++) {
    const r = (i * 1103515245 + 12345) & 0x7fffffff;
    const rx = (r % size);
    const ry = ((r >> 9) % size);
    const w = 1 + ((r >> 16) % 2);
    const h = 1 + ((r >> 20) % 2);
    g.fillStyle = 'rgba(20, 20, 20, 0.22)';
    g.fillRect(rx, ry, w, h);
  }
  // A few lighter flecks
  for (let i = 0; i < 12; i++) {
    const r = (i * 1664525 + 1013904223) & 0x7fffffff;
    const rx = (r % size);
    const ry = ((r >> 8) % size);
    g.fillStyle = 'rgba(230, 230, 230, 0.16)';
    g.fillRect(rx, ry, 1, 1);
  }
  try { _rockPat = ctx.createPattern(can, 'repeat'); } catch (_) { _rockPat = null; }
  return _rockPat;
}

// Cached repeating pattern for water speckles
let _waterPat = null;
let _waterPatSize = 32;
function ensureWaterPattern(ctx) {
  if (_waterPat) return _waterPat;
  const size = _waterPatSize;
  const can = (typeof OffscreenCanvas !== 'undefined')
    ? new OffscreenCanvas(size, size)
    : Object.assign(document.createElement('canvas'), { width: size, height: size });
  if (!can) return null;
  if (!can.width) can.width = size;
  if (!can.height) can.height = size;
  const g = can.getContext('2d');
  if (!g) return null;
  g.clearRect(0, 0, size, size);
  // Darker blue speckles
  const dots = 40;
  for (let i = 0; i < dots; i++) {
    const r = (i * 2654435761 + 1013904223) & 0x7fffffff; // LCG
    const rx = (r % size);
    const ry = ((r >> 9) % size);
    const w = 1 + ((r >> 16) % 2);
    const h = 1 + ((r >> 20) % 2);
    g.fillStyle = 'rgba(10, 30, 60, 0.30)';
    g.fillRect(rx, ry, w, h);
  }
  // A few deeper flecks
  for (let i = 0; i < 10; i++) {
    const r = (i * 1103515245 + 12345) & 0x7fffffff;
    const rx = (r % size);
    const ry = ((r >> 8) % size);
    g.fillStyle = 'rgba(0, 18, 36, 0.22)';
    g.fillRect(rx, ry, 1, 1);
  }
  try { _waterPat = ctx.createPattern(can, 'repeat'); } catch (_) { _waterPat = null; }
  return _waterPat;
}

function rectsTouchOrOverlap(a, b, pad = 1.0) {
  return (
    a.x < b.x + b.w + pad &&
    a.x + a.w > b.x - pad &&
    a.y < b.y + b.h + pad &&
    a.y + a.h > b.y - pad
  );
}

function buildRockClusters(obstacles) {
  const rocks = obstacles.filter(o => o && o.type === 'rock');
  const sig = rocks.map(o => `${o.x},${o.y},${o.w},${o.h}`).join('|');
  if (_rockClusterCache.sig === sig && _rockClusterCache.clusters && _rockClusterCache.clusters.length) return _rockClusterCache.clusters;
  const N = rocks.length;
  const visited = new Array(N).fill(false);
  const clusters = [];
  for (let i = 0; i < N; i++) {
    if (visited[i]) continue;
    visited[i] = true;
    const queue = [i];
    const rects = [rocks[i]];
    while (queue.length) {
      const idx = queue.pop();
      const a = rocks[idx];
      for (let j = 0; j < N; j++) {
        if (visited[j]) continue;
        const b = rocks[j];
        if (rectsTouchOrOverlap(a, b, 1.0)) { visited[j] = true; queue.push(j); rects.push(b); }
      }
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of rects) { if (!r) continue; minX = Math.min(minX, r.x); minY = Math.min(minY, r.y); maxX = Math.max(maxX, r.x + r.w); maxY = Math.max(maxY, r.y + r.h); }
    clusters.push({ rects, minX, minY, maxX, maxY, paths: null });
  }
  _rockClusterCache = { sig, clusters };
  return clusters;
}

function computeClusterPaths(cluster, gridStep = 2) {
  if (cluster.paths && Array.isArray(cluster.paths) && cluster.paths.length) return cluster.paths;
  const pad = 0;
  const minX = Math.floor(cluster.minX) - pad;
  const minY = Math.floor(cluster.minY) - pad;
  const maxX = Math.ceil(cluster.maxX) + pad;
  const maxY = Math.ceil(cluster.maxY) + pad;
  const w = Math.max(1, Math.ceil((maxX - minX) / gridStep));
  const h = Math.max(1, Math.ceil((maxY - minY) / gridStep));
  const occ = new Uint8Array(w * h);
  const idx = (x, y) => y * w + x;
  for (const r of cluster.rects) {
    if (!r) continue;
    const x1 = Math.max(0, Math.floor((r.x - minX) / gridStep));
    const y1 = Math.max(0, Math.floor((r.y - minY) / gridStep));
    const x2 = Math.min(w - 1, Math.floor(((r.x + r.w - 1) - minX) / gridStep));
    const y2 = Math.min(h - 1, Math.floor(((r.y + r.h - 1) - minY) / gridStep));
    for (let y = y1; y <= y2; y++) {
      let base = idx(x1, y);
      for (let x = x1; x <= x2; x++, base++) occ[base] = 1;
    }
  }
  const horiz = new Map();
  const vert = new Map();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!occ[idx(x, y)]) continue;
      if (y === 0 || !occ[idx(x, y - 1)]) {
        const arr = horiz.get(y) || []; arr.push([x, x + 1]); horiz.set(y, arr);
      }
      if (y === h - 1 || !occ[idx(x, y + 1)]) {
        const Y = y + 1; const arr = horiz.get(Y) || []; arr.push([x, x + 1]); horiz.set(Y, arr);
      }
      if (x === 0 || !occ[idx(x - 1, y)]) {
        const arr = vert.get(x) || []; arr.push([y, y + 1]); vert.set(x, arr);
      }
      if (x === w - 1 || !occ[idx(x + 1, y)]) {
        const X = x + 1; const arr = vert.get(X) || []; arr.push([y, y + 1]); vert.set(X, arr);
      }
    }
  }
  const edges = [];
  for (const [Y, list] of horiz.entries()) {
    list.sort((a, b) => a[0] - b[0]);
    let cur = null;
    for (const s of list) {
      if (!cur) { cur = [s[0], s[1]]; continue; }
      if (s[0] === cur[1]) { cur[1] = s[1]; }
      else { edges.push({ x1: cur[0], y1: Y, x2: cur[1], y2: Y }); cur = [s[0], s[1]]; }
    }
    if (cur) edges.push({ x1: cur[0], y1: Y, x2: cur[1], y2: Y });
  }
  for (const [X, list] of vert.entries()) {
    list.sort((a, b) => a[0] - b[0]);
    let cur = null;
    for (const s of list) {
      if (!cur) { cur = [s[0], s[1]]; continue; }
      if (s[0] === cur[1]) { cur[1] = s[1]; }
      else { edges.push({ x1: X, y1: cur[0], x2: X, y2: cur[1] }); cur = [s[0], s[1]]; }
    }
    if (cur) edges.push({ x1: X, y1: cur[0], x2: X, y2: cur[1] });
  }
  const key = (x, y) => `${x},${y}`;
  const adj = new Map();
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    const k1 = key(e.x1, e.y1);
    const k2 = key(e.x2, e.y2);
    if (!adj.has(k1)) adj.set(k1, []);
    if (!adj.has(k2)) adj.set(k2, []);
    adj.get(k1).push(i);
    adj.get(k2).push(i);
  }
  const used = new Array(edges.length).fill(false);
  const paths = [];
  for (let i = 0; i < edges.length; i++) {
    if (used[i]) continue;
    const path = [];
    let curIdx = i;
    let cur = edges[curIdx];
    let cx = cur.x1, cy = cur.y1;
    const startKey = key(cx, cy);
    path.push([cx, cy]);
    let iterations = 0;
    const maxIterations = 1000; // Safety limit to prevent infinite loop
    while (iterations < maxIterations) {
      iterations++;
      used[curIdx] = true;
      cx = cur.x2; cy = cur.y2;
      path.push([cx, cy]);
      const ck = key(cx, cy);
      if (ck === startKey) break;
      const nextList = (adj.get(ck) || []).filter(ii => !used[ii]);
      if (nextList.length === 0) break;
      curIdx = nextList[0];
      cur = edges[curIdx];
      if (!(cur.x1 === cx && cur.y1 === cy)) {
        const tx = cur.x1, ty = cur.y1; cur.x1 = cur.x2; cur.y1 = cur.y2; cur.x2 = tx; cur.y2 = ty;
      }
    }
    if (path.length >= 3) paths.push(path);
  }
  const pxPaths = paths.map(arr => arr.map(([gx, gy]) => [minX + gx * gridStep, minY + gy * gridStep]));
  cluster.paths = pxPaths;
  return pxPaths;
}

function drawRockClusters(ctx, obstacles, camera) {
  const clusters = buildRockClusters(obstacles);
  const pat = ensureRockPattern(ctx);
  for (const c of clusters) {
    const minX = c.minX, minY = c.minY, maxX = c.maxX, maxY = c.maxY;
    if (maxX < camera.x || minX > camera.x + camera.w || maxY < camera.y || minY > camera.y + camera.h) continue;
    const paths = computeClusterPaths(c, 2);
    if (!paths || !paths.length) continue;
    ctx.save();
    ctx.beginPath();
    for (const p of paths) {
      if (!p || p.length === 0) continue;
      ctx.moveTo(Math.round(p[0][0] - camera.x), Math.round(p[0][1] - camera.y));
      for (let k = 1; k < p.length; k++) ctx.lineTo(Math.round(p[k][0] - camera.x), Math.round(p[k][1] - camera.y));
      ctx.closePath();
    }
    ctx.fillStyle = '#6f6f6f';
    try { ctx.fill('evenodd'); } catch { ctx.fill(); }
    if (pat) {
      try {
        ctx.save();
        try { ctx.clip('evenodd'); } catch { ctx.clip(); }
        ctx.translate(-camera.x, -camera.y);
        ctx.fillStyle = pat;
        ctx.globalAlpha = 0.45;
        ctx.fillRect(minX, minY, Math.max(1, maxX - minX), Math.max(1, maxY - minY));
        ctx.globalAlpha = 1.0;
        ctx.restore();
      } catch {}
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#2a2a2e';
    try { ctx.stroke('evenodd'); } catch { ctx.stroke(); }
    ctx.restore();
  }
}

export function drawGrid(ctx, world, camera) {
  const s = TILE;
  ctx.save();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  const startX = Math.floor(camera.x / s) * s;
  const endX = Math.min(world.w, camera.x + camera.w);
  for (let x = startX; x <= endX; x += s) {
    const sx = Math.round(x - camera.x) + 0.5;
    ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, camera.h); ctx.stroke();
  }
  const startY = Math.floor(camera.y / s) * s;
  const endY = Math.min(world.h, camera.y + camera.h);
  for (let y = startY; y <= endY; y += s) {
    const sy = Math.round(y - camera.y) + 0.5;
    ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(camera.w, sy); ctx.stroke();
  }
  ctx.restore();
}

export function buildObstacles(world, player, enemies, npcs, theme = 'default') {
  const obs = [];
  const wouldOverlap = (rect) => {
    const actors = [
      { x: player.x, y: player.y, w: player.w, h: player.h },
      ...enemies.map(e => ({ x: e.x, y: e.y, w: e.w, h: e.h })),
      ...npcs.map(n => ({ x: n.x, y: n.y, w: n.w, h: n.h })),
    ];
    return actors.some(a => rect.x < a.x + a.w && rect.x + rect.w > a.x && rect.y < a.y + a.h && rect.y + rect.h > a.y);
  };
  for (let ty = 1; ty < world.tileH - 1; ty++) {
    for (let tx = 1; tx < world.tileW - 1; tx++) {
      const tt = tileType(tx, ty);
      if (tt === 'water') continue;
      const r = noise2D(tx * 0.77, ty * 0.77, 2025);
      let type = null;
      if (theme === 'desert') {
        if (r > 0.97) type = 'cactus';
        else if (r > 0.94) type = 'ruin';
      } else if (theme === 'marsh') {
        if (r > 0.97) type = 'reed';
        else if (r > 0.94) type = 'log';
      } else if (theme === 'city') {
        // Increase ruin density; occasional debris
        if (r > 0.90) type = 'ruin';
        else if (r > 0.87) type = 'crate';
        else if (r > 0.84) type = 'barrel';
      } else {
        if (r > 0.97) type = 'tree'; else if (r > 0.94) type = 'rock';
      }
      if (!type) continue;
      const baseX = tx * TILE;
      const baseY = ty * TILE;
      if (type === 'tree' || type === 'cactus' || type === 'reed') {
        const w = 12, h = 12; const x = baseX + 2, y = baseY + 4;
        if (!wouldOverlap({ x, y, w, h })) obs.push({ x, y, w, h, type });
      } else {
        const w = 10, h = 8; const x = baseX + 3, y = baseY + 8;
        if (!wouldOverlap({ x, y, w, h })) obs.push({ x, y, w, h, type });
      }
    }
  }
  return obs;
}

export function drawObstacles(ctx, obstacles, camera) {
  // Draw rock clusters as contiguous shapes with a single outline
  try { drawRockClusters(ctx, obstacles, camera); } catch {}
  for (const o of obstacles) {
    // Frustum culling: skip obstacles fully outside the camera view
    if (o.x + o.w < camera.x || o.x > camera.x + camera.w || o.y + o.h < camera.y || o.y > camera.y + camera.h) continue;
    const sx = Math.round(o.x - camera.x);
    const sy = Math.round(o.y - camera.y);
    if (o.type === 'wood') {
      // Passable wooden planks (bridge). Draw an oriented plank pattern.
      const base = '#6b4a2a';
      const mid = '#7a5533';
      const light = '#9a6b3f';
      const dark = '#3a2414';
      // Base fill
      ctx.fillStyle = mid;
      ctx.fillRect(sx, sy, o.w, o.h);
      ctx.strokeStyle = dark; ctx.lineWidth = 1;
      // Choose plank orientation by aspect ratio (boards across the narrow axis)
      if (o.w >= o.h) {
        // Horizontal planks (lines across width every 4px)
        for (let y = sy; y <= sy + o.h; y += 4) {
          ctx.beginPath();
          ctx.moveTo(sx, y + 0.5);
          ctx.lineTo(sx + o.w, y + 0.5);
          ctx.stroke();
          // Nail highlights
          ctx.fillStyle = light;
          ctx.fillRect(sx + 3, y + 1, 1, 1);
          ctx.fillRect(sx + o.w - 5, y + 2, 1, 1);
        }
        // Edge beams
        ctx.fillStyle = base;
        ctx.fillRect(sx, sy, o.w, 2);
        ctx.fillRect(sx, sy + o.h - 2, o.w, 2);
      } else {
        // Vertical planks (lines down height every 4px)
        for (let x = sx; x <= sx + o.w; x += 4) {
          ctx.beginPath();
          ctx.moveTo(x + 0.5, sy);
          ctx.lineTo(x + 0.5, sy + o.h);
          ctx.stroke();
          // Nail highlights
          ctx.fillStyle = light;
          ctx.fillRect(x + 1, sy + 3, 1, 1);
          ctx.fillRect(x + 2, sy + o.h - 5, 1, 1);
        }
        // Edge beams
        ctx.fillStyle = base;
        ctx.fillRect(sx, sy, 2, o.h);
        ctx.fillRect(sx + o.w - 2, sy, 2, o.h);
      }
      // Outline
      ctx.strokeStyle = dark; ctx.lineWidth = 1;
      ctx.strokeRect(sx + 0.5, sy + 0.5, o.w - 1, o.h - 1);
      continue;
    }
    if (o.type === 'tree') {
      ctx.fillStyle = '#245f33'; ctx.fillRect(sx - 1, sy - 6, o.w + 2, 8);
      ctx.fillStyle = '#2f7a42'; ctx.fillRect(sx, sy - 2, o.w, 6);
      ctx.fillStyle = '#6e4b2a'; ctx.fillRect(sx + (o.w/2 - 2)|0, sy + 6, 4, o.h - 6);
    } else if (o.type === 'rock') {
      // Skip per-rect rock drawing; clusters are rendered above for a unified outline
      continue;
    } else if (o.type === 'wall') {
      // Stone wall segment
      ctx.fillStyle = '#4f4f57'; ctx.fillRect(sx, sy, o.w, o.h);
      ctx.strokeStyle = '#2a2a2e'; ctx.lineWidth = 1;
      ctx.strokeRect(sx + 0.5, sy + 0.5, o.w - 1, o.h - 1);
      // subtle brick pattern
      ctx.fillStyle = '#696970';
      const brickH = 6, brickW = 12;
      for (let y = 0; y < o.h; y += brickH) {
        const offset = ((y / brickH) % 2) * (brickW / 2);
        for (let x = 0; x < o.w; x += brickW) {
          ctx.fillRect(sx + x + offset, sy + y, brickW - 1, 1);
        }
      }
    } else if (o.type === 'gate') {
      // Locked/unlocked gate in opening
      const locked = o.locked !== false;
      ctx.fillStyle = locked ? '#6b4b2a' : '#2e2e2e';
      ctx.fillRect(sx, sy, o.w, o.h);
      ctx.strokeStyle = locked ? '#3b2a18' : '#1a1a1a';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx + 0.5, sy + 0.5, o.w - 1, o.h - 1);
      if (locked) {
        // simple bar pattern to imply locked
        ctx.fillStyle = '#8a6a3a';
        for (let x = 2; x < o.w; x += 6) ctx.fillRect(sx + x, sy + 1, 2, o.h - 2);
      }
    } else if (o.type === 'chest') {
      const opened = !!o.opened;
      // Chest base
      ctx.fillStyle = opened ? '#4a371f' : '#6d4b2b';
      ctx.fillRect(sx, sy, o.w, o.h);
      ctx.strokeStyle = '#2a1c10';
      ctx.lineWidth = 1;
      ctx.strokeRect(sx + 0.5, sy + 0.5, o.w - 1, o.h - 1);
      // Lid line
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(sx, sy + 3, o.w, 1);
      // Lock plate when closed or locked
      if (!opened || o.locked) {
        ctx.fillStyle = '#c9a24f';
        ctx.fillRect(sx + (o.w/2 - 2)|0, sy + (o.h/2 - 2)|0, 4, 4);
      }
    } else if (o.type === 'barrel') {
      // Simple barrel
      ctx.fillStyle = '#7a4a2a'; ctx.fillRect(sx, sy, o.w, o.h);
      ctx.strokeStyle = '#3a2414'; ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, sy + 0.5, o.w - 1, o.h - 1);
      ctx.fillStyle = '#a67c52'; ctx.fillRect(sx, sy + 3, o.w, 2); ctx.fillRect(sx, sy + o.h - 5, o.w, 2);
    } else if (o.type === 'crate') {
      // Simple crate
      ctx.fillStyle = '#6b5a3a'; ctx.fillRect(sx, sy, o.w, o.h);
      ctx.strokeStyle = '#3a321e'; ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, sy + 0.5, o.w - 1, o.h - 1);
      // cross braces
      ctx.beginPath(); ctx.moveTo(sx + 1, sy + 1); ctx.lineTo(sx + o.w - 1, sy + o.h - 1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx + o.w - 1, sy + 1); ctx.lineTo(sx + 1, sy + o.h - 1); ctx.stroke();
    } else if (o.type === 'cactus') {
      // Cactus cluster
      ctx.fillStyle = '#2e7d32';
      ctx.fillRect(sx + 4, sy, 4, o.h);
      ctx.fillRect(sx + 1, sy + 4, 3, o.h - 4);
      ctx.fillRect(sx + 8, sy + 6, 3, o.h - 6);
      ctx.strokeStyle = '#1b5e20'; ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, sy + 0.5, o.w - 1, o.h - 1);
    } else if (o.type === 'ruin') {
      // Crumbled stone block
      ctx.fillStyle = '#8a8a8a'; ctx.fillRect(sx, sy, o.w, o.h);
      ctx.strokeStyle = '#4a4a4a'; ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, sy + 0.5, o.w - 1, o.h - 1);
      // chips
      ctx.fillStyle = '#b0b0b0';
      ctx.fillRect(sx + 2, sy + 2, 2, 1);
      ctx.fillRect(sx + o.w - 4, sy + o.h - 3, 2, 1);
    } else if (o.type === 'reed') {
      // Marsh reeds
      ctx.fillStyle = '#4b8b4b';
      for (let i = 0; i < o.w; i += 3) {
        ctx.fillRect(sx + i, sy - 4, 1, o.h + 4);
      }
      ctx.strokeStyle = '#244'; ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, sy + 0.5, o.w - 1, o.h - 1);
    } else if (o.type === 'log') {
      // Fallen log
      ctx.fillStyle = '#6b4a2a'; ctx.fillRect(sx, sy + o.h/3, o.w, o.h/3);
      ctx.strokeStyle = '#3a2414'; ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, sy + o.h/3 + 0.5, o.w - 1, o.h/3 - 1);
    } else if (o.type === 'water') {
      // Deep water pool (blocking): solid blue base + subtle darker speckles with gentle drift
      ctx.fillStyle = '#1e4461';
      ctx.fillRect(sx, sy, o.w, o.h);
      const pat = ensureWaterPattern(ctx);
      if (pat) {
        const t = (typeof runtime?._timeSec === 'number') ? runtime._timeSec : (performance.now ? performance.now() / 1000 : 0);
        const ox = Math.sin(t * 0.18) * 2;
        const oy = Math.cos(t * 0.22) * 2;
        ctx.save();
        ctx.translate(-camera.x + ox, -camera.y + oy);
        ctx.fillStyle = pat;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.globalAlpha = 1.0;
        ctx.restore();
      }
    } else if (o.type === 'mud') {
      // Mud (slow zone, non-blocking)
      ctx.fillStyle = '#5a3e24cc';
      ctx.fillRect(sx, sy, o.w, o.h);
      ctx.strokeStyle = '#3a2414'; ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, sy + 0.5, o.w - 1, o.h - 1);
    } else if (o.type === 'fire') {
      // Fire (burn zone, non-blocking)
      ctx.fillStyle = '#ff8c00aa';
      ctx.fillRect(sx, sy, o.w, o.h);
      ctx.strokeStyle = '#a14a00'; ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, sy + 0.5, o.w - 1, o.h - 1);
    } else if (o.type === 'lava') {
      // Lava (strong burn zone, non-blocking): solid orange base + animated red speckles
      ctx.fillStyle = '#ff7a00cc';
      ctx.fillRect(sx, sy, o.w, o.h);
      // Overlay a subtle moving speckle pattern, anchored to world coordinates
      const pat = ensureLavaPattern(ctx);
      if (pat) {
        const t = (typeof runtime?._timeSec === 'number') ? runtime._timeSec : (performance.now ? performance.now() / 1000 : 0);
        const ox = Math.sin(t * 0.35) * 2; // slight drift
        const oy = Math.cos(t * 0.27) * 2;
        ctx.save();
        // Align pattern to world space so it looks continuous across tiles
        ctx.translate(-camera.x + ox, -camera.y + oy);
        ctx.fillStyle = pat;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.globalAlpha = 1.0;
        ctx.restore();
      }
    } else if (o.type === 'marble') {
      // White marble wall (blocking)
      ctx.fillStyle = '#e9e9ef';
      ctx.fillRect(sx, sy, o.w, o.h);
      ctx.strokeStyle = '#c9c9d9'; ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, sy + 0.5, o.w - 1, o.h - 1);
      // subtle gold vein
      ctx.fillStyle = '#d4b967';
      for (let x = 2; x < o.w - 2; x += 12) ctx.fillRect(sx + x, sy + 2, 1, Math.max(1, o.h - 4));
    } else if (o.type === 'gold_wall') {
      // Gold-inlaid wall (blocking)
      ctx.fillStyle = '#b3a14f';
      ctx.fillRect(sx, sy, o.w, o.h);
      ctx.strokeStyle = '#7a6a2a'; ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, sy + 0.5, o.w - 1, o.h - 1);
      // Inlay stripes
      ctx.fillStyle = '#d4b967';
      for (let y = 2; y < o.h - 2; y += 10) ctx.fillRect(sx + 2, sy + y, Math.max(1, o.w - 4), 1);
    } else if (o.type === 'wood_wall') {
      // Wooden wall (blocking) — thicker, solid planks
      ctx.fillStyle = '#f4d29c';
      ctx.fillRect(sx, sy, o.w, o.h);
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, sy + 0.5, o.w - 1, o.h - 1);
      // plank lines
      ctx.fillStyle = '#caa36f';
      const step = 6;
      for (let y = 0; y < o.h; y += step) ctx.fillRect(sx + 1, sy + y, o.w - 2, 1);
    } else if (o.type === 'column') {
      // Golden column (non-blocking by default unless blocksAttacks is set)
      const r = Math.max(4, Math.min(10, Math.floor(Math.min(o.w, o.h) / 2)));
      ctx.save();
      ctx.translate(sx + o.w / 2, sy + o.h / 2);
      ctx.fillStyle = '#d4b967';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#a7882f'; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
    } else if (o.type === 'sun') {
      // Subtle floor halo marker (non-blocking)
      const r = Math.max(8, Math.min(14, Math.floor(Math.max(o.w, o.h))));
      ctx.save();
      ctx.translate(sx + o.w / 2, sy + o.h / 2 + 6);
      const grd = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
      grd.addColorStop(0, 'rgba(212,185,103,0.35)');
      grd.addColorStop(1, 'rgba(212,185,103,0.02)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (o.type === 'torch_node') {
      // Fixed torch prop: blocking, emits light (light node added on placement). Draw like dropped torch icon.
      // Base stand shadow
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(sx + (o.w/2 - 4)|0, sy + o.h - 2, 8, 2);
      // Handle
      ctx.fillStyle = '#8b5a2b';
      const hx = sx + (o.w/2 - 1)|0; const hy = sy + Math.max(0, o.h - 6);
      ctx.fillRect(hx, hy, 2, 6);
      // Flame (two layers)
      ctx.beginPath(); ctx.fillStyle = '#ffcc66';
      ctx.arc(hx + 1, hy - 1.5, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.fillStyle = '#ffa41a';
      ctx.arc(hx + 1, hy - 2.8, 2, 0, Math.PI * 2); ctx.fill();
      // Subtle glow
      ctx.save();
      const glowR = Math.max(6, Math.min(10, Math.floor(Math.max(o.w, o.h))));
      const gx = sx + o.w / 2, gy = sy + o.h / 2;
      const g = ctx.createRadialGradient(gx, gy, glowR * 0.2, gx, gy, glowR);
      g.addColorStop(0, 'rgba(255,196,102,0.22)');
      g.addColorStop(1, 'rgba(255,196,102,0.02)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, glowR, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
}
