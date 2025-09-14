# Level Themes, Narrative, and Mechanics — Plan

This document defines a simple rule for building levels and applies it across current levels. It also specifies the Level 2 companion conflict (Canopy ↔ Yorna) and how it frames party strategy and a boss counter.

## Principle: One Clear Theme + One Clear Beat + One New Thing

Every level should:
- Gameplay Theme: Put one systemic pressure or pattern in focus (e.g., visibility, spacing, terrain, patrol pressure, resource windows). Keep it readable.
- Narrative Theme: Advance a character or faction beat that fits the space. Use short VN moments that reinforce the theme.
- New Mechanic (if available): Introduce or escalate exactly one mechanic. Teach safely, reward use, then raise stakes.
- Boss Counter: Point players toward at least one strong counter (companion aura/trigger, item, or terrain) so choices feel smart, not grindy.
- Gating & Pacing: Use a key guardian + gate where useful; set `levelN_reached` for dialogs/quests; keep spawn density readable near entry.

How to Apply
- Be explicit in design notes: write 1–2 lines each for Gameplay, Narrative, Mechanic, Counter.
- Favor clarity over layers. If a second idea is great, promote it to the next level instead of diluting the current one.

## Per‑Level Outline (current plan)

Level 1 — Greenwood
- Gameplay: Visibility and space management in a dark forest; learn to create safe lanes.
- Narrative: First allies; establish tone and the Urathar threat. Meet Canopy, Yorna, Hola.
- Mechanic: Torches and basic ranged access. Bow and arrow cache placed safely; arena light softens boss.
- Boss Counter: Vast’s smolder/guard windows reward spacing, gust awareness, and early support (Canopy/Hola) to stabilize.

Level 2 — Desert/Cave
- Gameplay: Choice and counters; teach that party composition matters.
- Narrative: Lines are drawn — Canopy and Yorna clash; new allies Oyin and Twil offer answers.
- Mechanic: Stronger enemy counters (range penalty, gust) and light hazard variety (mud, fire). Encourage swapping/recruiting.
- Boss Counter: Nethra’s −1 range aura is cleanly countered by Oyin’s +1 range aura; Twil’s slow windows curb gusts and open lanes.

Level 3 — Marsh
- Gameplay: Mobility and footing; water blocks, mud slows; control space while moving.
- Narrative: Loss and resolve; Tin’s momentum vs Nellis’s line‑holding.
- Mechanic: Terrain as puzzle (blocking water + slows). Route around and time pushes.
- Boss Counter: Luula’s slow/gust favors Tin’s attack speed spikes and Nellis’s slows/DR to stabilize and puncture windows.

Level 4 — Ruined City
- Gameplay: Patrol pressure and lanes; structured arenas with sightlines.
- Narrative: Occupation and resistance; Urn steadies morale; Varabella sharpens angles.
- Mechanic: Patrol spawners and city hazards; gate by sigil key.
- Boss Counter: Vanificia’s high DR rewards Varabella’s “Call the Angle” range/ATK windowing and stacked positioning buffs.

Level 5 — Temple District
- Gameplay: Consolidation and cleansing; sustained fights around pylons/ritual spaces.
- Narrative: The hall breathes again; companions react to a turning point.
- Mechanic: Hub services and stronger strike synergies; party identity solidifies.
- Boss Counter: Vorthak’s sustain/DR asks for stacked DPS windows (Yorna+Cowsill) or hardened sustain (Urn+Canopy) depending on build.

Level 6+ — Variants & Checks
- Gameplay: Remix prior mechanics into clear checks (reflects, split objectives, elite ammo windows) without muddling readability.
- Narrative: Personal closures; faction reveals.
- Mechanic: Variant rules per sub‑area instead of brand‑new systems.
- Counter: Explicit tells and multiple counter paths keep fairness.

