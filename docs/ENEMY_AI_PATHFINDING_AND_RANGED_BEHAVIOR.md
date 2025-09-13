# Enemy AI: Pathfinding + Ranged-Aware Behaviors

Status: design approved for bosses/featured; mooks unchanged. This document consolidates movement/pathfinding upgrades with ranged-aware counterplay and defines how they interact without conflict.

## Goals
- Enemies navigate around walls/obstacles reliably without expensive per-enemy A*.
- Bosses/featured feel smarter under ranged fire: break LOS, strafe, resist stunlock, occasionally close distance.
- Preserve fairness and readability: short commitments, visible telegraphing, modest randomness.

## Scope and Roles
- Applies to: Bosses and Featured foes (including key guardians).
- Excluded: Mooks (retain current simple chase/wander + local hazard steering).
- Ranged enemies: additionally maintain standoff range and strafe.

## Ranged Awareness (when active)
Active if either:
- Player has a ranged weapon equipped with ammo, or
- Player fired within the last 0.8s.

Deactivates after ~1.2s without shots or if the player is within melee range (< 40px).

## Behavior Matrix
- Bosses: zig-zag advance, use cover (LOS breaking), brace on hit, juke on shot, gap-closer dash (telegraphed).
- Featured/Guardians: same behaviors with slightly longer cooldowns/shorter durations/lower multipliers.
- Mooks: none of the above; keep existing behavior.

## Behavior Specs (no code)

### 1) Zig-Zag Advance (commit to lateral strafe)
- While ranged-aware and 60–220px away, blend a perpendicular component into the approach.
- Commit to a chosen strafe side for a short window, then re-evaluate. Use existing `avoidSign` as default side; store `_strafeSign` if needed.
- Purpose: reduce straight-line knockback loops and make arrows miss more often.

Defaults:
- Boss: tangential weight ~0.55; commit 0.8s.
- Featured: tangential weight ~0.40; commit 0.6s.

### 2) Use Cover (LOS breaking everywhere)
- If LOS to the player is clear and distance > 80px, score nearby blocking obstacles (within ~160px). Choose a corner that both reduces LOS exposure and reduces distance to player.
- Commit to moving toward the cover target for 0.8–1.0s. If LOS becomes blocked en route, continue until commit ends; then peek around the corner briefly (0.3–0.35s), then re-evaluate.
- Integrate into the direction sampler by adding a penalty for candidate directions that maintain strong LOS to the player beyond 80px.

### 3) Brace on Hit (anti-stunlock window; strong)
- When hit by a player projectile, start a short “brace” window that reduces knockback taken and adds temporary projectile DR. Refreshable by new hits; no stacking beyond caps.
- Also reduce speed modestly during brace to signal state (readability) without removing threat.

Defaults:
- Boss: 0.9s, knockback ×0.30, +2 projectile DR, speed ×0.85.
- Featured: 0.75s, knockback ×0.40, +1.5 projectile DR, speed ×0.9.

### 4) Juke on Shot (sidestep incoming projectile)
- When a new player projectile is on a near-collision course within ~120px (simple dot/time test), roll a chance to sidestep perpendicular for a brief burst. Cooldown prevents spam.

Defaults:
- Boss: 22% chance, 1.0s cooldown, 0.28s duration at ×1.35 speed.
- Featured: 12% chance, 1.4s cooldown, 0.22s duration at ×1.25 speed.

### 5) Gap-Closer Dash (break kiting; telegraphed)
- Conditions: distance 90–180px, LOS clear, not bracing/juking, on cooldown. Telegraph with a brief pre-dash pause/slow so it’s readable, then dash with heavy knockback resistance.

Defaults:
- Boss: 6.5s ±1.5s cooldown; 0.18s pre-telegraph; 0.45s at ×2.8 speed; knockback ×0.20 during dash.
- Featured: 11s ±2.0s cooldown; 0.16s pre-telegraph; 0.35s at ×2.2 speed; knockback ×0.35 during dash.

### 6) Ranged Enemies: Standoff + Strafe
- Maintain an ideal range band (e.g., 90–140px). When inside band with LOS, strafe tangentially; advance if LOS is blocked; retreat slightly if too close. Shares the same zig-zag/cover/juke rules as above where relevant.

## Pathfinding Plan (global, simple, fast)

### Flow Field (BFS/Dijkstra) Grid
- Build a walkable/blocked grid at tile resolution (use `world.tileW × world.tileH`).
- Run one BFS (or Dijkstra if hazard weighting is enabled) from the player’s tile to compute a distance field. Update at 4–6 Hz (every 150–250ms) or when “dirty”.
- Dirty triggers: player moved ≥ 1 tile; obstacles added/removed or gates lock/unlock; level/theme changes; after load.
- Walkable definition respects enemy footprint (12×16px): ensure the entire rect fits in walkable cells (inflate walls or validate 2×2 tile footprint as needed).
- Hazard weighting (optional): mud cost ×2, fire ×4, lava ×8 to bias routes around pain without forbidding them.

