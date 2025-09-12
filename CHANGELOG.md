Shadow Kingdom — Changelog

This project follows a date-based changelog. Entries summarize notable changes grouped by day. Earlier items roll up foundational work as features stabilized.

**2025-09-11**
- Combat: add crits and armor‑piercing; refine damage numbers and boss outline glow.
- Audio: low‑HP music muffle (chip filter and file volume duck) with smooth transitions; heartbeat SFX cadence scales with HP.
- UI/FX: low‑HP gray wash + pulsing red vignette; cleaner boss marker; polished float text rounding.
- Companion: add Snake/Snek companion (slow aura, hiss SFX, VN intro) and “Snake Mode” toggle; persist toggle in saves.
- Game flow: improved death sequence (pause, zoom‑out, corpse + blood, banner, keypress to Game Over menu).
- Pause menu: add Main Menu; fix proper overlay exit before showing title; soften title fanfare levels.
- Items: torches consume/ignite on equip/unequip, show HUD timer; auto‑equip logic improvements; banners clarified.
- Levels: numerous Level 1 terrain/prop passes (rocks, trees, breakables), bright ambient in Level 2.
- Debug: lighting controls, give torches; remove older light tests from menu.
- Docs: align README and docs with current save/music/VN systems; remove “v2” phrasing.

**2025-09-10**
- Environment: add breakables and persist broken state; populate world with more props and loot adjustments.
- VN polish: styling for intros, narration/quote formatting, centralized intro texts.
- General improvements and fixes across rendering, UI, and data.

**2025-09-09**
- VN Intros: reintroduce as minimal “on‑sight” system for NPCs and enemies with portrait videos, seen persistence, cooldowns, and queued “Continue” prompts.
- Docs/README updates describing VN usage and portrait conventions.
- Style/content tweaks to match character designs; newline handling in VN text.

**2025-09-08**
- Core refactor: modular ES modules; terrain, obstacles, NPCs, companions; VN overlay with portraits; party UI and join/dismiss flows; collision and avoidance; keyboard VN navigation.
- Music/SFX: chip 8‑bit ambient with dynamic intensity and filter sweeps; audio controls; UI SFX.
- Save/Load: multi‑slot save menu with autosave toggle, per‑slot submenus, confirmations; remote API scaffold.
- Inventory: per‑character inventory/equipment UI; backpack transfers; equip stats (ATK/DR) affect combat.
- Combat: pivot to realtime‑only; solid enemies; attack/interaction routing; corpses and blood stains; enemy aggro tell; tuning for speeds and touch damage.
- World gating: locked gates opened by key items; gate states persisted; banners and SFX feedback.
- Companion systems: auras/triggers applied every frame; party role badges; stuck‑detection warp logic.
- VN UX: exit button (X) and improved navigation.

— End —

