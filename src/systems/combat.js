import { player, enemies, npcs, runtime } from '../engine/state.js';
import { rectsIntersect } from '../engine/utils.js';
import { appendLogLine, enterChat } from '../engine/ui.js';

export function startAttack() {
  const now = performance.now() / 1000;
  if (player.attacking) return;
  if (now - player.lastAttack < player.attackCooldown) return;
  player.attacking = true;
  player.attackTimer = 0;
  player.lastAttack = now;
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
        e.hp -= player.damage;
        const dx = (e.x + e.w/2) - (player.x + player.w/2);
        const dy = (e.y + e.h/2) - (player.y + player.h/2);
        const mag = Math.hypot(dx, dy) || 1;
        e.knockbackX = (dx / mag) * 80;
        e.knockbackY = (dy / mag) * 80;
      }
    }
  }
  if (player.attackTimer >= player.attackDuration) {
    player.attacking = false;
    player._didHit = false;
  }
}

export function tryInteract() {
  const range = 12;
  const hb = { x: player.x, y: player.y, w: player.w, h: player.h };
  if (player.dir === 'left')  { hb.x -= range; hb.w += range; }
  if (player.dir === 'right') { hb.w += range; }
  if (player.dir === 'up')    { hb.y -= range; hb.h += range; }
  if (player.dir === 'down')  { hb.h += range; }
  for (const n of npcs) {
    const nr = { x: n.x, y: n.y, w: n.w, h: n.h };
    if (rectsIntersect(hb, nr)) {
      appendLogLine('NPC says: Hello');
      runtime.activeNpc = n;
      enterChat(runtime);
      return true;
    }
  }
  return false;
}

