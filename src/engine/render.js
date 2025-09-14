import { ctx } from './ui.js';
import { camera, world, player, enemies, companions, npcs, runtime, corpses, stains, floaters, sparkles, itemsOnGround, xpToNext, spawners, projectiles } from './state.js';
import { DIRECTIONS, SPRITE_SIZE, TILE } from './constants.js';
import { MAX_LIGHT_LEVEL } from './lighting.js';
import { drawGrid, drawObstacles } from './terrain.js';
import { playerSheet, enemySheet, npcSheet } from './sprites.js';
import { getSprite } from './sprite_loader.js';
import { sampleFlowDirAt } from './pathfinding.js';

// Cached offscreen for sprite outlines
let _olCan = null, _olCtx = null, _olW = 0, _olH = 0;

// Defensive: ensure a value is a valid CanvasImageSource for drawImage
function canDrawImage(img) {
  if (!img) return false;
  try {
    const tag = (img.tagName || '').toLowerCase();
    if (tag === 'img' || tag === 'canvas' || tag === 'video' || tag === 'svgimageelement') return true;
  } catch {}
  try { if (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap) return true; } catch {}
  try { if (typeof OffscreenCanvas !== 'undefined' && img instanceof OffscreenCanvas) return true; } catch {}
  try { if (typeof SVGImageElement !== 'undefined' && img instanceof SVGImageElement) return true; } catch {}
  // Fallback heuristic: looks like a canvas-like object
  if (typeof img.width === 'number' && typeof img.height === 'number') return true;
  return false;
}

function drawBossOutline(img, sx, sy, sw, sh, dx, dy, dw, dh, color = '#ffd166') {
  if (!canDrawImage(img)) return;
  // Ensure offscreen of correct size
  if (!_olCan || _olW !== dw || _olH !== dh) {
    _olCan = document.createElement('canvas');
    _olCan.width = dw; _olCan.height = dh;
    _olCtx = _olCan.getContext('2d');
    _olW = dw; _olH = dh;
  } else {
    _olCtx.clearRect(0, 0, _olW, _olH);
  }
  // Draw sprite to offscreen and tint to a solid mask
  _olCtx.globalCompositeOperation = 'source-over';
  _olCtx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
  _olCtx.globalCompositeOperation = 'source-in';
  _olCtx.fillStyle = color;
  _olCtx.fillRect(0, 0, dw, dh);
  _olCtx.globalCompositeOperation = 'source-over';
  // Draw the tinted mask with a soft shadow to create a glow instead of a hard outline
  ctx.save();
  const t = (runtime && typeof runtime._timeSec === 'number') ? runtime._timeSec : 0;
  const pulse = 0.85 + 0.15 * Math.sin(t * 4);
  // Brighter, tighter glow
  ctx.globalAlpha = 0.75 * pulse;
  ctx.shadowBlur = Math.max(6, Math.min(18, Math.floor(Math.max(dw, dh) * 0.14)));
  ctx.shadowColor = 'rgba(255,209,102,1.0)';
  ctx.drawImage(_olCan, Math.round(dx), Math.round(dy));
  ctx.restore();
}


function drawBar(x, y, w, h, pct, color) {
  ctx.save();
  ctx.fillStyle = '#00000055'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#333'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color; ctx.fillRect(x, y, Math.max(0, Math.min(1, pct)) * w, h);
  ctx.restore();
}

