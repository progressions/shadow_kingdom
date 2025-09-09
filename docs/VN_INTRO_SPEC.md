# VN Intro on First Appearance — Specification

This document specifies the “visual novel (VN) intro on first appearance” feature for NPCs (including companions and enemies like the boss). It describes UX, data model, trigger rules, lifecycle, UI/UX details, persistence, and integration points.

## Goals

- Automatically present a short VN dialog the first time a flagged character enters the player’s view.
- Ensure the character is clearly visible (camera centers and a subtle pre-intro cue) before the VN opens.
- Avoid gameplay soft-locks; always resume control after the VN closes.
- Work for any entity type (NPCs, companions, enemies) via an opt‑in config.

## User Experience

1) Player moves; a flagged character first enters the camera view.
2) The game briefly “spotlights” the character (0.5–1.0s):
   - Camera centers on the character.
   - Character sprite subtly flickers and/or a soft pulse highlights them.
   - Gameplay simulation is frozen during this cue (inputs ignored for this short window only).
3) VN overlay opens with the character’s portrait, name, and configured dialog tree.
4) Player makes a choice; VN closes.
5) Game reliably resumes; camera returns to the player (instantly or via a short smooth pan).
6) The intro never triggers for this character again (persisted across saves).

## Triggering Rules

- Opt-in per entity via `vnOnSight` config.
- Fires when all are true:
  - `runtime.gameState === 'play'` (no menus/VN currently open).
  - No other pre-intro is in progress and no camera pan transition is running.
  - The entity is within the camera’s viewport.
  - The entity’s intro has not been seen before (checked via persisted flag).
  - Cooldown (e.g., 1s) since the last intro has elapsed.
- Only one pre-intro may start per frame.
- If multiple flagged entities enter view at once, the first one found triggers; the rest wait for cooldown.

## Configuration (per entity)

Add an optional `vnOnSight` object when spawning:

```
{
  tree: DialogTree,          // required; standard dialog tree { start, nodes }
  name?: string,             // optional display name override
  portrait?: string,         // optional portrait path override
  lock?: boolean,            // if true, Esc/click cannot close the VN; a choice must end it
  preDelaySec?: number,      // spotlight duration before opening VN (default 1.0)
  id?: string                // stable ID for persistence; fallback uses entity name
}
```

Examples:

```
spawnNpc(x, y, 'down', {
  name: 'Scholar',
  portrait: 'assets/portraits/Scholar.png',
  sheet,
  vnOnSight: {
    tree: scholarIntroTree,
    name: 'Scholar',
    portrait: 'assets/portraits/Scholar.png',
    lock: true,
    preDelaySec: 0.8,
    id: 'npc_scholar_01'
  }
});
```

## Runtime State

- `runtime.preIntro: { actorRef, conf, t } | null` — active spotlight countdown.
- `runtime.freezeWorld: boolean` — freeze simulation during pre-intro only.
- `runtime.introCooldown: number` — seconds until another intro may start.
- `runtime.cameraPan: { fromX, fromY, toX, toY, t, dur } | null` — optional smooth pan back to the player after VN.
- `runtime.vnSeen: Record<string, boolean>` — persisted map of which `id`s have been shown (see Persistence).

## Persistence

- Save `runtime.vnSeen` in the game payload (e.g., under `meta.vnSeen`).
- On load, restore into `runtime.vnSeen`.
- ID derivation:
  - Use `vnOnSight.id` if provided.
  - Else use a stable key from entity name (lowercased) and type, e.g., `npc:scholar`.
  - Boss may have a fixed ID, e.g., `enemy:boss`.

## Lifecycle Flow

```mermaid
flowchart TD
  visible[Entity enters camera view] --> check{Eligible?}
  check -- seen/cooldown/overlay --> wait[Do nothing]
  check -- ok --> spot[Start pre-intro]
  spot --> freeze[freezeWorld = true; preIntro = {t = preDelaySec}]
  freeze --> cue[Center camera; draw pulse/flicker]
  cue --> open{t <= 0?}
  open -- no --> cue
  open -- yes --> vn[Open VN overlay]
  vn --> play[Gameplay resumes when VN closes]
  play --> pan[Optional smooth camera pan back to player]
  pan --> done[Set vnSeen[id] = true; set cooldown]
```

