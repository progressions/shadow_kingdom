import { NLPConfig } from './unifiedNLPEngine';

/**
 * Default NLP configuration settings
 */
export const DEFAULT_NLP_CONFIG: NLPConfig = {
  enableAIFallback: true,             // Always use AI when local patterns fail
  maxProcessingTime: 3000,            // 3 second timeout for AI processing
  enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
};

/**
 * Conservative configuration - less AI usage
 */
export const CONSERVATIVE_NLP_CONFIG: NLPConfig = {
  enableAIFallback: false,            // Disable AI fallback
  maxProcessingTime: 1000,            // Shorter timeout
  enableDebugLogging: false
};

/**
 * Aggressive configuration - more AI usage
 */
export const AGGRESSIVE_NLP_CONFIG: NLPConfig = {
  enableAIFallback: true,             // Always use AI fallback
  maxProcessingTime: 5000,            // Longer timeout for complex AI processing
  enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
};

/**
 * Testing configuration - optimized for development and testing
 */
export const TESTING_NLP_CONFIG: NLPConfig = {
  enableAIFallback: process.env.AI_MOCK_MODE !== 'true', // Enable AI in non-mock mode
  maxProcessingTime: 2000,            // Quick timeout for tests
  enableDebugLogging: true            // Always enable debug in testing
};

/**
 * AI-First configuration - prioritizes AI processing for natural language
 */
export const AI_FIRST_NLP_CONFIG: NLPConfig = {
  enableAIFallback: true,             // Always use AI fallback
  maxProcessingTime: 5000,            // Give AI plenty of time
  enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
};

/**
 * Get NLP configuration based on environment
 */
export function getNLPConfig(): NLPConfig {
  const configName = process.env.NLP_CONFIG || 'ai_first';
  
  switch (configName.toLowerCase()) {
    case 'conservative':
      return CONSERVATIVE_NLP_CONFIG;
    case 'aggressive':
      return AGGRESSIVE_NLP_CONFIG;
    case 'testing':
      return TESTING_NLP_CONFIG;
    case 'ai_first':
      return AI_FIRST_NLP_CONFIG;
    case 'default':
      return DEFAULT_NLP_CONFIG;
    default:
      return AI_FIRST_NLP_CONFIG;
  }
}

/**
 * Environment variable overrides for fine-tuning
 */
export function applyEnvironmentOverrides(config: NLPConfig): NLPConfig {
  const overrides: Partial<NLPConfig> = {};
  
  
  if (process.env.NLP_ENABLE_AI_FALLBACK) {
    overrides.enableAIFallback = process.env.NLP_ENABLE_AI_FALLBACK === 'true';
  }
  
  if (process.env.NLP_MAX_PROCESSING_TIME) {
    const value = parseInt(process.env.NLP_MAX_PROCESSING_TIME);
    if (!isNaN(value)) {
      overrides.maxProcessingTime = value;
    }
  }
  
  if (process.env.NLP_DEBUG_LOGGING) {
    overrides.enableDebugLogging = process.env.NLP_DEBUG_LOGGING === 'true';
  }
  
  return { ...config, ...overrides };
}