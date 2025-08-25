import { z } from 'zod';

// Zod schemas for validation
export const WorldInfoSchema = z.object({
  name: z.string().min(1, 'World name is required'),
  description: z.string().optional(),
});

export const RegionDefinitionSchema = z.object({
  id: z.string().min(1, 'Region ID is required'),
  name: z.string().min(1, 'Region name is required'),
  theme: z.string().min(1, 'Region theme is required'),
  description: z.string().optional(),
});

export const RoomDefinitionSchema = z.object({
  id: z.string().min(1, 'Room ID is required'),
  region_id: z.string().min(1, 'Region ID is required'),
  name: z.string().min(1, 'Room name is required'),
  description: z.string().min(1, 'Room description is required'),
  extended_description: z.string().optional(),
  starting_room: z.boolean().optional().default(false),
});

export const ConnectionDefinitionSchema = z.object({
  from: z.string().min(1, 'From room ID is required'),
  to: z.string().nullable().optional(), // null for unfilled connections
  direction: z.string().min(1, 'Direction is required'),
  description: z.string().optional(),
  locked: z.boolean().optional().default(false),
  required_key: z.string().optional(),
});

export const ItemDefinitionSchema = z.object({
  id: z.string().min(1, 'Item ID is required'),
  room_id: z.string().optional(), // Optional for loot items
  name: z.string().min(1, 'Item name is required'),
  description: z.string().min(1, 'Item description is required'),
  extended_description: z.string().optional(),
  type: z.string().min(1, 'Item type is required'),
  hidden: z.boolean().optional().default(false),
  examine_hint: z.string().optional(),
  damage: z.number().optional(),
  defense: z.number().optional(),
  value: z.number().optional(),
  weight: z.number().optional().default(1),
  effect: z.string().optional(),
});

export const DialogueSchema = z.object({
  hostile: z.string().optional(),
  defeated: z.string().optional(),
  friendly: z.string().optional(),
  neutral: z.string().optional(),
});

export const CharacterDefinitionSchema = z.object({
  id: z.string().min(1, 'Character ID is required'),
  room_id: z.string().min(1, 'Room ID is required'),
  name: z.string().min(1, 'Character name is required'),
  description: z.string().min(1, 'Character description is required'),
  type: z.enum(['friendly', 'hostile', 'neutral']),
  health: z.number().optional(),
  attack: z.number().optional(),
  defense: z.number().optional(),
  behavior: z.string().optional(),
  dialogue: DialogueSchema.optional(),
  loot: z.array(ItemDefinitionSchema).optional(),
});

export const WorldDefinitionSchema = z.object({
  world: WorldInfoSchema,
  regions: z.array(RegionDefinitionSchema).min(1, 'At least one region is required'),
  rooms: z.array(RoomDefinitionSchema).min(1, 'At least one room is required'),
  connections: z.array(ConnectionDefinitionSchema),
  items: z.array(ItemDefinitionSchema).optional(),
  characters: z.array(CharacterDefinitionSchema).optional(),
});

// TypeScript types derived from schemas
export type WorldInfo = z.infer<typeof WorldInfoSchema>;
export type RegionDefinition = z.infer<typeof RegionDefinitionSchema>;
export type RoomDefinition = z.infer<typeof RoomDefinitionSchema>;
export type ConnectionDefinition = z.infer<typeof ConnectionDefinitionSchema>;
export type ItemDefinition = z.infer<typeof ItemDefinitionSchema>;
export type CharacterDefinition = z.infer<typeof CharacterDefinitionSchema>;
export type Dialogue = z.infer<typeof DialogueSchema>;
export type WorldDefinition = z.infer<typeof WorldDefinitionSchema>;

// Additional utility types
export interface WorldCreationResult {
  gameId: number;
  roomCount: number;
  regionCount: number;
  connectionCount: number;
  itemCount?: number;
  characterCount?: number;
  startingRoomId: number;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Room connectivity validation types
export interface RoomNode {
  id: string;
  connections: string[];
}

export interface ConnectivityGraph {
  [roomId: string]: RoomNode;
}

// Database creation data types
export interface DatabaseRegionData {
  gameId: number;
  name: string;
  theme: string;
  description?: string;
}

export interface DatabaseRoomData {
  gameId: number;
  regionId?: number;
  name: string;
  description: string;
  extendedDescription?: string;
  visited: boolean;
  locked: boolean;
}

export interface DatabaseConnectionData {
  gameId: number;
  fromRoomId: number;
  toRoomId?: number;
  direction: string;
  description?: string;
  locked: boolean;
  requiredKey?: string;
}

export interface DatabaseItemData {
  gameId: number;
  roomId?: number;
  name: string;
  description: string;
  extendedDescription?: string;
  type: string;
  hidden: boolean;
  examineHint?: string;
  damage?: number;
  defense?: number;
  value?: number;
  weight: number;
}

export interface DatabaseCharacterData {
  gameId: number;
  roomId?: number;
  name: string;
  description: string;
  type: string;
  health?: number;
  attack?: number;
  defense?: number;
  behavior?: string;
  dialogue?: string; // JSON string
  loot?: string; // JSON string of ItemDefinition[]
}

// Constants for validation
export const VALID_DIRECTIONS = [
  'north', 'south', 'east', 'west',
  'up', 'down',
  'northeast', 'northwest', 'southeast', 'southwest',
  'in', 'out'
] as const;

export const VALID_ITEM_TYPES = [
  'weapon', 'armor', 'consumable', 'key', 'treasure', 'book', 'tool'
] as const;

export const VALID_CHARACTER_TYPES = [
  'friendly', 'hostile', 'neutral'
] as const;