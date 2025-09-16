const DEFAULT_MANIFEST_PATH = 'assets/data/music/themes.json';

let manifestPath = DEFAULT_MANIFEST_PATH;
let manifestCache = null;
let manifestPromise = null;
let loggedLoadProblem = false;
let orderCounter = 0;

const quietWarnKeys = new Set();

function emptyManifest() {
  return {
    version: 0,
    byLocation: new Map(),
    byLevel: new Map(),
    fallback: null,
  };
}

function warnOnce(key, message) {
  if (quietWarnKeys.has(key)) return;
  quietWarnKeys.add(key);
  console.warn(`[music-theme] ${message}`);
}

function readNumber(source, context, key) {
  const value = Number(source[key]);
  if (!Number.isFinite(value)) {
    warnOnce(`${context}.${key}`, `${context}.${key} must be a finite number`);
    return null;
  }
  return value;
}

function readInt(source, context, key, { min = null, max = null } = {}) {
  const raw = Number(source[key]);
  if (!Number.isFinite(raw)) {
    warnOnce(`${context}.${key}`, `${context}.${key} must be an integer`);
    return null;
  }
  const value = Math.trunc(raw);
  if (min != null && value < min) {
    warnOnce(`${context}.${key}`, `${context}.${key} must be >= ${min}`);
    return null;
  }
  if (max != null && value > max) {
    warnOnce(`${context}.${key}`, `${context}.${key} must be <= ${max}`);
    return null;
  }
  return value;
}

function readNumberArray(value, context, key, { length = null, minLength = 1, allowEmpty = false, allowNegative = true, integers = true } = {}) {
  if (!Array.isArray(value)) {
    warnOnce(`${context}.${key}`, `${context}.${key} must be an array`);
    return null;
  }
  if (!allowEmpty && value.length === 0) {
    warnOnce(`${context}.${key}`, `${context}.${key} cannot be empty`);
    return null;
  }
  if (length != null && value.length !== length) {
    warnOnce(`${context}.${key}`, `${context}.${key} must have length ${length}`);
    return null;
  }
  if (minLength != null && value.length < minLength) {
    warnOnce(`${context}.${key}`, `${context}.${key} must have at least ${minLength} entries`);
    return null;
  }
  const out = [];
  for (let i = 0; i < value.length; i++) {
    const raw = Number(value[i]);
    if (!Number.isFinite(raw)) {
      warnOnce(`${context}.${key}[${i}]`, `${context}.${key}[${i}] must be a number`);
      return null;
    }
    const num = integers ? Math.trunc(raw) : raw;
    if (!allowNegative && num < 0) {
      warnOnce(`${context}.${key}[${i}]`, `${context}.${key}[${i}] must be >= 0`);
      return null;
    }
    out.push(num);
  }
  return out;
}

function readOptionalNumberArray(value, context, key, options = {}) {
  if (value == null) return undefined;
  return readNumberArray(value, context, key, options);
}

function readStringArray(value, context, key, { length = null } = {}) {
  if (!Array.isArray(value)) {
    warnOnce(`${context}.${key}`, `${context}.${key} must be an array`);
    return null;
  }
  if (length != null && value.length !== length) {
    warnOnce(`${context}.${key}`, `${context}.${key} must have length ${length}`);
    return null;
  }
  const out = [];
  for (let i = 0; i < value.length; i++) {
    const raw = value[i];
    if (typeof raw !== 'string') {
      warnOnce(`${context}.${key}[${i}]`, `${context}.${key}[${i}] must be a string`);
      return null;
    }
    out.push(raw);
  }
  return out;
}

