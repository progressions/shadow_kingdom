import Database from '../../src/utils/database';
import { initializeDatabase } from '../../src/utils/initDb';
import { RegionPlannerService } from '../../src/services/regionPlannerService';
import { RegionConcept, GeneratedRoom, CompleteRegion } from '../../src/types/regionConcept';
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

  describe('generateRoom', () => {
    let testConcept: RegionConcept;

    beforeEach(async () => {
      // Generate a concept to use for room generation tests
      testConcept = await regionPlannerService.generateRegionConcept();
    });

    test('should generate valid room structure', async () => {
      const room = await regionPlannerService.generateRoom({
        concept: testConcept
      });
      
      // Verify the JSON structure matches expected format
      expect(room).toHaveProperty('name');
      expect(room).toHaveProperty('description');
      expect(room).toHaveProperty('items');
      expect(room).toHaveProperty('characters');
      
      // Verify all required fields are non-empty
      expect(room.name.trim()).not.toBe('');
      expect(room.description.trim()).not.toBe('');
      
      // Verify arrays are present
      expect(Array.isArray(room.items)).toBe(true);
      expect(Array.isArray(room.characters)).toBe(true);
      
      // Verify characters have correct structure
      room.characters.forEach(character => {
        expect(character).toHaveProperty('name');
        expect(character).toHaveProperty('type');
        expect(character).toHaveProperty('description');
        expect(['npc', 'enemy']).toContain(character.type);
        expect(character.name.trim()).not.toBe('');
        expect(character.description.trim()).not.toBe('');
      });
    });

    test('should generate room with guardian enemy and key when requested', async () => {
      const room = await regionPlannerService.generateRoom({
        concept: testConcept,
        includeGuardian: true,
        includeKey: true
      });
      
      // Room should include the region's guardian as an enemy
      const guardianCharacter = room.characters.find(char => 
        char.type === 'enemy' && char.name === testConcept.guardian.name
      );
      expect(guardianCharacter).toBeDefined();
      expect(guardianCharacter?.description).toBe(testConcept.guardian.description);
      
      // Room should include the region's key
      expect(room.items).toContain(testConcept.key.name);
    });

    test('should generate room with locked exit reference when requested', async () => {
      const room = await regionPlannerService.generateRoom({
        concept: testConcept,
        includeLockedExit: true
      });
      
      // Room should include a reference to the locked exit
      const allItems = room.items.join(' ').toLowerCase();
      const exitName = testConcept.lockedExit.name.toLowerCase();
      
      // Should have some reference to the exit (either in items or description)
      const hasExitReference = allItems.includes('marker') || 
        room.description.toLowerCase().includes(exitName.split(' ')[0]);
      
      expect(hasExitReference).toBe(true);
    });

    test('should generate rooms with thematic coherence', async () => {
      const rooms: GeneratedRoom[] = [];
      
      // Generate multiple rooms from the same concept with different requirements
      const roomConfigs = [
        { concept: testConcept },
        { concept: testConcept, includeKey: true },
        { concept: testConcept, includeGuardian: true },
        { concept: testConcept, includeLockedExit: true }
      ];
      
      for (const config of roomConfigs) {
        const room = await regionPlannerService.generateRoom(config);
        rooms.push(room);
      }
      
      // All rooms should have content that relates to the concept theme
      rooms.forEach((room, index) => {
        // Verify structure for each room
        expect(room.name).toBeTruthy();
        expect(room.description.length).toBeGreaterThan(20);
        expect(room.description.split('. ').length).toBeGreaterThan(1); // Should be 2-3 sentences
      });
      
      // Verify rooms feel distinct from each other
      const roomNames = rooms.map(r => r.name);
      const uniqueNames = new Set(roomNames);
      expect(uniqueNames.size).toBe(roomNames.length); // All names should be unique
    });

    test('should generate varied content across multiple rooms', async () => {
      const rooms: GeneratedRoom[] = [];
      
      // Generate 3 regular rooms from same concept
      for (let i = 0; i < 3; i++) {
        const room = await regionPlannerService.generateRoom({
          concept: testConcept
        });
        rooms.push(room);
      }
      
      // Rooms should have some variety in names and items
      const roomNames = rooms.map(r => r.name);
      const allItems = rooms.flatMap(r => r.items);
      const allCharacters = rooms.flatMap(r => r.characters);
      
      // With mock generation, we should get some variety
      expect(roomNames.every(name => typeof name === 'string' && name.length > 0)).toBe(true);
      expect(allItems.every(item => typeof item === 'string' && item.length > 0)).toBe(true);
      expect(allCharacters.every(char => 
        typeof char.name === 'string' && 
        char.name.length > 0 &&
        ['npc', 'enemy'].includes(char.type)
      )).toBe(true);
    });

    test('should handle adjacent rooms context', async () => {
      const adjacentRooms = ['Crystal Formation Chamber', 'Echoing Cavern Hall'];
      
      const room = await regionPlannerService.generateRoom({
        concept: testConcept,
        adjacentRooms: adjacentRooms
      });
      
      // Should still generate valid room structure
      expect(room).toHaveProperty('name');
      expect(room).toHaveProperty('description');
      expect(room).toHaveProperty('items');
      expect(room).toHaveProperty('characters');
      
      // Room should be distinct from adjacent rooms
      expect(adjacentRooms).not.toContain(room.name);
    });

    test('should handle room generation errors gracefully', async () => {
      // This test will become more meaningful when we implement real AI calls
      // For now, verify the mock implementation doesn't throw errors
      
      const room = await regionPlannerService.generateRoom({
        concept: testConcept
      });
      
      expect(room).toBeDefined();
      expect(room.name).toBeTruthy();
      expect(room.description).toBeTruthy();
      expect(room.items).toBeDefined();
      expect(room.characters).toBeDefined();
    });
  });

  describe('generateCompleteRegion', () => {
    test('should generate a complete region with exactly 12 rooms', async () => {
      const region = await regionPlannerService.generateCompleteRegion(1);
      
      // Verify basic structure
      expect(region).toHaveProperty('concept');
      expect(region).toHaveProperty('rooms');
      expect(region).toHaveProperty('sequenceNumber');
      expect(region).toHaveProperty('entranceRoomIndex');
      expect(region).toHaveProperty('guardianRoomIndex');
      expect(region).toHaveProperty('exitRoomIndex');
      expect(region).toHaveProperty('explorationRoomIndexes');
      
      // Verify exactly 12 rooms
      expect(region.rooms).toHaveLength(12);
      expect(region.sequenceNumber).toBe(1);
      
      // Verify room indexes
      expect(region.entranceRoomIndex).toBe(0);
      expect(region.guardianRoomIndex).toBe(9);
      expect(region.exitRoomIndex).toBe(10);
      expect(region.explorationRoomIndexes).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 11]);
      
      // Verify all rooms have valid structure
      region.rooms.forEach((room, index) => {
        expect(room.name).toBeTruthy();
        expect(room.description).toBeTruthy();
        expect(Array.isArray(room.items)).toBe(true);
        expect(Array.isArray(room.characters)).toBe(true);
      });
    });

    test('should generate guardian room with enemy and key', async () => {
      const region = await regionPlannerService.generateCompleteRegion(1);
      
      const guardianRoom = region.rooms[region.guardianRoomIndex];
      const concept = region.concept;
      
      // Guardian room should have the guardian enemy
      const guardianCharacter = guardianRoom.characters.find(char => 
        char.type === 'enemy' && char.name === concept.guardian.name
      );
      expect(guardianCharacter).toBeDefined();
      expect(guardianCharacter?.description).toBe(concept.guardian.description);
      
      // Guardian room should have the region key
      expect(guardianRoom.items).toContain(concept.key.name);
    });

    test('should generate exit room with locked exit reference', async () => {
      const region = await regionPlannerService.generateCompleteRegion(1);
      
      const exitRoom = region.rooms[region.exitRoomIndex];
      const concept = region.concept;
      
      // Exit room should reference the locked exit
      const allItems = exitRoom.items.join(' ').toLowerCase();
      const exitName = concept.lockedExit.name.toLowerCase();
      
      const hasExitReference = allItems.includes('marker') || 
        exitRoom.description.toLowerCase().includes(exitName.split(' ')[0]);
      
      expect(hasExitReference).toBe(true);
    });

    test('should maintain thematic consistency across all rooms', async () => {
      const region = await regionPlannerService.generateCompleteRegion(1);
      
      // All rooms should be thematically connected to the concept
      const concept = region.concept;
      const theme = concept.theme.toLowerCase();
      const atmosphere = concept.atmosphere.toLowerCase();
      
      // Verify all rooms have unique names
      const roomNames = region.rooms.map(r => r.name);
      const uniqueNames = new Set(roomNames);
      expect(uniqueNames.size).toBe(12);
      
      // Verify each room has substantial content
      region.rooms.forEach((room, index) => {
        expect(room.name.length).toBeGreaterThan(5);
        expect(room.description.length).toBeGreaterThan(20);
        expect(room.description.split('. ').length).toBeGreaterThan(1);
      });
    });

    test('should generate different regions with varied content', async () => {
      const region1 = await regionPlannerService.generateCompleteRegion(1);
      const region2 = await regionPlannerService.generateCompleteRegion(2);
      
      // Both regions should be valid regardless of content variety in mock mode
      expect(region1.sequenceNumber).toBe(1);
      expect(region2.sequenceNumber).toBe(2);
      
      // Both should have valid 12-room structure
      expect(region1.rooms).toHaveLength(12);
      expect(region2.rooms).toHaveLength(12);
      
      // Guardian and exit rooms should be in correct positions
      expect(region1.guardianRoomIndex).toBe(9);
      expect(region1.exitRoomIndex).toBe(10);
      expect(region2.guardianRoomIndex).toBe(9);
      expect(region2.exitRoomIndex).toBe(10);
      
      // Both regions should have valid concepts (content may be same in mock mode)
      expect(region1.concept.name).toBeTruthy();
      expect(region2.concept.name).toBeTruthy();
      expect(region1.concept.guardian.name).toBeTruthy();
      expect(region2.concept.guardian.name).toBeTruthy();
      expect(region1.concept.key.name).toBeTruthy();
      expect(region2.concept.key.name).toBeTruthy();
      
      // Room names within each region should be unique
      const region1Names = region1.rooms.map(r => r.name);
      const region1UniqueNames = new Set(region1Names);
      expect(region1UniqueNames.size).toBe(12);
      
      const region2Names = region2.rooms.map(r => r.name);
      const region2UniqueNames = new Set(region2Names);
      expect(region2UniqueNames.size).toBe(12);
    });

    test('should generate entrance room without special requirements', async () => {
      const region = await regionPlannerService.generateCompleteRegion(1);
      
      const entranceRoom = region.rooms[region.entranceRoomIndex];
      const concept = region.concept;
      
      // Entrance room should not have guardian or key
      const hasGuardian = entranceRoom.characters.some(char => 
        char.name === concept.guardian.name
      );
      const hasKey = entranceRoom.items.includes(concept.key.name);
      const hasExitMarker = entranceRoom.items.some(item => 
        item.toLowerCase().includes('marker')
      );
      
      expect(hasGuardian).toBe(false);
      expect(hasKey).toBe(false);
      expect(hasExitMarker).toBe(false);
    });

    test('should generate exploration rooms without special requirements', async () => {
      const region = await regionPlannerService.generateCompleteRegion(1);
      
      const concept = region.concept;
      
      // Check all exploration rooms
      region.explorationRoomIndexes.forEach(roomIndex => {
        const room = region.rooms[roomIndex];
        
        // Exploration rooms should not have guardian or key
        const hasGuardian = room.characters.some(char => 
          char.name === concept.guardian.name
        );
        const hasKey = room.items.includes(concept.key.name);
        
        expect(hasGuardian).toBe(false);
        expect(hasKey).toBe(false);
        
        // Should still have valid content
        expect(room.name).toBeTruthy();
        expect(room.description).toBeTruthy();
      });
    });

    test('should handle complete region generation errors gracefully', async () => {
      // This test will become more meaningful when we implement real AI calls
      // For now, verify the mock implementation doesn't throw errors
      
      const region = await regionPlannerService.generateCompleteRegion(5);
      
      expect(region).toBeDefined();
      expect(region.rooms).toHaveLength(12);
      expect(region.sequenceNumber).toBe(5);
      expect(region.concept).toBeDefined();
    });

    test('should generate regions with contextual awareness', async () => {
      const context = {
        gameId: testGameId,
        existingConcepts: ['The Crystal Caverns', 'The Haunted Library'],
        stylePreference: 'fantasy' as const
      };
      
      const region = await regionPlannerService.generateCompleteRegion(3, context);
      
      expect(region).toBeDefined();
      expect(region.rooms).toHaveLength(12);
      expect(region.sequenceNumber).toBe(3);
      expect(region.concept.name).toBeTruthy();
      
      // Should have all the required special rooms
      expect(region.rooms[region.guardianRoomIndex].characters.some(char => 
        char.type === 'enemy'
      )).toBe(true);
      expect(region.rooms[region.guardianRoomIndex].items).toContain(region.concept.key.name);
    });
  });
});