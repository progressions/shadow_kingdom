import { OutputInterface } from '../interfaces/outputInterface';
import { MessageType } from '../ui/MessageFormatter';

/**
 * ConsoleOutputAdapter adapts console.log output for use with UnifiedRoomDisplayService.
 * This allows the unified service to work with command-line output while maintaining
 * the exact same formatting as the existing SessionInterface implementation.
 */
export class ConsoleOutputAdapter implements OutputInterface {
  
  /**
   * Display a message to the console
   * @param message The message to display
   * @param type Optional message type (ignored for console output)
   */
  display(message: string, type?: MessageType): void {
    console.log(message);
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
    console.log(`\n${name}`);
    console.log('='.repeat(name.length));
    console.log(description);

    // Format and display exits
    const exitsDisplay = this.formatExits(exits);
    console.log(exitsDisplay);
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

    return `\nExits: ${exits.join(', ')}`;
  }
}