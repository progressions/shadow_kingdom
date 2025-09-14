# Temple Hub Plan — Aurelion “Heart of the Temple”

This document details the post‑Level 5 flow where defeating Vorthak rescues Canopy’s sister and converts the Heart of the Temple into a player hub for future adventures. The hub becomes the central place to recruit companions, start quests that launch into new levels, and (later) access services.

## Story Beats (High Level)

– Vorthak (Urathar’s servant) has captured and enslaved Fana and holds Canopy’s sister, Ell.
- Defeating Vorthak (triple‑phase boss) breaks the sigils and rescues Canopy’s sister (Ell).
– The Heart of the Temple in Aurelion is cleansed and re‑occupied by the heroes — this area becomes a Hub.
- In the Hub, players can recruit allies, manage party (max 3 companions), and take new quests that launch to new levels.

## Design Goals (Hub)

- Safe, beautiful “Temple of Aurelion” space with no combat.
- Companions placed as NPCs around the map — talk, recruit/dismiss, start hub quests.
- Quest launches transition to bespoke quest levels (7+); defeating the target returns you to the Hub.
- Party management with cap 3; later add quality‑of‑life swap flow when full.
- Services staged for later: Quest Board, Vendor, Stash, and Fast Travel.

## Game Flags

- `canopy_sister_captured` — optional, set on first arrival to Level 5 for flavor gating.
- `canopy_sister_rescued` — set when Vorthak is defeated (after final form).
- `temple_cleansed` — set on Vorthak’s final defeat (cleansed variant unlocked).
- `hub_unlocked` — set on Vorthak’s final defeat; enables hub loader.
- `level6_reached` — set when Level 6 loads; used to gate hub‑specific dialog.
- `level7_reached`, `level8_reached`, `level9_reached` — set when those quest levels load; used for progressive content and follow‑ups.

All flags persist via `runtime.questFlags` and are included in saves.

## Level Flow

- Level 5 (Heart of the Temple — combat):
  - Player approaches arena; Fana (featured, enslaved) outside drops `key_temple`.
  - Gate opens to Vorthak’s arena. Vorthak has triple‑phase flow.
  - On final defeat: set `canopy_sister_rescued`, `temple_cleansed`, `hub_unlocked`; queue Ell VN; transition to Level 6.

- Level 6 (Hub: “Temple of Aurelion” — clean variant):
  - No combat or hazards; Temple music; title overlay.
  - Ell present near center; companions positioned around the temple.
  - Dialog actions allow recruiting/dismissing, starting quests, and later using services.

- Levels 7–9 (Quest Launches):
  - Small, focused levels launched from hub quests. Defeat target/boss → return to Level 6.
  - Each sets its own `levelN_reached` flag on load.

## Maps

- Combat Arena (Level 5): `assets/temple_heart.json` — marble walls, columns, hazards, boss gate.
- Hub Map (Level 6): `assets/temple_heart_clean.json` — cleaned version without hazards, with NPC/service spots.

Both maps use 1‑tile = 16 px. Hub hall target size ≈ 40×24 tiles (w×h) inside a ~60×40 world so there’s breathing room.

Fallback (current): `loadLevel6()` builds a clean marble perimeter and columns procedurally until JSON assets land.

## Music & Atmosphere

- On Level 6 load: set Temple theme; force “peaceful” mode (no danger escalation in hub).
- Short sting on quest launch and on return from quest.

## Hub NPC Layout (Companions)

Companions appear as NPCs in the hub when they are not currently in your party and their unlock gate has been reached. Use a single source‑of‑truth array in Level 6 for positions and gates.

Suggested placements (tile coordinates within the main hall rectangle):

- Center: Ell (sister) — `pos: (centerX, centerY - 8T)`; appears when `canopy_sister_rescued`.
- North alcove left: Canopy — early healer; appears when `level1_reached`.
- North alcove right: Yorna — striker; appears when `level1_reached`.
- East wing: Oyin, Twil — `level2_reached`.
- South alcove: Tin, Nellis — `level3_reached`.
- West wing: Urn, Varabella — `level4_reached`.
- Entry hall (near bottom): Cowsill — `level5_reached`.

Rules:
- If a companion is in party, do not spawn their hub NPC (avoid duplicates).
- Talking to a companion NPC opens companion dialog; “Join” respects party cap 3.
- When dismissed from party, they are converted back to an NPC near a free tile in the hub.
- Respect Level 2 feud gating: until `canopy_yorna_respect` is earned, Canopy will not join while Yorna is in party, and vice‑versa.

