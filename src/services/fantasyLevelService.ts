/**
 * Fantasy Level Service
 * 
 * Handles selection and management of fantasy levels for room generation.
 * Provides 70/30 distribution between mundane and fantastical content.
 */

import { 
  FantasyLevel, 
  FantasyLevelConfig, 
  FantasyLevelContext,
  FantasyLevelSelection,
  DEFAULT_FANTASY_CONFIG 
} from '../types/fantasy';

export class FantasyLevelService {
  private config: FantasyLevelConfig;

  constructor(config: FantasyLevelConfig = DEFAULT_FANTASY_CONFIG) {
    this.config = config;
  }

  /**
   * Select a fantasy level based on probability distribution
   */
  selectFantasyLevel(regionType?: string): FantasyLevelSelection {
    const random = Math.random();
    
    // Check if region type should influence distribution
    const adjustedConfig = this.getAdjustedConfig(regionType);
    
    if (random < adjustedConfig.mundaneProbability) {
      return {
        level: FantasyLevel.MUNDANE,
        probability: adjustedConfig.mundaneProbability,
        reason: regionType 
          ? `Selected mundane for region type: ${regionType}` 
          : 'Standard mundane probability selection'
      };
    } else {
      return {
        level: FantasyLevel.FANTASTICAL,
        probability: adjustedConfig.fantasticalProbability,
        reason: regionType 
          ? `Selected fantastical for region type: ${regionType}` 
          : 'Standard fantastical probability selection'
      };
    }
  }

  /**
   * Get fantasy level context for room generation
   */
  getFantasyLevelContext(regionType?: string): FantasyLevelContext {
    const selection = this.selectFantasyLevel(regionType);
    
    return {
      level: selection.level,
      config: this.getAdjustedConfig(regionType),
      regionType
    };
  }

  /**
   * Get adjusted configuration based on region type
   * Some regions might have different fantasy distributions
   */
  private getAdjustedConfig(regionType?: string): FantasyLevelConfig {
    if (!regionType) {
      return this.config;
    }

    // Region-specific adjustments
    const adjustments = this.getRegionAdjustments(regionType);
    
    return {
      mundaneProbability: Math.max(0, Math.min(1, this.config.mundaneProbability + adjustments.mundane)),
      fantasticalProbability: Math.max(0, Math.min(1, this.config.fantasticalProbability + adjustments.fantastical))
    };
  }

  /**
   * Get region-specific adjustments to fantasy level distribution
   */
  private getRegionAdjustments(regionType: string): { mundane: number; fantastical: number } {
    const lowercaseType = regionType.toLowerCase();
    
    // Regions that should be more fantastical
    if (lowercaseType.includes('magical') || 
        lowercaseType.includes('mystical') || 
        lowercaseType.includes('enchanted') ||
        lowercaseType.includes('ancient library') ||
        lowercaseType.includes('wizard') ||
        lowercaseType.includes('temple')) {
      return { mundane: -0.2, fantastical: 0.2 }; // 50/50 split
    }
    
    // Regions that should be more mundane
    if (lowercaseType.includes('barracks') ||
        lowercaseType.includes('kitchen') ||
        lowercaseType.includes('storage') ||
        lowercaseType.includes('servant') ||
        lowercaseType.includes('guard')) {
      return { mundane: 0.1, fantastical: -0.1 }; // 80/20 split
    }
    
    // Default: no adjustment
    return { mundane: 0, fantastical: 0 };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FantasyLevelConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): FantasyLevelConfig {
    return { ...this.config };
  }

  /**
   * Validate that probabilities add up to 1
   */
  validateConfig(config: FantasyLevelConfig): boolean {
    const sum = config.mundaneProbability + config.fantasticalProbability;
    return Math.abs(sum - 1.0) < 0.001; // Allow for floating point precision
  }
}