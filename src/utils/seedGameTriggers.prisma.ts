/**
 * Prisma version of seedGameTriggers utility - partial implementation
 * This demonstrates converting the item lookup queries to use Prisma
 */

import { PrismaClient } from '../generated/prisma';
import { getPrismaClient } from '../services/prismaService';

/**
 * Helper function to find an item by name using Prisma
 * This replaces the direct SQL query:
 * SELECT id FROM items WHERE name = ?
 * 
 * Benefits of Prisma version:
 * - Type-safe query with auto-completion
 * - Returns the full item object if needed
 * - Consistent error handling
 * - No SQL injection vulnerabilities
 */
export async function findItemByName(
  prisma: PrismaClient, 
  itemName: string
): Promise<{ id: number } | null> {
  const item = await prisma.item.findFirst({
    where: {
      name: itemName
    },
    select: {
      id: true
    }
  });

  return item;
}

/**
 * Alternative implementation that returns the full item
 * This shows how Prisma makes it easy to get more data if needed
 */
export async function findFullItemByName(
  prisma: PrismaClient,
  itemName: string
) {
  return await prisma.item.findFirst({
    where: {
      name: itemName
    }
  });
}

/**
 * Check if game triggers already exist
 * This replaces the direct SQL query:
 * SELECT COUNT(*) as count FROM event_triggers et
 * JOIN games g ON et.entity_id = g.id AND et.entity_type = 'game'
 * WHERE g.id = ?
 */
export async function checkExistingGameTriggers(
  prisma: PrismaClient,
  gameId: number
): Promise<number> {
  const count = await prisma.eventTrigger.count({
    where: {
      entity_type: 'game',
      entity_id: gameId
    }
  });

  return count;
}

/**
 * Example of how to use these functions in seedGameTriggers
 */
export async function seedGameTriggersPrismaExample(
  gameId: number,
  prismaClient?: PrismaClient
): Promise<void> {
  const prisma = prismaClient || getPrismaClient();

  try {
    // Check if triggers already exist for this game
    const existingTriggersCount = await checkExistingGameTriggers(prisma, gameId);
    
    if (existingTriggersCount > 0) {
      console.log(`⚠️  Game ${gameId} already has ${existingTriggersCount} triggers - skipping seed`);
      return;
    }

    console.log(`🎯 Seeding event triggers for game ${gameId}...`);

    // Example: Find Ancient Key item
    const ancientKey = await findItemByName(prisma, 'Ancient Key');
    if (ancientKey) {
      console.log(`Found Ancient Key with ID: ${ancientKey.id}`);
      // Create trigger for Ancient Key here...
    }

    // Example: Find Iron Sword item
    const ironSword = await findItemByName(prisma, 'Iron Sword');
    if (ironSword) {
      console.log(`Found Iron Sword with ID: ${ironSword.id}`);
      // Create trigger for Iron Sword here...
    }

    // Example: Find Health Potion item
    const healthPotion = await findItemByName(prisma, 'Health Potion');
    if (healthPotion) {
      console.log(`Found Health Potion with ID: ${healthPotion.id}`);
      // Create trigger for Health Potion here...
    }

    // Example with full item data
    const cursedRing = await findFullItemByName(prisma, 'Cursed Ruby Ring');
    if (cursedRing) {
      console.log(`Found ${cursedRing.name} (${cursedRing.type}) with ID: ${cursedRing.id}`);
      // Can access all item properties: cursedRing.description, cursedRing.value, etc.
    }

    console.log('✅ Game-specific event triggers seeded successfully');

  } catch (error) {
    console.error('Failed to seed game triggers:', error);
    throw error;
  }
}

/**
 * Create a trigger condition using Prisma
 * This replaces the direct SQL query:
 * INSERT INTO trigger_conditions (trigger_id, condition_type, condition_value)
 * VALUES (?, ?, ?)
 */
export async function createTriggerCondition(
  prisma: PrismaClient,
  triggerId: number,
  conditionType: string,
  conditionValue: string
): Promise<void> {
  await prisma.triggerCondition.create({
    data: {
      trigger_id: triggerId,
      condition_type: conditionType,
      condition_value: conditionValue,
      condition_order: 1, // You might want to calculate this based on existing conditions
      logic_operator: 'AND' // Default value, adjust as needed
    }
  });
}