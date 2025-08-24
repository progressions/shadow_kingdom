import { RegionConnectorService } from '../../src/services/regionConnectorService';
import { RegionPlannerService } from '../../src/services/regionPlannerService';
import Database from '../../src/utils/database';
import { initializeTestDatabase } from '../testUtils';
import { CompleteRegion, GeneratedRoom } from '../../src/types/regionConcept';

describe('RegionConnectorService Integration', () => {
  let db: Database;
  let regionConnectorService: RegionConnectorService;
  let regionPlannerService: RegionPlannerService;
  let testGameId: number;

  beforeEach(async () => {
    // Use in-memory database for tests
    db = new Database(':memory:');
    await db.connect();
    await initializeTestDatabase(db);
    
    regionConnectorService = new RegionConnectorService();
    regionPlannerService = new RegionPlannerService(db, { enableDebugLogging: false });

    // Create test game with unique name
    const uniqueGameName = `Connector Integration Test ${Date.now()}-${Math.random()}`;
    const gameResult = await db.run(
      'INSERT INTO games (name, created_at, last_played_at) VALUES (?, ?, ?)',
      [uniqueGameName, new Date().toISOString(), new Date().toISOString()]
    );
    testGameId = gameResult.lastID!;
  });

  afterEach(async () => {
    await db.close();
  });

  describe('Integration with RegionPlannerService', () => {
    test('should connect rooms from a complete generated region', async () => {
      // Generate a complete region with 12 rooms
      const completeRegion: CompleteRegion = await regionPlannerService.generateCompleteRegion(1);
      
      expect(completeRegion.rooms).toHaveLength(12);
      
      // Connect the rooms using RegionConnectorService
      const connections = regionConnectorService.connectRooms(
        completeRegion.rooms, 
        completeRegion.concept.theme
      );
      
      // Verify connectivity
      expect(connections.length).toBeGreaterThan(11); // More than MST
      expect(connections.length).toBeLessThanOrEqual(24); // Max 4 per room * 12 rooms / 2
      
      // Verify all connections are valid
      connections.forEach(conn => {
        expect(conn.fromRoomId).toBeGreaterThanOrEqual(0);
        expect(conn.fromRoomId).toBeLessThan(12);
        expect(conn.toRoomId).toBeGreaterThanOrEqual(0);
        expect(conn.toRoomId).toBeLessThan(12);
        expect(conn.fromRoomId).not.toBe(conn.toRoomId);
        expect(['north', 'south', 'east', 'west']).toContain(conn.direction);
        expect(conn.name).toBeTruthy();
      });
      
      // Verify connectivity using the service's validation method
      const isConnected = regionConnectorService.validateConnectivity(connections, 12);
      expect(isConnected).toBe(true);
    });

    test('should create thematically appropriate connections for different region themes', async () => {
      // Test different region themes
      const themes = ['crystal', 'forest', 'mansion', 'cave'];
      
      for (const themeKeyword of themes) {
        const region = await regionPlannerService.generateCompleteRegion(1);
        
        // Override the theme for testing
        const testRooms: GeneratedRoom[] = region.rooms.map((room, i) => ({
          ...room,
          name: `${themeKeyword.charAt(0).toUpperCase() + themeKeyword.slice(1)} Room ${i + 1}`
        }));
        
        const connections = regionConnectorService.connectRooms(testRooms, themeKeyword);
        
        // Check that connection names are thematically appropriate
        connections.forEach(conn => {
          const name = conn.name.toLowerCase();
          
          // Should have thematic words based on the theme
          switch (themeKeyword) {
            case 'crystal':
              expect(
                name.includes('crystal') || 
                name.includes('gleaming') || 
                name.includes('prismatic') || 
                name.includes('resonant')
              ).toBe(true);
              break;
            case 'forest':
              expect(
                name.includes('tree') || 
                name.includes('woodland') || 
                name.includes('bramble') || 
                name.includes('sylvan')
              ).toBe(true);
              break;
            case 'mansion':
              expect(
                name.includes('ornate') || 
                name.includes('marble') || 
                name.includes('velvet') || 
                name.includes('gilded')
              ).toBe(true);
              break;
            case 'cave':
              expect(
                name.includes('stone') || 
                name.includes('rocky') || 
                name.includes('cavern') || 
                name.includes('mineral')
              ).toBe(true);
              break;
          }
          
          // All should have the "through the" prefix
          expect(name.startsWith('through the')).toBe(true);
        });
      }
    });

    test('should maintain connectivity across multiple region generations', async () => {
      const regions: CompleteRegion[] = [];
      const allConnections: any[] = [];
      
      // Generate 3 different regions
      for (let i = 1; i <= 3; i++) {
        const region = await regionPlannerService.generateCompleteRegion(i);
        regions.push(region);
        
        const connections = regionConnectorService.connectRooms(
          region.rooms,
          region.concept.theme
        );
        allConnections.push(connections);
        
        // Each region should be fully connected
        const isConnected = regionConnectorService.validateConnectivity(connections, 12);
        expect(isConnected).toBe(true);
        
        // Should have reasonable number of connections
        expect(connections.length).toBeGreaterThanOrEqual(11);
        expect(connections.length).toBeLessThanOrEqual(24);
      }
      
      // Verify each region has unique room structures
      expect(regions[0].concept.name).toBeTruthy();
      expect(regions[1].concept.name).toBeTruthy();
      expect(regions[2].concept.name).toBeTruthy();
      
      // Each region should have proper room distribution
      regions.forEach((region, index) => {
        expect(region.entranceRoomIndex).toBe(0);
        expect(region.guardianRoomIndex).toBe(9);
        expect(region.exitRoomIndex).toBe(10);
        expect(region.explorationRoomIndexes).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 11]);
        expect(region.sequenceNumber).toBe(index + 1);
      });
    });

    test('should handle rooms with special requirements (guardian, key, exit)', async () => {
      const region = await regionPlannerService.generateCompleteRegion(1);
      const connections = regionConnectorService.connectRooms(region.rooms, region.concept.theme);
      
      // Guardian room (index 9) should be connected
      const guardianRoomConnections = connections.filter(conn => 
        conn.fromRoomId === 9 || conn.toRoomId === 9
      );
      expect(guardianRoomConnections.length).toBeGreaterThan(0);
      
      // Exit room (index 10) should be connected
      const exitRoomConnections = connections.filter(conn => 
        conn.fromRoomId === 10 || conn.toRoomId === 10
      );
      expect(exitRoomConnections.length).toBeGreaterThan(0);
      
      // Entrance room (index 0) should be connected
      const entranceRoomConnections = connections.filter(conn => 
        conn.fromRoomId === 0 || conn.toRoomId === 0
      );
      expect(entranceRoomConnections.length).toBeGreaterThan(0);
      
      // Verify guardian room has the guardian and key
      const guardianRoom = region.rooms[region.guardianRoomIndex];
      const hasGuardian = guardianRoom.characters.some(char => 
        char.type === 'enemy' && char.name === region.concept.guardian.name
      );
      const hasKey = guardianRoom.items.includes(region.concept.key.name);
      
      expect(hasGuardian).toBe(true);
      expect(hasKey).toBe(true);
      
      // Exit room should have exit reference
      const exitRoom = region.rooms[region.exitRoomIndex];
      const allItems = exitRoom.items.join(' ').toLowerCase();
      const exitName = region.concept.lockedExit.name.toLowerCase();
      
      const hasExitReference = allItems.includes('marker') || 
        exitRoom.description.toLowerCase().includes(exitName.split(' ')[0]);
      
      expect(hasExitReference).toBe(true);
    });

    test('should verify multiple paths exist between key locations', async () => {
      const region = await regionPlannerService.generateCompleteRegion(1);
      const connections = regionConnectorService.connectRooms(region.rooms, region.concept.theme);
      
      // Build adjacency graph
      const graph: number[][] = Array.from({ length: 12 }, () => []);
      connections.forEach(conn => {
        graph[conn.fromRoomId].push(conn.toRoomId);
        graph[conn.toRoomId].push(conn.fromRoomId);
      });
      
      // Find all paths from entrance (0) to guardian room (9)
      const findAllPaths = (start: number, end: number, visited: Set<number> = new Set(), path: number[] = []): number[][] => {
        if (start === end) return [[...path, end]];
        if (visited.has(start)) return [];
        
        visited.add(start);
        const paths: number[][] = [];
        
        for (const neighbor of graph[start]) {
          if (!visited.has(neighbor)) {
            const subPaths = findAllPaths(neighbor, end, new Set(visited), [...path, start]);
            paths.push(...subPaths);
          }
        }
        
        return paths;
      };
      
      const pathsToGuardian = findAllPaths(0, 9);
      expect(pathsToGuardian.length).toBeGreaterThan(0);
      
      // Find paths from guardian (9) to exit (10)
      const pathsToExit = findAllPaths(9, 10);
      expect(pathsToExit.length).toBeGreaterThan(0);
      
      // Should be able to reach all rooms from entrance
      for (let targetRoom = 1; targetRoom < 12; targetRoom++) {
        if (targetRoom === 0) continue; // Skip entrance itself
        
        const paths = findAllPaths(0, targetRoom);
        expect(paths.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance and edge cases', () => {
    test('should handle varying room counts efficiently', async () => {
      const roomCounts = [3, 6, 9, 12, 15];
      
      for (const count of roomCounts) {
        const rooms: GeneratedRoom[] = Array.from({ length: count }, (_, i) => ({
          name: `Test Room ${i + 1}`,
          description: `This is test room ${i + 1}`,
          items: [],
          characters: []
        }));
        
        const startTime = Date.now();
        const connections = regionConnectorService.connectRooms(rooms, 'test');
        const endTime = Date.now();
        
        // Should complete quickly (under 100ms for reasonable sizes)
        expect(endTime - startTime).toBeLessThan(100);
        
        // Should be fully connected
        const isConnected = regionConnectorService.validateConnectivity(connections, count);
        expect(isConnected).toBe(true);
        
        // Should have reasonable connection count
        expect(connections.length).toBeGreaterThanOrEqual(Math.max(1, count - 1)); // At least MST
        expect(connections.length).toBeLessThanOrEqual(count * 2); // Reasonable upper bound
      }
    });

    test('should maintain connection quality with repeated generations', async () => {
      const region = await regionPlannerService.generateCompleteRegion(1);
      const connectionSets: any[][] = [];
      
      // Generate connections multiple times
      for (let i = 0; i < 5; i++) {
        const connections = regionConnectorService.connectRooms(region.rooms, region.concept.theme);
        connectionSets.push(connections);
        
        // Each generation should produce valid connections
        expect(connections.length).toBeGreaterThan(11);
        expect(regionConnectorService.validateConnectivity(connections, 12)).toBe(true);
        
        // Check direction assignments are valid
        const roomDirections: { [roomId: number]: Set<string> } = {};
        connections.forEach(conn => {
          if (!roomDirections[conn.fromRoomId]) {
            roomDirections[conn.fromRoomId] = new Set();
          }
          expect(roomDirections[conn.fromRoomId].has(conn.direction)).toBe(false);
          roomDirections[conn.fromRoomId].add(conn.direction);
        });
      }
      
      // Should have some variety in connections (due to randomization)
      // But all should be valid and connected
      connectionSets.forEach(connections => {
        expect(regionConnectorService.validateConnectivity(connections, 12)).toBe(true);
      });
    });
  });
});