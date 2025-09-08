Sprite Move Demo (HTML5 Canvas)

Run by opening index.html directly in your browser. No installs or build steps required.

Controls:
- Move: WASD or Arrow Keys
- Toggle grid: G
- Attack: J (Space will attack if not interacting)
- Interact with NPC: Space (when facing and in range)
- VN dialog: Click a choice or press number keys (1–9). Esc or click canvas to exit.

Notes:
- Canvas internal resolution is 320x180 for a pixel-art look, scaled to 960x540.
- Sprite is generated procedurally at runtime to avoid external assets.
- Larger scrolling world with procedurally generated terrain; the camera follows the player.
- One enemy spawns and chases you; hit it to defeat it.
- Start with zero companions. You can recruit Canopy via dialog.
- A stationary NPC stands on the right side (non-hostile).
- VN overlay replaces the sidebar; dialog text and choices appear over the game.
  - Canopy asks to join; choose Yes and she will follow you as a companion.
 - A small party UI shows current companions at the top-right.
 - When someone joins, a banner briefly appears at the top.
- Obstacles (trees, rocks) appear in the world; the player collides with them.
- Visual-novel overlay in chat: Large portrait + name + text + clickable choices appear over the game.
  - Put portrait images in `assets/portraits/` and update the NPC spawn to point to your file.
  - Example path used in code: `assets/portraits/Canopy.png`.
 - NPC dialog trees: when talking to an NPC, numbered choices appear.
   - Choose with number keys (1–9) or type the number and press Enter.
   - Dialog data lives in `src/data/dialogs.js` and is attached to NPCs in `src/main.js`.
