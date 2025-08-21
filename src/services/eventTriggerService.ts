/**
 * EventTriggerService
 * 
 * Manages event-driven triggers that execute effects based on player actions,
 * item interactions, and game state changes. Provides reactive gameplay mechanics
 * where actions have dynamic consequences beyond their immediate effects.
 */

import Database from '../utils/database';
import { Character } from '../types/character';

export interface TriggerContext {
  character: Character;
  room?: Room;
  item?: Item;
  targetEntity?: any;
  eventData?: Record<string, any>;
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
  private activeTriggers = new Set<number>(); // Prevent infinite loops

  constructor(private db: Database) {}

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

    const triggers = await this.db.all<EventTrigger>(query, params);

    // Also get global triggers that match the event type
    const globalTriggers = await this.db.all<EventTrigger>(`
      SELECT * FROM event_triggers 
      WHERE event_type = ? AND entity_type = 'global' AND enabled = TRUE
      ORDER BY priority ASC, id ASC
    `, [eventType]);

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
    const effects = await this.db.all<TriggerEffect>(`
      SELECT * FROM trigger_effects 
      WHERE trigger_id = ? 
      ORDER BY effect_order ASC, id ASC
    `, [trigger.id]);

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
      console.log(`[TRIGGER] ${effect.message}`);
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

    await this.db.run(`
      INSERT INTO character_status_effects 
      (character_id, status_type, source_trigger_id, effect_data, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `, [
      characterId,
      statusType,
      sourceTrigger,
      JSON.stringify(effectData),
      expiresAt
    ]);

    console.log(`[TRIGGER] Applied status effect: ${statusType} to character ${characterId}`);
  }

  /**
   * Update trigger execution count and timestamp
   */
  private async updateTriggerExecution(triggerId: number): Promise<void> {
    await this.db.run(`
      UPDATE event_triggers 
      SET execution_count = execution_count + 1,
          last_executed = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [triggerId]);
  }

  /**
   * Log trigger execution to history
   */
  private async logTriggerExecution(
    trigger: EventTrigger,
    context: TriggerContext,
    appliedEffects: string[]
  ): Promise<void> {
    await this.db.run(`
      INSERT INTO trigger_history 
      (trigger_id, character_id, room_id, event_type, event_data, effects_applied)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      trigger.id,
      context.character.id,
      context.room?.id || null,
      trigger.event_type,
      JSON.stringify({
        entityType: trigger.entity_type,
        entityId: trigger.entity_id,
        itemId: context.item?.id,
        eventData: context.eventData
      }),
      JSON.stringify(appliedEffects)
    ]);
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
    const result = await this.db.run(`
      INSERT INTO event_triggers 
      (name, description, entity_type, entity_id, event_type, priority, enabled, max_executions, cooldown_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name,
      options.description || null,
      entityType,
      entityId,
      eventType,
      options.priority || 0,
      options.enabled !== false,
      options.maxExecutions || null,
      options.cooldownSeconds || null
    ]);

    return result.lastID!;
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
    const result = await this.db.run(`
      INSERT INTO trigger_effects 
      (trigger_id, effect_order, effect_type, target_type, target_specifier, effect_data, delay_seconds, duration_seconds, message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      triggerId,
      options.order || 0,
      effectType,
      targetType,
      options.targetSpecifier || null,
      JSON.stringify(effectData),
      options.delaySeconds || 0,
      options.durationSeconds || null,
      options.message || null
    ]);

    return result.lastID!;
  }

  /**
   * Get active status effects for a character
   */
  async getActiveStatusEffects(characterId: number): Promise<CharacterStatusEffect[]> {
    return await this.db.all<CharacterStatusEffect>(`
      SELECT * FROM character_status_effects
      WHERE character_id = ?
        AND (expires_at IS NULL OR expires_at > datetime('now'))
      ORDER BY created_at DESC
    `, [characterId]);
  }

  /**
   * Remove expired status effects
   */
  async cleanupExpiredStatusEffects(): Promise<void> {
    await this.db.run(`
      DELETE FROM character_status_effects
      WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')
    `);
  }

  /**
   * Get trigger execution history
   */
  async getTriggerHistory(limit: number = 50): Promise<TriggerHistory[]> {
    return await this.db.all<TriggerHistory>(`
      SELECT h.*, t.name as trigger_name
      FROM trigger_history h
      JOIN event_triggers t ON h.trigger_id = t.id
      ORDER BY h.execution_time DESC
      LIMIT ?
    `, [limit]);
  }
}