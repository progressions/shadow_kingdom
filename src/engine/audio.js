import { player, enemies } from './state.js';

let masterVolume = 0.7;
let muted = false;
let unlocked = false;
let musicEnabled = true;
let currentMusic = null;
let useChip = true; // programmatic 8-bit synth by default

const files = {
  music: {
    ambient: 'assets/audio/music/ambient.mp3',
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
  if (musicEnabled) tryStartMusic('ambient');
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
  if (musicEnabled) tryStartMusic('ambient');
  else stopMusic();
}

export function toggleChipMode() {
  useChip = !useChip;
  stopMusic();
  if (musicEnabled) tryStartMusic('ambient');
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
  }
}

function startChipMusic() {
  ensureAC(); if (!ac) return;
  // Stop any previous
  stopMusic();
  // Longer loop with A/B sections (each 16 bars). Melody + bass + simple drums
  const bpm = 120; const stepSec = 60 / bpm / 2; // 8th notes
  const baseA = 220; // A3
  const chordProgA = [0, -4, -9, -2];     // Am, F, C, G (semitones from A)
  const chordProgB = [3, -2, -7, -5];     // C, G, D, F  (relative to A)
  const minorScale = [0, 2, 3, 5, 7, 8, 10]; // natural minor
  const pentatonic  = [0, 3, 5, 7, 10];      // minor pentatonic
  const melodyA1 = [0, 2, 4, 2, 0, 2, 4, 6];
  const melodyA2 = [4, 5, 7, 5, 4, 2, 0, 2];
  const melodyB1 = [0, 3, 4, 7, 4, 3, 0, 2]; // slightly brighter motif
  const melodyB2 = [7, 5, 3, 2, 3, 5, 7, 9];
  const melodyA_intense = [4, 6, 7, 9, 7, 6, 4, 2];
  const melodyB_intense = [9, 7, 5, 4, 5, 7, 9, 11];
  const bassPattern =    [0, 0, 7, 0, 0, 0, 7, 0]; // root/5th
  const barsPerSection = 16;
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
    // Dynamic intensity based on nearest enemy distance
    let intense = false;
    try {
      let minD = Infinity;
      for (const e of enemies) {
        const dx = (e.x - player.x), dy = (e.y - player.y);
        const d = Math.hypot(dx, dy);
        if (d < minD) minD = d;
      }
      intense = minD < 80; // within ~5 tiles
    } catch {}
    // Filter sweep over time
    musicPhase += stepSec;
    if (musicFilter) {
      // Base cutoff varies by section and intensity
      const baseCut = section === 0 ? 1400 : 1800;
      const range = intense ? 1200 : 800;
      const sweep = Math.sin(musicPhase * 0.2) * range * 0.5; // very slow
      const cutoff = Math.max(500, baseCut + sweep);
      musicFilter.frequency.setValueAtTime(cutoff, ac.currentTime);
    }
    // Drums
    // Hi-hat every 8th
    noiseBurst({ attack: 0.001, decay: 0.02, release: 0.01, gain: intense ? 0.06 : 0.04, dest: musicGain, t });
    // Kick on 1 and 5, Snare on 5
    if (inBarStep === 0 || inBarStep === 4) envTone({ type: 'triangle', freq: 110, attack: 0.002, decay: 0.08, release: 0.04, gain: intense ? 0.1 : 0.08, dest: musicGain, t });
    if (inBarStep === 4) noiseBurst({ attack: 0.001, decay: 0.04, release: 0.03, gain: intense ? 0.09 : 0.07, dest: musicGain, t });
    // Bass
    const bassDeg = bassPattern[inBarStep];
    const bassSemi = rootSemi + (bassDeg === 7 ? 7 : 0); // add 5th when 7
    const fBass = noteFreq(baseA / 2, bassSemi);
    envTone({ type: 'triangle', freq: fBass, attack: 0.002, decay: 0.12, sustain: 0, release: 0.04, gain: intense ? 0.09 : 0.07, dest: musicGain, t });
    // Melody alternates patterns per bar
    const pat = (section === 0)
      ? (intense ? melodyA_intense : ((bar % 2 === 0) ? melodyA1 : melodyA2))
      : (intense ? melodyB_intense : ((bar % 2 === 0) ? melodyB1 : melodyB2));
    const scale = (section === 0) ? minorScale : pentatonic;
    const deg = scale[pat[inBarStep] % scale.length];
    const fLead = noteFreq(baseA * (section === 1 ? 2 : 1), rootSemi + deg); // B-section one octave up
    const leadType = intense ? 'square' : (section === 0 ? 'square' : 'triangle');
    envTone({ type: leadType, freq: fLead, attack: 0.003, decay: 0.14, sustain: 0, release: 0.03, gain: intense ? 0.11 : 0.09, dest: musicGain, t });
    step = (step + 1) % (8 * totalBars); // loop every 32 bars
  }
  currentMusic = { stop: () => { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } } };
  schedule(ac.currentTime);
  musicTimer = setInterval(() => schedule(ac.currentTime), stepSec * 1000);
}
