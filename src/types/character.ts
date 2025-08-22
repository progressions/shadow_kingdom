/**
 * Character system types for Shadow Kingdom
 * Unified system for player characters, NPCs, and enemies
 */

export enum CharacterType {
  PLAYER = 'player',
  NPC = 'npc',
  ENEMY = 'enemy'
}

export interface CharacterAttributes {
  strength: number;
  dexterity: number;
  intelligence: number;
  constitution: number;
  wisdom: number;
  charisma: number;
}

export interface Character {
  id: number;
  game_id: number;
  name: string;
  description?: string | null;   // Description for NPCs and enemies
  type: CharacterType;
  current_room_id: number | null;
  strength: number;
  dexterity: number;
  intelligence: number;
  constitution: number;
  wisdom: number;
  charisma: number;
  max_health: number | null;
  current_health: number | null;
  is_dead?: boolean | null;  // Death state for action validation
  is_hostile?: boolean | null;  // Whether this character blocks player movement
  dialogue_response?: string | null;   // Custom dialogue response
  created_at: string;
}

export interface CreateCharacterData {
  game_id: number;
  name: string;
  description?: string;        // Description for NPCs and enemies
  type?: CharacterType;
  current_room_id?: number | null;
  strength?: number;
  dexterity?: number;
  intelligence?: number;
  constitution?: number;
  wisdom?: number;
  charisma?: number;
  is_hostile?: boolean;        // Whether this character blocks player movement
  dialogue_response?: string;          // Custom dialogue response for new characters
}

/**
 * Calculate attribute modifier from attribute value
 * Standard D&D formula: (attribute - 10) / 2, rounded down
 */
export function getAttributeModifier(attributeValue: number): number {
  return Math.floor((attributeValue - 10) / 2);
}

/**
 * Calculate maximum health from constitution
 * Base formula: 10 + CON modifier
 */
export function calculateMaxHealth(constitution: number): number {
  const constitutionModifier = getAttributeModifier(constitution);
  return 10 + constitutionModifier;
}

/**
 * Validate attribute value is within acceptable range
 */
export function isValidAttributeValue(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 20;
}

/**
 * Create default character attributes (all 10s)
 */
export function getDefaultAttributes(): CharacterAttributes {
  return {
    strength: 10,
    dexterity: 10,
    intelligence: 10,
    constitution: 10,
    wisdom: 10,
    charisma: 10
  };
}