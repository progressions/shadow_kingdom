export interface Region {
  id: number;
  game_id: number;
  name: string | null;
  type: string;
  description: string;
  center_room_id: number | null;
  created_at: Date;
}

// Region support added to existing Room interface in gameStateManager.ts

export interface RegionContext {
  region: Region;
  isCenter: boolean;
  distanceFromCenter: number;
}