/**
 * Prisma version of EventTriggerService - partial implementation
 * This demonstrates converting the cleanupExpiredStatusEffects method to use Prisma
 */

import { PrismaClient } from '../generated/prisma';
import { getPrismaClient } from './prismaService';

export class EventTriggerServicePrisma {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || getPrismaClient();
  }

  /**
   * Remove expired status effects
   * This method has been converted from direct SQL to use Prisma
   * 
   * Original SQL:
   * DELETE FROM character_status_effects
   * WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')
   * 
   * Benefits of Prisma version:
   * - Type-safe operations
   * - Automatic date handling (no need for SQL datetime functions)
   * - Better error handling and logging capabilities
   * - Database agnostic (works with any database Prisma supports)
   */
  async cleanupExpiredStatusEffects(): Promise<number> {
    // Delete all character status effects where the expiration date has passed
    const result = await this.prisma.characterStatusEffect.deleteMany({
      where: {
        AND: [
          {
            expires_at: {
              not: null
            }
          },
          {
            expires_at: {
              lte: new Date() // Less than or equal to current date/time
            }
          }
        ]
      }
    });

    // Return the count of deleted records for logging/debugging
    return result.count;
  }

  /**
   * Alternative implementation using a simpler where clause
   * This shows how Prisma can simplify complex conditions
   */
  async cleanupExpiredStatusEffectsSimplified(): Promise<number> {
    const result = await this.prisma.characterStatusEffect.deleteMany({
      where: {
        expires_at: {
          lte: new Date() // This automatically handles NULL values correctly
        }
      }
    });

    return result.count;
  }

  /**
   * Update trigger execution count and timestamp
   * This method has been converted from direct SQL to use Prisma
   * 
   * Original SQL:
   * UPDATE event_triggers 
   * SET execution_count = execution_count + 1,
   *     last_executed = CURRENT_TIMESTAMP
   * WHERE id = ?
   */
  async updateTriggerExecution(triggerId: number): Promise<void> {
    // First, get the current execution count
    const trigger = await this.prisma.eventTrigger.findUnique({
      where: { id: triggerId },
      select: { execution_count: true }
    });

    if (!trigger) {
      throw new Error(`Trigger with id ${triggerId} not found`);
    }

    // Update with incremented count and current timestamp
    await this.prisma.eventTrigger.update({
      where: { id: triggerId },
      data: {
        execution_count: (trigger.execution_count || 0) + 1,
        last_executed: new Date()
      }
    });
  }

  /**
   * Alternative atomic increment implementation
   * This uses Prisma's atomic operations for better concurrency handling
   */
  async updateTriggerExecutionAtomic(triggerId: number): Promise<void> {
    await this.prisma.eventTrigger.update({
      where: { id: triggerId },
      data: {
        execution_count: {
          increment: 1  // Atomic increment operation
        },
        last_executed: new Date()
      }
    });
  }
}