export interface RegionGuardian {
  name: string;
  description: string;
  personality: string;
}

export interface RegionKey {
  name: string;
  description: string;
}

export interface RegionLockedExit {
  name: string;
  description: string;
}

export interface RegionConcept {
  name: string;
  theme: string;
  atmosphere: string;
  history: string;
  guardian: RegionGuardian;
  key: RegionKey;
  lockedExit: RegionLockedExit;
  suggestedElements: string[];
}

export interface GeneratedRoomCharacter {
  name: string;
  type: 'npc' | 'enemy';
  description: string;
}

export interface GeneratedRoom {
  name: string;
  description: string;
  items: string[];
  characters: GeneratedRoomCharacter[];
}

export interface RoomGenerationContext {
  concept: RegionConcept;
  adjacentRooms?: string[];
  includeKey?: boolean;
  includeGuardian?: boolean;
  includeLockedExit?: boolean;
}

export interface CompleteRegion {
  concept: RegionConcept;
  rooms: GeneratedRoom[]; // Array of 12 rooms
  sequenceNumber: number; // 1, 2, 3, etc.
  entranceRoomIndex: number; // Index 0 (Room 1)
  guardianRoomIndex: number; // Index 9 (Room 10) 
  exitRoomIndex: number; // Index 10 (Room 11)
  explorationRoomIndexes: number[]; // Indexes [1,2,3,4,5,6,7,8,11] (Rooms 2-9,12)
}