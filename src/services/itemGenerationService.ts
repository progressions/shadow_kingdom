/**
 * ItemGenerationService
 * 
 * Handles the creation of items from AI-generated room descriptions.
 * Processes item specifications from room generation and creates them in the database.
 */

import Database from '../utils/database';
import { ItemService } from './itemService';
import { ItemType } from '../types/item';

export interface GeneratedItem {
  name: string;
  description: string;
  extended_description?: string;
  isFixed: boolean;
}

export interface ItemGenerationConfig {
  enabled: boolean;
  minItems: number;
  maxItems: number;
}

export class ItemGenerationService {
  private config: ItemGenerationConfig;

  constructor(
    private db: Database,
    private itemService: ItemService
  ) {
    this.config = {
      enabled: process.env.AI_ITEM_GENERATION_ENABLED !== 'false',
      minItems: parseInt(process.env.MIN_ITEMS_PER_ROOM || '1'),
      maxItems: parseInt(process.env.MAX_ITEMS_PER_ROOM || '3')
    };
  }

  /**
   * Create items from room generation output
   * @param roomId The room to place items in
   * @param items The items specified by AI during room generation
   */
  async createItemsFromRoomGeneration(
    roomId: number,
    items?: GeneratedItem[]
  ): Promise<void> {
    if (process.env.AI_DEBUG_LOGGING === 'true') {
      console.log(`🎁 ItemGenerationService called for room ${roomId} with ${items?.length || 0} items`);
    }

    // Skip if item generation is disabled
    if (!this.config.enabled) {
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log('⚠️ Item generation is disabled');
      }
      return;
    }

    // Skip if no items provided
    if (!items || items.length === 0) {
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log('⚠️ No items provided to generate');
      }
      return;
    }

    // Limit items to max configured
    const itemsToCreate = items.slice(0, this.config.maxItems);

    for (const item of itemsToCreate) {
      try {
        await this.createAndPlaceItem(roomId, item);
      } catch (error) {
        // Log but don't fail room generation if item creation fails
        if (process.env.AI_DEBUG_LOGGING === 'true') {
          console.error(`Failed to create item "${item.name}":`, error);
        }
      }
    }
  }

  /**
   * Create a single item and place it in a room
   */
  private async createAndPlaceItem(
    roomId: number,
    item: GeneratedItem
  ): Promise<void> {
    // Validate item data
    if (!item.name || !item.description) {
      throw new Error('Invalid item data: missing name or description');
    }

    // Create the item in database
    const itemId = await this.itemService.createItem({
      name: item.name,
      description: item.description,
      extended_description: item.extended_description,
      type: ItemType.MISC,
      weight: item.isFixed ? 999.0 : 0.5,  // Fixed items are "heavy"
      value: 0,  // No value for generated atmospheric items
      stackable: false,
      max_stack: 1,
      is_fixed: item.isFixed
    });

    // Place the item in the room
    await this.itemService.placeItemInRoom(roomId, itemId, 1);

    if (process.env.AI_DEBUG_LOGGING === 'true') {
      const itemType = item.isFixed ? '🏛️ Fixed' : '💎 Portable';
      console.log(`${itemType} item created: ${item.name}`);
    }
  }

  /**
   * Check if item generation is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get current configuration
   */
  getConfig(): ItemGenerationConfig {
    return { ...this.config };
  }
}