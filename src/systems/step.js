import { player, enemies, companions, npcs, obstacles, world, camera, runtime, corpses, spawnCorpse, stains, spawnStain, floaters, spawnFloatText, sparkles, spawnSparkle } from '../engine/state.js';
import { companionEffectsByKey, COMPANION_BUFF_CAPS } from '../data/companion_effects.js';
import { playSfx } from '../engine/audio.js';
import { FRAMES_PER_DIR } from '../engine/constants.js';
import { rectsIntersect, getEquipStats } from '../engine/utils.js';
import { handleAttacks } from './combat.js';
import { startGameOver } from '../engine/dialog.js';
import { saveGame } from '../engine/save.js';
import { showBanner, updateBuffBadges } from '../engine/ui.js';

function moveWithCollision(ent, dx, dy, solids = []) {
  // Move X
  if (dx !== 0) {
    let newX = ent.x + dx;
    const rect = { x: newX, y: ent.y, w: ent.w, h: ent.h };
    for (const o of obstacles) {
      if (o && o.type === 'gate' && o.locked === false) continue;
      if (rectsIntersect(rect, o)) {
        if (dx > 0) newX = Math.min(newX, o.x - ent.w);
        else newX = Math.max(newX, o.x + o.w);
        rect.x = newX;
      }
    }
    // dynamic solids
    for (const o of solids) {
      if (!o || o === ent) continue;
      if (rectsIntersect(rect, o)) {
        if (dx > 0) newX = Math.min(newX, o.x - ent.w);
        else newX = Math.max(newX, o.x + o.w);
        rect.x = newX;
      }
    }
    ent.x = newX;
  }
  // Move Y
  if (dy !== 0) {
    let newY = ent.y + dy;
    const rect = { x: ent.x, y: newY, w: ent.w, h: ent.h };
    for (const o of obstacles) {
      if (o && o.type === 'gate' && o.locked === false) continue;
      if (rectsIntersect(rect, o)) {
        if (dy > 0) newY = Math.min(newY, o.y - ent.h);
        else newY = Math.max(newY, o.y + o.h);
        rect.y = newY;
      }
    }
    for (const o of solids) {
      if (!o || o === ent) continue;
      if (rectsIntersect(rect, o)) {
        if (dy > 0) newY = Math.min(newY, o.y - ent.h);
        else newY = Math.max(newY, o.y + o.h);
        rect.y = newY;
      }
    }
    ent.y = newY;
  }
  // Clamp to world
  ent.x = Math.max(0, Math.min(world.w - ent.w, ent.x));
  ent.y = Math.max(0, Math.min(world.h - ent.h, ent.y));
}

// Resolve overlap between two AABBs by moving them apart along the shallow axis.
function separateEntities(a, b, biasA = 0.6) {
  const ar = { x: a.x, y: a.y, w: a.w, h: a.h };
  const br = { x: b.x, y: b.y, w: b.w, h: b.h };
  const intersect = ar.x < br.x + br.w && ar.x + ar.w > br.x && ar.y < br.y + br.h && ar.y + ar.h > br.y;
  if (!intersect) return false;
  const overlapX = Math.min(ar.x + ar.w - br.x, br.x + br.w - ar.x);
  const overlapY = Math.min(ar.y + ar.h - br.y, br.y + br.h - ar.y);
  const eps = 0.6; // push slightly beyond to ensure separation
  if (overlapX < overlapY) {
    const dir = (ar.x + ar.w / 2) < (br.x + br.w / 2) ? -1 : 1; // a is left => push left
    const total = overlapX + eps;
    const ax = dir * total * biasA;
    const bx = -dir * total * (1 - biasA);
    moveWithCollision(a, ax, 0);
    moveWithCollision(b, bx, 0);
  } else {
    const dir = (ar.y + ar.h / 2) < (br.y + br.h / 2) ? -1 : 1; // a is above => push up
    const total = overlapY + eps;
    const ay = dir * total * biasA;
    const by = -dir * total * (1 - biasA);
    moveWithCollision(a, 0, ay);
    moveWithCollision(b, 0, by);
  }
  return true;
}

