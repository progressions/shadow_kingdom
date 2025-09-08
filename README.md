Sprite Move Demo (HTML5 Canvas)

Run by opening index.html directly in your browser. No installs or build steps required.

Controls:
- Move: WASD or Arrow Keys
- Toggle grid: G
- Attack: J (Space will attack if not interacting)
- Interact with NPC: Space (when facing and in range)
- Chat mode: Enter to send message, Esc or click canvas to exit

Notes:
- Canvas internal resolution is 320x180 for a pixel-art look, scaled to 960x540.
- Sprite is generated procedurally at runtime to avoid external assets.
- Larger scrolling world with procedurally generated terrain; the camera follows the player.
- One enemy spawns and chases you; hit it to defeat it.
- Three companions follow you in a chain with distinct colors.
- A stationary NPC stands on the right side (non-hostile).
- Interacting with the NPC shows a message in the right sidebar.
  - Space near the NPC focuses the sidebar input (">" prompt) so you can type.
 - Obstacles (trees, rocks) appear in the world; the player collides with them.
