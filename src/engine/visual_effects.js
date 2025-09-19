import { visualEffectPresets, getVisualEffectPreset } from '../data/visual_effects.js';
import { visualEffects, player, companions, runtime, spawnFloatText } from './state.js';
import { getSprite } from './sprite_loader.js';

let nextVisualEffectId = 1;

function normalizeAnchor(anchor) {
  if (!anchor) return null;
  const a = String(anchor).toLowerCase();
  if (a === 'self') return 'companion';
  if (a === 'entity') return 'entity';
  if (a === 'world') return 'world';
  if (a === 'companion') return 'companion';
  if (a === 'screen') return 'screen';
  return 'player';
}

function resolveAnchorRef(anchorType, opts) {
  switch (anchorType) {
    case 'player':
      return player;
    case 'companion':
      if (opts?.companion && companions.includes(opts.companion)) return opts.companion;
      if (opts?.anchorRef) return opts.anchorRef;
      return null;
    case 'entity':
      if (opts?.anchorRef) return opts.anchorRef;
      if (opts?.companion && companions.includes(opts.companion)) return opts.companion;
      return null;
    case 'screen':
    case 'world':
    default:
      return null;
  }
}

function computeAnchorPosition(anchorType, anchorRef, opts) {
  switch (anchorType) {
    case 'player': {
      const w = player.w || 0;
      const h = player.h || 0;
      return { x: player.x + w / 2, y: player.y + h / 2, ok: true };
    }
    case 'companion':
    case 'entity': {
      if (!anchorRef) return { x: 0, y: 0, ok: false };
      const w = anchorRef.w || 0;
      const h = anchorRef.h || 0;
      return { x: anchorRef.x + w / 2, y: anchorRef.y + h / 2, ok: true };
    }
    case 'world': {
      const pos = opts?.position;
      const x = typeof opts?.worldX === 'number' ? opts.worldX : (typeof pos?.x === 'number' ? pos.x : null);
      const y = typeof opts?.worldY === 'number' ? opts.worldY : (typeof pos?.y === 'number' ? pos.y : null);
      if (x == null || y == null) return { x: 0, y: 0, ok: false };
      return { x, y, ok: true };
    }
    case 'screen': {
      // Screen-space origin at camera center (render will treat accordingly)
      return { x: 0, y: 0, ok: true };
    }
    default:
      return { x: 0, y: 0, ok: false };
  }
}

function buildEffectObject(presetId, preset, options) {
  const overrides = options?.overrides || {};
  const anchorType = normalizeAnchor(options?.anchor || overrides.anchor || preset.defaultAnchor);
  const anchorRef = resolveAnchorRef(anchorType, options);
  const durationSec = (typeof options?.durationSec === 'number') ? options.durationSec
    : (typeof overrides.durationSec === 'number') ? overrides.durationSec
    : (typeof preset.defaultDuration === 'number' ? preset.defaultDuration : null);
  const layer = overrides.layer || options?.layer || preset.layer || 'overlay';
  const replaceId = options?.replaceId || overrides.replaceId || preset.replaceId || null;
  const offset = overrides.offset || options?.offset || preset.offset || { x: 0, y: 0 };
  const radius = overrides.radius ?? options?.radius ?? preset.radius ?? 32;

  return {
    id: options?.id || `ve_${nextVisualEffectId++}`,
    presetId,
    kind: overrides.kind || preset.kind,
    layer,
    anchorType,
    anchorRef,
    offsetX: typeof offset.x === 'number' ? offset.x : 0,
    offsetY: typeof offset.y === 'number' ? offset.y : 0,
    radius,
    colorInner: overrides.colorInner || preset.colorInner || null,
    colorOuter: overrides.colorOuter || preset.colorOuter || null,
    color: overrides.color || options?.color || preset.color || '#ffffff',
    alpha: typeof (overrides.alpha ?? options?.alpha ?? preset.alpha) === 'number' ? (overrides.alpha ?? options?.alpha ?? preset.alpha) : 1,
    blur: overrides.blur ?? options?.blur ?? preset.blur ?? 0,
    pulseSpeed: overrides.pulseSpeed ?? options?.pulseSpeed ?? preset.pulseSpeed ?? 0,
    scale: overrides.scale ?? options?.scale ?? preset.scale ?? 1,
    spriteId: overrides.spriteId || options?.spriteId || preset.spriteId || null,
    frame: overrides.frame || options?.frame || preset.frame || null,
    bobAmplitude: overrides.bobAmplitude ?? options?.bobAmplitude ?? preset.bobAmplitude ?? 0,
    bobSpeed: overrides.bobSpeed ?? options?.bobSpeed ?? preset.bobSpeed ?? 0,
    worldX: typeof options?.worldX === 'number' ? options.worldX : (typeof options?.position?.x === 'number' ? options.position.x : null),
    worldY: typeof options?.worldY === 'number' ? options.worldY : (typeof options?.position?.y === 'number' ? options.position.y : null),
    removeIfNoAnchor: overrides.removeIfNoAnchor ?? options?.removeIfNoAnchor ?? (anchorType !== 'world'),
    persistOnMissingAnchor: overrides.persistOnMissingAnchor ?? options?.persistOnMissingAnchor ?? false,
    duration: durationSec,
    replaceId,
    createdAt: runtime?._timeSec || 0,
    t: 0,
    lifeRatio: 1,
    sprite: null,
    spriteLoading: false,
    phase: 0,
    bobPhase: 0,
  };
}

