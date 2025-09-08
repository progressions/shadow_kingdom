let masterVolume = 0.7;
let muted = false;
let unlocked = false;
let musicEnabled = true;
let currentMusic = null;

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
  unlocked = true; // we just mark; HTMLAudio plays on user gesture callbacks
  if (musicEnabled) tryStartMusic('ambient');
}

export function toggleMute() { muted = !muted; applyVolumes(); }
export function isMuted() { return muted; }
export function setMasterVolume(v) { masterVolume = Math.max(0, Math.min(1, v)); applyVolumes(); }

function applyVolumes() {
  for (const a of cache.values()) {
    a.volume = muted ? 0 : masterVolume;
  }
}

export function playSfx(name) {
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
  const path = files.music[name];
  if (!path) return;
  if (currentMusic && currentMusic.src.includes(path)) return;
  if (currentMusic) { try { currentMusic.pause(); } catch {} }
  const a = getAudio(path);
  if (!a) return;
  a.loop = true;
  a.volume = muted ? 0 : masterVolume * 0.6;
  currentMusic = a;
  a.play().catch(()=>{});
}

export function stopMusic() {
  if (currentMusic) { try { currentMusic.pause(); } catch {} }
  currentMusic = null;
}

export function toggleMusic() {
  musicEnabled = !musicEnabled;
  if (musicEnabled) tryStartMusic('ambient');
  else stopMusic();
}

