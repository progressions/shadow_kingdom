/**
 * Fantasy Level Types
 * 
 * Defines fantasy level categories for room generation to create balanced
 * distribution between mundane and fantastical content.
 */

export enum FantasyLevel {
  MUNDANE = 'mundane',
  FANTASTICAL = 'fantastical'
}

/**
 * Fantasy level distribution configuration
 */
export interface FantasyLevelConfig {
  /**
   * Probability of generating mundane rooms (0-1)
   * Default: 0.7 (70%)
   */
  mundaneProbability: number;
  
  /**
   * Probability of generating fantastical rooms (0-1)
   * Default: 0.3 (30%)
   */
  fantasticalProbability: number;
}

/**
 * Default fantasy level distribution
 */
export const DEFAULT_FANTASY_CONFIG: FantasyLevelConfig = {
  mundaneProbability: 0.7,
  fantasticalProbability: 0.3
};

/**
 * Context for fantasy level generation
 */
export interface FantasyLevelContext {
  level: FantasyLevel;
  config: FantasyLevelConfig;
  regionType?: string;
}

/**
 * Fantasy level selection result
 */
export interface FantasyLevelSelection {
  level: FantasyLevel;
  probability: number;
  reason: string;
}

/**
 * Fantasy level distribution tracking
 */
export interface FantasyLevelDistribution {
  gameId: number;
  totalRooms: number;
  mundaneCount: number;
  fantasticalCount: number;
  mundanePercentage: number;
  fantasticalPercentage: number;
}

/**
 * Fantasy level prompt templates
 */
export interface FantasyLevelPrompts {
  mundane: string;
  fantastical: string;
}

/**
 * Default prompt templates for fantasy levels
 */
export const DEFAULT_FANTASY_PROMPTS: FantasyLevelPrompts = {
  mundane: `Generate a practical, realistic room that serves a clear purpose in a medieval fantasy castle. Focus on:
- Standard architectural features and functional spaces
- Basic furnishings and practical items
- Minimal magical elements
- Grounded, believable descriptions
- Clear purpose (guard rooms, storage, hallways, chambers)`,

  fantastical: `Generate a magical, mysterious, or uniquely fantastical room that stands out. Include:
- Magical elements, enchantments, or mystical features  
- Unusual architectural details
- Mysterious artifacts or phenomena
- Memorable and atmospheric descriptions
- Elements that inspire wonder or intrigue`
};