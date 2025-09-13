import { player, enemies, npcs, companions, runtime, obstacles, itemsOnGround, grantPartyXp } from '../engine/state.js';
import { rectsIntersect, getEquipStats, segmentIntersectsRect } from '../engine/utils.js';
import { showBanner, showTargetInfo, showPersistentBanner, hideBanner } from '../engine/ui.js';
import { companionEffectsByKey } from '../data/companion_effects.js';
import { playSfx } from '../engine/audio.js';
import { enterChat } from '../engine/ui.js';
import { startDialog, startPrompt } from '../engine/dialog.js';
import { BREAKABLE_LOOT, CHEST_LOOT, CHEST_LOOT_L2, CHEST_LOOT_L3, rollFromTable, itemById } from '../data/loot.js';
import { spawnProjectile } from '../engine/state.js';
import { markFlowDirty } from '../engine/pathfinding.js';

export function startAttack() {
  const now = performance.now() / 1000;
  if (player.attacking) return;
  // Effective cooldown reduced by attack speed buffs (aspd)
  const aspd = (runtime?.combatBuffs?.aspd || 0);
  const effCd = Math.max(0.12, player.attackCooldown / Math.max(1e-6, (1 + aspd)));
  if (now - player.lastAttack < effCd) return;
  player.attacking = true;
  player.attackTimer = 0;
  player.lastAttack = now;
  playSfx('attack');
  // Dash Combo: if dashing or within a short window after, empower this swing and apply vulnerability+lockout
  try {
    const t = runtime._timeSec || 0;
    const inWindow = (t <= (runtime._dashComboReadyUntil || -1)) || ((runtime._dashTimer || 0) > 0);
    if (inWindow && (runtime._dashComboLockout || 0) <= 0) {
      runtime._dashComboActive = true;
      runtime._dashComboAppliedThisSwing = false;
      const lock = (typeof runtime._dashComboLockoutSec === 'number') ? runtime._dashComboLockoutSec : 0.6;
      runtime._dashComboLockout = Math.max(runtime._dashComboLockout || 0, lock);
      const vuln = (typeof runtime._dashComboVulnDurSec === 'number') ? runtime._dashComboVulnDurSec : 0.6;
      runtime._dashComboVulnTimer = Math.max(runtime._dashComboVulnTimer || 0, vuln);
      runtime._dashComboJustTriggered = true;
      try { import('../engine/state.js').then(m => m.spawnFloatText(player.x + player.w/2, player.y - 12, 'Dash Strike!', { color: '#9ae6ff', life: 0.8 })); } catch {}
      try { playSfx('tumbleUp'); } catch {}
    }
  } catch {}
}

export function willAttackHitEnemy() {
  // Predict the immediate attack hitbox and check for any enemy within it
  const range = Math.max(0, 12 + (runtime?.combatBuffs?.range || 0) - (runtime?.enemyDebuffs?.rangePenalty || 0));
  const hb = { x: player.x, y: player.y, w: player.w, h: player.h };
  if (player.dir === 'left')  { hb.x -= range; hb.w += range; }
  if (player.dir === 'right') { hb.w += range; }
  if (player.dir === 'up')    { hb.y -= range; hb.h += range; }
  if (player.dir === 'down')  { hb.h += range; }
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    if (rectsIntersect(hb, e)) {
      const ex = e.x + e.w/2, ey = e.y + e.h/2;
      const samples = [
        [player.x + player.w/2, player.y + player.h/2],
        [player.x, player.y],
        [player.x + player.w, player.y],
        [player.x, player.y + player.h],
        [player.x + player.w, player.y + player.h],
      ];
      let losClear = false;
      for (const [sx, sy] of samples) {
        let rayBlocked = false;
        for (const o of obstacles) {
          if (o && o.blocksAttacks) {
            if (o.type === 'gate' && o.locked === false) continue;
            if (segmentIntersectsRect(sx, sy, ex, ey, o)) { rayBlocked = true; break; }
          }
        }
        if (!rayBlocked) { losClear = true; break; }
      }
      if (losClear) return true;
    }
  }
  return false;
}

