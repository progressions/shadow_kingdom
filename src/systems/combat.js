import { player, enemies, npcs, companions, runtime } from '../engine/state.js';
import { rectsIntersect, getEquipStats } from '../engine/utils.js';
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
  const range = 12;
  const hb = { x: player.x, y: player.y, w: player.w, h: player.h };
  if (player.dir === 'left')  { hb.x -= range; hb.w += range; }
  if (player.dir === 'right') { hb.w += range; }
  if (player.dir === 'up')    { hb.y -= range; hb.h += range; }
  if (player.dir === 'down')  { hb.h += range; }
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    if (rectsIntersect(hb, e)) return true;
  }
  return false;
}

export function handleAttacks(dt) {
  if (!player.attacking) return;
  player.attackTimer += dt;
  if (!player._didHit && player.attackTimer >= player.attackDuration * 0.5) {
    player._didHit = true;
    const range = 12;
    const hb = { x: player.x, y: player.y, w: player.w, h: player.h };
    if (player.dir === 'left')  { hb.x -= range; hb.w += range; }
    if (player.dir === 'right') { hb.w += range; }
    if (player.dir === 'up')    { hb.y -= range; hb.h += range; }
    if (player.dir === 'down')  { hb.h += range; }
    for (const e of enemies) {
      if (e.hp <= 0) continue;
      if (rectsIntersect(hb, e)) {
        const mods = getEquipStats(player);
        const dmg = Math.max(1, (player.damage || 1) + (mods.atk || 0));
        e.hp -= dmg;
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
  return false;
}
