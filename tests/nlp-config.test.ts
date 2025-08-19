import { 
  DEFAULT_NLP_CONFIG, 
  CONSERVATIVE_NLP_CONFIG, 
  AGGRESSIVE_NLP_CONFIG, 
  TESTING_NLP_CONFIG,
  AI_FIRST_NLP_CONFIG,
  getNLPConfig,
  applyEnvironmentOverrides
} from '../src/nlp/config';

describe('NLP Configuration', () => {
  describe('Default Configurations', () => {
    test('should have sensible default values', () => {
      expect(DEFAULT_NLP_CONFIG.localConfidenceThreshold).toBe(0.7);
      expect(DEFAULT_NLP_CONFIG.aiConfidenceThreshold).toBe(0.3);
      expect(DEFAULT_NLP_CONFIG.enableAIFallback).toBe(true);
      expect(DEFAULT_NLP_CONFIG.maxProcessingTime).toBe(3000);
    });

    test('should have conservative configuration with higher thresholds', () => {
      expect(CONSERVATIVE_NLP_CONFIG.localConfidenceThreshold).toBeGreaterThan(DEFAULT_NLP_CONFIG.localConfidenceThreshold);
      expect(CONSERVATIVE_NLP_CONFIG.aiConfidenceThreshold).toBeGreaterThan(DEFAULT_NLP_CONFIG.aiConfidenceThreshold);
      expect(CONSERVATIVE_NLP_CONFIG.enableAIFallback).toBe(false);
      expect(CONSERVATIVE_NLP_CONFIG.maxProcessingTime).toBeLessThan(DEFAULT_NLP_CONFIG.maxProcessingTime);
    });

    test('should have aggressive configuration with lower thresholds', () => {
      expect(AGGRESSIVE_NLP_CONFIG.localConfidenceThreshold).toBeLessThan(DEFAULT_NLP_CONFIG.localConfidenceThreshold);
      expect(AGGRESSIVE_NLP_CONFIG.aiConfidenceThreshold).toBeLessThan(DEFAULT_NLP_CONFIG.aiConfidenceThreshold);
      expect(AGGRESSIVE_NLP_CONFIG.enableAIFallback).toBe(true);
      expect(AGGRESSIVE_NLP_CONFIG.maxProcessingTime).toBeGreaterThan(DEFAULT_NLP_CONFIG.maxProcessingTime);
    });

    test('should have testing configuration optimized for development', () => {
      expect(TESTING_NLP_CONFIG.enableDebugLogging).toBe(true);
      expect(TESTING_NLP_CONFIG.maxProcessingTime).toBeLessThan(DEFAULT_NLP_CONFIG.maxProcessingTime);
    });
  });

  describe('Configuration Selection', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    test('should return ai_first config when no environment variable is set', () => {
      delete process.env.NLP_CONFIG;
      const config = getNLPConfig();
      expect(config).toEqual(AI_FIRST_NLP_CONFIG);
    });

    test('should return conservative config when specified', () => {
      process.env.NLP_CONFIG = 'conservative';
      const config = getNLPConfig();
      expect(config).toEqual(CONSERVATIVE_NLP_CONFIG);
    });

    test('should return aggressive config when specified', () => {
      process.env.NLP_CONFIG = 'aggressive';
      const config = getNLPConfig();
      expect(config).toEqual(AGGRESSIVE_NLP_CONFIG);
    });

    test('should return testing config when specified', () => {
      process.env.NLP_CONFIG = 'testing';
      const config = getNLPConfig();
      expect(config).toEqual(TESTING_NLP_CONFIG);
    });

    test('should be case insensitive', () => {
      process.env.NLP_CONFIG = 'CONSERVATIVE';
      const config = getNLPConfig();
      expect(config).toEqual(CONSERVATIVE_NLP_CONFIG);
    });

    test('should fallback to ai_first for unknown config names', () => {
      process.env.NLP_CONFIG = 'unknown_config';
      const config = getNLPConfig();
      expect(config).toEqual(AI_FIRST_NLP_CONFIG);
    });
  });

  describe('Environment Overrides', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    test('should override local confidence threshold', () => {
      process.env.NLP_LOCAL_THRESHOLD = '0.9';
      
      const config = applyEnvironmentOverrides(DEFAULT_NLP_CONFIG);
      
      expect(config.localConfidenceThreshold).toBe(0.9);
      expect(config.aiConfidenceThreshold).toBe(DEFAULT_NLP_CONFIG.aiConfidenceThreshold);
    });

    test('should override AI confidence threshold', () => {
      process.env.NLP_AI_THRESHOLD = '0.4';
      
      const config = applyEnvironmentOverrides(DEFAULT_NLP_CONFIG);
      
      expect(config.aiConfidenceThreshold).toBe(0.4);
      expect(config.localConfidenceThreshold).toBe(DEFAULT_NLP_CONFIG.localConfidenceThreshold);
    });

    test('should override AI fallback setting', () => {
      process.env.NLP_ENABLE_AI_FALLBACK = 'false';
      
      const config = applyEnvironmentOverrides(DEFAULT_NLP_CONFIG);
      
      expect(config.enableAIFallback).toBe(false);
    });

    test('should override max processing time', () => {
      process.env.NLP_MAX_PROCESSING_TIME = '5000';
      
      const config = applyEnvironmentOverrides(DEFAULT_NLP_CONFIG);
      
      expect(config.maxProcessingTime).toBe(5000);
    });

    test('should override debug logging', () => {
      process.env.NLP_DEBUG_LOGGING = 'true';
      
      const config = applyEnvironmentOverrides(DEFAULT_NLP_CONFIG);
      
      expect(config.enableDebugLogging).toBe(true);
    });

    test('should handle multiple overrides', () => {
      process.env.NLP_LOCAL_THRESHOLD = '0.8';
      process.env.NLP_AI_THRESHOLD = '0.5';
      process.env.NLP_ENABLE_AI_FALLBACK = 'false';
      process.env.NLP_MAX_PROCESSING_TIME = '2000';
      process.env.NLP_DEBUG_LOGGING = 'true';
      
      const config = applyEnvironmentOverrides(DEFAULT_NLP_CONFIG);
      
      expect(config.localConfidenceThreshold).toBe(0.8);
      expect(config.aiConfidenceThreshold).toBe(0.5);
      expect(config.enableAIFallback).toBe(false);
      expect(config.maxProcessingTime).toBe(2000);
      expect(config.enableDebugLogging).toBe(true);
    });

    test('should ignore invalid numeric values', () => {
      process.env.NLP_LOCAL_THRESHOLD = 'invalid';
      process.env.NLP_MAX_PROCESSING_TIME = 'not_a_number';
      
      const config = applyEnvironmentOverrides(DEFAULT_NLP_CONFIG);
      
      expect(config.localConfidenceThreshold).toBe(DEFAULT_NLP_CONFIG.localConfidenceThreshold);
      expect(config.maxProcessingTime).toBe(DEFAULT_NLP_CONFIG.maxProcessingTime);
    });

    test('should handle boolean values correctly', () => {
      process.env.NLP_ENABLE_AI_FALLBACK = 'true';
      process.env.NLP_DEBUG_LOGGING = 'false';
      
      const config = applyEnvironmentOverrides(DEFAULT_NLP_CONFIG);
      
      expect(config.enableAIFallback).toBe(true);
      expect(config.enableDebugLogging).toBe(false);
    });

    test('should not modify original config object', () => {
      process.env.NLP_LOCAL_THRESHOLD = '0.9';
      
      const originalConfig = { ...DEFAULT_NLP_CONFIG };
      const config = applyEnvironmentOverrides(DEFAULT_NLP_CONFIG);
      
      expect(DEFAULT_NLP_CONFIG).toEqual(originalConfig);
      expect(config.localConfidenceThreshold).toBe(0.9);
    });
  });

  describe('Configuration Validation', () => {
    test('should have valid threshold ranges', () => {
      const configs = [DEFAULT_NLP_CONFIG, CONSERVATIVE_NLP_CONFIG, AGGRESSIVE_NLP_CONFIG, TESTING_NLP_CONFIG];
      
      configs.forEach(config => {
        expect(config.localConfidenceThreshold).toBeGreaterThanOrEqual(0);
        expect(config.localConfidenceThreshold).toBeLessThanOrEqual(1);
        expect(config.aiConfidenceThreshold).toBeGreaterThanOrEqual(0);
        expect(config.aiConfidenceThreshold).toBeLessThanOrEqual(1);
        expect(config.maxProcessingTime).toBeGreaterThan(0);
      });
    });

    test('should have logical threshold relationships', () => {
      // In most cases, local threshold should be higher than AI threshold
      // since local patterns are more reliable
      expect(DEFAULT_NLP_CONFIG.localConfidenceThreshold).toBeGreaterThanOrEqual(DEFAULT_NLP_CONFIG.aiConfidenceThreshold);
      expect(CONSERVATIVE_NLP_CONFIG.localConfidenceThreshold).toBeGreaterThanOrEqual(CONSERVATIVE_NLP_CONFIG.aiConfidenceThreshold);
    });
  });
});