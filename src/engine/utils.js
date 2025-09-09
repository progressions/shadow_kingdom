export function rectsIntersect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
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
