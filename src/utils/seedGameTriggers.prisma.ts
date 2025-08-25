/**
 * Seed Game-Specific Event Triggers
 * 
 * Creates event triggers for specific games and their items/rooms
 * 
 * Prisma version - uses Prisma ORM for database operations
 */

import { PrismaClient } from '../generated/prisma';
import { getPrismaClient } from '../services/prismaService';
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
  options: GameTriggerOptions,
  tui?: TUIInterface,
  prismaClient?: PrismaClient
): Promise<void> {
  const prisma = prismaClient || getPrismaClient();
  const eventTriggerService = new EventTriggerService(null, tui);

  try {
    // Check if triggers already exist for this game
    const existingTriggers = await prisma.eventTrigger.count({
      where: {
        entityType: 'item',
        effects: {
          some: {} // Has at least one effect
        }
      }
    });

    // Also check if there are triggers for items in this game
    const gameItemTriggers = await prisma.$queryRaw<{count: bigint}[]>`
      SELECT COUNT(*) as count 
      FROM event_triggers et
      JOIN items i ON et.entity_id = i.id
      WHERE et.entity_type = 'item'
        AND EXISTS (
          SELECT 1 FROM room_items ri 
          JOIN rooms r ON ri.room_id = r.id 
          WHERE ri.item_id = i.id AND r.game_id = ${options.gameId}
        )
    `;

    const triggerCount = Number(gameItemTriggers[0]?.count || 0);

    if (triggerCount > 0) {
      if (tui) {
        tui.display(`Game ${options.gameId} already has ${triggerCount} triggers`, MessageType.SYSTEM);
      }
      return;
    }

    let triggersCreated = 0;

    // 1. Ancient Key Blessing - Found in Scholar's Library
    const ancientKey = await prisma.item.findFirst({
      where: { name: 'Ancient Key' }
    });
    
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
    const ironSword = await prisma.item.findFirst({
      where: { name: 'Iron Sword' }
    });
    
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
    const healthPotion = await prisma.item.findFirst({
      where: { name: 'Health Potion' }
    });
    
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
      await prisma.triggerCondition.create({
        data: {
          triggerId: poisonRiskTriggerId,
          conditionType: 'random_chance',
          conditionValue: JSON.stringify({ probability: 0.15 }),
          conditionOrder: 0,
          logicOperator: 'AND'
        }
      });

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

    // 4. Leather Armor Protection Trigger - Found in Grand Entrance Hall
    const leatherArmor = await prisma.item.findFirst({
      where: { name: 'Leather Armor' }
    });
    
    if (leatherArmor) {
      const armorProtectionTriggerId = await eventTriggerService.createTrigger(
        'Leather Armor\'s Natural Shield',
        'item',
        leatherArmor.id,
        'equip',
        {
          description: 'The leather armor forms a protective barrier around you',
          priority: 1
        }
      );

      await eventTriggerService.addTriggerEffect(
        armorProtectionTriggerId,
        'apply_status',
        'self',
        {
          status_type: 'natural_protection',
          armor_bonus: 2,
          description: 'Protected by well-crafted leather'
        },
        {
          message: '🛡️ The Leather Armor molds perfectly to your form, providing a comforting sense of protection.',
          durationSeconds: undefined, // Permanent while equipped
          order: 0
        }
      );
      triggersCreated++;
    }

    // 5. Entrance Hall Welcome Effect - Healing on room entry
    const entranceHealingTriggerId = await eventTriggerService.createTrigger(
      'Grand Hall\'s Blessing',
      'room',
      options.entranceRoomId,
      'enter',
      {
        description: 'The grand entrance hall fills visitors with renewed vigor',
        priority: 2,
        cooldownSeconds: 300 // Once every 5 minutes
      }
    );

    await eventTriggerService.addTriggerEffect(
      entranceHealingTriggerId,
      'heal',
      'self',
      { amount: 2 },
      {
        message: '✨ The grandeur of the entrance hall fills you with renewed hope and vigor! (+2 health)',
        order: 0
      }
    );
    triggersCreated++;

    // 6. Library Knowledge Effect - Wisdom boost on entry
    const libraryWisdomTriggerId = await eventTriggerService.createTrigger(
      'Scholar\'s Inspiration',
      'room',
      options.libraryRoomId,
      'enter',
      {
        description: 'The ancient library inspires deep thought and wisdom',
        priority: 1,
        maxExecutions: 3 // Limited uses per game
      }
    );

    await eventTriggerService.addTriggerEffect(
      libraryWisdomTriggerId,
      'apply_status',
      'self',
      {
        status_type: 'scholarly_insight',
        wisdom_bonus: 1,
        intelligence_bonus: 1
      },
      {
        message: '📚 Surrounded by ancient knowledge, you feel your mind expanding with new insights!',
        durationSeconds: 600, // 10 minutes
        order: 0
      }
    );
    triggersCreated++;

    // Log success
    if (tui) {
      tui.display(`✅ Created ${triggersCreated} event triggers for game ${options.gameId}`, MessageType.SYSTEM);
    }

  } catch (error) {
    console.error('Error seeding game triggers:', error);
    if (tui) {
      tui.display(`⚠️ Error creating event triggers: ${error}`, MessageType.ERROR);
    }
  }
}