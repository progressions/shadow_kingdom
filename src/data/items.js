// Simple item database and helpers
// Slots: head, torso, legs, leftHand, rightHand

export const sampleItems = [
  { id: 'cap_leather',   name: 'Leather Cap',   slot: 'head',      dr: 1 },
  { id: 'helm_bronze',   name: 'Bronze Helm',   slot: 'head',      dr: 2 },
  { id: 'helm_iron',     name: 'Iron Helm',     slot: 'head',      dr: 3 },
  { id: 'shirt_cloth',   name: 'Cloth Tunic',   slot: 'torso',     dr: 1 },
  { id: 'armor_leather', name: 'Leather Armor', slot: 'torso',     dr: 2 },
  { id: 'armor_scaled',  name: 'Scaled Cuirass', slot: 'torso',     dr: 3 },
  { id: 'armor_chain',   name: 'Chain Mail',    slot: 'torso',     dr: 4 },
  { id: 'plate_mail',    name: 'Plate Mail',    slot: 'torso',     dr: 5 },
  { id: 'pants_cloth',   name: 'Cloth Pants',   slot: 'legs',      dr: 1 },
  { id: 'greaves_leather', name: 'Leather Greaves', slot: 'legs',   dr: 1 },
  { id: 'plate_boots',   name: 'Plate Boots',   slot: 'legs',      dr: 3 },
  { id: 'stick',         name: 'Wooden Stick',  slot: 'rightHand',  atk: 1 },
  { id: 'dagger',        name: 'Rusty Dagger',  slot: 'rightHand',  atk: 2 },
  { id: 'sword_fine',    name: 'Fine Sword',    slot: 'rightHand',  atk: 4 },
  { id: 'master_sword',  name: 'Master Sword',  slot: 'rightHand',  atk: 6 },
  { id: 'buckler',       name: 'Small Buckler', slot: 'leftHand',   dr: 1 },
  { id: 'heavy_shield',  name: 'Heavy Shield',  slot: 'leftHand',   dr: 3 },
  { id: 'torch',         name: 'Torch',         slot: 'leftHand',   atk: 0, stackable: true, maxQty: 99 },
  // Health potions (auto-consume on pickup; not stored)
  { id: 'potion_light',  name: 'Light Health Potion',  slot: 'misc' },
  { id: 'potion_medium', name: 'Medium Health Potion', slot: 'misc' },
  { id: 'potion_strong', name: 'Strong Health Potion', slot: 'misc' },
  // Key items (not equip slots): use slot 'misc'
  { id: 'key_bronze',    name: 'Bronze Key',    slot: 'misc',       keyId: 'castle_gate' },
  { id: 'key_nethra',    name: 'Ruin Gate Key', slot: 'misc',       keyId: 'key_nethra' },
  { id: 'key_reed',      name: 'Reed Key',      slot: 'misc',       keyId: 'key_reed' },
  // Level 4 key (Ruined City)
  { id: 'key_sigil',     name: 'Iron Sigil',     slot: 'misc',      keyId: 'key_sigil' },
  // Level 5 key (Temple Gate)
  { id: 'key_temple',    name: 'Temple Key',    slot: 'misc',       keyId: 'key_temple' },
  // Quest item (fetch/deliver): Canopy — Sister's Ribbon
  { id: 'relic_canopy',  name: "Sister's Ribbon", slot: 'misc',     keyId: 'relic_canopy' },
];

export function cloneItem(item) {
  const it = { id: item.id, name: item.name, slot: item.slot };
  if (typeof item.atk === 'number') it.atk = item.atk;
  if (typeof item.dr === 'number') it.dr = item.dr;
  if (item.keyId) it.keyId = item.keyId;
  if (item.stackable) { it.stackable = true; it.maxQty = item.maxQty || 99; it.qty = typeof item.qty === 'number' ? item.qty : 1; }
  return it;
}
