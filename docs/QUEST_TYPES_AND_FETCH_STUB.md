Quest Types and Fetch/Delivery Stub

This note outlines additional quest patterns supported by the current flags/counters system and introduces a concrete fetch-and-deliver blueprint that reuses the existing key→gate mechanics (specific item unlocks a specific gate).

Quest Types
- Fetch/Delivery: Find a specific item and deliver it to a location/NPC.
- Multi-Fetch: Gather N copies of an item (herbs, sigils); track with `questCounters`.
- Trade Chain: Bring A to NPC X, receive B; chain stages gated via flags per hand‑in.
- Escort: Walk an NPC to a destination; fail if NPC HP hits 0; set `<id>_cleared` on arrival.
- Timed Run: Reach/deliver before a timer expires; decrement a countdown counter each step.
- Stealth/Infiltration: Reach chest/NPC with ≤K enemy kills (reverse kill‑counter gate).
- Defense/Holdout: Protect a shrine/NPC for N waves; decrement counter per wave cleared.
- Puzzle/Levers: Toggle levers in sequence; each lever sets a flag; sequence sets `<id>_cleared`.
- Lure/Boss Bait: Place bait at altar to spawn target enemy; mark `<id>_cleared` on kill.
- Repair/Cleanse: Bring parts/blessing to a gate/shrine to unlock/cleanse area.
- Survey/Scout: Step into marked zones (A→B→C); set flags per zone, `<id>_cleared` at last.
- Crafting Task: Gather ingredients; “craft” at camp (dialog action sets `<id>_cleared`).
- Investigation/Dialog: Talk to N specific NPCs; each sets a flag; turn‑in when all are set.
- Traversal/Platform: Navigate hazards to reach beacon; touching beacon sets `<id>_cleared`.

Fetch/Delivery Blueprint (Key→Gate style)
- Item definition (items.js): define a misc item with a matching `keyId`.
  - Example: `{ id: 'relic_canopy', name: "Sister’s Ribbon", slot: 'misc', keyId: 'relic_canopy' }`.
- Delivery target (levels.js): place a gate‑like obstacle keyed to that item.
  - Example: `type: 'gate', id: 'ribbon_pedestal', keyId: 'relic_canopy', locked: true`.
- Start logic (dialog.js → handleStartQuest): set `<id>_started`, spawn the pickup (`spawnPickup(..., itemById('relic_canopy'))`), and show a banner.
- Progress hint (ui.js → updateQuestHint):
  - If started and player has the item → “Take the Ribbon to the Pedestal”.
  - Else if started but not yet picked up → “Find the Ribbon”.
- Delivery hook (systems/combat.js → tryUnlockGate): when the pedestal is unlocked via the item, set `<id>_cleared = true` and optionally show an extra quest update banner. The existing system already shows a generic “Used Key to open Gate” message and persists the unlocked state.

Stub Introduced Here
- Quest ID: `canopy_fetch_ribbon` (find “Sister’s Ribbon” and place it on the ribbon pedestal).
- Added pieces:
  - Item `relic_canopy` in `src/data/items.js`.
  - Pedestal gate in Level 2: `id: 'ribbon_pedestal', keyId: 'relic_canopy'`.
  - `handleStartQuest('canopy_fetch_ribbon')`: spawns the ribbon pickup near the player.
  - `updateQuestHint()`: shows context message based on whether the player is carrying the ribbon.
  - `tryUnlockGate()`: marks `canopy_fetch_ribbon_cleared` when the ribbon is used on the pedestal.

Turn‑in Flow (next steps)
- Add companion dialog nodes (e.g., Canopy) gated by `{ flag: 'canopy_fetch_ribbon_cleared' }` to award affinity and set `canopy_fetch_ribbon_done`.
- Optionally consume the item on delivery (currently not consumed; easy to add by removing one matching item from the inventory on unlock).

Files touched for the stub
- `src/data/items.js`: item definition
- `src/engine/levels.js`: pedestal placement (Level 2)
- `src/engine/dialog.js`: start quest handler case
- `src/engine/ui.js`: quest hint block
- `src/systems/combat.js`: delivery/clear hook in `tryUnlockGate`

