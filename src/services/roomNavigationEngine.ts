import { GameStateManager } from './gameStateManager';
import { PrismaService } from './prismaService';
import { Room, Connection, Item, Character } from '@prisma/client';

export interface MovementValidationResult {
  isValid: boolean;
  targetRoomId?: number;
  connection?: Connection;
  availableDirections?: string[];
  error?: string;
  requiresKey?: boolean;
  keyUsed?: string;
}

export interface ExitInfo {
  direction: string;
  description: string | null;
  locked: boolean;
  requiresKey: string | null;
}

export interface MovementResult {
  success: boolean;
  newRoom?: Room;
  movementDescription?: string;
  error?: string;
}

export interface RoomExaminationResult {
  found: boolean;
  description: string;
  target?: Item | Character;
}

export interface WorldConsistencyResult {
  isValid: boolean;
  error?: string;
}

export interface RegionContext {
  regionId: number;
  totalRooms: number;
  visitedRooms: number;
  roomNames: string[];
}

export interface InteractionResult {
  success: boolean;
  description: string;
  elementName?: string;
  actionTaken?: string;
  stateChanged?: boolean;
}

export interface InteractiveElement {
  name: string;
  type: string;
  description: string;
  suggestedActions: string[];
}

export interface ComplexExaminationResult {
  success: boolean;
  description: string;
  clues?: string[];
  hints?: string[];
  discoveredHidden?: boolean;
  target?: Item;
}

export interface RoomNavigationError extends Error {
  code: string;
  recoverable: boolean;
}

export class RoomNavigationError extends Error implements RoomNavigationError {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = false
  ) {
    super(message);
    this.name = 'RoomNavigationError';
  }
}

export class RoomNavigationEngine {
  // Movement descriptors for different directions
  private movementDescriptors = {
    north: 'move north',
    south: 'move south',
    east: 'move east',
    west: 'move west',
    northeast: 'move northeast',
    northwest: 'move northwest',
    southeast: 'move southeast',
    southwest: 'move southwest',
    up: 'climb up',
    down: 'climb down'
  };

  constructor(
    private readonly gameStateManager: GameStateManager,
    private readonly prismaService: PrismaService
  ) {}

