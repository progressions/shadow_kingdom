// Enemy effect definitions for auras/triggers (key guardians phase 1)
// Shape per enemy key (lowercase name):
// {
//   auras: {
//     dr?: number,
//     regen?: number,
//     regenNear?: { radius: number, mult: number },
//     playerSlow?: number, slowRadius?: number,
//     weakenRange?: number, weakenRadius?: number,
//   },
//   triggers: {
//     onHitGuard?: { dr: number, durationSec: number, cooldownSec: number, speedMul?: number },
//     proximityGust?: { radius: number, push: number, slow: number, durationSec: number, cooldownSec: number },
//     enrageBelowHp?: { hpThresh: number, dr?: number, speedMul?: number, durationSec: number, cooldownSec: number },
//   }
// }

export const ENEMY_BUFF_CAPS = {
  dr: 3,
  regen: 0.25,
  playerSlow: 0.4,
  weakenRange: 2,
};

export const enemyEffectsByKey = {
  // Level 1 — Gorg (Ember Crown)
  gorg: {
    // Tougher key guardian: add baseline DR and slightly stronger guard
    auras: { playerSlow: 0.08, slowRadius: 90, dr: 1 },
    triggers: {
      onHitGuard: { dr: 1.5, durationSec: 2.5, cooldownSec: 7 },
      proximityGust: { radius: 24, push: 10, slow: 0.2, durationSec: 0.3, cooldownSec: 12 },
    },
  },
  // Level 2 — Aarg (Serpent Chill)
  aarg: {
    // Tougher key guardian
    auras: { playerSlow: 0.12, slowRadius: 110, dr: 1 },
    triggers: {
      onHitGuard: { dr: 1.5, durationSec: 3.0, cooldownSec: 9, speedMul: 1.1 },
      proximityGust: { radius: 30, push: 12, slow: 0.2, durationSec: 0.3, cooldownSec: 10 },
    },
  },
  // Level 3 — Wight (Grave Hunger)
  wight: {
    // Tougher key guardian: add baseline DR
    auras: {
      dr: 1,
      regen: 0.05,
      regenNear: { radius: 100, mult: 2.0 },
      weakenRange: 1, weakenRadius: 100,
    },
    triggers: {
      proximityGust: { radius: 36, push: 0, slow: 0.3, durationSec: 0.4, cooldownSec: 9 },
    },
  },
  // Level 4 — Blurb (Toxic Miasma)
  blurb: {
    // Tougher key guardian: adds baseline DR
    auras: { weakenRange: 2, weakenRadius: 140, dr: 1 },
    triggers: {
      onHitGuard: { dr: 2, durationSec: 1.5, cooldownSec: 10 },
      proximityGust: { radius: 38, push: 12, slow: 0.25, durationSec: 0.35, cooldownSec: 11 },
    },
  },
  // Level 5 — Fana (Arcane Distortion)
  fana: {
    // Tougher key guardian
    auras: { playerSlow: 0.10, slowRadius: 120, weakenRange: 1, weakenRadius: 120, dr: 1 },
    triggers: {
      enrageBelowHp: { hpThresh: 0.5, dr: 1.5, speedMul: 1.1, durationSec: 5, cooldownSec: 12 },
      // Only at low HP, reactively push on hit
      proximityGust: { radius: 28, push: 14, slow: 0.25, durationSec: 0.35, cooldownSec: 12 },
    },
  },
  // Bosses
  vast: {
    // Tougher boss: higher baseline DR
    auras: { dr: 2, regen: 0.05 },
    triggers: {
      proximityGust: { radius: 28, push: 12, slow: 0.2, durationSec: 0.4, cooldownSec: 10 },
      enrageBelowHp: { hpThresh: 0.5, dr: 1, speedMul: 1.1, durationSec: 5, cooldownSec: 12 },
    },
  },
  nethra: {
    // Add solid baseline DR
    auras: { dr: 2, weakenRange: 1, weakenRadius: 120 },
    triggers: {
      enrageBelowHp: { hpThresh: 0.6, dr: 1, speedMul: 1.1, durationSec: 5, cooldownSec: 12 },
      proximityGust: { radius: 30, push: 10, slow: 0.2, durationSec: 0.35, cooldownSec: 11 },
    },
  },
  luula: {
    // Add baseline DR to make boss sturdier
    auras: { dr: 2, playerSlow: 0.10, slowRadius: 120 },
    triggers: {
      enrageBelowHp: { hpThresh: 0.5, dr: 1, speedMul: 1.15, durationSec: 5, cooldownSec: 12 },
      proximityGust: { radius: 26, push: 10, slow: 0.2, durationSec: 0.3, cooldownSec: 10 },
    },
  },
  vanificia: {
    // Slightly higher DR
    auras: { dr: 2.4 },
    triggers: {
      proximityGust: { radius: 32, push: 12, slow: 0.22, durationSec: 0.35, cooldownSec: 9 },
      enrageBelowHp: { hpThresh: 0.5, dr: 1, speedMul: 1.1, durationSec: 4, cooldownSec: 10 },
    },
  },
  vorthak: {
    // Heaviest baseline DR among bosses
    auras: { dr: 2.6, regen: 0.1 },
    triggers: {
      // Fires below ~66% and again below ~33% as cooldown allows
      enrageBelowHp: { hpThresh: 0.66, dr: 1, speedMul: 1.15, durationSec: 6, cooldownSec: 10 },
      proximityGust: { radius: 34, push: 14, slow: 0.25, durationSec: 0.4, cooldownSec: 10 },
    },
  },
  // ---- Normal featured foes — slight DR to make them tougher ----
  'featured foe': { auras: { dr: 0.5 } },
  'woodland brute': { auras: { dr: 0.5 } },
  'bandit lieutenant': { auras: { dr: 0.6 } },
  'desert enforcer': { auras: { dr: 0.6 } },
  'desert marauder': { auras: { dr: 0.5 } },
  'marsh stalker': { auras: { dr: 0.6 } },
  'city brute': { auras: { dr: 0.7 } },
  'temple sentinel': { auras: { dr: 0.8 } },
  'ambusher': { auras: { dr: 0.5 } },
  'stalker': { auras: { dr: 0.5 } },
  'ring captain': { auras: { dr: 0.7 } },
  'silencer': { auras: { dr: 0.6 } },
  'lantern bearer': { auras: { dr: 0.6 } },
  'signal thief': { auras: { dr: 0.6 } },
  'crossfire captain': { auras: { dr: 0.7 } },
};
