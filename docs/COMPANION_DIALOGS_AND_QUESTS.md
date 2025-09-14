Companion Dialog Trees and Quest Paths

This document explains how companion conversations and quests are modeled in Shadow Kingdom, using Canopy’s storyline as a concrete example. It covers the dialog tree schema, affinity gating, quest flags/counters, UI hints, persistence, and practical templates for adding new content for companions.

1) Dialog Trees: Structure and Conventions

- Source: `src/data/companion_dialogs.js`
- Shape per companion:
  - Keyed by lowercase name in `companionDialogs`.
  - Each entry: `{ start: 'root', nodes: { <id>: { text, choices } } }`.
- Node fields:
  - `text`: String displayed in the VN overlay.
  - `choices`: Array of choice objects. Order is the on‑screen order (1–9 hotkeys).
- Choice fields:
  - `label`: Display text.
  - `next`: Node id to go to after selecting (optional if using an `action`).
  - `action`: Optional behavior; supported values include:
    - `companion_back` (reopen the companion selector)
    - `companion_talk` (open companion-specific dialog tree)
    - `dismiss_companion` (with confirmation)
    - `open_inventory`
    - `end` (close overlay)
    - `join_party` (for NPC -> recruit flow; not used inside companion trees)
    - `affinity_add` (see Affinity below)
    - `set_flag` (set a quest/logic flag)
    - `start_quest` (see Quests below)
  - `data`: Optional payload for actions. Examples:
    - For `affinity_add`: `{ target: 'active'|'canopy'|'<name-substr>', amount: <number>, flag?: '<once-flag>' }`
    - For `start_quest`: `{ id: '<quest_id>' }`
  - `requires`: Optional gate to show/hide choices. Supported keys:
    - Affinity gate: `{ target?: 'active'|'<name-substr>', min?: number, max?: number }`
    - Flag gate: `{ flag: '<flag>', not?: true }` — show if flag present (or absent if `not:true`).
    - Presence/absence gates: `{ hasFlag: '<flag>' }`, `{ missingFlag: '<flag>' }`.

Notes on ‘active’ targeting
- `target: 'active'` gates against the currently active actor in the dialog (the companion you’re talking to). It does not fall back to other companions.

2) Affinity: Values and Gating

- Range: Numeric ~1.0 to 10.0 per actor.
- UI: Hearts in party UI; shows numeric value (rounded) for debugging.
- Increment: `affinity_add` action updates affinity and sets an optional once-only flag to avoid double awards.
- Implementation:
  - Handler: `handleAffinityAdd` in `src/engine/dialog.js`.
  - One-time prevention: `runtime.affinityFlags[<flag>] = true`.
  - UI refresh: `updatePartyUI(companions)` ensures hearts/number update immediately.
- Typical thresholds used in content:
  - 6.0 → mid bond (“Open up”).
  - 8.0 → deeper bond.
  - 9.5 → strong promise level.

3) Quests: IDs, Flags, Counters, and Flow

- Start: Choice with `action: 'start_quest', data: { id }`.
- Flags & counters:
  - `runtime.questFlags` store boolean flags.
    - Conventional names: `<id>_started`, `<id>_cleared`, and `<id>_done` for staged flow.
  - `runtime.questCounters` store numeric counters for progress (e.g., remaining kills or uses).
- Start handler: `handleStartQuest` in `src/engine/dialog.js`.
  - Sets `<id>_started` true.
  - Initializes relevant counters.
  - Optionally spawns targeted enemies around player using `spawnEnemy(..., { questId: id })`.
- Progress tracking:
  - Kill-based: in `src/systems/step.js` where enemies are removed, decrement `questCounters[...]` based on `e.questId` and set `<id>_cleared` when reaching zero; show a banner.
  - Ability usage or mixed challenges: track in subsystem (e.g., `src/systems/step.js` for Hola and Oyin) and set `<id>_cleared` when conditions met.
