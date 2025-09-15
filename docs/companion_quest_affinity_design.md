# Companion Adventures: The Affinity Effect

This document outlines the design for dynamic, affinity-based companion quests. The goal is to make the player's investment in their relationships feel meaningful and consequential.

## Core Concept

The companion-led adventures will be dynamically influenced by the player's affinity level with the quest-giving companion. The core objective and the strategic "key" for the final battle will always be achievable, but the narrative tone, dialogue, and secondary outcomes will change to reflect the depth of the bond.

We model this across three tiers:

- **Low Affinity (Professional):** The companion is task-oriented. The relationship is one of colleagues.
- **Medium Affinity (Confiding):** The companion trusts the player with personal thoughts, fears, and stories. The relationship is one of friendship and mutual respect.
- **High Affinity (Devoted):** The companion's actions are driven by a deep, personal bond with the player. The relationship is one of devotion and romance, leading to unique "best-case" outcomes.

---

## I. Design Examples

Here are detailed examples for Canopy, Yorna, and Hola.

### **Canopy's Quest: The Sunken Abbey**

**Objective:** Retrieve the Aegis of Mercy.

*   **Low Affinity (Professional):**
    *   **Tone:** Canopy is focused and formal. Her dialogue is centered on the strategic importance of the Aegis for the war effort.
    *   **Dialogue Example:** "My Lord, the archives say the Aegis can shield our forces from great harm. We must retrieve it. Please be careful."
    *   **Outcome:** The party secures the Aegis. Canopy expresses professional gratitude. The mission is a success.

*   **Medium Affinity (Confiding):**
    *   **Tone:** Canopy opens up about the Abbey's spiritual importance and her personal connection to it.
    *   **Dialogue Example:** "My Lord, my sister and I used to hear stories about this place. They said the All's light never faded here, even underwater. I hope we can bring that feeling back."
    *   **Outcome:** In addition to the Aegis, Canopy's knowledge leads you to a hidden scriptorium containing extra lore about the All-Priest, providing more context for Kael's identity.

*   **High Affinity (Devoted):**
    *   **Tone:** The quest becomes an expression of her desire to protect the player personally. Her dialogue is intimate and heartfelt.
    *   **Dialogue Example:** "I almost lost my sister. I cannot bear the thought of losing you, too. This Aegis... I feel it's not just for the army. It's to ensure you come back safely."
    *   **Outcome:** After securing the Aegis, Canopy is inspired by her faith and her bond with you. She uses a fragment from the Abbey to create a **"Lesser Aegis"**—a unique accessory only for the player that provides a permanent personal damage reduction buff. It is a tangible symbol of her devotion.

### **Yorna's Quest: The Volcanic Heartforge**

**Objective:** Destroy the Ashen Guard's forge.

*   **Low Affinity (Professional):**
    *   **Tone:** Yorna is dismissive and arrogant, seeing the player as backup rather than a partner.
    *   **Dialogue Example:** "Chief, just try to keep up. We smash the forge, we get out. Don't get in my way."
    *   **Outcome:** The mission is successful, but her recklessness may lead to more difficult fights. She takes full credit for the victory.

*   **Medium Affinity (Confiding):**
    *   **Tone:** Yorna sees the player as a capable rival and equal. The dynamic is one of a competitive partnership.
    *   **Dialogue Example:** "Alright, Chief, you and I are the only ones strong enough for this. Let's show them what real power looks like. Watch my back, and I'll watch yours."
    *   **Outcome:** Yorna will suggest a tactical alternative to a frontal assault, such as triggering a lava flow to weaken the forge's guardians, making the final encounter easier and showing a more strategic side to her personality.

*   **High Affinity (Devoted):**
    *   **Tone:** Yorna reveals the vulnerability that fuels her aggressive drive—a past failure she is desperate not to repeat with someone she cares for.
    *   **Dialogue Example:** (Before the final fight) "Chief, being strong... it's the only way I know how to keep people safe. The people I care about. I'm with you. To the end."
    *   **Outcome:** After destroying the forge, Yorna recovers the **"Forge-Master's Hammer,"** a powerful two-handed weapon. She offers it to you, stating, "A true chief deserves a weapon worthy of their strength." It is an act of profound respect and partnership.

### **Hola's Quest: The Whispering Library**

**Objective:** Find the Scroll of Unraveling.

*   **Low Affinity (Professional):**
    *   **Tone:** Hola is terrified and requires constant reassurance. Her nervousness may inadvertently trigger magical traps.
    *   **Dialogue Example:** "My Lord, are you sure about this? The whispers... they say we're going to fail. I... I don't know if I can do this."
    *   **Outcome:** The player must guide her through every step. The scroll is recovered, but Hola's confidence remains shaky.

*   **Medium Affinity (Confiding):**
    *   **Tone:** Hola is still nervous, but she is determined to prove her worth specifically to you.
    *   **Dialogue Example:** "I've been studying the notes you found for me, My Lord. I think... I think I can handle the illusions ahead. Please, trust me. Let me try."
    *   **Outcome:** Hola successfully disarms a major illusionary trap or solves a key puzzle on her own, marking a significant step in her journey toward self-confidence. She is visibly proud to have helped you.

*   **High Affinity (Devoted):**
    *   **Tone:** Hola's courage is a direct reflection of her faith in you. Your presence silences her fears.
    *   **Dialogue Example:** "When you're here, My Lord, the whispers don't scare me. They're just... noise. You make me feel brave."
    *   **Outcome:** The Scroll is guarded by a spirit that tests the visitor's will. Inspired by her bond with you, Hola faces it without fear. Impressed by her courage, the spirit not only yields the scroll but also teaches her a **new, powerful spell**—a permanent upgrade to her abilities that is only possible through her devotion to you.

---

## II. Plan for Creating More Affinity-Based Quests

This framework can be applied to all other companions to create rich, reactive questlines.

**Step 1: Identify the Companion's Core Motivation**
   - Start with the companion's personality and backstory as defined in the `COMPANION_GUIDE.md`. What is their primary driver? (e.g., Nellis: protecting others; Twil: being the smartest/fastest; Varabella: tactical superiority).

**Step 2: Design the "Low Affinity" Path (The Baseline)**
   - This is the standard, professional version of the quest. The companion is focused on the mission objective. Dialogue is formal and to the point. The strategic "key" is obtained, and the quest is completed successfully.

**Step 3: Design the "Medium Affinity" Path (The Friendship)**
   - The companion begins to see the player as a trusted friend. 
   - **Dialogue:** Have them share a personal story, a private fear, or a unique hope related to the quest at hand.
   - **Gameplay:** This trust should unlock something new—a hidden path, a piece of lore, a clever solution to a problem—that isn't available otherwise. This is a chance to show a different side of their personality.

**Step 4: Design the "High Affinity" Path (The Devotion)**
   - The companion's actions are now openly driven by their deep, personal bond with the player. This is the "golden path" that rewards the player's emotional investment.
   - **Dialogue:** This is for the most intimate and revealing conversations. The companion should express their dedication to the player directly, framing the quest's success in personal terms.
   - **Gameplay:** This path should provide a unique and powerful reward. This could be:
     - A **unique item** for the player (e.g., Canopy's "Lesser Aegis").
     - A **permanent upgrade** for the companion (e.g., Hola's new spell).
     - A **strategic advantage** that makes the final battle significantly easier.

**Step 5: Connect the Reward to the Bond**
   - Ensure the special reward for the High Affinity path feels like a direct result of the relationship. It shouldn't just be better loot; it should be a symbol of the bond itself—a gift, a shared power, or a vow made manifest.
