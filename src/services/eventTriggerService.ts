/**
 * EventTriggerService
 * 
 * Manages event-driven triggers that execute effects based on player actions,
 * item interactions, and game state changes. Provides reactive gameplay mechanics
 * where actions have dynamic consequences beyond their immediate effects.
 */

import { PrismaService } from './prismaService';
import { Character } from '../types/character';
import { TUIInterface } from '../ui/TUIInterface';
import { MessageType } from '../ui/MessageFormatter';

export interface TriggerContext {
  character: Character;
  room?: Room;
  item?: Item;
  targetEntity?: any;
  eventData?: Record<string, any>;
  actionId?: string; // For deduplication across multiple processTrigger calls
}

export interface EventTrigger {
  id: number;
  name: string;
  description?: string;
  entity_type: string;
  entity_id?: number;
  event_type: string;
  priority: number;
  enabled: boolean;
  max_executions?: number;
  execution_count: number;
  cooldown_seconds?: number;
  last_executed?: string;
  created_at: string;
}

export interface TriggerCondition {
  id: number;
  trigger_id: number;
  condition_order: number;
  condition_type: string;
  comparison_operator?: string;
  condition_value: string;
  logic_operator: string;
  created_at: string;
}

export interface TriggerEffect {
  id: number;
  trigger_id: number;
  effect_order: number;
  effect_type: string;
  target_type: string;
  target_specifier?: string;
  effect_data: string;
  delay_seconds: number;
  duration_seconds?: number;
  message?: string;
  created_at: string;
}

export interface TriggerHistory {
  id: number;
  trigger_id: number;
  character_id?: number;
  room_id?: number;
  event_type: string;
  event_data?: string;
  effects_applied?: string;
  execution_time: string;
}

export interface CharacterStatusEffect {
  id: number;
  character_id: number;
  status_type: string;
  source_trigger_id?: number;
  effect_data?: string;
  expires_at?: string;
  created_at: string;
}

// Basic types for context - these should match existing types
interface Room {
  id: number;
  name: string;
  description: string;
  game_id: number;
  region_id?: number;
  region_distance?: number;
}

interface Item {
  id: number;
  name: string;
  description: string;
  type: string;
  weight: number;
  value: number;
  stackable: boolean;
  max_stack: number;
  is_fixed?: boolean;
}

export class EventTriggerService {
  private prisma: any; // PrismaClient instance
  private activeTriggers = new Set<number>(); // Prevent infinite loops
  private actionExecutedTriggers = new Map<string, Set<number>>(); // Track triggers per action

  constructor(db: any, private tui?: TUIInterface) {
    // db parameter kept for backward compatibility but not used
    this.prisma = PrismaService.getInstance().getClient();
  }

  /**
   * Main trigger processing method
   * Finds and executes all applicable triggers for a given event
   */
  async processTrigger(
    eventType: string,
    entityType: string,
    entityId: number | null,
    context: TriggerContext
  ): Promise<void> {
    try {
      // Find applicable triggers
      const triggers = await this.findApplicableTriggers(
        eventType,
        entityType,
        entityId
      );

      // Process each trigger in priority order
      for (const trigger of triggers) {
        // Prevent infinite loops
        if (this.activeTriggers.has(trigger.id)) {
          console.log(`Preventing infinite loop for trigger ${trigger.id}: ${trigger.name}`);
          continue;
        }

        // Prevent duplicate execution within the same action
        if (context.actionId) {
          if (!this.actionExecutedTriggers.has(context.actionId)) {
            this.actionExecutedTriggers.set(context.actionId, new Set());
          }
          
          const executedForAction = this.actionExecutedTriggers.get(context.actionId)!;
          if (executedForAction.has(trigger.id)) {
            console.log(`Skipping duplicate trigger ${trigger.id}: ${trigger.name} for action ${context.actionId}`);
            continue;
          }
          
          // Mark as executed for this action
          executedForAction.add(trigger.id);
          
          // Clean up old action tracking (keep only last 10 actions)
          if (this.actionExecutedTriggers.size > 10) {
            const oldestAction = this.actionExecutedTriggers.keys().next().value;
            if (oldestAction) {
              this.actionExecutedTriggers.delete(oldestAction);
            }
          }
        }

        // Check execution limits
        if (!this.canExecuteTrigger(trigger)) {
          continue;
        }

        // Execute trigger
        this.activeTriggers.add(trigger.id);
        try {
          await this.executeTrigger(trigger, context);
        } finally {
          this.activeTriggers.delete(trigger.id);
        }
      }
    } catch (error) {
      console.error('Error processing triggers:', error);
      // Don't throw - gameplay should continue even if triggers fail
    }
  }

