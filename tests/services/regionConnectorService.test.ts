import { RegionConnectorService } from '../../src/services/regionConnectorService';
import { GeneratedRoom, RoomConnection } from '../../src/types/regionConcept';

describe('RegionConnectorService', () => {
  let regionConnectorService: RegionConnectorService;
  
  beforeEach(() => {
    regionConnectorService = new RegionConnectorService();
  });

  describe('connectRooms', () => {
    test('should connect all 12 rooms ensuring full connectivity', () => {
      const rooms: GeneratedRoom[] = Array.from({ length: 12 }, (_, i) => ({
        name: `Room ${i + 1}`,
        description: `This is room ${i + 1}`,
        items: [],
        characters: []
      }));

      const connections = regionConnectorService.connectRooms(rooms);

      // Should have connections (minimum spanning tree has n-1 edges, plus ~35% extra)
      expect(connections.length).toBeGreaterThan(11); // At least MST connections
      expect(connections.length).toBeLessThanOrEqual(24); // Maximum possible with 4 per room
      
      // All connections should have valid properties
      connections.forEach(connection => {
        expect(connection).toHaveProperty('fromRoomId');
        expect(connection).toHaveProperty('toRoomId');
        expect(connection).toHaveProperty('direction');
        expect(connection).toHaveProperty('name');
        
        expect(connection.fromRoomId).toBeGreaterThanOrEqual(0);
        expect(connection.fromRoomId).toBeLessThan(12);
        expect(connection.toRoomId).toBeGreaterThanOrEqual(0);
        expect(connection.toRoomId).toBeLessThan(12);
        expect(connection.fromRoomId).not.toBe(connection.toRoomId);
        expect(['north', 'south', 'east', 'west']).toContain(connection.direction);
        expect(connection.name).toBeTruthy();
      });
    });

    test('should ensure all rooms are reachable using breadth-first search', () => {
      const rooms: GeneratedRoom[] = Array.from({ length: 12 }, (_, i) => ({
        name: `Room ${i + 1}`,
        description: `This is room ${i + 1}`,
        items: [],
        characters: []
      }));

      const connections = regionConnectorService.connectRooms(rooms);
      
      // Build adjacency graph from connections
      const graph: number[][] = Array.from({ length: 12 }, () => []);
      connections.forEach(conn => {
        graph[conn.fromRoomId].push(conn.toRoomId);
        graph[conn.toRoomId].push(conn.fromRoomId); // Bidirectional
      });

      // BFS to check all rooms are reachable from room 0
      const visited = new Set<number>();
      const queue = [0];
      visited.add(0);

      while (queue.length > 0) {
        const current = queue.shift()!;
        graph[current].forEach(neighbor => {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        });
      }

      expect(visited.size).toBe(12); // All rooms should be reachable
    });

    test('should respect room connection limits (max 4 per room)', () => {
      const rooms: GeneratedRoom[] = Array.from({ length: 12 }, (_, i) => ({
        name: `Room ${i + 1}`,
        description: `This is room ${i + 1}`,
        items: [],
        characters: []
      }));

      const connections = regionConnectorService.connectRooms(rooms);

      // Count outgoing connections per room (fromRoomId)
      const outgoingCounts: number[] = new Array(12).fill(0);
      connections.forEach(conn => {
        outgoingCounts[conn.fromRoomId]++;
      });

      // Count total connections per room (both outgoing and incoming)
      const totalCounts: number[] = new Array(12).fill(0);
      connections.forEach(conn => {
        totalCounts[conn.fromRoomId]++;
        totalCounts[conn.toRoomId]++;
      });

      // No room should have more than 4 outgoing connections (NSEW limit)
      outgoingCounts.forEach((count, roomId) => {
        expect(count).toBeLessThanOrEqual(4);
      });

      // All rooms should have at least 1 total connection (incoming or outgoing)
      totalCounts.forEach((count, roomId) => {
        expect(count).toBeGreaterThan(0); // All rooms should have at least 1 connection
      });
    });

    test('should not assign conflicting directions to same room', () => {
      const rooms: GeneratedRoom[] = Array.from({ length: 12 }, (_, i) => ({
        name: `Room ${i + 1}`,
        description: `This is room ${i + 1}`,
        items: [],
        characters: []
      }));

      const connections = regionConnectorService.connectRooms(rooms);

      // Group connections by room and check for direction conflicts
      const roomDirections: { [roomId: number]: Set<string> } = {};
      
      connections.forEach(conn => {
        if (!roomDirections[conn.fromRoomId]) {
          roomDirections[conn.fromRoomId] = new Set();
        }
        
        // Each room should not have duplicate directions
        expect(roomDirections[conn.fromRoomId].has(conn.direction)).toBe(false);
        roomDirections[conn.fromRoomId].add(conn.direction);
      });

      // Verify each room uses only unique compass directions
      Object.values(roomDirections).forEach(directions => {
        expect(directions.size).toBeLessThanOrEqual(4); // Max 4 directions per room
      });
    });

    test('should create multiple paths between rooms (not just linear)', () => {
      const rooms: GeneratedRoom[] = Array.from({ length: 12 }, (_, i) => ({
        name: `Room ${i + 1}`,
        description: `This is room ${i + 1}`,
        items: [],
        characters: []
      }));

      const connections = regionConnectorService.connectRooms(rooms);

      // Should have more connections than minimum spanning tree (11)
      expect(connections.length).toBeGreaterThan(11);

      // Build adjacency list
      const graph: number[][] = Array.from({ length: 12 }, () => []);
      connections.forEach(conn => {
        graph[conn.fromRoomId].push(conn.toRoomId);
        graph[conn.toRoomId].push(conn.fromRoomId);
      });

      // Find paths from room 0 to room 11 (opposite corners)
      // There should be multiple paths possible
      const findPathCount = (start: number, end: number, visited: Set<number> = new Set()): number => {
        if (start === end) return 1;
        if (visited.has(start)) return 0;
        
        visited.add(start);
        let pathCount = 0;
        
        for (const neighbor of graph[start]) {
          pathCount += findPathCount(neighbor, end, new Set(visited));
        }
        
        return pathCount;
      };

      const pathCount = findPathCount(0, 11);
      expect(pathCount).toBeGreaterThan(1); // Multiple paths should exist
    });

    test('should generate thematic connection names', () => {
      const rooms: GeneratedRoom[] = Array.from({ length: 12 }, (_, i) => ({
        name: `Crystal Room ${i + 1}`,
        description: `This is crystal room ${i + 1}`,
        items: [],
        characters: []
      }));

      const connections = regionConnectorService.connectRooms(rooms, 'crystal');

      connections.forEach(connection => {
        expect(connection.name).toBeTruthy();
        expect(connection.name.length).toBeGreaterThan(5);
        // Should contain thematic words when theme is provided
        const name = connection.name.toLowerCase();
        const hasThematicWords = name.includes('crystal') || 
                                name.includes('through') || 
                                name.includes('archway') ||
                                name.includes('passage') ||
                                name.includes('tunnel');
        expect(hasThematicWords).toBe(true);
      });
    });

    test('should handle edge case with minimum number of rooms (3)', () => {
      const rooms: GeneratedRoom[] = Array.from({ length: 3 }, (_, i) => ({
        name: `Room ${i + 1}`,
        description: `This is room ${i + 1}`,
        items: [],
        characters: []
      }));

      const connections = regionConnectorService.connectRooms(rooms);

      // Should have at least 2 connections for minimum spanning tree
      expect(connections.length).toBeGreaterThanOrEqual(2);
      
      // All rooms should still be reachable
      const graph: number[][] = Array.from({ length: 3 }, () => []);
      connections.forEach(conn => {
        graph[conn.fromRoomId].push(conn.toRoomId);
        graph[conn.toRoomId].push(conn.fromRoomId);
      });

      // BFS connectivity check
      const visited = new Set<number>();
      const queue = [0];
      visited.add(0);

      while (queue.length > 0) {
        const current = queue.shift()!;
        graph[current].forEach(neighbor => {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        });
      }

      expect(visited.size).toBe(3);
    });
  });

  describe('validateConnectivity', () => {
    test('should return true for fully connected graph', () => {
      const connections: RoomConnection[] = [
        { fromRoomId: 0, toRoomId: 1, direction: 'north', name: 'north passage' },
        { fromRoomId: 1, toRoomId: 2, direction: 'east', name: 'east corridor' },
        { fromRoomId: 0, toRoomId: 2, direction: 'east', name: 'east archway' }
      ];

      const isConnected = regionConnectorService.validateConnectivity(connections, 3);
      expect(isConnected).toBe(true);
    });

    test('should return false for disconnected graph', () => {
      const connections: RoomConnection[] = [
        { fromRoomId: 0, toRoomId: 1, direction: 'north', name: 'north passage' },
        { fromRoomId: 2, toRoomId: 3, direction: 'south', name: 'south corridor' }
      ];

      const isConnected = regionConnectorService.validateConnectivity(connections, 4);
      expect(isConnected).toBe(false);
    });

    test('should handle empty connections', () => {
      const connections: RoomConnection[] = [];
      
      const isConnected = regionConnectorService.validateConnectivity(connections, 5);
      expect(isConnected).toBe(false);
    });

    test('should handle single room', () => {
      const connections: RoomConnection[] = [];
      
      const isConnected = regionConnectorService.validateConnectivity(connections, 1);
      expect(isConnected).toBe(true); // Single room is trivially connected
    });
  });
});