function pushEffect(effect) {
  if (!effect) return null;
  if (effect.replaceId) {
    for (let i = visualEffects.length - 1; i >= 0; i--) {
      if (visualEffects[i]?.replaceId === effect.replaceId) visualEffects.splice(i, 1);
    }
  }
  visualEffects.push(effect);
  updateEffectPosition(effect, 0);
  return effect;
}

function updateEffectPosition(effect, dt) {
  const pos = computeAnchorPosition(effect.anchorType, effect.anchorRef, { worldX: effect.worldX, worldY: effect.worldY });
  if (!pos.ok && effect.anchorType === 'companion') {
    if (effect.anchorRef && !companions.includes(effect.anchorRef)) {
      if (!effect.persistOnMissingAnchor && effect.removeIfNoAnchor) return false;
    }
  }
  if (!pos.ok && effect.anchorType === 'entity') {
    if (!effect.persistOnMissingAnchor && effect.removeIfNoAnchor) return false;
  }
  if (!pos.ok && effect.anchorType !== 'world' && effect.anchorType !== 'screen') {
    if (effect.removeIfNoAnchor && !effect.persistOnMissingAnchor) return false;
  }

  const baseX = pos.ok ? pos.x : (effect.worldX ?? 0);
  const baseY = pos.ok ? pos.y : (effect.worldY ?? 0);
  effect.x = baseX + effect.offsetX;
  effect.y = baseY + effect.offsetY;

  if (effect.kind === 'glow' && effect.pulseSpeed) effect.phase = (effect.phase || 0) + dt * effect.pulseSpeed;
  if (effect.kind === 'sprite' && effect.bobSpeed) effect.bobPhase = (effect.bobPhase || 0) + dt * effect.bobSpeed;
  return true;
}

export function spawnVisualEffect(options = {}) {
  try {
    const presetId = options?.presetId || options?.effect || options?.key || options?.id;
    if (!presetId) return null;
    const preset = getVisualEffectPreset(presetId) || visualEffectPresets[presetId];
    if (!preset) {
      console.warn('[visual-effects] Missing preset', presetId);
      return null;
    }
    const anchorType = normalizeAnchor(options?.anchor || options?.overrides?.anchor || preset.defaultAnchor);
    if (preset.kind === 'text' || normalizeAnchor(options?.overrides?.kind) === 'text') {
      const anchorRef = resolveAnchorRef(anchorType, options);
      const pos = computeAnchorPosition(anchorType, anchorRef, {
        worldX: options?.worldX,
        worldY: options?.worldY,
        position: options?.position,
      });
      if (!pos.ok) return null;
      const text = options?.overrides?.text || options?.text || preset.defaultText || '';
      const color = options?.overrides?.color || options?.color || preset.color || '#ffffff';
      spawnFloatText(pos.x, pos.y - 12, text, { color, life: preset.defaultDuration || 0.9 });
      return null;
    }
    const eff = buildEffectObject(presetId, preset, { ...options, anchor: anchorType });
    return pushEffect(eff);
  } catch (err) {
    console.warn('[visual-effects] spawn failed', err);
    return null;
  }
}

export function clearVisualEffect(replaceId) {
  if (!replaceId) return;
  for (let i = visualEffects.length - 1; i >= 0; i--) {
    if (visualEffects[i]?.replaceId === replaceId) visualEffects.splice(i, 1);
  }
}

export function updateVisualEffects(dt) {
  for (let i = visualEffects.length - 1; i >= 0; i--) {
    const eff = visualEffects[i];
    if (!eff) { visualEffects.splice(i, 1); continue; }
    eff.t += dt;
    if (typeof eff.duration === 'number' && eff.duration >= 0) {
      if (eff.t >= eff.duration) { visualEffects.splice(i, 1); continue; }
      const remaining = Math.max(0, eff.duration - eff.t);
      eff.lifeRatio = eff.duration > 0 ? Math.max(0, Math.min(1, remaining / eff.duration)) : 1;
    } else {
      eff.lifeRatio = 1;
    }
    const ok = updateEffectPosition(eff, dt);
    if (!ok && eff.removeIfNoAnchor && !eff.persistOnMissingAnchor) {
      visualEffects.splice(i, 1);
      continue;
    }
    if (eff.kind === 'sprite' && eff.spriteId && !eff.sprite && !eff.spriteLoading) {
      eff.spriteLoading = true;
      getSprite(eff.spriteId)
        .then((s) => { eff.sprite = s; eff.spriteLoading = false; })
        .catch(() => { eff.spriteLoading = false; });
    }
  }
}
