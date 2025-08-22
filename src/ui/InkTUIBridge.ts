/**
 * InkTUIBridge - Bridge pattern to wrap React ink components with the same interface as TUIManager
 * This allows the GameController to use the same API while using React internally
 */

import React, { useState, useEffect } from 'react';
import { render } from 'ink';
import { EventEmitter } from 'events';
import { InkTUIApp, Message } from './InkTUIApp';
import { MessageType } from './MessageFormatter';
import { GameState } from './StatusManager';
import { TUIInterface } from './TUIInterface';
import { LoggerService } from '../services/loggerService';

// Bridge state interface
interface BridgeState {
  messages: Message[];
  gameState: GameState;
  waiting: boolean;
}

// Main app wrapper that manages state
const TUIApp: React.FC<{
  eventEmitter: EventEmitter;
  onInput: (input: string) => void;
  onKeyPress?: (key: string) => void;
}> = ({ eventEmitter, onInput, onKeyPress }) => {
  const [state, setState] = useState<BridgeState>({
    messages: [],
    gameState: {},
    waiting: false
  });

  useEffect(() => {
    // Listen for state updates from the bridge
    const handleUpdate = (newState: Partial<BridgeState>) => {
      setState(prevState => ({ ...prevState, ...newState }));
    };

    eventEmitter.on('stateUpdate', handleUpdate);

    return () => {
      eventEmitter.off('stateUpdate', handleUpdate);
    };
  }, [eventEmitter]);

  return React.createElement(InkTUIApp, {
    messages: state.messages,
    gameState: state.gameState,
    onInput,
    onKeyPress,
    waiting: state.waiting
  });
};

export class InkTUIBridge implements TUIInterface {
  private eventEmitter: EventEmitter;
  private messages: Message[] = [];
  private gameState: GameState = {};
  private inputResolver?: (value: string) => void;
  private waiting: boolean = false;
  private unmount?: () => void;
  private messageCounter: number = 0;
  private loggerService?: LoggerService;

  // Configuration
  private readonly maxScrollback: number = 2000;

  constructor(loggerService?: LoggerService) {
    this.loggerService = loggerService;
    this.eventEmitter = new EventEmitter();
    
    // Bind methods to preserve 'this' context
    this.handleInput = this.handleInput.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
  }

  /**
   * Initialize the TUI
   */
  async initialize(): Promise<void> {
    // Create the React element with state management
    const app = React.createElement(TUIApp, {
      eventEmitter: this.eventEmitter,
      onInput: this.handleInput,
      onKeyPress: this.handleKeyPress
    });

    // Render the React component once
    const result = render(app);
    this.unmount = result.unmount;

    // Send initial state
    this.emitStateUpdate();
  }

  /**
   * Display a message in the content area
   */
  display(message: string, type: MessageType = MessageType.NORMAL): void {
    const newMessage: Message = {
      id: `msg-${this.messageCounter++}`,
      content: message,
      type,
      timestamp: new Date()
    };

    this.messages.push(newMessage);
    this.trimScrollback();
    this.emitStateUpdate();
    
    // Log to LoggerService if available
    if (this.loggerService) {
      const logType = this.mapMessageTypeToLogType(type);
      this.loggerService.logSystemOutput(message, logType);
    }
  }

  /**
   * Set the logger service (can be called after construction)
   */
  setLoggerService(loggerService: LoggerService): void {
    this.loggerService = loggerService;
  }

  /**
   * Map MessageType to log categories
   */
  private mapMessageTypeToLogType(type: MessageType): 'room' | 'dialogue' | 'combat' | 'system' {
    switch (type) {
      case MessageType.NORMAL:
        return 'room';
      case MessageType.ERROR:
        return 'system';
      case MessageType.SYSTEM:
        return 'system';
      case MessageType.AI_GENERATION:
        return 'system';
      default:
        return 'system';
    }
  }

  /**
   * Display multiple lines at once
   */
  displayLines(lines: string[], type: MessageType = MessageType.NORMAL): void {
    lines.forEach(line => this.display(line, type));
  }