Data sketch (pseudo):

```js
const HUB_COMPANIONS = [
  { name: 'Canopy',    gate: 'level1_reached',  pos: { tx: 12, ty: 8 },  dialogId: 'canopy',    portrait: 'assets/portraits/level01/Canopy/Canopy.mp4' },
  { name: 'Yorna',     gate: 'level1_reached',  pos: { tx: 28, ty: 8 },  dialogId: 'yorna',     portrait: 'assets/portraits/level01/Yorna/Yorna.mp4' },
  { name: 'Hola',      gate: 'level1_reached',  pos: { tx: 36, ty: 10 }, dialogId: 'hola',      portrait: 'assets/portraits/level01/Hola/Hola.mp4' },
  { name: 'Oyin',      gate: 'level2_reached',  pos: { tx: 40, ty: 14 }, dialogId: 'oyin',      portrait: 'assets/portraits/level02/Oyin/Oyin.mp4' },
  { name: 'Twil',      gate: 'level2_reached',  pos: { tx: 44, ty: 16 }, dialogId: 'twil',      portrait: 'assets/portraits/level02/Twil/Twil.mp4' },
  { name: 'Tin',       gate: 'level3_reached',  pos: { tx: 12, ty: 16 }, dialogId: 'tin',       portrait: 'assets/portraits/level03/Tin/Tin.mp4' },
  { name: 'Nellis',    gate: 'level3_reached',  pos: { tx: 20, ty: 18 }, dialogId: 'nellis',    portrait: 'assets/portraits/level03/Nellis/Nellis.mp4' },
  { name: 'Urn',       gate: 'level4_reached',  pos: { tx: 24, ty: 20 }, dialogId: 'urn',       portrait: 'assets/portraits/level04/Urn/Urn.mp4' },
  { name: 'Varabella', gate: 'level4_reached',  pos: { tx: 32, ty: 20 }, dialogId: 'varabella', portrait: 'assets/portraits/level04/Varabella/Varabella.mp4' },
  { name: 'Cowsill',   gate: 'level5_reached',  pos: { tx: 28, ty: 22 }, dialogId: 'cowsill',   portrait: 'assets/portraits/level05/Cowsill/Cowsill.mp4' },
];
```

## Dialog Actions (Hub Extensions)

Add/extend VN actions to support quest launching and smoother party management:

- `goto_level` — Transition to a level by index.
  - Data: `{ level: number, setFlags?: string[], questId?: string }`.
  - Behavior: sets optional flags, optionally `*_started` for `questId`, then sets `runtime.pendingLevel = level` and closes VN.

- `join_party` (existing) — Enforce cap 3; if full, show notice.
  - Nice‑to‑have: `swap_companion` composite flow: when full, offer to select a companion to dismiss and immediately add the new one.

## Hub Quests → Launch Levels (First Slice)

Implement 2–3 hub‑launched quests to exercise the flow. Each quest:
- Starts from a companion’s dialog in the hub.
- Calls `start_quest` to set counters/flags, then `goto_level` to enter the quest level.
- The target defeat sets `<id>_cleared` and returns to hub via `onDefeatNextLevel: 6`.

Proposed first three quest levels:

### Level 7 — Greenwood Expedition (Forest follow‑up)
- Theme: Forest redux with denser cover; companions: Canopy/Yorna fit well.
- Enemies: 6–8 mooks + 1 featured guardian.
- Boss/Target: “Vinebound Sentinel” (featured or mini‑boss).
- Gatekeeping: Set `level7_reached` on load.
- On target defeat: set relevant `<id>_cleared` and `onDefeatNextLevel: 6`.

### Level 8 — Sunbreak Echo Caverns (Cave/Desert follow‑up)
- Theme: Cavern pockets under desert; tight lanes with occasional larger rooms.
- Enemies: 8–10 mooks; 2 featured “Echo Stalkers”.
- Boss/Target: “Echo Matron” with enrage + gust triggers.
- Gatekeeping: Set `level8_reached` on load; optional `ribbon_pedestal` hook reuse.
- Return: `onDefeatNextLevel: 6`.

