/**
 * Seed Game-Specific Event Triggers
 * 
 * Creates event triggers for specific games and their items/rooms
 */

import Database from './database';
import { EventTriggerService } from '../services/eventTriggerService';
import { TUIInterface } from '../ui/TUIInterface';
import { MessageType } from '../ui/MessageFormatter';

interface GameTriggerOptions {
  gameId: number;
  entranceRoomId: number;
  libraryRoomId: number;
  gardenRoomId: number;
  towerStairsRoomId: number;
  cryptEntranceRoomId: number;
  observatoryStepsRoomId: number;
}

export async function seedGameTriggers(
  db: Database, 
  options: GameTriggerOptions,
  tui?: TUIInterface
): Promise<void> {
  const eventTriggerService = new EventTriggerService(db);

  try {
    // Check if triggers already exist for this game
    const existingTriggers = await db.get(`
      SELECT COUNT(*) as count 
      FROM event_triggers et
      JOIN items i ON et.entity_id = i.id
      WHERE et.entity_type = 'item'
        AND EXISTS (
          SELECT 1 FROM room_items ri 
          JOIN rooms r ON ri.room_id = r.id 
          WHERE ri.item_id = i.id AND r.game_id = ?
        )
    `, [options.gameId]);

    if (existingTriggers && existingTriggers.count > 0) {
      if (tui) {
        tui.display(`Game ${options.gameId} already has ${existingTriggers.count} triggers`, MessageType.SYSTEM);
      }
      return;
    }

    let triggersCreated = 0;

    // 1. Ancient Key Blessing - Found in Scholar's Library
    const ancientKey = await db.get('SELECT id FROM items WHERE name = ?', ['Ancient Key']);
    if (ancientKey) {
      const keyBlessingTriggerId = await eventTriggerService.createTrigger(
        'Ancient Key\'s Mystical Blessing',
        'item',
        ancientKey.id,
        'equip',
        {
          description: 'The Ancient Key grants mystical insight to those who wield it',
          priority: 1,
          maxExecutions: 1 // One-time blessing per game
        }
      );

      await eventTriggerService.addTriggerEffect(
        keyBlessingTriggerId,
        'apply_status',
        'self',
        { 
          status_type: 'ancient_wisdom',
          wisdom_bonus: 3,
          insight: true,
          knowledge: 'The key whispers secrets of the Shadow Kingdom'
        },
        {
          message: '🗝️✨ The Ancient Key pulses with mystical energy! You feel blessed with ancient wisdom that will guide you through the Shadow Kingdom\'s mysteries.',
          durationSeconds: 600, // 10 minutes
          order: 0
        }
      );
      triggersCreated++;
    }

    // 2. Iron Sword Empowerment - Found in Grand Entrance Hall
    const ironSword = await db.get('SELECT id FROM items WHERE name = ?', ['Iron Sword']);
    if (ironSword) {
      const swordPowerTriggerId = await eventTriggerService.createTrigger(
        'Iron Sword\'s Battle Fury',
        'item',
        ironSword.id,
        'equip',
        {
          description: 'The Iron Sword channels the warrior\'s spirit',
          priority: 1,
          cooldownSeconds: 60 // Can re-trigger after 1 minute if unequipped/re-equipped
        }
      );

      await eventTriggerService.addTriggerEffect(
        swordPowerTriggerId,
        'apply_status',
        'self',
        {
          status_type: 'battle_fury',
          strength_bonus: 4,
          combat_prowess: true
        },
        {
          message: '⚔️🔥 The Iron Sword fills you with incredible strength and battle fury! Your combat skills feel greatly enhanced.',
          durationSeconds: 300, // 5 minutes
          order: 0
        }
      );
      triggersCreated++;
    }

    // 3. Health Potion Contamination Risk - Found in Moonlit Courtyard Garden
    const healthPotion = await db.get('SELECT id FROM items WHERE name = ?', ['Health Potion']);
    if (healthPotion) {
      const poisonRiskTriggerId = await eventTriggerService.createTrigger(
        'Suspicious Health Potion',
        'item',
        healthPotion.id,
        'pickup',
        {
          description: 'This particular health potion seems to have been tampered with',
          priority: 1
        }
      );

      // Add 15% poison chance condition
      await db.run(`
        INSERT INTO trigger_conditions (trigger_id, condition_type, condition_value)
        VALUES (?, ?, ?)
      `, [poisonRiskTriggerId, 'random_chance', '{"probability": 0.15}']);

      await eventTriggerService.addTriggerEffect(
        poisonRiskTriggerId,
        'apply_status',
        'self',
        {
          status_type: 'mild_poisoning',
          damage_per_turn: 1,
          description: 'A mild but persistent poisoning from contaminated potion'
        },
        {
          message: '🤢💚 As you pick up the Health Potion, you notice it feels strangely warm and has an odd smell. You fear it may be contaminated!',
          durationSeconds: 180, // 3 minutes
          order: 0
        }
      );
      triggersCreated++;
    }

    // 4. Moonlit Garden Healing Spring - Room trigger for Moonlit Courtyard Garden
    const gardenHealingTriggerId = await eventTriggerService.createTrigger(
      'Moonlit Garden\'s Restorative Magic',
      'room',
      options.gardenRoomId,
      'enter',
      {
        description: 'The moonlit garden has natural healing properties',
        priority: 1,
        cooldownSeconds: 120 // Can only heal once per 2 minutes
      }
    );

    await eventTriggerService.addTriggerEffect(
      gardenHealingTriggerId,
      'heal',
      'self',
      { amount: 4 },
      {
        message: '🌙✨ The moonlight filtering through the garden carries healing magic! You feel refreshed and revitalized. (+4 health)',
        order: 0
      }
    );
    triggersCreated++;

    // 5. Bread Nourishment - Found in Moonlit Courtyard Garden
    const bread = await db.get('SELECT id FROM items WHERE name = ?', ['Bread']);
    if (bread) {
      const breadNourishmentTriggerId = await eventTriggerService.createTrigger(
        'Nourishing Garden Bread',
        'item',
        bread.id,
        'examine',
        {
          description: 'This bread was blessed by the garden\'s magic',
          priority: 1,
          cooldownSeconds: 45 // Can examine again after 45 seconds
        }
      );

      // 30% chance to provide nourishment
      await db.run(`
        INSERT INTO trigger_conditions (trigger_id, condition_type, condition_value)
        VALUES (?, ?, ?)
      `, [breadNourishmentTriggerId, 'random_chance', '{"probability": 0.3}']);

      await eventTriggerService.addTriggerEffect(
        breadNourishmentTriggerId,
        'heal',
        'self',
        { amount: 3 },
        {
          message: '🍞✨ As you examine the bread closely, you notice it glows faintly with the garden\'s magic. Taking a small bite restores some health! (+3 health)',
          order: 0
        }
      );
      triggersCreated++;
    }

    // 6. Wooden Staff Wisdom - Found in Winding Tower Stairs
    const woodenStaff = await db.get('SELECT id FROM items WHERE name = ?', ['Wooden Staff']);
    if (woodenStaff) {
      const staffWisdomTriggerId = await eventTriggerService.createTrigger(
        'Wooden Staff\'s Scholar\'s Focus',
        'item',
        woodenStaff.id,
        'equip',
        {
          description: 'The Wooden Staff enhances mental clarity and focus',
          priority: 1
        }
      );

      await eventTriggerService.addTriggerEffect(
        staffWisdomTriggerId,
        'apply_status',
        'self',
        {
          status_type: 'scholarly_focus',
          intelligence_bonus: 2,
          wisdom_bonus: 2,
          magical_affinity: true
        },
        {
          message: '🪄📚 The Wooden Staff tingles with scholarly energy, enhancing your mental faculties and magical understanding.',
          durationSeconds: 400, // ~6.5 minutes
          order: 0
        }
      );
      triggersCreated++;
    }

    // 7. Iron Helmet Burden - Found in Ancient Crypt Entrance
    const ironHelmet = await db.get('SELECT id FROM items WHERE name = ?', ['Iron Helmet']);
    if (ironHelmet) {
      const helmetBurdenTriggerId = await eventTriggerService.createTrigger(
        'Iron Helmet\'s Heavy Burden',
        'item',
        ironHelmet.id,
        'equip',
        {
          description: 'The heavy iron helmet affects your mobility',
          priority: 1
        }
      );

      await eventTriggerService.addTriggerEffect(
        helmetBurdenTriggerId,
        'apply_status',
        'self',
        {
          status_type: 'encumbered',
          dexterity_penalty: 2,
          description: 'Heavy armor reduces agility'
        },
        {
          message: '⛑️💪 The Iron Helmet feels incredibly heavy on your head, reducing your agility but providing excellent protection.',
          durationSeconds: 0, // Permanent while equipped
          order: 0
        }
      );
      triggersCreated++;
    }

    // 8. Ancient Crypt Entrance Dread - Room trigger
    const cryptDreadTriggerId = await eventTriggerService.createTrigger(
      'Crypt\'s Ominous Presence',
      'room',
      options.cryptEntranceRoomId,
      'enter',
      {
        description: 'The ancient crypt emanates an unsettling aura',
        priority: 1,
        maxExecutions: 1 // Only triggers once per character
      }
    );

    await eventTriggerService.addTriggerEffect(
      cryptDreadTriggerId,
      'apply_status',
      'self',
      {
        status_type: 'unnerved',
        wisdom_penalty: 1,
        description: 'The crypt\'s dark presence affects your peace of mind'
      },
      {
        message: '💀😰 As you enter the Ancient Crypt Entrance, you feel a chill run down your spine. The presence of ancient death lingers here, unsettling your mind.',
        durationSeconds: 240, // 4 minutes
        order: 0
      }
    );
    triggersCreated++;

    // 9. Cursed Ruby Ring - Found in Winding Tower Stairs
    const cursedRing = await db.get('SELECT id FROM items WHERE name = ?', ['Cursed Ruby Ring']);
    if (cursedRing) {
      const cursedRingTriggerId = await eventTriggerService.createTrigger(
        'Ruby Ring\'s Dark Curse',
        'item',
        cursedRing.id,
        'pickup',
        {
          description: 'The cursed ruby ring affects those who dare to touch it',
          priority: 1
        }
      );

      await eventTriggerService.addTriggerEffect(
        cursedRingTriggerId,
        'apply_status',
        'self',
        {
          status_type: 'cursed',
          all_stats_penalty: 1,
          description: 'The dark curse weakens your abilities'
        },
        {
          message: '💍💀 As you pick up the Cursed Ruby Ring, you feel a dark energy seep into your soul. Your abilities feel diminished by the malevolent curse!',
          durationSeconds: 300, // 5 minutes
          order: 0
        }
      );
      triggersCreated++;
    }

    // 10. Blessed Silver Amulet - Found in Grand Entrance Hall  
    const blessedAmulet = await db.get('SELECT id FROM items WHERE name = ?', ['Blessed Silver Amulet']);
    if (blessedAmulet) {
      const blessedAmuletTriggerId = await eventTriggerService.createTrigger(
        'Silver Amulet\'s Divine Protection',
        'item',
        blessedAmulet.id,
        'pickup',
        {
          description: 'The blessed amulet provides divine protection',
          priority: 1,
          maxExecutions: 1 // One-time blessing
        }
      );

      await eventTriggerService.addTriggerEffect(
        blessedAmuletTriggerId,
        'apply_status',
        'self',
        {
          status_type: 'divine_protection',
          wisdom_bonus: 2,
          constitution_bonus: 1,
          holy_resistance: true
        },
        {
          message: '🛡️✨ The Blessed Silver Amulet fills you with divine warmth! You feel protected by holy forces and your spirit is strengthened.',
          durationSeconds: 900, // 15 minutes
          order: 0
        }
      );
      triggersCreated++;
    }

    // 11. Mysterious Glowing Orb - Found in Moonlit Courtyard Garden
    const glowingOrb = await db.get('SELECT id FROM items WHERE name = ?', ['Mysterious Glowing Orb']);
    if (glowingOrb) {
      const glowingOrbTriggerId = await eventTriggerService.createTrigger(
        'Glowing Orb\'s Magical Surge',
        'item',
        glowingOrb.id,
        'examine',
        {
          description: 'The mysterious orb reacts to close inspection',
          priority: 1,
          cooldownSeconds: 180 // 3 minute cooldown
        }
      );

      // 50% chance for positive effect
      await db.run(`
        INSERT INTO trigger_conditions (trigger_id, condition_type, condition_value)
        VALUES (?, ?, ?)
      `, [glowingOrbTriggerId, 'random_chance', '{"probability": 0.5}']);

      await eventTriggerService.addTriggerEffect(
        glowingOrbTriggerId,
        'apply_status',
        'self',
        {
          status_type: 'magical_surge',
          intelligence_bonus: 3,
          magical_power: true
        },
        {
          message: '🔮⚡ The Mysterious Glowing Orb pulses with arcane energy as you examine it! Magical power courses through your mind, enhancing your intellect!',
          durationSeconds: 240, // 4 minutes
          order: 0
        }
      );
      triggersCreated++;
    }

    // 12. Poisoned Dagger - Found in Ancient Crypt Entrance
    const poisonedDagger = await db.get('SELECT id FROM items WHERE name = ?', ['Poisoned Dagger']);
    if (poisonedDagger) {
      const poisonedDaggerTriggerId = await eventTriggerService.createTrigger(
        'Poisoned Dagger\'s Toxic Touch',
        'item',
        poisonedDagger.id,
        'equip',
        {
          description: 'The poisoned blade affects its wielder',
          priority: 1
        }
      );

      await eventTriggerService.addTriggerEffect(
        poisonedDaggerTriggerId,
        'apply_status',
        'self',
        {
          status_type: 'poison_resistance',
          dexterity_bonus: 2,
          poison_immunity: 0.5,
          description: 'Exposure to the poison builds resistance but at a cost'
        },
        {
          message: '🗡️☠️ As you grip the Poisoned Dagger, you feel the toxins seeping into your skin. Strangely, this builds your resistance to poisons, though you feel slightly ill.',
          durationSeconds: 0, // Permanent while equipped
          order: 0
        }
      );

      // Also add a minor negative effect
      await eventTriggerService.addTriggerEffect(
        poisonedDaggerTriggerId,
        'apply_status',
        'self',
        {
          status_type: 'poison_exposure',
          constitution_penalty: 1
        },
        {
          message: '🤒 The constant exposure to poison slightly weakens your constitution.',
          durationSeconds: 0, // Permanent while equipped
          order: 1
        }
      );
      triggersCreated++;
    }

    // 13. Scholar's Spectacles - Found in Scholar's Library
    const spectacles = await db.get('SELECT id FROM items WHERE name = ?', ['Scholar\'s Spectacles']);
    if (spectacles) {
      const spectaclesTriggerId = await eventTriggerService.createTrigger(
        'Scholar\'s Enhanced Perception',
        'item',
        spectacles.id,
        'examine',
        {
          description: 'The spectacles reveal hidden knowledge when used for examination',
          priority: 1,
          cooldownSeconds: 60
        }
      );

      // 40% chance for insight
      await db.run(`
        INSERT INTO trigger_conditions (trigger_id, condition_type, condition_value)
        VALUES (?, ?, ?)
      `, [spectaclesTriggerId, 'random_chance', '{"probability": 0.4}']);

      await eventTriggerService.addTriggerEffect(
        spectaclesTriggerId,
        'message',
        'self',
        {},
        {
          message: '👓📚 As you examine the Scholar\'s Spectacles closely, you notice tiny inscriptions on the frames that reveal: "Knowledge is the key to unlocking the Shadow Kingdom\'s deepest secrets."',
          order: 0
        }
      );

      await eventTriggerService.addTriggerEffect(
        spectaclesTriggerId,
        'apply_status',
        'self',
        {
          status_type: 'scholarly_insight',
          intelligence_bonus: 1,
          wisdom_bonus: 1
        },
        {
          message: '🧠✨ The spectacles grant you temporary scholarly insight!',
          durationSeconds: 120, // 2 minutes
          order: 1
        }
      );
      triggersCreated++;
    }

    // 14. Global Mystical Awareness - Monitors all equipment changes
    const mysticalAwarenessTriggerId = await eventTriggerService.createTrigger(
      'Shadow Kingdom\'s Mystical Awareness',
      'global',
      null,
      'equip',
      {
        description: 'The Shadow Kingdom\'s mystical forces observe all equipment changes',
        priority: 10 // Low priority so it runs after specific item triggers
      }
    );

    await eventTriggerService.addTriggerEffect(
      mysticalAwarenessTriggerId,
      'message',
      'self',
      {},
      {
        message: '👁️🌟 The mystical forces of the Shadow Kingdom take note as you change your equipment. You sense you\'re being watched by ancient powers...',
        order: 0
      }
    );
    triggersCreated++;

    if (tui) {
      tui.display(`✨ Created ${triggersCreated} event triggers for Shadow Kingdom`, MessageType.SYSTEM);
      tui.display(`🎮 Players will now experience reactive, consequence-driven gameplay!`, MessageType.SYSTEM);
    }

    console.log(`✅ Game-specific event triggers seeded successfully for game ${options.gameId}`);
    console.log(`📊 Created ${triggersCreated} triggers with rich interactive effects`);

  } catch (error) {
    if (tui) {
      tui.display(`Error seeding game triggers: ${error}`, MessageType.ERROR);
    }
    console.error('Error seeding game-specific event triggers:', error);
    // Don't throw - trigger seeding is optional enhancement
  }
}