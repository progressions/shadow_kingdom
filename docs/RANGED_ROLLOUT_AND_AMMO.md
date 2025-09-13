# Ranged Counters Rollout + Ammunition Plan

This document proposes a phased rollout to keep ranged builds fun but non‑trivial, and adds an ammunition system to make bow gameplay more intentional.

## Objectives
- Preserve bows as a viable, satisfying playstyle.
- Prevent “stand far away and chip everything safely”.
- Introduce readable counters that teach movement, timing, and target priority.
- Make ammo a meaningful resource without soft‑locking or busywork.

## Levers (Summary)
- Boss counters: ranged DR, deflect auras, immunity windows, reflect phases, distance‑based DR, front‑arc shields.
- Encounter/arena: LOS breakers, pylons that grant shields, moving hazards (wind curtains), ring buffs/debuffs.
- Player constraints (light): accuracy/spread while moving, heat/reload, ammo discipline, special arrows.

---

## Phased Rollout by Level

Below maps counters to current story beats and names in the codebase.

### Level 1 — Teach the Idea, Don’t Punish
- Boss: Vast (“The Fortress‑Lite”)
  - Front‑arc ranged reduction (e.g., 75%) — flank or step in.
  - Small wind pockets near the boss that nudge projectiles; readable gust FX.
- Arena: Occasional short pillars (static LOS blockers) that encourage angle changes.
- Adds: One weak archer, a couple melee brutes to pressure space.
- Player resources: Guarantee bow via fixed chest; no ammo requirement yet OR very generous basic ammo to learn.

### Level 2 — Introduce Real Counters
- Boss: Nethra (“The Gale”)
  - Persistent wind veil: moderate deflect chance + slow to incoming projectiles in a radius.
  - Break‑window: interrupt wind channel (melee) to reduce mitigation for ~10s.
- Arena: 2 shield pylons grant extra ranged DR; destroy either to weaken the veil.
- Adds: Shield‑bearers with front‑arc projectile block that advance.
- Ammo: Turn on ammo as a tracked resource; start featuring light drops and chest stocks.

### Level 3 — Objective Windows
- Boss: Luula (“The Eye”)
  - Mostly vulnerable to ranged, but raises a brief barrier (immunity window) after certain attacks; telegraphed.
  - Great fight for archers to feel strong when they read windows.
- Arena: Rising reeds/water curtains that break LOS on a rhythm.
- Adds: Flankers that punish staying still.
- Ammo: Introduce special arrows (Piercing, Fire) via rare drops/chests.

### Level 4 — Reflect and Facing Puzzle
- Boss: Vanificia (“The Mirror”)
  - Periodic reflect phase with strong cue (glint + sting); arrows reflect during it.
  - Outside reflect, directional DR: front 80%, sides 30%, back 0%.
- Arena: Rotating statues (moving LOS breakers).
- Adds: Crossfire squads (snipers on edges) to punish standing in open lanes.
- Ammo: Shops or guaranteed caches pre‑arena; increase strain on careless firing.

### Level 5 — Mixed Mechanics, Big Pylons
- Boss: Vorthak (“The Fortress”) — strong shield network
  - Fully ranged‑immune while 3 pylons are active; breaking each removes a third of the barrier.
  - Post‑pylon, keep a moderate wind veil/deflect.
- Arena: Narrow corridors that force mid‑range angles.
- Adds: Gatekeepers that re‑enable pylons unless interrupted.
- Ammo: Expect players to bring stacks; supply a mid‑fight cache as relief.

### Level 6+ — Variants and Hard Checks
- Boss variants: mix two mechanics (e.g., wind + reflect OR distance DR + facing shield).
- Encounters: More moving LOS and zone control (hazards, wind lanes that curve arrows).
- Ammo: Rare “Elite” arrow types (2–3 per level) for big openings.

---

## Boss Templates (Reusable Patterns)
- The Fortress: Ranged immunity until pylons destroyed; then moderate mitigation. Great objective pacing.
- The Gale: Constant deflect/slow aura; melee interrupt creates ranged window.
- The Mirror: Reflect windows (telegraphed); use melee or hold fire to avoid self‑punish.
- The Eye: Vulnerable to ranged with periodic brief barrier.
- The Shield Wall: Front‑arc immunity, flanks/back vulnerable; highly positional.
- Distance DR: Damage falls with range beyond N px; encourages mid‑range play.

Each template needs readable feedback: floaters like “Veiled”, “Deflect!”, “Reflected!”, “Shielded Front”, SFX stings, and subtle VFX (gusts, glints, arcs).

---

## Ammunition System (Design)

### Goals
- Make ranged planning meaningful without hard‑stopping play.
- Keep onboarding gentle; don’t surprise new players with scarcity.

