import { player, enemies, companions, npcs, obstacles, world, camera, runtime, corpses, spawnCorpse, stains, spawnStain, floaters, spawnFloatText, sparkles, spawnSparkle, itemsOnGround, spawnPickup, spawners, findSpawnerById, spawnEnemy, addItemToInventory, autoEquipIfBetter, normalizeInventory } from '../engine/state.js';
import { rebuildLighting } from '../engine/lighting.js';
import { rebuildFlowField, sampleFlowDirAt } from '../engine/pathfinding.js';
import { companionEffectsByKey, COMPANION_BUFF_CAPS } from '../data/companion_effects.js';
import { enemyEffectsByKey, ENEMY_BUFF_CAPS } from '../data/enemy_effects.js';
import { playSfx, setMusicMode } from '../engine/audio.js';
import { autoTurnInIfCleared } from '../engine/quests.js';
import { clearFadeOverlay } from '../engine/ui.js';
import { FRAMES_PER_DIR } from '../engine/constants.js';
import { rectsIntersect, getEquipStats, segmentIntersectsRect } from '../engine/utils.js';
import { sampleLightAtPx } from '../engine/lighting.js';
import { handleAttacks, startRangedAttack as startRangedAttackFn } from './combat.js';
import { startGameOver, startPrompt } from '../engine/dialog.js';
import { completionXpForLevel, grantPartyXp } from '../engine/state.js';
import { projectiles, spawnProjectile } from '../engine/state.js';
import { exitChat } from '../engine/ui.js';
import { saveGame } from '../engine/save.js';
import { showBanner, updateBuffBadges, showMusicTheme } from '../engine/ui.js';
import { ENEMY_LOOT, ENEMY_LOOT_L2, ENEMY_LOOT_L3, rollFromTable, itemById, BREAKABLE_LOOT } from '../data/loot.js';
import { AI_TUNING } from '../data/ai_tuning.js';

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

