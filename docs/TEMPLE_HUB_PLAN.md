# Temple Hub Plan — Aurelion “Heart of the Temple”

This document outlines the post‑Level 5 (Temple District) flow where defeating Vorthak rescues Canopy’s sister and converts the Heart of the Temple into a player hub for future adventures.

## Story Beats (High Level)

- Vorthak (Urathar’s servant) has captured and enslaved Fana and holds Canopy’s sister.
- Defeating Vorthak (triple‑phase boss) breaks the sigils and rescues Canopy’s sister.
- The Heart of the Temple in Aurelion is cleansed and re‑occupied by the heroes — this area becomes a Hub.
- In the Hub, players can recruit allies, manage party, access services (later), and take new quests.

## Game Flags

- `canopy_sister_captured` — (optional) set on first arrival to Level 5 for flavor gating.
- `canopy_sister_rescued` — set when Vorthak is defeated (after final form).
- `temple_cleansed` — set on Vorthak’s final defeat.
- `hub_unlocked` — set on Vorthak’s final defeat; used to enable the hub loader.

These flags are persisted (saved/loaded via `questFlags`).

## Level Flow

- Level 5 (Heart of the Temple — combat):
  - Player spawns lower‑left of district; Fana (featured, enslaved) is outside the arena.
  - Vorthak is in the temple arena (upper‑right). Gate is 2‑tile wide; Fana drops the key to unlock it.
  - On Vorthak’s final defeat (phase 3), set flags above and transition to Level 6 (Hub).

- Level 6 (Hub: “Temple of Aurelion” — clean variant):
  - No combat.
  - Placeholder loader shows a cleaned marble area and spawns Canopy’s sister as an NPC.
  - Future: services (vendor, quest board, stash), recruitables present, fast travel.

## Maps

- Combat Arena Map (Level 5): `assets/temple_heart.json` (JSON grid). Includes marble walls, columns, lava, two‑tile gate, boss position, and exterior approach.
- Hub Map (Level 6): `assets/temple_heart_clean.json` (JSON grid). Cleaned version without hazards; adds NPC/service placement spots.

Both maps should use 1‑tile = 16 px, with suggested arena size ≈ 40×28 tiles.

## VN/Portraits

- Vorthak: base, powered, overpowered, defeated portraits wired into boss VN flow.
- Fana: villain on‑sight VN (outside), post‑defeat recruit dialog with companion portrait.
- Canopy’s Sister: short rescue VN in hub (placeholder until assets arrive).

## Implementation Notes

- Boss defeat hook now sets flags and routes to Level 6.
- Level 6 loader is added as a placeholder hub:
  - Cleansed marble space, title overlay (“Temple of Aurelion”), and sister NPC spawn.
  - No enemies, no hazards.
- Future work:
  - Load maps from `assets/temple_heart.json` (L5) and `assets/temple_heart_clean.json` (L6) once finalized.
  - Add services and persistent hub features.

