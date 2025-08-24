import { GeneratedRoom, RoomConnection } from '../types/regionConcept';

interface Edge {
  from: number;
  to: number;
  weight: number;
}

interface GraphNode {
  id: number;
  neighbors: number[];
}

export class RegionConnectorService {
  connectRooms(rooms: GeneratedRoom[], theme?: string): RoomConnection[] {
    if (rooms.length < 2) {
      return [];
    }

    // 1. Build minimum spanning tree to guarantee all rooms are reachable
    const mstEdges = this.buildMinimumSpanningTree(rooms);
    
    // 2. Add 30-40% extra edges for interesting topology
    const extraEdgeCount = Math.floor(rooms.length * 0.35);
    const allEdges = this.addAlternatePaths(mstEdges, rooms.length, extraEdgeCount);
    
    // 3. Convert graph edges to directional connections with names
    return this.generateDirectionalConnections(allEdges, theme);
  }

  private buildMinimumSpanningTree(rooms: GeneratedRoom[]): Edge[] {
    const numRooms = rooms.length;
    
    // Generate all possible edges with random weights
    const allPossibleEdges: Edge[] = [];
    for (let i = 0; i < numRooms; i++) {
      for (let j = i + 1; j < numRooms; j++) {
        allPossibleEdges.push({
          from: i,
          to: j,
          weight: Math.random()
        });
      }
    }
    
    // Sort edges by weight for Kruskal's algorithm
    allPossibleEdges.sort((a, b) => a.weight - b.weight);
    
    // Use Union-Find to detect cycles
    const parent = Array.from({ length: numRooms }, (_, i) => i);
    const rank = new Array(numRooms).fill(0);
    
    const find = (x: number): number => {
      if (parent[x] !== x) {
        parent[x] = find(parent[x]);
      }
      return parent[x];
    };
    
    const union = (x: number, y: number): boolean => {
      const rootX = find(x);
      const rootY = find(y);
      
      if (rootX === rootY) return false; // Would create cycle
      
      if (rank[rootX] < rank[rootY]) {
        parent[rootX] = rootY;
      } else if (rank[rootX] > rank[rootY]) {
        parent[rootY] = rootX;
      } else {
        parent[rootY] = rootX;
        rank[rootX]++;
      }
      
      return true;
    };
    
    // Build MST using Kruskal's algorithm
    const mstEdges: Edge[] = [];
    for (const edge of allPossibleEdges) {
      if (union(edge.from, edge.to)) {
        mstEdges.push(edge);
        if (mstEdges.length === numRooms - 1) break; // MST complete
      }
    }
    
    return mstEdges;
  }

  private addAlternatePaths(mstEdges: Edge[], numRooms: number, extraEdgeCount: number): Edge[] {
    const allEdges = [...mstEdges];
    
    // Build set of existing edges for quick lookup
    const existingEdges = new Set<string>();
    mstEdges.forEach(edge => {
      existingEdges.add(`${Math.min(edge.from, edge.to)}-${Math.max(edge.from, edge.to)}`);
    });
    
    // Track connections per room to respect 4-connection limit
    const connectionCounts = new Array(numRooms).fill(0);
    mstEdges.forEach(edge => {
      connectionCounts[edge.from]++;
      connectionCounts[edge.to]++;
    });
    
    // Generate candidate extra edges
    const candidateEdges: Edge[] = [];
    for (let i = 0; i < numRooms; i++) {
      for (let j = i + 1; j < numRooms; j++) {
        const edgeKey = `${i}-${j}`;
        if (!existingEdges.has(edgeKey) && 
            connectionCounts[i] < 4 && 
            connectionCounts[j] < 4) {
          candidateEdges.push({
            from: i,
            to: j,
            weight: Math.random()
          });
        }
      }
    }
    
    // Sort candidates and add up to extraEdgeCount
    candidateEdges.sort((a, b) => a.weight - b.weight);
    
    let addedEdges = 0;
    for (const edge of candidateEdges) {
      if (addedEdges >= extraEdgeCount) break;
      if (connectionCounts[edge.from] < 4 && connectionCounts[edge.to] < 4) {
        allEdges.push(edge);
        connectionCounts[edge.from]++;
        connectionCounts[edge.to]++;
        addedEdges++;
      }
    }
    
    return allEdges;
  }

