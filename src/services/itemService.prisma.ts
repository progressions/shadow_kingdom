/**
 * Item Service - Prisma Version
 * 
 * Handles all item-related database operations and business logic for the Shadow Kingdom item system.
 * This class provides methods for creating, retrieving, and managing items, inventory, and room items.
 */

import { PrismaClient } from '../generated/prisma';
import { getPrismaClient } from './prismaService';
import { 
  Item, 
  InventoryItem, 
  RoomItem, 
  CreateItemData, 
  CreateInventoryItemData, 
  CreateRoomItemData,
  CarryingCapacityInfo,
  EncumbranceLevel
} from '../types/item';

export class ItemServicePrisma {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || getPrismaClient();
  }

  // ============================================================================
  // ITEM CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new item in the database
   * @param item Item data (without id and created_at)
   * @returns The ID of the created item
   */
  async createItem(item: CreateItemData): Promise<number> {
    const result = await this.prisma.item.create({
      data: {
        name: item.name,
        description: item.description,
        type: item.type,
        weight: item.weight,
        value: item.value,
        stackable: item.stackable,
        maxStack: item.max_stack,
        armorRating: item.armor_rating,
        equipmentSlot: item.equipment_slot,
        isFixed: item.is_fixed || false
      }
    });
    
    return result.id;
  }

  /**
   * Get an item by ID
   * @param id Item ID
   * @returns Item or null if not found
   */
  async getItem(id: number): Promise<Item | null> {
    const result = await this.prisma.item.findUnique({
      where: { id }
    });
    
    if (!result) return null;
    
    return {
      id: result.id,
      name: result.name,
      description: result.description,
      type: result.type as any,
      weight: result.weight,
      value: result.value,
      stackable: result.stackable,
      max_stack: result.maxStack,
      armor_rating: result.armorRating,
      equipment_slot: result.equipmentSlot as any,
      is_fixed: result.isFixed,
      created_at: result.createdAt.toISOString()
    };
  }

  /**
   * List all items (alias for getAllItems for backward compatibility)
   */
  async listItems(): Promise<Item[]> {
    return this.getAllItems();
  }

  /**
   * Get all items
   * @returns Array of all items
   */
  async getAllItems(): Promise<Item[]> {
    const results = await this.prisma.item.findMany({
      orderBy: { name: 'asc' }
    });
    
    return results.map(result => ({
      id: result.id,
      name: result.name,
      description: result.description,
      type: result.type as any,
      weight: result.weight,
      value: result.value,
      stackable: result.stackable,
      max_stack: result.maxStack,
      armor_rating: result.armorRating,
      equipment_slot: result.equipmentSlot as any,
      is_fixed: result.isFixed,
      created_at: result.createdAt.toISOString()
    }));
  }

  /**
   * Update an item
   * @param id Item ID
   * @param updates Partial item data to update
   * @returns true if updated, false if not found
   */
  async updateItem(id: number, updates: Partial<CreateItemData>): Promise<boolean> {
    try {
      await this.prisma.item.update({
        where: { id },
        data: updates
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // ============================================================================
  // INVENTORY OPERATIONS
  // ============================================================================

  /**
   * Place an item in a room
   * @param roomId Room ID
   * @param itemId Item ID
   * @param quantity Quantity to place (default: 1)
   */
  async placeItemInRoom(roomId: number, itemId: number, quantity: number = 1): Promise<void> {
    try {
      // Check if the item already exists in the room
      const existingRoomItem = await this.prisma.roomItem.findFirst({
        where: {
          roomId: roomId,
          itemId: itemId
        }
      });

      if (existingRoomItem) {
        // Update quantity if item already exists
        await this.prisma.roomItem.update({
          where: { id: existingRoomItem.id },
          data: {
            quantity: existingRoomItem.quantity + quantity
          }
        });
      } else {
        // Create new room item entry
        await this.prisma.roomItem.create({
          data: {
            roomId: roomId,
            itemId: itemId,
            quantity: quantity
          }
        });
      }
    } catch (error) {
      console.error('Failed to place item in room:', error);
      throw new Error('Failed to place item in room');
    }
  }

  /**
   * Get inventory items for a character
   * @param characterId Character ID
   * @returns Array of inventory items with item details
   */
  async getInventoryItems(characterId: number): Promise<InventoryItem[]> {
    const results = await this.prisma.characterInventory.findMany({
      where: { characterId },
      include: {
        item: true
      }
    });

    return results.map((result: any) => ({
      character_id: result.characterId,
      item_id: result.itemId,
      quantity: result.quantity,
      item: {
        id: result.item.id,
        name: result.item.name,
        description: result.item.description,
        type: result.item.type,
        weight: result.item.weight,
        value: result.item.value,
        stackable: result.item.stackable,
        max_stack: result.item.maxStack,
        armor_rating: result.item.armorRating,
        equipment_slot: result.item.equipmentSlot,
        is_fixed: result.item.isFixed,
        created_at: result.item.createdAt.toISOString()
      }
    }));
  }

  /**
   * Get room items for a room
   * @param roomId Room ID
   * @returns Array of room items with item details
   */
  async getRoomItems(roomId: number): Promise<RoomItem[]> {
    const results = await this.prisma.roomItem.findMany({
      where: { roomId },
      include: {
        item: true
      }
    });

    return results.map(result => ({
      id: result.id,
      room_id: result.roomId,
      item_id: result.itemId,
      quantity: result.quantity,
      created_at: result.createdAt.toISOString(),
      item: {
        id: result.item.id,
        name: result.item.name,
        description: result.item.description,
        type: result.item.type,
        weight: result.item.weight,
        value: result.item.value,
        stackable: result.item.stackable,
        max_stack: result.item.maxStack,
        armor_rating: result.item.armorRating,
        equipment_slot: result.item.equipmentSlot,
        is_fixed: result.item.isFixed,
        created_at: result.item.createdAt.toISOString()
      }
    }));
  }

  /**
   * Move item from room to character inventory
   * @param roomId Room ID
   * @param characterId Character ID  
   * @param itemId Item ID
   * @param quantity Quantity to move (defaults to all available)
   * @returns true if successful, false if item not available
   */
  async moveItemFromRoomToInventory(roomId: number, characterId: number, itemId: number, quantity?: number): Promise<boolean> {
    const roomItem = await this.prisma.roomItem.findFirst({
      where: { room_id: roomId, item_id: itemId }
    });

    if (!roomItem) return false;

    const quantityToMove = quantity || roomItem.quantity;
    if (quantityToMove > roomItem.quantity) return false;

    // Use transaction to ensure atomicity
    await this.prisma.$transaction(async (tx) => {
      // Check if character already has this item
      const existingInventoryItem = await tx.inventoryItem.findFirst({
        where: { character_id: characterId, item_id: itemId }
      });

      if (existingInventoryItem) {
        // Update existing inventory item
        await tx.inventoryItem.update({
          where: {
            character_id_item_id: {
              character_id: characterId,
              item_id: itemId
            }
          },
          data: {
            quantity: existingInventoryItem.quantity + quantityToMove
          }
        });
      } else {
        // Create new inventory item
        await tx.inventoryItem.create({
          data: {
            character_id: characterId,
            item_id: itemId,
            quantity: quantityToMove
          }
        });
      }

      // Update or remove room item
      if (roomItem.quantity === quantityToMove) {
        await tx.roomItem.delete({
          where: {
            room_id_item_id: {
              room_id: roomId,
              item_id: itemId
            }
          }
        });
      } else {
        await tx.roomItem.update({
          where: {
            room_id_item_id: {
              room_id: roomId,
              item_id: itemId
            }
          },
          data: {
            quantity: roomItem.quantity - quantityToMove
          }
        });
      }
    });

    return true;
  }

  /**
   * Move item from character inventory to room
   * @param characterId Character ID
   * @param roomId Room ID
   * @param itemId Item ID
   * @param quantity Quantity to move (defaults to all available)
   * @returns true if successful, false if item not available
   */
  async moveItemFromInventoryToRoom(characterId: number, roomId: number, itemId: number, quantity?: number): Promise<boolean> {
    const inventoryItem = await this.prisma.inventoryItem.findFirst({
      where: { character_id: characterId, item_id: itemId }
    });

    if (!inventoryItem) return false;

    const quantityToMove = quantity || inventoryItem.quantity;
    if (quantityToMove > inventoryItem.quantity) return false;

    // Use transaction to ensure atomicity
    await this.prisma.$transaction(async (tx) => {
      // Check if room already has this item
      const existingRoomItem = await tx.roomItem.findFirst({
        where: { room_id: roomId, item_id: itemId }
      });

      if (existingRoomItem) {
        // Update existing room item
        await tx.roomItem.update({
          where: {
            room_id_item_id: {
              room_id: roomId,
              item_id: itemId
            }
          },
          data: {
            quantity: existingRoomItem.quantity + quantityToMove
          }
        });
      } else {
        // Create new room item
        await tx.roomItem.create({
          data: {
            room_id: roomId,
            item_id: itemId,
            quantity: quantityToMove
          }
        });
      }

      // Update or remove inventory item
      if (inventoryItem.quantity === quantityToMove) {
        await tx.inventoryItem.delete({
          where: {
            character_id_item_id: {
              character_id: characterId,
              item_id: itemId
            }
          }
        });
      } else {
        await tx.inventoryItem.update({
          where: {
            character_id_item_id: {
              character_id: characterId,
              item_id: itemId
            }
          },
          data: {
            quantity: inventoryItem.quantity - quantityToMove
          }
        });
      }
    });

    return true;
  }

  // ============================================================================
  // WEIGHT AND ENCUMBRANCE CALCULATIONS
  // ============================================================================

  /**
   * Calculate total weight carried by a character
   * @param characterId Character ID
   * @returns Total weight in pounds
   */
  async calculateCarriedWeight(characterId: number): Promise<number> {
    const inventoryItems = await this.getInventoryItems(characterId);
    
    return inventoryItems.reduce((total, invItem) => {
      return total + (invItem.item.weight * invItem.quantity);
    }, 0);
  }

  /**
   * Get carrying capacity information for a character
   * @param characterId Character ID
   * @param strength Character's strength score
   * @returns Carrying capacity information
   */
  async getCarryingCapacityInfo(characterId: number, strength: number): Promise<CarryingCapacityInfo> {
    const carriedWeight = await this.calculateCarriedWeight(characterId);
    
    // Base carrying capacity = Strength * 15 pounds
    const maxCapacity = strength * 15;
    const lightLoad = Math.floor(maxCapacity / 3);
    const mediumLoad = Math.floor(maxCapacity * 2 / 3);
    
    let encumbranceLevel: EncumbranceLevel;
    if (carriedWeight <= lightLoad) {
      encumbranceLevel = 'light';
    } else if (carriedWeight <= mediumLoad) {
      encumbranceLevel = 'medium';
    } else if (carriedWeight <= maxCapacity) {
      encumbranceLevel = 'heavy';
    } else {
      encumbranceLevel = 'overloaded';
    }
    
    return {
      carriedWeight,
      maxCapacity,
      lightLoad,
      mediumLoad,
      encumbranceLevel,
      isOverloaded: carriedWeight > maxCapacity
    };
  }

  /**
   * Check if a character can carry additional weight
   * @param characterId Character ID
   * @param strength Character's strength score
   * @param additionalWeight Weight to check
   * @returns true if character can carry the additional weight
   */
  async canCarryAdditionalWeight(characterId: number, strength: number, additionalWeight: number): Promise<boolean> {
    const capacityInfo = await this.getCarryingCapacityInfo(characterId, strength);
    return (capacityInfo.carriedWeight + additionalWeight) <= capacityInfo.maxCapacity;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Create inventory item directly
   * @param data Inventory item data
   * @returns true if successful
   */
  async createInventoryItem(data: CreateInventoryItemData): Promise<boolean> {
    try {
      await this.prisma.inventoryItem.create({
        data: {
          character_id: data.character_id,
          item_id: data.item_id,
          quantity: data.quantity
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create room item directly
   * @param data Room item data
   * @returns true if successful
   */
  async createRoomItem(data: CreateRoomItemData): Promise<boolean> {
    try {
      await this.prisma.roomItem.create({
        data: {
          room_id: data.room_id,
          item_id: data.item_id,
          quantity: data.quantity
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get inventory item by character and item ID
   * @param characterId Character ID
   * @param itemId Item ID
   * @returns Inventory item or null
   */
  async getInventoryItem(characterId: number, itemId: number): Promise<InventoryItem | null> {
    const result = await this.prisma.inventoryItem.findFirst({
      where: { character_id: characterId, item_id: itemId },
      include: {
        item: true
      }
    });

    if (!result) return null;

    return {
      character_id: result.character_id,
      item_id: result.itemId,
      quantity: result.quantity,
      item: {
        id: result.item.id,
        name: result.item.name,
        description: result.item.description,
        type: result.item.type,
        weight: result.item.weight,
        value: result.item.value,
        stackable: result.item.stackable,
        max_stack: result.item.maxStack,
        armor_rating: result.item.armorRating,
        equipment_slot: result.item.equipmentSlot,
        is_fixed: result.item.isFixed,
        created_at: result.item.createdAt.toISOString()
      }
    };
  }

  /**
   * Get room item by room and item ID
   * @param roomId Room ID
   * @param itemId Item ID
   * @returns Room item or null
   */
  async getRoomItem(roomId: number, itemId: number): Promise<RoomItem | null> {
    const result = await this.prisma.roomItem.findFirst({
      where: { room_id: roomId, item_id: itemId },
      include: {
        item: true
      }
    });

    if (!result) return null;

    return {
      id: result.id,
      room_id: result.roomId,
      item_id: result.itemId,
      quantity: result.quantity,
      item: {
        id: result.item.id,
        name: result.item.name,
        description: result.item.description,
        type: result.item.type,
        weight: result.item.weight,
        value: result.item.value,
        stackable: result.item.stackable,
        max_stack: result.item.maxStack,
        armor_rating: result.item.armorRating,
        equipment_slot: result.item.equipmentSlot,
        is_fixed: result.item.isFixed,
        created_at: result.item.createdAt.toISOString()
      }
    };
  }

  /**
   * Get the number of distinct items in character's inventory
   * @param characterId Character ID
   * @returns Number of distinct items (not quantities)
   */
  async getInventoryItemCount(characterId: number): Promise<number> {
    const count = await this.prisma.inventoryItem.count({
      where: { characterId: characterId }
    });
    return count;
  }

  /**
   * Check if character can add another item to their inventory
   * @param characterId Character ID
   * @returns True if character can carry more items
   */
  async canAddItemToInventory(characterId: number): Promise<boolean> {
    const currentCount = await this.getInventoryItemCount(characterId);
    return currentCount < this.getMaxInventoryItems();
  }

  /**
   * Get inventory status string showing current/max items
   * @param characterId Character ID
   * @returns Status string like "Items: 7/10"
   */
  async getInventoryStatus(characterId: number): Promise<string> {
    const currentCount = await this.getInventoryItemCount(characterId);
    const maxItems = this.getMaxInventoryItems();
    return `Items: ${currentCount}/${maxItems}`;
  }

  /**
   * Get a character's inventory
   * @param characterId Character ID
   * @returns Array of inventory items with item details
   */
  async getCharacterInventory(characterId: number): Promise<InventoryItem[]> {
    const results = await this.prisma.characterInventory.findMany({
      where: { characterId: characterId },
      include: {
        item: true
      },
      orderBy: [
        { item: { type: 'asc' } },
        { item: { name: 'asc' } }
      ]
    });

    return results.map(row => ({
      id: row.id,
      character_id: row.characterId,
      item_id: row.itemId,
      quantity: row.quantity,
      equipped: row.equipped,
      equipped_slot: row.equippedSlot,
      created_at: row.createdAt.toISOString(),
      item: {
        id: row.item.id,
        name: row.item.name,
        description: row.item.description,
        type: row.item.type,
        weight: row.item.weight,
        value: row.item.value,
        stackable: row.item.stackable,
        max_stack: row.item.maxStack,
        armor_rating: row.item.armorRating,
        equipment_slot: row.item.equipmentSlot,
        is_fixed: row.item.isFixed,
        created_at: row.item.createdAt.toISOString()
      }
    }));
  }

  /**
   * Check if character has an item by partial name match
   * @param characterId Character ID
   * @param itemName Partial item name to search for
   * @returns True if character has the item
   */
  async hasItemByPartialName(characterId: number, itemName: string): Promise<boolean> {
    const inventory = await this.getCharacterInventory(characterId);
    return inventory.some(inventoryItem => 
      inventoryItem.item.name.toLowerCase().includes(itemName.toLowerCase())
    );
  }

  /**
   * Add an item directly to character's inventory (for testing purposes)
   * @param characterId Character ID
   * @param itemId Item ID
   * @param quantity Quantity to add (default: 1)
   */
  async addItemToCharacter(characterId: number, itemId: number, quantity: number = 1): Promise<void> {
    // Check if item already exists in inventory
    const existingItem = await this.prisma.inventoryItem.findFirst({
      where: {
        characterId: characterId,
        itemId: itemId
      }
    });

    if (existingItem) {
      // Update quantity if item exists
      await this.prisma.inventoryItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity
        }
      });
    } else {
      // Create new inventory item
      await this.prisma.inventoryItem.create({
        data: {
          characterId: characterId,
          itemId: itemId,
          quantity: quantity,
          equipped: false
        }
      });
    }
  }
}