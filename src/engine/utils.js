export function rectsIntersect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Geometry helpers for attack line-of-sight
export function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  function orient(x1,y1,x2,y2,x3,y3){ return (x2-x1)*(y3-y1) - (y2-y1)*(x3-x1); }
  function onSeg(x1,y1,x2,y2,x3,y3){ return Math.min(x1,x2) <= x3 && x3 <= Math.max(x1,x2) && Math.min(y1,y2) <= y3 && y3 <= Math.max(y1,y2); }
  const o1 = orient(ax,ay,bx,by,cx,cy);
  const o2 = orient(ax,ay,bx,by,dx,dy);
  const o3 = orient(cx,cy,dx,dy,ax,ay);
  const o4 = orient(cx,cy,dx,dy,bx,by);
  if ((o1 === 0 && onSeg(ax,ay,bx,by,cx,cy)) || (o2 === 0 && onSeg(ax,ay,bx,by,dx,dy)) ||
      (o3 === 0 && onSeg(cx,cy,dx,dy,ax,ay)) || (o4 === 0 && onSeg(cx,cy,dx,dy,bx,by))) return true;
  return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
}

export function segmentIntersectsRect(ax, ay, bx, by, r) {
  // quick AABB reject around segment bbox
  const minx = Math.min(ax, bx), maxx = Math.max(ax, bx);
  const miny = Math.min(ay, by), maxy = Math.max(ay, by);
  if (maxx < r.x || minx > r.x + r.w || maxy < r.y || miny > r.y + r.h) return false;
  // if either end inside rect, treat as intersect
  if (ax >= r.x && ax <= r.x + r.w && ay >= r.y && ay <= r.y + r.h) return true;
  if (bx >= r.x && bx <= r.x + r.w && by >= r.y && by <= r.y + r.h) return true;
  // test edges
  const rx1 = r.x, ry1 = r.y, rx2 = r.x + r.w, ry2 = r.y + r.h;
  if (segmentsIntersect(ax,ay,bx,by, rx1,ry1, rx2,ry1)) return true; // top
  if (segmentsIntersect(ax,ay,bx,by, rx2,ry1, rx2,ry2)) return true; // right
  if (segmentsIntersect(ax,ay,bx,by, rx2,ry2, rx1,ry2)) return true; // bottom
  if (segmentsIntersect(ax,ay,bx,by, rx1,ry2, rx1,ry1)) return true; // left
  return false;
}

// Compute simple equipment modifiers
export function getEquipStats(actor) {
  const eq = actor?.inventory?.equipped || {};
  let atk = 0, dr = 0;
  const slots = ['head','torso','legs','leftHand','rightHand'];
  for (const s of slots) {
    const it = eq[s];
    if (!it) continue;
    if (typeof it.atk === 'number') atk += it.atk;
    if (typeof it.dr === 'number') dr += it.dr;
  }
  return { atk, dr };
}
