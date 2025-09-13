# Companion Affinity Triggers (L8 & L10)

This document outlines new companion triggers that unlock at high affinity. Each companion gets:

- Level 8 Trigger: a powerful, thematic effect with a moderate cooldown.
- Level 10 Ultimate: a stronger effect with a longer cooldown.
- Synergy Ultimates (special): for Urn and Varabella, an extra ultimate that unlocks only if both are present at affinity 10.

General principles

- Auto-proc triggers with readable, short durations.
- Clear CDs; no stacking of identical effects, refresh extends.
- Respect existing caps (DR, slow, crit, etc.).

Unlock rules

- L8: companion affinity ≥ 8.
- L10: companion affinity ≥ 10.
- Synergy (Urn/Varabella): both present AND both at affinity 10; share a joint synergy cooldown.

Companion triggers (summary)

- Canopy
  - L8 Aegis Surge: On low HP or heavy hit, 3s bubble around player: +DR, small regen, slight KB resist. CD ~18s.
  - L10 Guardian Veil: On 3+ nearby enemies or pre-boss telegraph, grant party 1.5s near-invuln (block one hit). CD ~40s.
- Yorna
  - L8 Expose Weakness: On Dash Strike or Crit, 4s armor shred aura in small radius. CD ~14s.
  - L10 Execution Window: 2s: hits vs <25% HP enemies gain AP + true dmg; bosses: AP/true only. CD ~35s.
- Hola
  - L8 Slipstream Field: On dash, 2s tailwind: reduce dash CD (temp CDR), slight movement boost. CD ~12s.
  - L10 Maelstrom: If 4+ enemies nearby, radial knockback + heavy slow for 1.5s; brief reflect/deflect boost. CD ~32s.
- Oyin
  - L8 Veil Anchor: On ranged hit taken, 3s slow + light DR zone at impact. CD ~16s.
  - L10 Eclipse: 2s global dim: enemies −30% speed and minor DoT; player gets light DR. CD ~45s.
- Twil
  - L8 Flare Chain: On melee hit, ignite up to 3 nearby enemies (short DoT). CD ~12s.
  - L10 Detonate Brand: If target has sustained burn (or 3+ stacks), small AoE burst and clear stacks. CD ~40s.
- Tin
  - L8 Overclock: After a Dash Combo, 3s +25% attack speed and reduced dash CD. CD ~16s.
  - L10 Symphony: Reset dash CD; 4s hyper (+50% attack speed, +10% crit). CD ~45s.
- Urn
  - L8 Beacon Surge: At HP <35% or after short damage streak, pulse heal and +10% attack speed (3s). CD ~20s.
  - L10 Second Wind: Once per level, on lethal damage restore to 1 HP and 1.2s invuln. (Per-level lockout.)
- Varabella
  - L8 Perfect Angle: When two enemies align with player/target, next attack pierces and gains AP. CD ~14s.
  - L10 Time Dilation: 2s enemy slow (−25%); your projectiles pierce and +20% crit; melee gets +range/+AP. CD ~40s.
- Nellis
  - L8 Phalanx: With 2+ enemies nearby, 3s +touchDR and strong KB resist to party. CD ~20s.
  - L10 Bulwark: 3s frontal barrier blocking projectiles and reducing contact damage through it. CD ~45s.
- Cowsill
  - L8 Crescendo: After 5 hits in 3s, next hit deals +100% bonus and short lunge. CD ~18s.
  - L10 Encore: Repeat last melee damage as a ghost hit on up to 2 nearby enemies (no on-hit procs). CD ~45s.
- Ssil (Snake)
  - L8 Venom Cloud: 2s cloud around player (slow + poison DoT). CD ~18s.
  - L10 Constriction: Root nearest elite 1s and heavy DoT; bosses: slow + half DoT. CD ~35s.

Synergy Ultimates (Urn + Varabella only)

- Urn — Sanctuary Convergence (2.5s, shared CD ~55–60s)
  - Zone around player: allies +DR and regen; cleanse burn/slow.
  - Enemies: −30% speed; projectiles slow and partially deflect at edge.
  - Synergy: projectiles fired from inside gain +1 pierce and +10% crit; after effect, party +2 range for 3s.

- Varabella — Chrono Lattice (1.8s, shared CD ~55–60s)
  - Global enemy/projectile slow (−35%).
  - Player projectiles: +1 pierce and chain through clustered lines; melee gets +range and +AP; marked enemies take +25% damage for 2s.

Implementation notes

- Data: add trigger metadata to `companion_effects.js` under each companion (`l8`, `l10`, optional `synergy10`).
- Runtime: extend `runtime.companionCDs` and temp buff timers (e.g., `tempAspdBonus`, `tempDashCdr`, `tempCritBonus`).
- Systems: wire detection in `handleCompanionTriggers(dt)` and where event-based (e.g., Dash Combo, crit, melee hit) in `combat.js`.
- Effects: reuse existing auras and temp-buff pathways; avoid new UI; use floaters + SFX.

