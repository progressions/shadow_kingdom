import { MessageType } from '../ui/MessageFormatter';

/**
 * OutputInterface provides a common abstraction for displaying text output.
 * This allows the same room display logic to work with different output systems
 * (TUI, console, etc.) without coupling to specific implementations.
 */
export interface OutputInterface {
  /**
   * Display a message with optional type information for formatting
   * @param message The message to display
   * @param type Optional message type for formatting hints
   */
  display(message: string, type?: MessageType): void;

  /**
   * Display room information with name, description, and exits
   * @param name The room name
   * @param description The room description  
   * @param exits Array of exit names/descriptions
   */
  displayRoom(name: string, description: string, exits: string[]): void;
}