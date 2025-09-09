import { ctx } from './ui.js';
import { camera, world, player, enemies, companions, npcs, runtime } from './state.js';
import { DIRECTIONS, SPRITE_SIZE } from './constants.js';
import { drawGrid, drawObstacles } from './terrain.js';
import { playerSheet, enemySheet, npcSheet } from './sprites.js';

function drawBar(x, y, w, h, pct, color) {
  ctx.save();
  ctx.fillStyle = '#00000055'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#333'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color; ctx.fillRect(x, y, Math.max(0, Math.min(1, pct)) * w, h);
  ctx.restore();
}

export function render(terrainBitmap, obstacles) {
  ctx.clearRect(0, 0, camera.w, camera.h);
  ctx.drawImage(terrainBitmap, camera.x, camera.y, camera.w, camera.h, 0, 0, camera.w, camera.h);
  if (world.showGrid) drawGrid(ctx, world, camera);
  drawObstacles(ctx, obstacles, camera);

  // Build a y-sorted list of drawables
  const drawables = [];
  for (const n of npcs) drawables.push({
    x: n.x, y: n.y, w: n.w, h: n.h,
    dir: n.dir, frame: n.animFrame, sheet: n.sheet || npcSheet,
  });
  for (const c of companions) drawables.push({
    x: c.x, y: c.y, w: c.w, h: c.h,
    dir: c.dir, frame: c.animFrame, sheet: c.sheet,
  });
  for (const e of enemies) if (e.hp > 0) drawables.push({
    x: e.x, y: e.y, w: e.w, h: e.h,
    dir: e.dir, frame: e.animFrame, sheet: enemySheet, enemyRef: e,
  });
  drawables.push({
    x: player.x, y: player.y, w: player.w, h: player.h,
    dir: player.dir, frame: player.animFrame, sheet: playerSheet, isPlayer: true,
  });
  drawables.sort((a, b) => (a.y + a.h) - (b.y + b.h));

  for (const d of drawables) {
    const row = DIRECTIONS.indexOf(d.dir);
    const sx = d.frame * SPRITE_SIZE;
    const sy = row * SPRITE_SIZE;
    const dx = Math.round(d.x - (SPRITE_SIZE - d.w) / 2 - camera.x);
    const dy = Math.round(d.y - (SPRITE_SIZE - d.h) - camera.y);
    // Player flicker while invulnerable
    if (d.isPlayer && player.invulnTimer > 0) {
      const flicker = Math.floor(performance.now() / 100) % 2 === 0; // ~10 Hz
      if (!flicker) {
        ctx.drawImage(d.sheet, sx, sy, SPRITE_SIZE, SPRITE_SIZE, dx, dy, SPRITE_SIZE, SPRITE_SIZE);
      }
    } else {
      ctx.drawImage(d.sheet, sx, sy, SPRITE_SIZE, SPRITE_SIZE, dx, dy, SPRITE_SIZE, SPRITE_SIZE);
    }
  }

  // Enemy health bars (overlay)
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    drawBar(e.x - 2 - camera.x, e.y - 4 - camera.y, e.w + 4, 2, e.hp / e.maxHp, '#ff5555');
  }

  // Player UI overlay
  drawBar(6, 6, 60, 5, player.hp / player.maxHp, '#4fa3ff');

  // NPC markers
  drawNpcMarkers();
}

function drawNpcMarkers() {
  const margin = 12;
  for (const n of npcs) {
    // screen position of target (center of sprite)
    const tx = n.x + n.w / 2 - camera.x;
    const ty = n.y + n.h / 2 - camera.y;
    const inView = tx >= 0 && tx <= camera.w && ty >= 0 && ty <= camera.h;
    const color = markerColorFor(n);
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    if (inView) {
      // draw dot slightly above the head
      const px = Math.round(tx);
      const py = Math.round(ty - 10);
      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else {
      // clamp to screen edges and draw a small arrow pointing towards target
      const cx = Math.max(margin, Math.min(camera.w - margin, tx));
      const cy = Math.max(margin, Math.min(camera.h - margin, ty));
      const ang = Math.atan2(ty - cy, tx - cx);
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-8, 4);
      ctx.lineTo(-8, -4);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
}

function markerColorFor(npc) {
  const name = (npc.name || '').toLowerCase();
  if (name.includes('canopy')) return '#ff7ab6';
  if (name.includes('yorna')) return '#ff8a3d';
  if (name.includes('hola')) return '#6fb7ff';
  return '#ffd166';
}
