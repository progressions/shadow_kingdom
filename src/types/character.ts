/**
 * Character system types for Shadow Kingdom
 * Unified system for player characters, NPCs, and enemies
 */

export enum CharacterType {
  PLAYER = 'player',
  NPC = 'npc',
  ENEMY = 'enemy'
}

export enum CharacterSentiment {
  HOSTILE = 'hostile',
  AGGRESSIVE = 'aggressive',
  INDIFFERENT = 'indifferent',
  FRIENDLY = 'friendly',
  ALLIED = 'allied'
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
  description?: string | null;   // Brief description for NPCs and enemies
  extended_description?: string | null;   // Detailed description for examine command
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
  sentiment: CharacterSentiment; // New sentiment system
  dialogue_response?: string | null;   // Custom dialogue response
  created_at: string;
}

export interface CreateCharacterData {
  game_id: number;
  name: string;
  description?: string;        // Brief description for NPCs and enemies
  extended_description?: string;        // Detailed description for examine command
  type?: CharacterType;
  current_room_id?: number | null;
  strength?: number;
  dexterity?: number;
  intelligence?: number;
  constitution?: number;
  wisdom?: number;
  charisma?: number;
  sentiment?: CharacterSentiment; // New sentiment system
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

/**
 * Convert sentiment to numeric value for calculations
 * Range: -2 (hostile) to +2 (allied)
 */
export function getSentimentValue(sentiment: CharacterSentiment): number {
  switch (sentiment) {
    case CharacterSentiment.HOSTILE:
      return -2;
    case CharacterSentiment.AGGRESSIVE:
      return -1;
    case CharacterSentiment.INDIFFERENT:
      return 0;
    case CharacterSentiment.FRIENDLY:
      return 1;
    case CharacterSentiment.ALLIED:
      return 2;
    default:
      return 0;
  }
}

/**
 * Determine if a character with given sentiment is hostile to the player
 * Used for movement blocking and combat behavior
 */
export function isHostileToPlayer(sentiment: CharacterSentiment): boolean {
  return sentiment === CharacterSentiment.HOSTILE || sentiment === CharacterSentiment.AGGRESSIVE;
}

/**
 * Get human-readable description of sentiment level
 * Used for UI display and debugging
 */
export function getSentimentDescription(sentiment: CharacterSentiment): string {
  switch (sentiment) {
    case CharacterSentiment.HOSTILE:
      return 'Actively aggressive, attacks on sight';
    case CharacterSentiment.AGGRESSIVE:
      return 'Will fight if provoked, blocks passage';
    case CharacterSentiment.INDIFFERENT:
      return 'Neutral, allows passage';
    case CharacterSentiment.FRIENDLY:
      return 'Helpful responses, assists player';
    case CharacterSentiment.ALLIED:
      return 'Actively supports and protects player';
    default:
      return 'Unknown sentiment';
  }
}