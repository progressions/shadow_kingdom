/**
 * Common interface for TUI implementations
 * Both TUIManager and InkTUIBridge implement this interface
 */

import { MessageType } from './MessageFormatter';
import { GameState } from './StatusManager';

export interface TUIInterface {
  // Core TUI methods
  initialize(): Promise<void>;
  display(message: string, type?: MessageType): void;
  displayLines(lines: string[], type?: MessageType): void;
  getInput(): Promise<string>;
  updateStatus(gameState: GameState): void;
  setStatus(message: string): void;
  clear(): void;
  destroy(): void;
  setPrompt(prompt: string): void;
  
  // Display helpers
  showWelcome(message: string): void;
  showError(message: string, details?: string): void;
  showAIProgress(action: string, target: string, elapsed?: number): void;
  displayRoom(roomName: string, description: string, exits: string[]): void;
}