import { sampleItems, cloneItem } from './items.js';

// Simple weighted loot tables per source. w = weight.
// Use ids from items.js; clone on grant.
export const ENEMY_LOOT = {
  mook: [
    { id: 'stick', w: 20 },
    { id: 'torch', w: 15 },
    { id: 'cap_leather', w: 10 },
  ],
  featured: [
    { id: 'dagger', w: 25 },
    { id: 'buckler', w: 20 },
    { id: 'armor_leather', w: 15 },
  ],
  boss: [
    // Boss no longer drops the castle key; use featured foe key-bearer instead
  ],
};

export const CHEST_LOOT = {
  common: [
    { id: 'torch', w: 30 },
    { id: 'cap_leather', w: 25 },
    { id: 'shirt_cloth', w: 20 },
  ],
  rare: [
    { id: 'helm_bronze', w: 35 },
    { id: 'dagger', w: 35 },
    { id: 'greaves_leather', w: 25 },
  ],
};

export const BREAKABLE_LOOT = {
  barrel: [
    { id: 'torch', w: 25 },
    { id: 'stick', w: 20 },
    { id: 'cap_leather', w: 10 },
  ],
  crate: [
    { id: 'stick', w: 25 },
    { id: 'buckler', w: 12 },
    { id: 'shirt_cloth', w: 18 },
  ],
};

export function rollFromTable(table) {
  if (!Array.isArray(table) || table.length === 0) return null;
  const total = table.reduce((s, e) => s + (e.w || 0), 0);
  if (total <= 0) return null;
  let r = Math.random() * total;
  for (const e of table) { r -= (e.w || 0); if (r <= 0) return itemById(e.id); }
  return itemById(table[table.length - 1].id);
}

export function itemById(id) {
  // find in sampleItems by id and clone
  const it = sampleItems.find(s => s.id === id);
  return it ? cloneItem(it) : null;
}
