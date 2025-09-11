// Level 5 Temple Dungeon Layout - Ruined Temple
// Based on temple_dungeon_map_190x110.png
// Black = Ruined ground (walkable), Gray = Walls, Brown = Temple floor (walkable), Blue = Water

export const LEVEL5_TEMPLE_SIZE = {
  tileW: 190,
  tileH: 110
};

// Wall rectangles derived from the temple map image (gray areas only)
// Mapping the actual gray wall segments visible in the image
export const LEVEL5_TEMPLE_WALLS = [
  // Top-left room perimeter walls (with openings)
  { x: 5, y: 5, w: 25, h: 2 },       // Top wall
  { x: 5, y: 7, w: 2, h: 8 },        // Left wall
  { x: 5, y: 18, w: 10, h: 2 },      // Bottom left
  { x: 20, y: 18, w: 10, h: 2 },     // Bottom right  
  { x: 28, y: 7, w: 2, h: 11 },      // Right wall (extends down to y:18)
  
  // Corridor walls between top-left and pillar room (30-45 horizontally)
  { x: 30, y: 14, w: 15, h: 2 },     // Upper corridor wall
  { x: 30, y: 20, w: 15, h: 2 },     // Lower corridor wall
  
  // Top-center pillar room perimeter
  { x: 45, y: 5, w: 40, h: 2 },      // Top wall
  { x: 45, y: 7, w: 2, h: 7 },       // Left wall upper
  { x: 45, y: 20, w: 2, h: 2 },      // Left wall lower
  { x: 83, y: 7, w: 2, h: 15 },      // Right wall
  { x: 45, y: 22, w: 15, h: 2 },     // Bottom left
  { x: 70, y: 22, w: 15, h: 2 },     // Bottom right
  // Interior pillars (6 gray squares)
  { x: 55, y: 11, w: 2, h: 2 },      // Pillar 1
  { x: 62, y: 11, w: 2, h: 2 },      // Pillar 2
  { x: 69, y: 11, w: 2, h: 2 },      // Pillar 3
  { x: 55, y: 16, w: 2, h: 2 },      // Pillar 4
  { x: 62, y: 16, w: 2, h: 2 },      // Pillar 5
  { x: 69, y: 16, w: 2, h: 2 },      // Pillar 6
  
  // Top-right room
  { x: 105, y: 5, w: 30, h: 2 },     // Top wall
  { x: 105, y: 7, w: 2, h: 5 },      // Left wall upper (opening at y:12-14)
  { x: 105, y: 15, w: 2, h: 5 },     // Left wall lower
  { x: 133, y: 7, w: 2, h: 13 },     // Right wall
  { x: 105, y: 20, w: 7, h: 2 },     // Bottom wall left segment (opening at 112-115)
  { x: 115, y: 20, w: 20, h: 2 },    // Bottom wall right segment
  
  // Middle-left room
  { x: 10, y: 38, w: 2, h: 25 },     // Left wall
  { x: 10, y: 38, w: 25, h: 2 },     // Top wall
  { x: 35, y: 40, w: 2, h: 23 },     // Right wall
  { x: 10, y: 63, w: 27, h: 2 },     // Bottom wall
  
  // Central vertical corridors/dividers
  { x: 53, y: 35, w: 2, h: 40 },     // Left corridor wall
  { x: 68, y: 35, w: 2, h: 10 },     // Middle divider top
  { x: 68, y: 50, w: 2, h: 25 },     // Middle divider bottom
  { x: 78, y: 35, w: 2, h: 40 },     // Right corridor wall
  
  // Middle-right room
  { x: 90, y: 40, w: 35, h: 2 },     // Top wall
  { x: 90, y: 42, w: 2, h: 20 },     // Left wall
  { x: 123, y: 42, w: 2, h: 20 },    // Right wall
  { x: 90, y: 62, w: 17, h: 2 },     // Bottom wall left segment (opening at 107-111)
  { x: 111, y: 62, w: 14, h: 2 },    // Bottom wall right segment
  
  // Bottom-left room with stairs
  // Top wall with opening near (~25,74)
  // Original: { x: 10, y: 75, w: 22, h: 2 }
  { x: 10, y: 75, w: 14, h: 2 },     // Top wall left segment (up to x:24)
  { x: 26, y: 75, w: 6,  h: 2 },     // Top wall right segment (from x:26)
  { x: 10, y: 77, w: 2, h: 20 },     // Left wall
  { x: 30, y: 77, w: 2, h: 20 },     // Right wall
  { x: 10, y: 95, w: 22, h: 2 },     // Bottom wall
  // Stair pattern lines
  { x: 14, y: 82, w: 12, h: 1 },     // Stair 1
  { x: 14, y: 85, w: 12, h: 1 },     // Stair 2
  { x: 14, y: 88, w: 12, h: 1 },     // Stair 3
  { x: 14, y: 91, w: 12, h: 1 },     // Stair 4
  
  // Bottom-center room
  { x: 45, y: 75, w: 16, h: 2 },     // Top wall left segment (opening at 61)
  { x: 63, y: 75, w: 12, h: 2 },     // Top wall right segment
  { x: 45, y: 77, w: 2, h: 20 },     // Left wall
  { x: 75, y: 77, w: 2, h: 20 },     // Right wall
  { x: 45, y: 95, w: 32, h: 2 },     // Bottom wall
  
  // Bottom-right room
  { x: 90, y: 75, w: 40, h: 2 },     // Top wall
  { x: 90, y: 77, w: 2, h: 20 },     // Left wall
  { x: 128, y: 77, w: 2, h: 20 },    // Right wall
  { x: 90, y: 95, w: 40, h: 2 },     // Bottom wall
  
  // Upper-right boss arena (completely enclosed with gate opening)
  { x: 145, y: 5, w: 40, h: 2 },     // Top wall
  { x: 145, y: 7, w: 2, h: 6 },      // Left wall upper (before gate)
  { x: 145, y: 15, w: 2, h: 10 },    // Left wall lower (after gate)
  { x: 183, y: 7, w: 2, h: 18 },     // Right wall
  { x: 145, y: 23, w: 40, h: 2 },    // Bottom wall
  
  // Water room (right side)
  { x: 150, y: 40, w: 30, h: 2 },    // Top wall
  { x: 150, y: 42, w: 2, h: 28 },    // Left wall
  // Right wall with opening near (~180,56)
  // Original: { x: 178, y: 42, w: 2, h: 28 }
  { x: 178, y: 42, w: 2, h: 14 },    // Right wall upper segment (to y:56)
  { x: 178, y: 58, w: 2, h: 12 },    // Right wall lower segment (from y:58)
  // Bottom wall with opening near (~154,70)
  // Original: { x: 150, y: 68, w: 30, h: 2 }
  { x: 150, y: 68, w: 4,  h: 2 },    // Bottom wall left segment (to x:154)
  { x: 156, y: 68, w: 24, h: 2 },    // Bottom wall right segment (from x:156)
];