  /**
   * Get input from the user (returns a promise)
   */
  async getInput(): Promise<string> {
    return new Promise<string>((resolve) => {
      this.inputResolver = resolve;
      this.waiting = false; // Ready to accept input
      this.emitStateUpdate();
    });
  }

  /**
   * Update the status area with new game state
   */
  updateStatus(gameState: GameState): void {
    this.gameState = { ...this.gameState, ...gameState };
    this.emitStateUpdate();
  }

  /**
   * Set a simple text status
   */
  setStatus(message: string): void {
    // For simplicity, we'll just add this to the game state
    this.gameState = { ...this.gameState, gameName: message };
    this.emitStateUpdate();
  }

  /**
   * Clear the content area
   */
  clear(): void {
    this.messages = [];
    this.emitStateUpdate();
  }

  /**
   * Clean up resources and close the UI
   */
  destroy(): void {
    if (this.unmount) {
      this.unmount();
    }
  }

  /**
   * Set the input prompt (not used in React version)
   */
  setPrompt(prompt: string): void {
    // No-op for React version - prompt is built into the component
  }

  /**
   * Show a welcome message with special formatting
   */
  showWelcome(message: string): void {
    this.display(`=== ${message} ===`, MessageType.NORMAL);
  }

  /**
   * Display an error with special formatting
   */
  showError(message: string, details?: string): void {
    this.display(message, MessageType.ERROR);
    if (details) {
      this.display(details, MessageType.ERROR);
    }
  }

  /**
   * Display AI generation progress
   */
  showAIProgress(action: string, target: string, elapsed?: number): void {
    const elapsedText = elapsed ? ` (${elapsed}ms)` : '';
    this.display(`✨ ${action} ${target}${elapsedText}`, MessageType.AI_GENERATION);
  }

  /**
   * Display room information with proper formatting
   */
  displayRoom(roomName: string, description: string, exits: string[]): void {
    // Room title with leading newline for spacing
    this.display('\n' + roomName, MessageType.ROOM_TITLE);
    
    // Room title underline
    this.display('═'.repeat(roomName.length), MessageType.ROOM_TITLE);
    
    // Room description
    this.display(description, MessageType.ROOM_DESCRIPTION);
    
    // Add spacing
    this.display('', MessageType.NORMAL);
    
    // Exits - already sorted by UnifiedRoomDisplayService.formatExitNames()
    if (exits.length > 0) {
      this.display(`Exits: ${exits.join(', ')}`, MessageType.EXITS);
    } else {
      this.display('There are no obvious exits.', MessageType.SYSTEM);
    }
    
    // Add spacing after room display
    this.display('', MessageType.NORMAL);
  }

  /**
   * Handle input from React component
   */
  private handleInput(input: string): void {
    // Echo the command
    this.display(`> ${input}`, MessageType.COMMAND_ECHO);
    
    // Resolve the waiting input promise
    if (this.inputResolver) {
      const resolver = this.inputResolver;
      this.inputResolver = undefined;
      this.waiting = true; // Now processing command
      this.emitStateUpdate();
      resolver(input);
    }
  }

  /**
   * Handle key press events from React component
   */
  private handleKeyPress(key: string): void {
    switch (key) {
      case 'clear':
        this.clear();
        break;
      case 'pageup':
      case 'pagedown':
        // Scrolling is handled by the component internally
        // We could implement custom scrolling logic here if needed
        break;
      default:
        break;
    }
  }

  /**
   * Emit state update to React component
   */
  private emitStateUpdate(): void {
    const state: BridgeState = {
      messages: [...this.messages],
      gameState: { ...this.gameState },
      waiting: this.waiting
    };
    
    this.eventEmitter.emit('stateUpdate', state);
  }

  /**
   * Trim the scrollback buffer to prevent memory issues
   */
  private trimScrollback(): void {
    if (this.messages.length > this.maxScrollback) {
      this.messages = this.messages.slice(-this.maxScrollback);
    }
  }
}