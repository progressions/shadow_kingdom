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
    const feminineShape = !!paletteOverrides.feminineShape;
    const bob = frame === 0 ? 0 : 1;
    const ox = x;
    const oy = y + bob;
    const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    g.clearRect(x, y, SPRITE_SIZE, SPRITE_SIZE);
    function px(px, py, color) { g.fillStyle = color; g.fillRect(ox + px, oy + py, 1, 1); }
    
    // Head and face (same for all)
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
    
    if (feminineShape) {
      // Feminine shape with indented waist
      // Upper torso (rows 7-8) - full width 8 pixels
      for (let i = 0; i < 8; i++) for (let j = 7; j < 9; j++) px(i, j, shirt);
      
      // Waist (rows 9-10) - indented to 6 pixels
      for (let j = 9; j < 11; j++) {
        for (let i = 1; i < 7; i++) px(i, j, shirt);
      }
      
      // Hips (row 11) - back to full width
      for (let i = 0; i < 8; i++) px(i, 11, shirt);
      
      // Arms
      px(-1 + (frame===0?1:0) + dx, 8, skin);
      px(8 - (frame===0?1:0) + dx, 8, skin);
      
      if (dress) {
        // Flared skirt from the hips
        for (let j = 12; j < 15; j++) {
          const expand = j - 12; // 0..2
          for (let i = -expand; i < 8 + expand; i++) {
            if (i >= 0 && i < 16) px(i, j, dressColor);
          }
        }
      } else {
        // Pants - full width at hips
        for (let i = 0; i < 8; i++) px(i, 12, pants);
        // Legs taper slightly
        for (let j = 13; j < 15; j++) {
          for (let i = 1; i < 7; i++) px(i, j, pants);
        }
      }
      
      // Feet
      px(2 + (frame===0?1:0) - dx, 15, outline);
      px(5 - (frame===0?1:0) + dx, 15, outline);
      
      // Custom outline for feminine shape
      g.strokeStyle = outline; g.lineWidth = 1;
      g.strokeRect(ox + 0.5, oy + 0.5, 8, 6);
      g.beginPath();
      // Left side with waist indent
      g.moveTo(ox + 0.5, oy + 6.5);
      g.lineTo(ox + 0.5, oy + 8.5);
      g.lineTo(ox + 1.5, oy + 9.5);
      g.lineTo(ox + 1.5, oy + 10.5);
      g.lineTo(ox + 0.5, oy + 11.5);
      g.lineTo(ox + 0.5, oy + 14.5);
      // Bottom
      g.lineTo(ox + 7.5, oy + 14.5);
      // Right side with waist indent
      g.lineTo(ox + 7.5, oy + 11.5);
      g.lineTo(ox + 6.5, oy + 10.5);
      g.lineTo(ox + 6.5, oy + 9.5);
      g.lineTo(ox + 7.5, oy + 8.5);
      g.lineTo(ox + 7.5, oy + 6.5);
      // Top
      g.lineTo(ox + 0.5, oy + 6.5);
      g.stroke();
    } else {
      // Original rectangular shape
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
// Enemy class variants
export const enemyMookPalette = { shirt: '#8a8a8a', pants: '#5a5a5a', hair: '#bdbdbd', outline: '#000000' };
export const enemyFeaturedPalette = { shirt: '#d7a64a', pants: '#6a5330', hair: '#2a2a2a', outline: '#000000' };
export const enemyBossPalette = { hair: '#1b1b1b', longHair: true, dress: true, dressColor: '#1a1a1a', shirt: '#4a4a4a', outline: '#000000' };
export const enemyMookSheet = makeSpriteSheet(enemyMookPalette);
export const enemyFeaturedSheet = makeSpriteSheet(enemyFeaturedPalette);
// Boss (Vast): black-haired sorceress in a black dress
export const enemyBossSheet = makeSpriteSheet(enemyBossPalette);
export const npcSheet   = makeSpriteSheet({ shirt: '#5ac8fa', hair: '#2a2a2a' });
export const companionSheets = [
  // Brown, Blonde, Red hair - with feminine shape
  makeSpriteSheet({ shirt: '#ff8fb1', hair: '#6b3f2b', longHair: true, dress: true, dressColor: '#ff6f9d', feminineShape: true }),
  makeSpriteSheet({ shirt: '#caa6ff', hair: '#e8d18b', longHair: true, dress: true, dressColor: '#b88fff', feminineShape: true }),
  makeSpriteSheet({ shirt: '#ffd07f', hair: '#d14a24', longHair: true, dress: true, dressColor: '#ffbf5e', feminineShape: true }),
];

// Return a themed sheet for known character names
export function sheetForName(name) {
  const key = (name || '').toLowerCase();
  // Level 1 canonical palettes - with feminine shape
  if (key.includes('canopy')) return makeSpriteSheet({ hair: '#ffeb3b', longHair: true, dress: true, dressColor: '#4fa3ff', shirt: '#bfdcff', feminineShape: true });
  if (key.includes('yorna'))  return makeSpriteSheet({ hair: '#d14a24', longHair: true, dress: true, dressColor: '#1a1a1a', shirt: '#4a4a4a', feminineShape: true });
  if (key.includes('hola'))   return makeSpriteSheet({ hair: '#1b1b1b', longHair: true, dress: true, dressColor: '#f5f5f5', shirt: '#e0e0e0', feminineShape: true });
  // Level 2 companions
  if (key.includes('oyin'))   return makeSpriteSheet({ hair: '#e8d18b', longHair: true, dress: true, dressColor: '#2ea65a', shirt: '#b7f0c9', feminineShape: true });
  if (key.includes('twil'))   return makeSpriteSheet({ hair: '#d14a24', longHair: true, dress: true, dressColor: '#1a1a1a', shirt: '#4a4a4a', feminineShape: true });
  // Level 3 companions
  if (key.includes('tin'))    return makeSpriteSheet({ hair: '#6fb7ff', longHair: true, dress: true, dressColor: '#4fa3ff', shirt: '#bfdcff', feminineShape: true });
  if (key.includes('nellis')) return makeSpriteSheet({ hair: '#a15aff', longHair: true, dress: true, dressColor: '#f5f5f5', shirt: '#e0e0e0', feminineShape: true });
  // Level 4 companions
  if (key.includes('urn'))    return makeSpriteSheet({ hair: '#4fa36b', longHair: true, dress: true, dressColor: '#3a7f4f', shirt: '#9bd6b0', feminineShape: true });
  if (key.includes('varabella')) return makeSpriteSheet({ hair: '#d14a24', longHair: true, dress: true, dressColor: '#1a1a1a', shirt: '#4a4a4a', feminineShape: true });
  // Level 5/6 — notable NPCs
  if (key.includes('ell'))    return makeSpriteSheet({ hair: '#e8d18b', longHair: true, dress: true, dressColor: '#ffffff', shirt: '#f0f0f0', feminineShape: true });
  if (key.includes('fana'))   return makeSpriteSheet({ hair: '#6fb7ff', longHair: true, dress: true, dressColor: '#e6d5ff', shirt: '#c7b0ff', feminineShape: true });
  if (key.includes('cowsill')) return makeSpriteSheet({ hair: '#ffeb3b', longHair: true, dress: true, dressColor: '#1a1a1a', shirt: '#2a2a2a', feminineShape: true });
  if (key.includes('rose'))   return makeSpriteSheet({ hair: '#8a3dff', longHair: true, dress: true, dressColor: '#ffffff', shirt: '#ffd166', feminineShape: true });
  return npcSheet;
}
