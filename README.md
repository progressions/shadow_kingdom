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
