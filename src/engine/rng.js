import { runtime } from './state.js';

// Simple LCG per category for deterministic RNG: X_{n+1} = (a X_n + c) mod m
// Use 32-bit math; return [0,1) floats by dividing by 2^32.
const A = 1664525 >>> 0;
const C = 1013904223 >>> 0;

function ensureBucket() {
  if (!runtime.rng) runtime.rng = { world: null, combat: null, loot: null };
}

export function rngSeed(category, seed) {
  ensureBucket();
  const key = String(category || 'world');
  const s = (Number(seed) >>> 0) || 1;
  runtime.rng[key] = s >>> 0;
}

export function rngFloat(category = 'world') {
  ensureBucket();
  const key = String(category);
  let x = (runtime.rng[key] == null) ? 1 : (runtime.rng[key] >>> 0);
  x = (Math.imul(A, x) + C) >>> 0;
  runtime.rng[key] = x;
  return (x >>> 0) / 4294967296; // 2^32
}

export function rngInt(category, min, max) {
  const r = rngFloat(category);
  return Math.floor(min + r * (max - min + 1));
}

// Expose helpers for console/tests
try {
  if (typeof window !== 'undefined') {
    window.rngSeed = rngSeed;
    window.rngFloat = rngFloat;
  }
} catch {}

