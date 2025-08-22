import { OutputInterface } from '../interfaces/outputInterface';
import { TUIInterface } from '../ui/TUIInterface';
import { MessageType } from '../ui/MessageFormatter';

/**
 * TUIOutputAdapter adapts the TUIInterface for use with UnifiedRoomDisplayService.
 * This allows the unified service to work with the existing TUI system without modification.
 */
export class TUIOutputAdapter implements OutputInterface {
  constructor(private tui: TUIInterface) {}

  /**
   * Display a message using the TUI interface
   * @param message The message to display
   * @param type Optional message type for formatting
   */
  display(message: string, type?: MessageType): void {
    this.tui.display(message, type || MessageType.NORMAL);
  }

  /**
   * Display room information using the TUI's displayRoom method
   * @param name The room name
   * @param description The room description
   * @param exits Array of exit names/descriptions
   */
  displayRoom(name: string, description: string, exits: string[]): void {
    this.tui.displayRoom(name, description, exits);
  }
}