- UI hint: `updateQuestHint()` in `src/engine/ui.js` reads `questFlags` + `questCounters` to show a contextual message at the top.
- Turn‑in: A companion dialog node gated by `{ flag: '<id>_cleared' }`, awarding affinity and moving to a `*_done` node that sets a `<id>_done` flag.

Level gating (optional)
- Level-reach flags are set when a level loads: `level2_reached`, `level3_reached` (in `src/engine/levels.js`).
- Use `requires: { hasFlag: 'levelN_reached' }` to reveal quests only after the player has seen that level.

4) Persistence

- Serialized in `src/engine/save.js`:
  - Companion `affinity`, `level`, `xp`.
  - `runtime.affinityFlags` and `runtime.questFlags` are saved as key arrays and restored on load.
  - Companions/NPCs are respawned with appropriate dialogs.

5) Canopy: Implemented Example

- Baseline conversation:
  - Root choices include support, mood, bond gates at 6/8/9.5, and quests.
  - New personal story branch: “Tell me about your sister.” → two choices with one‑time affinity bumps.

- Quest A (Level-agnostic): Breath and Bandages
  - ID: `canopy_triage`.
  - Start spawns three `Snare` enemies (mooks) with `questId: 'canopy_triage'`.
  - Step decrement in `src/systems/step.js`; sets `canopy_triage_cleared` when 0.
  - Turn-in gives +0.8 affinity; sets `canopy_triage_done`.

- Quest B (Level 2): Ribbon in the Dust
  - ID: `canopy_sister2`.
  - Gate: `{ hasFlag: 'level2_reached' }` and not already started.
  - Start spawns three “Urathar Scout” featured foes with `questId: 'canopy_sister2'`.
  - Counter: `canopy_sister2_remaining` decremented on kill; sets `canopy_sister2_cleared` at 0.
  - Turn-in grants +1.0 affinity; sets `canopy_sister2_done`.

- Quest C (Level 3): Reeds and Echoes
  - ID: `canopy_sister3`.
  - Gate: `{ hasFlag: 'level3_reached' }` and not already started.
  - Start spawns three “Marsh Whisperer” mooks with `questId: 'canopy_sister3'`.
  - Counter: `canopy_sister3_remaining` decremented on kill; sets `canopy_sister3_cleared` at 0.
  - Turn-in grants +1.2 affinity; sets `canopy_sister3_done`.

6) Template: Adding a New Companion Quest

Dialog nodes (in `src/data/companion_dialogs.js`):
- In companion’s `root` (or `quests`) add entries:
  - Start: `{ label: '<Quest Name>', requires: { ... }, next: '<id>_intro' }`
  - Turn-in: `{ label: 'Turn in: <Quest Name>', requires: { flag: '<id>_cleared' }, next: '<id>_turnin' }`
- Add nodes:
  - `<id>_intro`: explains quest; includes `{ action: 'start_quest', data: { id: '<id>' }, next: '<id>_started' }`.
  - `<id>_started`: simple acknowledgement.
  - `<id>_turnin`: awards affinity with `affinity_add` and moves to `'<id>_done'`.
  - `<id>_done`: sets a `<id>_done` flag with `set_flag` and returns.

Start logic (in `src/engine/dialog.js`):
- In `handleStartQuest`, add a case for your `<id>`:
  - Initialize `runtime.questCounters[...]`.
  - Optionally spawn enemies near player with `questId: '<id>'`.
  - Set banner text, set `'<id>_started'` in `questFlags`.

Progress tracking (in `src/systems/step.js`):
- When removing an enemy, if `e.questId === '<id>'`:
  - Decrement the relevant counter, set `'<id>_cleared'` at 0, and show a banner.

UI hint (in `src/engine/ui.js`):
- Add a block in `updateQuestHint()` that reads the new flags/counters and formats a one‑line hint when the quest is active.

Gating & Flags:
- Use level‑reach flags (`levelN_reached`) or prior quest flags (`<other_id>_done`) to sequence content.
- Keep one-time reward flags for `affinity_add` (e.g., `<id>_reward`) to avoid double‑granting via repeat turn-ins.

7) Naming and Content Style

