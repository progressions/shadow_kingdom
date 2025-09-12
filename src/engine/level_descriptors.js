// Explicit level descriptors for save system
export const LEVEL_DESCRIPTORS = {
  1: {
    gates: ['castle_gate'],
    chests: ['chest_l1_weapon', 'chest_l1_extra'],
    breakables: ['brk_l1_0', 'brk_l1_1'],
    uniqueActors: ['enemy:vast', 'enemy:gorg'],
  },
  2: {
    gates: ['nethra_gate'],
    chests: ['chest_l2_armor'],
    breakables: ['brk_l2_a', 'brk_l2_b'],
    uniqueActors: ['enemy:nethra', 'enemy:aarg'],
  },
  3: {
    gates: ['marsh_gate'],
    chests: ['chest_l3_helm'],
    breakables: ['brk_l3_a', 'brk_l3_b'],
    uniqueActors: ['enemy:luula', 'enemy:wight'],
  },
  4: {
    gates: ['city_gate'],
    chests: [],
    breakables: [],
    uniqueActors: ['enemy:vanificia', 'enemy:blurb'],
  },
  5: {
    gates: ['temple_gate'],
    chests: [],
    breakables: [],
    uniqueActors: ['enemy:vorthak', 'enemy:fana'],
  },
  6: {
    gates: [],
    chests: [],
    breakables: [],
    uniqueActors: [],
  },
};

export function descriptorForLevel(level) {
  return LEVEL_DESCRIPTORS[level] || { gates: [], chests: [], breakables: [], uniqueActors: [] };
}
