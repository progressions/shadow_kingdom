# Companion Temperament and VN Intro Triads — Plan

Status: design plan only (no code changes in this doc)

## Goals
- Define five companion personalities (temperaments) with consistent behavioral hooks.
- Standardize first‑meet VN “three‑choice” intros per companion with temperament‑driven affinity deltas.
- Reuse flags and persistence so intros are one‑time and non‑stacking with existing intro boosts.
- Provide a foundation to extend temperament into dialog, quests, combat barks, and bond gating.

## Temperaments (Five‑Type Model)
- Nurturing — Warm, reassuring, relationship‑first; forgives soft misreads.
- Steady — Stoic, dependable, duty/pacing focused; dislikes chaos talk.
- Playful — Quick, witty, high‑energy; likes banter, dislikes po‑faced seriousness.
- Practical — Results‑first, unsentimental; values competence and economy, dislikes fluff.
- Exacting — Intense, perfectionist; rewards crisp alignment, punishes misreads.

### Affinity Profiles (defaults)
- Nurturing: match +0.3 to +0.4; clash 0; defer 0; bond gate shift −0.3
- Steady: match +0.3; clash −0.05; defer 0; bond gate shift 0
- Playful: match +0.3 to +0.5; clash −0.1 (esp. stiff/over‑serious); defer 0; bond gate shift 0
- Practical: match +0.2 to +0.3; clash −0.1 (frivolous/off‑mission); defer 0; bond gate shift +0.2
- Exacting: match +0.2 to +0.4 (up to +0.6 for special beats); clash −0.15; defer 0; bond gate shift +0.5

Notes
- Clash penalties never block recruitment; they only set a spikier starting point.
- Affinity remains clamped in [1, 10]; bond gate shift applies only where a node does not set explicit affinity min.

## Companion → Temperament Mapping
- Nurturing: Canopy, Hola, Urn, Snek
- Steady: Nellis, Oyin
- Playful: Tin, Cowsill, Twil
- Practical: Varabella
- Exacting: Yorna, Fana

## Talk Intro “Triads” (per companion)
When you explicitly talk to a companion, their intro node presents exactly three choices:
- Match (aligned with intro; recruits; grants affinity by temperament/override)
- Clash (respectful but off‑tone; recruits; grants 0 or negative by temperament/override)
- Defer (short denial; no affinity change; closes conversation)

VN-on-sight behavior
- First‑sight VN intros are narrative only and never recruit; they show a single “Continue”.
- This includes the opening Canopy scene and any other vnOnSight sequences.

Level 2 Feud — Join Button Gating
- During the Level 2 feud (Canopy ↔ Yorna), recruitment nodes should be gated by party composition until a later truce:
  - Canopy “Join me” requires `partyMissing: 'yorna'` unless `canopy_yorna_respect` is set.
  - Yorna “Join me” requires `partyMissing: 'canopy'` unless `canopy_yorna_respect` is set.
- Triads still present their three choices; the gating applies to the Join action path, not the intro VN.

Ordering
- Denial is always last.
- The position of Match/Clash is hard‑coded per companion (no runtime shuffling).
- Use `matchFirst: true|false` in `introTriads[<key>]` to control whether Match appears before Clash for that companion.

Implementation notes
- Use `introTexts[<key>]` for VN text body.
- Reuse existing intro reward flags (below) to prevent double‑granting between VN and talk intros.
- Set `<name>_intro_deferred` on Defer for analytics/banter gates.

### Per‑Character Triads (lines + deltas)
- Canopy (Nurturing) — +0.3 / 0
  - Order: Match, Clash, Defer
  - Match: “Let’s find your sister—walk with me.”
  - Clash: “I could use another pair of fighting hands—join up.”
  - Defer: “We’ll talk later, Canopy.”

- Yorna (Exacting) — +0.2 / −0.15
  - Order: Clash, Match, Defer
  - Match: “We take the key, drop Vast—fall in.”
  - Clash: “Hang back and patch me up, alright?”
  - Defer: “Not now, Yorna.”

- Hola (Nurturing) — +0.3 / 0
  - Order: Match, Clash, Defer
  - Match: “Stay close; call the breeze—we’ll get the key.”
  - Clash: “Frontline with me—we need a brawler.”
  - Defer: “Another time, Hola.”

- Oyin (Steady) — +0.3 / −0.05
  - Order: Match, Clash, Defer
  - Match: “Walk with me—learn as we go.”
  - Clash: “I need a seasoned striker right now.”
  - Defer: “Let’s talk later, Oyin.”

- Twil (Playful) — +0.3 / −0.1
  - Order: Clash, Match, Defer
  - Match: “Read the ground and call the lanes—join me.”
  - Clash: “Skip the scouting—we just need brute force.”
  - Defer: “Not now, Twil.”

- Tin (Playful) — +0.3 / −0.1
  - Order: Match, Clash, Defer
  - Match: “Set the beat—keep our hands moving.”
  - Clash: “We need slow and steady, not fast.”
  - Defer: “Later, Tin.”

- Nellis (Steady) — +0.3 / −0.1
  - Order: Clash, Match, Defer
  - Match: “Keep the line; I’ll lead—you hold.”
  - Clash: “I’m chasing speed and chaos today.”
  - Defer: “Hold that thought, Nellis.”