## UI/Rendering

- Spotlight cue:
  - Camera centers on entity each frame during pre-intro.
  - Draw a subtle pulsing ring and/or sprite flicker.
  - Duration: `preDelaySec` (default 1.0s).
- VN overlay:
  - Use the existing VN UI (`enterChat`, `setOverlayDialog`, `exitChat`).
  - If `lock = true`, do not allow Esc/click exit (only a choice with `action: 'end'` closes it).
- Camera return:
  - On VN close, pan camera back to the player over 0.4–0.7s with ease-in/out.
  - Gameplay must be fully resumed during this pan.

## Input/Audio Behavior

- Pre-intro (freeze window):
  - Ignore all inputs (Esc, B, movement, etc.).
  - Do NOT open pause menu.
  - Optionally duck music by ~3 dB or play a short sting.
- VN overlay:
  - Standard VN input rules apply (number keys, arrows, Enter, clicks).
  - If `lock = true`, ignore Esc/click to close.
- Post-VN:
  - Fully restore inputs.

## Reliability Requirements (No Soft-Lock)

- Always clear `freezeWorld` when opening the VN and again when closing it (double-safety).
- On `exitChat`, always:
  - Clear any leftover `preIntro` state.
  - Start camera pan back to player (or snap if very close).
  - Set `introCooldown` (e.g., 0.8–1.2s).
- On any choice (`selectChoice`), also clear `freezeWorld`/`preIntro` defensively before executing actions.
- On step loop, do not start new intros while `preIntro` or `cameraPan` is active.

## API/Code Integration Plan

1) State additions in `src/engine/state.js`:
   - Add `runtime.preIntro`, `runtime.freezeWorld`, `runtime.cameraPan`, `runtime.introCooldown`, `runtime.vnSeen`.

2) Spawner support in `src/engine/state.js`:
   - Add optional `vnOnSight` to `spawnNpc`, `spawnCompanion`, `spawnEnemy` (stored on the entity).

3) Step loop in `src/systems/step.js`:
   - If `runtime.gameState !== 'play'`: skip.
   - If `preIntro`: decrement `t`, center camera, render cue, and when `t <= 0` → open VN, clear freeze.
   - Else: try to start a pre-intro if eligible (see Triggering Rules).
   - Manage camera pan back to player when active.
   - Decay `introCooldown`.

4) VN helpers in `src/engine/dialog.js`:
   - Add `startCustomDialog(actorLike, tree)`.
   - In `selectChoice` and `exitChat`, clear freeze/preIntro (backstop) and schedule camera pan if needed.

5) Rendering in `src/engine/render.js`:
   - Draw pulse around `runtime.preIntro.actorRef` each frame.
   - Optional flicker on that sprite while `preIntro` is active.

6) Input in `src/engine/input.js`:
   - If `freezeWorld && preIntro`: ignore all inputs.
   - Otherwise, standard input flows.

7) Save/Load in `src/engine/save.js`:
   - Persist `runtime.vnSeen` inside the payload.
   - Clear any transient `preIntro`, `freezeWorld`, and `cameraPan` on load.

## Edge Cases

- Multiple flagged entities visible: only the first triggers; others wait.
- Actor despawns during pre-intro: cancel pre-intro and do nothing.
- Saving during VN/pre-intro: on load, ensure world is unfrozen; do not auto-reopen VN.
- Lock intros: ensure at least one choice ends the VN; avoid dead-ends.
- Mobile/touch: ensure tap works for VN choices; highlight box remains non-intrusive.

## Acceptance Criteria

- [ ] A flagged NPC triggers a pre-intro cue and VN exactly once.
- [ ] During the cue, inputs are ignored and the actor is centered and highlighted.
- [ ] VN opens after the cue, portrait/name display correctly.
- [ ] On close, the game resumes immediately and camera returns to the player (ease or snap).
- [ ] No soft-locks: movement works after any choice path.
- [ ] Cooldown prevents back-to-back intros; other flagged entities can trigger later.
- [ ] Seen flags persist across save/load.

## Non-Goals (for v1)

- No queued intros; only nearest/first wins.
- No dynamic pathfinding or cinematic movement; camera only.
- No audio voice-over; just SFX/music tweaks.

