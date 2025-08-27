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
  static validateThemeResponse(response: unknown): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if response is an object
    if (!response || typeof response !== 'object') {
      return {
        valid: false,
        errors: ['Response is not a valid object'],
      };
    }

    // Cast to Record for type checking
    const resp = response as Record<string, unknown>;

    // Required top-level fields
    const requiredFields = [
      'name',
      'theme',
      'description',
      'atmosphere',
      'guardianConcept',
      'keyConcept',
      'lockedExitDescription',
    ];
    for (const field of requiredFields) {
      if (!(field in resp)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate name
    if (resp.name) {
      if (typeof resp.name !== 'string') {
        errors.push('Name must be a string');
      } else if ((resp.name as string).length < 3 || (resp.name as string).length > 50) {
        warnings.push('Name should be between 3 and 50 characters');
      }
    }

    // Validate theme
    if (resp.theme) {
      if (typeof resp.theme !== 'string') {
        errors.push('Theme must be a string');
      } else if ((resp.theme as string).length < 5 || (resp.theme as string).length > 100) {
        warnings.push('Theme should be between 5 and 100 characters');
      }
    }

    // Validate description
    if (resp.description) {
      if (typeof resp.description !== 'string') {
        errors.push('Description must be a string');
      } else if (
        (resp.description as string).length < 10 ||
        (resp.description as string).length > 500
      ) {
        warnings.push('Description should be between 10 and 500 characters');
      }
    }

    // Validate atmosphere
    if (resp.atmosphere) {
      if (typeof resp.atmosphere !== 'string') {
        errors.push('Atmosphere must be a string');
      }
    }

    // Validate guardianConcept
    if (resp.guardianConcept) {
      const guardian = resp.guardianConcept as Record<string, unknown>;
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
    if (resp.keyConcept) {
      const key = resp.keyConcept as Record<string, unknown>;
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
    if (resp.lockedExitDescription) {
      if (typeof resp.lockedExitDescription !== 'string') {
        errors.push('LockedExitDescription must be a string');
      } else if ((resp.lockedExitDescription as string).length < 10) {
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
  static validateRoomBatchResponse(response: unknown): ValidationResult {
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
    response.forEach((room: unknown, idx: number) => {
      const roomErrors: string[] = [];

      if (!room || typeof room !== 'object') {
        errors.push(`Room ${idx} is not a valid object`);
        return;
      }

      const roomObj = room as Record<string, unknown>;

      // Validate index
      if (roomObj.index !== undefined) {
        if (typeof roomObj.index !== 'number') {
          roomErrors.push('Index must be a number');
        } else if ((roomObj.index as number) < 0 || (roomObj.index as number) > 11) {
          roomErrors.push('Index must be between 0 and 11');
        } else {
          if (seenIndices.has(roomObj.index as number)) {
            roomErrors.push(`Duplicate index: ${roomObj.index}`);
          }
          seenIndices.add(roomObj.index as number);
        }
      } else {
        roomErrors.push('Index is required');
      }

      // Validate name
      if (!roomObj.name || typeof roomObj.name !== 'string') {
        roomErrors.push('Name is required and must be a string');
      }

      // Validate description
      if (!roomObj.description || typeof roomObj.description !== 'string') {
        roomErrors.push('Description is required and must be a string');
      } else if ((roomObj.description as string).length < 20) {
        warnings.push(`Room ${roomObj.index || idx}: Description should be at least 20 characters`);
      }

      // Validate features (optional)
      if (roomObj.features && !Array.isArray(roomObj.features)) {
        roomErrors.push('Features must be an array if provided');
      }

      // Validate guardian flag
      if (roomObj.hasGuardian === true) {
        guardianRooms++;
      }

      // Validate key flag
      if (roomObj.hasKey === true) {
        keyRooms++;
      }

      // Validate connections (optional)
      if (roomObj.connections) {
        if (!Array.isArray(roomObj.connections)) {
          roomErrors.push('Connections must be an array if provided');
        } else {
          const validDirections = ['north', 'south', 'east', 'west', 'up', 'down'];
          roomObj.connections.forEach((dir: unknown) => {
            if (typeof dir === 'string' && !validDirections.includes(dir)) {
              warnings.push(`Room ${roomObj.index || idx}: Invalid direction '${dir}'`);
            }
          });
        }
      }

      // Add room errors to main errors
      if (roomErrors.length > 0) {
        errors.push(`Room ${roomObj.index || idx}: ${roomErrors.join(', ')}`);
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
  static fixCommonIssues(response: unknown, type: 'theme' | 'rooms'): unknown {
    if (type === 'theme' && response && typeof response === 'object') {
      const resp = response as Record<string, unknown>;
      // Ensure all string fields are strings
      const stringFields = ['name', 'theme', 'description', 'atmosphere', 'lockedExitDescription'];
      stringFields.forEach(field => {
        if (resp[field] && typeof resp[field] !== 'string') {
          resp[field] = String(resp[field]);
        }
      });

      return response;
    }

    if (type === 'rooms' && Array.isArray(response)) {
      // Ensure all rooms have indices
      response.forEach((room, idx) => {
        const roomObj = room as Record<string, unknown>;
        if (roomObj.index === undefined) {
          roomObj.index = idx;
        }
        // Ensure index is a number
        if (typeof roomObj.index === 'string') {
          roomObj.index = parseInt(roomObj.index, 10);
        }
      });

      // Sort by index
      response.sort((a, b) => {
        const aIndex = (a as Record<string, unknown>).index as number;
        const bIndex = (b as Record<string, unknown>).index as number;
        return aIndex - bIndex;
      });

      return response;
    }

    return response;
  }
}

/**
 * Generate a fallback theme response when validation fails
 */
export function generateFallbackTheme(context: unknown): RegionThemeSchema {
  const themes = [
    {
      name: 'Whispering Woods',
      theme: 'enchanted forest',
      description:
        'An ancient forest where the trees seem to whisper secrets to those who listen carefully.',
      atmosphere: 'mysterious and otherworldly',
      guardianConcept: {
        name: 'Elder Treant',
        type: 'nature elemental',
        description:
          'A massive tree creature with glowing amber eyes and branches like grasping claws.',
      },
      keyConcept: {
        name: 'Amber Leaf Key',
        description: 'A golden leaf preserved in ancient amber that glows with inner light.',
        hint: 'The guardian treasures what falls from its branches.',
      },
      lockedExitDescription:
        'A wall of thorny vines blocks the path, with a leaf-shaped keyhole at its center.',
    },
    {
      name: 'Frozen Crypts',
      theme: 'icy tomb complex',
      description:
        'Ancient burial chambers encased in eternal ice, where the dead do not rest peacefully.',
      atmosphere: 'cold and foreboding',
      guardianConcept: {
        name: 'Frost Wight Lord',
        type: 'undead',
        description: 'An ancient warrior king wreathed in frost, wielding a blade of pure ice.',
      },
      keyConcept: {
        name: 'Frozen Heart Key',
        description: 'A key carved from ice that never melts, pulsing with a faint blue light.',
        hint: "The lord's frozen heart still beats with purpose.",
      },
      lockedExitDescription:
        'A massive ice door sealed with frozen chains, requiring a special key to shatter the bonds.',
    },
  ];

  // Select a theme based on direction or random
  const contextObj = context as { direction?: string };
  const directionIndex = ['north', 'south', 'east', 'west'].indexOf(
    contextObj.direction || 'north'
  );
  const selectedTheme = themes[directionIndex % themes.length];

  return selectedTheme;
}

/**
 * Generate fallback rooms when validation fails
 */
export function generateFallbackRooms(
  theme: RegionThemeSchema,
  guardianIdx: number,
  keyIdx: number
): RoomSchema[] {
  const rooms: RoomSchema[] = [];

  for (let i = 0; i < 12; i++) {
    const isGuardianRoom = i === guardianIdx;
    const isKeyRoom = i === keyIdx;
    const isEntrance = i === 0;
    const isExit = i === 11;

    rooms.push({
      index: i,
      name: isEntrance
        ? 'Region Entrance'
        : isExit
          ? 'Sealed Exit'
          : `${theme.name} - Chamber ${i}`,
      description: isGuardianRoom
        ? `A large chamber where ${theme.guardianConcept.name} stands guard. ${theme.guardianConcept.description}`
        : isKeyRoom
          ? `A hidden alcove containing ${theme.keyConcept.name}. ${theme.keyConcept.description}`
          : isEntrance
            ? `The entrance to ${theme.name}. ${theme.atmosphere} atmosphere fills the air.`
            : isExit
              ? `${theme.lockedExitDescription} This passage leads onward to new adventures.`
              : `A chamber within ${theme.name}. The ${theme.atmosphere} feeling persists here.`,
      features: isGuardianRoom
        ? ['boss arena', 'combat zone']
        : isKeyRoom
          ? ['treasure', 'hidden']
          : [],
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