- Urn (Nurturing) — +0.4 / 0
  - Order: Match, Clash, Defer
  - Match: “Let’s lift the streets—walk with me.”
  - Clash: “I need a hard hitter, not a cheer.”
  - Defer: “We’ll come back to this, Urn.”

- Varabella (Practical) — +0.4 (override) / −0.15
  - Order: Clash, Match, Defer
  - Match: “I want sharp eyes—call angles and cover.”
  - Clash: “Save the angles; just swing hard.”
  - Defer: “Later, Varabella.”

- Cowsill (Playful/Steady lean) — +0.3 / −0.05
  - Order: Match, Clash, Defer
  - Match: “Be my strike partner—let’s double every hit.”
  - Clash: “We actually need a healer more than damage.”
  - Defer: “Another time, Cowsill.”

- Fana (Exacting) — +0.6 / −0.1
  - Order: Clash, Match, Defer
  - Match: “You’re free—burn what clings. Walk with me.”
  - Clash: “We need cold precision, not heat.”
  - Defer: “Rest first, Fana.”

- Snek (Nurturing lite) — +0.2 / 0
  - Order: Match, Clash, Defer
  - Match: “Coil close and slow our foes.”
  - Clash: “I was hoping for… thumbs.”
  - Defer: “Curl up for now, Snek.”

## Flags & Persistence
- VN seen: managed via existing VN system (`runtime.vnSeen[id]`).
- Defer flag: `<name>_intro_deferred` set on the Defer option.
- One‑time affinity flags (reused to prevent double‑grants):
  - canopy_intro_encourage
  - yorna_intro_encourage
  - hola_intro_encourage
  - oyin_intro_encourage
  - twil_intro_encourage
  - tin_intro_encourage
  - nellis_intro_encourage
  - urn_intro_encourage
  - varabella_intro_respect
  - cowsill_intro_team
  - fana_intro_reassure
  - snake_intro_encourage (new, reserved)

Feud/Truce Flags (reference)
- `canopy_yorna_feud_active`, `canopy_yorna_choice`, `canopy_yorna_feud_resolved` — Level 2 event flow.
- `canopy_yorna_respect` — truce unlocks riding together; also lifts soft affinity cap applied while together without respect.

## Data Model (proposed; no code in this doc)
- `temperamentByCompanion`: `{ canopy: 'nurturing', yorna: 'exacting', ... }`
- `temperamentProfiles`: per‑type defaults `{ match, clash, defer, gateShift }` with optional ranges for later dialog beats.
- `introOptions`: per‑companion `{ match: { label, delta, flag }, clash: { label, delta }, defer: { label } }` for VN triads.
- Dialog extensions (future): allow choices to carry `tone: 'match'|'clash'` so the renderer infers deltas from temperament when `affinity_add` is omitted.

## Integration Plan (when implementing)
1) Content data
   - Add `temperamentByCompanion` and `temperamentProfiles` (new small data file).
   - Add `introOptions` entries using the lines and deltas above.
2) VN intro
   - On spawn for each recruitable NPC, attach `vnOnSight` with `tree` composed from `introTexts[<key>]` + `introOptions[<key>]` (Match/Clash/Defer wiring).
   - Match/Clash apply `affinity_add` with the specified delta and a once‑flag prior to `join_party`.
   - Defer sets `<name>_intro_deferred` and `end`.
3) Flags/persistence
   - Reuse existing intro once‑flags; add `snake_intro_encourage` only.
   - Ensure `vnSeen` and transient intro state persist/clear per current VN system.
4) Later dialog (optional next phase)
   - Support `tone` in choice nodes; if present and no explicit `affinity_add`, apply temperament defaults.
   - Allow scene overrides for special beats (e.g., Fana +0.6 moments).
5) Bond gating (optional)
   - Apply `gateShift` when node min is not explicitly set (gentle −, exacting +).

## Cross‑System Hooks (future)
- Barks/banter: temperament‑specific lines on Match/Clash; e.g., Exacting snaps, Nurturing reassures.
- Quest framing: Nurturing leans protect/aid; Practical prefers concise strike/utility; Playful likes tempo/fun; Steady holds lines; Exacting surgical challenges.
- Combat tuning (optional): unlock strongest trigger variants earlier (Nurturing/Playful), later (Exacting), neutral (Steady/Practical).
- Synergy hints: temperament pairs can unlock small banter or micro‑affinity moments.

## QA Checklist (when shipping)
- First‑sight VN appears once per companion; cool‑down respected; seen flags persist.
- Party full replacement flow works from Match/Clash recruit.
- Defer closes VN, sets `<name>_intro_deferred`, leaves normal talk intro intact.
- Affinity deltas apply once; flags prevent double‑granting with talk intros.
- Negative affinity never blocks recruitment; values clamp to [1,10].
- Mobile/touch selection works; number keys map correctly; audio cues sane.

## Open Questions
- Finalize exact clash penalties for Steady/Playful (−0.05 vs −0.1) per character.
- Keep Varabella’s +0.4 override under Practical, or normalize to +0.3?
- Apply bond gate shifts globally by temperament, or only for specific bond nodes?
- Localizations: confirm brevity targets for triad labels (< ~60 chars) across languages.