  /**
   * Validate if movement in a given direction is possible
   */
  async validateMovement(direction: string, availableKeys: string[] = []): Promise<MovementValidationResult> {
    try {
      if (!this.gameStateManager.hasActiveSession()) {
        return {
          isValid: false,
          error: 'No active game session'
        };
      }

      const currentRoom = this.gameStateManager.getCurrentRoom();
      if (!currentRoom) {
        return {
          isValid: false,
          error: 'No current room available'
        };
      }

      // Get all connections from current room
      const connections = await this.prismaService.client.connection.findMany({
        where: { fromRoomId: currentRoom.id }
      });

      const validConnections = connections || [];
      const availableDirections = validConnections
        .filter(conn => conn.toRoomId !== null)
        .map(conn => conn.direction);

      // Find the connection for the requested direction
      const connection = validConnections.find(conn => conn.direction === direction);

      if (!connection) {
        return {
          isValid: false,
          error: `No exit available to the ${direction}`,
          availableDirections
        };
      }

      // Check if connection is unfilled
      if (!connection.toRoomId) {
        return {
          isValid: false,
          error: `The path ${direction} is under construction and cannot be used yet`,
          availableDirections,
          connection
        };
      }

      // Check if connection is locked
      if (connection.locked && connection.requiredKey) {
        if (!availableKeys.includes(connection.requiredKey)) {
          const article = /^[aeiou]/i.test(connection.requiredKey) ? 'an' : 'a';
          return {
            isValid: false,
            error: `The path ${direction} is locked. You need ${article} ${connection.requiredKey} to proceed.`,
            availableDirections,
            connection
          };
        }

        // Movement is valid with key
        return {
          isValid: true,
          targetRoomId: connection.toRoomId,
          connection,
          availableDirections,
          requiresKey: true,
          keyUsed: connection.requiredKey
        };
      }

      // Movement is valid
      return {
        isValid: true,
        targetRoomId: connection.toRoomId,
        connection,
        availableDirections
      };

    } catch (error) {
      return {
        isValid: false,
        error: `Movement validation failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get all available exits from current room
   */
  async getAvailableExits(): Promise<ExitInfo[]> {
    try {
      const currentRoom = this.gameStateManager.getCurrentRoom();
      if (!currentRoom) {
        return [];
      }

      const connections = await this.prismaService.client.connection.findMany({
        where: { fromRoomId: currentRoom.id }
      });

      const validConnections = connections || [];

      return validConnections
        .filter(conn => conn.toRoomId !== null) // Only show filled connections
        .map(conn => ({
          direction: conn.direction,
          description: conn.description,
          locked: conn.locked,
          requiresKey: conn.requiredKey
        }));

    } catch (error) {
      console.error('Error getting available exits:', error);
      return [];
    }
  }

  /**
   * Perform the actual movement to a new room
   */
  async performMovement(connection: Connection): Promise<MovementResult> {
    try {
      if (!connection.toRoomId) {
        return {
          success: false,
          error: `Connection to ${connection.direction} has no destination room`
        };
      }

      // Move to the new room using GameStateManager
      const newRoom = await this.gameStateManager.setCurrentRoom(connection.toRoomId);

      // Generate movement description
      const movementDescription = this.generateMovementDescription(connection);

      return {
        success: true,
        newRoom,
        movementDescription
      };

    } catch (error) {
      return {
        success: false,
        error: `Failed to move ${connection.direction}: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Generate appropriate movement description based on connection
   */
  private generateMovementDescription(connection: Connection): string {
    const baseAction = this.movementDescriptors[connection.direction as keyof typeof this.movementDescriptors] || `move ${connection.direction}`;
    
    if (connection.description) {
      // Special handling for descriptions that already contain direction-specific verbs
      if (connection.description.includes('up the') || connection.description.includes('down the')) {
        return `You climb ${connection.description}.`;
      }
      
      return `You ${baseAction} ${connection.description}.`;
    }
    
    return `You ${baseAction}.`;
  }

  /**
   * Generate comprehensive room description with items, characters, and exits
   */
  async generateRoomDescription(room: Room): Promise<string> {
    try {
      const [items, characters, connections] = await Promise.all([
        this.prismaService.client.item.findMany({
          where: { roomId: room.id, hidden: false }
        }),
        this.prismaService.client.character.findMany({
          where: { roomId: room.id, alive: true }
        }),
        this.prismaService.client.connection.findMany({
          where: { fromRoomId: room.id }
        })
      ]);

      let description = `**${room.name}**`;

      // Add first visit notification for unvisited rooms
      if (!room.visited) {
        description += '\n*[First time visiting]*';
      }

      description += `\n\n${room.description}`;

      // Add extended description if available
      if (room.extendedDescription) {
        description += `\n\n${room.extendedDescription}`;
      }

      // Add visible items
      const visibleItems = items || [];
      if (visibleItems.length > 0) {
        description += '\n\n**Items:**';
        for (const item of visibleItems) {
          description += `\n- ${item.name}: ${item.description}`;
        }
      }

      // Add characters
      const aliveCharacters = characters || [];
      if (aliveCharacters.length > 0) {
        description += '\n\n**Characters:**';
        for (const character of aliveCharacters) {
          description += `\n- ${character.name}: ${character.description}`;
        }
      }

      // Add available exits
      const validConnections = (connections || []).filter(conn => conn.toRoomId !== null);
      if (validConnections.length > 0) {
        const exitList = validConnections
          .map(conn => {
            if (conn.locked && conn.requiredKey) {
              return `${conn.direction} (locked)`;
            }
            return conn.direction;
          })
          .sort()
          .join(', ');
        
        description += `\n\nExits: ${exitList}`;
      } else {
        description += '\n\nThere are no obvious exits.';
      }

      return description;

    } catch (error) {
      console.error('Error generating room description:', error);
      return `**${room.name}**\n\n${room.description}\n\n(Unable to load additional room details)`;
    }
  }

  /**
   * Examine specific elements in the room
   */
  async examineRoom(room: Room, target?: string): Promise<RoomExaminationResult> {
    try {
      // General room examination if no target specified
      if (!target) {
        let examination = `You look around the ${room.name} more carefully.`;
        
        if (room.extendedDescription) {
          examination += ` ${room.extendedDescription}`;
        } else {
          examination += ' You notice the same details as before, but nothing new stands out.';
        }

        return {
          found: true,
          description: examination
        };
      }

      // Search for specific target in items and characters
      const [items, characters] = await Promise.all([
        this.prismaService.client.item.findMany({
          where: { roomId: room.id }
        }),
        this.prismaService.client.character.findMany({
          where: { roomId: room.id, alive: true }
        })
      ]);

      const normalizedTarget = target.toLowerCase();

      // Search items (including hidden ones for examination)
      const foundItem = (items || []).find(item => 
        item.name.toLowerCase().includes(normalizedTarget) ||
        normalizedTarget.includes(item.name.toLowerCase())
      );

      if (foundItem) {
        let description = `**${foundItem.name}**\n\n${foundItem.description}`;
        
        if (foundItem.extendedDescription) {
          description += `\n\n${foundItem.extendedDescription}`;
        }

        if (foundItem.hidden) {
          description += '\n\n*This item was hidden and you discovered it through careful examination.*';
        }

        return {
          found: true,
          description,
          target: foundItem
        };
      }

      // Search characters
      const foundCharacter = (characters || []).find(character =>
        character.name.toLowerCase().includes(normalizedTarget) ||
        normalizedTarget.includes(character.name.toLowerCase())
      );

      if (foundCharacter) {
        let description = `**${foundCharacter.name}**\n\n${foundCharacter.description}`;
        
        // Add sentiment-based additional details
        switch (foundCharacter.sentiment) {
          case 'hostile':
            description += '\n\nThey regard you with obvious hostility.';
            break;
          case 'aggressive':
            description += '\n\nThey seem agitated and ready for conflict.';
            break;
          case 'neutral':
            description += '\n\nThey appear indifferent to your presence.';
            break;
          case 'friendly':
            description += '\n\nThey seem approachable and friendly.';
            break;
          case 'devoted':
            description += '\n\nThey look at you with loyalty and respect.';
            break;
        }

        return {
          found: true,
          description,
          target: foundCharacter
        };
      }

      // Target not found
      return {
        found: false,
        description: `You don't see anything like that here. Try examining specific items or characters you can see, or just use "look" to see the room again.`
      };

    } catch (error) {
      console.error('Error examining room:', error);
      return {
        found: false,
        description: 'Unable to examine that right now. Please try again.'
      };
    }
  }

  /**
   * Validate world consistency for room transitions
   */
  async validateWorldConsistency(room: Room): Promise<WorldConsistencyResult> {
    try {
      const currentSession = this.gameStateManager.getCurrentSession();
      
      if (!currentSession) {
        return {
          isValid: false,
          error: 'No active game session'
        };
      }

      // Ensure room belongs to current game
      if (room.gameId !== currentSession.gameId) {
        return {
          isValid: false,
          error: 'Room belongs to a different game instance'
        };
      }

      return { isValid: true };

    } catch (error) {
      return {
        isValid: false,
        error: `World consistency check failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get context about the current region
   */
  async getRegionContext(regionId: number): Promise<RegionContext> {
    try {
      const currentSession = this.gameStateManager.getCurrentSession();
      if (!currentSession) {
        throw new RoomNavigationError('No active game session', 'NO_SESSION');
      }

      const regionRooms = await this.prismaService.client.room.findMany({
        where: { 
          gameId: currentSession.gameId,
          regionId: regionId
        }
      });

      const rooms = regionRooms || [];
      const visitedCount = rooms.filter(room => room.visited).length;

      return {
        regionId,
        totalRooms: rooms.length,
        visitedRooms: visitedCount,
        roomNames: rooms.map(room => room.name)
      };

    } catch (error) {
      console.error('Error getting region context:', error);
      return {
        regionId,
        totalRooms: 0,
        visitedRooms: 0,
        roomNames: []
      };
    }
  }

  /**
   * Find rooms by name or partial name match
   */
  async findRoomsByName(namePattern: string): Promise<Room[]> {
    try {
      const currentSession = this.gameStateManager.getCurrentSession();
      if (!currentSession) {
        return [];
      }

      const rooms = await this.prismaService.client.room.findMany({
        where: {
          gameId: currentSession.gameId,
          name: {
            contains: namePattern
          }
        }
      });

      return rooms || [];

    } catch (error) {
      console.error('Error finding rooms by name:', error);
      return [];
    }
  }

  /**
   * Get navigation hints based on current location and game state
   */
  async getNavigationHints(): Promise<string[]> {
    try {
      const currentRoom = this.gameStateManager.getCurrentRoom();
      if (!currentRoom) {
        return ['No current location available'];
      }

      const hints: string[] = [];

      // Get available exits
      const exits = await this.getAvailableExits();
      if (exits.length === 0) {
        hints.push('There are no obvious exits from here');
      } else {
        const unlockedExits = exits.filter(exit => !exit.locked);
        const lockedExits = exits.filter(exit => exit.locked);

        if (unlockedExits.length > 0) {
          hints.push(`Available directions: ${unlockedExits.map(e => e.direction).join(', ')}`);
        }

        if (lockedExits.length > 0) {
          hints.push(`Locked exits: ${lockedExits.map(e => `${e.direction} (needs ${e.requiresKey})`).join(', ')}`);
        }
      }

      // Check for unvisited areas in current region
      if (currentRoom.regionId) {
        const regionContext = await this.getRegionContext(currentRoom.regionId);
        if (regionContext.visitedRooms < regionContext.totalRooms) {
          const unvisited = regionContext.totalRooms - regionContext.visitedRooms;
          hints.push(`${unvisited} unvisited areas remain in this region`);
        }
      }

      return hints;

    } catch (error) {
      console.error('Error getting navigation hints:', error);
      return ['Unable to provide navigation hints at this time'];
    }
  }

  /**
   * Validate navigation consistency with YAML world structure
   */
  async validateYamlWorldNavigation(): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const errors: string[] = [];
      const currentSession = this.gameStateManager.getCurrentSession();
      
      if (!currentSession) {
        errors.push('No active game session');
        return { isValid: false, errors };
      }

      // Get all rooms in the game
      const rooms = await this.prismaService.client.room.findMany({
        where: { gameId: currentSession.gameId }
      });

      // Get all connections
      const connections = await this.prismaService.client.connection.findMany({
        where: { gameId: currentSession.gameId }
      });

      // Validate each room has consistent connections
      for (const room of rooms) {
        const roomConnections = connections.filter(conn => conn.fromRoomId === room.id);
        
        // Check for orphaned connections (pointing to non-existent rooms)
        for (const connection of roomConnections) {
          if (connection.toRoomId) {
            const targetRoom = rooms.find(r => r.id === connection.toRoomId);
            if (!targetRoom) {
              errors.push(`Room "${room.name}" has connection ${connection.direction} pointing to non-existent room ID ${connection.toRoomId}`);
            }
          }
        }

        // Check for duplicate directions
        const directions = roomConnections.map(conn => conn.direction);
        const duplicateDirections = directions.filter((dir, index) => directions.indexOf(dir) !== index);
        if (duplicateDirections.length > 0) {
          errors.push(`Room "${room.name}" has duplicate connections in directions: ${duplicateDirections.join(', ')}`);
        }
      }

      // Check for isolated rooms (no incoming or outgoing connections)
      const connectedRoomIds = new Set([
        ...connections.map(conn => conn.fromRoomId),
        ...connections.filter(conn => conn.toRoomId).map(conn => conn.toRoomId!)
      ]);

      const isolatedRooms = rooms.filter(room => !connectedRoomIds.has(room.id));
      if (isolatedRooms.length > 0) {
        errors.push(`Isolated rooms found (no connections): ${isolatedRooms.map(room => room.name).join(', ')}`);
      }

      return {
        isValid: errors.length === 0,
        errors
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [`Navigation validation failed: ${error instanceof Error ? error.message : String(error)}`]
      };
    }
  }

  /**
   * Find the starting room for the current game (as defined in YAML)
   */
  async findYamlStartingRoom(): Promise<Room | null> {
    try {
      const currentSession = this.gameStateManager.getCurrentSession();
      if (!currentSession) {
        return null;
      }

      // Look for starting room by name pattern (from YAML seeding)
      const startingRoom = await this.prismaService.client.room.findFirst({
        where: {
          gameId: currentSession.gameId,
          name: 'Grand Entrance Hall' // Standard starting room name from YAML
        }
      });

      return startingRoom;

    } catch (error) {
      console.error('Error finding YAML starting room:', error);
      return null;
    }
  }

  /**
   * Get world structure overview for YAML-seeded worlds
   */
  async getYamlWorldOverview(): Promise<{
    totalRooms: number;
    totalRegions: number;
    totalConnections: number;
    visitedRooms: number;
    regionBreakdown: { regionId: number; roomCount: number; visitedCount: number }[];
  }> {
    try {
      const currentSession = this.gameStateManager.getCurrentSession();
      if (!currentSession) {
        return {
          totalRooms: 0,
          totalRegions: 0,
          totalConnections: 0,
          visitedRooms: 0,
          regionBreakdown: []
        };
      }

      const [rooms, connections, regions] = await Promise.all([
        this.prismaService.client.room.findMany({
          where: { gameId: currentSession.gameId }
        }),
        this.prismaService.client.connection.findMany({
          where: { gameId: currentSession.gameId }
        }),
        this.prismaService.client.room.findMany({
          where: { gameId: currentSession.gameId },
          select: { regionId: true },
          distinct: ['regionId']
        })
      ]);

      const visitedRooms = rooms.filter(room => room.visited).length;
      
      // Group rooms by region
      const regionBreakdown = regions.filter(r => r.regionId).map(region => {
        const regionRooms = rooms.filter(room => room.regionId === region.regionId);
        const visitedCount = regionRooms.filter(room => room.visited).length;
        
        return {
          regionId: region.regionId!,
          roomCount: regionRooms.length,
          visitedCount
        };
      });

      return {
        totalRooms: rooms.length,
        totalRegions: regions.length,
        totalConnections: connections.length,
        visitedRooms,
        regionBreakdown
      };

    } catch (error) {
      console.error('Error getting YAML world overview:', error);
      return {
        totalRooms: 0,
        totalRegions: 0,
        totalConnections: 0,
        visitedRooms: 0,
        regionBreakdown: []
      };
    }
  }

  /**
   * Find rooms by YAML-defined attributes
   */
  async findRoomsByYamlAttributes(criteria: {
    regionTheme?: string;
    roomType?: string;
    hasItems?: boolean;
    hasCharacters?: boolean;
    visited?: boolean;
  }): Promise<Room[]> {
    try {
      const currentSession = this.gameStateManager.getCurrentSession();
      if (!currentSession) {
        return [];
      }

      let whereClause: any = {
        gameId: currentSession.gameId
      };

      // Add visited filter if specified
      if (criteria.visited !== undefined) {
        whereClause.visited = criteria.visited;
      }

      // Get rooms with basic filters
      const rooms = await this.prismaService.client.room.findMany({
        where: whereClause,
        include: {
          items: criteria.hasItems ? true : false,
          characters: criteria.hasCharacters ? true : false,
          region: criteria.regionTheme ? true : false
        }
      });

      // Apply additional filters
      let filteredRooms = rooms;

      if (criteria.regionTheme) {
        filteredRooms = filteredRooms.filter(room => 
          room.region && room.region.theme === criteria.regionTheme
        );
      }

      if (criteria.hasItems) {
        filteredRooms = filteredRooms.filter(room => 
          room.items && room.items.length > 0
        );
      }

      if (criteria.hasCharacters) {
        filteredRooms = filteredRooms.filter(room => 
          room.characters && room.characters.length > 0
        );
      }

      // Return just the room data without includes
      return filteredRooms.map(room => ({
        id: room.id,
        gameId: room.gameId,
        regionId: room.regionId,
        name: room.name,
        description: room.description,
        extendedDescription: room.extendedDescription,
        visited: room.visited,
        locked: room.locked,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
      }));

    } catch (error) {
      console.error('Error finding rooms by YAML attributes:', error);
      return [];
    }
  }

  /**
   * Interact with room elements (pull lever, press button, etc.)
   */
  async interactWithRoomElement(room: Room, action: string, target: string): Promise<InteractionResult> {
    try {
      // Find items that match the target
      const items = await this.prismaService.client.item.findMany({
        where: { roomId: room.id }
      });

      const normalizedTarget = target.toLowerCase();
      const foundItem = items.find(item =>
        item.name.toLowerCase().includes(normalizedTarget) ||
        normalizedTarget.includes(item.name.toLowerCase())
      );

      if (!foundItem) {
        return {
          success: false,
          description: `You don't see anything here that can be ${action}ed.`
        };
      }

      // Check if the action is appropriate for the item type and name
      const appropriateActions = this.getAppropriateActions(foundItem);
      if (!appropriateActions.includes(action.toLowerCase())) {
        return {
          success: false,
          description: `You cannot ${action} the ${foundItem.name}.`
        };
      }

      // Generate interaction description
      const interactionDescription = this.generateInteractionDescription(foundItem, action);

      return {
        success: true,
        description: interactionDescription,
        elementName: foundItem.name,
        actionTaken: action,
        stateChanged: true
      };

    } catch (error) {
      return {
        success: false,
        description: 'Something went wrong with that interaction. Please try again.'
      };
    }
  }

  /**
   * Get appropriate actions for an item based on its type and name
   */
  private getAppropriateActions(item: Item): string[] {
    const itemType = item.type.toLowerCase();
    const itemName = item.name.toLowerCase();

    // Base actions available for all items
    let actions = ['examine'];

    // Type-based actions
    switch (itemType) {
      case 'interactive':
        if (itemName.includes('lever')) {
          actions.push('pull');
        }
        if (itemName.includes('button')) {
          actions.push('press');
        }
        if (itemName.includes('switch')) {
          actions.push('flip');
        }
        if (itemName.includes('handle') || itemName.includes('knob')) {
          actions.push('turn');
        }
        break;
      
      case 'readable':
        actions.push('read');
        break;
      
      case 'magical':
        actions.push('touch');
        break;
      
      case 'weapon':
        actions.push('take', 'wield');
        break;
      
      case 'key':
        actions.push('take', 'use');
        break;
      
      case 'consumable':
        actions.push('take', 'use', 'drink');
        break;
      
      default:
        actions.push('touch');
        break;
    }

    return actions;
  }

  /**
   * Generate description for interaction
   */
  private generateInteractionDescription(item: Item, action: string): string {
    const actionDescriptions = {
      pull: `You pull the ${item.name}. ${this.getGenericInteractionResult()}`,
      press: `You press the ${item.name}. ${this.getGenericInteractionResult()}`,
      touch: `You carefully touch the ${item.name}. ${this.getGenericInteractionResult()}`,
      read: `You read the ${item.name}. The text contains ancient knowledge and mysterious symbols.`,
      turn: `You turn the ${item.name}. ${this.getGenericInteractionResult()}`,
      flip: `You flip the ${item.name}. ${this.getGenericInteractionResult()}`
    };

    return actionDescriptions[action as keyof typeof actionDescriptions] || 
           `You ${action} the ${item.name}. Something happens, but you're not sure what.`;
  }

  /**
   * Get a generic interaction result message
   */
  private getGenericInteractionResult(): string {
    const results = [
      "You hear a faint clicking sound from somewhere in the room.",
      "A subtle vibration runs through the floor.",
      "You notice a brief shimmer in the air.",
      "The mechanism responds with a soft mechanical sound.",
      "You feel like something has changed, though you can't quite tell what."
    ];

    return results[Math.floor(Math.random() * results.length)];
  }

  /**
   * Get list of interactive elements in the room
   */
  async getInteractiveElements(room: Room): Promise<InteractiveElement[]> {
    try {
      const items = await this.prismaService.client.item.findMany({
        where: { roomId: room.id, hidden: false }
      });

      return items.map(item => ({
        name: item.name,
        type: item.type,
        description: item.description,
        suggestedActions: this.getAppropriateActions(item)
      }));

    } catch (error) {
      console.error('Error getting interactive elements:', error);
      return [];
    }
  }

  /**
   * Handle complex examination with clue detection
   */
  async handleComplexExamination(room: Room, target?: string): Promise<ComplexExaminationResult> {
    try {
      if (!target) {
        // General room examination
        const hints = await this.generateRoomHints(room);
        return {
          success: true,
          description: `You look around the ${room.name} more carefully, taking in every detail. ${room.extendedDescription || 'The room holds an air of mystery.'}`,
          hints
        };
      }

      // Search for specific target including hidden items
      const items = await this.prismaService.client.item.findMany({
        where: { roomId: room.id }
      });

      const normalizedTarget = target.toLowerCase();
      const foundItem = items.find(item =>
        item.name.toLowerCase().includes(normalizedTarget) ||
        normalizedTarget.includes(item.name.toLowerCase())
      );

      if (foundItem) {
        const clues = this.extractCluesFromDescription(foundItem.extendedDescription || foundItem.description);
        
        let description = `**${foundItem.name}**\n\n${foundItem.description}`;
        if (foundItem.extendedDescription) {
          description += `\n\n${foundItem.extendedDescription}`;
        }

        // Check if item was hidden and mark as discovered
        let discoveredHidden = false;
        if (foundItem.hidden) {
          description += '\n\n*Through careful examination, you discover this hidden element!*';
          discoveredHidden = true;
          
          // In a real game, you'd update the item to not be hidden anymore
          // For now, we'll just note the discovery
        }

        return {
          success: true,
          description,
          clues,
          discoveredHidden,
          target: foundItem
        };
      }

      // Target not found - provide general hints
      const hints = await this.generateRoomHints(room);
      return {
        success: true,
        description: `You examine the ${target} carefully, but don't find anything particularly noteworthy about it.`,
        hints
      };

    } catch (error) {
      console.error('Error handling complex examination:', error);
      return {
        success: false,
        description: 'You have trouble focusing on your examination right now. Please try again.'
      };
    }
  }

  /**
   * Extract clues from item descriptions
   */
  private extractCluesFromDescription(description: string): string[] {
    const clues: string[] = [];
    const clueKeywords = [
      'keyhole', 'lock', 'scratch', 'mark', 'symbol', 'carving', 'inscription',
      'warm', 'cold', 'vibration', 'sound', 'mechanism', 'hidden', 'secret',
      'ancient', 'seal', 'crest', 'worn', 'damaged', 'recent'
    ];

    for (const keyword of clueKeywords) {
      if (description.toLowerCase().includes(keyword)) {
        clues.push(`There seems to be something significant about the ${keyword} you noticed.`);
      }
    }

    return clues;
  }

  /**
   * Generate contextual hints for a room
   */
  private async generateRoomHints(room: Room): Promise<string[]> {
    const hints: string[] = [];

    try {
      // Check for hidden items
      const hiddenItems = await this.prismaService.client.item.findMany({
        where: { roomId: room.id, hidden: true }
      });

      if (hiddenItems.length > 0) {
        hints.push('You sense there might be hidden elements in this room that could be discovered through careful examination.');
      }

      // Check for interactive items
      const interactiveItems = await this.prismaService.client.item.findMany({
        where: { roomId: room.id, type: 'interactive' }
      });

      if (interactiveItems.length > 0) {
        hints.push('Some objects in this room appear to be interactive and might respond to your actions.');
      }

      // Check for locked connections
      const lockedConnections = await this.prismaService.client.connection.findMany({
        where: { fromRoomId: room.id, locked: true }
      });

      if (lockedConnections.length > 0) {
        hints.push('There may be ways to unlock additional paths from this room.');
      }

      // General exploration hint
      if (hints.length === 0) {
        hints.push('This room seems ordinary at first glance, but adventure often lies in the details.');
      }

    } catch (error) {
      console.error('Error generating room hints:', error);
      hints.push('The room holds mysteries that are waiting to be uncovered.');
    }

    return hints;
  }

  /**
   * Cleanup and resource management
   */
  async cleanup(): Promise<void> {
    // Currently no resources to clean up, but method provided for future use
  }
}