### Level 9 — Reedmarsh Depths (Marsh follow‑up)
- Theme: Marsh islands with bridges; slow zones for enemies.
- Enemies: 6–8 mooks; 1 featured “Marsh Whisperer Captain”.
- Boss/Target: “Bog Warden”.
- Gatekeeping: Set `level9_reached` on load.
- Return: `onDefeatNextLevel: 6`.

Notes:
- Add level descriptors for 7–9 in `src/engine/level_descriptors.js` (gates/chests/uniqueActors ids) so saves can apply deltas deterministically.
- Start with procedural terrain like earlier levels; swap to JSON maps later if desired.

## Companion Dialog Integration

In `src/data/companion_dialogs.js` add hub entries per companion:

- In companion’s `quests` node (or `root` if simpler):
  - Start line → `{ action: 'start_quest', data: { id: '<companion_id_l7>' }, next: '..._started' }`.
  - Followed by → `{ action: 'goto_level', data: { level: 7, questId: '<companion_id_l7>' }, actionLabel: 'Launch' }`.
  - Turn‑in (in hub) gated by `{ flag: '<id>_cleared', missingFlag: '<id>_done' }` → awards affinity, sets `<id>_done`.

Gating examples:
- Show Level 7 quest if `hasFlag: 'hub_unlocked'`.
- Show Level 8 follow‑up only if `hasFlag: 'level7_reached'` (or `<id>_done` from L7).

## Party Cap & Swap (QOL)

- Maintain party cap at 3 (already enforced by `join_party`).
- Enhancement (optional): when attempting to recruit at cap:
  - Show menu “Swap someone out for <Name>?”
  - If yes: show a list of current companions → dismiss selected → immediately recruit NPC.
  - This can be modeled as a VN action `swap_companion` or a short flow composed of existing `dismiss_companion` + `join_party` with state carried.

## Save / Load Considerations

- All flags used for hubs/quests (e.g., `hub_unlocked`, `levelN_reached`, `<id>_started/_cleared/_done`) are already persisted by the save system.
- Ensure new levels (7–9) have descriptors to stabilize gates/chests/unique actors.
- When loading into Level 6, do not spawn hub NPC duplicates for companions present in party; rely on runtime presence check.

## Acceptance Criteria (Phase 1)

- After defeating Vorthak, the game transitions to Level 6; Ell VN appears; Temple music plays.
- Hub shows at least 6 companions as NPCs (gated by previously reached levels); party recruitment/dismissal works; party cap enforced.
- Two hub quests are available and launch into Level 7/8; defeating their targets returns to Level 6 automatically; turn‑ins award affinity and set `_done`.
- Save/Load preserves hub state, flags, and mid‑quest progress.

## Phase 2 — Services & QoL

- Quest Board: central altar offering rotating or repeatable quests; acts like a multi‑NPC dispatcher.
- Vendor: simple buy/sell VN; currency as a stackable item; inventory refresh over time.
- Stash: shared stash accessible in hub; simple UI for moving items between player and stash.
- Fast Travel: unlock travel to earlier biomes; returns always back to Level 6.
- Companion Swap Flow: implement the one‑click swap at party cap.

## Phase 3 — Content Expansion

- Multi‑stage companion quest chains from the hub with escalating challenge and mechanics (timed runs, defense, bait‑boss, levers/puzzles).
- Special bond scenes in hub gated by affinity thresholds (6.0, 8.0, 9.5).
- Trial arenas with modifiers (enhanced enemy auras, limited heals, speedrun medals).

## Open Art/Content Needs

- Clean hub map asset: `assets/temple_heart_clean.json` (tile art, deco, service spots).
- Portraits for Ell and any new bosses/targets in levels 7–9.
- Optional shrine/altar sprites for Quest Board and Fast Travel nodes.

## Implementation Notes (Current Status)

- Boss defeat hook (Vorthak, L5) sets flags and stashes a pending Level 6 transition after the defeated VN (implemented in `src/systems/step.js`).
- Level 6 hub loader exists as a placeholder (clean marble space, Ell NPC). Expand to spawn companions from a data table with gating.
- Add `goto_level` VN action in `src/engine/dialog.js` to support hub → quest transitions.
- Define `loadLevel7/8/9()` in `src/engine/levels.js`; wire into `LEVEL_LOADERS`; set `onDefeatNextLevel: 6` on targets.
- Ensure music system sets Temple theme and forces peaceful mode while in Level 6.
