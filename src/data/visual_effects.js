// Visual effect presets referenced by companion triggers and other systems.
// Presets keep presentation data in one place so designers can reuse glows, auras, and sprites.

export const visualEffectPresets = {
  guardian_veil_glow: {
    kind: 'glow',
    color: '#8ab4ff',
    pulseSpeed: 3.5,
    blur: 18,
    radius: 36,
    defaultAnchor: 'player',
    layer: 'overlay',
    defaultDuration: 3,
    replaceId: 'guardian_veil_glow',
    alpha: 0.35,
  },
  shadow_guard: {
    kind: 'aura',
    colorInner: 'rgba(40, 0, 60, 0.5)',
    colorOuter: 'rgba(6, 0, 14, 0)',
    radius: 44,
    defaultAnchor: 'companion',
    layer: 'ground',
    defaultDuration: 4,
    replaceId: 'shadow_guard',
  },
  void_banner: {
    kind: 'sprite',
    spriteId: 'assets/sprites/blurb.png',
    frame: { x: 0, y: 0, w: 16, h: 16 },
    scale: 1.8,
    defaultAnchor: 'companion',
    offset: { x: 0, y: -20 },
    bobAmplitude: 3,
    bobSpeed: 1.4,
    layer: 'overlay',
    defaultDuration: 3,
    replaceId: 'void_banner',
  },
  critical_text: {
    kind: 'text',
    color: '#ff9a3d',
    defaultText: 'Critical!',
    defaultAnchor: 'player',
    layer: 'overlay',
    defaultDuration: 0.9,
    replaceId: null,
  },
};

export function getVisualEffectPreset(key) {
  if (!key) return null;
  const k = String(key).trim().toLowerCase();
  const direct = visualEffectPresets[key];
  if (direct) return direct;
  // Allow case-insensitive lookup as a convenience for data files.
  return Object.entries(visualEffectPresets).find(([id]) => id.toLowerCase() === k)?.[1] || null;
}
