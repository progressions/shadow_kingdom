import { Room, Connection } from './gameStateManager';
import Database from '../utils/database';

export interface RoomDisplayOptions {
  enableDebugLogging?: boolean;
}

export interface RoomDisplayResult {
  roomName: string;
  roomDescription: string;
  exitsDisplay: string;
  hasExits: boolean;
  regionInfo?: string;
}

/**
 * RoomDisplayService handles all room display and formatting logic.
 * Responsible for formatting room information, exits, and display output.
 */
export class RoomDisplayService {
  private options: RoomDisplayOptions;
  private db: Database;

  constructor(db: Database, options: RoomDisplayOptions = {}) {
    this.db = db;
    this.options = {
      enableDebugLogging: false,
      ...options
    };
  }

  /**
   * Display a room to the console with formatted output
   */
  async displayRoom(room: Room, connections: Connection[]): Promise<RoomDisplayResult> {
    const roomName = room.name;
    const roomDescription = room.description;

    // Display room name with underline
    console.log(`\n${roomName}`);
    console.log('='.repeat(roomName.length));
    console.log(roomDescription);

    // Get and display region information if available
    const regionInfo = await this.getRegionInfo(room);
    if (regionInfo) {
      console.log(regionInfo);
    }

    // Format and display exits
    const exitsDisplay = this.formatExits(connections);
    console.log(exitsDisplay);

    return {
      roomName,
      roomDescription,
      exitsDisplay,
      hasExits: connections.length > 0,
      regionInfo
    };
  }

  /**
   * Get region information for a room if available
   */
  private async getRegionInfo(room: Room): Promise<string | undefined> {
    // Return early if no region info
    if (!room.region_id) {
      return undefined;
    }

    try {
      // Fetch region details from database
      const region = await this.db.get<{
        id: number;
        name: string | null;
        type: string;
        description: string;
      }>('SELECT id, name, type, description FROM regions WHERE id = ?', [room.region_id]);

      if (!region) {
        return undefined;
      }

      // Format region information - always show region name prominently
      let regionDisplay = '';
      
      if (region.name) {
        regionDisplay = `Region: ${region.name}`;
      } else {
        regionDisplay = `Region: ${region.type}`;
      }
      
      if (room.region_distance !== null && room.region_distance !== undefined) {
        if (room.region_distance === 0) {
          regionDisplay += ' [CENTER]';
        } else {
          regionDisplay += ` [${room.region_distance} steps from center]`;
        }
      }

      // Add debug information if enabled
      if (this.isDebugEnabled()) {
        regionDisplay += `\n[DEBUG] Region ID: ${region.id}, Type: ${region.type}, Distance: ${room.region_distance}`;
        regionDisplay += `\n[DEBUG] Description: ${region.description}`;
      }

      return regionDisplay;
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error('Error fetching region info:', error);
      }
      return undefined;
    }
  }

  /**
   * Format exits for display
   */
  formatExits(connections: Connection[]): string {
    if (!connections || connections.length === 0) {
      return '\nThere are no obvious exits.';
    }

    // Display thematic names with direction in parentheses
    const exits = connections.map(c => {
      // If name is same as direction, just show direction
      if (c.name === c.direction) {
        return c.direction;
      }
      // Otherwise show thematic name with direction in parentheses
      return `${c.name} (${c.direction})`;
    }).join(', ');

    return `\nExits: ${exits}`;
  }

  /**
   * Display no game loaded message
   */
  displayNoGameLoaded(): void {
    console.log('No game is currently loaded.');
  }

  /**
   * Display void/error state message
   */
  displayVoidState(): void {
    console.log('You are in a void. Something went wrong!');
  }

  /**
   * Display movement error message
   */
  displayMovementError(direction: string): void {
    console.log(`You can't go ${direction} from here.`);
  }

  /**
   * Display error with optional debug logging
   */
  displayError(message: string, error?: Error): void {
    console.error(`Error looking around: ${message}`);
    
    if (error && this.isDebugEnabled()) {
      console.error('Debug details:', error);
    }
  }

  /**
   * Check if debug logging is enabled
   */
  private isDebugEnabled(): boolean {
    return this.options.enableDebugLogging || process.env.AI_DEBUG_LOGGING === 'true';
  }

  /**
   * Update service options
   */
  updateOptions(options: Partial<RoomDisplayOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current service configuration
   */
  getOptions(): RoomDisplayOptions {
    return { ...this.options };
  }
}