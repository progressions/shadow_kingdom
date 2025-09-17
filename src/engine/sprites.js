import { SPRITE_SIZE, DIRECTIONS, FRAMES_PER_DIR } from './constants.js';

const canopyCompanionSpriteSrc = 'assets/sprites/canopy_companion.png';
const holaCompanionSpriteSrc = 'assets/sprites/hola_companion.png';
const yornaCompanionSpriteSrc = 'assets/sprites/yorna_companion.png';
const oyinCompanionSpriteSrc = 'assets/sprites/oyin_companion.png';
const twilCompanionSpriteSrc = 'assets/sprites/twil_companion.png';
const tinCompanionSpriteSrc = 'assets/sprites/tin_companion.png';
const nellisCompanionSpriteSrc = 'assets/sprites/nellis_companion.png';
const urnCompanionSpriteSrc = 'assets/sprites/urn_companion.png';
const varabellaCompanionSpriteSrc = 'assets/sprites/varabella_companion.png';
const fanaCompanionSpriteSrc = 'assets/sprites/fana_companion.png';
const fanaVillainSpriteSrc = 'assets/sprites/fana_villain.png';
const fanaVillainSpriteId = 'assets/sprites/fana_villain';
const ellNpcSpriteSrc = 'assets/sprites/ell.png';
const roseNpcSpriteSrc = 'assets/sprites/rose.png';
const vastBossSpriteSrc = 'assets/sprites/vast.png';
const vastBossSpriteId = 'assets/sprites/vast';
const vastBossPoweredSpriteSrc = 'assets/sprites/vast_powered.png';
const vastBossPoweredSpriteId = 'assets/sprites/vast_powered';
const nethraBossSpriteSrc = 'assets/sprites/nethra.png';
const nethraBossSpriteId = 'assets/sprites/nethra';
const nethraBossPoweredSpriteSrc = 'assets/sprites/nethra_powered.png';
const nethraBossPoweredSpriteId = 'assets/sprites/nethra_powered';
const vorthakBossSpriteSrc = 'assets/sprites/vorthak.png';
const vorthakBossPoweredSpriteSrc = 'assets/sprites/vorthak_powered.png';
const vorthakBossOverSpriteSrc = 'assets/sprites/vorthak_overpowered.png';
const luulaBossSpriteSrc = 'assets/sprites/luula.png';
const luulaBossSpriteId = 'assets/sprites/luula';
const luulaBossPoweredSpriteSrc = 'assets/sprites/luula_powered.png';
const luulaBossPoweredSpriteId = 'assets/sprites/luula_powered';
const vanificiaBossSpriteSrc = 'assets/sprites/vanificia.png';
const vanificiaBossSpriteId = 'assets/sprites/vanificia';
const vanificiaBossPoweredSpriteSrc = 'assets/sprites/vanificia_powered.png';
const vanificiaBossPoweredSpriteId = 'assets/sprites/vanificia_powered';
const gorgEnemySpriteSrc = 'assets/sprites/gorg.png';
const gorgEnemySpriteId = 'assets/sprites/gorg';
const aargEnemySpriteSrc = 'assets/sprites/aarg.png';
const aargEnemySpriteId = 'assets/sprites/aarg';
const blurbEnemySpriteSrc = 'assets/sprites/blurb.png';
const blurbEnemySpriteId = 'assets/sprites/blurb';
const wightEnemySpriteSrc = 'assets/sprites/wight.png';
const wightEnemySpriteId = 'assets/sprites/wight';
const mookGreenwoodBanditSpriteSrc = 'assets/sprites/mook_greenwood_bandit.png';
const mookGreenwoodBanditSpriteId = 'assets/sprites/mook_greenwood_bandit';
const featuredBanditArcherSpriteSrc = 'assets/sprites/featured_bandit_archer.png';
const featuredBanditArcherSpriteId = 'assets/sprites/featured_bandit_archer';
const featuredDesertMarksmanSpriteSrc = 'assets/sprites/featured_desert_marksman.png';
const featuredDesertMarksmanSpriteId = 'assets/sprites/featured_desert_marksman';
const featuredDesertMarauderSpriteSrc = 'assets/sprites/featured_desert_marauder.png';
const featuredDesertMarauderSpriteId = 'assets/sprites/featured_desert_marauder';
const featuredMarshSilencerSpriteSrc = 'assets/sprites/featured_marsh_silencer.png';
const featuredMarshSilencerSpriteId = 'assets/sprites/featured_marsh_silencer';
const featuredMarshStalkerSpriteSrc = 'assets/sprites/featured_marsh_stalker.png';
const featuredMarshStalkerSpriteId = 'assets/sprites/featured_marsh_stalker';
const featuredCityCrossfireSpriteSrc = 'assets/sprites/featured_city_crossfire.png';
const featuredCityCrossfireSpriteId = 'assets/sprites/featured_city_crossfire';
const featuredCityBruteSpriteSrc = 'assets/sprites/featured_city_brute.png';
const featuredCityBruteSpriteId = 'assets/sprites/featured_city_brute';
const featuredTempleLanternSpriteSrc = 'assets/sprites/featured_temple_lantern.png';
const featuredTempleLanternSpriteId = 'assets/sprites/featured_temple_lantern';
const featuredTempleSentinelSpriteSrc = 'assets/sprites/featured_temple_sentinel.png';
const featuredTempleSentinelSpriteId = 'assets/sprites/featured_temple_sentinel';
const mookMarshWhispererSpriteSrc = 'assets/sprites/mook_marsh_whisperer.png';
const mookMarshWhispererSpriteId = 'assets/sprites/mook_marsh_whisperer';
const mookTempleGuardSpriteSrc = 'assets/sprites/mook_temple_guard.png';
const mookTempleGuardSpriteId = 'assets/sprites/mook_temple_guard';
const mookUratharScoutSpriteSrc = 'assets/sprites/mook_urathar_scout.png';
const mookUratharScoutSpriteId = 'assets/sprites/mook_urathar_scout';

