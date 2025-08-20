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
      INSERT INTO items (name, description, type, weight, value, stackable, max_stack, weapon_damage, armor_rating)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [item.name, item.description, item.type, item.weight, item.value, item.stackable, item.max_stack, item.weapon_damage, item.armor_rating]);
    
    return result.lastID!;
  }

  /**
   * Get an item by ID
   * @param id Item ID
   * @returns Item or null if not found
   */
  async getItem(id: number): Promise<Item | null> {
    const result = await this.db.get<Item>('SELECT * FROM items WHERE id = ?', [id]);
    return result || null;
  }

  /**
   * List all items
   * @returns Array of all items
   */
  async listItems(): Promise<Item[]> {
    return await this.db.all<Item>('SELECT * FROM items ORDER BY name');
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
    throw new Error('Not implemented - Phase 5');
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
    throw new Error('Not implemented - Phase 4');
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
    throw new Error('Not implemented - Phase 6');
  }

  // ============================================================================
  // WEIGHT AND ENCUMBRANCE SYSTEM
  // ============================================================================

  /**
   * Calculate carrying capacity based on character strength
   * @param strength Character's strength attribute
   * @returns Maximum carrying capacity in pounds
   */
  calculateCarryingCapacity(strength: number): number {
    throw new Error('Not implemented - Phase 7');
  }

  /**
   * Get current weight of character's inventory
   * @param characterId Character ID
   * @returns Current weight in pounds
   */
  async getCurrentWeight(characterId: number): Promise<number> {
    throw new Error('Not implemented - Phase 7');
  }

  /**
   * Get encumbrance level based on current weight and max capacity
   * @param currentWeight Current weight in pounds
   * @param maxCapacity Maximum capacity in pounds
   * @returns Encumbrance level
   */
  getEncumbranceLevel(currentWeight: number, maxCapacity: number): EncumbranceLevel {
    throw new Error('Not implemented - Phase 7');
  }

  /**
   * Get complete carrying capacity information for a character
   * @param characterId Character ID
   * @param strength Character's strength attribute
   * @returns Carrying capacity information
   */
  async getCarryingCapacityInfo(characterId: number, strength: number): Promise<CarryingCapacityInfo> {
    throw new Error('Not implemented - Phase 7');
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

  /**
   * Validate if a character can carry additional weight
   * @param characterId Character ID
   * @param additionalWeight Weight to add
   * @param strength Character's strength attribute
   * @returns True if character can carry the additional weight
   */
  async canCarryAdditionalWeight(
    characterId: number, 
    additionalWeight: number, 
    strength: number
  ): Promise<boolean> {
    throw new Error('Not implemented - Phase 7');
  }
}