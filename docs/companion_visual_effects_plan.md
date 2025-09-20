# Companion Trigger Visual Effects Plan

## Overview
This plan introduces reusable visual effect presets that companion triggers can reference. The goal is to expand beyond floating combat text so designers can attach auras, glows, or sprites to triggers without touching engine code. The implementation keeps current systems intact while layering new helpers for managing visual lifecycles.

## Goals
- Allow any companion trigger to spawn preconfigured visuals (aura gradients, sprite banners, additive glows, text cues).
- Centralize preset definitions to reduce copy-pasted effect logic and encourage reuse.
- Ensure visuals follow their anchors, respect duration/cooldown, and play nicely with existing UI overlays and camera shake.
- Maintain backward compatibility so legacy `text` and `sparkles` effects continue to work during migration.

## Data Model Upgrades
1. Add `src/data/visual_effects.js` with exports like `visualEffectPresets`. Each preset includes:
   - `id`, `kind` (`'aura' | 'glow' | 'sprite' | 'text'`).
   - Appearance properties (colors, radius, sprite path, animation hints, blend mode).
   - Default anchor (`'player'`, `'companion'`, `'world'`) and optional offsets.
   - Default duration and stacking semantics (`replaceId`, `maxStacks`).
2. Extend `triggers2` entries in `src/data/companion_effects.js` to accept `{ type: 'visual', effect: 'presetId', anchor?, durationSec?, overrides? }`.
3. Allow inline overrides to tweak preset attributes per trigger without redefining the preset (e.g., `radius`, `color`, `text`).

## Engine Support
1. In `src/engine/state.js` (or a dedicated `src/engine/visual_effects.js` module):
   - Track an array `visualEffects` with entries storing preset id, anchor reference, resolved properties, timers, and render layer.
   - Provide helpers:
     - `spawnVisualEffect({ presetId, anchorRef, duration, overrides, replaceId })`.
     - `updateVisualEffects(dt)` to tick timers, refresh anchors, and remove expired visuals.
     - `clearVisualEffect(replaceId)` for manual teardown if needed.
2. When `processGenericCompanionTriggers` fires an effect of `type: 'visual'`, call `spawnVisualEffect`, passing the triggering companion as the anchor when appropriate.
3. Reuse existing collections when possible: map `kind: 'text'` to the current `spawnFloatText` path so content authors can migrate gradually.
4. Add defensive logging if a preset is missing or an anchor cannot be resolved, aiding rapid data iteration.

## Rendering Flow
1. In `src/engine/render.js`, introduce a visual-effects pass:
   - Draw ground-layer effects (auras, floor decals) before actors.
   - Draw overlay effects (glows, hovering sprites) after actors but before UI overlays.
2. Implement drawing helpers per `kind`:
   - `aura`: radial gradient or soft mask centered on anchor.
   - `glow`: reuse existing outline helper with configurable blur, pulse, color.
   - `sprite`: load with `getSprite`, apply offsets and optional bobbing/rotation.
   - `text`: delegate to existing float text rendering for consistency.
3. Respect camera transforms, screen shake, and skip drawing if the effect is outside the viewport to avoid wasted work.

## Migration & QA
1. Convert one or two flagship triggers (e.g., Canopy low-HP shield, Yorna execute window) to validate the data pipeline before mass migration.
2. Manual QA checklist:
   - Trigger the effect and confirm visuals appear, follow anchors, fade correctly, and do not block input.
   - Stress-test with multiple simultaneous effects to ensure performance holds.
   - Verify layering against terrain, actors, and UI overlays.
3. Run existing dev helpers (`runLightSaveTests()`) to ensure the new state data does not break save/load.

## Effect Examples
Below are ready-to-adapt snippets showing how to define presets and attach them to triggers.

### Aura Gradient
**Preset (`src/data/visual_effects.js`):**
```js
export const visualEffectPresets = {
  shadow_aura: {
    kind: 'aura',
    colorInner: 'rgba(60, 0, 80, 0.45)',
    colorOuter: 'rgba(10, 0, 20, 0)',
    radius: 42,
    defaultAnchor: 'companion',
    layer: 'ground'
  },
  // ...
};
```

**Trigger addition (`src/data/companion_effects.js`):**
```js
effects: [
  { type: 'shield', durationSec: 3 },
  { type: 'visual', effect: 'shadow_aura', anchor: 'companion', durationSec: 3.2, replaceId: 'yorna_shadow_aura' }
]
```

### Glow Outline
**Preset:**
```js
radiant_glow: {
  kind: 'glow',
  color: '#ffd166',
  pulseSpeed: 4,
  blur: 16,
  defaultAnchor: 'player',
  layer: 'overlay'
}
```

**Trigger addition:**
```js
effects: [
  { type: 'temp_buffs', buffs: { dr: 1 }, durationSec: 4 },
  { type: 'visual', effect: 'radiant_glow', anchor: 'player', durationSec: 4, replaceId: 'canopy_radiant_glow' }
]
```

### Sprite Banner
**Preset:**
```js
void_banner: {
  kind: 'sprite',
  spriteId: 'assets/effects/void_banner.png',
  defaultAnchor: 'companion',
  offset: { x: 0, y: -18 },
  bobAmplitude: 3,
  bobSpeed: 1.2,
  blend: 'additive'
}
```

**Trigger addition:**
```js
effects: [
  { type: 'area_enemy_temp_dr', radius: 60, amount: -2, durationSec: 4 },
  { type: 'visual', effect: 'void_banner', anchor: 'companion', durationSec: 4, replaceId: 'yorna_void_banner' }
]
```

### Floating Text (Legacy Compatible)
**Preset:**
```js
crit_text: {
  kind: 'text',
  defaultAnchor: 'player',
  color: '#ff9a3d',
  defaultText: 'Critical!'
}
```

**Trigger addition:**
```js
effects: [
  { type: 'temp_stats', ap: 2, durationSec: 2 },
  { type: 'visual', effect: 'crit_text', anchor: 'player', overrides: { text: 'Execute!' } }
]
```

With these examples, designers can attach visuals to companion triggers by referencing presets, setting anchors, and applying optional overrides. Once the helpers and rendering hooks are in place, adding new visual flair becomes a data-only change.
