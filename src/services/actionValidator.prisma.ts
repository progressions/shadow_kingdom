/**
 * ActionValidator Service - Prisma Version
 * 
 * Validates whether actions can be performed based on game state, character conditions,
 * environmental factors, and item properties. Acts as a gatekeeper before actions execute.
 */

import { PrismaClient } from '../generated/prisma';
import { getPrismaClient } from './prismaService';
import { Character } from '../types/character';
import { 
  ValidationResult, 
  ActionContext, 
  ConditionType,
  ActionType,
  ActionCondition,
  RoomHostile,
  ItemCurse 
} from '../types/validation';
import { CharacterServicePrisma } from './characterService.prisma';

export class ActionValidatorPrisma {
  private prisma: PrismaClient;

  constructor(
    private characterService?: CharacterServicePrisma,
    prismaClient?: PrismaClient
  ) {
    this.prisma = prismaClient || getPrismaClient();
  }

  /**
   * Main validation method - checks if an action can be performed
   * @param action Action type to validate
   * @param character Character attempting the action
   * @param context Context information for validation
   * @returns ValidationResult indicating if action is allowed
   */
  async canPerformAction(
    action: string,
    character: Character,
    context: ActionContext
  ): Promise<ValidationResult> {
    try {
      // Phase 1: Check character death state first (fastest check)
      if (character.is_dead) {
        return {
          allowed: false,
          reason: 'Character is dead and cannot perform actions',
          priority: 'blocking'
        };
      }

      // Phase 2: Check for room-level restrictions
      const roomValidation = await this.validateRoomConditions(action, character, context);
      if (!roomValidation.allowed) {
        return roomValidation;
      }

      // Phase 3: Check character-specific restrictions (status effects, conditions)
      const characterValidation = await this.validateCharacterConditions(action, character, context);
      if (!characterValidation.allowed) {
        return characterValidation;
      }

      // Phase 4: Check item-specific restrictions (curses, requirements)
      if (context.itemId) {
        const itemValidation = await this.validateItemConditions(action, character, context);
        if (!itemValidation.allowed) {
          return itemValidation;
        }
      }

      // Phase 5: Check action-specific rules
      const actionValidation = await this.validateActionSpecificRules(action, character, context);
      if (!actionValidation.allowed) {
        return actionValidation;
      }

      // All checks passed
      return {
        allowed: true,
        reason: 'Action validated successfully',
        priority: 'none'
      };

    } catch (error) {
      console.error('ActionValidator error:', error);
      return {
        allowed: false,
        reason: 'Validation system error',
        priority: 'blocking'
      };
    }
  }

  /**
   * Validate room-level conditions (hostility, environmental effects)
   */
  private async validateRoomConditions(
    action: string,
    character: Character,
    context: ActionContext
  ): Promise<ValidationResult> {
    try {
      // Check for hostile characters blocking movement
      if (action === 'move' && context.roomId) {
        const hostileCharacters = await this.characterService?.getHostileCharacters(character.current_room_id || 0);
        if (hostileCharacters && hostileCharacters.length > 0) {
          return {
            allowed: false,
            reason: 'Hostile enemies prevent movement. Defeat them first or use combat actions.',
            priority: 'blocking',
            metadata: {
              hostileCount: hostileCharacters.length,
              hostileNames: hostileCharacters.map(h => h.name)
            }
          };
        }
      }

      // Check for cursed items preventing certain actions
      if (context.itemId) {
        const curse = await this.prisma.$queryRaw<ItemCurse[]>`
          SELECT * FROM item_curses 
          WHERE item_id = ${context.itemId} AND is_active = true
        `;
        
        if (curse.length > 0) {
          const blockedActions = curse.flatMap(c => c.blocked_actions ? c.blocked_actions.split(',') : []);
          if (blockedActions.includes(action)) {
            return {
              allowed: false,
              reason: `Item is cursed and prevents ${action} actions`,
              priority: 'blocking'
            };
          }
        }
      }

      return { allowed: true, reason: 'Room conditions satisfied', priority: 'none' };
    } catch (error) {
      console.error('Room validation error:', error);
      return { allowed: true, reason: 'Room validation skipped due to error', priority: 'none' };
    }
  }

  /**
   * Validate character-specific conditions (health, status effects)
   */
  private async validateCharacterConditions(
    action: string,
    character: Character,
    context: ActionContext
  ): Promise<ValidationResult> {
    try {
      // Health-based restrictions
      const healthPercentage = character.max_health ? 
        Math.round((character.current_health || 0) / character.max_health * 100) : 100;

      // Prevent strenuous actions when critically wounded
      if (healthPercentage < 10 && ['attack', 'move', 'run'].includes(action)) {
        return {
          allowed: false,
          reason: 'Character is too wounded to perform strenuous actions',
          priority: 'warning'
        };
      }

      // Check for action-specific conditions from database
      if (context.roomId || context.itemId) {
        const conditions = await this.getActionConditions(action, context);
        for (const condition of conditions) {
          const conditionMet = await this.evaluateCondition(condition, character, context);
          if (!conditionMet) {
            return {
              allowed: false,
              reason: condition.failure_message || `${condition.condition_type} requirement not met`,
              priority: condition.is_blocking ? 'blocking' : 'warning'
            };
          }
        }
      }

      return { allowed: true, reason: 'Character conditions satisfied', priority: 'none' };
    } catch (error) {
      console.error('Character validation error:', error);
      return { allowed: true, reason: 'Character validation skipped due to error', priority: 'none' };
    }
  }