References
- Level scaffolding: `docs/LEVEL_SCENES.md`
- Ranged rollout: `docs/RANGED_ROLLOUT_AND_AMMO.md`
- Enemy effects: `docs/ENEMY_AURAS_AND_TRIGGERS.md`
- Companion profiles: `docs/COMPANION_GUIDE.md`
- VN intro behavior: `docs/VN_INTRO_SPEC.md`

## Level 2 Companion Conflict — Canopy ↔ Yorna

Goal
- Teach that party composition has tradeoffs. Create an explicit strategic fork early to open recruiting of Oyin/Twil and set up future truces.

Event Beats
- Trigger: First arrival to Level 2 (`level2_reached`) while both Canopy and Yorna are in the party and no resolution flag is set.
- VN Scene: A short, grounded exchange escalates into a brief clash; player must choose who stays.
- Choice: “Keep Canopy” or “Keep Yorna.” The one not chosen is dismissed exactly like using the Dismiss option in her interface.
- Aftermath: A feud flag blocks recruiting the other while the rival is in party, leaving one open slot and nudging the player to find Oyin/Twil.

Boss Synergy
- Nethra applies a −1 melee range aura and short gusts/enrage windows.
- Oyin’s aura grants +1 range (nullifies the penalty) and a rally heal/ATK burst during enrage windows.
- Twil’s slow aura and Dust Veil reduce effective gust frequency and open safer hit timings.

State & Flags
- `canopy_yorna_feud_active`: set when the Level 2 event starts.
- `canopy_yorna_choice`: `'canopy' | 'yorna'` once the player chooses.
- `canopy_yorna_feud_resolved`: set after dismissal and VN close.
- Existing truce hook: later content can set `canopy_yorna_respect` to allow both together (see chemistry dampeners and “Mediate” hooks in companion dialogs).

Join/Refusal Rules
- While the feud is unresolved:
  - Canopy “Join me” requires Yorna not in party.
  - Yorna “Join me” requires Canopy not in party.
- After respect (`canopy_yorna_respect`), both can join; use existing soft‑cap/chemistry rules.

Pseudo‑gates for dialogs
- Canopy join choice: `requires: { partyMissing: 'yorna' }` with an alternate refusal node if Yorna is present and `missingFlag: 'canopy_yorna_respect'`.
- Yorna join choice: `requires: { partyMissing: 'canopy' }` with a similar refusal node.

VN Hook (Implementation Sketch)
- On `loadLevel2()` near the end, run:
  - If both are in `companions` and no `canopy_yorna_feud_resolved`, queue a VN via the intro system (see `VN_INTRO_SPEC.md`).
  - Present two choices. On select:
    - Set `runtime.questFlags['canopy_yorna_choice'] = 'canopy'|'yorna'`;
    - Dismiss the other companion using the existing `dismiss_companion` action with an explicit `data` reference to that companion object;
    - Set `canopy_yorna_feud_resolved = true` and update party UI.

Notes on actions
- `dismiss_companion` already exists in `src/engine/dialog.js`. It accepts `data: comp` or falls back to `runtime.activeNpc` if that actor is a current companion. For a custom VN tree, pass the concrete companion object in `data`.
- To block accidental re‑recruitment while the rival remains, rely on the `requires` gates above. This keeps the rule visible in UI.

Persistence
- All flags live in `runtime.questFlags` and are already persisted. No save model changes required.

Acceptance Checklist (Level 2)
- [ ] On first entering Level 2 with both Canopy and Yorna: feud VN plays once; player chooses; one companion is dismissed; an empty slot remains.
- [ ] While feud unresolved, the dismissed one refuses to join if the rival is present; UI shows clear refusal copy.
- [ ] Nethra’s range penalty is clearly and strongly countered by Oyin’s aura; Twil’s slow also helps. Tooltips/dialog copy call out these counters.
- [ ] Flags persist across saves; no soft‑locks or duplicate VN triggers.

Open Follow‑ups (optional)
- Add a short “respect” micro‑quest to earn `canopy_yorna_respect`, enabling both to ride together later (gated after Level 3 or hub content).
- Add succinct VO/SFX stings for feud VN open/resolve.
