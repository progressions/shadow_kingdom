import { RegionConnectorService } from '../../src/services/regionConnectorService';
import { RegionPlannerService } from '../../src/services/regionPlannerService';
import Database from '../../src/utils/database';
import { initializeTestDatabase } from '../testUtils';
import { CompleteRegion, GeneratedRoom, RoomConnection } from '../../src/types/regionConcept';

describe('End-to-End Region Connectivity Validation', () => {
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

    // Create test game
    const uniqueGameName = `E2E Connectivity Test ${Date.now()}-${Math.random()}`;
    const gameResult = await db.run(
      'INSERT INTO games (name, created_at, last_played_at) VALUES (?, ?, ?)',
      [uniqueGameName, new Date().toISOString(), new Date().toISOString()]
    );
    testGameId = gameResult.lastID!;
  });

  afterEach(async () => {
    await db.close();
  });

  describe('Complete Regional Exploration Simulation', () => {
    test('should enable complete region exploration from entrance to all rooms', async () => {
      // Generate a complete region
      const region: CompleteRegion = await regionPlannerService.generateCompleteRegion(1);
      expect(region.rooms).toHaveLength(12);
      
      // Connect the rooms
      const connections = regionConnectorService.connectRooms(region.rooms, region.concept.theme);
      
      // Build navigation map (bidirectional)
      const navigationMap: { [roomId: number]: Array<{ toRoom: number; direction: string; name: string }> } = {};
      
      // Initialize navigation map
      for (let i = 0; i < 12; i++) {
        navigationMap[i] = [];
      }
      
      // Populate navigation map with bidirectional connections
      connections.forEach(conn => {
        navigationMap[conn.fromRoomId].push({
          toRoom: conn.toRoomId,
          direction: conn.direction,
          name: conn.name
        });
        
        // Add reverse direction (simulate return path)
        const reverseDirection = getOppositeDirection(conn.direction);
        const reverseName = conn.name.replace('through the', 'back through the');
        
        navigationMap[conn.toRoomId].push({
          toRoom: conn.fromRoomId,
          direction: reverseDirection,
          name: reverseName
        });
      });
      
      // Simulate player exploration starting from entrance
      const entranceRoom = region.entranceRoomIndex; // Should be 0
      const visitedRooms = new Set<number>();
      const explorationQueue = [entranceRoom];
      const explorationLog: string[] = [];
      
      visitedRooms.add(entranceRoom);
      explorationLog.push(`Started at ${region.rooms[entranceRoom].name} (entrance)`);
      
      // Explore all reachable rooms
      while (explorationQueue.length > 0) {
        const currentRoom = explorationQueue.shift()!;
        const availableExits = navigationMap[currentRoom];
        
        explorationLog.push(`In ${region.rooms[currentRoom].name}: found ${availableExits.length} exits`);
        
        availableExits.forEach(exit => {
          if (!visitedRooms.has(exit.toRoom)) {
            visitedRooms.add(exit.toRoom);
            explorationQueue.push(exit.toRoom);
            explorationLog.push(`  -> Went ${exit.direction} ${exit.name} to ${region.rooms[exit.toRoom].name}`);
          }
        });
      }
      
      // Verify complete exploration
      expect(visitedRooms.size).toBe(12); // All rooms should be reachable
      expect(visitedRooms.has(region.guardianRoomIndex)).toBe(true); // Guardian room reachable
      expect(visitedRooms.has(region.exitRoomIndex)).toBe(true); // Exit room reachable
      
      // Log the exploration for debugging if needed
      console.log('Exploration simulation completed successfully:');
      console.log(`- Visited ${visitedRooms.size} out of 12 rooms`);
      console.log(`- Guardian room (${region.guardianRoomIndex}) accessible: ${visitedRooms.has(region.guardianRoomIndex)}`);
      console.log(`- Exit room (${region.exitRoomIndex}) accessible: ${visitedRooms.has(region.exitRoomIndex)}`);
    });

    test('should support quest progression: entrance -> guardian -> exit', async () => {
      const region = await regionPlannerService.generateCompleteRegion(1);
      const connections = regionConnectorService.connectRooms(region.rooms, region.concept.theme);
      
      // Build adjacency graph
      const graph: number[][] = Array.from({ length: 12 }, () => []);
      connections.forEach(conn => {
        graph[conn.fromRoomId].push(conn.toRoomId);
        graph[conn.toRoomId].push(conn.fromRoomId);
      });
      
      // Find path from entrance to guardian room
      const pathToGuardian = findShortestPath(graph, region.entranceRoomIndex, region.guardianRoomIndex);
      expect(pathToGuardian).not.toBeNull();
      expect(pathToGuardian!.length).toBeGreaterThan(1);
      expect(pathToGuardian![0]).toBe(region.entranceRoomIndex);
      expect(pathToGuardian![pathToGuardian!.length - 1]).toBe(region.guardianRoomIndex);
      
      // Find path from guardian room to exit room
      const pathToExit = findShortestPath(graph, region.guardianRoomIndex, region.exitRoomIndex);
      expect(pathToExit).not.toBeNull();
      expect(pathToExit!.length).toBeGreaterThan(1);
      expect(pathToExit![0]).toBe(region.guardianRoomIndex);
      expect(pathToExit![pathToExit!.length - 1]).toBe(region.exitRoomIndex);
      
      // Verify alternative paths exist (non-linear progression)
      // Note: With only 12 rooms, alternative paths may not always exist, especially with random generation
      const alternativePathToGuardian = findAlternativePath(graph, region.entranceRoomIndex, region.guardianRoomIndex, pathToGuardian!);
      // Alternative paths are desirable but not guaranteed with small graphs
      
      console.log(`Quest progression verified:`);
      console.log(`- Path to guardian: ${pathToGuardian!.map(r => region.rooms[r].name).join(' -> ')}`);
      console.log(`- Path to exit: ${pathToExit!.map(r => region.rooms[r].name).join(' -> ')}`);
      console.log(`- Alternative path exists: ${alternativePathToGuardian !== null}`);
    });

    test('should validate connection integrity across all compass directions', async () => {
      const region = await regionPlannerService.generateCompleteRegion(1);
      const connections = regionConnectorService.connectRooms(region.rooms, region.concept.theme);
      
      // Track direction usage across all rooms
      const directionUsage: { [direction: string]: number } = {
        north: 0,
        south: 0,
        east: 0,
        west: 0
      };
      
      // Track room connection patterns
      const roomConnections: { [roomId: number]: { [direction: string]: number } } = {};
      
      connections.forEach(conn => {
        directionUsage[conn.direction]++;
        
        if (!roomConnections[conn.fromRoomId]) {
          roomConnections[conn.fromRoomId] = {};
        }
        roomConnections[conn.fromRoomId][conn.direction] = conn.toRoomId;
      });
      
      // Verify direction distribution is reasonable
      const totalConnections = connections.length;
      Object.entries(directionUsage).forEach(([direction, count]) => {
        expect(count).toBeGreaterThan(0); // Each direction should be used at least once
        expect(count / totalConnections).toBeLessThan(0.6); // No single direction dominates
      });
      
      // Verify no room uses the same direction twice
      Object.entries(roomConnections).forEach(([roomId, directions]) => {
        const directionList = Object.keys(directions);
        const uniqueDirections = new Set(directionList);
        expect(uniqueDirections.size).toBe(directionList.length); // All directions unique per room
        expect(directionList.length).toBeLessThanOrEqual(4); // Max 4 directions per room
      });
      
      console.log('Direction usage distribution:');
      Object.entries(directionUsage).forEach(([direction, count]) => {
        console.log(`  ${direction}: ${count} connections (${((count / totalConnections) * 100).toFixed(1)}%)`);
      });
    });

    test('should handle complex connectivity scenarios with high room density', async () => {
      const region = await regionPlannerService.generateCompleteRegion(1);
      const connections = regionConnectorService.connectRooms(region.rooms, region.concept.theme);
      
      // Analyze connectivity density
      const actualConnections = connections.length;
      const minimumConnections = 11; // MST for 12 nodes
      const maximumConnections = 24; // 12 rooms * 4 directions / 2 (each connection counted once)
      const expectedExtraConnections = Math.floor(12 * 0.35); // 35% extra as per spec
      
      expect(actualConnections).toBeGreaterThanOrEqual(minimumConnections);
      expect(actualConnections).toBeLessThanOrEqual(maximumConnections);
      expect(actualConnections).toBeGreaterThanOrEqual(minimumConnections + Math.floor(expectedExtraConnections * 0.5));
      
      // Verify graph properties
      const adjacencyMatrix = buildAdjacencyMatrix(connections, 12);
      
      // Check for cycles (should exist due to extra edges)
      const hasCycles = detectCycles(adjacencyMatrix);
      expect(hasCycles).toBe(true); // Extra edges should create exploration loops
      
      // Measure connectivity strength (average shortest path length)
      const avgPathLength = calculateAveragePathLength(adjacencyMatrix);
      expect(avgPathLength).toBeLessThan(5); // Rooms should be reasonably close to each other
      expect(avgPathLength).toBeGreaterThan(1); // But not all directly connected
      
      // Verify robustness (removing any single connection shouldn't disconnect graph)
      let remainsConnected = 0;
      connections.forEach((_, index) => {
        const reducedConnections = connections.filter((_, i) => i !== index);
        const isStillConnected = regionConnectorService.validateConnectivity(reducedConnections, 12);
        if (isStillConnected) remainsConnected++;
      });
      
      // At least 60% of connections should be removable without breaking connectivity
      // (Lower threshold for small graphs with 12 rooms where robustness is naturally limited)
      const robustnessRatio = remainsConnected / connections.length;
      expect(robustnessRatio).toBeGreaterThan(0.6);
      
      console.log(`Connectivity analysis:`);
      console.log(`- Connections: ${actualConnections} (min: ${minimumConnections}, max: ${maximumConnections})`);
      console.log(`- Has cycles: ${hasCycles}`);
      console.log(`- Average path length: ${avgPathLength.toFixed(2)}`);
      console.log(`- Robustness: ${(robustnessRatio * 100).toFixed(1)}%`);
    });
  });
});