### Using the Flow Field
- For each enemy, look at its current tile and pick the neighbor with the lowest distance (8-way preferred) to form a coarse `pathDir` vector.
- Do not include dynamic actors (player/enemies/NPCs) in the grid; handle those via collision and local steering already present.
- If unreachable (INF): fall back to current wander/seek logic.

### Optional Targeted A*
- Only for bosses/featured when an enemy has been stuck > 1s, compute a short path to the player’s current or last-seen tile; keep 2–4 waypoints; recompute at most every 0.5–1.0s; global cap on runs per frame to avoid spikes.

## Integration & Priority (avoid conflicts)

Movement vector synthesis per enemy each frame (highest priority first):
1) Dash: if `_dashTimer > 0`, movement is dash vector; ignore other influences except collision.
2) Juke: if `_jukeTimer > 0`, movement is perpendicular juke vector.
3) Cover Commit: if `_coverTarget` active and `_tacticTimer > 0`, bias toward cover corner (overrides pathDir/targetDir); peek briefly when LOS regained, then clear.
4) Base Heading: prefer `pathDir` from flow field when available; otherwise direct-to-player (`targetDir`).
5) Zig-Zag: when ranged-aware and in band, blend tangential component with weight (boss 0.55, featured 0.40) and commit window.
6) Local Steering: run existing sampler (hazard cost + obstacle feelers + LOS exposure penalty) to choose best nearby direction; apply brace speed/knockback modifiers.
7) Collision/Separation: keep current axis/perpendicular fallbacks and entity separation; flip `avoidSign` on prolonged stuck.

Notes:
- Brace modifies knockback intake and speed/DR only; it does not force a heading and therefore does not fight pathDir/steering.
- Cover and Zig-Zag operate on top of pathDir (coarse guidance) and are time-committed to reduce oscillation.
- Juke/Dash temporarily suspend path-following to prevent jitter.

## State per Enemy (runtime fields)
- `_braceTimer`: seconds remaining of brace (knockback reduction, temp projectile DR, speed mult).
- `_jukeCd`, `_jukeTimer`: cooldown and active timer for juke sidestep.
- `_dashCd`, `_dashTelegraph`, `_dashTimer`: gap-closer cadence, telegraph, and active duration timers.
- `_tacticTimer`: commitment window for current tactic (strafe side, cover target).
- `_strafeSign`: chosen strafe side (defaults to `avoidSign` when unset).
- `_coverTarget`: pixel coordinates of chosen cover corner (null when inactive).
- `_lastSeenPlayerTile`: last tile with clear LOS to player (for brief persistence when LOS breaks).

## Implementation Phases
1) Phase 1 (low risk, big win): Zig-Zag Advance + Brace on Hit (boss/featured only).
2) Phase 2: Juke on Shot + LOS-based Cover scoring/commit (add LOS exposure penalty to sampler).
3) Phase 3: Gap-Closer Dash with pre-dash telegraph (boss and featured; numbers above).
4) Phase 4: Flow Field pathfinding grid (BFS/Dijkstra), updated 4–6 Hz; integrate as base heading.
5) Phase 5 (optional): Targeted A* for bosses/featured when stuck >1s, capped.

## Tuning Defaults (initial)
- See per-behavior defaults above. All values are centralizable for easy runtime tweaking (e.g., a `AI_TUNING` map keyed by class).

## Performance & Debugging
- Grid size: 100×60 = 6k tiles; BFS/Dijkstra 4–6 Hz is cheap. Keep a dirty flag to avoid unnecessary rebuilds.
- Keep cover search local (<=160px) and use simple corner candidates.
- Add `window.DEBUG_ENEMIES` overlays for: flow field arrows, current tactic, cover target, dash telegraph window.

## Fairness Considerations
- Telegraph dash (0.16–0.18s pre-pause), cap juke chance, and keep brace brief. If the player stops firing, effects decay quickly.
- Ranged enemies should prefer standoff/strafe over blind rush, but still commit if LOS is blocked.

## Open Questions
- Exact hazard weights in Dijkstra (mud/fire/lava) and whether to keep them global or per-level.
- Ideal standoff band for specific ranged enemies.
- Whether to visually indicate brace state (e.g., brief tint) for clarity (optional).

This plan intentionally layers a global, cheap pathfinding signal (flow field) beneath local steering and tactical behaviors (cover, zig-zag, juke, dash). Priority rules ensure tactics temporarily override the path signal without fighting it, avoiding oscillation and keeping behaviors legible.

