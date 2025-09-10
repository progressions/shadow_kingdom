import { player, enemies, companions, npcs, obstacles, world, camera, runtime, corpses, spawnCorpse, stains, spawnStain, floaters, spawnFloatText, sparkles, spawnSparkle, itemsOnGround, spawnPickup } from '../engine/state.js';
import { companionEffectsByKey, COMPANION_BUFF_CAPS } from '../data/companion_effects.js';
import { playSfx, setMusicMode } from '../engine/audio.js';
import { FRAMES_PER_DIR } from '../engine/constants.js';
import { rectsIntersect, getEquipStats } from '../engine/utils.js';
import { handleAttacks } from './combat.js';
import { startGameOver, startPrompt } from '../engine/dialog.js';
import { completionXpForLevel, grantPartyXp } from '../engine/state.js';
import { exitChat } from '../engine/ui.js';
import { saveGame } from '../engine/save.js';
import { showBanner, updateBuffBadges } from '../engine/ui.js';
import { ENEMY_LOOT, ENEMY_LOOT_L2, rollFromTable, itemById } from '../data/loot.js';

function moveWithCollision(ent, dx, dy, solids = []) {
  // Move X
  if (dx !== 0) {
    let newX = ent.x + dx;
    const rect = { x: newX, y: ent.y, w: ent.w, h: ent.h };
    for (const o of obstacles) {
      if (!o) continue;
      if (o.type === 'gate' && o.locked === false) continue;
      // non-blocking obstacle types
      if (o.type === 'chest' || o.type === 'mud' || o.type === 'fire' || o.type === 'lava') continue;
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
      if (!o) continue;
      if (o.type === 'gate' && o.locked === false) continue;
      // non-blocking obstacle types
      if (o.type === 'chest' || o.type === 'mud' || o.type === 'fire' || o.type === 'lava') continue;
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
  if (runtime.gameState === 'chat') return;
  // Advance chemistry timers
  runtime._timeSec = (runtime._timeSec || 0) + dt;
  // Track recent low-HP window (3s) for certain pair ticks
  try {
    const below = player.hp < (player.maxHp || 10) * 0.5;
    if (below) runtime._lowHpTimer = 3.0;
    else if ((runtime._lowHpTimer || 0) > 0) runtime._lowHpTimer = Math.max(0, runtime._lowHpTimer - dt);
    // Recent-hit timer for triggers that respond to damage taken
    if ((runtime._recentPlayerHitTimer || 0) > 0) runtime._recentPlayerHitTimer = Math.max(0, runtime._recentPlayerHitTimer - dt);
  } catch {}
  // Handle simple camera pan for VN intros (pauses simulation)
  if (runtime.cameraPan) {
    const p = runtime.cameraPan;
    p.t = Math.min(p.dur, (p.t || 0) + dt);
    let u = p.t / p.dur; // ease in-out cubic
    u = u < 0.5 ? 4*u*u*u : 1 - Math.pow(-2*u + 2, 3)/2;
    const nx = p.fromX + (p.toX - p.fromX) * u;
    const ny = p.fromY + (p.toY - p.fromY) * u;
    camera.x = Math.round(nx);
    camera.y = Math.round(ny);
    camera.x = Math.max(0, Math.min(world.w - camera.w, camera.x));
    camera.y = Math.max(0, Math.min(world.h - camera.h, camera.y));
    if (p.t >= p.dur) {
      runtime.cameraPan = null;
      if (runtime.pendingIntro) {
        const { actor, text } = runtime.pendingIntro;
        runtime.pendingIntro = null;
        try {
          const isEnemy = (typeof actor?.touchDamage === 'number');
          playSfx(isEnemy ? 'vnIntroEnemy' : 'vnIntroNpc');
        } catch {}
        // No numbered Exit choice; overlay will show Exit (X) automatically
        startPrompt(actor, text, []);
      }
    }
    return; // halt simulation during pan
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
  // Terrain effects: compute slow/burn zones for player
  let terrainSlow = 1.0;
  let terrainBurnDps = 0;
  try {
    const pr = { x: player.x, y: player.y, w: player.w, h: player.h };
    for (const o of obstacles) {
      if (!o) continue;
      if (o.type !== 'mud' && o.type !== 'fire' && o.type !== 'lava') continue;
      if (rectsIntersect(pr, o)) {
        if (o.type === 'mud') terrainSlow = Math.min(terrainSlow, 0.6);
        else if (o.type === 'fire') terrainBurnDps = Math.max(terrainBurnDps, 1.5);
        else if (o.type === 'lava') terrainBurnDps = Math.max(terrainBurnDps, 3.0);
      }
    }
  } catch {}
  // Then apply input movement with terrain slow
  if (hasInput) {
    const dx = ax * player.speed * terrainSlow * dt;
    const dy = ay * player.speed * terrainSlow * dt;
    moveWithCollision(player, dx, dy, solidsForPlayer);
  }
  // Apply/refresh burn from terrain
  if (terrainBurnDps > 0) {
    player._burnDps = terrainBurnDps;
    player._burnTimer = Math.max(player._burnTimer || 0, 1.0);
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

  // Player damage over time (burn)
  if (player._burnTimer && player._burnTimer > 0) {
    player._burnTimer = Math.max(0, player._burnTimer - dt);
    const dps = player._burnDps || 0;
    if (dps > 0) {
      const before = player.hp;
      player.hp = Math.max(0, player.hp - dps * dt);
      if (player.hp < before) {
        if (Math.random() < 4 * dt) spawnFloatText(player.x + player.w/2, player.y - 8, 'Burn', { color: '#ff9a3d', life: 0.5 });
      }
      if (player.hp <= 0 && !runtime.gameOver) {
        // Trigger game over once when player dies to burn
        try { startGameOver(); } catch {}
      }
    }
  }

  // Enemies AI
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    // Enemies collide with player and other enemies; pass through companions/NPCs
    const solidsForEnemy = [player, ...enemies.filter(x => x !== e && x.hp > 0)];
    // Environmental effects for enemies (mud slow; fire/lava burn)
    let envSlow = 1.0;
    let envBurnDps = 0;
    try {
      const er = { x: e.x, y: e.y, w: e.w, h: e.h };
      for (const o of obstacles) {
        if (!o) continue;
        if (o.type !== 'mud' && o.type !== 'fire' && o.type !== 'lava') continue;
        // Skip far hazards for a tiny speed win
        const cx = (o.x + o.w/2) - (e.x + e.w/2);
        const cy = (o.y + o.h/2) - (e.y + e.h/2);
        if ((cx*cx + cy*cy) > (140*140)) continue;
        if (rectsIntersect(er, o)) {
          if (o.type === 'mud') envSlow = Math.min(envSlow, 0.6);
          else if (o.type === 'fire') envBurnDps = Math.max(envBurnDps, 1.5);
          else if (o.type === 'lava') envBurnDps = Math.max(envBurnDps, 3.0);
        }
      }
    } catch {}
    if (envBurnDps > 0) { e._burnDps = envBurnDps; e._burnTimer = Math.max(e._burnTimer || 0, 1.0); }
    if (Math.abs(e.knockbackX) > 0.01 || Math.abs(e.knockbackY) > 0.01) {
      const slowMul = (e._slowMul || 1);
      const gustSlow = (e._gustSlowTimer && e._gustSlowTimer > 0) ? (e._gustSlowFactor ?? 0.25) : 0;
      const veilSlow = (e._veilSlowTimer && e._veilSlowTimer > 0) ? (e._veilSlow ?? 0.5) : 0;
      const mul = slowMul * (1 - Math.max(0, Math.min(0.9, gustSlow))) * (1 - Math.max(0, Math.min(0.9, veilSlow))) * envSlow;
      moveWithCollision(e, e.knockbackX * dt * mul, e.knockbackY * dt * mul, solidsForEnemy);
      e.knockbackX *= Math.pow(0.001, dt); e.knockbackY *= Math.pow(0.001, dt);
    } else {
      e.knockbackX = 0; e.knockbackY = 0;
      let dx = (player.x - e.x), dy = (player.y - e.y);
      const dist = Math.hypot(dx, dy) || 1; dx/=dist; dy/=dist;
      const oldX = e.x, oldY = e.y;
      const slowMul = (e._slowMul || 1);
      const gustSlow = (e._gustSlowTimer && e._gustSlowTimer > 0) ? (e._gustSlowFactor ?? 0.25) : 0;
      const veilSlow = (e._veilSlowTimer && e._veilSlowTimer > 0) ? (e._veilSlow ?? 0.5) : 0;
      const mul = slowMul * (1 - Math.max(0, Math.min(0.9, gustSlow))) * (1 - Math.max(0, Math.min(0.9, veilSlow))) * envSlow;

      // Hazard avoidance steering: pick a nearby direction with lower hazard exposure
      const baseDir = { x: dx, y: dy };
      const offsets = [-0.9, -0.5, 0, 0.5, 0.9]; // radians near target
      let best = { x: baseDir.x, y: baseDir.y };
      let bestScore = Infinity;
      const px = e.x + e.w/2, py = e.y + e.h/2;
      const avoidBias = (e.kind === 'boss') ? 0.5 : (e.kind === 'featured' ? 0.8 : 1.0);
      for (const a of offsets) {
        const ca = Math.cos(a), sa = Math.sin(a);
        const vx = baseDir.x * ca - baseDir.y * sa;
        const vy = baseDir.x * sa + baseDir.y * ca;
        // Alignment penalty (prefer towards player)
        const dot = Math.max(-1, Math.min(1, vx * baseDir.x + vy * baseDir.y));
        const alignPenalty = (1 - dot) * 0.6;
        // Hazard exposure along a short ray with 3 samples
        let haz = 0;
        const samples = [0.33, 0.66, 1.0];
        const stepLen = 26; // px
        for (const t of samples) {
          const cx = px + vx * stepLen * t;
          const cy = py + vy * stepLen * t;
          const probe = { x: cx - e.w/2, y: cy - e.h/2, w: e.w, h: e.h };
          for (const o of obstacles) {
            if (!o) continue;
            if (o.type !== 'mud' && o.type !== 'fire' && o.type !== 'lava') continue;
            // quick reject by distance
            const ox = (o.x + o.w/2) - cx; const oy = (o.y + o.h/2) - cy;
            if ((ox*ox + oy*oy) > (160*160)) continue;
            if (rectsIntersect(probe, o)) {
              haz += (o.type === 'mud') ? 1 : (o.type === 'fire' ? 6 : 12);
            }
          }
        }
        const score = alignPenalty + haz * avoidBias;
        if (score < bestScore) { bestScore = score; best = { x: vx, y: vy }; }
      }

      moveWithCollision(e, best.x * e.speed * mul * dt, best.y * e.speed * mul * dt, solidsForEnemy);
      let moved = Math.hypot(e.x - oldX, e.y - oldY);
      // Axis fallback if stuck
      if (moved < 0.05) {
        e.x = oldX; e.y = oldY;
        moveWithCollision(e, best.x * e.speed * dt, 0, solidsForEnemy);
        moved = Math.hypot(e.x - oldX, e.y - oldY);
        if (moved < 0.05) {
          e.x = oldX; e.y = oldY;
          moveWithCollision(e, 0, best.y * e.speed * dt, solidsForEnemy);
          moved = Math.hypot(e.x - oldX, e.y - oldY);
        }
      }
      // Perpendicular sidestep if still stuck
      if (moved < 0.05) {
        e.x = oldX; e.y = oldY;
        const px2 = -best.y * e.avoidSign;
        const py2 = best.x * e.avoidSign;
        moveWithCollision(e, px2 * e.speed * 0.7 * dt, py2 * e.speed * 0.7 * dt, solidsForEnemy);
        moved = Math.hypot(e.x - oldX, e.y - oldY);
      }

      // Face movement direction
      const fdx = e.x - oldX, fdy = e.y - oldY;
      const useX = Math.abs(fdx) > Math.abs(fdy);
      e.dir = useX ? (fdx < 0 ? 'left' : 'right') : (fdy < 0 ? 'up' : 'down');
      e.animTime += dt; if (e.animTime > 0.22) { e.animTime = 0; e.animFrame = (e.animFrame + 1) % FRAMES_PER_DIR; }
      // Flip avoidance side if stuck for too long
      if (moved < 0.1) { e.stuckTime += dt; if (e.stuckTime > 0.6) { e.avoidSign *= -1; e.stuckTime = 0; } }
      else e.stuckTime = 0;
    }
    e.x = Math.max(0, Math.min(world.w - e.w, e.x));
    e.y = Math.max(0, Math.min(world.h - e.h, e.y));
    e.hitTimer -= dt; if (e.hitTimer < 0) e.hitTimer = 0;
    if (e._gustSlowTimer && e._gustSlowTimer > 0) e._gustSlowTimer = Math.max(0, e._gustSlowTimer - dt);
    if (e._veilSlowTimer && e._veilSlowTimer > 0) e._veilSlowTimer = Math.max(0, e._veilSlowTimer - dt);
    if (e._burnTimer && e._burnTimer > 0) {
      e._burnTimer = Math.max(0, e._burnTimer - dt);
      const dps = e._burnDps || 0;
      if (dps > 0) {
        e.hp -= dps * dt;
        if (Math.random() < 4 * dt) spawnFloatText(e.x + e.w/2, e.y - 10, 'Burn', { color: '#ff9a3d', life: 0.5 });
      }
    }
    if (e.hitTimer === 0) {
      const pr = { x: player.x, y: player.y, w: player.w, h: player.h };
      const er = { x: e.x, y: e.y, w: e.w, h: e.h };
      if (rectsTouchOrOverlap(pr, er, 2.0)) {
        // If they actually overlap, separate just enough but still allow contact
        if (rectsIntersect(pr, er)) separateEntities(player, e, 0.65);
        // Overworld realtime damage on contact; apply armor DR
        if (player.invulnTimer <= 0) {
          const baseDr = (getEquipStats(player).dr || 0) + (runtime?.combatBuffs?.dr || 0) + (runtime?.combatBuffs?.touchDR || 0);
          const dr = baseDr + (player.levelDrBonus || 0);
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
            // Mark recent hit for companion triggers
            runtime._recentPlayerHitTimer = 0.25;
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
      // Boss multi-phase behavior: power up twice (3 total phases)
      if ((e.kind || '').toLowerCase() === 'boss' && !e._secondPhase) {
        try {
          const actor = { name: e.name || 'Boss', portraitSrc: e.portraitPowered || null };
          const line = `${e.name || 'Boss'}: I call on my master for power!`;
          startPrompt(actor, line, []);
        } catch {}
        // Refill to second health bar and mark phase
        e.hp = e.maxHp;
        e._secondPhase = true;
        // Increase boss contact damage and attack speed for second phase
        e.touchDamage = Math.max(1, (e.touchDamage || 0) + 2);
        e.hitCooldown = Math.max(0.5, (e.hitCooldown || 0.8) * 0.7);
        e.speed = Math.max(8, (e.speed || 12) * 1.1);
        try { spawnFloatText(e.x + e.w/2, e.y - 10, 'Empowered!', { color: '#ffd166', life: 0.8 }); } catch {}
        // Clear incidental timers/knockback
        e.hitTimer = 0; e.knockbackX = 0; e.knockbackY = 0;
        continue; // do not remove this frame
      }
      // Second power-up -> final form (third phase)
      if ((e.kind || '').toLowerCase() === 'boss' && e._secondPhase && !e._thirdPhase) {
        try {
          const actor = { name: e.name || 'Boss', portraitSrc: e.portraitPowered || null };
          const line = `${e.name || 'Boss'}: I will not fall!`; // final form cue
          startPrompt(actor, line, []);
        } catch {}
        e.hp = e.maxHp;
        e._thirdPhase = true;
        e.touchDamage = Math.max(1, (e.touchDamage || 0) + 3);
        e.hitCooldown = Math.max(0.35, (e.hitCooldown || 0.8) * 0.7);
        e.speed = Math.max(9, (e.speed || 12) * 1.15);
        try { spawnFloatText(e.x + e.w/2, e.y - 10, 'Final Form!', { color: '#ff7a7a', life: 0.9 }); } catch {}
        e.hitTimer = 0; e.knockbackX = 0; e.knockbackY = 0;
        continue;
      }
      // If boss defeated after final form, show a VN overlay with defeat line and schedule next level when appropriate
      if ((e.kind || '').toLowerCase() === 'boss' && e._thirdPhase) {
        try {
          const actor = { name: e.name || 'Boss', portraitSrc: e.portraitDefeated || null };
          const line = `${e.name || 'Boss'}: ...`; // simple defeated line; customize per boss via portraits
          startPrompt(actor, line, []);
        } catch {}
        if (typeof e.onDefeatNextLevel === 'number') {
          try {
            const bonus = completionXpForLevel(runtime.currentLevel || 1);
            grantPartyXp(bonus);
            runtime.pendingLevel = e.onDefeatNextLevel;
            runtime._levelSwapTimer = 1.2;
          } catch {}
        }
      }
      // Quest tracking: Yorna 'Cut the Knot'; Canopy 'Breath and Bandages'; Twil 'Trace the Footprints'
      try {
        if (e.questId === 'yorna_knot') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'yorna_knot_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) {
            if (!runtime.questFlags) runtime.questFlags = {};
            runtime.questFlags['yorna_knot_cleared'] = true;
            showBanner('Quest updated: Cut the Knot — cleared');
          } else {
            showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
          }
        }
        if (e.questId === 'urn_rooftops') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'urn_rooftops_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['urn_rooftops_cleared'] = true; showBanner('Quest updated: Secure the Rooftops — cleared'); }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'varabella_crossfire') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'varabella_crossfire_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['varabella_crossfire_cleared'] = true; showBanner('Quest updated: Cut the Crossfire — cleared'); }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'canopy_triage') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'canopy_triage_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['canopy_triage_cleared'] = true; showBanner('Quest updated: Breath and Bandages — cleared'); }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'twil_trace') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'twil_trace_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['twil_trace_cleared'] = true; showBanner('Quest updated: Trace the Footprints — cleared'); }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'yorna_ring') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'yorna_ring_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['yorna_ring_cleared'] = true; showBanner('Quest updated: Shatter the Ring — cleared'); }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'yorna_causeway') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'yorna_causeway_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['yorna_causeway_cleared'] = true; showBanner('Quest updated: Hold the Causeway — cleared'); }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'hola_silence') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'hola_silence_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['hola_silence_cleared'] = true; showBanner('Quest updated: Break the Silence — cleared'); }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'hola_breath_bog') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'hola_breath_bog_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['hola_breath_bog_cleared'] = true; showBanner('Quest updated: Breath Over Bog — cleared'); }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'oyin_ember') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'oyin_ember_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['oyin_ember_cleared'] = true; showBanner('Quest updated: Carry the Ember — cleared'); }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'twil_wake') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'twil_wake_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['twil_wake_cleared'] = true; showBanner('Quest updated: Cut the Wake — cleared'); }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'tin_shallows') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'tin_shallows_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['tin_shallows_cleared'] = true; showBanner('Quest updated: Mark the Shallows — cleared'); }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'tin_gaps4') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'tin_gaps4_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['tin_gaps4_cleared'] = true; showBanner('Quest updated: Flag the Gaps — cleared'); }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'nellis_beacon') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'nellis_beacon_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['nellis_beacon_cleared'] = true; showBanner('Quest updated: Raise the Beacon — cleared'); }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'nellis_crossroads4') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'nellis_crossroads4_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['nellis_crossroads4_cleared'] = true; showBanner('Quest updated: Light the Crossroads — cleared'); }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'canopy_sister2') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'canopy_sister2_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['canopy_sister2_cleared'] = true; showBanner('Quest updated: Ribbon in the Dust — cleared'); }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'canopy_sister3') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'canopy_sister3_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['canopy_sister3_cleared'] = true; showBanner('Quest updated: Reeds and Echoes — cleared'); }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'canopy_streets4') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'canopy_streets4_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['canopy_streets4_cleared'] = true; showBanner('Quest updated: Stitch the Streets — cleared'); }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
      } catch {}
      // If Fana (enslaved sorceress) is defeated, she becomes a recruitable NPC
      try {
        const nm = (e.name || '').toLowerCase();
        if (nm.includes('fana')) {
          // Spawn an NPC at or near the defeat spot with a recruit dialog
          const nx = e.x, ny = e.y;
          Promise.all([
            import('../engine/sprites.js'),
            import('../engine/state.js'),
            import('../engine/dialog.js'),
            import('../data/dialogs.js'),
          ]).then(([sm, st, dm, dd]) => {
            const sheet = (sm.sheetForName ? sm.sheetForName('Fana') : null);
            const npc = st.spawnNpc(nx, ny, 'down', { name: 'Fana', sheet, portrait: 'assets/portraits/Fana/Fana.mp4', affinity: 6 });
            if (dd.fanaFreedDialog) dm.setNpcDialog(npc, dd.fanaFreedDialog);
            else if (dd.fanaDialog) dm.setNpcDialog(npc, dd.fanaDialog);
          }).catch(()=>{});
        }
      } catch {}
      // Drops
      try {
        let drop = null;
        if (e.guaranteedDropId) drop = itemById(e.guaranteedDropId);
        if (!drop) {
          const tableSrc = (runtime.currentLevel === 2) ? ENEMY_LOOT_L2 : ENEMY_LOOT;
          const table = tableSrc[(e.kind || 'mook')] || [];
          drop = rollFromTable(table);
        }
        if (drop) spawnPickup(e.x + e.w/2 - 5, e.y + e.h/2 - 5, drop);
      } catch {}
      // Award kill XP to party (only on actual death/removal)
      try {
        const kind = (e.kind || 'mook').toLowerCase();
        let val = 1;
        if (kind === 'featured') val = 5;
        if (kind === 'boss') val = 20;
        if (kind === 'featured' && e.guaranteedDropId) val = 10;
        grantPartyXp(val);
      } catch {}
      spawnCorpse(e.x, e.y, { dir: e.dir, kind: e.kind || 'enemy', life: 1.8, sheet: e.sheet || null });
      spawnStain(e.x, e.y, { life: 2.8 });
      enemies.splice(i, 1);
      // Record kill time for chemistry rare ticks
      try {
        const t = runtime._timeSec || 0;
        if (!Array.isArray(runtime._recentKillTimes)) runtime._recentKillTimes = [];
        runtime._recentKillTimes.push(t);
        // keep last 30s
        runtime._recentKillTimes = runtime._recentKillTimes.filter(x => t - x <= 30);
        const last20 = runtime._recentKillTimes.filter(x => t - x <= 20).length;
        const last3 = runtime._recentKillTimes.filter(x => t - x <= 3).length;
        const names = companions.map(c => (c.name||'').toLowerCase());
        const has = (n) => names.some(x => x.includes(String(n).toLowerCase()));
        const flags = runtime.questFlags || {};
        const lvl = runtime.currentLevel || 1;
        // Twil ↔ Hola rare tick: 3 quick kills in 20s, no truce, once per level
        if (has('twil') && has('hola') && !flags['hola_twil_truce'] && last20 >= 3) {
          const cdKey = `hola_twil_tick_l${lvl}`;
          if (!flags[cdKey]) {
            // apply small negative tick to Hola
            const hola = companions.find(c => (c.name||'').toLowerCase().includes('hola'));
            if (hola) { hola.affinity = Math.max(1, (hola.affinity||5) - 0.2); }
            try { showBanner('Hola affinity -0.2'); } catch {}
            try { runtime.questFlags[cdKey] = true; } catch {}
          }
        }
        // Yorna ↔ Oyin rare tick: 2 kills in 3s and recent low HP, no truce, once per level
        if (has('yorna') && has('oyin') && !flags['yorna_oyin_truce'] && last3 >= 2 && (runtime._lowHpTimer||0) > 0) {
          const cdKey = `yorna_oyin_tick_l${lvl}`;
          if (!flags[cdKey]) {
            const oyin = companions.find(c => (c.name||'').toLowerCase().includes('oyin'));
            if (oyin) { oyin.affinity = Math.max(1, (oyin.affinity||5) - 0.2); }
            try { showBanner('Oyin affinity -0.2'); } catch {}
            try { runtime.questFlags[cdKey] = true; } catch {}
          }
        }
      } catch {}
    }
  }

  // (Removed) mid-fight 50% empowerment: all bosses now use the same two-phase flow on first "death".

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

  // Auto-pickup items on ground within small radius
  if (itemsOnGround && itemsOnGround.length) {
    const px = player.x + player.w/2;
    const py = player.y + player.h/2;
    for (let ii = itemsOnGround.length - 1; ii >= 0; ii--) {
      const it = itemsOnGround[ii];
      const cx = it.x + it.w/2, cy = it.y + it.h/2;
      const dx = cx - px, dy = cy - py;
      if ((dx*dx + dy*dy) <= (12*12)) {
        // Collect
        try {
          const add = JSON.parse(JSON.stringify(it.item));
          import('../engine/state.js').then(m => m.addItemToInventory(player.inventory, add));
        } catch {
          import('../engine/state.js').then(m => m.addItemToInventory(player.inventory, it.item));
        }
        itemsOnGround.splice(ii, 1);
        showBanner(`Picked up ${it.item?.name || 'an item'}`);
        playSfx('pickup');
        // small sparkle burst
        for (let k = 0; k < 6; k++) spawnSparkle(cx + (Math.random()*4-2), cy + (Math.random()*4-2));
      }
    }
  }

  // Death check → Game Over
  if (!runtime.gameOver && player.hp <= 0) {
    startGameOver();
  }

  // Camera follow
  camera.x = Math.round(player.x + player.w/2 - camera.w/2);
  camera.y = Math.round(player.y + player.h/2 - camera.h/2);
  camera.x = Math.max(0, Math.min(world.w - camera.w, camera.x));
  camera.y = Math.max(0, Math.min(world.h - camera.h, camera.y));

  // Music mode switching based on on-screen enemies, with debounce
  {
    const view = { x: camera.x, y: camera.y, w: camera.w, h: camera.h };
    let bossOn = false, anyOn = false;
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      const on = !(e.x + e.w < view.x || e.x > view.x + view.w || e.y + e.h < view.y || e.y > view.y + view.h);
      if (!on) continue;
      anyOn = true;
      if (String(e.kind).toLowerCase() === 'boss') { bossOn = true; break; }
    }
    const desired = bossOn ? 'high' : (anyOn ? 'low' : 'normal');
    if (desired === runtime.musicMode) {
      // Already in this mode; clear any pending switch
      runtime.musicModePending = null;
      runtime.musicModeSwitchTimer = 0;
    } else {
      if (runtime.musicModePending !== desired) {
        runtime.musicModePending = desired;
        runtime.musicModeSwitchTimer = 0.6; // debounce window
      } else if (runtime.musicModeSwitchTimer > 0) {
        runtime.musicModeSwitchTimer = Math.max(0, runtime.musicModeSwitchTimer - dt);
        if (runtime.musicModeSwitchTimer === 0) {
          runtime.musicMode = desired;
          try { setMusicMode(desired); } catch {}
          runtime.musicModePending = null;
        }
      }
    }
  }

  // Minimal VN-on-sight: for any NPC or enemy with vnOnSight, pan camera to them,
  // then show a simple VN once when first seen
  if (runtime.gameState === 'play') {
    const actors = [...npcs, ...enemies];
    for (const a of actors) {
      if (!a || !a.vnOnSight || a._vnShown) continue;
      // Skip if we've seen this intro before in this session/save
      const type = (typeof a.touchDamage === 'number') ? 'enemy' : 'npc';
      const key = `${type}:${(a.name || '').toLowerCase()}`;
      if (runtime.vnSeen && runtime.vnSeen[key]) { a._vnShown = true; continue; }
      const inView = (
        a.x + a.w > camera.x && a.x < camera.x + camera.w &&
        a.y + a.h > camera.y && a.y < camera.y + camera.h
      );
      if (!inView) continue;
      a._vnShown = true;
      if (runtime.vnSeen) runtime.vnSeen[key] = true;
      // Schedule a short camera pan to the actor
      const toX = Math.round(a.x + a.w/2 - camera.w/2);
      const toY = Math.round(a.y + a.h/2 - camera.h/2);
      runtime.cameraPan = {
        fromX: camera.x,
        fromY: camera.y,
        toX: Math.max(0, Math.min(world.w - camera.w, toX)),
        toY: Math.max(0, Math.min(world.h - camera.h, toY)),
        t: 0,
        dur: 0.6,
      };
      const text = (typeof a.vnOnSight.text === 'string' && a.vnOnSight.text.length)
        ? a.vnOnSight.text
        : `${a.name || 'Someone'} appears.`;
      runtime.pendingIntro = { actor: a, text };
      break; // only one per frame
    }
  }

  // Auto-close defeat VN to ensure level transition proceeds without manual input
  if (runtime.pendingLevel && runtime.gameState === 'chat') {
    runtime._levelSwapTimer = Math.max(0, (runtime._levelSwapTimer || 1.2) - dt);
    if (runtime._levelSwapTimer === 0) {
      try { exitChat(runtime); } catch {}
      runtime._levelSwapTimer = null;
    }
  }
}