function createStripSheetLoader(spriteSrc) {
  let sheet = null;

  return function getStripSheet() {
    if (sheet) return sheet;
    const w = SPRITE_SIZE * FRAMES_PER_DIR;
    const h = SPRITE_SIZE * DIRECTIONS.length;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    function drawFrames(img) {
      ctx.clearRect(0, 0, w, h);
      const copy = (sx, sy, dx, dy) => {
        ctx.drawImage(img, sx, sy, SPRITE_SIZE, SPRITE_SIZE, dx, dy, SPRITE_SIZE, SPRITE_SIZE);
      };
      // Frame order on source strip: 0-1 right/down, 2-3 left, 4-5 up
      // Dest layout expects direction rows: down, left, right, up (two frames each)
      copy(0, 0, 0, 0);
      copy(16, 0, SPRITE_SIZE, 0);
      copy(32, 0, 0, SPRITE_SIZE);
      copy(48, 0, SPRITE_SIZE, SPRITE_SIZE);
      copy(0, 0, 0, SPRITE_SIZE * 2);
      copy(16, 0, SPRITE_SIZE, SPRITE_SIZE * 2);
      copy(64, 0, 0, SPRITE_SIZE * 3);
      copy(80, 0, SPRITE_SIZE, SPRITE_SIZE * 3);
    }

    const img = new Image();
    img.decoding = 'async';

    const paint = () => {
      try { drawFrames(img); } catch (err) {
        console.error(`Failed drawing companion sprite for ${spriteSrc}`, err);
      }
    };

    img.onload = paint;
    img.onerror = (err) => {
      console.error(`Failed to load companion sprite ${spriteSrc}`, err);
    };

    let v = null;
    try { if (typeof window !== 'undefined' && window.ASSET_VERSION) v = String(window.ASSET_VERSION); } catch {}
    const primarySrc = v ? `${spriteSrc}?v=${encodeURIComponent(v)}` : spriteSrc;

    try { img.src = primarySrc; }
    catch (err) {
      console.error(`Failed setting companion sprite source ${spriteSrc}`, err);
    }

    if (img.complete && img.naturalWidth) paint();

    sheet = canvas;
    return sheet;
  };
}

