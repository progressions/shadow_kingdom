// Companion effect definitions for realtime auras (Phase 1)
// Types: atk, dr, regen, range, slow, touchDR
// For slow auras, radius is in pixels and anchor can be 'player' or 'self'.

export const companionEffectsByKey = {
  canopy: {
    auras: [
      { type: 'dr', value: 1 },
      { type: 'regen', value: 0.2 },
    ],
    triggers: {
      shield: { hpThresh: 0.4, cooldownSec: 12, durationSec: 6 },
    },
  },
  yorna: {
    auras: [
      { type: 'atk', value: 1 },
      { type: 'range', value: 2 },
    ],
    onPlayerHit: { bonusPct: 0.5, cooldownSec: 1.2 },
  },
  hola: {
    auras: [
      { type: 'slow', value: 0.2, radius: 48, anchor: 'player' },
      { type: 'touchDR', value: 1 },
    ],
    triggers: {
      gust: { radius: 24, slow: 0.25, durationSec: 0.4, push: 14, cooldownSec: 10 },
    },
  },
  oyin: {
    auras: [
      { type: 'range', value: 1 },
    ],
    // rally trigger handled in code
  },
  twil: {
    auras: [
      { type: 'slow', value: 0.15, radius: 42, anchor: 'player' },
      { type: 'dr', value: 1 },
    ],
    // dust veil trigger handled in code
  },
  tin: {
    auras: [
      // Hype: increase attack speed (reduces attack cooldown)
      { type: 'aspd', value: 0.12 },
    ],
    // Triggers can be added later (Slipstream, Tumble Up, etc.)
  },
  urn: {
    auras: [
      // Light ambient positivity: small passive regen
      { type: 'regen', value: 0.1 },
    ],
    triggers: {
      // Burst heal when HP dips low
      cheer: { hpThresh: 0.5, heal: 3, radius: 80, cooldownSec: 12 },
    },
  },
  varabella: {
    auras: [
      // Tactical awareness: slightly extended range
      { type: 'range', value: 1 },
    ],
    triggers: {
      // Timing window: brief ATK + range buff when enemies are nearby
      angle: { atk: 1, range: 2, durationSec: 3, cooldownSec: 9, proximity: 140 },
    },
  },
  nellis: {
    auras: [
      // Steady Pace: small, constant damage reduction
      { type: 'dr', value: 1 },
    ],
    // Triggers implemented in code: Mourner's Veil, Beacon, Keep the Line
  },
};

// Global caps to keep stacks reasonable
export const COMPANION_BUFF_CAPS = {
  atk: 2,
  dr: 2,
  regen: 0.4, // HP per second
  range: 3,   // pixels
  touchDR: 1,
  slow: 0.25, // 25%
  aspd: 0.5,  // +50% attack speed (cooldown reduction factor)
};
