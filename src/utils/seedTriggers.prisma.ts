/**
 * Prisma version of seedTriggers utility - partial implementation
 * This demonstrates converting the COUNT queries to use Prisma
 */

import { PrismaClient } from '../generated/prisma';
import { getPrismaClient } from '../services/prismaService';

/**
 * Get count of all event triggers
 * This replaces the direct SQL query:
 * SELECT COUNT(*) as count FROM event_triggers
 * 
 * Benefits:
 * - Simpler syntax - no need to access .count property
 * - Type-safe return value (always returns a number)
 * - Can easily add filters if needed
 */
export async function getTriggersCount(prisma: PrismaClient): Promise<number> {
  return await prisma.eventTrigger.count();
}

/**
 * Get count of all trigger effects
 * This replaces the direct SQL query:
 * SELECT COUNT(*) as count FROM trigger_effects
 */
export async function getEffectsCount(prisma: PrismaClient): Promise<number> {
  return await prisma.triggerEffect.count();
}

/**
 * Get count of all trigger conditions
 * This replaces the direct SQL query:
 * SELECT COUNT(*) as count FROM trigger_conditions
 */
export async function getConditionsCount(prisma: PrismaClient): Promise<number> {
  return await prisma.triggerCondition.count();
}

/**
 * Check if any triggers exist
 * This replaces the direct SQL query:
 * SELECT COUNT(*) as count FROM event_triggers
 * 
 * Shows how Prisma can return a boolean directly
 */
export async function hasExistingTriggers(prisma: PrismaClient): Promise<boolean> {
  const count = await prisma.eventTrigger.count();
  return count > 0;
}

/**
 * Get comprehensive trigger statistics
 * This shows how Prisma makes it easy to get multiple counts efficiently
 */
export async function getTriggerStatistics(prisma: PrismaClient): Promise<{
  triggers: number;
  effects: number;
  conditions: number;
  totalEntities: number;
}> {
  // Parallel execution of count queries for better performance
  const [triggers, effects, conditions] = await Promise.all([
    prisma.eventTrigger.count(),
    prisma.triggerEffect.count(),
    prisma.triggerCondition.count()
  ]);

  return {
    triggers,
    effects,
    conditions,
    totalEntities: triggers + effects + conditions
  };
}

/**
 * Get detailed trigger statistics with filtering
 * Shows advanced Prisma counting capabilities
 */
export async function getDetailedTriggerStats(prisma: PrismaClient): Promise<{
  totalTriggers: number;
  enabledTriggers: number;
  disabledTriggers: number;
  itemTriggers: number;
  roomTriggers: number;
  characterTriggers: number;
}> {
  // Parallel execution with different filters
  const [
    totalTriggers,
    enabledTriggers,
    disabledTriggers,
    itemTriggers,
    roomTriggers,
    characterTriggers
  ] = await Promise.all([
    prisma.eventTrigger.count(),
    prisma.eventTrigger.count({ where: { enabled: true } }),
    prisma.eventTrigger.count({ where: { enabled: false } }),
    prisma.eventTrigger.count({ where: { entity_type: 'item' } }),
    prisma.eventTrigger.count({ where: { entity_type: 'room' } }),
    prisma.eventTrigger.count({ where: { entity_type: 'character' } })
  ]);

  return {
    totalTriggers,
    enabledTriggers,
    disabledTriggers,
    itemTriggers,
    roomTriggers,
    characterTriggers
  };
}

/**
 * Example usage in seedTriggers function
 */
export async function logSeedingResultsPrisma(prismaClient?: PrismaClient): Promise<void> {
  const prisma = prismaClient || getPrismaClient();
  
  try {
    // Check if triggers already exist
    if (await hasExistingTriggers(prisma)) {
      console.log('⚠️  Triggers already exist - skipping seed');
      return;
    }

    // ... seed triggers here ...

    // Log what was created using the new Prisma functions
    const stats = await getTriggerStatistics(prisma);
    
    console.log(
      `📊 Created ${stats.triggers} triggers, ${stats.effects} effects, and ${stats.conditions} conditions`
    );

    // Optional: Get more detailed statistics
    const detailedStats = await getDetailedTriggerStats(prisma);
    console.log('📈 Detailed Statistics:', {
      enabled: `${detailedStats.enabledTriggers}/${detailedStats.totalTriggers}`,
      byType: {
        items: detailedStats.itemTriggers,
        rooms: detailedStats.roomTriggers,
        characters: detailedStats.characterTriggers
      }
    });
    
  } catch (error) {
    console.error('Failed to log seeding results:', error);
    throw error;
  }
}