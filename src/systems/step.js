import { player, enemies, companions, npcs, obstacles, world, camera, runtime } from '../engine/state.js';
import { FRAMES_PER_DIR } from '../engine/constants.js';
import { rectsIntersect } from '../engine/utils.js';
import { handleAttacks } from './combat.js';

function moveWithCollision(ent, dx, dy) {
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
    ent.y = newY;
  }
  // Clamp to world
  ent.x = Math.max(0, Math.min(world.w - ent.w, ent.x));
  ent.y = Math.max(0, Math.min(world.h - ent.h, ent.y));
}

export function step(dt) {
  // Decay interaction lock (prevents chatting immediately after taking damage)
  if (runtime.interactLock > 0) {
    runtime.interactLock = Math.max(0, runtime.interactLock - dt);
  }
  // Input axes
  let ax = 0, ay = 0;
  const keys = runtime.keys;
  if (keys.has('arrowleft') || keys.has('a')) ax -= 1;
  if (keys.has('arrowright') || keys.has('d')) ax += 1;
  if (keys.has('arrowup') || keys.has('w')) ay -= 1;
  if (keys.has('arrowdown') || keys.has('s')) ay += 1;
  if (ax !== 0 && ay !== 0) { const inv = 1/Math.sqrt(2); ax *= inv; ay *= inv; }

  player.moving = (ax !== 0 || ay !== 0);
  if (player.moving) {
    if (Math.abs(ax) > Math.abs(ay)) player.dir = ax < 0 ? 'left' : 'right';
    else if (ay !== 0) player.dir = ay < 0 ? 'up' : 'down';

    const dx = ax * player.speed * dt;
    const dy = ay * player.speed * dt;
    moveWithCollision(player, dx, dy);
    player.animTime += dt; if (player.animTime > 0.18) { player.animTime = 0; player.animFrame = (player.animFrame + 1) % FRAMES_PER_DIR; }
  } else { player.animTime = 0; player.animFrame = 0; }

  // Attacks
  handleAttacks(dt);

  // Enemies AI
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    if (Math.abs(e.knockbackX) > 0.01 || Math.abs(e.knockbackY) > 0.01) {
      moveWithCollision(e, e.knockbackX * dt, e.knockbackY * dt);
      e.knockbackX *= Math.pow(0.001, dt); e.knockbackY *= Math.pow(0.001, dt);
    } else {
      e.knockbackX = 0; e.knockbackY = 0;
      let dx = (player.x - e.x), dy = (player.y - e.y);
      const dist = Math.hypot(dx, dy) || 1; dx/=dist; dy/=dist;
      const oldX = e.x, oldY = e.y;
      moveWithCollision(e, dx * e.speed * dt, dy * e.speed * dt);
      let moved = Math.hypot(e.x - oldX, e.y - oldY);
      // Axis fallback if stuck
      if (moved < 0.05) {
        e.x = oldX; e.y = oldY;
        moveWithCollision(e, dx * e.speed * dt, 0);
        moved = Math.hypot(e.x - oldX, e.y - oldY);
        if (moved < 0.05) {
          e.x = oldX; e.y = oldY;
          moveWithCollision(e, 0, dy * e.speed * dt);
          moved = Math.hypot(e.x - oldX, e.y - oldY);
        }
      }
      // Perpendicular sidestep if still stuck
      if (moved < 0.05) {
        e.x = oldX; e.y = oldY;
        const px = -dy * e.avoidSign;
        const py = dx * e.avoidSign;
        moveWithCollision(e, px * e.speed * 0.7 * dt, py * e.speed * 0.7 * dt);
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
      if (rectsIntersect(pr, er)) {
        player.hp = Math.max(0, player.hp - e.touchDamage);
        e.hitTimer = e.hitCooldown;
        // Apply a brief no-interaction buffer so Space triggers attack, not talk
        runtime.interactLock = Math.max(runtime.interactLock, 0.6);
      }
    }
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
      moveWithCollision(c, dx*move, dy*move);
      c.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left':'right') : (dy < 0 ? 'up':'down');
      c.animTime += dt; if (c.animTime > 0.2) { c.animTime = 0; c.animFrame = (c.animFrame + 1) % FRAMES_PER_DIR; }
    } else { c.animTime = 0; c.animFrame = 0; }
    c.x = Math.max(0, Math.min(world.w - c.w, c.x));
    c.y = Math.max(0, Math.min(world.h - c.h, c.y));
  }

  // NPC idle
  for (const n of npcs) { n.idleTime += dt; if (n.idleTime > 0.6) { n.idleTime = 0; n.animFrame = (n.animFrame + 1) % FRAMES_PER_DIR; } }

  // Camera follow
  camera.x = Math.round(player.x + player.w/2 - camera.w/2);
  camera.y = Math.round(player.y + player.h/2 - camera.h/2);
  camera.x = Math.max(0, Math.min(world.w - camera.w, camera.x));
  camera.y = Math.max(0, Math.min(world.h - camera.h, camera.y));
}