function coerceThemeSpec(raw, context) {
  if (!raw || typeof raw !== 'object') {
    warnOnce(context, `${context} must be an object`);
    return null;
  }

  const spec = {};
  const intensityRaw = raw.intensity == null ? 0 : Number(raw.intensity);
  spec.intensity = Number.isFinite(intensityRaw) ? Math.min(2, Math.max(0, Math.trunc(intensityRaw))) : 0;

  spec.bpm = readNumber(raw, context, 'bpm');
  spec.barsPerSection = readInt(raw, context, 'barsPerSection', { min: 1 });
  spec.filterBaseA = readNumber(raw, context, 'filterBaseA');
  spec.filterBaseB = readNumber(raw, context, 'filterBaseB');
  spec.filterRange = readNumber(raw, context, 'filterRange');
  spec.hatEvery = readInt(raw, context, 'hatEvery', { min: 1 });
  spec.hatDecay = readNumber(raw, context, 'hatDecay');
  spec.kickDecay = readNumber(raw, context, 'kickDecay');
  spec.snareDecay = readNumber(raw, context, 'snareDecay');
  spec.bassDecay = readNumber(raw, context, 'bassDecay');
  spec.leadAttack = readNumber(raw, context, 'leadAttack');
  spec.leadDecay = readNumber(raw, context, 'leadDecay');

  const chordProgA = readNumberArray(raw.chordProgA, context, 'chordProgA', { integers: true, minLength: 1, allowNegative: true });
  const chordProgB = readNumberArray(raw.chordProgB, context, 'chordProgB', { integers: true, minLength: 1, allowNegative: true });
  const scaleA = readNumberArray(raw.scaleA, context, 'scaleA', { integers: true, minLength: 1, allowNegative: true });
  const scaleB = readNumberArray(raw.scaleB, context, 'scaleB', { integers: true, minLength: 1, allowNegative: true });
  const melodyA1 = readNumberArray(raw.melodyA1, context, 'melodyA1', { integers: true, length: 8, allowNegative: true });
  const melodyA2 = readNumberArray(raw.melodyA2, context, 'melodyA2', { integers: true, length: 8, allowNegative: true });
  const melodyB1 = readNumberArray(raw.melodyB1, context, 'melodyB1', { integers: true, length: 8, allowNegative: true });
  const melodyB2 = readNumberArray(raw.melodyB2, context, 'melodyB2', { integers: true, length: 8, allowNegative: true });
  const bassPattern = readNumberArray(raw.bassPattern, context, 'bassPattern', { integers: true, length: 8, allowNegative: false });

  const hatGain = readNumberArray(raw.hatGain, context, 'hatGain', { integers: false, length: 3, allowNegative: false });
  const kickGain = readNumberArray(raw.kickGain, context, 'kickGain', { integers: false, length: 3, allowNegative: false });
  const snareGain = readNumberArray(raw.snareGain, context, 'snareGain', { integers: false, length: 3, allowNegative: false });
  const bassGain = readNumberArray(raw.bassGain, context, 'bassGain', { integers: false, length: 3, allowNegative: false });
  const leadGain = readNumberArray(raw.leadGain, context, 'leadGain', { integers: false, length: 3, allowNegative: false });
  const leadType = readStringArray(raw.leadType, context, 'leadType', { length: 2 });

  if (spec.bpm == null || spec.barsPerSection == null || spec.filterBaseA == null || spec.filterBaseB == null || spec.filterRange == null ||
      spec.hatEvery == null || spec.hatDecay == null || spec.kickDecay == null || spec.snareDecay == null || spec.bassDecay == null ||
      spec.leadAttack == null || spec.leadDecay == null || !chordProgA || !chordProgB || !scaleA || !scaleB || !melodyA1 || !melodyA2 ||
      !melodyB1 || !melodyB2 || !bassPattern || !hatGain || !kickGain || !snareGain || !bassGain || !leadGain || !leadType) {
    return null;
  }

  spec.chordProgA = chordProgA;
  spec.chordProgB = chordProgB;
  spec.scaleA = scaleA;
  spec.scaleB = scaleB;
  spec.melodyA1 = melodyA1;
  spec.melodyA2 = melodyA2;
  spec.melodyB1 = melodyB1;
  spec.melodyB2 = melodyB2;
  spec.bassPattern = bassPattern;
  spec.hatGain = hatGain;
  spec.kickGain = kickGain;
  spec.snareGain = snareGain;
  spec.bassGain = bassGain;
  spec.leadGain = leadGain;
  spec.leadType = leadType;

  const melodyA3 = readOptionalNumberArray(raw.melodyA3, context, 'melodyA3', { integers: true, length: 8, allowNegative: true });
  const melodyB3 = readOptionalNumberArray(raw.melodyB3, context, 'melodyB3', { integers: true, length: 8, allowNegative: true });
  const melodyAIntense = readOptionalNumberArray(raw.melodyA_intense, context, 'melodyA_intense', { integers: true, length: 8, allowNegative: true });
  const melodyBIntense = readOptionalNumberArray(raw.melodyB_intense, context, 'melodyB_intense', { integers: true, length: 8, allowNegative: true });
  const kickSteps = readOptionalNumberArray(raw.kickSteps, context, 'kickSteps', { integers: true, allowEmpty: true, allowNegative: false });
  const snareSteps = readOptionalNumberArray(raw.snareSteps, context, 'snareSteps', { integers: true, allowEmpty: true, allowNegative: false });
  const restSteps = readOptionalNumberArray(raw.restSteps, context, 'restSteps', { integers: true, allowEmpty: true, allowNegative: false });
  const hatEvery = spec.hatEvery;

  if (melodyA3) spec.melodyA3 = melodyA3;
  if (melodyB3) spec.melodyB3 = melodyB3;
  if (melodyAIntense) spec.melodyA_intense = melodyAIntense;
  if (melodyBIntense) spec.melodyB_intense = melodyBIntense;
  if (kickSteps) spec.kickSteps = kickSteps;
  else spec.kickSteps = [];
  if (snareSteps) spec.snareSteps = snareSteps;
  else spec.snareSteps = [];
  if (restSteps) spec.restSteps = restSteps;
  spec.useIntense = !!raw.useIntense;
  const hatEveryValid = Number.isInteger(hatEvery) && hatEvery >= 1;
  if (!hatEveryValid) {
    warnOnce(`${context}.hatEvery`, `${context}.hatEvery must be >= 1`);
    return null;
  }

  const hatEveryCheck = spec.hatEvery;
  spec.hatEvery = hatEveryCheck;

  const bassTypeRaw = typeof raw.bassType === 'string' ? raw.bassType : 'sine';
  if (bassTypeRaw !== 'sine' && bassTypeRaw !== 'triangle' && bassTypeRaw !== 'square') {
    warnOnce(`${context}.bassType`, `${context}.bassType must be 'sine', 'triangle', or 'square'`);
    return null;
  }
  spec.bassType = bassTypeRaw;

  return Object.freeze(spec);
}

