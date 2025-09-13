// Lightweight sprite loader/cache to prepare for custom atlases
// Usage: getSprite('assets/sprites/enemies/gorg') -> { image, meta }

const _cache = new Map();

const __DEV_BUST = String(Date.now());

async function _loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    try {
      let v = null;
      try { if (window && window.ASSET_VERSION) v = String(window.ASSET_VERSION); } catch {}
      // Dev convenience: always bust cache for custom player assets if no version is set
      if (!v && /assets\/sprites\/custom\//.test(src)) v = __DEV_BUST;
      img.src = v ? `${src}?v=${encodeURIComponent(v)}` : src;
    } catch { img.src = src; }
  });
}

async function _loadJson(src) {
  try {
    let v = null;
    try { if (window && window.ASSET_VERSION) v = String(window.ASSET_VERSION); } catch {}
    if (!v && /assets\/sprites\/custom\//.test(src)) v = __DEV_BUST;
    const url = v ? `${src}?v=${encodeURIComponent(v)}` : src;
    const res = await fetch(url);
    if (!res.ok) throw new Error('http ' + res.status);
    return await res.json();
  } catch { return null; }
}

export async function getSprite(spriteId) {
  if (!spriteId) return null;
  if (_cache.has(spriteId)) return _cache.get(spriteId);
  const id = String(spriteId);
  const explicitPng = /\.png$/i.test(id);
  const explicitJson = /\.json$/i.test(id);
  const base = id.replace(/\.(png|json)$/i, '');
  const imgUrl = explicitPng ? id : `${base}.png`;
  const jsonUrl = explicitJson ? id : `${base}.json`;
  const imgP = _loadImage(imgUrl);
  const metaP = explicitPng && !explicitJson ? Promise.resolve(null) : _loadJson(jsonUrl);
  const [image, meta] = await Promise.all([imgP, metaP]);
  const out = { image, meta: meta || null };
  _cache.set(spriteId, out);
  return out;
}

export function clearSpriteCache() { _cache.clear(); }

// Expose a convenience hook for the browser console so you don't need
// to figure out module paths when hot-swapping art during dev.
try { if (typeof window !== 'undefined') { window.clearSpriteCache = clearSpriteCache; } } catch {}
