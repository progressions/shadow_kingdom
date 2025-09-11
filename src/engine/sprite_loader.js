// Lightweight sprite loader/cache to prepare for custom atlases
// Usage: getSprite('assets/sprites/enemies/gorg') -> { image, meta }

const _cache = new Map();

async function _loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    try {
      const v = (window && window.ASSET_VERSION) ? String(window.ASSET_VERSION) : null;
      img.src = v ? `${src}?v=${encodeURIComponent(v)}` : src;
    } catch { img.src = src; }
  });
}

async function _loadJson(src) {
  try {
    const v = (window && window.ASSET_VERSION) ? String(window.ASSET_VERSION) : null;
    const url = v ? `${src}?v=${encodeURIComponent(v)}` : src;
    const res = await fetch(url);
    if (!res.ok) throw new Error('http ' + res.status);
    return await res.json();
  } catch { return null; }
}

export async function getSprite(spriteId) {
  if (!spriteId) return null;
  if (_cache.has(spriteId)) return _cache.get(spriteId);
  const base = String(spriteId).replace(/\.(png|json)$/i, '');
  const imgP = _loadImage(`${base}.png`);
  const metaP = _loadJson(`${base}.json`);
  const [image, meta] = await Promise.all([imgP, metaP]);
  const out = { image, meta: meta || null };
  _cache.set(spriteId, out);
  return out;
}

export function clearSpriteCache() { _cache.clear(); }

