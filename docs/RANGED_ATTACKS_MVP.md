# Ranged Attacks — MVP

This document outlines a minimal, production-ready implementation of ranged attacks for Shadow Kingdom G.

Scope for MVP:
- Add a lightweight projectile system (state, step update, collisions, rendering).
- Player can fire a ranged shot if a ranged weapon is equipped in `rightHand`.
- Certain enemies can shoot the player at range.
- Respect existing LOS and obstacle rules (`blocksAttacks`, unlocked gates allow shots).
- Use existing DR/crit/AP/true-damage rules for damage resolution.
- No companion ranged behavior in MVP.

Out of scope (future):
- Ammo, spreads/bursts, homing, status-on-hit variants, mouse-aiming, friendly fire toggles, projectile spritesheets.

## Data Model

Add to `src/engine/state.js`:
- `export const projectiles = []` transient list; not serialized.
- `export function spawnProjectile(x, y, opts)` with fields:
  - position/size: `x, y, w=4, h=4`
  - velocity: `vx, vy` (pixels/sec)
  - lifetime: `life` (seconds)
  - team: `team` in `['player','enemy','ally']`
  - damage: `damage` (number)
  - optional tuning: `critChance?, critDrIgnore?, critBonus?, ap?, trueDamage?, pierce?, knockback?`
  - visuals: `color?`, `spriteId?`
  - bookkeeping: `sourceId?`

## Step Loop

In `src/systems/step.js`:
- Tick each projectile: move using `dt`.
- Use swept collision (segment from previous→next center) against:
  - Obstacles with `blocksAttacks` (ignore unlocked gates).
  - Breakables (`barrel`, `crate`): apply 1 HP damage and remove if destroyed (reuse melee breakable logic semantics).
  - Targets (team-based):
    - `team==='player'` shots hit `enemies`.
    - `team==='enemy'` shots hit `player`.
- On hit: apply damage using the existing rules:
  - Player→Enemy: reuse player crit rules from melee (base 8% chance, 1.5×, 50% DR penetration), apply enemy DR (with crit penetration), show floaters/SFX.
  - Enemy→Player: reuse contact damage pipeline (crit/AP/true damage, chip for mook/featured) and show floaters/SFX `hit/pierce/block`.
- Remove projectile on impact unless `pierce > 0` (decrement and continue). Remove on lifetime expiry or leaving world bounds.
- Cap active projectiles for safety (e.g., 128).

## Rendering

In `src/engine/render.js`:
- Draw simple projectiles (small filled circles/rects) after terrain/obstacles, before floaters.
- Color by team (`player`: cyan, `enemy`: orange/red).

## Player Ranged

Input (`src/engine/input.js`):
- Bind `K` to fire if a ranged weapon is equipped in `rightHand`.
- Keep `Space`/`J` as melee.

Mechanics:
- Add `player.rangedAttackCooldown` and `player.lastRanged` to `state`.
- When firing: compute direction from `player.dir` (cardinals), spawn a projectile at player center with speed/damage from weapon metadata and buffs (`getEquipStats(player).atk`, `runtime.combatBuffs`, temp bonuses). Apply player crit on hit.

## Enemy Ranged

Enemy template fields (in `spawnEnemy` opts):
- `ranged: true`, `shootRange`, `shootCooldown`, `projectileSpeed`, `projectileDamage`, `aimError?`.

Behavior (in `step.js` enemy AI):
- If `ranged` and LOS to player and within `shootRange`, count down `e._shootCd`. When <= 0, spawn a projectile toward player center, reset cooldown, minor aim error optional.
- Maintain existing movement; optionally avoid getting too close by keeping distance (minimal for MVP).

## Items and Loot

Items (`src/data/items.js`):
- Add a simple bow in `rightHand` with `ranged` metadata (cooldown and projectile speed) and `atk` for damage scaling.

Loot (`src/data/loot.js`):
- Add the bow to early chest tables so the player can acquire it.

## Testing Checklist

- Shots are blocked by walls/locked gates; pass through unlocked gates.
- Barrels/crates take damage from shots; chests unaffected.
- Player crit/DR rules and enemy crit/AP/trueDamage rules apply to projectiles consistently with melee/contact.
- Cooldowns enforced; global projectile cap respected.
- A few enemies shoot at range; bow appears in low-tier loot.

