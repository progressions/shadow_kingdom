// Centralized AI tuning values for quick iteration.
// Edit in console via window.AI_TUNING (exposed in main.js).

export const AI_TUNING = {
  global: {
    // Player ranged detection
    rangedAwareRecentSec: 0.8,
    // Zig-zag activation band
    zigzag: { minDist: 60, maxDist: 220 },
    // Cover behavior
    cover: { searchRadius: 160, minDist: 80, maxDist: 260, cooldown: 0.6 },
    // Juke detection thresholds
    juke: { scanMax: 24, nearAheadPx: 120, lateralPadPx: 6 },
    // Dash activation band
    dash: { minDist: 90, maxDist: 180 },
  },
  boss: {
    zigzag: { weight: 0.55, commitSec: 0.8 },
    brace:  { durationSec: 0.9, kbMul: 0.30, speedMul: 0.85, projDr: 2 },
    juke:   { chance: 0.22, cooldownSec: 1.0, durationSec: 0.28, speedMul: 1.35 },
    cover:  { commitSec: 1.0 },
    dash:   { telegraphSec: 0.18, durationSec: 0.45, speedMul: 2.8, kbMul: 0.15, cooldownBaseSec: 6.5, cooldownJitterSec: 1.5 },
    advance:{ triggerHits: 2, windowSec: 0.8, durationSec: 0.7, speedMul: 1.5, kbMul: 0.12, dashCooldownCapSec: 4.5 },
    // Pursuit/steering
    engageDistPx: 240, // clamp pursuit steering within this distance
    steering: { hazardWeightMul: 0.6, obstaclePenaltyMul: 0.6 },
    baseSpeedMul: 1.20,
    // Telegraph timings (visual wind-up before the attack fires)
    melee: { telegraphSec: 0.18 },
    ranged: { telegraphSec: 0.16 },
    // Flow/path blending
    path: { flowWeight: 0.35, minDot: -0.1 },
  },
  featured: {
    zigzag: { weight: 0.40, commitSec: 0.6 },
    brace:  { durationSec: 0.75, kbMul: 0.40, speedMul: 0.90, projDr: 1.5 },
    juke:   { chance: 0.16, cooldownSec: 1.2, durationSec: 0.22, speedMul: 1.25 },
    cover:  { commitSec: 0.8 },
    dash:   { telegraphSec: 0.16, durationSec: 0.35, speedMul: 2.2, kbMul: 0.20, cooldownBaseSec: 9.0, cooldownJitterSec: 1.5 },
    advance:{ triggerHits: 2, windowSec: 0.8, durationSec: 0.6, speedMul: 1.35, kbMul: 0.20, dashCooldownCapSec: 5.0 },
    engageDistPx: 200,
    steering: { hazardWeightMul: 0.8, obstaclePenaltyMul: 0.85 },
    baseSpeedMul: 1.15,
    // Flow/path blending
    path: { flowWeight: 0.45, minDot: -0.2 },
  },
  mook: {
    zigzag: { weight: 0.0, commitSec: 0.0 },
    brace:  { durationSec: 0.0, kbMul: 1.0, speedMul: 1.0, projDr: 0 },
    juke:   { chance: 0.0, cooldownSec: 0.0, durationSec: 0.0, speedMul: 1.0 },
    cover:  { commitSec: 0.0 },
    dash:   { telegraphSec: 0.0, durationSec: 0.0, speedMul: 1.0, kbMul: 1.0, cooldownBaseSec: 0.0, cooldownJitterSec: 0.0 },
  },
};
