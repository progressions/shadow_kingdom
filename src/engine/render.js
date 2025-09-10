import { ctx } from './ui.js';
import { camera, world, player, enemies, companions, npcs, runtime, corpses, stains, floaters, sparkles, itemsOnGround, xpToNext } from './state.js';
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

  // Blood stains (fade out). Draw under corpses/actors
  for (const s of stains) {
    const alpha = Math.max(0, 1 - (s.t / s.life)) * 0.7;
    if (alpha <= 0) continue;
    ctx.save();
    ctx.translate(Math.round(s.x - camera.x), Math.round(s.y - camera.y));
    ctx.globalAlpha = alpha;
    for (const b of s.blobs) {
      ctx.beginPath();
      ctx.fillStyle = '#7a0f26';
      ctx.arc(b.ox, b.oy + 6, b.r, 0, Math.PI*2);
      ctx.fill();
      // small highlight for depth
      ctx.beginPath();
      ctx.fillStyle = '#a1112d';
      ctx.arc(b.ox - b.r*0.3, b.oy + 6 - b.r*0.3, b.r*0.4, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Corpses (pass-through, fade out). Draw before living actors so they appear beneath
  for (const c of corpses) {
    const row = DIRECTIONS.indexOf(c.dir || 'down');
    const sx = 0; // first frame
    const sy = row * SPRITE_SIZE;
    const dx = Math.round(c.x - (SPRITE_SIZE - c.w) / 2 - camera.x);
    const dy = Math.round(c.y - (SPRITE_SIZE - c.h) - camera.y);
    const alpha = Math.max(0, 1 - (c.t / c.life));
    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    // Randomized lay direction for variety
    ctx.translate(dx + SPRITE_SIZE / 2, dy + SPRITE_SIZE / 2);
    ctx.rotate(c.angle || -Math.PI / 2);
    const sheet = c.sheet || enemySheet;
    ctx.drawImage(sheet, sx, sy, SPRITE_SIZE, SPRITE_SIZE, -SPRITE_SIZE / 2, -SPRITE_SIZE / 2, SPRITE_SIZE, SPRITE_SIZE);
    ctx.restore();
  }

  // Ground pickups (icon sprites per item type)
  if (itemsOnGround && itemsOnGround.length) {
    for (const it of itemsOnGround) {
      const sx = Math.round(it.x - camera.x);
      const sy = Math.round(it.y - camera.y);
      drawItemIcon(sx, sy, it.item);
    }
  }

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
    dir: e.dir, frame: e.animFrame, sheet: e.sheet || enemySheet, spriteScale: e.spriteScale || 1,
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
    const scale = d.spriteScale || 1;
    const destW = SPRITE_SIZE * scale;
    const destH = SPRITE_SIZE * scale;
    const dx = Math.round(d.x - (destW - d.w) / 2 - camera.x);
    const dy = Math.round(d.y - (destH - d.h) - camera.y);
    // Player flicker while invulnerable
    if (d.isPlayer && player.invulnTimer > 0) {
      const flicker = Math.floor(performance.now() / 100) % 2 === 0; // ~10 Hz
      if (!flicker) {
        ctx.drawImage(d.sheet, sx, sy, SPRITE_SIZE, SPRITE_SIZE, dx, dy, destW, destH);
      }
    } else {
      ctx.drawImage(d.sheet, sx, sy, SPRITE_SIZE, SPRITE_SIZE, dx, dy, destW, destH);
    }
  }

  // Enemy health bars (overlay)
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    drawBar(e.x - 2 - camera.x, e.y - 4 - camera.y, e.w + 4, 2, e.hp / e.maxHp, '#ff5555');
    // Aggro tell: show '!' when player is within 80px
    const dx = (e.x - player.x), dy = (e.y - player.y);
    if ((dx*dx + dy*dy) <= (80*80)) {
      ctx.save();
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#ffd166';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      const sx = Math.round(e.x + e.w/2 - camera.x);
      const sy = Math.round(e.y - 8 - camera.y);
      ctx.strokeText('!', sx, sy);
      ctx.fillText('!', sx, sy);
      ctx.restore();
    }
  }

  // Player UI overlay
  drawBar(6, 6, 60, 5, player.hp / player.maxHp, '#4fa3ff');
  // Player XP bar under HP
  try {
    const need = xpToNext(Math.max(1, player.level || 1));
    const cur = Math.max(0, player.xp || 0);
    const pct = Math.max(0, Math.min(1, need > 0 ? (cur / need) : 0));
    drawBar(6, 14, 60, 3, pct, '#ffd166');
  } catch {}
  // Player Level label
  try {
    const label = `Lv ${Math.max(1, player.level || 1)}`;
    ctx.save();
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.fillStyle = '#eaeaea';
    const lx = 70; const ly = 6; // to the right of bars
    ctx.strokeText(label, lx, ly);
    ctx.fillText(label, lx, ly);
    ctx.restore();
  } catch {}

  // NPC markers
  drawNpcMarkers();

  // Objective marker (temporary): point to Level 2 arena gate if locked
  drawArenaMarker(obstacles);

  // Floating texts (combat barks)
  drawFloaters();

  // Healing sparkles
  drawSparkles();

  // Quest target markers
  drawQuestMarkers();
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

// no pre-intro highlight needed

function drawArenaMarker(obstacles) {
  try {
    const gateId = (runtime.currentLevel === 2)
      ? 'nethra_gate'
      : (runtime.currentLevel === 3)
        ? 'marsh_gate'
        : (runtime.currentLevel === 4)
          ? 'city_gate'
          : null;
    if (!gateId) return;
    const gate = obstacles && obstacles.find && obstacles.find(o => o && o.type === 'gate' && o.id === gateId && o.locked !== false);
    if (!gate) return;
    const tx = gate.x + gate.w / 2 - camera.x;
    const ty = gate.y + gate.h / 2 - camera.y;
    const margin = 14;
    const inView = tx >= 0 && tx <= camera.w && ty >= 0 && ty <= camera.h;
    ctx.save();
    ctx.fillStyle = '#9ae6ff';
    ctx.strokeStyle = '#003b5a';
    ctx.lineWidth = 1.5;
    if (inView) {
      const px = Math.round(tx);
      const py = Math.round(ty - 10);
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else {
      const cx = Math.max(margin, Math.min(camera.w - margin, tx));
      const cy = Math.max(margin, Math.min(camera.h - margin, ty));
      const ang = Math.atan2(ty - cy, tx - cx);
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-10, 6);
      ctx.lineTo(-10, -6);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  } catch {}
}

function drawFloaters() {
  if (!floaters || floaters.length === 0) return;
  ctx.save();
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of floaters) {
    const alpha = Math.max(0, 1 - f.t / f.life);
    if (alpha <= 0) continue;
    const sx = Math.round(f.x - camera.x);
    const sy = Math.round(f.y - camera.y - f.t * 16); // drift up
    ctx.globalAlpha = alpha;
    ctx.fillStyle = f.color || '#eaeaea';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeText(f.text, sx, sy);
    ctx.fillText(f.text, sx, sy);
  }
  ctx.restore();
}

function drawSparkles() {
  if (!sparkles || sparkles.length === 0) return;
  ctx.save();
  for (const p of sparkles) {
    const alpha = Math.max(0, 1 - p.t / p.life);
    if (alpha <= 0) continue;
    const sx = Math.round(p.x - camera.x);
    const sy = Math.round(p.y - camera.y);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color || '#8effc1';
    ctx.beginPath();
    ctx.arc(sx, sy, p.r || 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawQuestMarkers() {
  const colorFor = (qid) => {
    switch (qid) {
      case 'yorna_knot': return '#ff8a3d';
      case 'canopy_triage': return '#8effc1';
      case 'twil_trace': return '#e0b3ff';
      case 'oyin_fuse': return '#ffd166';
      default: return '#9ae6ff';
    }
  };
  const margin = 12;
  for (const e of enemies) {
    if (!e || e.hp <= 0 || !e.questId) continue;
    const tx = e.x + e.w / 2 - camera.x;
    const ty = e.y + e.h / 2 - camera.y;
    const inView = tx >= 0 && tx <= camera.w && ty >= 0 && ty <= camera.h;
    ctx.save();
    ctx.fillStyle = colorFor(e.questId);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    if (inView) {
      const px = Math.round(tx);
      const py = Math.round(ty - 12);
      ctx.beginPath();
      ctx.moveTo(px, py - 4);
      ctx.lineTo(px + 4, py);
      ctx.lineTo(px, py + 4);
      ctx.lineTo(px - 4, py);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    } else {
      const cx = Math.max(margin, Math.min(camera.w - margin, tx));
      const cy = Math.max(margin, Math.min(camera.h - margin, ty));
      const ang = Math.atan2(ty - cy, tx - cx);
      ctx.translate(cx, cy);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-10, 6);
      ctx.lineTo(-10, -6);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
}

function drawItemIcon(x, y, item) {
  ctx.save();
  // backdrop shadow
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#0f0f0f';
  ctx.fillRect(x - 1, y - 1, 12, 12);
  // Determine type and colors
  const isKey = !!item?.keyId;
  const slot = String(item?.slot || '').toLowerCase();
  let color = '#8ab4ff'; let accent = '#eaeaea';
  if (isKey) { color = '#ffd166'; accent = '#7a4a1a'; }
  else if (slot === 'rightHand') { color = '#8ab4ff'; accent = '#3a5a9a'; }
  else if (slot === 'leftHand') { color = '#ffb366'; accent = '#a65a1a'; }
  else if (slot === 'head') { color = '#c9c9c9'; accent = '#7f7f7f'; }
  else if (slot === 'torso') { color = '#9ad19a'; accent = '#3a6b3a'; }
  else if (slot === 'legs') { color = '#b8a16a'; accent = '#6b5a2a'; }
  // Icon shapes
  const drawSword = () => {
    ctx.fillStyle = color; ctx.fillRect(x + 5, y + 2, 2, 8);
    ctx.fillStyle = accent; ctx.fillRect(x + 3, y + 6, 6, 2);
  };
  const drawTorch = () => {
    ctx.fillStyle = '#a65a1a'; ctx.fillRect(x + 5, y + 5, 2, 5);
    ctx.fillStyle = '#ffcc66'; ctx.beginPath(); ctx.arc(x + 6, y + 4, 3, 0, Math.PI * 2); ctx.fill();
  };
  const drawHelm = () => {
    ctx.fillStyle = color; ctx.fillRect(x + 3, y + 4, 6, 4);
    ctx.fillStyle = accent; ctx.fillRect(x + 2, y + 6, 8, 2);
  };
  const drawChest = () => {
    ctx.fillStyle = color; ctx.fillRect(x + 3, y + 4, 6, 6);
    ctx.fillStyle = accent; ctx.fillRect(x + 3, y + 6, 6, 1);
  };
  const drawKey = () => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x + 4, y + 4, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x + 6, y + 3, 5, 2); ctx.fillRect(x + 9, y + 5, 2, 2);
  };
  const drawGeneric = () => {
    ctx.fillStyle = color; ctx.fillRect(x + 3, y + 3, 6, 6);
    ctx.fillStyle = accent; ctx.fillRect(x + 4, y + 4, 4, 1);
  };
  if (isKey) drawKey();
  else if (slot === 'rightHand') drawSword();
  else if (slot === 'leftHand') drawTorch();
  else if (slot === 'head') drawHelm();
  else if (slot === 'torso') drawChest();
  else drawGeneric();
  ctx.restore();
}
