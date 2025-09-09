import { player, enemies } from './state.js';

let masterVolume = 0.7;
let muted = false;
let unlocked = false;
let musicEnabled = true;
let currentMusic = null;
let useChip = true; // programmatic 8-bit synth by default
// Discrete menace mode: 'normal' | 'low' | 'high'
let menaceMode = 'normal';

const files = {
  music: {
    ambient: 'assets/audio/music/ambient.mp3',
    ambient_low: 'assets/audio/music/ambient_low.mp3',
    ambient_high: 'assets/audio/music/ambient_high.mp3',
  },
  sfx: {
    attack: 'assets/audio/sfx/attack.wav',
    hit: 'assets/audio/sfx/hit.wav',
    uiOpen: 'assets/audio/sfx/ui-open.wav',
    uiMove: 'assets/audio/sfx/ui-move.wav',
    uiSelect: 'assets/audio/sfx/ui-select.wav',
    uiClose: 'assets/audio/sfx/ui-close.wav',
  },
};

const cache = new Map();

// Music ducking state (for VN intro sting)
let duckTimers = { restore: null };
let duckPrevVol = null; // for file-based music

function getAudio(path) {
  if (!path) return null;
  if (cache.has(path)) return cache.get(path);
  const a = new Audio(path);
  a.preload = 'auto';
  cache.set(path, a);
  return a;
}

export function initAudioUnlock() {
  if (unlocked) return;
  unlocked = true; // mark unlocked on first gesture
  // init WebAudio context lazily when using chip synth
  if (useChip) ensureAC();
  if (musicEnabled) tryStartMusic(trackForMode(menaceMode));
}

export function toggleMute() { muted = !muted; applyVolumes(); }
export function isMuted() { return muted; }
export function setMasterVolume(v) { masterVolume = Math.max(0, Math.min(1, v)); applyVolumes(); }

function applyVolumes() {
  for (const a of cache.values()) {
    a.volume = muted ? 0 : masterVolume;
  }
  setGainVolumes();
}

export function playSfx(name) {
  // VN intros cause brief background music duck
  if (name === 'vnIntro' || name === 'vnIntroNpc' || name === 'vnIntroEnemy') {
    try { duckBackgroundMusic(0.5, 0.8, 0.1); } catch {}
  }
  if (useChip) { playSfxChip(name); return; }
  const path = files.sfx[name];
  if (!path) return;
  const a = getAudio(path);
  if (!a) return;
  try {
    a.currentTime = 0;
    a.volume = muted ? 0 : masterVolume;
    a.play().catch(()=>{});
  } catch {}
}

export function tryStartMusic(name = 'ambient') {
  if (!musicEnabled) return;
  if (useChip) { startChipMusic(); return; }
  const path = files.music[name];
  if (!path) return;
  if (currentMusic && currentMusic.src && currentMusic.src.includes(path)) return;
  if (currentMusic && currentMusic.pause) { try { currentMusic.pause(); } catch {} }
  const a = getAudio(path);
  if (!a) return;
  a.loop = true;
  a.volume = muted ? 0 : masterVolume * 0.6;
  currentMusic = a;
  a.play().catch(()=>{});
}

export function stopMusic() {
  if (currentMusic) {
    try { currentMusic.stop ? currentMusic.stop() : currentMusic.pause && currentMusic.pause(); } catch {}
  }
  currentMusic = null;
}

export function toggleMusic() {
  musicEnabled = !musicEnabled;
  if (musicEnabled) tryStartMusic(trackForMode(menaceMode));
  else stopMusic();
}

export function toggleChipMode() {
  useChip = !useChip;
  stopMusic();
  if (musicEnabled) tryStartMusic(trackForMode(menaceMode));
}

export function setMusicMode(mode) {
  const m = (mode === 'high') ? 'high' : (mode === 'low' ? 'low' : 'normal');
  if (m === menaceMode) return;
  menaceMode = m;
  if (musicEnabled) {
    if (useChip) {
      // Rebuild the chip music with the new theme
      stopMusic();
      startChipMusic();
    } else {
      // For file-based music, switch tracks
      tryStartMusic(trackForMode(menaceMode));
    }
  }
}

