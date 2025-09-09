// Simple item database and helpers
// Slots: head, torso, legs, leftHand, rightHand

export const sampleItems = [
  { id: 'cap_leather',   name: 'Leather Cap',   slot: 'head',      dr: 1 },
  { id: 'helm_bronze',   name: 'Bronze Helm',   slot: 'head',      dr: 2 },
  { id: 'shirt_cloth',   name: 'Cloth Tunic',   slot: 'torso',     dr: 1 },
  { id: 'armor_leather', name: 'Leather Armor', slot: 'torso',     dr: 2 },
  { id: 'pants_cloth',   name: 'Cloth Pants',   slot: 'legs',      dr: 1 },
  { id: 'greaves_leather', name: 'Leather Greaves', slot: 'legs',   dr: 1 },
  { id: 'stick',         name: 'Wooden Stick',  slot: 'rightHand',  atk: 1 },
  { id: 'dagger',        name: 'Rusty Dagger',  slot: 'rightHand',  atk: 2 },
  { id: 'buckler',       name: 'Small Buckler', slot: 'leftHand',   dr: 1 },
  { id: 'torch',         name: 'Torch',         slot: 'leftHand',   atk: 0 },
  // Key items (not equip slots): use slot 'misc'
  { id: 'key_bronze',    name: 'Bronze Key',    slot: 'misc',       keyId: 'castle_gate' },
];

export function cloneItem(item) {
  const it = { id: item.id, name: item.name, slot: item.slot };
  if (typeof item.atk === 'number') it.atk = item.atk;
  if (typeof item.dr === 'number') it.dr = item.dr;
  return it;
}