export function handleAttacks(dt) {
  if (!player.attacking) return;
  player.attackTimer += dt;
  if (!player._didHit && player.attackTimer >= player.attackDuration * 0.5) {
    player._didHit = true;
    const range = Math.max(0, 12 + (runtime?.combatBuffs?.range || 0) - (runtime?.enemyDebuffs?.rangePenalty || 0));
    const hb = { x: player.x, y: player.y, w: player.w, h: player.h };
    if (player.dir === 'left')  { hb.x -= range; hb.w += range; }
    if (player.dir === 'right') { hb.w += range; }
    if (player.dir === 'up')    { hb.y -= range; hb.h += range; }
    if (player.dir === 'down')  { hb.h += range; }
    // Attempt to unlock any gate hit by the attack
    tryUnlockGate(hb);
    // Damage breakables (barrels/crates)
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      if (!o || (o.type !== 'barrel' && o.type !== 'crate')) continue;
      const r = { x: o.x, y: o.y, w: o.w, h: o.h };
      if (!rectsIntersect(hb, r)) continue;
      o.hp = (typeof o.hp === 'number') ? o.hp - 1 : -1;
      if (o.hp <= 0) {
        // spawn loot and remove
        try {
          const table = BREAKABLE_LOOT[o.type] || [];
          const drop = rollFromTable(table);
          if (drop) import('../engine/state.js').then(s => s.spawnPickup(o.x + o.w/2 - 5, o.y + o.h/2 - 5, drop));
        } catch {}
        // Track broken id for persistence
        try { if (o.id) runtime.brokenBreakables[o.id] = true; } catch {}
        const idx = obstacles.indexOf(o);
        if (idx !== -1) obstacles.splice(idx, 1);
        playSfx('break');
        try { import('../engine/pathfinding.js').then(m => m.markFlowDirty && m.markFlowDirty()).catch(()=>{}); } catch {}
      }
    }
    const hasOyin = companions.some(c => (c.name || '').toLowerCase().includes('oyin'));
    const hasTwil = companions.some(c => (c.name || '').toLowerCase().includes('twil'));
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      if (rectsIntersect(hb, e)) {
        const ex = e.x + e.w/2, ey = e.y + e.h/2;
        const samples = [
          [player.x + player.w/2, player.y + player.h/2],
          [player.x, player.y],
          [player.x + player.w, player.y],
          [player.x, player.y + player.h],
          [player.x + player.w, player.y + player.h],
        ];
        let losClear = false;
        for (const [sx, sy] of samples) {
          let rayBlocked = false;
          for (const o of obstacles) {
            if (o && o.blocksAttacks) {
              if (o.type === 'gate' && o.locked === false) continue;
              if (segmentIntersectsRect(sx, sy, ex, ey, o)) { rayBlocked = true; break; }
            }
          }
          if (!rayBlocked) { losClear = true; break; }
        }
        if (!losClear) continue;
        const mods = getEquipStats(player);
        const add = (runtime?.combatBuffs?.atk || 0) + (mods.atk || 0) + (runtime?.tempAtkBonus || 0);
        const dmg = Math.max(1, (player.damage || 1) + add);
        let finalDmg = dmg;
        // Oyin (swapped): mark weakness (+1 dmg) when close
        if (hasOyin) {
          const px = player.x + player.w/2, py = player.y + player.h/2;
          const dxm = ex - px, dym = ey - py;
          if ((dxm*dxm + dym*dym) <= (48*48)) finalDmg += 1;
        }
        // Player crit pipeline (chance + DR penetration + multiplier)
        const toggles = runtime?.combatToggles || { playerCrits: true };
        let isCrit = false;
        if (toggles.playerCrits) {
          let critChance = 0.08 + (runtime?.combatBuffs?.crit || 0); // base 8% + aura bonuses
          if (Math.random() < critChance) {
            isCrit = true;
            finalDmg = Math.ceil(finalDmg * 1.5);
            // Mark a recent player crit for high-affinity triggers
            try { runtime._recentPlayerCritTimer = Math.max(runtime._recentPlayerCritTimer || 0, 0.8); } catch {}
          }
        }
        // Dash Combo damage bonus applies to first enemy hit this swing
        try {
          if (runtime._dashComboActive && !runtime._dashComboAppliedThisSwing) {
            const mult = (typeof runtime._dashComboDmgMult === 'number') ? runtime._dashComboDmgMult : 1.5;
            finalDmg = Math.ceil(finalDmg * Math.max(1, mult));
            runtime._dashComboAppliedThisSwing = true;
            runtime._dashComboActive = false;
            import('../engine/state.js').then(m => m.spawnFloatText(e.x + e.w/2, e.y - 12, `Dash +${Math.max(1, Math.ceil(finalDmg - dmg))}`, { color: '#9ae6ff', life: 0.7 }));
          }
        } catch {}
        // Cowsill L8 — Crescendo: after 5 hits within 3s, this hit deals +100% bonus
        try {
          const cds = runtime.companionCDs || (runtime.companionCDs = {});
          const nowT = runtime._timeSec || 0;
          const hasCowsillL8 = companions.some(c => (c.name||'').toLowerCase().includes('cowsill') && (c.affinity||0) >= 8);
          if (hasCowsillL8) {
            const arr = Array.isArray(runtime._cowsillHits) ? runtime._cowsillHits : (runtime._cowsillHits = []);
            // pre-count: push a marker for this impending hit
            arr.push(nowT);
            while (arr.length && (nowT - arr[0] > 3.0)) arr.shift();
            if ((cds.cowsillCrescendo || 0) <= 0 && arr.length >= 5) {
              finalDmg = Math.ceil(finalDmg * 2);
              cds.cowsillCrescendo = 18;
              import('../engine/state.js').then(m => m.spawnFloatText(e.x + e.w/2, e.y - 16, 'Crescendo!', { color: '#ff6b6b', life: 0.8 }));
            }
          }
        } catch {}
        const before = e.hp;
        // Apply damage first, then heal back by effective DR (preserves existing trigger flow)
        e.hp -= finalDmg;
        // Apply enemy DR (base + temporary), with 50% penetration on crit
        try {
          let enemyDr = Math.max(0, (e._baseDr || 0) + (e._tempDr || 0));
          if (isCrit) enemyDr = Math.max(0, enemyDr * 0.5);
          // Yorna L10 Execution Window: apply AP and true damage vs low-HP enemies
          let effDr = enemyDr;
          try {
            const low = (e.maxHp ? (e.hp / e.maxHp) : 1) <= 0.25;
            if (low && (runtime?.tempAPBonus || 0) > 0) effDr = Math.max(0, effDr - (runtime.tempAPBonus || 0));
          } catch {}
          if (effDr > 0) {
            const reduce = Math.min(effDr, finalDmg);
            e.hp += reduce; // negate part of the applied damage
          }
          try {
            const low = (e.maxHp ? (e.hp / e.maxHp) : 1) <= 0.25;
            if (low && (runtime?.tempTrueDamage || 0) > 0) {
              e.hp -= Math.max(0, runtime.tempTrueDamage || 0);
            }
          } catch {}
          // Mark recent hit to drive enemy on-hit triggers
          e._recentHitTimer = Math.max(e._recentHitTimer || 0, 0.9);
        } catch {}
        try {
          if (window && window.DEBUG_ENEMIES) {
            console.log('[ENEMY HIT]', {
              name: e.name, kind: e.kind, x: e.x, y: e.y, hpBefore: before, hpAfter: e.hp, base: dmg, add: (finalDmg - dmg), total: finalDmg,
            });
          }
        } catch {}
        // UI: show last enemy struck in lower-right (just the name)
        try { showTargetInfo(`${e.name || 'Enemy'}`); } catch {}
        // Player crit feedback
        if (isCrit) {
          const dmgTxt = Number(Math.max(1, finalDmg)).toFixed(2);
          import('../engine/state.js').then(m => m.spawnFloatText(e.x + e.w/2, e.y - 12, `Crit! ${dmgTxt}`, { color: '#ffd166', life: 0.8 }));
          try { playSfx('pierce'); } catch {}
        }
        // Cowsill L10 — Encore: repeat damage as ghost hits on up to 2 nearby enemies (no on-hit procs)
        try {
          const cds = runtime.companionCDs || (runtime.companionCDs = {});
          const hasCowsillL10 = companions.some(c => (c.name||'').toLowerCase().includes('cowsill') && (c.affinity||0) >= 10);
          if (hasCowsillL10 && (cds.cowsillEncore || 0) <= 0) {
            let echoed = 0;
            for (const t of enemies) {
              if (!t || t === e || t.hp <= 0) continue;
              const dx2 = (t.x - e.x), dy2 = (t.y - e.y);
              if ((dx2*dx2 + dy2*dy2) <= (72*72)) {
                const ghost = Math.max(1, Math.round(finalDmg * 0.8));
                t.hp -= ghost;
                echoed++;
                import('../engine/state.js').then(m => m.spawnFloatText(t.x + t.w/2, t.y - 12, `Encore ${ghost}`, { color: '#ffeb3b', life: 0.7 }));
                if (echoed >= 2) break;
              }
            }
            if (echoed > 0) { cds.cowsillEncore = 45; }
          }
        } catch {}
        // Twil (swapped): Kindle DoT (fiery strikes) and quest tracking
        if (hasTwil) {
          e._burnTimer = Math.max(e._burnTimer || 0, 1.5);
          e._burnDps = Math.max(e._burnDps || 0, 0.4);
          try {
            if (runtime.questFlags && runtime.questFlags['twil_fuse_started'] && !runtime.questFlags['twil_fuse_cleared']) {
              if (!e._questKindled) {
                e._questKindled = true;
                if (!runtime.questCounters) runtime.questCounters = {};
                const n = (runtime.questCounters['twil_fuse_kindled'] || 0) + 1;
                runtime.questCounters['twil_fuse_kindled'] = n;
                if (n >= 3) { runtime.questFlags['twil_fuse_cleared'] = true; showBanner('Quest updated: Light the Fuse — cleared'); }
              }
            }
          } catch {}
        }
        // Yorna Echo Strike (bonus damage on hit with cooldown)
        const hasYorna = companions.some(c => (c.name || '').toLowerCase().includes('yorna'));
        if (hasYorna) {
          const cfg = companionEffectsByKey.yorna?.onPlayerHit || { bonusPct: 0.5, cooldownSec: 1.2 };
          if ((runtime.companionCDs.yornaEcho || 0) <= 0) {
            // Affinity scaling for Yorna
            let m = 1;
            for (const c of companions) { const nm = (c.name || '').toLowerCase(); if (nm.includes('yorna')) { const aff = (typeof c.affinity==='number')?c.affinity:2; const t = Math.max(0, Math.min(9, aff-1)); m = Math.max(m, 1 + (t/9)*0.5); } }
            const bonusPct = Math.min(0.75, (cfg.bonusPct || 0.5) * m);
            const bonus = Math.max(1, Math.round(dmg * bonusPct));
            e.hp -= bonus;
            const cd = (cfg.cooldownSec || 1.2) / (1 + (m - 1) * 0.5);
            runtime.companionCDs.yornaEcho = cd;
            // small bark + audio sting
            import('../engine/state.js').then(m => m.spawnFloatText(e.x + e.w/2, e.y - 8, `Echo +${bonus}`, { color: '#ffd166', life: 0.7 }));
            try { playSfx('echo'); } catch {}
          }
        }
        // Cowsill Strike Synergy (stronger echo damage on hit with cooldown)
        const hasCowsill = companions.some(c => (c.name || '').toLowerCase().includes('cowsill'));
        if (hasCowsill) {
          const cfg = companionEffectsByKey.cowsill?.onPlayerHit || { bonusPct: 0.75, cooldownSec: 0.8 };
          if ((runtime.companionCDs.cowsillStrike || 0) <= 0) {
            // Affinity scaling for Cowsill
            let m = 1;
            for (const c of companions) { 
              const nm = (c.name || '').toLowerCase(); 
              if (nm.includes('cowsill')) { 
                const aff = (typeof c.affinity==='number')?c.affinity:5; 
                const t = Math.max(0, Math.min(9, aff-1)); 
                m = Math.max(m, 1 + (t/9)*0.5); 
              } 
            }
            const bonusPct = Math.min(1.0, (cfg.bonusPct || 0.75) * m);
            const bonus = Math.max(1, Math.round(dmg * bonusPct));
            e.hp -= bonus;
            const cd = (cfg.cooldownSec || 0.8) / (1 + (m - 1) * 0.5);
            runtime.companionCDs.cowsillStrike = cd;
            // Visual feedback with different color
            import('../engine/state.js').then(m => m.spawnFloatText(e.x + e.w/2, e.y - 8, `Strike +${bonus}`, { color: '#ff6b6b', life: 0.7 }));
            try { playSfx('hit'); } catch {}
            
            // Double Strike trigger chance
            const triggers = companionEffectsByKey.cowsill?.triggers;
            if (triggers?.doubleStrike && (runtime.companionCDs.cowsillDouble || 0) <= 0) {
              const chance = (triggers.doubleStrike.chance || 0.2) * m;
              if (Math.random() < chance) {
                const doubleDmg = Math.max(1, Math.round(dmg * (triggers.doubleStrike.dmgMult || 1.5)));
                e.hp -= doubleDmg;
                runtime.companionCDs.cowsillDouble = triggers.doubleStrike.cooldownSec || 3;
                import('../engine/state.js').then(m => {
                  m.spawnFloatText(e.x + e.w/2, e.y - 16, `DOUBLE! +${doubleDmg}`, { color: '#ffeb3b', life: 1.0 });
                  // Spawn strike effect
                  m.spawnSparkle(e.x + e.w/2, e.y + e.h/2, { color: '#ffeb3b', count: 8, spread: 20 });
                });
              }
            }
          }
        }
        const dx = (e.x + e.w/2) - (player.x + player.w/2);
        const dy = (e.y + e.h/2) - (player.y + player.h/2);
        const mag = Math.hypot(dx, dy) || 1;
        e.knockbackX = (dx / mag) * 80;
        e.knockbackY = (dy / mag) * 80;
        playSfx('hit');

        // Twil L8 — Flare Chain: ignite nearby enemies on melee hit (CD)
        try {
          const cds = runtime.companionCDs || (runtime.companionCDs = {});
          const hasTwilL8 = companions.some(c => (c.name||'').toLowerCase().includes('twil') && (c.affinity||0) >= 8);
          if (hasTwilL8 && (cds.twilFlare || 0) <= 0) {
            let ignited = 0;
            for (const t of enemies) {
              if (!t || t === e || t.hp <= 0) continue;
              const dx2 = (t.x - e.x), dy2 = (t.y - e.y);
              if ((dx2*dx2 + dy2*dy2) <= (64*64)) {
                t._burnTimer = Math.max(t._burnTimer || 0, 1.2);
                t._burnDps = Math.max(t._burnDps || 0, 0.5);
                ignited++;
                if (ignited >= 3) break;
              }
            }
            if (ignited > 0) {
              cds.twilFlare = 12;
              import('../engine/state.js').then(m => m.spawnFloatText(e.x + e.w/2, e.y - 16, 'Flare!', { color: '#ff9a3d', life: 0.8 }));
            }
          }
        } catch {}
      }
    }
  }
  if (player.attackTimer >= player.attackDuration) {
    player.attacking = false;
    player._didHit = false;
    // Clear any leftover dash-combo swing flags on end of swing
    try { runtime._dashComboActive = false; runtime._dashComboAppliedThisSwing = false; } catch {}
  }
}

