import { sampleItems, cloneItem } from './items.js';
import { rngFloat } from '../engine/rng.js';

// Simple weighted loot tables per source. w = weight.
// Use ids from items.js; clone on grant.
export const ENEMY_LOOT = {
  mook: [
    { id: 'stick', w: 20 },
    { id: 'torch', w: 15 },
    { id: 'cap_leather', w: 10 },
    { id: 'potion_light', w: 8 },
  ],
  featured: [
    { id: 'dagger', w: 25 },
    { id: 'buckler', w: 20 },
    { id: 'armor_leather', w: 15 },
    { id: 'sword_fine', w: 10 },
    { id: 'potion_light', w: 10 },
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
    { id: 'potion_light', w: 15 },
  ],
  rare: [
    { id: 'helm_bronze', w: 35 },
    { id: 'dagger', w: 35 },
    { id: 'greaves_leather', w: 25 },
    { id: 'sword_fine', w: 20 },
  ],
};

export const BREAKABLE_LOOT = {
  barrel: [
    { id: 'torch', w: 25 },
    { id: 'stick', w: 20 },
    { id: 'cap_leather', w: 10 },
    { id: 'potion_light', w: 12 },
  ],
  crate: [
    { id: 'stick', w: 25 },
    { id: 'buckler', w: 12 },
    { id: 'shirt_cloth', w: 18 },
    { id: 'sword_fine', w: 5 },
    { id: 'potion_light', w: 8 },
  ],
};

export function rollFromTable(table) {
  if (!Array.isArray(table) || table.length === 0) return null;
  const total = table.reduce((s, e) => s + (e.w || 0), 0);
  if (total <= 0) return null;
  let r = rngFloat('loot') * total;
  for (const e of table) { r -= (e.w || 0); if (r <= 0) return itemById(e.id); }
  return itemById(table[table.length - 1].id);
}

export function itemById(id) {
  // find in sampleItems by id and clone
  const it = sampleItems.find(s => s.id === id);
  return it ? cloneItem(it) : null;
}

// --- Level 2 (Desert) loot tables ---
export const ENEMY_LOOT_L2 = {
  mook: [
    { id: 'torch', w: 20 },
    { id: 'stick', w: 15 },
    { id: 'potion_light', w: 10 },
    { id: 'potion_medium', w: 8 },
  ],
  featured: [
    { id: 'dagger', w: 20 },
    { id: 'buckler', w: 15 },
    { id: 'armor_scaled', w: 12 },
    { id: 'potion_medium', w: 10 },
  ],
  boss: [
    // Level 2 bosses generally have scripted/guaranteed drops; leave empty
  ],
};

export const CHEST_LOOT_L2 = {
  common: [
    { id: 'torch', w: 35 },
    { id: 'shirt_cloth', w: 25 },
    { id: 'potion_light', w: 12 },
  ],
  rare: [
    { id: 'armor_scaled', w: 28 },
    { id: 'helm_bronze', w: 22 },
    { id: 'sword_fine', w: 20 },
    { id: 'potion_medium', w: 12 },
  ],
};
