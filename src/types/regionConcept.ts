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