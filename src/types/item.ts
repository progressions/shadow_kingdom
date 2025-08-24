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

export enum EquipmentSlot {
  HAND = 'hand',      // weapons, tools
  HEAD = 'head',      // helmets, hats
  BODY = 'body',      // armor, clothing
  FOOT = 'foot'       // boots, shoes
}

export interface Item {
  id: number;
  name: string;
  description: string;
  extended_description?: string;
  type: ItemType;
  weight: number;
  value: number;
  stackable: boolean;
  max_stack: number;
  armor_rating?: number;
  equipment_slot?: EquipmentSlot;
  is_fixed?: boolean;
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