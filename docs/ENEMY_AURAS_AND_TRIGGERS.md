# Enemy Auras and Triggers

This document specifies the aura/trigger system for enemies (starting with key guardians) so they feel tougher and more distinct, while remaining readable and fair. It complements the existing companion aura/trigger system.

## Goals
- Give bosses and key guardians lightweight, thematic mechanics.
- Reuse familiar patterns (auras, short pulses, DR windows) for clarity.
- Keep balance under global caps to avoid frustration.

## Model Overview

- Data lives in `src/data/enemy_effects.js` keyed by enemy name (lowercase).
- Runtime applies:
  - Continuous auras each frame (e.g., player slow zone, range penalties, small regen, baseline DR).
  - Conditional triggers on events (e.g., on hit, near player, low HP) with cooldowns and durations.
- Effects influence:
  - Player movement speed (multiplier) and melee range (penalty).
  - Enemy mitigation (DR) and sustain (regen).
  - Occasional knockback pulses (“gust”) for spacing.

## Effect Types

- Auras (continuous while enemy is alive):
  - `dr`: Flat damage reduction vs player hits.
  - `regen`: HP per second; some auras scale when near the player.
  - `playerSlow`: Slow factor applied to player within a radius.
  - `weakenRange`: Reduces player melee range within a radius.

- Triggers (temporary, cooldown-based):
  - `onHitGuard`: After taking a hit, gain temporary DR and optionally a speed boost.
  - `proximityGust`: If player is within radius, push the player away and apply a brief slow.
  - `enrageBelowHp`: When HP is below a threshold, grant a short DR/speed window.

## Global Caps (Enemy-side)

- Enemy DR: max +3
- Enemy regen: max 0.25 HP/s
- Player slow: max 40% total from enemy sources
- Player range penalty: max −2 pixels total from enemy sources

## Key Guardians — Distinct Designs

- Gorg (Level 1) — Ember Crown
  - Auras: player slow 0.08 within 90px.
  - Triggers:
    - Rage Guard: after taking a hit, +1 DR for 2.5s (7s CD).
    - Stomp Gust: if player within 24px, push 10px + 0.20 slow for 0.3s (12s CD).

- Aarg (Level 2) — Serpent Chill
  - Auras: player slow 0.12 within 110px.
  - Triggers:
    - Coil: after taking a hit, +1 DR and +10% speed for 3s (9s CD).
    - Snap Gust: if player within 30px, push 12px + 0.20 slow for 0.3s (10s CD).

- Wight (Level 3) — Grave Hunger
  - Auras: DR +1.6; regen 0.05 HP/s (0.10 HP/s within 100px); player range −1 within 100px.
  - Triggers:
    - Grasp: if player within 36px, apply 0.30 slow for 0.4s (9s CD).

- Blurb (Level 4) — Toxic Miasma
  - Auras: player range −2 within 140px.
  - Triggers:
    - Bulbous Hide: after taking a hit, +2 DR for 1.5s (10s CD).
    - Spew: if player within 38px, push 12px + 0.25 slow for 0.35s (11s CD).

- Fana (Level 5) — Arcane Distortion
  - Auras: player slow 0.10 and range −1 within 120px.
  - Triggers:
    - Ward: at <50% HP, +1 DR and +10% speed for 5s (12s CD).
    - Counterpulse: on taking a hit while <50% HP, push 14px + 0.25 slow for 0.35s (12s CD).

## Integration Notes

- New runtime aggregator computes per-frame player debuffs from nearby enemies and respects caps.
- Enemy DR is applied when calculating damage taken in `combat.js`.
- Short gust pulses push the player and apply a brief slow; effects are telegraphed with float text.

### Feedback (SFX + Visuals)
- On trigger fire, the game shows float text above the enemy and plays a short SFX:
  - Guard → text "Guard!", shimmer SFX (reuses `shield`).
  - Enrage → text "Enrage!", energetic SFX (reuses `rally`).
  - Gust → text "Gust!", whoosh SFX (reuses `gust`).
- Visual telegraphs: colored sparkles burst at the enemy origin to hint the effect type
  - Guard: blue `#a8c6ff`
  - Enrage: orange `#ff9a3d`
  - Gust: light blue `#a1e3ff`

## Bosses — Initial Sets

- Vast (Level 1) — Smoldering Tyrant
  - Auras: DR +1; regen 0.05 HP/s.
  - Triggers: proximity gust (28px, push 12, slow 20% for 0.4s, 10s CD); enrage below 50% (+1 DR, +10% speed for 5s, 12s CD).

- Nethra (Level 2) — Blade Mistress
  - Auras: player range −1 within 120px.
  - Triggers: enrage below 60% (+1 DR, +10% speed for 5s, 12s CD); proximity gust (30px, push 10, slow 20% for 0.35s, 11s CD).

- Luula (Level 3) — Marsh Witch
  - Auras: player slow 10% within 120px.
  - Triggers: enrage below 50% (+1 DR, +15% speed for 5s, 12s CD); proximity gust (26px, push 10, slow 20% for 0.3s, 10s CD).

- Vanificia (Level 4) — City Sorceress
  - Auras: DR +2.
  - Triggers: proximity gust (32px, push 12, slow 22% for 0.35s, 9s CD); enrage below 50% (+1 DR, +10% speed for 4s, 10s CD).

- Vorthak (Level 5) — Temple Overlord
  - Auras: DR +2; regen 0.10 HP/s.
  - Triggers: enrage below ~66% (+1 DR, +15% speed for 6s, 10s CD); proximity gust (34px, push 14, slow 25% for 0.4s, 10s CD).

Notes
- These ride on top of existing boss phase buffs in `step.js` (second/third phase changes). Values are modest to avoid oppressive stacking.
- The same caps apply: enemy DR ≤ 3, regen ≤ 0.25 HP/s, player slow ≤ 40%, range penalty ≤ 2.
