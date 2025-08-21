#!/usr/bin/env npx tsx
/**
 * Move Cursed Skull to Grand Entrance Hall for immediate testing
 */

import Database from '../src/utils/database';

async function moveSkullToEntrance() {
  const db = new Database('data/db/shadow_kingdom.db');
  await db.connect();

  try {
    // Find the Grand Entrance Hall
    const entranceHall = await db.get(`
      SELECT id FROM rooms 
      WHERE name LIKE '%Grand Entrance%' OR name LIKE '%Entrance Hall%'
      ORDER BY id ASC LIMIT 1
    `);

    if (!entranceHall) {
      console.error('❌ Could not find Grand Entrance Hall');
      return;
    }

    console.log(`🏛️ Found Grand Entrance Hall room ID: ${entranceHall.id}`);

    // Find the Cursed Skull item
    const cursedSkull = await db.get(`
      SELECT id FROM items WHERE name = 'Cursed Skull'
    `);

    if (!cursedSkull) {
      console.error('❌ Could not find Cursed Skull item');
      return;
    }

    console.log(`💀 Found Cursed Skull item ID: ${cursedSkull.id}`);

    // Remove skull from current location
    await db.run(`
      DELETE FROM room_items WHERE item_id = ?
    `, [cursedSkull.id]);

    // Add skull to Grand Entrance Hall
    await db.run(`
      INSERT INTO room_items (room_id, item_id, quantity)
      VALUES (?, ?, ?)
    `, [entranceHall.id, cursedSkull.id, 1]);

    console.log(`✅ Moved Cursed Skull to Grand Entrance Hall`);
    console.log(`🎮 Now test with: look`);
    console.log(`⚡ Then: get cursed skull`);
    console.log(`💀 Immediate effects: -3 wisdom, -2 constitution, 8 damage!`);

  } catch (error) {
    console.error('❌ Error moving skull:', error);
  } finally {
    await db.close();
  }
}

if (require.main === module) {
  moveSkullToEntrance();
}