// Special features (water, gates, etc.)
export const LEVEL5_TEMPLE_FEATURES = {
  // Water pool (blue area in image)
  waterPool: { x: 158, y: 48, w: 15, h: 15 },
  
  // Key locations
  playerSpawn: { x: 17, y: 12 },      // Top-left room center
  bossLocation: { x: 165, y: 15 },    // Upper-right boss arena
  
  // Gate position (only the boss room is locked)
  gates: [
    { x: 145, y: 13, w: 1, h: 2, keyId: 'key_temple', locked: true }  // Boss gate (1x2 tiles)
  ],
  
  // NPC spawn points (on safe floor tiles)
  npcSpawns: [
    { x: 22, y: 50 },   // Middle-left room
    { x: 107, y: 52 },  // Middle-right room  
    { x: 60, y: 85 },   // Bottom-center room (where Cowsill spawns)
  ],
  
  // Enemy spawn zones
  enemyZones: [
    { x: 50, y: 12, w: 30, h: 8 },    // Central pillar room
    { x: 110, y: 10, w: 20, h: 8 },   // Top-right room
    { x: 56, y: 38, w: 10, h: 35 },   // Central corridors
    { x: 95, y: 45, w: 25, h: 15 },   // Right middle room
    { x: 15, y: 80, w: 12, h: 12 },   // Stairs room
  ]
};

// Helper function to check if a point is walkable
export function isWalkable(x, y) {
  // Check if point hits any wall (gray) rectangle
  for (const wall of LEVEL5_TEMPLE_WALLS) {
    if (x >= wall.x && x < wall.x + wall.w &&
        y >= wall.y && y < wall.y + wall.h) {
      return false;  // Hit a wall
    }
  }
  
  // Check if in water
  const water = LEVEL5_TEMPLE_FEATURES.waterPool;
  if (x >= water.x && x < water.x + water.w &&
      y >= water.y && y < water.y + water.h) {
    return false;  // In water
  }
  
  // Check boundaries
  if (x < 0 || x >= LEVEL5_TEMPLE_SIZE.tileW || 
      y < 0 || y >= LEVEL5_TEMPLE_SIZE.tileH) {
    return false;
  }
  
  return true;  // On walkable ground (black or brown)
}

// Find a safe spawn point near a target location
export function findSafeSpawn(targetX, targetY, searchRadius = 5) {
  // First check if target is already safe
  if (isWalkable(targetX, targetY)) {
    return { x: targetX, y: targetY };
  }
  
  // Search in expanding circles
  for (let r = 1; r <= searchRadius; r++) {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const testX = Math.round(targetX + Math.cos(angle) * r);
      const testY = Math.round(targetY + Math.sin(angle) * r);
      if (isWalkable(testX, testY)) {
        return { x: testX, y: testY };
      }
    }
  }
  
  // Fallback to original if no safe spot found
  return { x: targetX, y: targetY };
}
