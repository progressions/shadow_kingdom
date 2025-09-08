// Stats derivation (Scaffold)
// Map equipment to simple additive stats for MVP.

export function deriveStatsFromEquipment(actor) {
  const base = { HP: 10, ATK: 2, DEF: 1, RES: 1, MAG: 1, SPEED: 2 };
  const eq = actor?.inventory?.equipped || {};
  // Very simple: add +2 HP for torso, +1 DEF for legs, +1 RES for head, +1 ATK for right hand
  if (eq.torso) base.HP += 2;
  if (eq.legs) base.DEF += 1;
  if (eq.head) base.RES += 1;
  if (eq.rightHand) base.ATK += 1;
  return base;
}