function trackForMode(mode) {
  switch (mode) {
    case 'high': return files.music.ambient_high ? 'ambient_high' : 'ambient';
    case 'low': return files.music.ambient_low ? 'ambient_low' : 'ambient';
    default: return 'ambient';
  }
}

// ----- Programmatic 8-bit synth (Web Audio) -----
let ac = null, masterGain, sfxGain, musicGain, musicFilter;
let musicTimer = null;
let musicPhase = 0; // for filter sweep

function ensureAC() {
  if (ac) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  ac = new Ctx();
  masterGain = ac.createGain(); masterGain.gain.value = muted ? 0 : masterVolume; masterGain.connect(ac.destination);
  sfxGain = ac.createGain(); sfxGain.gain.value = 1.0; sfxGain.connect(masterGain);
  musicGain = ac.createGain(); musicGain.gain.value = 0.6;
  musicFilter = ac.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 2000; musicFilter.Q.value = 0.7;
  musicGain.connect(musicFilter).connect(masterGain);
}

function setGainVolumes() {
  if (!ac || !masterGain) return;
  masterGain.gain.value = muted ? 0 : masterVolume;
}

function envTone({ type = 'square', freq = 440, attack = 0.005, decay = 0.08, sustain = 0.0, release = 0.02, gain = 0.2, dest = sfxGain, t = ac.currentTime }) {
  ensureAC(); if (!ac) return;
  const osc = ac.createOscillator(); osc.type = type; osc.frequency.value = freq;
  const g = ac.createGain(); g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.linearRampToValueAtTime(gain * sustain, t + attack + decay);
  g.gain.linearRampToValueAtTime(0.0001, t + attack + decay + release);
  osc.connect(g).connect(dest);
  osc.start(t); osc.stop(t + attack + decay + release + 0.02);
}

function noiseBurst({ attack = 0.005, decay = 0.05, release = 0.03, gain = 0.2, dest = sfxGain, t = ac.currentTime }) {
  ensureAC(); if (!ac) return;
  const buffer = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource(); src.buffer = buffer;
  const g = ac.createGain(); g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.linearRampToValueAtTime(0.0001, t + attack + decay + release);
  src.connect(g).connect(dest);
  src.start(t); src.stop(t + attack + decay + release + 0.02);
}

