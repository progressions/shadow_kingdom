/**
 * Validation system types for Shadow Kingdom
 * Defines interfaces for action validation, conditions, and results
 */

/**
 * Result of an action validation check
 */
export interface ValidationResult {
  allowed: boolean;
  reason?: string;
  hint?: string;
  blocker?: any;  // The entity blocking the action (hostile, curse, etc.)
}

/**
 * Context information for action validation
 */
export interface ActionContext {
  roomId: number;
  characterId: number;
  itemId?: number;
  direction?: string;
  targetId?: number;
  additionalData?: Record<string, any>;
}

/**
 * Types of conditions that can block actions
 */
export enum ConditionType {
  // Presence checks
  HOSTILE_PRESENT = 'hostile_present',      // Enemies in room
  ITEM_IN_ROOM = 'item_in_room',           // Specific item in room
  NPC_PRESENT = 'npc_present',             // NPC in room
  
  // Inventory checks
  ITEM_REQUIRED = 'item_required',         // Must have item
  ITEM_FORBIDDEN = 'item_forbidden',       // Can't have item
  ITEM_EQUIPPED = 'item_equipped',         // Must have equipped
  
  // State checks
  CHARACTER_STATE = 'character_state',     // is_dead, is_poisoned, etc.
  ATTRIBUTE_CHECK = 'attribute_check',     // STR > 15, etc.
  HEALTH_CHECK = 'health_check',          // HP above/below threshold
  
  // Environmental
  ROOM_PROPERTY = 'room_property',        // Dark, underwater, etc.
  TIME_BASED = 'time_based',              // Cooldowns, day/night
  
  // Story/Quest
  QUEST_STATE = 'quest_state',            // Quest completion required
  FLAG_CHECK = 'flag_check'               // Generic game flags
}

/**
 * Types of actions that can be validated
 */
export enum ActionType {
  MOVE = 'move',
  REST = 'rest',
  PICKUP = 'pickup',
  DROP = 'drop',
  USE = 'use',
  EQUIP = 'equip',
  UNEQUIP = 'unequip',
  EXAMINE = 'examine',
  ATTACK = 'attack',
  CAST = 'cast',
  TALK = 'talk'
}

/**
 * Database record for action conditions
 */
export interface ActionCondition {
  id: number;
  entity_type: string;
  entity_id: number;
  action_type: string;
  condition_type: string;
  condition_data?: string;  // JSON data
  failure_message: string;
  hint_message?: string;
  priority: number;
  created_at: string;
}

/**
 * Database record for room hostiles
 */
export interface RoomHostile {
  id: number;
  room_id: number;
  character_id: number;
  blocks_rest: boolean;
  blocks_movement?: string;  // JSON array of directions
  threat_level: number;
  threat_message?: string;
  created_at: string;
}

/**
 * Database record for item curses
 */
export interface ItemCurse {
  id: number;
  item_id: number;
  curse_type: string;
  prevents_actions: string;  // JSON array of action types
  curse_message: string;
  removal_condition?: string;
  created_at: string;
}