  /**
   * Get action conditions from database
   */
  private async getActionConditions(action: string, context: ActionContext): Promise<ActionCondition[]> {
    try {
      return await this.prisma.$queryRaw<ActionCondition[]>`
        SELECT * FROM action_conditions 
        WHERE action_type = ${action} 
        AND (target_room_id IS NULL OR target_room_id = ${context.roomId || null})
        AND (target_item_id IS NULL OR target_item_id = ${context.itemId || null})
        AND is_active = true
      `;
    } catch (error) {
      console.error('Failed to fetch action conditions:', error);
      return [];
    }
  }

  /**
   * Evaluate a specific condition
   */
  private async evaluateCondition(
    condition: ActionCondition,
    character: Character,
    context: ActionContext
  ): Promise<boolean> {
    try {
      switch (condition.condition_type) {
        case ConditionType.MIN_HEALTH:
          const healthPercentage = character.max_health ? 
            Math.round((character.current_health || 0) / character.max_health * 100) : 100;
          return healthPercentage >= (condition.condition_value || 0);

        case ConditionType.HAS_ITEM:
          if (!context.characterId || !condition.condition_value) return false;
          const itemInRoom = await this.prisma.$queryRaw<any[]>`
            SELECT 1 FROM inventory_items 
            WHERE character_id = ${context.characterId} 
            AND item_id = ${condition.condition_value}
            LIMIT 1
          `;
          return itemInRoom.length > 0;

        case ConditionType.ATTRIBUTE_MIN:
          // Would need attribute checking logic here
          return true; // Placeholder

        case ConditionType.NOT_IN_COMBAT:
          // Check if character is currently in combat
          const hostileCount = await this.characterService?.hasHostileCharacters(character.current_room_id || 0);
          return !hostileCount;

        default:
          return true;
      }
    } catch (error) {
      console.error('Condition evaluation error:', error);
      return true; // Fail open for safety
    }
  }

  /**
   * Validate item-specific conditions
   */
  private async validateItemConditions(
    action: string,
    character: Character,
    context: ActionContext
  ): Promise<ValidationResult> {
    try {
      if (!context.itemId) return { allowed: true, reason: 'No item context', priority: 'none' };

      // Check if character actually has the item for actions that require possession
      if (['use', 'equip', 'drop'].includes(action) && context.characterId) {
        const characterItem = await this.prisma.$queryRaw<any[]>`
          SELECT 1 FROM inventory_items 
          WHERE character_id = ${context.characterId} 
          AND item_id = ${context.itemId}
          LIMIT 1
        `;
        
        if (characterItem.length === 0) {
          return {
            allowed: false,
            reason: 'Character does not possess this item',
            priority: 'blocking'
          };
        }
      }

      // Check if item can be picked up for pickup actions
      if (action === 'pickup' && context.roomId) {
        const characterItem = await this.prisma.$queryRaw<any[]>`
          SELECT 1 FROM room_items 
          WHERE room_id = ${context.roomId} 
          AND item_id = ${context.itemId}
          LIMIT 1
        `;
        
        if (characterItem.length === 0) {
          return {
            allowed: false,
            reason: 'Item is not available in this location',
            priority: 'blocking'
          };
        }
      }

      return { allowed: true, reason: 'Item conditions satisfied', priority: 'none' };
    } catch (error) {
      console.error('Item validation error:', error);
      return { allowed: true, reason: 'Item validation skipped due to error', priority: 'none' };
    }
  }

  /**
   * Validate action-specific rules
   */
  private async validateActionSpecificRules(
    action: string,
    character: Character,
    context: ActionContext
  ): Promise<ValidationResult> {
    // Most action-specific rules would be implemented here
    // For now, returning allowed for all actions
    return { allowed: true, reason: 'Action-specific rules satisfied', priority: 'none' };
  }

  /**
   * Quick check if character can move (used for optimization)
   */
  async canMove(character: Character): Promise<boolean> {
    const result = await this.canPerformAction('move', character, { 
      characterId: character.id,
      roomId: character.current_room_id 
    });
    return result.allowed;
  }

  /**
   * Quick check if character can attack (used for optimization)
   */
  async canAttack(character: Character, targetId?: number): Promise<boolean> {
    const result = await this.canPerformAction('attack', character, {
      characterId: character.id,
      roomId: character.current_room_id,
      targetId
    });
    return result.allowed;
  }
}