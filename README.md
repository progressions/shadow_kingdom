Shadow Kingdom (HTML5 Canvas)

Run by opening index.html directly in your browser. No installs or build steps required.

Controls:
- Move: WASD or Arrow Keys
- Toggle grid: G
- Attack: J (Space will attack if not interacting)
- Interact with NPC: Space (when facing and in range)
- VN dialog: Click a choice or press number keys (1–9). Esc or click canvas to exit.
- Open companion menu: C (choose a companion to talk to or dismiss)
  - If you have none, a brief banner appears instead of opening the menu.
  - Companions cannot be talked to directly in the world; manage them via C.
- Save/Load menu: P (open menu with Save Slot 1–3, Load Slot 1–3, Clear Slot 1–3, Close)
  - Quick Save: F6 (or Ctrl+S)
  - Quick Load: F7
  - Toggle Autosave (60s) at the top of the menu.
- Audio: M to mute/unmute; B to toggle background music.
- Inventory: I opens Inventory (choose Player/Companion, view equipment, equip/unequip items).
- Game Over: If HP reaches 0 in the overworld, a Game Over screen appears with options to Load Slot 1–3 or Restart the game.

Notes:
- Canvas internal resolution is 320x180 for a pixel-art look, scaled to 960x540.
- Sprite is generated procedurally at runtime to avoid external assets.
- Larger scrolling world with procedurally generated terrain; the camera follows the player.
- One enemy spawns and chases you; hit it to defeat it.
- Start with zero companions. You can recruit Canopy via dialog.
- Three NPCs near the start (non-hostile): Canopy (brown hair, pink dress), Yorna (red hair, orange dress), Hola (black hair, blue dress).
- VN overlay replaces the sidebar; dialog text and choices appear over the game.
  - Each NPC has unique dialog and can join your party on request.
  - You can have up to 3 companions. If full, you’ll be told the party is full.
 - Map markers show NPC locations on screen; off-screen NPCs have edge arrows pointing toward them.
- Companion dialogs are editable in `src/data/companion_dialogs.js`.
  - Keys are lowercase companion names, each with a `start` node and `nodes` map.
  - Use `action: 'companion_back'` to return to the companion selector and `action: 'dismiss_companion'` to remove them.
- Saves are stored in your browser's localStorage under a single slot.
 - Inventory saves and loads with the game (equipped items and backpack).
 - Sample items defined in `src/data/items.js` — use "Add Sample Items" inside a character's inventory to test.
 - A small party UI shows current companions at the top-right.
 - When someone joins, a banner briefly appears at the top.
- Obstacles (trees, rocks) appear in the world; the player collides with them.
- Visual-novel overlay in chat: Large portrait + name + text + clickable choices appear over the game.
  - Put portrait images in `assets/portraits/` and update the NPC spawn to point to your file.
  - Example path used in code: `assets/portraits/Canopy.png`.
 - NPC dialog trees: when talking to an NPC, numbered choices appear.
   - Choose with number keys (1–9) or type the number and press Enter.
   - Dialog data lives in `src/data/dialogs.js` and is attached to NPCs in `src/main.js`.
Backend (optional, for web saves)
- A tiny Express server is included under `server/` for remote saves.
- Endpoints (auth via `x-api-key` secret and `x-user-id` user id):
  - `POST /api/save?slot=1` body `{ payload }` → saves
  - `GET /api/save?slot=1` → loads
  - `DELETE /api/save?slot=1` → clears
- Deploy to fly.io
  1. `cd server`
  2. `fly launch` (choose a name)
  3. `fly volumes create data --size 1` (creates persistent volume)
  4. `fly secrets set SAVE_API_KEY=your-secret`
  5. Configure volume and env in fly.toml (see example below)
  6. `fly deploy`
- Example fly.toml snippet:
  ```toml
  [env]
    DATA_PATH = "/data/saves.json"

  [[mounts]]
    source = "data"
    destination = "/data"
  ```
- Client integration
  - In `index.html`, set:
    ```html
    <script>
      window.SAVE_API_URL = 'https://your-app.fly.dev';
      window.SAVE_API_KEY = 'your-secret'; // optional
    </script>
    ```
  - The game will automatically use the remote API for Save/Load if `SAVE_API_URL` is set; otherwise it defaults to localStorage.
Audio Assets
- Put files under `assets/audio/`:
  - Music: `assets/audio/music/ambient.mp3`
  - SFX: `assets/audio/sfx/attack.wav`, `hit.wav`, `ui-open.wav`, `ui-move.wav`, `ui-select.wav`, `ui-close.wav`
- Missing files are handled gracefully (sound just won’t play).
- Enemy corpses: Defeated enemies leave a small corpse (pass-through) that fades after ~2 seconds.
  - A small blood stain appears under the corpse and also fades away.
  - Corpses rotate randomly for visual variety.

## VN Intros (First Appearance)

- When a flagged character (NPC or the boss) first enters the camera view, the camera pans to them and a simple VN overlay opens with flavor text.
- Close the VN with the built‑in Exit (X) button or Esc; gameplay resumes normally and the camera pans back to the player.
- Intros are remembered per slot (persisted in the save) and won’t repeat after reload.

Video portraits
- The VN overlay supports both images and videos for portraits.
- Use MP4/WebM/OGG assets; videos play muted, loop, and stop when the VN closes.
- Just set `portrait` to your video path; the overlay auto-switches:
  - Example: `assets/portraits/Canopy/Canopy video.mp4`

Add an intro to an NPC

