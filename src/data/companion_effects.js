// Companion effect definitions for realtime auras (Phase 1)
// Types: atk, dr, regen, range, slow, touchDR, rangedDR, deflect, aspd, crit, dashCdr, waterWalk
// For slow auras, radius is in pixels and anchor can be 'player' or 'self'.

export const companionEffectsByKey = {
  canopy: {
    auras: [
      { type: 'dr', value: 1 },
      { type: 'regen', value: 0.2 },
    ],
    triggers: {
      shield: { hpThresh: 0.4, cooldownSec: 12, durationSec: 6 },
      l8: { key: 'aegis', name: 'Aegis Surge', cooldownSec: 18, durationSec: 3, desc: 'Bubble: +DR, small regen, KB resist' },
      l10: { key: 'veil', name: 'Guardian Veil', cooldownSec: 40, durationSec: 1.5, desc: 'Near-invuln (block one hit)' },
    },
  },
  yorna: {
    auras: [
      { type: 'atk', value: 1 },
      { type: 'range', value: 2 },
    ],
    onPlayerHit: { bonusPct: 0.5, cooldownSec: 1.2 },
    triggers: {
      l8: { key: 'expose', name: 'Expose Weakness', cooldownSec: 14, durationSec: 4, desc: 'Armor shred aura on Dash/Crit' },
      l10: { key: 'execute', name: 'Execution Window', cooldownSec: 35, durationSec: 2, desc: 'AP+true vs low HP targets' },
    },
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
      l8: { key: 'slipstream', name: 'Slipstream Field', cooldownSec: 12, durationSec: 2, desc: 'Dash triggers tailwind: dash CDR boost' },
      l10: { key: 'maelstrom', name: 'Maelstrom', cooldownSec: 32, durationSec: 1.5, desc: 'Radial knockback + heavy slow' },
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
    triggers: {
      l8: { key: 'veilAnchor', name: 'Veil Anchor', cooldownSec: 16, durationSec: 3, desc: 'Ranged hit creates slow+DR zone' },
      l10: { key: 'eclipse', name: 'Eclipse', cooldownSec: 45, durationSec: 2, desc: 'Global slow + minor DoT; player DR' },
    },
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
    triggers: {
      l8: { key: 'flare', name: 'Flare Chain', cooldownSec: 12, durationSec: 1.2, desc: 'On melee hit, ignite nearby enemies' },
      l10: { key: 'detonate', name: 'Detonate Brand', cooldownSec: 40, durationSec: 0.1, desc: 'Detonate sustained burns in small AoE' },
    },
  },
  tin: {
    auras: [
      // Hype: increase attack speed (reduces attack cooldown)
      { type: 'aspd', value: 0.12 },
      // Slipstream: reduce dash cooldown noticeably
      { type: 'dashCdr', value: 0.20 },
      // Water affinity: allow walking on water when in party
      { type: 'waterWalk' },
    ],
    // Triggers can be added later (Slipstream, Tumble Up, etc.)
    triggers: {
      l8: { key: 'overclock', name: 'Overclock', cooldownSec: 16, durationSec: 3, desc: 'After Dash Combo: +ASPD & dash CDR' },
      l10: { key: 'symphony', name: 'Symphony', cooldownSec: 45, durationSec: 4, desc: 'Hyper: +ASPD +crit; reset dash CD' },
    },
  },
  urn: {
    auras: [
      // Light ambient positivity: small passive regen
      { type: 'regen', value: 0.1 },
    ],
    triggers: {
      // Burst heal when HP dips low
      cheer: { hpThresh: 0.5, heal: 3, radius: 80, cooldownSec: 12 },
      l8: { key: 'beaconSurge', name: 'Beacon Surge', cooldownSec: 20, durationSec: 3, desc: 'Low HP pulse heal + +ASPD' },
      l10: { key: 'secondWind', name: 'Second Wind', cooldownSec: 999, durationSec: 1.2, desc: 'Per-level revive at 1 HP' },
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
      l8: { key: 'perfectAngle', name: 'Perfect Angle', cooldownSec: 14, durationSec: 3, desc: 'Next attack pierces + AP on alignment' },
      l10: { key: 'timeDilation', name: 'Time Dilation', cooldownSec: 40, durationSec: 2, desc: 'Enemy slow; your shots pierce + crit' },
    },
  },
  nellis: {
    auras: [
      // Steady Pace: small, constant damage reduction
      { type: 'dr', value: 1 },
    ],
    // Triggers implemented in code: Mourner's Veil, Beacon, Keep the Line
    triggers: {
      l8: { key: 'phalanx', name: 'Phalanx', cooldownSec: 20, durationSec: 3, desc: '2+ enemies near → +touchDR & KB resist' },
      l10: { key: 'bulwark', name: 'Bulwark', cooldownSec: 45, durationSec: 3, desc: 'Frontal barrier blocks projectiles' },
    },
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
      l8: { key: 'crescendo', name: 'Crescendo', cooldownSec: 18, durationSec: 0.1, desc: 'After 5 hits in 3s, next hit +100% dmg' },
      l10: { key: 'encore', name: 'Encore', cooldownSec: 45, durationSec: 0.1, desc: 'Repeat last melee damage as ghost hits' },
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
    triggers: {
      l8: { key: 'venomCloud', name: 'Venom Cloud', cooldownSec: 18, durationSec: 2, desc: '2s slow + poison DoT around player' },
      l10: { key: 'constriction', name: 'Constriction', cooldownSec: 35, durationSec: 1, desc: 'Root elite or slow boss + heavy DoT' },
    },
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
