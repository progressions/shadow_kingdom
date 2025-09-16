// Lightweight PNG color inspector for debugging map color legends.
// Usage in console: inspectPngColors('assets/maps/level_2.png', 128)

export async function inspectPngColors(url, max = 64) {
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => resolve(i);
    i.onerror = reject;
    try {
      let v = null;
      try { if (window && window.ASSET_VERSION) v = String(window.ASSET_VERSION); } catch {}
      const srcUrl = v ? `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(v)}` : url;
      i.src = srcUrl;
    } catch { i.src = url; }
  });
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const can = document.createElement('canvas');
  can.width = w; can.height = h;
  const g = can.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, w, h).data;
  const seen = new Map();
  const toHex = (n) => n.toString(16).padStart(2, '0');
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], gg = data[i+1], b = data[i+2];
    const hex = `${toHex(r)}${toHex(gg)}${toHex(b)}`.toLowerCase();
    seen.set(hex, (seen.get(hex) || 0) + 1);
  }
  const list = Array.from(seen.entries()).sort((a, b) => b[1] - a[1]).slice(0, max);
  console.log(`Unique colors in ${url}:`, list);
  return list;
}

try { window.inspectPngColors = inspectPngColors; } catch {}

