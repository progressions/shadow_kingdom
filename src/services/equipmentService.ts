/**
 * EquipmentService for Shadow Kingdom
 * 
 * This service handles equipment operations including equipping and unequipping items
 * in the 4-slot equipment system (HAND, HEAD, BODY, FOOT).
 */

import Database from '../utils/database';
import { ItemService } from './itemService';
import { EquipmentSlot, InventoryItem, Item } from '../types/item';

export class EquipmentService {
  private db: Database;
  private itemService: ItemService;

  constructor(db: Database) {
    this.db = db;
    this.itemService = new ItemService(db);
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
    const inventory = await this.itemService.getCharacterInventory(characterId);
    const inventoryItem = inventory.find(invItem => invItem.item_id === itemId);
    
    if (!inventoryItem) {
      throw new Error('Item not found in character inventory');
    }

    if (inventoryItem.equipped) {
      throw new Error('Item is already equipped');
    }

    // Check if slot is already occupied
    const currentlyEquipped = await this.getEquippedItemInSlot(characterId, item.equipment_slot);
    if (currentlyEquipped) {
      throw new Error(`Slot ${item.equipment_slot} is already occupied by ${currentlyEquipped.item.name}`);
    }

    // Equip the item
    await this.db.run(`
      UPDATE character_inventory 
      SET equipped = TRUE, equipped_slot = ? 
      WHERE character_id = ? AND item_id = ?
    `, [item.equipment_slot, characterId, itemId]);
  }

  /**
   * Unequip an item from character's equipment
   * @param characterId Character ID
   * @param itemId Item ID to unequip
   * @returns Promise<void>
   */
  async unequipItem(characterId: number, itemId: number): Promise<void> {
    // Check if item is equipped
    const inventory = await this.itemService.getCharacterInventory(characterId);
    const inventoryItem = inventory.find(invItem => invItem.item_id === itemId && invItem.equipped);
    
    if (!inventoryItem) {
      throw new Error('Item is not equipped');
    }

    // Unequip the item
    await this.db.run(`
      UPDATE character_inventory 
      SET equipped = FALSE, equipped_slot = NULL 
      WHERE character_id = ? AND item_id = ?
    `, [characterId, itemId]);
  }

  /**
   * Get currently equipped item in a specific slot
   * @param characterId Character ID
   * @param slot Equipment slot
   * @returns Promise<InventoryItem | null>
   */
  async getEquippedItemInSlot(characterId: number, slot: EquipmentSlot): Promise<InventoryItem | null> {
    const result = await this.db.get<any>(`
      SELECT ci.*, i.* 
      FROM character_inventory ci 
      JOIN items i ON ci.item_id = i.id 
      WHERE ci.character_id = ? AND ci.equipped = TRUE AND ci.equipped_slot = ?
    `, [characterId, slot]);

    if (!result) return null;

    return {
      id: result.id,
      character_id: result.character_id,
      item_id: result.item_id,
      quantity: result.quantity,
      equipped: Boolean(result.equipped),
      equipped_slot: result.equipped_slot,
      created_at: result.created_at,
      item: {
        id: result.item_id,
        name: result.name,
        description: result.description,
        type: result.type,
        weight: result.weight,
        value: result.value,
        stackable: Boolean(result.stackable),
        max_stack: result.max_stack,
        armor_rating: result.armor_rating,
        equipment_slot: result.equipment_slot,
        created_at: result.created_at
      }
    };
  }

  /**
   * Get all equipped items for a character
   * @param characterId Character ID
   * @returns Promise<InventoryItem[]>
   */
  async getEquippedItems(characterId: number): Promise<InventoryItem[]> {
    const results = await this.db.all<any>(`
      SELECT ci.*, i.* 
      FROM character_inventory ci 
      JOIN items i ON ci.item_id = i.id 
      WHERE ci.character_id = ? AND ci.equipped = TRUE
      ORDER BY ci.equipped_slot
    `, [characterId]);

    return results.map(result => ({
      id: result.id,
      character_id: result.character_id,
      item_id: result.item_id,
      quantity: result.quantity,
      equipped: Boolean(result.equipped),
      equipped_slot: result.equipped_slot,
      created_at: result.created_at,
      item: {
        id: result.item_id,
        name: result.name,
        description: result.description,
        type: result.type,
        weight: result.weight,
        value: result.value,
        stackable: Boolean(result.stackable),
        max_stack: result.max_stack,
        armor_rating: result.armor_rating,
        equipment_slot: result.equipment_slot,
        created_at: result.created_at
      }
    }));
  }

  /**
   * Get equipment summary for all slots
   * @param characterId Character ID
   * @returns Promise<{[key in EquipmentSlot]?: InventoryItem}>
   */
  async getEquipmentSummary(characterId: number): Promise<{[key in EquipmentSlot]?: InventoryItem}> {
    const equippedItems = await this.getEquippedItems(characterId);
    const summary: {[key in EquipmentSlot]?: InventoryItem} = {};

    for (const item of equippedItems) {
      if (item.equipped_slot) {
        summary[item.equipped_slot as EquipmentSlot] = item;
      }
    }

    return summary;
  }

  /**
   * Check if an item can be equipped to a specific slot
   * @param item Item to check
   * @param slot Target slot
   * @returns boolean
   */
  canEquipToSlot(item: Item, slot: EquipmentSlot): boolean {
    return item.equipment_slot === slot;
  }

  /**
   * Find an equippable item in inventory by name
   * @param characterId Character ID
   * @param itemName Item name to search for
   * @returns Promise<InventoryItem | null>
   */
  async findEquippableItem(characterId: number, itemName: string): Promise<InventoryItem | null> {
    const inventory = await this.itemService.getCharacterInventory(characterId);
    
    // Filter for only equippable items (have equipment_slot) that are not already equipped
    const equippableItems = inventory.filter(invItem => 
      invItem.item.equipment_slot && !invItem.equipped
    );

    return this.itemService.findItemByName(equippableItems, itemName) || null;
  }

  /**
   * Get the equipped weapon for damage calculation
   * @param characterId Character ID
   * @returns Promise<InventoryItem | null> - Returns equipped weapon or null
   */
  async getEquippedWeapon(characterId: number): Promise<InventoryItem | null> {
    const weapon = await this.getEquippedItemInSlot(characterId, EquipmentSlot.HAND);
    
    // Only return if it's actually a weapon type
    if (weapon && weapon.item.type === 'weapon') {
      return weapon;
    }
    
    return null;
  }

  /**
   * Calculate total attack damage including weapon bonus
   * @param characterId Character ID
   * @param baseDamage Base attack damage
   * @returns Promise<number> - Total damage including weapon bonus
   */
  async calculateAttackDamage(characterId: number, baseDamage: number): Promise<number> {
    const weapon = await this.getEquippedWeapon(characterId);
    const weaponDamage = weapon ? weapon.item.value : 0;
    return Math.max(1, baseDamage + weaponDamage); // Minimum 1 damage
  }
}