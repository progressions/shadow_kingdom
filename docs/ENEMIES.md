Level 1 — Greenwood Outskirts

  - Greenwood Bandit (mook) — basic melee grunt used by both proximity spawners and authored spawns (src/engine/map_loader.js:271, src/engine/map_loader.js:353).
  - Woodland Brute (featured) — tougher axe brute, 8 HP / 4 DMG (src/engine/map_loader.js:273-275).
  - Bandit Archer (featured_ranged) — baseline ranged unit, 12 HP / 6 DMG arrows (src/engine/map_loader.js:354-356); uses `featured_bandit_archer.png`.

  Level 2 — Canyon / Urathar Patrols

  - Urathar Scout (mook) — lightweight spear carrier, 5 HP / 4 DMG (src/engine/map_loader.js:276-278).
  - Desert Marauder (featured) — elite brawler, 12 HP / 6 DMG; also the fallback when a map marks a generic featured spawn (src/engine/map_loader.js:278, src/engine/map_loader.js:357).
  - Desert Marksman (featured_ranged) — bow unit, 14 HP / 6 DMG, tweaked stats via `mkEnemy('featured_ranged')`.

  Level 3 — Marsh Approaches

  - Marsh Whisperer (mook) — swamp skirmisher, 7 HP / 5 DMG (src/engine/map_loader.js:279-281).
  - Marsh Stalker (featured) — hulking marsh brute, 14 HP / 6 DMG (src/engine/map_loader.js:281-282).
  - Marsh Silencer (featured_ranged) — spitting lurker, 16 HP / 6 DMG, longer range (src/engine/map_loader.js:279-289).

  Level 4 — Ruined City Plaza

  - Urathar Soldier (mook) — armored halberdier, 9 HP / 6 DMG (src/engine/map_loader.js:283-285).
  - City Brute (featured) — heavy shock troop, 18 HP / 7 DMG (src/engine/map_loader.js:285-286).
  - City Crossfire (featured_ranged) — repeating archer, 18 HP / 7 DMG, higher projectile speed.

  Level 5 — Temple District

  - Temple Guard (mook) — disciplined guardian, 12 HP / 7 DMG (src/engine/map_loader.js:287-289).
  - Temple Sentinel (featured) — elite zealot, 22 HP / 9 DMG (src/engine/map_loader.js:289-290).
  - Temple Lantern (featured_ranged) — ranged acolyte, 22 HP / 8 DMG with long-range bolts.

  Additional notes:

  - If we ever add new levels or omit per-level tuning, the engine falls back to generic Bandit / Featured Foe labels (src/engine/map_loader.js:291-292).
  - Every level now wires up a level-specific `featured_ranged` template (Bandit Archer → Desert Marksman → Marsh Silencer → City Crossfire → Temple Lantern); maps decide where to place them via `spawn_featured_ranged` pixels.

  With these identities you can line up sprite strips per tier and keep the naming in sync with the existing logic.
