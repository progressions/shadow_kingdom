/**
 * ItemGenerationService - Prisma Version
 * 
 * Handles the creation of items from AI-generated room descriptions.
 * Processes item specifications from room generation and creates them in the database.
 */

import { PrismaClient } from '../generated/prisma';
import { getPrismaClient } from './prismaService';
import { ItemServicePrisma } from './itemService.prisma';
import { ItemType } from '../types/item';

export interface GeneratedItem {
  name: string;
  description: string;
  isFixed: boolean;
}

export interface ItemGenerationConfig {
  enabled: boolean;
  minItems: number;
  maxItems: number;
}

export class ItemGenerationServicePrisma {
  private prisma: PrismaClient;
  private config: ItemGenerationConfig;

  constructor(
    private itemService: ItemServicePrisma,
    prismaClient?: PrismaClient
  ) {
    this.prisma = prismaClient || getPrismaClient();
    this.config = {
      enabled: process.env.AI_ITEM_GENERATION_ENABLED !== 'false',
      minItems: parseInt(process.env.MIN_ITEMS_PER_ROOM || '1'),
      maxItems: parseInt(process.env.MAX_ITEMS_PER_ROOM || '3')
    };
  }

  /**
   * Create items from room generation output
   * @param roomId The room to place items in
   * @param generatedItems Array of items from AI generation
   * @returns Array of created item IDs
   */
  async createItemsFromGeneration(roomId: number, generatedItems: GeneratedItem[]): Promise<number[]> {
    if (!this.config.enabled) {
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log('🚫 Item generation disabled by configuration');
      }
      return [];
    }

    const createdItemIds: number[] = [];

    try {
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log(`🎲 Processing ${generatedItems.length} generated items for room ${roomId}`);
      }

      for (const item of generatedItems) {
        try {
          // Create the item in the database
          const itemId = await this.itemService.createItem({
            name: item.name,
            description: item.description,
            type: this.determineItemType(item.name),
            weight: this.calculateWeight(item.name),
            value: this.calculateValue(item.name),
            stackable: false, // Generated items are typically unique
            max_stack: 1,
            weapon_damage: null,
            armor_rating: null,
            equipment_slot: null,
            is_fixed: item.isFixed
          });

          if (process.env.AI_DEBUG_LOGGING === 'true') {
            console.log(`✅ Created item: ${item.name} (ID: ${itemId})`);
          }

          // Place the item in the room
          await this.itemService.createRoomItem({
            room_id: roomId,
            item_id: itemId,
            quantity: 1
          });

          createdItemIds.push(itemId);

        } catch (error) {
          if (process.env.AI_DEBUG_LOGGING === 'true') {
            console.error(`❌ Failed to create item ${item.name}:`, error);
          }
        }
      }

      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.log(`🎲 Successfully created ${createdItemIds.length}/${generatedItems.length} items`);
      }

    } catch (error) {
      if (process.env.AI_DEBUG_LOGGING === 'true') {
        console.error('❌ Item generation failed:', error);
      }
    }

    return createdItemIds;
  }

  /**
   * Determine item type based on name keywords
   */
  private determineItemType(name: string): ItemType {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('potion') || lowerName.includes('elixir') || lowerName.includes('brew')) {
      return ItemType.CONSUMABLE;
    }
    
    if (lowerName.includes('sword') || lowerName.includes('blade') || lowerName.includes('dagger') || 
        lowerName.includes('axe') || lowerName.includes('hammer') || lowerName.includes('mace') ||
        lowerName.includes('bow') || lowerName.includes('staff') || lowerName.includes('wand')) {
      return ItemType.WEAPON;
    }
    
    if (lowerName.includes('armor') || lowerName.includes('shield') || lowerName.includes('helm') ||
        lowerName.includes('boots') || lowerName.includes('gloves') || lowerName.includes('robe')) {
      return ItemType.ARMOR;
    }
    
    if (lowerName.includes('book') || lowerName.includes('scroll') || lowerName.includes('tome') ||
        lowerName.includes('manuscript') || lowerName.includes('journal')) {
      return ItemType.CONSUMABLE; // Books can be "consumed" for knowledge
    }
    
    return ItemType.MISC;
  }

  /**
   * Calculate weight based on item name
   */
  private calculateWeight(name: string): number {
    const lowerName = name.toLowerCase();
    
    // Heavy items
    if (lowerName.includes('armor') || lowerName.includes('anvil') || lowerName.includes('boulder')) {
      return 15 + Math.floor(Math.random() * 10); // 15-24 lbs
    }
    
    // Medium items
    if (lowerName.includes('sword') || lowerName.includes('shield') || lowerName.includes('hammer')) {
      return 5 + Math.floor(Math.random() * 5); // 5-9 lbs
    }
    
    // Light items
    if (lowerName.includes('potion') || lowerName.includes('gem') || lowerName.includes('ring') ||
        lowerName.includes('amulet') || lowerName.includes('scroll')) {
      return 1 + Math.floor(Math.random() * 2); // 1-2 lbs
    }
    
    // Default weight for misc items
    return 2 + Math.floor(Math.random() * 3); // 2-4 lbs
  }

  /**
   * Calculate value based on item name and type
   */
  private calculateValue(name: string): number {
    const lowerName = name.toLowerCase();
    
    // Precious items
    if (lowerName.includes('gold') || lowerName.includes('diamond') || lowerName.includes('ruby') ||
        lowerName.includes('emerald') || lowerName.includes('crystal')) {
      return 100 + Math.floor(Math.random() * 400); // 100-499 gold
    }
    
    // Magical items
    if (lowerName.includes('magic') || lowerName.includes('enchanted') || lowerName.includes('mystical') ||
        lowerName.includes('ancient') || lowerName.includes('blessed')) {
      return 50 + Math.floor(Math.random() * 150); // 50-199 gold
    }
    
    // Weapons and armor
    if (lowerName.includes('sword') || lowerName.includes('armor') || lowerName.includes('shield')) {
      return 25 + Math.floor(Math.random() * 75); // 25-99 gold
    }
    
    // Common items
    return 1 + Math.floor(Math.random() * 24); // 1-24 gold
  }
}