function normalizeVariants(raw, baseContext) {
  if (!raw || typeof raw !== 'object') return null;
  const variants = {};
  const keys = Object.keys(raw);
  for (const key of keys) {
    const theme = coerceThemeSpec(raw[key], `${baseContext}.${key}`);
    if (theme) variants[key] = theme;
  }
  return Object.keys(variants).length ? variants : null;
}

function normalizeThemeEntry(raw, index) {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `theme_${index}`;
  const priority = Number.isFinite(Number(raw.priority)) ? Number(raw.priority) : 0;
  const locationsRaw = raw.locations;
  const levelsRaw = raw.levels;
  const locations = [];
  if (Array.isArray(locationsRaw)) {
    for (const loc of locationsRaw) {
      if (typeof loc === 'string' && loc.trim()) locations.push(loc.trim());
    }
  } else if (typeof locationsRaw === 'string' && locationsRaw.trim()) {
    locations.push(locationsRaw.trim());
  }
  const levels = [];
  if (Array.isArray(levelsRaw)) {
    for (const lvl of levelsRaw) {
      const num = Number(lvl);
      if (Number.isFinite(num)) levels.push(Math.trunc(num));
    }
  } else if (Number.isFinite(Number(levelsRaw))) {
    levels.push(Math.trunc(Number(levelsRaw)));
  }

  const variants = normalizeVariants(raw.variants, id);
  if (!variants) return null;

  return {
    id,
    priority,
    order: orderCounter++,
    locations,
    levels,
    variants,
    isDefault: raw.default === true || (locations.length === 0 && levels.length === 0),
  };
}

function pickPreferred(current, candidate) {
  if (!candidate) return current;
  if (!current) return candidate;
  if (candidate.priority > current.priority) return candidate;
  if (candidate.priority < current.priority) return current;
  return current.order <= candidate.order ? current : candidate;
}

