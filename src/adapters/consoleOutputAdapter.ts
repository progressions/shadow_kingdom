import { OutputInterface } from '../interfaces/outputInterface';
import { MessageType } from '../ui/MessageFormatter';
import { sortDirections } from '../utils/directionSorter';
import { LoggerService } from '../services/loggerService';

/**
 * ConsoleOutputAdapter adapts console.log output for use with UnifiedRoomDisplayService.
 * This allows the unified service to work with command-line output for debugging
 * and programmatic access.
 */
export class ConsoleOutputAdapter implements OutputInterface {
  private loggerService?: LoggerService;

  constructor(loggerService?: LoggerService) {
    this.loggerService = loggerService;
  }

  /**
   * Display a message to the console
   * @param message The message to display
   * @param type Optional message type (ignored for console output)
   */
  display(message: string, type?: MessageType): void {
    console.log(message);
    if (this.loggerService) {
      this.loggerService.logSystemOutput(message, 'room');
    }
  }

  /**
   * Display room information with console formatting
   * Matches the exact format from RoomDisplayService.displayRoom()
   * @param name The room name
   * @param description The room description
   * @param exits Array of exit names/descriptions
   */
  displayRoom(name: string, description: string, exits: string[]): void {
    // Display room name with underline (matches RoomDisplayService format)
    const nameOutput = `\n${name}`;
    const underlineOutput = '='.repeat(name.length);
    const exitsDisplay = this.formatExits(exits);
    
    console.log(nameOutput);
    console.log(underlineOutput);
    console.log(description);
    console.log(exitsDisplay);

    // Log to LoggerService if available
    if (this.loggerService) {
      this.loggerService.logSystemOutput(nameOutput, 'room');
      this.loggerService.logSystemOutput(underlineOutput, 'room');
      this.loggerService.logSystemOutput(description, 'room');
      this.loggerService.logSystemOutput(exitsDisplay, 'room');
    }
  }

  /**
   * Format exits for display (matches RoomDisplayService.formatExits())
   * @param exits Array of formatted exit names
   * @returns Formatted exit string
   */
  private formatExits(exits: string[]): string {
    if (!exits || exits.length === 0) {
      return '\nThere are no obvious exits.';
    }

    // Don't sort here - exits are already sorted by UnifiedRoomDisplayService.formatExitNames()
    return `\nExits: ${exits.join(', ')}`;
  }
}