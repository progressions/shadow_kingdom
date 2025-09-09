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
};

// Global caps to keep stacks reasonable
export const COMPANION_BUFF_CAPS = {
  atk: 2,
  dr: 2,
  regen: 0.4, // HP per second
  range: 3,   // pixels
  touchDR: 1,
  slow: 0.25, // 25%
};
