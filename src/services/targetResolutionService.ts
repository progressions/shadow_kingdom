/**
 * Target Resolution Service
 * 
 * Centralized service for resolving command targets with support for "all" keywords,
 * partial name matching, article stripping, and context-aware entity filtering.
 */

import { 
  TargetContext, 
  ResolvedTarget, 
  GameContext, 
  TargetResolutionResult,
  TargetResolutionOptions,
  EntityType,
  EntityLocation,
  TargetMetadata,
  GameEntity,
  TargetResolutionError,
  TargetResolutionException
} from '../types/targetResolution';
import { ItemService } from './itemService';
import { CharacterService } from './characterService';
import { GameStateManager } from './gameStateManager';
import { stripArticles } from '../utils/articleParser';
import { CharacterType, Character } from '../types/character';
import { RoomItem, InventoryItem } from '../types/item';
import Database from '../utils/database';

export class TargetResolutionService {
  constructor(
    private db: Database,
    private itemService: ItemService,
    private characterService: CharacterService,
    private gameStateManager: GameStateManager
  ) {}

  /**
   * Main resolution method - handles both single targets and "all"
   * @param targetInput Raw target input from user (e.g., "sword", "all", "rusty blade")
   * @param context The context defining what types of entities to look for
   * @param gameContext Current game state context
   * @param options Optional resolution configuration
   * @returns Array of resolved targets
   */
  async resolveTargets(
    targetInput: string,
    context: TargetContext,
    gameContext: GameContext,
    options: TargetResolutionOptions = {}
  ): Promise<ResolvedTarget[]> {
    if (!targetInput || !targetInput.trim()) {
      return [];
    }

    const cleanInput = targetInput.trim().toLowerCase();
    
    // Handle "all" keyword
    if (cleanInput === 'all') {
      return await this.resolveAllTargets(context, gameContext, options);
    }

    // Handle single target resolution
    const target = await this.resolveSingleTarget(cleanInput, context, gameContext, options);
    return target ? [target] : [];
  }

  /**
   * Resolve "all" targets based on context
   * @param context The target context to resolve all entities for
   * @param gameContext Current game state
   * @param options Resolution options
   * @returns Array of all valid targets in the given context
   */
  private async resolveAllTargets(
    context: TargetContext,
    gameContext: GameContext,
    options: TargetResolutionOptions = {}
  ): Promise<ResolvedTarget[]> {
    const entities = await this.getEntitiesForContext(context, gameContext);
    const resolvedTargets: ResolvedTarget[] = [];

    for (const entity of entities) {
      const resolvedTarget = this.entityToResolvedTarget(entity, context, gameContext);
      
      // Apply filtering based on metadata and options
      if (this.shouldIncludeTarget(resolvedTarget, options)) {
        resolvedTargets.push(resolvedTarget);
      }
    }

    return resolvedTargets;
  }

  /**
   * Resolve single target with partial matching and article stripping
   * @param targetName Clean target name to search for
   * @param context The target context to search within
   * @param gameContext Current game state
   * @param options Resolution options
   * @returns Single resolved target or null if not found
   */
  private async resolveSingleTarget(
    targetName: string,
    context: TargetContext,
    gameContext: GameContext,
    options: TargetResolutionOptions = {}
  ): Promise<ResolvedTarget | null> {
    const cleanTargetName = stripArticles(targetName);
    const entities = await this.getEntitiesForContext(context, gameContext);

    // Try exact match first
    for (const entity of entities) {
      const entityName = this.getEntityName(entity).toLowerCase();
      if (entityName === cleanTargetName) {
        const resolved = this.entityToResolvedTarget(entity, context, gameContext);
        if (this.shouldIncludeTarget(resolved, options)) {
          return resolved;
        }
      }
    }

    // Try partial match
    for (const entity of entities) {
      const entityName = this.getEntityName(entity).toLowerCase();
      if (entityName.includes(cleanTargetName)) {
        const resolved = this.entityToResolvedTarget(entity, context, gameContext);
        if (this.shouldIncludeTarget(resolved, options)) {
          return resolved;
        }
      }
    }

    return null;
  }