function rectsTouchOrOverlap(a, b, pad = 2.0) {
  return (
    a.x < b.x + b.w + pad &&
    a.x + a.w > b.x - pad &&
    a.y < b.y + b.h + pad &&
    a.y + a.h > b.y - pad
  );
}

export function step(dt) {
  // Pause the world while VN/inventory overlay is open
  if (runtime.gameState === 'chat') {
    return;
  }
  // Decay interaction lock (prevents chatting immediately after taking damage)
  if (runtime.interactLock > 0) {
    runtime.interactLock = Math.max(0, runtime.interactLock - dt);
  }
  // Decay player invulnerability timer
  if (player.invulnTimer > 0) player.invulnTimer = Math.max(0, player.invulnTimer - dt);
  // Autosave timer
  if (runtime.autosaveEnabled) {
    runtime.autosaveTimer += dt;
    if (runtime.autosaveTimer >= runtime.autosaveIntervalSec) {
      runtime.autosaveTimer = 0;
      saveGame(1);
      showBanner('Autosaved');
    }
  }
  // Input axes
  let ax = 0, ay = 0;
  const keys = runtime.keys;
  if (keys.has('arrowleft') || keys.has('a')) ax -= 1;
  if (keys.has('arrowright') || keys.has('d')) ax += 1;
  if (keys.has('arrowup') || keys.has('w')) ay -= 1;
  if (keys.has('arrowdown') || keys.has('s')) ay += 1;
  if (ax !== 0 && ay !== 0) { const inv = 1/Math.sqrt(2); ax *= inv; ay *= inv; }

  // Aggregate companion auras and process companion triggers before combat/movement
  applyCompanionAuras(dt);
  handleCompanionTriggers(dt);

  const hasInput = (ax !== 0 || ay !== 0);
  const hasKnock = Math.abs(player.knockbackX) > 0.01 || Math.abs(player.knockbackY) > 0.01;
  // Only enemies are solid for the player (companions/NPCs pass-through)
  const solidsForPlayer = enemies.filter(e => e.hp > 0);
  // Apply knockback first (does not block input)
  if (hasKnock) {
    moveWithCollision(player, player.knockbackX * dt, player.knockbackY * dt, solidsForPlayer);
    player.knockbackX *= Math.pow(0.001, dt);
    player.knockbackY *= Math.pow(0.001, dt);
  }
  // Then apply input movement
  if (hasInput) {
    const dx = ax * player.speed * dt;
    const dy = ay * player.speed * dt;
    moveWithCollision(player, dx, dy, solidsForPlayer);
  }
  // Direction preference: input > knockback
  if (hasInput) {
    if (Math.abs(ax) > Math.abs(ay)) player.dir = ax < 0 ? 'left' : 'right';
    else if (ay !== 0) player.dir = ay < 0 ? 'up' : 'down';
  } else if (hasKnock) {
    const dx = player.knockbackX, dy = player.knockbackY;
    if (Math.abs(dx) > Math.abs(dy)) player.dir = dx < 0 ? 'left' : 'right';
    else if (dy !== 0) player.dir = dy < 0 ? 'up' : 'down';
  }
  // Anim state
  player.moving = hasInput || hasKnock;
  if (player.moving) {
    player.animTime += dt; if (player.animTime > 0.18) { player.animTime = 0; player.animFrame = (player.animFrame + 1) % FRAMES_PER_DIR; }
  } else { player.animTime = 0; player.animFrame = 0; }

  // Attacks
  handleAttacks(dt);

  // Enemies AI
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    // Enemies collide with player and other enemies; pass through companions/NPCs
    const solidsForEnemy = [player, ...enemies.filter(x => x !== e && x.hp > 0)];
    if (Math.abs(e.knockbackX) > 0.01 || Math.abs(e.knockbackY) > 0.01) {
      const mul = (e._slowMul || 1) * ((e._gustSlowTimer && e._gustSlowTimer > 0) ? (1 - 0.25) : 1);
      moveWithCollision(e, e.knockbackX * dt * mul, e.knockbackY * dt * mul, solidsForEnemy);
      e.knockbackX *= Math.pow(0.001, dt); e.knockbackY *= Math.pow(0.001, dt);
    } else {
      e.knockbackX = 0; e.knockbackY = 0;
      let dx = (player.x - e.x), dy = (player.y - e.y);
      const dist = Math.hypot(dx, dy) || 1; dx/=dist; dy/=dist;
      const oldX = e.x, oldY = e.y;
      const mul = (e._slowMul || 1) * ((e._gustSlowTimer && e._gustSlowTimer > 0) ? (1 - 0.25) : 1);
      moveWithCollision(e, dx * e.speed * mul * dt, dy * e.speed * mul * dt, solidsForEnemy);
      let moved = Math.hypot(e.x - oldX, e.y - oldY);
      // Axis fallback if stuck
      if (moved < 0.05) {
        e.x = oldX; e.y = oldY;
        moveWithCollision(e, dx * e.speed * dt, 0, solidsForEnemy);
        moved = Math.hypot(e.x - oldX, e.y - oldY);
        if (moved < 0.05) {
          e.x = oldX; e.y = oldY;
          moveWithCollision(e, 0, dy * e.speed * dt, solidsForEnemy);
          moved = Math.hypot(e.x - oldX, e.y - oldY);
        }
      }
      // Perpendicular sidestep if still stuck
      if (moved < 0.05) {
        e.x = oldX; e.y = oldY;
        const px = -dy * e.avoidSign;
        const py = dx * e.avoidSign;
        moveWithCollision(e, px * e.speed * 0.7 * dt, py * e.speed * 0.7 * dt, solidsForEnemy);
        moved = Math.hypot(e.x - oldX, e.y - oldY);
      }

      e.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left':'right') : (dy < 0 ? 'up':'down');
      e.animTime += dt; if (e.animTime > 0.22) { e.animTime = 0; e.animFrame = (e.animFrame + 1) % FRAMES_PER_DIR; }
      // Flip avoidance side if stuck for too long
      if (moved < 0.1) { e.stuckTime += dt; if (e.stuckTime > 0.6) { e.avoidSign *= -1; e.stuckTime = 0; } }
      else e.stuckTime = 0;
    }
    e.x = Math.max(0, Math.min(world.w - e.w, e.x));
    e.y = Math.max(0, Math.min(world.h - e.h, e.y));
    e.hitTimer -= dt; if (e.hitTimer < 0) e.hitTimer = 0;
    if (e._gustSlowTimer && e._gustSlowTimer > 0) e._gustSlowTimer = Math.max(0, e._gustSlowTimer - dt);
    if (e.hitTimer === 0) {
      const pr = { x: player.x, y: player.y, w: player.w, h: player.h };
      const er = { x: e.x, y: e.y, w: e.w, h: e.h };
      if (rectsTouchOrOverlap(pr, er, 2.0)) {
        // If they actually overlap, separate just enough but still allow contact
        if (rectsIntersect(pr, er)) separateEntities(player, e, 0.65);
        // Overworld realtime damage on contact; apply armor DR
        if (player.invulnTimer <= 0) {
          const dr = (getEquipStats(player).dr || 0) + (runtime?.combatBuffs?.dr || 0) + (runtime?.combatBuffs?.touchDR || 0);
          const raw = e.touchDamage || 1;
          let taken = Math.max(0, raw - dr);
          if (runtime.shieldActive && taken > 0) {
            taken = 0;
            runtime.shieldActive = false;
          }
          e.hitTimer = e.hitCooldown;
          if (taken > 0) {
            player.hp = Math.max(0, player.hp - taken);
            // Minimal or no knockback; keep player controllable
            player.knockbackX = 0;
            player.knockbackY = 0;
            // Invincibility window and light interaction lock
            player.invulnTimer = 0.6;
            runtime.interactLock = Math.max(runtime.interactLock, 0.2);
            // Damage feedback
            spawnFloatText(player.x + player.w/2, player.y - 6, `-${taken}`, { color: '#ff7a7a', life: 0.7 });
            playSfx('hit');
          } else {
            // Blocked hit feedback
            spawnFloatText(player.x + player.w/2, player.y - 6, 'Blocked', { color: '#a8c6ff', life: 0.7 });
            playSfx('block');
          }
        }
      }
    }
  }

  // Remove defeated enemies to avoid any lingering collision feel
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].hp <= 0) {
      const e = enemies[i];
      spawnCorpse(e.x, e.y, { dir: e.dir, kind: e.kind || 'enemy', life: 1.8, sheet: e.sheet || null });
      spawnStain(e.x, e.y, { life: 2.8 });
      enemies.splice(i, 1);
    }
  }

  // Update corpses timers and purge when faded
  for (let i = corpses.length - 1; i >= 0; i--) {
    const c = corpses[i];
    c.t += dt;
    if (c.t >= c.life) corpses.splice(i, 1);
  }
  // Update stains timers and purge when faded
  for (let i = stains.length - 1; i >= 0; i--) {
    const s = stains[i];
    s.t += dt;
    if (s.t >= s.life) stains.splice(i, 1);
  }
  // Update floating text timers
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.t += dt;
    if (f.t >= f.life) floaters.splice(i, 1);
  }
  // Update healing sparkles
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const p = sparkles[i];
    p.t += dt;
    p.x += (p.vx || 0) * dt;
    p.y += (p.vy || -15) * dt;
    if (p.t >= p.life) sparkles.splice(i, 1);
  }

  // Companions follow
  for (let i = 0; i < companions.length; i++) {
    const c = companions[i];
    const leader = i === 0 ? player : companions[i - 1];
    const desired = 14;
    let dx = (leader.x - c.x), dy = (leader.y - c.y);
    const dist = Math.hypot(dx, dy) || 1;
    c.moving = dist > desired + 0.5;
    if (c.moving) {
      const move = Math.min(c.speed * dt, Math.max(0, dist - desired));
      dx/=dist; dy/=dist; 
      // Companions pass-through; only static obstacles block them
      moveWithCollision(c, dx*move, dy*move, []);
      c.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left':'right') : (dy < 0 ? 'up':'down');
      c.animTime += dt; if (c.animTime > 0.2) { c.animTime = 0; c.animFrame = (c.animFrame + 1) % FRAMES_PER_DIR; }
      // Track stuck time to allow warp when blocked by maze-like walls (no pathfinding)
      const movedNow = move; // approx intended move length
      if (!c._lastPos) c._lastPos = { x: c.x, y: c.y };
      const actualMoved = Math.hypot(c.x - c._lastPos.x, c.y - c._lastPos.y);
      c._lastPos.x = c.x; c._lastPos.y = c.y;
      if (actualMoved < 0.2) c._stuckTime = (c._stuckTime || 0) + dt; else c._stuckTime = 0;
      // If very stuck and far from leader, warp near leader to avoid companions piling up on walls/gates
      if ((c._stuckTime || 0) > 0.9 && dist > 60) {
        tryWarpNear(leader, c);
        c._stuckTime = 0;
      }
    } else { c.animTime = 0; c.animFrame = 0; }
    c.x = Math.max(0, Math.min(world.w - c.w, c.x));
    c.y = Math.max(0, Math.min(world.h - c.h, c.y));
  }

  // NPC idle
  for (const n of npcs) { n.idleTime += dt; if (n.idleTime > 0.6) { n.idleTime = 0; n.animFrame = (n.animFrame + 1) % FRAMES_PER_DIR; } }

  // Death check → Game Over
  if (!runtime.gameOver && player.hp <= 0) {
    startGameOver();
  }

  // Camera follow
  camera.x = Math.round(player.x + player.w/2 - camera.w/2);
  camera.y = Math.round(player.y + player.h/2 - camera.h/2);
  camera.x = Math.max(0, Math.min(world.w - camera.w, camera.x));
  camera.y = Math.max(0, Math.min(world.h - camera.h, camera.y));
}

