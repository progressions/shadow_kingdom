import { Room, Connection } from './gameStateManager';
import { TUIManager } from '../ui/TUIManager';
import { MessageType } from '../ui/MessageFormatter';

export interface RoomDisplayOptions {
  enableDebugLogging?: boolean;
}

export interface RoomDisplayResult {
  roomName: string;
  roomDescription: string;
  exitsDisplay: string;
  hasExits: boolean;
}

/**
 * RoomDisplayService handles all room display and formatting logic.
 * Responsible for formatting room information, exits, and display output.
 */
export class RoomDisplayService {
  private options: RoomDisplayOptions;

  constructor(options: RoomDisplayOptions = {}) {
    this.options = {
      enableDebugLogging: false,
      ...options
    };
  }

  /**
   * Display a room to the console with formatted output
   */
  displayRoom(room: Room, connections: Connection[]): RoomDisplayResult {
    const roomName = room.name;
    const roomDescription = room.description;

    // Display room name with underline
    console.log(`\n${roomName}`);
    console.log('='.repeat(roomName.length));
    console.log(roomDescription);

    // Format and display exits
    const exitsDisplay = this.formatExits(connections);
    console.log(exitsDisplay);

    return {
      roomName,
      roomDescription,
      exitsDisplay,
      hasExits: connections.length > 0
    };
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