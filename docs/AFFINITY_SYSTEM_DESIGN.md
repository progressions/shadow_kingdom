# Affinity Cap and Modifier System Design

## 1. Introduction

This document outlines the design for an Affinity Cap and Modifier System, a feature intended to add narrative depth and consequence to companion relationships. It allows a companion's maximum achievable affinity to be dynamically capped and their current affinity value to be modified based on specific in-game conditions, reflecting story events, character relationships, or player choices.

## 2. Core Concepts

-   **Affinity Caps:** A companion's affinity, which normally caps at 10, can be limited to a lower value if certain predefined conditions are met. If the conditions are no longer met, the cap is removed, and the companion's affinity can continue to grow.
-   **Conditional Modifiers:** A companion's current affinity value can be dynamically adjusted (increased or decreased) by a specified amount if certain conditions are met. These modifiers are additive/subtractive and reflect ongoing influences on the relationship.

## 3. Condition Types

Conditions are the criteria that determine if a cap or modifier applies. All conditions within a single `conditions` array must be met for that specific cap or modifier to apply.

-   `"type": "level_eq", "value": <level_number>`: Player is currently on exactly this level.
-   `"type": "level_ge", "value": <level_number>`: Player is currently on this level or a higher level.
-   `"type": "level_le", "value": <level_number>`: Player is currently on this level or a lower level.
-   `"type": "companion_present", "id": "<companion_id>"`: The specified companion is currently in the active party.
-   `"type": "companion_absent", "id": "<companion_id>"`: The specified companion is NOT currently in the active party.
-   `"type": "companion_recruited", "id": "<companion_id>"`: The specified companion has been recruited (even if not in party).
-   `"type": "companion_not_recruited", "id": "<companion_id>"`: The specified companion has NOT been recruited.
-   `"type": "flag_set", "id": "<flag_name>"`: The specified quest flag is set (true).
-   `"type": "flag_not_set", "id": "<flag_name>"`: The specified quest flag is NOT set (false).

## 4. Proposed Configuration Structure

Each companion's data entry (e.g., in a dedicated `companion_affinity_data.js` file) would include optional `affinityCaps` and `affinityModifiers` arrays.

```json
// Example for a companion's data entry
"companion_id": {
  // ... existing companion data
  "affinityModifiers": [
    {
      "modifierValue": -1, // The amount to add/subtract from current affinity
      "conditions": [
        { "type": "companion_present", "id": "yorna" } // Yorna is in the active party
      ]
    },
    {
      "modifierValue": 0.5,
      "conditions": [
        { "type": "flag_set", "id": "player_is_hero" }
      ]
    }
  ],
  "affinityCaps": [
    {
      "capValue": 7, // The maximum affinity this companion can reach if these conditions are met
      "conditions": [
        { "type": "companion_present", "id": "fana" },
        { "type": "flag_not_set", "id": "fana_redemption_quest_complete" }
      ]
    },
    {
      "capValue": 5,
      "conditions": [
        { "type": "level_ge", "value": 4 },
        { "type": "flag_set", "id": "temple_under_siege" }
      ]
    }
  ]
}
```

## 5. Logic for Applying Affinity

1.  **Calculate Base Affinity:** Start with the companion's current accumulated affinity points.
2.  **Apply Modifiers:** Iterate through all `affinityModifiers` defined for the companion. For each `affinityModifier` whose `conditions` are fully met, add its `modifierValue` to the base affinity. If multiple modifiers apply, their values are summed.
3.  **Apply Caps:** After modifiers are applied, iterate through all `affinityCaps` defined for the companion. For each `affinityCap` whose `conditions` are fully met, its `capValue` becomes a candidate for the current affinity cap. If multiple caps apply, the *lowest* `capValue` among them is applied as the effective cap.
4.  **Final Affinity:** The companion's final displayed affinity is the modified base affinity, clamped by any active cap (and always clamped between 1 and 10).

## 6. Examples

### Example 1: Cowsill's Objection to Fana (Affinity Cap)

**Requirement:** Cowsill's affinity is capped at 7 if Fana is present in the same party.

```json
"cowsill": {
  "affinityCaps": [
    {
      "capValue": 7,
      "conditions": [
        { "type": "companion_present", "id": "fana" }
      ]
    }
  ]
}
```

### Example 2: Varabella's Bond with Urn (Affinity Cap)

**Requirement:** Varabella's affinity is capped at 7 if Urn is NOT in the party.

```json
"varabella": {
  "affinityCaps": [
    {
      "capValue": 7,
      "conditions": [
        { "type": "companion_absent", "id": "urn" }
      ]
    }
  ]
}
```

### Example 3: Canopy's Discomfort with Yorna (Conditional Modifier)

**Requirement:** Canopy has a -1 affinity if Yorna is in the party.

```json
"canopy": {
  "affinityModifiers": [
    {
      "modifierValue": -1,
      "conditions": [
        { "type": "companion_present", "id": "yorna" }
      ]
    }
  ]
}
```

## 7. High-Level Implementation Notes

*   This logic would be integrated into the game's affinity calculation system, ensuring that a companion's affinity value is correctly modified and capped.
*   The UI displaying companion affinity would need to reflect the presence of modifiers and caps (e.g., showing a base affinity, applied modifiers, and the effective cap).
*   The system should re-evaluate modifiers and caps whenever relevant conditions change (e.g., a companion joins/leaves the party, a quest flag is set, the player changes levels).

## 8. Benefits

This system provides a powerful tool for narrative design:
*   **Narrative Consequence:** Player choices (e.g., recruiting Fana) have tangible, mechanical impacts on relationships.
*   **Character Depth:** Companions can react realistically to the world and each other, reflecting their personalities and backstories.
*   **Dynamic Storytelling:** Affinity progression becomes less linear, allowing for more nuanced and branching relationship arcs.