  private generateDirectionalConnections(edges: Edge[], theme?: string): RoomConnection[] {
    const connections: RoomConnection[] = [];
    
    // Track used directions per room to avoid conflicts
    const usedDirections: { [roomId: number]: Set<string> } = {};
    
    // Available directions
    const directions: ('north' | 'south' | 'east' | 'west')[] = ['north', 'south', 'east', 'west'];
    
    // Sort edges to prioritize those involving rooms with fewer connections
    const roomConnectionCounts: { [roomId: number]: number } = {};
    edges.forEach(edge => {
      roomConnectionCounts[edge.from] = (roomConnectionCounts[edge.from] || 0) + 1;
      roomConnectionCounts[edge.to] = (roomConnectionCounts[edge.to] || 0) + 1;
    });
    
    const sortedEdges = edges.sort((a, b) => {
      const aCount = (roomConnectionCounts[a.from] || 0) + (roomConnectionCounts[a.to] || 0);
      const bCount = (roomConnectionCounts[b.from] || 0) + (roomConnectionCounts[b.to] || 0);
      return aCount - bCount; // Process edges for rooms with fewer connections first
    });
    
    sortedEdges.forEach(edge => {
      // Initialize direction tracking for rooms
      if (!usedDirections[edge.from]) {
        usedDirections[edge.from] = new Set();
      }
      if (!usedDirections[edge.to]) {
        usedDirections[edge.to] = new Set();
      }
      
      // Find available directions for from room
      const availableFromDirections = directions.filter(dir => 
        !usedDirections[edge.from].has(dir)
      );
      
      if (availableFromDirections.length === 0) {
        // If no directions available for from room, skip this edge
        // This might happen with very dense graphs
        return;
      }
      
      // Pick a random available direction
      const fromDirection = availableFromDirections[
        Math.floor(Math.random() * availableFromDirections.length)
      ];
      
      // Mark direction as used for the from room only
      // The to room will get its own connection when processed
      usedDirections[edge.from].add(fromDirection);
      
      // Generate connection name
      const connectionName = this.generateConnectionName(fromDirection, theme);
      
      connections.push({
        fromRoomId: edge.from,
        toRoomId: edge.to,
        direction: fromDirection,
        name: connectionName
      });
    });
    
    return connections;
  }

  private generateConnectionName(direction: string, theme?: string): string {
    const thematicWords = {
      crystal: ['crystal archway', 'gleaming passage', 'prismatic tunnel', 'resonant corridor'],
      cave: ['stone tunnel', 'rocky passage', 'cavern opening', 'mineral corridor'],
      forest: ['tree-lined path', 'woodland trail', 'bramble passage', 'sylvan corridor'],
      mansion: ['ornate doorway', 'marble corridor', 'velvet passage', 'gilded archway'],
      observatory: ['stellar corridor', 'cosmic pathway', 'celestial passage', 'astral tunnel'],
      cathedral: ['sacred corridor', 'vaulted passage', 'holy archway', 'divine tunnel']
    };
    
    const genericWords = ['stone archway', 'wooden door', 'iron gate', 'narrow passage', 
                         'wide corridor', 'hidden tunnel', 'ancient doorway', 'shadowy passage'];
    
    let words: string[];
    if (theme && thematicWords[theme.toLowerCase() as keyof typeof thematicWords]) {
      words = thematicWords[theme.toLowerCase() as keyof typeof thematicWords];
    } else {
      words = genericWords;
    }
    
    const selectedWord = words[Math.floor(Math.random() * words.length)];
    return `through the ${selectedWord}`;
  }

  validateConnectivity(connections: RoomConnection[], numRooms: number): boolean {
    if (numRooms <= 1) return true;
    if (connections.length === 0) return false;
    
    // Build adjacency list
    const graph: number[][] = Array.from({ length: numRooms }, () => []);
    connections.forEach(conn => {
      graph[conn.fromRoomId].push(conn.toRoomId);
      graph[conn.toRoomId].push(conn.fromRoomId); // Bidirectional
    });
    
    // BFS to check connectivity
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
    
    return visited.size === numRooms;
  }
}