  /**
   * Get all entities for a given context
   * @param context The target context
   * @param gameContext Current game state
   * @returns Array of entities available in the context
   */
  private async getEntitiesForContext(
    context: TargetContext,
    gameContext: GameContext
  ): Promise<GameEntity[]> {
    switch (context) {
      case TargetContext.ROOM_ITEMS:
        if (!gameContext.currentRoom) {
          return [];
        }
        return await this.itemService.getRoomItems(gameContext.currentRoom.id);

      case TargetContext.INVENTORY_ITEMS:
        return await this.itemService.getCharacterInventory(gameContext.characterId);

      case TargetContext.ROOM_CHARACTERS:
        if (!gameContext.currentRoom) {
          return [];
        }
        return await this.characterService.getRoomCharacters(
          gameContext.currentRoom.id, 
          CharacterType.NPC
        );

      case TargetContext.ANY_ENTITY:
        // Get all possible entities (items, characters, exits)
        if (!gameContext.currentRoom) {
          // Only return inventory items if no room context
          return await this.itemService.getCharacterInventory(gameContext.characterId);
        }
        
        const [roomItems, inventoryItems, characters] = await Promise.all([
          this.itemService.getRoomItems(gameContext.currentRoom.id),
          this.itemService.getCharacterInventory(gameContext.characterId),
          this.characterService.getRoomCharacters(gameContext.currentRoom.id, CharacterType.NPC)
        ]);
        
        return [...roomItems, ...inventoryItems, ...characters];

      case TargetContext.MIXED_CONTEXT:
        // Mixed context is handled by calling multiple resolution calls
        throw new TargetResolutionException(
          TargetResolutionError.INVALID_CONTEXT,
          'Mixed context requires separate resolution calls'
        );

      default:
        throw new TargetResolutionException(
          TargetResolutionError.INVALID_CONTEXT,
          `Unknown target context: ${context}`
        );
    }
  }

  /**
   * Convert a game entity to a resolved target with metadata
   * @param entity The game entity
   * @param context The resolution context
   * @param gameContext Current game state
   * @returns Resolved target with metadata
   */
  private entityToResolvedTarget(
    entity: GameEntity,
    context: TargetContext,
    gameContext: GameContext
  ): ResolvedTarget {
    // Handle different entity types
    if (this.isRoomItem(entity)) {
      return {
        id: `item_${entity.id}`,
        name: entity.item.name,
        type: EntityType.ITEM,
        entity: entity,
        location: EntityLocation.ROOM,
        metadata: {
          canPickup: !entity.item.is_fixed,
          canExamine: true,
          isFixed: entity.item.is_fixed,
          isBlocked: false // TODO: Implement hostile character blocking logic
        }
      };
    }

    if (this.isInventoryItem(entity)) {
      return {
        id: `inventory_${entity.id}`,
        name: entity.item.name,
        type: EntityType.ITEM,
        entity: entity,
        location: EntityLocation.INVENTORY,
        metadata: {
          canDrop: true,
          canGive: true,
          canExamine: true,
          isEquipped: entity.equipped || false
        }
      };
    }

    if (this.isCharacter(entity)) {
      return {
        id: `character_${entity.id}`,
        name: entity.name,
        type: EntityType.CHARACTER,
        entity: entity,
        location: EntityLocation.ROOM,
        metadata: {
          canExamine: true,
          isHostile: entity.sentiment === 'hostile' || entity.sentiment === 'aggressive'
        }
      };
    }

    // Default handling for unknown entity types
    return {
      id: `unknown_${Math.random()}`,
      name: this.getEntityName(entity),
      type: EntityType.FEATURE,
      entity: entity,
      location: EntityLocation.ROOM,
      metadata: {
        canExamine: true
      }
    };
  }

  /**
   * Check if a target should be included based on filtering options
   * @param target The resolved target
   * @param options Filtering options
   * @returns True if target should be included
   */
  private shouldIncludeTarget(
    target: ResolvedTarget,
    options: TargetResolutionOptions
  ): boolean {
    const metadata = target.metadata || {};

    // Filter fixed items unless specifically included
    if (metadata.isFixed && !options.includeFixed) {
      return false;
    }

    // Filter hostile-blocked items unless specifically included
    if (metadata.isBlocked && !options.includeHostileBlocked) {
      return false;
    }

    // Filter equipped items unless specifically included
    if (metadata.isEquipped && !options.includeEquipped) {
      return false;
    }

    return true;
  }

  /**
   * Get the display name for any entity type
   * @param entity The game entity
   * @returns Display name string
   */
  private getEntityName(entity: GameEntity): string {
    if (this.isRoomItem(entity) || this.isInventoryItem(entity)) {
      return entity.item.name;
    }
    
    if (this.isCharacter(entity)) {
      return entity.name;
    }

    if (entity.name) {
      return entity.name;
    }

    return 'Unknown';
  }

  /**
   * Type guard for room items
   */
  private isRoomItem(entity: any): entity is RoomItem {
    return entity && entity.item && entity.room_id !== undefined && entity.item_id !== undefined;
  }

  /**
   * Type guard for inventory items  
   */
  private isInventoryItem(entity: any): entity is InventoryItem {
    return entity && entity.item && entity.character_id !== undefined && entity.item_id !== undefined;
  }

  /**
   * Type guard for characters
   */
  private isCharacter(entity: any): entity is Character {
    return entity && entity.name && (entity.type === 'npc' || entity.type === 'player');
  }

  /**
   * Resolve character target by name (used for "give all to X" commands)
   * @param characterName Name or partial name of character
   * @param gameContext Current game state
   * @returns Resolved character target or null
   */
  async resolveCharacterTarget(
    characterName: string,
    gameContext: GameContext
  ): Promise<ResolvedTarget | null> {
    return await this.resolveSingleTarget(
      characterName,
      TargetContext.ROOM_CHARACTERS,
      gameContext
    );
  }
}