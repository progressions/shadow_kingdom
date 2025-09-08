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
    ctx.drawImage(d.sheet, sx, sy, SPRITE_SIZE, SPRITE_SIZE, dx, dy, SPRITE_SIZE, SPRITE_SIZE);
  }

  // Enemy health bars (overlay)
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    drawBar(e.x - 2 - camera.x, e.y - 4 - camera.y, e.w + 4, 2, e.hp / e.maxHp, '#ff5555');
  }

  // Player UI overlay
  drawBar(6, 6, 60, 5, player.hp / player.maxHp, '#4fa3ff');
}
