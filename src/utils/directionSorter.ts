/**
 * Direction sorting utility for consistent display of movement directions
 * Cardinal directions (north, south, east, west) appear first in that order,
 * followed by other directions sorted alphabetically.
 */

const DIRECTION_PRIORITY = {
  'north': 1,
  'south': 2,
  'east': 3,
  'west': 4
} as const;

/**
 * Sorts an array of direction strings with cardinal directions first,
 * followed by non-cardinal directions in alphabetical order.
 * 
 * @param directions Array of direction strings to sort
 * @returns Sorted array with cardinal directions first, then alphabetical
 */
export function sortDirections(directions: string[]): string[] {
  if (!directions || directions.length === 0) {
    return [];
  }

  return directions.sort((a, b) => {
    const priorityA = DIRECTION_PRIORITY[a.toLowerCase() as keyof typeof DIRECTION_PRIORITY] ?? 999;
    const priorityB = DIRECTION_PRIORITY[b.toLowerCase() as keyof typeof DIRECTION_PRIORITY] ?? 999;
    
    // If both have priority (cardinal directions), sort by priority
    if (priorityA < 999 && priorityB < 999) {
      return priorityA - priorityB;
    }
    
    // If one has priority and other doesn't, priority goes first
    if (priorityA < 999) return -1;
    if (priorityB < 999) return 1;
    
    // If neither has priority, sort alphabetically (case-insensitive)
    return a.toLowerCase().localeCompare(b.toLowerCase());
  });
}

/**
 * Checks if a direction is a cardinal direction (north, south, east, west)
 * 
 * @param direction Direction string to check
 * @returns True if the direction is cardinal, false otherwise
 */
export function isCardinalDirection(direction: string): boolean {
  return Object.hasOwnProperty.call(DIRECTION_PRIORITY, direction.toLowerCase());
}

/**
 * Gets the priority of a direction for sorting purposes
 * 
 * @param direction Direction string to get priority for
 * @returns Priority number (1-4 for cardinals, 999 for non-cardinals)
 */
export function getDirectionPriority(direction: string): number {
  return DIRECTION_PRIORITY[direction.toLowerCase() as keyof typeof DIRECTION_PRIORITY] ?? 999;
}