export function render(terrainBitmap, obstacles) {
  ctx.clearRect(0, 0, camera.w, camera.h);
  // Screen shake for world only; disable shake under VN overlay to avoid black edges behind UI
  let shakeX = 0, shakeY = 0;
  const allowShake = (runtime.gameState !== 'chat');
  try {
    if (allowShake && (runtime.shakeTimer || 0) > 0) {
      const mag = Math.max(0, runtime.shakeMag || 2);
      shakeX = Math.round((Math.random() * 2 - 1) * mag);
      shakeY = Math.round((Math.random() * 2 - 1) * mag);
    }
  } catch {}
  ctx.save();
  if (allowShake) ctx.translate(shakeX, shakeY);
  // Apply death zoom (zoom out a bit around screen center)
  try {
    if (typeof runtime._deathZoom === 'number' || typeof runtime._deathZoomTarget === 'number') {
      const zt = (typeof runtime._deathZoomTarget === 'number') ? runtime._deathZoomTarget : 1.0;
      const cur = (typeof runtime._deathZoom === 'number') ? runtime._deathZoom : 1.0;
      const nz = cur + (zt - cur) * 0.08; // ease toward
      runtime._deathZoom = nz;
      if (Math.abs(nz - zt) < 0.001) runtime._deathZoom = zt;
      const z = Math.max(0.6, Math.min(1.0, nz));
      if (z !== 1.0) {
        ctx.translate(camera.w/2, camera.h/2);
        ctx.scale(z, z);
        ctx.translate(-camera.w/2, -camera.h/2);
      }
    }
  } catch {}
  ctx.drawImage(terrainBitmap, camera.x, camera.y, camera.w, camera.h, 0, 0, camera.w, camera.h);
  if (world.showGrid) drawGrid(ctx, world, camera);
  drawObstacles(ctx, obstacles, camera);
  // Debug: flow field vectors overlay (coarse), when enabled
  try {
    if (window && window.DEBUG_FLOW) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 200, 255, 0.35)';
      ctx.fillStyle = 'rgba(0, 200, 255, 0.35)';
      ctx.lineWidth = 1;
      const s = TILE;
      const tx0 = Math.max(0, Math.floor(camera.x / s));
      const ty0 = Math.max(0, Math.floor(camera.y / s));
      const tx1 = Math.min(world.tileW - 1, Math.floor((camera.x + camera.w) / s));
      const ty1 = Math.min(world.tileH - 1, Math.floor((camera.y + camera.h) / s));
      const step = 3; // sample every N tiles for readability
      for (let ty = ty0; ty <= ty1; ty += step) {
        for (let tx = tx0; tx <= tx1; tx += step) {
          const px = tx * s + s/2;
          const py = ty * s + s/2;
          const dir = sampleFlowDirAt(px, py);
          if (!dir) continue;
          const sx = Math.round(px - camera.x);
          const sy = Math.round(py - camera.y);
          const len = 6;
          const ex = sx + Math.round(dir.x * len);
          const ey = sy + Math.round(dir.y * len);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          // arrow head
          const ang = Math.atan2(dir.y, dir.x);
          const ah = 3;
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex - Math.cos(ang - Math.PI/6) * ah, ey - Math.sin(ang - Math.PI/6) * ah);
          ctx.lineTo(ex - Math.cos(ang + Math.PI/6) * ah, ey - Math.sin(ang + Math.PI/6) * ah);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    }
  } catch {}
  // Projectiles (simple circles with low-noise tracer)
  try {
    if (Array.isArray(projectiles) && projectiles.length) {
      ctx.save();
      for (const p of projectiles) {
        const cx = Math.round(p.x + p.w/2 - camera.x);
        const cy = Math.round(p.y + p.h/2 - camera.y);
        const inView = cx >= -8 && cx <= camera.w + 8 && cy >= -8 && cy <= camera.h + 8;
        if (!inView) continue;
        const color = p.color || (p.team === 'enemy' ? '#ff9a3d' : '#9ae6ff');
        // Tracer: short line opposite velocity
        try {
          const spd = Math.hypot(p.vx || 0, p.vy || 0);
          if (spd > 1) {
            const ux = (p.vx || 0) / spd;
            const uy = (p.vy || 0) / spd;
            const len = Math.max(4, Math.min(16, spd * 0.05));
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.45;
            ctx.lineWidth = 1;
            ctx.moveTo(cx - ux * len, cy - uy * len);
            ctx.lineTo(cx, cy);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
          }
        } catch {}
        // Core projectile
        ctx.beginPath();
        const r = Math.max(2, Math.floor(Math.max(p.w, p.h) / 2));
        ctx.fillStyle = color;
        ctx.arc(cx, cy, r, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }
  } catch {}
  // Visible spawners (glyph with subtle pulse)
  try {
    if (Array.isArray(spawners) && spawners.length) {
      const t = runtime._timeSec || 0;
      for (const sp of spawners) {
        if (!sp || !sp.visible) continue;
        const sx = Math.round(sp.x + sp.w/2 - camera.x);
        const sy = Math.round(sp.y + sp.h/2 - camera.y);
        const inView = sx >= 0 && sx <= camera.w && sy >= 0 && sy <= camera.h;
        if (!inView) continue;
        const pulse = 0.8 + 0.2 * Math.sin(t * 6);
        const R = 8;
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = sp._eligible ? `rgba(154,230,255,${0.9*pulse})` : `rgba(154,230,255,0.4)`;
        ctx.fillStyle = sp._eligible ? `rgba(0,59,90,${0.25*pulse})` : `rgba(0,59,90,0.15)`;
        ctx.beginPath(); ctx.arc(sx, sy, R, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        // rune cross
        ctx.beginPath();
        ctx.moveTo(sx - R/2, sy); ctx.lineTo(sx + R/2, sy);
        ctx.moveTo(sx, sy - R/2); ctx.lineTo(sx, sy + R/2);
        ctx.stroke();
        // Debug counters
        try {
          if (window && window.DEBUG_SPAWNERS) {
            ctx.font = '9px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#9ae6ff';
            const live = sp.currentlyAliveIds ? sp.currentlyAliveIds.size : 0;
            const rem = (typeof sp.totalToSpawn === 'number') ? Math.max(0, sp.totalToSpawn - (sp.spawnedCount||0)) : Infinity;
            const text = `${sp.id}  live:${live} rem:${rem===Infinity?'∞':rem}`;
            ctx.fillText(text, sx, sy + R + 4);
          }
        } catch {}
        ctx.restore();
      }
    }
  } catch {}

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
    spriteId: n.spriteId || null, spriteRef: n, spriteScale: n.spriteScale || 1,
  });
  for (const c of companions) drawables.push({
    x: c.x, y: c.y, w: c.w, h: c.h,
    dir: c.dir, frame: c.animFrame, sheet: c.sheet || npcSheet,
    spriteId: c.spriteId || null, spriteRef: c, spriteScale: c.spriteScale || 1,
  });
  for (const e of enemies) if (e.hp > 0) drawables.push({
    x: e.x, y: e.y, w: e.w, h: e.h,
    dir: e.dir, frame: e.animFrame, sheet: e.sheet || enemySheet, spriteScale: e.spriteScale || 1,
    spriteId: e.spriteId || null, spriteRef: e,
  });
  drawables.push({
    x: player.x, y: player.y, w: player.w, h: player.h,
    dir: player.dir, frame: player.animFrame, sheet: playerSheet, isPlayer: true,
    // Allow player to use custom external sprites via spriteId
    spriteId: player.spriteId || null, spriteRef: player, spriteScale: player.spriteScale || 1,
  });
  drawables.sort((a, b) => (a.y + a.h) - (b.y + b.h));

  for (const d of drawables) {
    if (d.isPlayer && runtime._hidePlayer) continue;
    // Player: draw from custom sheet only
    // New player sheet: 6×7 grid of 16×16 cells (w=96,h=112)
    // Columns (pairs): 1–2 = down/right, 3–4 = left, 5–6 = up
    // Rows:
    // 1 none
    // 2 shield only
    // 3 sword only (any melee RH)
    // 4 sword+shield
    // 5 bow (two‑handed)
    // 6 torch only (LH torch, RH none/utility)
    // 7 torch+sword (LH torch + RH melee)
    if (d.isPlayer) {
      const ent = d.spriteRef;
      const scale = d.spriteScale || 1;
      const destW = SPRITE_SIZE * scale;
      const destH = SPRITE_SIZE * scale;
      const dx = Math.round(d.x - (destW - d.w) / 2 - camera.x);
      let dy = Math.round(d.y - (destH - d.h) - camera.y);
      try {
        if (ent && ent.spriteId) {
          if (ent._sprite && ent._sprite.image && canDrawImage(ent._sprite.image)) {
            const dir = String(ent.dir || 'down');
            // Equipment flags
            let hasMelee = false, hasBow = false, hasShield = false, hasTorch = false;
            try {
              const eq = player?.inventory?.equipped || {};
              const RH = eq.rightHand || null;
              const LH = eq.leftHand || null;
              if (RH && !RH.stackable) {
                hasBow = !!RH.ranged; // any truthy 'ranged' means bow/ranged
                const hasAtk = (typeof RH.atk === 'number' && RH.atk > 0);
                hasMelee = hasAtk && !hasBow;
              }
              // Shield detection (left hand)
              const nameId = String((LH && (LH.name || LH.id)) || '');
              const looksLikeShield = /shield|buckler/i.test(nameId);
              const isLeftHandDr = !!(LH && LH.slot === 'leftHand' && !LH.stackable && typeof LH.dr === 'number' && LH.dr > 0 && !LH.ranged && !(typeof LH.atk === 'number' && LH.atk > 0));
              hasShield = !!(LH && !LH.stackable && (LH.isShield || looksLikeShield || isLeftHandDr));
              hasTorch = !!(LH && LH.id === 'torch');
            } catch {}
            // Determine row (0..6) by priority
            let row = 0;
            if (hasBow) row = 4;               // row 5 (bow)
            else if (hasTorch && hasMelee) row = 6; // row 7 (torch+sword)
            else if (hasTorch) row = 5;       // row 6 (torch only)
            else if (hasMelee && hasShield) row = 3; // row 4 (sword+shield)
            else if (hasMelee) row = 2;       // row 3 (sword only)
            else if (hasShield) row = 1;      // row 2 (shield only)
            else row = 0;                     // row 1 (none)

            // Column pair per direction
            let colBase = 0;
            if (dir === 'left') colBase = 2;
            else if (dir === 'up') colBase = 4;
            else colBase = 0; // down and right
            const frameCol = (ent.animFrame || 0) % 2; // alternate while moving AND idle
            let col = colBase + frameCol;

            // Attack columns: if sheet has 12 cols, add +6 offset while attacking
            const imgBase = ent._sprite.image;
            const baseCols = (imgBase && imgBase.width) ? Math.max(1, Math.floor(imgBase.width / SPRITE_SIZE)) : 6;
            try {
              const nowSec = (typeof performance !== 'undefined' && performance.now) ? (performance.now() / 1000) : (Date.now() / 1000);
              const recentRanged = (typeof player.lastRanged === 'number') && ((nowSec - player.lastRanged) <= 0.22);
              const attackActive = !!player.attacking || recentRanged;
              if (attackActive && baseCols >= 12) col += 6;
            } catch {}

            const sx = col * SPRITE_SIZE;
            const sy = row * SPRITE_SIZE;

            // Optional: subtle 1px vertical flicker on torch rows
            try {
              const torchRow = (row === 5 || row === 6) || hasTorch;
              if (torchRow) {
                const tms = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                if ((Math.floor(tms / 100) % 2) === 0) dy -= 1; // ~10 Hz, 1px
              }
            } catch {}

            // Keep existing smooth sine bob while moving (in addition to frame toggle)
            try {
              if (ent.moving) {
                const t = (runtime && typeof runtime._timeSec === 'number') ? runtime._timeSec : (performance.now() / 1000);
                let hz = 0.5, amp = 1;
                try { if (typeof window !== 'undefined' && typeof window.PLAYER_BOB_HZ === 'number') hz = window.PLAYER_BOB_HZ; } catch {}
                try { if (typeof window !== 'undefined' && typeof window.PLAYER_BOB_AMP === 'number') amp = window.PLAYER_BOB_AMP; } catch {}
                const freq = Math.max(0, Number(hz) || 0);
                const A = Math.max(0, Number(amp) || 0);
                const bob = Math.round(Math.sin(t * Math.PI * 2 * freq) * A);
                dy += bob;
              }
            } catch {}

            // Unified invuln flicker gate for base + overlays
            const _hideThisFrame = (player.invulnTimer > 0) && ((Math.floor(performance.now() / 100) % 2) === 0);
            if (!_hideThisFrame) {
              // Base sprite
              ctx.drawImage(ent._sprite.image, sx, sy, SPRITE_SIZE, SPRITE_SIZE, dx, dy, destW, destH);
              // Armor overlays (if equipped). Draw order: legs -> torso -> head
              try {
                const eq = player?.inventory?.equipped || {};
                const drawOv = (propImg, propLoad, path) => {
                  if (!path) return;
                  if (ent[propImg] && ent[propImg].image && canDrawImage(ent[propImg].image)) {
                    // Support both 6‑col and 12‑col overlays. If overlay has only 6 columns,
                    // map attack columns (6..11) back down by -6 so armor still renders during attacks.
                    let osx = sx;
                    try {
                      const oimg = ent[propImg].image;
                      const ocols = (oimg && oimg.width) ? Math.max(1, Math.floor(oimg.width / SPRITE_SIZE)) : 6;
                      if (ocols < 12) {
                        const curCol = Math.floor(sx / SPRITE_SIZE);
                        const col6 = curCol % 6; // wrap attack to idle/walk pair
                        osx = col6 * SPRITE_SIZE;
                      }
                    } catch {}
                    ctx.drawImage(ent[propImg].image, osx, sy, SPRITE_SIZE, SPRITE_SIZE, dx, dy, destW, destH);
                  } else if (!ent[propLoad]) {
                    ent[propLoad] = true; // mark loading
                    getSprite(path)
                      .then(s => { ent[propImg] = s; ent[propLoad] = false; })
                      .catch(() => { ent[propLoad] = false; });
                  }
                };
                if (eq.legs)  drawOv('_ovLegs',  '_ovLegsLoading',  'assets/sprites/custom/leg.png');
                if (eq.torso) drawOv('_ovTorso', '_ovTorsoLoading', 'assets/sprites/custom/torso.png');
                if (eq.head)  drawOv('_ovHead',  '_ovHeadLoading',  'assets/sprites/custom/helmet.png');
              } catch {}
            }
          } else {
            if (!ent._spriteLoading) {
              ent._spriteLoading = true;
              getSprite(ent.spriteId).then(s => { ent._sprite = s; ent._spriteLoading = false; }).catch(() => { ent._spriteLoading = false; });
            }
          }
        }
      } catch {}
      continue;
    }
    const scale = d.spriteScale || 1;
    let drew = false;
    // Custom sprite path via spriteId (supports 32x32 and meta frames)
    if (d.spriteId && d.spriteRef) {
      const ent = d.spriteRef;
      if (ent._sprite && ent._sprite.image) {
        const img = ent._sprite.image;
        const meta = ent._sprite.meta || null;
        // Determine frame rect
        let fw = 32, fh = 32, sx = 0, sy = 0;
        if (meta && Array.isArray(meta.frames?.[d.dir]) && meta.frames[d.dir].length) {
          const frames = meta.frames[d.dir];
          let idx = 0;
          // If we have 3+ frames, assume [idle, walk1, walk2, ...]. Use idle when not moving,
          // and alternate walk frames when moving. Otherwise, fall back to animFrame modulo length.
          if (frames.length >= 3) {
            if (ent && ent.moving) idx = 1 + ((ent.animFrame || 0) % 2);
            else idx = 0;
          } else {
            idx = Math.max(0, (ent && typeof ent.animFrame === 'number' ? ent.animFrame : 0) % frames.length);
          }
          const fr = frames[idx];
          sx = fr.x|0; sy = fr.y|0; fw = fr.w||32; fh = fr.h||32;
        } else if (meta && meta.indices && Array.isArray(meta.indices[d.dir]) && meta.indices[d.dir].length) {
          const frames = meta.indices[d.dir];
          let idx = 0;
          if (frames.length >= 3) {
            if (ent && ent.moving) idx = 1 + ((ent.animFrame || 0) % 2);
            else idx = 0;
          } else {
            idx = Math.max(0, (ent && typeof ent.animFrame === 'number' ? ent.animFrame : 0) % frames.length);
          }
          const index1 = Math.max(1, Number(frames[idx]) || 1);
          const fw2 = (meta.w || fw || SPRITE_SIZE);
          const fh2 = (meta.h || fh || SPRITE_SIZE);
          const cols = Math.max(1, Number(meta.cols || meta.columns || Math.floor((img && img.width) ? (img.width / fw2) : 1)));
          const i0 = index1 - 1;
          const cx = i0 % cols; const cy = Math.floor(i0 / cols);
          sx = cx * fw2; sy = cy * fh2; fw = fw2; fh = fh2;
        } else {
          // Assume grid: 2 columns × 4 directions
          fw = (meta && meta.w) ? meta.w : SPRITE_SIZE;
          fh = (meta && meta.h) ? meta.h : SPRITE_SIZE;
          const row = DIRECTIONS.indexOf(d.dir);
          const col = d.frame % 2;
          sx = col * fw; sy = row * fh;
        }
        const destW = fw * scale;
        const destH = fh * scale;
        // Anchor: default bottom-center; meta.anchor in [0..1] if provided
        let ax = 0.5, ay = 1.0;
        if (meta && meta.anchor) { ax = Number(meta.anchor.x) || ax; ay = Number(meta.anchor.y) || ay; }
        let dx = Math.round(d.x + d.w/2 - ax * destW - camera.x);
        let dy = Math.round(d.y + d.h - ay * destH - camera.y);
        // If this sprite only has a single frame per direction (or none defined),
        // simulate a tiny walk bob when moving by nudging the draw Y by 1px.
        try {
          if (ent && ent.moving) {
            // Toggle a subtle 1px bob while moving (works for single- or multi-frame sheets)
            const bob = (ent.animFrame % 2 === 1) ? -1 : 0;
            dy += bob;
          }
        } catch {}
        // Boss telegraph wiggle: tiny jitter while telegraphing melee/ranged
        try {
          if (ent && String(ent.kind||'').toLowerCase() === 'boss' && ((ent._meleeTele && ent._meleeTele > 0) || (ent._shootTele && ent._shootTele > 0))) {
            const t = (runtime && typeof runtime._timeSec === 'number') ? runtime._timeSec : (performance.now() / 1000);
            dx += Math.sin(t * 22) * 1.0;
            dy += Math.cos(t * 20) * 0.6;
          }
        } catch {}
        // Boss outline (gold) around sprite
        if (ent && String(ent.kind).toLowerCase() === 'boss') {
          drawBossOutline(img, sx, sy, fw, fh, dx, dy, destW, destH, '#ffd166');
        }
        if (d.isPlayer && player.invulnTimer > 0) {
          const flicker = Math.floor(performance.now() / 100) % 2 === 0;
          if (!flicker) ctx.drawImage(img, sx, sy, fw, fh, dx, dy, destW, destH);
        } else {
          ctx.drawImage(img, sx, sy, fw, fh, dx, dy, destW, destH);
        }
        drew = true;
      } else {
        if (!ent._spriteLoading) {
          ent._spriteLoading = true;
          getSprite(ent.spriteId).then(s => { ent._sprite = s; ent._spriteLoading = false; }).catch(() => { ent._spriteLoading = false; });
        }
        // For the player, do not draw legacy fallback — go all-in on custom sprite
        // For others, allow fallback while loading.
        drew = !!d.isPlayer;
      }
    }
    if (!drew) {
      // Legacy sheet path (16x16 grid)
      const row = DIRECTIONS.indexOf(d.dir);
      const sx = d.frame * SPRITE_SIZE;
      const sy = row * SPRITE_SIZE;
      const destW = SPRITE_SIZE * scale;
      const destH = SPRITE_SIZE * scale;
      let dx = Math.round(d.x - (destW - d.w) / 2 - camera.x);
      let dy = Math.round(d.y - (destH - d.h) - camera.y);
      // Choose a safe source image if the provided sheet is missing/invalid
      const srcSheet = canDrawImage(d.sheet) ? d.sheet : (d.isPlayer ? playerSheet : enemySheet || npcSheet);
      // Boss outline (gold) around sprite
      if (d.spriteRef && String(d.spriteRef.kind).toLowerCase() === 'boss' && canDrawImage(srcSheet)) {
        drawBossOutline(srcSheet, sx, sy, SPRITE_SIZE, SPRITE_SIZE, dx, dy, destW, destH, '#ffd166');
      }
      // Boss telegraph wiggle (legacy sheet path)
      try {
        const ent = d.spriteRef;
        if (ent && String(ent.kind||'').toLowerCase() === 'boss' && ((ent._meleeTele && ent._meleeTele > 0) || (ent._shootTele && ent._shootTele > 0))) {
          const t = (runtime && typeof runtime._timeSec === 'number') ? runtime._timeSec : (performance.now() / 1000);
          dx += Math.sin(t * 22) * 1.0;
          dy += Math.cos(t * 20) * 0.6;
        }
      } catch {}
      if (d.isPlayer && player.invulnTimer > 0) {
        const flicker = Math.floor(performance.now() / 100) % 2 === 0; // ~10 Hz
        if (!flicker && canDrawImage(srcSheet)) ctx.drawImage(srcSheet, sx, sy, SPRITE_SIZE, SPRITE_SIZE, dx, dy, destW, destH);
      } else {
        if (canDrawImage(srcSheet)) ctx.drawImage(srcSheet, sx, sy, SPRITE_SIZE, SPRITE_SIZE, dx, dy, destW, destH);
      }
    }
  }

  // Debug: draw enemy markers when enabled
  try {
    if (window && window.DEBUG_ENEMIES && enemies && enemies.length) {
      ctx.save();
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      for (const e of enemies) {
        if (!e || e.hp <= 0) continue;
        const sx = Math.round(e.x + e.w/2 - camera.x);
        const sy = Math.round(e.y + e.h/2 - camera.y);
        ctx.fillStyle = '#ff4a4a';
        ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#ffd166';
        const label = (e.name || e.kind || 'enemy');
        ctx.fillText(label, sx + 4, sy + 2);
        if (e.spawnerId) {
          ctx.fillStyle = '#9ae6ff';
          ctx.fillRect(sx - 2, sy + 8, 4, 4); // small cyan square for spawner-spawned enemies
          ctx.fillStyle = '#9ae6ff';
          ctx.fillText('S', sx + 10, sy + 2);
        }
      }
      ctx.restore();
    }
  } catch {}

  // Enemy health bars (overlay)
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    drawBar(e.x - 2 - camera.x, e.y - 4 - camera.y, e.w + 4, 2, e.hp / e.maxHp, '#ff5555');
    // Boss telegraph overlays
    try {
      if (String(e.kind||'').toLowerCase() === 'boss') {
        const cx = Math.round(e.x + e.w/2 - camera.x);
        const cy = Math.round(e.y + e.h/2 - camera.y);
        // Melee telegraph ring — subtle, filled, low opacity
        if (e._meleeTele && e._meleeTele > 0) {
          ctx.save();
          const t = Math.max(0, Math.min(1, e._meleeTele / 0.2));
          const rBase = Math.max(12, Math.floor(Math.max(e.w, e.h) / 2) + 4);
          const r = rBase + (1 - t) * 3;
          ctx.globalAlpha = 0.12; // low opacity
          ctx.fillStyle = '#ff9a3d';
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        // Ranged telegraph aim line
        if (e._shootTele && e._shootTele > 0) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255,154,61,0.75)';
          ctx.lineWidth = 1.5;
          let ang = e._shootAim;
          if (typeof ang !== 'number') {
            const px = player.x + player.w/2 - camera.x, py = player.y + player.h/2 - camera.y;
            ang = Math.atan2(py - cy, px - cx);
          }
          const len = 24;
          const ex = cx + Math.cos(ang) * len, ey = cy + Math.sin(ang) * len;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
          ctx.restore();
        }
      }
    } catch {}
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
    // Boss marker removed; keep glow only
    // Debug tactics overlay
    try {
      if (window && (window.DEBUG_TACTICS || window.DEBUG_ENEMIES)) {
        const sx = Math.round(e.x + e.w/2 - camera.x);
        const sy = Math.round(e.y - 14 - camera.y);
        ctx.save();
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = '#eaeaea';
        const tags = [];
        if (e._dashTelegraph && e._dashTelegraph > 0) tags.push(`Dash*${e._dashTelegraph.toFixed(2)}`);
        else if (e._dashTimer && e._dashTimer > 0) tags.push(`Dash ${e._dashTimer.toFixed(2)}`);
        if (e._jukeTimer && e._jukeTimer > 0) tags.push(`Juke ${e._jukeTimer.toFixed(2)}`);
        if (e._coverTimer && e._coverTimer > 0) tags.push(`Cover ${e._coverTimer.toFixed(2)}`);
        if (e._braceTimer && e._braceTimer > 0) tags.push(`Brace ${e._braceTimer.toFixed(2)}`);
        if (e._advanceTimer && e._advanceTimer > 0) tags.push(`Advance ${e._advanceTimer.toFixed(2)}`);
        if (tags.length) {
          const txt = tags.join(' | ');
          ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeText(txt, sx, sy);
          ctx.fillText(txt, sx, sy);
        }
        ctx.restore();
      }
    } catch {}
  }

  // Lighting overlay: coarse, tile-based darkness over world only (not UI)
  try {
    const L = runtime.lighting || null;
    if (L && L.grid && typeof L._w === 'number' && typeof L._h === 'number') {
      const gx = Math.max(0, Math.floor(camera.x / TILE));
      const gy = Math.max(0, Math.floor(camera.y / TILE));
      const gw = Math.min(L._w, Math.ceil((camera.x + camera.w) / TILE)) - gx;
      const gh = Math.min(L._h, Math.ceil((camera.y + camera.h) / TILE)) - gy;
      // Precompute which visible tiles contain a rock so they remain slightly visible in darkness
      const rockTiles = new Set();
      try {
        for (const o of obstacles || []) {
          if (!o || o.type !== 'rock') continue;
          // Skip rocks outside the view bounds for speed
          if (o.x > camera.x + camera.w || o.x + o.w < camera.x || o.y > camera.y + camera.h || o.y + o.h < camera.y) continue;
          const tx0 = Math.max(gx, Math.floor(o.x / TILE));
          const ty0 = Math.max(gy, Math.floor(o.y / TILE));
          const tx1 = Math.min(gx + gw - 1, Math.floor((o.x + o.w - 1) / TILE));
          const ty1 = Math.min(gy + gh - 1, Math.floor((o.y + o.h - 1) / TILE));
          for (let ty = ty0; ty <= ty1; ty++) {
            for (let tx = tx0; tx <= tx1; tx++) rockTiles.add(ty * L._w + tx);
          }
        }
      } catch {}
      // Draw per-tile dark quads with alpha based on inverse light level
      for (let ty = 0; ty < gh; ty++) {
        for (let tx = 0; tx < gw; tx++) {
          const gidx = (gy + ty) * L._w + (gx + tx);
          const lv = L.grid[gidx] | 0;
          const darkness = Math.max(0, Math.min(1, 1 - (lv / (MAX_LIGHT_LEVEL || 1))));
          // Slight cap so brightest tiles still have a tiny film; tune as desired
          let alpha = Math.min(0.85, darkness * 0.85);
          // Keep rocks slightly visible near light, but not in total darkness
          // Only reduce darkness on rock tiles if there is some light on that tile
          if (rockTiles.has(gidx) && lv > 0) alpha = Math.min(alpha, 0.55);
          if (alpha <= 0.01) continue;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#000000';
          const px = gx * TILE + tx * TILE - camera.x;
          const py = gy * TILE + ty * TILE - camera.y;
          ctx.fillRect(Math.round(px), Math.round(py), TILE, TILE);
        }
      }
      ctx.globalAlpha = 1;
    }
  } catch {}

  // End world shake translate before UI overlay
  ctx.restore();

  // Low-HP screen treatment: gray desaturation + red edge vignette
  try {
    const ratio = Math.max(0, Math.min(1, player.hp / Math.max(1, player.maxHp || 10)));
    const thresh = 0.35;
    if (ratio <= thresh) {
      const t = runtime._timeSec || 0;
      const k = Math.max(0, Math.min(1, (thresh - ratio) / thresh));
      // Soft gray overlay (does not affect UI)
      // Stronger gray wash as HP drops (up to ~75%)
      const grayAlpha = Math.max(0, Math.min(0.75, 0.25 + 0.50 * k));
      ctx.save();
      ctx.globalAlpha = grayAlpha;
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, camera.w, camera.h);
      ctx.restore();

      // Red edge vignette with subtle pulse
      const pulse = 0.85 + 0.15 * Math.sin(t * 6);
      // Stronger red as HP gets lower; ease-in for responsiveness
      const edgeBase = 0.15, edgeMax = 0.85;
      const eased = Math.pow(k, 0.8);
      const edgeA = Math.max(0, Math.min(1, (edgeBase + (edgeMax - edgeBase) * eased) * pulse));
      const minDim = Math.min(camera.w, camera.h);
      const thick = Math.max(24, Math.floor(minDim * (0.10 + 0.10 * k)));

      // Top
      let g = ctx.createLinearGradient(0, 0, 0, thick);
      g.addColorStop(0, `rgba(255,74,74,${edgeA})`);
      g.addColorStop(1, 'rgba(255,74,74,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, camera.w, thick);
      // Bottom
      g = ctx.createLinearGradient(0, camera.h - thick, 0, camera.h);
      g.addColorStop(0, 'rgba(255,74,74,0)');
      g.addColorStop(1, `rgba(255,74,74,${edgeA})`);
      ctx.fillStyle = g; ctx.fillRect(0, camera.h - thick, camera.w, thick);
      // Left
      g = ctx.createLinearGradient(0, 0, thick, 0);
      g.addColorStop(0, `rgba(255,74,74,${edgeA})`);
      g.addColorStop(1, 'rgba(255,74,74,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, thick, camera.h);
      // Right
      g = ctx.createLinearGradient(camera.w - thick, 0, camera.w, 0);
      g.addColorStop(0, 'rgba(255,74,74,0)');
      g.addColorStop(1, `rgba(255,74,74,${edgeA})`);
      ctx.fillStyle = g; ctx.fillRect(camera.w - thick, 0, thick, camera.h);
    }
  } catch {}
  // DOM HUD Bars: HP/XP/Torch
  try {
    const hpBar = document.getElementById('hp-bar')?.querySelector('.fill');
    const hpRow = document.getElementById('hp-row');
    const hpRatio = Math.max(0, Math.min(1, player.hp / Math.max(1, player.maxHp)));
    if (hpBar) hpBar.style.width = `${Math.round(hpRatio * 100)}%`;
    if (hpRow) {
      if (hpRatio <= 0.35) hpRow.classList.add('low'); else hpRow.classList.remove('low');
    }
    const need = xpToNext(Math.max(1, player.level || 1));
    const cur = Math.max(0, player.xp || 0);
    const xpPct = Math.max(0, Math.min(1, need > 0 ? (cur / need) : 0));
    const xpBar = document.getElementById('xp-bar')?.querySelector('.fill');
    if (xpBar) xpBar.style.width = `${Math.round(xpPct * 100)}%`;
    const torchRow = document.getElementById('torch-row');
    const torchBar = document.getElementById('torch-bar')?.querySelector('.fill');
    let torchPct = 0; let torchVisible = false;
    // Companion torch bearer
    if ((runtime._torchBurnMs || 0) > 0 && runtime._torchBearerRef) {
      torchPct = Math.max(0, Math.min(1, (runtime._torchBurnMs || 0) / 180000));
      torchVisible = true;
    } else {
      // Player torch
      const LH = player?.inventory?.equipped?.leftHand || null;
      if (LH && LH.id === 'torch') {
        const left = Math.max(0, Number(LH.burnMsRemaining || 0));
        torchPct = Math.max(0, Math.min(1, left / 180000));
        torchVisible = true;
      }
    }
    if (torchBar) torchBar.style.width = `${Math.round(torchPct * 100)}%`;
    if (torchRow) torchRow.style.display = torchVisible ? '' : 'none';
  } catch {}
  // DOM HUD (sharp text): update Lv and Arrows labels
  try {
    const lvlChip = document.getElementById('hud-level-chip');
    if (lvlChip) {
      const lv = Math.max(1, player.level || 1);
      const want = `Lv ${lv}`;
      if (lvlChip.textContent !== want) lvlChip.textContent = want;
    }
    const ammoEl = document.getElementById('hud-ammo');
    if (ammoEl) {
      const inv = player?.inventory?.items || [];
      let arrows = 0;
      for (const it of inv) { if (it && it.stackable && it.id === 'arrow_basic') arrows += (it.qty || 0); }
      const want = `Arrows: ${arrows}`;
      if (ammoEl.textContent !== want) ammoEl.textContent = want;
      ammoEl.classList.toggle('muted', arrows === 0);
      try {
        const pulsing = typeof runtime._ammoPulseUntil === 'number' && (runtime._timeSec || 0) < runtime._ammoPulseUntil;
        ammoEl.classList.toggle('pulse', !!pulsing);
      } catch {}
    }
    const torchEl = document.getElementById('hud-torch');
    if (torchEl) {
      // Show bearer torch if present, else show player torch if equipped
      let label = '';
      try {
        if (runtime._torchBearerRef && (runtime._torchBurnMs || 0) > 0) {
          const ms = Math.max(0, Math.floor(runtime._torchBurnMs));
          const mm = Math.floor(ms / 60000); const ss = Math.floor((ms % 60000) / 1000);
          const name = runtime._torchBearerRef.name || 'Companion';
          label = `Torch: ${name} ${mm}:${ss.toString().padStart(2,'0')}`;
        } else if (player?.inventory?.equipped?.leftHand && player.inventory.equipped.leftHand.id === 'torch') {
          const left = Math.max(0, Number(player.inventory.equipped.leftHand.burnMsRemaining || 0));
          const mm = Math.floor(left / 60000); const ss = Math.floor((left % 60000) / 1000);
          label = `Torch: You ${mm}:${ss.toString().padStart(2,'0')}`;
        } else {
          label = '';
        }
      } catch { label = ''; }
      torchEl.textContent = label;
      torchEl.style.display = label ? '' : 'none';
    }
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

  // Tutorial markers (e.g., Level 1 sword chest)
  drawTutorialMarkers(obstacles);
  
  // Update coordinate display in HTML
  const coordsEl = document.getElementById('coords');
  if (coordsEl) {
    const tileX = Math.floor(player.x / 16);
    const tileY = Math.floor(player.y / 16);
    coordsEl.textContent = `(${tileX}, ${tileY})`;
  }
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
      case 'twil_fuse': return '#ffd166';
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

function drawTutorialMarkers(obstacles) {
  try {
    if (!runtime || !runtime.questFlags) return;
    if (!runtime.questFlags['tutorial_find_sword']) return;
    if ((runtime.currentLevel || 1) !== 1) return;
    // Find the Level 1 weapon chest
    const chest = obstacles && obstacles.find && obstacles.find(o => o && o.type === 'chest' && o.id === 'chest_l1_weapon' && !o.opened);
    if (!chest) return;
    const tx = chest.x + chest.w / 2 - camera.x;
    const ty = chest.y + chest.h / 2 - camera.y;
    const margin = 12;
    const inView = tx >= 0 && tx <= camera.w && ty >= 0 && ty <= camera.h;
    ctx.save();
    ctx.fillStyle = '#ffd166';
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
  } catch {}
}

function drawItemIcon(x, y, item) {
  ctx.save();
  // Subtle bob so pickups stand out
  const t = (runtime?._timeSec || 0);
  const bob = Math.round(Math.sin((t * 3.0) + (x * 0.05) + (y * 0.03)) * 1.5);
  const bx = x, by = y + bob;
  ctx.globalAlpha = 1.0;
  // Determine type and colors
  const isKey = !!item?.keyId;
  const slot = String(item?.slot || '').toLowerCase();
  const id = String(item?.id || '').toLowerCase();
  let color = '#8ab4ff'; let accent = '#eaeaea';
  if (isKey) { color = '#ffd166'; accent = '#7a4a1a'; }
  else if (slot === 'rightHand') { color = '#8ab4ff'; accent = '#3a5a9a'; }
  else if (slot === 'leftHand') { color = '#ffb366'; accent = '#a65a1a'; }
  else if (slot === 'head') { color = '#c9c9c9'; accent = '#7f7f7f'; }
  else if (slot === 'torso') { color = '#9ad19a'; accent = '#3a6b3a'; }
  else if (slot === 'legs') { color = '#b8a16a'; accent = '#6b5a2a'; }
  // Icon shapes
  const drawSword = () => {
    // blade (diagonal) — keep this look but smaller
    ctx.strokeStyle = '#cfd8ff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(bx + 3, by + 3); ctx.lineTo(bx + 9, by + 9); ctx.stroke();
    // guard
    ctx.strokeStyle = '#6b7bb8'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(bx + 5, by + 6); ctx.lineTo(bx + 7, by + 4); ctx.stroke();
    // hilt
    ctx.strokeStyle = '#414a6b'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(bx + 2, by + 4); ctx.lineTo(bx + 4, by + 6); ctx.stroke();
  };
  const drawTorch = () => {
    // handle
    ctx.fillStyle = '#8b5a2b'; ctx.fillRect(bx + 5, by + 7, 2, 4);
    // flame
    ctx.beginPath(); ctx.fillStyle = '#ffcc66'; ctx.arc(bx + 6, by + 6, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.fillStyle = '#ffa41a'; ctx.arc(bx + 6, by + 5, 1.6, 0, Math.PI * 2); ctx.fill();
  };
  const drawShield = () => {
    ctx.fillStyle = '#a6c1ff'; ctx.fillRect(bx + 4, by + 5, 6, 6);
    ctx.strokeStyle = '#2f4a8a'; ctx.lineWidth = 1; ctx.strokeRect(bx + 4, by + 5, 6, 6);
    ctx.fillStyle = '#2f4a8a'; ctx.fillRect(bx + 6, by + 7, 1, 1);
  };
  const drawHelm = () => {
    ctx.fillStyle = color; ctx.fillRect(bx + 4, by + 6, 6, 3);
    ctx.fillStyle = accent; ctx.fillRect(bx + 3, by + 8, 8, 1.5);
  };
  const drawChest = () => {
    ctx.fillStyle = color; ctx.fillRect(bx + 4, by + 6, 6, 7);
    ctx.fillStyle = accent; ctx.fillRect(bx + 5, by + 9, 4, 1);
  };
  const drawKey = () => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(bx + 5, by + 6, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(bx + 7, by + 5, 4, 1.5); ctx.fillRect(bx + 10, by + 6.5, 1.5, 1.5);
  };
  const drawPotion = (strength) => {
    // bottle
    ctx.fillStyle = '#eaeaea'; ctx.fillRect(bx + 5, by + 6, 5, 6);
    ctx.fillStyle = '#bdbdbd'; ctx.fillRect(bx + 6, by + 5, 3, 1.5); // neck
    // liquid color by strength
    const liq = (strength === 'light') ? '#68e873' : (strength === 'medium') ? '#59b0ff' : '#ff5a7a';
    ctx.fillStyle = liq; ctx.fillRect(bx + 5, by + 9, 5, 3);
    // highlight
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(bx + 7, by + 8, 1, 1);
  };
  const drawGeneric = () => {
    ctx.fillStyle = color; ctx.fillRect(bx + 4, by + 4, 6, 6);
    ctx.fillStyle = accent; ctx.fillRect(bx + 5, by + 6, 4, 1);
  };
  // Routing: keys, potions, weapons, shields, armor, generic
  if (isKey) drawKey();
  else if (id === 'potion_light') drawPotion('light');
  else if (id === 'potion_medium') drawPotion('medium');
  else if (id === 'potion_strong') drawPotion('strong');
  else if (id.includes('arrow')) drawSword();
  else if (slot === 'righthand') drawSword();
  else if (slot === 'lefthand') { if (id === 'torch') drawTorch(); else drawShield(); }
  else if (slot === 'head') drawHelm();
  else if (slot === 'torso') drawChest();
  else drawGeneric();
  // No backdrop/halo/border — keep world clean
  ctx.restore();
}
