import { 
  DEFAULT_NLP_CONFIG, 
  CONSERVATIVE_NLP_CONFIG, 
  AGGRESSIVE_NLP_CONFIG, 
  TESTING_NLP_CONFIG,
  AI_FIRST_NLP_CONFIG,
  getNLPConfig,
  applyEnvironmentOverrides
} from '../../src/nlp/config';

describe('NLP Configuration', () => {
  describe('Default Configurations', () => {
    test('should have sensible default values', () => {
      expect(DEFAULT_NLP_CONFIG.enableAIFallback).toBe(true);
      expect(DEFAULT_NLP_CONFIG.maxProcessingTime).toBe(3000);
    });

    test('should have conservative configuration', () => {
      expect(CONSERVATIVE_NLP_CONFIG.enableAIFallback).toBe(false);
      expect(CONSERVATIVE_NLP_CONFIG.maxProcessingTime).toBeLessThan(DEFAULT_NLP_CONFIG.maxProcessingTime);
    });

    test('should have aggressive configuration', () => {
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

    test('should override maxProcessingTime', () => {
      process.env.NLP_MAX_PROCESSING_TIME = '5000';
      
      const config = applyEnvironmentOverrides(DEFAULT_NLP_CONFIG);
      
      expect(config.maxProcessingTime).toBe(5000);
    });

    // Test removed - AI threshold no longer used

    test('should override AI fallback setting', () => {
      process.env.NLP_ENABLE_AI_FALLBACK = 'false';
      
      const config = applyEnvironmentOverrides(DEFAULT_NLP_CONFIG);
      
      expect(config.enableAIFallback).toBe(false);
    });

    // This test is now covered above

    test('should override debug logging', () => {
      process.env.NLP_DEBUG_LOGGING = 'true';
      
      const config = applyEnvironmentOverrides(DEFAULT_NLP_CONFIG);
      
      expect(config.enableDebugLogging).toBe(true);
    });

    test('should handle multiple overrides', () => {
      process.env.NLP_ENABLE_AI_FALLBACK = 'false';
      process.env.NLP_MAX_PROCESSING_TIME = '2000';
      process.env.NLP_DEBUG_LOGGING = 'true';
      
      const config = applyEnvironmentOverrides(DEFAULT_NLP_CONFIG);
      
      expect(config.enableAIFallback).toBe(false);
      expect(config.maxProcessingTime).toBe(2000);
      expect(config.enableDebugLogging).toBe(true);
    });

    test('should ignore invalid numeric values', () => {
      process.env.NLP_MAX_PROCESSING_TIME = 'not_a_number';
      
      const config = applyEnvironmentOverrides(DEFAULT_NLP_CONFIG);
      
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
      process.env.NLP_MAX_PROCESSING_TIME = '5000';
      
      const originalConfig = { ...DEFAULT_NLP_CONFIG };
      const config = applyEnvironmentOverrides(DEFAULT_NLP_CONFIG);
      
      expect(DEFAULT_NLP_CONFIG).toEqual(originalConfig);
      expect(config.maxProcessingTime).toBe(5000);
    });
  });

  describe('Configuration Validation', () => {
    test('should have valid configuration values', () => {
      const configs = [DEFAULT_NLP_CONFIG, CONSERVATIVE_NLP_CONFIG, AGGRESSIVE_NLP_CONFIG, TESTING_NLP_CONFIG];
      
      configs.forEach(config => {
        expect(config.maxProcessingTime).toBeGreaterThan(0);
        expect(typeof config.enableAIFallback).toBe('boolean');
      });
    });

    test('should have logical configuration relationships', () => {
      // Conservative config should disable AI fallback while others enable it
      expect(CONSERVATIVE_NLP_CONFIG.enableAIFallback).toBe(false);
      expect(DEFAULT_NLP_CONFIG.enableAIFallback).toBe(true);
      expect(AGGRESSIVE_NLP_CONFIG.enableAIFallback).toBe(true);
    });
  });
});