function playSfxChip(name) {
  if (!ac) ensureAC(); if (!ac) return;
  const t = ac.currentTime;
  switch (name) {
    case 'attack':
      // quick pitch-down blip
      envTone({ type: 'square', freq: 880, attack: 0.002, decay: 0.04, release: 0.02, gain: 0.15, t });
      envTone({ type: 'square', freq: 660, attack: 0.004, decay: 0.06, release: 0.03, gain: 0.12, t: t + 0.01 });
      break;
    case 'hit':
      noiseBurst({ attack: 0.001, decay: 0.05, release: 0.05, gain: 0.18, t });
      break;
    case 'uiOpen':
      envTone({ type: 'triangle', freq: 660, attack: 0.001, decay: 0.06, release: 0.02, gain: 0.08, t });
      break;
    case 'uiMove':
      envTone({ type: 'sine', freq: 520, attack: 0.001, decay: 0.04, release: 0.02, gain: 0.06, t });
      break;
    case 'uiSelect':
      envTone({ type: 'triangle', freq: 740, attack: 0.001, decay: 0.08, release: 0.03, gain: 0.1, t });
      break;
    case 'uiClose':
      envTone({ type: 'triangle', freq: 440, attack: 0.001, decay: 0.06, release: 0.02, gain: 0.06, t });
      break;
    case 'block':
      // quick metallic ping for blocked damage
      envTone({ type: 'triangle', freq: 1200, attack: 0.001, decay: 0.03, release: 0.02, gain: 0.07, t });
      envTone({ type: 'square', freq: 800, attack: 0.001, decay: 0.04, release: 0.02, gain: 0.05, t: t + 0.01 });
      break;
    case 'unlock':
      // rising arpeggio to indicate unlocking
      envTone({ type: 'triangle', freq: 660, attack: 0.001, decay: 0.05, release: 0.03, gain: 0.08, t });
      envTone({ type: 'triangle', freq: 880, attack: 0.001, decay: 0.07, release: 0.04, gain: 0.08, t: t + 0.06 });
      envTone({ type: 'square',   freq: 990, attack: 0.001, decay: 0.08, release: 0.04, gain: 0.07, t: t + 0.12 });
      break;
    case 'vnIntro':
    case 'vnIntroNpc':
      // Alternative "meeting" sting (NPC): airy whoosh + soft chime cluster (minor add9 flavor)
      noiseBurst({ attack: 0.004, decay: 0.12, release: 0.08, gain: 0.05, t });
      envTone({ type: 'sine',     freq: 523.25, attack: 0.010, decay: 0.18, release: 0.12, gain: 0.06, t: t + 0.02 }); // C5
      envTone({ type: 'triangle', freq: 659.25, attack: 0.008, decay: 0.20, release: 0.14, gain: 0.075, t: t + 0.05 }); // E5
      envTone({ type: 'triangle', freq: 880.00, attack: 0.008, decay: 0.22, release: 0.16, gain: 0.08, t: t + 0.08 }); // A5
      envTone({ type: 'sine',     freq: 987.77, attack: 0.006, decay: 0.24, release: 0.18, gain: 0.055, t: t + 0.11 }); // B5(add9)
      break;
    case 'vnIntroEnemy':
      // Enemy intro sting: darker, tense, with dissonant cluster and thump
      noiseBurst({ attack: 0.001, decay: 0.08, release: 0.06, gain: 0.10, t }); // percussive thump
      envTone({ type: 'triangle', freq: 196.00, attack: 0.002, decay: 0.14, release: 0.10, gain: 0.10, t: t + 0.00 }); // G3
      envTone({ type: 'square',   freq: 207.65, attack: 0.001, decay: 0.16, release: 0.12, gain: 0.09, t: t + 0.02 }); // G#3 (minor 2nd)
      envTone({ type: 'square',   freq: 311.13, attack: 0.001, decay: 0.20, release: 0.14, gain: 0.08, t: t + 0.06 }); // D#4
      // small downward blip
      envTone({ type: 'triangle', freq: 392.00, attack: 0.002, decay: 0.10, release: 0.08, gain: 0.07, t: t + 0.10 }); // G4
      envTone({ type: 'triangle', freq: 349.23, attack: 0.002, decay: 0.12, release: 0.08, gain: 0.06, t: t + 0.14 }); // F4
      break;
    case 'partyJoin':
      // Bright ascending arpeggio for join
      envTone({ type: 'triangle', freq: 440.00, attack: 0.001, decay: 0.08, release: 0.05, gain: 0.09, t }); // A4
      envTone({ type: 'square',   freq: 587.33, attack: 0.001, decay: 0.10, release: 0.06, gain: 0.10, t: t + 0.05 }); // D5
      envTone({ type: 'square',   freq: 880.00, attack: 0.001, decay: 0.12, release: 0.06, gain: 0.11, t: t + 0.10 }); // A5
      break;
    case 'pickup':
      // Soft pickup chime
      envTone({ type: 'sine', freq: 880.0, attack: 0.002, decay: 0.08, release: 0.05, gain: 0.06, t });
      envTone({ type: 'triangle', freq: 1320.0, attack: 0.001, decay: 0.10, release: 0.06, gain: 0.05, t: t + 0.02 });
      break;
    case 'break':
      // Crunchy break sound for barrels/crates
      noiseBurst({ attack: 0.001, decay: 0.06, release: 0.05, gain: 0.16, t });
      envTone({ type: 'triangle', freq: 220, attack: 0.001, decay: 0.05, release: 0.04, gain: 0.08, t });
      break;
  }
}

