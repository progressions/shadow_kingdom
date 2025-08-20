/**
 * TUIManager handles the Terminal UI interface with Claude Code-style adaptive layout.
 * Features scrollable content area, floating input bar, and dynamic status area.
 */

import * as blessed from 'blessed';
import { MessageFormatter, MessageType } from './MessageFormatter';
import { StatusManager, StatusInfo, GameState } from './StatusManager';
import { HistoryManager } from '../utils/historyManager';

export class TUIManager {
  private screen!: blessed.Widgets.Screen;
  private contentBox!: blessed.Widgets.BoxElement;
  private inputBox!: blessed.Widgets.TextboxElement;
  private statusBox!: blessed.Widgets.BoxElement;
  
  private messageFormatter: MessageFormatter;
  private statusManager: StatusManager;
  private historyManager: HistoryManager;
  
  private currentStatus: StatusInfo;
  private inputBuffer: string = '';
  private inputResolver?: (value: string) => void;
  
  // Configuration
  private readonly maxScrollback: number = 2000;
  private readonly inputPrompt: string = '> ';
  
  constructor() {
    this.messageFormatter = new MessageFormatter();
    this.statusManager = new StatusManager();
    this.historyManager = new HistoryManager();
    
    // Initialize with minimal status
    this.currentStatus = this.statusManager.createLoadingStatus('Initializing...');
    
    this.initializeScreen();
    this.createComponents();
    this.setupEventHandlers();
    this.updateLayout();
  }

