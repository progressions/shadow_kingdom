/**
 * MessageFormatter handles color coding and formatting for different types of messages
 * in the Terminal UI interface.
 */

import { sortDirections } from '../utils/directionSorter';

export enum MessageType {
  NORMAL = 'normal',
  ROOM_TITLE = 'room_title',
  ROOM_DESCRIPTION = 'room_description',
  EXITS = 'exits',
  SYSTEM = 'system',
  ERROR = 'error',
  AI_GENERATION = 'ai_generation',
  COMMAND_ECHO = 'command_echo'
}

export class MessageFormatter {
  
  /**
   * Format a message with appropriate colors and styling based on its type
   */
  public format(message: string, type: MessageType = MessageType.NORMAL): string {
    switch (type) {
      case MessageType.ROOM_TITLE:
        return this.formatRoomTitle(message);
      
      case MessageType.ROOM_DESCRIPTION:
        return this.applyColor(message, '{white-fg}');
      
      case MessageType.EXITS:
        return this.applyColor(message, '{blue-fg}');
      
      case MessageType.SYSTEM:
        return this.applyColor(message, '{gray-fg}');
      
      case MessageType.ERROR:
        return this.applyColor(message, '{red-fg}');
      
      case MessageType.AI_GENERATION:
        return this.applyColor(message, '{green-fg}');
      
      case MessageType.COMMAND_ECHO:
        return this.applyColor(message, '{cyan-fg}');
      
      case MessageType.NORMAL:
      default:
        return message;
    }
  }

  /**
   * Format room titles with special styling (bright color + underline)
   */
  private formatRoomTitle(title: string): string {
    const coloredTitle = this.applyColor(title, '{yellow-fg}{bold}');
    const underline = '='.repeat(title.length);
    const coloredUnderline = this.applyColor(underline, '{yellow-fg}');
    
    return `${coloredTitle}\n${coloredUnderline}`;
  }

  /**
   * Apply blessed.js color tags to text
   */
  private applyColor(text: string, colorTag: string): string {
    return `${colorTag}${text}{/}`;
  }

  /**
   * Strip color tags from text (useful for length calculations)
   */
  public stripColors(text: string): string {
    // Remove blessed.js color tags: {color-fg}, {/}, {bold}, etc.
    return text.replace(/\{[^}]*\}/g, '');
  }

  /**
   * Format multiple lines with consistent coloring
   */
  public formatLines(lines: string[], type: MessageType): string[] {
    return lines.map(line => this.format(line, type));
  }

  /**
   * Create a visual separator line
   */
  public createSeparator(width: number = 60, type: 'light' | 'heavy' = 'light'): string {
    const char = type === 'heavy' ? '═' : '─';
    const separator = char.repeat(width);
    return this.applyColor(separator, '{gray-fg}');
  }

  /**
   * Format a status message with timestamp
   */
  public formatStatus(message: string, includeTime: boolean = false): string {
    let formatted = message;
    
    if (includeTime) {
      const timestamp = new Date().toLocaleTimeString();
      formatted = `[${timestamp}] ${message}`;
    }
    
    return this.applyColor(formatted, '{gray-fg}');
  }

  /**
   * Format AI generation progress message
   */
  public formatAIProgress(action: string, target: string, elapsed?: number): string {
    let message = `✨ ${action}: ${target}`;
    
    if (elapsed !== undefined) {
      message += ` [${elapsed.toFixed(1)}s]`;
    } else {
      message += '...';
    }
    
    return this.format(message, MessageType.AI_GENERATION);
  }

  /**
   * Format room exit information
   */
  public formatExits(exits: string[]): string {
    if (exits.length === 0) {
      return this.format('There are no obvious exits.', MessageType.SYSTEM);
    }
    
    // Sort exits using direction priority (cardinals first, then alphabetical)
    const sortedExits = sortDirections(exits);
    const exitText = `Exits: ${sortedExits.join(', ')}`;
    return this.format(exitText, MessageType.EXITS);
  }

  /**
   * Format error messages with consistent styling
   */
  public formatError(message: string, details?: string): string {
    let errorMsg = `❌ ${message}`;
    
    if (details) {
      errorMsg += `\n   ${details}`;
    }
    
    return this.format(errorMsg, MessageType.ERROR);
  }

  /**
   * Format welcome/introductory messages
   */
  public formatWelcome(message: string): string {
    const border = this.createSeparator(message.length, 'heavy');
    return [
      border,
      this.applyColor(message, '{yellow-fg}{bold}'),
      border
    ].join('\n');
  }
}