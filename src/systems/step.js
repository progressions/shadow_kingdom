import { player, enemies, companions, npcs, obstacles, world, camera, runtime, corpses, spawnCorpse, stains, spawnStain, floaters, spawnFloatText } from '../engine/state.js';
import { companionEffectsByKey, COMPANION_BUFF_CAPS } from '../data/companion_effects.js';
import { playSfx } from '../engine/audio.js';
import { FRAMES_PER_DIR } from '../engine/constants.js';
import { rectsIntersect, getEquipStats } from '../engine/utils.js';
import { handleAttacks } from './combat.js';
import { startGameOver } from '../engine/dialog.js';
import { saveGame } from '../engine/save.js';
import { showBanner } from '../engine/ui.js';

function moveWithCollision(ent, dx, dy, solids = []) {
  // Move X
  if (dx !== 0) {
    let newX = ent.x + dx;
    const rect = { x: newX, y: ent.y, w: ent.w, h: ent.h };
    for (const o of obstacles) {
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
      const mul = e._slowMul || 1;
      moveWithCollision(e, e.knockbackX * dt * mul, e.knockbackY * dt * mul, solidsForEnemy);
      e.knockbackX *= Math.pow(0.001, dt); e.knockbackY *= Math.pow(0.001, dt);
    } else {
      e.knockbackX = 0; e.knockbackY = 0;
      let dx = (player.x - e.x), dy = (player.y - e.y);
      const dist = Math.hypot(dx, dy) || 1; dx/=dist; dy/=dist;
      const oldX = e.x, oldY = e.y;
      const mul = e._slowMul || 1;
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
          const taken = Math.max(0, raw - dr);
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
      spawnCorpse(e.x, e.y, { dir: e.dir, kind: 'enemy', life: 1.8 });
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
  // Aggregate companion auras → runtime.combatBuffs and per-enemy slow multipliers
  applyCompanionAuras(dt);
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
  }
  // Per-enemy slow multiplier for this frame
  for (let ei = 0; ei < enemies.length; ei++) {
    const s = Math.min(slowAccum[ei], COMPANION_BUFF_CAPS.slow);
    enemies[ei]._slowMul = 1 - s;
  }
}
