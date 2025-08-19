import { NLPConfig } from './unifiedNLPEngine';

/**
 * Default NLP configuration settings
 */
export const DEFAULT_NLP_CONFIG: NLPConfig = {
  localConfidenceThreshold: 0.7,     // Accept local patterns with 70%+ confidence
  aiConfidenceThreshold: 0.3,        // Accept AI interpretations with 30%+ confidence
  enableAIFallback: true,             // Always use AI when local patterns fail
  maxProcessingTime: 3000,            // 3 second timeout for AI processing
  enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
};

/**
 * Conservative configuration - higher thresholds, less AI usage
 */
export const CONSERVATIVE_NLP_CONFIG: NLPConfig = {
  localConfidenceThreshold: 0.8,     // Higher threshold for local patterns
  aiConfidenceThreshold: 0.75,       // Higher threshold for AI
  enableAIFallback: false,            // Disable AI fallback
  maxProcessingTime: 1000,            // Shorter timeout
  enableDebugLogging: false
};

/**
 * Aggressive configuration - lower thresholds, more AI usage
 */
export const AGGRESSIVE_NLP_CONFIG: NLPConfig = {
  localConfidenceThreshold: 0.5,     // Lower threshold for local patterns
  aiConfidenceThreshold: 0.2,        // Lower threshold for AI
  enableAIFallback: true,             // Always use AI fallback
  maxProcessingTime: 5000,            // Longer timeout for complex AI processing
  enableDebugLogging: process.env.AI_DEBUG_LOGGING === 'true'
};

/**
 * Testing configuration - optimized for development and testing
 */
export const TESTING_NLP_CONFIG: NLPConfig = {
  localConfidenceThreshold: 0.6,     // Medium threshold for testing
  aiConfidenceThreshold: 0.5,        // Medium threshold for AI
  enableAIFallback: process.env.AI_MOCK_MODE !== 'true', // Enable AI in non-mock mode
  maxProcessingTime: 2000,            // Quick timeout for tests
  enableDebugLogging: true            // Always enable debug in testing
};

/**
 * AI-First configuration - prioritizes AI processing for natural language
 */
export const AI_FIRST_NLP_CONFIG: NLPConfig = {
  localConfidenceThreshold: 0.99,    // Extremely high threshold - almost never use local
  aiConfidenceThreshold: 0.1,        // Extremely low threshold - always trust the AI
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
  
  if (process.env.NLP_LOCAL_THRESHOLD) {
    const value = parseFloat(process.env.NLP_LOCAL_THRESHOLD);
    if (!isNaN(value)) {
      overrides.localConfidenceThreshold = value;
    }
  }
  
  if (process.env.NLP_AI_THRESHOLD) {
    const value = parseFloat(process.env.NLP_AI_THRESHOLD);
    if (!isNaN(value)) {
      overrides.aiConfidenceThreshold = value;
    }
  }
  
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