const getCanopyCompanionSheet = createStripSheetLoader(canopyCompanionSpriteSrc);
const getHolaCompanionSheet = createStripSheetLoader(holaCompanionSpriteSrc);
const getYornaCompanionSheet = createStripSheetLoader(yornaCompanionSpriteSrc);
const getOyinCompanionSheet = createStripSheetLoader(oyinCompanionSpriteSrc);
const getTwilCompanionSheet = createStripSheetLoader(twilCompanionSpriteSrc);
const getTinCompanionSheet = createStripSheetLoader(tinCompanionSpriteSrc);
const getNellisCompanionSheet = createStripSheetLoader(nellisCompanionSpriteSrc);
const getUrnCompanionSheet = createStripSheetLoader(urnCompanionSpriteSrc);
const getVarabellaCompanionSheet = createStripSheetLoader(varabellaCompanionSpriteSrc);
const getFanaCompanionSheet = createStripSheetLoader(fanaCompanionSpriteSrc);
const getFanaVillainSheet = createStripSheetLoader(fanaVillainSpriteSrc);
const getEllNpcSheet = createStripSheetLoader(ellNpcSpriteSrc);
const getRoseNpcSheet = createStripSheetLoader(roseNpcSpriteSrc);
const getVastBossSheet = createStripSheetLoader(vastBossSpriteSrc);
const getVastBossPoweredSheet = createStripSheetLoader(vastBossPoweredSpriteSrc);
const getNethraBossSheet = createStripSheetLoader(nethraBossSpriteSrc);
const getNethraBossPoweredSheet = createStripSheetLoader(nethraBossPoweredSpriteSrc);
const getLuulaBossSheet = createStripSheetLoader(luulaBossSpriteSrc);
const getLuulaBossPoweredSheet = createStripSheetLoader(luulaBossPoweredSpriteSrc);
const getVanificiaBossSheet = createStripSheetLoader(vanificiaBossSpriteSrc);
const getVanificiaBossPoweredSheet = createStripSheetLoader(vanificiaBossPoweredSpriteSrc);
const getGorgEnemySheet = createStripSheetLoader(gorgEnemySpriteSrc);
const getAargEnemySheet = createStripSheetLoader(aargEnemySpriteSrc);
const getBlurbEnemySheet = createStripSheetLoader(blurbEnemySpriteSrc);
const getWightEnemySheet = createStripSheetLoader(wightEnemySpriteSrc);
const getMookGreenwoodBanditSheet = createStripSheetLoader(mookGreenwoodBanditSpriteSrc);
const getFeaturedBanditArcherSheet = createStripSheetLoader(featuredBanditArcherSpriteSrc);
const getMookUratharScoutSheet = createStripSheetLoader(mookUratharScoutSpriteSrc);
const getFeaturedDesertMarksmanSheet = createStripSheetLoader(featuredDesertMarksmanSpriteSrc);
const getFeaturedDesertMarauderSheet = createStripSheetLoader(featuredDesertMarauderSpriteSrc);
const getFeaturedMarshSilencerSheet = createStripSheetLoader(featuredMarshSilencerSpriteSrc);
const getFeaturedMarshStalkerSheet = createStripSheetLoader(featuredMarshStalkerSpriteSrc);
const getFeaturedCityCrossfireSheet = createStripSheetLoader(featuredCityCrossfireSpriteSrc);
const getFeaturedTempleLanternSheet = createStripSheetLoader(featuredTempleLanternSpriteSrc);
const getMookMarshWhispererSheet = createStripSheetLoader(mookMarshWhispererSpriteSrc);
const getFeaturedCityBruteSheet = createStripSheetLoader(featuredCityBruteSpriteSrc);
const getMookTempleGuardSheet = createStripSheetLoader(mookTempleGuardSpriteSrc);
const getFeaturedTempleSentinelSheet = createStripSheetLoader(featuredTempleSentinelSpriteSrc);

