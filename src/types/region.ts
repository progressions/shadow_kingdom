export interface Region {
  id: number;
  game_id: number;
  name: string | null;
  type: string;
  description: string;
  center_room_id: number | null;
  created_at: Date;
}

export interface RegionContext {
  region: Region;
  isCenter: boolean;
  distanceFromCenter: number;
}

// Extended Room interface that includes region information
export interface RoomWithRegion {
  id: number;
  game_id: number;
  name: string;
  description: string;
  generation_processed?: boolean;
  region_id: number | null;
  region_distance: number | null;
}