function buildManifest(raw) {
  if (!raw || typeof raw !== 'object') return emptyManifest();
  const manifest = emptyManifest();
  if (Number.isFinite(Number(raw.schemaVersion))) {
    manifest.version = Number(raw.schemaVersion);
  }
  const entries = Array.isArray(raw.themes) ? raw.themes : [];
  for (let i = 0; i < entries.length; i++) {
    const normalized = normalizeThemeEntry(entries[i], i);
    if (!normalized) continue;
    if (normalized.isDefault) {
      manifest.fallback = pickPreferred(manifest.fallback, normalized);
    }
    for (const loc of normalized.locations) {
      if (loc === '*' || loc === 'default') {
        manifest.fallback = pickPreferred(manifest.fallback, normalized);
        continue;
      }
      const existing = manifest.byLocation.get(loc);
      manifest.byLocation.set(loc, pickPreferred(existing, normalized));
    }
    for (const lvl of normalized.levels) {
      const existing = manifest.byLevel.get(lvl);
      manifest.byLevel.set(lvl, pickPreferred(existing, normalized));
    }
  }
  return manifest;
}

function ensureManifest(path = manifestPath) {
  manifestPath = path || DEFAULT_MANIFEST_PATH;
  if (manifestCache) return null;
  if (manifestPromise) return manifestPromise;
  if (typeof fetch !== 'function') {
    if (!loggedLoadProblem) {
      loggedLoadProblem = true;
      console.warn('[music-theme] fetch() is not available; external themes disabled');
    }
    manifestCache = emptyManifest();
    return null;
  }
  manifestPromise = fetch(manifestPath, { cache: 'no-cache' })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.text();
    })
    .then((text) => {
      if (!text) {
        manifestCache = emptyManifest();
        return manifestCache;
      }
      let json = {};
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        if (!loggedLoadProblem) {
          loggedLoadProblem = true;
          const snippet = text.slice(0, 120).replace(/\s+/g, ' ');
          console.warn(`[music-theme] invalid JSON in ${manifestPath}: ${parseErr.message || parseErr}. Snippet: ${snippet}`);
        }
        manifestCache = emptyManifest();
        return manifestCache;
      }
      manifestCache = buildManifest(json);
      return manifestCache;
    })
    .catch((err) => {
      if (!loggedLoadProblem) {
        loggedLoadProblem = true;
        console.warn(`[music-theme] failed to load ${manifestPath}: ${err.message || err}`);
      }
      manifestCache = emptyManifest();
      return manifestCache;
    })
    .finally(() => {
      manifestPromise = null;
    });
  return manifestPromise;
}

export function warmupMusicThemes(path = manifestPath) {
  manifestPath = path || DEFAULT_MANIFEST_PATH;
  if (manifestCache) return Promise.resolve(manifestCache);
  const promise = ensureManifest(manifestPath);
  return promise || Promise.resolve(manifestCache);
}

export function reloadMusicThemes(path = manifestPath) {
  manifestCache = null;
  manifestPromise = null;
  loggedLoadProblem = false;
  orderCounter = 0;
  quietWarnKeys.clear();
  return warmupMusicThemes(path);
}

function pickVariant(entry, mode) {
  if (!entry) return null;
  return entry.variants[mode] || entry.variants.default || entry.variants['*'] || null;
}

export function getExternalTheme({ mode = 'normal', location = null, level = null } = {}) {
  if (!manifestCache) ensureManifest(manifestPath);
  if (!manifestCache) return null;
  const candidates = [];
  if (location && manifestCache.byLocation.has(location)) {
    candidates.push(manifestCache.byLocation.get(location));
  }
  if (Number.isFinite(level) && manifestCache.byLevel.has(Math.trunc(level))) {
    candidates.push(manifestCache.byLevel.get(Math.trunc(level)));
  }
  if (manifestCache.fallback) candidates.push(manifestCache.fallback);
  for (const entry of candidates) {
    const variant = pickVariant(entry, mode);
    if (variant) return variant;
  }
  return null;
}

export function getLoadedMusicThemeManifest() {
  return manifestCache;
}