const spriteSources = {
  canopy: { path: canopyCompanionSpriteSrc, useSpriteId: false },
  hola: { path: holaCompanionSpriteSrc, useSpriteId: false },
  yorna: { path: yornaCompanionSpriteSrc, useSpriteId: false },
  oyin: { path: oyinCompanionSpriteSrc, useSpriteId: false },
  twil: { path: twilCompanionSpriteSrc, useSpriteId: false },
  tin: { path: tinCompanionSpriteSrc, useSpriteId: false },
  nellis: { path: nellisCompanionSpriteSrc, useSpriteId: false },
  urn: { path: urnCompanionSpriteSrc, useSpriteId: false },
  varabella: { path: varabellaCompanionSpriteSrc, useSpriteId: false },
  fana: { path: fanaCompanionSpriteSrc, useSpriteId: false },
  fana_villain: { path: fanaVillainSpriteId, useSpriteId: true },
  ell: { path: ellNpcSpriteSrc, useSpriteId: false },
  rose: { path: roseNpcSpriteSrc, useSpriteId: false },
  vast: { path: vastBossSpriteId, useSpriteId: true },
  vast_powered: { path: vastBossPoweredSpriteId, useSpriteId: true },
  nethra: { path: nethraBossSpriteId, useSpriteId: true },
  nethra_powered: { path: nethraBossPoweredSpriteId, useSpriteId: true },
  luula: { path: luulaBossSpriteId, useSpriteId: true },
  luula_powered: { path: luulaBossPoweredSpriteId, useSpriteId: true },
  vanificia: { path: vanificiaBossSpriteId, useSpriteId: true },
  vorthak: { path: vorthakBossSpriteSrc, useSpriteId: true },
  vorthak_powered: { path: vorthakBossPoweredSpriteSrc, useSpriteId: true },
  vorthak_overpowered: { path: vorthakBossOverSpriteSrc, useSpriteId: true },
  gorg: { path: gorgEnemySpriteId, useSpriteId: true },
  aarg: { path: aargEnemySpriteId, useSpriteId: true },
  blurb: { path: blurbEnemySpriteId, useSpriteId: true },
  wight: { path: wightEnemySpriteId, useSpriteId: true },
  mook_greenwood_bandit: { path: mookGreenwoodBanditSpriteId, useSpriteId: false },
  mook_urathar_scout: { path: mookUratharScoutSpriteId, useSpriteId: false },
  mook_marsh_whisperer: { path: mookMarshWhispererSpriteId, useSpriteId: false },
  mook_temple_guard: { path: mookTempleGuardSpriteId, useSpriteId: false },
  featured_bandit_archer: { path: featuredBanditArcherSpriteId, useSpriteId: false },
  featured_desert_marksman: { path: featuredDesertMarksmanSpriteId, useSpriteId: false },
  featured_desert_marauder: { path: featuredDesertMarauderSpriteId, useSpriteId: false },
  featured_marsh_silencer: { path: featuredMarshSilencerSpriteId, useSpriteId: false },
  featured_marsh_stalker: { path: featuredMarshStalkerSpriteId, useSpriteId: false },
  featured_city_crossfire: { path: featuredCityCrossfireSpriteId, useSpriteId: false },
  featured_temple_lantern: { path: featuredTempleLanternSpriteId, useSpriteId: false },
  featured_temple_sentinel: { path: featuredTempleSentinelSpriteId, useSpriteId: false },
  featured_city_brute: { path: featuredCityBruteSpriteId, useSpriteId: false },
  cowsill: { path: 'assets/sprites/cowsill.png', useSpriteId: false },
};

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
    const accent = paletteOverrides.accent || paletteOverrides.accentColor || null; // optional tiny highlight
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
      // Tiny chest brooch/accent (optional)
      if (accent) { px(3, 8, accent); }
      
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
      // Tiny chest brooch/accent (optional)
      if (accent) { px(3, 8, accent); }
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