function applyCompanionAuras(dt) {
  // Reset buffs
  const buffs = runtime.combatBuffs;
  buffs.atk = 0; buffs.dr = 0; buffs.regen = 0; buffs.range = 0; buffs.touchDR = 0; buffs.aspd = 0;
  // Prepare per-enemy slow accumulation
  const slowAccum = new Array(enemies.length).fill(0);
  // Synergy: Urn + Varabella small boost when both are present
  const hasUrn = companions.some(c => (c.name || '').toLowerCase().includes('urn'));
  const hasVarabella = companions.some(c => (c.name || '').toLowerCase().includes('varabella'));
  const pairBoost = (hasUrn && hasVarabella) ? 1.1 : 1.0;
  // Iterate companions
  for (let i = 0; i < companions.length; i++) {
    const c = companions[i];
    const key = (c.name || '').toLowerCase();
    const def = companionEffectsByKey[key];
    if (!def || !def.auras) continue;
    // Affinity multiplier: 1.0 at 1 → 1.5 at 10
    const aff = (typeof c.affinity === 'number') ? c.affinity : 2;
    const t = Math.max(0, Math.min(9, aff - 1));
    let mult = (1 + (t / 9) * 0.5) * (1 + 0.10 * Math.max(0, (c.level||1) - 1));
    if (pairBoost > 1 && (key.includes('urn') || key.includes('varabella'))) mult *= pairBoost;
    for (const a of def.auras) {
      switch (a.type) {
        case 'atk': buffs.atk += (a.value || 0) * mult; break;
        case 'dr': buffs.dr += (a.value || 0) * mult; break;
        case 'regen': buffs.regen += (a.value || 0) * mult; break;
        case 'range': buffs.range += (a.value || 0) * mult; break;
        case 'touchDR': buffs.touchDR += (a.value || 0) * mult; break;
        case 'aspd': buffs.aspd += (a.value || 0) * mult; break; // attack speed bonus (fractional)
        case 'slow': {
          const rad = a.radius || 0;
          if (rad > 0) {
            // Anchor: player by default, can be 'self'
            const ax = (a.anchor === 'self') ? c.x : player.x;
            const ay = (a.anchor === 'self') ? c.y : player.y;
            for (let ei = 0; ei < enemies.length; ei++) {
              const e = enemies[ei]; if (e.hp <= 0) continue;
              const dx = (e.x - ax), dy = (e.y - ay);
              if ((dx*dx + dy*dy) <= rad*rad) slowAccum[ei] = Math.max(slowAccum[ei], (a.value || 0) * mult);
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
  // Add any temporary range bonus from triggers before capping
  buffs.range += (runtime.tempRangeBonus || 0);
  buffs.range = Math.min(buffs.range, COMPANION_BUFF_CAPS.range);
  // Include temporary touch DR from triggers (e.g., Nellis Keep the Line)
  buffs.touchDR = Math.min(buffs.touchDR + (runtime.tempTouchDr || 0), COMPANION_BUFF_CAPS.touchDR);
  buffs.aspd = Math.min(buffs.aspd, COMPANION_BUFF_CAPS.aspd);
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
  // Decay temporary ATK bonus from triggers (e.g., Oyin Rally)
  if ((runtime._tempAtkTimer || 0) > 0) {
    runtime._tempAtkTimer = Math.max(0, (runtime._tempAtkTimer || 0) - dt);
    if (runtime._tempAtkTimer === 0) runtime.tempAtkBonus = 0;
  }
  // Decay temporary Range bonus from triggers (e.g., Varabella Angle)
  if ((runtime._tempRangeTimer || 0) > 0) {
    runtime._tempRangeTimer = Math.max(0, (runtime._tempRangeTimer || 0) - dt);
    if (runtime._tempRangeTimer === 0) runtime.tempRangeBonus = 0;
  }
  // Decay temporary touch DR from triggers (e.g., Nellis Keep the Line)
  if ((runtime._tempTouchDrTimer || 0) > 0) {
    runtime._tempTouchDrTimer = Math.max(0, (runtime._tempTouchDrTimer || 0) - dt);
    if (runtime._tempTouchDrTimer === 0) runtime.tempTouchDr = 0;
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
  cds.oyinRally = Math.max(0, (cds.oyinRally || 0) - dt);
  cds.twilDust = Math.max(0, (cds.twilDust || 0) - dt);
  cds.tinSlip = Math.max(0, (cds.tinSlip || 0) - dt);
  cds.tinTumble = Math.max(0, (cds.tinTumble || 0) - dt);
  cds.nellisVeil = Math.max(0, (cds.nellisVeil || 0) - dt);
  cds.nellisBeacon = Math.max(0, (cds.nellisBeacon || 0) - dt);
  cds.nellisLine = Math.max(0, (cds.nellisLine || 0) - dt);
  cds.urnCheer = Math.max(0, (cds.urnCheer || 0) - dt);
  cds.varaAngle = Math.max(0, (cds.varaAngle || 0) - dt);

  // Shield countdown
  if (runtime.shieldActive) {
    runtime.shieldTimer = Math.max(0, (runtime.shieldTimer || 0) - dt);
    if (runtime.shieldTimer <= 0) runtime.shieldActive = false;
  }

  // Presence checks and affinity multiplier
  const has = (key) => companions.some(c => (c.name || '').toLowerCase().includes(key));
  const multFor = (key) => {
    let m = 1;
    for (const c of companions) {
      const nm = (c.name || '').toLowerCase();
      if (nm.includes(key)) {
        const aff = (typeof c.affinity === 'number') ? c.affinity : 2;
        const t = Math.max(0, Math.min(9, aff - 1));
        let affMul = 1 + (t / 9) * 0.5;
        const lvlMul = 1 + 0.10 * Math.max(0, (c.level||1) - 1);
        m = Math.max(m, affMul * lvlMul);
      }
    }
    // Synergy boost when Urn and Varabella are both present
    if ((key === 'urn' || key === 'varabella') && has('urn') && has('varabella')) m *= 1.1;
    return m;
  };
  // Canopy shield trigger
  if (has('canopy')) {
    const base = companionEffectsByKey.canopy?.triggers?.shield || { hpThresh: 0.4, cooldownSec: 12, durationSec: 6 };
    const m = multFor('canopy');
    const eff = {
      hpThresh: (base.hpThresh || 0.4) + ((m - 1) * 0.2),
      cooldownSec: (base.cooldownSec || 12) / (1 + (m - 1) * 0.5),
      durationSec: (base.durationSec || 6) * m,
    };
    const hpRatio = player.hp / player.maxHp;
    if (!runtime.shieldActive && (cds.canopyShield || 0) <= 0 && hpRatio < eff.hpThresh) {
      runtime.shieldActive = true;
      runtime.shieldTimer = eff.durationSec;
      cds.canopyShield = eff.cooldownSec;
      spawnFloatText(player.x + player.w/2, player.y - 10, 'Shield!', { color: '#8ab4ff', life: 0.8 });
      try { playSfx('shield'); } catch {}
    }
  }

  // Hola gust trigger
  if (has('hola')) {
    const base = companionEffectsByKey.hola?.triggers?.gust || { radius: 24, slow: 0.25, durationSec: 0.4, push: 14, cooldownSec: 10 };
    const m = multFor('hola');
    const eff = {
      radius: (base.radius || 24) * (1 + (m - 1) * 0.5),
      slow: Math.min((base.slow || 0.25) * m, COMPANION_BUFF_CAPS.slow),
      durationSec: (base.durationSec || 0.4) * m,
      push: (base.push || 14) * m,
      cooldownSec: (base.cooldownSec || 10) / (1 + (m - 1) * 0.5),
    };
    if ((cds.holaGust || 0) <= 0) {
      // Any enemy in radius of player?
      let any = false;
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const dx = e.x - player.x, dy = e.y - player.y;
        if ((dx*dx + dy*dy) <= (eff.radius * eff.radius)) { any = true; break; }
      }
      if (any) {
        for (const e of enemies) {
          if (e.hp <= 0) continue;
          const dx = e.x - player.x, dy = e.y - player.y;
          if ((dx*dx + dy*dy) <= (eff.radius * eff.radius)) {
            const mag = Math.hypot(dx, dy) || 1;
            const px = (dx / mag) * eff.push;
            const py = (dy / mag) * eff.push;
            const solids = [player, ...enemies.filter(x => x !== e && x.hp > 0)];
            moveWithCollision(e, px, py, solids);
            e._gustSlowTimer = Math.max(e._gustSlowTimer || 0, eff.durationSec);
            e._gustSlowFactor = eff.slow;
          }
        }
        cds.holaGust = eff.cooldownSec;
        spawnFloatText(player.x + player.w/2, player.y - 12, 'Gust!', { color: '#a1e3ff', life: 0.8 });
        try { playSfx('gust'); } catch {}
        // Quest tracking: Hola 'Find Her Voice' — count gust uses
        try {
          if (runtime.questFlags && runtime.questFlags['hola_practice_started'] && !runtime.questFlags['hola_practice_cleared']) {
            if (!runtime.questCounters) runtime.questCounters = {};
            const used = (runtime.questCounters['hola_practice_uses'] || 0) + 1;
            runtime.questCounters['hola_practice_uses'] = used;
            if (used >= 2) {
              runtime.questFlags['hola_practice_cleared'] = true;
              showBanner('Quest updated: Find Her Voice — cleared');
            } else {
              showBanner(`Quest: Gust used ${used}/2`);
            }
          }
        } catch {}
      }
    }
  }

  // Oyin Rally: below HP threshold, small heal and temporary ATK buff
  if (has('oyin')) {
    const hpRatio = player.hp / player.maxHp;
    const m = multFor('oyin');
    const heal = Math.min(3, Math.round(2 * m));
    const atkBonus = Math.min(2, 1 * m);
    const dur = 5 * m;
    const thresh = 0.4 + (m - 1) * 0.1;
    const cd = 20 / (1 + (m - 1) * 0.5);
    if ((cds.oyinRally || 0) <= 0 && hpRatio < thresh && player.hp > 0) {
      player.hp = Math.min(player.maxHp, player.hp + heal);
      runtime.tempAtkBonus = Math.max(runtime.tempAtkBonus || 0, atkBonus);
      runtime._tempAtkTimer = Math.max(runtime._tempAtkTimer || 0, dur);
      cds.oyinRally = cd;
      spawnFloatText(player.x + player.w/2, player.y - 12, 'Rally!', { color: '#ffd166', life: 0.9 });
      try { playSfx('rally'); } catch {}
      // Quest tracking: Oyin fuse — mark rally done
      try { if (runtime.questFlags && runtime.questFlags['oyin_fuse_started']) runtime.questFlags['oyin_fuse_rally'] = true; } catch {}
    }
  }

  // Urn Cheer: burst heal when HP dips low
  if (has('urn')) {
    const base = companionEffectsByKey.urn?.triggers?.cheer || { hpThresh: 0.5, heal: 3, radius: 80, cooldownSec: 12 };
    const m = multFor('urn');
    const eff = {
      hpThresh: (base.hpThresh || 0.5),
      heal: Math.round((base.heal || 3) * m),
      radius: (base.radius || 80),
      cooldownSec: (base.cooldownSec || 12) / (1 + (m - 1) * 0.5),
    };
    const hpRatio = player.hp / Math.max(1, player.maxHp || 10);
    if ((cds.urnCheer || 0) <= 0 && player.hp > 0 && hpRatio <= eff.hpThresh) {
      // Heal player (companions do not track HP in this slice)
      player.hp = Math.min(player.maxHp, player.hp + eff.heal);
      // Visuals and SFX
      spawnFloatText(player.x + player.w/2, player.y - 12, 'Cheer!', { color: '#8effc1', life: 0.9 });
      for (let i = 0; i < 8; i++) spawnSparkle(player.x + player.w/2 + (Math.random()*12-6), player.y - 6 + (Math.random()*8-4));
      try { playSfx('cheer'); } catch {}
      cds.urnCheer = eff.cooldownSec;
    }
  }

  // Varabella Call the Angle: brief ATK + range window when enemies nearby
  if (has('varabella')) {
    const base = companionEffectsByKey.varabella?.triggers?.angle || { atk: 1, range: 2, durationSec: 3, cooldownSec: 9, proximity: 140 };
    const m = multFor('varabella');
    const eff = {
      atk: Math.min(2, (base.atk || 1) * m),
      range: Math.min(3, (base.range || 2) * m),
      durationSec: (base.durationSec || 3) * m,
      cooldownSec: (base.cooldownSec || 9) / (1 + (m - 1) * 0.5),
      proximity: (base.proximity || 140),
    };
    if ((cds.varaAngle || 0) <= 0) {
      let any = false;
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const dx = e.x - player.x, dy = e.y - player.y;
        if ((dx*dx + dy*dy) <= (eff.proximity * eff.proximity)) { any = true; break; }
      }
      if (any) {
        runtime.tempAtkBonus = Math.max(runtime.tempAtkBonus || 0, eff.atk);
        runtime._tempAtkTimer = Math.max(runtime._tempAtkTimer || 0, eff.durationSec);
        runtime.tempRangeBonus = Math.max(runtime.tempRangeBonus || 0, eff.range);
        runtime._tempRangeTimer = Math.max(runtime._tempRangeTimer || 0, eff.durationSec);
        cds.varaAngle = eff.cooldownSec;
        spawnFloatText(player.x + player.w/2, player.y - 12, 'Angle!', { color: '#ffd166', life: 0.8 });
        try { playSfx('angle'); } catch {}
      }
    }
  }

  // Tin Slipstream: breezy micro-push + small slow, short range boost
  if (has('tin')) {
    const base = { radius: 26, push: 10, slow: 0.15, slowDur: 0.4, rangeBonus: 2, rangeDur: 2.0, cooldownSec: 10 };
    const m = multFor('tin');
    const eff = {
      radius: base.radius * (1 + (m - 1) * 0.3),
      push: base.push * m,
      slow: Math.min(base.slow * m, COMPANION_BUFF_CAPS.slow),
      slowDur: base.slowDur * m,
      rangeBonus: Math.min(3, base.rangeBonus * m),
      rangeDur: base.rangeDur * m,
      cooldownSec: base.cooldownSec / (1 + (m - 1) * 0.5),
    };
    if ((cds.tinSlip || 0) <= 0) {
      let any = false;
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const dx = e.x - player.x, dy = e.y - player.y;
        if ((dx*dx + dy*dy) <= (eff.radius * eff.radius)) { any = true; break; }
      }
      if (any) {
        for (const e of enemies) {
          if (e.hp <= 0) continue;
          const dx = e.x - player.x, dy = e.y - player.y;
          if ((dx*dx + dy*dy) <= (eff.radius * eff.radius)) {
            const mag = Math.hypot(dx, dy) || 1;
            moveWithCollision(e, (dx / mag) * eff.push, (dy / mag) * eff.push, [player, ...enemies.filter(x=>x!==e&&x.hp>0)]);
            e._veilSlowTimer = Math.max(e._veilSlowTimer || 0, eff.slowDur);
            e._veilSlow = eff.slow;
          }
        }
        runtime.tempRangeBonus = Math.max(runtime.tempRangeBonus || 0, eff.rangeBonus);
        runtime._tempRangeTimer = Math.max(runtime._tempRangeTimer || 0, eff.rangeDur);
        cds.tinSlip = eff.cooldownSec;
        spawnFloatText(player.x + player.w/2, player.y - 12, 'Slipstream!', { color: '#a1e3ff', life: 0.8 });
        try { playSfx('slipstream'); } catch {}
      }
    }
  }

  // Tin Tumble Up: on recent hit, quick heal and brief ATK boost
  if (has('tin')) {
    const m = multFor('tin');
    const heal = Math.max(1, Math.round(1 * m));
    const atk = Math.min(2, 1 * m);
    const dur = 3 * m;
    const cd = 20 / (1 + (m - 1) * 0.5);
    if ((cds.tinTumble || 0) <= 0 && (runtime._recentPlayerHitTimer || 0) > 0 && player.hp > 0) {
      player.hp = Math.min(player.maxHp, player.hp + heal);
      runtime.tempAtkBonus = Math.max(runtime.tempAtkBonus || 0, atk);
      runtime._tempAtkTimer = Math.max(runtime._tempAtkTimer || 0, dur);
      cds.tinTumble = cd;
      spawnFloatText(player.x + player.w/2, player.y - 12, 'Tumble Up!', { color: '#ffd166', life: 0.9 });
      try { playSfx('tumbleUp'); } catch {}
    }
  }

  // Nellis Mourner's Veil: heavier slow when multiple enemies nearby
  if (has('nellis')) {
    let nearby = 0;
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      const dx = e.x - player.x, dy = e.y - player.y;
      if ((dx*dx + dy*dy) <= (40*40)) { nearby++; if (nearby >= 2) break; }
    }
    const m = multFor('nellis');
    const r = 36 * (1 + (m - 1) * 0.4);
    const dur = 0.4 * m;
    const slow = Math.min(0.6, 0.35 * m);
    const cd = 11 / (1 + (m - 1) * 0.5);
    if (nearby >= 2 && (cds.nellisVeil || 0) <= 0) {
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const dx = e.x - player.x, dy = e.y - player.y;
        if ((dx*dx + dy*dy) <= (r*r)) { e._veilSlowTimer = Math.max(e._veilSlowTimer || 0, dur); e._veilSlow = slow; }
      }
      cds.nellisVeil = cd;
      spawnFloatText(player.x + player.w/2, player.y - 12, 'Veil.', { color: '#a1e3ff', life: 0.8 });
      try { playSfx('mournerVeil'); } catch {}
    }
  }

  // Nellis Beacon: short range buff when enemies are near
  if (has('nellis')) {
    const m = multFor('nellis');
    const range = Math.min(3, 2 * m);
    const dur = 3 * m;
    const cd = 9 / (1 + (m - 1) * 0.5);
    if ((cds.nellisBeacon || 0) <= 0) {
      let any = false;
      for (const e of enemies) { if (e.hp > 0) { const dx = e.x - player.x, dy = e.y - player.y; if ((dx*dx + dy*dy) <= (140*140)) { any = true; break; } } }
      if (any) {
        runtime.tempRangeBonus = Math.max(runtime.tempRangeBonus || 0, range);
        runtime._tempRangeTimer = Math.max(runtime._tempRangeTimer || 0, dur);
        cds.nellisBeacon = cd;
        spawnFloatText(player.x + player.w/2, player.y - 12, 'Beacon.', { color: '#9ae6ff', life: 0.8 });
        try { playSfx('beacon'); } catch {}
      }
    }
  }

  // Nellis Keep the Line: when HP low, DR boost and small enemy slow
  if (has('nellis')) {
    const hpRatio = player.hp / Math.max(1, player.maxHp || 10);
    const m = multFor('nellis');
    const dr = Math.min(2, 1 * m);
    const dur = 4 * m;
    const cd = 18 / (1 + (m - 1) * 0.5);
    const slow = Math.min(0.25, 0.2 * m);
    if ((cds.nellisLine || 0) <= 0 && player.hp > 0 && hpRatio <= (0.5 + (m - 1) * 0.05)) {
      // Apply DR via tempAtkBonus? DR is in combatBuffs; we can temporarily add to touchDR via runtime.tempTouchDr
      runtime.tempTouchDr = Math.max(runtime.tempTouchDr || 0, dr);
      runtime._tempTouchDrTimer = Math.max(runtime._tempTouchDrTimer || 0, dur);
      // Slight slow around player
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const dx = e.x - player.x, dy = e.y - player.y;
        if ((dx*dx + dy*dy) <= (40*40)) { e._veilSlowTimer = Math.max(e._veilSlowTimer || 0, 0.3 * m); e._veilSlow = slow; }
      }
      cds.nellisLine = cd;
      spawnFloatText(player.x + player.w/2, player.y - 12, 'Keep the Line.', { color: '#8ab4ff', life: 0.8 });
      try { playSfx('keepLine'); } catch {}
    }
  }
  // Twil Dust Veil: if 2+ enemies are close, apply heavy slow briefly
  if (has('twil')) {
    let nearby = 0;
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      const dx = e.x - player.x, dy = e.y - player.y;
      if ((dx*dx + dy*dy) <= (40*40)) nearby++;
      if (nearby >= 2) break;
    }
    const m = multFor('twil');
    const r = 40 * (1 + (m - 1) * 0.5);
    const dur = 0.4 * m;
    const slow = Math.min(0.6, 0.5 * m);
    const cd = 12 / (1 + (m - 1) * 0.5);
    if (nearby >= 2 && (cds.twilDust || 0) <= 0) {
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const dx = e.x - player.x, dy = e.y - player.y;
        if ((dx*dx + dy*dy) <= (r*r)) { e._veilSlowTimer = Math.max(e._veilSlowTimer || 0, dur); e._veilSlow = slow; }
      }
      cds.twilDust = cd;
      spawnFloatText(player.x + player.w/2, player.y - 12, 'Veil!', { color: '#a1e3ff', life: 0.8 });
      try { playSfx('veil'); } catch {}
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
