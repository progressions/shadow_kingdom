// Small helper to apply a PNG-authored level and perform common follow-ups
// Note: side-effect dependencies are injected for easier testing.
// deps: { applyPngMap, initMinimap, camera, world, player, applyPendingRestore }
export async function applyLevelPng(cfg, deps) {
  if (!cfg || !deps) return null;
  const { url, legend } = cfg;
  const { applyPngMap, initMinimap, camera, world, player, applyPendingRestore } = deps;
  const t = await applyPngMap(url, legend);
  try { initMinimap && initMinimap(); } catch {}
  try {
    if (camera && world && player) {
      camera.x = Math.max(0, Math.min((world.w || 0) - (camera.w || 0), Math.round((player.x || 0) + (player.w || 0)/2 - (camera.w || 0)/2)));
      camera.y = Math.max(0, Math.min((world.h || 0) - (camera.h || 0), Math.round((player.y || 0) + (player.h || 0)/2 - (camera.h || 0)/2)));
    }
  } catch {}
  try { applyPendingRestore && applyPendingRestore(); } catch {}
  return t || null;
}

