#+ CODEX Enemy Upgrade Proposal: Pathfinding & Movement

Status: proposal ready for implementation in phases. Scope focuses on enemy navigation and targeting robustness without heavy refactors.

## Motivation
Current enemies primarily chase directly with some local steering (hazard avoidance, axis/perpendicular fallback, stuck sign flip). This works in open spaces but struggles at corners, gates, and mazes; it also causes jamming and oscillation when LOS is blocked. We want reliable wall-aware routing that scales to many enemies and plays nicely with new ranged-aware tactics.

## Goals
- Navigate around blocking obstacles and through chokepoints predictably.
- Avoid dithering at corners; reduce clumping and jam pressure.
- Keep CPU cost low (world is ~100×60 tiles) and behavior legible.
- Layer cleanly with tactical behaviors (cover, zig-zag, juke, dash) without conflicts.

## Overview of Improvements
1) Local steering upgrades (no global map):
   - LOS-aware wall-follow with commitment
   - Obstacle feelers in direction sampling
   - Corner bias and gate preference
   - Density-aware spacing
2) Global guidance via flow-field BFS/Dijkstra (shared for all enemies)
3) Selective on-demand A* (bosses/featured or when stuck)
4) Targeting memory and search patterns (last-seen, short search)
5) Integration order and performance budget

---

## 1) Local Steering Enhancements

### 1.1 LOS-aware wall-follow (commit to a side)
- When the direct segment to the player intersects a blocking obstacle, choose a side to “hug” (left/right) and commit for 0.6–1.0s rather than re-choosing every frame.
- Use existing `avoidSign` as default; flip only after a prolonged stuck window (>0.6s with minimal progress).
- Outcome: smooth cornering instead of oscillation; fewer pile-ups on convex edges.

### 1.2 Obstacle “feelers” in direction sampling
- Extend the current hazard-based direction sampler with 2–3 short raycasts ahead of the candidate vector (e.g., 1/3, 2/3, 1.0 of a 24–32px probe).
- Add a high cost if any feeler intersects a blocking obstacle rect. This deprioritizes headings that will immediately collide.

### 1.3 Corner bias around blockers
- If LOS is blocked, identify the nearest blocking rect along the player ray and compute two corner targets (min/max corners that plausibly route around it).
- Bias sampled headings toward the corner that reduces distance to the player while respecting feeler costs. Commit briefly (0.6–1.0s) to avoid indecision.

### 1.4 Gate/door preference
- If a passable “gate” (unlocked) is within ~160px and roughly between the enemy and player, bias toward its center.
- Treat locked gates as walls.

### 1.5 Density-aware spacing
- Add a small dynamic penalty proportional to nearby alive enemies within ~20–40px to reduce clumping at chokepoints.
- Keep collision/axis/perpendicular fallbacks as safety nets; this just lowers jam pressure.

---

## 2) Global Guidance: Flow-Field BFS/Dijkstra

### 2.1 Grid representation
- Build a tile grid sized `world.tileW × world.tileH` marking walkable vs. blocked.
- Clearance: enemies are 12×16px; ensure footprint fits by either inflating walls by 1px/using a 2×2 tile clearance test, or checking the full rect per tile move.
- Optional: hazard weights (mud ×2, fire ×4, lava ×8) to discourage painful paths (Dijkstra), but keep them walkable.

### 2.2 Building the flow field
- Run a BFS from the player’s tile (or Dijkstra for weighted hazards) to compute a distance field.
- Update cadence: 4–6 Hz (every ~150–250ms), or on “dirty” events: player moved ≥ 1 tile; obstacles changed; gates lock/unlock; level/theme rebuild; post-load.
- Memory: 6k tiles → distance array `Uint16Array` (or `Float32Array` for weighted) is trivial.

### 2.3 Using the field per enemy
- Find the enemy’s tile; pick the neighbor (8-way) with the lowest distance and derive a coarse `pathDir` vector.
- Blend with local steering (hazards, feelers, density). PathDir gives global intent; steering keeps agents smooth and avoids dynamic collisions.
- If unreachable (no path / INF distance): fall back to local wander/seek.

### 2.4 Notes
- Do not include dynamic actors (enemies/player/NPCs) in the grid; handle them via existing collision/resolution.
- Keep a dirty flag; avoid rebuilding when nothing relevant changed.

---

## 3) Selective On-Demand A*

### 3.1 When to use
- Only for bosses/featured, or when any enemy has been effectively stuck (>1.0s with minimal displacement) while a path should exist.
- Also useful for long detours (very large obstacles) where corner bias is insufficient.

