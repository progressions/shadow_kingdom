import { player, enemies, npcs, companions, runtime, obstacles, itemsOnGround } from '../engine/state.js';
import { rectsIntersect, getEquipStats, segmentIntersectsRect } from '../engine/utils.js';
import { showBanner } from '../engine/ui.js';
import { companionEffectsByKey } from '../data/companion_effects.js';
import { playSfx } from '../engine/audio.js';
import { enterChat } from '../engine/ui.js';
import { startDialog, startPrompt } from '../engine/dialog.js';

export function startAttack() {
  const now = performance.now() / 1000;
  if (player.attacking) return;
  if (now - player.lastAttack < player.attackCooldown) return;
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
        const add = (runtime?.combatBuffs?.atk || 0) + (mods.atk || 0);
        const dmg = Math.max(1, (player.damage || 1) + add);
        e.hp -= dmg;
        // Yorna Echo Strike (bonus damage on hit with cooldown)
        const hasYorna = companions.some(c => (c.name || '').toLowerCase().includes('yorna'));
        if (hasYorna) {
          const cfg = companionEffectsByKey.yorna?.onPlayerHit || { bonusPct: 0.5, cooldownSec: 1.2 };
          if ((runtime.companionCDs.yornaEcho || 0) <= 0) {
            const bonus = Math.max(1, Math.round(dmg * (cfg.bonusPct || 0.5)));
            e.hp -= bonus;
            runtime.companionCDs.yornaEcho = cfg.cooldownSec || 1.2;
            // small bark
            import('../engine/state.js').then(m => m.spawnFloatText(e.x + e.w/2, e.y - 8, `Echo +${bonus}`, { color: '#ffd166', life: 0.7 }));
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
        // Spawn chest loot (simple: 1 item)
        const tier = o.lootTier || 'common';
        import('../data/loot.js').then(mod => {
          const item = mod.rollFromTable(mod.CHEST_LOOT[tier] || []);
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
        });
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
