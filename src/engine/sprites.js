import { SPRITE_SIZE, DIRECTIONS, FRAMES_PER_DIR } from './constants.js';

export function makeSpriteSheet(paletteOverrides = {}) {
  const cols = FRAMES_PER_DIR;
  const rows = DIRECTIONS.length;
  const w = cols * SPRITE_SIZE;
  const h = rows * SPRITE_SIZE;

  let off, g;
  try {
    if (typeof OffscreenCanvas !== 'undefined') {
      off = new OffscreenCanvas(w, h);
      g = off.getContext('2d');
    }
  } catch (_) {}
  if (!g) {
    off = document.createElement('canvas');
    off.width = w; off.height = h;
    g = off.getContext('2d');
  }
  g.imageSmoothingEnabled = false;

  function drawDude(x, y, frame, dir) {
    const skin = paletteOverrides.skin || '#f2d3b7';
    const shirt = paletteOverrides.shirt || '#4fa3ff';
    const pants = paletteOverrides.pants || '#3a3a3a';
    const outline = paletteOverrides.outline || '#000000';
    const hair = paletteOverrides.hair || '#3b2a1f';
    const longHair = !!paletteOverrides.longHair;
    const dress = !!paletteOverrides.dress;
    const dressColor = paletteOverrides.dressColor || shirt;
    const bob = frame === 0 ? 0 : 1;
    const ox = x;
    const oy = y + bob;
    const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    g.clearRect(x, y, SPRITE_SIZE, SPRITE_SIZE);
    function px(px, py, color) { g.fillStyle = color; g.fillRect(ox + px, oy + py, 1, 1); }
    for (let i = 4; i < 12; i++) for (let j = 1; j < 7; j++) px(i-4, j, skin);
    for (let i = 2; i < 14; i++) px(i-4, 0, hair);
    for (let i = 1; i < 13; i++) px(i-4, 1, hair);
    if (longHair) {
      // Side strands and bottom line to suggest longer hair
      for (let j = 2; j < 8; j++) { px(0, j, hair); px(7, j, hair); }
      for (let i = 1; i < 7; i++) px(i, 7, hair);
    }
    const eyeY = 4 + (dir === 'down' ? 0 : dir === 'up' ? -1 : 0);
    px(3, eyeY, outline); px(6, eyeY, outline);
    for (let i = 4; i < 12; i++) for (let j = 7; j < 12; j++) px(i-4, j, shirt);
    px(0 + (frame===0?1:0) + dx, 8, skin);
    px(7 - (frame===0?1:0) + dx, 8, skin);
    if (dress) {
      // Simple trapezoid skirt below the shirt
      for (let j = 12; j < 15; j++) {
        const expand = j - 12; // 0..2
        for (let i = 2 - expand; i < 6 + expand; i++) px(i, j, dressColor);
      }
    } else {
      for (let i = 4; i < 12; i++) for (let j = 12; j < 15; j++) px(i-4, j, pants);
    }
    px(2 + (frame===0?1:0) - dx, 15, outline);
    px(5 - (frame===0?1:0) + dx, 15, outline);
    g.strokeStyle = outline; g.lineWidth = 1;
    g.strokeRect(ox + 0.5, oy + 0.5, 8, 6);
    g.strokeRect(ox + 0.5, oy + 6.5, 8, 8);
  }

  for (let r = 0; r < rows; r++) {
    const dir = DIRECTIONS[r];
    for (let c = 0; c < cols; c++) {
      const x = c * SPRITE_SIZE;
      const y = r * SPRITE_SIZE;
      drawDude(x, y, c, dir);
    }
  }
  if (typeof off.transferToImageBitmap === 'function') { try { return off.transferToImageBitmap(); } catch (_) {} }
  return off;
}

export const playerSheet = makeSpriteSheet();
export const enemySheet = makeSpriteSheet({ shirt: '#e34b4b', hair: '#1b1b1b' });
export const npcSheet   = makeSpriteSheet({ shirt: '#5ac8fa', hair: '#2a2a2a' });
export const companionSheets = [
  // Brown, Blonde, Red hair
  makeSpriteSheet({ shirt: '#ff8fb1', hair: '#6b3f2b', longHair: true, dress: true, dressColor: '#ff6f9d' }),
  makeSpriteSheet({ shirt: '#caa6ff', hair: '#e8d18b', longHair: true, dress: true, dressColor: '#b88fff' }),
  makeSpriteSheet({ shirt: '#ffd07f', hair: '#d14a24', longHair: true, dress: true, dressColor: '#ffbf5e' }),
];

// Return a themed sheet for known character names
export function sheetForName(name) {
  const key = (name || '').toLowerCase();
  if (key.includes('canopy')) return makeSpriteSheet({ hair: '#6b3f2b', longHair: true, dress: true, dressColor: '#ff77c8', shirt: '#ffd3ea' });
  if (key.includes('yorna'))  return makeSpriteSheet({ hair: '#d14a24', longHair: true, dress: true, dressColor: '#ff9a4a', shirt: '#ffd1a6' });
  if (key.includes('hola'))   return makeSpriteSheet({ hair: '#1b1b1b', longHair: true, dress: true, dressColor: '#6fb7ff', shirt: '#bfe1ff' });
  return npcSheet;
}
