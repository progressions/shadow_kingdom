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
    const eyeY = 4 + (dir === 'down' ? 0 : dir === 'up' ? -1 : 0);
    px(3, eyeY, outline); px(6, eyeY, outline);
    for (let i = 4; i < 12; i++) for (let j = 7; j < 12; j++) px(i-4, j, shirt);
    px(0 + (frame===0?1:0) + dx, 8, skin);
    px(7 - (frame===0?1:0) + dx, 8, skin);
    for (let i = 4; i < 12; i++) for (let j = 12; j < 15; j++) px(i-4, j, pants);
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
  makeSpriteSheet({ shirt: '#44d17a' }),
  makeSpriteSheet({ shirt: '#b377ff' }),
  makeSpriteSheet({ shirt: '#e3d34b' }),
];

