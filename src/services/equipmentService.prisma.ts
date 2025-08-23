/**
 * EquipmentService for Shadow Kingdom - Prisma Version
 * 
 * This service handles equipment operations including equipping and unequipping items
 * in the 4-slot equipment system (HAND, HEAD, BODY, FOOT).
 */

import { PrismaClient } from '../generated/prisma';
import { getPrismaClient } from './prismaService';
import { ItemServicePrisma } from './itemService.prisma';
import { EquipmentSlot, InventoryItem, Item } from '../types/item';

export class EquipmentServicePrisma {
  private prisma: PrismaClient;
  private itemService: ItemServicePrisma;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || getPrismaClient();
    this.itemService = new ItemServicePrisma(this.prisma);
  }

  /**
   * Equip an item from character's inventory to an equipment slot
   * @param characterId Character ID
   * @param itemId Item ID to equip
   * @returns Promise<void>
   */
  async equipItem(characterId: number, itemId: number): Promise<void> {
    // Get the item to check its equipment slot
    const item = await this.itemService.getItem(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    if (!item.equipment_slot) {
      throw new Error('Item cannot be equipped');
    }

    // Check if item is in character's inventory
    const inventory = await this.itemService.getInventoryItems(characterId);
    const inventoryItem = inventory.find(invItem => invItem.item_id === itemId);
    
    if (!inventoryItem) {
      throw new Error('Item not found in character inventory');
    }

    // Check if the inventory item is already equipped (via equipped_items table)
    const existingEquipment = await this.prisma.equippedItem.findFirst({
      where: {
        character_id: characterId,
        item_id: itemId
      }
    });

    if (existingEquipment) {
      throw new Error('Item is already equipped');
    }

    // Check if slot is already occupied
    const currentlyEquipped = await this.getEquippedItemInSlot(characterId, item.equipment_slot as EquipmentSlot);
    if (currentlyEquipped) {
      throw new Error(`Equipment slot ${item.equipment_slot} is already occupied by ${currentlyEquipped.item.name}`);
    }

    // Equip the item by adding to equipped_items table
    await this.prisma.equippedItem.create({
      data: {
        character_id: characterId,
        item_id: itemId,
        equipment_slot: item.equipment_slot
      }
    });
  }

  /**
   * Unequip an item from character's equipment slot
   * @param characterId Character ID
   * @param itemId Item ID to unequip
   * @returns Promise<void>
   */
  async unequipItem(characterId: number, itemId: number): Promise<void> {
    const equippedItem = await this.prisma.equippedItem.findFirst({
      where: {
        character_id: characterId,
        item_id: itemId
      }
    });

    if (!equippedItem) {
      throw new Error('Item is not equipped');
    }

    await this.prisma.equippedItem.delete({
      where: {
        character_id_item_id: {
          character_id: characterId,
          item_id: itemId
        }
      }
    });
  }

  /**
   * Get equipped item in a specific slot
   * @param characterId Character ID
   * @param slot Equipment slot
   * @returns Promise<InventoryItem | null>
   */
  async getEquippedItemInSlot(characterId: number, slot: EquipmentSlot): Promise<InventoryItem | null> {
    const equippedItem = await this.prisma.equippedItem.findFirst({
      where: {
        character_id: characterId,
        equipment_slot: slot
      },
      include: {
        item: true,
        inventory_item: true
      }
    });

    if (!equippedItem) return null;

    return {
      character_id: characterId,
      item_id: equippedItem.item_id,
      quantity: equippedItem.inventory_item.quantity,
      item: {
        id: equippedItem.item.id,
        name: equippedItem.item.name,
        description: equippedItem.item.description,
        type: equippedItem.item.type,
        weight: equippedItem.item.weight,
        value: equippedItem.item.value,
        stackable: equippedItem.item.stackable,
        max_stack: equippedItem.item.max_stack,
        armor_rating: equippedItem.item.armor_rating,
        equipment_slot: equippedItem.item.equipment_slot,
        is_fixed: equippedItem.item.is_fixed,
        created_at: equippedItem.item.created_at.toISOString()
      }
    };
  }

  /**
   * Get all equipped items for a character
   * @param characterId Character ID
   * @returns Promise<InventoryItem[]>
   */
  async getEquippedItems(characterId: number): Promise<InventoryItem[]> {
    const equippedItems = await this.prisma.equippedItem.findMany({
      where: { character_id: characterId },
      include: {
        item: true,
        inventory_item: true
      }
    });

    return equippedItems.map(equippedItem => ({
      character_id: characterId,
      item_id: equippedItem.item_id,
      quantity: equippedItem.inventory_item.quantity,
      item: {
        id: equippedItem.item.id,
        name: equippedItem.item.name,
        description: equippedItem.item.description,
        type: equippedItem.item.type,
        weight: equippedItem.item.weight,
        value: equippedItem.item.value,
        stackable: equippedItem.item.stackable,
        max_stack: equippedItem.item.max_stack,
        armor_rating: equippedItem.item.armor_rating,
        equipment_slot: equippedItem.item.equipment_slot,
        is_fixed: equippedItem.item.is_fixed,
        created_at: equippedItem.item.created_at.toISOString()
      }
    }));
  }

  /**
   * Get equipment summary by slot
   * @param characterId Character ID
   * @returns Promise<{[key in EquipmentSlot]?: InventoryItem}>
   */
  async getEquipmentSummary(characterId: number): Promise<{[key in EquipmentSlot]?: InventoryItem}> {
    const equippedItems = await this.getEquippedItems(characterId);
    const summary: {[key in EquipmentSlot]?: InventoryItem} = {};

    for (const equippedItem of equippedItems) {
      const slot = equippedItem.item.equipment_slot as EquipmentSlot;
      if (slot) {
        summary[slot] = equippedItem;
      }
    }

    return summary;
  }

  /**
   * Find an equippable item in character's inventory by name
   * @param characterId Character ID
   * @param itemName Item name to search for
   * @returns Promise<InventoryItem | null>
   */
  async findEquippableItem(characterId: number, itemName: string): Promise<InventoryItem | null> {
    const inventoryItems = await this.itemService.getInventoryItems(characterId);
    
    // Find items that match the name and can be equipped
    const matchingItems = inventoryItems.filter(invItem => 
      invItem.item.equipment_slot && 
      invItem.item.name.toLowerCase().includes(itemName.toLowerCase())
    );

    if (matchingItems.length === 0) return null;

    // Return the first match (exact matches will come first due to sorting)
    return matchingItems.sort((a, b) => {
      const aExact = a.item.name.toLowerCase() === itemName.toLowerCase();
      const bExact = b.item.name.toLowerCase() === itemName.toLowerCase();
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.item.name.localeCompare(b.item.name);
    })[0];
  }
}