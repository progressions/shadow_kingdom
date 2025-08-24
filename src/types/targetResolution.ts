/**
 * Target Resolution Types
 * 
 * Defines interfaces and enums for the centralized target disambiguation system
 * that handles all command target resolution with "all" support.
 */

import { Connection } from './database';
import { RoomItem, InventoryItem, Item } from './item';
import { Character } from './character';

/**
 * Context types that define what kind of entities a command can target
 */
export enum TargetContext {
  ROOM_ITEMS = 'room_items',           // Items available for pickup in current room
  INVENTORY_ITEMS = 'inventory_items', // Items in player's inventory for dropping/giving
  ROOM_CHARACTERS = 'room_characters', // NPCs and characters for interaction
  ANY_ENTITY = 'any_entity',          // Flexible context for examine, attack, etc.
  MIXED_CONTEXT = 'mixed_context'      // For commands like "give all to X"
}

/**
 * Types of entities that can be targeted
 */
export enum EntityType {
  ITEM = 'item',
  CHARACTER = 'character', 
  EXIT = 'exit',
  FEATURE = 'feature'
}

/**
 * Where an entity is located in the game world
 */
export enum EntityLocation {
  ROOM = 'room',
  INVENTORY = 'inventory',
  EQUIPPED = 'equipped'
}

/**
 * Additional metadata about a target for validation and filtering
 */
export interface TargetMetadata {
  canPickup?: boolean;
  canDrop?: boolean;
  canGive?: boolean;
  canExamine?: boolean;
  isFixed?: boolean;
  isHostile?: boolean;
  isEquipped?: boolean;
  isBlocked?: boolean;  // Blocked by hostile characters or other conditions
}

/**
 * A resolved target entity with all necessary information for command execution
 */
export interface ResolvedTarget {
  id: string;                    // Unique entity identifier
  name: string;                  // Display name for user feedback
  type: EntityType;              // Type classification
  entity: GameEntity;            // The actual game object
  location: EntityLocation;      // Where the entity is located
  metadata?: TargetMetadata;     // Additional context information
}

/**
 * Union type of all possible game entities that can be targeted
 */
export type GameEntity = RoomItem | InventoryItem | Character | Connection | any;

/**
 * Enhanced command definition that includes target context information
 */
export interface EnhancedCommand {
  name: string;
  description: string;
  targetContext: TargetContext;
  supportsAll: boolean;
  requiresTarget: boolean;
  maxTargets?: number;
  handler: (targets: ResolvedTarget[], context: any) => Promise<void>;
}

/**
 * Result of target resolution operation
 */
export interface TargetResolutionResult {
  targets: ResolvedTarget[];
  wasAllRequested: boolean;
  totalAvailable: number;
  filtered: number;  // Number of targets filtered out (fixed items, etc.)
}

/**
 * Game context needed for target resolution
 * Extended from the NLP GameContext with additional required fields
 */
export interface GameContext {
  currentRoom?: {
    id: number;
    name: string;
    description: string;
    availableExits: string[];
    thematicExits?: Array<{direction: string; name: string}>;
  };
  gameId?: number;
  recentCommands?: string[];
  // Additional fields required for target resolution
  characterId: number;
  sessionId: string;
}

/**
 * Configuration for target resolution behavior
 */
export interface TargetResolutionOptions {
  includeFixed?: boolean;       // Include fixed items in resolution
  includeHostileBlocked?: boolean; // Include items blocked by hostile characters
  includeEquipped?: boolean;    // Include equipped items in inventory context
  maxResults?: number;          // Maximum number of targets to return
  exactMatchOnly?: boolean;     // Only allow exact name matches
}

/**
 * Error types that can occur during target resolution
 */
export enum TargetResolutionError {
  NO_TARGETS_FOUND = 'no_targets_found',
  INVALID_CONTEXT = 'invalid_context', 
  TOO_MANY_TARGETS = 'too_many_targets',
  CONTEXT_EMPTY = 'context_empty',
  INVALID_ALL_REQUEST = 'invalid_all_request'
}

/**
 * Exception thrown when target resolution fails
 */
export class TargetResolutionException extends Error {
  constructor(
    public errorType: TargetResolutionError,
    message: string,
    public context?: any
  ) {
    super(message);
    this.name = 'TargetResolutionException';
  }
}