import { TILE } from './constants.js';

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

export function buildTerrainBitmap(world) {
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
      let color = '#12381f';
      if (tt === 'water') color = '#1b3566'; else if (tt === 'dirt') color = '#4a3d2f';
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
      if (tt === 'grass' && n3 > 0.6) {
        g.fillStyle = '#1a5a32';
        const px = (tx * TILE) + (n1 * TILE) | 0;
        const py = (ty * TILE) + (n2 * TILE) | 0;
        g.fillRect(px, py, 1, 1);
      }
    }
  }
  if (typeof off.transferToImageBitmap === 'function') { try { return off.transferToImageBitmap(); } catch (_) {} }
  return off;
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

export function buildObstacles(world, player, enemies, npcs) {
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
      if (r > 0.97) type = 'tree'; else if (r > 0.94) type = 'rock';
      if (!type) continue;
      const baseX = tx * TILE;
      const baseY = ty * TILE;
      if (type === 'tree') {
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
  for (const o of obstacles) {
    const sx = Math.round(o.x - camera.x);
    const sy = Math.round(o.y - camera.y);
    if (o.type === 'tree') {
      ctx.fillStyle = '#245f33'; ctx.fillRect(sx - 1, sy - 6, o.w + 2, 8);
      ctx.fillStyle = '#2f7a42'; ctx.fillRect(sx, sy - 2, o.w, 6);
      ctx.fillStyle = '#6e4b2a'; ctx.fillRect(sx + (o.w/2 - 2)|0, sy + 6, 4, o.h - 6);
    } else if (o.type === 'rock') {
      ctx.fillStyle = '#6f6f6f'; ctx.fillRect(sx, sy, o.w, o.h);
      ctx.fillStyle = '#9a9a9a'; ctx.fillRect(sx + 2, sy + 2, o.w - 4, o.h - 4);
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
    }
  }
}
