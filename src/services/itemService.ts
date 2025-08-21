/**
 * Item Service
 * 
 * Handles all item-related database operations and business logic for the Shadow Kingdom item system.
 * This class provides methods for creating, retrieving, and managing items, inventory, and room items.
 */

import Database from '../utils/database';
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

export class ItemService {
  constructor(private db: Database) {}

  // ============================================================================
  // ITEM CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new item in the database
   * @param item Item data (without id and created_at)
   * @returns The ID of the created item
   */
  async createItem(item: CreateItemData): Promise<number> {
    const result = await this.db.run(`
      INSERT INTO items (name, description, type, weight, value, stackable, max_stack, weapon_damage, armor_rating, equipment_slot)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [item.name, item.description, item.type, item.weight, item.value, item.stackable, item.max_stack, item.weapon_damage, item.armor_rating, item.equipment_slot]);
    
    return result.lastID!;
  }

  /**
   * Get an item by ID
   * @param id Item ID
   * @returns Item or null if not found
   */
  async getItem(id: number): Promise<Item | null> {
    const result = await this.db.get<any>('SELECT * FROM items WHERE id = ?', [id]);
    if (!result) return null;
    
    return {
      ...result,
      stackable: Boolean(result.stackable)
    };
  }

  /**
   * List all items
   * @returns Array of all items
   */
  async listItems(): Promise<Item[]> {
    const results = await this.db.all<any>('SELECT * FROM items ORDER BY name');
    return results.map(result => ({
      ...result,
      stackable: Boolean(result.stackable)
    }));
  }

  // ============================================================================
  // ROOM ITEMS OPERATIONS
  // ============================================================================

  /**
   * Place an item in a room
   * @param roomId Room ID
   * @param itemId Item ID
   * @param quantity Quantity to place (default: 1)
   */
  async placeItemInRoom(roomId: number, itemId: number, quantity: number = 1): Promise<void> {
    await this.db.run(`
      INSERT INTO room_items (room_id, item_id, quantity)
      VALUES (?, ?, ?)
    `, [roomId, itemId, quantity]);
  }

  /**
   * Get all items in a specific room
   * @param roomId Room ID
   * @returns Array of room items with item details
   */
  async getRoomItems(roomId: number): Promise<RoomItem[]> {
    const rows = await this.db.all<any>(`
      SELECT ri.id, ri.room_id, ri.item_id, ri.quantity, ri.created_at,
             i.id as item_id_full, i.name, i.description, i.type, i.weight, i.value, 
             i.stackable, i.max_stack, i.weapon_damage, i.armor_rating, i.created_at as item_created_at
      FROM room_items ri 
      JOIN items i ON ri.item_id = i.id 
      WHERE ri.room_id = ?
      ORDER BY i.name
    `, [roomId]);

    return rows.map(row => ({
      id: row.id,
      room_id: row.room_id,
      item_id: row.item_id,
      quantity: row.quantity,
      created_at: row.created_at,
      item: {
        id: row.item_id_full,
        name: row.name,
        description: row.description,
        type: row.type,
        weight: row.weight,
        value: row.value,
        stackable: Boolean(row.stackable),
        max_stack: row.max_stack,
        weapon_damage: row.weapon_damage,
        armor_rating: row.armor_rating,
        created_at: row.item_created_at
      }
    }));
  }

  // ============================================================================
  // CHARACTER INVENTORY OPERATIONS
  // ============================================================================

  /**
   * Get a character's inventory
   * @param characterId Character ID
   * @returns Array of inventory items with item details
   */
  async getCharacterInventory(characterId: number): Promise<InventoryItem[]> {
    const rows = await this.db.all<any>(`
      SELECT ci.id, ci.character_id, ci.item_id, ci.quantity, ci.equipped, ci.equipped_slot, ci.created_at,
             i.id as item_id_full, i.name, i.description, i.type, i.weight, i.value, 
             i.stackable, i.max_stack, i.weapon_damage, i.armor_rating, i.created_at as item_created_at
      FROM character_inventory ci 
      JOIN items i ON ci.item_id = i.id 
      WHERE ci.character_id = ?
      ORDER BY i.type, i.name
    `, [characterId]);

    return rows.map(row => ({
      id: row.id,
      character_id: row.character_id,
      item_id: row.item_id,
      quantity: row.quantity,
      equipped: Boolean(row.equipped),
      equipped_slot: row.equipped_slot,
      created_at: row.created_at,
      item: {
        id: row.item_id_full,
        name: row.name,
        description: row.description,
        type: row.type,
        weight: row.weight,
        value: row.value,
        stackable: Boolean(row.stackable),
        max_stack: row.max_stack,
        weapon_damage: row.weapon_damage,
        armor_rating: row.armor_rating,
        created_at: row.item_created_at
      }
    }));
  }

  /**
   * Transfer an item from room to character inventory
   * @param characterId Character ID
   * @param itemId Item ID
   * @param roomId Room ID (where item is located)
   * @param quantity Quantity to transfer (default: 1)
   */
  async transferItemToInventory(
    characterId: number, 
    itemId: number, 
    roomId: number, 
    quantity: number = 1
  ): Promise<void> {
    // Check if the item exists in the room
    const roomItem = await this.db.get<any>(`
      SELECT * FROM room_items 
      WHERE room_id = ? AND item_id = ?
    `, [roomId, itemId]);

    if (!roomItem) {
      throw new Error('Item not found in room');
    }

    if (roomItem.quantity < quantity) {
      throw new Error('Not enough quantity available in room');
    }

    // Check if character already has this item (for stacking)
    const existingInventoryItem = await this.db.get<any>(`
      SELECT * FROM character_inventory 
      WHERE character_id = ? AND item_id = ?
    `, [characterId, itemId]);

    if (existingInventoryItem) {
      // Update existing inventory item quantity
      await this.db.run(`
        UPDATE character_inventory 
        SET quantity = quantity + ?
        WHERE character_id = ? AND item_id = ?
      `, [quantity, characterId, itemId]);
    } else {
      // Add new inventory item
      await this.db.run(`
        INSERT INTO character_inventory (character_id, item_id, quantity)
        VALUES (?, ?, ?)
      `, [characterId, itemId, quantity]);
    }

    // Update or remove room item
    if (roomItem.quantity === quantity) {
      // Remove completely from room
      await this.db.run(`
        DELETE FROM room_items 
        WHERE room_id = ? AND item_id = ?
      `, [roomId, itemId]);
    } else {
      // Reduce quantity in room
      await this.db.run(`
        UPDATE room_items 
        SET quantity = quantity - ?
        WHERE room_id = ? AND item_id = ?
      `, [quantity, roomId, itemId]);
    }
  }

  /**
   * Transfer an item from character inventory to room
   * @param characterId Character ID
   * @param itemId Item ID
   * @param roomId Room ID (destination)
   * @param quantity Quantity to transfer (default: 1)
   */
  async transferItemToRoom(
    characterId: number,
    itemId: number, 
    roomId: number,
    quantity: number = 1
  ): Promise<void> {
    // Check if the item exists in character inventory
    const inventoryItem = await this.db.get<any>(`
      SELECT * FROM character_inventory 
      WHERE character_id = ? AND item_id = ?
    `, [characterId, itemId]);

    if (!inventoryItem) {
      throw new Error('Item not found in character inventory');
    }

    if (inventoryItem.quantity < quantity) {
      throw new Error('Not enough quantity available in inventory');
    }

    // Check if item already exists in the room (for stacking)
    const existingRoomItem = await this.db.get<any>(`
      SELECT * FROM room_items 
      WHERE room_id = ? AND item_id = ?
    `, [roomId, itemId]);

    if (existingRoomItem) {
      // Update existing room item quantity
      await this.db.run(`
        UPDATE room_items 
        SET quantity = quantity + ?
        WHERE room_id = ? AND item_id = ?
      `, [quantity, roomId, itemId]);
    } else {
      // Add new room item
      await this.db.run(`
        INSERT INTO room_items (room_id, item_id, quantity)
        VALUES (?, ?, ?)
      `, [roomId, itemId, quantity]);
    }

    // Update or remove inventory item
    if (inventoryItem.quantity === quantity) {
      // Remove completely from inventory
      await this.db.run(`
        DELETE FROM character_inventory 
        WHERE character_id = ? AND item_id = ?
      `, [characterId, itemId]);
    } else {
      // Reduce quantity in inventory
      await this.db.run(`
        UPDATE character_inventory 
        SET quantity = quantity - ?
        WHERE character_id = ? AND item_id = ?
      `, [quantity, characterId, itemId]);
    }
  }

  // ============================================================================
  // SIMPLE ITEM COUNT LIMIT SYSTEM
  // ============================================================================

  /**
   * Get the maximum number of items a character can carry
   * @returns Maximum item count from environment variable (default: 10)
   */
  getMaxInventoryItems(): number {
    const envValue = process.env.MAX_INVENTORY_ITEMS || '10';
    const parsed = parseInt(envValue);
    return isNaN(parsed) ? 10 : parsed;
  }

  /**
   * Get current number of distinct items in character's inventory
   * @param characterId Character ID
   * @returns Number of distinct items (not quantities)
   */
  async getInventoryItemCount(characterId: number): Promise<number> {
    const inventory = await this.getCharacterInventory(characterId);
    return inventory.length; // Count distinct items, not quantities
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

  // ============================================================================
  // EQUIPMENT SYSTEM PLACEHOLDER
  // ============================================================================

  /**
   * Equip an item to a character
   * @param characterId Character ID
   * @param itemId Item ID
   * @param slot Equipment slot
   */
  async equipItem(characterId: number, itemId: number, slot: string): Promise<void> {
    throw new Error('Not implemented - Phase 10');
  }

  /**
   * Unequip an item from a character
   * @param characterId Character ID
   * @param itemId Item ID
   */
  async unequipItem(characterId: number, itemId: number): Promise<void> {
    throw new Error('Not implemented - Phase 11');
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Find an item by name (case-insensitive partial match)
   * @param items Array of items to search
   * @param itemName Name to search for
   * @returns Found item or undefined
   */
  findItemByName<T extends { item: Item }>(items: T[], itemName: string): T | undefined {
    return items.find(roomItem => 
      roomItem.item.name.toLowerCase().includes(itemName.toLowerCase())
    );
  }

}