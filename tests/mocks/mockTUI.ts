import { TUIManager } from '../../src/ui/TUIManager';
import { MessageType } from '../../src/ui/MessageFormatter';
import { GameState } from '../../src/ui/StatusManager';

/**
 * Mock TUI that implements the same interface as TUIManager but doesn't use blessed.js
 * This allows tests to run without requiring a TTY environment
 */
export class MockTUI {
  private messages: Array<{ message: string; type: MessageType }> = [];
  private currentStatus: string = '';
  
  constructor() {
    // Don't call super() - we don't want to initialize blessed.js components
    // @ts-ignore - bypass TypeScript checks for test mock
    this.messageFormatter = {
      format: (message: string, type: MessageType) => message,
      formatWelcome: (message: string) => `=== ${message} ===`
    };
    // @ts-ignore
    this.statusManager = {
      generateStatus: (gameState: GameState) => `Status: ${gameState.mode}`
    };
    // @ts-ignore
    this.historyManager = {
      saveCommand: async () => {},
      loadHistory: async () => []
    };
  }

  // Override all public methods to avoid blessed.js calls
  async initialize(): Promise<void> {
    // No-op for tests
  }

  display(message: string, type: MessageType = MessageType.NORMAL): void {
    this.messages.push({ message, type });
  }

  displayLines(lines: string[], type: MessageType = MessageType.NORMAL): void {
    lines.forEach(line => this.display(line, type));
  }

  showWelcome(message: string): void {
    this.display(`=== ${message} ===`, MessageType.NORMAL);
  }

  async getInput(): Promise<string> {
    // For tests, return empty string or throw error to indicate test setup issue
    throw new Error('MockTUI getInput called - tests should not wait for user input');
  }

  updateStatus(gameState: GameState): void {
    this.currentStatus = `Status: ${gameState.mode}`;
  }

  clear(): void {
    this.messages = [];
  }

  destroy(): void {
    // No-op for tests
  }

  setPrompt(prompt: string): void {
    // No-op for tests
  }

  setStatus(status: string): void {
    this.currentStatus = status;
  }

  showRoom(roomName: string, description: string, exits: string[]): void {
    this.display(`Room: ${roomName}`, MessageType.NORMAL);
    this.display(description, MessageType.NORMAL);
    if (exits.length > 0) {
      this.display(`Exits: ${exits.join(', ')}`, MessageType.NORMAL);
    }
  }

  showAIProgress(message: string, detail?: string): void {
    this.display(`AI: ${message}${detail ? ` (${detail})` : ''}`, MessageType.AI_GENERATION);
  }

  // Test helper methods
  getMessages(): Array<{ message: string; type: MessageType }> {
    return [...this.messages];
  }

  getLastMessage(): { message: string; type: MessageType } | null {
    return this.messages[this.messages.length - 1] || null;
  }

  clearMessages(): void {
    this.messages = [];
  }

  getCurrentStatus(): string {
    return this.currentStatus;
  }
}