  /**
   * Find triggers that match the event criteria
   */
  private async findApplicableTriggers(
    eventType: string,
    entityType: string,
    entityId: number | null
  ): Promise<EventTrigger[]> {
    // Query for entity-specific triggers
    let query = `
      SELECT * FROM event_triggers 
      WHERE event_type = ? AND entity_type = ? AND enabled = TRUE
    `;
    let params: any[] = [eventType, entityType];

    if (entityId !== null) {
      query += ' AND entity_id = ?';
      params.push(entityId);
    } else {
      query += ' AND entity_id IS NULL';
    }

    query += ' ORDER BY priority ASC, id ASC';

    // Use Prisma instead of raw SQL
    const triggers = await this.prisma.eventTrigger.findMany({
      where: {
        eventType,
        entityType,
        entityId: entityId,
        enabled: true
      },
      orderBy: [
        { priority: 'asc' },
        { id: 'asc' }
      ]
    }) as any[];

    // Also get global triggers that match the event type
    const globalTriggers = await this.prisma.eventTrigger.findMany({
      where: {
        eventType,
        entityType: 'global',
        enabled: true
      },
      orderBy: [
        { priority: 'asc' },
        { id: 'asc' }
      ]
    }) as any[];

    // Combine and sort by priority
    const allTriggers = [...triggers, ...globalTriggers];
    return allTriggers.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.id - b.id;
    });
  }

  /**
   * Check if trigger can execute (cooldown, max executions)
   */
  private canExecuteTrigger(trigger: EventTrigger): boolean {
    // Check max executions
    if (trigger.max_executions && trigger.execution_count >= trigger.max_executions) {
      return false;
    }

    // Check cooldown
    if (trigger.cooldown_seconds && trigger.last_executed) {
      const lastExec = new Date(trigger.last_executed).getTime();
      const now = Date.now();
      const cooldownMs = trigger.cooldown_seconds * 1000;
      
      if (now - lastExec < cooldownMs) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute a single trigger (basic version without conditions for Phase 1)
   */
  private async executeTrigger(trigger: EventTrigger, context: TriggerContext): Promise<void> {
    console.log(`Executing trigger: ${trigger.name} (ID: ${trigger.id})`);

    // Get effects for this trigger
    const effects = await this.prisma.triggerEffect.findMany({
      where: { triggerId: trigger.id },
      orderBy: [
        { effectOrder: 'asc' },
        { id: 'asc' }
      ]
    });

    const appliedEffects: string[] = [];

    // Execute each effect
    for (const effect of effects) {
      try {
        await this.executeEffect(effect, context);
        appliedEffects.push(`${effect.effect_type}: ${effect.effect_data}`);
      } catch (error) {
        console.error(`Error executing effect ${effect.id}:`, error);
        appliedEffects.push(`FAILED ${effect.effect_type}: ${(error as Error).message}`);
      }
    }

    // Update execution count and timestamp
    await this.updateTriggerExecution(trigger.id);

    // Log execution history
    await this.logTriggerExecution(trigger, context, appliedEffects);
  }

  /**
   * Execute a single effect (basic implementation for Phase 1)
   */
  private async executeEffect(effect: TriggerEffect, context: TriggerContext): Promise<void> {
    // Display message if provided
    if (effect.message) {
      if (this.tui) {
        this.tui.display(effect.message, MessageType.NORMAL);
      } else {
        // Fallback for debugging - should not happen in normal gameplay
        console.log(`[TRIGGER] ${effect.message}`);
      }
    }

    // Parse effect data
    let effectData: any = {};
    try {
      effectData = JSON.parse(effect.effect_data);
    } catch (error) {
      console.error('Invalid JSON in effect_data:', effect.effect_data);
      return;
    }

    // Basic effect implementations (will be expanded in later phases)
    switch (effect.effect_type) {
      case 'message':
        // Already displayed above
        break;

      case 'heal':
        if (effectData.amount && typeof effectData.amount === 'number') {
          console.log(`[TRIGGER] Healed ${effectData.amount} health points`);
          // TODO: Integrate with health system when available
        }
        break;

      case 'damage':
        if (effectData.amount && typeof effectData.amount === 'number') {
          console.log(`[TRIGGER] Took ${effectData.amount} damage`);
          // TODO: Integrate with health system when available
        }
        break;

      case 'apply_status':
        if (effectData.status_type) {
          await this.applyStatusEffect(
            context.character.id,
            effectData.status_type,
            effect.trigger_id,
            effectData,
            effect.duration_seconds
          );
        }
        break;

      default:
        console.log(`[TRIGGER] Unknown effect type: ${effect.effect_type}`);
        break;
    }
  }

  /**
   * Apply a status effect to a character
   */
  private async applyStatusEffect(
    characterId: number,
    statusType: string,
    sourceTrigger: number,
    effectData: any,
    durationSeconds?: number
  ): Promise<void> {
    const expiresAt = durationSeconds 
      ? new Date(Date.now() + durationSeconds * 1000).toISOString()
      : null;

    await this.prisma.characterStatusEffect.create({
      data: {
        characterId,
        statusType,
        sourceTriggerId: sourceTrigger,
        effectData: JSON.stringify(effectData),
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });

    console.log(`[TRIGGER] Applied status effect: ${statusType} to character ${characterId}`);
  }

  /**
   * Update trigger execution count and timestamp
   */
  private async updateTriggerExecution(triggerId: number): Promise<void> {
    await this.prisma.eventTrigger.update({
      where: { id: triggerId },
      data: {
        executionCount: { increment: 1 },
        lastExecuted: new Date()
      }
    });
  }

  /**
   * Log trigger execution to history
   */
  private async logTriggerExecution(
    trigger: EventTrigger,
    context: TriggerContext,
    appliedEffects: string[]
  ): Promise<void> {
    await this.prisma.triggerHistory.create({
      data: {
        triggerId: trigger.id,
        characterId: context.character.id,
        roomId: context.room?.id || null,
        eventType: trigger.event_type,
        eventData: JSON.stringify({
          entityType: trigger.entity_type,
          entityId: trigger.entity_id,
          itemId: context.item?.id,
          eventData: context.eventData
        }),
        effectsApplied: JSON.stringify(appliedEffects)
      }
    });
  }

  /**
   * Create a new trigger (utility method for testing and setup)
   */
  async createTrigger(
    name: string,
    entityType: string,
    entityId: number | null,
    eventType: string,
    options: {
      description?: string;
      priority?: number;
      enabled?: boolean;
      maxExecutions?: number;
      cooldownSeconds?: number;
    } = {}
  ): Promise<number> {
    const result = await this.prisma.eventTrigger.create({
      data: {
        name,
        description: options.description || null,
        entityType,
        entityId,
        eventType,
        priority: options.priority || 0,
        enabled: options.enabled !== false,
        maxExecutions: options.maxExecutions || null,
        cooldownSeconds: options.cooldownSeconds || null
      }
    });

    return result.id;
  }

  /**
   * Add an effect to a trigger
   */
  async addTriggerEffect(
    triggerId: number,
    effectType: string,
    targetType: string,
    effectData: any,
    options: {
      order?: number;
      targetSpecifier?: string;
      delaySeconds?: number;
      durationSeconds?: number;
      message?: string;
    } = {}
  ): Promise<number> {
    const result = await this.prisma.triggerEffect.create({
      data: {
        triggerId,
        effectOrder: options.order || 0,
        effectType,
        targetType,
        targetSpecifier: options.targetSpecifier || null,
        effectData: JSON.stringify(effectData),
        delaySeconds: options.delaySeconds || 0,
        durationSeconds: options.durationSeconds || null,
        message: options.message || null
      }
    });

    return result.id;
  }

  /**
   * Get active status effects for a character
   */
  async getActiveStatusEffects(characterId: number): Promise<CharacterStatusEffect[]> {
    const now = new Date();
    return await this.prisma.characterStatusEffect.findMany({
      where: {
        characterId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    }) as CharacterStatusEffect[];
  }

  /**
   * Remove expired status effects
   */
  async cleanupExpiredStatusEffects(): Promise<void> {
    const now = new Date();
    await this.prisma.characterStatusEffect.deleteMany({
      where: {
        expiresAt: {
          not: null,
          lte: now
        }
      }
    });
  }

  /**
   * Get trigger execution history
   */
  async getTriggerHistory(limit: number = 50): Promise<TriggerHistory[]> {
    const history = await this.prisma.triggerHistory.findMany({
      take: limit,
      orderBy: { executionTime: 'desc' },
      include: {
        trigger: {
          select: { name: true }
        }
      }
    });
    
    // Map to match expected format
    return history.map((h: any) => ({
      ...h,
      trigger_name: h.trigger?.name
    })) as TriggerHistory[];
  }
}