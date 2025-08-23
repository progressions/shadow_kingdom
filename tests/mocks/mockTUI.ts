import { MessageType } from '../../src/ui/MessageFormatter';
import { GameState } from '../../src/ui/StatusManager';
import { TUIInterface } from '../../src/ui/TUIInterface';

/**
 * Mock TUI that provides the same interface as TUIManager but doesn't use blessed.js
 * This allows tests to run without requiring a TTY environment
 * 
 * Note: This is a standalone mock, not extending TUIManager, to avoid blessed.js initialization
 */
export class MockTUI implements TUIInterface {
  private messages: Array<{ message: string; type: MessageType }> = [];
  private mockStatus: string = '';
  
  // Mock blessed.js components
  screen = {
    render: () => {},
    destroy: () => {},
    on: function() { return this; },
    key: () => {}
  };
  
  contentBox = { setContent: () => {}, focus: () => {} };
  
  inputBox = { 
    setContent: () => {}, 
    focus: () => {}, 
    readInput: () => {},
    on: function() { return this; },
    removeAllListeners: function() { return this; }
  };
  
  statusBox = { setContent: () => {} };

  constructor() {
    // No super() call needed since we don't extend TUIManager
  }

  // Implement all TUIManager public methods
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
    this.mockStatus = `Status: Game Active`;
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
    this.mockStatus = status;
  }

  showRoom(roomName: string, description: string, exits: string[]): void {
    this.display(`Room: ${roomName}`, MessageType.NORMAL);
    this.display(description, MessageType.NORMAL);
    if (exits.length > 0) {
      this.display(`Exits: ${exits.join(', ')}`, MessageType.NORMAL);
    }
  }

  displayRoom(roomName: string, description: string, exits: string[]): void {
    this.display('', MessageType.NORMAL);
    this.display(roomName, MessageType.ROOM_TITLE);
    this.display('═'.repeat(roomName.length), MessageType.NORMAL);
    this.display(description, MessageType.ROOM_DESCRIPTION);
    this.display('', MessageType.NORMAL);
    if (exits.length > 0) {
      this.display(`Exits: ${exits.join(', ')}`, MessageType.EXITS);
    } else {
      this.display('No exits visible.', MessageType.EXITS);
    }
    this.display('', MessageType.NORMAL);
  }

  showError(message: string, details?: string): void {
    this.display(`Error: ${message}`, MessageType.ERROR);
    if (details) {
      this.display(`Details: ${details}`, MessageType.ERROR);
    }
  }

  showAIProgress(action: string, target: string, elapsed?: number): void {
    this.display(`AI: ${action} ${target}${elapsed ? ` (${elapsed}ms)` : ''}`, MessageType.AI_GENERATION);
  }

  // Test helper methods
  getMessages(): string[] {
    return this.messages.map(m => m.message);
  }

  getFullMessages(): Array<{ message: string; type: MessageType }> {
    return [...this.messages];
  }

  getLastMessage(): { message: string; type: MessageType } | null {
    return this.messages[this.messages.length - 1] || null;
  }

  clearMessages(): void {
    this.messages = [];
  }

  getCurrentStatus(): string {
    return this.mockStatus;
  }
}