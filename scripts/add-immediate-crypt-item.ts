#!/usr/bin/env npx tsx
/**
 * Add immediate-effect item to Ancient Crypt Entrance
 */

import Database from '../src/utils/database';
import { EventTriggerService } from '../src/services/eventTriggerService';

async function addImmediateCryptItem() {
  const db = new Database('data/db/shadow_kingdom.db');
  await db.connect();

  try {
    // Find the Ancient Crypt Entrance room
    const cryptRoom = await db.get(`
      SELECT id FROM rooms 
      WHERE name LIKE '%Crypt%' AND name LIKE '%Entrance%'
      ORDER BY id DESC LIMIT 1
    `);

    if (!cryptRoom) {
      console.error('❌ Could not find Ancient Crypt Entrance room');
      return;
    }

    console.log(`📍 Found Ancient Crypt Entrance room ID: ${cryptRoom.id}`);

    // Create a Cursed Skull item that triggers immediately on pickup
    const cursedSkull = await db.run(`
      INSERT INTO items (name, description, type, weight, value)
      VALUES (?, ?, ?, ?, ?)
    `, [
      'Cursed Skull',
      'A weathered human skull with glowing red eye sockets. Dark energy emanates from its hollow gaze, and you can hear faint whispers when near it.',
      'artifact',
      2,
      50
    ]);

    const cursedSkullId = cursedSkull.lastID;
    console.log(`💀 Created Cursed Skull item ID: ${cursedSkullId}`);

    // Place the skull in the crypt room
    await db.run(`
      INSERT INTO room_items (room_id, item_id, quantity)
      VALUES (?, ?, ?)
    `, [cryptRoom.id, cursedSkullId, 1]);

    console.log(`📦 Placed Cursed Skull in Ancient Crypt Entrance`);

    // Create the event trigger service
    const eventTriggerService = new EventTriggerService(db);

    // Create immediate pickup trigger
    const triggerId = await eventTriggerService.createTrigger(
      'Cursed Skull\'s Immediate Haunting',
      'item',
      cursedSkullId,
      'pickup',
      {
        description: 'The cursed skull immediately affects anyone who touches it',
        priority: 1,
        maxExecutions: null // Can trigger multiple times
      }
    );

    // Add immediate negative effect
    await eventTriggerService.addTriggerEffect(
      triggerId,
      'apply_status',
      'self',
      {
        status_type: 'haunted',
        wisdom_penalty: -3,
        constitution_penalty: -2,
        fear: true,
        whispers: 'The dead whisper terrible secrets in your mind...'
      },
      {
        message: '💀👻 The moment you touch the Cursed Skull, icy fingers seem to grasp your soul! Ghostly whispers fill your mind and you feel your life force drain away. The skull\'s curse weakens your body and clouds your judgment!',
        durationSeconds: 180, // 3 minutes
        order: 0
      }
    );

    // Add a second immediate effect - damage
    await eventTriggerService.addTriggerEffect(
      triggerId,
      'damage',
      'self',
      { amount: 8 },
      {
        message: '💀⚡ The skull\'s dark energy tears at your very essence, causing immediate harm!',
        order: 1
      }
    );

    // Add atmospheric message
    await eventTriggerService.addTriggerEffect(
      triggerId,
      'message',
      'self',
      {},
      {
        message: '🌫️💀 The air grows thick with malevolent energy. You hear the faint sound of chains rattling in the distance...',
        order: 2
      }
    );

    console.log(`✨ Created immediate-effect trigger for Cursed Skull`);
    console.log(`🎮 Test it with: get cursed skull`);
    console.log(`⚡ Effects: -3 wisdom, -2 constitution, 8 damage, 3 minutes duration`);

  } catch (error) {
    console.error('❌ Error adding immediate crypt item:', error);
  } finally {
    await db.close();
  }
}

if (require.main === module) {
  addImmediateCryptItem();
}