### 3.2 How to use
- Compute a short path to the player or last-seen tile; keep only 2–4 upcoming waypoints.
- Recompute at most every 0.5–1.0s for that enemy; global cap (e.g., 2–3 A* runs per frame) to avoid spikes.
- Path smoothing: attempt to skip intermediate waypoints when LOS between current position and later waypoint is clear.

---

## 4) Targeting Memory & Search

### 4.1 Last-seen position
- Maintain `_lastSeenPlayerTile` while LOS is clear; if LOS breaks, pursue that tile for a short window before reverting to general pursuit/wander.

### 4.2 Search pattern
- If target not found at last-seen, do a brief local search (e.g., small circle/spiral up to ~1.2s) before fully dropping aggro.

### 4.3 Ranged vs. melee adjustments
- Ranged enemies: maintain a standoff band (e.g., 90–140px); strafe tangentially within band; close distance when LOS is blocked.
- Melee: favor shortest path; still benefit from wall-follow/corner bias.

---

## 5) Integration Order (with tactical behaviors)

To avoid conflicts with the ranged-aware tactics (cover, zig-zag, juke, dash):

Priority per frame (highest first):
1) Dash active → dash vector; suspend other headings (collision still applies).
2) Juke active → juke vector; suspend path following until juke ends.
3) Cover commit → bias toward cover corner; peek briefly after LOS regained, then release.
4) Base heading → prefer flow-field `pathDir`; else direct-to-player `targetDir`.
5) Zig-zag (if ranged-aware) → blend tangential component into base heading with a short commit.
6) Local steering → apply hazard costs, obstacle feeler penalties, LOS exposure penalty, and density penalty to finalize heading.
7) Collision/axis/perpendicular fallbacks and separation.

Notes:
- Brace affects knockback intake and speed/DR only; it does not set heading, so it layers cleanly.
- Commit windows (cover/strafe) reduce oscillation; pathDir provides global intent beneath tactics.

---

## 6) Performance Budget
- Grid: 6k tiles; BFS/Dijkstra at 4–6 Hz is cheap. Use dirty flags to rebuild only when needed.
- A*: capped invocations per frame; recompute per enemy no more than once per 0.5–1.0s.
- Direction sampling: keep sample count small (5–7 angles) and early-reject far hazards.
- LOS checks: reuse existing segment tests; sample a few points (center + corners) as in current code.

---

## 7) Implementation Phases & Acceptance Criteria

Phase 1 — Local Steering Upgrades
- Add wall-follow commitment, obstacle feelers, corner bias, gate preference, density penalty.
- Acceptance: enemies round corners without oscillation; fewer jams at chokepoints; no perf regressions.

Phase 2 — Flow Field Guidance
- Build/update BFS/Dijkstra grid with dirty flags; drive base heading from `pathDir` blended with steering.
- Acceptance: enemies route around walls reliably; average “stuck” time reduced; CPU steady.

Phase 3 — Selective A*
- Enable for bosses/featured or stuck cases; add path smoothing; cap per-frame work.
- Acceptance: bosses/featured recover from maze-like traps; no frame hitches under load.

Phase 4 — Targeting Memory & Search
- Add last-seen tile + brief search pattern; ensure aggro feels natural.
- Acceptance: enemies don’t give up immediately when LOS breaks; avoid aimless wandering.

---

## 8) Tunables (initial suggestions)
- Probe step length: 26–32px; feelers at 0.33/0.66/1.0.
- Corner commit: 0.6–1.0s.
- Density penalty radius: 24px; weight small (e.g., 0.2 per neighbor).
- Flow update cadence: 150–250ms; hazard weights mud×2, fire×4, lava×8.
- A* caps: ≤3 runs/frame; per-enemy ≥0.6s between runs; path length ≤12 waypoints before smoothing.

---

## 9) Risks & Mitigations
- Oscillation between tactics/path: use commit timers and priority order; blend, don’t hard switch when possible.
- Over-avoidance of hazards: keep hazards as costs, not blockers; clamp weights.
- CPU spikes from A*: cap and stagger; prefer flow field as the default.
- Corner cases with footprint clearance: validate with inflated walls or 2×2 tile checks.

---

## 10) Debug & Telemetry
- Toggle overlays (behind `window.DEBUG_ENEMIES`):
  - Flow field arrows (downhill neighbor)
  - Current tactic + timers
  - Cover corner target
  - Feeler hits and chosen heading
- Console counters: BFS rebuilds, A* runs/frame, average stuck time.

---

## 11) Compatibility with Ranged-Aware Behaviors
- This proposal provides the global/base heading and improved local steering. Tactical behaviors (cover, zig-zag, juke, dash, brace) sit above it in priority and temporarily override path following when active.
- The two plans are complementary: pathfinding gets enemies around the map; tactics make them smarter under fire. The integration order prevents conflicts.

