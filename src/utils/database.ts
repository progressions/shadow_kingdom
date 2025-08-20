import sqlite3 from 'sqlite3';
import path from 'path';
import { TUIManager } from '../ui/TUIManager';
import { MessageType } from '../ui/MessageFormatter';

export class Database {
  private db: sqlite3.Database | null = null;
  private dbPath: string;
  private tui?: TUIManager;

  constructor(dbName: string = 'data/db/shadow_kingdom.db', tui?: TUIManager) {
    // Handle special :memory: database - don't treat as file path
    this.tui = tui;
    if (dbName === ':memory:') {
      this.dbPath = ':memory:';
    } else {
      this.dbPath = path.join(process.cwd(), dbName);
    }
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          if (this.tui) {
            this.tui.display(`Error opening database: ${err.message}`, MessageType.ERROR);
          } else {
            console.error('Error opening database:', err.message);
          }
          reject(err);
        } else {
          if (this.tui) {
            this.tui.display(`Connected to SQLite database: ${this.dbPath}`, MessageType.SYSTEM);
          } else {
            console.log('Connected to SQLite database:', this.dbPath);
          }
          resolve();
        }
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            if (this.tui) {
              this.tui.display(`Error closing database: ${err.message}`, MessageType.ERROR);
            } else {
              console.error('Error closing database:', err.message);
            }
            reject(err);
          } else {
            if (this.tui) {
              this.tui.display('Database connection closed.', MessageType.SYSTEM);
            } else {
              console.log('Database connection closed.');
            }
            this.db = null;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  async run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  isConnected(): boolean {
    return this.db !== null;
  }

  getDbPath(): string {
    return this.dbPath;
  }

  /**
   * Set TUI for displaying messages instead of console output
   */
  setTUI(tui: TUIManager): void {
    this.tui = tui;
  }
}

export default Database;