/**
 * Item System Type Definitions
 * 
 * This file defines all TypeScript interfaces and enums for the Shadow Kingdom item system.
 * These types correspond to the database schema defined in initDb.ts.
 */

export enum ItemType {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  CONSUMABLE = 'consumable',
  MISC = 'misc',
  QUEST = 'quest'
}

export interface Item {
  id: number;
  name: string;
  description: string;
  type: ItemType;
  weight: number;
  value: number;
  stackable: boolean;
  max_stack: number;
  weapon_damage?: string;
  armor_rating?: number;
  created_at: string;
}

export interface InventoryItem {
  id: number;
  character_id: number;
  item_id: number;
  item: Item;
  quantity: number;
  equipped: boolean;
  equipped_slot?: string;
  created_at: string;
}

export interface RoomItem {
  id: number;
  room_id: number;
  item_id: number;
  item: Item;
  quantity: number;
  created_at: string;
}

// Equipment slot types for future use
export enum EquipmentSlot {
  MAIN_HAND = 'main_hand',
  OFF_HAND = 'off_hand', 
  ARMOR = 'armor',
  HELMET = 'helmet',
  BOOTS = 'boots',
  GLOVES = 'gloves',
  RING_1 = 'ring_1',
  RING_2 = 'ring_2',
  AMULET = 'amulet',
  CLOAK = 'cloak'
}

// Carrying capacity calculation types
export interface CarryingCapacityInfo {
  currentWeight: number;
  maxCapacity: number;
  encumbranceLevel: EncumbranceLevel;
}

export enum EncumbranceLevel {
  UNENCUMBERED = 'unencumbered',
  LIGHTLY_ENCUMBERED = 'lightly encumbered', 
  HEAVILY_ENCUMBERED = 'heavily encumbered',
  OVERLOADED = 'overloaded'
}

// Item creation types (for database insertion)
export type CreateItemData = Omit<Item, 'id' | 'created_at'>;
export type CreateInventoryItemData = Omit<InventoryItem, 'id' | 'item' | 'created_at'>;
export type CreateRoomItemData = Omit<RoomItem, 'id' | 'item' | 'created_at'>;