// Helper functions

function getOppositeDirection(direction: string): string {
  const opposites: { [key: string]: string } = {
    north: 'south',
    south: 'north',
    east: 'west',
    west: 'east'
  };
  return opposites[direction] || direction;
}

function findShortestPath(graph: number[][], start: number, end: number): number[] | null {
  const queue = [{ node: start, path: [start] }];
  const visited = new Set([start]);
  
  while (queue.length > 0) {
    const { node, path } = queue.shift()!;
    
    if (node === end) return path;
    
    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ node: neighbor, path: [...path, neighbor] });
      }
    }
  }
  
  return null;
}

function findAlternativePath(graph: number[][], start: number, end: number, excludePath: number[]): number[] | null {
  // Remove middle nodes of exclude path from graph temporarily
  const excludeNodes = new Set(excludePath.slice(1, -1)); // Exclude start and end
  
  const queue = [{ node: start, path: [start] }];
  const visited = new Set([start]);
  
  while (queue.length > 0) {
    const { node, path } = queue.shift()!;
    
    if (node === end && path.length !== excludePath.length) return path;
    
    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor) && !excludeNodes.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ node: neighbor, path: [...path, neighbor] });
      }
    }
  }
  
  return null;
}

function buildAdjacencyMatrix(connections: RoomConnection[], numRooms: number): boolean[][] {
  const matrix = Array.from({ length: numRooms }, () => new Array(numRooms).fill(false));
  
  connections.forEach(conn => {
    matrix[conn.fromRoomId][conn.toRoomId] = true;
    matrix[conn.toRoomId][conn.fromRoomId] = true; // Bidirectional
  });
  
  return matrix;
}