export function startRangedAttack() {
  const now = performance.now() / 1000;
  // Require a ranged weapon in right hand
  const eq = player?.inventory?.equipped || {};
  const RH = eq.rightHand || null;
  const meta = RH && RH.ranged ? RH.ranged : null;
  if (!meta) { return; }
  const baseCd = (typeof meta.cooldownSec === 'number') ? Math.max(0.1, meta.cooldownSec) : Math.max(0.1, player.rangedAttackCooldown || 0.6);
  // Attack speed buffs reduce cooldown a bit
  const aspd = (runtime?.combatBuffs?.aspd || 0) + (runtime?.tempAspdBonus || 0);
  const effCd = Math.max(0.08, baseCd / Math.max(1e-6, (1 + aspd)));
  if (now - (player.lastRanged || -999) < effCd) return;

  // Ammo requirement
  const ammoId = String(meta.consumes || 'arrow_basic');
  let ammoStack = null, ammoIdx = -1;
  try {
    const inv = player?.inventory?.items || [];
    for (let i = 0; i < inv.length; i++) {
      const it = inv[i];
      if (it && it.stackable && it.id === ammoId && (it.qty || 0) > 0) { ammoStack = it; ammoIdx = i; break; }
    }
  } catch {}
  if (!ammoStack) {
    // Rate-limit the warning banner
    const t = runtime._timeSec || 0;
    if ((runtime._ammoWarnUntil || 0) <= t) {
      try { import('../engine/ui.js').then(u => u.showBanner && u.showBanner('Out of arrows!')); } catch {}
      runtime._ammoWarnUntil = t + 1.2;
      try { playSfx('block'); } catch {}
    }
    return;
  }

  // Fire: compute direction from player.dir
  const px = player.x + player.w/2;
  const py = player.y + player.h/2;
  const speed = (typeof meta.projectileSpeed === 'number') ? Math.max(60, meta.projectileSpeed) : 180;
  let dx = 0, dy = 0;
  if (player.dir === 'left') dx = -1; else if (player.dir === 'right') dx = 1; else if (player.dir === 'up') dy = -1; else dy = 1;
  const vx = dx * speed;
  const vy = dy * speed;
  // Damage base from player damage + gear/buffs
  const mods = getEquipStats(player);
  const add = (runtime?.combatBuffs?.atk || 0) + (mods.atk || 0) + (runtime?.tempAtkBonus || 0);
  const base = Math.max(1, (player.damage || 1) + add);
  const pierce = Math.max(0, Number(meta.pierce || 0) + Math.max(0, runtime._tempPierceBonus || 0));
  spawnProjectile(px, py, {
    team: 'player',
    vx, vy,
    damage: base,
    pierce,
    life: 1.8,
    knockback: 80,
    sourceId: 'player',
    color: '#9ae6ff',
  });
  // Consume ammo (1)
  try {
    ammoStack.qty = Math.max(0, (ammoStack.qty || 0) - 1);
    if (ammoStack.qty <= 0 && ammoIdx !== -1) {
      const inv = player?.inventory?.items || [];
      if (inv[ammoIdx] === ammoStack) inv.splice(ammoIdx, 1);
    }
  } catch {}
  player.lastRanged = now;
  try { playSfx('attack'); } catch {}
}