function applyCompanionAuras(dt) {
  // Reset buffs
  const buffs = runtime.combatBuffs;
  buffs.atk = 0; buffs.dr = 0; buffs.regen = 0; buffs.range = 0; buffs.touchDR = 0;
  // Prepare per-enemy slow accumulation
  const slowAccum = new Array(enemies.length).fill(0);
  // Iterate companions
  for (let i = 0; i < companions.length; i++) {
    const c = companions[i];
    const key = (c.name || '').toLowerCase();
    const def = companionEffectsByKey[key];
    if (!def || !def.auras) continue;
    for (const a of def.auras) {
      switch (a.type) {
        case 'atk': buffs.atk += a.value || 0; break;
        case 'dr': buffs.dr += a.value || 0; break;
        case 'regen': buffs.regen += a.value || 0; break;
        case 'range': buffs.range += a.value || 0; break;
        case 'touchDR': buffs.touchDR += a.value || 0; break;
        case 'slow': {
          const rad = a.radius || 0;
          if (rad > 0) {
            // Anchor: player by default, can be 'self'
            const ax = (a.anchor === 'self') ? c.x : player.x;
            const ay = (a.anchor === 'self') ? c.y : player.y;
            for (let ei = 0; ei < enemies.length; ei++) {
              const e = enemies[ei]; if (e.hp <= 0) continue;
              const dx = (e.x - ax), dy = (e.y - ay);
              if ((dx*dx + dy*dy) <= rad*rad) slowAccum[ei] = Math.max(slowAccum[ei], a.value || 0);
            }
          }
          break;
        }
      }
    }
  }
  // Apply caps
  buffs.atk = Math.min(buffs.atk, COMPANION_BUFF_CAPS.atk);
  buffs.dr = Math.min(buffs.dr, COMPANION_BUFF_CAPS.dr);
  buffs.regen = Math.min(buffs.regen, COMPANION_BUFF_CAPS.regen);
  buffs.range = Math.min(buffs.range, COMPANION_BUFF_CAPS.range);
  buffs.touchDR = Math.min(buffs.touchDR, COMPANION_BUFF_CAPS.touchDR);
  // Regen
  if (buffs.regen > 0 && player.hp > 0) {
    player.hp = Math.min(player.maxHp, player.hp + buffs.regen * dt);
    // Healing sparkles while regenerating and not at full
    if (player.hp < player.maxHp) {
      const rate = 4 + 8 * (buffs.regen / Math.max(0.2, COMPANION_BUFF_CAPS.regen)); // 4–12 per second
      if (Math.random() < rate * dt) {
        const ox = (Math.random() * 8 - 4);
        const oy = (Math.random() * 6 - 10);
        spawnSparkle(player.x + player.w/2 + ox, player.y + oy);
      }
    }
  }
  // Per-enemy slow multiplier for this frame
  for (let ei = 0; ei < enemies.length; ei++) {
    const s = Math.min(slowAccum[ei], COMPANION_BUFF_CAPS.slow);
    enemies[ei]._slowMul = 1 - s;
  }
  // Update UI badges with latest totals
  try { updateBuffBadges(); } catch {}
}

