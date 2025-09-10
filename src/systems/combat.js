import { player, enemies, npcs, companions, runtime, obstacles, itemsOnGround, grantPartyXp } from '../engine/state.js';
import { rectsIntersect, getEquipStats, segmentIntersectsRect } from '../engine/utils.js';
import { showBanner } from '../engine/ui.js';
import { companionEffectsByKey } from '../data/companion_effects.js';
import { playSfx } from '../engine/audio.js';
import { enterChat } from '../engine/ui.js';
import { startDialog, startPrompt } from '../engine/dialog.js';
import { BREAKABLE_LOOT, CHEST_LOOT, CHEST_LOOT_L2, rollFromTable, itemById } from '../data/loot.js';

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
}

export function willAttackHitEnemy() {
  // Predict the immediate attack hitbox and check for any enemy within it
  const range = 12 + (runtime?.combatBuffs?.range || 0);
  const hb = { x: player.x, y: player.y, w: player.w, h: player.h };
  if (player.dir === 'left')  { hb.x -= range; hb.w += range; }
  if (player.dir === 'right') { hb.w += range; }
  if (player.dir === 'up')    { hb.y -= range; hb.h += range; }
  if (player.dir === 'down')  { hb.h += range; }
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    if (rectsIntersect(hb, e)) {
      const px = player.x + player.w/2, py = player.y + player.h/2;
      const ex = e.x + e.w/2, ey = e.y + e.h/2;
      let blocked = false;
      for (const o of obstacles) {
        if (o && o.blocksAttacks) {
          if (o.type === 'gate' && o.locked === false) continue;
          if (segmentIntersectsRect(px, py, ex, ey, o)) { blocked = true; break; }
        }
      }
      if (!blocked) return true;
    }
  }
  return false;
}

export function handleAttacks(dt) {
  if (!player.attacking) return;
  player.attackTimer += dt;
  if (!player._didHit && player.attackTimer >= player.attackDuration * 0.5) {
    player._didHit = true;
    const range = 12 + (runtime?.combatBuffs?.range || 0);
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
      }
    }
    const hasOyin = companions.some(c => (c.name || '').toLowerCase().includes('oyin'));
    const hasTwil = companions.some(c => (c.name || '').toLowerCase().includes('twil'));
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      if (rectsIntersect(hb, e)) {
        const px = player.x + player.w/2, py = player.y + player.h/2;
        const ex = e.x + e.w/2, ey = e.y + e.h/2;
        let blocked = false;
        for (const o of obstacles) {
          if (o && o.blocksAttacks) {
            if (o.type === 'gate' && o.locked === false) continue;
            if (segmentIntersectsRect(px, py, ex, ey, o)) { blocked = true; break; }
          }
        }
        if (blocked) continue;
        const mods = getEquipStats(player);
        const add = (runtime?.combatBuffs?.atk || 0) + (mods.atk || 0) + (runtime?.tempAtkBonus || 0);
        const dmg = Math.max(1, (player.damage || 1) + add);
        let finalDmg = dmg;
        // Twil: mark weakness (+1 dmg) when close
        if (hasTwil) {
          const dxm = ex - px, dym = ey - py;
          if ((dxm*dxm + dym*dym) <= (48*48)) finalDmg += 1;
        }
        e.hp -= dmg;
        if (finalDmg !== dmg) e.hp -= (finalDmg - dmg);
        // Oyin: Kindle DoT
        if (hasOyin) {
          e._burnTimer = Math.max(e._burnTimer || 0, 1.5);
          e._burnDps = Math.max(e._burnDps || 0, 0.4);
          // Quest tracking: Oyin fuse — count unique kindled enemies after start
          try {
            if (runtime.questFlags && runtime.questFlags['oyin_fuse_started'] && !runtime.questFlags['oyin_fuse_cleared']) {
              if (!e._questKindled) {
                e._questKindled = true;
                if (!runtime.questCounters) runtime.questCounters = {};
                const n = (runtime.questCounters['oyin_fuse_kindled'] || 0) + 1;
                runtime.questCounters['oyin_fuse_kindled'] = n;
                if (n >= 3 && runtime.questFlags['oyin_fuse_rally']) { runtime.questFlags['oyin_fuse_cleared'] = true; showBanner('Quest updated: Light the Fuse — cleared'); }
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
        const dx = (e.x + e.w/2) - (player.x + player.w/2);
        const dy = (e.y + e.h/2) - (player.y + player.h/2);
        const mag = Math.hypot(dx, dy) || 1;
        e.knockbackX = (dx / mag) * 80;
        e.knockbackY = (dy / mag) * 80;
        playSfx('hit');
      }
    }
  }
  if (player.attackTimer >= player.attackDuration) {
    player.attacking = false;
    player._didHit = false;
  }
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
      o.locked = false; o.blocksAttacks = false;
      const gateName = o.name || 'Gate';
      showBanner(`Used ${itm.name || 'Key'} to open ${gateName}`);
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
          const tableSrc = (runtime.currentLevel === 2) ? CHEST_LOOT_L2 : CHEST_LOOT;
          item = rollFromTable(tableSrc[tier] || []);
        }
        if (item) {
          import('../engine/state.js').then(s => s.spawnPickup(o.x + o.w/2 - 5, o.y + o.h/2 - 5, item));
          o.opened = true;
          showBanner('Chest opened');
          // Remove chest immediately after opening
          const idx = obstacles.indexOf(o);
          if (idx !== -1) obstacles.splice(idx, 1);
        } else {
          // No loot: remove the chest from the world immediately
          const idx = obstacles.indexOf(o);
          if (idx !== -1) obstacles.splice(idx, 1);
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