function duckBackgroundMusic(factor = 0.5, holdSec = 0.8, fadeSec = 0.1) {
  // No music playing or muted → nothing to do
  if (!musicEnabled || muted) return;
  // Chip music path (WebAudio): ramp musicGain
  if (useChip && ac && musicGain) {
    const now = ac.currentTime;
    const base = Math.max(0.0001, musicGain.gain.value);
    const target = Math.max(0.00005, base * Math.max(0.05, factor));
    try {
      musicGain.gain.cancelScheduledValues(now);
      musicGain.gain.setValueAtTime(base, now);
      musicGain.gain.linearRampToValueAtTime(target, now + fadeSec);
      musicGain.gain.linearRampToValueAtTime(base, now + fadeSec + holdSec + fadeSec);
    } catch {}
    return;
  }
  // File-based path: adjust currentMusic volume and restore later
  if (currentMusic && typeof currentMusic.volume === 'number') {
    const base = currentMusic.volume;
    const target = Math.max(0, base * Math.max(0.05, factor));
    // simple step fade (no WebAudio)
    currentMusic.volume = target;
    if (duckTimers.restore) clearTimeout(duckTimers.restore);
    duckPrevVol = base;
    duckTimers.restore = setTimeout(() => {
      try { if (currentMusic) currentMusic.volume = duckPrevVol; } catch {}
      duckTimers.restore = null; duckPrevVol = null;
    }, Math.max(50, (holdSec + fadeSec) * 1000));
  }
}

function startChipMusic() {
  ensureAC(); if (!ac) return;
  // Stop any previous
  stopMusic();
  // Choose a theme by menace mode
  const theme = getThemeForMode(menaceMode);
  const bpm = theme.bpm;
  const stepSec = 60 / bpm / 2; // 8th notes
  const baseA = 220; // A3 reference
  const chordProgA = theme.chordProgA;
  const chordProgB = theme.chordProgB;
  const scaleA = theme.scaleA; // used in section A
  const scaleB = theme.scaleB; // used in section B
  const melodyA1 = theme.melodyA1;
  const melodyA2 = theme.melodyA2;
  const melodyB1 = theme.melodyB1;
  const melodyB2 = theme.melodyB2;
  const melodyA_intense = theme.melodyA_intense || melodyA2;
  const melodyB_intense = theme.melodyB_intense || melodyB2;
  const bassPattern = theme.bassPattern;
  const barsPerSection = theme.barsPerSection;
  const totalBars = barsPerSection * 2; // A then B
  let step = 0;
  function noteFreq(base, semi) { return base * Math.pow(2, semi / 12); }
  function schedule(now) {
    const globalBar = Math.floor(step / 8) % totalBars;
    const section = Math.floor((Math.floor(step / 8)) / barsPerSection) % 2; // 0=A, 1=B
    const chordProg = section === 0 ? chordProgA : chordProgB;
    const bar = globalBar % chordProg.length;
    const inBarStep = step % 8;
    const rootSemi = chordProg[bar];
    const t = now + 0.01;
    // Theme-defined filter and levels
    const intensity = theme.intensity; // 0,1,2 distinct per theme
    // Filter sweep over time
    musicPhase += stepSec;
    if (musicFilter) {
      const baseCut = (section === 0 ? theme.filterBaseA : theme.filterBaseB);
      const range = theme.filterRange;
      const sweep = Math.sin(musicPhase * 0.2) * range * 0.5; // very slow
      const cutoff = Math.max(500, baseCut + sweep);
      musicFilter.frequency.setValueAtTime(cutoff, ac.currentTime);
    }
    // Drums
    const hatEvery = theme.hatEvery || 1; // steps
    if (inBarStep % hatEvery === 0) noiseBurst({ attack: 0.001, decay: theme.hatDecay, release: 0.01, gain: theme.hatGain[intensity], dest: musicGain, t });
    if (theme.kickSteps.includes(inBarStep)) envTone({ type: 'triangle', freq: 110, attack: 0.002, decay: theme.kickDecay, release: 0.04, gain: theme.kickGain[intensity], dest: musicGain, t });
    if (theme.snareSteps.includes(inBarStep)) noiseBurst({ attack: 0.001, decay: theme.snareDecay, release: 0.03, gain: theme.snareGain[intensity], dest: musicGain, t });
    // Bass
    const bassDeg = bassPattern[inBarStep];
    const bassSemi = rootSemi + (bassDeg === 7 ? 7 : 0); // add 5th when 7
    const fBass = noteFreq(baseA / 2, bassSemi);
    envTone({ type: theme.bassType, freq: fBass, attack: 0.002, decay: theme.bassDecay, sustain: 0, release: 0.04, gain: theme.bassGain[intensity], dest: musicGain, t });
    // Melody alternates patterns across more bars for variety
    const useIntense = theme.useIntense && (intensity === 2);
    let pat;
    if (section === 0) {
      if (useIntense) pat = melodyA_intense;
      else {
        const idx = bar % 4;
        pat = (idx === 0) ? melodyA1 : (idx === 1) ? melodyA2 : (theme.melodyA3 || melodyA1);
      }
    } else {
      if (useIntense) pat = melodyB_intense;
      else {
        const idx = bar % 4;
        pat = (idx === 0) ? melodyB1 : (idx === 1) ? melodyB2 : (theme.melodyB3 || melodyB1);
      }
    }
    const scale = (section === 0) ? scaleA : scaleB;
    const deg = scale[pat[inBarStep] % scale.length];
    const fLead = noteFreq(baseA * (section === 1 ? 2 : 1), rootSemi + deg); // B-section one octave up
    const leadType = theme.leadType[section];
    // Some modes intentionally rest on certain steps for spaciousness
    const rest = theme.restSteps && theme.restSteps.includes(inBarStep);
    if (!rest) {
      envTone({ type: leadType, freq: fLead, attack: theme.leadAttack, decay: theme.leadDecay, sustain: 0, release: 0.03, gain: theme.leadGain[intensity], dest: musicGain, t });
    }
    step = (step + 1) % (8 * totalBars); // loop every 32 bars
  }
  currentMusic = { stop: () => { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } } };
  schedule(ac.currentTime);
  musicTimer = setInterval(() => schedule(ac.currentTime), stepSec * 1000);
}