function tryUnlockGate(hb) {
  for (const o of obstacles) {
    if (!o || o.type !== 'gate') continue;
    if (o.locked === false) continue;
    const r = { x: o.x, y: o.y, w: o.w, h: o.h };
    if (!rectsIntersect(hb, r)) continue;
    // Check key in player inventory
    const keyId = o.keyId || o.id || 'gate';
    const items = player?.inventory?.items || [];
    const itm = items.find(it => it && (it.keyId === keyId));
    if (itm) {
      // Compute quest match and consumption before showing banner, so we can append a quest update suffix.
      let matched = false;
      let shouldConsume = false;
      let clearSuffix = '';
      try {
        const meta = runtime?.questMeta || {};
        const flags = runtime?.questFlags || {};
        const clearedNow = [];
        for (const [qid, m] of Object.entries(meta)) {
          if (!m) continue;
          const matchesKey = !m.keyId || m.keyId === (o.keyId || o.id || 'gate') || m.keyId === itm.keyId;
          const matchesGate = !m.gateId || m.gateId === (o.id || '');
          if (!matchesKey || !matchesGate) continue;
          if (flags[`${qid}_started`] && !flags[`${qid}_cleared`]) {
            runtime.questFlags[`${qid}_cleared`] = true;
            clearedNow.push(qid);
            matched = true;
            if (m.consumeOnUse) shouldConsume = true;
            if (m.clearBanner) clearSuffix = String(m.clearBanner);
          }
        }
        if (clearedNow.length) {
          import('../engine/quests.js').then(q => { try { clearedNow.forEach(id => q.autoTurnInIfCleared && q.autoTurnInIfCleared(id)); } catch {} }).catch(()=>{});
        }
      } catch {}
      // Unlock gate and announce with optional quest update suffix
      o.locked = false; o.blocksAttacks = false;
      const gateName = o.name || 'Gate';
      const baseMsg = `Used ${itm.name || 'Key'} to open ${gateName}`;
      const msg = matched ? (clearSuffix ? `${baseMsg} — ${clearSuffix}` : `${baseMsg} — Quest updated`) : baseMsg;
      showBanner(msg);
      try { markFlowDirty(); } catch {}
      // Consume the item if configured
      if (shouldConsume) {
        try {
          const items = player?.inventory?.items || [];
          const idx = items.indexOf(itm);
          if (idx !== -1) {
            if (items[idx].stackable && typeof items[idx].qty === 'number' && items[idx].qty > 1) {
              items[idx].qty -= 1;
            } else {
              items.splice(idx, 1);
            }
          }
        } catch {}
      }
      try { playSfx('unlock'); } catch {}
      // Level 1 pacing: award objective XP on opening the castle gate to hit ~80% toward Lv 2 pre-boss
      try {
        if ((runtime.currentLevel || 1) === 1 && (o.id === 'castle_gate' || o.keyId === 'castle_gate')) {
          grantPartyXp(23);
        }
      } catch {}
    } else {
      showBanner('Locked — you need a key');
      try { playSfx('block'); } catch {}
    }
  }
}