// Simple 16x16 snake sprite sheet (2 frames × 4 directions)
export function makeSnakeSpriteSheet(color = '#3aa35a', outline = '#000000') {
  const cols = FRAMES_PER_DIR;
  const rows = DIRECTIONS.length;
  const w = cols * SPRITE_SIZE;
  const h = rows * SPRITE_SIZE;
  let off, g;
  try { if (typeof OffscreenCanvas !== 'undefined') { off = new OffscreenCanvas(w, h); g = off.getContext('2d'); } } catch {}
  if (!g) { off = document.createElement('canvas'); off.width = w; off.height = h; g = off.getContext('2d'); }
  g.imageSmoothingEnabled = false;

  function drawSnake(x, y, frame, dir) {
    g.clearRect(x, y, SPRITE_SIZE, SPRITE_SIZE);
    const ox = x; const oy = y;
    // Helper to plot a dot (2x2 for visibility)
    function dot(px, py, c) { g.fillStyle = c; g.fillRect(ox + px, oy + py, 2, 2); }
    // Body parameters
    const segs = 6;
    const base = [
      { x: 2, y: 12 }, { x: 4, y: 11 }, { x: 6, y: 10 }, { x: 8, y: 9 }, { x: 10, y: 8 }, { x: 12, y: 7 },
    ];
    // Directional transform
    function tx(p) {
      const f = (frame % 2) === 0 ? 0 : 1; // subtle wiggle
      let u = { x: p.x, y: p.y };
      // Apply direction rotation (approximate for 4 dirs)
      if (dir === 'up') { u = { x: 14 - p.x, y: 14 - p.y }; }
      else if (dir === 'left') { u = { x: p.y, y: 14 - p.x }; }
      else if (dir === 'right') { u = { x: 14 - p.y, y: p.x }; }
      // Wiggle offset
      const wob = ((u.x + u.y) % 3) === 0 ? f : 0;
      return { x: Math.max(0, Math.min(14, u.x + wob)), y: Math.max(0, Math.min(14, u.y)) };
    }
    // Draw shadow outline first
    g.fillStyle = outline;
    for (let i = 0; i < segs; i++) {
      const p = tx(base[i]);
      g.fillRect(ox + p.x, oy + p.y, 2, 2);
    }
    // Draw body
    for (let i = 0; i < segs; i++) {
      const p = tx(base[i]);
      dot(p.x, p.y, color);
    }
    // Head (slightly larger) + eye
    const head = tx(base[segs - 1]);
    g.fillStyle = color; g.fillRect(ox + head.x - 1, oy + head.y - 1, 4, 4);
    // Eye on facing side
    g.fillStyle = outline;
    if (dir === 'down') g.fillRect(ox + head.x + 1, oy + head.y, 1, 1);
    else if (dir === 'up') g.fillRect(ox + head.x - 1, oy + head.y, 1, 1);
    else if (dir === 'left') g.fillRect(ox + head.x, oy + head.y + 1, 1, 1);
    else g.fillRect(ox + head.x + 2, oy + head.y + 1, 1, 1);
  }

  for (let r = 0; r < rows; r++) {
    const dir = DIRECTIONS[r];
    for (let c = 0; c < cols; c++) {
      const x = c * SPRITE_SIZE;
      const y = r * SPRITE_SIZE;
      drawSnake(x, y, c, dir);
    }
  }
  if (typeof off.transferToImageBitmap === 'function') { try { return off.transferToImageBitmap(); } catch {} }
  return off;
}

