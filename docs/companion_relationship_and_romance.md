# Companion Relationships, Romance, and Rivalries

This document outlines the system for companion interplay, including their relationships with each other, their romantic arcs with the player, and the resulting gameplay mechanics.

## 1. Overview: The Social Ecosystem

Companions are not just allies to the player; they form a living party with their own internal dynamics. This system models the relationships *between* companions (rivalries and affections) and combines them with their individual affinity for the player to create a complex and reactive social ecosystem.

## 2. Romantic Quest Lines

Separate from their main "adventure" quests, each companion has a romantic quest line.

- **Nature:** These are high-affinity (unlocking at 8.0+), dialogue-heavy quests that primarily take place in the Hub. They represent the final, personal steps in a companion's romantic arc with the player, focusing on character moments over combat.
- **Reward:** Completing a romantic quest is the only way to achieve maximum affinity (10.0). This is a prerequisite for some secret endings (like Canopy's marriage) and unlocks unique epilogue details for that companion.

## 3. Inter-Companion Relationship Matrix

Companions have pre-defined relationships that influence their behavior and dialogue.

### Rivalries

- **Yorna ↔ Canopy:** The core philosophical conflict of the party: Yorna's aggressive, results-first approach versus Canopy's cautious, protective methods.
- **Twil ↔ Tin:** A classic elemental and personality clash. Twil's fiery, cocky speed (**Fire**) is in direct opposition to Tin's fluid, hyperactive energy (**Water**). Their rivalry is about whose style—burning intensity or relentless flow—is superior.
- **Varabella ↔ Cowsill:** A clash of combat philosophies. Varabella's pragmatic, cynical, self-taught field tactics conflict with Cowsill's energetic, by-the-book style learned from her formal training with the temple guards.

### Affections

- **Canopy & Urn:** A naturally supportive bond between the primary healer and the beacon of hope. They find strength in each other's complementary methods of care.
- **Nellis & Hola:** A quiet understanding between two introverted magic-users. The steady, faithful Nellis provides a calming presence for the nervous but powerful Hola.
- **Yorna & Cowsill:** Mutual respect between two elite, frontline warriors. Despite Cowsill's rivalry with Varabella over tactics, she cannot deny Yorna's raw power and effectiveness, which Yorna respects in turn.

## 4. Gameplay Mechanics

These relationships have tangible effects on gameplay.

### A. Affinity-Gated Party Joining

This mechanic makes party composition a dynamic puzzle, especially early in the game.

- **Rule:** A companion with low player affinity (< 5.0) will refuse to join the party if their designated rival is already present.
- **Exception:** A companion with high player affinity (>= 5.0) will agree to join, even with a rival present. Their dialogue will indicate they are doing it for the player, overriding their personal conflict.

### B. Affection-Based Synergies

When two companions with a pre-defined "affection" are in the party together, they unlock a unique, passive "Synergy Aura."

- **Example:** With **Canopy and Urn** in the party, their combined healing and hopeful energies create a "Soothing Presence" aura, granting the entire party a small resistance to damage-over-time effects like poison and blight.

### C. Low-Affinity Debuffs

To discourage neglecting companions, a low affinity score has direct consequences.

- **Mechanic:** If a companion's affinity for the player drops below a certain threshold (e.g., < 3.0), their discontent manifests as a minor negative debuff aura for the party.
- **Example 1:** A low-affinity **Yorna's** "Impatience" aura might slightly increase the player's ability cooldowns.
- **Example 2:** A low-affinity **Hola's** "Nervous Energy" might slightly increase the chance for enemies to resist her own magical slowing effects.

### D. Dynamic Affinity Adjustments

Beyond direct gains and losses, companion affinity can be dynamically influenced by in-game conditions. This includes both setting a maximum cap on affinity and applying temporary modifiers (positive or negative) to a companion's current affinity value. These adjustments reflect complex character relationships, story events, and player choices. For a detailed breakdown of the mechanics and configuration, refer to `AFFINITY_SYSTEM_DESIGN.md`.