export function tryInteract() {
  // Block interactions briefly after taking damage so Space attacks instead
  if (runtime.interactLock > 0) return false;
  const range = 12;
  const hb = { x: player.x, y: player.y, w: player.w, h: player.h };
  if (player.dir === 'left')  { hb.x -= range; hb.w += range; }
  if (player.dir === 'right') { hb.w += range; }
  if (player.dir === 'up')    { hb.y -= range; hb.h += range; }
  if (player.dir === 'down')  { hb.h += range; }
  for (const n of npcs) {
    const nr = { x: n.x, y: n.y, w: n.w, h: n.h };
    if (rectsIntersect(hb, nr)) {
      if (n.dialog) { startDialog(n); }
      else {
        startPrompt(n, `Hello, I'm ${n.name || 'an NPC'}. May I join you?`, [
          { label: 'Yes, join me.', action: 'join_party' },
          { label: 'Not right now.', action: 'end' },
        ]);
      }
      return true;
    }
  }
  // Interact with chests
  for (const o of obstacles) {
    if (!o || o.type !== 'chest') continue;
    const or = { x: o.x, y: o.y, w: o.w, h: o.h };
    if (rectsIntersect(hb, or)) {
      // If locked, require key (keyId or id)
      if (o.locked) {
        const keyId = o.keyId || o.id;
        const items = player?.inventory?.items || [];
        const itm = items.find(it => it && (it.keyId === keyId));
        if (!itm) { showBanner('Locked — you need a key'); return true; }
        o.locked = false;
      }
      if (!o.opened) {
        // Spawn chest loot (fixed item preferred; otherwise roll from tier/table)
        let item = null;
        try { if (o.fixedItemId) item = itemById(o.fixedItemId); } catch {}
        if (!item) {
          const tier = o.lootTier || 'common';
          const lvl = runtime.currentLevel || 1;
          const tableSrc = (lvl === 2) ? CHEST_LOOT_L2 : (lvl >= 3 ? CHEST_LOOT_L3 : CHEST_LOOT);
          item = rollFromTable(tableSrc[tier] || []);
        }
        if (item) {
          import('../engine/state.js').then(s => s.spawnPickup(o.x + o.w/2 - 5, o.y + o.h/2 - 5, item));
          o.opened = true;
          try { if (o.id) runtime.openedChests[o.id] = true; } catch {}
          showBanner('Chest opened');
          // Remove chest immediately after opening
          const idx = obstacles.indexOf(o);
          if (idx !== -1) obstacles.splice(idx, 1);
          // Tutorial: mark sword chest objective done
          try {
            if (!runtime.questFlags) runtime.questFlags = {};
            if (o.id === 'chest_l1_weapon') {
              runtime.questFlags['tutorial_find_sword_done'] = true;
              // Clear prior tutorial banner (torch hint)
              hideBanner();
              // Start healer tutorial: prompt to save Canopy
              const alreadyHasCanopy = companions.some(c => (c.name || '').toLowerCase().includes('canopy'));
              if (!alreadyHasCanopy) {
                runtime.questFlags['tutorial_save_canopy'] = true;
                // Delay slightly so 'Chest opened' / 'Picked up' banners don't overwrite it
                setTimeout(() => {
                  try {
                    if (runtime.questFlags['tutorial_save_canopy'] && !runtime.questFlags['tutorial_save_canopy_done']) {
                      showPersistentBanner('You need a healer! Save Canopy from the bandits!');
                    }
                  } catch {}
                }, 600);
              } else {
                // If already recruited, immediately mark as done
                runtime.questFlags['tutorial_save_canopy_done'] = true;
              }
            }
          } catch {}
        } else {
          // No loot: remove the chest from the world immediately
          const idx = obstacles.indexOf(o);
          if (idx !== -1) obstacles.splice(idx, 1);
          try { if (o.id) runtime.openedChests[o.id] = true; } catch {}
          showBanner('Empty chest');
        }
      } else {
        // Already opened (should have been removed), ensure removal
        const idx = obstacles.indexOf(o);
        if (idx !== -1) obstacles.splice(idx, 1);
        showBanner('Empty chest');
      }
      return true;
    }
  }
  return false;
}
