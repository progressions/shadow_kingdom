import { introTexts } from '../data/intro_texts.js';
import { enemyPalettes } from '../data/enemy_palettes.js';
import { makeSpriteSheet } from './sprites.js';

function idKeyFromVnId(vnId) {
  if (!vnId || typeof vnId !== 'string') return null;
  return vnId.replace(/^enemy:/, '').toLowerCase();
}

export function ensureEnemyIdentity(e, runtime) {
  if (!e) return;
  const key = idKeyFromVnId(e.vnId);
  if (!key) return;
  // Attach VN intro if not seen and not already present
  try {
    const full = `enemy:${key}`;
    if (!(runtime.vnSeen && runtime.vnSeen[full]) && !e.vnOnSight) {
      const t = introTexts[key];
      if (t) e.vnOnSight = { text: t };
    }
  } catch {}
  // Apply named default palette if entity lacks an explicit palette
  try {
    if (!e.sheetPalette) {
      const pal = enemyPalettes[key];
      if (pal) {
        e.sheetPalette = pal;
        try { e.sheet = makeSpriteSheet(pal); } catch {}
      }
    } else if (!e.sheet) {
      // If palette exists but no sheet yet, build it
      try { e.sheet = makeSpriteSheet(e.sheetPalette); } catch {}
    }
  } catch {}
}