- IDs: snake_case, namespace by companion when sensible (e.g., `canopy_triage`, `canopy_sister2`).
- Flags: lifecycle suffixes `_started`, `_cleared`, `_done`; plus reward flags like `*_reward` and story crumbs as needed.
- Labels: short, evocative quest names that hint at goal/theme.
- Text: keep to one or two lines per node for readability; keep choices brief.

8) Notes & Gotchas

- Active actor gating: `target: 'active'` only checks the actor you’re speaking to; it does not try to match other companions.
- UI refresh: affinity changes call `updatePartyUI(companions)` so hearts/numbers reflect gating immediately.
- Save/Load: make sure any new flags your content relies on are set via `set_flag`/`start_quest` so they persist.
- Enemy spawns: place them far enough from the player to avoid instant aggro if that suits the quest pacing.

Appendix: Quick Reference

- Files to touch when adding a quest:
  - Dialog: `src/data/companion_dialogs.js`
  - Start logic: `src/engine/dialog.js` (`handleStartQuest`)
  - Progress tracking: `src/systems/step.js`
  - UI hint (optional): `src/engine/ui.js`
  - Level gating flag (optional): `src/engine/levels.js`

---

9) Level 2 Feud — Canopy vs Yorna (Join/Dismiss Flow)

Goal
- Teach strategic choice via party composition: Canopy (protection) vs Yorna (aggression). Push the player toward recruiting Oyin/Twil as counters to Nethra.

Event
- Trigger: On `level2_reached`, if both Canopy and Yorna are in `companions` and no prior resolution, queue a short VN where they clash; the player must choose who stays.
- Outcome: The chosen companion remains; the other is dismissed using the existing `dismiss_companion` action.

State & Flags
- `canopy_yorna_feud_active`: set when the event begins.
- `canopy_yorna_choice`: `'canopy' | 'yorna'` set on selection.
- `canopy_yorna_feud_resolved`: set after dismissal and VN close.
- Truce (later): `canopy_yorna_respect` allows both to join together again and removes refusal gates.

Dialog Gating (join/refusal)
- While feud unresolved:
  - Canopy’s Join requires Yorna not in party: `requires: { partyMissing: 'yorna' }`.
  - Yorna’s Join requires Canopy not in party: `requires: { partyMissing: 'canopy' }`.
- Provide an alternate refusal node gated by `requires: { partyHas: 'yorna', missingFlag: 'canopy_yorna_respect' }` (and vice‑versa):

Example (pseudo‑nodes)
```
// Inside Canopy tree
{ label: 'Yes, join me.', requires: { partyMissing: 'yorna' }, action: 'join_party' },
{ label: 'We need to cool this first', requires: { partyHas: 'yorna', missingFlag: 'canopy_yorna_respect' }, next: 'canopy_refuses_while_yorna' },

// Inside Yorna tree
{ label: 'Yes, join me.', requires: { partyMissing: 'canopy' }, action: 'join_party' },
{ label: 'We settle this later', requires: { partyHas: 'canopy', missingFlag: 'canopy_yorna_respect' }, next: 'yorna_refuses_while_canopy' },
```

VN Choice Wiring (sketch)
- Build a small VN tree with two choices. On select, call the existing flow with concrete `data` refs:
```
{ label: 'Keep Canopy',  action: 'dismiss_companion', data: <yornaRef>,  next: 'vn_done' }
{ label: 'Keep Yorna',   action: 'dismiss_companion', data: <canopyRef>, next: 'vn_done' }
```
- After the action, set flags and call `updatePartyUI(companions)`; VN closes to resume play.

Affinity Penalty (on dismissal)
- Apply a one‑time negative affinity to the dismissed companion:
  - Yorna: −1.0 (takes it more personally)
  - Canopy: −0.6 (steadier reaction)
- Persist by copying the updated affinity onto the spawned NPC so re‑recruiting preserves the state.

Notes
- `dismiss_companion` in `src/engine/dialog.js` supports passing the exact companion object in `data`.
- All flags live in `runtime.questFlags` and are already persisted by the save system.
