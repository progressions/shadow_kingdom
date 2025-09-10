// Helper to clear procedurally placed obstacles from an arena interior
// and from the gate opening so walls/gates are not blocked.
// arenaRect: { x, y, w, h } for the full arena footprint (outer edge of walls)
// wallThickness: numeric thickness of walls (typically 8)
// gateRect: { x, y, w, h } rectangle for the gate opening; optional
export function clearArenaInteriorAndGate(obstacles, arenaRect, wallThickness, gateRect) {
  if (!Array.isArray(obstacles) || !arenaRect) return;
  const t = Math.max(1, (wallThickness | 0));
  const inner = { x: arenaRect.x + t, y: arenaRect.y + t, w: Math.max(0, arenaRect.w - 2 * t), h: Math.max(0, arenaRect.h - 2 * t) };
  const hasGate = !!gateRect;
  const overlaps = (a, b) => !(a.x + a.w <= b.x || a.x >= b.x + b.w || a.y + a.h <= b.y || a.y >= b.y + b.h);
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i]; if (!o) continue;
    const r = { x: o.x, y: o.y, w: o.w, h: o.h };
    if (overlaps(r, inner) || (hasGate && overlaps(r, gateRect))) {
      obstacles.splice(i, 1);
    }
  }
}