  /**
   * Initialize the blessed screen
   */
  private initializeScreen(): void {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Shadow Kingdom',
      fullUnicode: true
    });
  }

  /**
   * Create the UI components (content, input, status)
   */
  private createComponents(): void {
    // Content area (scrollable, fills available space)
    this.contentBox = blessed.box({
      top: 0,
      left: 0,
      right: 0,
      bottom: this.currentStatus.height + 3, // Status + input heights
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'gray'
        }
      },
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: ' ',
        style: {
          bg: 'gray'
        }
      },
      mouse: true,
      keys: true,
      tags: true // Enable blessed color tags
    });

    // Input box (floats above status)
    this.inputBox = blessed.textbox({
      left: 0,
      right: 0,
      height: 3,
      bottom: this.currentStatus.height,
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'blue'
        },
        focus: {
          border: {
            fg: 'yellow'
          }
        }
      },
      inputOnFocus: false,  // Disable auto-echo but we'll manually start input
      keys: true,
      mouse: true,
      tags: true,
      secret: false,  // Ensure input is visible
      censor: false,  // Don't censor input
      cursor: {
        artificial: true,
        shape: 'line',
        blink: true,
        color: null // Use default color
      }
    });

    // Status area (bottom, variable height)
    this.statusBox = blessed.box({
      left: 0,
      right: 0,
      bottom: 0,
      height: this.currentStatus.height,
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: 'gray'
        }
      },
      tags: true
    });

    // Add components to screen
    this.screen.append(this.contentBox);
    this.screen.append(this.inputBox);
    this.screen.append(this.statusBox);
    
    // Focus the input box initially and start input mode
    this.inputBox.focus();
    this.inputBox.readInput();  // Start input mode to show cursor immediately
  }

  /**
   * Set up keyboard and event handlers
   */
  private setupEventHandlers(): void {
    // Global keyboard shortcuts
    this.screen.key(['C-c'], () => {
      this.destroy();
      process.exit(0);
    });
    
    this.screen.key(['C-l'], () => {
      this.clear();
    });
    
    // Content scrolling
    this.screen.key(['pageup'], () => {
      this.contentBox.scroll(-10);
      this.screen.render();
    });
    
    this.screen.key(['pagedown'], () => {
      this.contentBox.scroll(10);
      this.screen.render();
    });
    
    // Input handling
    this.inputBox.on('submit', (value: string) => {
      this.handleInput(value);
    });
    
    // Handle terminal resize
    this.screen.on('resize', () => {
      this.updateLayout();
    });
    
    // Focus handling removed to prevent infinite recursion
  }

  /**
   * Handle input submission
   */
  private async handleInput(value: string): Promise<void> {
    const command = value.trim();
    
    if (command) {
      // Echo the command
      this.display(`${this.inputPrompt}${command}`, MessageType.COMMAND_ECHO);
      
      // Save to history
      await this.historyManager.saveCommand(command);
      
      // Resolve the input promise
      if (this.inputResolver) {
        this.inputResolver(command);
        this.inputResolver = undefined;
      }
    }
    
    // Clear input and reset focus
    this.inputBox.clearValue();
    this.inputBox.focus();
  }

  /**
   * Update the adaptive layout based on current status
   */
  public updateLayout(): void {
    try {
      const statusHeight = this.currentStatus.height;
      const inputHeight = 3; // Fixed height for input with borders
      
      // Update component positions
      this.contentBox.bottom = statusHeight + inputHeight;
      this.inputBox.bottom = statusHeight;
      this.statusBox.height = statusHeight;
      
      // Update status content
      this.updateStatusContent();
      
      // Render changes (only if screen is ready)
      if (this.screen && this.screen.render) {
        this.screen.render();
      }
    } catch (error) {
      // Ignore layout errors to prevent recursion
    }
  }

  /**
   * Update the content of the status box
   */
  private updateStatusContent(): void {
    const content = this.currentStatus.lines.join('\n');
    this.statusBox.setContent(content);
  }

  /**
   * Display a message in the content area
   */
  public display(message: string, type: MessageType = MessageType.NORMAL): void {
    const formattedMessage = this.messageFormatter.format(message, type);
    
    // Add to content box
    this.contentBox.insertBottom(formattedMessage);
    
    // Auto-scroll to bottom
    this.contentBox.setScrollPerc(100);
    
    // Manage scrollback buffer
    this.trimScrollback();
    
    // Render to screen
    this.screen.render();
  }

  /**
   * Display multiple lines at once
   */
  public displayLines(lines: string[], type: MessageType = MessageType.NORMAL): void {
    lines.forEach(line => this.display(line, type));
  }

  /**
   * Get input from the user (returns a promise)
   */
  public getInput(): Promise<string> {
    return new Promise<string>((resolve) => {
      this.inputResolver = resolve;
      
      // Ensure input box is focused and ready
      this.inputBox.focus();
      this.inputBox.readInput();  // Manually start input mode to show cursor
      this.screen.render();
    });
  }

  /**
   * Update the status area with new game state
   */
  public updateStatus(gameState: GameState): void {
    const newStatus = this.statusManager.generateStatus(gameState);
    
    // Only update layout if height changed
    if (newStatus.height !== this.currentStatus.height) {
      this.currentStatus = newStatus;
      this.updateLayout();
    } else {
      this.currentStatus = newStatus;
      this.updateStatusContent();
      this.screen.render();
    }
  }

  /**
   * Set a simple text status
   */
  public setStatus(message: string): void {
    this.currentStatus = {
      lines: [message],
      height: 3
    };
    this.updateLayout();
  }

  /**
   * Clear the content area
   */
  public clear(): void {
    this.contentBox.setContent('');
    this.screen.render();
  }

  /**
   * Initialize the UI with command history
   */
  public async initialize(): Promise<void> {
    // Load command history
    const history = await this.historyManager.loadHistory();
    
    // Set initial status
    this.setStatus('Shadow Kingdom | Ready');
    
    // Initial render
    this.screen.render();
  }

  /**
   * Clean up resources and close the UI
   */
  public destroy(): void {
    if (this.screen) {
      this.screen.destroy();
    }
  }

  /**
   * Trim the scrollback buffer to prevent memory issues
   */
  private trimScrollback(): void {
    const content = this.contentBox.getContent();
    const lines = content.split('\n');
    
    if (lines.length > this.maxScrollback) {
      const trimmedLines = lines.slice(-this.maxScrollback);
      this.contentBox.setContent(trimmedLines.join('\n'));
    }
  }

  /**
   * Set the input prompt
   */
  public setPrompt(prompt: string): void {
    // For now, we'll just store it. The prompt display is handled in handleInput
    // In the future, we could show it as a label in the input box
  }

  /**
   * Show a welcome message with special formatting
   */
  public showWelcome(message: string): void {
    const welcomeMessage = this.messageFormatter.formatWelcome(message);
    this.display(welcomeMessage);
  }

  /**
   * Display an error with special formatting
   */
  public showError(message: string, details?: string): void {
    const errorMessage = this.messageFormatter.formatError(message, details);
    this.display(errorMessage);
  }

  /**
   * Display AI generation progress
   */
  public showAIProgress(action: string, target: string, elapsed?: number): void {
    const progressMessage = this.messageFormatter.formatAIProgress(action, target, elapsed);
    this.display(progressMessage);
  }

  /**
   * Display room information with proper formatting
   */
  public displayRoom(roomName: string, description: string, exits: string[]): void {
    // Room title with underline
    this.display(roomName, MessageType.ROOM_TITLE);
    
    // Room description
    this.display(description, MessageType.ROOM_DESCRIPTION);
    
    // Exits
    if (exits.length > 0) {
      const exitMessage = this.messageFormatter.formatExits(exits);
      this.display(exitMessage);
    } else {
      this.display('There are no obvious exits.', MessageType.SYSTEM);
    }
    
    // Add spacing after room display
    this.display('');
  }
}