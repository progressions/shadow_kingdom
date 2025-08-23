import Database from '../../src/utils/database';
import { initializeDatabase } from '../../src/utils/initDb';
import { RegionPlannerService } from '../../src/services/regionPlannerService';
import { RegionConcept } from '../../src/types/regionConcept';
import { GrokClient } from '../../src/ai/grokClient';

describe('RegionPlannerService', () => {
  let db: Database;
  let regionPlannerService: RegionPlannerService;
  let testGameId: number;

  beforeEach(async () => {
    // Use in-memory database for tests
    db = new Database(':memory:');
    await db.connect();
    await initializeDatabase(db);
    
    regionPlannerService = new RegionPlannerService(db, { enableDebugLogging: false });

    // Create test game with unique name
    const uniqueGameName = `Test Game ${Date.now()}-${Math.random()}`;
    const gameResult = await db.run(
      'INSERT INTO games (name, created_at, last_played_at) VALUES (?, ?, ?)',
      [uniqueGameName, new Date().toISOString(), new Date().toISOString()]
    );
    testGameId = gameResult.lastID!;
  });

  afterEach(async () => {
    await db.close();
  });

  describe('generateRegionConcept', () => {
    test('should generate a valid region concept structure', async () => {
      const concept = await regionPlannerService.generateRegionConcept();
      
      // Verify the JSON structure matches expected format exactly
      expect(concept).toHaveProperty('name');
      expect(concept).toHaveProperty('theme');
      expect(concept).toHaveProperty('atmosphere');
      expect(concept).toHaveProperty('history');
      expect(concept).toHaveProperty('guardian');
      expect(concept).toHaveProperty('key');
      expect(concept).toHaveProperty('lockedExit');
      expect(concept).toHaveProperty('suggestedElements');
      
      // Verify guardian structure
      expect(concept.guardian).toHaveProperty('name');
      expect(concept.guardian).toHaveProperty('description');
      expect(concept.guardian).toHaveProperty('personality');
      
      // Verify key structure
      expect(concept.key).toHaveProperty('name');
      expect(concept.key).toHaveProperty('description');
      
      // Verify locked exit structure
      expect(concept.lockedExit).toHaveProperty('name');
      expect(concept.lockedExit).toHaveProperty('description');
      
      // Verify suggested elements is an array
      expect(Array.isArray(concept.suggestedElements)).toBe(true);
      expect(concept.suggestedElements.length).toBeGreaterThan(0);
      
      // Verify all required string fields are non-empty
      expect(concept.name.trim()).not.toBe('');
      expect(concept.theme.trim()).not.toBe('');
      expect(concept.atmosphere.trim()).not.toBe('');
      expect(concept.history.trim()).not.toBe('');
      expect(concept.guardian.name.trim()).not.toBe('');
      expect(concept.guardian.description.trim()).not.toBe('');
      expect(concept.guardian.personality.trim()).not.toBe('');
      expect(concept.key.name.trim()).not.toBe('');
      expect(concept.key.description.trim()).not.toBe('');
      expect(concept.lockedExit.name.trim()).not.toBe('');
      expect(concept.lockedExit.description.trim()).not.toBe('');
    });

    test('should generate varied region concepts', async () => {
      const concepts: RegionConcept[] = [];
      
      // Generate 5 different region concepts
      for (let i = 0; i < 5; i++) {
        const concept = await regionPlannerService.generateRegionConcept();
        concepts.push(concept);
      }
      
      expect(concepts).toHaveLength(5);
      
      // With the mock AI implementation, we should get varied concepts
      // Each concept should be valid
      concepts.forEach(concept => {
        expect(concept.name).toBeTruthy();
        expect(concept.theme).toBeTruthy();
        expect(concept.guardian.name).toBeTruthy();
        expect(concept.key.name).toBeTruthy();
        expect(concept.lockedExit.name).toBeTruthy();
      });
      
      // Since we're using mock data with random selection, we might get variety
      // At minimum, verify that all concepts are valid structures
      const names = concepts.map(c => c.name);
      expect(names.every(name => typeof name === 'string' && name.length > 0)).toBe(true);
    });

    test('should generate thematically coherent guardian, key, and exit', async () => {
      const concept = await regionPlannerService.generateRegionConcept();
      
      // Verify that guardian, key, and locked exit all match the region theme
      const theme = concept.theme.toLowerCase();
      const guardianName = concept.guardian.name.toLowerCase();
      const guardianDesc = concept.guardian.description.toLowerCase();
      const keyName = concept.key.name.toLowerCase();
      const keyDesc = concept.key.description.toLowerCase();
      const exitName = concept.lockedExit.name.toLowerCase();
      const exitDesc = concept.lockedExit.description.toLowerCase();
      
      // Test thematic coherence for different possible concepts
      if (theme.includes('crystal') || theme.includes('mine')) {
        // Crystal Caverns theme
        expect(guardianName.includes('crystal') || guardianDesc.includes('crystal')).toBe(true);
        expect(keyName.includes('prism') || keyName.includes('crystal') || keyDesc.includes('crystal')).toBe(true);
        expect(exitName.includes('resonance') || exitName.includes('gate') || exitDesc.includes('crystal')).toBe(true);
        
        const elementsString = concept.suggestedElements.join(' ').toLowerCase();
        expect(
          elementsString.includes('mining') || 
          elementsString.includes('crystal') || 
          elementsString.includes('underground')
        ).toBe(true);
      } else if (theme.includes('observatory') || theme.includes('celestial')) {
        // Observatory theme
        expect(
          guardianName.includes('astronomer') || guardianName.includes('star') ||
          guardianDesc.includes('star') || guardianDesc.includes('cosmic')
        ).toBe(true);
        expect(
          keyName.includes('astrolabe') || keyDesc.includes('celestial') || keyDesc.includes('star')
        ).toBe(true);
      } else if (theme.includes('cathedral') || theme.includes('aquatic')) {
        // Drowned Cathedral theme
        expect(
          guardianName.includes('tide') || guardianName.includes('priest') ||
          guardianDesc.includes('barnacle') || guardianDesc.includes('water')
        ).toBe(true);
        expect(
          keyName.includes('pearl') || keyDesc.includes('pearl') || keyDesc.includes('sacred')
        ).toBe(true);
      }
      
      // All elements should be non-empty and descriptive
      expect(concept.guardian.personality.length).toBeGreaterThan(10);
      expect(concept.key.description.length).toBeGreaterThan(10);
      expect(concept.lockedExit.description.length).toBeGreaterThan(10);
      
      // Verify suggested elements array has reasonable content
      expect(concept.suggestedElements.length).toBeGreaterThan(2);
      expect(concept.suggestedElements.every(element => element.trim().length > 0)).toBe(true);
    });

    test('should handle AI generation failures gracefully', async () => {
      // Create a service instance that would fail AI generation
      const failingService = new RegionPlannerService(db, { enableDebugLogging: false });
      
      // Since we're using mock mode, this won't actually fail yet
      // But we should still be able to generate a fallback concept
      const concept = await failingService.generateRegionConcept();
      
      // Should still return a valid structure even if AI fails
      expect(concept).toHaveProperty('name');
      expect(concept).toHaveProperty('theme');
      expect(concept).toHaveProperty('guardian');
      expect(concept).toHaveProperty('key');
      expect(concept).toHaveProperty('lockedExit');
      expect(concept).toHaveProperty('suggestedElements');
      
      // This test will become more meaningful when we implement real AI calls
      expect(concept.name).toBeTruthy();
    });
  });
});