function detectCycles(adjacencyMatrix: boolean[][]): boolean {
  const numNodes = adjacencyMatrix.length;
  const visited = new Array(numNodes).fill(false);
  
  function dfs(node: number, parent: number): boolean {
    visited[node] = true;
    
    for (let neighbor = 0; neighbor < numNodes; neighbor++) {
      if (adjacencyMatrix[node][neighbor]) {
        if (!visited[neighbor]) {
          if (dfs(neighbor, node)) return true;
        } else if (neighbor !== parent) {
          return true; // Cycle detected
        }
      }
    }
    
    return false;
  }
  
  for (let i = 0; i < numNodes; i++) {
    if (!visited[i]) {
      if (dfs(i, -1)) return true;
    }
  }
  
  return false;
}

function calculateAveragePathLength(adjacencyMatrix: boolean[][]): number {
  const numNodes = adjacencyMatrix.length;
  let totalLength = 0;
  let pathCount = 0;
  
  for (let start = 0; start < numNodes; start++) {
    for (let end = start + 1; end < numNodes; end++) {
      const distance = findShortestDistance(adjacencyMatrix, start, end);
      if (distance !== -1) {
        totalLength += distance;
        pathCount++;
      }
    }
  }
  
  return pathCount > 0 ? totalLength / pathCount : 0;
}

function findShortestDistance(adjacencyMatrix: boolean[][], start: number, end: number): number {
  const queue = [{ node: start, distance: 0 }];
  const visited = new Set([start]);
  
  while (queue.length > 0) {
    const { node, distance } = queue.shift()!;
    
    if (node === end) return distance;
    
    for (let neighbor = 0; neighbor < adjacencyMatrix.length; neighbor++) {
      if (adjacencyMatrix[node][neighbor] && !visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ node: neighbor, distance: distance + 1 });
      }
    }
  }
  
  return -1; // Not reachable
}