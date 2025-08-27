/**
 * JSON Schema validators for region generation responses
 */

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface RegionThemeSchema {
  name: string;
  theme: string;
  description: string;
  atmosphere: string;
  guardianConcept: {
    name: string;
    type: string;
    description: string;
  };
  keyConcept: {
    name: string;
    description: string;
    hint: string;
  };
  lockedExitDescription: string;
}

export interface RoomSchema {
  index: number;
  name: string;
  description: string;
  features?: string[];
  hasGuardian?: boolean;
  hasKey?: boolean;
  connections?: string[];
  secrets?: string;
}

export class RegionResponseValidator {
  /**
   * Validate region theme response
   */
  static validateThemeResponse(response: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if response is an object
    if (!response || typeof response !== 'object') {
      return {
        valid: false,
        errors: ['Response is not a valid object'],
      };
    }

    // Required top-level fields
    const requiredFields = ['name', 'theme', 'description', 'atmosphere', 'guardianConcept', 'keyConcept', 'lockedExitDescription'];
    for (const field of requiredFields) {
      if (!(field in response)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate name
    if (response.name) {
      if (typeof response.name !== 'string') {
        errors.push('Name must be a string');
      } else if (response.name.length < 3 || response.name.length > 50) {
        warnings.push('Name should be between 3 and 50 characters');
      }
    }

    // Validate theme
    if (response.theme) {
      if (typeof response.theme !== 'string') {
        errors.push('Theme must be a string');
      } else if (response.theme.length < 5 || response.theme.length > 100) {
        warnings.push('Theme should be between 5 and 100 characters');
      }
    }

    // Validate description
    if (response.description) {
      if (typeof response.description !== 'string') {
        errors.push('Description must be a string');
      } else if (response.description.length < 10 || response.description.length > 500) {
        warnings.push('Description should be between 10 and 500 characters');
      }
    }

    // Validate atmosphere
    if (response.atmosphere) {
      if (typeof response.atmosphere !== 'string') {
        errors.push('Atmosphere must be a string');
      }
    }

    // Validate guardianConcept
    if (response.guardianConcept) {
      const guardian = response.guardianConcept;
      if (typeof guardian !== 'object') {
        errors.push('GuardianConcept must be an object');
      } else {
        if (!guardian.name || typeof guardian.name !== 'string') {
          errors.push('Guardian name is required and must be a string');
        }
        if (!guardian.type || typeof guardian.type !== 'string') {
          errors.push('Guardian type is required and must be a string');
        }
        if (!guardian.description || typeof guardian.description !== 'string') {
          errors.push('Guardian description is required and must be a string');
        }
      }
    }

    // Validate keyConcept
    if (response.keyConcept) {
      const key = response.keyConcept;
      if (typeof key !== 'object') {
        errors.push('KeyConcept must be an object');
      } else {
        if (!key.name || typeof key.name !== 'string') {
          errors.push('Key name is required and must be a string');
        }
        if (!key.description || typeof key.description !== 'string') {
          errors.push('Key description is required and must be a string');
        }
        if (!key.hint || typeof key.hint !== 'string') {
          errors.push('Key hint is required and must be a string');
        }
      }
    }

    // Validate lockedExitDescription
    if (response.lockedExitDescription) {
      if (typeof response.lockedExitDescription !== 'string') {
        errors.push('LockedExitDescription must be a string');
      } else if (response.lockedExitDescription.length < 10) {
        warnings.push('LockedExitDescription should be at least 10 characters');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validate room batch response
   */
  static validateRoomBatchResponse(response: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if response is an array
    if (!Array.isArray(response)) {
      return {
        valid: false,
        errors: ['Response must be an array of rooms'],
      };
    }

    // Check array length
    if (response.length !== 12) {
      errors.push(`Expected exactly 12 rooms, got ${response.length}`);
    }

    // Track guardian and key rooms
    let guardianRooms = 0;
    let keyRooms = 0;
    const seenIndices = new Set<number>();

    // Validate each room
    response.forEach((room: any, idx: number) => {
      const roomErrors: string[] = [];

      if (!room || typeof room !== 'object') {
        errors.push(`Room ${idx} is not a valid object`);
        return;
      }

      // Validate index
      if (room.index !== undefined) {
        if (typeof room.index !== 'number') {
          roomErrors.push('Index must be a number');
        } else if (room.index < 0 || room.index > 11) {
          roomErrors.push('Index must be between 0 and 11');
        } else {
          if (seenIndices.has(room.index)) {
            roomErrors.push(`Duplicate index: ${room.index}`);
          }
          seenIndices.add(room.index);
        }
      } else {
        roomErrors.push('Index is required');
      }

      // Validate name
      if (!room.name || typeof room.name !== 'string') {
        roomErrors.push('Name is required and must be a string');
      }

      // Validate description
      if (!room.description || typeof room.description !== 'string') {
        roomErrors.push('Description is required and must be a string');
      } else if (room.description.length < 20) {
        warnings.push(`Room ${room.index || idx}: Description should be at least 20 characters`);
      }

      // Validate features (optional)
      if (room.features && !Array.isArray(room.features)) {
        roomErrors.push('Features must be an array if provided');
      }

      // Validate guardian flag
      if (room.hasGuardian === true) {
        guardianRooms++;
      }

      // Validate key flag
      if (room.hasKey === true) {
        keyRooms++;
      }

      // Validate connections (optional)
      if (room.connections) {
        if (!Array.isArray(room.connections)) {
          roomErrors.push('Connections must be an array if provided');
        } else {
          const validDirections = ['north', 'south', 'east', 'west', 'up', 'down'];
          room.connections.forEach((dir: any) => {
            if (!validDirections.includes(dir)) {
              warnings.push(`Room ${room.index || idx}: Invalid direction '${dir}'`);
            }
          });
        }
      }

      // Add room errors to main errors
      if (roomErrors.length > 0) {
        errors.push(`Room ${room.index || idx}: ${roomErrors.join(', ')}`);
      }
    });

    // Validate guardian and key placement
    if (guardianRooms !== 1) {
      errors.push(`Expected exactly 1 guardian room, found ${guardianRooms}`);
    }
    if (keyRooms !== 1) {
      errors.push(`Expected exactly 1 key room, found ${keyRooms}`);
    }

    // Check for missing indices
    for (let i = 0; i < 12; i++) {
      if (!seenIndices.has(i)) {
        errors.push(`Missing room with index ${i}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Attempt to fix common response issues
   */
  static fixCommonIssues(response: any, type: 'theme' | 'rooms'): any {
    if (type === 'theme') {

      // Ensure all string fields are strings
      const stringFields = ['name', 'theme', 'description', 'atmosphere', 'lockedExitDescription'];
      stringFields.forEach(field => {
        if (response[field] && typeof response[field] !== 'string') {
          response[field] = String(response[field]);
        }
      });

      return response;
    }

    if (type === 'rooms' && Array.isArray(response)) {
      // Ensure all rooms have indices
      response.forEach((room, idx) => {
        if (room.index === undefined) {
          room.index = idx;
        }
        // Ensure index is a number
        if (typeof room.index === 'string') {
          room.index = parseInt(room.index, 10);
        }
      });

      // Sort by index
      response.sort((a, b) => a.index - b.index);

      return response;
    }

    return response;
  }
}

/**
 * Generate a fallback theme response when validation fails
 */
export function generateFallbackTheme(context: any): RegionThemeSchema {
  const themes = [
    {
      name: "Whispering Woods",
      theme: "enchanted forest",
      description: "An ancient forest where the trees seem to whisper secrets to those who listen carefully.",
      atmosphere: "mysterious and otherworldly",
      guardianConcept: {
        name: "Elder Treant",
        type: "nature elemental",
        description: "A massive tree creature with glowing amber eyes and branches like grasping claws.",
      },
      keyConcept: {
        name: "Amber Leaf Key",
        description: "A golden leaf preserved in ancient amber that glows with inner light.",
        hint: "The guardian treasures what falls from its branches.",
      },
      lockedExitDescription: "A wall of thorny vines blocks the path, with a leaf-shaped keyhole at its center.",
    },
    {
      name: "Frozen Crypts",
      theme: "icy tomb complex",
      description: "Ancient burial chambers encased in eternal ice, where the dead do not rest peacefully.",
      atmosphere: "cold and foreboding",
      guardianConcept: {
        name: "Frost Wight Lord",
        type: "undead",
        description: "An ancient warrior king wreathed in frost, wielding a blade of pure ice.",
      },
      keyConcept: {
        name: "Frozen Heart Key",
        description: "A key carved from ice that never melts, pulsing with a faint blue light.",
        hint: "The lord's frozen heart still beats with purpose.",
      },
      lockedExitDescription: "A massive ice door sealed with frozen chains, requiring a special key to shatter the bonds.",
    },
  ];

  // Select a theme based on direction or random
  const directionIndex = ['north', 'south', 'east', 'west'].indexOf(context.direction || 'north');
  const selectedTheme = themes[directionIndex % themes.length];

  return selectedTheme;
}

/**
 * Generate fallback rooms when validation fails
 */
export function generateFallbackRooms(theme: RegionThemeSchema, guardianIdx: number, keyIdx: number): RoomSchema[] {
  const rooms: RoomSchema[] = [];

  for (let i = 0; i < 12; i++) {
    const isGuardianRoom = i === guardianIdx;
    const isKeyRoom = i === keyIdx;
    const isEntrance = i === 0;
    const isExit = i === 11;

    rooms.push({
      index: i,
      name: isEntrance ? "Region Entrance" : isExit ? "Sealed Exit" : `${theme.name} - Chamber ${i}`,
      description: isGuardianRoom
        ? `A large chamber where ${theme.guardianConcept.name} stands guard. ${theme.guardianConcept.description}`
        : isKeyRoom
        ? `A hidden alcove containing ${theme.keyConcept.name}. ${theme.keyConcept.description}`
        : isEntrance
        ? `The entrance to ${theme.name}. ${theme.atmosphere} atmosphere fills the air.`
        : isExit
        ? `${theme.lockedExitDescription} This passage leads onward to new adventures.`
        : `A chamber within ${theme.name}. The ${theme.atmosphere} feeling persists here.`,
      features: isGuardianRoom ? ["boss arena", "combat zone"] : isKeyRoom ? ["treasure", "hidden"] : [],
      hasGuardian: isGuardianRoom,
      hasKey: isKeyRoom,
      connections: generateConnections(i),
    });
  }

  return rooms;
}

function generateConnections(index: number): string[] {
  // Simple grid layout (4x3)
  const connections: string[] = [];
  const row = Math.floor(index / 4);
  const col = index % 4;

  if (col > 0) connections.push('west');
  if (col < 3) connections.push('east');
  if (row > 0) connections.push('north');
  if (row < 2) connections.push('south');

  return connections;
}