```js
// src/main.js (or wherever you spawn your NPC)
spawnNpc(x, y, 'down', {
  name: 'Scholar',
  portrait: 'assets/portraits/Scholar/Scholar video.mp4', // or .png/.webp
  sheet,
  vnOnSight: { text: "Scholar: I've been expecting you…" },
});
```

Add an intro to an enemy (e.g., the boss)

```js
spawnEnemy(bx, by, 'boss', {
  name: 'Vast',
  portrait: 'assets/portraits/Vast/Vast video.mp4',
  vnOnSight: { text: 'Vast: You made it this far? Then watch how hope burns to ash.' },
});
```

Behavior
- Pan-to-actor before VN (~0.6s, smooth ease), then open VN with your `text`.
- No numbered Exit choice; the overlay’s Exit (X) is always available unless you lock it yourself.
- Seen-tracking: stored as `npc:<name>` or `enemy:<name>` internally and persisted in the save.

## Engine Flow Diagrams

### Update/Render Loop

```mermaid
flowchart TD
  A[Boot: index.html → src/main.js] --> B[Init UI + input]
  B --> C[Build terrain bitmap]
  C --> D[Build obstacles]
  D --> E[Spawn NPCs/companions/enemies]
  E --> F[requestAnimationFrame loop]

  F --> G[step(dt): world update]
  F --> H[render(): draw frame]

  %% step(dt)
  G --> G0{runtime.gameState == 'chat'?}
  G0 -- yes --> G00[Skip world simulation this frame]
  G0 -- no --> G1[Timers: invuln, autosave]
  G1 --> G2[Read input → ax/ay]
  G2 --> G3[Aggregate companion auras + triggers]
  G3 --> G4[Move player with collision]
  G4 --> G5[handleAttacks: hit window, damage, gate unlock]
  G5 --> G6[Enemy AI: chase, avoidance, contact damage]
  G6 --> G7[Companions: follow chain, warp if stuck]
  G7 --> G8[Effects: corpses/stains/floaters/sparkles]
  G8 --> G9[Camera follow]

  %% render()
  H --> H1[Draw terrain bitmap]
  H1 --> H2[Draw obstacles]
  H2 --> H3[Draw stains + corpses]
  H3 --> H4[Build y‑sorted drawables]
  H4 --> H5[Draw NPCs/companions/enemies/player]
  H5 --> H6[Enemy HP bars + aggro tell]
  H6 --> H7[Player HP bar]
  H7 --> H8[NPC markers]
  H8 --> H9[Floaters + sparkles]
  H9 --> H10[DOM UI: Party chips, VN overlay]

  %% Clickable links to source
  click A "src/main.js" "src/main.js"
  click B "src/engine/input.js" "initInput() in src/engine/input.js"
  click C "src/engine/terrain.js" "buildTerrainBitmap() in src/engine/terrain.js"
  click D "src/engine/terrain.js" "buildObstacles() in src/engine/terrain.js"
  click E "src/engine/state.js" "spawnEnemy/spawnNpc/spawnCompanion in src/engine/state.js"
  click F "src/main.js" "RAF loop in src/main.js"
  click G "src/systems/step.js" "step(dt) in src/systems/step.js"
  click H "src/engine/render.js" "render() in src/engine/render.js"
  click G5 "src/systems/combat.js" "handleAttacks()/gate unlock in src/systems/combat.js"
  click H10 "src/engine/ui.js" "DOM UI + overlay in src/engine/ui.js"
```

Key modules: `src/systems/step.js`, `src/systems/combat.js`, `src/engine/render.js`, `src/engine/ui.js`, `src/engine/state.js`.

### Space: Attack vs Interact

```mermaid
flowchart LR
  K[Space key] --> L{willAttackHitEnemy()?}
  L -- yes --> M[startAttack()]
  L -- no --> N{tryInteract()}
  N -- yes --> O[startDialog() → enterChat()]
  N -- no --> M

  %% Clickable links to source
  click L "src/systems/combat.js" "willAttackHitEnemy() in src/systems/combat.js"
  click M "src/systems/combat.js" "startAttack() in src/systems/combat.js"
  click N "src/systems/combat.js" "tryInteract() in src/systems/combat.js"
  click O "src/engine/dialog.js" "startDialog()/enterChat() in src/engine/dialog.js and src/engine/ui.js"
```

While in chat (VN overlay), gameplay input is suppressed; number keys or buttons select choices, Esc/X exits unless locked (e.g., Game Over).

## Level 3: Marsh (New)

- Unlocks after defeating Nethra (Level 2 boss).
- Biome: marsh terrain, with blocking water pools and scattered obstacles.
- Featured foe: Wight — guaranteed to drop a Reed Key to open the island arena gate.
- Boss: Luula — spawns inside the arena and has a first‑sight VN intro.
- New companions: Tin and Nellis — recruitable with simple dialogs.

### Save/Load Path

```mermaid
flowchart LR
  P[User chooses Save/Load] --> Q{window.SAVE_API_URL set?}
  Q -- yes --> R[Remote API \n POST/GET/DELETE /api/save?slot=N \n headers: x-user-id, x-api-key]
  Q -- no --> S[LocalStorage \n key: shadow_kingdom_save_{slot}]

  %% Clickable links to source
  click P "src/engine/dialog.js" "startSaveMenu()/save menu flows in src/engine/dialog.js"
  click R "server/server.js" "Express endpoints in server/server.js"
  click S "src/engine/save.js" "Local save/load in src/engine/save.js"
```

Serialization includes player, live enemies, companions (with inventories), NPCs, player inventory, and unlocked gates. Remote server lives in `server/` (Express) and can be deployed to Fly.io.