### Data Model
- Items (stackable):
  - `arrow_basic` (id: `arrow_basic`, name: “Arrows”, stackable: true, maxQty 99, slot: `misc`).
  - Special arrows: `arrow_piercing`, `arrow_fire`, `arrow_shock` — rare; small stacks (≤ 10).
- Weapon metadata:
  - Bow objects add `ranged: { cooldownSec, projectileSpeed, pierce?, consumes: 'arrow_basic' }`.
  - Optional `multishot`/`spread` later.
- Runtime:
  - Ammo count presented in UI; deplete on every shot regardless of hit/deflect.
  - Dev toggle to disable ammo for testing.

### Firing Rules
- Consume 1 basic arrow per shot if the equipped ranged weapon’s `consumes` matches your inventory.
- If out of the matching ammo:
  - Option A (strict): cannot fire; show “Out of arrows!”
  - Option B (soft): allow an improvised weak shot with long cooldown and no crit/pierce; still show banner. Recommended for normal difficulty.
- Special arrows
  - Player can toggle next arrow type (cycle inventory types). Next shot consumes that stack and applies an effect (e.g., pierce +1, small burn DoT, short stun on mooks).

### Economy & Supply
- Drops: mooks 10–15% chance for +1–3; featured 30% for +3–5; chests often carry 10–20; barrels/crates small chance for +1–2.
- Shops or guaranteed caches (chests) before major arenas.
- Min floor: provide a small cache near boss doors to prevent soft‑locks.

### UI/UX
- Ammo counter near HP/XP bars (e.g., right of Level): “Arrows: 24 (Piercing: 4)”.
- Low ammo banner at thresholds (≤ 5 basic): “Low on arrows”.
- On special arrow armed: small badge (icon or 2‑letter code).
- Deflect/Immunity feedback: tracer recolor + floater so the player understands why shots fail.

### Balance & Interactions
- Hola’s wind deflection consumes ammo (arrow still launched) — important trade‑off: don’t spam into wind.
- Boss deflect/reflect: also consumes ammo; encourages waiting for windows or swapping to melee.
- Companion synergies tied to proximity can reward getting closer even as an archer.

---

## Data Flags & Code Touchpoints (Implementation Outline)

Note: This is a planning outline; code changes should follow in separate tasks.

- Enemy/boss additions (spawn options in `src/engine/state.js` and used in `src/systems/step.js`):
  - `rangedDamageMult?: number` — global multiplier for projectile damage taken.
  - `deflectAura?: { chance: number, radius: number }` — like Hola’s but on enemies.
  - `reflectWindows?: Array<{ tStart: number, tEnd: number }>` or a simple state flag.
  - `frontArcShield?: { angle: degrees, dr: number | 'immune' }`.
  - `distanceDr?: { near: number, far: number, falloffStart: number }`.
  - `pylons?: string[]` — ids of arena pylons granting immunity while alive.
- Arena props (obstacles array):
  - Pylon obstacles with `id`, `type: 'pylon'`, `blocksAttacks: true`, HP; on destroy, flip a boss flag.
  - Moving LOS blockers: timed positions, or simple oscillation.
- Projectile pipeline (`src/systems/step.js`):
  - Apply boss `rangedDamageMult`, `deflectAura`, `reflect` check, `frontArcShield`, and `distanceDr` before final damage.
  - Feedback floaters and SFX.
- Ammo:
  - Items (`src/data/items.js`): add arrow stacks; special arrow items.
  - Loot (`src/data/loot.js`): distribute arrows; guaranteed caches before big arenas.
  - Combat (`startRangedAttack` in `src/systems/combat.js`): consume ammo based on `consumes` tag; handle out‑of‑ammo rule (strict or soft); add “next arrow type” cycling (later task).
  - UI (`src/engine/render.js` / `src/engine/ui.js`): ammo count display.

---

## Tuning & Telemetry
- Track (manual during playtests):
  - Time‑to‑kill per boss by build (melee vs ranged) and deaths.
  - Ammo spent per fight and average carry‑in/out.
  - % of shots deflected/blocked/reflected (using DEBUG flag prints).
- Adjust:
  - Deflect chances (0.2–0.6), ranged DR multipliers (0.25–0.75), distance falloff start.
  - Ammo drops per level until players rarely drop to 0 before a boss; rely on “soft” fallback if needed for normal difficulty.

---

## Rollout Plan
1. Ship ammo foundation with generous drops and soft fallback; add UI counter.
2. Apply counters to Vast (front‑arc reduction) and Nethra (wind veil + pylons) first.
3. Add LOS blockers + encounter mixes (shielders/snipers) to L2–L3.
4. Introduce reflect window (Vanificia) and distance DR boss (optional at L3/4).
5. Expand special arrows, boss variants, and moving LOS elements.
6. Iterate numbers based on playtest telemetry and feedback.

This plan keeps archery strong when read correctly, while forcing adaptation (movement, melee windows, node objectives) when bosses actively counter ranged.