// Return a themed sheet for known character names
export function sheetForName(name) {
  const key = (name || '').toLowerCase();
  // Non-humanoid: Snake companion/NPC
  if (key.includes('snek') || key.includes('snake') || key.includes('smek')) return makeSnakeSpriteSheet('#3aa35a', '#0a0a0a');
  // Level 1 canonical palettes - with feminine shape
  if (key.includes('canopy')) return getCanopyCompanionSheet();
  if (key.includes('yorna'))  return getYornaCompanionSheet();
  if (key.includes('hola'))   return getHolaCompanionSheet();
  // Level 2 companions
  if (key.includes('oyin'))   return getOyinCompanionSheet();
  if (key.includes('twil'))   return getTwilCompanionSheet();
  // Level 3 companions
  if (key.includes('tin'))    return getTinCompanionSheet();
  if (key.includes('nellis')) return getNellisCompanionSheet();
  // Level 4 companions
  if (key.includes('urn'))    return getUrnCompanionSheet();
  if (key.includes('varabella')) return getVarabellaCompanionSheet();
  // Level 5/6 — notable NPCs
  if (key.includes('ell'))    return getEllNpcSheet();
  if (key.includes('fana')) {
    if (key.includes('villain') || key.includes('enemy')) return getFanaVillainSheet();
    return getFanaCompanionSheet();
  }
  if (key.includes('cowsill')) return makeSpriteSheet({ hair: '#ffeb3b', longHair: true, dress: true, dressColor: '#1a1a1a', shirt: '#2a2a2a', feminineShape: true });
  if (key.includes('rose'))   return getRoseNpcSheet();
  if (key.includes('vast'))   {
    if (key.includes('powered')) {
      return spriteShouldUseSpriteId('vast_powered') ? null : getVastBossPoweredSheet();
    }
    return spriteShouldUseSpriteId('vast') ? null : getVastBossSheet();
  }
  if (key.includes('nethra')) {
    if (key.includes('powered')) return getNethraBossPoweredSheet();
    return getNethraBossSheet();
  }
  if (key.includes('luula')) {
    if (key.includes('powered')) return getLuulaBossPoweredSheet();
    return getLuulaBossSheet();
  }
  if (key.includes('vanificia')) {
    if (key.includes('powered')) return getVanificiaBossPoweredSheet();
    return getVanificiaBossSheet();
  }
  if (key.includes('vorthak')) {
    // Vorthak relies on JSON-driven spriteId (36x36); no fallback sheet
    return null;
  }
  if (key.includes('gorg')) return getGorgEnemySheet();
  if (key.includes('aarg')) return getAargEnemySheet();
  if (key.includes('blurb')) return getBlurbEnemySheet();
  if (key.includes('wight')) return getWightEnemySheet();
  if (key.includes('mook') && key.includes('greenwood')) return getMookGreenwoodBanditSheet();
  if (key.includes('mook') && key.includes('urathar') && key.includes('scout')) return getMookUratharScoutSheet();
  if (key.includes('mook') && key.includes('marsh') && key.includes('whisperer')) return getMookMarshWhispererSheet();
  if (key.includes('mook') && key.includes('temple') && key.includes('guard')) return getMookTempleGuardSheet();
  if (key.includes('bandit') && key.includes('archer')) return getFeaturedBanditArcherSheet();
  if (key.includes('desert') && key.includes('marksman')) return getFeaturedDesertMarksmanSheet();
  if (key.includes('desert') && key.includes('marauder')) return getFeaturedDesertMarauderSheet();
  if (key.includes('marsh') && key.includes('silencer')) return getFeaturedMarshSilencerSheet();
  if (key.includes('marsh') && key.includes('stalker')) return getFeaturedMarshStalkerSheet();
  if (key.includes('city') && key.includes('crossfire')) return getFeaturedCityCrossfireSheet();
  if (key.includes('temple') && key.includes('lantern')) return getFeaturedTempleLanternSheet();
  if (key.includes('temple') && key.includes('sentinel')) return getFeaturedTempleSentinelSheet();
  if (key.includes('city') && key.includes('brute')) return getFeaturedCityBruteSheet();
  return npcSheet;
}

function spriteConfigForKey(key) {
  if (!key) return null;
  const k = String(key).trim().toLowerCase();
  return spriteSources[k] || null;
}

export function spritePathForKey(key) {
  try {
    const cfg = spriteConfigForKey(key);
    return cfg ? cfg.path : null;
  } catch { return null; }
}

export function spriteShouldUseSpriteId(key) {
  try {
    const cfg = spriteConfigForKey(key);
    return !!(cfg && cfg.useSpriteId);
  } catch { return false; }
}
