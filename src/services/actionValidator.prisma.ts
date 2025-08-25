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
      const deathCheck = this.checkDeathState(action, character);
      if (!deathCheck.allowed) {
        return deathCheck;
      }

      // Phase 2: Check for item curses if action involves an item
      if (context.itemId) {
        const curseCheck = await this.checkItemCurses(context.itemId, action);
        if (!curseCheck.allowed) {
          return curseCheck;
        }
      }

      // Phase 3: Check for action conditions based on context
      const conditionCheck = await this.checkActionConditions(action, context);
      if (!conditionCheck.allowed) {
        return conditionCheck;
      }

      // Future phases will add additional validation checks here:
      // - Phase 4: Hostile presence validation
      // - Phase 5: Generic condition system extensions

      // If we reach here, action is allowed
      return { allowed: true };

    } catch (error) {
      console.error('Error in action validation:', error);
      return {
        allowed: false,
        reason: 'An unexpected error occurred while validating the action.',
        hint: 'Please try again or contact support if the issue persists.'
      };
    }
  }

  /**
   * Phase 1: Check if character is dead and prevent most actions
   * @param action Action being attempted
   * @param character Character attempting action
   * @returns ValidationResult for death state
   */
  private checkDeathState(action: string, character: Character): ValidationResult {
    // Handle null/undefined character
    if (!character) {
      return {
        allowed: false,
        reason: "Character not found.",
        hint: "Please check your game session."
      };
    }

    // If character has is_dead field and it's true, block most actions
    if (character.is_dead) {
      // Allow certain actions even when dead (future: respawn, help, etc.)
      const allowedWhenDead = ['help', 'quit', 'save', 'load', 'respawn'];
      
      if (!allowedWhenDead.includes(action)) {
        return {
          allowed: false,
          reason: "You can't do that while dead!",
          hint: "You must wait for respawn or load a saved game."
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Phase 2: Check for hostiles blocking rest (placeholder for future implementation)
   */
  private async checkHostilesBlockingRest(roomId: number): Promise<ValidationResult> {
    // TODO: Implement in Phase 2
    // Query room_hostiles table for entities blocking rest
    return { allowed: true };
  }

  /**
   * Phase 2: Check for hostiles blocking movement (placeholder for future implementation)
   */
  private async checkMovementBlockers(
    character: Character,
    direction: string,
    context: ActionContext
  ): Promise<ValidationResult> {
    // TODO: Implement in Phase 2  
    // Query room_hostiles table for entities blocking specific directions
    return { allowed: true };
  }

  /**
   * Phase 2: Check for item curses preventing actions
   */
  private async checkItemCurses(
    itemId: number,
    action: string
  ): Promise<ValidationResult> {
    try {
      const curse = await this.prisma.itemCurse.findUnique({
        where: { itemId }
      });

      if (!curse) {
        return { allowed: true };
      }

      // Parse the prevented actions (stored as JSON array)
      const preventedActions = JSON.parse(curse.preventsActions);
      
      if (preventedActions.includes(action)) {
        return {
          allowed: false,
          reason: curse.curseMessage,
          hint: curse.removalCondition || 'This curse cannot be easily removed.',
          blocker: curse
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking item curses:', error);
      return { allowed: true }; // Fail open for robustness
    }
  }

  /**
   * Phase 3: Check for items blocking rest (placeholder for future implementation)
   */
  private async checkItemsBlockingRest(
    characterId: number,
    roomId: number
  ): Promise<ValidationResult> {
    // TODO: Implement in Phase 3
    // Check inventory for disturbing items that prevent rest
    return { allowed: true };
  }

  /**
   * Phase 3: Check for action conditions based on context
   */
  private async checkActionConditions(
    action: string,
    context: ActionContext
  ): Promise<ValidationResult> {
    try {
      // Get conditions that apply to this action and context
      const conditions = await this.getActionConditions(action, context);
      
      for (const condition of conditions) {
        const conditionResult = await this.evaluateCondition(condition, context);
        if (!conditionResult.allowed) {
          return conditionResult;
        }
      }
      
      return { allowed: true };
    } catch (error) {
      console.error('Error checking action conditions:', error);
      return { allowed: true }; // Fail open for robustness
    }
  }

  /**
   * Phase 3: Get generic action conditions
   */
  private async getActionConditions(
    action: string,
    context: ActionContext
  ): Promise<ActionCondition[]> {
    try {
      const conditions = await this.prisma.actionCondition.findMany({
        where: {
          actionType: action,
          OR: [
            {
              entityType: 'room',
              entityId: context.roomId
            },
            {
              entityType: 'global'
            }
          ]
        },
        orderBy: { priority: 'asc' }
      });

      // Convert Prisma model to ActionCondition interface
      return conditions.map(c => ({
        id: c.id,
        entity_type: c.entityType,
        entity_id: c.entityId,
        action_type: c.actionType,
        condition_type: c.conditionType,
        condition_data: c.conditionData || undefined,
        failure_message: c.failureMessage,
        hint_message: c.hintMessage || undefined,
        priority: c.priority,
        created_at: c.createdAt.toISOString()
      }));
    } catch (error) {
      console.error('Error getting action conditions:', error);
      return [];
    }
  }

  /**
   * Phase 3: Evaluate a single condition
   */
  private async evaluateCondition(
    condition: ActionCondition,
    context: ActionContext
  ): Promise<ValidationResult> {
    try {
      switch (condition.condition_type) {
        case 'item_in_room':
          return await this.evaluateItemInRoomCondition(condition, context);
        
        case 'item_required':
          return await this.evaluateItemRequiredCondition(condition, context);
        
        case 'item_forbidden':
          return await this.evaluateItemForbiddenCondition(condition, context);
        
        default:
          console.warn(`Unknown condition type: ${condition.condition_type}`);
          return { allowed: true }; // Unknown conditions don't block
      }
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return { allowed: true }; // Fail open for robustness
    }
  }

  /**
   * Evaluate item_in_room condition - check if specific item is present in room
   */
  private async evaluateItemInRoomCondition(
    condition: ActionCondition,
    context: ActionContext
  ): Promise<ValidationResult> {
    try {
      const conditionData = JSON.parse(condition.condition_data || '{}');
      const requiredItemId = conditionData.item_id;
      const required = conditionData.required !== false; // Default to true

      if (!requiredItemId) {
        return { allowed: true }; // Malformed condition
      }

      // Check if item is in the room
      const itemInRoom = await this.prisma.roomItem.findFirst({
        where: {
          roomId: context.roomId,
          itemId: requiredItemId
        }
      });

      const itemPresent = !!itemInRoom;

      if (required && !itemPresent) {
        return {
          allowed: false,
          reason: condition.failure_message,
          hint: condition.hint_message
        };
      }

      if (!required && itemPresent) {
        return {
          allowed: false,
          reason: condition.failure_message,
          hint: condition.hint_message
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error evaluating item_in_room condition:', error);
      return { allowed: true };
    }
  }

  /**
   * Evaluate item_required condition - check if character has specific item
   */
  private async evaluateItemRequiredCondition(
    condition: ActionCondition,
    context: ActionContext
  ): Promise<ValidationResult> {
    try {
      const conditionData = JSON.parse(condition.condition_data || '{}');
      const requiredItemId = conditionData.item_id;

      if (!requiredItemId) {
        return { allowed: true }; // Malformed condition
      }

      // Check if character has the item
      const characterItem = await this.prisma.characterInventory.findFirst({
        where: {
          characterId: context.characterId,
          itemId: requiredItemId
        }
      });

      if (!characterItem) {
        return {
          allowed: false,
          reason: condition.failure_message,
          hint: condition.hint_message
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error evaluating item_required condition:', error);
      return { allowed: true };
    }
  }

  /**
   * Evaluate item_forbidden condition - check if character doesn't have specific item
   */
  private async evaluateItemForbiddenCondition(
    condition: ActionCondition,
    context: ActionContext
  ): Promise<ValidationResult> {
    try {
      const conditionData = JSON.parse(condition.condition_data || '{}');
      const forbiddenItemId = conditionData.item_id;

      if (!forbiddenItemId) {
        return { allowed: true }; // Malformed condition
      }

      // Check if character has the forbidden item
      const characterItem = await this.prisma.characterInventory.findFirst({
        where: {
          characterId: context.characterId,
          itemId: forbiddenItemId
        }
      });

      if (characterItem) {
        return {
          allowed: false,
          reason: condition.failure_message,
          hint: condition.hint_message
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error evaluating item_forbidden condition:', error);
      return { allowed: true };
    }
  }

  /**
   * Utility method to build action context from current game state
   * This will be used by GameController to create context objects
   */
  static buildActionContext(
    roomId: number,
    characterId: number,
    options: {
      itemId?: number;
      direction?: string;
      targetId?: number;
      additionalData?: Record<string, any>;
    } = {}
  ): ActionContext {
    return {
      roomId,
      characterId,
      itemId: options.itemId,
      direction: options.direction,
      targetId: options.targetId,
      additionalData: options.additionalData
    };
  }

  /**
   * Utility method to create a standard "blocked" result
   */
  static createBlockedResult(
    reason: string,
    hint?: string,
    blocker?: any
  ): ValidationResult {
    return {
      allowed: false,
      reason,
      hint,
      blocker
    };
  }

  /**
   * Utility method to create a standard "allowed" result
   */
  static createAllowedResult(): ValidationResult {
    return { allowed: true };
  }
}