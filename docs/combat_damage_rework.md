# Combat Damage Rework — Plan

This document proposes changes to make defense feel strong without trivializing danger. It combines a small universal damage “chip” with occasional armor penetration via critical hits and specific enemy powers.

## Goals
- Preserve the fantasy of heavy armor and DR feeling meaningful.
- Prevent AFK tanking where plate + buffs fully blocks all mooks/featured.
- Add readable spikes so enemies sometimes threaten through armor.
- Keep implementation straightforward and data-driven for tuning.

## Problems Observed
- Flat DR ≥ incoming damage leads to 100% “Blocked” hits from mooks/featured.
- Party DR buffs (DR, touch DR) amplify this and remove attrition pressure.

## Proposal (High-Level)
- Add a small universal post-mitigation damage floor (chip) so every hit can matter a little.
- Introduce critical hits for enemies that partially bypass DR and add a small bonus.
- Give select enemies (featured/boss) armor-piercing (AP) or true-damage specials to create moments of threat.
- Keep recent DR increases on featured/bosses — spikes/chip restore danger without flattening gear fantasy.
- Add player critical hits (with companion auras that can raise crit chance) to keep parity and reward build choices.

## Detailed Mechanics

### 1) Universal Chip Damage Floor
- After DR is applied, clamp damage to a minimum per enemy class.
- Suggested rule: `chip = clamp(round(raw * 0.10), classMin, classMax)` applied only if final < chip.
  - Mook: min 1, max 1 (always 1 on contact)
  - Featured: min 1, max 2 (usually 1–2)
  - Boss: handled via crit/AP (no universal chip for bosses by default)
- Outcome: small attrition without making every hit feel the same.

### 2) Critical Hits (DR Penetration + Bonus)
- On each enemy hit, roll a crit that ignores part of the player’s DR and adds a small flat bonus.
- Suggested defaults:
  - Mook: 6% chance, ignore 50% of DR, +1 damage bonus
  - Featured: 10% chance, ignore 60% of DR, +2 damage bonus
  - Boss: 12% chance, ignore 70% of DR, +3 damage bonus
- UX: Show a distinct “CRIT” float text and a piercing SFX; optional brief sprite flash.

### 2b) Player Critical Hits
- Give the player a baseline crit chance and DR penetration for crits.
- Suggested defaults:
  - Base player crit chance: 8%
  - Player crit effect: ignore 50% of enemy DR and multiply base damage by 1.5 (rounded up)
- Companion synergy (aura): certain companions can grant +3–6% crit chance while present.
  - Example: Varabella (sharp eye) or Twil (weak points) provide `+5%` crit aura.
- UX: Use a distinct float text (e.g., `Crit! 9`) and a brighter hit sfx.

### 3) Armor-Piercing (AP) / Armor-Ignoring Specials
- Tag certain attacks for partial DR ignore or a small true-damage component.
- Suggested patterns:
  - Featured archetypes: give one move `ap: 2–3` (ignores that much DR) with a clear wind-up (e.g., Thrust/Overhead).
  - Bosses: keep a special with `trueDamage: 2–3` (applies after DR) on a moderate cooldown.
- UX: Use a “Pierce!” float and distinct SFX.

### 4) Optional Soft DR Cap (Guardrail)
- For non-crit, non-AP hits, cap effective mitigation at ~75% vs the attacker’s base.
- Only enable if needed after playtesting; the above may already suffice.

## Tuning Targets
- With current enemy damage (mook ~3–5, featured ~6–9), chip = 1–2 and crit/AP punctures keep pressure.
- DR stays meaningful most of the time, but crowding and elite moves still matter.

## UX / Feedback
- Float text: `Blocked` (full), `Grazed 1/2` (chip), `Crit 7` (crit), `Pierce! 5` (AP/true).
- SFX: reuse `shield` for full block; add `pierce` for crit/AP; keep hit variations.
- Consider a short camera shake only for boss pierce to avoid noise.

## Data & Code Changes (Implementation Outline)

1) Damage resolution (player being hit)
   - File: `src/systems/step.js`
   - In the section where enemy damage to player is computed and DR applied:
     - Compute `raw` hit.
     - Roll crit and, on success, reduce effective DR by a fraction; add small bonus.
     - If the attack has `ap` or `trueDamage`, apply that logic.
     - Apply universal chip floor for mook/featured.
     - Emit float text + SFX based on the final result.

2) Enemy metadata (crit/AP knobs)
   - Extend enemy spawn options/definitions with optional fields:
     - `critChance`, `critDrIgnore`, `critBonus`
     - `ap` (flat DR ignore) or `trueDamage`
   - Tag a single special per featured archetype and a recurring boss special.

2b) Player crit pipeline
   - File: `src/systems/combat.js`
   - In the segment where player attacks enemies:
     - Roll player crit (base + companion aura bonus).
     - On crit, reduce enemy effective DR by 50% and multiply damage by 1.5 (tunable).
     - Emit player crit float text and sfx.

3) Audio/FX
   - Add/route a piercing SFX in `src/engine/audio.js` (reuse or lightweight synth).
   - Float text in `src/engine/state.js` utilities already exists (use `spawnFloatText`).

4) Tuning switches
   - Keep defaults inline and data-driven; allow per-enemy overrides in spawns.
   - Optional global toggles for playtests (enable/disable chip, crits, AP).

## Rollout & Test Plan
- Unit sanity: local fights in L1–L5 to verify:
  - With plate + buffs, mooks still chip for 1, featured 1–2 occasionally; bosses puncture.
  - Crit/AP events are visible but not spammy (rough target: 1–2 noticeable punctures per short skirmish).
- Balance pass:
  - If attrition too high in swarms, lower chip to 5% floor or cap at 1 for featured.
  - If spikes feel rare, raise crit chance by +2% or increase DR ignore by +10%.
  - Player feel: if player crits feel too frequent/strong, lower base to 5% or reduce multiplier to 1.4.
- Telemetry (manual): count deaths/time-to-kill with/without plate.

## Defaults to Start With
- Chip: `round(raw*0.10)`, capped: mook=1, featured=2, boss=0.
- Crits: mook 6% / 50% DR ignore / +1; featured 10% / 60% / +2; boss 12% / 70% / +3.
- AP Specials: featured `ap: 2–3` on one move; boss `trueDamage: 2–3` on a special.
- Soft DR cap: off (enable only if needed).
- Player crits: base 8% chance, 1.5× damage, 50% enemy DR ignore; companion aura can add +5%.

---

If these defaults feel right, the next step is to implement the damage pipeline changes in `step.js`, add metadata hooks to enemy spawns, and wire feedback SFX/text. Tuning can then be iterated quickly per level.