// Build narration + boss dialogue for a phase shift. `phase` is 2 (second phase)
// or 3 (final form for Vorthak). We keep one string with narration first and a
// quoted line after, matching VN style elsewhere.
function phaseShiftText(enemy, phase = 2) {
  const nm = (enemy?.name || 'Boss').toLowerCase();
  const title = enemy?.name || 'Boss';
  // Helpers for narration fragments
  const join = (a, b) => `${a}\n\n${b}`;
  if (nm.includes('vast')) {
    const nar = 'Heat ripples the air; black fire threads her veins. The stone itself seems to recoil as a furnace blooms behind her eyes.';
    const dlg = `${title}: \"Urathar—let hope burn. Give me cinders to scatter.\"`;
    return join(nar, dlg);
  }
  if (nm.includes('nethra')) {
    const nar = 'Sigils blaze in the sand; veils snap like banners in a hot wind. Every edge grows knife-sharp.';
    const dlg = `${title}: \"Urathar, veil my heart and sharpen the mirage into knives.\"`;
    return join(nar, dlg);
  }
  if (nm.includes('luula')) {
    const nar = 'The marsh hushes. Moonlight gathers in the reeds as the water swells toward her hands.';
    const dlg = `${title}: \"Urathar, lend me your tide—let silver drown the stubborn.\"`;
    return join(nar, dlg);
  }
  if (nm.includes('vanificia')) {
    const nar = 'A cold waltz takes the plaza; ash glitters along her sleeves. Elegance hardens into an edge that wants blood.';
    const dlg = `${title}: \"Urathar, crown my grace with cruelty—let manners cut deeper.\"`;
    return join(nar, dlg);
  }
  if (nm.includes('vorthak')) {
    if (phase >= 3) {
      const nar = 'The temple dims. Fissures glow. Chains of light shatter as a crown of ruin forms above him.';
      const dlg = `${title}: \"Urathar—break the seals. Crown me with ruin.\"`;
      return join(nar, dlg);
    }
    const nar = 'Stone roars; the Heart\'s embers whirl into a vortex and race into his chest.';
    const dlg = `${title}: \"Urathar, pour the Heart\'s fire into me. Witness your instrument.\"`;
    return join(nar, dlg);
  }
  // Generic fallback
  const nar = 'The air turns heavy as infernal energy floods their frame. Wounds seal; the ground itself seems to tilt toward them.';
  const dlg = `${title}: \"Urathar—answer. Make me more than I was.\"`;
  return join(nar, dlg);
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
  // Allow death-scene timers to progress even while paused (to avoid freeze)
  try {
    // Safety: ensure player is visible if alive (debug overlays should not hide the player)
    if (player.hp > 0 && runtime._hidePlayer) {
      runtime._hidePlayer = false;
      runtime._deathZoom = 1.0; runtime._deathZoomTarget = 1.0;
    }
    if (player.hp <= 0) {
      if ((runtime._suppressInputTimer || 0) > 0) runtime._suppressInputTimer = Math.max(0, (runtime._suppressInputTimer || 0) - dt);
      if ((runtime._deathDelay || 0) > 0) {
        runtime._deathDelay = Math.max(0, (runtime._deathDelay || 0) - dt);
        if (runtime._deathDelay === 0) runtime._awaitGameOverKey = true;
      }
    }
  } catch {}
  // Pause the world while VN/inventory overlay is open (but keep the above timers running)
  if (runtime.gameState === 'chat') return;
  if (runtime.paused) return;
  // Advance chemistry timers
  runtime._timeSec = (runtime._timeSec || 0) + dt;
  // Decay global screen shake timer
  if ((runtime.shakeTimer || 0) > 0) runtime.shakeTimer = Math.max(0, (runtime.shakeTimer || 0) - dt);
  // Decay VN intro cooldown so flagged actors don't retrigger back-to-back
  if ((runtime.introCooldown || 0) > 0) runtime.introCooldown = Math.max(0, (runtime.introCooldown || 0) - dt);
  // Track recent low-HP window (3s) for certain pair ticks
  try {
    const below = player.hp < (player.maxHp || 10) * 0.5;
    if (below) runtime._lowHpTimer = 3.0;
    else if ((runtime._lowHpTimer || 0) > 0) runtime._lowHpTimer = Math.max(0, runtime._lowHpTimer - dt);
    // Recent-hit timer for triggers that respond to damage taken
    if ((runtime._recentPlayerHitTimer || 0) > 0) runtime._recentPlayerHitTimer = Math.max(0, runtime._recentPlayerHitTimer - dt);
    // Keep inventory consistent (recover keys accidentally put into equipped, etc.)
    normalizeInventory(player.inventory);
  } catch {}
  // Decay global input suppression timer (used for death scene)
  try { if ((runtime._suppressInputTimer || 0) > 0) runtime._suppressInputTimer = Math.max(0, (runtime._suppressInputTimer || 0) - dt); } catch {}

  // Torch burnout: if a torch is equipped in left hand, tick down and consume on expiry
  try {
    const eq = player?.inventory?.equipped || {};
    const LH = eq.leftHand || null;
    if (LH && LH.id === 'torch') {
      // Initialize timer if missing
      if (typeof LH.burnMsRemaining !== 'number' || !(LH.burnMsRemaining >= 0)) LH.burnMsRemaining = 180000; // 180s default
      LH.burnMsRemaining = Math.max(0, LH.burnMsRemaining - dt * 1000);
      if (LH.burnMsRemaining <= 0) {
        // Torch burned out — consume (remove from slot) and try to auto-equip a fresh one from inventory
        eq.leftHand = null;
        let relit = false;
        try {
          const inv = player?.inventory?.items || [];
          const idx = inv.findIndex(s => s && s.stackable && s.id === 'torch' && (s.qty||0) > 0);
          if (idx !== -1) {
            inv[idx].qty = Math.max(0, (inv[idx].qty || 0) - 1);
            if (inv[idx].qty <= 0) inv.splice(idx, 1);
            // Equip a fresh single-use torch instance
            eq.leftHand = { id: 'torch', name: 'Torch', slot: 'leftHand', atk: 0, burnMsRemaining: 180000 };
            relit = true;
          }
        } catch {}
        try { showBanner(relit ? 'Lit a new torch' : 'Torch burned out'); } catch {}
      }
    }
  } catch {}

  // (Torch timer HUD now drawn in render overlay; no DOM updates needed)

  // Torch bearer: tick burn and update light node position
  try {
    const comp = runtime._torchBearerRef || null;
    const node = runtime._torchLightNode || null;
    if (comp && node) {
      // Follow companion position
      node.x = comp.x + comp.w/2; node.y = comp.y + comp.h/2; node.enabled = true;
      // Tick burn (ms)
      runtime._torchBurnMs = Math.max(0, (runtime._torchBurnMs || 0) - dt * 1000);
      if (runtime._torchBurnMs <= 0) {
        node.enabled = false;
        runtime._torchLightNode = null;
        runtime._torchBearerRef = null;
        showBanner('Torch burned out');
      }
    }
  } catch {}

  // Rebuild lighting grid (coarse, tile-based). Throttle lightly (~60ms) to reduce cost.
  try { rebuildLighting(60); } catch {}
  // Rebuild pathfinding flow field on a throttle; dirty on player tile change or gate toggles
  try { rebuildFlowField(150); } catch {}

  // --- Projectiles tick ---
  if (Array.isArray(projectiles) && projectiles.length) {
    const removeIdx = [];
    const worldW = world.w, worldH = world.h;
    for (let i = 0; i < projectiles.length; i++) {
      const p = projectiles[i];
      const ox = p.x + p.w/2, oy = p.y + p.h/2;
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      const nxC = nx + p.w/2, nyC = ny + p.h/2;
      let hitSomething = false;
      // Hola wind deflection: attempt when entering aura radius (one-time)
      try {
        const def = runtime.projectileDeflect || { chance: 0, radius: 0 };
        if (p.team === 'enemy' && (def.chance || 0) > 0 && (def.radius || 0) > 0 && !p._deflectTried) {
          const pxp = player.x + player.w/2, pyp = player.y + player.h/2;
          const r2 = (def.radius || 0) * (def.radius || 0);
          const odx = ox - pxp, ody = oy - pyp;
          const ndx = nxC - pxp, ndy = nyC - pyp;
          const wasOutside = (odx*odx + ody*ody) > r2;
          const isInside = (ndx*ndx + ndy*ndy) <= r2;
          if ((wasOutside && isInside) || isInside) {
            p._deflectTried = true; // only attempt once
            if (Math.random() < Math.max(0, Math.min(1, def.chance))) {
              // Redirect projectile outward from player with slight random spread
              const baseAng = Math.atan2(nyC - pyp, nxC - pxp);
              const jitter = (Math.random() * 0.6 - 0.3); // +/- ~17 degrees
              const ang = baseAng + jitter;
              const spd = Math.max(20, Math.hypot(p.vx, p.vy) * 0.85);
              p.vx = Math.cos(ang) * spd;
              p.vy = Math.sin(ang) * spd;
              p.color = '#a1e3ff'; // visually hint wind deflect
              p._deflected = true;
              // Reduce damage slightly on deflect
              p.damage = Math.max(0, Math.floor((p.damage || 1) * 0.7));
              try { spawnSparkle(nxC, nyC); } catch {}
            }
          }
        }
      } catch {}

      // Obstacles that block attacks (respect unlocked gates)
      for (const o of obstacles) {
        if (!o || !o.blocksAttacks) continue;
        if (o.type === 'gate' && o.locked === false) continue;
        if (segmentIntersectsRect(ox, oy, nxC, nyC, o)) { hitSomething = true; break; }
      }
      if (hitSomething) { removeIdx.push(i); continue; }
      // Move
      p.x = nx; p.y = ny; p.life -= dt;
      // Out of world / expired
      if (p.life <= 0 || p.x < -8 || p.y < -8 || p.x > worldW + 8 || p.y > worldH + 8) { removeIdx.push(i); continue; }
      // Breakables: allow player shots to damage barrels/crates
      if (p.team === 'player') {
        for (let j = obstacles.length - 1; j >= 0; j--) {
          const o = obstacles[j];
          if (!o || (o.type !== 'barrel' && o.type !== 'crate')) continue;
          if (segmentIntersectsRect(ox, oy, nxC, nyC, o)) {
            o.hp = (typeof o.hp === 'number') ? o.hp - 1 : -1;
            if (o.hp <= 0) {
              try {
                const table = BREAKABLE_LOOT[o.type] || [];
                const drop = rollFromTable(table);
                if (drop) spawnPickup(o.x + o.w/2 - 5, o.y + o.h/2 - 5, drop);
              } catch {}
              const idx = obstacles.indexOf(o);
              if (idx !== -1) obstacles.splice(idx, 1);
              try { playSfx('break'); } catch {}
              try { import('../engine/pathfinding.js').then(m => m.markFlowDirty && m.markFlowDirty()).catch(()=>{}); } catch {}
            }
            // Consume the projectile unless it pierces
            if (p.pierce > 0) { p.pierce--; }
            else { hitSomething = true; removeIdx.push(i); }
            break;
          }
        }
        if (hitSomething) continue;
      }
      // Target hits
      if (p.team === 'player') {
        // Hit enemies
        for (const e of enemies) {
          if (!e || e.hp <= 0) continue;
          if (segmentIntersectsRect(ox, oy, nxC, nyC, e)) {
            // Player crits and enemy DR
            const toggles = runtime?.combatToggles || { playerCrits: true };
            // Base damage comes precomputed in projectile.damage; allow small boost from temp bonus already baked in
            let finalDmg = Math.max(1, p.damage || 1);
            let isCrit = false;
            if (toggles.playerCrits) {
              let critChance = 0.08 + (runtime?.combatBuffs?.crit || 0);
              if (Math.random() < critChance) { isCrit = true; finalDmg = Math.ceil(finalDmg * 1.5); }
            }
            const before = e.hp;
            e.hp -= finalDmg;
            try {
              let enemyDr = Math.max(0, (e._baseDr || 0) + (e._tempDr || 0));
              if (isCrit) enemyDr = Math.max(0, enemyDr * 0.5);
              if (enemyDr > 0) {
                const reduce = Math.min(enemyDr, finalDmg);
                e.hp += reduce;
              }
              e._recentHitTimer = Math.max(e._recentHitTimer || 0, 0.9);
            } catch {}
            try { import('../engine/ui.js').then(u => u.showTargetInfo && u.showTargetInfo(`${e.name || 'Enemy'}`)); } catch {}
            if (isCrit) {
              import('../engine/state.js').then(m => m.spawnFloatText(e.x + e.w/2, e.y - 12, `Crit! ${Number(Math.max(1, finalDmg)).toFixed(2)}`, { color: '#ffd166', life: 0.8 }));
              try { playSfx('pierce'); } catch {}
            } else {
              import('../engine/state.js').then(m => m.spawnFloatText(e.x + e.w/2, e.y - 10, `${Number(Math.max(1, finalDmg)).toFixed(2)}`, { color: '#eaeaea', life: 0.6 }));
              try { playSfx('hit'); } catch {}
            }
            // Phase 1: Brace on projectile hit for bosses/featured (knockback reduction + temp projectile DR + slight slow)
            try {
              const kind = String(e.kind || 'mook').toLowerCase();
              if (kind === 'boss' || kind === 'featured') {
                const TT = AI_TUNING[kind];
                const dur = TT.brace.durationSec;
                const addDr = TT.brace.projDr;
                e._braceTimer = Math.max(e._braceTimer || 0, dur);
                e._braceKbMul = TT.brace.kbMul;
                e._braceSpeedMul = TT.brace.speedMul;
                e._tempDr = Math.max(e._tempDr || 0, addDr);
                e._tempDrTimer = Math.max(e._tempDrTimer || 0, dur);
                // Advance-under-fire: track short hit streak and trigger a push-through window
                const win = TT.advance.windowSec || 0.8;
                if ((e._hitStreakTimer || 0) > 0) e._hitStreakCount = (e._hitStreakCount || 0) + 1; else e._hitStreakCount = 1;
                e._hitStreakTimer = win;
                if (e._hitStreakCount >= (TT.advance.triggerHits || 2)) {
                  e._advanceTimer = Math.max(e._advanceTimer || 0, TT.advance.durationSec || 0.6);
                  e._advanceSpeedMul = TT.advance.speedMul || 1.3;
                  e._advanceKbMul = TT.advance.kbMul || 0.2;
                  // Optionally clamp dash cooldown to encourage a quick gap-closer soon
                  if ((e._dashCd || 0) > (TT.advance.dashCooldownCapSec || 5.0)) e._dashCd = TT.advance.dashCooldownCapSec || 5.0;
                  e._hitStreakCount = 0; // reset streak after triggering
                }
              }
            } catch {}
            // Twil (swapped): fire arrows kindle quest progress for Light the Fuse
            try {
              const hasTwil = companions.some(c => (c.name || '').toLowerCase().includes('twil'));
              if (hasTwil) {
                if (runtime.questFlags && runtime.questFlags['twil_fuse_started'] && !runtime.questFlags['twil_fuse_cleared']) {
                  if (!e._questKindled) {
                    e._questKindled = true;
                    if (!runtime.questCounters) runtime.questCounters = {};
                    const n = (runtime.questCounters['twil_fuse_kindled'] || 0) + 1;
                    runtime.questCounters['twil_fuse_kindled'] = n;
                    if (n >= 3) { runtime.questFlags['twil_fuse_cleared'] = true; showBanner('Quest updated: Light the Fuse — cleared'); }
                  }
                }
              }
            } catch {}
            // Twil (swapped): fire arrows add a brief burn DoT
            try {
              const hasTwil = companions.some(c => (c.name || '').toLowerCase().includes('twil'));
              if (hasTwil) {
                e._burnTimer = Math.max(e._burnTimer || 0, 1.2);
                e._burnDps = Math.max(e._burnDps || 0, 0.35);
              }
            } catch {}
            // Knockback from projectile dir (reduced for elites; further reduced if braced/advancing)
            const dvx = p.vx, dvy = p.vy; const mag = Math.hypot(dvx, dvy) || 1;
            const kind2 = String(e.kind || 'mook').toLowerCase();
            let kb = (p.knockback || 60);
            if (kind2 === 'boss') kb *= 0.22; else if (kind2 === 'featured') kb *= 0.33;
            if (e._braceTimer && e._braceTimer > 0) kb *= Math.max(0.1, Math.min(1, (e._braceKbMul || 1)));
            if (e._advanceTimer && e._advanceTimer > 0) kb *= Math.max(0.1, Math.min(1, (e._advanceKbMul || 1)));
            e.knockbackX = (dvx / mag) * kb;
            e.knockbackY = (dvy / mag) * kb;
            // Consume or pierce
            if (p.pierce > 0) { p.pierce--; }
            else { removeIdx.push(i); }
            break;
          }
        }
      } else if (p.team === 'enemy') {
        // Hit player (respect invuln briefly)
        if (player.invulnTimer <= 0) {
          const pr = { x: player.x, y: player.y, w: player.w, h: player.h };
          if (segmentIntersectsRect(ox, oy, nxC, nyC, pr)) {
            // Find source enemy for tuning
            let src = null;
            if (p.sourceId) { src = enemies.find(e => e && e.id === p.sourceId); }
            // Pull defaults by class
            const kind = (src?.kind || 'mook').toLowerCase();
            const def = (kind === 'boss') ? { cc: 0.12, ignore: 0.7, bonus: 3, chipMin: 0, chipMax: 0 }
                        : (kind === 'featured') ? { cc: 0.10, ignore: 0.6, bonus: 2, chipMin: 1, chipMax: 2 }
                        : { cc: 0.06, ignore: 0.5, bonus: 1, chipMin: 1, chipMax: 1 };
            const toggles = runtime?.combatToggles || { chip: true, enemyCrits: true, ap: true };
            const raw = Math.max(0, p.damage || 1);
            // Ranged: use rangedDR instead of touchDR; include shield mitigation if a shield is equipped in left hand
            let baseDr = (getEquipStats(player).dr || 0) + (runtime?.combatBuffs?.dr || 0) + (runtime?.combatBuffs?.rangedDR || 0);
            try {
              const LH = player?.inventory?.equipped?.leftHand || null;
              if (LH && (LH.isShield || /shield|buckler/i.test(LH.name || LH.id || ''))) {
                const sdr = Math.max(0, Number(LH.dr || 0));
                // Significant mitigation vs ranged: double shield DR + small flat
                baseDr += Math.max(0, sdr * 2 + 1);
              }
            } catch {}
            const dr = baseDr + (player.levelDrBonus || 0);
            const cc = (typeof src?.critChance === 'number') ? src.critChance : def.cc;
            const cIgnore = (typeof src?.critDrIgnore === 'number') ? src.critDrIgnore : def.ignore;
            const cBonus = (typeof src?.critBonus === 'number') ? src.critBonus : def.bonus;
            const ap = toggles.ap ? Math.max(0, (typeof src?.ap === 'number') ? src.ap : 0) : 0;
            const tDmg = toggles.ap ? Math.max(0, (typeof src?.trueDamage === 'number') ? src.trueDamage : 0) : 0;

            const isCrit = (toggles.enemyCrits && Math.random() < cc);
            let effDr = dr;
            if (isCrit) effDr = Math.max(0, effDr * (1 - cIgnore));
            if (ap > 0) effDr = Math.max(0, effDr - ap);
            let taken = Math.max(0, raw - effDr);
            if (isCrit) taken += Math.max(0, cBonus);
            if (tDmg > 0) taken += tDmg;
            if (toggles.chip && kind !== 'boss') {
              const chipBase = Math.round(raw * 0.10);
              const chip = Math.max(def.chipMin, Math.min(def.chipMax, chipBase));
              if (taken > 0 && taken < chip) taken = chip;
              if (taken === 0 && chip > 0) taken = chip;
            }
            if (runtime.godMode) taken = 0;
            if (runtime.shieldActive && taken > 0) { taken = 0; runtime.shieldActive = false; }
            if (taken > 0) {
              player.hp = Math.max(0, player.hp - taken);
              player.knockbackX = 0; player.knockbackY = 0;
              player.invulnTimer = 0.6;
              runtime.interactLock = Math.max(runtime.interactLock, 0.2);
              runtime._recentPlayerHitTimer = 0.25;
              let label = null; let color = '#ff7a7a'; let sfx = 'hit';
              const fmt = (n) => Number.isFinite(n) ? Number(n).toFixed(2) : String(n);
              if (isCrit) { label = `Crit ${fmt(taken)}`; color = '#ffd166'; sfx = 'pierce'; }
              else if ((ap > 0 || tDmg > 0) && (taken >= raw - dr)) { label = `Pierce! ${fmt(taken)}`; color = '#ffd166'; sfx = 'pierce'; }
              import('../engine/state.js').then(m => m.spawnFloatText(player.x + player.w/2, player.y - 6, label || `-${fmt(taken)}`, { color, life: 0.7 }));
              try { playSfx(sfx); } catch {}
            } else {
              import('../engine/state.js').then(m => m.spawnFloatText(player.x + player.w/2, player.y - 6, 'Blocked', { color: '#a8c6ff', life: 0.7 }));
              try { playSfx('block'); } catch {}
            }
            // Consume projectile
            removeIdx.push(i);
          }
        }
      }
    }
    // Remove in reverse order
    if (removeIdx.length) {
      removeIdx.sort((a,b)=>b-a).forEach(idx => { projectiles.splice(idx, 1); });
    }
    // Hard cap to avoid spam
    const cap = 128;
    if (projectiles.length > cap) projectiles.splice(0, projectiles.length - cap);
  }

  // --- Spawner tick ---
  try {
    if (Array.isArray(spawners) && spawners.length) {
      const now = runtime._timeSec || 0;
      for (const sp of spawners) {
        if (!sp || !sp.active || sp.disabled) continue;
        // Gate by flags
        if (sp.gates) {
          const f = runtime.questFlags || {};
          if (sp.gates.requiresFlag && !f[sp.gates.requiresFlag]) continue;
          if (sp.gates.missingFlag && f[sp.gates.missingFlag]) continue;
        }
        // Proximity gating
        const cx = sp.x + sp.w/2, cy = sp.y + sp.h/2;
        const dx = (player.x + player.w/2) - cx;
        const dy = (player.y + player.h/2) - cy;
        const near = (dx*dx + dy*dy) <= (sp.radiusPx * sp.radiusPx);
        if (sp.proximityMode === 'near' && !near) { sp._eligible = false; continue; }
        if (sp.proximityMode === 'far' && near) { sp._eligible = false; continue; }
        // Exhaustion
        const remaining = (typeof sp.totalToSpawn === 'number') ? Math.max(0, sp.totalToSpawn - sp.spawnedCount) : Infinity;
        if (remaining <= 0) { sp.disabled = true; sp._eligible = false; continue; }
        // Concurrency headroom
        // Prune stale ids
        if (sp.currentlyAliveIds && sp.currentlyAliveIds.size) {
          for (const id of Array.from(sp.currentlyAliveIds)) {
            if (!enemies.find(e => e && e.id === id)) sp.currentlyAliveIds.delete(id);
          }
        }
        const live = sp.currentlyAliveIds ? sp.currentlyAliveIds.size : 0;
        const capRoom = (typeof sp.concurrentCap === 'number') ? Math.max(0, sp.concurrentCap - live) : sp.batchSize;
        if (capRoom <= 0) { sp._eligible = false; continue; }
        // Mark eligible for visual pulse
        sp._eligible = true;
        // Interval
        if (now < (sp.nextAt || 0)) continue;
        const toSpawn = Math.max(0, Math.min(sp.batchSize, capRoom, remaining));
        if (toSpawn <= 0) {
          // schedule next check anyway
          const j = (sp.jitterSec || 0);
          const jitter = j > 0 ? (Math.random()*2*j - j) : 0;
          sp.nextAt = now + Math.max(0.1, sp.intervalSec + jitter);
          continue;
        }
        for (let i = 0; i < toSpawn; i++) {
          const ox = (Math.random()*sp.w - sp.w/2);
          const oy = (Math.random()*sp.h - sp.h/2);
          const ex = Math.round(cx + ox);
          const ey = Math.round(cy + oy);
          const tmpl = sp.enemy || { kind: 'mook' };
          const kind = tmpl.kind || 'mook';
          const opts = Object.assign({}, tmpl);
          delete opts.kind;
          opts.spawnerId = sp.id;
          const e = spawnEnemy(ex, ey, kind, opts);
          if (!sp.currentlyAliveIds) sp.currentlyAliveIds = new Set();
          sp.currentlyAliveIds.add(e.id);
          sp.spawnedCount += 1;
          if (window && window.DEBUG_SPAWNERS) {
            try { console.log('[SPAWNER]', sp.id, 'spawned', e.name || e.kind, 'live=', sp.currentlyAliveIds.size, 'spawnedCount=', sp.spawnedCount); } catch {}
          }
          // Stop if exhausted mid-batch
          if (typeof sp.totalToSpawn === 'number' && sp.spawnedCount >= sp.totalToSpawn) { sp.disabled = true; break; }
        }
        const j = (sp.jitterSec || 0);
        const jitter = j > 0 ? (Math.random()*2*j - j) : 0;
        sp.nextAt = now + Math.max(0.1, sp.intervalSec + jitter);
      }
    }
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
          // Ensure any full-screen fade is cleared before opening VN
          try { clearFadeOverlay(); } catch {}
          const isEnemy = (typeof actor?.touchDamage === 'number');
          playSfx(isEnemy ? 'vnIntroEnemy' : 'vnIntroNpc');
        } catch {}
        // Use Continue choice if there are more queued VN entries
        const more = Array.isArray(runtime._queuedVNs) && runtime._queuedVNs.length > 0;
        const choices = more ? [ { label: 'Continue', action: 'vn_continue' } ] : [];
        startPrompt(actor, text, choices);
      }
    }
    return; // halt simulation during pan
  }
  // Cinematic pause (e.g., boss phase transition): hold simulation; after pause, pan then show VN
  if ((runtime.scenePauseTimer || 0) > 0) {
    runtime.scenePauseTimer = Math.max(0, (runtime.scenePauseTimer || 0) - dt);
    if (runtime.scenePauseTimer <= 0 && runtime._phaseCinePending) {
      try {
        const { actor, text } = runtime._phaseCinePending;
        // If actor has coordinates, pan; otherwise show immediately without pan
        const hasPos = actor && typeof actor.x === 'number' && typeof actor.y === 'number' && typeof actor.w === 'number' && typeof actor.h === 'number';
        if (hasPos) {
          const toX = Math.round(actor.x + actor.w/2 - camera.w/2);
          const toY = Math.round(actor.y + actor.h/2 - camera.h/2);
          runtime.cameraPan = {
            fromX: camera.x,
            fromY: camera.y,
            toX: Math.max(0, Math.min(world.w - camera.w, toX)),
            toY: Math.max(0, Math.min(world.h - camera.h, toY)),
            t: 0,
            dur: 0.6,
          };
          runtime.pendingIntro = { actor, text };
        } else {
          // No coordinates → ensure fade is cleared, then show VN immediately
          try { clearFadeOverlay(); } catch {}
          const more = Array.isArray(runtime._queuedVNs) && runtime._queuedVNs.length > 0;
          const choices = more ? [ { label: 'Continue', action: 'vn_continue' } ] : [];
          startPrompt(actor, text, choices);
        }
      } catch {}
      runtime._phaseCinePending = null;
    }
    return; // pause simulation during scene pause
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
      saveGame('auto');
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
  // Apply enemy auras and triggers (player debuffs, enemy DR/regen) before movement/combat
  applyEnemyAurasAndTriggers(dt);

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
  // Apply additional slow from enemy auras/triggers
  try {
    const deb = runtime.enemyDebuffs || {};
    const mul = (typeof deb.slowMul === 'number') ? deb.slowMul : 1.0;
    terrainSlow *= mul;
  } catch {}
  // Then apply input movement with terrain slow
  if (hasInput) {
    const dx = ax * player.speed * terrainSlow * dt;
    const dy = ay * player.speed * terrainSlow * dt;
    moveWithCollision(player, dx, dy, solidsForPlayer);
  }
  // Apply/refresh burn from terrain (disabled in God Mode)
  if (terrainBurnDps > 0 && !runtime.godMode) {
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

  // Hold-to-toggle K: after a short hold, toggle equip between best ranged (bow) and best melee weapon.
  try {
    const kHeld = runtime.keys && runtime.keys.has('k');
    if (kHeld) {
      if (typeof runtime._kDownAtSec !== 'number') runtime._kDownAtSec = runtime._timeSec || 0;
      const heldFor = (runtime._timeSec || 0) - (runtime._kDownAtSec || 0);
      const eq = player?.inventory?.equipped || {};
      const inv = player?.inventory?.items || [];
      if ((heldFor >= 0.25) && !runtime._kToggledThisHold) {
        const hasRangedEquipped = !!(eq.rightHand && eq.rightHand.ranged);
        if (hasRangedEquipped) {
          // Switch to best melee (rightHand, non-ranged)
          const melee = inv.filter(it => it && it.slot === 'rightHand' && !it.stackable && !it.ranged);
          if (melee.length) {
            melee.sort((a,b)=> (b.atk||0) - (a.atk||0));
            const pick = melee[0];
            // Move current right-hand to inventory and equip melee
            if (eq.rightHand) inv.push(eq.rightHand);
            eq.rightHand = pick;
            const idx = inv.indexOf(pick); if (idx !== -1) inv.splice(idx, 1);
            try { showBanner(`Equipped ${pick.name}`); } catch {}
          } else {
            try { showBanner('No melee weapon'); } catch {}
          }
        } else {
          // Switch to best ranged (bow)
          const bows = inv.filter(it => it && it.ranged === Object(it.ranged));
          if (bows.length) {
            bows.sort((a,b)=> (b.atk||0) - (a.atk||0));
            const pick = bows[0];
            if (eq.rightHand) inv.push(eq.rightHand);
            // Enforce two-handed: free left hand
            if (pick.twoHanded && eq.leftHand) {
              if (eq.leftHand.id === 'torch') { eq.leftHand = null; try { showBanner('Torch consumed'); } catch {} }
              else { inv.push(eq.leftHand); eq.leftHand = null; }
            }
            eq.rightHand = pick;
            const idx = inv.indexOf(pick); if (idx !== -1) inv.splice(idx, 1);
            // Ammo check for heads-up
            try {
              const arrows = (player?.inventory?.items || []).filter(x => x && x.stackable && x.id === 'arrow_basic').reduce((s,x)=>s+(x.qty||0),0);
              showBanner(arrows > 0 ? `Equipped ${pick.name}` : `Equipped ${pick.name} — No arrows`);
            } catch { try { showBanner(`Equipped ${pick.name}`); } catch {} }
            // If dark and no light, offer to assign torch bearer
            try {
              const lv = sampleLightAtPx(player.x + player.w/2, player.y + player.h/2);
              const dark = lv <= 1;
              const hasLight = !!(player?.inventory?.equipped?.leftHand && player.inventory.equipped.leftHand.id === 'torch') || !!runtime._torchBearerRef;
              if (dark && !hasLight && companions && companions.length && !runtime._suppressTorchAsk) {
                const nearest = companions.reduce((best, c) => {
                  const d2 = Math.pow((c.x - player.x),2)+Math.pow((c.y - player.y),2);
                  return (!best || d2 < best.d2) ? { c, d2 } : best;
                }, null)?.c || companions[0];
                const name = nearest?.name || 'Companion';
                startPrompt(null, 'It\'s dark. Your hands are full.', [
                  { label: `Ask ${name} to carry a torch`, action: 'assign_torch_bearer', data: { index: companions.indexOf(nearest) } },
                  { label: 'Not now', action: 'end' },
                  { label: "Don\'t ask again", action: 'set_flag', data: { key: '_suppressTorchAsk' } },
                ]);
              }
            } catch {}
          } else {
            try { showBanner('No bow'); } catch {}
          }
        }
        runtime._kToggledThisHold = true;
      }
      // Auto-fire while held (if ranged equipped)
      try { startRangedAttackFn(); } catch {}
    }
  } catch {}

  // Player damage over time (burn)
  if (player._burnTimer && player._burnTimer > 0 && !runtime.godMode) {
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
    const now = (performance && performance.now) ? performance.now() : Date.now();
    const sinceLoadSec = Math.max(0, ((now - (runtime._loadedAt || 0)) / 1000));
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
    // Post-load hazard grace: avoid instantly killing enemies in hazards on the first second after load
    if (sinceLoadSec >= 1.0 && envBurnDps > 0) {
      e._burnDps = envBurnDps; e._burnTimer = Math.max(e._burnTimer || 0, 1.0);
    }
    if (Math.abs(e.knockbackX) > 0.01 || Math.abs(e.knockbackY) > 0.01) {
      const slowMul = (e._slowMul || 1);
      const gustSlow = (e._gustSlowTimer && e._gustSlowTimer > 0) ? (e._gustSlowFactor ?? 0.25) : 0;
      const veilSlow = (e._veilSlowTimer && e._veilSlowTimer > 0) ? (e._veilSlow ?? 0.5) : 0;
      const braceMul = (e._braceTimer && e._braceTimer > 0) ? (e._braceSpeedMul || 1) : 1;
      const kbBrace = (e._braceTimer && e._braceTimer > 0) ? (e._braceKbMul || 1) : 1;
      const kbDash = (e._dashTimer && e._dashTimer > 0 && (!e._dashTelegraph || e._dashTelegraph <= 0)) ? (e._dashKbMul || 1) : 1;
      const kbAdvance = (e._advanceTimer && e._advanceTimer > 0) ? (e._advanceKbMul || 1) : 1;
      const kbMul = Math.min(kbBrace, kbDash, kbAdvance);
      const mul = slowMul * (1 - Math.max(0, Math.min(0.9, gustSlow))) * (1 - Math.max(0, Math.min(0.9, veilSlow))) * envSlow * braceMul;
      moveWithCollision(e, e.knockbackX * dt * mul * kbMul, e.knockbackY * dt * mul * kbMul, solidsForEnemy);
      // Rapidly settle knockback when braced or advancing so AI regains control
      const settle = (e._advanceTimer && e._advanceTimer > 0) || (e._braceTimer && e._braceTimer > 0);
      const decay = Math.pow(0.001, dt) * (settle ? 0.2 : 1);
      e.knockbackX *= decay; e.knockbackY *= decay;
    } else {
      e.knockbackX = 0; e.knockbackY = 0;
      // Decide target behavior: chase if player is near, otherwise wander
      const ex = e.x + e.w/2, ey = e.y + e.h/2;
      const pxp = player.x + player.w/2, pyp = player.y + player.h/2;
      const ddx = (pxp - ex), ddy = (pyp - ey);
      const dist2 = ddx*ddx + ddy*ddy;
      const baseAggro = (e.kind === 'boss') ? 280 : (e.kind === 'featured' ? 220 : 180);
      const aggroR = (typeof e.aggroRadius === 'number') ? e.aggroRadius : baseAggro;
      const aggroR2 = aggroR * aggroR;
      let dx, dy;
      if (dist2 <= aggroR2) {
        // Chase player (base heading)
        const d = Math.hypot(ddx, ddy) || 1; dx = ddx / d; dy = ddy / d;
        // Flow-field base guidance (prefer downhill neighbor when available)
        try {
          const dir = sampleFlowDirAt(ex, ey);
          if (dir && (dir.x !== 0 || dir.y !== 0)) { dx = dir.x; dy = dir.y; }
        } catch {}
        // If no flow direction (likely disconnected components) and LOS is blocked by a wall,
        // commit to a wall-follow (tangential) direction to search for an opening.
        try {
          const ex2 = e.x + e.w/2, ey2 = e.y + e.h/2;
          const px2 = player.x + player.w/2, py2 = player.y + player.h/2;
          let losBlockedWF = false;
          for (const o of obstacles) {
            if (!o) continue;
            if (o.type === 'gate' && o.locked === false) continue;
            // consider strong blockers; chest/mud/fire/lava are non-blocking for movement
            if (o.type === 'chest' || o.type === 'mud' || o.type === 'fire' || o.type === 'lava') continue;
            if (segmentIntersectsRect(ex2, ey2, px2, py2, o)) { losBlockedWF = true; break; }
          }
          const flowDirNull = (() => { try { const d = sampleFlowDirAt(ex, ey); return !d || (d.x === 0 && d.y === 0); } catch { return true; } })();
          if (flowDirNull && losBlockedWF) {
            e._wallTimer = Math.max(0, (e._wallTimer || 0) - dt);
            if ((e._wallTimer || 0) <= 0) {
              const sign = (typeof e._strafeSign === 'number') ? e._strafeSign : (e.avoidSign || 1);
              // Tangent vector along the blocking surface (perpendicular to player heading)
              const tx = -dy * sign, ty = dx * sign; const nm = Math.hypot(tx, ty) || 1;
              e._wallDirX = tx / nm; e._wallDirY = ty / nm;
              e._wallTimer = (String(e.kind).toLowerCase() === 'boss') ? 1.2 : 0.9;
            }
            if ((e._wallTimer || 0) > 0 && typeof e._wallDirX === 'number') { dx = e._wallDirX; dy = e._wallDirY; }
          }
        } catch {}
        const kind = String(e.kind || 'mook').toLowerCase();
        const elite = (kind === 'boss' || kind === 'featured');
        // Ranged awareness helpers
        const nowSec = ((performance && performance.now) ? performance.now() : Date.now()) / 1000;
        const eq = (player && player.inventory && player.inventory.equipped) ? player.inventory.equipped : {};
        const hasRanged = !!(eq && eq.rightHand && eq.rightHand.ranged);
        const firedRecently = (typeof player.lastRanged === 'number') && ((nowSec - player.lastRanged) <= (AI_TUNING.global.rangedAwareRecentSec || 0.8));
        const rangedAware = hasRanged || firedRecently;

        // Phase 3: Gap-closer dash with telegraph (elite only)
        try {
          if (elite) {
            e._dashCd = Math.max(0, (e._dashCd || 0) - dt);
            if ((e._dashTelegraph || 0) > 0) {
              e._dashTelegraph = Math.max(0, (e._dashTelegraph || 0) - dt);
              // Slight slow during telegraph (hold heading but reduced speed via mul below)
            } else if ((e._dashTimer || 0) > 0) {
              e._dashTimer = Math.max(0, (e._dashTimer || 0) - dt);
              // Lock heading to dash direction
              if (typeof e._dashDirX === 'number' && typeof e._dashDirY === 'number') { dx = e._dashDirX; dy = e._dashDirY; }
            } else if ((e._dashCd || 0) <= 0 && (e._jukeTimer || 0) <= 0 && (e._coverTimer || 0) <= 0 && ((e._braceTimer || 0) <= 0 || (e._advanceTimer || 0) > 0)) {
              // Conditions to start dash: mid-range and LOS clear
              const distPx = d;
              const ex2 = e.x + e.w/2, ey2 = e.y + e.h/2;
              const px2 = player.x + player.w/2, py2 = player.y + player.h/2;
              let losClear = true;
              for (const o of obstacles) {
                if (!o || !o.blocksAttacks) continue;
                if (o.type === 'gate' && o.locked === false) continue;
                if (segmentIntersectsRect(ex2, ey2, px2, py2, o)) { losClear = false; break; }
              }
              if (losClear && distPx >= (AI_TUNING.global.dash.minDist || 90) && distPx <= (AI_TUNING.global.dash.maxDist || 180)) {
                // Start telegraph → dash
                e._dashTelegraph = AI_TUNING[kind].dash.telegraphSec;
                e._dashTimer = AI_TUNING[kind].dash.durationSec; // will count down after telegraph finishes
                e._dashDirX = dx; e._dashDirY = dy;
                const cdBase = AI_TUNING[kind].dash.cooldownBaseSec;
                const amp = (AI_TUNING[kind].dash.cooldownJitterSec || 0);
                const jitter = (Math.random()*2*amp - amp);
                e._dashCd = Math.max(2.0, cdBase + jitter);
                // Knockback resistance during dash
                e._dashKbMul = AI_TUNING[kind].dash.kbMul;
                // Temporary speed multiplier applied below via jukeMult pipeline
                e._dashSpeedMult = AI_TUNING[kind].dash.speedMul;
              }
            }
            // If actively dashing, override movement blend multiplier
            if ((e._dashTimer || 0) > 0 && (e._dashTelegraph || 0) <= 0) {
              e._jukeMult = e._dashSpeedMult || e._jukeMult || 1;
            }
          }
        } catch {}

        // Phase 2: Juke on incoming player projectile (elite only)
        try {
          if (elite) {
            e._jukeCd = Math.max(0, (e._jukeCd || 0) - dt);
            e._jukeTimer = Math.max(0, (e._jukeTimer || 0) - dt);
            if ((e._jukeTimer || 0) <= 0 && (e._jukeCd || 0) <= 0) {
              // Scan a few player projectiles and detect near path intersection
              let trigger = null;
              const exC = e.x + e.w/2, eyC = e.y + e.h/2;
              for (let i = 0, seen = 0; i < projectiles.length && seen < (AI_TUNING.global.juke.scanMax || 24); i++) {
                const p = projectiles[i]; if (!p || p.team !== 'player') continue; seen++;
                const vx = p.vx, vy = p.vy; const sp = Math.hypot(vx, vy) || 1;
                const nvx = vx / sp, nvy = vy / sp;
                const rx = exC - (p.x + p.w/2), ry = eyC - (p.y + p.h/2);
                const ahead = rx*nvx + ry*nvy; // distance along projectile dir (px)
                if (ahead < 0 || ahead > (AI_TUNING.global.juke.nearAheadPx || 120)) continue; // only if enemy is in front within range
                const lateral = Math.abs(rx*nvy - ry*nvx); // perpendicular distance (px)
                const rad = Math.max(8, Math.min(14, Math.max(e.w, e.h)/2));
                if (lateral <= rad + (AI_TUNING.global.juke.lateralPadPx || 6)) { trigger = { nvx, nvy, rx, ry }; break; }
              }
              if (trigger) {
                let TT = AI_TUNING[kind];
                // Slightly increase juke chance if currently under an advance window (sustained fire)
                const chance = (e._advanceTimer && e._advanceTimer > 0) ? Math.min(0.6, (TT.juke.chance || 0) + 0.1) : TT.juke.chance;
                if (Math.random() < chance) {
                  const dur = TT.juke.durationSec;
                  const mult = TT.juke.speedMul;
                  // Choose perpendicular direction away from the projectile path
                  const cross = trigger.rx*trigger.nvy - trigger.ry*trigger.nvx;
                  const sign = (cross >= 0) ? 1 : -1;
                  e._jukeDirX = (-trigger.nvy) * sign;
                  e._jukeDirY = ( trigger.nvx) * sign;
                  const nrm = Math.hypot(e._jukeDirX, e._jukeDirY) || 1;
                  e._jukeDirX /= nrm; e._jukeDirY /= nrm;
                  e._jukeTimer = dur;
                  e._jukeMult = mult;
                  e._jukeCd = TT.juke.cooldownSec;
                }
              }
            }
            if ((e._jukeTimer || 0) > 0) {
              dx = e._jukeDirX || dx; dy = e._jukeDirY || dy;
            }
          }
        } catch {}

        // Phase 2: Use Cover — pick a cover corner and commit briefly (elite only)
        try {
          if (elite) {
            e._coverTimer = Math.max(0, (e._coverTimer || 0) - dt);
            e._coverCd = Math.max(0, (e._coverCd || 0) - dt);
            const dist = d;
            // Minimal LOS check helper (center-to-center)
            const ex2 = e.x + e.w/2, ey2 = e.y + e.h/2;
            const px2 = player.x + player.w/2, py2 = player.y + player.h/2;
            const losBlocked = (() => {
              for (const o of obstacles) {
                if (!o || !o.blocksAttacks) continue;
                if (o.type === 'gate' && o.locked === false) continue;
                if (segmentIntersectsRect(ex2, ey2, px2, py2, o)) return true;
              }
              return false;
            })();
            // Choose new cover target when LOS is clear, recently shot, and at range
            const recentlyShot = (e._recentHitTimer || 0) > 0;
            if ((e._coverTimer || 0) <= 0 && (e._jukeTimer || 0) <= 0 && (e._coverCd || 0) <= 0 && (e._advanceTimer || 0) <= 0 && recentlyShot && !losBlocked && dist > Math.max(100, (AI_TUNING.global.cover.minDist || 80)) && dist < (AI_TUNING.global.cover.maxDist || 260)) {
              let best = null; let bestScore = Infinity;
              for (const o of obstacles) {
                if (!o || !o.blocksAttacks) continue;
                if (o.type === 'gate' && o.locked === false) continue;
                // Quick reject by distance to obstacle center
                const ox = (o.x + o.w/2) - ex2, oy = (o.y + o.h/2) - ey2;
                const r = (AI_TUNING.global.cover.searchRadius || 160); if ((ox*ox + oy*oy) > (r*r)) continue;
                // Candidate corners (slightly nudged away from player)
                const corners = [ [o.x, o.y], [o.x+o.w, o.y], [o.x, o.y+o.h], [o.x+o.w, o.y+o.h] ];
                for (const c of corners) {
                  const cx = c[0], cy = c[1];
                  const dirx = cx - px2, diry = cy - py2;
                  const len = Math.hypot(dirx, diry) || 1; // push a bit further behind cover
                  const adjx = cx + (dirx/len) * 6; const adjy = cy + (diry/len) * 6;
                  // Does this point have cover (segment to player intersects obstacle)?
                  let covered = false;
                  if (segmentIntersectsRect(adjx, adjy, px2, py2, o)) covered = true;
                  if (!covered) continue;
                  const dxp = adjx - ex2, dyp = adjy - ey2; const dd = Math.hypot(dxp, dyp);
                  const curToPlayer = Math.hypot(px2 - ex2, py2 - ey2);
                  const coverToPlayer = Math.hypot(px2 - adjx, py2 - adjy);
                  const delta = Math.max(0, coverToPlayer - curToPlayer); // moving farther from player is penalized
                  const awayPenalty = delta * 0.8;
                  // Misalignment penalty relative to current heading (avoid picking cover that pushes away from pursuit)
                  const bx = dx, by = dy; const bl = Math.hypot(bx, by) || 1;
                  const ax = adjx - ex2, ay = adjy - ey2; const al = Math.hypot(ax, ay) || 1;
                  const align = Math.max(-1, Math.min(1, (bx/bl) * (ax/al) + (by/bl) * (ay/al)));
                  const misalign = (1 - align) * 1.5;
                  const score = dd + awayPenalty + misalign + Math.random()*1.5; // prefer nearer, not-away cover
                  if (score < bestScore) { bestScore = score; best = { x: adjx, y: adjy }; }
                }
              }
              if (best) {
                const TT = AI_TUNING[kind];
                e._coverTarget = best; e._coverTimer = TT.cover.commitSec; e._coverCd = (AI_TUNING.global.cover.cooldown || 0.6); // brief commitment + small cooldown
              }
            }
            if ((e._coverTimer || 0) > 0 && e._coverTarget) {
              const tx = e._coverTarget.x - ex2, ty = e._coverTarget.y - ey2;
              const n = Math.hypot(tx, ty) || 1; dx = tx / n; dy = ty / n;
              // Release early if reached
              if (Math.hypot(tx, ty) < 8) { e._coverTimer = 0; e._coverTarget = null; }
            }
          }
        } catch {}

        // Phase 1: Zig-zag advance for bosses/featured when player is using ranged
        try {
          if (elite) {
            const dist = d;
            if (rangedAware && dist >= (AI_TUNING.global.zigzag.minDist || 60) && dist <= (AI_TUNING.global.zigzag.maxDist || 220) && (e._jukeTimer || 0) <= 0 && (e._coverTimer || 0) <= 0 && (e._advanceTimer || 0) <= 0) {
              e._strafeTimer = Math.max(0, (e._strafeTimer || 0) - dt);
              if ((e._strafeTimer || 0) <= 0) {
                e._strafeSign = (typeof e._strafeSign === 'number') ? e._strafeSign : (e.avoidSign || 1);
                e._strafeTimer = AI_TUNING[kind].zigzag.commitSec;
              }
              const w = AI_TUNING[kind].zigzag.weight;
              const tx = -dy * (e._strafeSign || 1);
              const ty = dx * (e._strafeSign || 1);
              const nx = dx * (1 - w) + tx * w;
              const ny = dy * (1 - w) + ty * w;
              const nm = Math.hypot(nx, ny) || 1;
              dx = nx / nm; dy = ny / nm;
            } else {
              e._strafeTimer = Math.max(0, (e._strafeTimer || 0) - dt);
            }
          }
        } catch {}

        e._aggro = true;
      } else {
        // Wander: pick a direction for a short duration, sometimes pause
        e._aggro = false;
        e._wanderTimer = Math.max(0, (e._wanderTimer || 0) - dt);
        if ((e._wanderTimer || 0) <= 0) {
          e._wanderTimer = 0.9 + Math.random() * 1.6; // 0.9–2.5s
          e._wanderPause = Math.random() < 0.22;      // brief idle sometimes
          // Small chance to bias wandering away from hazards by nudging current facing
          const baseAng = Math.atan2(ddy, ddx) + (Math.random() * 1.8 - 0.9);
          e._wanderAngle = (typeof e._wanderAngle === 'number' && Math.random() < 0.4)
            ? (e._wanderAngle + (Math.random() * 1.2 - 0.6))
            : baseAng;
        }
        if (e._wanderPause) { dx = 0; dy = 0; }
        else { dx = Math.cos(e._wanderAngle || 0); dy = Math.sin(e._wanderAngle || 0); }
      }
      const oldX = e.x, oldY = e.y;
      const slowMul = (e._slowMul || 1);
      const gustSlow = (e._gustSlowTimer && e._gustSlowTimer > 0) ? (e._gustSlowFactor ?? 0.25) : 0;
      const veilSlow = (e._veilSlowTimer && e._veilSlowTimer > 0) ? (e._veilSlow ?? 0.5) : 0;
      const braceMul = (e._braceTimer && e._braceTimer > 0) ? (e._braceSpeedMul || 1) : 1;
      const advMul = (e._advanceTimer && e._advanceTimer > 0) ? (e._advanceSpeedMul || 1) : 1;
      const mul = slowMul * (1 - Math.max(0, Math.min(0.9, gustSlow))) * (1 - Math.max(0, Math.min(0.9, veilSlow))) * envSlow * braceMul * advMul;

      // Hazard/obstacle avoidance steering: pick a nearby direction with lower hazard exposure and fewer imminent collisions
      const baseDir = { x: dx, y: dy };
      const offsets = [-0.9, -0.5, 0, 0.5, 0.9]; // radians near target
      let best = { x: baseDir.x, y: baseDir.y };
      let bestScore = Infinity;
      const px = ex, py = ey;
      const avoidBias = (e.kind === 'boss') ? 0.5 : (e.kind === 'featured' ? 0.8 : 1.0);
      const steerT = (AI_TUNING[String(e.kind||'mook').toLowerCase()]?.steering) || { hazardWeightMul: 1, obstaclePenaltyMul: 1 };
      // If LOS to player is clear, prefer direct heading and avoid steering away from target
      let losClearToPlayer = false;
      try {
        const ex2 = e.x + e.w/2, ey2 = e.y + e.h/2;
        const px2 = player.x + player.w/2, py2 = player.y + player.h/2;
        let blocked = false;
        for (const o of obstacles) {
          if (!o) continue;
          if (o.type === 'gate' && o.locked === false) continue;
          if (o.type === 'chest' || o.type === 'mud' || o.type === 'fire' || o.type === 'lava') continue;
          if (segmentIntersectsRect(ex2, ey2, px2, py2, o)) { blocked = true; break; }
        }
        losClearToPlayer = !blocked;
      } catch {}
      if (baseDir.x !== 0 || baseDir.y !== 0) {
        for (const a of offsets) {
          const ca = Math.cos(a), sa = Math.sin(a);
          const vx = baseDir.x * ca - baseDir.y * sa;
          const vy = baseDir.x * sa + baseDir.y * ca;
          // Alignment penalty (prefer towards player)
          const dot = Math.max(-1, Math.min(1, vx * baseDir.x + vy * baseDir.y));
          const alignPenalty = (1 - dot) * (losClearToPlayer ? 0.3 : 0.6);
          // Hazard exposure along a short ray with 3 samples
          let haz = 0;
          let obs = 0;
          const samples = [0.33, 0.66, 1.0];
          const stepLen = 26; // px
          for (const t of samples) {
            const cx = px + vx * stepLen * t;
            const cy = py + vy * stepLen * t;
            const probe = { x: cx - e.w/2, y: cy - e.h/2, w: e.w, h: e.h };
            for (const o of obstacles) {
              if (!o) continue;
              // Hazards (non-blocking)
              if (o.type === 'mud' || o.type === 'fire' || o.type === 'lava') {
                const ox = (o.x + o.w/2) - cx; const oy = (o.y + o.h/2) - cy; if ((ox*ox + oy*oy) > (160*160)) continue;
                if (rectsIntersect(probe, o)) { haz += ((o.type === 'mud') ? 1 : (o.type === 'fire' ? 6 : 12)); }
              } else {
                // Blocking obstacles: penalize directions that will collide
                let blocks = o.blocksAttacks === true || o.type === 'wall' || o.type === 'water' || (o.type === 'gate' && o.locked !== false);
                if (!blocks) continue;
                // quick distance check
                const ox = (o.x + o.w/2) - cx; const oy = (o.y + o.h/2) - cy; if ((ox*ox + oy*oy) > (180*180)) continue;
                if (!losClearToPlayer && rectsIntersect(probe, o)) { obs += 50; }
              }
            }
          }
          const score = alignPenalty + (haz * avoidBias * (steerT.hazardWeightMul || 1)) + (obs * (steerT.obstaclePenaltyMul || 1));
          if (score < bestScore) { bestScore = score; best = { x: vx, y: vy }; }
        }
      } else {
        // Idle this frame (no movement direction)
        best = { x: 0, y: 0 };
        bestScore = 0;
      }
      // If LOS is clear, avoid steering away: trust the direct heading
      if (losClearToPlayer) {
        // Strong clamp when within engage band: don't choose directions pointing away
        const dlen = Math.hypot(ddx, ddy) || 1;
        const ux = ddx / dlen, uy = ddy / dlen;
        const dotDirect = (best.x * ux + best.y * uy);
        const ek = String(e.kind||'mook').toLowerCase();
        const engageDist = (AI_TUNING[ek]?.engageDistPx) || 180;
        const engage = dlen <= engageDist;
        if (engage && dotDirect < 0.2) {
          best = { x: baseDir.x, y: baseDir.y };
        }
      }

      // Temporary enemy speed boost from triggers
      const spdBoost = (e._speedBoostTimer && e._speedBoostTimer > 0) ? (e._speedBoostFactor || 1) : 1;
      const jukeMult = (e._jukeTimer && e._jukeTimer > 0) ? (e._jukeMult || 1) : 1;
      const dashTeleMul = (e._dashTelegraph && e._dashTelegraph > 0) ? 0.4 : 1; // slow slightly during telegraph
      const dashMult = ((e._dashTimer && e._dashTimer > 0) && (!e._dashTelegraph || e._dashTelegraph <= 0)) ? (e._dashSpeedMult || 1) : 1;
      const advMult = (e._advanceTimer && e._advanceTimer > 0) ? (e._advanceSpeedMul || 1) : 1;
      // Base class speed multiplier (tunable via AI_TUNING)
      const role = String(e.kind||'mook').toLowerCase();
      const baseClassMul = (AI_TUNING[role]?.baseSpeedMul) || 1;
      const spdMul = spdBoost * Math.max(jukeMult, dashMult) * dashTeleMul * advMult * baseClassMul;
      moveWithCollision(e, best.x * e.speed * spdMul * mul * dt, best.y * e.speed * spdMul * mul * dt, solidsForEnemy);
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

      // Enemy ranged attack with telegraph for bosses
      if (e.ranged) {
        e._shootCd = Math.max(0, (e._shootCd || 0) - dt);
        // Check LOS and range
        const ex = e.x + e.w/2, ey = e.y + e.h/2;
        const px2 = player.x + player.w/2, py2 = player.y + player.h/2;
        const dxs = px2 - ex, dys = py2 - ey; const dist2s = dxs*dxs + dys*dys;
        const r = Math.max(12, e.shootRange || 120); if (dist2s <= r*r && (e._shootCd || 0) <= 0) {
          let losClear = false;
          const samples = [ [px2, py2], [player.x, player.y], [player.x + player.w, player.y], [player.x, player.y + player.h], [player.x + player.w, player.y + player.h] ];
          for (const [sx, sy] of samples) {
            let blocked = false;
            for (const o of obstacles) {
              if (!o || !o.blocksAttacks) continue;
              if (o.type === 'gate' && o.locked === false) continue;
              if (segmentIntersectsRect(ex, ey, sx, sy, o)) { blocked = true; break; }
            }
            if (!blocked) { losClear = true; break; }
          }
          if (losClear) {
            const kind = String(e.kind||'').toLowerCase();
            // Bosses: brief telegraph before firing
            if (kind === 'boss') {
              e._shootTele = Math.max(0, (e._shootTele || 0) - dt);
              if (!e._shootTele || e._shootTele <= 0) {
                // Start telegraph and cache aim
                e._shootAim = Math.atan2(py2 - ey, px2 - ex);
                e._shootTele = (AI_TUNING.boss?.ranged?.telegraphSec) || 0.14;
                try { playSfx('bossTelegraph'); } catch {}
                // Do not fire this frame; fire after telegraph expires
              } else {
                // Waiting for telegraph to finish; skip firing
              }
              if (e._shootTele <= 0) {
                const ang = (e._shootAim || Math.atan2(py2 - ey, px2 - ex)) + (e.aimError || 0) * (Math.random()*2 - 1);
                const spd = Math.max(60, e.projectileSpeed || 160);
                const vx = Math.cos(ang) * spd;
                const vy = Math.sin(ang) * spd;
                const dmg = Math.max(1, e.projectileDamage || Math.max(1, (e.touchDamage||1) - 1));
                spawnProjectile(ex, ey, { team: 'enemy', vx, vy, damage: dmg, life: 1.8, sourceId: e.id, color: '#ff9a3d' });
                e._shootCd = Math.max(0.2, e.shootCooldown || 1.2);
                try { playSfx('attack'); } catch {}
              }
            } else {
              // Non-boss: fire immediately
              const ang = Math.atan2(py2 - ey, px2 - ex) + (e.aimError || 0) * (Math.random()*2 - 1);
              const spd = Math.max(60, e.projectileSpeed || 160);
              const vx = Math.cos(ang) * spd;
              const vy = Math.sin(ang) * spd;
              const dmg = Math.max(1, e.projectileDamage || Math.max(1, (e.touchDamage||1) - 1));
              spawnProjectile(ex, ey, { team: 'enemy', vx, vy, damage: dmg, life: 1.8, sourceId: e.id, color: '#ff9a3d' });
              e._shootCd = Math.max(0.2, e.shootCooldown || 1.2);
              try { playSfx('attack'); } catch {}
            }
          }
        }
      }
    }
    e.x = Math.max(0, Math.min(world.w - e.w, e.x));
    e.y = Math.max(0, Math.min(world.h - e.h, e.y));
    e.hitTimer -= dt; if (e.hitTimer < 0) e.hitTimer = 0;
    if (e._gustSlowTimer && e._gustSlowTimer > 0) e._gustSlowTimer = Math.max(0, e._gustSlowTimer - dt);
    if (e._veilSlowTimer && e._veilSlowTimer > 0) e._veilSlowTimer = Math.max(0, e._veilSlowTimer - dt);
    if (e._braceTimer && e._braceTimer > 0) e._braceTimer = Math.max(0, e._braceTimer - dt);
    if (e._coverCd && e._coverCd > 0) e._coverCd = Math.max(0, e._coverCd - dt);
    if (e._dashCd && e._dashCd > 0) e._dashCd = Math.max(0, e._dashCd - dt);
    if (e._hitStreakTimer && e._hitStreakTimer > 0) {
      e._hitStreakTimer = Math.max(0, e._hitStreakTimer - dt);
      if (e._hitStreakTimer === 0) e._hitStreakCount = 0;
    }
    if (e._advanceTimer && e._advanceTimer > 0) e._advanceTimer = Math.max(0, e._advanceTimer - dt);
    if (e._burnTimer && e._burnTimer > 0) {
      e._burnTimer = Math.max(0, e._burnTimer - dt);
      const dps = e._burnDps || 0;
      if (dps > 0 && sinceLoadSec >= 1.0) {
        const before = e.hp;
        e.hp -= dps * dt;
        try { if (window && window.DEBUG_ENEMIES) console.log('[ENEMY BURN]', { name: e.name, kind: e.kind, x: e.x, y: e.y, dps, hpBefore: before, hpAfter: e.hp }); } catch {}
        if (Math.random() < 4 * dt) spawnFloatText(e.x + e.w/2, e.y - 10, 'Burn', { color: '#ff9a3d', life: 0.5 });
      }
    }
    if (e.hitTimer === 0) {
      const pr = { x: player.x, y: player.y, w: player.w, h: player.h };
      const er = { x: e.x, y: e.y, w: e.w, h: e.h };
      // Enemy contact reach: give featured foes and bosses a longer touch range
      // so approach is more dangerous.
      // mook: ~2px pad (baseline), featured: ~4px, boss: ~12px (increased)
      const pad = (String(e.kind).toLowerCase() === 'boss') ? 12.0 : (String(e.kind).toLowerCase() === 'featured' ? 4.0 : 2.0);
      if (rectsTouchOrOverlap(pr, er, pad)) {
        // If a solid attack-blocking obstacle lies between enemy and player, prevent contact damage through walls
        try {
          const ex = e.x + e.w / 2;
          const ey = e.y + e.h / 2;
          const samples = [
            [player.x + player.w / 2, player.y + player.h / 2], // center
            [player.x, player.y], // corners
            [player.x + player.w, player.y],
            [player.x, player.y + player.h],
            [player.x + player.w, player.y + player.h],
          ];
          let losClear = false;
          for (const [sx, sy] of samples) {
            let rayBlocked = false;
            for (const o of obstacles) {
              if (!o || !o.blocksAttacks) continue;
              if (o.type === 'gate' && o.locked === false) continue;
              if (segmentIntersectsRect(sx, sy, ex, ey, o)) { rayBlocked = true; break; }
            }
            if (!rayBlocked) { losClear = true; break; }
          }
          if (!losClear) continue;
        } catch {}
        // If they actually overlap, separate just enough but still allow contact
        if (rectsIntersect(pr, er)) separateEntities(player, e, 0.65);
        // Boss melee telegraph: brief wind-up before the hit
        const isBoss = String(e.kind||'').toLowerCase() === 'boss';
        if (isBoss) {
          e._meleeTele = Math.max(0, (e._meleeTele || 0) - dt);
          if ((e._meleeTele || 0) <= 0 && player.invulnTimer <= 0) {
            e._meleeTele = (AI_TUNING.boss?.melee?.telegraphSec) || 0.18;
            try { playSfx('bossTelegraph'); } catch {}
            // Delay actual damage until telegraph expires
            continue;
          }
          if ((e._meleeTele || 0) > 0) {
            // Still telegraphing; skip applying damage this frame
            continue;
          }
        }
        // Overworld realtime damage on contact; apply armor DR with chip/crit/AP
        if (player.invulnTimer <= 0) {
          const toggles = runtime?.combatToggles || { chip: true, enemyCrits: true, ap: true };
          const baseDr = (getEquipStats(player).dr || 0) + (runtime?.combatBuffs?.dr || 0) + (runtime?.combatBuffs?.touchDR || 0);
          const dr = baseDr + (player.levelDrBonus || 0) + (runtime?.tempTouchDr || 0);
          const raw = Math.max(0, e.touchDamage || 1);
          const kind = String(e.kind || 'mook').toLowerCase();
          // Defaults by class
          const def = (kind === 'boss') ? { cc: 0.12, ignore: 0.7, bonus: 3, chipMin: 0, chipMax: 0 }
                        : (kind === 'featured') ? { cc: 0.10, ignore: 0.6, bonus: 2, chipMin: 1, chipMax: 2 }
                        : { cc: 0.06, ignore: 0.5, bonus: 1, chipMin: 1, chipMax: 1 };
          // Pull overrides from enemy if present
          const cc = (typeof e.critChance === 'number') ? e.critChance : def.cc;
          const cIgnore = (typeof e.critDrIgnore === 'number') ? e.critDrIgnore : def.ignore;
          const cBonus = (typeof e.critBonus === 'number') ? e.critBonus : def.bonus;
          const ap = toggles.ap ? Math.max(0, (typeof e.ap === 'number') ? e.ap : 0) : 0;
          const tDmg = toggles.ap ? Math.max(0, (typeof e.trueDamage === 'number') ? e.trueDamage : 0) : 0;

          // Roll crit
          const isCrit = toggles.enemyCrits && Math.random() < cc;
          // Effective DR after crit/AP
          let effDr = dr;
          if (isCrit) effDr = Math.max(0, effDr * (1 - cIgnore));
          if (ap > 0) effDr = Math.max(0, effDr - ap);

          // Base result after DR
          let taken = Math.max(0, raw - effDr);
          // Add crit bonus and any true damage (applies after DR)
          if (isCrit) taken += Math.max(0, cBonus);
          if (tDmg > 0) taken += tDmg;

          // Universal chip floor for mook/featured only
          if (toggles.chip && kind !== 'boss') {
            const chipBase = Math.round(raw * 0.10);
            const chip = Math.max(def.chipMin, Math.min(def.chipMax, chipBase));
            if (taken > 0 && taken < chip) taken = chip;
            if (taken === 0 && chip > 0) taken = chip; // allow chip even if DR fully blocked
          }
          if (runtime.godMode) taken = 0;
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
              // Damage feedback: Crit/AP/Graze distinct text
              let label = null;
              let color = '#ff7a7a';
              let sfx = 'hit';
              const chipBase = Math.round(raw * 0.10);
              const chip = Math.max(def.chipMin, Math.min(def.chipMax, chipBase));
              const fmt = (n) => Number.isFinite(n) ? Number(n).toFixed(2) : String(n);
              if (isCrit) { label = `Crit ${fmt(taken)}`; color = '#ffd166'; sfx = 'pierce'; }
              else if ((ap > 0 || tDmg > 0) && (taken >= raw - dr)) { label = `Pierce! ${fmt(taken)}`; color = '#ffd166'; sfx = 'pierce'; }
              else if (toggles.chip && kind !== 'boss' && taken === chip && chip > 0) { label = `Grazed ${fmt(taken)}`; color = '#a8c6ff'; sfx = 'hit'; }
              spawnFloatText(player.x + player.w/2, player.y - 6, label || `-${fmt(taken)}`, { color, life: 0.7 });
              playSfx(sfx);
              // UI: show last attacker name in lower-right (just the name)
              try { import('../engine/ui.js').then(u => u.showTargetInfo && u.showTargetInfo(`${e.name || 'Enemy'}`)); } catch {}
            } else {
            if (!runtime.godMode) {
              // Blocked hit feedback
              spawnFloatText(player.x + player.w/2, player.y - 6, 'Blocked', { color: '#a8c6ff', life: 0.7 });
              playSfx('block');
            }
          }
        }
      }
    }
  }

  // Remove defeated enemies to avoid any lingering collision feel
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].hp <= 0) {
      const e = enemies[i];
      // Unlink from spawner live set if applicable
      try { if (e.spawnerId) { const sp = findSpawnerById(e.spawnerId); if (sp && sp.currentlyAliveIds) sp.currentlyAliveIds.delete(e.id); } } catch {}
      // Post-load grace: avoid immediate despawn right after load (so you can see enemies persist)
      try {
        const now = (performance && performance.now) ? performance.now() : Date.now();
        const since = Math.max(0, ((now - (runtime._loadedAt || 0)) / 1000));
        if (since < 1.0) { e.hp = 0.1; continue; }
      } catch {}
      // Boss behavior: default bosses have 2 phases; Vorthak (L5) has 3
      const isBoss = ((e.kind || '').toLowerCase() === 'boss');
      const isVorthak = isBoss && ((e.name || '').toLowerCase().includes('vorthak'));
      if (isBoss && !e._secondPhase) {
        try {
          const actor = { name: e.name || 'Boss', portraitSrc: e.portraitPowered || null, touchDamage: 0, x: e.x, y: e.y, w: e.w, h: e.h };
          const line = phaseShiftText(e, 2);
          // Dramatic phase transition: pause, shake, then pan and show VN
          clearFadeOverlay();
          // Grant post-cutscene invulnerability when VN closes
          runtime._grantInvulnOnChatExit = Math.max(1.0, Number(runtime._grantInvulnOnChatExit || 0));
          runtime.scenePauseTimer = 0.5;
          runtime.shakeTimer = 0.5;
          runtime.shakeMag = ((e.name || '').toLowerCase().includes('vorthak')) ? 6 : 4;
          try { playSfx('quake'); } catch {}
          runtime._phaseCinePending = { actor, text: line };
        } catch {}
        // Refill to second health bar and mark phase
        e.hp = e.maxHp;
        e._secondPhase = true;
        // Increase boss contact damage and attack speed for second phase
        e.touchDamage = Math.max(1, (e.touchDamage || 0) + 2);
        // Add boss special: true damage component in later phases
        e.trueDamage = Math.max(2, (e.trueDamage || 0), 2);
        // Vast (Level 1) exception: make her deal less damage in phase 2
        if (e.vnId === 'enemy:vast') {
          // Net reduce touch damage compared to phase 1
          e.touchDamage = Math.max(1, (e.touchDamage || 0) - 3);
          // Remove true damage component for Vast's second phase
          e.trueDamage = 0;
        }
        e.hitCooldown = Math.max(0.5, (e.hitCooldown || 0.8) * 0.7);
        e.speed = Math.max(8, (e.speed || 12) * 1.1);
        try { spawnFloatText(e.x + e.w/2, e.y - 10, 'Empowered!', { color: '#ffd166', life: 0.8 }); } catch {}
        // Clear incidental timers/knockback
        e.hitTimer = 0; e.knockbackX = 0; e.knockbackY = 0;
        continue; // do not remove this frame
      }
      // Vorthak only: second death -> final form (third phase)
      if (isVorthak && e._secondPhase && !e._thirdPhase) {
        try {
          const actor = { name: e.name || 'Boss', portraitSrc: (e.portraitOverpowered || e.portraitPowered || null), touchDamage: 0, x: e.x, y: e.y, w: e.w, h: e.h };
          const line = phaseShiftText(e, 3);
          clearFadeOverlay();
          runtime._grantInvulnOnChatExit = Math.max(1.2, Number(runtime._grantInvulnOnChatExit || 0));
          runtime.scenePauseTimer = 0.6;
          runtime.shakeTimer = 0.6;
          runtime.shakeMag = 6;
          try { playSfx('quake'); } catch {}
          runtime._phaseCinePending = { actor, text: line };
        } catch {}
        e.hp = e.maxHp;
        e._thirdPhase = true;
        e.touchDamage = Math.max(1, (e.touchDamage || 0) + 3);
        // Stronger true damage in Vorthak's final phase
        e.trueDamage = Math.max(3, (e.trueDamage || 0), 3);
        e.hitCooldown = Math.max(0.35, (e.hitCooldown || 0.8) * 0.7);
        e.speed = Math.max(9, (e.speed || 12) * 1.15);
        try { spawnFloatText(e.x + e.w/2, e.y - 10, 'Final Form!', { color: '#ff7a7a', life: 0.9 }); } catch {}
        e.hitTimer = 0; e.knockbackX = 0; e.knockbackY = 0;
        continue;
      }
      // Final defeat: non-Vorthak after second phase, or Vorthak after third
      if (isBoss && (e._thirdPhase || (!isVorthak && e._secondPhase))) {
        try {
          const actor = { name: e.name || 'Boss', portraitSrc: e.portraitDefeated || null };
          const line = `${e.name || 'Boss'}: ...`; // simple defeated line; customize per boss via portraits
          clearFadeOverlay();
          startPrompt(actor, line, []);
        } catch {}
        // Temple victory flags and Ell VN only for Vorthak in Level 5
        if (isVorthak && (runtime.currentLevel || 1) === 5) {
          try {
            if (!runtime.questFlags) runtime.questFlags = {};
            runtime.questFlags['canopy_sister_rescued'] = true;
            runtime.questFlags['temple_cleansed'] = true;
            runtime.questFlags['hub_unlocked'] = true;
            const ellActor = { name: 'Ell', portraitSrc: 'assets/portraits/level06/Ell/Ell.mp4' };
            const ellLine = "The warded circle gutters out; chains fall away to dust.\n\nEll: Thank you… it's over. I can stand.";
            if (!Array.isArray(runtime._queuedVNs)) runtime._queuedVNs = [];
            runtime._queuedVNs.push({ actor: ellActor, text: ellLine });
          } catch {}
        }
        try {
          const bonus = completionXpForLevel(runtime.currentLevel || 1);
          grantPartyXp(bonus);
          if (typeof e.onDefeatNextLevel === 'number') {
            // Always defer level transition until after the defeated VN (and any queued VNs) is closed
            runtime._afterQueuePendingLevel = e.onDefeatNextLevel;
          }
        } catch {}
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
            try { autoTurnInIfCleared('yorna_knot'); } catch {}
          } else {
            showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
          }
        }
        // Yorna: Kill Vast (Level 1) — mark cleared when Vast is defeated
        if (e.vnId === 'enemy:vast') {
          try {
            if (!runtime.questFlags) runtime.questFlags = {};
            if (runtime.questFlags['yorna_vast_started'] && !runtime.questFlags['yorna_vast_cleared']) {
              runtime.questFlags['yorna_vast_cleared'] = true;
              showBanner('Quest updated: Kill Vast — cleared');
              try { autoTurnInIfCleared('yorna_vast'); } catch {}
            }
          } catch {}
        }
        if (e.questId === 'urn_rooftops') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'urn_rooftops_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['urn_rooftops_cleared'] = true; showBanner('Quest updated: Secure the Rooftops — cleared'); try { autoTurnInIfCleared('urn_rooftops'); } catch {} }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'varabella_crossfire') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'varabella_crossfire_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['varabella_crossfire_cleared'] = true; showBanner('Quest updated: Cut the Crossfire — cleared'); try { autoTurnInIfCleared('varabella_crossfire'); } catch {} }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'canopy_triage') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'canopy_triage_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['canopy_triage_cleared'] = true; showBanner('Quest updated: Breath and Bandages — cleared'); try { autoTurnInIfCleared('canopy_triage'); } catch {} }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'twil_trace') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'twil_trace_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['twil_trace_cleared'] = true; showBanner('Quest updated: Trace the Footprints — cleared'); try { autoTurnInIfCleared('twil_trace'); } catch {} }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'yorna_ring') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'yorna_ring_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['yorna_ring_cleared'] = true; showBanner('Quest updated: Shatter the Ring — cleared'); try { autoTurnInIfCleared('yorna_ring'); } catch {} }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'yorna_causeway') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'yorna_causeway_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['yorna_causeway_cleared'] = true; showBanner('Quest updated: Hold the Causeway — cleared'); try { autoTurnInIfCleared('yorna_causeway'); } catch {} }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'hola_silence') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'hola_silence_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['hola_silence_cleared'] = true; showBanner('Quest updated: Break the Silence — cleared'); try { autoTurnInIfCleared('hola_silence'); } catch {} }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'hola_breath_bog') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'hola_breath_bog_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['hola_breath_bog_cleared'] = true; showBanner('Quest updated: Breath Over Bog — cleared'); try { autoTurnInIfCleared('hola_breath_bog'); } catch {} }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'twil_ember') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'twil_ember_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['twil_ember_cleared'] = true; showBanner('Quest updated: Carry the Ember — cleared'); try { autoTurnInIfCleared('twil_ember'); } catch {} }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'twil_wake') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'twil_wake_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['twil_wake_cleared'] = true; showBanner('Quest updated: Cut the Wake — cleared'); try { autoTurnInIfCleared('twil_wake'); } catch {} }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'tin_shallows') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'tin_shallows_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['tin_shallows_cleared'] = true; showBanner('Quest updated: Mark the Shallows — cleared'); try { autoTurnInIfCleared('tin_shallows'); } catch {} }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'tin_gaps4') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'tin_gaps4_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['tin_gaps4_cleared'] = true; showBanner('Quest updated: Flag the Gaps — cleared'); try { autoTurnInIfCleared('tin_gaps4'); } catch {} }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'nellis_beacon') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'nellis_beacon_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['nellis_beacon_cleared'] = true; showBanner('Quest updated: Raise the Beacon — cleared'); try { autoTurnInIfCleared('nellis_beacon'); } catch {} }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'nellis_crossroads4') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'nellis_crossroads4_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['nellis_crossroads4_cleared'] = true; showBanner('Quest updated: Light the Crossroads — cleared'); try { autoTurnInIfCleared('nellis_crossroads4'); } catch {} }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'canopy_sister2') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'canopy_sister2_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['canopy_sister2_cleared'] = true; showBanner('Quest updated: Ribbon in the Dust — cleared'); try { autoTurnInIfCleared('canopy_sister2'); } catch {} }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'canopy_sister3') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'canopy_sister3_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['canopy_sister3_cleared'] = true; showBanner('Quest updated: Reeds and Echoes — cleared'); try { autoTurnInIfCleared('canopy_sister3'); } catch {} }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'canopy_streets4') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'canopy_streets4_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['canopy_streets4_cleared'] = true; showBanner('Quest updated: Stitch the Streets — cleared'); try { autoTurnInIfCleared('canopy_streets4'); } catch {} }
          else showBanner(`Quest: ${left} target${left===1?'':'s'} left`);
        }
        if (e.questId === 'snake_den') {
          if (!runtime.questCounters) runtime.questCounters = {};
          const key = 'snake_den_remaining';
          const left = Math.max(0, (runtime.questCounters[key] || 0) - 1);
          runtime.questCounters[key] = left;
          if (left === 0) { if (!runtime.questFlags) runtime.questFlags = {}; runtime.questFlags['snake_den_cleared'] = true; showBanner('Quest updated: Clear the Den — cleared'); try { autoTurnInIfCleared('snake_den'); } catch {} }
          else showBanner(`Quest: ${left} pest${left===1?'':'s'} left`);
        }
      } catch {}
      // If Fana (enslaved sorceress) is defeated, show VN scene then spawn as recruitable NPC
      try {
        const nm = (e.name || '').toLowerCase();
        if (nm.includes('fana')) {
          // Show defeated VN scene
          try {
            const fanaActor = { 
              name: 'Fana', 
              portraitSrc: e.portraitDefeated || 'assets/portraits/level05/Fana/Fana.mp4' 
            };
            const defeatedLine = 'Fana: The chains... they\'re breaking... Vorthak\'s hold on my mind is fading... Thank you, warrior.';
            startPrompt(fanaActor, defeatedLine, []);
          } catch {}
          
          // Spawn an NPC at or near the defeat spot with a recruit dialog
          const nx = e.x, ny = e.y;
          Promise.all([
            import('../engine/sprites.js'),
            import('../engine/state.js'),
            import('../engine/dialog.js'),
            import('../data/dialogs.js'),
          ]).then(([sm, st, dm, dd]) => {
            const sheet = (sm.sheetForName ? sm.sheetForName('Fana') : null);
            const npc = st.spawnNpc(nx, ny, 'down', { name: 'Fana', dialogId: 'fana_freed', sheet, portrait: 'assets/portraits/level05/Fana/Fana.mp4', affinity: 6 });
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
          const lvl = runtime.currentLevel || 1;
          const tableSrc = (lvl === 2) ? ENEMY_LOOT_L2 : (lvl >= 3 ? ENEMY_LOOT_L3 : ENEMY_LOOT);
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
      // Skip corpse/stain for Fana (she becomes an NPC immediately)
      try {
        const nm2 = (e.name || '').toLowerCase();
        const skipCorpse = nm2.includes('fana');
        if (!skipCorpse) {
          spawnCorpse(e.x, e.y, { dir: e.dir, kind: e.kind || 'enemy', life: 1.8, sheet: e.sheet || null });
          spawnStain(e.x, e.y, { life: 2.8 });
        }
      } catch { /* fall back to spawning if needed */ }
      // Debug: log removals (always when DEBUG_ENEMIES) and early after load with extra flag
      try {
        const now = (performance && performance.now) ? performance.now() : Date.now();
        const since = Math.max(0, ((now - (runtime._loadedAt || 0)) / 1000));
        if ((window && window.DEBUG_ENEMIES) || (since <= 2.0 && (window && window.DEBUG_LOG_ENEMY_REMOVALS))) {
          console.log('[ENEMY REMOVED]', { name: e.name, kind: e.kind, x: e.x, y: e.y, hp: e.hp, burnDps: e._burnDps || 0, sinceLoadSec: since.toFixed(2) });
        }
      } catch {}
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
        // Decide salvage vs collect
        const picked = it.item;
        const isKey = !!(picked && picked.keyId); // Keys are never salvaged
        const invItems = player?.inventory?.items || [];
        const eq = player?.inventory?.equipped || {};
        let sameCount = 0;
        if (picked?.stackable) {
          // Sum quantities across stacks in backpack
          for (const s of invItems) if (s && s.stackable && s.id === picked.id) sameCount += (s.qty || 0);
          // Include any equipped stack of the same item
          for (const key of ['head','torso','legs','leftHand','rightHand']) {
            const e = eq[key];
            if (e && e.stackable && e.id === picked.id) sameCount += (e.qty || 1);
          }
        } else {
          // Count individual items in backpack
          for (const s of invItems) if (s && s.id === picked.id) sameCount += 1;
          // Include any equipped copies
          for (const key of ['head','torso','legs','leftHand','rightHand']) {
            const e = eq[key];
            if (e && e.id === picked.id) sameCount += 1;
          }
        }
        const isFull = !isKey && (sameCount >= 3);
        // Special-case: Health potions auto-consume on pickup if not at full HP; otherwise leave on ground
        const isPotion = picked && (picked.id === 'potion_light' || picked.id === 'potion_medium' || picked.id === 'potion_strong');
        if (isPotion) {
          const healAmt = (picked.id === 'potion_light') ? 4 : (picked.id === 'potion_medium') ? 8 : 14;
          if (player.hp < player.maxHp) {
            // Consume and heal
            itemsOnGround.splice(ii, 1);
            const before = player.hp;
            player.hp = Math.min(player.maxHp, player.hp + healAmt);
            const gained = Math.max(0, player.hp - before);
            const gainedDisp = Math.max(1, Math.ceil(gained));
            showBanner(`Drank ${picked.name}: +${gainedDisp} HP`);
            playSfx('pickup');
            // small sparkle burst
            for (let k = 0; k < 6; k++) spawnSparkle(cx + (Math.random()*4-2), cy + (Math.random()*4-2));
          }
          // If at full health, do not pick up; leave item on ground
          continue;
        }

        if (isFull) {
          // At cap: do not auto-pickup; leave on ground
          continue;
        }
        itemsOnGround.splice(ii, 1);
        {
          // Collect
          let toAdd = picked;
          try { toAdd = JSON.parse(JSON.stringify(picked)); } catch {}
          addItemToInventory(player.inventory, toAdd);
          showBanner(`Picked up ${picked?.name || 'an item'}`);
          playSfx('pickup');
          // Auto-equip rules:
          // - Armor (head/torso/legs): auto-equip if strictly better.
          // - Hands: auto-equip only if the target hand is empty, and only for non-stackable items (won't auto-equip torches).
          try {
            if (!picked) {
              // no-op
            } else if (!picked.stackable) {
              const slot = picked.slot;
              const valid = slot === 'head' || slot === 'torso' || slot === 'legs' || slot === 'leftHand' || slot === 'rightHand';
              if (valid) {
                const eqNow = player?.inventory?.equipped || {};
                const cur = eqNow[slot] || null;
                const hasStats = (it) => !!it && (((typeof it.dr === 'number') && it.dr > 0) || ((typeof it.atk === 'number') && it.atk > 0));
                if (!cur) {
                  // Empty slot: equip it
                  autoEquipIfBetter(player, slot);
                } else if (hasStats(cur) && hasStats(picked)) {
                  // Both have meaningful stats: upgrade if strictly better for the slot
                  autoEquipIfBetter(player, slot);
                }
              }
            }
          } catch {}
        }
        // small sparkle burst
        for (let k = 0; k < 6; k++) spawnSparkle(cx + (Math.random()*4-2), cy + (Math.random()*4-2));
      }
    }
  }

  // Death check → Dramatic Game Over sequence
  if (!runtime.gameOver && player.hp <= 0) {
    try {
      // Pause simulation and VN, hide player sprite, and apply zoom-out target
      runtime.paused = true; runtime.disableVN = true;
      runtime._hidePlayer = true;
      runtime._deathZoomTarget = 0.85; // zoom out a bit more for drama
      // Spawn player corpse and blood one time
      if (!runtime._didDeathEffects) {
        runtime._didDeathEffects = true;
        try { import('../engine/state.js').then(s => { s.spawnCorpse(player.x, player.y, { kind: 'player', dir: player.dir || 'down' }); s.spawnStain(player.x + player.w/2, player.y + player.h/2, { life: 3.5 }); }); } catch {}
        try { import('../engine/ui.js').then(u => u.showBanner && u.showBanner('Your journey has ended...')); } catch {}
        // Suppress input briefly so attack key doesn't skip the scene
        runtime._suppressInputTimer = Math.max(runtime._suppressInputTimer || 0, 1.0);
        // Delay before accepting the Game Over key press
        runtime._deathDelay = Math.max(runtime._deathDelay || 0, 1.2);
      }
    } catch {}
  }

  // After death, wait for delay to elapse before enabling Game Over key prompt
  if (!runtime.gameOver && player.hp <= 0) {
    if ((runtime._deathDelay || 0) > 0) {
      runtime._deathDelay = Math.max(0, (runtime._deathDelay || 0) - dt);
      if (runtime._deathDelay === 0) {
        runtime._awaitGameOverKey = true;
      }
    }
  }

  // Camera follow
  camera.x = Math.round(player.x + player.w/2 - camera.w/2);
  camera.y = Math.round(player.y + player.h/2 - camera.h/2);
  camera.x = Math.max(0, Math.min(world.w - camera.w, camera.x));
  camera.y = Math.max(0, Math.min(world.h - camera.h, camera.y));

  // Level 5 (Vorthak): re-lock the boss gate after the player passes through it (with slight delay)
  try {
    if ((runtime.currentLevel || 1) === 5 && !runtime._vorthakGateRelocked) {
      const gate = obstacles.find(o => o && o.type === 'gate' && (o.id === 'key_temple' || o.keyId === 'key_temple'));
      if (gate && gate.locked === false) {
        const px = player.x + player.w/2;
        // Boss arena is to the right of the gate; once center passes gate's right edge, start a short timer
        if (px > gate.x + gate.w && (runtime._vorthakGateRelockTimer || 0) <= 0) {
          runtime._vorthakGateRelockTimer = 0.9; // seconds
        }
        // Count down and then close the gate
        if ((runtime._vorthakGateRelockTimer || 0) > 0) {
          runtime._vorthakGateRelockTimer = Math.max(0, (runtime._vorthakGateRelockTimer || 0) - dt);
          if (runtime._vorthakGateRelockTimer === 0) {
            gate.locked = true;
            gate.blocksAttacks = true;
            runtime._vorthakGateRelocked = true;
            // Small camera shake to sell the slam
            runtime.shakeTimer = Math.max(runtime.shakeTimer || 0, 0.35);
            runtime.shakeMag = Math.max(runtime.shakeMag || 0, 3);
            try { showBanner('The gate slams shut!'); } catch {}
            try { playSfx('block'); } catch {}
          }
        }
      }
    }
  } catch {}

  // Music mode switching based on nearby alive enemies (not during menus/chats), with debounce
  {
    let desired = 'normal';
    // Suppress menace while in overlays/menus
    if (runtime.gameState !== 'play') {
      if (runtime.musicMode !== 'normal') {
        runtime.musicModePending = 'normal';
        runtime.musicModeSwitchTimer = Math.min(runtime.musicModeSwitchTimer || 0, 0.6);
      }
    } else {
      const view = { x: camera.x, y: camera.y, w: camera.w, h: camera.h };
      let bossOn = false, anyOn = false;
      // Proximity radii (boss has a wider pull, and does not require on-screen)
      const px = player.x + player.w / 2;
      const py = player.y + player.h / 2;
      const dangerR = 300; // was 220 — widen general danger radius
      const dangerR2 = dangerR * dangerR;
      const bossR = 460;   // boss-specific wider radius, ignores on-screen check
      const bossR2 = bossR * bossR;
      for (const e of enemies) {
        if (!e || e.hp <= 0) continue;
        const ex = e.x + e.w / 2, ey = e.y + e.h / 2;
        const dx = ex - px, dy = ey - py;
        const isBoss = String(e.kind).toLowerCase() === 'boss';
        if (isBoss) {
          if ((dx*dx + dy*dy) <= bossR2) { bossOn = true; break; }
          continue;
        }
        // Non-boss: must be within camera view and within general danger radius
        const on = !(e.x + e.w < view.x || e.x > view.x + view.w || e.y + e.h < view.y || e.y > view.y + view.h);
        if (!on) continue;
        if ((dx*dx + dy*dy) > dangerR2) continue;
        anyOn = true;
      }
      desired = bossOn ? 'high' : (anyOn ? 'low' : 'normal');
      // If player HP is very low, prefer low mode over normal even without visible enemies to keep tension
      try { if (!anyOn) { const ratio = Math.max(0, Math.min(1, player.hp / Math.max(1, player.maxHp || 10))); if (ratio <= 0.15) desired = 'low'; } } catch {}
    }
    if (desired === runtime.musicMode) {
      // Already in this mode; clear any pending switch
      runtime.musicModePending = null;
      runtime.musicModeSwitchTimer = 0;
    } else {
      if (runtime.musicModePending !== desired) {
        runtime.musicModePending = desired;
        runtime.musicModeSwitchTimer = (desired === 'normal') ? 1.8 : 0.6; // longer settle when returning to calm
      } else if (runtime.musicModeSwitchTimer > 0) {
        runtime.musicModeSwitchTimer = Math.max(0, runtime.musicModeSwitchTimer - dt);
        if (runtime.musicModeSwitchTimer === 0) {
          runtime.musicMode = desired;
          try { setMusicMode(desired); } catch {}
          try { showMusicTheme(bossOn ? 'Boss' : (anyOn ? 'Danger' : 'Overworld')); } catch {}
          runtime.musicModePending = null;
        }
      }
    }
  }

  // Low-HP music muffle: when the player's HP is low, muffle background music
  try {
    const ratio = Math.max(0, Math.min(1, player.hp / Math.max(1, player.maxHp || 10)));
    const low = ratio <= 0.35;
    if (!!runtime._musicMuffleOn !== low) {
      runtime._musicMuffleOn = low;
      import('../engine/audio.js').then(a => { if (a.setMusicMuffle) a.setMusicMuffle(low); }).catch(()=>{});
    }
    // Low-HP heartbeat: periodic thump that speeds up as HP drops
    runtime._heartbeatTimer = Math.max(0, (runtime._heartbeatTimer || 0) - dt);
    if (low && (runtime.gameState !== 'chat')) {
      const k = Math.max(0, Math.min(1, (0.35 - ratio) / 0.35));
      const period = Math.max(0.40, 1.00 - 0.55 * k); // 1.0s near threshold -> 0.45s near zero
      if ((runtime._heartbeatTimer || 0) <= 0) {
        try { import('../engine/audio.js').then(m => m.playSfx && m.playSfx('heartbeat')); } catch {}
        runtime._heartbeatTimer = period;
      }
    } else {
      runtime._heartbeatTimer = 0;
    }
  } catch {}

  // Minimal VN-on-sight: for any NPC or enemy with vnOnSight, pan camera to them,
  // then show a simple VN once when first seen
  if (runtime.gameState === 'play' && (runtime.introCooldown || 0) <= 0 && !runtime.disableVN) {
    const actors = [...npcs, ...enemies];
    for (const a of actors) {
      if (!a || !a.vnOnSight || a._vnShown) continue;
      // Skip if we've seen this intro before in this session/save
      const type = (typeof a.touchDamage === 'number') ? 'enemy' : 'npc';
      const key = a.vnId || `${type}:${(a.name || '').toLowerCase()}`;
      if (runtime.vnSeen && runtime.vnSeen[key]) { a._vnShown = true; continue; }
      const inView = (
        a.x + a.w > camera.x && a.x < camera.x + camera.w &&
        a.y + a.h > camera.y && a.y < camera.y + camera.h
      );
      if (!inView) continue;
      a._vnShown = true;
      if (runtime.vnSeen) runtime.vnSeen[key] = true;
      // Start a short cooldown to prevent immediate follow-ups
      runtime.introCooldown = Math.max(runtime.introCooldown || 0, 0.8);
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

  // Removed auto-close of VN when a level is pending; transition happens after user closes the VN.
}

function applyCompanionAuras(dt) {
  // Reset buffs
  const buffs = runtime.combatBuffs;
  buffs.atk = 0; buffs.dr = 0; buffs.regen = 0; buffs.range = 0; buffs.touchDR = 0; buffs.rangedDR = 0; buffs.aspd = 0; buffs.crit = 0;
  // Reset wind deflection
  if (!runtime.projectileDeflect) runtime.projectileDeflect = { chance: 0, radius: 0 };
  runtime.projectileDeflect.chance = 0;
  runtime.projectileDeflect.radius = 0;
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
        case 'rangedDR': buffs.rangedDR += (a.value || 0) * mult; break; // resistance vs ranged/projectile damage
        case 'crit': buffs.crit += (a.value || 0) * mult; break; // absolute crit chance add
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
        case 'deflect': {
          // Aggregate chance and take the max radius among sources
          const rad = a.radius || 0;
          runtime.projectileDeflect.chance += Math.max(0, (a.value || 0) * mult);
          if (rad > 0) runtime.projectileDeflect.radius = Math.max(runtime.projectileDeflect.radius || 0, rad);
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
  // Include temporary attack speed bonus from triggers (e.g., Urn Cheer)
  buffs.aspd += (runtime.tempAspdBonus || 0);
  buffs.aspd = Math.min(buffs.aspd, COMPANION_BUFF_CAPS.aspd);
  buffs.crit = Math.min(buffs.crit, COMPANION_BUFF_CAPS.crit || buffs.crit);
  buffs.rangedDR = Math.min(buffs.rangedDR, COMPANION_BUFF_CAPS.rangedDR || buffs.rangedDR);
  // Cap deflect chance
  if (!runtime.projectileDeflect) runtime.projectileDeflect = { chance: 0, radius: 0 };
  runtime.projectileDeflect.chance = Math.min(runtime.projectileDeflect.chance || 0, COMPANION_BUFF_CAPS.deflect || (runtime.projectileDeflect.chance || 0));
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
  // Decay temporary attack speed bonus from triggers (e.g., Urn Cheer)
  if ((runtime._tempAspdTimer || 0) > 0) {
    runtime._tempAspdTimer = Math.max(0, (runtime._tempAspdTimer || 0) - dt);
    if (runtime._tempAspdTimer === 0) runtime.tempAspdBonus = 0;
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
  const cds = runtime.companionCDs || (runtime.companionCDs = { yornaEcho: 0, canopyShield: 0, holaGust: 0, cowsillStrike: 0, cowsillDouble: 0 });
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
  cds.cowsillStrike = Math.max(0, (cds.cowsillStrike || 0) - dt);
  cds.cowsillDouble = Math.max(0, (cds.cowsillDouble || 0) - dt);

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
              try { autoTurnInIfCleared('hola_practice'); } catch {}
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
      // Quest tracking (legacy): mark rally done if Twil fuse is active (not required for completion)
      try { if (runtime.questFlags && runtime.questFlags['twil_fuse_started']) runtime.questFlags['twil_fuse_rally'] = true; } catch {}
    }
  }

  // Urn Cheer: burst heal when HP dips low + brief attack speed boost
  if (has('urn')) {
    const base = companionEffectsByKey.urn?.triggers?.cheer || { hpThresh: 0.5, heal: 3, radius: 80, cooldownSec: 12 };
    const m = multFor('urn');
    const eff = {
      hpThresh: (base.hpThresh || 0.5),
      heal: Math.round((base.heal || 3) * m),
      radius: (base.radius || 80),
      cooldownSec: (base.cooldownSec || 12) / (1 + (m - 1) * 0.5),
      aspdBonus: Math.min(0.35, 0.25 * m), // moderate, noticeable boost
      aspdDur: 3.5 * m,
    };
    const hpRatio = player.hp / Math.max(1, player.maxHp || 10);
    if ((cds.urnCheer || 0) <= 0 && player.hp > 0 && hpRatio <= eff.hpThresh) {
      // Heal player (companions do not track HP in this slice)
      player.hp = Math.min(player.maxHp, player.hp + eff.heal);
      // Temporary attack speed boost
      runtime.tempAspdBonus = Math.max(runtime.tempAspdBonus || 0, eff.aspdBonus);
      runtime._tempAspdTimer = Math.max(runtime._tempAspdTimer || 0, eff.aspdDur);
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
  // Oyin (swapped) Dust Veil: if 2+ enemies are close, apply heavy slow briefly
  if (has('oyin')) {
    let nearby = 0;
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      const dx = e.x - player.x, dy = e.y - player.y;
      if ((dx*dx + dy*dy) <= (40*40)) nearby++;
      if (nearby >= 2) break;
    }
    const m = multFor('oyin');
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

// Enemy auras/triggers: compute player debuffs, enemy DR/regen, and short pulses
function applyEnemyAurasAndTriggers(dt) {
  // Defaults
  const deb = runtime.enemyDebuffs || (runtime.enemyDebuffs = { slowMul: 1.0, rangePenalty: 0 });
  deb.slowMul = 1.0;
  deb.rangePenalty = 0;
  // Aggregate aura effects from nearby enemies
  for (const e of enemies) {
    if (!e || e.hp <= 0) continue;
    const key = (e.name || '').toLowerCase();
    const def = enemyEffectsByKey[key];
    if (!def) continue;
    // Base DR aura
    const baseDr = Math.max(0, Math.min(ENEMY_BUFF_CAPS.dr, def.auras?.dr || 0));
    e._baseDr = baseDr;
    // Tick active timers
    if (e._tempDrTimer && e._tempDrTimer > 0) { e._tempDrTimer = Math.max(0, e._tempDrTimer - dt); if (e._tempDrTimer <= 0) e._tempDr = 0; }
    if (e._speedBoostTimer && e._speedBoostTimer > 0) { e._speedBoostTimer = Math.max(0, e._speedBoostTimer - dt); if (e._speedBoostTimer <= 0) e._speedBoostFactor = 1; }
    if (e._guardCd && e._guardCd > 0) e._guardCd = Math.max(0, e._guardCd - dt);
    if (e._gustCd && e._gustCd > 0) e._gustCd = Math.max(0, e._gustCd - dt);
    if (e._enrageCd && e._enrageCd > 0) e._enrageCd = Math.max(0, e._enrageCd - dt);
    if (e._recentHitTimer && e._recentHitTimer > 0) e._recentHitTimer = Math.max(0, e._recentHitTimer - dt);

    // Regen (optionally stronger when near player)
    let regen = Math.max(0, Math.min(ENEMY_BUFF_CAPS.regen, def.auras?.regen || 0));
    if (def.auras?.regenNear) {
      const dx = (player.x - e.x), dy = (player.y - e.y);
      if ((dx*dx + dy*dy) <= (def.auras.regenNear.radius * def.auras.regenNear.radius)) {
        regen *= def.auras.regenNear.mult || 1;
      }
    }
    if (regen > 0 && e.hp > 0) e.hp = Math.min(e.maxHp || e.hp, e.hp + regen * dt);

    // Player aura debuffs: slow + range penalty
    const dxp = (player.x - e.x), dyp = (player.y - e.y);
    const dist2 = dxp*dxp + dyp*dyp;
    const ps = Math.max(0, Math.min(ENEMY_BUFF_CAPS.playerSlow, def.auras?.playerSlow || 0));
    const pr = def.auras?.slowRadius || 0;
    if (ps > 0 && pr > 0 && dist2 <= pr*pr) deb.slowMul = Math.max(0.1, deb.slowMul * (1 - ps));
    const wr = Math.max(0, Math.min(ENEMY_BUFF_CAPS.weakenRange, def.auras?.weakenRange || 0));
    const wrr = def.auras?.weakenRadius || 0;
    if (wr > 0 && wrr > 0 && dist2 <= wrr*wrr) deb.rangePenalty = Math.min(ENEMY_BUFF_CAPS.weakenRange, Math.max(deb.rangePenalty, wr));

    // Triggers
    // onHitGuard: react after recent hit
    if (def.triggers?.onHitGuard && (e._guardCd || 0) <= 0 && (e._recentHitTimer || 0) > 0) {
      const t = def.triggers.onHitGuard;
      const addDr = Math.max(0, Math.min(ENEMY_BUFF_CAPS.dr, t.dr || 0));
      e._tempDr = Math.max(e._tempDr || 0, addDr);
      e._tempDrTimer = Math.max(e._tempDrTimer || 0, t.durationSec || 2);
      if (t.speedMul && t.speedMul > 1) { e._speedBoostFactor = t.speedMul; e._speedBoostTimer = Math.max(e._speedBoostTimer || 0, t.durationSec || 2); }
      e._guardCd = t.cooldownSec || 8;
      try { spawnFloatText(e.x + e.w/2, e.y - 10, 'Guard!', { color: '#a8c6ff', life: 0.7 }); } catch {}
      try { playSfx('shield'); } catch {}
      try { for (let i = 0; i < 8; i++) spawnSparkle(e.x + e.w/2 + (Math.random()*10-5), e.y + e.h/2 + (Math.random()*8-4), { color: '#a8c6ff', life: 0.5 }); } catch {}
    }
    // enrageBelowHp: threshold-based buff
    if (def.triggers?.enrageBelowHp && (e._enrageCd || 0) <= 0) {
      const t = def.triggers.enrageBelowHp;
      const ratio = e.hp / Math.max(1, e.maxHp || e.hp);
      if (ratio <= (t.hpThresh || 0.5)) {
        const addDr = Math.max(0, Math.min(ENEMY_BUFF_CAPS.dr, t.dr || 0));
        if (addDr > 0) { e._tempDr = Math.max(e._tempDr || 0, addDr); e._tempDrTimer = Math.max(e._tempDrTimer || 0, t.durationSec || 4); }
        if (t.speedMul && t.speedMul > 1) { e._speedBoostFactor = t.speedMul; e._speedBoostTimer = Math.max(e._speedBoostTimer || 0, t.durationSec || 4); }
        e._enrageCd = t.cooldownSec || 10;
        try { spawnFloatText(e.x + e.w/2, e.y - 10, 'Enrage!', { color: '#ffd166', life: 0.8 }); } catch {}
        try { playSfx('rally'); } catch {}
        try { for (let i = 0; i < 10; i++) spawnSparkle(e.x + e.w/2 + (Math.random()*12-6), e.y + e.h/2 + (Math.random()*10-5), { color: '#ff9a3d', life: 0.6 }); } catch {}
      }
    }
    // proximityGust: radial push and slow on player (Fana only below 50% HP)
    if (def.triggers?.proximityGust && (e._gustCd || 0) <= 0) {
      const t = def.triggers.proximityGust;
      const rr = t.radius || 0;
      const dx = (player.x - e.x), dy = (player.y - e.y);
      if (rr > 0 && (dx*dx + dy*dy) <= rr*rr) {
        // Optional HP gate for Fana design
        if (key === 'fana') { const ratio = e.hp / Math.max(1, e.maxHp || e.hp); if (ratio > 0.5) { /* skip until low */ } else {
          doGust(e, t);
        } } else {
          doGust(e, t);
        }
      }
    }
  }
  // Apply runtime player slow from timed gusts (decays here)
  if (runtime._playerGustSlowTimer && runtime._playerGustSlowTimer > 0) {
    runtime._playerGustSlowTimer = Math.max(0, runtime._playerGustSlowTimer - dt);
    const f = Math.max(0, Math.min(ENEMY_BUFF_CAPS.playerSlow, runtime._playerGustSlow || 0));
    deb.slowMul = Math.max(0.1, deb.slowMul * (1 - f));
  }

  function doGust(e, t) {
    const dx = (player.x - e.x), dy = (player.y - e.y);
    const mag = Math.hypot(dx, dy) || 1;
    const px = (dx / mag) * (t.push || 0);
    const py = (dy / mag) * (t.push || 0);
    const solidsForPlayer = enemies.filter(x => x && x.hp > 0);
    moveWithCollision(player, px, py, solidsForPlayer);
    runtime._playerGustSlow = Math.max(runtime._playerGustSlow || 0, t.slow || 0);
    runtime._playerGustSlowTimer = Math.max(runtime._playerGustSlowTimer || 0, t.durationSec || 0.3);
    e._gustCd = t.cooldownSec || 10;
    try { spawnFloatText(e.x + e.w/2, e.y - 10, 'Gust!', { color: '#a1e3ff', life: 0.7 }); } catch {}
    try { playSfx('gust'); } catch {}
    try { for (let i = 0; i < 8; i++) spawnSparkle(e.x + e.w/2 + (Math.random()*10-5), e.y + e.h/2 + (Math.random()*8-4), { color: '#a1e3ff', life: 0.5 }); } catch {}
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
