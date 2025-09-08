// Simple item database and helpers
// Slots: head, torso, legs, leftHand, rightHand

export const sampleItems = [
  { id: 'cap_leather', name: 'Leather Cap', slot: 'head' },
  { id: 'helm_bronze', name: 'Bronze Helm', slot: 'head' },
  { id: 'shirt_cloth', name: 'Cloth Tunic', slot: 'torso' },
  { id: 'armor_leather', name: 'Leather Armor', slot: 'torso' },
  { id: 'pants_cloth', name: 'Cloth Pants', slot: 'legs' },
  { id: 'greaves_leather', name: 'Leather Greaves', slot: 'legs' },
  { id: 'stick', name: 'Wooden Stick', slot: 'rightHand' },
  { id: 'dagger', name: 'Rusty Dagger', slot: 'rightHand' },
  { id: 'buckler', name: 'Small Buckler', slot: 'leftHand' },
  { id: 'torch', name: 'Torch', slot: 'leftHand' },
];

export function cloneItem(item) {
  return { id: item.id, name: item.name, slot: item.slot };
}

