/**
 * Seed Event Triggers
 * 
 * Creates example triggers to demonstrate the Event Trigger System functionality
 */

import Database from './database';
import { EventTriggerService } from '../services/eventTriggerService';

export async function seedEventTriggers(db: Database): Promise<void> {
  const eventTriggerService = new EventTriggerService(db);

  try {
    // Check if triggers already exist to avoid duplicates
    const existingTriggers = await db.get('SELECT COUNT(*) as count FROM event_triggers');
    if (existingTriggers && existingTriggers.count > 0) {
      return; // Triggers already seeded
    }

    // 1. Healing Spring Trigger - Entering certain rooms heals the player
    const healingTriggerId = await eventTriggerService.createTrigger(
      'Healing Spring',
      'room',
      null, // Will apply to any room - in real implementation you'd specify specific room IDs
      'enter',
      {
        description: 'Magical springs that heal visitors',
        priority: 1
      }
    );

    await eventTriggerService.addTriggerEffect(
      healingTriggerId,
      'heal',
      'self',
      { amount: 3 },
      {
        message: '✨ The magical spring waters restore some of your vitality! (+3 health)',
        order: 0
      }
    );

    // 2. Ancient Key Blessing - Equipping the Ancient Key grants wisdom
    const ancientKeyId = await db.get('SELECT id FROM items WHERE name = ?', ['Ancient Key']);
    if (ancientKeyId) {
      const keyBlessingTriggerId = await eventTriggerService.createTrigger(
        'Ancient Key Blessing',
        'item',
        ancientKeyId.id,
        'equip',
        {
          description: 'The Ancient Key grants insight to its wielder',
          priority: 1,
          maxExecutions: 1 // Only triggers once per game
        }
      );

      await eventTriggerService.addTriggerEffect(
        keyBlessingTriggerId,
        'apply_status',
        'self',
        { 
          status_type: 'blessed',
          wisdom_bonus: 2,
          insight: true
        },
        {
          message: '🗝️ The Ancient Key pulses with mystical energy, blessing you with ancient wisdom!',
          durationSeconds: 300, // 5 minutes
          order: 0
        }
      );
    }

    // 3. Iron Sword Power - Equipping Iron Sword increases strength temporarily
    const ironSwordId = await db.get('SELECT id FROM items WHERE name = ?', ['Iron Sword']);
    if (ironSwordId) {
      const swordPowerTriggerId = await eventTriggerService.createTrigger(
        'Iron Sword Empowerment',
        'item',
        ironSwordId.id,
        'equip',
        {
          description: 'The Iron Sword channels inner strength',
          priority: 1
        }
      );

      await eventTriggerService.addTriggerEffect(
        swordPowerTriggerId,
        'apply_status',
        'self',
        {
          status_type: 'strengthened',
          strength_bonus: 3
        },
        {
          message: '⚔️ The Iron Sword fills you with incredible strength!',
          durationSeconds: 180, // 3 minutes
          order: 0
        }
      );
    }

    // 4. Health Potion Poison Risk - 10% chance of poison when picking up health potions
    const healthPotionId = await db.get('SELECT id FROM items WHERE name = ?', ['Health Potion']);
    if (healthPotionId) {
      const poisonTrapTriggerId = await eventTriggerService.createTrigger(
        'Contaminated Potion',
        'item',
        healthPotionId.id,
        'pickup',
        {
          description: 'Some health potions may be contaminated',
          priority: 1
        }
      );

      // Add condition for 10% chance
      await db.run(`
        INSERT INTO trigger_conditions (trigger_id, condition_type, condition_value)
        VALUES (?, ?, ?)
      `, [poisonTrapTriggerId, 'random_chance', '{"probability": 0.1}']);

      await eventTriggerService.addTriggerEffect(
        poisonTrapTriggerId,
        'apply_status',
        'self',
        {
          status_type: 'poisoned',
          damage_per_turn: 1
        },
        {
          message: '🤢 The potion feels strangely warm... you think it might be contaminated!',
          durationSeconds: 120, // 2 minutes
          order: 0
        }
      );
    }

    // 5. Global Equipment Watcher - Logs all equipment actions
    const equipWatcherId = await eventTriggerService.createTrigger(
      'Equipment Activity Monitor',
      'global',
      null,
      'equip',
      {
        description: 'Mystical forces observe all equipment changes',
        priority: 10 // Lower priority so it runs after other triggers
      }
    );

    await eventTriggerService.addTriggerEffect(
      equipWatcherId,
      'message',
      'self',
      {},
      {
        message: '👁️ Ancient watchers take note of your equipment changes...',
        order: 0
      }
    );

    // 6. Bread Blessing - Eating bread (examining it closely) sometimes provides temporary health boost
    const breadId = await db.get('SELECT id FROM items WHERE name = ?', ['Bread']);
    if (breadId) {
      const breadBlessingTriggerId = await eventTriggerService.createTrigger(
        'Nourishing Bread',
        'item',
        breadId.id,
        'examine',
        {
          description: 'Examining bread closely sometimes reveals its nourishing properties',
          priority: 1,
          cooldownSeconds: 30 // Can only trigger once per 30 seconds
        }
      );

      // 25% chance condition
      await db.run(`
        INSERT INTO trigger_conditions (trigger_id, condition_type, condition_value)
        VALUES (?, ?, ?)
      `, [breadBlessingTriggerId, 'random_chance', '{"probability": 0.25}']);

      await eventTriggerService.addTriggerEffect(
        breadBlessingTriggerId,
        'heal',
        'self',
        { amount: 2 },
        {
          message: '🍞 The bread looks particularly nourishing! You take a small bite and feel refreshed. (+2 health)',
          order: 0
        }
      );
    }

    console.log('✅ Event triggers seeded successfully');
    
    // Log what was created
    const triggerCount = await db.get('SELECT COUNT(*) as count FROM event_triggers');
    const effectCount = await db.get('SELECT COUNT(*) as count FROM trigger_effects');
    const conditionCount = await db.get('SELECT COUNT(*) as count FROM trigger_conditions');
    
    console.log(`📊 Created ${triggerCount.count} triggers, ${effectCount.count} effects, and ${conditionCount.count} conditions`);

  } catch (error) {
    console.error('Error seeding event triggers:', error);
    // Don't throw - trigger seeding is optional
  }
}