function getThemeForMode(mode) {
  // Gains arrays map intensity index 0/1/2 to volumes
  if (mode === 'high') {
    return {
      intensity: 2,
      bpm: 140,
      // Extended 8-bar progressions for longer loop
      chordProgA: [0, -2, -5, -1, 0, -3, -6, -2],
      chordProgB: [3, -2, -7, 1, 3, -4, -9, 1],
      scaleA: [0, 2, 3, 6, 7, 8, 11], // harmonic-ish
      scaleB: [0, 2, 3, 5, 7, 8, 10],
      melodyA1: [0, 4, 7, 4, 2, 4, 7, 9],
      melodyA2: [7, 6, 4, 2, 4, 6, 7, 11],
      melodyA3: [2, 4, 6, 7, 6, 4, 2, 0],
      melodyB1: [0, 2, 3, 5, 3, 2, 0, 2],
      melodyB2: [7, 9, 11, 9, 7, 6, 4, 2],
      melodyB3: [5, 7, 9, 7, 5, 4, 2, 0],
      melodyA_intense: [9, 7, 11, 9, 7, 6, 9, 11],
      melodyB_intense: [11, 9, 7, 6, 7, 9, 11, 14],
      bassPattern: [0, 0, 7, 0, 0, 0, 7, 0],
      barsPerSection: 16, // doubled
      filterBaseA: 1900,
      filterBaseB: 2100,
      filterRange: 1400,
      hatEvery: 1,
      hatGain: [0.05, 0.06, 0.08],
      hatDecay: 0.02,
      kickSteps: [0, 2, 4, 6],
      kickGain: [0.09, 0.1, 0.12],
      kickDecay: 0.09,
      snareSteps: [4],
      snareGain: [0.08, 0.09, 0.11],
      snareDecay: 0.06,
      bassType: 'square',
      bassGain: [0.08, 0.09, 0.11],
      bassDecay: 0.12,
      leadType: ['square','square'],
      leadGain: [0.1, 0.11, 0.13],
      leadAttack: 0.002,
      leadDecay: 0.16,
      useIntense: true,
      restSteps: [],
    };
  }
  if (mode === 'low') {
    return {
      intensity: 1,
      bpm: 116,
      chordProgA: [0, -1, -5, -3, 0, -4, -6, -2],
      chordProgB: [-2, -5, -1, -4, -2, -6, -3, -5],
      scaleA: [0, 1, 3, 5, 7, 8, 10], // phrygian
      scaleB: [0, 2, 3, 5, 7, 8, 10], // minor
      melodyA1: [0, 1, 3, 1, 0, 1, 3, 5],
      melodyA2: [3, 5, 7, 5, 3, 1, 0, 1],
      melodyA3: [5, 3, 1, 0, 1, 3, 5, 7],
      melodyB1: [0, 2, 3, 5, 3, 2, 0, 2],
      melodyB2: [7, 5, 3, 2, 3, 5, 7, 9],
      melodyB3: [2, 3, 5, 7, 5, 3, 2, 0],
      bassPattern: [0, 0, 0, 7, 0, 0, 0, 7],
      barsPerSection: 24, // doubled
      filterBaseA: 1500,
      filterBaseB: 1700,
      filterRange: 1000,
      hatEvery: 1,
      hatGain: [0.04, 0.055, 0.07],
      hatDecay: 0.02,
      kickSteps: [0, 4, 6],
      kickGain: [0.08, 0.09, 0.1],
      kickDecay: 0.08,
      snareSteps: [4],
      snareGain: [0.07, 0.085, 0.095],
      snareDecay: 0.05,
      bassType: 'triangle',
      bassGain: [0.07, 0.085, 0.1],
      bassDecay: 0.12,
      leadType: ['square','triangle'],
      leadGain: [0.08, 0.1, 0.11],
      leadAttack: 0.004,
      leadDecay: 0.14,
      useIntense: false,
      restSteps: [3],
    };
  }
  // normal
  return {
    intensity: 0,
    bpm: 96,
    chordProgA: [0, -4, -9, -2, 0, -5, -10, -3],
    chordProgB: [3, -2, -7, -5, 3, -4, -9, -2],
    scaleA: [0, 2, 3, 5, 7, 9, 10], // dorian-ish
    scaleB: [0, 3, 5, 7, 10],       // pentatonic
    melodyA1: [0, 2, 4, 2, 0, 2, 4, 6],
    melodyA2: [4, 5, 7, 5, 4, 2, 0, 2],
    melodyA3: [2, 4, 5, 7, 5, 4, 2, 0],
    melodyB1: [0, 3, 4, 7, 4, 3, 0, 2],
    melodyB2: [7, 5, 3, 2, 3, 5, 7, 9],
    melodyB3: [5, 7, 9, 7, 5, 4, 3, 0],
    bassPattern: [0, 0, 7, 0, 0, 0, 7, 0],
    barsPerSection: 32, // doubled
    filterBaseA: 1200,
    filterBaseB: 1400,
    filterRange: 800,
    hatEvery: 2, // half the rate
    hatGain: [0.035, 0.045, 0.055],
    hatDecay: 0.018,
    kickSteps: [0, 4],
    kickGain: [0.07, 0.08, 0.09],
    kickDecay: 0.08,
    snareSteps: [4],
    snareGain: [0.06, 0.07, 0.08],
    snareDecay: 0.05,
    bassType: 'triangle',
    bassGain: [0.06, 0.07, 0.08],
    bassDecay: 0.12,
    leadType: ['triangle','triangle'],
    leadGain: [0.07, 0.08, 0.09],
    leadAttack: 0.006,
    leadDecay: 0.12,
    useIntense: false,
    restSteps: [2, 6],
  };
}
