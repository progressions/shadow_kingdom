// Companion effect definitions for realtime auras (Phase 1)
// Types: atk, dr, regen, range, slow, touchDR, rangedDR, deflect, aspd, crit, dashCdr
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
      // Wind ward: strong resistance to ranged/projectile damage
      { type: 'rangedDR', value: 3 },
      // Wind deflection: chance to deflect incoming projectiles near the player
      { type: 'deflect', value: 0.35, radius: 56, anchor: 'player' },
      // Slipstream (passive): modest dash cooldown reduction
      { type: 'dashCdr', value: 0.15 },
    ],
    triggers: {
      gust: { radius: 24, slow: 0.25, durationSec: 0.4, push: 14, cooldownSec: 10 },
    },
  },
  oyin: {
    auras: [
      // Adopt Twil's former role: control + sturdiness
      { type: 'slow', value: 0.15, radius: 42, anchor: 'player' },
      { type: 'dr', value: 1 },
      { type: 'crit', value: 0.05 },
    ],
    // (Veil trigger handled in code under Oyin after swap)
  },
  twil: {
    auras: [
      // Adopt Oyin's prior role: precision + reach (and fire synergy handled in code)
      { type: 'range', value: 1 },
      { type: 'crit', value: 0.05 },
      // Quick step: minor dash cooldown reduction
      { type: 'dashCdr', value: 0.10 },
    ],
    // Fire-on-arrow handled in projectile impact code
  },
  tin: {
    auras: [
      // Hype: increase attack speed (reduces attack cooldown)
      { type: 'aspd', value: 0.12 },
      // Slipstream: reduce dash cooldown noticeably
      { type: 'dashCdr', value: 0.20 },
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
      // Sharp eye: small crit chance bonus
      { type: 'crit', value: 0.05 },
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
  cowsill: {
    auras: [
      // Striker synergy: base attack boost that scales with affinity
      { type: 'atk', value: 2 },
      // Quick strikes: minor attack speed increase
      { type: 'aspd', value: 0.15 },
    ],
    // Echo Strike: bonus damage on player hits (similar to Yorna but stronger)
    onPlayerHit: { bonusPct: 0.75, cooldownSec: 0.8 },
    triggers: {
      // Double Strike: when player lands a hit, chance for instant follow-up
      doubleStrike: { chance: 0.2, dmgMult: 1.5, cooldownSec: 3 },
    },
  },
  snake: {
    // Ssil the Snake — subtle control + bite
    auras: [
      // Venomous presence: slight enemy slow near the player
      { type: 'slow', value: 0.10, radius: 36, anchor: 'player' },
      // Fang focus: a small attack boost
      { type: 'atk', value: 1 },
    ],
    // Triggers could be added later (e.g., brief stronger slow on recent hit)
  },
};

// Global caps to keep stacks reasonable
export const COMPANION_BUFF_CAPS = {
  atk: 3,      // higher max attack bonus from auras
  dr: 3,       // higher max damage reduction from auras
  regen: 0.6,  // HP per second (increased sustain ceiling)
  range: 4,    // pixels (slightly longer reach stacking)
  touchDR: 2,  // stronger mitigation vs touch/contact damage
  rangedDR: 4, // strong mitigation vs ranged/projectile damage
  deflect: 0.6, // up to 60% chance to deflect a projectile entering the wind aura
  slow: 0.35,  // 35% max slow from stacked auras/triggers
  aspd: 0.75,  // up to +75% attack speed from stacked sources
  crit: 0.25,  // up to +25% absolute crit chance from auras
  dashCdr: 0.75, // dash cooldown reduction factor used as (cd / (1 + dashCdr))
};
