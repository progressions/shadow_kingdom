import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export class HistoryManager {
  private historyFile: string;
  private maxEntries: number;
  private lastCommand: string | null = null;

  constructor(
    historyFile?: string,
    maxEntries: number = 100
  ) {
    this.historyFile = historyFile || path.join(os.homedir(), '.shadow_kingdom_history');
    this.maxEntries = Math.max(1, maxEntries);
  }

  /**
   * Load command history from file
   * Returns array in chronological order (oldest first)
   */
  async loadHistory(): Promise<string[]> {
    try {
      const content = await fs.readFile(this.historyFile, 'utf-8');
      const lines = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      return lines.slice(-this.maxEntries); // Keep only recent entries
    } catch (error: any) {
      // File doesn't exist or can't be read - start with empty history
      if (error.code === 'ENOENT') {
        return [];
      }
      
      console.warn(`Warning: Could not load command history: ${error.message}`);
      return [];
    }
  }

  /**
   * Save a command to history (if it passes filters)
   */
  async saveCommand(command: string): Promise<void> {
    const trimmed = command.trim();
    
    // Filter out unwanted commands
    if (!this.shouldSaveCommand(trimmed)) {
      return;
    }

    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.historyFile), { recursive: true });
      
      // Append command to file
      await fs.appendFile(this.historyFile, `${trimmed}\n`);
      
      // Update last command tracker
      this.lastCommand = trimmed;
      
      // Rotate history if needed (async, don't block)
      this.rotateHistoryAsync().catch(error => {
        console.warn(`Warning: History rotation failed: ${error.message}`);
      });
      
    } catch (error: any) {
      console.warn(`Warning: Could not save command to history: ${error.message}`);
      // Continue execution - history save failure shouldn't break the game
    }
  }

  /**
   * Check if a command should be saved to history
   */
  private shouldSaveCommand(command: string): boolean {
    // Empty commands
    if (!command || command.length === 0) {
      return false;
    }

    // Whitespace-only commands  
    if (command.trim().length === 0) {
      return false;
    }

    // Duplicate consecutive commands
    if (this.lastCommand === command) {
      return false;
    }

    return true;
  }

  /**
   * Rotate history file if it exceeds max entries
   * Runs asynchronously to avoid blocking game execution
   */
  private async rotateHistoryAsync(): Promise<void> {
    try {
      const stats = await fs.stat(this.historyFile);
      
      // Only rotate if file seems large (rough heuristic)
      // Average command ~20 chars, so maxEntries * 25 = rough max file size
      if (stats.size > this.maxEntries * 25) {
        const history = await this.loadHistory();
        
        if (history.length > this.maxEntries) {
          // Keep only the most recent entries
          const recentHistory = history.slice(-this.maxEntries);
          
          // Write back to file
          await fs.writeFile(this.historyFile, recentHistory.join('\n') + '\n');
        }
      }
    } catch (error) {
      // Rotation is best-effort - don't throw
      console.warn(`History rotation failed: ${error}`);
    }
  }

  /**
   * Get history file path (for testing/debugging)
   */
  getHistoryFilePath(): string {
    return this.historyFile;
  }

  /**
   * Clear all command history
   */
  async clearHistory(): Promise<void> {
    try {
      await fs.unlink(this.historyFile);
      this.lastCommand = null;
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.warn(`Warning: Could not clear history: ${error.message}`);
      }
    }
  }
}