function handleCompanionTriggers(dt) {
  const cds = runtime.companionCDs || (runtime.companionCDs = { yornaEcho: 0, canopyShield: 0, holaGust: 0 });
  // Cooldowns tick
  cds.yornaEcho = Math.max(0, (cds.yornaEcho || 0) - dt);
  cds.canopyShield = Math.max(0, (cds.canopyShield || 0) - dt);
  cds.holaGust = Math.max(0, (cds.holaGust || 0) - dt);

  // Shield countdown
  if (runtime.shieldActive) {
    runtime.shieldTimer = Math.max(0, (runtime.shieldTimer || 0) - dt);
    if (runtime.shieldTimer <= 0) runtime.shieldActive = false;
  }

  // Presence checks
  const has = (key) => companions.some(c => (c.name || '').toLowerCase().includes(key));
  // Canopy shield trigger
  if (has('canopy')) {
    const def = companionEffectsByKey.canopy?.triggers?.shield || { hpThresh: 0.4, cooldownSec: 12, durationSec: 6 };
    const hpRatio = player.hp / player.maxHp;
    if (!runtime.shieldActive && (cds.canopyShield || 0) <= 0 && hpRatio < (def.hpThresh || 0.4)) {
      runtime.shieldActive = true;
      runtime.shieldTimer = def.durationSec || 6;
      cds.canopyShield = def.cooldownSec || 12;
      spawnFloatText(player.x + player.w/2, player.y - 10, 'Shield!', { color: '#8ab4ff', life: 0.8 });
    }
  }

  // Hola gust trigger
  if (has('hola')) {
    const def = companionEffectsByKey.hola?.triggers?.gust || { radius: 24, slow: 0.25, durationSec: 0.4, push: 14, cooldownSec: 10 };
    if ((cds.holaGust || 0) <= 0) {
      // Any enemy in radius of player?
      let any = false;
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const dx = e.x - player.x, dy = e.y - player.y;
        if ((dx*dx + dy*dy) <= (def.radius * def.radius)) { any = true; break; }
      }
      if (any) {
        for (const e of enemies) {
          if (e.hp <= 0) continue;
          const dx = e.x - player.x, dy = e.y - player.y;
          if ((dx*dx + dy*dy) <= (def.radius * def.radius)) {
            const mag = Math.hypot(dx, dy) || 1;
            const px = (dx / mag) * def.push;
            const py = (dy / mag) * def.push;
            const solids = [player, ...enemies.filter(x => x !== e && x.hp > 0)];
            moveWithCollision(e, px, py, solids);
            e._gustSlowTimer = Math.max(e._gustSlowTimer || 0, def.durationSec || 0.4);
          }
        }
        cds.holaGust = def.cooldownSec || 10;
        spawnFloatText(player.x + player.w/2, player.y - 12, 'Gust!', { color: '#a1e3ff', life: 0.8 });
      }
    }
  }
}


// Attempt to place follower near leader ignoring labyrinth walls when badly stuck
function tryWarpNear(leader, follower) {
  const spots = [
    { ox: -10, oy: 0 }, { ox: 10, oy: 0 }, { ox: 0, oy: -10 }, { ox: 0, oy: 10 },
    { ox: -14, oy: -8 }, { ox: 14, oy: -8 }, { ox: -14, oy: 8 }, { ox: 14, oy: 8 },
  ];
  for (const s of spots) {
    const rx = Math.max(0, Math.min(world.w - follower.w, leader.x + s.ox));
    const ry = Math.max(0, Math.min(world.h - follower.h, leader.y + s.oy));
    const rect = { x: rx, y: ry, w: follower.w, h: follower.h };
    let collide = false;
    for (const o of obstacles) {
      if (o && o.type === 'gate' && o.locked === false) continue;
      if (rectsIntersect(rect, o)) { collide = true; break; }
    }
    if (!collide) { follower.x = rx; follower.y = ry; return true; }
  }
  return false;
}
